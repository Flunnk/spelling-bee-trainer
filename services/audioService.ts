export class AudioService {
  private static ctx: AudioContext | null = null;
  private static audioCache = new Map<string, string>();
  private static pending = new Map<string, Promise<string>>();
  private static currentAudio: HTMLAudioElement | null = null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static currentSpeakId = 0;
  private static finishSpeech: (() => void) | null = null;
  private static cacheCredential = '';

  private static getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  static resume() {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    } catch {
      /* Speech and spelling remain usable when Web Audio is unavailable. */
    }
  }

  static stop() {
    this.currentSpeakId++;
    this.currentAudio?.pause();
    this.currentAudio = null;
    this.currentUtterance = null;
    this.finishSpeech?.();
    this.finishSpeech = null;
    window.speechSynthesis?.cancel();
  }

  static playEffect(type: 'correct' | 'wrong') {
    if (!window.AudioContext && !(window as any).webkitAudioContext) return;
    try {
      this.resume();
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };

      const t = ctx.currentTime;

      if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, t); // C5
        osc.frequency.setValueAtTime(659.25, t + 0.07); // E5
        osc.frequency.setValueAtTime(783.99, t + 0.14); // G5
        osc.frequency.exponentialRampToValueAtTime(1046.5, t + 0.24); // C6
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.42);
        osc.start(t);
        osc.stop(t + 0.42);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.linearRampToValueAtTime(95, t + 0.25);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.32);
        osc.start(t);
        osc.stop(t + 0.32);
      }
    } catch {
      /* Sound effects are optional when Web Audio fails. */
    }
  }

  static async speak(
    text: string,
    voiceId: string,
    apiKey: string,
    rate = 1,
    language = 'en-US'
  ): Promise<string | undefined> {
    this.stop();
    const myId = this.currentSpeakId;
    const cleanKey = apiKey.trim();

    const playBrowser = async (): Promise<string | undefined> => {
      if (myId !== this.currentSpeakId) return;
      if (!window.speechSynthesis) return 'Speech is unavailable in this browser.';
      return new Promise(resolve => {
        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance;
        utterance.lang = language;
        utterance.rate = rate;
        const finish = (message?: string) => {
          clearTimeout(watchdog);
          if (this.currentUtterance === utterance) this.currentUtterance = null;
          if (this.finishSpeech === cancel) this.finishSpeech = null;
          resolve(message);
        };
        const cancel = () => finish();
        const watchdog = window.setTimeout(() => {
          finish('Speech took too long. Press Listen to try again.');
          if (myId === this.currentSpeakId) window.speechSynthesis.cancel();
        }, 30000);
        this.finishSpeech = cancel;
        utterance.onend = () => finish();
        utterance.onerror = () =>
          finish('Browser speech could not play. Check installed voices and audio settings.');
        window.speechSynthesis.resume?.();
        window.speechSynthesis.speak(utterance);
      });
    };

    if (!cleanKey || voiceId === 'browser') return playBrowser();

    if (cleanKey !== this.cacheCredential) {
      this.audioCache.forEach(url => URL.revokeObjectURL(url));
      this.audioCache.clear();
      this.pending.clear();
      this.cacheCredential = cleanKey;
    }

    const key = JSON.stringify([text, voiceId, language]);
    try {
      let url = this.audioCache.get(key);
      if (url) {
        this.audioCache.delete(key);
        this.audioCache.set(key, url);
      } else {
        let pending = this.pending.get(key);
        if (!pending) {
          pending = (async () => {
            const response = await fetch(
              `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
              {
                method: 'POST',
                signal: AbortSignal.timeout(15000),
                headers: {
                  'xi-api-key': cleanKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text,
                  model_id: 'eleven_multilingual_v2',
                }),
              }
            );
            if (!response.ok) throw new Error('Speech request failed');
            const blob = await response.blob();
            if (cleanKey !== this.cacheCredential) throw new Error('Voice settings changed');
            const objectUrl = URL.createObjectURL(blob);
            this.audioCache.set(key, objectUrl);
            if (this.audioCache.size > 100) {
              const oldest = this.audioCache.keys().next().value!;
              URL.revokeObjectURL(this.audioCache.get(oldest)!);
              this.audioCache.delete(oldest);
            }
            return objectUrl;
          })();
          this.pending.set(key, pending);
        }
        try {
          url = await pending;
        } finally {
          if (this.pending.get(key) === pending) this.pending.delete(key);
        }
      }
      if (myId !== this.currentSpeakId) return;
      const audio = new Audio(url);
      this.currentAudio = audio;
      audio.playbackRate = rate;
      if ('preservesPitch' in audio) {
        audio.preservesPitch = true;
      }
      await audio.play();
      return;
    } catch {
      if (myId !== this.currentSpeakId) return;
      const message = await playBrowser();
      return (
        message ||
        'ElevenLabs could not play audio. Using your browser voice; check your key, quota or connection.'
      );
    }
  }
}