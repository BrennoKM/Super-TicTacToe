import {
  cloneBoard,
  createBoard,
  getNode,
  isBoard,
  playableLeafBoards,
  resultOf,
} from './board';
import type {
  Board,
  GameConfig,
  GameState,
  Path,
  Player,
  Result,
  SerializedGame,
} from './types';

export function otherPlayer(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}

export function createGame(config: GameConfig): GameState {
  if (config.depth < 1) throw new Error('profundidade mínima é 1');
  return {
    config: Object.freeze({ ...config }), // RN-STT-08
    board: createBoard(config.depth),
    currentPlayer: config.startingPlayer, // RN-STT-06
    moves: [],
    forcedPath: null,
    result: null,
  };
}

// Tabuleiros de profundidade 1 onde o jogador da vez pode jogar (REQ-STT-12).
export function allowedBoards(state: GameState): Path[] {
  if (state.result !== null) return [];
  const { tiebreak } = state.config;
  if (state.forcedPath !== null) {
    const target = playableLeafBoards(state.board, tiebreak, state.forcedPath);
    if (target.length > 0) return target;
  }
  return playableLeafBoards(state.board, tiebreak); // RN-STT-02
}

function startsWith(path: Path, prefix: Path): boolean {
  return prefix.every((index, i) => path[i] === index);
}

export type MoveError =
  | 'partida-encerrada'
  | 'caminho-invalido'
  | 'celula-ocupada'
  | 'tabuleiro-nao-permitido';

export function validateMove(state: GameState, path: Path): MoveError | null {
  if (state.result !== null) return 'partida-encerrada';
  if (path.length !== state.config.depth || path.some((i) => i < 0 || i > 8)) {
    return 'caminho-invalido';
  }
  const boardPath = path.slice(0, -1);
  const allowed = allowedBoards(state);
  if (!allowed.some((p) => startsWith(boardPath, p) && p.length === boardPath.length)) {
    return 'tabuleiro-nao-permitido';
  }
  const cell = getNode(state.board, path);
  if (cell !== null) return 'celula-ocupada';
  return null;
}

// RN-STT-04: ao conquistar um tabuleiro, limpa as jogadas dos tabuleiros irmãos
// não decididos (recursivamente). Tabuleiros decididos permanecem.
function clearUndecided(board: Board, tiebreak: GameConfig['tiebreak']): void {
  for (let i = 0; i < 9; i++) {
    const cell = board.cells[i];
    if (isBoard(cell)) {
      if (resultOf(cell, tiebreak) === null) clearUndecided(cell, tiebreak);
    } else {
      board.cells[i] = null;
    }
  }
}

// Aplica a jogada e devolve o novo estado (REQ-STT-02: jogada inválida não altera nada).
export function applyMove(state: GameState, path: Path): GameState {
  const error = validateMove(state, path);
  if (error) throw new Error(`jogada inválida (${error}): [${path}]`);

  const { tiebreak } = state.config;
  const board = cloneBoard(state.board);

  // Marca a célula.
  const leafBoard = getNode(board, path.slice(0, -1)) as Board;
  leafBoard.cells[path[path.length - 1]] = state.currentPlayer;

  // Variante de limpeza: verifica, do mais fundo pro topo, se algum ancestral
  // acabou de ser conquistado (vitória, não empate) e limpa os irmãos abertos.
  if (state.config.clearVariant) {
    for (let level = path.length - 1; level >= 1; level--) {
      const ancestorPath = path.slice(0, level);
      const ancestor = getNode(board, ancestorPath) as Board;
      const before = getNode(state.board, ancestorPath) as Board;
      const nowWon =
        resultOf(ancestor, tiebreak) === 'X' || resultOf(ancestor, tiebreak) === 'O';
      if (nowWon && resultOf(before, tiebreak) === null) {
        const parent = getNode(board, path.slice(0, level - 1)) as Board;
        const wonIndex = ancestorPath[level - 1];
        for (let i = 0; i < 9; i++) {
          if (i === wonIndex) continue;
          const sibling = parent.cells[i];
          if (isBoard(sibling) && resultOf(sibling, tiebreak) === null) {
            clearUndecided(sibling, tiebreak);
          }
        }
      }
    }
  }

  const result: Result = resultOf(board, tiebreak);

  // RN-STT-01: a posição da célula direciona o próximo jogador.
  // Generalização pra profundidade N: o prefixo obrigatório é o caminho da
  // jogada sem o primeiro índice (na profundidade 2: o índice da célula).
  const forcedPath: Path | null = state.config.depth === 1 ? null : path.slice(1);

  return {
    config: state.config,
    board,
    currentPlayer: otherPlayer(state.currentPlayer), // RN-STT-07
    moves: [...state.moves, { player: state.currentPlayer, path }],
    forcedPath: result === null ? forcedPath : null,
    result,
  };
}

// REQ-STT-07: desfaz as últimas `count` jogadas reconstruindo por replay
// (determinístico mesmo com a variante de limpeza).
export function undo(state: GameState, count = 1): GameState {
  const moves = state.moves.slice(0, Math.max(0, state.moves.length - count));
  return replay({ config: { ...state.config }, moves });
}

export function serialize(state: GameState): SerializedGame {
  return { config: { ...state.config }, moves: state.moves.map((m) => ({ ...m })) };
}

export function replay(saved: SerializedGame): GameState {
  let state = createGame(saved.config);
  for (const move of saved.moves) {
    state = applyMove(state, move.path);
  }
  return state;
}
