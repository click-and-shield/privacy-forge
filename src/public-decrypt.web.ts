import { decryptTextWithPrivateKey } from "./public-key-encryption";

const encryptedInput = document.querySelector<HTMLTextAreaElement>("#encryptedEnvelope");
const privateKeyInput = document.querySelector<HTMLTextAreaElement>("#privateKey");
const decryptedOutput = document.querySelector<HTMLTextAreaElement>("#decryptedText");
const decryptButton = document.querySelector<HTMLButtonElement>("#decryptButton");
const copyButton = document.querySelector<HTMLButtonElement>("#copyButton");
const errorOutput = document.querySelector<HTMLDivElement>("#error");

function updateButtonState(): void {
    if (decryptButton) {
        decryptButton.disabled = !(encryptedInput?.value.trim() && privateKeyInput?.value.trim());
    }
}

function clearResult(): void {
    if (decryptedOutput) decryptedOutput.value = "";
    if (copyButton) copyButton.disabled = true;
    if (errorOutput) errorOutput.textContent = "";
}

[encryptedInput, privateKeyInput].forEach(input => {
    input?.addEventListener("input", () => {
        clearResult();
        updateButtonState();
    });
});

decryptButton?.addEventListener("click", async () => {
    clearResult();
    if (!decryptButton) return;
    try {
        decryptButton.disabled = true;
        const plaintext = await decryptTextWithPrivateKey(
            encryptedInput?.value ?? "",
            privateKeyInput?.value ?? "",
        );
        if (decryptedOutput) decryptedOutput.value = plaintext;
        if (copyButton) copyButton.disabled = false;
    } catch (error) {
        if (errorOutput) errorOutput.textContent = error instanceof Error ? error.message : "An error occurred.";
    } finally {
        updateButtonState();
    }
});

copyButton?.addEventListener("click", async () => {
    if (!decryptedOutput?.value) return;
    try {
        await navigator.clipboard.writeText(decryptedOutput.value);
    } catch {
        decryptedOutput.select();
        document.execCommand("copy");
    }
});

updateButtonState();
