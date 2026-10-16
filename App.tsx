import React from 'react';
import { SetupView } from './components/SetupView';
import { GameView } from './components/GameView';
import { SummaryView } from './components/SummaryView';
import { useGameSession } from './hooks/useGameSession';
import { orderWords } from './core/game';
import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const {
    config,
    setConfig,
    gameState,
    recentSessions,
    lastMistakes,
    hydrated,
    hasSavedState,
    storageError,
    dispatch,
    actions,
  } = useGameSession();

  if (!hydrated) return null;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 sm:p-6 font-sans bg-amber-50/40 dark:bg-slate-950 bg-bee-pattern transition-colors duration-500">
      {/* Ambient background glow orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 -left-32 w-96 h-96 rounded-full bg-amber-400/20 dark:bg-amber-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/20 dark:bg-indigo-500/15 blur-3xl"
      />
      <ThemeToggle />
      {storageError && (
        <p
          role="alert"
          className="fixed bottom-3 left-3 right-3 max-w-lg mx-auto z-50 rounded-2xl border-2 border-red-300 dark:border-red-800 bg-red-50/95 dark:bg-red-950/95 backdrop-blur-md p-3.5 text-sm font-bold text-red-800 dark:text-red-200 shadow-xl animate-pop"
        >
          <i className="fas fa-triangle-exclamation mr-2"></i>
          {storageError}
        </p>
      )}
      <div className="w-full max-w-xl relative z-10">
        {gameState.view === 'setup' && (
          <SetupView
            config={config}
            setConfig={setConfig}
            onStart={actions.startSession}
            onResume={actions.resumeSession}
            hasSavedState={hasSavedState}
            recentSessions={recentSessions}
            lastMistakes={lastMistakes}
          />
        )}

        {gameState.view === 'game' && (
          <GameView
            gameState={gameState}
            config={config}
            dispatch={dispatch}
            onSaveDef={actions.saveCustomDef}
            onFinish={actions.handleSessionEnd}
            onExit={actions.exit}
          />
        )}

        {gameState.view === 'summary' && (
          <SummaryView
            history={gameState.history}
            maxStreak={gameState.maxStreak}
            allWords={gameState.allWords}
            lastMistakes={lastMistakes}
            onRestartSession={words =>
              actions.startSession(
                orderWords(words, config.wordOrder),
                !!gameState.isLuckySession
              )
            }
            onGoHome={actions.resetGame}
          />
        )}
      </div>
    </div>
  );
}