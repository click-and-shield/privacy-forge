import {
    decryptGpgText,
    encryptGpgText,
    generateGpgKeyPair,
    signGpgText,
    verifyGpgSignature,
    type GpgKeyPurpose,
} from "./openpgp-tools";

function value(id: string): string {
    return document.querySelector<HTMLTextAreaElement | HTMLInputElement>(`#${id}`)?.value ?? "";
}

function setValue(id: string, content: string): void {
    const element = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(`#${id}`);
    if (element) element.value = content;
}

function showError(form: HTMLFormElement, error: unknown): void {
    const output = form.querySelector<HTMLElement>("[data-error]");
    if (output) output.textContent = error instanceof Error ? error.message : "An unexpected error occurred.";
}

async function run(form: HTMLFormElement, action: () => Promise<void>): Promise<void> {
    const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
    const error = form.querySelector<HTMLElement>("[data-error]");
    if (error) error.textContent = "";
    if (button) button.disabled = true;
    try {
        await action();
    } catch (caught) {
        showError(form, caught);
    } finally {
        if (button) button.disabled = false;
    }
}

function bindForm(id: string, action: (form: HTMLFormElement) => Promise<void>): void {
    document.querySelector<HTMLFormElement>(`#${id}`)?.addEventListener("submit", event => {
        event.preventDefault();
        void action(event.currentTarget as HTMLFormElement);
    });
}

bindForm("encryptForm", form => run(form, async () => {
    setValue("encryptedOutput", await encryptGpgText(value("encryptText"), value("encryptPublicKey")));
}));

bindForm("decryptForm", form => run(form, async () => {
    setValue("decryptedOutput", await decryptGpgText(
        value("decryptMessage"), value("decryptPrivateKey"), value("decryptPassphrase"),
    ));
}));

bindForm("signForm", form => run(form, async () => {
    setValue("signatureOutput", await signGpgText(
        value("signText"), value("signPrivateKey"), value("signPassphrase"),
    ));
}));

bindForm("verifyForm", form => run(form, async () => {
    const valid = await verifyGpgSignature(
        value("verifyText"), value("verifySignature"), value("verifyPublicKey"),
    );
    const result = form.querySelector<HTMLElement>("[data-result]");
    if (result) {
        result.textContent = valid ? "Valid signature." : "Invalid signature.";
        result.className = `alert ${valid ? "alert-success" : "alert-danger"}`;
        result.hidden = false;
    }
}));

function bindKeyGeneration(formId: string, prefix: string, purpose: GpgKeyPurpose): void {
    bindForm(formId, form => run(form, async () => {
        const passphrase = value(`${prefix}Passphrase`);
        if (passphrase !== value(`${prefix}PassphraseConfirm`)) {
            throw new Error("The passphrases do not match.");
        }
        const keys = await generateGpgKeyPair(
            purpose, value(`${prefix}Name`), value(`${prefix}Email`), passphrase,
        );
        setValue(`${prefix}Fingerprint`, keys.fingerprint);
        setValue(`${prefix}PublicKey`, keys.publicKey);
        setValue(`${prefix}PrivateKey`, keys.privateKey);
        setValue(`${prefix}Revocation`, keys.revocationCertificate);
    }));
}

bindKeyGeneration("encryptionKeyForm", "encryptionKey", "encryption");
bindKeyGeneration("signatureKeyForm", "signatureKey", "signature");

document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach(button => {
    button.addEventListener("click", async () => {
        const target = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(`#${button.dataset.copy}`);
        if (!target?.value) return;
        try {
            await navigator.clipboard.writeText(target.value);
        } catch {
            target.select();
            document.execCommand("copy");
        }
    });
});
