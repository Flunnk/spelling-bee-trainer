// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import confetti from 'canvas-confetti';
import { SummaryView } from '../components/SummaryView';
vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { reset: vi.fn() }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('invokes the imported confetti and cleans it up under StrictMode', () => {
 const { unmount } = render(<StrictMode><SummaryView history={[{ word: 'apple', correct: true, timestamp: 1 }]} maxStreak={1} allWords={['apple']} lastMistakes={[]} onRestartSession={() => {}} onGoHome={() => {}} /></StrictMode>);
 expect(confetti).toHaveBeenCalledWith(expect.objectContaining({ disableForReducedMotion: true }));
 unmount(); expect(confetti.reset).toHaveBeenCalled();
});
it('shows assisted independently and reviews this summary rather than stale mistakes', () => {
 const restart = vi.fn();
 render(<SummaryView history={[{ word: 'apple', correct: true, status: 'assisted', timestamp: 1 }]} maxStreak={0} allWords={['apple']} lastMistakes={['unrelated']} onRestartSession={restart} onGoHome={() => {}} />);
 expect(screen.getByText('ASSISTED')).toBeTruthy(); expect(screen.queryByText('MISS')).toBeNull();
 fireEvent.click(screen.getByRole('button', { name: 'Mistakes' })); expect(restart).toHaveBeenCalledWith(['apple']);
});
