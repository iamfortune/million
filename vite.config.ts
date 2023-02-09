import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { million } from './packages/vite-plugin-million';

const packages = resolve(__dirname, './packages');

export default defineConfig({
  resolve: {
    alias: {
      packages,
    },
  },
  plugins: [
    million({ importSource: packages, react: true, skipOptimize: true }),
  ],
  test: {
    environment: 'jsdom',
    coverage: {
      reporter: ['lcov'],
    },
  },
});
