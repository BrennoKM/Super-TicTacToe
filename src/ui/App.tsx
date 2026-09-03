import { useEffect, useMemo, useState } from 'react';
import { applyMove, createGame, otherPlayer, replay, serialize, undo } from '../engine';
import type { GameState, Path, Player } from '../engine';
import { detectLanguage, messages } from '../i18n';
import type { Language } from '../i18n';
import {
  clearMatch,
  loadMatch,
  loadPreferences,
  saveMatch,
  savePreferences,
} from '../storage/persist';
import type { Preferences, SavedMatch, SessionScore } from '../storage/persist';
import { GameScreen } from './GameScreen';
import { SetupScreen } from './SetupScreen';
import type { MatchSetup } from './SetupScreen';

interface Match {
  state: GameState;
  playerNames: [string, string];
  player1Symbol: Player;
  score: SessionScore;
  counted: boolean; // o resultado desta partida já entrou no placar?
}

const zeroScore: SessionScore = { X: 0, O: 0, draws: 0 };

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function App() {
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());
  const [pendingResume, setPendingResume] = useState<SavedMatch | null>(() => loadMatch());
  const [match, setMatch] = useState<Match | null>(null);

  const language: Language = prefs.language ?? detectLanguage();
  const msgs = messages[language];
  const theme = prefs.theme === 'system' ? systemTheme() : prefs.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
  }, [theme, language]);

  const updatePrefs = (patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  };

  // REQ-STT-14: partida local persiste enquanto estiver em andamento.
  const persistMatch = (m: Match) => {
    if (m.state.result === null) {
      saveMatch({
        game: serialize(m.state),
        playerNames: m.playerNames,
        player1Symbol: m.player1Symbol,
        score: m.score,
      });
    } else {
      clearMatch();
    }
  };

  const setAndPersist = (m: Match) => {
    setMatch(m);
    persistMatch(m);
  };

  function startMatch(setup: MatchSetup) {
    updatePrefs({
      playerNames: setup.playerNames,
      player1Symbol: setup.player1Symbol,
      lastConfig: setup.config,
    });
    setPendingResume(null);
    setAndPersist({
      state: createGame(setup.config),
      playerNames: setup.playerNames,
      player1Symbol: setup.player1Symbol,
      score: match?.score ?? zeroScore,
      counted: false,
    });
  }

  function handleMove(path: Path) {
    if (!match || match.state.result !== null) return;
    let state: GameState;
    try {
      state = applyMove(match.state, path);
    } catch {
      return; // REQ-STT-02: jogada inválida não altera nada
    }
    let { score, counted } = match;
    if (state.result !== null && !counted) {
      score = { ...score };
      if (state.result === 'draw') score.draws += 1;
      else score[state.result] += 1;
      counted = true;
    }
    setAndPersist({ ...match, state, score, counted });
  }

  function handleUndo() {
    if (!match || match.state.moves.length === 0) return;
    // Desfazer após o fim reabre a partida; o placar da partida contada é revertido.
    let { score, counted } = match;
    if (counted && match.state.result !== null) {
      score = { ...score };
      if (match.state.result === 'draw') score.draws -= 1;
      else score[match.state.result] -= 1;
      counted = false;
    }
    setAndPersist({ ...match, state: undo(match.state), score, counted });
  }

  // REQ-STT-08: revanche mantém adversário e regras, alternando quem começa.
  function handleRematch() {
    if (!match) return;
    const config = {
      ...match.state.config,
      startingPlayer: otherPlayer(match.state.config.startingPlayer),
    };
    setAndPersist({
      ...match,
      state: createGame(config),
      counted: false,
    });
  }

  function handleResume() {
    if (!pendingResume) return;
    try {
      const state = replay(pendingResume.game);
      setMatch({
        state,
        playerNames: pendingResume.playerNames,
        player1Symbol: pendingResume.player1Symbol,
        score: pendingResume.score,
        counted: false,
      });
    } catch {
      clearMatch();
    }
    setPendingResume(null);
  }

  function handleDiscard() {
    clearMatch();
    setPendingResume(null);
  }

  const initialSetup: MatchSetup = useMemo(
    () => ({
      config:
        prefs.lastConfig ?? {
          depth: 2,
          clearVariant: false,
          tiebreak: 'majority',
          startingPlayer: prefs.player1Symbol,
        },
      playerNames: prefs.playerNames,
      player1Symbol: prefs.player1Symbol,
    }),
    [prefs],
  );

  return (
    <div className="app">
      <header>
        <h1>{msgs.appTitle}</h1>
        <div className="header-controls">
          <button
            type="button"
            className="ghost"
            onClick={() => updatePrefs({ theme: theme === 'dark' ? 'light' : 'dark' })}
            data-testid="theme-toggle"
            title={msgs.theme}
          >
            {theme === 'dark' ? msgs.themeLight : msgs.themeDark}
          </button>
          <select
            value={language}
            onChange={(e) => updatePrefs({ language: e.target.value as Language })}
            data-testid="language"
            aria-label={msgs.language}
          >
            <option value="pt">PT</option>
            <option value="en">EN</option>
          </select>
        </div>
      </header>

      {pendingResume && (
        <div className="card resume" data-testid="resume-dialog">
          <h2>{msgs.resumeTitle}</h2>
          <p>{msgs.resumeQuestion}</p>
          <div className="controls">
            <button type="button" className="primary" onClick={handleResume} data-testid="resume">
              {msgs.resume}
            </button>
            <button type="button" onClick={handleDiscard} data-testid="discard">
              {msgs.discard}
            </button>
          </div>
        </div>
      )}

      {!pendingResume && match === null && (
        <SetupScreen msgs={msgs} initial={initialSetup} onStart={startMatch} />
      )}

      {!pendingResume && match !== null && (
        <GameScreen
          msgs={msgs}
          state={match.state}
          playerNames={match.playerNames}
          player1Symbol={match.player1Symbol}
          score={match.score}
          onMove={handleMove}
          onUndo={handleUndo}
          onRematch={handleRematch}
          onChangeSettings={() => {
            clearMatch();
            setMatch(null);
          }}
        />
      )}
    </div>
  );
}
