import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for local file access
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Optimize build output
    minify: 'esbuild',
    target: 'es2020',
    // Simpler chunking to avoid circular dependencies
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material']
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 800,
    // Generate source maps for debugging (set to false for production)
    sourcemap: false,
    // Clean output directory before build
    emptyOutDir: true,
    // Output directory
    outDir: 'dist',
    // Asset handling
    assetsInlineLimit: 4096, // Inline assets < 4kb
  },
  // Define environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
});
