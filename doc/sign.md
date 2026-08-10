

Generate **`Ed25519 PKCS#8 PEM`** keys:

```
openssl genpkey -algorithm Ed25519 -out private-ed25519-key.pem
openssl pkey -in private-ed25519-key.pem -pubout -out public-ed25519-key.pem
```

Generate **`RSA PKCS#8 PEM`** keys:

```
openssl genpkey -algorithm rsa -out private-rsa-key.pem
openssl pkey -in private-rsa-key.pem -pubout -out public-rsa-key.pem
```

Generate **`RSA-PSS PKCS#8 PEM`** keys:

```
openssl genpkey -algorithm rsa-pss -out private-rsa-pss-key.pem
openssl pkey -in private-rsa-pss-key.pem -pubout -out public-rsa-pss-key.pem
```

Generate **`SPKI PEM`** keys:

```
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out private-prime256v1-key.pem
openssl pkey -in private-prime256v1-key.pem -pubout -out public-prime256v1-key.pem

openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-384 -out private-secp384r1-key.pem
openssl pkey -in private-secp384r1-key.pem -pubout -out public-secp384r1-key.pem

openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-521 -out private-secp521r1-key.pem
openssl pkey -in private-secp521r1-key.pem -pubout -out public-secp521r1-key.pem
```



