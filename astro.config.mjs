// @ts-check
// Trigger restart to register newly created routes
import { defineConfig } from 'astro/config';
import path from 'path';

import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false
  },
  output: "server",
  adapter: cloudflare({

  }),
  integrations: [react()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        'react': path.resolve('./node_modules/react'),
        'react-dom': path.resolve('./node_modules/react-dom')
      }
    },
    build: { minify: false, 
      target: 'esnext',
      cssMinify: 'esbuild',
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime'
      ],
      exclude: [
        'astro:transitions',
        'astro:transitions/client',
        'artplayer'
      ]
    }
  }
});
