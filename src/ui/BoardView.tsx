import { isBoard, resultOf } from '../engine';
import type { Board, Path, Tiebreak } from '../engine';

interface BoardViewProps {
  board: Board;
  path: Path;
  allowed: ReadonlySet<string>;
  lastMove: Path | null;
  tiebreak: Tiebreak;
  onCellClick: (path: Path) => void;
}

const pathKey = (path: Path) => path.join('.');

// Componente recursivo do tabuleiro (REQ-STT-01 na UI, REQ-STT-12 no destaque).
export function BoardView(props: BoardViewProps) {
  const { board, path, allowed, lastMove, tiebreak, onCellClick } = props;
  const result = resultOf(board, tiebreak);
  const playable = board.depth === 1 && allowed.has(pathKey(path));

  const className = [
    board.depth === 1 ? 'mini-board' : 'macro-board',
    result !== null ? 'decided' : '',
    playable ? 'playable' : '',
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
      {result !== null && (
        <span className={`board-result mark-${result}`} aria-hidden>
          {result === 'draw' ? '=' : result}
        </span>
      )}
    </div>
  );
}
