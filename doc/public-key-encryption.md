# Public key encryption

## ECDH + HKDF + AES-256-GCM

- **ECDH**: [Elliptic Curve Diffie-Hellman](https://en.wikipedia.org/wiki/Elliptic-curve_Diffie%E2%80%93Hellman).
- **HKDF**: [Hash-based Key Derivation Function](https://en.wikipedia.org/wiki/HKDF).

Scenario: Alice encrypts a message for Bob using `ECDH + HKDF + AES-256-GCM`.

Encryption:

- Bob knows his private key (`Bprv`) and his public key (`Bpub`).
- Alice knows Bob's public key (`Bpub`).
- Alice generates a random (_ephemeral_) private key (`Eprv`) and computes her (_ephemeral_) public key (`Epub`).
- Alice computes the shared secret (`S`) using her _ephemeral_ private key (`Eprv`) and Bob's public key (`Bpub`).
  `S = ECDH(Eprv, Bpub)`.
- Alice derives a key (`K`) from the shared secret (`S`) using `HKDF`.
- Alice encrypts the message using `AES-256-GCM` with the derived key (`K`).
- Alice creates a document that contains:
  - Her _ephemeral_ public key `Epub`. The key allows Bob to calculate the shared secret `S`, and then the derived key `K`.
  - The encrypted message.
- Alice sends the document to Bob.

Decryption:

- Bob knows his private key (`Bprv`) and his public key (`Bpub`).
- Bob finds Alice's _ephemeral_ public key `Epub`, since it is included in the document received from Alice.
- Bob computes the shared secret (`S`) using his private key (`Bprv`) and Alice's _ephemeral_ public key (`Epub`).
  `S = ECDH(Bprv, Epub)`.
- Bob derives a key (`K`) from the shared secret (`S`) using `HKDF`.
  The resulting key `K` is used to decrypt the message.
- Bob decrypts the message using `AES-256-GCM` with the derived key (`K`).

Keys generation (EC `SPKI PEM`):

```
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out private-prime256v1-key.pem
openssl pkey -in private-prime256v1-key.pem -pubout -out public-prime256v1-key.pem

openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-384 -out private-secp384r1-key.pem
openssl pkey -in private-secp384r1-key.pem -pubout -out public-secp384r1-key.pem

openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-521 -out private-secp521r1-key.pem
openssl pkey -in private-secp521r1-key.pem -pubout -out public-secp521r1-key.pem
```

> * `SPKI` defines a standard format for storing **public** keys.
> * `PKCS#8` defines a standard format for storing **private** keys.
> * `PEM` is a file format for storing cryptographic keys and certificates.

## RSA-OAEP + AES-256-GCM

- **RSA**: [Rivest–Shamir–Adleman](https://en.wikipedia.org/wiki/RSA_cryptosystem)
- **OAEP**: [Optimal Asymmetric Encryption Padding](https://fr.wikipedia.org/wiki/Optimal_Asymmetric_Encryption_Padding)

Scenario: Alice encrypts a message for Bob using `RSA-OAEP + AES-256-GCM`.

Encryption:

- Bob knows his private key (`Bprv`) and his public key (`Bpub`).
- Alice knows Bob's public key (`Bpub`).
- Alice generates a random 256 bits long secret key (`Asec`) for `AES-256` in `GCM` mode.
- Alice encrypts the secret key (`Asec`) using `RSA-OAEP` with Bob's public key (`Bpub`).
- Alice encrypts the message using `AES-256-GCM` with the secret key (`Asec`).
- Alice creates the document that contains:
  - The encrypted secret key (`Asec`).
  - The encrypted message.
- Alice sends the document to Bob.

Decryption:

- Bob decrypts the secret key (`Asec`) using `RSA-OAEP` with his private key (`Bprv`).
- Bob decrypts the message using `AES-256-GCM` with the secret key (`Asec`).

Keys generation (RSA `SPKI PEM`):

```
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out private-rsa.pem
openssl pkey -in private-rsa.pem -pubout -out public-rsa.pem
```

> * `SPKI` defines a standard format for storing **public** keys.
> * `PKCS#8` defines a standard format for storing **private** keys.
> * `PEM` is a file format for storing cryptographic keys and certificates.
