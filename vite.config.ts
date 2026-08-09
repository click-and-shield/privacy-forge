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
        decrypt: resolve(__dirname, 'web/decrypt.html'),
        encrypt: resolve(__dirname, 'web/encrypt.html'),
        sign: resolve(__dirname, 'web/sign.html'),
        verify: resolve(__dirname, 'web/verify.html'),
        qrcode: resolve(__dirname, 'web/qrcode.html'),
        reconstruct: resolve(__dirname, 'web/reconstruct.html'),
        secrets: resolve(__dirname, 'web/secrets.html'),
      },
    },
  },
});
