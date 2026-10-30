import { useEffect, useRef } from 'react';

import { setupCanvas } from '../engine/canvas';
import { Keyboard } from '../engine/input';
import { startLoop } from '../engine/loop';
import { sfx } from '../engine/sfx';
import { DISPLAY_FONT, drawOverlay } from '../engine/overlay';
import type { GameProps } from '../types';
import {
  COLS,
  ROWS,
  createSnake,
  turn,
  update,
  type Direction,
  type SnakeState,
} from './snake.engine';

const CELL = 28;
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL;

const COLORS = {
  board: '#0b0920',
  dot: '#1f1a45',
  body: '#3dffb0',
  head: '#b6ffe0',
  food: '#ff4f9a',
  bonus: '#ffd23f',
  accent: '#3dffb0',
};

const KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'Space', 'Enter', 'KeyP', 'Escape',
]);

const TURNS: [Direction, string[]][] = [
  ['up', ['ArrowUp', 'KeyW']],
  ['down', ['ArrowDown', 'KeyS']],
  ['left', ['ArrowLeft', 'KeyA']],
  ['right', ['ArrowRight', 'KeyD']],
];

type Phase = 'ready' | 'playing' | 'paused' | 'over';

export function SnakeGame({ onFinish }: GameProps) {
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

    let state: SnakeState = createSnake();
    let phase: Phase = 'ready';
    let best = 0;
    let clock = 0;

    const step = (dt: number) => {
      clock += dt;
      const start = keyboard.consume('Space', 'Enter');
      if (phase === 'ready' || phase === 'over') {
        if (start) {
          state = createSnake();
          phase = 'playing';
          sfx.blip();
        }
      } else if (keyboard.consume('KeyP', 'Escape')) {
        phase = phase === 'paused' ? 'playing' : 'paused';
      } else if (phase === 'paused' && start) {
        phase = 'playing';
      } else if (phase === 'playing') {
        for (const [direction, codes] of TURNS) {
          if (keyboard.consume(...codes)) turn(state, direction);
        }
        const before = { eaten: state.eaten, score: state.score };
        update(state, dt);
        if (state.eaten > before.eaten) sfx.eat();
        else if (state.score > before.score) sfx.bonus();
        if (!state.alive) {
          sfx.crash();
          phase = 'over';
          best = Math.max(best, state.score);
          finishRef.current({
            points: state.score,
            summary: `Length ${state.body.length} · ${state.eaten} snacks`,
          });
        }
      }
      keyboard.endFrame();
    };

    const draw = () => {
      if (!ctx) return;
      ctx.fillStyle = COLORS.board;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = COLORS.dot;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2);
        }
      }

      const pulse = 0.5 + Math.sin(clock * 6) * 0.5;
      ctx.save();
      ctx.shadowColor = COLORS.food;
      ctx.shadowBlur = 10 + pulse * 10;
      ctx.fillStyle = COLORS.food;
      ctx.beginPath();
      ctx.arc(
        state.food.x * CELL + CELL / 2,
        state.food.y * CELL + CELL / 2,
        CELL * 0.32,
        0,
        Math.PI * 2
      );
      ctx.fill();
      if (state.bonus && (state.bonus.ttl > 2 || Math.floor(clock * 8) % 2)) {
        ctx.shadowColor = COLORS.bonus;
        ctx.fillStyle = COLORS.bonus;
        const cx = state.bonus.x * CELL + CELL / 2;
        const cy = state.bonus.y * CELL + CELL / 2;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? CELL * 0.18 : CELL * 0.42;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + clock;
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      }

      ctx.shadowColor = COLORS.body;
      ctx.shadowBlur = 12;
      state.body.forEach((cell, index) => {
        const inset = index === 0 ? 2 : 3 + Math.min(index / state.body.length, 1) * 3;
        ctx.fillStyle = index === 0 ? COLORS.head : COLORS.body;
        ctx.globalAlpha = index === 0 ? 1 : 1 - (index / state.body.length) * 0.45;
        ctx.beginPath();
        ctx.roundRect(
          cell.x * CELL + inset,
          cell.y * CELL + inset,
          CELL - inset * 2,
          CELL - inset * 2,
          6
        );
        ctx.fill();
      });
      ctx.restore();

      ctx.fillStyle = '#e8e6ff';
      ctx.font = `12px ${DISPLAY_FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`SCORE ${String(state.score).padStart(5, '0')}`, 12, 10);
      ctx.textAlign = 'right';
      ctx.fillText(`BEST ${String(best).padStart(5, '0')}`, WIDTH - 12, 10);

      if (phase === 'ready') {
        drawOverlay(ctx, WIDTH, HEIGHT, 'SNAKE', [
          'Arrows or WASD to steer',
          'Press ENTER to start',
        ], COLORS.accent);
      } else if (phase === 'paused') {
        drawOverlay(ctx, WIDTH, HEIGHT, 'PAUSED', ['Press P to resume'], COLORS.accent);
      } else if (phase === 'over') {
        drawOverlay(ctx, WIDTH, HEIGHT, 'GAME OVER', [
          `Score ${state.score}`,
          'Press ENTER to play again',
        ], COLORS.food);
      }
    };

    const stop = startLoop(step, draw);
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
      aria-label="Snake game board"
      className="block aspect-[4/3] w-full rounded-xl outline-none"
    />
  );
}
