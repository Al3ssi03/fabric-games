import { createRng } from '../engine/canvas';

export const WIDTH = 960;
export const HEIGHT = 540;
export const COLS = 11;
export const ROWS = 5;
export const PLAYER_Y = 492;
export const GROUND_Y = 516;

const CELL_X = 48;
const CELL_Y = 38;
const ALIEN_W = 34;
const ALIEN_H = 24;
const START_X = 216;
const START_Y = 96;
const WAVE_DROP = 22;
const MAX_START_Y = 206;
const MARGIN = 24;
const STEP_X = 10;
const STEP_DOWN = 20;
const PLAYER_SPEED = 320;
const PLAYER_HALF = 22;
const SHOT_SPEED = 720;
const BOMB_SPEED = 250;
const MAX_BOMBS = 3;
const UFO_SPEED = 150;
const UFO_Y = 62;
const RESPAWN = 1.2;
const EXTRA_LIFE_AT = 1500;

/** Bunker bitmaps are built from 4 px cells. */
export const BRICK = 4;
const BUNKER_COLS = 22;
const BUNKER_ROWS = 16;
const BUNKER_Y = 400;

export interface Alien {
  row: number;
  col: number;
  alive: boolean;
}

export interface Shot {
  x: number;
  y: number;
}

export interface Bunker {
  x: number;
  y: number;
  /** Row-major solid flags, BUNKER_COLS × BUNKER_ROWS. */
  cells: boolean[];
}

export interface Ufo {
  x: number;
  dir: 1 | -1;
}

export interface Blast {
  x: number;
  y: number;
  life: number;
  color: 'alien' | 'ufo' | 'player';
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
}

export type InvasionEvent = 'shoot' | 'march' | 'kill' | 'ufo' | 'ufoKill' | 'die' | 'life' | 'wave' | 'gameover';

export interface InvasionState {
  aliens: Alien[];
  /** Top-left of the formation grid. */
  originX: number;
  originY: number;
  dir: 1 | -1;
  frame: 0 | 1;
  marchTimer: number;
  marchNote: number;
  playerX: number;
  shot: Shot | null;
  bombs: Shot[];
  bombTimer: number;
  bunkers: Bunker[];
  ufo: Ufo | null;
  ufoTimer: number;
  shotsFired: number;
  blasts: Blast[];
  popups: Popup[];
  score: number;
  lives: number;
  nextLifeAt: number;
  wave: number;
  dying: number;
  over: boolean;
  events: InvasionEvent[];
  rng: () => number;
}

export interface Input {
  left: boolean;
  right: boolean;
  fire: boolean;
}

export const ROW_POINTS = [30, 20, 20, 10, 10];
const UFO_POINTS = [50, 100, 150, 300];

function buildBunker(x: number): Bunker {
  const cells: boolean[] = [];
  for (let r = 0; r < BUNKER_ROWS; r++) {
    for (let c = 0; c < BUNKER_COLS; c++) {
      // Rounded top corners and an arch cut out of the base.
      const corner = r < 4 && (c < 4 - r || c > BUNKER_COLS - 5 + r);
      const archHalf = r >= 10 ? Math.min(5, r - 8) : 0;
      const arch = archHalf > 0 && Math.abs(c - (BUNKER_COLS - 1) / 2) < archHalf + 0.5;
      cells.push(!corner && !arch);
    }
  }
  return { x, y: BUNKER_Y, cells };
}

function buildWave(state: InvasionState) {
  state.aliens = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) state.aliens.push({ row, col, alive: true });
  }
  state.originX = START_X;
  state.originY = Math.min(MAX_START_Y, START_Y + (state.wave - 1) * WAVE_DROP);
  state.dir = 1;
  state.marchTimer = 0.6;
  state.shot = null;
  state.bombs = [];
  state.bombTimer = 1.2;
  state.ufo = null;
  state.ufoTimer = 18;
  state.bunkers = [0, 1, 2, 3].map((i) => buildBunker(150 + i * 200));
}

export function createInvasion(seed = Date.now()): InvasionState {
  const state = {
    playerX: WIDTH / 2,
    frame: 0,
    marchNote: 0,
    shotsFired: 0,
    blasts: [],
    popups: [],
    score: 0,
    lives: 3,
    nextLifeAt: EXTRA_LIFE_AT,
    wave: 1,
    dying: 0,
    over: false,
    events: [],
    rng: createRng(seed),
  } as unknown as InvasionState;
  buildWave(state);
  return state;
}

export function alienPos(state: InvasionState, alien: Alien): { x: number; y: number } {
  return { x: state.originX + alien.col * CELL_X, y: state.originY + alien.row * CELL_Y };
}

function alive(state: InvasionState): Alien[] {
  return state.aliens.filter((alien) => alien.alive);
}

/** Seconds between formation steps: the fewer aliens, the faster they march. */
export function marchInterval(remaining: number, wave: number): number {
  const base = 0.018 + 0.62 * (remaining / (ROWS * COLS));
  return Math.max(0.016, base * Math.pow(0.94, wave - 1));
}

/** Clears bunker cells around a point. Returns true when something solid was hit. */
function erode(state: InvasionState, x: number, y: number, radius: number): boolean {
  for (const bunker of state.bunkers) {
    const c = Math.floor((x - bunker.x) / BRICK);
    const r = Math.floor((y - bunker.y) / BRICK);
    if (c < 0 || c >= BUNKER_COLS || r < 0 || r >= BUNKER_ROWS) continue;
    if (!bunker.cells[r * BUNKER_COLS + c]) continue;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= BUNKER_ROWS || cc < 0 || cc >= BUNKER_COLS) continue;
        // Ragged edges: corners of the blast survive half the time.
        if (Math.abs(dr) + Math.abs(dc) > radius && state.rng() < 0.5) continue;
        bunker.cells[rr * BUNKER_COLS + cc] = false;
      }
    }
    return true;
  }
  return false;
}

export function bunkerCell(bunker: Bunker, col: number, row: number): boolean {
  return bunker.cells[row * BUNKER_COLS + col];
}

export const BUNKER_SIZE = { cols: BUNKER_COLS, rows: BUNKER_ROWS };

function addScore(state: InvasionState, points: number) {
  state.score += points;
  if (state.score >= state.nextLifeAt) {
    state.nextLifeAt = Number.POSITIVE_INFINITY; // one bonus life, as in the arcades
    state.lives += 1;
    state.events.push('life');
  }
}

function march(state: InvasionState) {
  const living = alive(state);
  const xs = living.map((alien) => alienPos(state, alien).x);
  const left = Math.min(...xs) - ALIEN_W / 2;
  const right = Math.max(...xs) + ALIEN_W / 2;
  if ((state.dir === 1 && right + STEP_X > WIDTH - MARGIN) || (state.dir === -1 && left - STEP_X < MARGIN)) {
    state.originY += STEP_DOWN;
    state.dir = state.dir === 1 ? -1 : 1;
  } else {
    state.originX += STEP_X * state.dir;
  }
  state.frame = state.frame === 0 ? 1 : 0;
  state.marchNote = (state.marchNote + 1) % 4;
  state.events.push('march');

  // Aliens grind through bunkers as they descend.
  for (const alien of alive(state)) {
    const { x, y } = alienPos(state, alien);
    for (const bunker of state.bunkers) {
      if (x + ALIEN_W / 2 < bunker.x || x - ALIEN_W / 2 > bunker.x + BUNKER_COLS * BRICK) continue;
      if (y + ALIEN_H / 2 < bunker.y || y - ALIEN_H / 2 > bunker.y + BUNKER_ROWS * BRICK) continue;
      for (let r = 0; r < BUNKER_ROWS; r++) {
        for (let c = 0; c < BUNKER_COLS; c++) {
          const cx = bunker.x + c * BRICK;
          const cy = bunker.y + r * BRICK;
          if (Math.abs(cx - x) <= ALIEN_W / 2 && Math.abs(cy - y) <= ALIEN_H / 2) {
            bunker.cells[r * BUNKER_COLS + c] = false;
          }
        }
      }
    }
  }
}

function dropBomb(state: InvasionState) {
  const living = alive(state);
  // Only the lowest alien in each column can fire; favour the one above the player.
  const shooters = new Map<number, Alien>();
  for (const alien of living) {
    const current = shooters.get(alien.col);
    if (!current || alien.row > current.row) shooters.set(alien.col, alien);
  }
  const options = [...shooters.values()];
  let shooter = options[Math.floor(state.rng() * options.length)];
  if (state.rng() < 0.4) {
    shooter = options.reduce((best, alien) =>
      Math.abs(alienPos(state, alien).x - state.playerX) < Math.abs(alienPos(state, best).x - state.playerX)
        ? alien
        : best
    );
  }
  const { x, y } = alienPos(state, shooter);
  state.bombs.push({ x, y: y + ALIEN_H / 2 });
}

function killPlayer(state: InvasionState) {
  state.blasts.push({ x: state.playerX, y: PLAYER_Y, life: RESPAWN, color: 'player' });
  state.lives -= 1;
  state.dying = RESPAWN;
  state.bombs = [];
  state.shot = null;
  state.events.push('die');
}

export function step(state: InvasionState, input: Input, dt: number): void {
  state.events = [];
  if (state.over) return;

  for (const blast of state.blasts) blast.life -= dt;
  state.blasts = state.blasts.filter((blast) => blast.life > 0);
  for (const popup of state.popups) popup.life -= dt;
  state.popups = state.popups.filter((popup) => popup.life > 0);

  if (state.dying > 0) {
    state.dying -= dt;
    if (state.dying <= 0) {
      if (state.lives <= 0) {
        state.over = true;
        state.events.push('gameover');
        return;
      }
      state.playerX = WIDTH / 2;
    }
    return;
  }

  // Player.
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  state.playerX = Math.max(MARGIN + PLAYER_HALF, Math.min(WIDTH - MARGIN - PLAYER_HALF, state.playerX + dir * PLAYER_SPEED * dt));
  if (input.fire && !state.shot) {
    state.shot = { x: state.playerX, y: PLAYER_Y - 18 };
    state.shotsFired += 1;
    state.events.push('shoot');
  }

  // Player shot.
  if (state.shot) {
    const shot = state.shot;
    shot.y -= SHOT_SPEED * dt;
    let spent = shot.y < 30;
    if (!spent && erode(state, shot.x, shot.y, 1)) spent = true;
    if (!spent) {
      for (const alien of state.aliens) {
        if (!alien.alive) continue;
        const { x, y } = alienPos(state, alien);
        if (Math.abs(shot.x - x) <= ALIEN_W / 2 && Math.abs(shot.y - y) <= ALIEN_H / 2) {
          alien.alive = false;
          addScore(state, ROW_POINTS[alien.row]);
          state.blasts.push({ x, y, life: 0.25, color: 'alien' });
          state.events.push('kill');
          spent = true;
          break;
        }
      }
    }
    if (!spent && state.ufo && Math.abs(shot.x - state.ufo.x) <= 26 && Math.abs(shot.y - UFO_Y) <= 12) {
      // Fixed value cycle keyed to shots fired, like the arcade's well-known trick.
      const points = UFO_POINTS[state.shotsFired % UFO_POINTS.length];
      addScore(state, points);
      state.blasts.push({ x: state.ufo.x, y: UFO_Y, life: 0.5, color: 'ufo' });
      state.popups.push({ x: state.ufo.x, y: UFO_Y, text: String(points), life: 1.2 });
      state.ufo = null;
      state.events.push('ufoKill');
      spent = true;
    }
    if (!spent) {
      for (const bomb of state.bombs) {
        if (Math.abs(bomb.x - shot.x) < 6 && Math.abs(bomb.y - shot.y) < 12) {
          state.bombs = state.bombs.filter((other) => other !== bomb);
          spent = true;
          break;
        }
      }
    }
    if (spent) state.shot = null;
  }

  const living = alive(state);
  if (living.length === 0) {
    state.wave += 1;
    state.events.push('wave');
    buildWave(state);
    return;
  }

  // Formation.
  state.marchTimer -= dt;
  if (state.marchTimer <= 0) {
    march(state);
    state.marchTimer = marchInterval(living.length, state.wave);
  }
  const lowest = Math.max(...living.map((alien) => alienPos(state, alien).y));
  if (lowest + ALIEN_H / 2 >= PLAYER_Y - 12) {
    state.lives = 0;
    killPlayer(state);
    return;
  }

  // Alien bombs.
  state.bombTimer -= dt;
  if (state.bombTimer <= 0 && state.bombs.length < MAX_BOMBS) {
    dropBomb(state);
    state.bombTimer = 0.5 + state.rng() * Math.max(0.3, 1.3 - state.wave * 0.1);
  }
  for (const bomb of state.bombs) bomb.y += BOMB_SPEED * dt;
  state.bombs = state.bombs.filter((bomb) => {
    if (bomb.y > GROUND_Y) return false;
    if (erode(state, bomb.x, bomb.y, 1)) return false;
    if (Math.abs(bomb.x - state.playerX) <= PLAYER_HALF && bomb.y >= PLAYER_Y - 12 && bomb.y <= PLAYER_Y + 12) {
      killPlayer(state);
      return false;
    }
    return true;
  });
  if (state.dying > 0) return;

  // Mystery ship.
  if (state.ufo) {
    state.ufo.x += state.ufo.dir * UFO_SPEED * dt;
    if (state.ufo.x < -40 || state.ufo.x > WIDTH + 40) state.ufo = null;
  } else {
    state.ufoTimer -= dt;
    if (state.ufoTimer <= 0 && living.length > 7) {
      const dir = state.rng() < 0.5 ? 1 : -1;
      state.ufo = { x: dir === 1 ? -30 : WIDTH + 30, dir };
      state.ufoTimer = 20 + state.rng() * 8;
      state.events.push('ufo');
    }
  }
}
