// Som de escrita sintetizado (spec SOM). Sem arquivos de áudio: ruído filtrado
// com envelope curto, que é como se imita risco de caneta, lápis ou giz.

export type Theme = 'light' | 'dark';
export type Mark = 'X' | 'O';
export type StrikeScale = 'small' | 'big';

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
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

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise === null || noise.sampleRate !== ctx.sampleRate) {
    const length = Math.floor(ctx.sampleRate * 1.5);
    noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

interface ScratchOptions {
  duration: number; // segundos
  gain: number;
  // Caneta e lápis: passa-baixa, ataque suave, cauda seca.
  // Giz: passa-banda alto com modulação rápida, que dá o granulado do quadro.
  theme: Theme;
  startAt?: number;
}

// Um risco: ruído filtrado com envelope e, no giz, tremulação de amplitude.
function scratch(ctx: AudioContext, options: ScratchOptions): void {
  const { duration, gain, theme } = options;
  const start = ctx.currentTime + (options.startAt ?? 0);
  const chalk = theme === 'dark';

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;
  // Pequena variação a cada jogada, pra não soar mecânico.
  const drift = 0.9 + Math.random() * 0.25;
  source.playbackRate.value = drift;

  const filter = ctx.createBiquadFilter();
  if (chalk) {
    filter.type = 'bandpass';
    filter.frequency.value = 2600 * drift;
    filter.Q.value = 1.4;
  } else {
    filter.type = 'lowpass';
    filter.frequency.value = 1500 * drift;
    filter.Q.value = 0.8;
  }

  const envelope = ctx.createGain();
  const peak = gain * (chalk ? 0.9 : 0.75);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(peak, start + (chalk ? 0.006 : 0.012));
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter).connect(envelope).connect(ctx.destination);

  // Granulado do giz: modulação rápida de amplitude sobre o envelope.
  if (chalk) {
    const grain = ctx.createOscillator();
    grain.type = 'square';
    grain.frequency.value = 55 + Math.random() * 35;
    const grainGain = ctx.createGain();
    grainGain.gain.value = 0.35;
    grain.connect(grainGain).connect(envelope.gain);
    grain.start(start);
    grain.stop(start + duration + 0.05);
  }

  source.start(start);
  source.stop(start + duration + 0.05);
}

// REQ-SOM-02: X são dois riscos rápidos; O é um traço único mais longo.
export function playMark(mark: Mark, theme: Theme): void {
  const ctx = ensureContext();
  if (ctx === null) return;
  try {
    if (mark === 'X') {
      scratch(ctx, { duration: 0.1, gain: 0.32, theme });
      scratch(ctx, { duration: 0.1, gain: 0.3, theme, startAt: 0.085 });
    } else {
      scratch(ctx, { duration: 0.26, gain: 0.28, theme });
    }
  } catch {
    // áudio indisponível: segue em silêncio
  }
}

// REQ-SOM-09 e 10: o risco é um traço contínuo, e o do tabuleiro grande é maior.
export function playStrike(scale: StrikeScale, theme: Theme): void {
  const ctx = ensureContext();
  if (ctx === null) return;
  try {
    scratch(ctx, {
      duration: scale === 'big' ? 0.62 : 0.34,
      gain: scale === 'big' ? 0.42 : 0.34,
      theme,
    });
  } catch {
    // áudio indisponível: segue em silêncio
  }
}
