// REQ-STT-13 (preferências) e REQ-STT-14 (partida em andamento), via localStorage.
// Toda leitura/escrita é tolerante a falha: armazenamento indisponível não quebra o jogo.

import type { GameConfig, Player, SerializedGame } from '../engine';
import type { Language } from '../i18n';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Preferences {
  language: Language | null;
  theme: ThemePreference;
  playerNames: [string, string];
  player1Symbol: Player;
  lastConfig: GameConfig | null;
}

export interface SessionScore {
  X: number;
  O: number;
  draws: number;
}

export interface SavedMatch {
  game: SerializedGame;
  playerNames: [string, string];
  player1Symbol: Player;
  score: SessionScore;
}

const PREFS_KEY = 'stt.prefs';
const MATCH_KEY = 'stt.match';

const defaultPreferences: Preferences = {
  language: null,
  theme: 'system',
  playerNames: ['', ''],
  player1Symbol: 'X',
  lastConfig: null,
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // armazenamento cheio ou bloqueado: o jogo segue sem persistir
  }
}

export function loadPreferences(): Preferences {
  return { ...defaultPreferences, ...(read<Partial<Preferences>>(PREFS_KEY) ?? {}) };
}

export function savePreferences(prefs: Preferences): void {
  write(PREFS_KEY, prefs);
}

export function loadMatch(): SavedMatch | null {
  const match = read<SavedMatch>(MATCH_KEY);
  return match && Array.isArray(match.game?.moves) ? match : null;
}

export function saveMatch(match: SavedMatch): void {
  write(MATCH_KEY, match);
}

export function clearMatch(): void {
  try {
    localStorage.removeItem(MATCH_KEY);
  } catch {
    // indisponível: nada a limpar
  }
}
