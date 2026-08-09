import { signText, type SignatureAlgorithm } from "./sign";

const privateKeyInput = document.querySelector<HTMLTextAreaElement>("#privateKey");
const textInput = document.querySelector<HTMLTextAreaElement>("#textToSign");
const algorithmSelect = document.querySelector<HTMLSelectElement>("#algorithm");
const signatureOutput = document.querySelector<HTMLTextAreaElement>("#signature");
const signButton = document.querySelector<HTMLButtonElement>("#signButton");
const copyButton = document.querySelector<HTMLButtonElement>("#copyButton");
const errorOutput = document.querySelector<HTMLDivElement>("#error");

function updateButtonState(): void {
    if (signButton) signButton.disabled = !(privateKeyInput?.value.trim() && textInput?.value);
}

function clearResult(): void {
    if (signatureOutput) signatureOutput.value = "";
    if (copyButton) copyButton.disabled = true;
    if (errorOutput) errorOutput.textContent = "";
}

[privateKeyInput, textInput, algorithmSelect].forEach(input => {
    input?.addEventListener("input", () => {
        clearResult();
        updateButtonState();
    });
});

signButton?.addEventListener("click", async () => {
    clearResult();
    if (!signButton) return;
    try {
        signButton.disabled = true;
        const signature = await signText(
            privateKeyInput?.value ?? "",
            textInput?.value ?? "",
            (algorithmSelect?.value ?? "RSA") as SignatureAlgorithm,
        );
        if (signatureOutput) signatureOutput.value = signature;
        if (copyButton) copyButton.disabled = false;
    } catch (error) {
        if (errorOutput) errorOutput.textContent = error instanceof Error ? error.message : "An error occurred.";
    } finally {
        updateButtonState();
    }
});

copyButton?.addEventListener("click", async () => {
    if (!signatureOutput?.value) return;
    try {
        await navigator.clipboard.writeText(signatureOutput.value);
    } catch {
        signatureOutput.select();
        document.execCommand("copy");
    }
});

updateButtonState();
