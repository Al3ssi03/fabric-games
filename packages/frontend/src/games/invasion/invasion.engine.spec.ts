import { describe, expect, it } from 'vitest';

import {
  PLAYER_Y,
  ROW_POINTS,
  alienPos,
  createInvasion,
  marchInterval,
  step,
  type Input,
  type InvasionState,
} from './invasion.engine';

const DT = 1 / 120;
const IDLE: Input = { left: false, right: false, fire: false };

function run(state: InvasionState, input: Partial<Input>, seconds: number) {
  for (let t = 0; t < seconds; t += DT) step(state, { ...IDLE, ...input }, DT);
}

/** Stops alien fire so a test can focus on one mechanic. */
function holdFire(state: InvasionState) {
  state.bombTimer = 999;
}

describe('invasion engine', () => {
  it('starts with a full 5 × 11 formation and three lives', () => {
    const state = createInvasion(1);
    expect(state.aliens.filter((alien) => alien.alive)).toHaveLength(55);
    expect(state.lives).toBe(3);
  });

  it('allows only one player shot on screen', () => {
    const state = createInvasion(1);
    holdFire(state);
    step(state, { ...IDLE, fire: true }, DT);
    const first = state.shot;
    step(state, { ...IDLE, fire: true }, DT);
    expect(state.shot).toBe(first);
  });

  it('shoots the alien above the cannon and scores by row', () => {
    const state = createInvasion(1);
    holdFire(state);
    const target = state.aliens.find((alien) => alien.row === 4 && alien.col === 0)!;
    state.playerX = alienPos(state, target).x;
    state.bunkers = [];
    step(state, { ...IDLE, fire: true }, DT);
    run(state, {}, 1);
    expect(target.alive).toBe(false);
    expect(state.score).toBe(ROW_POINTS[4]);
  });

  it('bunkers absorb shots and erode', () => {
    const state = createInvasion(1);
    holdFire(state);
    const bunker = state.bunkers[0];
    const solid = bunker.cells.filter(Boolean).length;
    state.playerX = bunker.x + 10;
    step(state, { ...IDLE, fire: true }, DT);
    run(state, {}, 0.5);
    expect(state.score).toBe(0);
    expect(bunker.cells.filter(Boolean).length).toBeLessThan(solid);
  });

  it('marches faster as the formation thins out', () => {
    expect(marchInterval(10, 1)).toBeLessThan(marchInterval(55, 1));
    expect(marchInterval(1, 1)).toBeGreaterThan(0);
  });

  it('reverses and drops at the edge', () => {
    const state = createInvasion(1);
    holdFire(state);
    const startY = state.originY;
    run(state, {}, 30);
    expect(state.originY).toBeGreaterThan(startY);
  });

  it('loses a life to a bomb and ends when lives run out', () => {
    const state = createInvasion(1);
    holdFire(state);
    state.lives = 1;
    state.bombs.push({ x: state.playerX, y: PLAYER_Y - 20 });
    run(state, {}, 0.2);
    expect(state.lives).toBe(0);
    run(state, {}, 2);
    expect(state.over).toBe(true);
  });

  it('starts a new, lower wave once every alien is down', () => {
    const state = createInvasion(1);
    for (const alien of state.aliens) alien.alive = false;
    const firstY = state.originY;
    step(state, IDLE, DT);
    expect(state.wave).toBe(2);
    expect(state.aliens.every((alien) => alien.alive)).toBe(true);
    expect(state.originY).toBeGreaterThan(firstY);
  });

  it('awards a bonus life at 1500 points, once', () => {
    const state = createInvasion(1);
    holdFire(state);
    state.score = 1490;
    const target = state.aliens.find((alien) => alien.row === 0 && alien.col === 5)!;
    state.aliens.filter((alien) => alien.col === 5 && alien.row > 0).forEach((alien) => (alien.alive = false));
    state.playerX = alienPos(state, target).x;
    state.bunkers = [];
    step(state, { ...IDLE, fire: true }, DT);
    run(state, {}, 1);
    expect(state.lives).toBe(4);
  });
});
