import { createRng } from '../engine/canvas';

export const COLS = 24;
export const ROWS = 18;

export type Direction = 'up' | 'down' | 'left' | 'right';
export interface Cell {
  x: number;
  y: number;
}

export interface SnakeState {
  body: Cell[]; // head first
  direction: Direction;
  queued: Direction[];
  food: Cell;
  bonus: (Cell & { ttl: number }) | null;
  score: number;
  eaten: number;
  alive: boolean;
  /** Seconds between moves; shrinks as the snake grows. */
  interval: number;
  timer: number;
  rng: () => number;
}

const VECTORS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

function freeCell(state: Pick<SnakeState, 'body' | 'rng'>, avoid: Cell[] = []) {
  const taken = new Set(
    [...state.body, ...avoid].map((cell) => cell.y * COLS + cell.x)
  );
  const free: Cell[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.has(y * COLS + x)) free.push({ x, y });
    }
  }
  return free[Math.floor(state.rng() * free.length)] ?? null;
}

export function createSnake(seed = Date.now()): SnakeState {
  const rng = createRng(seed);
  const body = [
    { x: 8, y: 9 },
    { x: 7, y: 9 },
    { x: 6, y: 9 },
  ];
  return {
    body,
    direction: 'right',
    queued: [],
    food: freeCell({ body, rng })!,
    bonus: null,
    score: 0,
    eaten: 0,
    alive: true,
    interval: 0.13,
    timer: 0,
    rng,
  };
}

/** Queue a turn; up to two so quick "down, left" combos are not lost. */
export function turn(state: SnakeState, next: Direction): void {
  const last = state.queued.at(-1) ?? state.direction;
  if (next === last || next === OPPOSITE[last] || state.queued.length >= 2) {
    return;
  }
  state.queued.push(next);
}

/** Moves the snake one cell. Walls and the snake's own body are fatal. */
export function move(state: SnakeState): void {
  if (!state.alive) return;
  state.direction = state.queued.shift() ?? state.direction;
  const vector = VECTORS[state.direction];
  const head = { x: state.body[0].x + vector.x, y: state.body[0].y + vector.y };

  const eats = same(head, state.food);
  const eatsBonus = state.bonus !== null && same(head, state.bonus);
  // The tail moves away this tick unless the snake grows, so it is not a wall.
  const blocking = eats ? state.body : state.body.slice(0, -1);
  const outside = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
  if (outside || blocking.some((cell) => same(cell, head))) {
    state.alive = false;
    return;
  }

  state.body.unshift(head);
  if (eats) {
    state.eaten += 1;
    state.score += 10 + Math.floor(state.eaten / 5) * 5;
    state.interval = Math.max(0.055, 0.13 - state.eaten * 0.0025);
    const food = freeCell(state, state.bonus ? [state.bonus] : []);
    if (!food) {
      state.alive = false; // board full: nothing left to eat
      return;
    }
    state.food = food;
    if (!state.bonus && state.eaten % 5 === 0) {
      const spot = freeCell(state, [state.food]);
      state.bonus = spot ? { ...spot, ttl: 6 } : null;
    }
  } else {
    state.body.pop();
  }
  if (eatsBonus) {
    state.score += 50;
    state.bonus = null;
  }
}

/** Advances time; moves as many cells as the elapsed time allows. */
export function update(state: SnakeState, dt: number): void {
  if (!state.alive) return;
  if (state.bonus) {
    state.bonus.ttl -= dt;
    if (state.bonus.ttl <= 0) state.bonus = null;
  }
  state.timer += dt;
  while (state.alive && state.timer >= state.interval) {
    state.timer -= state.interval;
    move(state);
  }
}
