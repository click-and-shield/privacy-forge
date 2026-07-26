import { describe, expect, it } from "vitest";
import { decryptText, encryptText } from "./crypt";

describe("crypt", () => {
    it("encrypts then decrypts a text", async () => {
        const plaintext = "Secret message";
        const password = "my secret passphrase";

        const encrypted = await encryptText(
            plaintext,
            password,
            1_000
        );

        const decrypted = await decryptText(
            encrypted,
            password
        );

        expect(decrypted).toBe(plaintext);
    });

    it("does not return the original text during encryption", async () => {
        const plaintext = "Secret message";
        const password = "my secret passphrase";

        const encrypted = await encryptText(
            plaintext,
            password,
            1_000
        );

        expect(encrypted).not.toBe(plaintext);
    });

    it("produces two different encryptions for the same text", async () => {
        const plaintext = "Secret message";
        const password = "my secret passphrase";

        const firstEncrypted = await encryptText(
            plaintext,
            password,
            1_000
        );

        const secondEncrypted = await encryptText(
            plaintext,
            password,
            1_000
        );

        expect(firstEncrypted).not.toBe(secondEncrypted);
    });

    it("fails with an incorrect passphrase", async () => {
        const plaintext = "Secret message";

        const encrypted = await encryptText(
            plaintext,
            "correct passphrase",
            1_000
        );

        await expect(
            decryptText(encrypted, "wrong passphrase")
        ).rejects.toThrow(
            "Decryption failed"
        );
    });

    it("fails with an empty passphrase during encryption", async () => {
        await expect(
            encryptText("Secret message", "", 1_000)
        ).rejects.toThrow(
            "The passphrase must not be empty."
        );
    });

    it("fails with an empty passphrase during decryption", async () => {
        await expect(
            decryptText("abc", "")
        ).rejects.toThrow(
            "The passphrase must not be empty."
        );
    });

    it("fails with an invalid number of iterations", async () => {
        await expect(
            encryptText("Secret message", "secret", 0)
        ).rejects.toThrow(
            "The number of iterations must be between"
        );
    });
});