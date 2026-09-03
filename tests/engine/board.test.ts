import { describe, expect, it } from 'vitest';
import { createBoard, getNode, isBoard, resultOf } from '../../src/engine';

// REQ-STT-01: o motor é recursivo e suporta profundidade N.
describe('tabuleiro recursivo (REQ-STT-01)', () => {
  it('cria tabuleiro de profundidade 1 com 9 células vazias', () => {
    const board = createBoard(1);
    expect(board.depth).toBe(1);
    expect(board.cells).toHaveLength(9);
    expect(board.cells.every((c) => c === null)).toBe(true);
  });

  it('cria tabuleiro de profundidade 2 com 9 subtabuleiros', () => {
    const board = createBoard(2);
    expect(board.cells.every((c) => isBoard(c) && c.depth === 1)).toBe(true);
  });

  it('cria tabuleiro de profundidade 3 navegável até a folha', () => {
    const board = createBoard(3);
    expect(getNode(board, [4, 4, 4])).toBeNull();
    const middle = getNode(board, [4, 4]);
    expect(isBoard(middle) && middle.depth === 1).toBe(true);
  });

  it('rejeita profundidade inválida', () => {
    expect(() => createBoard(0)).toThrow();
  });

  it('detecta linha vencedora em profundidade 1 (RN-STT-03 na base)', () => {
    const board = createBoard(1);
    board.cells[0] = board.cells[4] = board.cells[8] = 'X';
    expect(resultOf(board, 'neutral')).toBe('X');
  });

  it('tabuleiro de profundidade 1 cheio sem linha é empate, independente do desempate', () => {
    const board = createBoard(1);
    // X O X / X O O / O X X: sem linha
    const cells = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'] as const;
    board.cells = [...cells];
    for (const tiebreak of ['majority', 'neutral', 'both'] as const) {
      expect(resultOf(board, tiebreak)).toBe('draw');
    }
  });
});
