import { describe, expect, it } from 'vitest';

import { ARENA_START, GROUND, POWS } from './level';
import { IDLE, createMission, step, type Input, type SteelState } from './steel.engine';

const DT = 1 / 120;

function run(state: SteelState, input: Partial<Input>, seconds: number) {
  for (let t = 0; t < seconds; t += DT) step(state, { ...IDLE, ...input }, DT);
}

function addSoldier(state: SteelState, x: number) {
  state.enemies.push({
    kind: 'soldier', x, y: GROUND, vx: 0, vy: 0, hp: 1, maxHp: 1, facing: -1,
    timer: 99, burst: 0, range: 9999, grounded: true, locking: false,
    dead: false, deathTimer: 0, flash: 0, stride: 0,
  });
  return state.enemies[state.enemies.length - 1];
}

describe('steel raid engine', () => {
  it('runs right and scrolls the camera forward only', () => {
    const state = createMission(1);
    run(state, { right: true }, 2);
    expect(state.hero.x).toBeGreaterThan(500);
    expect(state.cameraX).toBeGreaterThan(0);
    run(state, { left: true }, 0.5);
    const camera = state.cameraX;
    run(state, { left: true }, 1);
    expect(state.cameraX).toBe(camera);
    expect(state.hero.x).toBeGreaterThanOrEqual(camera + 16);
  });

  it('jumps and lands back on the ground', () => {
    const state = createMission(1);
    step(state, { ...IDLE, jumpPressed: true }, DT);
    expect(state.hero.grounded).toBe(false);
    run(state, {}, 1.2);
    expect(state.hero.grounded).toBe(true);
    expect(state.hero.y).toBe(GROUND);
  });

  it('shoots a soldier for points', () => {
    const state = createMission(1);
    const soldier = addSoldier(state, 500);
    step(state, { ...IDLE, firePressed: true, fireHeld: true }, DT);
    expect(state.bullets).toHaveLength(1);
    run(state, {}, 0.6);
    expect(soldier.dead).toBe(true);
    expect(state.score).toBe(100);
  });

  it('uses the knife at close range', () => {
    const state = createMission(1);
    const soldier = addSoldier(state, state.hero.x + 20);
    step(state, { ...IDLE, firePressed: true, fireHeld: true }, DT);
    expect(soldier.dead).toBe(true);
    expect(state.bullets).toHaveLength(0);
  });

  it('frees a prisoner who drops a heavy machine gun', () => {
    const state = createMission(1);
    const pow = state.pows[0];
    expect(POWS[0].drop).toBe('heavy');
    state.hero.x = pow.x - 10;
    state.cameraX = pow.x - 400;
    state.hero.invulnerable = 99;
    step(state, IDLE, DT);
    expect(pow.state).toBe('freed');
    run(state, { right: true }, 1);
    expect(state.hero.weapon).toBe('heavy');
    expect(state.hero.ammo).toBe(200);
  });

  it('grenades blow up nearby enemies', () => {
    const state = createMission(1);
    const soldier = addSoldier(state, 420);
    step(state, { ...IDLE, grenadePressed: true }, DT);
    expect(state.hero.bombs).toBe(9);
    run(state, {}, 1.5);
    expect(soldier.dead).toBe(true);
  });

  it('loses a life to an enemy bullet and respawns', () => {
    const state = createMission(1);
    state.bullets.push({ x: state.hero.x + 30, y: GROUND - 38, vx: -300, vy: 0, owner: 'enemy', heavy: false });
    run(state, {}, 0.3);
    expect(state.hero.dead).toBe(true);
    expect(state.lives).toBe(2);
    run(state, {}, 2);
    expect(state.hero.dead).toBe(false);
    expect(state.hero.invulnerable).toBeGreaterThan(0);
  });

  it('crouching ducks under rifle fire', () => {
    const state = createMission(1);
    state.bullets.push({ x: state.hero.x + 30, y: GROUND - 38, vx: -300, vy: 0, owner: 'enemy', heavy: false });
    run(state, { down: true }, 0.3);
    expect(state.hero.dead).toBe(false);
  });

  it('ends the run when the last life is lost', () => {
    const state = createMission(1);
    state.lives = 1;
    state.bullets.push({ x: state.hero.x + 30, y: GROUND - 38, vx: -300, vy: 0, owner: 'enemy', heavy: false });
    run(state, {}, 2);
    expect(state.over).toBe(true);
    expect(state.won).toBe(false);
  });

  it('wins once the boss tank is destroyed', () => {
    const state = createMission(1);
    state.cameraX = ARENA_START;
    state.hero.x = ARENA_START + 100;
    state.nextWave = 8;
    step(state, IDLE, DT);
    expect(state.boss).not.toBeNull();
    state.boss!.hp = 1;
    state.boss!.x = ARENA_START + 400;
    state.hero.invulnerable = 99;
    run(state, { fireHeld: true }, 0.01);
    step(state, { ...IDLE, firePressed: true }, DT);
    run(state, {}, 4);
    expect(state.won).toBe(true);
    expect(state.over).toBe(true);
    expect(state.score).toBeGreaterThanOrEqual(5000);
  });
});
