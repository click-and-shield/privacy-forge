import secrets from '@digitaldefiance/secrets';

// Déclaration pour qrcodegen qui est chargé via un script séparé
declare const qrcodegen: any;

const secretInput = document.querySelector<HTMLTextAreaElement>("#FSK");
const numSharesInput = document.querySelector<HTMLInputElement>("#SSS");
const thresholdInput = document.querySelector<HTMLInputElement>("#SSN");
const generateButton = document.querySelector<HTMLButtonElement>("#BG");
const sharesList = document.querySelector<HTMLUListElement>("#sharesList");
const errorOutput = document.querySelector<HTMLParagraphElement>("#error");

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

let currentQrText: string = "";

function showError(message: string): void {
    if (errorOutput) {
        errorOutput.textContent = message;
    }
}

function clearError(): void {
    if (errorOutput) {
        errorOutput.textContent = "";
    }
}

function hideQrCode(): void {
    if (qrcodeContainer) {
        qrcodeContainer.style.display = "none";
    }
    currentQrText = "";
}

function clearResults(): void {
    if (sharesList) {
        sharesList.innerHTML = "";
    }
    hideQrCode();
    clearError();
}

[secretInput, numSharesInput, thresholdInput].forEach(input => {
    input?.addEventListener("input", clearResults);
});

outputFormatSelect?.addEventListener("input", () => {
    if (scaleRow) {
        scaleRow.style.display = outputFormatSelect.value === "bitmap" ? "block" : "none";
    }
});

// Régénération immédiate lors de la modification des paramètres
[errCorLvlSelect, outputFormatSelect, borderInput, scaleInput, boostEccInput].forEach(input => {
    input?.addEventListener("input", () => {
        if (currentQrText) {
            generateQrCode(currentQrText);
        }
    });
});

generateButton?.addEventListener("click", () => {
    clearError();
    if (sharesList) {
        sharesList.innerHTML = "";
    }
    hideQrCode();

    try {
        const secret = secretInput?.value ?? "";
        const n = parseInt(numSharesInput?.value ?? "0", 10);
        const t = parseInt(thresholdInput?.value ?? "0", 10);

        if (!secret) {
            showError("Veuillez entrer un secret.");
            return;
        }

        if (isNaN(n) || n < 2) {
            showError("Le nombre de clés partagées (N) doit être au moins 2.");
            return;
        }

        if (isNaN(t) || t < 2) {
            showError("Le nombre minimum de clés (NM) doit être au moins 2.");
            return;
        }

        if (t > n) {
            showError("Le nombre minimum de clés (NM) ne peut pas être supérieur au nombre total de clés (N).");
            return;
        }

        // Convertir le secret en hexadécimal
        const secretHex = secrets.str2hex(secret);

        // Diviser le secret
        const shares = secrets.share(secretHex, n, t);

        // Afficher les clés générées
        shares.forEach((share, index) => {
            const li = document.createElement("li");
            li.className = "d-flex justify-content-between align-items-center";
            
            const shareText = document.createElement("div");
            shareText.className = "text-break me-2";
            shareText.innerHTML = `<strong>Clé ${index + 1}:</strong> <span>${share}</span>`;
            
            const btnGroup = document.createElement("div");
            btnGroup.className = "flex-shrink-0";
            
            const qrBtn = document.createElement("button");
            qrBtn.className = "btn btn-sm btn-info me-1";
            qrBtn.textContent = "Générer un QR code";
            qrBtn.onclick = () => generateQrCode(share);
            
            const copyBtn = document.createElement("button");
            copyBtn.className = "btn btn-sm btn-secondary";
            copyBtn.textContent = "Copier";
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(share);
            };
            
            btnGroup.appendChild(qrBtn);
            btnGroup.appendChild(copyBtn);
            
            li.appendChild(shareText);
            li.appendChild(btnGroup);
            
            sharesList?.appendChild(li);
        });

    } catch (error) {
        console.error(error);
        showError(error instanceof Error ? error.message : "Une erreur est survenue lors de la génération.");
    }
});

function generateQrCode(text: string): void {
    if (typeof qrcodegen === "undefined") {
        showError("La bibliothèque QR Code n'est pas chargée.");
        return;
    }

    if (!qrcodeCanvas || !qrcodeSvg || !qrcodeContainer || !downloadQrLink) return;

    if (!text) {
        qrcodeContainer.style.display = "none";
        return;
    }

    currentQrText = text;

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
        showError(error instanceof Error ? error.message : "Erreur lors de la génération du QR Code.");
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
