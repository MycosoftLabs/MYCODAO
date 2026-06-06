import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type {Plugin} from 'vite';
import {defineConfig, loadEnv} from 'vite';

/** Phantom OAuth callback lands on origin root; Pulse SPA is under /pulse/. */
function phantomOAuthRootRedirect(): Plugin {
  return {
    name: 'phantom-oauth-root-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (url === '/' || url.startsWith('/?')) {
          res.statusCode = 302;
          res.setHeader('Location', `/pulse${url.slice(1)}`);
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', ['', 'VITE_']);
  return {
    base: '/pulse/',
    plugins: [react(), tailwindcss(), phantomOAuthRootRedirect()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(
        env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '',
      ),
      global: 'window.global',
      self: 'window.global',
      globalThis: 'window.global',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, '../public/pulse'),
      emptyOutDir: true,
    },
    css: {
      postcss: path.resolve(__dirname, 'postcss.config.mjs'),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Forward /api/* to MYCODAO Next (npm run dev in repo root on :3004)
      proxy: {
        '/api': {
          target: env.VITE_PULSE_API_ORIGIN || 'http://127.0.0.1:3004',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
