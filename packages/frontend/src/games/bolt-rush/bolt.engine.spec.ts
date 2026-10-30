import { describe, expect, it } from 'vitest';

import { createRun, step, timeBonus, type Input } from './bolt.engine';
import { ZONES, groundAt } from './level';

const none: Input = { left: false, right: false, down: false, jumpHeld: false, jumpPressed: false };
const run: Input = { ...none, right: true };
const DT = 1 / 120;

describe('bolt rush levels', () => {
  it.each(ZONES.map((zone, i) => [i, zone] as const))('zone %i is well formed', (_, build) => {
    const level = build();
    expect(groundAt(level.segments, level.start.x)).not.toBeNull();
    expect(level.goal).toBeGreaterThan(level.start.x);
    expect(level.goal).toBeLessThan(level.end);
    expect(groundAt(level.segments, level.goal)).not.toBeNull();
    for (let i = 1; i < level.segments.length; i++) {
      expect(level.segments[i].x0).toBeCloseTo(level.segments[i - 1].x1);
    }
  });
});

describe('bolt rush physics', () => {
  it('accelerates up to running speed and stays on the ground', () => {
    const state = createRun();
    for (let i = 0; i < 120; i++) step(state, run, DT);
    expect(state.hero.speed).toBeGreaterThan(400);
    expect(state.hero.grounded).toBe(true);
  });

  it('jumps and lands again', () => {
    const state = createRun();
    step(state, { ...none, jumpPressed: true, jumpHeld: true }, DT);
    expect(state.hero.grounded).toBe(false);
    const peak = { y: state.hero.y };
    for (let i = 0; i < 240; i++) {
      step(state, { ...none, jumpHeld: true }, DT);
      peak.y = Math.min(peak.y, state.hero.y);
    }
    expect(state.hero.grounded).toBe(true);
    expect(state.level.start.y - peak.y).toBeGreaterThan(100);
  });

  it('charges a dash from standstill', () => {
    const state = createRun();
    step(state, { ...none, down: true, jumpPressed: true }, DT);
    expect(state.hero.charging).toBe(true);
    step(state, { ...none, down: true, jumpPressed: true }, DT);
    step(state, none, DT);
    expect(state.hero.charging).toBe(false);
    expect(state.hero.speed).toBeGreaterThan(800);
  });

  it('loses sparks instead of a life when hit', () => {
    const state = createRun();
    state.sparks = 12;
    const enemy = state.level.enemies.find((e) => e.kind === 'crawler')!;
    state.hero.x = enemy.x;
    state.hero.y = enemy.y;
    step(state, none, DT);
    expect(state.sparks).toBe(0);
    expect(state.hero.dead).toBe(false);
    expect(state.lives).toBe(3);
  });

  it('can be played start to finish by holding right and hopping', () => {
    const state = createRun();
    let frames = 0;
    let deaths = 0;
    // A crude autopilot: run right, jump often, never stop.
    while (!state.over && frames < 120 * 600) {
      const jump = frames % 50 === 0;
      step(state, { ...run, jumpPressed: jump, jumpHeld: frames % 50 < 30 }, DT);
      if (state.events.includes('die')) deaths++;
      frames++;
    }
    expect(state.over).toBe(true);
    expect(state.won || deaths > 0).toBe(true);
  });

  it('rewards fast clears', () => {
    expect(timeBonus(30)).toBeGreaterThan(timeBonus(100));
  });
});
