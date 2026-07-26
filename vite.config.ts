import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'), // Si on en crée un
        crypt: resolve(__dirname, 'web/crypt.html'),
        decrypt: resolve(__dirname, 'web/decrypt.html'),
        encrypt: resolve(__dirname, 'web/encrypt.html'),
        qrcode: resolve(__dirname, 'web/qrcode.html'),
        reconstruct: resolve(__dirname, 'web/reconstruct.html'),
        secrets: resolve(__dirname, 'web/secrets.html'),
      },
    },
  },
});
