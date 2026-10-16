import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppConfig, GameState, DictionaryEntry } from '../types';
import { AudioService } from '../services/audioService';
import { fetchDefinition } from '../services/dictionaryService';
import { calculateAccuracy, type GameAction } from '../core/game';
import { alignAttempt } from '../core/diff';
import { ProgressBar } from './ProgressBar';

interface GameViewProps {
  gameState: GameState;
  config: AppConfig;
  dispatch: React.Dispatch<GameAction>;
  onSaveDef: (word: string, def: string) => void;
  onFinish: () => void;
  onExit: () => void;
}

const maskTargetWord = (text: string, word: string, hide: boolean) => {
  const trimmed = word.trim();
  if (!hide || !trimmed) return text;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(
    new RegExp(
      `(?<![\\p{L}\\p{M}])${escaped}(?:s|es|d|ed|ing|er|est|ly)?(?![\\p{L}\\p{M}])`,
      'giu'
    ),
    '_____'
  );
};

export const GameView: React.FC<GameViewProps> = ({
  gameState,
  config,
  dispatch,
  onSaveDef,
  onFinish,
  onExit,
}) => {
  const { currentWord, bag, streak, feedback, hintUsed, turn } = gameState;
  const [input, setInput] = useState(gameState.answer);
  const [timeLeft, setTimeLeft] = useState(config.timerDuration || 30);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [dictData, setDictData] = useState<DictionaryEntry | null>(null);
  const [dictLoading, setDictLoading] = useState(true);
  const [showInfo, setShowInfo] = useState<'def' | 'sent' | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [audioWarning, setAudioWarning] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const audioRequest = useRef(0);
  const autoSpeakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkRef = useRef<(timeout: boolean) => void>(() => {});
  const pausedStateRef = useRef(false);
  const prevTurnFeedbackRef = useRef({ turn, feedback });

  const customNote =
    currentWord && Object.hasOwn(gameState.customDefs, currentWord)
      ? gameState.customDefs[currentWord]
      : '';

  const focusInputIfIdle = () => {
    if (editingNote) return;
    if (feedback === 'idle') {
      inputRef.current?.focus();
    } else {
      nextBtnRef.current?.focus();
    }
  };

  const speak = useCallback(
    async (rate = 1) => {
      if (!currentWord) return;
      if (autoSpeakTimerRef.current) {
        clearTimeout(autoSpeakTimerRef.current);
        autoSpeakTimerRef.current = null;
      }
      const request = ++audioRequest.current;
      setIsLoadingAudio(true);
      const message = await AudioService.speak(
        currentWord,
        config.voiceId,
        config.elevenLabsKey,
        rate,
        config.language
      );
      if (request === audioRequest.current) {
        setAudioWarning(message || '');
        setIsLoadingAudio(false);
      }
    },
    [currentWord, config.voiceId, config.elevenLabsKey, config.language]
  );

  useEffect(() => {
    setInput(gameState.answer);
    setTimeLeft(config.timerDuration || 30);
    setShowInfo(null);
    setWarning(null);
    setAudioWarning('');
    setEditingNote(false);
    inputRef.current?.focus();
  }, [turn]);

  useEffect(() => {
    let active = true;
    setDictData(null);
    setDictLoading(true);
    if (config.language !== 'en-US') {
      setDictLoading(false);
      return;
    }
    fetchDefinition(currentWord).then(data => {
      if (active) {
        setDictData(data);
        setDictLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [currentWord, turn, config.language]);

  useEffect(() => {
    if (feedback === 'idle') {
      autoSpeakTimerRef.current = setTimeout(() => {
        autoSpeakTimerRef.current = null;
        void speak();
      }, 500);
    }
    return () => {
      if (autoSpeakTimerRef.current) {
        clearTimeout(autoSpeakTimerRef.current);
        autoSpeakTimerRef.current = null;
      }
      audioRequest.current++;
      AudioService.stop();
      setIsLoadingAudio(false);
    };
  }, [turn, speak, feedback]);

  const handleCheck = (isTimeout = false) => {
    if (feedback !== 'idle' || !currentWord) return;
    if (!isTimeout && !input.trim()) {
      setWarning('Please enter an answer!');
      return;
    }
    dispatch({ type: 'answer', answer: input, timeout: isTimeout, timestamp: Date.now(), turn });
  };

  useEffect(() => {
    checkRef.current = handleCheck;
  });

  useEffect(() => {
    pausedStateRef.current = isLoadingAudio || editingNote;
  }, [isLoadingAudio, editingNote]);

  useEffect(() => {
    if (!config.timerEnabled || feedback !== 'idle' || !currentWord) return;
    let deadline = Date.now() + (config.timerDuration || 30) * 1000;
    let lastTick = Date.now();

    const timer = window.setInterval(() => {
      const now = Date.now();
      if (pausedStateRef.current) {
        deadline += now - lastTick;
      }
      lastTick = now;
      const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        checkRef.current(true);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [turn, currentWord, config.timerEnabled, config.timerDuration, feedback]);

  useEffect(() => {
    const prev = prevTurnFeedbackRef.current;
    prevTurnFeedbackRef.current = { turn, feedback };
    if (feedback === 'idle') return;
    if (prev.turn === turn && prev.feedback === 'idle') {
      AudioService.playEffect(
        feedback === 'correct' || feedback === 'assisted' ? 'correct' : 'wrong'
      );
    }
    nextBtnRef.current?.focus();
  }, [feedback, turn]);

  const goToNextWord = () => dispatch({ type: 'next', loop: config.loopEnabled, turn });
  const handleHint = () => {
    dispatch({ type: 'hint' });
    inputRef.current?.focus();
  };

  const handleInfo = (type: 'def' | 'sent') => {
    setShowInfo(type);
    focusInputIfIdle();
  };

  const handleEditDef = () => {
    setNote(customNote);
    setEditingNote(true);
  };

  const renderDiff = () => {
    if (feedback === 'correct' || feedback === 'assisted') {
      const isCorrect = feedback === 'correct';
      return (
        <div
          aria-label={currentWord}
          className="flex flex-wrap justify-center gap-1.5 my-2"
        >
          {Array.from(currentWord).map((char, i) => (
            <span
              key={i}
              style={{ animationDelay: `${i * 35}ms` }}
              className={`inline-flex items-center justify-center min-w-[2.2rem] h-11 px-2 rounded-xl font-black text-2xl border-2 border-b-4 shadow-sm animate-tile ${
                char === ' '
                  ? 'border-transparent bg-transparent min-w-[1rem]'
                  : isCorrect
                    ? 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-400 dark:border-emerald-500 border-b-emerald-600 text-emerald-600 dark:text-emerald-300'
                    : 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-400 dark:border-amber-500 border-b-amber-600 text-amber-600 dark:text-amber-300'
              }`}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>
      );
    }

    const attempt = (gameState.answer || input).trim();
    const target = currentWord;

    const attemptChars = attempt
      ? alignAttempt(attempt, target).map((item, i) => (
          <span
            key={i}
            style={{ animationDelay: `${i * 25}ms` }}
            title={
              item.missing ? 'Missing letter' : item.extra ? 'Extra letter' : undefined
            }
            className={`inline-flex items-center justify-center min-w-[1.85rem] h-9 px-1.5 rounded-lg font-extrabold text-xl border border-b-2 animate-pop ${
              item.match
                ? 'bg-slate-100 dark:bg-slate-700/80 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                : item.extra
                  ? 'bg-rose-500/15 border-rose-400 text-rose-500 line-through decoration-2 opacity-85'
                  : 'bg-amber-500/15 border-amber-400 text-rose-500 underline decoration-2'
            }`}
          >
            {item.char}
          </span>
        ))
      : null;

    return (
      <div className="flex flex-col items-center gap-4 mt-1">
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
            You said
          </span>
          <div className="flex flex-wrap justify-center gap-1 text-2xl font-bold tracking-wider break-all">
            {attemptChars ?? <span className="text-slate-400 italic text-xl">Nothing</span>}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-500 mb-1">
            Correct
          </span>
          <div className="text-3xl font-black tracking-widest break-all text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-2xl border border-emerald-500/30">
            {target}
          </div>
        </div>
      </div>
    );
  };

  let infoContent = <span className="text-slate-400">Loading...</span>;
  if (customNote) {
    infoContent = (
      <span>
        <span className="text-sky-400 font-bold text-xs uppercase block mb-1">Custom Note</span>
        {maskTargetWord(customNote, currentWord, feedback === 'idle')}
      </span>
    );
  } else if (dictData) {
    if (showInfo === 'def') {
      const def = dictData.meanings?.[0]?.definitions?.[0]?.definition || 'No definition found.';
      const pos = dictData.meanings?.[0]?.partOfSpeech || 'unknown';
      infoContent = (
        <span>
          <span className="text-sky-400 font-bold text-xs uppercase block mb-1">
            Definition ({pos})
          </span>
          {maskTargetWord(def, currentWord, feedback === 'idle')}
        </span>
      );
    } else if (showInfo === 'sent') {
      const ex =
        (dictData.meanings ?? []).flatMap(m => m?.definitions ?? []).find(d => d?.example)
          ?.example || 'No example available.';
      infoContent = (
        <span>
          <span className="text-sky-400 font-bold text-xs uppercase block mb-1">Example</span>"
          {maskTargetWord(ex, currentWord, feedback === 'idle')}"
        </span>
      );
    }
  } else if (!dictLoading && showInfo) {
    infoContent = (
      <span className="text-slate-400">
        No English dictionary entry available. You can add a custom note.
      </span>
    );
  }

  const totalWords = gameState.allWords.length;
  const remaining = bag.length + (currentWord && feedback === 'idle' ? 1 : 0);
  const completed = Math.max(0, totalWords - remaining);

  const totalAttempts = gameState.history.length;
  const accuracy = calculateAccuracy(gameState.history);

  let accuracyColor = 'text-slate-400 dark:text-slate-500';
  if (totalAttempts > 0) {
    if (accuracy < 60) accuracyColor = 'text-red-500';
    else if (accuracy < 80) accuracyColor = 'text-orange-500';
    else if (accuracy < 90) accuracyColor = 'text-yellow-500';
    else accuracyColor = 'text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]';
  }

  const hintCharacters = Array.from(currentWord);
  const hintLetterCount = hintCharacters.filter(c => /[\p{L}\p{M}]/u.test(c)).length;
  const hintPattern = hintCharacters
    .map((c, idx) => (idx === 0 || !/[\p{L}\p{M}]/u.test(c) ? c : '_'))
    .join(' ');

  const isTimerUrgent = config.timerEnabled && feedback === 'idle' && timeLeft <= 5;
  const isTimerWarning = config.timerEnabled && feedback === 'idle' && timeLeft <= 10 && timeLeft > 5;
  const ringStrokeColor = isTimerUrgent ? '#ef4444' : isTimerWarning ? '#f59e0b' : '#6366f1';

  return (
    <div
      className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] border-2 border-b-8 relative overflow-hidden transition-all duration-300 ${
        feedback === 'correct'
          ? 'border-emerald-400/80 dark:border-emerald-500/70 border-b-emerald-600'
          : feedback === 'assisted'
            ? 'border-amber-400/80 dark:border-amber-500/70 border-b-amber-600'
            : feedback === 'incorrect' || feedback === 'timeout'
              ? 'border-rose-400/80 dark:border-rose-500/70 border-b-rose-600 animate-shake'
              : 'border-slate-200/80 dark:border-slate-800 border-b-slate-300/90 dark:border-b-slate-950'
      }`}
    >
      <ProgressBar total={totalWords} current={completed} status={feedback} />

      <div className="grid grid-cols-3 items-center mb-6 text-slate-500 dark:text-slate-400 text-sm font-extrabold uppercase tracking-wider">
        <div
          key={`streak-${streak}`}
          className={`justify-self-start flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap ${
            streak > 0
              ? 'bg-amber-500/15 border-amber-400/50 text-amber-500 dark:text-amber-400 shadow-sm shadow-amber-500/20 animate-pop'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <i className={`fas fa-fire ${streak >= 3 ? 'animate-bounce text-orange-500' : ''}`}></i>
          <span>{streak}</span>
          {streak >= 5 ? (
            <span className="text-[10px] font-black bg-gradient-to-r from-orange-500 to-rose-500 text-white px-1.5 py-0.5 rounded-full">
              ON FIRE
            </span>
          ) : streak >= 3 ? (
            <span className="text-[10px] font-black bg-amber-500/25 text-amber-600 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
              HOT
            </span>
          ) : null}
        </div>

        <div
          className={`justify-self-center flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-1.5 rounded-full transition-all duration-300 whitespace-nowrap ${accuracyColor}`}
        >
          <i className="fas fa-bullseye"></i> <span>{accuracy}%</span>
        </div>

        <div
          className={`justify-self-end flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all duration-300 whitespace-nowrap ${
            config.timerEnabled ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } ${
            isTimerUrgent
              ? 'bg-rose-500/15 border-rose-400 text-rose-500 animate-pulse'
              : isTimerWarning
                ? 'bg-amber-500/15 border-amber-400 text-amber-500'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <i className="fas fa-clock"></i> <span>{timeLeft}s</span>
        </div>
      </div>

      <div className="relative w-36 h-36 mx-auto mb-7 flex justify-center items-center">
        {/* Sonic pulse rings */}
        <div
          aria-hidden="true"
          className={`absolute inset-3 rounded-full border-2 border-indigo-400/35 dark:border-indigo-400/25 pointer-events-none ${
            isLoadingAudio ? 'animate-ripple' : 'group-hover:animate-ripple'
          }`}
        />
        <div
          aria-hidden="true"
          className="absolute inset-1 rounded-full bg-gradient-to-br from-indigo-500/10 to-amber-400/10 pointer-events-none"
        />

        {config.timerEnabled && feedback === 'idle' && (
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r="58"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              className="text-slate-200/70 dark:text-slate-800"
            />
            <circle
              cx="64"
              cy="64"
              r="58"
              fill="none"
              stroke={ringStrokeColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="364.4"
              strokeDashoffset={364.4 - (timeLeft / (config.timerDuration || 30)) * 364.4}
              className="transition-[stroke-dashoffset,stroke] duration-500 linear"
            />
          </svg>
        )}

        <button
          aria-label="Listen to word"
          onClick={() => {
            void speak(1.0);
            focusInputIfIdle();
          }}
          disabled={isLoadingAudio}
          className={`w-24 h-24 aspect-square p-0 rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 text-white text-4xl border-b-4 border-indigo-950 shadow-[0_10px_25px_rgba(79,70,229,0.45)] flex items-center justify-center leading-none z-10 transition-all duration-200 active:translate-y-1 active:border-b-2 ${
            isLoadingAudio ? 'cursor-wait scale-95' : 'hover:scale-105 hover:shadow-[0_14px_32px_rgba(79,70,229,0.6)]'
          }`}
        >
          {isLoadingAudio ? (
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <i className="fas fa-headphones leading-none block"></i>
          )}
        </button>
      </div>

      {audioWarning && (
        <p
          role="status"
          className="mb-4 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-400/40 rounded-xl px-3 py-2 text-center animate-pop"
        >
          <i className="fas fa-volume-low mr-1.5"></i>
          {audioWarning}
        </p>
      )}

      <div className="flex justify-center gap-2.5 mb-6 flex-wrap">
        <button
          onClick={() => handleInfo('def')}
          className={`px-4 py-2.5 rounded-xl text-sm font-extrabold border-2 border-b-4 transition-all active:translate-y-0.5 active:border-b-2 ${
            showInfo === 'def'
              ? 'bg-sky-500/15 border-sky-400 border-b-sky-600 text-sky-600 dark:text-sky-300'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-950 text-slate-700 dark:text-slate-200'
          }`}
        >
          <i className="fas fa-book text-sky-500 mr-1.5"></i> Def
        </button>
        <button
          onClick={() => handleInfo('sent')}
          className={`px-4 py-2.5 rounded-xl text-sm font-extrabold border-2 border-b-4 transition-all active:translate-y-0.5 active:border-b-2 ${
            showInfo === 'sent'
              ? 'bg-violet-500/15 border-violet-400 border-b-violet-600 text-violet-600 dark:text-violet-300'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-950 text-slate-700 dark:text-slate-200'
          }`}
        >
          <i className="fas fa-quote-left text-violet-500 mr-1.5"></i> Sent
        </button>
        <button
          disabled={isLoadingAudio}
          onClick={() => {
            void speak(0.5);
            focusInputIfIdle();
          }}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 border-b-4 border-b-slate-300 dark:border-b-slate-950 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all active:translate-y-0.5 active:border-b-2"
        >
          <i className="fas fa-gauge-high text-emerald-500 mr-1.5"></i> Slow
        </button>
        <button
          onClick={handleHint}
          className={`px-4 py-2.5 rounded-xl text-sm font-extrabold border-2 border-b-4 transition-all active:translate-y-0.5 active:border-b-2 ${
            hintUsed
              ? 'bg-amber-500/20 border-amber-400 border-b-amber-600 text-amber-600 dark:text-amber-300'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-950 text-amber-500 dark:text-amber-400'
          }`}
        >
          <i className="fas fa-lightbulb mr-1.5"></i> Hint
        </button>
      </div>

      {showInfo && (
        <div className="bg-sky-50/90 dark:bg-sky-950/40 border-2 border-sky-200 dark:border-sky-800/70 border-l-4 border-l-sky-400 p-4 rounded-2xl mb-6 text-left text-sm relative animate-pop text-slate-700 dark:text-slate-200 shadow-sm">
          <button
            aria-label="Edit note"
            className="fas fa-pen absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 dark:bg-slate-800/70 text-slate-400 dark:text-slate-400 hover:text-sky-500 dark:hover:text-white cursor-pointer text-xs transition-colors"
            onClick={handleEditDef}
            title="Edit Note"
          ></button>
          {editingNote ? (
            <form
              onSubmit={e => {
                e.preventDefault();
                onSaveDef(currentWord, note.trim());
                setEditingNote(false);
                if (feedback === 'idle') inputRef.current?.focus();
                else nextBtnRef.current?.focus();
              }}
            >
              <label htmlFor="note" className="block text-xs font-extrabold uppercase tracking-wider text-sky-500 mb-1.5">
                Custom note
              </label>
              <textarea
                id="note"
                autoFocus
                maxLength={500}
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full rounded-xl p-2.5 border-2 border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none mb-2"
              />
              <button
                type="submit"
                className="mr-3 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold"
              >
                Save note
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                onClick={() => {
                  setEditingNote(false);
                  if (feedback === 'idle') inputRef.current?.focus();
                  else nextBtnRef.current?.focus();
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            infoContent
          )}
        </div>
      )}

      <div className="min-h-[130px] flex flex-col items-center justify-center mb-5">
        {feedback === 'idle' ? (
          <>
            <div className="w-full relative">
              <input
                aria-label="Your spelling"
                ref={inputRef}
                type="text"
                maxLength={200}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  if (warning) setWarning(null);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.repeat && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCheck();
                  }
                }}
                placeholder="Type word..."
                className="bg-slate-100/70 dark:bg-slate-800/70 rounded-2xl border-2 border-slate-200 dark:border-slate-700 border-b-4 border-b-slate-300 dark:border-b-slate-600 focus:border-indigo-500 focus:border-b-indigo-600 focus:bg-white dark:focus:bg-slate-800 text-center text-3xl font-black tracking-wider text-slate-800 dark:text-white w-full py-3.5 px-4 outline-none transition-all shadow-inner"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              {input.trim().length > 0 && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 pointer-events-none animate-pop">
                  {Array.from(input.trim()).length}
                </span>
              )}
            </div>
            {hintUsed && (
              <div className="text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-400/40 px-4 py-1.5 rounded-xl font-black mt-3 animate-pop tracking-widest text-sm">
                {hintPattern} ({hintLetterCount})
              </div>
            )}
            {warning && (
              <div className="text-rose-500 font-extrabold mt-2.5 animate-shake text-sm flex items-center gap-1.5">
                <i className="fas fa-circle-exclamation"></i> {warning}
              </div>
            )}
          </>
        ) : (
          <div className="text-center animate-pop relative w-full">
            {feedback === 'correct' && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center">
                <span
                  style={{ '--tx': '-55px', '--ty': '-28px' } as React.CSSProperties}
                  className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-spark"
                />
                <span
                  style={{ '--tx': '55px', '--ty': '-28px' } as React.CSSProperties}
                  className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-spark"
                />
                <span
                  style={{ '--tx': '-30px', '--ty': '-42px' } as React.CSSProperties}
                  className="w-2 h-2 rounded-full bg-indigo-400 animate-spark"
                />
                <span
                  style={{ '--tx': '30px', '--ty': '-42px' } as React.CSSProperties}
                  className="w-2 h-2 rounded-full bg-amber-300 animate-spark"
                />
              </div>
            )}
            <div
              className={`inline-block px-4 py-1 rounded-full text-sm font-black uppercase tracking-widest mb-2 border ${
                feedback === 'correct'
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-500 dark:text-emerald-300'
                  : feedback === 'assisted'
                    ? 'bg-amber-500/15 border-amber-400/50 text-amber-600 dark:text-amber-300'
                    : 'bg-rose-500/15 border-rose-400/50 text-rose-500 dark:text-rose-300'
              }`}
            >
              {feedback === 'correct'
                ? 'Perfect! 🎉'
                : feedback === 'assisted'
                  ? 'Assisted 💡 — repeat without hint'
                  : feedback === 'timeout'
                    ? 'Time Up ⏰'
                    : 'Mistake ❌'}
            </div>
            {renderDiff()}
          </div>
        )}
      </div>

      <button
        ref={nextBtnRef}
        onKeyDown={e => {
          if (e.key === 'Enter' && e.repeat) e.preventDefault();
        }}
        onClick={() => (feedback === 'idle' ? handleCheck() : goToNextWord())}
        className={`w-full py-4 rounded-2xl font-black text-lg uppercase tracking-widest border-b-4 shadow-lg transition-all active:translate-y-1 active:border-b-2 mb-5 ${
          feedback === 'idle'
            ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-indigo-900 shadow-indigo-900/25'
            : feedback === 'correct'
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white border-green-800 shadow-emerald-900/25'
              : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-white border-slate-400 dark:border-slate-950 shadow-slate-900/15'
        }`}
      >
        {feedback === 'idle' ? 'Check' : 'Next ➡'}
      </button>

      <div className="flex items-center justify-center gap-6 pt-1 border-t border-slate-200/70 dark:border-slate-800">
        <button
          onClick={onFinish}
          className="text-xs font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <i className="fas fa-flag-checkered mr-1"></i> Finish session
        </button>
        <button
          onClick={onExit}
          className="text-xs font-extrabold text-rose-400 hover:text-rose-500 uppercase tracking-wider transition-colors"
        >
          <i className="fas fa-right-from-bracket mr-1"></i>{' '}
          {gameState.isLuckySession ? 'Exit Lucky Session' : 'Save & Exit'}
        </button>
      </div>
    </div>
  );
};