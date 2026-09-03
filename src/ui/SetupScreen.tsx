import { useState } from 'react';
import type { Difficulty } from '../bot/bot';
import type { GameConfig, Player, Tiebreak } from '../engine';
import type { Messages } from '../i18n';
import type { MatchMode } from '../storage/persist';

export interface MatchSetup {
  config: GameConfig;
  playerNames: [string, string];
  player1Symbol: Player;
  mode: MatchMode;
}

interface SetupScreenProps {
  msgs: Messages;
  initial: MatchSetup;
  onStart: (setup: MatchSetup) => void;
}

// Tela de configuração da partida (REQ-STT-03, RN-STT-04..06).
export function SetupScreen({ msgs, initial, onStart }: SetupScreenProps) {
  const [name1, setName1] = useState(initial.playerNames[0]);
  const [name2, setName2] = useState(initial.playerNames[1]);
  const [symbol1, setSymbol1] = useState<Player>(initial.player1Symbol);
  const [starter, setStarter] = useState<1 | 2>(
    initial.config.startingPlayer === initial.player1Symbol ? 1 : 2,
  );
  const [clearVariant, setClearVariant] = useState(initial.config.clearVariant);
  const [tiebreak, setTiebreak] = useState<Tiebreak>(initial.config.tiebreak);
  const [modeType, setModeType] = useState<'local' | 'bot'>(initial.mode.type);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initial.mode.type === 'bot' ? initial.mode.difficulty : 'medium',
  );

  const symbol2: Player = symbol1 === 'X' ? 'O' : 'X';
  const player2Label =
    modeType === 'bot' ? `${msgs.botName}` : msgs.player2;

  function start() {
    onStart({
      config: {
        depth: 2,
        clearVariant,
        tiebreak,
        startingPlayer: starter === 1 ? symbol1 : symbol2,
      },
      playerNames: [name1.trim(), modeType === 'bot' ? '' : name2.trim()],
      player1Symbol: symbol1,
      mode:
        modeType === 'bot'
          ? { type: 'bot', difficulty, humanSymbol: symbol1 }
          : { type: 'local' },
    });
  }

  return (
    <section className="setup card">
      <h2>{msgs.newGame}</h2>

      <div className="field-row">
        <label>
          {msgs.mode}
          <select
            value={modeType}
            onChange={(e) => setModeType(e.target.value as 'local' | 'bot')}
            data-testid="mode"
          >
            <option value="local">{msgs.localMode}</option>
            <option value="bot">{msgs.botMode}</option>
          </select>
        </label>
        {modeType === 'bot' && (
          <label>
            {msgs.difficulty}
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              data-testid="difficulty"
            >
              <option value="easy">{msgs.diffEasy}</option>
              <option value="medium">{msgs.diffMedium}</option>
              <option value="hard">{msgs.diffHard}</option>
            </select>
          </label>
        )}
      </div>

      <div className="field-row">
        <label>
          {msgs.player1} ({symbol1})
          <input
            value={name1}
            placeholder={msgs.playerNamePlaceholder}
            onChange={(e) => setName1(e.target.value)}
            data-testid="name-1"
          />
        </label>
        {modeType === 'local' && (
          <label>
            {msgs.player2} ({symbol2})
            <input
              value={name2}
              placeholder={msgs.playerNamePlaceholder}
              onChange={(e) => setName2(e.target.value)}
              data-testid="name-2"
            />
          </label>
        )}
      </div>

      <div className="field-row">
        <label>
          {msgs.symbolOfPlayer1}
          <select
            value={symbol1}
            onChange={(e) => setSymbol1(e.target.value as Player)}
            data-testid="symbol-1"
          >
            <option value="X">X</option>
            <option value="O">O</option>
          </select>
        </label>
        <label>
          {msgs.whoStarts}
          <select
            value={starter}
            onChange={(e) => setStarter(Number(e.target.value) as 1 | 2)}
            data-testid="starter"
          >
            <option value={1}>{name1.trim() || msgs.player1}</option>
            <option value={2}>
              {modeType === 'bot' ? player2Label : name2.trim() || msgs.player2}
            </option>
          </select>
        </label>
      </div>

      <h3>{msgs.rules}</h3>
      <label className="check">
        <input
          type="checkbox"
          checked={clearVariant}
          onChange={(e) => setClearVariant(e.target.checked)}
          data-testid="clear-variant"
        />
        {msgs.clearVariant}
        <small>{msgs.clearVariantHint}</small>
      </label>
      <label>
        {msgs.tiebreak}
        <select
          value={tiebreak}
          onChange={(e) => setTiebreak(e.target.value as Tiebreak)}
          data-testid="tiebreak"
        >
          <option value="majority">{msgs.tiebreakMajority}</option>
          <option value="neutral">{msgs.tiebreakNeutral}</option>
          <option value="both">{msgs.tiebreakBoth}</option>
        </select>
      </label>

      <button type="button" className="primary" onClick={start} data-testid="start">
        {msgs.start}
      </button>
    </section>
  );
}
