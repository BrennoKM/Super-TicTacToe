import type { Transport } from '../../src/p2p/transport';

// Par de transportes em memória com entrega controlável: permite atrasar,
// derrubar e duplicar mensagens pra exercitar as garantias do contrato.
export interface FakeEnd extends Transport {
  peerQueue: string[]; // mensagens já entregues ao par (histórico)
  deliverTo(raw: string): void;
  closed: boolean;
}

export interface FakePair {
  a: FakeEnd;
  b: FakeEnd;
  // Corta o canal sem avisar (simula queda brusca).
  drop(): void;
}

export function createFakePair(options?: { manual?: boolean }): FakePair {
  const manual = options?.manual ?? false;

  function makeEnd(): FakeEnd {
    let messageCb: (raw: string) => void = () => {};
    let closeCb: () => void = () => {};
    const end: FakeEnd = {
      peerQueue: [],
      closed: false,
      send: (raw) => {
        if (end.closed) return;
        const other = end === pair.a ? pair.b : pair.a;
        other.peerQueue.push(raw);
        if (!manual) other.deliverTo(raw);
      },
      close: () => {
        end.closed = true;
        const other = end === pair.a ? pair.b : pair.a;
        if (!other.closed) {
          other.closed = true;
          otherCallbacks(other).close();
        }
      },
      onMessage: (cb) => (messageCb = cb),
      onClose: (cb) => (closeCb = cb),
      deliverTo: (raw) => messageCb(raw),
    };
    callbacks.set(end, { close: () => closeCb() });
    return end;
  }

  const callbacks = new Map<FakeEnd, { close: () => void }>();
  const otherCallbacks = (end: FakeEnd) => callbacks.get(end)!;

  const pair = {
    a: undefined as unknown as FakeEnd,
    b: undefined as unknown as FakeEnd,
    drop() {
      pair.a.closed = true;
      pair.b.closed = true;
      otherCallbacks(pair.a).close();
      otherCallbacks(pair.b).close();
    },
  };
  pair.a = makeEnd();
  pair.b = makeEnd();
  return pair;
}
