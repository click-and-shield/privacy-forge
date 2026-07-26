# Privacy forge

## Introduction

This repository contains a collection of privacy tools designed to enhance data security and 
confidentiality.

- Quickly encrypt and decrypt text using a highly secure algorithm ([AES-256](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard) in [GCM mode](https://en.wikipedia.org/wiki/Galois/Counter_Mode) with [PBKDF2/SHA-256](https://en.wikipedia.org/wiki/PBKDF2) key derivation).  
- Create QR codes from text.
- Share and reconstruct a secret using [Shamir's secret sharing algorithm](https://en.wikipedia.org/wiki/Shamir%27s_secret_sharing).

> Please note that **no data is sent to any server**. Your data stays on your device.
> You can disconnect your device from the WEB and these tools will execute.

## Credits

These tools use the following great libraries:

- [https://github.com/Digital-Defiance/secrets-ts](https://github.com/Digital-Defiance/secrets-ts)
- [https://github.com/nayuki/QR-Code-generator](https://github.com/nayuki/QR-Code-generator)

## Create the distribution

1. Install the dependencies:
   ```
   npm install
   ```
2. Run unit tests (optional): `npm test`
3. Test the WEB interface: `npm run dev` and then open
   - [http://localhost:5173/web/encrypt.html](http://localhost:5173/web/encrypt.html).
   - [http://localhost:5173/web/decrypt.html](http://localhost:5173/web/decrypt.html).
   - [http://localhost:5173/web/qrcode.html](http://localhost:5173/web/qrcode.html)
   - [http://localhost:5173/web/secrets.html](http://localhost:5173/web/secrets.html)
   - [http://localhost:5173/web/reconstruct.html](http://localhost:5173/web/reconstruct.html)
4. build the distribution: `npm run build`

