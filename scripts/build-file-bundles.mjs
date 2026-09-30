import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entries = {
  crypt: 'src/crypt.web.ts',
  decrypt: 'src/decrypt.web.ts',
  encrypt: 'src/encrypt.web.ts',
  publicEncrypt: 'src/public-encrypt.web.ts',
  publicDecrypt: 'src/public-decrypt.web.ts',
  qrcode: 'src/qrcode.web.ts',
  reconstruct: 'src/reconstruct.web.ts',
  secrets: 'src/secrets.web.ts',
  sign: 'src/sign.web.ts',
  verify: 'src/verify.web.ts',
  openpgp: 'src/openpgp.web.ts',
  password: 'src/password.web.ts',
};

const htmlPageNames = {
  publicEncrypt: 'public-encrypt',
  publicDecrypt: 'public-decrypt',
};

for (const [pageName, entryPath] of Object.entries(entries)) {
  await build({
    configFile: false,
    root: projectRoot,
    logLevel: 'warn',
    build: {
      outDir: resolve(projectRoot, 'dist/assets'),
      emptyOutDir: false,
      lib: {
        entry: resolve(projectRoot, entryPath),
        name: `KeySec_${pageName}`,
        formats: ['iife'],
        fileName: () => `${pageName}.js`,
      },
    },
  });

  const htmlPageName = htmlPageNames[pageName] ?? pageName;
  const htmlPath = resolve(projectRoot, 'dist/web', `${htmlPageName}.html`);
  const html = await readFile(htmlPath, 'utf8');
  const fileCompatibleHtml = html
    .replace(/\s*<link rel="modulepreload"[^>]*>\s*/g, '\n')
    .replace(
      /<script type="module"[^>]*><\/script>/,
      `<script defer src="../assets/${pageName}.js"></script>`,
    );

  await writeFile(htmlPath, fileCompatibleHtml);
}
