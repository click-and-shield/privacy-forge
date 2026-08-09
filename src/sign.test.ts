import { describe, expect, it } from "vitest";
import { signText, type SignatureAlgorithm, verifyTextSignature } from "./sign";

function toPem(keyData: ArrayBuffer): string {
    const base64 = Buffer.from(keyData).toString("base64");
    const lines = base64.match(/.{1,64}/g)?.join("\n") ?? "";
    return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

function toPublicPem(keyData: ArrayBuffer): string {
    const base64 = Buffer.from(keyData).toString("base64");
    const lines = base64.match(/.{1,64}/g)?.join("\n") ?? "";
    return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

function fromBase64(value: string): ArrayBuffer {
    return Uint8Array.from(Buffer.from(value, "base64")).buffer;
}

describe("signText", () => {
    const cases: ReadonlyArray<{
        label: string;
        selection: SignatureAlgorithm;
        generation: RsaHashedKeyGenParams | EcKeyGenParams | AlgorithmIdentifier;
        verification: AlgorithmIdentifier | RsaPssParams | EcdsaParams;
    }> = [
        {
            label: "RSA PKCS#1 v1.5",
            selection: "RSA",
            generation: { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
            verification: { name: "RSASSA-PKCS1-v1_5" },
        },
        {
            label: "RSA-PSS",
            selection: "RSA-PSS",
            generation: { name: "RSA-PSS", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
            verification: { name: "RSA-PSS", saltLength: 32 },
        },
        {
            label: "ECDSA",
            selection: "ECDSA",
            generation: { name: "ECDSA", namedCurve: "P-256" },
            verification: { name: "ECDSA", hash: "SHA-256" },
        },
        {
            label: "Ed25519",
            selection: "Ed25519",
            generation: { name: "Ed25519" },
            verification: { name: "Ed25519" },
        },
    ];

    for (const testCase of cases) {
        it(`creates a verifiable ${testCase.label} signature`, async () => {
            const keys = await crypto.subtle.generateKey(
                testCase.generation,
                true,
                ["sign", "verify"],
            ) as CryptoKeyPair;
            const privateKeyData = await crypto.subtle.exportKey("pkcs8", keys.privateKey);
            const publicKeyData = await crypto.subtle.exportKey("spki", keys.publicKey);
            const message = "Message à signer";
            const signature = await signText(toPem(privateKeyData), message, testCase.selection);

            await expect(crypto.subtle.verify(
                testCase.verification,
                keys.publicKey,
                fromBase64(signature),
                new TextEncoder().encode(message),
            )).resolves.toBe(true);

            await expect(verifyTextSignature(
                toPublicPem(publicKeyData),
                message,
                signature,
                testCase.selection,
            )).resolves.toBe(true);

            await expect(verifyTextSignature(
                toPublicPem(publicKeyData),
                `${message} modifié`,
                signature,
                testCase.selection,
            )).resolves.toBe(false);
        });
    }

    it("rejects a non-PKCS#8 PEM key", async () => {
        await expect(signText("-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----", "message", "RSA"))
            .rejects.toThrow("PKCS#8");
    });

    it("rejects a malformed Base64 signature", async () => {
        await expect(verifyTextSignature(
            "-----BEGIN PUBLIC KEY-----\nYWJj\n-----END PUBLIC KEY-----",
            "message",
            "not Base64!",
            "RSA",
        )).rejects.toThrow("valid Base64");
    });
});
