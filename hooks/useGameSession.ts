import { useState, useEffect, useReducer, useRef } from 'react';
import type { AppConfig, GameState, StoredSession } from '../types';
import {
  gameReducer,
  initialGame,
  restoreGame,
  canResume,
  mistakesFrom,
  normalizeAnswer,
} from '../core/game';
import { AudioService } from '../services/audioService';

export const DEFAULT_CONFIG: AppConfig = {
  timerEnabled: false,
  timerDuration: 30,
  loopEnabled: false,
  elevenLabsKey: '',
  voiceId: 'browser',
  wordOrder: 'random',
  language: 'en-US',
};

const canonicalWordListKey = (words: string[]) =>
  JSON.stringify([...words].map(normalizeAnswer).sort());

export function useGameSession() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [gameState, dispatch] = useReducer(gameReducer, initialGame);
  const [recentSessions, setRecentSessions] = useState<StoredSession[]>([]);
  const [lastMistakes, setLastMistakes] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState('');
  const savedSession = useRef<GameState>(initialGame);

  const read = (key: string): unknown => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      setStorageError('Some saved data could not be read. Check browser storage settings.');
      return null;
    }
  };

  const write = (key: string, value: unknown) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {
      setStorageError(
        'Changes could not be saved. Keep this tab open and check browser storage settings.'
      );
    }
  };

  useEffect(() => {
    const raw = read('sb_config');
    if (raw && typeof raw === 'object') {
      const c = raw as Partial<AppConfig>;
      setConfig({
        ...DEFAULT_CONFIG,
        timerEnabled: c.timerEnabled === true,
        loopEnabled: c.loopEnabled === true,
        timerDuration: Number.isFinite(c.timerDuration)
          ? Math.max(5, Math.min(300, c.timerDuration!))
          : 30,
        voiceId: typeof c.voiceId === 'string' && c.voiceId.trim() ? c.voiceId : 'browser',
        wordOrder: ['random', 'normal', 'alphabetical', 'inverted'].includes(c.wordOrder || '')
          ? c.wordOrder!
          : 'random',
        language: ['en-US', 'es-ES', 'fr-FR', 'de-DE'].includes(c.language || '')
          ? c.language!
          : 'en-US',
        elevenLabsKey: typeof c.elevenLabsKey === 'string' ? c.elevenLabsKey : '',
      });
    }
    const defs = read('custom_defs');
    const customDefs =
      defs && typeof defs === 'object' && !Array.isArray(defs)
        ? Object.fromEntries(
            Object.entries(defs).filter(
              ([k, v]) =>
                k !== '__proto__' &&
                k !== 'prototype' &&
                typeof v === 'string' &&
                !!v.trim()
            )
          )
        : {};
    const restored = { ...restoreGame(read('sb_state')), customDefs };
    savedSession.current = restored;
    dispatch({ type: 'restore', state: restored });

    const recent = read('sb_recent_sessions');
    if (Array.isArray(recent)) {
      setRecentSessions(
        recent
          .filter(
            s =>
              s &&
              typeof s.id === 'string' &&
              Number.isFinite(s.date) &&
              (s.label === undefined || typeof s.label === 'string') &&
              Array.isArray(s.words) &&
              s.words.length > 0 &&
              s.words.every((w: unknown) => typeof w === 'string' && !!w.trim())
          )
          .slice(0, 3)
      );
    }
    const mistakes = read('sb_last_mistakes');
    if (Array.isArray(mistakes)) {
      setLastMistakes(mistakes.filter((w): w is string => typeof w === 'string' && !!w.trim()));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    write('sb_config', config);
  }, [config, hydrated]);

  useEffect(() => {
    if (hydrated) write('sb_recent_sessions', recentSessions);
  }, [recentSessions, hydrated]);

  useEffect(() => {
    if (hydrated) write('sb_last_mistakes', lastMistakes);
  }, [lastMistakes, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    write('custom_defs', gameState.customDefs);
    if (gameState.isLuckySession) return;
    savedSession.current = gameState;
    write('sb_state', canResume(gameState) ? { ...gameState, view: 'setup' } : null);
  }, [gameState, hydrated]);

  useEffect(() => {
    if (gameState.view === 'summary' && gameState.history.length > 0) {
      setLastMistakes(mistakesFrom(gameState.history));
    }
  }, [gameState.view, gameState.history]);

  const restoreSavedSession = () =>
    dispatch({
      type: 'restore',
      state: {
        ...(canResume(savedSession.current) ? savedSession.current : initialGame),
        customDefs: gameState.customDefs,
        view: 'setup',
        isLuckySession: false,
      },
    });

  const startSession = (words: string[], lucky = false) => {
    AudioService.resume();
    if (!words.length) return;
    if (!lucky) {
      const targetKey = canonicalWordListKey(words);
      setRecentSessions(prev =>
        [
          {
            id: Date.now().toString(),
            date: Date.now(),
            words: [...words],
            label: `${words.length} ${words.length === 1 ? 'word' : 'words'}`,
          },
          ...prev.filter(s => canonicalWordListKey(s.words) !== targetKey),
        ].slice(0, 3)
      );
    }
    dispatch({ type: 'start', words, lucky });
  };

  return {
    config,
    setConfig,
    gameState,
    recentSessions,
    lastMistakes,
    hydrated,
    storageError,
    hasSavedState: canResume(gameState),
    dispatch,
    actions: {
      startSession,
      resumeSession: () => {
        AudioService.resume();
        dispatch({ type: 'resume' });
      },
      saveCustomDef: (word: string, definition: string) =>
        dispatch({ type: 'definition', word, definition }),
      handleSessionEnd: () => dispatch({ type: 'finish' }),
      exit: () =>
        gameState.isLuckySession ? restoreSavedSession() : dispatch({ type: 'exit' }),
      resetGame: restoreSavedSession,
    },
  };
}