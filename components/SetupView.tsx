import React, { useState, useRef } from 'react';
import { AppConfig, StoredSession } from '../types';
import { AudioService } from '../services/audioService';
import { EASY_WORDS, HARD_WORDS } from '../services/wordList';

interface SetupViewProps {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  onStart: (words: string[], skipHistory?: boolean) => void;
  onResume: () => void;
  hasSavedState: boolean;
  recentSessions: StoredSession[];
  lastMistakes: string[];
}

const VOICE_OPTIONS = [
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel (US Fem)' },
  { id: '29vD33N1CtxCmqQRPOHJ', label: 'Drew (US Masc)' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli (US Fem)' },
  { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni (US Masc)' },
  { id: 'browser', label: '🤖 Robot (Offline)' },
];

const WORD_ORDER_OPTIONS = [
  { id: 'random', label: 'Random (Default)' },
  { id: 'alphabetical', label: 'Alphabetical (A-Z)' },
  { id: 'inverted', label: 'Inverted (Reverse)' },
  { id: 'normal', label: 'Normal (As Entered)' },
];

export const SetupView: React.FC<SetupViewProps> = ({
  config, setConfig, onStart, onResume, hasSavedState, recentSessions, lastMistakes
}) => {
  const [rawWords, setRawWords] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleWordChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setRawWords(newValue);
    setIsTyping(true);
    if (error) setError(null);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2500);
  };

  const handleStart = () => {
    AudioService.resume();
    const cleanedWords = rawWords
      .split(/[\n,]+/)
      .map(w => w.trim().replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜçÇ\-]/g, ''))
      .filter(w => w.length > 0);

    if (cleanedWords.length === 0) {
      setError('Please enter at least one valid word.');
      return;
    }

    let finalWords = [...cleanedWords];

    if (config.wordOrder === 'random') {
      // Fisher-Yates Shuffle
      for (let i = finalWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalWords[i], finalWords[j]] = [finalWords[j], finalWords[i]];
      }
    } else if (config.wordOrder === 'alphabetical') {
      finalWords.sort((a, b) => a.localeCompare(b));
    } else if (config.wordOrder === 'inverted') {
      finalWords.reverse();
    }
    // 'normal' does nothing, keeps input order

    onStart(finalWords);
  };

  const loadSession = (words: string[]) => {
    AudioService.resume();
    onStart(words);
  };

  const handleLuckyStart = () => {
    AudioService.resume();

    // Shuffle Easy Words
    const shuffledEasy = [...EASY_WORDS];
    for (let i = shuffledEasy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledEasy[i], shuffledEasy[j]] = [shuffledEasy[j], shuffledEasy[i]];
    }

    // Shuffle Hard Words
    const shuffledHard = [...HARD_WORDS];
    for (let i = shuffledHard.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledHard[i], shuffledHard[j]] = [shuffledHard[j], shuffledHard[i]];
    }

    // Select 9 Easy + 1 Hard
    const selected = [...shuffledEasy.slice(0, 9), shuffledHard[0]];

    // Shuffle the final selection so the hard word isn't always last
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
    }

    onStart(selected, true);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-up transition-colors duration-300">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
          Spelling Bee
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Master Your Spelling Skills</p>
      </div>

      {/* Active Session Actions */}
      {(hasSavedState || lastMistakes.length > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-3 animate-fade-in">
          {hasSavedState && (
            <button
              onClick={onResume}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-history"></i> Resume Previous Session
            </button>
          )}
          {lastMistakes.length > 0 && (
            <button
              onClick={() => loadSession(lastMistakes)}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-lg shadow-amber-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-exclamation-circle"></i> Practice Mistakes ({lastMistakes.length})
            </button>
          )}
          <div className="flex items-center my-2 text-slate-500 text-sm">
            <div className="flex-grow h-px bg-slate-300 dark:bg-slate-700"></div>
            <span className="px-3">OR START NEW</span>
            <div className="flex-grow h-px bg-slate-300 dark:bg-slate-700"></div>
          </div>
        </div>
      )}

      <div className="space-y-4">

        <button
          onClick={handleLuckyStart}
          className="w-full py-4 mb-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 animate-glow-green transform hover:-translate-y-1"
        >
          <i className="fas fa-dice text-2xl"></i>
          <span>I'm Feeling Lucky</span>
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">10 Words</span>
        </button>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Word List</label>
          <textarea
            value={rawWords}
            onChange={handleWordChange}
            placeholder="Paste words here...&#10;Example: coffee, café, mañana, château"
            className={`w-full h-24 bg-slate-100 dark:bg-slate-700 border-2 ${error ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-indigo-500'} rounded-xl p-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors resize-none`}
          />
          {error && (
            <p className="mt-2 text-sm text-red-500 font-medium animate-pulse">
              <i className="fas fa-exclamation-circle mr-1"></i> {error}
            </p>
          )}
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recentSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => loadSession(session.words)}
                className="flex-shrink-0 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                title={session.words.join(', ')}
              >
                <i className="fas fa-clock mr-1"></i> {session.label} ({new Date(session.date).toLocaleDateString()})
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">ElevenLabs Key</label>
            <input
              type="password"
              value={config.elevenLabsKey}
              onChange={(e) => setConfig({ ...config, elevenLabsKey: e.target.value })}
              placeholder="Optional sk-..."
              className="w-full bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-indigo-500 rounded-xl p-3 text-slate-900 dark:text-white outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Voice Model</label>
            <select
              value={config.voiceId}
              onChange={(e) => setConfig({ ...config, voiceId: e.target.value })}
              className="w-full bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-indigo-500 rounded-xl p-3 text-slate-900 dark:text-white outline-none appearance-none transition-colors"
            >
              {VOICE_OPTIONS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Word Order</label>
            <select
              value={config.wordOrder || 'random'}
              onChange={(e) => setConfig({ ...config, wordOrder: e.target.value as any })}
              className="w-full bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-indigo-500 rounded-xl p-3 text-slate-900 dark:text-white outline-none appearance-none transition-colors"
            >
              {WORD_ORDER_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Timer Toggle & Config */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setConfig({ ...config, timerEnabled: !config.timerEnabled })}>
              <div className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${config.timerEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ${config.timerEnabled ? 'translate-x-6' : ''}`}></div>
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-200">Timer</span>
            </div>

            {config.timerEnabled && (
              <div className="flex items-center gap-2 animate-fade-in">
                <button
                  onClick={() => setConfig({ ...config, timerDuration: Math.max(5, (config.timerDuration || 30) - 5) })}
                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 rounded-lg shadow-sm text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-500 transition-colors font-bold active:scale-95"
                >
                  <i className="fas fa-minus text-xs"></i>
                </button>
                <div className="relative w-16">
                  <input
                    type="number"
                    value={config.timerDuration || 30}
                    onChange={(e) => setConfig({ ...config, timerDuration: parseInt(e.target.value) || 30 })}
                    className="w-full text-center bg-transparent font-bold text-slate-800 dark:text-white outline-none"
                  />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">s</span>
                </div>
                <button
                  onClick={() => setConfig({ ...config, timerDuration: Math.min(300, (config.timerDuration || 30) + 5) })}
                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 rounded-lg shadow-sm text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-500 transition-colors font-bold active:scale-95"
                >
                  <i className="fas fa-plus text-xs"></i>
                </button>
              </div>
            )}
          </div>

          {/* Loop Toggle */}
          <div
            className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md cursor-pointer"
            onClick={() => setConfig({ ...config, loopEnabled: !config.loopEnabled })}
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${config.loopEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ${config.loopEnabled ? 'translate-x-6' : ''}`}></div>
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-200">Infinite Loop</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          className={`w-full mt-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg uppercase tracking-wider shadow-lg shadow-indigo-900/20 transition-all active:scale-95 ${rawWords.trim().length > 0 && !isTyping ? 'animate-glow-indigo' : ''
            }`}
        >
          Start Session
        </button>
      </div>
    </div>
  );
};