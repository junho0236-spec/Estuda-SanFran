import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { reactClickToComponent } from 'vite-plugin-react-click-to-component';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    console.log("GEMINI_API_KEY available:", !!(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY));
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        reactClickToComponent()
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_API_KEY || process.env.GEMINI_API_KEY || ""),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.API_KEY || env.VITE_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || "")
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});