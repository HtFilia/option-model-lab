import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const productionSiteUrl = 'https://pricing.lucaslebihan.dev/';

export default defineConfig(({ command }) => {
  const siteUrl = command === 'build' ? productionSiteUrl : 'http://localhost:5173/';

  return {
    base: '/',
    plugins: [
      react(),
      {
        name: 'option-model-lab-html-metadata',
        transformIndexHtml(html) {
          return html.replaceAll('%SITE_URL%', siteUrl);
        },
      },
    ],
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      coverage: {
        reporter: ['text', 'html'],
      },
    },
  };
});
