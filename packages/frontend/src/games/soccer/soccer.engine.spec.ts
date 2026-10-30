import { describe, expect, it } from 'vitest';

import {
  GOAL_DEPTH, GOAL_TOP, GROUND, WIDTH, createMatch, goalScored, step, type PlayerInput,
} from './soccer.engine';

const idle: PlayerInput = { left: false, right: false, jump: false, kick: false };

describe('soccer engine', () => {
  it('counts a ball fully inside a goal under the bar', () => {
    expect(goalScored({ x: 10, y: GROUND - 20, vx: 0, vy: 0 })).toBe(1);
    expect(goalScored({ x: WIDTH - 10, y: GROUND - 20, vx: 0, vy: 0 })).toBe(0);
    expect(goalScored({ x: GOAL_DEPTH, y: GROUND - 20, vx: 0, vy: 0 })).toBeNull();
    expect(goalScored({ x: 10, y: GOAL_TOP - 40, vx: 0, vy: 0 })).toBeNull();
  });

  it('awards the goal and kicks off again', () => {
    const state = createMatch();
    state.ball = { x: WIDTH - 20, y: GROUND - 20, vx: 0, vy: 0 };
    state.freeze = 0;
    step(state, 1 / 120, [idle, idle]);
    expect(state.score).toEqual([1, 0]);
    for (let i = 0; i < 240; i++) step(state, 1 / 120, [idle, idle]);
    expect(state.ball.x).toBeCloseTo(WIDTH / 2, -2);
  });

  it('a kick sends the ball toward the opponent goal', () => {
    const state = createMatch();
    state.freeze = 0;
    const [p1] = state.players;
    state.ball = { x: p1.x + 40, y: GROUND - 16, vx: 0, vy: 0 };
    step(state, 1 / 120, [{ ...idle, kick: true }, idle]);
    expect(state.ball.vx).toBeGreaterThan(500);
  });

  it('ends when the clock runs out', () => {
    const state = createMatch();
    state.clock = 0.01;
    state.freeze = 0;
    state.ball = { x: WIDTH / 2, y: 100, vx: 0, vy: 0 };
    step(state, 1 / 60, [idle, idle]);
    expect(state.finished).toBe(true);
  });
});
