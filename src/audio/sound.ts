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

// Duração de cada clipe, conhecida de antemão (vieram do corte com ffmpeg).
// Usada pra reservar vaga na fila sem depender do fetch/decode terminar
// (RN-SOM-10: a fila é só bookkeeping síncrono, nunca espera rede).
const CLIP_DURATION_S = {
  light: { x1: 0.28, x2: 0.294, o: 0.887, small: 1.172, big: 1.819 },
  dark: { x1: 0.3, x2: 0.3, o: 0.8, small: 1.15, big: 1.85 },
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

// Fila serial (RN-SOM-07, 10): sem ela, a marca do bot toca por cima da sua
// (ele responde rápido demais pro seu som terminar) e o risco tocava junto
// da marca que fechou a linha, virando uma pilha confusa de sons. Agora cada
// som só começa quando o anterior termina, mais uma folga curta pra separar
// no ouvido. Se a fila acumular mais de MAX_BACKLOG_S de atraso (jogadas
// muito rápidas, autoplay do replay), a PRÓXIMA JOGADA inteira é descartada
// em vez de empilhar: o áudio nunca fica muito atrás do que está na tela.
//
// O descarte é decidido uma vez por jogada, não por clipe (playMoveSounds):
// uma jogada que fecha um tabuleiro pequeno e vence a partida no mesmo lance
// dispara marca + risco pequeno + risco grande juntos, e cortar o risco
// grande no meio (o som da vitória!) por causa do limite de atraso seria
// pior que a fila ficar um pouco mais cheia por essa jogada.
let queueFreeAt = 0; // AudioContext.currentTime da próxima vaga livre
const MIN_GAP_S = 0.035;
const MAX_BACKLOG_S = 1.1;

// Reserva um horário de início, avançando a fila pela duração conhecida do
// clipe. `extraGap` é uma pausa adicional intencional (ex: a mão tirando o
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

// Toca um clipe já com o horário reservado na fila serial.
function playClip(ctx: AudioContext, theme: Theme, key: ClipKey, gain: number, start: number): void {
  void (async () => {
    const buffer = await loadClip(ctx, CLIP_FILES[theme][key]);
    if (buffer === null || muted) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 0.94 + Math.random() * 0.12;

    const envelope = ctx.createGain();
    envelope.gain.value = gain * (0.88 + Math.random() * 0.24);

    source.connect(envelope).connect(ctx.destination);
    // Se o carregamento (primeira vez) demorou mais que a vaga reservada,
    // toca assim que possível em vez de perder o som.
    source.start(Math.max(start, ctx.currentTime + 0.003));
  })();
}

// Toca a marca da jogada e os riscos que ela abriu (spec RISCO), tudo em
// fila, como um pacote só: ou toca inteiro, ou (fila muito cheia) não toca
// nada dessa jogada. REQ-SOM-02: X são dois traços com pausa real entre eles
// (a mão tira o material da superfície); O é um traço único mais longo.
// RN-SOM-08 (revista): o risco entra na fila logo após a marca, não mais
// simultâneo a ela.
export function playMoveSounds(sounds: import('./events').MoveSounds, theme: Theme): void {
  const ctx = ensureContext();
  if (ctx === null) return;
  try {
    if (currentBacklogS(ctx) > MAX_BACKLOG_S) return; // fila cheia: pula a jogada inteira

    if (sounds.mark === 'X') {
      playClip(ctx, theme, 'x1', 0.85, reserveSlot(CLIP_DURATION_S[theme].x1));
      playClip(ctx, theme, 'x2', 0.8, reserveSlot(CLIP_DURATION_S[theme].x2, 0.14));
    } else if (sounds.mark === 'O') {
      playClip(ctx, theme, 'o', 0.75, reserveSlot(CLIP_DURATION_S[theme].o));
    }
    for (const scale of sounds.strikes) {
      const key = scale === 'big' ? 'big' : 'small';
      playClip(ctx, theme, key, scale === 'big' ? 0.95 : 0.8, reserveSlot(CLIP_DURATION_S[theme][key]));
    }
  } catch {
    // áudio indisponível: segue em silêncio
  }
}
