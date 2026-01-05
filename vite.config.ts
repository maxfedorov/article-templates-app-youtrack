import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import {viteStaticCopy} from 'vite-plugin-static-copy';
import react from '@vitejs/plugin-react';

/*
      See https://vitejs.dev/config/
*/

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: '../manifest.json',
          dest: '.'
        },
        {
          src: '../public/article-templates-logo.svg',
          dest: '.'
        },
        {
          src: 'entity-extensions.json',
          dest: '.'
        },
        {
          src: 'settings.json',
          dest: '.'
        },
        {
          src: '../public/*.*',
          dest: '.'
        }
      ]
    }),
    viteStaticCopy({
      targets: [
        // Widget icons and configurations
        {
          src: 'widgets/**/*.{svg,png,jpg,json}',
          dest: '.'
        }
      ],
      structured: true
    })
  ],
  root: './src',
  base: '',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    copyPublicDir: false,
    target: ['es2022'],
    assetsDir: 'widgets/assets',
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('react-virtualized')) {
          return;
        }
        defaultHandler(warning);
      },
      input: {
        // List every widget entry point here
        articleTemplatesProjectWidget: resolve(__dirname, 'src/widgets/article-templates-project-widget/index.html'),

        createTemplateArticleWidget: resolve(__dirname, 'src/widgets/create-template-article-widget/index.html'),

        articleTemplatesDashboardWidget: resolve(__dirname, 'src/widgets/article-templates-dashboard-widget/index.html'),

      }
    }
  }
});
