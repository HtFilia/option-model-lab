import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const [repositoryOwner, repositoryName] = process.env.GITHUB_REPOSITORY?.split('/') ?? [];

export default defineConfig(({ command }) => {
  const isGitHubPagesBuild = Boolean(
    command === 'build' && process.env.GITHUB_ACTIONS && repositoryName,
  );
  const base = isGitHubPagesBuild ? `/${repositoryName}/` : '/';
  const siteUrl =
    isGitHubPagesBuild && repositoryOwner && repositoryName
      ? `https://${repositoryOwner.toLowerCase()}.github.io/${repositoryName}/`
      : 'http://localhost:5173/';

  return {
    base,
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
