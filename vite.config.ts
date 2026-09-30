import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const bootstrapAssets = [
  'bootstrap-5.3.3.min.css',
  'bootstrap-5.3.3.bundle.min.js',
];

export default defineConfig({
  base: './',
  root: '.',
  plugins: [
    {
      name: 'form-typescript-entries',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          return html.replace(
            /<script defer src="form-loader\.js" data-module="([^"]+)" data-bundle="[^"]+"><\/script>/g,
            '<script type="module" src="$1"></script>',
          );
        },
      },
    },
    {
      name: 'copy-bootstrap-assets',
      apply: 'build',
      buildStart() {
        for (const fileName of bootstrapAssets) {
          this.emitFile({
            type: 'asset',
            fileName: `web/${fileName}`,
            source: readFileSync(resolve(__dirname, 'web', fileName)),
          });
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'), // Home page
        crypt: resolve(__dirname, 'web/crypt.html'),
        decrypt: resolve(__dirname, 'web/decrypt.html'),
        encrypt: resolve(__dirname, 'web/encrypt.html'),
        publicEncrypt: resolve(__dirname, 'web/public-encrypt.html'),
        publicDecrypt: resolve(__dirname, 'web/public-decrypt.html'),
        sign: resolve(__dirname, 'web/sign.html'),
        verify: resolve(__dirname, 'web/verify.html'),
        openpgp: resolve(__dirname, 'web/openpgp.html'),
        qrcode: resolve(__dirname, 'web/qrcode.html'),
        reconstruct: resolve(__dirname, 'web/reconstruct.html'),
        secrets: resolve(__dirname, 'web/secrets.html'),
        password: resolve(__dirname, 'web/password.html'),
      },
    },
  },
});
