import { describe, expect, it } from "vitest";
import {
    decryptGpgText,
    encryptGpgText,
    generateGpgKeyPair,
    signGpgText,
    verifyGpgSignature,
} from "./openpgp-tools";

describe("OpenPGP tools", () => {
    it("generates an encryption key pair and encrypts locally", async () => {
        const keys = await generateGpgKeyPair("encryption", "Alice", "alice@example.test", "secret");
        const encrypted = await encryptGpgText("message confidentiel", keys.publicKey);

        expect(keys.publicKey).toContain("BEGIN PGP PUBLIC KEY BLOCK");
        expect(keys.privateKey).toContain("BEGIN PGP PRIVATE KEY BLOCK");
        expect(keys.revocationCertificate).toContain("BEGIN PGP PUBLIC KEY BLOCK");
        await expect(decryptGpgText(encrypted, keys.privateKey, "secret"))
            .resolves.toBe("message confidentiel");
    }, 30_000);

    it("generates a signature key pair and verifies detached signatures", async () => {
        const keys = await generateGpgKeyPair("signature", "Bob", "bob@example.test", "secret");
        const signature = await signGpgText("texte signé", keys.privateKey, "secret");

        expect(signature).toContain("BEGIN PGP SIGNATURE");
        await expect(verifyGpgSignature("texte signé", signature, keys.publicKey)).resolves.toBe(true);
        await expect(verifyGpgSignature("texte modifié", signature, keys.publicKey)).resolves.toBe(false);
    }, 30_000);
});
