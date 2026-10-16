import React, { useEffect, useState } from 'react';
import { FeedbackStatus } from '../types';

interface ProgressBarProps {
  total: number;
  current: number;
  status: FeedbackStatus;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ total, current, status }) => {
  const [flashColor, setFlashColor] = useState<'none' | 'green' | 'amber' | 'red'>('none');

  const percentage = Math.min(100, Math.max(0, total > 0 ? (current / total) * 100 : 0));

  useEffect(() => {
    if (status === 'correct') {
      setFlashColor('green');
      const t = setTimeout(() => setFlashColor('none'), 500);
      return () => clearTimeout(t);
    } else if (status === 'assisted') {
      setFlashColor('amber');
      const t = setTimeout(() => setFlashColor('none'), 500);
      return () => clearTimeout(t);
    } else if (status === 'incorrect' || status === 'timeout') {
      setFlashColor('red');
      const t = setTimeout(() => setFlashColor('none'), 500);
      return () => clearTimeout(t);
    } else {
      setFlashColor('none');
    }
  }, [status, current]);

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <div className="flex justify-between items-center text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        <span className="flex items-center gap-1.5">
          <i className="fas fa-bolt text-amber-500"></i> Progress
        </span>
        <span className="bg-slate-100 dark:bg-slate-700/70 px-2.5 py-0.5 rounded-full text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600/60">
          {current} / {total}
        </span>
      </div>
      <div
        className={`h-4 bg-slate-200/90 dark:bg-slate-900/90 rounded-full overflow-hidden relative shadow-inner border border-slate-300/70 dark:border-slate-700/80 transition-transform duration-300 ${
          flashColor === 'green'
            ? 'scale-[1.02] ring-2 ring-emerald-400/50'
            : flashColor === 'amber'
              ? 'scale-[1.01] ring-2 ring-amber-400/50'
              : flashColor === 'red'
                ? 'animate-shake ring-2 ring-red-400/50'
                : ''
        }`}
      >
        <div
          className={`absolute inset-0 transition-colors duration-300 ${
            flashColor === 'green'
              ? 'bg-emerald-500/20'
              : flashColor === 'amber'
                ? 'bg-amber-500/20'
                : flashColor === 'red'
                  ? 'bg-red-500/20'
                  : 'bg-transparent'
          }`}
        />
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden ${
            flashColor === 'green'
              ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
              : flashColor === 'amber'
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.7)]'
                : flashColor === 'red'
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                  : 'bg-gradient-to-r from-amber-400 via-indigo-500 to-violet-600'
          }`}
          style={{ width: `${percentage}%` }}
        >
          {/* Top glossy reflection */}
          <div className="absolute top-0.5 left-1.5 right-1.5 h-1.5 rounded-full bg-white/35 pointer-events-none" />
          {/* Animated shimmer sweep */}
          {percentage > 0 && (
            <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer pointer-events-none" />
          )}
        </div>
      </div>
    </div>
  );
};