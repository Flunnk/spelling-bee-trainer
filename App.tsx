import React from 'react';
import { SetupView } from './components/SetupView';
import { GameView } from './components/GameView';
import { SummaryView } from './components/SummaryView';
import { useGameSession } from './hooks/useGameSession';

// Global declaration for Confetti
declare global {
  interface Window {
    confetti: any;
  }
}

import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const {
    config,
    setConfig,
    gameState,
    recentSessions,
    lastMistakes,
    hydrated,
    actions
  } = useGameSession();

  if (!hydrated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <ThemeToggle />
      <div className="w-full max-w-xl">
        {gameState.view === 'setup' && (
          <SetupView
            config={config}
            setConfig={setConfig}
            onStart={actions.startSession}
            onResume={actions.resumeSession}
            hasSavedState={gameState.history.length > 0 || gameState.bag.length > 0}
            recentSessions={recentSessions}
            lastMistakes={lastMistakes}
          />
        )}

        {gameState.view === 'game' && (
          <GameView
            gameState={gameState}
            config={config}
            onUpdateState={actions.updateGameState}
            onSaveDef={actions.saveCustomDef}
            onFinish={actions.handleSessionEnd}
            onExit={() => actions.updateGameState({ view: 'setup' })}
          />
        )}

        {gameState.view === 'summary' && (
          <SummaryView
            history={gameState.history}
            maxStreak={gameState.maxStreak}
            allWords={gameState.allWords}
            lastMistakes={lastMistakes}
            onRestartSession={actions.startSession}
            onGoHome={actions.resetGame}
          />
        )}
      </div>
    </div>
  );
}