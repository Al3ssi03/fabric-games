import { useEffect, useRef } from 'react';

import { setupCanvas } from '../engine/canvas';
import { Keyboard } from '../engine/input';
import { startLoop } from '../engine/loop';
import { drawOverlay } from '../engine/overlay';
import { sfx } from '../engine/sfx';
import type { GameProps } from '../types';
import { createRun, poseOf, step, type BoltEvent, type BoltState, type Input } from './bolt.engine';
import { HEIGHT, WIDTH, drawFrame, updateCamera, type Camera } from './render';

const KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp',
  'KeyA', 'KeyD', 'KeyS', 'KeyW',
  'Space', 'KeyZ', 'KeyX', 'KeyK', 'Enter', 'KeyP', 'Escape',
]);
const JUMP_KEYS = ['Space', 'KeyZ', 'KeyX', 'KeyK', 'ArrowUp', 'KeyW'];

const SOUNDS: Partial<Record<BoltEvent, () => void>> = {
  jump: sfx.jump,
  spark: sfx.spark,
  spring: sfx.spring,
  boost: sfx.boost,
  pop: sfx.pop,
  hurt: sfx.hurt,
  die: sfx.crash,
  charge: sfx.charge,
  dash: sfx.boost,
  checkpoint: sfx.bonus,
  clear: sfx.clear,
  life: sfx.goal,
  win: sfx.clear,
};

type Phase = 'ready' | 'playing' | 'paused' | 'over';

export function BoltRushGame({ onFinish }: GameProps) {
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

    let state: BoltState = createRun();
    let phase: Phase = 'ready';
    const camera: Camera = { x: 0, y: state.hero.y - HEIGHT * 0.6 };
    let clock = 0;
    let input: Input = { left: false, right: false, down: false, jumpHeld: false, jumpPressed: false };

    const update = (dt: number) => {
      clock += dt;
      if (phase === 'ready' || phase === 'over') {
        if (keyboard.consume('Enter')) {
          state = createRun();
          camera.x = 0;
          camera.y = state.hero.y - HEIGHT * 0.6;
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

      input = {
        left: keyboard.pressed('ArrowLeft', 'KeyA'),
        right: keyboard.pressed('ArrowRight', 'KeyD'),
        down: keyboard.pressed('ArrowDown', 'KeyS'),
        jumpHeld: keyboard.pressed(...JUMP_KEYS),
        jumpPressed: keyboard.consume(...JUMP_KEYS),
      };
      step(state, input, dt);
      updateCamera(camera, state, dt);
      for (const event of state.events) SOUNDS[event]?.();
      keyboard.endFrame();

      if (state.over) {
        phase = 'over';
        finishRef.current({
          points: state.score,
          summary: state.won
            ? `All zones cleared in ${Math.round(state.time)}s on the last zone`
            : `Reached zone ${state.zone + 1}`,
        });
      }
    };

    const draw = () => {
      if (!ctx) return;
      drawFrame(ctx, state, camera, poseOf(state, input), clock);
      const accent = state.level.palette.accent;
      if (phase === 'ready') {
        drawOverlay(ctx, WIDTH, HEIGHT, 'BOLT RUSH', [
          '← → run · ↓ roll · SPACE jump',
          'Stopped? Hold ↓ and tap SPACE to charge a dash',
          'Collect sparks — they shield you from one hit',
          'Press ENTER to start',
        ], accent);
      } else if (phase === 'paused') {
        drawOverlay(ctx, WIDTH, HEIGHT, 'PAUSED', ['Press P to resume'], accent);
      } else if (phase === 'over') {
        drawOverlay(ctx, WIDTH, HEIGHT, state.won ? 'YOU WIN!' : 'GAME OVER', [
          `Final score ${state.score}`,
          'Press ENTER to run again',
        ], state.won ? accent : '#ff4f6d');
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
      aria-label="Bolt Rush level"
      className="block aspect-[16/9] w-full rounded-xl outline-none"
    />
  );
}
