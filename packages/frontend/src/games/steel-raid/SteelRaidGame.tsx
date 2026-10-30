import { useEffect, useRef } from 'react';

import { setupCanvas } from '../engine/canvas';
import { Keyboard } from '../engine/input';
import { startLoop } from '../engine/loop';
import { drawOverlay } from '../engine/overlay';
import { play, sfx } from '../engine/sfx';
import type { GameProps } from '../types';
import { HEIGHT, WIDTH, drawFrame } from './render';
import { createMission, step, type Input, type SteelEvent, type SteelState } from './steel.engine';

const KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp',
  'KeyA', 'KeyD', 'KeyS', 'KeyW',
  'Space', 'KeyZ', 'KeyX', 'KeyC', 'KeyJ', 'KeyK', 'KeyL',
  'Enter', 'KeyP', 'Escape',
]);
const FIRE_KEYS = ['KeyX', 'KeyJ'];
const JUMP_KEYS = ['Space', 'KeyZ', 'KeyK'];
const BOMB_KEYS = ['KeyC', 'KeyL'];

const SOUNDS: Partial<Record<SteelEvent, () => void>> = {
  shot: () => play({ frequency: 900, to: 300, duration: 0.06, type: 'square', volume: 0.04 }),
  heavy: () => play({ frequency: 700, to: 180, duration: 0.05, type: 'sawtooth', volume: 0.03 }),
  enemyShot: () => play({ frequency: 500, to: 200, duration: 0.07, type: 'square', volume: 0.025 }),
  throw: () => play({ frequency: 300, to: 500, duration: 0.1, type: 'triangle', volume: 0.04 }),
  explode: () => play({ frequency: 160, to: 30, duration: 0.4, type: 'sawtooth', volume: 0.09 }),
  hit: () => play({ frequency: 1200, duration: 0.03, type: 'square', volume: 0.03 }),
  kill: sfx.pop,
  knife: () => play({ frequency: 2000, to: 600, duration: 0.08, type: 'triangle', volume: 0.05 }),
  pickup: sfx.bonus,
  free: sfx.goal,
  die: sfx.hurt,
  respawn: sfx.spark,
  boss: sfx.charge,
  win: sfx.clear,
  gameover: sfx.crash,
};

type Phase = 'ready' | 'playing' | 'paused' | 'over';

export function SteelRaidGame({ onFinish }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef(onFinish);
  useEffect(() => {
    finishRef.current = onFinish;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, WIDTH, HEIGHT);
    const keyboard = new Keyboard(KEYS);
    const detach = keyboard.attach();

    let state: SteelState = createMission();
    let phase: Phase = 'ready';
    let clock = 0;

    const update = (dt: number) => {
      clock += dt;
      if (phase === 'ready' || phase === 'over') {
        if (keyboard.consume('Enter')) {
          state = createMission();
          phase = 'playing';
        }
        keyboard.endFrame();
        return;
      }
      if (keyboard.consume('KeyP', 'Escape')) {
        phase = phase === 'paused' ? 'playing' : 'paused';
      }
      if (phase === 'paused') {
        if (keyboard.consume('Enter')) phase = 'playing';
        keyboard.endFrame();
        return;
      }

      const input: Input = {
        left: keyboard.pressed('ArrowLeft', 'KeyA'),
        right: keyboard.pressed('ArrowRight', 'KeyD'),
        up: keyboard.pressed('ArrowUp', 'KeyW'),
        down: keyboard.pressed('ArrowDown', 'KeyS'),
        jumpPressed: keyboard.consume(...JUMP_KEYS),
        fireHeld: keyboard.pressed(...FIRE_KEYS),
        firePressed: keyboard.consume(...FIRE_KEYS),
        grenadePressed: keyboard.consume(...BOMB_KEYS),
      };
      step(state, input, dt);
      for (const event of state.events) SOUNDS[event]?.();
      keyboard.endFrame();

      if (state.over) {
        phase = 'over';
        finishRef.current({
          points: state.score,
          summary: state.won ? 'Mission complete' : 'Mission failed',
        });
      }
    };

    const draw = () => {
      if (!ctx) return;
      drawFrame(ctx, state, clock);
      if (phase === 'ready') {
        drawOverlay(ctx, WIDTH, HEIGHT, 'STEEL RAID', [
          '← → move · ↑ aim up · ↓ crouch · SPACE jump',
          'X fire (knife up close) · C grenade',
          'Free the prisoners for weapons and bombs',
          'Press ENTER to start the mission',
        ], '#ffb347');
      } else if (phase === 'paused') {
        drawOverlay(ctx, WIDTH, HEIGHT, 'PAUSED', ['Press P to resume'], '#ffb347');
      } else if (phase === 'over') {
        drawOverlay(ctx, WIDTH, HEIGHT, state.won ? 'MISSION COMPLETE' : 'GAME OVER', [
          `Final score ${state.score}`,
          'Press ENTER to deploy again',
        ], state.won ? '#ffb347' : '#ff4f6d');
      }
    };

    const stop = startLoop(update, draw);
    canvas.focus();
    return () => {
      stop();
      detach();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      aria-label="Steel Raid battlefield"
      className="block aspect-[16/9] w-full rounded-xl outline-none"
    />
  );
}
