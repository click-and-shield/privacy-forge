import secrets from '@digitaldefiance/secrets';
import { qrcodegen } from "./qrcode";

const snsInput = document.querySelector<HTMLInputElement>("#SNS");
const bgButton = document.querySelector<HTMLButtonElement>("#BG");
const inputsContainer = document.querySelector<HTMLDivElement>("#inputsContainer");
const outputTextArea = document.querySelector<HTMLTextAreaElement>("#output");
const errorOutput = document.querySelector<HTMLParagraphElement>("#error");

const copyButton = document.querySelector<HTMLButtonElement>("#copyButton");
const bqrButton = document.querySelector<HTMLButtonElement>("#BQR");

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

function showError(message: string): void {
    if (errorOutput) {
        errorOutput.textContent = message;
    }
}

function hideQrCode(): void {
    if (qrcodeContainer) {
        qrcodeContainer.style.display = "none";
    }
}

function clearResults(): void {
    if (outputTextArea) {
        outputTextArea.value = "";
    }
    hideQrCode();
    clearError();
}

function clearError(): void {
    if (errorOutput) {
        errorOutput.textContent = "";
    }
}

/**
 * Met à jour les champs de saisie en fonction du nombre NM spécifié dans SNS.
 */
function updateInputs(): void {
    if (!inputsContainer || !snsInput) return;
    
    const nm = parseInt(snsInput.value, 10);
    inputsContainer.innerHTML = "";
    
    if (isNaN(nm) || nm < 1) {
        showError("Veuillez indiquer un nombre de clés valide (au moins 1).");
        return;
    }
    
    clearResults();
    
    for (let i = 0; i < nm; i++) {
        const div = document.createElement("div");
        div.className = "mb-3";
        
        const label = document.createElement("label");
        label.textContent = `Clé partagée ${i + 1} :`;
        label.className = "form-label fw-bold";
        
        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-control share-input";
        input.placeholder = `Entrez la clé ${i + 1}`;
        input.addEventListener("input", clearResults);
        
        div.appendChild(label);
        div.appendChild(input);
        inputsContainer.appendChild(div);
    }
}

// Écouter les changements sur le sélecteur SNS
snsInput?.addEventListener("input", updateInputs);

copyButton?.addEventListener("click", () => {
    if (outputTextArea) {
        outputTextArea.select();
        navigator.clipboard.writeText(outputTextArea.value);
    }
});

outputFormatSelect?.addEventListener("input", () => {
    if (scaleRow) {
        scaleRow.style.display = outputFormatSelect.value === "bitmap" ? "block" : "none";
    }
});

// Régénération immédiate lors de la modification des paramètres
[errCorLvlSelect, outputFormatSelect, borderInput, scaleInput, boostEccInput].forEach(input => {
    input?.addEventListener("input", () => {
        if (outputTextArea?.value) {
            generateQrCode(outputTextArea.value);
        }
    });
});

bqrButton?.addEventListener("click", () => {
    if (outputTextArea?.value) {
        generateQrCode(outputTextArea.value);
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

// Action du bouton Generate (BG)
bgButton?.addEventListener("click", () => {
    clearError();
    hideQrCode();
    
    try {
        const inputs = document.querySelectorAll<HTMLInputElement>(".share-input");
        const shares: string[] = [];
        let missing = false;
        
        inputs.forEach((input, index) => {
            const val = input.value.trim();
            if (!val) {
                missing = true;
            } else {
                // Validation de la validité de la clé
                try {
                    secrets.extractShareComponents(val);
                } catch (e) {
                    throw new Error(`La clé ${index + 1} est invalide.`);
                }
                shares.push(val);
            }
        });

        if (missing) {
            showError("Une ou plusieurs clés partagées sont manquantes.");
            return;
        }

        if (shares.length === 0) {
            showError("Veuillez entrer au moins une clé.");
            return;
        }

        // Vérification sommaire de cohérence (bits identiques)
        const firstShareComponents = secrets.extractShareComponents(shares[0]);
        const bits = firstShareComponents.bits;
        
        for (let i = 1; i < shares.length; i++) {
            const comps = secrets.extractShareComponents(shares[i]);
            if (comps.bits !== bits) {
                throw new Error("Les clés fournies ne semblent pas provenir du même partage (nombre de bits différent).");
            }
        }

        // Reconstruire le secret
        // Note: secrets.combine retournera un résultat erroné si le nombre de clés est inférieur au seuil (threshold)
        const combinedHex = secrets.combine(shares);
        
        // Convertir en texte
        const secret = secrets.hex2str(combinedHex);
        
        if (outputTextArea) {
            outputTextArea.value = secret;
            if (!secret || secret.includes('\u0000')) {
                showError("Le secret semble invalide. Le nombre de clés partagées n'est peut-être pas suffisant.");
            }
        }
    } catch (error) {
        console.error(error);
        showError(error instanceof Error ? error.message : "Une erreur est survenue lors de la reconstruction.");
    }
});

// Appel initial
updateInputs();
