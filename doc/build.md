# Build instructions

1. Install the dependencies:
   ```
   npm install
   ```
2. Run unit tests (optional): `npm test`
3. Test the WEB interface: `npm run dev` and then open
    - [http://localhost:5173/web/encrypt.html](http://localhost:5173/web/encrypt.html).
    - [http://localhost:5173/web/decrypt.html](http://localhost:5173/web/decrypt.html).
    - [http://localhost:5173/web/qrcode.html](http://localhost:5173/web/qrcode.html)
    - [http://localhost:5173/web/wifi-qrcode.html](http://localhost:5173/web/wifi-qrcode.html)
    - [http://localhost:5173/web/secrets.html](http://localhost:5173/web/secrets.html)
    - [http://localhost:5173/web/reconstruct.html](http://localhost:5173/web/reconstruct.html)
    - [http://localhost:5173/web/wifi-qrcode.html](http://localhost:5173/web/wifi-qrcode.html)
4. build the distribution: `npm run build`

Open `dist/index.html` for offline use. The source menu and forms can also be
opened directly after building: `web/form-loader.js` loads their standalone
scripts from `dist/assets`, without attempting to load TypeScript as file URLs.
Rebuild after changing source files. With `npm run dev`, Vite replaces the loader
with the TypeScript entry so development still uses the current source.
The distribution itself contains only local classic scripts and needs no server.

## Wi-Fi QR code generator

Open `web/wifi-qrcode.html` during development, or `dist/web/wifi-qrcode.html`
directly after building. Like the standalone QR generator, it uses the local
Project Nayuki library. The build includes `dist/assets/wifiQrcode.js` as a classic
standalone script; no server, CDN or Internet connection is needed.

The form encodes WPA/WPA2 Personal credentials as
`WIFI:T:WPA;S:<SSID>;P:<password>;;`, escaping backslash, semicolon, comma,
double quote and colon in both values. Hidden networks add `H:true;`.
Credentials preserve spaces and case; SSIDs are limited to 32 UTF-8 bytes.
PNG and SVG downloads include a four-module white border for scanning.
Anyone holding the QR code can recover the password: encoding is not encryption.
Inputs are not stored, and Clear removes the credentials and generated images.

For an offline smoke test, open `dist/index.html` using `file://`, select
Wi-Fi QR Code Generator, generate a code, and download both formats. Try special
characters, a hidden network, Show password and Clear. Editing a credential must
hide the old result. Confirm there are no HTTP requests, then scan a test network's
QR code on a compatible phone (joining may require confirmation).

## Password strength estimator

During development, open `http://localhost:5173/web/password.html`.
The estimator uses `@zxcvbn-ts/core` with the common, English and French
dictionary packages. All three are selected initially and can be toggled separately.
Personal words can also be supplied as a comma-separated list.

`npm run build` includes the page in Vite's multi-page build, then creates
`dist/assets/password.js` as a standalone IIFE through `scripts/build-file-bundles.mjs`.
The dictionaries and estimator are embedded in that script; Bootstrap is copied locally.
After building, open `dist/index.html` or `dist/web/password.html` directly using
`file://`, with the network disconnected. No server, CDN, remote matcher or API is required.
Dependency installation needs network access, but using the built distribution does not.

The form reports a score from 0 to 4, feedback and estimated attack times.
These are estimates, not guarantees; disabling dictionaries can overestimate strength.
Inputs over 128 characters are explicitly rejected rather than silently truncated.
The tool does not persist passwords or personal words. Clear removes both inputs.

Verification: `npm test`, `npx tsc --noEmit`, and `npm run build`.
For a browser smoke test, open the built page directly, try a common password,
toggle each dictionary, add a personal word, and check Show password and Clear.
Confirm that no HTTP requests occur while using the built page offline.
