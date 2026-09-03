import { describe, expect, it } from 'vitest';
import { chooseMove, type Difficulty } from '../../src/bot/bot';
import {
  applyMove,
  createGame,
  validateMove,
  type GameConfig,
  type GameState,
} from '../../src/engine';
import { X_WINS_TOP_ROW } from './fixtures';

const classic: GameConfig = {
  depth: 2,
  clearVariant: false,
  tiebreak: 'majority',
  startingPlayer: 'X',
};

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

// Partida entre dois bots; devolve o estado final.
function botVersusBot(
  config: GameConfig,
  asX: Difficulty,
  asO: Difficulty,
  seed: number,
): GameState {
  const rand = mulberry32(seed);
  let state = createGame(config);
  while (state.result === null) {
    const difficulty = state.currentPlayer === 'X' ? asX : asO;
    const move = chooseMove(state, difficulty, rand);
    expect(validateMove(state, move), `${difficulty} propôs jogada inválida`).toBeNull();
    state = applyMove(state, move);
  }
  return state;
}

describe('bot joga válido em qualquer dificuldade (REQ-STT-05, AC-STT-07)', () => {
  for (const difficulty of difficulties) {
    it(`${difficulty}: partidas completas só com jogadas válidas`, () => {
      for (let seed = 1; seed <= 5; seed++) {
        const result = botVersusBot(classic, difficulty, difficulty, seed);
        expect(['X', 'O', 'draw']).toContain(result.result);
      }
    });
  }

  it('joga válido também com variante de limpeza e outros desempates', () => {
    for (const difficulty of difficulties) {
      const result = botVersusBot(
        { ...classic, clearVariant: true, tiebreak: 'both' },
        difficulty,
        difficulty,
        11,
      );
      expect(['X', 'O', 'draw']).toContain(result.result);
    }
  });

  it('recusa jogar com a partida encerrada', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW) state = applyMove(state, move);
    expect(() => chooseMove(state, 'easy')).toThrow();
  });
});

describe('médio: heurísticas de ganhar e bloquear', () => {
  // Estado a uma jogada da vitória de X: roteiro completo menos o último lance.
  function oneFromVictory(): GameState {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW.slice(0, -1)) state = applyMove(state, move);
    return state; // vez de X, [2,8] vence a partida
  }

  it('toma a jogada que vence a partida', () => {
    const state = oneFromVictory();
    for (let seed = 1; seed <= 10; seed++) {
      expect(chooseMove(state, 'medium', mulberry32(seed))).toEqual([2, 8]);
    }
  });

  it('conquista um tabuleiro quando pode', () => {
    let state = createGame(classic);
    // X monta 6,7 no tabuleiro 4; O joga fora do caminho.
    state = applyMove(state, [4, 6]); // X       → O no 6
    state = applyMove(state, [6, 4]); // O       → X no 4
    state = applyMove(state, [4, 7]); // X       → O no 7
    state = applyMove(state, [7, 4]); // O       → X no 4
    // Vez de X no tabuleiro 4: [4,8] conquista (6,7,8).
    for (let seed = 1; seed <= 10; seed++) {
      expect(chooseMove(state, 'medium', mulberry32(seed))).toEqual([4, 8]);
    }
  });

  it('bloqueia a conquista iminente do adversário', () => {
    let state = createGame(classic);
    state = applyMove(state, [5, 0]); // X marca o tabuleiro 5 → O no 0
    state = applyMove(state, [0, 5]); // O                     → X no 5
    state = applyMove(state, [5, 1]); // X ameaça 0,1,_        → O no 1
    state = applyMove(state, [1, 3]); // O                     → X no 3
    state = applyMove(state, [3, 5]); // X                     → O no 5, sob ameaça
    // Vez de O no tabuleiro 5, onde X tem 0 e 1: o único bloqueio é [5,2].
    for (let seed = 1; seed <= 10; seed++) {
      expect(chooseMove(state, 'medium', mulberry32(seed))).toEqual([5, 2]);
    }
  });
});

describe('difícil supera o fácil (REQ-STT-05)', () => {
  it('vence a maioria de um confronto de 12 partidas', () => {
    let hardPoints = 0;
    let easyPoints = 0;
    for (let seed = 1; seed <= 6; seed++) {
      // Difícil de X e de O, pra não enviesar pelo lado que começa.
      const a = botVersusBot(classic, 'hard', 'easy', seed);
      if (a.result === 'X') hardPoints++;
      else if (a.result === 'O') easyPoints++;
      const b = botVersusBot(classic, 'easy', 'hard', seed + 100);
      if (b.result === 'O') hardPoints++;
      else if (b.result === 'X') easyPoints++;
    }
    expect(hardPoints).toBeGreaterThan(easyPoints);
  });
});
