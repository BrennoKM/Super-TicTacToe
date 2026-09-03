// GIF leve da partida (REQ-REPLAY-06): um frame por jogada e um final demorado,
// desenhado em canvas com o mesmo visual da tela (spec REPLAY2).

import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { getNode, isBoard, replay, resultOf, winningLines } from '../engine';
import type { Board, GameState } from '../engine';
import type { LibraryEntry } from './library';

export interface GifFrame {
  state: GameState;
  delayMs: number;
}

export const FRAME_DELAY_MS = 500;
export const FINAL_DELAY_MS = 2500;

// Parte pura e testável: os estados de cada frame (AC-REPLAY-07: M + 1 frames,
// do estado após a 1ª jogada ao final, que se repete com atraso maior).
export function buildFrames(entry: Pick<LibraryEntry, 'config' | 'moves'>): GifFrame[] {
  const frames: GifFrame[] = [];
  for (let n = 1; n <= entry.moves.length; n++) {
    frames.push({
      state: replay({ config: entry.config, moves: entry.moves.slice(0, n) }),
      delayMs: FRAME_DELAY_MS,
    });
  }
  if (frames.length > 0) {
    frames.push({ ...frames[frames.length - 1], delayMs: FINAL_DELAY_MS });
  }
  return frames;
}

export interface GifPalette {
  bg: string;
  ruled: string;
  line: string;
  lineSoft: string;
  x: string;
  o: string;
}

// Lê as cores do tema em uso direto das variáveis de CSS (RN-REPLAY2-01).
export function themePalette(): GifPalette {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    bg: read('--bg', '#faf6ec'),
    ruled: read('--ruled-line', 'rgba(116,160,204,0.35)'),
    line: read('--line', '#22335c'),
    lineSoft: read('--line-soft', 'rgba(34,51,92,0.4)'),
    x: read('--mark-x', '#c0392b'),
    o: read('--mark-o', '#1f5fa8'),
  };
}

export const GIF_SIZE = 512;

// Ruído determinístico: mesma semente, mesmo tremor em todos os quadros, pra o
// tabuleiro não vibrar durante a animação (REQ-REPLAY2-02).
function makeJitter(seed: number) {
  return (index: number) => {
    const x = Math.sin(seed * 374.761 + index * 91.373) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  };
}

type Jitter = (index: number) => number;

// Traço à mão: linha quebrada em segmentos com desvio perpendicular pequeno.
function handLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  wobble: number,
  jitter: Jitter,
  key: number,
): void {
  const segments = 8;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const off = i === 0 || i === segments ? 0 : jitter(key * 31 + i) * wobble;
    const px = x1 + dx * t + nx * off;
    const py = y1 + dy * t + ny * off;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  size: number,
  width: number,
  color: string,
  jitter: Jitter,
  key: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  const wobble = Math.max(1, size * 0.006);
  let k = key;
  for (const t of [1 / 3, 2 / 3]) {
    handLine(ctx, x0 + size * t, y0 + size * 0.02, x0 + size * t, y0 + size * 0.98, wobble, jitter, k++);
    handLine(ctx, x0 + size * 0.02, y0 + size * t, x0 + size * 0.98, y0 + size * t, wobble, jitter, k++);
  }
}

// Risco na linha vencedora, com a mesma extrapolação da tela (REQ-RISCO-06).
function drawStrikes(
  ctx: CanvasRenderingContext2D,
  board: Board,
  tiebreak: GameState['config']['tiebreak'],
  x0: number,
  y0: number,
  size: number,
  color: string,
  width: number,
  jitter: Jitter,
  key: number,
): void {
  const lines = winningLines(board, tiebreak);
  if (lines.length === 0) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  const cell = size / 3;
  const overshoot = cell * 0.22;
  lines.forEach((line, i) => {
    const first = line[0];
    const last = line[line.length - 1];
    const ax = x0 + ((first % 3) + 0.5) * cell;
    const ay = y0 + (Math.floor(first / 3) + 0.5) * cell;
    const bx = x0 + ((last % 3) + 0.5) * cell;
    const by = y0 + (Math.floor(last / 3) + 0.5) * cell;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    handLine(
      ctx,
      ax - (dx / len) * overshoot,
      ay - (dy / len) * overshoot,
      bx + (dx / len) * overshoot,
      by + (dy / len) * overshoot,
      size * 0.008,
      jitter,
      key + i * 17,
    );
  });
}

export function drawState(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  palette: GifPalette,
  jitter: Jitter = makeJitter(1),
): void {
  const size = GIF_SIZE;
  const { tiebreak } = state.config;

  // Fundo do tema: papel pautado ou lousa (REQ-REPLAY2-01).
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = palette.ruled;
  ctx.lineWidth = 1;
  for (let y = 28; y < size; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const margin = size * 0.04;
  const boardSize = size - margin * 2;
  const subSize = boardSize / 3;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cellFont = `bold ${Math.round(boardSize / 12)}px "Patrick Hand", cursive`;
  const bigFont = `bold ${Math.round(boardSize / 5)}px "Caveat", "Patrick Hand", cursive`;

  for (let b = 0; b < 9; b++) {
    const sub = getNode(state.board, [b]);
    if (!isBoard(sub)) continue;
    const sx = margin + (b % 3) * subSize;
    const sy = margin + Math.floor(b / 3) * subSize;
    const inner = subSize * 0.1;
    const innerSize = subSize - inner * 2;
    const decided = resultOf(sub as Board, tiebreak);
    const struck = winningLines(sub as Board, tiebreak).length > 0;

    // Mesmos pesos da tela: riscado mantém as marcas legíveis, decidido esmaece.
    ctx.globalAlpha = struck ? 0.62 : decided !== null ? 0.3 : 1;
    drawGrid(ctx, sx + inner, sy + inner, innerSize, 2, palette.lineSoft, jitter, b * 40 + 7);
    ctx.font = cellFont;
    for (let c = 0; c < 9; c++) {
      const value = (sub as Board).cells[c];
      if (value !== 'X' && value !== 'O') continue;
      ctx.fillStyle = value === 'X' ? palette.x : palette.o;
      ctx.fillText(
        value,
        sx + inner + ((c % 3) + 0.5) * (innerSize / 3),
        sy + inner + (Math.floor(c / 3) + 0.55) * (innerSize / 3),
      );
    }
    ctx.globalAlpha = 1;

    if (decided !== null) {
      ctx.globalAlpha = struck ? 0.3 : 0.75;
      ctx.font = bigFont;
      ctx.fillStyle =
        decided === 'X' ? palette.x : decided === 'O' ? palette.o : palette.line;
      ctx.fillText(decided === 'draw' ? '=' : decided, sx + subSize / 2, sy + subSize * 0.56);
      ctx.globalAlpha = 1;
    }

    drawStrikes(
      ctx,
      sub as Board,
      tiebreak,
      sx + inner,
      sy + inner,
      innerSize,
      decided === 'X' ? palette.x : palette.o,
      Math.max(3, size * 0.008),
      jitter,
      b * 40 + 21,
    );
  }

  // Grade do jogo grande por cima, como na tela.
  drawGrid(ctx, margin, margin, boardSize, Math.max(4, size * 0.011), palette.line, jitter, 3);

  const winner = resultOf(state.board, tiebreak);
  drawStrikes(
    ctx,
    state.board,
    tiebreak,
    margin,
    margin,
    boardSize,
    winner === 'X' ? palette.x : palette.o,
    Math.max(5, size * 0.016),
    jitter,
    997,
  );
}

// A fonte manuscrita precisa estar carregada antes do primeiro quadro, senão o
// canvas desenha com a fonte padrão do sistema (REQ-REPLAY2-03).
async function ensureFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('bold 40px "Patrick Hand"'),
      document.fonts.load('bold 80px "Caveat"'),
    ]);
  } catch {
    // fonte indisponível: segue com a reserva, sem travar o download
  }
}

// Gera o GIF completo (só no navegador; a parte testável a seco é buildFrames).
export async function generateGif(
  entry: Pick<LibraryEntry, 'config' | 'moves'>,
): Promise<Blob> {
  await ensureFonts();
  const frames = buildFrames(entry);
  const canvas = document.createElement('canvas');
  canvas.width = GIF_SIZE;
  canvas.height = GIF_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const palette = themePalette();
  // Semente estável por partida: o tremor não muda entre quadros.
  const jitter = makeJitter(entry.moves.length * 13 + 7);

  const gif = GIFEncoder();
  for (const frame of frames) {
    drawState(ctx, frame.state, palette, jitter);
    const { data, width, height } = ctx.getImageData(0, 0, GIF_SIZE, GIF_SIZE);
    const colors = quantize(data, 64);
    const index = applyPalette(data, colors);
    gif.writeFrame(index, width, height, { palette: colors, delay: frame.delayMs });
  }
  gif.finish();
  const bytes = gif.bytes();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Blob([buffer as ArrayBuffer], { type: 'image/gif' });
}
