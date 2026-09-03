// Transportes do p2p. A sessão só conhece esta interface, o que permite
// testar o protocolo sem rede e trocar o PeerJS sem tocar na lógica.

import { roomPeerId } from './protocol';

export interface Transport {
  send(raw: string): void;
  close(): void;
  onMessage(cb: (raw: string) => void): void;
  onClose(cb: () => void): void;
}

export interface TransportError {
  kind: 'sala-nao-encontrada' | 'codigo-em-uso' | 'broker-indisponivel' | 'sala-cheia';
}

export type Role = 'host' | 'guest';

interface Callbacks {
  onOpen: (transport: Transport) => void;
  onError: (error: TransportError) => void;
}

// Tentativa de conexão cancelável (REQ-CONEXAO-01, RN-CONEXAO-04): cancelar
// destrói o peer, liberando o código da sala no broker imediatamente.
export interface TransportAttempt {
  cancel(): void;
}

// REQ-CONEXAO-04: STUN não basta entre redes diferentes (NAT restritivo é
// comum em rede móvel); os TURN públicos do Open Relay fazem o relay.
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// ---------------------------------------------------------------------------
// PeerJS (produção): broker público só pra sinalização; jogo no DataChannel.
// ---------------------------------------------------------------------------

type PeerConnection = {
  send(data: unknown): void;
  close(): void;
  on(event: string, cb: (arg?: unknown) => void): void;
  open: boolean;
};

type PeerLike = {
  on(event: string, cb: (arg?: never) => void): void;
  connect(id: string, options?: unknown): PeerConnection;
  destroy(): void;
};

function wrapConnection(conn: PeerConnection, destroyPeer: () => void): Transport {
  let messageCb: (raw: string) => void = () => {};
  let closeCb: () => void = () => {};
  conn.on('data', (data) => messageCb(String(data)));
  conn.on('close', () => closeCb());
  conn.on('error', () => closeCb());
  return {
    send: (raw) => conn.send(raw),
    // Fechar a partida destrói o peer junto: sem isso a sala continuaria
    // registrada no broker aceitando conexões fantasma (REQ-CONEXAO-01).
    close: () => {
      try {
        conn.close();
      } finally {
        destroyPeer();
      }
    },
    onMessage: (cb) => (messageCb = cb),
    onClose: (cb) => (closeCb = cb),
  };
}

function connectPeerJs(role: Role, code: string, callbacks: Callbacks): TransportAttempt {
  let peer: PeerLike | null = null;
  let cancelled = false;

  const destroy = () => {
    const target = peer;
    peer = null;
    try {
      target?.destroy();
    } catch {
      // peer já destruído ou nunca aberto
    }
  };

  const attempt: TransportAttempt = {
    cancel: () => {
      cancelled = true;
      destroy();
    },
  };

  void (async () => {
    const { default: Peer } = await import('peerjs');
    if (cancelled) return;

    const options = { config: { iceServers: ICE_SERVERS } };

    if (role === 'host') {
      const created = new Peer(roomPeerId(code), options) as unknown as PeerLike;
      peer = created;
      let accepted: PeerConnection | null = null;
      created.on('error', ((err: { type?: string }) => {
        if (cancelled) return;
        if (err.type === 'unavailable-id') callbacks.onError({ kind: 'codigo-em-uso' });
        else if (!accepted) callbacks.onError({ kind: 'broker-indisponivel' });
      }) as never);
      created.on('connection', ((conn: PeerConnection) => {
        if (cancelled) return;
        if (accepted && accepted.open) {
          // Sala cheia: recusa conexões além da primeira.
          conn.on('open', () => conn.close());
          return;
        }
        accepted = conn;
        conn.on('open', () => {
          if (!cancelled) callbacks.onOpen(wrapConnection(conn, destroy));
        });
      }) as never);
    } else {
      const created = new Peer(undefined as unknown as string, options) as unknown as PeerLike;
      peer = created;
      created.on('error', ((err: { type?: string }) => {
        if (cancelled) return;
        if (err.type === 'peer-unavailable') callbacks.onError({ kind: 'sala-nao-encontrada' });
        else callbacks.onError({ kind: 'broker-indisponivel' });
      }) as never);
      created.on('open', (() => {
        if (cancelled) return;
        const conn = created.connect(roomPeerId(code), { reliable: true });
        conn.on('open', () => {
          if (!cancelled) callbacks.onOpen(wrapConnection(conn, destroy));
        });
      }) as never);
    }
  })();

  return attempt;
}

// ---------------------------------------------------------------------------
// BroadcastChannel (testes e2e): mesma origem, sem rede nem broker.
// Ativado por localStorage["stt.transport"] = "broadcast".
// ---------------------------------------------------------------------------

function connectBroadcast(role: Role, code: string, callbacks: Callbacks): TransportAttempt {
  const channel = new BroadcastChannel(`stt-room-${code}`);
  const me = role;
  let opened = false;
  let cancelled = false;
  let hostPresent = role === 'host';
  let messageCb: (raw: string) => void = () => {};
  let closeCb: () => void = () => {};

  const transport: Transport = {
    send: (raw) => channel.postMessage({ from: me, raw }),
    close: () => {
      channel.postMessage({ from: me, ctrl: 'bye' });
      channel.close();
    },
    onMessage: (cb) => (messageCb = cb),
    onClose: (cb) => (closeCb = cb),
  };

  channel.onmessage = (event) => {
    if (cancelled) return;
    const data = event.data as { from: Role; raw?: string; ctrl?: string };
    if (data.from === me) return;
    // Sondagem de sala: só um host presente responde (AC-CONEXAO-01).
    if (data.ctrl === 'ping-room' && me === 'host' && hostPresent) {
      channel.postMessage({ from: me, ctrl: 'room-alive' });
      return;
    }
    if (data.ctrl === 'room-alive' && me === 'guest') {
      channel.postMessage({ from: me, ctrl: 'join' });
      return;
    }
    if (data.ctrl === 'join' && me === 'host' && hostPresent) {
      channel.postMessage({ from: me, ctrl: 'welcome' });
      if (!opened) {
        opened = true;
        callbacks.onOpen(transport);
      }
      return;
    }
    if (data.ctrl === 'welcome' && me === 'guest' && !opened) {
      opened = true;
      callbacks.onOpen(transport);
      return;
    }
    if (data.ctrl === 'bye') {
      closeCb();
      return;
    }
    if (data.raw !== undefined && opened) messageCb(data.raw);
  };

  if (role === 'guest') {
    channel.postMessage({ from: me, ctrl: 'ping-room' });
    setTimeout(() => {
      if (!opened && !cancelled) callbacks.onError({ kind: 'sala-nao-encontrada' });
    }, 1500);
  }

  return {
    cancel: () => {
      cancelled = true;
      hostPresent = false;
      try {
        channel.postMessage({ from: me, ctrl: 'bye' });
        channel.close();
      } catch {
        // canal já fechado
      }
    },
  };
}

export function connectTransport(
  role: Role,
  code: string,
  callbacks: Callbacks,
): TransportAttempt {
  let useBroadcast = false;
  try {
    useBroadcast = localStorage.getItem('stt.transport') === 'broadcast';
  } catch {
    // sem storage: segue no PeerJS
  }
  return useBroadcast
    ? connectBroadcast(role, code, callbacks)
    : connectPeerJs(role, code, callbacks);
}
