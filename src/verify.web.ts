import { type SignatureAlgorithm, verifyTextSignature } from "./sign";

const publicKeyInput = document.querySelector<HTMLTextAreaElement>("#publicKey");
const originalTextInput = document.querySelector<HTMLTextAreaElement>("#originalText");
const signatureInput = document.querySelector<HTMLTextAreaElement>("#signature");
const algorithmSelect = document.querySelector<HTMLSelectElement>("#algorithm");
const verifyButton = document.querySelector<HTMLButtonElement>("#verifyButton");
const resultOutput = document.querySelector<HTMLDivElement>("#result");
const errorOutput = document.querySelector<HTMLDivElement>("#error");

function updateButtonState(): void {
    if (verifyButton) {
        verifyButton.disabled = !(
            publicKeyInput?.value.trim()
            && originalTextInput?.value
            && signatureInput?.value.trim()
        );
    }
}

function clearResult(): void {
    if (resultOutput) {
        resultOutput.textContent = "";
        resultOutput.className = "alert d-none";
    }
    if (errorOutput) errorOutput.textContent = "";
}

[publicKeyInput, originalTextInput, signatureInput, algorithmSelect].forEach(input => {
    input?.addEventListener("input", () => {
        clearResult();
        updateButtonState();
    });
});

verifyButton?.addEventListener("click", async () => {
    clearResult();
    if (!verifyButton) return;
    try {
        verifyButton.disabled = true;
        const isValid = await verifyTextSignature(
            publicKeyInput?.value ?? "",
            originalTextInput?.value ?? "",
            signatureInput?.value ?? "",
            (algorithmSelect?.value ?? "RSA") as SignatureAlgorithm,
        );
        if (resultOutput) {
            resultOutput.textContent = isValid ? "The signature is valid." : "The signature is invalid.";
            resultOutput.className = `alert ${isValid ? "alert-success" : "alert-danger"}`;
        }
    } catch (error) {
        if (errorOutput) errorOutput.textContent = error instanceof Error ? error.message : "An error occurred.";
    } finally {
        updateButtonState();
    }
});

updateButtonState();
