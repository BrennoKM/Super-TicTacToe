import { isBoard, resultOf, winningLines } from '../engine';
import type { Board, Path, Tiebreak } from '../engine';

interface BoardViewProps {
  board: Board;
  path: Path;
  allowed: ReadonlySet<string>;
  lastMove: Path | null;
  tiebreak: Tiebreak;
  onCellClick: (path: Path) => void;
  // RN-RISCO-06: navegar o replay jogada a jogada mostra o risco pronto,
  // sem redesenhar a animação a cada passo.
  animateStrikes?: boolean;
}

const pathKey = (path: Path) => path.join('.');

// Extrapolação das pontas, como quem risca no papel (REQ-RISCO-03).
const OVERSHOOT = 0.22;

// Risco sobre as linhas fechadas, em coordenadas de 3 por 3 (REQ-RISCO-01, 02).
function StrikeLayer({
  lines,
  mark,
  animate,
}: {
  lines: number[][];
  mark: 'X' | 'O';
  animate: boolean;
}) {
  return (
    <svg
      className={`strike-layer${animate ? ' animate' : ''}`}
      viewBox="0 0 3 3"
      preserveAspectRatio="none"
      aria-hidden
    >
      {lines.map((line) => {
        const [first, last] = [line[0], line[line.length - 1]];
        const p = (index: number) => ({ x: (index % 3) + 0.5, y: Math.floor(index / 3) + 0.5 });
        const a = p(first);
        const b = p(last);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const x1 = a.x - (dx / len) * OVERSHOOT;
        const y1 = a.y - (dy / len) * OVERSHOOT;
        const x2 = b.x + (dx / len) * OVERSHOOT;
        const y2 = b.y + (dy / len) * OVERSHOOT;
        // Barriga leve e determinística (mesma linha, mesma curva), pra o traço
        // não sair de régua. Perpendicular à direção do risco.
        const bulge = ((first * 7 + last * 13) % 5) / 100 - 0.02;
        const cx = (x1 + x2) / 2 - (dy / len) * bulge;
        const cy = (y1 + y2) / 2 + (dx / len) * bulge;
        return (
          <path
            key={line.join('')}
            className={`strike mark-${mark}`}
            pathLength={1}
            d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
          />
        );
      })}
    </svg>
  );
}

// Componente recursivo do tabuleiro (REQ-STT-01 na UI, REQ-STT-12 no destaque).
export function BoardView(props: BoardViewProps) {
  const { board, path, allowed, lastMove, tiebreak, onCellClick, animateStrikes = true } = props;
  const result = resultOf(board, tiebreak);
  const playable = board.depth === 1 && allowed.has(pathKey(path));
  const strikes = result === 'X' || result === 'O' ? winningLines(board, tiebreak) : [];

  const className = [
    board.depth === 1 ? 'mini-board' : 'macro-board',
    result !== null ? 'decided' : '',
    playable ? 'playable' : '',
    strikes.length > 0 ? 'struck' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} data-testid={`board-${pathKey(path) || 'root'}`}>
      <div className="board-grid">
        {board.cells.map((cell, index) => {
          const childPath = [...path, index];
          if (isBoard(cell)) {
            return (
              <BoardView
                key={index}
                board={cell}
                path={childPath}
                allowed={allowed}
                lastMove={lastMove}
                tiebreak={tiebreak}
                onCellClick={onCellClick}
                animateStrikes={animateStrikes}
              />
            );
          }
          const isLast =
            lastMove !== null && pathKey(lastMove) === pathKey(childPath);
          return (
            <button
              key={index}
              type="button"
              className={`cell mark-${cell ?? 'empty'}${isLast ? ' last-move' : ''}`}
              data-testid={`cell-${pathKey(childPath)}`}
              disabled={!playable || cell !== null}
              onClick={() => onCellClick(childPath)}
            >
              {cell ?? ''}
            </button>
          );
        })}
      </div>
      {strikes.length > 0 && (
        <StrikeLayer
          lines={strikes}
          mark={result as 'X' | 'O'}
          animate={animateStrikes}
        />
      )}
      {result !== null && (
        <span className={`board-result mark-${result}`} aria-hidden>
          {result === 'draw' ? '=' : result}
        </span>
      )}
    </div>
  );
}
