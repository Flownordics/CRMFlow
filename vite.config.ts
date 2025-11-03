import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
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
    strictPort: false,
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false,
        timeout: 30000, // 30 second timeout
        proxyTimeout: 30000,
        configure: (proxy: any, _options: any) => {
          proxy.on('error', (err: Error, _req: any, _res: any) => {
            console.log('[Vite Proxy] Error: Netlify functions not available. Run "npm run dev:netlify" to enable PDF generation.');
          });
          proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
            console.log('[Vite Proxy] Proxying:', req.method, req.url);
          });
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'FLOWNORDICS6tiny.png'],
      manifest: false, // Use the public/manifest.json instead
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Enable in dev if you want to test PWA
      },
    }),
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
          
          // Charts library - lazy loaded for mobile
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
          
          // Lucide icons - split into separate chunk
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide-icons';
          }
          
          // Mobile-specific libraries
          if (id.includes('node_modules/react-swipeable') ||
              id.includes('node_modules/@tanstack/react-virtual')) {
            return 'mobile-utils';
          }
          
          // Other vendors
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // Reduce chunk size warning limit for mobile optimization
    chunkSizeWarningLimit: 500,
    // Enable minification
    minify: 'esbuild' as const,
    // Disable source maps for smaller bundles in production
    sourcemap: false,
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // CSS code splitting
    cssCodeSplit: true,
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
      'html-to-image',
    ],
    esbuildOptions: {
      // Ensure React is built with correct NODE_ENV
      define: {
        'process.env.NODE_ENV': JSON.stringify(mode)
      }
    }
  },
}));
