import type { Board, Path, Player, Result, Tiebreak } from './types';

export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createBoard(depth: number): Board {
  if (!Number.isInteger(depth) || depth < 1) {
    throw new Error(`profundidade inválida: ${depth}`);
  }
  return {
    depth,
    cells: Array.from({ length: 9 }, () =>
      depth === 1 ? null : createBoard(depth - 1),
    ),
  };
}

export function isBoard(node: Board | Player | null): node is Board {
  return typeof node === 'object' && node !== null;
}

// Nó (tabuleiro ou célula) apontado por um caminho parcial a partir de `board`.
export function getNode(board: Board, path: Path): Board | Player | null {
  let node: Board | Player | null = board;
  for (const index of path) {
    if (!isBoard(node)) throw new Error(`caminho atravessa uma célula: [${path}]`);
    node = node.cells[index];
    if (node === undefined) throw new Error(`índice fora do tabuleiro: [${path}]`);
  }
  return node;
}

// Resultado de um filho: célula ocupada ou tabuleiro decidido; null se em aberto.
function childResult(node: Board | Player | null, tiebreak: Tiebreak): Result {
  return isBoard(node) ? resultOf(node, tiebreak) : node;
}

// Resultado de um tabuleiro segundo as regras configuradas.
// RN-STT-03: linha de 3 vence. RN-STT-05: desempate quando tudo decidido sem linha.
export function resultOf(board: Board, tiebreak: Tiebreak): Result {
  const results = board.cells.map((cell) => childResult(cell, tiebreak));

  for (const player of ['X', 'O'] as Player[]) {
    // Variante "conta pros dois": tabuleiro empatado casa com qualquer jogador na linha.
    // Só se aplica a filhos que são tabuleiros; célula simples nunca empata.
    const matches = (r: Result) =>
      r === player || (tiebreak === 'both' && board.depth > 1 && r === 'draw');
    if (LINES.some((line) => line.every((i) => matches(results[i])))) {
      return player;
    }
  }

  if (results.some((r) => r === null)) return null;

  // Tudo decidido, sem linha.
  if (board.depth > 1 && tiebreak === 'majority') {
    const x = results.filter((r) => r === 'X').length;
    const o = results.filter((r) => r === 'O').length;
    if (x !== o) return x > o ? 'X' : 'O';
  }
  return 'draw';
}

// Um tabuleiro é jogável se nem ele nem nenhum ancestral está decidido.
export function isPlayablePath(board: Board, path: Path, tiebreak: Tiebreak): boolean {
  let node: Board | Player | null = board;
  if (resultOf(board, tiebreak) !== null) return false;
  for (const index of path) {
    if (!isBoard(node)) return false;
    node = node.cells[index];
    if (node === undefined) return false;
    if (isBoard(node) && resultOf(node, tiebreak) !== null) return false;
  }
  return true;
}

// Caminhos de todos os tabuleiros de profundidade 1 jogáveis sob um prefixo.
export function playableLeafBoards(
  board: Board,
  tiebreak: Tiebreak,
  prefix: Path = [],
): Path[] {
  const node = getNode(board, prefix);
  if (!isBoard(node) || resultOf(node, tiebreak) !== null) return [];
  if (node.depth === 1) return [prefix];
  const paths: Path[] = [];
  for (let i = 0; i < 9; i++) {
    paths.push(...playableLeafBoards(board, tiebreak, [...prefix, i]));
  }
  return paths;
}

export function cloneBoard(board: Board): Board {
  return {
    depth: board.depth,
    cells: board.cells.map((cell) => (isBoard(cell) ? cloneBoard(cell) : cell)),
  };
}
