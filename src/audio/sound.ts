// Som de escrita (spec SOM), a partir de duas gravações reais bem curtas.
//
// Histórico da busca pelo som certo (2026-09-03): três rodadas de síntese não
// convenceram (estalo, depois explosão, depois formato correto mas sem
// caráter). A troca por gravação real também não convenceu de início: os
// clipes vinham de janelas de rabisco contínuo, e soavam como raspar sem
// parar. O que funcionou foi isolar o menor toque distinto que existia em
// cada gravação, um clipe só por tema, e construir todos os eventos (as duas
// pernas do X, o O, os dois riscos) variando a velocidade de reprodução
// desse único toque: mais rápido e agudo pro X, mais lento e grave pros
// riscos. Ver Notas Técnicas da spec SOM pro relato completo.

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
  queueFreeAt = 0;
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

// Um clipe só por tema: o menor toque isolado de cada gravação (RN-SOM-03).
const CLIP_FILES: Record<Theme, string> = { light: 'pencil.mp3', dark: 'chalk.mp3' };
const CLIP_DURATION_S: Record<Theme, number> = { light: 0.132, dark: 0.215 };

// Velocidade de reprodução por evento: mais rápido e agudo pro toque curto do
// X, mais devagar e grave pros riscos, como um gesto maior. A duração efetiva
// (usada pra reservar vaga na fila) é a duração do clipe dividida pela taxa.
const RATE: Record<'x' | 'o' | 'small' | 'big', { base: number; jitter: number; gain: number }> = {
  x: { base: 0.97, jitter: 0.07, gain: 0.85 },
  o: { base: 0.82, jitter: 0.06, gain: 0.8 },
  small: { base: 0.55, jitter: 0.05, gain: 0.85 },
  big: { base: 0.38, jitter: 0.04, gain: 0.95 },
};

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

// Fila serial (RN-SOM-07, 10): sem ela, a marca do bot toca por cima da sua
// (ele responde rápido demais pro seu som terminar) e o risco tocava junto
// da marca que fechou a linha, virando uma pilha confusa de sons. Agora cada
// som só começa quando o anterior termina, mais uma folga curta pra separar
// no ouvido. Se a fila acumular mais de MAX_BACKLOG_S de atraso (jogadas
// muito rápidas, autoplay do replay), a PRÓXIMA JOGADA inteira é descartada
// em vez de empilhar: o áudio nunca fica muito atrás do que está na tela.
let queueFreeAt = 0; // AudioContext.currentTime da próxima vaga livre
const MIN_GAP_S = 0.035;
const MAX_BACKLOG_S = 1.1;

// Reserva um horário de início, avançando a fila pela duração efetiva do
// evento. `extraGap` é uma pausa adicional intencional (ex: a mão tirando o
// giz da superfície entre as duas pernas do X), maior que o MIN_GAP padrão.
// Não decide sozinha se descarta: isso é responsabilidade de quem chama,
// uma vez por jogada (ver playMoveSounds).
function reserveSlot(durationS: number, extraGap = 0): number {
  const start = queueFreeAt + extraGap;
  queueFreeAt = start + durationS + MIN_GAP_S;
  return start;
}

function currentBacklogS(ctx: AudioContext): number {
  const now = ctx.currentTime;
  if (queueFreeAt < now) queueFreeAt = now; // fila zerou: nada acumulado
  return queueFreeAt - now;
}

// Toca o toque do tema, esticado pra virar o evento pedido (x, o ou risco),
// na vaga já reservada na fila serial.
function playTouch(
  ctx: AudioContext,
  theme: Theme,
  event: keyof typeof RATE,
  start: number,
): void {
  void (async () => {
    const buffer = await loadClip(ctx, CLIP_FILES[theme]);
    if (buffer === null || muted) return;

    const { base, jitter, gain } = RATE[event];
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = base + (Math.random() * 2 - 1) * jitter;

    const envelope = ctx.createGain();
    envelope.gain.value = gain * (0.9 + Math.random() * 0.2);

    source.connect(envelope).connect(ctx.destination);
    // Se o carregamento (primeira vez) demorou mais que a vaga reservada,
    // toca assim que possível em vez de perder o som.
    source.start(Math.max(start, ctx.currentTime + 0.003));
  })();
}

function effectiveDuration(theme: Theme, event: keyof typeof RATE): number {
  return CLIP_DURATION_S[theme] / RATE[event].base;
}

// Toca a marca da jogada e os riscos que ela abriu (spec RISCO), tudo em
// fila, como um pacote só: ou toca inteiro, ou (fila muito cheia) não toca
// nada dessa jogada. REQ-SOM-02: X são dois toques com pausa real entre eles
// (a mão tira o material da superfície); O é um toque único mais longo.
// RN-SOM-08 (revista): o risco entra na fila logo após a marca, não mais
// simultâneo a ela.
export function playMoveSounds(sounds: import('./events').MoveSounds, theme: Theme): void {
  const ctx = ensureContext();
  if (ctx === null) return;
  try {
    if (currentBacklogS(ctx) > MAX_BACKLOG_S) return; // fila cheia: pula a jogada inteira

    if (sounds.mark === 'X') {
      playTouch(ctx, theme, 'x', reserveSlot(effectiveDuration(theme, 'x')));
      playTouch(ctx, theme, 'x', reserveSlot(effectiveDuration(theme, 'x'), 0.14));
    } else if (sounds.mark === 'O') {
      playTouch(ctx, theme, 'o', reserveSlot(effectiveDuration(theme, 'o')));
    }
    for (const scale of sounds.strikes) {
      const event = scale === 'big' ? 'big' : 'small';
      playTouch(ctx, theme, event, reserveSlot(effectiveDuration(theme, event)));
    }
  } catch {
    // áudio indisponível: segue em silêncio
  }
}
