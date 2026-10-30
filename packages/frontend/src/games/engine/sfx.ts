/**
 * Tiny synthesized sound effects, so the games ship no audio assets.
 * The AudioContext is created lazily on the first sound, which always follows
 * a key press, satisfying the browser's user-gesture rule.
 */
let context: AudioContext | null = null;
let muted = false;

export function getAudioContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

interface Tone {
  frequency: number;
  to?: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
}

export function play(...tones: Tone[]): void {
  if (muted || typeof AudioContext === 'undefined') return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    for (const tone of tones) {
      const start = now + (tone.delay ?? 0);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = tone.type ?? 'square';
      oscillator.frequency.setValueAtTime(tone.frequency, start);
      if (tone.to) {
        oscillator.frequency.exponentialRampToValueAtTime(tone.to, start + tone.duration);
      }
      gain.gain.setValueAtTime(tone.volume ?? 0.06, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + tone.duration + 0.02);
    }
  } catch {
    // Audio is decoration; never let it break a game.
  }
}

export const sfx = {
  blip: () => play({ frequency: 660, to: 990, duration: 0.07 }),
  eat: () => play({ frequency: 520, to: 1040, duration: 0.09, type: 'triangle', volume: 0.08 }),
  bonus: () =>
    play(
      { frequency: 880, duration: 0.08, type: 'triangle' },
      { frequency: 1320, duration: 0.12, type: 'triangle', delay: 0.08 }
    ),
  crash: () => play({ frequency: 220, to: 40, duration: 0.45, type: 'sawtooth', volume: 0.08 }),
  kick: () => play({ frequency: 180, to: 90, duration: 0.08, type: 'triangle', volume: 0.12 }),
  goal: () =>
    play(
      { frequency: 523, duration: 0.12 },
      { frequency: 659, duration: 0.12, delay: 0.12 },
      { frequency: 784, duration: 0.3, delay: 0.24 }
    ),
  jump: () => play({ frequency: 300, to: 760, duration: 0.14, type: 'square', volume: 0.05 }),
  spark: () =>
    play(
      { frequency: 1568, duration: 0.06, type: 'triangle', volume: 0.05 },
      { frequency: 2093, duration: 0.1, type: 'triangle', volume: 0.05, delay: 0.05 }
    ),
  spring: () => play({ frequency: 200, to: 1200, duration: 0.22, type: 'triangle', volume: 0.08 }),
  boost: () => play({ frequency: 400, to: 1600, duration: 0.25, type: 'sawtooth', volume: 0.04 }),
  pop: () => play({ frequency: 900, to: 120, duration: 0.18, type: 'square', volume: 0.06 }),
  hurt: () => play({ frequency: 600, to: 150, duration: 0.35, type: 'sawtooth', volume: 0.07 }),
  charge: () => play({ frequency: 500, to: 1100, duration: 0.1, type: 'sawtooth', volume: 0.04 }),
  clear: () =>
    play(
      { frequency: 523, duration: 0.1, type: 'triangle' },
      { frequency: 659, duration: 0.1, type: 'triangle', delay: 0.1 },
      { frequency: 784, duration: 0.1, type: 'triangle', delay: 0.2 },
      { frequency: 1047, duration: 0.4, type: 'triangle', delay: 0.3 }
    ),
};
