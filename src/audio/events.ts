// Decisão pura de quais sons uma jogada produz (spec SOM), separada da síntese
// para poder ser testada sem áudio.

import { getNode, isBoard, winningLines } from '../engine';
import type { Board, GameState, Player } from '../engine';
import type { StrikeScale } from './sound';

export interface MoveSounds {
  mark: Player | null;
  strikes: StrikeScale[];
}

function countStrikes(board: Board, tiebreak: GameState['config']['tiebreak']): {
  small: number;
  big: number;
} {
  let small = 0;
  for (let i = 0; i < 9; i++) {
    const sub = getNode(board, [i]);
    if (isBoard(sub)) small += winningLines(sub, tiebreak).length;
  }
  return { small, big: winningLines(board, tiebreak).length };
}

// Compara o estado antes e depois de uma jogada. Só avança (jogada nova) produz
// som; desfazer devolve nada (RN-SOM-05).
export function soundsForTransition(before: GameState, after: GameState): MoveSounds {
  if (after.moves.length <= before.moves.length) return { mark: null, strikes: [] };
  const mark = after.moves[after.moves.length - 1].player;
  const { tiebreak } = after.config;
  const antes = countStrikes(before.board, tiebreak);
  const depois = countStrikes(after.board, tiebreak);
  const strikes: StrikeScale[] = [];
  for (let i = 0; i < depois.small - antes.small; i++) strikes.push('small');
  for (let i = 0; i < depois.big - antes.big; i++) strikes.push('big');
  return { mark, strikes };
}
