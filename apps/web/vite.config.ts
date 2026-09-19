import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // Search-engine indexing is OFF unless VITE_ALLOW_INDEXING=true is set
  // at build time — a staging/pre-launch build can never be indexed by
  // accident, and going live is one env var, not a code change.
  const robots = env.VITE_ALLOW_INDEXING === 'true' ? 'index, follow' : 'noindex, nofollow';

  return {
    plugins: [
      react(),
      {
        name: 'html-robots-meta',
        transformIndexHtml: (html: string) => html.replace('%ROBOTS%', robots),
      },
    ],
    server: {
      port: 5173,
      proxy: { '/api': 'http://localhost:4000' },
    },
  };
});
