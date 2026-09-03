// Som de escrita sintetizado (spec SOM). Sem arquivos de áudio: o risco é
// reproduzido pela física do atrito, com trem de grãos, ressonância do material
// e envelope de gesto.

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

// Descarta o contexto atual. Serve para o áudio se recuperar de um contexto
// morto e para medir os sons num contexto offline durante a verificação.
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

// Risco é atrito de agarra e escorrega: o giz ou o grafite prende e solta
// centenas de vezes por segundo, e cada solta é um micro impacto. Por isso o
// material bruto é um trem de grãos irregulares, não ruído contínuo (que soa
// como chiado). A densidade e o tamanho do grão é que dão a textura.
function scratchBuffer(ctx: AudioContext, duration: number, chalk: boolean): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.ceil(rate * duration));
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);

  // Giz na lousa agarra mais vezes por segundo e com grão mais curto e seco;
  // lápis no papel tem grão um pouco mais espaçado e macio.
  const grainsPerSecond = chalk ? 1150 : 780;
  const grainLength = rate * (chalk ? 0.0035 : 0.0065);

  let cursor = 0;
  while (cursor < length) {
    const amplitude = 0.3 + Math.random() * 0.7;
    const grain = Math.max(4, Math.round(grainLength * (0.5 + Math.random())));
    for (let j = 0; j < grain && cursor + j < length; j++) {
      const decay = Math.exp(-j / (grain * 0.35));
      data[cursor + j] += (Math.random() * 2 - 1) * amplitude * decay;
    }
    // Intervalo irregular entre agarras, que é o que soa como atrito real.
    cursor += Math.max(1, Math.round((rate / grainsPerSecond) * (0.35 + Math.random() * 1.7)));
  }

  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak > 0) for (let i = 0; i < length; i++) data[i] /= peak;
  return buffer;
}

interface ScratchOptions {
  duration: number; // segundos
  gain: number;
  // Caneta e lápis: banda média, fricção mais fechada e regular.
  // Giz: banda mais alta e áspera, com fricção mais irregular.
  theme: Theme;
  startAt?: number;
}

// Monta um traço: grãos de atrito passando por passa-alta, ressonância do
// material e envelope do gesto da mão.
function scratch(ctx: AudioContext, options: ScratchOptions): void {
  const { duration, gain, theme } = options;
  const start = ctx.currentTime + (options.startAt ?? 0);
  const chalk = theme === 'dark';

  const source = ctx.createBufferSource();
  source.buffer = scratchBuffer(ctx, duration, chalk);
  source.playbackRate.value = 0.92 + Math.random() * 0.16;

  // Tira o peso grave, que dá sensação de batida em vez de arrasto.
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = chalk ? 900 : 500;

  // Ressonância: é ela que dá o timbre do material. O giz canta mais agudo
  // na lousa; o grafite no papel responde mais baixo e abafado.
  const body = ctx.createBiquadFilter();
  body.type = 'bandpass';
  const from = (chalk ? 3200 : 1700) * (0.94 + Math.random() * 0.12);
  const to = (chalk ? 2750 : 1450) * (0.94 + Math.random() * 0.12);
  body.frequency.setValueAtTime(from, start);
  // A mão desacelera no fim do traço, e a banda acompanha.
  body.frequency.linearRampToValueAtTime(to, start + duration);
  body.Q.value = chalk ? 2.6 : 1.6;

  // Envelope do gesto: a mão encosta, arrasta e levanta.
  const steps = Math.max(32, Math.round(duration * 240));
  const curve = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const attack = Math.min(1, t / 0.08);
    const release = t > 0.88 ? (1 - t) / 0.12 : 1;
    // Pressão da mão variando devagar ao longo do traço.
    const pressure = 0.78 + 0.22 * Math.sin(t * Math.PI * (1.5 + Math.random()));
    curve[i] = gain * attack * release * pressure;
  }
  curve[steps - 1] = 0;

  const envelope = ctx.createGain();
  envelope.gain.setValueCurveAtTime(curve, start, duration);

  source.connect(highpass).connect(body).connect(envelope).connect(ctx.destination);
  source.start(start);
  source.stop(start + duration + 0.03);
}

// REQ-SOM-02: X são dois riscos rápidos; O é um traço único mais longo.
export function playMark(mark: Mark, theme: Theme): void {
  const ctx = ensureContext();
  if (ctx === null) return;
  try {
    // O X são dois traços rápidos, e entre eles a mão tira o giz ou o lápis
    // da superfície: por isso há silêncio real no meio, não um traço só
    // partido. O O é um movimento único, contínuo e mais demorado.
    if (mark === 'X') {
      scratch(ctx, { duration: 0.24, gain: 0.3, theme });
      scratch(ctx, { duration: 0.22, gain: 0.28, theme, startAt: 0.42 });
    } else {
      scratch(ctx, { duration: 0.8, gain: 0.24, theme });
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
      duration: scale === 'big' ? 1.7 : 0.95,
      gain: scale === 'big' ? 0.4 : 0.32,
      theme,
    });
  } catch {
    // áudio indisponível: segue em silêncio
  }
}
