# Signature

## Algorithms

- **PKCS#1 v1.5** (`RSASSA-PKCS1-v1_5`): is the traditional deterministic RSA signature scheme. It requires a hash function such as SHA-256 and remains widely supported, primarily for compatibility.
- **PKCS#1 v1.5 / SHA-256** (`RSASSA-PKCS1-v1_5 / SHA-256`): is `RSASSA-PKCS1-v1_5` with SHA-256 explicitly selected as its message digest algorithm.
- **RSA-PSS**: `RSA-PSS` is a newer probabilistic RSA signature scheme. It incorporates a random salt and is generally preferred to `RSASSA-PKCS1-v1_5` for new RSA-based applications.
- **ECDSA**: `ECDSA` is an elliptic-curve signature scheme. It provides security comparable to RSA with 
  significantly smaller keys and signatures. It requires both an elliptic curve, such as `P-256`, and a hash function, 
  such as `SHA-256`.
- **Ed25519**: `Ed25519` is a modern elliptic-curve signature scheme based on Edwards curves. Its cryptographic
  parameters and hashing behavior are largely fixed by the scheme, making it simpler to use correctly.
  It produces compact keys and signatures and does not require the application to select a separate hash function.

| Scheme                        | Key type         | Hash function            | Randomized?   | Main characteristics                                                                                                              |
|-------------------------------|------------------|--------------------------|---------------|-----------------------------------------------------------------------------------------------------------------------------------|
| `RSASSA-PKCS1-v1_5`           | `RSA`            | Required, e.g. `SHA-256` | No            | Legacy `RSA` signature scheme; deterministic and widely supported.                                                                |
| `RSASSA-PKCS1-v1_5 / SHA-256` | `RSA`            | `SHA-256`                | No            | Same scheme as above, with `SHA-256` explicitly selected as the message digest.                                                   |
| `RSA-PSS`                     | `RSA`            | Required, e.g. `SHA-256` | Yes           | Modern `RSA` signature scheme using a random salt; preferred over `PKCS#1 v1.5` for new designs.                                  | 
| `ECDSA`                       | `Elliptic Curve` | Required, e.g. `SHA-256` | Normally yes  | Elliptic-curve signature scheme; much smaller keys and signatures than RSA for comparable security.                               |
| `Ed25519`                     | `Ed25519`        | Built into the scheme    | Deterministic | Modern elliptic-curve signature scheme designed for simplicity, strong security and resistance to common implementation mistakes. |

## Keys generation (`PKCS#8 and SPKI PEM`)

* `PKCS#8` defines a standard format for storing **private** keys.
* `PEM` is a file format for storing cryptographic keys and certificates.

### Generate keys for `RSASSA-PKCS1-v1_5`

```
openssl genpkey -algorithm rsa -out private-rsa-key.pem
openssl pkey -in private-rsa-key.pem -pubout -out public-rsa-key.pem
```

### Generate keys for `RSA-PSS`

```
openssl genpkey -algorithm rsa-pss -out private-rsa-pss-key.pem
openssl pkey -in private-rsa-pss-key.pem -pubout -out public-rsa-pss-key.pem
```

### Generate keys for `Ed25519`

```
openssl genpkey -algorithm Ed25519 -out private-ed25519-key.pem
openssl pkey -in private-ed25519-key.pem -pubout -out public-ed25519-key.pem
```

### Generate keys for `ECDSA`

```
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out private-prime256v1-key.pem
openssl pkey -in private-prime256v1-key.pem -pubout -out public-prime256v1-key.pem

openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-384 -out private-secp384r1-key.pem
openssl pkey -in private-secp384r1-key.pem -pubout -out public-secp384r1-key.pem

openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-521 -out private-secp521r1-key.pem
openssl pkey -in private-secp521r1-key.pem -pubout -out public-secp521r1-key.pem
```
