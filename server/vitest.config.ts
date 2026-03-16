import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: 'src',
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    fileParallelism: false,
    env: {
      JWT_SECRET: 'test-secret-key-for-vitest',
      NODE_ENV: 'test',
    },
  },
});
