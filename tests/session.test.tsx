// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameSession, DEFAULT_CONFIG } from '../hooks/useGameSession';
import { GameView } from '../components/GameView';
import { gameReducer, initialGame } from '../core/game';
import { AudioService } from '../services/audioService';
import { fetchDefinition } from '../services/dictionaryService';
vi.mock('../services/audioService', () => ({ AudioService: { resume: vi.fn(), stop: vi.fn(), speak: vi.fn().mockResolvedValue(undefined), playEffect: vi.fn() } }));
vi.mock('../services/dictionaryService', () => ({ fetchDefinition: vi.fn().mockResolvedValue(null) }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });
beforeEach(() => localStorage.clear());
const wrapper = ({ children }: { children: React.ReactNode }) => <StrictMode>{children}</StrictMode>;

describe('session integration', () => {
  it('protects normal session through Lucky finish, repeat, exit and Home', () => {
    const { result } = renderHook(useGameSession, { wrapper });
    act(() => result.current.actions.startSession(['saved', 'next']));
    act(() => result.current.actions.exit());
    const original = localStorage.getItem('sb_state');
    act(() => result.current.actions.startSession(['lucky'], true));
    act(() => result.current.actions.handleSessionEnd());
    expect(localStorage.getItem('sb_state')).toBe(original);
    act(() => result.current.actions.startSession(['again'], true));
    act(() => result.current.actions.exit());
    expect(result.current.gameState.currentWord).toBe('saved');
    act(() => result.current.actions.startSession(['lucky'], true));
    act(() => result.current.actions.handleSessionEnd());
    act(() => result.current.actions.resetGame());
    expect(result.current.gameState.currentWord).toBe('saved');
    expect(result.current.hasSavedState).toBe(true);
  });
  it('persists exact answered state through save, unmount and reload', () => {
    const first = renderHook(useGameSession, { wrapper });
    act(() => first.result.current.actions.startSession(['apple', 'berry']));
    act(() => first.result.current.dispatch({ type: 'answer', answer: 'wrong', timeout: false, timestamp: 1, turn: first.result.current.gameState.turn }));
    act(() => first.result.current.actions.exit());
    first.unmount();
    const second = renderHook(useGameSession, { wrapper });
    expect(second.result.current.gameState.bag).toEqual(['berry', 'apple']);
    expect(second.result.current.gameState.feedback).toBe('incorrect');
    act(() => second.result.current.actions.resumeSession());
    expect(second.result.current.gameState.history).toHaveLength(1);
  });
  it('removes finished saves and updates Lucky mistakes from current history', () => {
    const { result } = renderHook(useGameSession, { wrapper });
    act(() => result.current.actions.startSession(['apple']));
    act(() => result.current.actions.handleSessionEnd());
    expect(localStorage.getItem('sb_state')).toBeNull();
    act(() => result.current.actions.resetGame());
    expect(result.current.hasSavedState).toBe(false);
    act(() => result.current.actions.startSession(['lucky'], true));
    act(() => result.current.dispatch({ type: 'answer', answer: 'wrong', timeout: false, timestamp: 1, turn: result.current.gameState.turn }));
    act(() => result.current.actions.handleSessionEnd());
    expect(result.current.lastMistakes).toEqual(['lucky']);
  });
  it('survives malformed JSON and persists the API key in localStorage', () => {
    localStorage.setItem('sb_state', '{broken');
    localStorage.setItem('sb_config', JSON.stringify({ elevenLabsKey: 'test-secret' }));
    const { result } = renderHook(useGameSession, { wrapper });
    expect(result.current.storageError).toBeTruthy();
    expect(result.current.config.elevenLabsKey).toBe('test-secret');
    expect(localStorage.getItem('sb_config')).toContain('test-secret');
  });
});

function Harness({ words = ['apple'], timer = true }: { words?: string[]; timer?: boolean }) {
  const [gameState, dispatch] = React.useReducer(gameReducer, gameReducer(initialGame, { type: 'start', words, lucky: false }));
  return <><output data-testid="state">{JSON.stringify(gameState)}</output><GameView gameState={gameState} dispatch={dispatch} config={{ ...DEFAULT_CONFIG, timerEnabled: timer, timerDuration: 5, loopEnabled: true }} onSaveDef={() => {}} onFinish={() => {}} onExit={() => {}} /></>;
}
const state = () => JSON.parse(screen.getByTestId('state').textContent!);
describe('game UI under StrictMode', () => {
  it('times out the first real word exactly once, then restarts the timer on the same word', async () => {
    vi.useFakeTimers(); render(<Harness />, { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(5100); });
    expect(state().history).toHaveLength(1); expect(state().history[0].word).toBe('apple');
    expect(state().feedback).toBe('timeout');
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(5100); });
    expect(state().history).toHaveLength(2); expect(state().history[1].word).toBe('apple');
  });
  it('an empty Check does not stop the timer; typing never resets the deadline', async () => {
    vi.useFakeTimers(); render(<Harness />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    fireEvent.change(screen.getByLabelText('Your spelling'), { target: { value: 'app' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(state().history).toHaveLength(1); expect(state().feedback).toBe('timeout');
  });
  it('shows Loading, masks the target word while idle, and ignores a stale dictionary response', async () => {
    let resolveApple: (value: any) => void = () => {};
    vi.mocked(fetchDefinition).mockImplementation(word => word === 'apple' ? new Promise(resolve => { resolveApple = resolve; }) : Promise.resolve({ word: 'berry', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'Berry definition' }] }] }));
    render(<Harness words={['apple', 'berry']} timer={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Def' })); expect(screen.getByText('Loading...')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Your spelling'), { target: { value: 'apple' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await act(async () => { resolveApple({ word: 'apple', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'Stale apple' }] }] }); });
    fireEvent.click(screen.getByRole('button', { name: 'Def' }));
    expect(screen.getByText('_____ definition')).toBeTruthy(); expect(screen.queryByText('Stale apple')).toBeNull();
    fireEvent.change(screen.getByLabelText('Your spelling'), { target: { value: 'berry' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText('Berry definition')).toBeTruthy();
  });
  it('handles Object.prototype words like constructor without crashing', async () => {
    vi.mocked(fetchDefinition).mockResolvedValue({ word: 'constructor', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A builder or creator.' }] }] });
    render(<Harness words={['constructor']} timer={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Def' }));
    expect(await screen.findByText('A builder or creator.')).toBeTruthy();
  });
});
