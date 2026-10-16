// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioService } from '../services/audioService';
let requests = 0;
let plays: number[] = [];
let utterances: string[] = [];
beforeEach(() => {
  requests = 0; plays = []; utterances = [];
  vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; lang = ''; rate = 1; onend?: () => void; constructor(text: string) { this.text = text; } });
  vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: (u: { lang: string; onend: () => void }) => { utterances.push(u.lang); u.onend(); } });
  vi.stubGlobal('Audio', class { playbackRate = 1; pause() {} async play() { plays.push(this.playbackRate); } });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.stubGlobal('fetch', vi.fn(async () => { requests++; return { ok: true, blob: async () => new Blob(['audio']) }; }));
});
afterEach(() => { AudioService.stop(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('speech', () => {
  it('reuses one recording at normal and slow playback rates', async () => {
    await AudioService.speak('apple', 'voice', 'cache-test', 1);
    await AudioService.speak('apple', 'voice', 'cache-test', 0.5);
    expect(requests).toBe(1); expect(plays).toEqual([1, 0.5]);
  });
  it('shares an in-flight recording and only plays the latest request', async () => {
    await Promise.all([AudioService.speak('berry', 'voice', 'concurrent-test', 1), AudioService.speak('berry', 'voice', 'concurrent-test', 0.5)]);
    expect(requests).toBe(1); expect(plays).toEqual([0.5]);
  });
  it('reports a failed ElevenLabs request and uses the selected browser language', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const message = await AudioService.speak('château', 'voice', 'failure-test', 1, 'fr-FR');
    expect(message).toContain('ElevenLabs'); expect(utterances).toEqual(['fr-FR']);
  });
  it('uses browser voice without a key or with a whitespace-only key and never fetches', async () => {
    await AudioService.speak('hello', 'voice', '', 1, 'en-US');
    await AudioService.speak('world', 'voice', '   ', 1, 'en-US');
    expect(requests).toBe(0); expect(utterances).toEqual(['en-US', 'en-US']);
  });
  it('prevents stale fetched audio from playing after exit', async () => {
    let finish: (value: unknown) => void = () => {};
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { finish = resolve; })));
    const request = AudioService.speak('late', 'voice', 'cancel-test');
    AudioService.stop(); finish({ ok: true, blob: async () => new Blob(['audio']) });
    await request; expect(plays).toHaveLength(0);
  });
});
