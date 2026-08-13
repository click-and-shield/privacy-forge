import {
    createMessage,
    decrypt,
    decryptKey,
    encrypt,
    generateKey,
    readKey,
    readMessage,
    readPrivateKey,
    readSignature,
    sign,
    verify,
    type PrivateKey,
    type PublicKey,
} from "openpgp";

export type GpgKeyPurpose = "encryption" | "signature";

export interface GeneratedGpgKeyPair {
    publicKey: string;
    privateKey: string;
    revocationCertificate: string;
    fingerprint: string;
}

async function parsePublicKey(armoredKey: string): Promise<PublicKey> {
    if (!armoredKey.trim()) throw new Error("The GPG public key is required.");
    try {
        const key = await readKey({ armoredKey });
        return key.isPrivate() ? key.toPublic() : key;
    } catch {
        throw new Error("The GPG public key is invalid.");
    }
}

async function parsePrivateKey(armoredKey: string, passphrase: string): Promise<PrivateKey> {
    if (!armoredKey.trim()) throw new Error("The GPG private key is required.");
    try {
        const key = await readPrivateKey({ armoredKey });
        if (key.isDecrypted()) return key;
        if (!passphrase) throw new Error("missing-passphrase");
        return await decryptKey({ privateKey: key, passphrase });
    } catch (error) {
        if (error instanceof Error && error.message === "missing-passphrase") {
            throw new Error("The private key passphrase is required.");
        }
        throw new Error("Unable to open the GPG private key. Check the key and its passphrase.");
    }
}

export async function encryptGpgText(text: string, armoredPublicKey: string): Promise<string> {
    if (!text) throw new Error("The text to encrypt is required.");
    const encryptionKey = await parsePublicKey(armoredPublicKey);
    try {
        return await encrypt({
            message: await createMessage({ text }),
            encryptionKeys: encryptionKey,
            format: "armored",
        });
    } catch {
        throw new Error("Encryption failed. This key may not have encryption capability.");
    }
}

export async function decryptGpgText(
    armoredMessage: string,
    armoredPrivateKey: string,
    passphrase: string,
): Promise<string> {
    if (!armoredMessage.trim()) throw new Error("The encrypted GPG message is required.");
    const decryptionKey = await parsePrivateKey(armoredPrivateKey, passphrase);
    try {
        const message = await readMessage({ armoredMessage });
        const result = await decrypt({ message, decryptionKeys: decryptionKey, format: "utf8" });
        if (typeof result.data !== "string") throw new Error("unexpected-stream");
        return result.data;
    } catch {
        throw new Error("Decryption failed. Check the message and the private key.");
    }
}

export async function signGpgText(
    text: string,
    armoredPrivateKey: string,
    passphrase: string,
): Promise<string> {
    if (!text) throw new Error("The text to sign is required.");
    const signingKey = await parsePrivateKey(armoredPrivateKey, passphrase);
    try {
        return await sign({
            message: await createMessage({ text }),
            signingKeys: signingKey,
            detached: true,
            format: "armored",
        }) as string;
    } catch {
        throw new Error("Signing failed. This key may not have signing capability.");
    }
}

export async function verifyGpgSignature(
    text: string,
    armoredSignature: string,
    armoredPublicKey: string,
): Promise<boolean> {
    if (!text) throw new Error("The original text is required.");
    if (!armoredSignature.trim()) throw new Error("The GPG signature is required.");
    const verificationKey = await parsePublicKey(armoredPublicKey);
    try {
        const result = await verify({
            message: await createMessage({ text }),
            signature: await readSignature({ armoredSignature }),
            verificationKeys: verificationKey,
        });
        if (result.signatures.length === 0) return false;
        await Promise.all(result.signatures.map(candidate => candidate.verified));
        return true;
    } catch {
        return false;
    }
}

export async function generateGpgKeyPair(
    purpose: GpgKeyPurpose,
    name: string,
    email: string,
    passphrase: string,
): Promise<GeneratedGpgKeyPair> {
    if (!name.trim()) throw new Error("The name associated with the key is required.");
    if (!email.trim()) throw new Error("The email address associated with the key is required.");

    const result = await generateKey({
        type: "ecc",
        curve: "ed25519Legacy",
        userIDs: [{ name: name.trim(), email: email.trim() }],
        passphrase: passphrase || undefined,
        subkeys: purpose === "encryption" ? [{ curve: "curve25519Legacy" }] : [],
        format: "armored",
    });
    const publicKey = await readKey({ armoredKey: result.publicKey });

    return {
        publicKey: result.publicKey,
        privateKey: result.privateKey,
        revocationCertificate: result.revocationCertificate,
        fingerprint: publicKey.getFingerprint().toUpperCase(),
    };
}
