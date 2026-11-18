import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/** Single-file mode only: inline the favicons so the HTML has no sibling files. */
function inlineIcons(): Plugin {
  const mime: Record<string, string> = { png: 'image/png', ico: 'image/x-icon' };
  return {
    name: 'inline-icons',
    transformIndexHtml(html) {
      return html.replace(/href="\/([\w.-]+\.(png|ico))"/g, (_m, file: string, ext: string) =>
        `href="data:${mime[ext]};base64,${readFileSync(`public/${file}`).toString('base64')}"`);
    },
  };
}

// `vite build` -> normal multi-file build for Netlify/Bolt.
// `vite build --mode single` -> one self-contained HTML in dist-single/ to open without a server.
// Audio stays safe in the single file: clips ship as base64 inside clips.json and the engine
// turns them into blob: URLs at runtime (Safari will not play data: audio).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile(), inlineIcons()] : [])],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  publicDir: mode === 'single' ? false : 'public',
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 8000,
  },
}));
