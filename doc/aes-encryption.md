# AES Encryption

## Algorithms

- **Algorithm**: AES-256
- **Mode**: GCM
- **KDF (Key Derivation Function)**: `PBKDF2-SHA-256` (Password-Based Key Derivation Function 2). [Documentation](https://en.wikipedia.org/wiki/PBKDF2).

## File Format

```
┌────────────┬──────────────────┬──────────────┬───────────────────────┐
│ IV         │ Itérations       │ Salt         │ Cyphered + GCM tag    │
│ 12 bytes   │ 4 bytes, uint32  │ 16 bytes     │ Variable length       │
└────────────┴──────────────────┴──────────────┴───────────────────────┘
```

- The IV is used to initialize the encryption process (`AES-256` in `GCM` mode) and ensure that each encryption of the same plaintext results in a different ciphertext.
- The iterations are used to make the key derivation process (`PBKDF2-SHA-256`) more secure by adding randomness to the input.
- The salt is used to make the key derivation process (`PBKDF2-SHA-256`) more secure by adding randomness to the input.
