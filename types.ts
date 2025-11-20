export interface WordHistory {
  word: string;
  correct: boolean;
  timestamp: number;
}

export interface AppConfig {
  timerEnabled: boolean;
  loopEnabled: boolean;
  elevenLabsKey: string;
  voiceId: string;
  wordOrder: 'random' | 'alphabetical' | 'inverted' | 'normal';
}

export interface StoredSession {
  id: string; // timestamp
  date: number;
  words: string[];
  label?: string; // e.g. "10 words"
}

export interface GameState {
  view: 'setup' | 'game' | 'summary';
  allWords: string[];
  bag: string[];
  history: WordHistory[];
  currentWord: string;
  streak: number;
  maxStreak: number;
  customDefs: Record<string, string>;
}

export interface DictionaryEntry {
  word: string;
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
}

export type FeedbackStatus = 'idle' | 'correct' | 'incorrect' | 'assisted' | 'timeout';