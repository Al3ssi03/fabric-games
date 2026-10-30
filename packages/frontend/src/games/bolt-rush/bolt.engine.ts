import { ZONES, groundAt, type Enemy, type Level } from './level';

// Tuning, in pixels and seconds.
const ACCEL = 520;
const DECEL = 2400;
const FRICTION = 520;
const TOP_RUN = 640;
const MAX_SPEED = 1800;
const SLOPE_RUN = 1250;
const SLOPE_ROLL_DOWN = 1700;
const SLOPE_ROLL_UP = 520;
const ROLL_FRICTION = 160;
const ROLL_DECEL = 900;
const GRAVITY = 1550;
const JUMP = 690;
const JUMP_CUT = 380;
const AIR_ACCEL = 900;
const HURT_TIME = 0.7;
const INVULNERABLE = 2;
const RESPAWN_DELAY = 2;
const CLEAR_DELAY = 4.5;
const STAND_HEIGHT = 40;
const BALL_HEIGHT = 28;
const HALF_WIDTH = 13;

export interface Input {
  left: boolean;
  right: boolean;
  down: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
}

export type Pose = 'stand' | 'run' | 'ball' | 'skid' | 'spring' | 'hurt' | 'dead' | 'charge';

export interface Hero {
  x: number;
  y: number; // feet
  vx: number;
  vy: number;
  speed: number; // ground speed along the surface
  angle: number;
  grounded: boolean;
  platform: number; // index into level.platforms, or -1 for terrain
  ball: boolean; // rolling or jumping: the attacking state
  jumping: boolean;
  charging: boolean;
  charge: number;
  facing: 1 | -1;
  hurt: number;
  invulnerable: number;
  dead: boolean;
  springTimer: number;
  chain: number; // enemies bounced on without touching ground
  stride: number; // animation phase
}

export type BoltEvent =
  | 'jump' | 'spark' | 'spring' | 'boost' | 'pop' | 'hurt' | 'die'
  | 'charge' | 'dash' | 'checkpoint' | 'clear' | 'life' | 'gameover' | 'win';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: 'spark' | 'dust' | 'pop';
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
}

export interface BoltState {
  zone: number;
  level: Level;
  hero: Hero;
  sparks: number;
  score: number;
  lives: number;
  time: number;
  respawn: { x: number; y: number };
  respawnTimer: number;
  cleared: boolean;
  clearTimer: number;
  bonus: { time: number; sparks: number } | null;
  over: boolean;
  won: boolean;
  nextLifeAt: number;
  particles: Particle[];
  popups: Popup[];
  events: BoltEvent[];
}

function spawnHero(x: number, y: number): Hero {
  return {
    x, y, vx: 0, vy: 0, speed: 0, angle: 0, grounded: true, platform: -1,
    ball: false, jumping: false, charging: false, charge: 0, facing: 1,
    hurt: 0, invulnerable: 0, dead: false, springTimer: 0, chain: 0, stride: 0,
  };
}

function loadZone(state: BoltState, zone: number) {
  const level = ZONES[zone]();
  state.zone = zone;
  state.level = level;
  state.hero = spawnHero(level.start.x, level.start.y);
  state.respawn = { ...level.start };
  state.sparks = 0;
  state.time = 0;
  state.cleared = false;
  state.clearTimer = 0;
  state.bonus = null;
  state.particles = [];
  state.popups = [];
}

export function createRun(): BoltState {
  const state = {
    score: 0,
    lives: 3,
    respawnTimer: 0,
    over: false,
    won: false,
    nextLifeAt: 100,
    events: [],
  } as unknown as BoltState;
  loadZone(state, 0);
  return state;
}

export function timeBonus(seconds: number): number {
  if (seconds < 45) return 10000;
  if (seconds < 60) return 5000;
  if (seconds < 90) return 3000;
  if (seconds < 120) return 2000;
  if (seconds < 180) return 1000;
  return 500;
}

function heroHeight(hero: Hero) {
  return hero.ball || hero.charging ? BALL_HEIGHT : STAND_HEIGHT;
}

function overlaps(
  hero: Hero,
  left: number,
  top: number,
  right: number,
  bottom: number
) {
  return (
    hero.x + HALF_WIDTH > left &&
    hero.x - HALF_WIDTH < right &&
    hero.y > top &&
    hero.y - heroHeight(hero) < bottom
  );
}

function burst(state: BoltState, x: number, y: number, count: number, color: Particle['color']) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const s = 120 + Math.random() * 220;
    state.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: 0.5 + Math.random() * 0.4, color,
    });
  }
}

function addScore(state: BoltState, points: number, x: number, y: number) {
  state.score += points;
  state.popups.push({ x, y, text: String(points), life: 0.9 });
}

function leaveGround(hero: Hero) {
  hero.grounded = false;
  hero.platform = -1;
}

function land(hero: Hero, y: number, angle: number, platform: number) {
  hero.y = y;
  hero.angle = angle;
  hero.platform = platform;
  hero.grounded = true;
  hero.speed = hero.vx * Math.cos(angle) + hero.vy * Math.sin(angle);
  hero.vy = 0;
  hero.jumping = false;
  hero.springTimer = 0;
  hero.chain = 0;
  // Landing ends a jump, but a roll that lands fast keeps rolling.
  if (hero.ball && Math.abs(hero.speed) < 200) hero.ball = false;
  if (hero.hurt > 0) {
    hero.hurt = 0;
    hero.speed = 0;
  }
}

function hurtHero(state: BoltState, fromX: number) {
  const hero = state.hero;
  if (hero.invulnerable > 0 || hero.dead) return;
  if (state.sparks === 0) {
    killHero(state);
    return;
  }
  burst(state, hero.x, hero.y - 20, Math.min(16, state.sparks), 'spark');
  state.sparks = 0;
  hero.hurt = HURT_TIME;
  hero.invulnerable = INVULNERABLE;
  hero.ball = false;
  hero.charging = false;
  leaveGround(hero);
  hero.vx = (hero.x < fromX ? -1 : 1) * 260;
  hero.vy = -460;
  state.events.push('hurt');
}

function killHero(state: BoltState) {
  const hero = state.hero;
  if (hero.dead) return;
  hero.dead = true;
  hero.ball = false;
  hero.charging = false;
  leaveGround(hero);
  hero.vx = 0;
  hero.vy = -720;
  state.respawnTimer = RESPAWN_DELAY;
  state.events.push('die');
}

function stepGround(state: BoltState, input: Input, dt: number) {
  const hero = state.hero;
  const { level } = state;
  const sin = Math.sin(hero.angle);
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  // Charge dash: crouch while stopped, tap jump to rev, let go of down to launch.
  if (hero.charging) {
    if (input.jumpPressed) {
      hero.charge = Math.min(hero.charge + 1, 8);
      state.events.push('charge');
    }
    hero.charge = Math.max(0, hero.charge - hero.charge * 1.8 * dt);
    if (!input.down) {
      hero.charging = false;
      hero.ball = true;
      hero.speed = hero.facing * (820 + hero.charge * 70);
      state.events.push('dash');
    }
    return;
  }
  if (input.down && !hero.ball && Math.abs(hero.speed) < 40 && input.jumpPressed) {
    hero.charging = true;
    hero.charge = 1;
    hero.speed = 0;
    state.events.push('charge');
    return;
  }

  if (input.jumpPressed) {
    hero.vx = hero.speed * Math.cos(hero.angle) + JUMP * sin;
    hero.vy = hero.speed * sin - JUMP * Math.cos(hero.angle);
    leaveGround(hero);
    hero.ball = true;
    hero.jumping = true;
    state.events.push('jump');
    return;
  }

  if (hero.ball) {
    const downhill = Math.sign(hero.speed) === Math.sign(sin);
    hero.speed += (downhill ? SLOPE_ROLL_DOWN : SLOPE_ROLL_UP) * sin * dt;
    if (direction !== 0 && direction !== Math.sign(hero.speed)) {
      hero.speed += direction * ROLL_DECEL * dt;
    }
    hero.speed -= Math.min(Math.abs(hero.speed), ROLL_FRICTION * dt) * Math.sign(hero.speed);
    if (Math.abs(hero.speed) < 40) hero.ball = false;
  } else {
    hero.speed += SLOPE_RUN * sin * dt;
    if (direction !== 0) {
      if (hero.speed !== 0 && Math.sign(hero.speed) !== direction) {
        hero.speed += direction * DECEL * dt;
      } else if (Math.abs(hero.speed) < TOP_RUN) {
        hero.speed = direction * Math.min(TOP_RUN, Math.abs(hero.speed) + ACCEL * dt);
      }
      hero.facing = direction as 1 | -1;
    } else {
      hero.speed -= Math.min(Math.abs(hero.speed), FRICTION * dt) * Math.sign(hero.speed);
    }
    if (input.down && Math.abs(hero.speed) > 120) hero.ball = true;
  }
  hero.speed = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, hero.speed));

  const vx = hero.speed * Math.cos(hero.angle);
  const vy = hero.speed * sin;
  const nextX = Math.max(HALF_WIDTH, Math.min(level.end - HALF_WIDTH, hero.x + vx * dt));
  if (nextX !== hero.x + vx * dt) hero.speed = 0;

  if (hero.platform >= 0) {
    const platform = level.platforms[hero.platform];
    hero.x = nextX;
    if (hero.x < platform.x || hero.x > platform.x + platform.w) {
      leaveGround(hero);
      hero.vx = vx;
      hero.vy = 0;
    }
    return;
  }

  const ground = groundAt(level.segments, nextX);
  const projected = hero.y + vy * dt;
  // Snap generously at speed so the hero hugs hills, but leave the ground at
  // ledges and when the ground falls away faster than the hero is moving down.
  const snap = 12 + Math.abs(hero.speed) * 0.02;
  if (ground && ground.y - projected <= snap && ground.y - projected > -snap - 30) {
    hero.x = nextX;
    hero.y = ground.y;
    hero.angle = ground.angle;
  } else {
    hero.x = nextX;
    hero.y = projected;
    leaveGround(hero);
    hero.vx = vx;
    hero.vy = vy;
  }
}

function stepAir(state: BoltState, input: Input, dt: number) {
  const hero = state.hero;
  const { level } = state;
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (hero.hurt <= 0 && !hero.dead) {
    if (direction !== 0) {
      hero.vx += direction * AIR_ACCEL * dt;
      if (Math.abs(hero.vx) > TOP_RUN && Math.sign(hero.vx) === direction) {
        hero.vx -= direction * AIR_ACCEL * dt; // no gaining speed past run speed in the air
      }
      hero.facing = direction as 1 | -1;
    }
    if (hero.jumping && !input.jumpHeld && hero.vy < -JUMP_CUT) hero.vy = -JUMP_CUT;
  }
  hero.vy += GRAVITY * dt;
  hero.springTimer = Math.max(0, hero.springTimer - dt);

  const previousX = hero.x;
  const previousY = hero.y;
  hero.x += hero.vx * dt;
  hero.y += hero.vy * dt;
  if (hero.dead) return;

  if (hero.x < HALF_WIDTH || hero.x > level.end - HALF_WIDTH) {
    hero.x = Math.max(HALF_WIDTH, Math.min(level.end - HALF_WIDTH, hero.x));
    hero.vx = 0;
  }

  if (hero.vy >= 0) {
    for (let i = 0; i < level.platforms.length; i++) {
      const platform = level.platforms[i];
      if (
        hero.x >= platform.x &&
        hero.x <= platform.x + platform.w &&
        previousY <= platform.y &&
        hero.y >= platform.y
      ) {
        land(hero, platform.y, 0, i);
        return;
      }
    }
  }

  const ground = groundAt(level.segments, hero.x);
  if (ground && hero.y >= ground.y) {
    if (previousY <= ground.y + 24) {
      land(hero, ground.y, ground.angle, -1);
    } else {
      // Deep below the surface means the hero hit a pit wall from the side.
      hero.x = previousX;
      hero.vx = 0;
    }
  }

  if (hero.y > level.lowest + 420) killHero(state);
}

function stepEnemies(state: BoltState, dt: number) {
  const { level } = state;
  for (const enemy of level.enemies) {
    if (!enemy.alive) continue;
    enemy.phase += dt;
    if (enemy.kind === 'crawler') {
      enemy.x += enemy.dir * 70 * dt;
      if (Math.abs(enemy.x - enemy.home) > enemy.range) {
        enemy.dir = enemy.x > enemy.home ? -1 : 1;
      }
      const ground = groundAt(level.segments, enemy.x);
      if (ground) enemy.y = ground.y;
      else enemy.dir = (enemy.dir * -1) as 1 | -1;
    } else {
      enemy.x = enemy.home + Math.sin(enemy.phase * 0.9) * enemy.range;
      enemy.dir = Math.cos(enemy.phase * 0.9) > 0 ? 1 : -1;
      enemy.y = enemy.homeY + Math.sin(enemy.phase * 2.4) * 18;
    }
  }
}

export function enemyBox(enemy: Enemy): [number, number, number, number] {
  return enemy.kind === 'crawler'
    ? [enemy.x - 20, enemy.y - 28, enemy.x + 20, enemy.y]
    : [enemy.x - 18, enemy.y - 14, enemy.x + 18, enemy.y + 14];
}

function interact(state: BoltState) {
  const hero = state.hero;
  const { level } = state;
  if (hero.dead) return;

  for (const spark of level.sparks) {
    if (!spark.taken && overlaps(hero, spark.x - 12, spark.y - 12, spark.x + 12, spark.y + 12)) {
      spark.taken = true;
      state.sparks += 1;
      burst(state, spark.x, spark.y, 5, 'spark');
      state.events.push('spark');
      if (state.sparks >= state.nextLifeAt) {
        state.nextLifeAt += 100;
        state.lives += 1;
        state.events.push('life');
      }
    }
  }

  for (const spring of level.springs) {
    spring.squash = Math.max(0, spring.squash - 1 / 30);
    const box: [number, number, number, number] =
      spring.dir === 'up'
        ? [spring.x - 18, spring.y - 18, spring.x + 18, spring.y]
        : [spring.x - 12, spring.y - 34, spring.x + 12, spring.y];
    if (!overlaps(hero, ...box)) continue;
    if (spring.dir === 'up') {
      if (hero.grounded || hero.vy >= 0) {
        leaveGround(hero);
        hero.vy = -spring.power;
        hero.ball = false;
        hero.jumping = false;
        hero.springTimer = 1.2;
        spring.squash = 1;
        state.events.push('spring');
      }
    } else {
      const dir = spring.dir === 'right' ? 1 : -1;
      hero.facing = dir;
      if (hero.grounded) hero.speed = dir * spring.power;
      else hero.vx = dir * spring.power;
      spring.squash = 1;
      state.events.push('spring');
    }
  }

  for (const boost of level.boosts) {
    if (hero.grounded && overlaps(hero, boost.x - 24, boost.y - 10, boost.x + 24, boost.y + 4)) {
      const fast = boost.dir * Math.max(Math.abs(hero.speed), 1350);
      if (hero.speed !== fast) {
        if (Math.abs(hero.speed) < 1300) state.events.push('boost');
        hero.speed = fast;
        hero.facing = boost.dir;
      }
    }
  }

  for (const spike of level.spikes) {
    if (overlaps(hero, spike.x, spike.y - 18, spike.x + spike.w, spike.y)) {
      hurtHero(state, spike.x + spike.w / 2);
    }
  }

  for (const enemy of level.enemies) {
    if (!enemy.alive) continue;
    const [left, top, right, bottom] = enemyBox(enemy);
    if (!overlaps(hero, left, top, right, bottom)) continue;
    const stomping = !hero.grounded && hero.vy > 0 && hero.y - 10 < top + 14;
    if (hero.ball || hero.charging || stomping) {
      enemy.alive = false;
      burst(state, enemy.x, (top + bottom) / 2, 12, 'pop');
      const chainPoints = [100, 200, 500, 1000];
      addScore(state, chainPoints[Math.min(hero.chain, 3)], enemy.x, top);
      if (!hero.grounded) {
        hero.chain += 1;
        hero.vy = hero.vy > 0 ? -Math.max(420, hero.vy * 0.8) : hero.vy;
      }
      state.events.push('pop');
    } else {
      hurtHero(state, enemy.x);
    }
  }

  for (const checkpoint of level.checkpoints) {
    if (!checkpoint.active && hero.x >= checkpoint.x) {
      checkpoint.active = true;
      state.respawn = { x: checkpoint.x, y: checkpoint.y };
      state.events.push('checkpoint');
    }
  }

  if (!state.cleared && hero.x >= level.goal) {
    state.cleared = true;
    state.clearTimer = CLEAR_DELAY;
    state.bonus = { time: timeBonus(state.time), sparks: state.sparks * 100 };
    state.score += state.bonus.time + state.bonus.sparks;
    state.events.push('clear');
  }
}

function respawn(state: BoltState) {
  // A fresh copy of the zone brings back sparks and enemies, as a retry should.
  const checkpoints = state.level.checkpoints.map((c) => c.active);
  const at = state.respawn;
  const level = ZONES[state.zone]();
  level.checkpoints.forEach((c, i) => (c.active = checkpoints[i]));
  state.level = level;
  state.hero = spawnHero(at.x, at.y);
  state.hero.invulnerable = 1;
  state.sparks = 0;
}

export function step(state: BoltState, input: Input, dt: number): void {
  state.events = [];
  if (state.over) return;
  const hero = state.hero;

  for (const particle of state.particles) {
    particle.vy += 900 * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const popup of state.popups) {
    popup.y -= 50 * dt;
    popup.life -= dt;
  }
  state.popups = state.popups.filter((p) => p.life > 0);

  if (hero.dead) {
    stepAir(state, input, dt);
    state.respawnTimer -= dt;
    if (state.respawnTimer <= 0) {
      state.lives -= 1;
      if (state.lives <= 0) {
        state.over = true;
        state.events.push('gameover');
      } else {
        respawn(state);
      }
    }
    return;
  }

  if (state.cleared) {
    // Coast past the goal, then roll into the next zone.
    state.clearTimer -= dt;
    const coasting: Input = { left: false, right: false, down: false, jumpHeld: false, jumpPressed: false };
    if (hero.grounded) stepGround(state, coasting, dt);
    else stepAir(state, coasting, dt);
    if (state.clearTimer <= 0) {
      if (state.zone + 1 < ZONES.length) {
        loadZone(state, state.zone + 1);
      } else {
        state.over = true;
        state.won = true;
        state.events.push('win');
      }
    }
    return;
  }

  state.time += dt;
  hero.hurt = Math.max(0, hero.hurt - dt);
  hero.invulnerable = Math.max(0, hero.invulnerable - dt);
  const control = hero.hurt > 0 ? { ...input, left: false, right: false, jumpPressed: false } : input;
  if (hero.grounded) stepGround(state, control, dt);
  else stepAir(state, control, dt);
  hero.stride += (Math.abs(hero.grounded ? hero.speed : hero.vx) / 40) * dt;

  if (hero.grounded && !hero.ball && Math.abs(hero.speed) > 260) {
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (direction !== 0 && direction !== Math.sign(hero.speed) && Math.random() < 0.5) {
      state.particles.push({
        x: hero.x, y: hero.y, vx: -hero.speed * 0.2, vy: -80 - Math.random() * 80,
        life: 0.35, color: 'dust',
      });
    }
  }

  stepEnemies(state, dt);
  interact(state);
}

export function poseOf(state: BoltState, input: Input): Pose {
  const hero = state.hero;
  if (hero.dead) return 'dead';
  if (hero.hurt > 0) return 'hurt';
  if (hero.charging) return 'charge';
  if (hero.ball) return 'ball';
  if (hero.springTimer > 0 && hero.vy < 0) return 'spring';
  if (!hero.grounded) return 'run';
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (direction !== 0 && hero.speed !== 0 && direction !== Math.sign(hero.speed) && Math.abs(hero.speed) > 200) {
    return 'skid';
  }
  return Math.abs(hero.speed) > 8 ? 'run' : 'stand';
}
