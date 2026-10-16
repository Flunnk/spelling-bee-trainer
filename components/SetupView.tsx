import React, { useState, useRef, useEffect } from 'react';
import { AppConfig, StoredSession } from '../types';
import { AudioService } from '../services/audioService';
import { parseWords, orderWords } from '../core/game';
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
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel (US Fem)', icon: 'fa-user-astronaut' },
  { id: '29vD33N1CtxCmqQRPOHJ', label: 'Drew (US Masc)', icon: 'fa-user-tie' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli (US Fem)', icon: 'fa-wand-magic-sparkles' },
  { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni (US Masc)', icon: 'fa-headphones-simple' },
  { id: 'browser', label: 'Browser voice', icon: 'fa-globe' },
];

const WORD_ORDER_OPTIONS = [
  { id: 'random', label: 'Random (Default)', icon: 'fa-shuffle' },
  { id: 'alphabetical', label: 'Alphabetical (A-Z)', icon: 'fa-arrow-down-a-z' },
  { id: 'inverted', label: 'Inverted (Reverse)', icon: 'fa-arrow-down-z-a' },
  { id: 'normal', label: 'Normal (As Entered)', icon: 'fa-list-ol' },
];

const LANGUAGE_OPTIONS = [
  { id: 'en-US', label: 'English (US)', icon: 'fa-flag-usa' },
  { id: 'es-ES', label: 'Spanish', icon: 'fa-language' },
  { id: 'fr-FR', label: 'French', icon: 'fa-wine-glass-empty' },
  { id: 'de-DE', label: 'German', icon: 'fa-bolt' },
];

interface SelectOption {
  id: string;
  label: string;
  disabled?: boolean;
  icon?: string;
}

interface AnimatedSelectProps {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (val: string) => void;
}

const AnimatedSelect: React.FC<AnimatedSelectProps> = ({ id, value, options, onChange }) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOpen = isRendered && !isClosing;
  const selectedOption = options.find(o => o.id === value) || options[0];

  const openMenu = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsClosing(false);
    setIsRendered(true);
  };

  const closeMenu = () => {
    if (!isRendered || isClosing) return;
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
      closeTimeoutRef.current = null;
    }, 160);
  };

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    if (isRendered) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRendered, isClosing]);

  useEffect(
    () => () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    },
    []
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeMenu();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMenu();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      const enabledOptions = options.filter(o => !o.disabled);
      const currentIndex = enabledOptions.findIndex(o => o.id === value);
      if (enabledOptions.length === 0) return;
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (currentIndex + delta + enabledOptions.length) % enabledOptions.length;
      onChange(enabledOptions[nextIndex].id);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        className={`w-full min-h-[46px] flex items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800 border-2 ${
          isOpen
            ? 'border-indigo-500 ring-4 ring-indigo-500/15 bg-white dark:bg-slate-800'
            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400/70 dark:hover:border-indigo-500/60'
        } rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none transition-all duration-200 cursor-pointer text-left`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selectedOption?.icon && (
            <i
              aria-hidden="true"
              className={`fas ${selectedOption.icon} text-indigo-500 dark:text-indigo-400 text-xs shrink-0`}
            ></i>
          )}
          <span className="leading-snug">{selectedOption?.label}</span>
        </span>
        <i
          aria-hidden="true"
          className={`fas fa-chevron-down text-xs text-slate-400 transition-transform duration-300 ease-[var(--spring-easing)] shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-500' : ''
          }`}
        ></i>
      </button>

      {isRendered && (
        <div
          role="listbox"
          className={`absolute left-0 min-w-full w-max max-w-[88vw] top-[calc(100%+0.45rem)] z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-2 border-slate-200/90 dark:border-slate-700 rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-black/60 p-1.5 overflow-hidden ${
            isClosing ? 'animate-dropdown-out' : 'animate-dropdown-in'
          }`}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                style={{ animationDelay: !isClosing ? `${idx * 25}ms` : '0ms' }}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.id);
                  closeMenu();
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 text-left whitespace-nowrap ${
                  opt.disabled
                    ? 'opacity-45 cursor-not-allowed text-slate-400 dark:text-slate-500'
                    : isSelected
                    ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/15 dark:from-indigo-500/25 dark:to-violet-500/25 text-indigo-600 dark:text-indigo-300 font-extrabold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:translate-x-0.5 active:scale-[0.98]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {opt.icon && (
                    <i
                      aria-hidden="true"
                      className={`fas ${opt.icon} w-4 text-center text-xs shrink-0 ${
                        isSelected
                          ? 'text-indigo-500 dark:text-indigo-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    ></i>
                  )}
                  <span>{opt.label}</span>
                </span>
                {opt.disabled ? (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                    <i aria-hidden="true" className="fas fa-lock text-[9px]"></i> Key
                  </span>
                ) : (
                  isSelected && (
                    <i
                      aria-hidden="true"
                      className="fas fa-check text-xs text-indigo-500 dark:text-indigo-400 animate-pop shrink-0"
                    ></i>
                  )
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const SetupView: React.FC<SetupViewProps> = ({
  config,
  setConfig,
  onStart,
  onResume,
  hasSavedState,
  recentSessions,
  lastMistakes,
}) => {
  const [rawWords, setRawWords] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerInput, setTimerInput] = useState(String(config.timerDuration || 30));
  const [renderTimerControls, setRenderTimerControls] = useState(config.timerEnabled);
  const [closingTimerControls, setClosingTimerControls] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasApiKey = !!config.elevenLabsKey.trim();

  useEffect(() => {
    setTimerInput(String(config.timerDuration || 30));
  }, [config.timerDuration]);

  useEffect(() => {
    if (timerCloseTimeoutRef.current) {
      clearTimeout(timerCloseTimeoutRef.current);
      timerCloseTimeoutRef.current = null;
    }
    if (config.timerEnabled) {
      setClosingTimerControls(false);
      setRenderTimerControls(true);
    } else if (renderTimerControls) {
      setClosingTimerControls(true);
      timerCloseTimeoutRef.current = setTimeout(() => {
        setRenderTimerControls(false);
        setClosingTimerControls(false);
        timerCloseTimeoutRef.current = null;
      }, 180);
    }
  }, [config.timerEnabled]);

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (timerCloseTimeoutRef.current) clearTimeout(timerCloseTimeoutRef.current);
    },
    []
  );

  const commitTimerInput = () => {
    const parsed = parseInt(timerInput, 10);
    const clamped = Number.isFinite(parsed)
      ? Math.max(5, Math.min(300, parsed))
      : config.timerDuration || 30;
    setTimerInput(String(clamped));
    if (clamped !== config.timerDuration) {
      setConfig({ ...config, timerDuration: clamped });
    }
  };

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
    commitTimerInput();
    let cleanedWords: string[];
    try {
      cleanedWords = parseWords(rawWords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid word list.');
      return;
    }

    if (cleanedWords.length === 0) {
      setError('Please enter at least one valid word.');
      return;
    }

    onStart(orderWords(cleanedWords, config.wordOrder));
  };

  const loadSession = (words: string[]) => {
    AudioService.resume();
    commitTimerInput();
    onStart(orderWords(words, config.wordOrder));
  };

  const handleLuckyStart = () => {
    AudioService.resume();
    commitTimerInput();
    const shuffledEasy = orderWords(EASY_WORDS, 'random');
    const shuffledHard = orderWords(HARD_WORDS, 'random');
    const selected = orderWords([...shuffledEasy.slice(0, 9), shuffledHard[0]], 'random');
    onStart(selected, true);
  };

  const enteredWordCount = rawWords
    .split(/[\n,]+/)
    .map(w => w.trim())
    .filter(Boolean).length;

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] border-2 border-slate-200/80 dark:border-slate-800 border-b-8 border-b-slate-300/90 dark:border-b-slate-950 animate-slide-up transition-colors duration-300">
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30 border-b-4 border-orange-600 mb-3 animate-float">
          <i className="fas fa-crown text-2xl"></i>
        </div>
        <h1 className="text-4xl sm:text-5xl leading-tight sm:leading-tight py-1.5 font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 dark:from-amber-300 dark:via-amber-400 dark:to-indigo-400">
          Spelling Bee
        </h1>
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
          Master Your Spelling Skills
        </p>
      </div>

      {(hasSavedState || lastMistakes.length > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-3 animate-fade-in">
          {hasSavedState && (
            <button
              onClick={onResume}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-2xl font-extrabold border-b-4 border-green-800 shadow-lg shadow-emerald-900/20 transition-all active:translate-y-0.5 active:border-b-2 flex items-center justify-center gap-2.5 group"
            >
              <i className="fas fa-play text-sm group-hover:scale-125 transition-transform"></i>
              <span>Resume Previous Session</span>
            </button>
          )}
          {lastMistakes.length > 0 && (
            <button
              onClick={() => loadSession(lastMistakes)}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-2xl font-extrabold border-b-4 border-orange-700 shadow-lg shadow-amber-900/20 transition-all active:translate-y-0.5 active:border-b-2 flex items-center justify-center gap-2.5 group"
            >
              <i className="fas fa-fire-flame-curved group-hover:scale-125 transition-transform"></i>
              <span>Practice Mistakes ({lastMistakes.length})</span>
            </button>
          )}
          <div className="flex items-center my-2 text-slate-400 dark:text-slate-500 text-xs font-black tracking-widest">
            <div className="flex-grow h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            <span className="px-3">OR START NEW</span>
            <div className="flex-grow h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <button
          onClick={handleLuckyStart}
          className="group relative overflow-hidden w-full py-4 px-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-2xl font-black text-lg border-b-4 border-teal-800 transition-all active:translate-y-1 animate-glow-green transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
        >
          <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer pointer-events-none" />
          <i className="fas fa-dice text-2xl transition-transform duration-500 group-hover:rotate-180 group-hover:scale-110"></i>
          <span>I'm Feeling Lucky</span>
          <span className="text-xs font-extrabold uppercase tracking-wider bg-slate-950/25 border border-white/25 px-2.5 py-1 rounded-full">
            10 Words
          </span>
        </button>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="words"
              className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              <i className="fas fa-list-check text-indigo-500"></i>
              <span>Word List</span>
            </label>
            {enteredWordCount > 0 && (
              <span
                key={enteredWordCount}
                className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 animate-pop"
              >
                {enteredWordCount} {enteredWordCount === 1 ? 'word' : 'words'} ready ✨
              </span>
            )}
          </div>
          <textarea
            id="words"
            value={rawWords}
            onChange={handleWordChange}
            placeholder={'Paste words here...\nExample: coffee, café, mañana, château'}
            className={`w-full h-28 bg-slate-100/90 dark:bg-slate-800/90 border-2 ${
              error
                ? 'border-red-500 focus:border-red-500 ring-4 ring-red-500/15'
                : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15'
            } rounded-2xl p-4 font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all resize-none shadow-inner`}
          />
          {error && (
            <p className="mt-2 text-sm text-red-500 font-bold animate-shake flex items-center gap-1.5">
              <i className="fas fa-exclamation-circle"></i> <span>{error}</span>
            </p>
          )}
        </div>

        {recentSessions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recentSessions.map(session => (
              <button
                key={session.id}
                onClick={() => loadSession(session.words)}
                className="flex-shrink-0 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 border-b-4 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-200 transition-all active:translate-y-0.5"
                title={session.words.join(', ')}
              >
                <i className="fas fa-clock-rotate-left text-indigo-500 mr-1.5"></i> {session.label} (
                {new Date(session.date).toLocaleDateString()})
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label
              htmlFor="api-key"
              className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
            >
              <i className="fas fa-key text-amber-500 mr-1"></i> ElevenLabs Key
            </label>
            <input
              id="api-key"
              type="password"
              value={config.elevenLabsKey}
              onChange={e => {
                const newKey = e.target.value;
                const shouldSelectDefaultVoice =
                  !hasApiKey && !!newKey.trim() && config.voiceId === 'browser';
                setConfig({
                  ...config,
                  elevenLabsKey: newKey,
                  voiceId: shouldSelectDefaultVoice ? VOICE_OPTIONS[0].id : config.voiceId,
                });
              }}
              placeholder="Optional sk-..."
              className="w-full min-h-[46px] bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none transition-colors"
            />
          </div>
          <div>
            <label
              htmlFor="voice"
              className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
            >
              <i className="fas fa-microphone-lines text-indigo-500 mr-1"></i> Voice Model
            </label>
            <AnimatedSelect
              id="voice"
              value={hasApiKey ? config.voiceId : 'browser'}
              options={VOICE_OPTIONS.map(v => ({
                ...v,
                disabled: !hasApiKey && v.id !== 'browser',
              }))}
              onChange={val => setConfig({ ...config, voiceId: val })}
            />
          </div>
          <div>
            <label
              htmlFor="word-order"
              className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
            >
              <i className="fas fa-shuffle text-emerald-500 mr-1"></i> Word Order
            </label>
            <AnimatedSelect
              id="word-order"
              value={config.wordOrder || 'random'}
              options={WORD_ORDER_OPTIONS}
              onChange={val => setConfig({ ...config, wordOrder: val as AppConfig['wordOrder'] })}
            />
          </div>
          <div>
            <label
              htmlFor="language"
              className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
            >
              <i className="fas fa-earth-americas text-sky-500 mr-1"></i> Pronunciation Language
            </label>
            <AnimatedSelect
              id="language"
              value={config.language}
              options={LANGUAGE_OPTIONS}
              onChange={val => setConfig({ ...config, language: val as AppConfig['language'] })}
            />
          </div>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
          Your API key is saved locally in this browser. Without a key, speech uses your browser's
          voice. Automatic definitions are English only.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="h-14 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/70 px-3 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700/80 transition-colors hover:border-indigo-400/70 dark:hover:border-indigo-500/60">
            <button
              type="button"
              role="switch"
              aria-checked={config.timerEnabled}
              className="flex items-center gap-2 cursor-pointer shrink-0"
              onClick={() => setConfig({ ...config, timerEnabled: !config.timerEnabled })}
            >
              <div
                className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300 shrink-0 ${
                  config.timerEnabled
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                    config.timerEnabled ? 'translate-x-4' : ''
                  }`}
                ></div>
              </div>
              <span className="font-extrabold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                Timer
              </span>
            </button>

            {renderTimerControls && (
              <div
                className={`flex items-center gap-0.5 bg-white/90 dark:bg-slate-900/70 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-inner shrink-0 ${
                  closingTimerControls ? 'animate-stepper-out' : 'animate-stepper-in'
                }`}
              >
                <button
                  type="button"
                  aria-label="Decrease timer"
                  onClick={() =>
                    setConfig({
                      ...config,
                      timerDuration: Math.max(5, (config.timerDuration || 30) - 5),
                    })
                  }
                  className="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 border-b-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all font-bold active:scale-90"
                >
                  <i className="fas fa-minus text-[9px]"></i>
                </button>
                <div className="relative w-10">
                  <input
                    aria-label="Timer duration in seconds"
                    min={5}
                    max={300}
                    type="number"
                    value={timerInput}
                    onChange={e => {
                      const raw = e.target.value;
                      setTimerInput(raw);
                      const parsed = parseInt(raw, 10);
                      if (Number.isFinite(parsed) && parsed >= 5 && parsed <= 300) {
                        setConfig({ ...config, timerDuration: parsed });
                      }
                    }}
                    onBlur={commitTimerInput}
                    className="w-full text-center bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none pr-2.5"
                  />
                  <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-extrabold pointer-events-none">
                    s
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Increase timer"
                  onClick={() =>
                    setConfig({
                      ...config,
                      timerDuration: Math.min(300, (config.timerDuration || 30) + 5),
                    })
                  }
                  className="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 border-b-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all font-bold active:scale-90"
                >
                  <i className="fas fa-plus text-[9px]"></i>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={config.loopEnabled}
            className="h-14 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/70 px-3 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700/80 transition-colors hover:border-indigo-400/70 dark:hover:border-indigo-500/60 cursor-pointer"
            onClick={() => setConfig({ ...config, loopEnabled: !config.loopEnabled })}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300 shrink-0 ${
                  config.loopEnabled
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                    config.loopEnabled ? 'translate-x-4' : ''
                  }`}
                ></div>
              </div>
              <span className="font-extrabold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                Infinite Loop
              </span>
            </div>
            <i
              className={`fas fa-infinity text-sm transition-colors ${
                config.loopEnabled ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-600'
              }`}
            ></i>
          </button>
        </div>

        <div className="relative group mt-3">
          {/* Glowing aura around the button on hover */}
          <div
            aria-hidden="true"
            className="absolute -inset-1 rounded-[1.2rem] bg-gradient-to-r from-amber-400 via-fuchsia-500 to-indigo-500 opacity-0 group-hover:opacity-75 blur-lg transition-all duration-500 pointer-events-none"
          />

          {/* Orbiting & twinkling lights ("lucecitas") around the button on hover */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
          >
            <span
              style={{ animationDelay: '0s' }}
              className="absolute -top-2.5 left-8 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_3px_rgba(251,191,36,0.95)] animate-twinkle"
            />
            <span
              style={{ animationDelay: '0.35s' }}
              className="absolute -top-3 left-1/3 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)] text-xs animate-float-sparkle"
            >
              ✦
            </span>
            <span
              style={{ animationDelay: '0.15s' }}
              className="absolute -top-2 right-12 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_12px_3px_rgba(56,189,248,0.95)] animate-twinkle"
            />
            <span
              style={{ animationDelay: '0.5s' }}
              className="absolute -top-3 right-1/4 text-pink-300 drop-shadow-[0_0_8px_rgba(244,114,182,0.95)] text-xs animate-float-sparkle"
            >
              ★
            </span>
            <span
              style={{ animationDelay: '0.25s' }}
              className="absolute top-1/2 -translate-y-1/2 -left-2.5 w-2.5 h-2.5 rounded-full bg-fuchsia-300 shadow-[0_0_12px_3px_rgba(232,121,249,0.95)] animate-twinkle"
            />
            <span
              style={{ animationDelay: '0.6s' }}
              className="absolute top-1/2 -translate-y-1/2 -right-2.5 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_3px_rgba(251,191,36,0.95)] animate-twinkle"
            />
            <span
              style={{ animationDelay: '0.4s' }}
              className="absolute -bottom-2.5 left-14 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_12px_3px_rgba(56,189,248,0.95)] animate-twinkle"
            />
            <span
              style={{ animationDelay: '0.2s' }}
              className="absolute -bottom-3 left-1/2 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)] text-xs animate-float-sparkle"
            >
              ✦
            </span>
            <span
              style={{ animationDelay: '0.7s' }}
              className="absolute -bottom-2.5 right-10 w-2.5 h-2.5 rounded-full bg-pink-300 shadow-[0_0_12px_3px_rgba(244,114,182,0.95)] animate-twinkle"
            />
          </div>

          <button
            onClick={handleStart}
            className={`relative z-10 overflow-hidden w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:via-violet-500 hover:to-fuchsia-500 text-white rounded-2xl font-black text-lg uppercase tracking-widest border-b-4 border-indigo-950 shadow-lg shadow-indigo-900/30 transition-all duration-200 transform group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_30px_-4px_rgba(139,92,246,0.65)] active:translate-y-1 active:border-b-0 flex items-center justify-center gap-3 ${
              rawWords.trim().length > 0 && !isTyping ? 'animate-glow-indigo' : ''
            }`}
          >
            {/* Shimmer sweep on hover */}
            <div
              aria-hidden="true"
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 animate-shimmer pointer-events-none"
            />
            <i
              aria-hidden="true"
              className="fas fa-wand-magic-sparkles text-amber-300 text-base transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-125"
            ></i>
            <span>Start Session</span>
            <i
              aria-hidden="true"
              className="fas fa-bolt text-amber-300 text-base transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125"
            ></i>
          </button>
        </div>
      </div>
    </div>
  );
};