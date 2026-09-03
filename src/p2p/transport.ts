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

// ---------------------------------------------------------------------------
// PeerJS (produção): broker público só pra sinalização; jogo no DataChannel.
// ---------------------------------------------------------------------------

type PeerConnection = {
  send(data: unknown): void;
  close(): void;
  on(event: string, cb: (arg?: unknown) => void): void;
  open: boolean;
};

function wrapConnection(conn: PeerConnection): Transport {
  let messageCb: (raw: string) => void = () => {};
  let closeCb: () => void = () => {};
  conn.on('data', (data) => messageCb(String(data)));
  conn.on('close', () => closeCb());
  conn.on('error', () => closeCb());
  return {
    send: (raw) => conn.send(raw),
    close: () => conn.close(),
    onMessage: (cb) => (messageCb = cb),
    onClose: (cb) => (closeCb = cb),
  };
}

async function connectPeerJs(role: Role, code: string, callbacks: Callbacks): Promise<void> {
  const { default: Peer } = await import('peerjs');

  if (role === 'host') {
    const peer = new Peer(roomPeerId(code));
    let accepted: PeerConnection | null = null;
    peer.on('error', (err: { type?: string }) => {
      if (err.type === 'unavailable-id') callbacks.onError({ kind: 'codigo-em-uso' });
      else if (!accepted) callbacks.onError({ kind: 'broker-indisponivel' });
    });
    peer.on('connection', (conn: PeerConnection) => {
      if (accepted && accepted.open) {
        // Sala cheia: recusa conexões além da primeira.
        conn.on('open', () => conn.close());
        return;
      }
      accepted = conn;
      conn.on('open', () => callbacks.onOpen(wrapConnection(conn)));
    });
  } else {
    const peer = new Peer();
    peer.on('error', (err: { type?: string }) => {
      if (err.type === 'peer-unavailable') callbacks.onError({ kind: 'sala-nao-encontrada' });
      else callbacks.onError({ kind: 'broker-indisponivel' });
    });
    peer.on('open', () => {
      const conn = peer.connect(roomPeerId(code), { reliable: true }) as PeerConnection;
      conn.on('open', () => callbacks.onOpen(wrapConnection(conn)));
    });
  }
}

// ---------------------------------------------------------------------------
// BroadcastChannel (testes e2e): mesma origem, sem rede nem broker.
// Ativado por localStorage["stt.transport"] = "broadcast".
// ---------------------------------------------------------------------------

function connectBroadcast(role: Role, code: string, callbacks: Callbacks): void {
  const channel = new BroadcastChannel(`stt-room-${code}`);
  const me = role;
  let opened = false;
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
    const data = event.data as { from: Role; raw?: string; ctrl?: string };
    if (data.from === me) return;
    if (data.ctrl === 'join' && me === 'host') {
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
    channel.postMessage({ from: me, ctrl: 'join' });
    setTimeout(() => {
      if (!opened) callbacks.onError({ kind: 'sala-nao-encontrada' });
    }, 2000);
  }
}

export function connectTransport(role: Role, code: string, callbacks: Callbacks): void {
  let useBroadcast = false;
  try {
    useBroadcast = localStorage.getItem('stt.transport') === 'broadcast';
  } catch {
    // sem storage: segue no PeerJS
  }
  if (useBroadcast) connectBroadcast(role, code, callbacks);
  else void connectPeerJs(role, code, callbacks);
}
