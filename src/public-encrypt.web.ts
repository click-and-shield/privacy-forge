import {
    encryptTextWithPublicKey,
    type PublicKeyEncryptionAlgorithm,
} from "./public-key-encryption";

const plaintextInput = document.querySelector<HTMLTextAreaElement>("#plainText");
const publicKeyInput = document.querySelector<HTMLTextAreaElement>("#publicKey");
const algorithmSelect = document.querySelector<HTMLSelectElement>("#algorithm");
const encryptedOutput = document.querySelector<HTMLTextAreaElement>("#encryptedText");
const encryptButton = document.querySelector<HTMLButtonElement>("#encryptButton");
const copyButton = document.querySelector<HTMLButtonElement>("#copyButton");
const errorOutput = document.querySelector<HTMLDivElement>("#error");

function updateButtonState(): void {
    if (encryptButton) {
        encryptButton.disabled = !(plaintextInput?.value && publicKeyInput?.value.trim());
    }
}

function clearResult(): void {
    if (encryptedOutput) encryptedOutput.value = "";
    if (copyButton) copyButton.disabled = true;
    if (errorOutput) errorOutput.textContent = "";
}

[plaintextInput, publicKeyInput, algorithmSelect].forEach(input => {
    input?.addEventListener("input", () => {
        clearResult();
        updateButtonState();
    });
});

encryptButton?.addEventListener("click", async () => {
    clearResult();
    if (!encryptButton) return;
    try {
        encryptButton.disabled = true;
        const encrypted = await encryptTextWithPublicKey(
            plaintextInput?.value ?? "",
            publicKeyInput?.value ?? "",
            (algorithmSelect?.value ?? "ECDH-HKDF-AES-256-GCM") as PublicKeyEncryptionAlgorithm,
        );
        if (encryptedOutput) encryptedOutput.value = encrypted;
        if (copyButton) copyButton.disabled = false;
    } catch (error) {
        if (errorOutput) errorOutput.textContent = error instanceof Error ? error.message : "An error occurred.";
    } finally {
        updateButtonState();
    }
});

copyButton?.addEventListener("click", async () => {
    if (!encryptedOutput?.value) return;
    try {
        await navigator.clipboard.writeText(encryptedOutput.value);
    } catch {
        encryptedOutput.select();
        document.execCommand("copy");
    }
});

updateButtonState();
