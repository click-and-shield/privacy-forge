export type SignatureAlgorithm = "RSA" | "RSA-PSS" | "ECDSA" | "Ed25519";

const EC_CURVES: ReadonlyArray<{ oid: number[]; name: "P-256" | "P-384" | "P-521" }> = [
    { oid: [0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07], name: "P-256" },
    { oid: [0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x22], name: "P-384" },
    { oid: [0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x23], name: "P-521" },
];

function pemToDer(pem: string): ArrayBuffer {
    const match = pem.trim().match(
        /^-----BEGIN PRIVATE KEY-----\s+([A-Za-z0-9+/=\s]+?)\s+-----END PRIVATE KEY-----$/,
    );
    if (!match) {
        throw new Error("The private key must be an unencrypted PKCS#8 PEM key (BEGIN PRIVATE KEY).");
    }
    try {
        const binary = atob(match[1].replace(/\s/g, ""));
        return Uint8Array.from(binary, character => character.charCodeAt(0)).buffer;
    } catch {
        throw new Error("The PEM private key is not valid Base64.");
    }
}

function containsBytes(haystack: Uint8Array, needle: readonly number[]): boolean {
    outer: for (let index = 0; index <= haystack.length - needle.length; index++) {
        for (let offset = 0; offset < needle.length; offset++) {
            if (haystack[index + offset] !== needle[offset]) continue outer;
        }
        return true;
    }
    return false;
}

function detectEcCurve(keyData: ArrayBuffer): "P-256" | "P-384" | "P-521" {
    const bytes = new Uint8Array(keyData);
    const curve = EC_CURVES.find(candidate => containsBytes(bytes, candidate.oid));
    if (!curve) throw new Error("Unsupported ECDSA curve. Use a P-256, P-384, or P-521 key.");
    return curve.name;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
}

function publicPemToDer(pem: string): ArrayBuffer {
    const match = pem.trim().match(
        /^-----BEGIN PUBLIC KEY-----\s+([A-Za-z0-9+/=\s]+?)\s+-----END PUBLIC KEY-----$/,
    );
    if (!match) {
        throw new Error("The public key must be an SPKI PEM key (BEGIN PUBLIC KEY).");
    }
    try {
        const binary = atob(match[1].replace(/\s/g, ""));
        return Uint8Array.from(binary, character => character.charCodeAt(0)).buffer;
    } catch {
        throw new Error("The PEM public key is not valid Base64.");
    }
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
    const normalized = value.replace(/\s/g, "");
    if (!normalized || normalized.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) {
        throw new Error("The signature is not valid Base64.");
    }
    try {
        const binary = atob(normalized);
        return Uint8Array.from(binary, character => character.charCodeAt(0)).buffer;
    } catch {
        throw new Error("The signature is not valid Base64.");
    }
}

export async function signText(
    privateKeyPem: string,
    text: string,
    algorithm: SignatureAlgorithm,
): Promise<string> {
    if (!privateKeyPem.trim()) throw new Error("The private key must not be empty.");
    if (!text) throw new Error("The text to sign must not be empty.");

    const keyData = pemToDer(privateKeyPem);
    const data = new TextEncoder().encode(text);
    let importAlgorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams;
    let signatureAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams;

    switch (algorithm) {
        case "RSA":
            importAlgorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
            signatureAlgorithm = { name: "RSASSA-PKCS1-v1_5" };
            break;
        case "RSA-PSS":
            importAlgorithm = { name: "RSA-PSS", hash: "SHA-256" };
            signatureAlgorithm = { name: "RSA-PSS", saltLength: 32 };
            break;
        case "ECDSA": {
            const namedCurve = detectEcCurve(keyData);
            importAlgorithm = { name: "ECDSA", namedCurve };
            const hash = namedCurve === "P-256" ? "SHA-256" : namedCurve === "P-384" ? "SHA-384" : "SHA-512";
            signatureAlgorithm = { name: "ECDSA", hash };
            break;
        }
        case "Ed25519":
            importAlgorithm = { name: "Ed25519" };
            signatureAlgorithm = { name: "Ed25519" };
            break;
        default:
            throw new Error("Unsupported signature algorithm.");
    }

    try {
        const privateKey = await crypto.subtle.importKey("pkcs8", keyData, importAlgorithm, false, ["sign"]);
        const signature = await crypto.subtle.sign(signatureAlgorithm, privateKey, data);
        return arrayBufferToBase64(signature);
    } catch {
        throw new Error("Signing failed. Check that the key matches the selected algorithm and is supported by this browser.");
    }
}

export async function verifyTextSignature(
    publicKeyPem: string,
    text: string,
    signatureBase64: string,
    algorithm: SignatureAlgorithm,
): Promise<boolean> {
    if (!publicKeyPem.trim()) throw new Error("The public key must not be empty.");
    if (!text) throw new Error("The original text must not be empty.");
    if (!signatureBase64.trim()) throw new Error("The signature must not be empty.");

    const keyData = publicPemToDer(publicKeyPem);
    const signature = base64ToArrayBuffer(signatureBase64);
    const data = new TextEncoder().encode(text);
    let importAlgorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams;
    let verificationAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams;

    switch (algorithm) {
        case "RSA":
            importAlgorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
            verificationAlgorithm = { name: "RSASSA-PKCS1-v1_5" };
            break;
        case "RSA-PSS":
            importAlgorithm = { name: "RSA-PSS", hash: "SHA-256" };
            verificationAlgorithm = { name: "RSA-PSS", saltLength: 32 };
            break;
        case "ECDSA": {
            const namedCurve = detectEcCurve(keyData);
            importAlgorithm = { name: "ECDSA", namedCurve };
            const hash = namedCurve === "P-256" ? "SHA-256" : namedCurve === "P-384" ? "SHA-384" : "SHA-512";
            verificationAlgorithm = { name: "ECDSA", hash };
            break;
        }
        case "Ed25519":
            importAlgorithm = { name: "Ed25519" };
            verificationAlgorithm = { name: "Ed25519" };
            break;
        default:
            throw new Error("Unsupported signature algorithm.");
    }

    try {
        const publicKey = await crypto.subtle.importKey("spki", keyData, importAlgorithm, false, ["verify"]);
        return await crypto.subtle.verify(verificationAlgorithm, publicKey, signature, data);
    } catch {
        throw new Error("Verification failed. Check that the public key matches the selected algorithm and is supported by this browser.");
    }
}
