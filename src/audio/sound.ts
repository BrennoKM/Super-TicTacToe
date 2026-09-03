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

  // Transientes muito curtos e espaçados: o ouvido precisa distinguir cada
  // agarra. Grão longo demais vira sopro, e sopro denso vira estouro.
  const grainsPerSecond = chalk ? 900 : 600;
  const grainLength = rate * (chalk ? 0.0008 : 0.0016);

  let cursor = 0;
  while (cursor < length) {
    const amplitude = 0.25 + Math.random() * 0.75;
    const grain = Math.max(3, Math.round(grainLength * (0.6 + Math.random() * 0.8)));
    for (let j = 0; j < grain && cursor + j < length; j++) {
      const decay = Math.exp(-j / (grain * 0.3));
      data[cursor + j] += (Math.random() * 2 - 1) * amplitude * decay;
    }
    cursor += Math.max(2, Math.round((rate / grainsPerSecond) * (0.3 + Math.random() * 1.8)));
  }
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

  // Escrita quase não tem energia grave. Deixar grave passar é o que dá peso
  // de pancada, e com envelope que decai vira efeito de explosão.
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = chalk ? 1800 : 900;

  // O caráter do material mora entre 2 e 5 kHz (é a faixa que a literatura de
  // arranhado em quadro-negro aponta como a marcante). Realce fixo, sem
  // varredura: varredura descendente é assinatura de explosão, não de risco.
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = (chalk ? 3400 : 2100) * (0.95 + Math.random() * 0.1);
  presence.Q.value = 0.9;
  presence.gain.value = chalk ? 7 : 5;

  // Corta o siseio muito agudo, que soaria como estática.
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = chalk ? 9000 : 6500;

  // Envelope de arrasto: entra rápido, mantém volume praticamente constante e
  // sai rápido. Nada de inchar e decair, que é o formato de estouro.
  const steps = Math.max(48, Math.round(duration * 200));
  const curve = new Float32Array(steps);
  const wobbleHz = 9 + Math.random() * 8;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const onset = Math.min(1, t / 0.05);
    const offset = t > 0.93 ? (1 - t) / 0.07 : 1;
    // Micro tremor da mão, sem alterar o corpo do som.
    const hand = 1 + 0.14 * Math.sin(t * duration * wobbleHz * 2 * Math.PI);
    curve[i] = gain * onset * offset * hand;
  }
  curve[steps - 1] = 0;

  const envelope = ctx.createGain();
  envelope.gain.setValueCurveAtTime(curve, start, duration);

  source.connect(highpass).connect(presence).connect(lowpass).connect(envelope).connect(ctx.destination);
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
