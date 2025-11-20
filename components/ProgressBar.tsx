import React, { useEffect, useState } from 'react';
import { FeedbackStatus } from '../types';

interface ProgressBarProps {
    total: number;
    current: number;
    status: FeedbackStatus;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ total, current, status }) => {
    const [flashColor, setFlashColor] = useState<'none' | 'green' | 'red'>('none');

    // Calculate percentage
    // Ensure it doesn't exceed 100% or drop below 0%
    const percentage = Math.min(100, Math.max(0, (current / total) * 100));

    useEffect(() => {
        if (status === 'correct') {
            setFlashColor('green');
            const t = setTimeout(() => setFlashColor('none'), 500);
            return () => clearTimeout(t);
        } else if (status === 'incorrect' || status === 'timeout') {
            setFlashColor('red');
            const t = setTimeout(() => setFlashColor('none'), 500);
            return () => clearTimeout(t);
        } else {
            setFlashColor('none');
        }
    }, [status, current]); // Depend on current to trigger on progress change too if needed, but status is main trigger

    return (
        <div className="w-full max-w-md mx-auto mb-6">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <span>Progress</span>
                <span>{current} / {total}</span>
            </div>
            <div className="h-4 bg-slate-700 rounded-full overflow-hidden relative shadow-inner">
                {/* Background Flash Layer */}
                <div
                    className={`absolute inset-0 transition-colors duration-300 ${flashColor === 'green' ? 'bg-green-500/20' :
                            flashColor === 'red' ? 'bg-red-500/20' : 'bg-transparent'
                        }`}
                />

                {/* Progress Fill */}
                <div
                    className={`h-full transition-all duration-500 ease-out relative ${flashColor === 'green' ? 'bg-green-500' :
                            flashColor === 'red' ? 'bg-red-500' :
                                'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                    style={{ width: `${percentage}%` }}
                >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-white/20" />
                </div>
            </div>
        </div>
    );
};
