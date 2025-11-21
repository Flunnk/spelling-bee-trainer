import React, { useEffect } from 'react';
import { WordHistory } from '../types';

interface SummaryViewProps {
  history: WordHistory[];
  maxStreak: number;
  allWords: string[];
  lastMistakes: string[];
  onRestartSession: (words: string[]) => void;
  onGoHome: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  history, maxStreak, allWords, lastMistakes, onRestartSession, onGoHome
}) => {
  const correctCount = history.filter(h => h.correct).length;
  const accuracy = history.length > 0 ? Math.round((correctCount / history.length) * 100) : 0;

  let accuracyColor = 'text-slate-400 dark:text-slate-500';
  if (history.length > 0) {
    if (accuracy < 60) accuracyColor = 'text-red-500 dark:text-red-400';
    else if (accuracy < 80) accuracyColor = 'text-orange-500 dark:text-orange-400';
    else if (accuracy < 90) accuracyColor = 'text-yellow-500 dark:text-yellow-400';
    else accuracyColor = 'text-green-500 dark:text-green-400';
  }

  useEffect(() => {
    if (accuracy > 80 && window.confetti) {
      window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }, [accuracy]);

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 text-center animate-slide-up transition-colors duration-300">
      <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-6">Session Complete! 🏆</h2>

      <div className="flex justify-center gap-8 mb-8">
        <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl w-32">
          <div className={`text-3xl font-bold ${accuracyColor}`}>{accuracy}%</div>
          <div className="text-xs font-bold text-slate-500 uppercase mt-1">Accuracy</div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl w-32">
          <div className="text-3xl font-bold text-amber-500 dark:text-amber-400">{maxStreak}</div>
          <div className="text-xs font-bold text-slate-500 uppercase mt-1">Best Streak</div>
        </div>
      </div>

      <div className="bg-slate-100 dark:bg-slate-900/30 rounded-xl overflow-hidden mb-8 border border-slate-200 dark:border-slate-700/50 max-h-64 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-200 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
            <tr>
              <th className="p-3 font-bold">Word</th>
              <th className="p-3 font-bold text-right">Result</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i} className="border-b border-slate-200 dark:border-slate-700/30 last:border-0">
                <td className="p-3 text-slate-700 dark:text-slate-200">{h.word}</td>
                <td className="p-3 text-right">
                  {h.correct
                    ? <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">OK</span>
                    : <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold">MISS</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            onClick={() => onRestartSession(allWords)}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
          >
            <i className="fas fa-redo mr-2"></i> Repeat
          </button>

          {lastMistakes.length > 0 && (
            <button
              onClick={() => onRestartSession(lastMistakes)}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-amber-900/20 transition-all active:scale-95"
            >
              <i className="fas fa-exclamation-circle mr-2"></i> Mistakes
            </button>
          )}
        </div>

        <button
          onClick={onGoHome}
          className="w-full py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold uppercase tracking-wider shadow-lg transition-all active:scale-95"
        >
          Home
        </button>
      </div>
    </div>
  );
};