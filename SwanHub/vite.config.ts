import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Build produces stable filenames: options-form.js + options-form.css.
// Cache-busting is handled server-side by JupyterHub's static_url() helper,
// which appends a content-hash ?v=... query param (via Tornado).
//
// JS is loaded as <script type="module"> so CSS can be extracted to a
// separate file (avoids FOUC vs. injecting styles at runtime from JS).

export default defineConfig({
  plugins: [react()],
  build: {
    outDir:      'swanhub/static/options-form',
    emptyOutDir: true,
    sourcemap:   true,
    rollupOptions: {
      input: resolve(__dirname, 'src/options-form/index.tsx'),
      output: {
        entryFileNames: 'options-form.js',
        chunkFileNames: 'options-form.js',
        assetFileNames: 'options-form[extname]',
      },
    },
  },
});
