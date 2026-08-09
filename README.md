# Privacy forge

## Introduction

This repository contains a collection of privacy tools designed to enhance data security and 
confidentiality.

- Quickly encrypt and decrypt text using a highly secure algorithm ([AES-256](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard) in [GCM mode](https://en.wikipedia.org/wiki/Galois/Counter_Mode) with [PBKDF2/SHA-256](https://en.wikipedia.org/wiki/PBKDF2) key derivation).
- Quickly encrypt using a public key, and decrypt using a private key.
- Quickly sign using a private key, and verify using a public key.
- Share and reconstruct a secret using [Shamir's secret sharing algorithm](https://en.wikipedia.org/wiki/Shamir%27s_secret_sharing).
- Create QR codes from text.

> Please note that **no data is sent to any server**. Your data stays on your device.
> You can disconnect your device from the WEB and these tools will execute.

## Usage

### From the WEB

Open [https://click-and-shield.github.io/privacy-tools/](https://click-and-shield.github.io/privacy-tools/)

### From a local copy

Open the `index.html` file in your browser.

## Credits

These tools use the following great libraries:

- [https://github.com/Digital-Defiance/secrets-ts](https://github.com/Digital-Defiance/secrets-ts)
- [https://github.com/nayuki/QR-Code-generator](https://github.com/nayuki/QR-Code-generator)
