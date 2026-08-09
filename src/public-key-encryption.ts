export type PublicKeyEncryptionAlgorithm =
    | "ECDH-HKDF-AES-256-GCM"
    | "RSA-OAEP-AES-256-GCM";

export interface EcdhEncryptionEnvelope {
    version: 1;
    algorithm: "ECDH-HKDF-AES-256-GCM";
    curve: "P-256" | "P-384" | "P-521";
    ephemeralPublicKey: string;
    salt: string;
    iv: string;
    ciphertext: string;
}

export interface RsaEncryptionEnvelope {
    version: 1;
    algorithm: "RSA-OAEP-AES-256-GCM";
    wrappedKey: string;
    iv: string;
    ciphertext: string;
}

export type PublicKeyEncryptionEnvelope = EcdhEncryptionEnvelope | RsaEncryptionEnvelope;

const EC_CURVES: ReadonlyArray<{
    oid: number[];
    name: "P-256" | "P-384" | "P-521";
    bits: number;
}> = [
    { oid: [0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07], name: "P-256", bits: 256 },
    { oid: [0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x22], name: "P-384", bits: 384 },
    { oid: [0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x23], name: "P-521", bits: 528 },
];

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const IV_LENGTH = 12;
const SALT_LENGTH = 32;
const AES_KEY_LENGTH = 32;
const GCM_TAG_LENGTH = 128;

function publicPemToDer(pem: string): ArrayBuffer {
    const match = pem.trim().match(
        /^-----BEGIN PUBLIC KEY-----\s+([A-Za-z0-9+/=\s]+?)\s+-----END PUBLIC KEY-----$/,
    );
    if (!match) throw new Error("The public key must be an SPKI PEM key (BEGIN PUBLIC KEY).");

    try {
        const binary = atob(match[1].replace(/\s/g, ""));
        return Uint8Array.from(binary, character => character.charCodeAt(0)).buffer;
    } catch {
        throw new Error("The PEM public key is not valid Base64.");
    }
}

function privatePemToDer(pem: string): ArrayBuffer {
    const match = pem.trim().match(
        /^-----BEGIN PRIVATE KEY-----\s+([A-Za-z0-9+/=\s]+?)\s+-----END PRIVATE KEY-----$/,
    );
    if (!match) throw new Error("The private key must be an unencrypted PKCS#8 PEM key (BEGIN PRIVATE KEY).");

    try {
        const binary = atob(match[1].replace(/\s/g, ""));
        return Uint8Array.from(binary, character => character.charCodeAt(0)).buffer;
    } catch {
        throw new Error("The PEM private key is not valid Base64.");
    }
}

function base64ToBytes(value: unknown, fieldName: string): Uint8Array<ArrayBuffer> {
    if (typeof value !== "string") throw new Error(`The envelope field '${fieldName}' is missing.`);
    const normalized = value.replace(/\s/g, "");
    if (!normalized || normalized.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) {
        throw new Error(`The envelope field '${fieldName}' is not valid Base64.`);
    }
    try {
        const binary = atob(normalized);
        return Uint8Array.from(binary, character => character.charCodeAt(0));
    } catch {
        throw new Error(`The envelope field '${fieldName}' is not valid Base64.`);
    }
}

function bytesToBase64(value: ArrayBuffer | Uint8Array): string {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
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

function detectEcCurve(keyData: ArrayBuffer): typeof EC_CURVES[number] {
    const bytes = new Uint8Array(keyData);
    const curve = EC_CURVES.find(candidate => containsBytes(bytes, candidate.oid));
    if (!curve) throw new Error("Unsupported ECDH curve. Use a P-256, P-384, or P-521 public key.");
    return curve;
}

function parseEnvelope(value: string): PublicKeyEncryptionEnvelope {
    let parsed: unknown;
    try {
        parsed = JSON.parse(value);
    } catch {
        throw new Error("The encrypted envelope is not valid JSON.");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("The encrypted envelope must be a JSON object.");
    }

    const envelope = parsed as Record<string, unknown>;
    if (envelope.version !== 1) throw new Error("Unsupported encrypted envelope version.");
    if (envelope.algorithm === "ECDH-HKDF-AES-256-GCM") {
        if (!EC_CURVES.some(curve => curve.name === envelope.curve)) {
            throw new Error("The ECDH curve in the encrypted envelope is not supported.");
        }
        const ephemeralPublicKey = base64ToBytes(envelope.ephemeralPublicKey, "ephemeralPublicKey");
        const salt = base64ToBytes(envelope.salt, "salt");
        const iv = base64ToBytes(envelope.iv, "iv");
        const ciphertext = base64ToBytes(envelope.ciphertext, "ciphertext");
        if (ephemeralPublicKey.length > 256) throw new Error("The ephemeral public key is too large.");
        if (salt.length !== SALT_LENGTH) throw new Error("The HKDF salt has an invalid length.");
        if (iv.length !== IV_LENGTH) throw new Error("The AES-GCM IV has an invalid length.");
        if (ciphertext.length < GCM_TAG_LENGTH / 8) throw new Error("The ciphertext is too short.");
        return envelope as unknown as EcdhEncryptionEnvelope;
    }
    if (envelope.algorithm === "RSA-OAEP-AES-256-GCM") {
        const wrappedKey = base64ToBytes(envelope.wrappedKey, "wrappedKey");
        const iv = base64ToBytes(envelope.iv, "iv");
        const ciphertext = base64ToBytes(envelope.ciphertext, "ciphertext");
        if (wrappedKey.length < 128 || wrappedKey.length > 1024) throw new Error("The wrapped AES key has an invalid length.");
        if (iv.length !== IV_LENGTH) throw new Error("The AES-GCM IV has an invalid length.");
        if (ciphertext.length < GCM_TAG_LENGTH / 8) throw new Error("The ciphertext is too short.");
        return envelope as unknown as RsaEncryptionEnvelope;
    }
    throw new Error("Unsupported encryption algorithm in the encrypted envelope.");
}

function additionalData(algorithm: PublicKeyEncryptionAlgorithm): Uint8Array {
    return encoder.encode(`keysec-public-encryption:v1:${algorithm}`);
}

async function encryptWithEcdh(publicKeyData: ArrayBuffer, plaintext: Uint8Array): Promise<EcdhEncryptionEnvelope> {
    const curve = detectEcCurve(publicKeyData);
    const recipientPublicKey = await crypto.subtle.importKey(
        "spki",
        publicKeyData,
        { name: "ECDH", namedCurve: curve.name },
        false,
        [],
    );
    const ephemeralKeys = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: curve.name },
        true,
        ["deriveBits"],
    ) as CryptoKeyPair;
    const sharedSecret = await crypto.subtle.deriveBits(
        { name: "ECDH", public: recipientPublicKey },
        ephemeralKeys.privateKey,
        curve.bits,
    );
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const hkdfKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
    const encryptionKey = await crypto.subtle.deriveKey(
        { name: "HKDF", hash: "SHA-256", salt, info: additionalData("ECDH-HKDF-AES-256-GCM") },
        hkdfKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"],
    );
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: additionalData("ECDH-HKDF-AES-256-GCM"), tagLength: GCM_TAG_LENGTH },
        encryptionKey,
        plaintext,
    );
    const ephemeralPublicKey = await crypto.subtle.exportKey("spki", ephemeralKeys.publicKey);

    return {
        version: 1,
        algorithm: "ECDH-HKDF-AES-256-GCM",
        curve: curve.name,
        ephemeralPublicKey: bytesToBase64(ephemeralPublicKey),
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(ciphertext),
    };
}

async function encryptWithRsa(publicKeyData: ArrayBuffer, plaintext: Uint8Array): Promise<RsaEncryptionEnvelope> {
    const recipientPublicKey = await crypto.subtle.importKey(
        "spki",
        publicKeyData,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"],
    );
    const rawEncryptionKey = crypto.getRandomValues(new Uint8Array(AES_KEY_LENGTH));
    const encryptionKey = await crypto.subtle.importKey(
        "raw",
        rawEncryptionKey,
        { name: "AES-GCM" },
        false,
        ["encrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: additionalData("RSA-OAEP-AES-256-GCM"), tagLength: GCM_TAG_LENGTH },
        encryptionKey,
        plaintext,
    );
    const wrappedKey = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        recipientPublicKey,
        rawEncryptionKey,
    );

    return {
        version: 1,
        algorithm: "RSA-OAEP-AES-256-GCM",
        wrappedKey: bytesToBase64(wrappedKey),
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(ciphertext),
    };
}

export async function encryptTextWithPublicKey(
    plaintext: string,
    publicKeyPem: string,
    algorithm: PublicKeyEncryptionAlgorithm,
): Promise<string> {
    if (!plaintext) throw new Error("The text to encrypt must not be empty.");
    if (!publicKeyPem.trim()) throw new Error("The public key must not be empty.");

    const publicKeyData = publicPemToDer(publicKeyPem);
    try {
        const envelope = algorithm === "ECDH-HKDF-AES-256-GCM"
            ? await encryptWithEcdh(publicKeyData, encoder.encode(plaintext))
            : algorithm === "RSA-OAEP-AES-256-GCM"
                ? await encryptWithRsa(publicKeyData, encoder.encode(plaintext))
                : null;
        if (!envelope) throw new Error("Unsupported encryption algorithm.");
        return JSON.stringify(envelope);
    } catch (error) {
        if (error instanceof Error && (
            error.message.startsWith("Unsupported ECDH curve")
            || error.message.startsWith("Unsupported encryption algorithm")
        )) throw error;
        throw new Error("Encryption failed. Check that the public key matches the selected algorithm and is supported by this browser.");
    }
}

async function decryptEcdhEnvelope(
    envelope: EcdhEncryptionEnvelope,
    privateKeyData: ArrayBuffer,
): Promise<ArrayBuffer> {
    const curve = EC_CURVES.find(candidate => candidate.name === envelope.curve)!;
    const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        privateKeyData,
        { name: "ECDH", namedCurve: curve.name },
        false,
        ["deriveBits"],
    );
    const ephemeralPublicKey = await crypto.subtle.importKey(
        "spki",
        base64ToBytes(envelope.ephemeralPublicKey, "ephemeralPublicKey"),
        { name: "ECDH", namedCurve: curve.name },
        false,
        [],
    );
    const sharedSecret = await crypto.subtle.deriveBits(
        { name: "ECDH", public: ephemeralPublicKey },
        privateKey,
        curve.bits,
    );
    const hkdfKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
    const encryptionKey = await crypto.subtle.deriveKey(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: base64ToBytes(envelope.salt, "salt"),
            info: additionalData(envelope.algorithm),
        },
        hkdfKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"],
    );
    return crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: base64ToBytes(envelope.iv, "iv"),
            additionalData: additionalData(envelope.algorithm),
            tagLength: GCM_TAG_LENGTH,
        },
        encryptionKey,
        base64ToBytes(envelope.ciphertext, "ciphertext"),
    );
}

async function decryptRsaEnvelope(
    envelope: RsaEncryptionEnvelope,
    privateKeyData: ArrayBuffer,
): Promise<ArrayBuffer> {
    const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        privateKeyData,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"],
    );
    const rawEncryptionKey = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        base64ToBytes(envelope.wrappedKey, "wrappedKey"),
    );
    if (rawEncryptionKey.byteLength !== AES_KEY_LENGTH) throw new Error("Invalid AES key length.");
    const encryptionKey = await crypto.subtle.importKey("raw", rawEncryptionKey, "AES-GCM", false, ["decrypt"]);
    return crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: base64ToBytes(envelope.iv, "iv"),
            additionalData: additionalData(envelope.algorithm),
            tagLength: GCM_TAG_LENGTH,
        },
        encryptionKey,
        base64ToBytes(envelope.ciphertext, "ciphertext"),
    );
}

export async function decryptTextWithPrivateKey(
    encryptedEnvelope: string,
    privateKeyPem: string,
): Promise<string> {
    if (!encryptedEnvelope.trim()) throw new Error("The encrypted envelope must not be empty.");
    if (!privateKeyPem.trim()) throw new Error("The private key must not be empty.");

    const envelope = parseEnvelope(encryptedEnvelope);
    const privateKeyData = privatePemToDer(privateKeyPem);
    try {
        const plaintext = envelope.algorithm === "ECDH-HKDF-AES-256-GCM"
            ? await decryptEcdhEnvelope(envelope, privateKeyData)
            : await decryptRsaEnvelope(envelope, privateKeyData);
        return decoder.decode(plaintext);
    } catch {
        throw new Error("Decryption failed. The private key is incorrect or the encrypted envelope was modified.");
    }
}
