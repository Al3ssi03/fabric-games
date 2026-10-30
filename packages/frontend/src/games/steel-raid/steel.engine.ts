import { clamp, createRng } from '../engine/canvas';
import {
  ARENA_START,
  GROUND,
  LEDGES,
  POWS,
  VIEW_WIDTH,
  WAVES,
  WORLD_END,
  type EnemyKind,
  type PickupKind,
} from './level';

// Tuning, in pixels and seconds.
const GRAVITY = 1900;
const JUMP = 760;
const RUN = 230;
const CROUCH_RUN = 90;
const PISTOL_SPEED = 820;
const PISTOL_COOLDOWN = 0.16;
const HEAVY_SPEED = 920;
const HEAVY_COOLDOWN = 0.075;
const HEAVY_AMMO = 200;
const START_BOMBS = 10;
const BLAST_RADIUS = 70;
const BLAST_DAMAGE = 5;
const KNIFE_REACH = 46;
const RESPAWN_DELAY = 1.4;
const INVULNERABLE = 2.5;
const WIN_DELAY = 3;
const STAND_HEIGHT = 52;
const CROUCH_HEIGHT = 34;
const HERO_HALF = 14;

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpPressed: boolean;
  fireHeld: boolean;
  firePressed: boolean;
  grenadePressed: boolean;
}

export const IDLE: Input = {
  left: false, right: false, up: false, down: false,
  jumpPressed: false, fireHeld: false, firePressed: false, grenadePressed: false,
};

export type Aim = 'side' | 'up' | 'down';
export type Weapon = 'pistol' | 'heavy';

export interface Hero {
  x: number;
  y: number; // feet
  vx: number;
  vy: number;
  grounded: boolean;
  crouch: boolean;
  facing: 1 | -1;
  aim: Aim;
  weapon: Weapon;
  ammo: number;
  bombs: number;
  cooldown: number;
  muzzle: number; // flash timer
  knife: number; // slash animation timer
  invulnerable: number;
  dead: boolean;
  deathTimer: number;
  stride: number;
}

export interface Enemy {
  kind: EnemyKind;
  x: number;
  y: number; // feet; center for drones
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  timer: number;
  burst: number;
  range: number;
  grounded: boolean;
  locking: boolean;
  dead: boolean;
  deathTimer: number;
  flash: number;
  stride: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'hero' | 'enemy';
  heavy: boolean;
}

export interface Bomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'hero' | 'enemy';
  bounces: number;
  spin: number;
  shell: boolean; // tank shell: bigger blast, no bounce
}

export interface Blast {
  x: number;
  y: number;
  radius: number;
  life: number;
  max: number;
}

export interface Pow {
  x: number;
  y: number;
  drop: PickupKind;
  state: 'tied' | 'freed' | 'gone';
  timer: number;
}

export interface Pickup {
  x: number;
  y: number;
  vy: number;
  kind: PickupKind;
  taken: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: 'spark' | 'debris' | 'smoke' | 'casing';
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
}

export type SteelEvent =
  | 'shot' | 'heavy' | 'enemyShot' | 'throw' | 'explode' | 'hit' | 'kill' | 'knife'
  | 'pickup' | 'free' | 'die' | 'respawn' | 'boss' | 'gameover' | 'win';

export interface SteelState {
  hero: Hero;
  enemies: Enemy[];
  bullets: Bullet[];
  bombs: Bomb[];
  blasts: Blast[];
  pows: Pow[];
  pickups: Pickup[];
  particles: Particle[];
  popups: Popup[];
  cameraX: number;
  nextWave: number;
  lockX: number | null;
  score: number;
  lives: number;
  time: number;
  shake: number;
  boss: Enemy | null;
  winTimer: number;
  over: boolean;
  won: boolean;
  events: SteelEvent[];
  rng: () => number;
}

const ENEMY_STATS: Record<EnemyKind, { hp: number; points: number }> = {
  soldier: { hp: 1, points: 100 },
  gunner: { hp: 6, points: 300 },
  drone: { hp: 3, points: 200 },
  tank: { hp: 50, points: 5000 },
};

const PICKUP_POINTS = 1000;
const POW_POINTS = 500;

function spawnHero(x: number): Hero {
  return {
    x, y: GROUND, vx: 0, vy: 0, grounded: true, crouch: false, facing: 1, aim: 'side',
    weapon: 'pistol', ammo: 0, bombs: START_BOMBS, cooldown: 0, muzzle: 0, knife: 0,
    invulnerable: 0, dead: false, deathTimer: 0, stride: 0,
  };
}

export function createMission(seed = Date.now()): SteelState {
  return {
    hero: spawnHero(160),
    enemies: [],
    bullets: [],
    bombs: [],
    blasts: [],
    pows: POWS.map((pow) => ({ x: pow.x, y: GROUND, drop: pow.drop, state: 'tied', timer: 0 })),
    pickups: [],
    particles: [],
    popups: [],
    cameraX: 0,
    nextWave: 0,
    lockX: null,
    score: 0,
    lives: 3,
    time: 0,
    shake: 0,
    boss: null,
    winTimer: 0,
    over: false,
    won: false,
    events: [],
    rng: createRng(seed),
  };
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function heroBox(hero: Hero): Box {
  const h = hero.crouch ? CROUCH_HEIGHT : STAND_HEIGHT;
  return { x: hero.x - HERO_HALF, y: hero.y - h, w: HERO_HALF * 2, h };
}

export function enemyBox(enemy: Enemy): Box {
  switch (enemy.kind) {
    case 'soldier':
      return { x: enemy.x - 14, y: enemy.y - 50, w: 28, h: 50 };
    case 'gunner':
      return { x: enemy.x - 20, y: enemy.y - 44, w: 40, h: 44 };
    case 'drone':
      return { x: enemy.x - 24, y: enemy.y - 12, w: 48, h: 24 };
    case 'tank':
      return { x: enemy.x - 110, y: enemy.y - 120, w: 220, h: 120 };
  }
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function contains(box: Box, x: number, y: number): boolean {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

/** Height of the floor under `x` for something falling from `fromY` to `toY`. */
function landingY(x: number, fromY: number, toY: number): number | null {
  for (const ledge of LEDGES) {
    if (x >= ledge.x && x <= ledge.x + ledge.w && fromY <= ledge.y && toY >= ledge.y) {
      return ledge.y;
    }
  }
  return toY >= GROUND ? GROUND : null;
}

function popup(state: SteelState, x: number, y: number, text: string) {
  state.popups.push({ x, y, text, life: 1 });
}

function burst(state: SteelState, x: number, y: number, count: number, kind: Particle['kind'], power = 260) {
  for (let i = 0; i < count; i++) {
    const angle = state.rng() * Math.PI * 2;
    const speed = power * (0.3 + state.rng() * 0.7);
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - power * 0.4,
      life: 0.5 + state.rng() * 0.5,
      kind,
    });
  }
}

function spawnEnemy(state: SteelState, kind: EnemyKind, x: number, y: number, locking: boolean): Enemy {
  const { hp } = ENEMY_STATS[kind];
  const enemy: Enemy = {
    kind, x, y, vx: 0, vy: 0, hp, maxHp: hp, facing: -1,
    timer: 0.8 + state.rng() * 0.8, burst: 0, range: 180 + state.rng() * 220,
    grounded: kind !== 'drone', locking, dead: false, deathTimer: 0, flash: 0, stride: 0,
  };
  state.enemies.push(enemy);
  if (kind === 'tank') {
    state.boss = enemy;
    state.events.push('boss');
  }
  return enemy;
}

function killEnemy(state: SteelState, enemy: Enemy) {
  enemy.dead = true;
  enemy.hp = 0;
  enemy.deathTimer = enemy.kind === 'tank' ? WIN_DELAY : 0.7;
  const points = ENEMY_STATS[enemy.kind].points;
  state.score += points;
  const box = enemyBox(enemy);
  popup(state, enemy.x, box.y - 6, `${points}`);
  state.events.push('kill');
  if (enemy.kind === 'drone' || enemy.kind === 'gunner') {
    explode(state, enemy.x, box.y + box.h / 2, 'none', 40);
  }
  if (enemy.kind === 'tank') {
    explode(state, enemy.x, box.y + box.h / 2, 'none', 140);
    state.winTimer = WIN_DELAY;
  }
}

function damageEnemy(state: SteelState, enemy: Enemy, amount: number) {
  if (enemy.dead) return;
  enemy.hp -= amount;
  enemy.flash = 0.08;
  if (enemy.hp <= 0) killEnemy(state, enemy);
  else state.events.push('hit');
}

function killHero(state: SteelState) {
  const hero = state.hero;
  if (hero.dead || hero.invulnerable > 0 || state.winTimer > 0) return;
  hero.dead = true;
  hero.deathTimer = RESPAWN_DELAY;
  hero.vx = 0;
  hero.vy = -420;
  hero.grounded = false;
  state.lives -= 1;
  state.events.push('die');
  burst(state, hero.x, hero.y - 30, 10, 'spark');
}

/** `target` says who the blast can hurt; scenery-only blasts pass `none`. */
function explode(state: SteelState, x: number, y: number, target: 'hero' | 'enemy' | 'none', radius = BLAST_RADIUS) {
  state.blasts.push({ x, y, radius, life: 0.45, max: 0.45 });
  state.shake = Math.max(state.shake, radius / 280);
  state.events.push('explode');
  burst(state, x, y, 8, 'debris', 320);
  burst(state, x, y, 6, 'smoke', 120);
  if (target === 'enemy') {
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const box = enemyBox(enemy);
      const nx = clamp(x, box.x, box.x + box.w);
      const ny = clamp(y, box.y, box.y + box.h);
      if (Math.hypot(nx - x, ny - y) <= radius) damageEnemy(state, enemy, BLAST_DAMAGE);
    }
  } else if (target === 'hero' && !state.hero.dead) {
    const box = heroBox(state.hero);
    const nx = clamp(x, box.x, box.x + box.w);
    const ny = clamp(y, box.y, box.y + box.h);
    if (Math.hypot(nx - x, ny - y) <= radius * 0.75) killHero(state);
  }
}

function freePow(state: SteelState, pow: Pow) {
  if (pow.state !== 'tied') return;
  pow.state = 'freed';
  pow.timer = 0.9;
  state.score += POW_POINTS;
  popup(state, pow.x, pow.y - 60, 'THANK YOU!');
  state.pickups.push({ x: pow.x + 26, y: pow.y - 30, vy: -260, kind: pow.drop, taken: false });
  state.events.push('free');
}

function fire(state: SteelState) {
  const hero = state.hero;
  // Close-range targets get the knife instead of a bullet.
  const box = heroBox(hero);
  const target = state.enemies.find(
    (enemy) =>
      !enemy.dead &&
      (enemy.kind === 'soldier' || enemy.kind === 'gunner') &&
      Math.abs(enemy.x - hero.x) < KNIFE_REACH &&
      overlaps(box, enemyBox(enemy))
  );
  if (target && hero.aim === 'side') {
    hero.knife = 0.22;
    hero.cooldown = 0.3;
    state.events.push('knife');
    damageEnemy(state, target, 3);
    return;
  }

  const heavy = hero.weapon === 'heavy';
  const speed = heavy ? HEAVY_SPEED : PISTOL_SPEED;
  const jitter = heavy ? (state.rng() - 0.5) * 8 : 0;
  let x = hero.x + hero.facing * 24;
  let y = hero.y - (hero.crouch ? 22 : 34) + jitter;
  let vx = hero.facing * speed;
  let vy = 0;
  if (hero.aim === 'up') {
    x = hero.x + hero.facing * 6 + jitter;
    y = hero.y - 60;
    vx = 0;
    vy = -speed;
  } else if (hero.aim === 'down') {
    x = hero.x + jitter;
    y = hero.y - 6;
    vx = 0;
    vy = speed;
  }
  state.bullets.push({ x, y, vx, vy, owner: 'hero', heavy });
  hero.muzzle = 0.06;
  state.particles.push({
    x: hero.x, y: hero.y - 36, vx: -hero.facing * 80, vy: -200, life: 0.6, kind: 'casing',
  });
  if (heavy) {
    hero.cooldown = HEAVY_COOLDOWN;
    hero.ammo -= 1;
    if (hero.ammo <= 0) {
      hero.weapon = 'pistol';
      hero.ammo = 0;
    }
    state.events.push('heavy');
  } else {
    hero.cooldown = PISTOL_COOLDOWN;
    state.events.push('shot');
  }
}

function updateHero(state: SteelState, input: Input, dt: number) {
  const hero = state.hero;
  hero.muzzle = Math.max(0, hero.muzzle - dt);
  hero.knife = Math.max(0, hero.knife - dt);

  if (hero.dead) {
    hero.vy += GRAVITY * dt;
    hero.y = Math.min(GROUND, hero.y + hero.vy * dt);
    hero.deathTimer -= dt;
    if (hero.deathTimer <= 0) {
      if (state.lives <= 0) {
        state.over = true;
        state.events.push('gameover');
        return;
      }
      const x = clamp(hero.x, state.cameraX + 120, state.cameraX + VIEW_WIDTH - 120);
      state.hero = spawnHero(x);
      state.hero.invulnerable = INVULNERABLE;
      state.bullets = state.bullets.filter((bullet) => bullet.owner === 'hero');
      state.events.push('respawn');
    }
    return;
  }

  hero.invulnerable = Math.max(0, hero.invulnerable - dt);
  hero.cooldown -= dt;

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) hero.facing = dir as 1 | -1;
  hero.crouch = hero.grounded && input.down;
  hero.aim = input.up ? 'up' : !hero.grounded && input.down ? 'down' : 'side';
  hero.vx = dir * (hero.crouch ? CROUCH_RUN : RUN);

  if (input.jumpPressed && hero.grounded) {
    hero.vy = -JUMP;
    hero.grounded = false;
    hero.crouch = false;
  }

  const wantsFire = hero.weapon === 'heavy' ? input.fireHeld : input.firePressed;
  if (wantsFire && hero.cooldown <= 0) fire(state);

  if (input.grenadePressed && hero.bombs > 0) {
    const live = state.bombs.filter((bomb) => bomb.owner === 'hero').length;
    if (live < 2) {
      hero.bombs -= 1;
      state.bombs.push({
        x: hero.x + hero.facing * 10, y: hero.y - 44,
        vx: hero.facing * 330 + hero.vx * 0.5, vy: -480,
        owner: 'hero', bounces: 1, spin: 0, shell: false,
      });
      state.events.push('throw');
    }
  }

  const prevY = hero.y;
  hero.vy += GRAVITY * dt;
  hero.x += hero.vx * dt;
  hero.y += hero.vy * dt;
  const maxX = Math.min(WORLD_END - 20, state.cameraX + VIEW_WIDTH - 20);
  hero.x = clamp(hero.x, state.cameraX + 16, maxX);
  // The boss tank is a wall: nobody slips behind it, even while invulnerable.
  if (state.boss && !state.boss.dead) {
    hero.x = Math.min(hero.x, enemyBox(state.boss).x - HERO_HALF);
  }

  hero.grounded = false;
  if (hero.vy >= 0) {
    const floor = landingY(hero.x, prevY, hero.y);
    if (floor !== null) {
      hero.y = floor;
      hero.vy = 0;
      hero.grounded = true;
    }
  }
  if (hero.grounded && dir !== 0) hero.stride += dt * (hero.crouch ? 6 : 12);
}

function enemyShoot(state: SteelState, enemy: Enemy, y: number, speed: number) {
  state.bullets.push({
    x: enemy.x + enemy.facing * 22, y, vx: enemy.facing * speed, vy: 0, owner: 'enemy', heavy: false,
  });
  state.events.push('enemyShot');
}

function lob(state: SteelState, fromX: number, fromY: number, flight: number, shell: boolean) {
  const hero = state.hero;
  state.bombs.push({
    x: fromX, y: fromY,
    vx: (hero.x - fromX) / flight,
    vy: (GROUND - 10 - fromY) / flight - 0.5 * GRAVITY * flight,
    owner: 'enemy', bounces: 0, spin: 0, shell,
  });
  state.events.push('throw');
}

function updateEnemy(state: SteelState, enemy: Enemy, dt: number) {
  const hero = state.hero;
  enemy.flash = Math.max(0, enemy.flash - dt);
  if (enemy.dead) {
    enemy.deathTimer -= dt;
    if (enemy.kind === 'drone') {
      enemy.vy += GRAVITY * dt;
      enemy.y = Math.min(GROUND - 12, enemy.y + enemy.vy * dt);
    }
    if (enemy.kind === 'tank' && state.rng() < dt * 8) {
      const box = enemyBox(enemy);
      explode(state, box.x + state.rng() * box.w, box.y + state.rng() * box.h, 'none', 40);
    }
    return;
  }

  const dx = hero.x - enemy.x;
  const dist = Math.abs(dx);
  const heroAlive = !hero.dead;
  enemy.timer -= dt;

  switch (enemy.kind) {
    case 'soldier': {
      enemy.facing = dx >= 0 ? 1 : -1;
      // Always walk into view first, so nobody holds a locked screen from off camera.
      const offscreen = enemy.x > state.cameraX + VIEW_WIDTH - 30 || enemy.x < state.cameraX + 30;
      enemy.vx = dist > enemy.range || offscreen ? enemy.facing * 90 : 0;
      if (enemy.vx !== 0) enemy.stride += dt * 10;
      if (enemy.timer <= 0 && heroAlive && dist < 640) {
        if (dist < 380 && state.rng() < 0.25) lob(state, enemy.x, enemy.y - 44, 0.9, false);
        else enemyShoot(state, enemy, enemy.y - 38, 340);
        enemy.timer = 1.5 + state.rng() * 1.2;
      }
      break;
    }
    case 'gunner': {
      enemy.facing = dx >= 0 ? 1 : -1;
      if (enemy.timer <= 0 && heroAlive && dist < 720) {
        enemyShoot(state, enemy, enemy.y - 30, 420);
        enemy.burst += 1;
        if (enemy.burst >= 3) {
          enemy.burst = 0;
          enemy.timer = 2 + state.rng();
        } else {
          enemy.timer = 0.14;
        }
      }
      break;
    }
    case 'drone': {
      enemy.facing = dx >= 0 ? 1 : -1;
      enemy.vx = clamp(dx * 2, -150, 150);
      enemy.stride += dt;
      enemy.y += Math.sin(enemy.stride * 4) * 20 * dt;
      if (enemy.timer <= 0 && heroAlive && dist < 90) {
        state.bombs.push({
          x: enemy.x, y: enemy.y + 14, vx: 0, vy: 0, owner: 'enemy', bounces: 0, spin: 0, shell: false,
        });
        state.events.push('throw');
        enemy.timer = 2.2;
      }
      break;
    }
    case 'tank': {
      const home = ARENA_START + 760;
      enemy.facing = -1;
      if (enemy.x > home + 4 && enemy.burst === 0) {
        enemy.vx = -120; // rolling into the arena
        enemy.timer = Math.max(enemy.timer, 1);
      } else {
        enemy.burst = Math.max(enemy.burst, 1);
        const patrol = home - 160 + Math.sin(state.time * 0.6) * 160;
        enemy.vx = clamp((patrol - enemy.x) * 2, -90, 90);
      }
      enemy.stride += enemy.vx * dt * 0.05;
      if (enemy.timer <= 0 && heroAlive && enemy.burst > 0) {
        // Alternate a lobbed shell with a low machine-gun sweep you must jump.
        if (enemy.burst % 2 === 1) {
          lob(state, enemy.x - 80, enemy.y - 110, 1.1, true);
          enemy.timer = 1.4;
        } else {
          for (let i = 0; i < 4; i++) {
            state.bullets.push({
              x: enemy.x - 110 - i * 46, y: enemy.y - 18, vx: -380, vy: 0, owner: 'enemy', heavy: false,
            });
          }
          state.events.push('enemyShot');
          enemy.timer = 2 - (1 - enemy.hp / enemy.maxHp) * 0.8;
        }
        enemy.burst += 1;
      }
      if (heroAlive && overlaps(heroBox(hero), enemyBox(enemy))) killHero(state);
      break;
    }
  }

  if (enemy.kind === 'drone') {
    enemy.x += enemy.vx * dt;
    return;
  }
  const prevY = enemy.y;
  enemy.x += enemy.vx * dt;
  if (!enemy.grounded) {
    enemy.vy += GRAVITY * dt;
    enemy.y += enemy.vy * dt;
    const floor = landingY(enemy.x, prevY, enemy.y);
    if (floor !== null) {
      enemy.y = floor;
      enemy.vy = 0;
      enemy.grounded = true;
    }
  }
}

function updateBullets(state: SteelState, dt: number) {
  const hero = state.hero;
  const left = state.cameraX - 40;
  const right = state.cameraX + VIEW_WIDTH + 40;
  state.bullets = state.bullets.filter((bullet) => {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.x < left || bullet.x > right || bullet.y < -40 || bullet.y > GROUND + 4) {
      if (bullet.y > GROUND) burst(state, bullet.x, GROUND, 2, 'spark', 120);
      return false;
    }
    if (bullet.owner === 'hero') {
      for (const enemy of state.enemies) {
        if (!enemy.dead && contains(enemyBox(enemy), bullet.x, bullet.y)) {
          damageEnemy(state, enemy, 1);
          burst(state, bullet.x, bullet.y, 3, 'spark', 160);
          return false;
        }
      }
      for (const pow of state.pows) {
        if (pow.state === 'tied' && Math.abs(bullet.x - pow.x) < 16 && bullet.y > pow.y - 40 && bullet.y < pow.y) {
          freePow(state, pow);
          return false;
        }
      }
      return true;
    }
    if (!hero.dead && contains(heroBox(hero), bullet.x, bullet.y)) {
      killHero(state);
      return false;
    }
    return true;
  });
}

function updateBombs(state: SteelState, dt: number) {
  state.bombs = state.bombs.filter((bomb) => {
    const prevY = bomb.y;
    bomb.vy += GRAVITY * dt;
    bomb.x += bomb.vx * dt;
    bomb.y += bomb.vy * dt;
    bomb.spin += dt * 14;
    const target = bomb.owner === 'hero' ? 'enemy' : 'hero';
    const radius = bomb.shell ? 90 : BLAST_RADIUS;

    if (bomb.owner === 'hero') {
      const struck = state.enemies.some((enemy) => !enemy.dead && contains(enemyBox(enemy), bomb.x, bomb.y));
      if (struck) {
        explode(state, bomb.x, bomb.y, target, radius);
        return false;
      }
    } else if (!state.hero.dead && contains(heroBox(state.hero), bomb.x, bomb.y)) {
      explode(state, bomb.x, bomb.y, target, radius);
      return false;
    }

    if (bomb.vy > 0) {
      const floor = landingY(bomb.x, prevY, bomb.y);
      if (floor !== null) {
        if (bomb.bounces > 0) {
          bomb.bounces -= 1;
          bomb.y = floor;
          bomb.vy = -bomb.vy * 0.4;
          bomb.vx *= 0.6;
          return true;
        }
        explode(state, bomb.x, floor - 10, target, radius);
        return false;
      }
    }
    return bomb.x > state.cameraX - 100 && bomb.x < state.cameraX + VIEW_WIDTH + 100;
  });
}

function updatePickups(state: SteelState, dt: number) {
  const hero = state.hero;
  for (const pickup of state.pickups) {
    if (pickup.taken) continue;
    const prevY = pickup.y;
    pickup.vy += GRAVITY * dt;
    pickup.y += pickup.vy * dt;
    if (pickup.vy > 0) {
      const floor = landingY(pickup.x, prevY, pickup.y);
      if (floor !== null) {
        pickup.y = floor;
        pickup.vy = 0;
      }
    }
    if (!hero.dead && overlaps(heroBox(hero), { x: pickup.x - 14, y: pickup.y - 28, w: 28, h: 28 })) {
      pickup.taken = true;
      state.events.push('pickup');
      if (pickup.kind === 'heavy') {
        hero.weapon = 'heavy';
        hero.ammo += HEAVY_AMMO;
        popup(state, pickup.x, pickup.y - 40, 'HEAVY MACHINE GUN!');
      } else if (pickup.kind === 'bombs') {
        hero.bombs += 10;
        popup(state, pickup.x, pickup.y - 40, 'BOMBS +10');
      } else {
        state.score += PICKUP_POINTS;
        popup(state, pickup.x, pickup.y - 40, `${PICKUP_POINTS}`);
      }
    }
  }
  state.pickups = state.pickups.filter((pickup) => !pickup.taken);

  for (const pow of state.pows) {
    if (pow.state === 'tied' && !hero.dead && Math.abs(hero.x - pow.x) < 24 && hero.y > pow.y - 50) {
      freePow(state, pow);
    } else if (pow.state === 'freed') {
      pow.timer -= dt;
      if (pow.timer < 0) pow.x -= 200 * dt; // runs off once he has saluted
      if (pow.x < state.cameraX - 60) pow.state = 'gone';
    }
  }
}

function updateCamera(state: SteelState, dt: number) {
  if (state.lockX !== null && !state.enemies.some((enemy) => enemy.locking && !enemy.dead)) {
    state.lockX = null;
  }
  const hero = state.hero;
  const target = hero.x - VIEW_WIDTH * 0.38;
  if (target > state.cameraX) state.cameraX += (target - state.cameraX) * Math.min(1, dt * 6);
  let max = WORLD_END - VIEW_WIDTH;
  if (state.lockX !== null) max = Math.min(max, state.lockX);
  state.cameraX = clamp(state.cameraX, 0, max);
  if (state.cameraX > ARENA_START - 1) state.cameraX = ARENA_START;

  while (state.nextWave < WAVES.length && state.cameraX + VIEW_WIDTH >= WAVES[state.nextWave].at - 0.5) {
    const wave = WAVES[state.nextWave];
    const edge = state.cameraX + VIEW_WIDTH;
    for (const spec of wave.enemies) {
      const y = spec.y ?? GROUND;
      spawnEnemy(state, spec.kind, edge + spec.dx, y, Boolean(wave.lock));
    }
    if (wave.lock) state.lockX = state.cameraX;
    state.nextWave += 1;
  }
}

function updateEffects(state: SteelState, dt: number) {
  for (const particle of state.particles) {
    particle.life -= dt;
    particle.vy += (particle.kind === 'smoke' ? -200 : GRAVITY * 0.6) * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
  for (const blast of state.blasts) blast.life -= dt;
  state.blasts = state.blasts.filter((blast) => blast.life > 0);
  for (const item of state.popups) {
    item.life -= dt;
    item.y -= 40 * dt;
  }
  state.popups = state.popups.filter((item) => item.life > 0);
  state.shake = Math.max(0, state.shake - dt);
}

export function step(state: SteelState, input: Input, dt: number): void {
  state.events = [];
  if (state.over) return;
  state.time += dt;

  updateHero(state, input, dt);
  if (state.over) return;
  for (const enemy of state.enemies) updateEnemy(state, enemy, dt);
  state.enemies = state.enemies.filter(
    (enemy) =>
      !(enemy.dead && enemy.deathTimer <= 0) &&
      // Stragglers left far behind the scrolling screen are dropped.
      enemy.x > state.cameraX - 300
  );
  updateBullets(state, dt);
  updateBombs(state, dt);
  updatePickups(state, dt);
  updateCamera(state, dt);
  updateEffects(state, dt);

  if (state.winTimer > 0) {
    state.winTimer -= dt;
    if (state.winTimer <= 0) {
      state.score += state.lives * 2000;
      state.over = true;
      state.won = true;
      state.events.push('win');
    }
  }
}
