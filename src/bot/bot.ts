// Bot do Super TicTacToe (REQ-STT-05). Consome só a API pública do motor.

import {
  applyMove,
  getNode,
  isBoard,
  legalMoves,
  LINES,
  otherPlayer,
  resultOf,
} from '../engine';
import type { Board, GameState, Path, Player } from '../engine';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Rng = () => number;

function pick<T>(items: T[], rand: Rng): T {
  return items[Math.floor(rand() * items.length)];
}

// Fácil: jogada aleatória válida.
function chooseEasy(state: GameState, rand: Rng): Path {
  return pick(legalMoves(state), rand);
}

// A jogada conquista o tabuleiro de profundidade 1 onde cai?
function winsMiniBoard(state: GameState, path: Path, player: Player): boolean {
  const mini = getNode(state.board, path.slice(0, -1)) as Board;
  const cell = path[path.length - 1];
  return LINES.some(
    (line) =>
      line.includes(cell) &&
      line.every((i) => i === cell || mini.cells[i] === player),
  );
}

// Médio: vence a partida se puder; senão conquista um tabuleiro; senão bloqueia
// a conquista iminente do adversário; senão centro; senão aleatória.
function chooseMedium(state: GameState, rand: Rng): Path {
  const me = state.currentPlayer;
  const moves = legalMoves(state);

  const gameWins = moves.filter((m) => applyMove(state, m).result === me);
  if (gameWins.length > 0) return pick(gameWins, rand);

  const miniWins = moves.filter((m) => winsMiniBoard(state, m, me));
  if (miniWins.length > 0) return pick(miniWins, rand);

  const blocks = moves.filter((m) => winsMiniBoard(state, m, otherPlayer(me)));
  if (blocks.length > 0) return pick(blocks, rand);

  const centers = moves.filter((m) => m[m.length - 1] === 4);
  if (centers.length > 0) return pick(centers, rand);

  return pick(moves, rand);
}

// Peso posicional: centro > cantos > laterais.
const CELL_WEIGHT = [1.2, 1.0, 1.2, 1.0, 1.4, 1.0, 1.2, 1.0, 1.2];

// Avaliação heurística de um tabuleiro, recursiva, na perspectiva de `me`.
function evaluateBoard(board: Board, me: Player, tiebreak: GameState['config']['tiebreak']): number {
  const result = resultOf(board, tiebreak);
  if (result === me) return 100;
  if (result === otherPlayer(me)) return -100;
  if (result === 'draw') return 0;

  let score = 0;
  for (let i = 0; i < 9; i++) {
    const cell = board.cells[i];
    if (isBoard(cell)) {
      score += evaluateBoard(cell, me, tiebreak) * 0.35 * CELL_WEIGHT[i];
    } else if (cell === me) {
      score += 3 * CELL_WEIGHT[i];
    } else if (cell !== null) {
      score -= 3 * CELL_WEIGHT[i];
    }
  }

  // Linhas com 2 do mesmo lado e a terceira em aberto: ameaça.
  for (const line of LINES) {
    const values = line.map((i) => {
      const cell = board.cells[i];
      return isBoard(cell) ? resultOf(cell, tiebreak) : cell;
    });
    for (const player of ['X', 'O'] as Player[]) {
      const own = values.filter((v) => v === player).length;
      const open = values.filter((v) => v === null).length;
      if (own === 2 && open === 1) {
        score += (player === me ? 1 : -1.2) * (board.depth > 1 ? 30 : 6);
      }
    }
  }
  return score;
}

function evaluate(state: GameState, me: Player): number {
  if (state.result === me) return 100_000;
  if (state.result === otherPlayer(me)) return -100_000;
  if (state.result === 'draw') return 0;
  return evaluateBoard(state.board, me, state.config.tiebreak);
}

function minimax(
  state: GameState,
  me: Player,
  depth: number,
  alpha: number,
  beta: number,
): number {
  if (depth === 0 || state.result !== null) {
    // Vitórias mais próximas valem mais (evita procrastinar o mate).
    const score = evaluate(state, me);
    return Math.abs(score) >= 100_000 ? score + Math.sign(score) * depth : score;
  }
  const maximizing = state.currentPlayer === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of legalMoves(state)) {
    const value = minimax(applyMove(state, move), me, depth - 1, alpha, beta);
    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, value);
    }
    if (beta <= alpha) break;
  }
  return best;
}

// Difícil: busca com poda alfa-beta. Profundidade adaptativa: jogada livre
// (muitos tabuleiros permitidos) reduz a busca pra manter a resposta rápida.
function chooseHard(state: GameState, rand: Rng): Path {
  const me = state.currentPlayer;
  const moves = legalMoves(state);
  const depth = state.config.depth >= 3 ? 2 : moves.length > 20 ? 3 : 4;

  let bestScore = -Infinity;
  let best: Path[] = [];
  for (const move of moves) {
    const score = minimax(applyMove(state, move), me, depth - 1, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }
  return pick(best, rand);
}

// Jogada do bot pro estado atual (AC-STT-07: sempre uma jogada válida).
export function chooseMove(
  state: GameState,
  difficulty: Difficulty,
  rand: Rng = Math.random,
): Path {
  if (state.result !== null) throw new Error('partida encerrada');
  switch (difficulty) {
    case 'easy':
      return chooseEasy(state, rand);
    case 'medium':
      return chooseMedium(state, rand);
    case 'hard':
      return chooseHard(state, rand);
  }
}
