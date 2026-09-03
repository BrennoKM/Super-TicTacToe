import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// VITE_BASE é definido no CI como "/Super-TicTacToe/" pro GitHub Pages;
// localmente fica "/" pra dev e preview funcionarem sem prefixo.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  test: {
    include: [
      'tests/engine/**/*.test.ts',
      'tests/p2p/**/*.test.ts',
      'tests/replay/**/*.test.ts',
    ],
    environment: 'node',
    globals: true,
    // As partidas bot contra bot no nível difícil passam folgado de 5s.
    testTimeout: 60_000,
  },
});
