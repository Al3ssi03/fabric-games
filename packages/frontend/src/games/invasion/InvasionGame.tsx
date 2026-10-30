import { useEffect, useRef } from 'react';

import { setupCanvas } from '../engine/canvas';
import { Keyboard } from '../engine/input';
import { startLoop } from '../engine/loop';
import { DISPLAY_FONT, drawOverlay } from '../engine/overlay';
import { play, sfx } from '../engine/sfx';
import type { GameProps } from '../types';
import {
  BRICK,
  BUNKER_SIZE,
  GROUND_Y,
  HEIGHT,
  PLAYER_Y,
  WIDTH,
  alienPos,
  bunkerCell,
  createInvasion,
  step,
  type InvasionEvent,
  type InvasionState,
} from './invasion.engine';

const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'KeyX', 'KeyZ', 'Enter', 'KeyP', 'Escape']);
const FIRE_KEYS = ['Space', 'KeyX', 'KeyZ'];
const PIXEL = 3;

// The game's own alien designs, two animation frames each (11 × 7 pixels).
const SPRITES: string[][][] = [
  [
    ['....XXX....', '..XXXXXXX..', '.XX.XXX.XX.', '.XXXXXXXXX.', '...X...X...', '..X.X.X.X..', '.X.......X.'],
    ['....XXX....', '..XXXXXXX..', '.XX.XXX.XX.', '.XXXXXXXXX.', '...X...X...', '...X...X...', '..X.....X..'],
  ],
  [
    ['...XXXXX...', '.XXXXXXXXX.', 'XX..XXX..XX', 'XXXXXXXXXXX', '.XXX...XXX.', '..X.X.X.X..', '.X.......X.'],
    ['...XXXXX...', '.XXXXXXXXX.', 'XX..XXX..XX', 'XXXXXXXXXXX', '.XXX...XXX.', '.X.X.X.X.X.', 'X.........X'],
  ],
  [
    ['..XX...XX..', '...XXXXX...', '.XXXXXXXXX.', 'XXX.XXX.XXX', 'XXXXXXXXXXX', '.X.XX.XX.X.', 'X.........X'],
    ['..XX...XX..', '...XXXXX...', '.XXXXXXXXX.', 'XXX.XXX.XXX', 'XXXXXXXXXXX', '..X.X.X.X..', '.X.X...X.X.'],
  ],
];
const ROW_SPRITE = [0, 1, 1, 2, 2];
const UFO_SPRITE = ['....XXXXX....', '..XXXXXXXXX..', '.XX.XX.XX.XX.', 'XXXXXXXXXXXXX', '..XXX...XXX..', '...X.....X...'];
const CANNON = ['......X......', '.....XXX.....', '.....XXX.....', '.XXXXXXXXXXX.', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX'];
const MARCH_NOTES = [98, 87, 78, 73];

/** Colour bands like the cellophane overlays on the original cabinets. */
function tint(y: number): string {
  if (y < 80) return '#ff4a4a';
  if (y > 380) return '#3dff6a';
  return '#f2f2f2';
}

function sprite(ctx: CanvasRenderingContext2D, rows: string[], cx: number, cy: number, color: string) {
  const w = rows[0].length * PIXEL;
  const h = rows.length * PIXEL;
  const left = Math.round(cx - w / 2);
  const top = Math.round(cy - h / 2);
  ctx.fillStyle = color;
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 'X') ctx.fillRect(left + c * PIXEL, top + r * PIXEL, PIXEL, PIXEL);
    }
  });
}

function drawBlast(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, clock: number) {
  ctx.fillStyle = color;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + clock * 3;
    const r = 8 + (i % 3) * 5;
    ctx.fillRect(Math.round(x + Math.cos(a) * r) - 2, Math.round(y + Math.sin(a) * r) - 2, 4, 4);
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, state: InvasionState, best: number, clock: number) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.font = `16px ${DISPLAY_FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f2f2f2';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', 40, 14);
  ctx.fillText(String(state.score).padStart(5, '0'), 40, 38);
  ctx.textAlign = 'center';
  ctx.fillText('HI-SCORE', WIDTH / 2, 14);
  ctx.fillText(String(Math.max(best, state.score)).padStart(5, '0'), WIDTH / 2, 38);
  ctx.textAlign = 'right';
  ctx.fillText(`WAVE ${state.wave}`, WIDTH - 40, 14);

  for (const alien of state.aliens) {
    if (!alien.alive) continue;
    const { x, y } = alienPos(state, alien);
    sprite(ctx, SPRITES[ROW_SPRITE[alien.row]][state.frame], x, y, tint(y));
  }

  if (state.ufo) sprite(ctx, UFO_SPRITE, state.ufo.x, 62, '#ff4a4a');

  for (const bunker of state.bunkers) {
    ctx.fillStyle = tint(bunker.y + 20);
    for (let r = 0; r < BUNKER_SIZE.rows; r++) {
      for (let c = 0; c < BUNKER_SIZE.cols; c++) {
        if (bunkerCell(bunker, c, r)) ctx.fillRect(bunker.x + c * BRICK, bunker.y + r * BRICK, BRICK, BRICK);
      }
    }
  }

  if (state.shot) {
    ctx.fillStyle = tint(state.shot.y);
    ctx.fillRect(Math.round(state.shot.x) - 1, Math.round(state.shot.y) - 8, 3, 14);
  }
  for (const bomb of state.bombs) {
    ctx.fillStyle = tint(bomb.y);
    const wiggle = Math.floor(bomb.y / 6) % 2 === 0 ? -2 : 2;
    ctx.fillRect(Math.round(bomb.x) - 1 + wiggle, Math.round(bomb.y) - 7, 3, 4);
    ctx.fillRect(Math.round(bomb.x) - 1 - wiggle, Math.round(bomb.y) - 3, 3, 4);
    ctx.fillRect(Math.round(bomb.x) - 1 + wiggle, Math.round(bomb.y) + 1, 3, 4);
  }

  for (const blast of state.blasts) {
    const color = blast.color === 'ufo' ? '#ff4a4a' : tint(blast.y);
    drawBlast(ctx, blast.x, blast.y, color, clock);
  }
  ctx.font = `14px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  for (const popup of state.popups) {
    ctx.fillStyle = '#ff4a4a';
    ctx.fillText(popup.text, popup.x, popup.y - 8);
  }

  if (state.dying <= 0) sprite(ctx, CANNON, state.playerX, PLAYER_Y, '#3dff6a');

  ctx.fillStyle = '#3dff6a';
  ctx.fillRect(0, GROUND_Y, WIDTH, 2);
  ctx.font = `14px ${DISPLAY_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.max(0, state.lives)), 40, GROUND_Y + 13);
  for (let i = 0; i < Math.min(5, state.lives - 1); i++) {
    sprite(ctx, CANNON, 90 + i * 50, GROUND_Y + 13, '#3dff6a');
  }
}

const SOUNDS: Partial<Record<InvasionEvent, (state: InvasionState) => void>> = {
  shoot: () => play({ frequency: 1400, to: 400, duration: 0.09, type: 'square', volume: 0.035 }),
  march: (state) =>
    play({ frequency: MARCH_NOTES[state.marchNote], duration: 0.08, type: 'square', volume: 0.07 }),
  kill: () => play({ frequency: 320, to: 60, duration: 0.18, type: 'sawtooth', volume: 0.06 }),
  ufo: () =>
    play(
      { frequency: 700, to: 900, duration: 0.15, type: 'triangle', volume: 0.04 },
      { frequency: 900, to: 700, duration: 0.15, type: 'triangle', volume: 0.04, delay: 0.15 }
    ),
  ufoKill: () => sfx.bonus(),
  die: () => sfx.crash(),
  life: () => sfx.goal(),
  wave: () => sfx.clear(),
};

type Phase = 'ready' | 'playing' | 'paused' | 'over';

export function InvasionGame({ onFinish }: GameProps) {
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

    let state = createInvasion();
    let phase: Phase = 'ready';
    let best = 0;
    let clock = 0;

    const update = (dt: number) => {
      clock += dt;
      if (phase === 'ready' || phase === 'over') {
        if (keyboard.consume('Enter')) {
          state = createInvasion();
          phase = 'playing';
        }
        keyboard.endFrame();
        return;
      }
      if (keyboard.consume('KeyP', 'Escape')) phase = phase === 'paused' ? 'playing' : 'paused';
      if (phase === 'paused') {
        if (keyboard.consume('Enter')) phase = 'playing';
        keyboard.endFrame();
        return;
      }

      step(
        state,
        {
          left: keyboard.pressed('ArrowLeft', 'KeyA'),
          right: keyboard.pressed('ArrowRight', 'KeyD'),
          fire: keyboard.pressed(...FIRE_KEYS),
        },
        dt
      );
      for (const event of state.events) SOUNDS[event]?.(state);
      keyboard.endFrame();

      if (state.over) {
        phase = 'over';
        best = Math.max(best, state.score);
        finishRef.current({ points: state.score, summary: `Fell on wave ${state.wave}` });
      }
    };

    const draw = () => {
      if (!ctx) return;
      drawFrame(ctx, state, best, clock);
      if (phase === 'ready') {
        drawOverlay(ctx, WIDTH, HEIGHT, 'BUG INVASION', [
          '← → move · SPACE fire',
          '30 · 20 · 10 points per row, mystery ship ??',
          'Bonus cannon at 1500 points',
          'Press ENTER to start',
        ], '#3dff6a');
      } else if (phase === 'paused') {
        drawOverlay(ctx, WIDTH, HEIGHT, 'PAUSED', ['Press P to resume'], '#3dff6a');
      } else if (phase === 'over') {
        drawOverlay(ctx, WIDTH, HEIGHT, 'GAME OVER', [
          `Final score ${state.score} · wave ${state.wave}`,
          'Press ENTER to play again',
        ], '#ff4a4a');
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
      aria-label="Bug Invasion playfield"
      className="block aspect-[16/9] w-full rounded-xl outline-none"
    />
  );
}
