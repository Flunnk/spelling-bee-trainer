import type { AppConfig, GameState, FeedbackStatus, WordHistory } from '../types';

export const initialGame: GameState = {
  view: 'setup',
  allWords: [],
  bag: [],
  history: [],
  currentWord: '',
  streak: 0,
  maxStreak: 0,
  customDefs: {},
  isLuckySession: false,
  feedback: 'idle',
  answer: '',
  hintUsed: false,
  turn: 0,
};

export const normalizeAnswer = (word: string) =>
  word
    .normalize('NFC')
    .trim()
    .replace(/[\u2019\u2018\u02BC]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();

export function parseWords(raw: string): string[] {
  const words = raw
    .split(/[\n,]+/)
    .map(w => w.normalize('NFC').trim().replace(/\s+/g, ' '))
    .filter(Boolean);

  const invalid = words.find(
    w => w.length > 100 || !/^[\p{L}\p{M}]+(?:[ '\u2019\u2018-][\p{L}\p{M}]+)*$/u.test(w)
  );
  if (invalid) {
    throw new Error(
      `Please check this entry: “${invalid.slice(0, 50)}”. Use letters, spaces, apostrophes or hyphens; separate entries with commas or new lines.`
    );
  }

  const seen = new Set<string>();
  return words.filter(w => {
    const key = normalizeAnswer(w);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function orderWords(words: string[], order: AppConfig['wordOrder'] = 'random'): string[] {
  const copy = [...words];
  if (order === 'random') {
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
  } else if (order === 'alphabetical') {
    copy.sort((a, b) => a.localeCompare(b));
  } else if (order === 'inverted') {
    copy.reverse();
  }
  return copy;
}

export function calculateAccuracy(history: WordHistory[]): number {
  if (history.length === 0) return 0;
  const score = history.reduce((sum, h) => {
    if (h.status === 'assisted') return sum + 0.5;
    return sum + (h.correct ? 1 : 0);
  }, 0);
  return Math.round((score / history.length) * 100);
}

export const mistakesFrom = (history: WordHistory[]) => [
  ...new Set(history.filter(h => !h.correct || h.status === 'assisted').map(h => h.word)),
];

export const canResume = (s: GameState) =>
  s.view !== 'summary' && !!(s.currentWord || s.bag.length);

export type GameAction =
  | { type: 'start'; words: string[]; lucky: boolean }
  | { type: 'restore'; state: GameState }
  | { type: 'resume' | 'exit' | 'finish' | 'hint' }
  | { type: 'answer'; answer: string; timeout: boolean; timestamp: number; turn: number }
  | { type: 'next'; loop: boolean; turn: number }
  | { type: 'definition'; word: string; definition: string };

export function gameReducer(s: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'restore':
      return action.state;
    case 'start': {
      if (!action.words.length) return s;
      return {
        ...initialGame,
        customDefs: s.customDefs,
        view: 'game',
        allWords: [...action.words],
        currentWord: action.words[0],
        bag: action.words.slice(1),
        isLuckySession: action.lucky,
        turn: s.turn + 1,
      };
    }
    case 'resume':
      return canResume(s) ? { ...s, view: 'game' } : s;
    case 'exit':
      return { ...s, view: 'setup' };
    case 'finish':
      return { ...s, view: 'summary', currentWord: '', bag: [] };
    case 'definition': {
      if (!action.word || action.word === '__proto__' || action.word === 'prototype') return s;
      const trimmed = action.definition.trim();
      const customDefs = { ...s.customDefs };
      if (trimmed) {
        customDefs[action.word] = trimmed;
      } else {
        delete customDefs[action.word];
      }
      return { ...s, customDefs };
    }
    case 'hint':
      return s.feedback === 'idle' ? { ...s, hintUsed: true, streak: 0 } : s;
    case 'answer': {
      if (s.view !== 'game' || !s.currentWord || s.feedback !== 'idle' || action.turn !== s.turn) {
        return s;
      }
      if (!action.timeout && !action.answer.trim()) return s;
      const correct =
        !action.timeout && normalizeAnswer(action.answer) === normalizeAnswer(s.currentWord);
      const status: FeedbackStatus = action.timeout
        ? 'timeout'
        : correct
          ? s.hintUsed
            ? 'assisted'
            : 'correct'
          : 'incorrect';
      const bag = [...s.bag];
      if (status !== 'correct') {
        bag.splice(Math.min(bag.length, 3), 0, s.currentWord);
      }
      const streak = status === 'correct' ? s.streak + 1 : 0;
      return {
        ...s,
        bag,
        streak,
        maxStreak: Math.max(streak, s.maxStreak),
        feedback: status,
        answer: action.answer,
        history: [
          ...s.history,
          { word: s.currentWord, correct, status, timestamp: action.timestamp },
        ],
      };
    }
    case 'next': {
      if (s.feedback === 'idle' || action.turn !== s.turn) return s;
      let bag = s.bag.length ? [...s.bag] : action.loop ? [...s.allWords] : [];

      // Avoid immediate back-to-back repetition in Infinite Loop when multiple words exist
      if (action.loop && bag.length > 0 && bag[0] === s.currentWord && s.allWords.length > 1) {
        const rest = bag.length > 1 ? bag.slice(1) : s.allWords.filter(w => w !== s.currentWord);
        bag = [...rest.slice(0, 3), s.currentWord, ...rest.slice(3)];
      }

      if (!bag.length) return { ...s, view: 'summary', currentWord: '', bag: [] };
      return {
        ...s,
        currentWord: bag[0],
        bag: bag.slice(1),
        feedback: 'idle',
        answer: '',
        hintUsed: false,
        turn: s.turn + 1,
      };
    }
  }
}

export function restoreGame(value: unknown): GameState {
  if (!value || typeof value !== 'object') return initialGame;
  const p = value as Partial<GameState>;
  const validWords = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every(w => typeof w === 'string' && !!w.trim());
  if (!validWords(p.allWords) || !p.allWords.length || !validWords(p.bag) || p.view === 'summary') {
    return initialGame;
  }
  const bag = [...p.bag];
  const currentWord =
    typeof p.currentWord === 'string' && p.currentWord.trim()
      ? p.currentWord.trim()
      : bag.shift() || '';
  if (!currentWord && !bag.length) return initialGame;
  const statuses: FeedbackStatus[] = ['idle', 'correct', 'assisted', 'incorrect', 'timeout'];
  const feedback = p.feedback && statuses.includes(p.feedback) ? p.feedback : 'idle';
  return {
    ...initialGame,
    allWords: p.allWords,
    bag,
    currentWord,
    feedback,
    answer: typeof p.answer === 'string' ? p.answer : '',
    hintUsed: p.hintUsed === true,
    history: Array.isArray(p.history)
      ? p.history
          .filter(
            h =>
              h &&
              typeof h.word === 'string' &&
              !!h.word.trim() &&
              typeof h.correct === 'boolean' &&
              Number.isFinite(h.timestamp)
          )
          .map(h => ({
            word: h.word,
            correct: h.correct,
            timestamp: h.timestamp,
            ...(h.status && statuses.includes(h.status) ? { status: h.status } : {}),
          }))
      : [],
    streak: Number.isFinite(p.streak) && p.streak! >= 0 ? p.streak! : 0,
    maxStreak: Number.isFinite(p.maxStreak) && p.maxStreak! >= 0 ? p.maxStreak! : 0,
    turn: Number.isFinite(p.turn) && p.turn! >= 0 ? p.turn! : 0,
  };
}