import { describe, expect, it } from 'vitest';

import { COLS, createSnake, move, turn } from './snake.engine';

describe('snake engine', () => {
  it('moves forward and ignores reversing into itself', () => {
    const state = createSnake(1);
    turn(state, 'left');
    move(state);
    expect(state.body[0]).toEqual({ x: 9, y: 9 });
    expect(state.alive).toBe(true);
  });

  it('grows and scores when it eats', () => {
    const state = createSnake(1);
    state.food = { x: 9, y: 9 };
    move(state);
    expect(state.body).toHaveLength(4);
    expect(state.score).toBe(10);
    expect(state.food).not.toEqual({ x: 9, y: 9 });
  });

  it('dies on the wall', () => {
    const state = createSnake(1);
    state.food = { x: 0, y: 0 };
    for (let i = 0; i < COLS; i++) move(state);
    expect(state.alive).toBe(false);
  });

  it('may chase its own tail because the tail moves away', () => {
    const state = createSnake(1);
    state.body = [
      { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 },
    ];
    state.direction = 'up';
    state.food = { x: 0, y: 0 };
    turn(state, 'right');
    move(state);
    expect(state.alive).toBe(true);
  });
});
