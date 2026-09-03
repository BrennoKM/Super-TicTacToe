import type { Path } from '../../src/engine';

// Roteiro em que X conquista os tabuleiros 0, 1 e 2 (linha superior).
// Anotação: [tabuleiro, célula]; a célula jogada direciona o adversário.
export const X_WINS_TOP_ROW: Path[] = [
  [0, 6], // X            → O vai pro 6
  [6, 0], // O            → X vai pro 0
  [0, 7], // X            → O vai pro 7
  [7, 0], // O            → X vai pro 0
  [0, 8], // X conquista o 0 (6,7,8) → O vai pro 8
  [8, 1], // O            → X vai pro 1
  [1, 6], // X            → O vai pro 6
  [6, 1], // O            → X vai pro 1
  [1, 7], // X            → O vai pro 7
  [7, 1], // O            → X vai pro 1
  [1, 8], // X conquista o 1 → O vai pro 8
  [8, 2], // O            → X vai pro 2
  [2, 6], // X            → O vai pro 6
  [6, 2], // O conquista o 6 (0,1,2) → X vai pro 2
  [2, 7], // X            → O vai pro 7
  [7, 2], // O conquista o 7 → X vai pro 2
  [2, 8], // X conquista o 2 → linha 0-1-2 no grande: X vence
];
