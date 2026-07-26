
// ┌────────────┬──────────────────┬──────────────┬───────────────────────┐
// │ IV         │ Iterations       │ Salt         │ Encrypted + tag GCM   │
// │ 12 bytes   │ 4 bytes, uint32  │ 16 bytes     │ variable length       │
// └────────────┴──────────────────┴──────────────┴───────────────────────┘

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS_LENGTH = 4;
const GCM_TAG_LENGTH_BITS = 128;
const GCM_TAG_LENGTH_BYTES = GCM_TAG_LENGTH_BITS / 8;

const DEFAULT_ITERATIONS = 600_000;
const MAX_ACCEPTED_ITERATIONS = 10_000_000;

/**
 * Converts a byte array to Base64.
 *
 * This implementation is suitable for short texts. It avoids passing
 * a very large array directly to String.fromCharCode().
 */
function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}

/**
 * Converts a Base64 string to a byte array.
 */
function base64ToBytes(value: string): Uint8Array {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

/**
 * Concatenates multiple byte arrays.
 */
function concatenate(...arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce(
        (length, array) => length + array.length,
        0
    );

    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const array of arrays) {
        result.set(array, offset);
        offset += array.length;
    }

    return result;
}

/**
 * Encodes the number of iterations into a big-endian uint32 integer.
 */
function encodeIterations(iterations: number): Uint8Array {
    if (
        !Number.isSafeInteger(iterations) ||
        iterations < 1 ||
        iterations > 0xffff_ffff
    ) {
        throw new Error(
            "The number of iterations must be an integer between 1 and 2^32 - 1."
        );
    }

    const result = new Uint8Array(ITERATIONS_LENGTH);
    const view = new DataView(result.buffer);

    view.setUint32(0, iterations, false);

    return result;
}

/**
 * Decodes a big-endian uint32 integer.
 */
function decodeIterations(bytes: Uint8Array): number {
    if (bytes.length !== ITERATIONS_LENGTH) {
        throw new Error(
            "The field containing the number of iterations is invalid."
        );
    }

    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength
    );

    return view.getUint32(0, false);
}

/**
 * Derives an AES-256-GCM key from a passphrase.
 */
async function deriveEncryptionKey(
    password: string,
    salt: Uint8Array,
    iterations: number
): Promise<CryptoKey> {
    const passwordMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            hash: "SHA-256",
            salt,
            iterations
        },
        passwordMaterial,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Builds the associated data authenticated by AES-GCM.
 *
 * The IV, number of iterations, and salt are public, but their modification
 * must be detected. They are therefore provided as associated data.
 */
function createAdditionalData(
    iv: Uint8Array,
    iterationsBytes: Uint8Array,
    salt: Uint8Array
): Uint8Array {
    return concatenate(iv, iterationsBytes, salt);
}

/**
 * Encrypts a short text with AES-256-GCM.
 *
 * Binary format before Base64 encoding:
 *
 *     IV || ITERATIONS || SALT || CIPHERTEXT_AND_TAG
 */
export async function encryptText(
    plaintext: string,
    password: string,
    iterations: number = DEFAULT_ITERATIONS
): Promise<string> {
    if (password.length === 0) {
        throw new Error("The passphrase must not be empty.");
    }

    if (
        !Number.isSafeInteger(iterations) ||
        iterations < 1 ||
        iterations > MAX_ACCEPTED_ITERATIONS
    ) {
        throw new Error(
            `The number of iterations must be between 1 and ${MAX_ACCEPTED_ITERATIONS}.`
        );
    }

    const iv = crypto.getRandomValues(
        new Uint8Array(IV_LENGTH)
    );

    const salt = crypto.getRandomValues(
        new Uint8Array(SALT_LENGTH)
    );

    const iterationsBytes = encodeIterations(iterations);

    const encryptionKey = await deriveEncryptionKey(
        password,
        salt,
        iterations
    );

    const additionalData = createAdditionalData(
        iv,
        iterationsBytes,
        salt
    );

    /*
     * Web Crypto automatically concatenates the GCM tag to the ciphertext.
     * With a 128-bit tag, the last 16 bytes correspond to the tag.
     */
    const ciphertextBuffer = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv,
            additionalData,
            tagLength: GCM_TAG_LENGTH_BITS
        },
        encryptionKey,
        encoder.encode(plaintext)
    );

    const ciphertext = new Uint8Array(ciphertextBuffer);

    const payload = concatenate(
        iv,
        iterationsBytes,
        salt,
        ciphertext
    );

    return bytesToBase64(payload);
}

/**
 * Decrypts a string produced by encryptText().
 */
export async function decryptText(
    encodedPayload: string,
    password: string
): Promise<string> {
    if (password.length === 0) {
        throw new Error("The passphrase must not be empty.");
    }

    let payload: Uint8Array;

    try {
        payload = base64ToBytes(encodedPayload);
    } catch {
        throw new Error("The provided string is not a valid Base64 string.");
    }

    const fixedFieldsLength =
        IV_LENGTH +
        ITERATIONS_LENGTH +
        SALT_LENGTH;

    const minimumPayloadLength =
        fixedFieldsLength +
        GCM_TAG_LENGTH_BYTES;

    if (payload.length < minimumPayloadLength) {
        throw new Error("The encrypted content is too short.");
    }

    let offset = 0;

    const iv = payload.slice(
        offset,
        offset + IV_LENGTH
    );
    offset += IV_LENGTH;

    const iterationsBytes = payload.slice(
        offset,
        offset + ITERATIONS_LENGTH
    );
    offset += ITERATIONS_LENGTH;

    const salt = payload.slice(
        offset,
        offset + SALT_LENGTH
    );
    offset += SALT_LENGTH;

    const ciphertext = payload.slice(offset);

    const iterations = decodeIterations(iterationsBytes);

    /*
     * This limit prevents hostile content from voluntarily imposing
     * an excessive number of iterations and blocking the browser for a long time.
     */
    if (
        iterations < 1 ||
        iterations > MAX_ACCEPTED_ITERATIONS
    ) {
        throw new Error(
            "The number of iterations contained in the data is invalid."
        );
    }

    const encryptionKey = await deriveEncryptionKey(
        password,
        salt,
        iterations
    );

    const additionalData = createAdditionalData(
        iv,
        iterationsBytes,
        salt
    );

    try {
        const plaintextBuffer = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv,
                additionalData,
                tagLength: GCM_TAG_LENGTH_BITS
            },
            encryptionKey,
            ciphertext
        );

        return decoder.decode(plaintextBuffer);
    } catch {
        throw new Error(
            "Decryption failed: incorrect passphrase or modified data."
        );
    }
}

