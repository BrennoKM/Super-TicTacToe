// Som de escrita (spec SOM), a partir de gravações reais curtas, não síntese.
//
// A pesquisa de 2026-09-03 confirmou que não há atalho de síntese pronto pra
// esse som (ver Notas Técnicas da spec): a comunidade inteira usa gravação, e
// o guincho do giz é tema de artigo científico (fenômeno stick-slip). Cada
// tentativa de sintetizar (ruído filtrado, trem de grãos, banda ressonante)
// ficou ou percussiva ou com formato de explosão. Os clipes usados aqui vêm
// de gravações de domínio livre com atribuição (ver créditos no rodapé do
// jogo e RN-SOM-03 da spec).

export type Theme = 'light' | 'dark';
export type Mark = 'X' | 'O';
export type StrikeScale = 'small' | 'big';

let context: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

// Descarta o contexto atual, pra recuperação de um contexto morto.
export function resetAudio(): void {
  try {
    void context?.close();
  } catch {
    // contexto já encerrado
  }
  context = null;
}

// RN-SOM-04: falha de áudio nunca atrapalha o jogo.
function ensureContext(): AudioContext | null {
  if (muted) return null;
  try {
    if (context === null) {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    }
    // REQ-SOM-07: o contexto só sai do estado suspenso após um gesto do jogador.
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

const CLIP_FILES = {
  light: {
    x1: 'pencil-x1.mp3',
    x2: 'pencil-x2.mp3',
    o: 'pencil-o.mp3',
    small: 'pencil-strike-small.mp3',
    big: 'pencil-strike-big.mp3',
  },
  dark: {
    x1: 'chalk-x1.mp3',
    x2: 'chalk-x2.mp3',
    o: 'chalk-o.mp3',
    small: 'chalk-strike-small.mp3',
    big: 'chalk-strike-big.mp3',
  },
} as const;

type ClipKey = keyof typeof CLIP_FILES.light;

const bufferCache = new Map<string, Promise<AudioBuffer | null>>();

function clipUrl(file: string): string {
  // import.meta.env.BASE_URL respeita o VITE_BASE do deploy (subpasta do
  // GitHub Pages); sem isso os clipes 404ariam em produção.
  return `${import.meta.env.BASE_URL}sounds/${file}`;
}

async function loadClip(ctx: AudioContext, file: string): Promise<AudioBuffer | null> {
  const key = `${ctx.sampleRate}:${file}`;
  let pending = bufferCache.get(key);
  if (!pending) {
    pending = (async () => {
      try {
        const response = await fetch(clipUrl(file));
        if (!response.ok) return null;
        const bytes = await response.arrayBuffer();
        return await ctx.decodeAudioData(bytes);
      } catch {
        return null;
      }
    })();
    bufferCache.set(key, pending);
  }
  return pending;
}

// Toca um clipe com leve variação de altura e volume, pra jogadas seguidas
// não soarem idênticas (o mesmo cuidado que a versão sintetizada já tinha).
async function playClip(theme: Theme, key: ClipKey, gain: number, startAt = 0): Promise<void> {
  const ctx = ensureContext();
  if (ctx === null) return;
  const file = CLIP_FILES[theme][key];
  const buffer = await loadClip(ctx, file);
  if (buffer === null || muted) return;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = 0.94 + Math.random() * 0.12;

  const envelope = ctx.createGain();
  envelope.gain.value = gain * (0.88 + Math.random() * 0.24);

  source.connect(envelope).connect(ctx.destination);
  const when = ctx.currentTime + startAt;
  source.start(when);
}

// REQ-SOM-02: X são dois traços curtos com pausa real entre eles (a mão
// tira o material da superfície); O é um traço único mais longo.
export function playMark(mark: Mark, theme: Theme): void {
  try {
    if (mark === 'X') {
      void playClip(theme, 'x1', 0.85);
      void playClip(theme, 'x2', 0.8, 0.34);
    } else {
      void playClip(theme, 'o', 0.75);
    }
  } catch {
    // áudio indisponível: segue em silêncio
  }
}

// REQ-SOM-09 e 10: o risco é um traço contínuo, maior no tabuleiro grande.
export function playStrike(scale: StrikeScale, theme: Theme): void {
  try {
    void playClip(theme, scale === 'big' ? 'big' : 'small', scale === 'big' ? 0.95 : 0.8);
  } catch {
    // áudio indisponível: segue em silêncio
  }
}
