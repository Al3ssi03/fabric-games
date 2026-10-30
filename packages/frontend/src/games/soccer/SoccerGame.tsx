import { useEffect, useRef } from 'react';

import { setupCanvas } from '../engine/canvas';
import { Keyboard } from '../engine/input';
import { startLoop } from '../engine/loop';
import { sfx } from '../engine/sfx';
import { BODY_FONT, DISPLAY_FONT, drawOverlay } from '../engine/overlay';
import type { GameProps } from '../types';
import {
  BALL_RADIUS,
  BAR,
  GOAL_DEPTH,
  GOAL_TOP,
  GOALS_TO_WIN,
  GROUND,
  HEIGHT,
  PLAYER_RADIUS,
  WIDTH,
  cpuInput,
  createMatch,
  step,
  type Player,
  type PlayerInput,
  type SoccerState,
} from './soccer.engine';

const COLORS = {
  sky: ['#120b33', '#2a1060'],
  crowd: ['#3a2a7a', '#56308f', '#7a3b9e', '#2f2468'],
  grass: ['#14834f', '#17955a'],
  line: 'rgba(255,255,255,0.75)',
  post: '#f5f3ff',
  net: 'rgba(255,255,255,0.22)',
  left: '#2ee6ff',
  right: '#ff4fbf',
  skin: '#ffd7b0',
  ball: '#ffffff',
  hud: '#e8e6ff',
};

const KEYS = new Set([
  'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Enter', 'KeyP', 'Escape', 'Digit1', 'Digit2',
]);

type Phase = 'ready' | 'playing' | 'paused' | 'over';

function drawPitch(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, COLORS.sky[0]);
  sky.addColorStop(1, COLORS.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Floodlights and stands.
  for (const x of [120, WIDTH - 120]) {
    const glow = ctx.createRadialGradient(x, 40, 4, x, 40, 220);
    glow.addColorStop(0, 'rgba(255,255,230,0.55)');
    glow.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 220, 0, 440, 300);
  }
  for (let row = 0; row < 5; row++) {
    for (let x = 6 + (row % 2) * 9; x < WIDTH; x += 18) {
      ctx.fillStyle = COLORS.crowd[(x * 7 + row * 3) % COLORS.crowd.length];
      ctx.beginPath();
      ctx.arc(x, 150 + row * 22, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(10,6,30,0.65)';
  ctx.fillRect(0, 252, WIDTH, 16);

  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = COLORS.grass[i % 2];
    ctx.fillRect((i * WIDTH) / 12, 268, WIDTH / 12 + 1, HEIGHT - 268);
  }
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2, 268);
  ctx.lineTo(WIDTH / 2, GROUND);
  ctx.moveTo(0, GROUND);
  ctx.lineTo(WIDTH, GROUND);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(WIDTH / 2, GROUND - 6, 120, 18, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawGoal(ctx: CanvasRenderingContext2D, side: 'left' | 'right') {
  const x0 = side === 'left' ? 0 : WIDTH - GOAL_DEPTH;
  ctx.save();
  ctx.strokeStyle = COLORS.net;
  ctx.lineWidth = 1;
  for (let x = x0; x <= x0 + GOAL_DEPTH; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, GOAL_TOP);
    ctx.lineTo(x, GROUND);
    ctx.stroke();
  }
  for (let y = GOAL_TOP; y <= GROUND; y += 10) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + GOAL_DEPTH, y);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.post;
  ctx.fillRect(x0, GOAL_TOP - BAR, GOAL_DEPTH, BAR);
  const postX = side === 'left' ? GOAL_DEPTH - 6 : WIDTH - GOAL_DEPTH;
  ctx.fillRect(postX, GOAL_TOP - BAR, 6, GROUND - GOAL_TOP + BAR);
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  color: string,
  ballX: number,
  ballY: number
) {
  const dir = player.side === 'left' ? 1 : -1;
  ctx.save();
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  const lift = Math.min(1, (GROUND - PLAYER_RADIUS - player.y) / 200);
  ctx.beginPath();
  ctx.ellipse(player.x, GROUND + 2, 28 * (1 - lift * 0.5), 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Kicking boot swings forward through the kick.
  const swing = player.kick > 0 ? Math.sin((1 - player.kick / 0.18) * Math.PI) : 0;
  const footX = player.x + dir * (8 + swing * 26);
  const footY = player.y + PLAYER_RADIUS * 0.75 - swing * 8;
  ctx.fillStyle = '#1b1530';
  ctx.beginPath();
  ctx.ellipse(footX, footY, 16, 9, dir * -swing * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Head with a jersey-colored band and headphones-style ears.
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  ctx.fillRect(player.x - PLAYER_RADIUS, player.y - 6, PLAYER_RADIUS * 2, 7);

  // Eyes follow the ball.
  const look = Math.atan2(ballY - player.y, ballX - player.x);
  for (const offset of [-9, 9]) {
    const ex = player.x + offset + dir * 4;
    const ey = player.y + 8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1530';
    ctx.beginPath();
    ctx.arc(ex + Math.cos(look) * 2.5, ey + Math.sin(look) * 2.5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, state: SoccerState, spin: number) {
  const { ball } = state;
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(spin);
  ctx.fillStyle = COLORS.ball;
  ctx.beginPath();
  ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b1530';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.lineTo(Math.cos(a) * 5, Math.sin(a) * 5);
  }
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 12, Math.sin(a) * 12, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, state: SoccerState, vsCpu: boolean) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,4,20,0.7)';
  ctx.beginPath();
  ctx.roundRect(WIDTH / 2 - 150, 14, 300, 56, 12);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `24px ${DISPLAY_FONT}`;
  ctx.fillStyle = COLORS.left;
  ctx.fillText(String(state.score[0]), WIDTH / 2 - 104, 44);
  ctx.fillStyle = COLORS.right;
  ctx.fillText(String(state.score[1]), WIDTH / 2 + 104, 44);
  ctx.fillStyle = COLORS.hud;
  ctx.font = `16px ${DISPLAY_FONT}`;
  const seconds = Math.ceil(state.clock);
  ctx.fillText(
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
    WIDTH / 2,
    44
  );
  ctx.font = `600 14px ${BODY_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.left;
  ctx.fillText('PLAYER 1', 16, 26);
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.right;
  ctx.fillText(vsCpu ? 'CPU' : 'PLAYER 2', WIDTH - 16, 26);
  ctx.restore();
}

export function SoccerGame({ onFinish }: GameProps) {
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

    let state = createMatch();
    let phase: Phase = 'ready';
    let vsCpu = false;
    let spin = 0;
    let think = 0;

    const update = (dt: number) => {
      if (phase === 'ready' || phase === 'over') {
        if (keyboard.consume('Digit1')) vsCpu = true;
        if (keyboard.consume('Digit2')) vsCpu = false;
        if (keyboard.consume('Enter')) {
          state = createMatch();
          phase = 'playing';
          sfx.blip();
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

      think = (think + dt * 1.7) % 1;
      const one: PlayerInput = {
        left: keyboard.pressed('KeyA'),
        right: keyboard.pressed('KeyD'),
        jump: keyboard.pressed('KeyW'),
        kick: keyboard.consume('KeyS', 'Space'),
      };
      const two: PlayerInput = vsCpu
        ? cpuInput(state, think)
        : {
            left: keyboard.pressed('ArrowLeft'),
            right: keyboard.pressed('ArrowRight'),
            jump: keyboard.pressed('ArrowUp'),
            kick: keyboard.consume('ArrowDown'),
          };
      const kicked = state.players.map((p) => p.kicked);
      const celebrating = state.celebration > 0;
      step(state, dt, [one, two]);
      if (state.players.some((p, i) => p.kicked && !kicked[i])) sfx.kick();
      if (!celebrating && state.celebration > 0) sfx.goal();
      spin += (state.ball.vx / BALL_RADIUS) * dt;
      keyboard.endFrame();

      if (state.finished) {
        phase = 'over';
        const [a, b] = state.score;
        const opponent = vsCpu ? 'CPU' : 'Player 2';
        finishRef.current({
          summary:
            a === b
              ? `Draw ${a}–${b}`
              : `${a > b ? 'Player 1' : opponent} wins ${Math.max(a, b)}–${Math.min(a, b)}`,
        });
      }
    };

    const draw = () => {
      if (!ctx) return;
      drawPitch(ctx);
      drawGoal(ctx, 'left');
      drawGoal(ctx, 'right');
      drawPlayer(ctx, state.players[0], COLORS.left, state.ball.x, state.ball.y);
      drawPlayer(ctx, state.players[1], COLORS.right, state.ball.x, state.ball.y);
      drawBall(ctx, state, spin);
      drawHud(ctx, state, vsCpu);

      if (phase === 'playing' && state.freeze > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `28px ${DISPLAY_FONT}`;
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#0b0920';
        ctx.fillStyle = COLORS.hud;
        ctx.strokeText('READY', WIDTH / 2, 120);
        ctx.fillText('READY', WIDTH / 2, 120);
        ctx.restore();
      }

      if (state.celebration > 0 && !state.finished) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `44px ${DISPLAY_FONT}`;
        const color = state.lastScorer === 0 ? COLORS.left : COLORS.right;
        ctx.shadowColor = color;
        ctx.shadowBlur = 24;
        ctx.fillStyle = color;
        const bounce = Math.abs(Math.sin(state.celebration * 6)) * 10;
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#0b0920';
        ctx.strokeText('GOAL!', WIDTH / 2, 200 - bounce);
        ctx.fillText('GOAL!', WIDTH / 2, 200 - bounce);
        ctx.restore();
      }

      const mode = vsCpu ? '[1] vs CPU  ·  2 Players' : '1 vs CPU  ·  [2] 2 Players';
      if (phase === 'ready') {
        drawOverlay(ctx, WIDTH, HEIGHT, 'DUEL CUP', [
          `First to ${GOALS_TO_WIN} or best after 90 seconds`,
          'P1: A D move · W jump · S kick',
          vsCpu ? 'P2: CPU' : 'P2: ← → move · ↑ jump · ↓ kick',
          `${mode}   —   ENTER to kick off`,
        ], COLORS.left);
      } else if (phase === 'paused') {
        drawOverlay(ctx, WIDTH, HEIGHT, 'PAUSED', ['Press P to resume'], COLORS.left);
      } else if (phase === 'over') {
        const [a, b] = state.score;
        const winner = a === b ? 'DRAW!' : a > b ? 'P1 WINS!' : vsCpu ? 'CPU WINS!' : 'P2 WINS!';
        drawOverlay(ctx, WIDTH, HEIGHT, winner, [
          `Final score ${a} – ${b}`,
          `${mode}   —   ENTER for a rematch`,
        ], a >= b ? COLORS.left : COLORS.right);
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
      aria-label="Duel Cup football pitch"
      className="block aspect-[16/9] w-full rounded-xl outline-none"
    />
  );
}
