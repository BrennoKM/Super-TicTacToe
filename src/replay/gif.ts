// GIF leve da partida (REQ-REPLAY-06): um frame por jogada e um final demorado,
// desenhado em canvas 2D com o visual do tema em uso.

import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { getNode, isBoard, replay, resultOf } from '../engine';
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
  line: string;
  lineSoft: string;
  x: string;
  o: string;
}

// Lê as cores do tema em uso direto das variáveis de CSS.
export function themePalette(): GifPalette {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    bg: read('--bg', '#faf6ec'),
    line: read('--line', '#22335c'),
    lineSoft: read('--line-soft', 'rgba(34,51,92,0.4)'),
    x: read('--mark-x', '#c0392b'),
    o: read('--mark-o', '#1f5fa8'),
  };
}

export const GIF_SIZE = 512;

function drawGrid(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  size: number,
  width: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  for (const t of [1 / 3, 2 / 3]) {
    ctx.beginPath();
    ctx.moveTo(x0 + size * t, y0 + size * 0.02);
    ctx.lineTo(x0 + size * t, y0 + size * 0.98);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0 + size * 0.02, y0 + size * t);
    ctx.lineTo(x0 + size * 0.98, y0 + size * t);
    ctx.stroke();
  }
}

export function drawState(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  palette: GifPalette,
): void {
  const size = GIF_SIZE;
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, size, size);
  const margin = size * 0.03;
  const boardSize = size - margin * 2;
  drawGrid(ctx, margin, margin, boardSize, 7, palette.line);

  const { tiebreak } = state.config;
  const cellFont = `bold ${Math.round(boardSize / 12)}px "Patrick Hand", cursive`;
  const bigFont = `bold ${Math.round(boardSize / 4)}px "Caveat", "Patrick Hand", cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let b = 0; b < 9; b++) {
    const sub = getNode(state.board, [b]);
    if (!isBoard(sub)) continue;
    const sx = margin + (b % 3) * (boardSize / 3);
    const sy = margin + Math.floor(b / 3) * (boardSize / 3);
    const subSize = boardSize / 3;
    const inner = subSize * 0.12;
    const innerSize = subSize - inner * 2;
    const decided = resultOf(sub as Board, tiebreak);

    ctx.globalAlpha = decided !== null ? 0.18 : 1;
    drawGrid(ctx, sx + inner, sy + inner, innerSize, 2.5, palette.lineSoft);
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
      ctx.font = bigFont;
      ctx.fillStyle =
        decided === 'X' ? palette.x : decided === 'O' ? palette.o : palette.line;
      ctx.fillText(decided === 'draw' ? '=' : decided, sx + subSize / 2, sy + subSize * 0.56);
    }
  }
}

// Gera o GIF completo (só no navegador; a parte testável a seco é buildFrames).
export function generateGif(entry: Pick<LibraryEntry, 'config' | 'moves'>): Blob {
  const frames = buildFrames(entry);
  const canvas = document.createElement('canvas');
  canvas.width = GIF_SIZE;
  canvas.height = GIF_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const palette = themePalette();

  const gif = GIFEncoder();
  for (const frame of frames) {
    drawState(ctx, frame.state, palette);
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
