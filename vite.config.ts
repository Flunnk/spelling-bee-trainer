import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: { port: 3000 },
  plugins: [react()],
  test: {
    poolOptions: {
      threads: { execArgv: ['--no-experimental-webstorage'] },
      forks: { execArgv: ['--no-experimental-webstorage'] },
    },
  },
});

