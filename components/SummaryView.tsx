import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { calculateAccuracy, mistakesFrom } from '../core/game';
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
  history,
  maxStreak,
  allWords,
  onRestartSession,
  onGoHome,
}) => {
  const lastMistakes = mistakesFrom(history);
  const accuracy = calculateAccuracy(history);

  let accuracyColor = 'text-slate-400 dark:text-slate-500';
  let rankBadge = { label: 'No Words Played', icon: '🐝', tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
  if (history.length > 0) {
    if (accuracy < 60) {
      accuracyColor = 'text-red-500 dark:text-red-400';
      rankBadge = { label: 'Keep Buzzing', icon: '🌱', tone: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' };
    } else if (accuracy < 80) {
      accuracyColor = 'text-orange-500 dark:text-orange-400';
      rankBadge = { label: 'Rising Bee', icon: '🌼', tone: 'bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/20' };
    } else if (accuracy < 90) {
      accuracyColor = 'text-yellow-500 dark:text-yellow-400';
      rankBadge = { label: 'Busy Bee', icon: '🐝', tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' };
    } else if (accuracy < 100) {
      accuracyColor = 'text-green-500 dark:text-green-400';
      rankBadge = { label: 'Honey Master', icon: '🍯', tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' };
    } else {
      accuracyColor = 'text-emerald-500 dark:text-emerald-400';
      rankBadge = { label: 'Queen Bee Perfect!', icon: '👑', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30 shadow-sm shadow-amber-500/10' };
    }
  }

  useEffect(() => {
    if (accuracy > 80) {
      void confetti({
        disableForReducedMotion: true,
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
    return () => {
      confetti.reset();
    };
  }, [accuracy]);

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-slate-900/10 dark:shadow-black/40 border border-slate-200/80 dark:border-slate-700/80 text-center animate-slide-up transition-colors duration-300">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 mb-3 animate-float">
        <i className="fas fa-trophy text-2xl"></i>
      </div>

      <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
        Session Complete! 🏆
      </h2>

      <div className="mb-6">
        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border animate-pop ${rankBadge.tone}`}>
          <span>{rankBadge.icon}</span>
          <span>{rankBadge.label}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50/90 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 border-b-4 shadow-sm">
          <div className={`text-3xl font-black tracking-tight ${accuracyColor}`}>{accuracy}%</div>
          <div className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
            Accuracy
          </div>
        </div>
        <div className="bg-slate-50/90 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 border-b-4 shadow-sm">
          <div className="text-3xl font-black tracking-tight text-amber-500 dark:text-amber-400">
            <i className="fas fa-fire-alt text-xl mr-1"></i>
            {maxStreak}
          </div>
          <div className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
            Best Streak
          </div>
        </div>
      </div>

      <p className="mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
        Assisted answers count for half credit and return for practice; streaks require no hint.
      </p>
      <div className="bg-slate-50/80 dark:bg-slate-900/40 rounded-2xl overflow-hidden mb-7 border border-slate-200/80 dark:border-slate-700/60">
        <div
          aria-hidden="true"
          className="flex items-center justify-between bg-slate-200/90 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3.5 py-3 text-xs font-extrabold uppercase tracking-wider border-b border-slate-300/80 dark:border-slate-700"
        >
          <span>Word</span>
          <span>Result</span>
        </div>
        <div className="max-h-56 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sr-only">
              <tr>
                <th>Word</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-6 text-center text-slate-400 italic">
                  No words attempted in this session.
                </td>
              </tr>
            ) : (
              history.map((h, i) => (
                <tr
                  key={i}
                  style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}
                  className="border-b border-slate-200/70 dark:border-slate-700/40 last:border-0 hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors animate-pop"
                >
                  <td className="p-3.5 font-bold text-slate-700 dark:text-slate-200">
                    {h.word}
                  </td>
                  <td className="p-3.5 text-right">
                    {h.status === 'assisted' ? (
                      <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-extrabold">
                        ASSISTED
                      </span>
                    ) : h.correct ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-extrabold">
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-extrabold">
                        MISS
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            onClick={() => onRestartSession(allWords)}
            className="flex-1 py-3.5 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl font-extrabold uppercase tracking-wider border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 shadow-lg shadow-indigo-500/25 transition-all"
          >
            <i className="fas fa-redo mr-2"></i> Repeat
          </button>

          {lastMistakes.length > 0 && (
            <button
              onClick={() => onRestartSession(lastMistakes)}
              className="flex-1 py-3.5 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl font-extrabold uppercase tracking-wider border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 shadow-lg shadow-amber-500/25 transition-all"
            >
              <i className="fas fa-exclamation-circle mr-2"></i> Mistakes
            </button>
          )}
        </div>

        <button
          onClick={onGoHome}
          className="w-full py-3.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-extrabold uppercase tracking-wider border border-slate-300 dark:border-slate-600 border-b-4 border-b-slate-300 dark:border-b-slate-900 active:border-b-0 active:translate-y-1 transition-all"
        >
          <i className="fas fa-home mr-2"></i> Home
        </button>
      </div>
    </div>
  );
};