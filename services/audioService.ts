export class AudioService {
  private static ctx: AudioContext | null = null;
  private static audioCache: Record<string, string> = {}; // Cache URLs

  private static getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  static resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  static playEffect(type: 'correct' | 'wrong') {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = ctx.currentTime;

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, t); // C5
      osc.frequency.exponentialRampToValueAtTime(1046, t + 0.1); // C6
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.linearRampToValueAtTime(100, t + 0.2);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  }

  static async speak(text: string, voiceId: string, apiKey: string, rate: number = 1.0): Promise<void> {
    // Browser Fallback or "Robot" mode
    const playBrowser = () => {
      return new Promise<void>((resolve) => {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = /[áéíóúñ]/.test(text) ? 'es-ES' : 'en-US';
        u.rate = rate;
        u.onend = () => resolve();
        u.onerror = () => resolve(); // Resolve anyway to not block UI
        window.speechSynthesis.speak(u);
      });
    };

    if (!apiKey || voiceId === 'browser') {
      return playBrowser();
    }

    // Check Cache
    const cacheKey = `${text}-${voiceId}-${rate}`;
    if (this.audioCache[cacheKey]) {
      const audio = new Audio(this.audioCache[cacheKey]);
      audio.playbackRate = rate;
      await audio.play();
      return;
    }

    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_turbo_v2_5",
        }),
      });

      if (!res.ok) throw new Error('ElevenLabs API Error');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      this.audioCache[cacheKey] = url;

      const audio = new Audio(url);
      audio.playbackRate = rate;
      await audio.play();
    } catch (e) {
      console.warn("TTS Failed, falling back to browser", e);
      return playBrowser();
    }
  }
}