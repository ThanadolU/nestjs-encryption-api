# NestJS Encryption API

An HTTP service built with NestJS that encrypts a payload with a random AES key, protects that key with an RSA key pair, and reverses the process on request.

## How to start the service

Requires Node.js 20.19+ (or 22.12+).

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Add an RSA key pair. **This repo doesn't include one**, because a private key must never be committed. Generate a pair at [cryptotools.net/rsagen](https://cryptotools.net/rsagen) and save the keys as `keys/private.pem` and `keys/public.pem`, creating the `keys/` folder first. The service won't start without them. See [RSA keys](#rsa-keys) for details and an alternative.

3. Start the service:

   ```bash
   npm run start
   ```

| URL | Description |
| --- | --- |
| http://localhost:3000/api-docs | Swagger UI |
| `POST` http://localhost:3000/get-encrypt-data | Encrypt a payload |
| `POST` http://localhost:3000/get-decrypt-data | Decrypt `data1` and `data2` |

Other start modes are `npm run start:dev` (watch mode) and `npm run build && npm run start:prod`. To change the port or key location, copy `.env.example` to `.env`.

## Try it

```bash
curl -s -X POST localhost:3000/get-encrypt-data \
  -H 'Content-Type: application/json' \
  -d '{"payload":"Hello, world!"}'
# {"successful":true,"error_code":"","data":{"data1":"...","data2":"..."}}

curl -s -X POST localhost:3000/get-decrypt-data \
  -H 'Content-Type: application/json' \
  -d '{"data1":"<data1>","data2":"<data2>"}'
# {"successful":true,"error_code":"","data":{"payload":"Hello, world!"}}
```

## Tests

```bash
npm test            # unit tests
npm run test:cov    # unit tests with a coverage report
npm run test:e2e    # HTTP tests against the full application
```

The tests generate their own keys, so they don't need a key pair in `keys/`.

## RSA keys

The repo contains no keys. Anyone who has the private key can create valid `data1` values, and anything committed stays in git history even after it's deleted, so `keys/` and `.env` are ignored by git. There are two ways to supply a key pair:

- **Use [cryptotools.net/rsagen](https://cryptotools.net/rsagen):** save the generated keys as `keys/private.pem` and `keys/public.pem`, creating the `keys/` folder if needed. Both PKCS#1 and PKCS#8 PEM formats work.
- **Generate locally:** `npm run keys:generate` creates the same two files.

The service checks at startup that the keys load and form a matching pair, and exits with an error if they don't.

## API

Both endpoints return the same response shape:

| Field | Type | Description |
| --- | --- | --- |
| `successful` | boolean | Whether the request succeeded |
| `error_code` | string | Empty on success |
| `data` | object or null | The result, or `null` on failure |

### `POST /get-encrypt-data`

| Body field | Rules |
| --- | --- |
| `payload` | Required string, 0 to 2000 characters |

Steps:

1. Validate the request.
2. Generate a random 32-character string to use as the AES key.
3. `data2`: encrypt the payload with the AES key.
4. `data1`: encrypt the AES key with the RSA private key.
5. Return `data1` and `data2`.

### `POST /get-decrypt-data`

| Body field | Rules |
| --- | --- |
| `data1` | Required non-empty string |
| `data2` | Required non-empty string |

Steps:

1. Validate the request.
2. Recover the AES key by decrypting `data1` with the RSA public key.
3. Recover the payload by decrypting `data2` with the AES key.
4. Return the payload.

### Error codes

| HTTP status | `error_code` | Cause |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | The body breaks the rules above |
| 400 | `DECRYPTION_FAILED` | `data1` or `data2` is invalid, tampered with, or from another key pair |
| 400 | `BAD_REQUEST` | The JSON is malformed |
| 404 | `NOT_FOUND` | Unknown route |
| 413 | `PAYLOAD_TOO_LARGE` | The body is over 100 KB |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error; details are only logged |

## Implementation choices

The requirements leave these details open:

| Topic | Choice |
| --- | --- |
| AES | AES-256-GCM with a random 12-byte IV for each encryption |
| `data2` format | Base64 of IV (12 bytes) + auth tag (16 bytes) + ciphertext |
| RSA | PKCS#1 v1.5 padding |
| `data1` format | Base64 |
| Success `error_code` | Empty string |
| Status codes | 200 on success, plus the error statuses listed above |

## Security note

This design follows the requirements, but it provides **authenticity rather than confidentiality** against anyone holding the public key. Because `data1` is encrypted with the *private* key, anyone with the public key can recover the AES key and read the payload. It proves the data came from this service, but a public key is normally shared openly, so it shouldn't be treated as a secret-protection scheme. To keep payloads secret from public key holders, encrypt the AES key with the public key and decrypt it with the private key instead.

The endpoints also have no authentication, so any caller can decrypt data through `/get-decrypt-data`. Add authentication and TLS before exposing the service.
