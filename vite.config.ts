import path from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    base: '/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'https://webcapture-api.elmehdi.space/',
                changeOrigin: true,
            },
            '/cdn': {
                target: 'https://screenshots.elmehdi.space',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/cdn/, ''),
            },
        },
    },
});
