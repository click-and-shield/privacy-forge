import { describe, expect, it } from "vitest";
import {
    decryptTextWithPrivateKey,
    encryptTextWithPublicKey,
    type EcdhEncryptionEnvelope,
    type RsaEncryptionEnvelope,
} from "./public-key-encryption";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toPublicPem(keyData: ArrayBuffer): string {
    const base64 = Buffer.from(keyData).toString("base64");
    const lines = base64.match(/.{1,64}/g)?.join("\n") ?? "";
    return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

function toPrivatePem(keyData: ArrayBuffer): string {
    const base64 = Buffer.from(keyData).toString("base64");
    const lines = base64.match(/.{1,64}/g)?.join("\n") ?? "";
    return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

function fromBase64(value: string): ArrayBuffer {
    return Uint8Array.from(Buffer.from(value, "base64")).buffer;
}

function aad(algorithm: string): Uint8Array<ArrayBuffer> {
    return encoder.encode(`keysec-public-encryption:v1:${algorithm}`);
}

describe("public-key encryption", () => {
    for (const curve of ["P-256", "P-384", "P-521"] as const) {
        it(`encrypts a decryptable ECDH envelope with ${curve}`, async () => {
            const recipient = await crypto.subtle.generateKey(
                { name: "ECDH", namedCurve: curve },
                true,
                ["deriveBits"],
            ) as CryptoKeyPair;
            const publicKeyData = await crypto.subtle.exportKey("spki", recipient.publicKey);
            const privateKeyData = await crypto.subtle.exportKey("pkcs8", recipient.privateKey);
            const plaintext = `Secret for ${curve}`;
            const encoded = await encryptTextWithPublicKey(
                plaintext,
                toPublicPem(publicKeyData),
                "ECDH-HKDF-AES-256-GCM",
            );
            const envelope = JSON.parse(encoded) as EcdhEncryptionEnvelope;
            const ephemeralPublicKey = await crypto.subtle.importKey(
                "spki",
                fromBase64(envelope.ephemeralPublicKey),
                { name: "ECDH", namedCurve: curve },
                false,
                [],
            );
            const sharedSecret = await crypto.subtle.deriveBits(
                { name: "ECDH", public: ephemeralPublicKey },
                recipient.privateKey,
                curve === "P-256" ? 256 : curve === "P-384" ? 384 : 528,
            );
            const hkdfKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
            const encryptionKey = await crypto.subtle.deriveKey(
                {
                    name: "HKDF",
                    hash: "SHA-256",
                    salt: fromBase64(envelope.salt),
                    info: aad(envelope.algorithm),
                },
                hkdfKey,
                { name: "AES-GCM", length: 256 },
                false,
                ["decrypt"],
            );
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: fromBase64(envelope.iv),
                    additionalData: aad(envelope.algorithm),
                    tagLength: 128,
                },
                encryptionKey,
                fromBase64(envelope.ciphertext),
            );

            expect(envelope.version).toBe(1);
            expect(envelope.curve).toBe(curve);
            expect(decoder.decode(decrypted)).toBe(plaintext);
            await expect(decryptTextWithPrivateKey(encoded, toPrivatePem(privateKeyData)))
                .resolves.toBe(plaintext);
        });
    }

    it("encrypts a decryptable RSA-OAEP envelope", async () => {
        const recipient = await crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"],
        );
        const publicKeyData = await crypto.subtle.exportKey("spki", recipient.publicKey);
        const privateKeyData = await crypto.subtle.exportKey("pkcs8", recipient.privateKey);
        const plaintext = "RSA hybrid encryption secret";
        const encoded = await encryptTextWithPublicKey(
            plaintext,
            toPublicPem(publicKeyData),
            "RSA-OAEP-AES-256-GCM",
        );
        const envelope = JSON.parse(encoded) as RsaEncryptionEnvelope;
        const rawKey = await crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            recipient.privateKey,
            fromBase64(envelope.wrappedKey),
        );
        const encryptionKey = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: fromBase64(envelope.iv),
                additionalData: aad(envelope.algorithm),
                tagLength: 128,
            },
            encryptionKey,
            fromBase64(envelope.ciphertext),
        );

        expect(envelope.version).toBe(1);
        expect(decoder.decode(decrypted)).toBe(plaintext);
        await expect(decryptTextWithPrivateKey(encoded, toPrivatePem(privateKeyData)))
            .resolves.toBe(plaintext);

        const tamperedEnvelope = {
            ...envelope,
            ciphertext: `${envelope.ciphertext[0] === "A" ? "B" : "A"}${envelope.ciphertext.slice(1)}`,
        };
        await expect(decryptTextWithPrivateKey(JSON.stringify(tamperedEnvelope), toPrivatePem(privateKeyData)))
            .rejects.toThrow("modified");
    });

    it("rejects a key that does not match the selected algorithm", async () => {
        const recipient = await crypto.subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveBits"],
        ) as CryptoKeyPair;
        const publicKeyData = await crypto.subtle.exportKey("spki", recipient.publicKey);

        await expect(encryptTextWithPublicKey(
            "secret",
            toPublicPem(publicKeyData),
            "RSA-OAEP-AES-256-GCM",
        )).rejects.toThrow("matches the selected algorithm");
    });

    it("rejects a malformed encrypted envelope", async () => {
        await expect(decryptTextWithPrivateKey("not JSON", "unused"))
            .rejects.toThrow("valid JSON");
    });
});
