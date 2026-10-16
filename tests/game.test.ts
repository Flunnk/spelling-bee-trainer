import { describe, expect, it } from 'vitest';
import { gameReducer as reduce, initialGame, parseWords, restoreGame, canResume } from '../core/game';
import { alignAttempt } from '../core/diff';
const start = (words = ['apple', 'berry', 'coffee', 'date', 'egg']) => reduce(initialGame, { type: 'start', words, lucky: false });
const answer = (s: ReturnType<typeof start>, text = s.currentWord, timeout = false) => reduce(s, { type: 'answer', answer: text, timeout, timestamp: 1, turn: s.turn });
describe('game rules and storage', () => {
  it('preserves Unicode, phrases, hyphens and apostrophes', () => {
    expect(parseWords("château, fête, don't, ice cream, ß, mañana, cafe\u0301, mother-in-law")).toEqual(['château', 'fête', "don't", 'ice cream', 'ß', 'mañana', 'café', 'mother-in-law']);
    expect(() => parseWords('abc123')).toThrow('abc123');
  });
  it('requeues mistakes after three intervening words without mutation', () => {
    const s = start(); const n = answer(s, 'wrong');
    expect(n.bag).toEqual(['berry', 'coffee', 'date', 'apple', 'egg']);
    expect(s.bag).toEqual(['berry', 'coffee', 'date', 'egg']);
  });
  it('ignores duplicate answer and stale next actions', () => {
    const s = answer(start()); expect(answer(s)).toBe(s);
    const n = reduce(s, { type: 'next', turn: s.turn, loop: false });
    expect(reduce(n, { type: 'next', turn: s.turn, loop: false })).toBe(n);
  });
  it('restarts a one-word loop and resets the turn', () => {
    const s = answer(start(['apple'])); const n = reduce(s, { type: 'next', turn: s.turn, loop: true });
    expect(n.currentWord).toBe('apple'); expect(n.feedback).toBe('idle'); expect(n.turn).toBe(s.turn + 1);
    expect(n.view).toBe('game'); expect(n.history).toHaveLength(1);
  });
  it('finishes normally and cannot resume completed history', () => {
    const s = answer(start(['apple'])); const n = reduce(s, { type: 'next', turn: s.turn, loop: false });
    expect(n.view).toBe('summary'); expect(canResume(n)).toBe(false);
  });
  it('records assisted as correct but requeues it and resets streak', () => {
    const s = answer(reduce(start(['apple']), { type: 'hint' }));
    expect(s.history[0]).toMatchObject({ correct: true, status: 'assisted' });
    expect(s.bag).toEqual(['apple']); expect(s.streak).toBe(0);
  });
  it.each(['idle', 'correct', 'incorrect'] as const)('roundtrips saved %s state without duplicating a word', status => {
    let s = start(); if (status !== 'idle') s = answer(s, status === 'correct' ? 'apple' : 'wrong');
    const restored = restoreGame(JSON.parse(JSON.stringify(s)));
    expect(restored.bag).toEqual(s.bag); expect(restored.currentWord).toBe(s.currentWord); expect(restored.feedback).toBe(s.feedback);
  });
  it('migrates legacy queues and rejects malformed storage', () => {
    expect(restoreGame({ allWords: ['apple'], bag: ['apple'] }).currentWord).toBe('apple');
    expect(restoreGame({ allWords: 12, bag: [null] })).toBe(initialGame);
  });
  it('aligns a missing letter without marking the remaining suffix wrong', () => {
    const diff = alignAttempt('recive', 'receive');
    expect(diff.filter(c => !c.match)).toEqual([{ char: '＿', match: false, missing: true }]);
    expect(diff.slice(-3).every(c => c.match)).toBe(true);
  });
  it('avoids immediate repetition in multi-word Infinite Loop without duplicating words', () => {
    let s = start(['apple', 'berry']);
    s = answer(s, 'wrong'); // apple requeued after berry -> bag: ['berry', 'apple']
    s = reduce(s, { type: 'next', turn: s.turn, loop: true }); // current: 'berry', bag: ['apple']
    s = answer(s, 'berry'); // correct -> bag: ['apple']
    s = reduce(s, { type: 'next', turn: s.turn, loop: true }); // current: 'apple', bag: []
    s = answer(s, 'apple'); // correct -> bag: []
    const looped = reduce(s, { type: 'next', turn: s.turn, loop: true });
    expect(looped.currentWord).toBe('berry');
    expect(looped.bag).toEqual(['apple']);
  });
  it('shifts from bag when saved currentWord is empty and deletes cleared custom notes', () => {
    expect(restoreGame({ allWords: ['apple'], bag: ['apple'], currentWord: '' }).currentWord).toBe('apple');
    expect(restoreGame({ allWords: [], bag: [] })).toBe(initialGame);
    const withDef = reduce(initialGame, { type: 'definition', word: 'apple', definition: 'A fruit' });
    expect(withDef.customDefs.apple).toBe('A fruit');
    const cleared = reduce(withDef, { type: 'definition', word: 'apple', definition: '   ' });
    expect('apple' in cleared.customDefs).toBe(false);
  });
});
