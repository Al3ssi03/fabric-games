/**
 * Synthesized chiptune loops, so the app ships no audio assets.
 * Playback starts on the first user gesture to satisfy browser autoplay rules,
 * and honours the shared mute flag from sfx.ts.
 */
import { getAudioContext, isMuted } from './sfx';

export type Track = 'lobby' | 'game';

const NOTE = (semitonesFromA4: number) => 440 * 2 ** (semitonesFromA4 / 12);

// Semitones relative to A4; null is a rest. One entry per eighth note.
const TRACKS: Record<Track, { bpm: number; lead: (number | null)[]; bass: number[] }> = {
  lobby: {
    bpm: 132,
    lead: [
      0, null, 3, null, 7, null, 3, null, 5, null, 8, null, 12, null, 8, null, 7, null, 10, null,
      14, null, 10, null, 12, 10, 7, null, 3, null, null, null,
    ],
    bass: [-24, -24, -19, -19, -22, -22, -17, -17],
  },
  game: {
    bpm: 156,
    lead: [
      7, 7, null, 7, 10, null, 7, null, 5, 5, null, 5, 8, null, 5, null, 3, 3, null, 3, 7, null, 3,
      null, 5, 7, 8, 7, 5, 3, 2, null,
    ],
    bass: [-17, -17, -17, -17, -20, -20, -20, -20],
  },
};

const VOLUME = 0.025;
const LOOKAHEAD = 0.3;

let current: Track | null = null;
let wanted: Track | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextTime = 0;
let unlocked = false;

function tone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  volume: number
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function schedule() {
  if (!current) return;
  const context = getAudioContext();
  if (!context) return;
  const track = TRACKS[current];
  const eighth = 60 / track.bpm / 2;
  if (nextTime < context.currentTime) nextTime = context.currentTime + 0.05;

  while (nextTime < context.currentTime + LOOKAHEAD) {
    if (!isMuted()) {
      const lead = track.lead[step % track.lead.length];
      if (lead !== null) tone(context, NOTE(lead), nextTime, eighth * 0.9, 'square', VOLUME);
      if (step % 4 === 0) {
        const bass = track.bass[(step / 4) % track.bass.length];
        tone(context, NOTE(bass), nextTime, eighth * 3.6, 'triangle', VOLUME * 2);
      }
    }
    nextTime += eighth;
    step += 1;
  }
}

function begin(track: Track) {
  stop();
  current = track;
  step = 0;
  nextTime = 0;
  schedule();
  timer = setInterval(schedule, 100);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  current = null;
}

function unlock() {
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
  unlocked = true;
  if (wanted && current !== wanted) begin(wanted);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export function playMusic(track: Track | null): void {
  wanted = track;
  if (!track) stop();
  else if (unlocked && current !== track) begin(track);
}
