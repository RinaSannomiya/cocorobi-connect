import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/hojin': {
        target: 'https://info.gbiz.go.jp/hojin/v1/hojin',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hojin/, ''),
        secure: true,
        headers: {
          'Accept': 'application/json',
        },
      },
    },
  },
});