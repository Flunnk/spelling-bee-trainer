import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppConfig, GameState, FeedbackStatus, DictionaryEntry } from '../types';
import { AudioService } from '../services/audioService';
import { fetchDefinition } from '../services/dictionaryService';
import { ProgressBar } from './ProgressBar';

interface GameViewProps {
  gameState: GameState;
  config: AppConfig;
  onUpdateState: (updates: Partial<GameState>) => void;
  onSaveDef: (word: string, def: string) => void;
  onFinish: () => void;
  onExit: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  gameState, config, onUpdateState, onSaveDef, onFinish, onExit
}) => {
  // Local UI State
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<FeedbackStatus>('idle');
  const [timeLeft, setTimeLeft] = useState(30);
  const [hintUsed, setHintUsed] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [dictData, setDictData] = useState<DictionaryEntry | null>(null);
  const [showInfo, setShowInfo] = useState<'def' | 'sent' | null>(null);
  const [turnCount, setTurnCount] = useState(0); // Force effect run on same word

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const feedbackTimeRef = useRef<number>(0); // To prevent accidental double-skips
  const pendingBagRef = useRef<string[] | null>(null); // Fix race condition
  const isTransitioningRef = useRef(false); // Prevent double-submission

  const { currentWord, bag, streak, maxStreak } = gameState;

  // --- Helper: Speak ---
  const speak = useCallback(async (rate: number = 1.0) => {
    if (!currentWord) return;
    setIsLoadingAudio(true);
    await AudioService.speak(currentWord, config.voiceId, config.elevenLabsKey, rate);
    setIsLoadingAudio(false);
  }, [currentWord, config]);

  // --- Initialization & Word Change ---
  useEffect(() => {
    // Initial start if empty
    if (!currentWord && bag.length > 0) {
      const newBag = [...bag];
      const next = newBag.shift()!;
      onUpdateState({ currentWord: next, bag: newBag });
    } else if (!currentWord && bag.length === 0) {
      onFinish();
    }
  }, [currentWord, bag, onUpdateState, onFinish]);

  // When currentWord changes (New Turn)
  useEffect(() => {
    if (!currentWord) return;

    // Reset UI
    setInput('');
    setFeedback('idle');
    setHintUsed(false);
    setTimeLeft(30);
    setShowInfo(null);
    setDictData(null);
    pendingBagRef.current = null; // Clear pending bag
    isTransitioningRef.current = false; // Reset transition lock

    // Auto-focus
    setTimeout(() => inputRef.current?.focus(), 100);

    // Speak with small delay
    const t = setTimeout(() => speak(1.0), 500);

    // Prefetch definition
    fetchDefinition(currentWord).then(setDictData);

    return () => clearTimeout(t);
  }, [currentWord, turnCount, speak]); // Added turnCount dependency

  // --- Timer Logic ---
  useEffect(() => {
    if (!config.timerEnabled || feedback !== 'idle') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleCheck(true); // Timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [config.timerEnabled, feedback]);

  // --- Global Key Listener for Enter (Next) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if feedback is showing (i.e., waiting to go to next)
      // and the key is Enter.
      if (feedback !== 'idle' && e.key === 'Enter') {
        e.preventDefault();

        // Debounce: Prevent activating "Next" instantly after "Check"
        // This avoids one keypress triggering both check and next if events leak
        if (Date.now() - feedbackTimeRef.current < 500) return;

        goToNextWord();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [feedback, bag, config.loopEnabled]);

  // --- Actions ---

  const handleCheck = (isTimeout: boolean = false) => {
    if (feedback !== 'idle') {
      goToNextWord();
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = !isTimeout && input.trim().toLowerCase() === currentWord.toLowerCase();

    // Determine status
    let status: FeedbackStatus = 'incorrect';
    if (isTimeout) status = 'timeout';
    else if (isCorrect && hintUsed) status = 'assisted';
    else if (isCorrect) status = 'correct';

    // Audio Feedback
    AudioService.playEffect(status === 'correct' ? 'correct' : 'wrong');

    // Update Game State logic
    let newStreak = streak;
    let newMax = maxStreak;
    let newBag = [...bag];

    if (status === 'correct') {
      newStreak++;
      if (newStreak > newMax) newMax = newStreak;
    } else {
      newStreak = 0;
      // SRS: Re-insert wrong word 3 spots later (or end of bag)
      // SRS: Re-insert wrong word 3 spots later (or end of bag)
      // Always re-insert wrong word so user must get it right to finish
      const insertIdx = Math.min(newBag.length, 3);
      newBag.splice(insertIdx, 0, currentWord);
    }

    // Store in ref to avoid race condition in goToNextWord
    pendingBagRef.current = newBag;

    onUpdateState({
      streak: newStreak,
      maxStreak: newMax,
      bag: newBag,
      history: [...gameState.history, { word: currentWord, correct: status === 'correct', timestamp: Date.now() }]
    });

    setFeedback(status);
    feedbackTimeRef.current = Date.now();

    // Focus the next button logic automatically
    setTimeout(() => nextBtnRef.current?.focus(), 50);
  };

  const goToNextWord = () => {
    // Prevent double submission
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    // Use pending bag if available (handles race condition where props haven't updated yet)
    const currentBag = pendingBagRef.current ? [...pendingBagRef.current] : [...gameState.bag];

    if (currentBag.length === 0 && !config.loopEnabled) {
      onFinish();
      return;
    }

    if (currentBag.length === 0) {
      if (config.loopEnabled) {
        onFinish();
        return;
      } else {
        onFinish();
        return;
      }
    }

    const next = currentBag.shift()!;

    // Clear pending bag as we are consuming it
    pendingBagRef.current = null;

    setTurnCount(c => c + 1); // Force effect run even if word is same
    onUpdateState({ currentWord: next, bag: currentBag });
  };

  const handleHint = () => {
    if (hintUsed || feedback !== 'idle') return;
    setHintUsed(true);
    onUpdateState({ streak: 0 }); // Reset streak on hint
    inputRef.current?.focus();
  };

  const handleInfo = (type: 'def' | 'sent') => {
    setShowInfo(type);
  };

  const handleEditDef = () => {
    const def = prompt("Enter custom definition/note for: " + currentWord);
    if (def) {
      onSaveDef(currentWord, def);
    }
  };

  // --- Render Helpers ---

  const renderDiff = () => {
    const target = currentWord;
    const attempt = input;
    const maxLen = Math.max(target.length, attempt.length);
    const chars = [];

    for (let i = 0; i < maxLen; i++) {
      const t = target[i];
      const a = attempt[i];

      if (!t) { // User typed extra
        chars.push(<span key={i} className="text-red-500 underline decoration-2 decoration-red-500">{a}</span>);
      } else if (!a) { // Missing
        chars.push(<span key={i} className="text-slate-600">_</span>);
      } else if (a.toLowerCase() === t.toLowerCase()) {
        chars.push(<span key={i} className="text-green-500">{t}</span>);
      } else {
        chars.push(<span key={i} className="text-red-500 underline decoration-2 decoration-red-500">{t}</span>);
      }
    }
    return <div className="text-4xl font-bold tracking-widest break-all">{chars}</div>;
  };

  // Info Content
  let infoContent = <span className="text-slate-400">Loading...</span>;
  if (gameState.customDefs[currentWord]) {
    infoContent = <span><span className="text-sky-400 font-bold text-xs uppercase block mb-1">Custom Note</span>{gameState.customDefs[currentWord]}</span>;
  } else if (dictData) {
    if (showInfo === 'def') {
      const def = dictData.meanings[0]?.definitions[0]?.definition || 'No definition found.';
      const pos = dictData.meanings[0]?.partOfSpeech || 'unknown';
      infoContent = <span><span className="text-sky-400 font-bold text-xs uppercase block mb-1">Definition ({pos})</span>{def}</span>;
    } else if (showInfo === 'sent') {
      const ex = dictData.meanings[0]?.definitions.find(d => d.example)?.example || 'No example available.';
      infoContent = <span><span className="text-sky-400 font-bold text-xs uppercase block mb-1">Example</span>"{ex}"</span>;
    }
  } else if (dictData === null && showInfo) {
    infoContent = <span className="text-slate-400">No info available.</span>;
  }

  // Progress Calculation
  const totalWords = gameState.allWords.length;
  // Completed = Total - (Remaining in Bag + Current Active Word)
  // If currentWord is null (end game), it's 0. If active, it counts as 1 remaining.
  let remaining = bag.length + (currentWord ? 1 : 0);

  // FIX: If the user just got it right, visually count it as done immediately
  if (feedback === 'correct') {
    remaining = Math.max(0, remaining - 1);
  }

  const completed = Math.max(0, totalWords - remaining);

  // Accuracy Calculation
  const totalAttempts = gameState.history.length;
  const correctAttempts = gameState.history.filter(h => h.correct).length;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  let accuracyColor = 'text-slate-400 dark:text-slate-500'; // Default 0% (Gray)

  if (totalAttempts > 0) {
    if (accuracy < 60) accuracyColor = 'text-red-500';
    else if (accuracy < 80) accuracyColor = 'text-orange-500';
    else if (accuracy < 90) accuracyColor = 'text-yellow-500';
    else accuracyColor = 'text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]';
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden transition-colors duration-300">
      {/* Header */}
      <ProgressBar total={totalWords} current={completed} status={feedback} />

      <div className="flex justify-between items-center mb-6 text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">
        <div className={`flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 px-3 py-1 rounded-full ${streak > 0 ? 'text-amber-500 dark:text-amber-400' : ''}`}>
          <i className="fas fa-fire"></i> <span>{streak}</span>
        </div>

        {/* Accuracy Display */}
        <div className={`flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 px-3 py-1 rounded-full transition-all duration-300 ${accuracyColor}`}>
          <i className="fas fa-bullseye"></i> <span>{accuracy}%</span>
        </div>

        <div className={`flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 px-3 py-1 rounded-full transition-opacity duration-300 ${config.timerEnabled ? 'opacity-100' : 'opacity-0'}`}>
          <i className="fas fa-clock"></i> <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Speaker & Timer Ring */}
      <div className="relative w-32 h-32 mx-auto mb-8 flex justify-center items-center">
        {config.timerEnabled && feedback === 'idle' && (
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
            <circle
              cx="64" cy="64" r="60"
              fill="none"
              stroke="#6366f1"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="377"
              strokeDashoffset={377 - (timeLeft / 30) * 377}
              className="transition-[stroke-dashoffset] duration-1000 linear"
            />
          </svg>
        )}

        <button
          onClick={() => speak(1.0)}
          disabled={isLoadingAudio}
          className={`w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-4xl shadow-lg shadow-indigo-500/40 flex items-center justify-center z-10 transition-transform active:scale-95 ${isLoadingAudio ? 'cursor-wait' : 'hover:scale-105'}`}
        >
          {isLoadingAudio ? (
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <i className="fas fa-headphones"></i>
          )}
        </button>
      </div>

      {/* Helpers */}
      <div className="flex justify-center gap-3 mb-6 flex-wrap">
        <button onClick={() => handleInfo('def')} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors"><i className="fas fa-book mr-1"></i> Def</button>
        <button onClick={() => handleInfo('sent')} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors"><i className="fas fa-quote-left mr-1"></i> Sent</button>
        <button onClick={() => speak(0.5)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors"><i className="fas fa-turtle mr-1"></i> Slow</button>
        <button onClick={handleHint} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-amber-500 dark:text-amber-400 px-4 py-2 rounded-lg text-sm font-bold transition-colors"><i className="fas fa-lightbulb mr-1"></i> Hint</button>
      </div>

      {/* Context Info Box */}
      {showInfo && (
        <div className="bg-sky-50 dark:bg-sky-900/20 border-l-4 border-sky-400 p-4 rounded-r-lg mb-6 text-left text-sm relative animate-fade-in text-slate-700 dark:text-slate-200">
          <i className="fas fa-pen absolute top-3 right-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white cursor-pointer text-xs" onClick={handleEditDef} title="Edit Note"></i>
          {infoContent}
        </div>
      )}

      {/* Input / Feedback Area */}
      <div className="min-h-[120px] flex flex-col items-center justify-center mb-4">
        {feedback === 'idle' ? (
          <>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCheck();
                }
              }}
              placeholder="Type word..."
              className="bg-transparent border-b-4 border-slate-300 dark:border-slate-600 focus:border-indigo-500 text-center text-3xl font-bold text-slate-800 dark:text-white w-full py-2 outline-none transition-colors"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {hintUsed && (
              <div className="text-amber-500 font-bold mt-2 animate-pulse">
                {currentWord.charAt(0) + ' _'.repeat(currentWord.length - 1)} ({currentWord.length})
              </div>
            )}
          </>
        ) : (
          <div className="text-center animate-slide-up">
            <div className={`text-xl font-black uppercase tracking-widest mb-2 ${feedback === 'correct' ? 'text-green-400' :
              feedback === 'assisted' ? 'text-amber-400' : 'text-red-400'
              }`}>
              {feedback === 'correct' ? 'Perfect! 🎉' :
                feedback === 'assisted' ? 'Assisted 💡' :
                  feedback === 'timeout' ? 'Time Up ⏰' : 'Mistake ❌'}
            </div>
            {renderDiff()}
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        ref={nextBtnRef}
        onClick={() => feedback === 'idle' ? handleCheck() : goToNextWord()}
        className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest shadow-lg transition-all active:scale-95 mb-4 ${feedback === 'idle'
          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/20'
          : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-white shadow-slate-900/20'
          }`}
      >
        {feedback === 'idle' ? 'Check' : 'Next ➡'}
      </button>

      <div className="text-center">
        <button onClick={onExit} className="text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-wide">
          Save & Exit
        </button>
      </div>
    </div>
  );
};