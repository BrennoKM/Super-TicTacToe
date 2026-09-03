import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameConfig, Path, Player } from '../engine';
import type { Messages } from '../i18n';
import { generateRoomCode } from '../p2p/protocol';
import { P2PSession } from '../p2p/session';
import type { SessionSnapshot } from '../p2p/session';
import { connectTransport } from '../p2p/transport';
import type { Role, TransportError } from '../p2p/transport';
import { clearOnline, saveOnline } from '../storage/persist';
import type { SavedOnline } from '../storage/persist';
import { GameScreen } from './GameScreen';

export interface OnlineInit {
  role: Role;
  code: string;
  myName: string;
  // Partida nova de host:
  config?: GameConfig;
  hostSymbol?: Player;
  // Retomada (qualquer papel):
  saved?: SavedOnline;
}

interface OnlineGameProps {
  msgs: Messages;
  init: OnlineInit;
  onExit: () => void;
}

type Stage = 'connecting' | 'waiting' | 'playing';

export function OnlineGame({ msgs, init, onExit }: OnlineGameProps) {
  const [code, setCode] = useState(init.code);
  const [stage, setStage] = useState<Stage>('connecting');
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [error, setError] = useState<TransportError | null>(null);
  const [undoAsk, setUndoAsk] = useState<number | null>(null);
  const [undoDenied, setUndoDenied] = useState(false);
  const [undoSent, setUndoSent] = useState(false);
  const [rematchAsk, setRematchAsk] = useState(false);
  const [rematchSent, setRematchSent] = useState(false);

  const sessionRef = useRef<P2PSession | null>(null);
  const savedRef = useRef<SavedOnline | null>(init.saved ?? null);
  const retriesRef = useRef(0);

  const connect = useCallback(
    (roomCode: string) => {
      setError(null);
      setStage(init.role === 'host' ? 'waiting' : 'connecting');
      connectTransport(init.role, roomCode, {
        onOpen: (transport) => {
          const saved = savedRef.current;
          sessionRef.current = new P2PSession(
            transport,
            saved
              ? { role: init.role, myName: init.myName, saved }
              : {
                  role: init.role,
                  myName: init.myName,
                  config: init.config,
                  hostSymbol: init.hostSymbol,
                },
            {
              onChange: (snap) => {
                setSnapshot(snap);
                if (snap.phase === 'playing') setStage('playing');
                // Toda mudança de estado real limpa avisos transitórios.
                setUndoSent(false);
                if (snap.state.moves.length === 0 && snap.state.result === null) {
                  setRematchAsk(false);
                  setRematchSent(false);
                }
                savedRef.current = {
                  code: roomCode,
                  role: init.role,
                  myName: init.myName,
                  config: snap.state.config,
                  hostSymbol: snap.hostSymbol,
                  moves: snap.state.moves,
                  score: snap.score,
                  names: snap.names,
                };
                if (snap.phase === 'peer-left' || snap.phase === 'version-mismatch') {
                  clearOnline(roomCode, init.role);
                } else {
                  saveOnline(savedRef.current);
                }
              },
              onUndoRequested: (toSeq) => setUndoAsk(toSeq),
              onUndoDenied: () => {
                setUndoSent(false);
                setUndoDenied(true);
              },
              onRematchProposed: () => setRematchAsk(true),
            },
          );
        },
        onError: (err) => {
          // Código em uso ao criar: gera outro e tenta de novo (até 3 vezes).
          if (err.kind === 'codigo-em-uso' && init.role === 'host' && retriesRef.current < 3) {
            retriesRef.current += 1;
            const fresh = generateRoomCode();
            setCode(fresh);
            connect(fresh);
            return;
          }
          setError(err);
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [init.role, init.myName],
  );

  useEffect(() => {
    connect(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const session = sessionRef.current;
  const disconnected =
    snapshot !== null && snapshot.phase === 'closed' && snapshot.state.result === null;

  // Queda no meio da partida: tenta reconectar sozinho a cada 4 segundos.
  useEffect(() => {
    if (!disconnected) return;
    const timer = setInterval(() => connect(code), 4000);
    return () => clearInterval(timer);
  }, [disconnected, code, connect]);

  function endMatch() {
    session?.leave();
    clearOnline(code, init.role);
    onExit();
  }

  // --- Telas fora de jogo ---------------------------------------------------

  if (error) {
    const message =
      error.kind === 'sala-nao-encontrada' ? msgs.errRoomNotFound : msgs.errBroker;
    return (
      <section className="card online-status" data-testid="online-error">
        <p>{message}</p>
        <div className="controls">
          <button type="button" className="primary" onClick={() => connect(code)}>
            {msgs.retry}
          </button>
          <button type="button" onClick={endMatch}>
            {msgs.back}
          </button>
        </div>
      </section>
    );
  }

  if (snapshot === null) {
    return (
      <section className="card online-status" data-testid="online-waiting">
        {init.role === 'host' && (
          <>
            <h2>{msgs.roomCode}</h2>
            <p className="room-code" data-testid="room-code">
              {code}
            </p>
            <p className="mode-tag">{msgs.roomCodeHint}</p>
          </>
        )}
        <p>{stage === 'waiting' ? msgs.waitingGuest : msgs.connecting}</p>
        <button type="button" onClick={endMatch}>
          {msgs.back}
        </button>
      </section>
    );
  }

  if (snapshot.phase === 'peer-left' || snapshot.phase === 'version-mismatch') {
    return (
      <section className="card online-status" data-testid="online-ended">
        <p>{snapshot.phase === 'peer-left' ? msgs.peerLeft : msgs.versionMismatch}</p>
        <button type="button" className="primary" onClick={endMatch}>
          {msgs.back}
        </button>
      </section>
    );
  }

  // --- Partida --------------------------------------------------------------

  const mySymbol = init.role === 'host' ? snapshot.hostSymbol : snapshot.hostSymbol === 'X' ? 'O' : 'X';
  const displayNames: [string, string] = [
    snapshot.names[0] + (init.role === 'host' ? ` (${msgs.you})` : ''),
    snapshot.names[1] + (init.role === 'guest' ? ` (${msgs.you})` : ''),
  ];

  function handleMove(path: Path) {
    setUndoDenied(false);
    session?.playMove(path);
  }

  return (
    <>
      {disconnected && (
        <div className="card online-banner" data-testid="online-reconnect">
          <p>{msgs.waitingReconnect}</p>
          <div className="controls">
            <button type="button" className="primary" onClick={() => connect(code)}>
              {msgs.reconnect}
            </button>
            <button type="button" onClick={endMatch} data-testid="end-match">
              {msgs.endMatch}
            </button>
          </div>
        </div>
      )}

      <GameScreen
        msgs={msgs}
        state={snapshot.state}
        playerNames={displayNames}
        player1Symbol={snapshot.hostSymbol}
        score={snapshot.score}
        onMove={handleMove}
        onUndo={() => {
          if (snapshot.state.moves.some((m) => m.player === mySymbol)) {
            setUndoSent(true);
            session?.requestUndo();
          }
        }}
        onRematch={() => {
          setRematchSent(true);
          session?.proposeRematch();
        }}
        onChangeSettings={endMatch}
      />

      <div className="online-footer controls">
        <span className="mode-tag">
          {msgs.roomCode}: <strong data-testid="room-code">{code}</strong>
        </span>
        <button type="button" onClick={endMatch} data-testid="end-match">
          {msgs.endMatch}
        </button>
      </div>

      {undoSent && <p className="toast" data-testid="undo-sent">{msgs.undoSent}</p>}
      {undoDenied && <p className="toast" data-testid="undo-denied">{msgs.undoDeniedMsg}</p>}
      {rematchSent && snapshot.state.result !== null && (
        <p className="toast">{msgs.rematchSent}</p>
      )}

      {undoAsk !== null && (
        <div className="card online-banner" data-testid="undo-dialog">
          <p>{msgs.undoAsk}</p>
          <div className="controls">
            <button
              type="button"
              className="primary"
              data-testid="undo-accept"
              onClick={() => {
                session?.respondUndo(undoAsk, true);
                setUndoAsk(null);
              }}
            >
              {msgs.acceptBtn}
            </button>
            <button
              type="button"
              data-testid="undo-reject"
              onClick={() => {
                session?.respondUndo(undoAsk, false);
                setUndoAsk(null);
              }}
            >
              {msgs.rejectBtn}
            </button>
          </div>
        </div>
      )}

      {rematchAsk && (
        <div className="card online-banner" data-testid="rematch-dialog">
          <p>{msgs.rematchAsk}</p>
          <div className="controls">
            <button
              type="button"
              className="primary"
              data-testid="rematch-accept"
              onClick={() => {
                session?.acceptRematch();
                setRematchAsk(false);
                setRematchSent(false);
              }}
            >
              {msgs.acceptBtn}
            </button>
            <button type="button" onClick={() => setRematchAsk(false)}>
              {msgs.rejectBtn}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
