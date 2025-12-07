/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,           // allows using global test(), expect()
    environment: 'jsdom',    // simulate DOM
    setupFiles: './src/tests/setupTests.ts', // optional setup
    include: ['src/**/*.{test,spec}.{ts,tsx}'], // test file patterns
  },
});
