import { encryptText } from "./crypt";

// Déclaration pour qrcodegen qui est chargé via un script séparé
declare const qrcodegen: any;

const plainTextInput = document.querySelector<HTMLTextAreaElement>("#plainText");
const passwordInput = document.querySelector<HTMLInputElement>("#password");
const encryptedTextInput = document.querySelector<HTMLTextAreaElement>("#encryptedText");
const errorOutput = document.querySelector<HTMLParagraphElement>("#error");

const encryptButton = document.querySelector<HTMLButtonElement>("#encryptButton");
const bqrButton = document.querySelector<HTMLButtonElement>("#BQR");
const copyButton = document.querySelector<HTMLButtonElement>("#copyButton");

const qrcodeContainer = document.querySelector<HTMLDivElement>("#qrcode-container");
const qrcodeCanvas = document.querySelector<HTMLCanvasElement>("#qrcode-canvas");
const qrcodeSvg = document.querySelector<SVGElement>("#qrcode-svg");
const downloadQrLink = document.querySelector<HTMLAnchorElement>("#download-qr");

const errCorLvlSelect = document.querySelector<HTMLSelectElement>("#errcorlvl");
const outputFormatSelect = document.querySelector<HTMLSelectElement>("#output-format");
const borderInput = document.querySelector<HTMLInputElement>("#border-input");
const scaleInput = document.querySelector<HTMLInputElement>("#scale-input");
const boostEccInput = document.querySelector<HTMLInputElement>("#boost-ecc-input");
const scaleRow = document.querySelector<HTMLDivElement>("#scale-row");

function clearError(): void {
    if (errorOutput) {
        errorOutput.textContent = "";
    }
}

function showError(error: unknown): void {
    if (errorOutput) {
        errorOutput.textContent =
            error instanceof Error ? error.message : "Une erreur est survenue.";
    }
}

encryptButton?.addEventListener("click", async () => {
    clearError();

    try {
        const plaintext = plainTextInput?.value ?? "";
        const password = passwordInput?.value ?? "";

        const encrypted = await encryptText(
            plaintext,
            password
        );

        if (encryptedTextInput) {
            encryptedTextInput.value = encrypted;
            if (bqrButton) {
                bqrButton.disabled = !encrypted.trim();
            }
            generateQrCode();
        }
    } catch (error) {
        showError(error);
    }
});

function updateEncryptButtonState(): void {
    if (encryptButton) {
        const hasText = (plainTextInput?.value.trim().length ?? 0) > 0;
        const hasPassword = (passwordInput?.value.trim().length ?? 0) > 0;
        encryptButton.disabled = !hasText || !hasPassword;
    }
}

function hideQrCode(): void {
    if (qrcodeContainer) {
        qrcodeContainer.style.display = "none";
    }
}

plainTextInput?.addEventListener("input", () => {
    updateEncryptButtonState();
    hideQrCode();
});

passwordInput?.addEventListener("input", () => {
    updateEncryptButtonState();
    hideQrCode();
});

copyButton?.addEventListener("click", () => {
    if (encryptedTextInput) {
        encryptedTextInput.select();
        navigator.clipboard.writeText(encryptedTextInput.value);
    }
});

encryptedTextInput?.addEventListener("input", () => {
    if (bqrButton) {
        bqrButton.disabled = !encryptedTextInput.value.trim();
    }
    generateQrCode();
});

outputFormatSelect?.addEventListener("input", () => {
    if (scaleRow) {
        scaleRow.style.display = outputFormatSelect.value === "bitmap" ? "block" : "none";
    }
});

// Régénération immédiate lors de la modification des paramètres
[errCorLvlSelect, outputFormatSelect, borderInput, scaleInput, boostEccInput].forEach(input => {
    input?.addEventListener("input", () => {
        generateQrCode();
    });
});

bqrButton?.addEventListener("click", () => {
    generateQrCode();
});

// Initialisation au chargement
updateEncryptButtonState();
if (encryptedTextInput?.value.trim()) {
    generateQrCode();
}
if (bqrButton && encryptedTextInput) {
    bqrButton.disabled = !encryptedTextInput.value.trim();
}

function generateQrCode(): void {
    if (typeof qrcodegen === "undefined") {
        showError(new Error("La bibliothèque QR Code n'est pas chargée."));
        return;
    }

    if (!encryptedTextInput || !qrcodeCanvas || !qrcodeSvg || !qrcodeContainer || !downloadQrLink) return;

    const text = encryptedTextInput.value;
    if (!text) {
        qrcodeContainer.style.display = "none";
        return;
    }

    try {
        const ecl = getEccLevel();
        const segs = qrcodegen.QrSegment.makeSegments(text);
        const boostEcc = boostEccInput?.checked ?? true;
        const qr = qrcodegen.QrCode.encodeSegments(segs, ecl, 1, 40, -1, boostEcc);

        const border = parseInt(borderInput?.value ?? "4", 10);
        const lightColor = "#FFFFFF";
        const darkColor = "#000000";

        const isBitmap = outputFormatSelect?.value === "bitmap";

        qrcodeCanvas.style.display = "none";
        qrcodeSvg.style.display = "none";

        if (isBitmap) {
            const scale = parseInt(scaleInput?.value ?? "8", 10);
            drawCanvas(qr, scale, border, lightColor, darkColor, qrcodeCanvas);
            qrcodeCanvas.style.display = "block";
            downloadQrLink.href = qrcodeCanvas.toDataURL("image/png");
            downloadQrLink.download = "qrcode.png";
        } else {
            const svgCode = toSvgString(qr, border, lightColor, darkColor);
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgCode, "image/svg+xml");
            const newSvg = doc.documentElement;

            // Remplacer le contenu du SVG existant
            while (qrcodeSvg.firstChild) {
                qrcodeSvg.removeChild(qrcodeSvg.firstChild);
            }
            
            qrcodeSvg.setAttribute("viewBox", newSvg.getAttribute("viewBox") || "");
            for (const child of Array.from(newSvg.childNodes)) {
                qrcodeSvg.appendChild(qrcodeSvg.ownerDocument.importNode(child, true));
            }

            qrcodeSvg.style.display = "block";
            downloadQrLink.href = "data:application/svg+xml," + encodeURIComponent(svgCode);
            downloadQrLink.download = "qrcode.svg";
        }

        qrcodeContainer.style.display = "block";
    } catch (error) {
        showError(error);
    }
}

function getEccLevel(): any {
    const value = errCorLvlSelect?.value;
    switch (value) {
        case "MEDIUM": return qrcodegen.QrCode.Ecc.MEDIUM;
        case "QUARTILE": return qrcodegen.QrCode.Ecc.QUARTILE;
        case "HIGH": return qrcodegen.QrCode.Ecc.HIGH;
        default: return qrcodegen.QrCode.Ecc.LOW;
    }
}

function drawCanvas(qr: any, scale: number, border: number, lightColor: string, darkColor: string, canvas: HTMLCanvasElement): void {
    const width = (qr.size + border * 2) * scale;
    canvas.width = width;
    canvas.height = width;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    for (let y = -border; y < qr.size + border; y++) {
        for (let x = -border; x < qr.size + border; x++) {
            ctx.fillStyle = qr.getModule(x, y) ? darkColor : lightColor;
            ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
        }
    }
}

function toSvgString(qr: any, border: number, lightColor: string, darkColor: string): string {
    const parts: string[] = [];
    for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
            if (qr.getModule(x, y)) {
                parts.push(`M${x + border},${y + border}h1v1h-1z`);
            }
        }
    }
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${qr.size + border * 2} ${qr.size + border * 2}" stroke="none">
    <rect width="100%" height="100%" fill="${lightColor}"/>
    <path d="${parts.join(" ")}" fill="${darkColor}"/>
</svg>`;
}
