import React, { useState } from 'react';
import { AppConfig, StoredSession } from '../types';
import { AudioService } from '../services/audioService';

interface SetupViewProps {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  onStart: (words: string[]) => void;
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

  const handleStart = () => {
    AudioService.resume();
    const cleanedWords = rawWords
      .split(/[\n,]+/)
      .map(w => w.trim().replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜçÇ\-]/g, ''))
      .filter(w => w.length > 0);

    if (cleanedWords.length === 0) {
      alert('Please enter at least one valid word.');
      return;
    }
    if (cleanedWords.length === 0) {
      alert('Please enter at least one valid word.');
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
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Word List</label>
          <textarea
            value={rawWords}
            onChange={(e) => setRawWords(e.target.value)}
            placeholder="Paste words here...&#10;Example: coffee, café, mañana, château"
            className="w-full h-24 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-indigo-500 rounded-xl p-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors resize-none"
          />
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

        <div className="flex gap-4 p-4 bg-slate-100 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700/50 transition-colors">
          <label className="flex items-center gap-3 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={config.timerEnabled}
              onChange={(e) => setConfig({ ...config, timerEnabled: e.target.checked })}
              className="w-5 h-5 rounded bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-indigo-500 focus:ring-indigo-500 transition-colors"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Timer (30s)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={config.loopEnabled}
              onChange={(e) => setConfig({ ...config, loopEnabled: e.target.checked })}
              className="w-5 h-5 rounded bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-indigo-500 focus:ring-indigo-500 transition-colors"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Infinite Loop</span>
          </label>
        </div>

        <button
          onClick={handleStart}
          className="w-full mt-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg uppercase tracking-wider shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
        >
          Start Session
        </button>
      </div>
    </div>
  );
};