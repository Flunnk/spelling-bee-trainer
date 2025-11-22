import { useState, useEffect, useCallback } from 'react';
import { AppConfig, GameState, StoredSession } from '../types';

const DEFAULT_CONFIG: AppConfig = {
    timerEnabled: false,
    timerDuration: 30,
    loopEnabled: false,
    elevenLabsKey: '',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    wordOrder: 'random',
};

const DEFAULT_GAME_STATE: GameState = {
    view: 'setup',
    allWords: [],
    bag: [],
    history: [],
    currentWord: '',
    streak: 0,
    maxStreak: 0,
    customDefs: {},
    isLuckySession: false,
};

export function useGameSession() {
    const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
    const [gameState, setGameState] = useState<GameState>(DEFAULT_GAME_STATE);
    const [recentSessions, setRecentSessions] = useState<StoredSession[]>([]);
    const [lastMistakes, setLastMistakes] = useState<string[]>([]);
    const [hydrated, setHydrated] = useState(false);

    // Load State on Mount
    useEffect(() => {
        const savedConfig = localStorage.getItem('sb_config');
        const savedState = localStorage.getItem('sb_state');
        const savedDefs = localStorage.getItem('custom_defs');
        const savedSessions = localStorage.getItem('sb_recent_sessions');
        const savedMistakes = localStorage.getItem('sb_last_mistakes');

        if (savedConfig) setConfig(JSON.parse(savedConfig));
        if (savedDefs) {
            setGameState(prev => ({ ...prev, customDefs: JSON.parse(savedDefs) }));
        }
        if (savedSessions) setRecentSessions(JSON.parse(savedSessions));
        if (savedMistakes) setLastMistakes(JSON.parse(savedMistakes));

        if (savedState) {
            const parsedState = JSON.parse(savedState);
            setGameState(prev => ({
                ...prev,
                ...parsedState,
                view: 'setup', // Always start on setup, allowing Resume
            }));
        }
        setHydrated(true);
    }, []);

    // Persist Config
    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem('sb_config', JSON.stringify(config));
    }, [config, hydrated]);

    // Persist Recent Sessions
    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem('sb_recent_sessions', JSON.stringify(recentSessions));
    }, [recentSessions, hydrated]);

    // Persist Last Mistakes
    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem('sb_last_mistakes', JSON.stringify(lastMistakes));
    }, [lastMistakes, hydrated]);

    // Persist Game State
    useEffect(() => {
        if (!hydrated) return;
        if (gameState.view === 'setup' && gameState.allWords.length === 0) return;
        if (gameState.isLuckySession) return; // Don't save lucky sessions to protect previous state

        const stateToSave = {
            allWords: gameState.allWords,
            bag: gameState.currentWord ? [gameState.currentWord, ...gameState.bag] : gameState.bag,
            history: gameState.history,
            streak: gameState.streak,
            maxStreak: gameState.maxStreak,
        };
        localStorage.setItem('sb_state', JSON.stringify(stateToSave));
    }, [gameState, hydrated]);

    const saveCustomDef = (word: string, def: string) => {
        const newDefs = { ...gameState.customDefs, [word]: def };
        setGameState(prev => ({ ...prev, customDefs: newDefs }));
        localStorage.setItem('custom_defs', JSON.stringify(newDefs));
    };

    const startSession = (words: string[], skipHistory: boolean = false) => {
        // 1. Update Recent Sessions (Max 3, Unique by content)
        if (!skipHistory) {
            setRecentSessions(prev => {
                const newEntry: StoredSession = {
                    id: Date.now().toString(),
                    date: Date.now(),
                    words: words,
                    label: `${words.length} words`
                };

                // Filter out identical lists to avoid duplicates
                const filtered = prev.filter(s => JSON.stringify(s.words) !== JSON.stringify(words));
                return [newEntry, ...filtered].slice(0, 3);
            });
        }

        // 2. Reset Game State
        setGameState(prev => ({
            ...prev,
            view: 'game',
            allWords: words,
            bag: [...words],
            history: [],
            streak: 0,
            maxStreak: 0,
            currentWord: '',
            isLuckySession: skipHistory, // Mark as lucky if skipping history
        }));
    };

    const resumeSession = () => {
        setGameState(prev => ({ ...prev, view: 'game' }));
    };

    const updateGameState = useCallback((updates: Partial<GameState>) => {
        setGameState(prev => ({ ...prev, ...updates }));
    }, []);

    const handleSessionEnd = () => {
        // Calculate mistakes
        const history = gameState.history;
        const mistakes = new Set<string>();
        history.forEach(h => {
            if (!h.correct) mistakes.add(h.word);
        });

        if (!gameState.isLuckySession) {
            setLastMistakes(Array.from(mistakes));
        }
        setGameState(prev => ({ ...prev, view: 'summary' }));
    };

    const resetGame = () => {
        setGameState(prev => ({
            ...prev,
            view: 'setup',
            allWords: [],
            bag: [],
            history: [],
            currentWord: '',
            streak: 0,
            maxStreak: 0,
            isLuckySession: false
        }));
        localStorage.removeItem('sb_state');
    };

    const restoreSavedSession = () => {
        const savedState = localStorage.getItem('sb_state');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            setGameState(prev => ({
                ...prev,
                ...parsedState,
                view: 'setup',
                currentWord: '', // IMPORTANT: Clear any leftover word from the lucky session
                isLuckySession: false, // Ensure we are back to normal
            }));
        } else {
            // No saved state, just reset to empty setup
            setGameState(prev => ({
                ...prev,
                view: 'setup',
                allWords: [],
                bag: [],
                history: [],
                currentWord: '',
                streak: 0,
                maxStreak: 0,
                isLuckySession: false
            }));
        }
    };

    return {
        config,
        setConfig,
        gameState,
        setGameState, // Exposed for flexibility, but actions are preferred
        recentSessions,
        lastMistakes,
        hydrated,
        actions: {
            startSession,
            resumeSession,
            updateGameState,
            saveCustomDef,
            handleSessionEnd,
            resetGame,
            restoreSavedSession
        }
    };
}
