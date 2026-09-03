// Motor do Super TicTacToe. TypeScript puro, sem dependência de UI (REQ-STT-01).

export type Player = 'X' | 'O';

// Resultado de um tabuleiro (ou célula): indefinido enquanto null.
export type Result = Player | 'draw' | null;

// Tabuleiro recursivo: depth 1 tem células simples; depth N tem tabuleiros de depth N-1.
export interface Board {
  depth: number;
  cells: (Board | Player | null)[];
}

// Caminho até uma célula: um índice 0..8 por nível, do topo até a folha (length === depth).
export type Path = number[];

// RN-STT-05: critério de desempate quando um tabuleiro de tabuleiros enche sem linha.
export type Tiebreak = 'majority' | 'neutral' | 'both';

// REQ-STT-03 / RN-STT-08: configuração definida na criação e imutável durante a partida.
export interface GameConfig {
  depth: number; // 2 = Super TicTacToe clássico
  clearVariant: boolean; // RN-STT-04
  tiebreak: Tiebreak; // RN-STT-05
  startingPlayer: Player; // RN-STT-06
}

export interface Move {
  player: Player;
  path: Path;
}

export interface GameState {
  config: Readonly<GameConfig>;
  board: Board;
  currentPlayer: Player;
  moves: Move[];
  // Prefixo obrigatório do próximo caminho (RN-STT-01), ou null se a jogada é livre (RN-STT-02).
  forcedPath: Path | null;
  result: Result;
}

// Forma serializada mínima e reconstituível (REQ-STT-14): config + jogadas.
export interface SerializedGame {
  config: GameConfig;
  moves: Move[];
}
