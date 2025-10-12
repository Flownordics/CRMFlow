import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }: { mode: string }) => ({
  define: {
    // Explicitly set process.env.NODE_ENV to match the mode
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Vite Proxy] Error: Netlify functions not available. Run "npm run dev:netlify" to enable PDF generation.');
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Vite Proxy] Proxying:', req.method, req.url);
          });
        },
      },
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // Core React libraries - MUST be first to prevent duplication
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          
          // React Router (depends on React)
          if (id.includes('node_modules/react-router-dom') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run')) {
            return 'router';
          }
          
          // Radix UI components (depends on React)
          if (id.includes('node_modules/@radix-ui')) {
            return 'radix-ui';
          }
          
          // React Query
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'react-query';
          }
          
          // Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
          
          // Charts library
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }
          
          // Form libraries
          if (id.includes('node_modules/react-hook-form') || 
              id.includes('node_modules/@hookform')) {
            return 'forms';
          }
          
          // Zod validation
          if (id.includes('node_modules/zod')) {
            return 'zod';
          }
          
          // Date utilities
          if (id.includes('node_modules/date-fns')) {
            return 'date-fns';
          }
          
          // DnD Kit
          if (id.includes('node_modules/@dnd-kit')) {
            return 'dnd-kit';
          }
          
          // Lucide icons
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide-icons';
          }
          
          // Other vendors
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit to 1000 kB
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'esbuild' as const,
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // Optimize deps
    target: 'es2015',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'recharts',
    ],
    esbuildOptions: {
      // Ensure React is built with correct NODE_ENV
      define: {
        'process.env.NODE_ENV': JSON.stringify(mode)
      }
    }
  },
}));
