export const WIDTH = 960;
export const HEIGHT = 540;
export const GROUND = 480;
export const GOAL_DEPTH = 64;
export const GOAL_TOP = 300;
export const BAR = 10;
export const PLAYER_RADIUS = 30;
export const BALL_RADIUS = 14;
export const MATCH_SECONDS = 90;
export const GOALS_TO_WIN = 7;

const PLAYER_GRAVITY = 2300;
const BALL_GRAVITY = 1300;
const RUN_SPEED = 390;
const JUMP_SPEED = 840;
const KICK_TIME = 0.18;
const KICK_COOLDOWN = 0.32;
const FOOT_REACH = 30;
const FOOT_RADIUS = 24;
const CELEBRATION = 1.6;
const KICKOFF_FREEZE = 0.9;

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Player extends Body {
  side: 'left' | 'right';
  onGround: boolean;
  kick: number;
  cooldown: number;
  kicked: boolean;
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  kick: boolean;
}

export interface SoccerState {
  players: [Player, Player];
  ball: Body;
  score: [number, number];
  clock: number;
  /** Seconds left in the post-goal pause; play is frozen while positive. */
  celebration: number;
  /** Seconds before the dropped ball goes live, so nobody scores off the drop. */
  freeze: number;
  lastScorer: 0 | 1 | null;
  finished: boolean;
}

const facing = (player: Player) => (player.side === 'left' ? 1 : -1);

function kickoffPlayer(side: Player['side']): Player {
  return {
    side,
    x: side === 'left' ? WIDTH * 0.25 : WIDTH * 0.75,
    y: GROUND - PLAYER_RADIUS,
    vx: 0,
    vy: 0,
    onGround: true,
    kick: 0,
    cooldown: 0,
    kicked: false,
  };
}

function kickoff(state: SoccerState, servingSide: 0 | 1 | null) {
  state.players = [kickoffPlayer('left'), kickoffPlayer('right')];
  const nudge = servingSide === null ? 0 : servingSide === 0 ? 60 : -60;
  state.ball = { x: WIDTH / 2, y: 180, vx: nudge, vy: 0 };
  state.freeze = KICKOFF_FREEZE;
}

export function createMatch(): SoccerState {
  const state = {
    score: [0, 0],
    clock: MATCH_SECONDS,
    celebration: 0,
    lastScorer: null,
    finished: false,
  } as unknown as SoccerState;
  kickoff(state, null);
  return state;
}

function stepPlayer(player: Player, input: PlayerInput, dt: number) {
  const target = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const response = player.onGround ? 14 : 7;
  player.vx += (target * RUN_SPEED - player.vx) * Math.min(1, response * dt);
  if (input.jump && player.onGround) {
    player.vy = -JUMP_SPEED;
    player.onGround = false;
  }
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.kick = Math.max(0, player.kick - dt);
  if (input.kick && player.cooldown === 0) {
    player.kick = KICK_TIME;
    player.cooldown = KICK_COOLDOWN;
    player.kicked = false;
  }
  player.vy += PLAYER_GRAVITY * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  if (player.y >= GROUND - PLAYER_RADIUS) {
    player.y = GROUND - PLAYER_RADIUS;
    player.vy = 0;
    player.onGround = true;
  }
  const min = GOAL_DEPTH + PLAYER_RADIUS * 0.4;
  player.x = Math.max(min, Math.min(WIDTH - min, player.x));
}

/** Pushes the ball out of a circle and bounces it off that circle's surface. */
function bounceOffCircle(
  ball: Body,
  cx: number,
  cy: number,
  radius: number,
  surface: { vx: number; vy: number },
  restitution: number
): boolean {
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const distance = Math.hypot(dx, dy);
  const reach = radius + BALL_RADIUS;
  if (distance >= reach || distance === 0) return false;
  const nx = dx / distance;
  const ny = dy / distance;
  ball.x = cx + nx * reach;
  ball.y = cy + ny * reach;
  const rvx = ball.vx - surface.vx;
  const rvy = ball.vy - surface.vy;
  const along = rvx * nx + rvy * ny;
  if (along < 0) {
    ball.vx -= (1 + restitution) * along * nx;
    ball.vy -= (1 + restitution) * along * ny;
  }
  return true;
}

function bounceOffRect(
  ball: Body,
  left: number,
  top: number,
  right: number,
  bottom: number
) {
  const px = Math.max(left, Math.min(right, ball.x));
  const py = Math.max(top, Math.min(bottom, ball.y));
  const dx = ball.x - px;
  const dy = ball.y - py;
  const distance = Math.hypot(dx, dy);
  if (distance >= BALL_RADIUS) return;
  const nx = distance === 0 ? 0 : dx / distance;
  const ny = distance === 0 ? -1 : dy / distance;
  ball.x = px + nx * BALL_RADIUS;
  ball.y = py + ny * BALL_RADIUS;
  const along = ball.vx * nx + ball.vy * ny;
  if (along < 0) {
    ball.vx -= 1.7 * along * nx;
    ball.vy -= 1.7 * along * ny;
  }
}

function stepBall(state: SoccerState, dt: number) {
  const { ball } = state;
  ball.vy += BALL_GRAVITY * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.y > GROUND - BALL_RADIUS) {
    ball.y = GROUND - BALL_RADIUS;
    ball.vy = Math.abs(ball.vy) < 90 ? 0 : -ball.vy * 0.62;
    ball.vx *= 1 - Math.min(1, 0.9 * dt);
  }
  if (ball.y < BALL_RADIUS) {
    ball.y = BALL_RADIUS;
    ball.vy = Math.abs(ball.vy) * 0.6;
  }
  if (ball.x < BALL_RADIUS) {
    ball.x = BALL_RADIUS;
    ball.vx = Math.abs(ball.vx) * 0.4;
  }
  if (ball.x > WIDTH - BALL_RADIUS) {
    ball.x = WIDTH - BALL_RADIUS;
    ball.vx = -Math.abs(ball.vx) * 0.4;
  }
  bounceOffRect(ball, 0, GOAL_TOP - BAR, GOAL_DEPTH, GOAL_TOP);
  bounceOffRect(ball, WIDTH - GOAL_DEPTH, GOAL_TOP - BAR, WIDTH, GOAL_TOP);
  // A ball parked on a crossbar would be out of reach; roll it back into play.
  if (ball.y < GOAL_TOP - BAR && ball.y > GOAL_TOP - BAR - BALL_RADIUS * 1.5) {
    if (ball.x < GOAL_DEPTH) ball.vx += 260 * dt;
    if (ball.x > WIDTH - GOAL_DEPTH) ball.vx -= 260 * dt;
  }

  for (const player of state.players) {
    bounceOffCircle(ball, player.x, player.y, PLAYER_RADIUS, player, 0.55);
    if (player.kick > 0 && !player.kicked) {
      const dir = facing(player);
      const footX = player.x + dir * FOOT_REACH;
      const footY = player.y + PLAYER_RADIUS * 0.6;
      if (Math.hypot(ball.x - footX, ball.y - footY) < FOOT_RADIUS + BALL_RADIUS) {
        player.kicked = true;
        const volley = player.onGround ? 1 : 1.15;
        ball.vx = dir * 760 * volley + player.vx * 0.35;
        ball.vy = player.onGround ? -430 : -150;
      }
    }
  }

  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > 1500) {
    ball.vx *= 1500 / speed;
    ball.vy *= 1500 / speed;
  }
}

/** Which goal (if any) the ball is fully inside: 0 = left player scored. */
export function goalScored(ball: Body): 0 | 1 | null {
  if (ball.y - BALL_RADIUS < GOAL_TOP) return null;
  if (ball.x + BALL_RADIUS < GOAL_DEPTH) return 1;
  if (ball.x - BALL_RADIUS > WIDTH - GOAL_DEPTH) return 0;
  return null;
}

function separatePlayers([a, b]: [Player, Player]) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const reach = PLAYER_RADIUS * 2;
  if (distance >= reach || distance === 0) return;
  const push = (reach - distance) / 2;
  a.x -= (dx / distance) * push;
  b.x += (dx / distance) * push;
}

export function step(
  state: SoccerState,
  dt: number,
  inputs: [PlayerInput, PlayerInput]
): void {
  if (state.finished) return;
  if (state.celebration > 0) {
    state.celebration -= dt;
    stepBall(state, dt);
    if (state.celebration <= 0) {
      if (state.clock <= 0 || state.score.some((goals) => goals >= GOALS_TO_WIN)) {
        state.finished = true;
      } else {
        kickoff(state, state.lastScorer === 0 ? 1 : 0);
      }
    }
    return;
  }

  if (state.freeze > 0) {
    state.freeze -= dt;
    return;
  }

  state.clock = Math.max(0, state.clock - dt);
  stepPlayer(state.players[0], inputs[0], dt);
  stepPlayer(state.players[1], inputs[1], dt);
  separatePlayers(state.players);
  stepBall(state, dt);

  const scorer = goalScored(state.ball);
  if (scorer !== null) {
    state.score[scorer] += 1;
    state.lastScorer = scorer;
    state.celebration = CELEBRATION;
    return;
  }
  if (state.clock === 0) state.finished = true;
}

/** A simple opponent for solo play: shadows the ball and swings when close. */
export function cpuInput(state: SoccerState, think: number): PlayerInput {
  const me = state.players[1];
  const { ball } = state;
  // Stay goal-side of the ball so it is in front of the CPU's foot.
  const target = ball.x + 34 + (ball.vx < -200 ? 40 : 0);
  const dx = target - me.x;
  const near = Math.abs(ball.x - me.x) < 90;
  const ballInFront = ball.x < me.x + 10;
  return {
    left: dx < -12,
    right: dx > 12,
    jump: near && ball.y < me.y - 46 && ball.vy > -200 && think > 0.35,
    kick: think < 0.6 && ballInFront && Math.abs(ball.x - me.x) < 64 && ball.y > me.y - 20,
  };
}
