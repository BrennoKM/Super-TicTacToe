import { useRef, useState } from 'react';
import type { Language, Messages } from '../i18n';
import { MAX_IMPORT_BYTES, parseImported } from '../replay/exchange';
import { addToLibrary, listLibrary, removeFromLibrary } from '../replay/library';
import type { LibraryEntry } from '../replay/library';
import { downloadEntryJson } from './ReplayScreen';

interface LibraryScreenProps {
  msgs: Messages;
  language: Language;
  onOpenReplay: (entry: LibraryEntry) => void;
  onBack: () => void;
}

// Biblioteca de partidas terminadas (REQ-REPLAY-02, 04, 05).
export function LibraryScreen({ msgs, language, onOpenReplay, onBack }: LibraryScreenProps) {
  const [entries, setEntries] = useState<LibraryEntry[]>(() => listLibrary());
  const [importError, setImportError] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const locale = language === 'pt' ? 'pt-BR' : 'en';

  function resultLabel(entry: LibraryEntry): string {
    if (entry.result === 'draw') return msgs.resultDraw;
    return `${entry.names[entry.result] || entry.result} (${entry.result}) ${msgs.winner}`;
  }

  async function handleImport(file: File) {
    setImportError(false);
    if (file.size > MAX_IMPORT_BYTES) {
      setImportError(true);
      return;
    }
    const parsed = parseImported(await file.text());
    if (parsed === null) {
      setImportError(true);
      return;
    }
    const saved = addToLibrary(parsed);
    setEntries(listLibrary());
    onOpenReplay(saved);
  }

  return (
    <section className="card library" data-testid="library">
      <h2>{msgs.library}</h2>

      <div className="controls">
        <button type="button" data-testid="import-match" onClick={() => fileInput.current?.click()}>
          {msgs.importMatch}
        </button>
        <button type="button" onClick={onBack} data-testid="library-back">
          {msgs.back}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          data-testid="import-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleImport(file);
          }}
        />
      </div>

      {importError && (
        <p className="toast" data-testid="import-error">
          {msgs.invalidFile}
        </p>
      )}

      {entries.length === 0 ? (
        <p data-testid="library-empty">{msgs.emptyLibrary}</p>
      ) : (
        <ul className="library-list">
          {entries.map((entry, index) => (
            <li key={entry.id} data-testid={`library-entry-${index}`}>
              <span className="entry-info">
                {new Date(entry.finishedAt).toLocaleString(locale)} ·{' '}
                <span className="mark-X">{entry.names.X || 'X'}</span> vs{' '}
                <span className="mark-O">{entry.names.O || 'O'}</span> · {resultLabel(entry)}
              </span>
              <span className="controls">
                <button type="button" data-testid={`entry-replay-${index}`} onClick={() => onOpenReplay(entry)}>
                  {msgs.watchReplay}
                </button>
                <button type="button" data-testid={`entry-export-${index}`} onClick={() => downloadEntryJson(entry)}>
                  {msgs.exportMatch}
                </button>
                <button
                  type="button"
                  data-testid={`entry-delete-${index}`}
                  onClick={() => {
                    removeFromLibrary(entry.id);
                    setEntries(listLibrary());
                  }}
                >
                  {msgs.deleteMatch}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
