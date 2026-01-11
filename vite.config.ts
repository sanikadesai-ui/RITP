import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Esbuild optimization options
  esbuild: {
    // Drop console.log in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    // Minify identifiers
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    // Define globals for CommonJS compatibility
    define: {
      global: 'globalThis',
    },
  },
  build: {
    // Use esbuild for minification (faster, included in Vite)
    minify: 'esbuild',
    // Code splitting for optimal caching
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            return 'vendor';
          }
        },
        // Asset naming for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (/\.(gif|jpe?g|png|svg|webp|avif)$/.test(info)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/\.css$/.test(info)) {
            return 'assets/css/[name]-[hash][extname]';
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(info)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    // CSS code splitting
    cssCodeSplit: true,
    // Source maps for production debugging (optional - disable for smaller builds)
    sourcemap: false,
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Report compressed size
    reportCompressedSize: true,
  },
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
    exclude: [],
    // Force ESM transformation
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  // Enable CSS optimization
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase',
    },
  },
  // Preview server config (for testing production builds)
  preview: {
    port: 4173,
    host: true,
  },
}));
