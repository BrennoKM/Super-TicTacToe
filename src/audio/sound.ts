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

// Descarta o contexto atual. Serve para o áudio se recuperar de um contexto
// morto e para medir os sons num contexto offline durante a verificação.
export function resetAudio(): void {
  try {
    void context?.close();
  } catch {
    // contexto já encerrado
  }
  context = null;
  noise = null;
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
  // Caneta e lápis: banda média, fricção mais fechada e regular.
  // Giz: banda mais alta e áspera, com fricção mais irregular.
  theme: Theme;
  startAt?: number;
}

// Um risco de escrita é ruído sustentado com atrito irregular, não um estalo.
// Por isso o ganho vem de uma curva com granulado aleatório (fricção) em vez
// de rampa simples, e a banda do filtro varre enquanto o traço "anda".
function scratch(ctx: AudioContext, options: ScratchOptions): void {
  const { duration, gain, theme } = options;
  const start = ctx.currentTime + (options.startAt ?? 0);
  const chalk = theme === 'dark';

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;
  source.loopStart = Math.random();
  source.loopEnd = source.loopStart + 0.4;
  source.playbackRate.value = 0.85 + Math.random() * 0.3;

  // Tira o peso grave, que é o que dava sensação de batida.
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = chalk ? 1100 : 650;

  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  const from = (chalk ? 3200 : 1900) * (0.9 + Math.random() * 0.2);
  const to = (chalk ? 2100 : 1150) * (0.9 + Math.random() * 0.2);
  band.frequency.setValueAtTime(from, start);
  band.frequency.linearRampToValueAtTime(to, start + duration);
  band.Q.value = chalk ? 1.1 : 0.7;

  // Envelope com fricção: ataque suave o bastante pra não estalar, corpo
  // sustentado e granulado aleatório por cima (o arrastar do traço).
  const steps = Math.max(24, Math.round(duration * 320));
  const curve = new Float32Array(steps);
  const grit = chalk ? 0.55 : 0.32;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const attack = Math.min(1, t / 0.14);
    const decay = Math.pow(1 - t, chalk ? 0.9 : 1.3);
    const friction = 1 - grit + grit * Math.random();
    curve[i] = gain * attack * decay * friction;
  }
  curve[steps - 1] = 0;

  const envelope = ctx.createGain();
  envelope.gain.setValueCurveAtTime(curve, start, duration);

  source.connect(highpass).connect(band).connect(envelope).connect(ctx.destination);
  source.start(start);
  source.stop(start + duration + 0.03);
}

// REQ-SOM-02: X são dois riscos rápidos; O é um traço único mais longo.
export function playMark(mark: Mark, theme: Theme): void {
  const ctx = ensureContext();
  if (ctx === null) return;
  try {
    if (mark === 'X') {
      scratch(ctx, { duration: 0.15, gain: 0.3, theme });
      scratch(ctx, { duration: 0.15, gain: 0.28, theme, startAt: 0.13 });
    } else {
      scratch(ctx, { duration: 0.34, gain: 0.26, theme });
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
      duration: scale === 'big' ? 0.85 : 0.45,
      gain: scale === 'big' ? 0.4 : 0.32,
      theme,
    });
  } catch {
    // áudio indisponível: segue em silêncio
  }
}
