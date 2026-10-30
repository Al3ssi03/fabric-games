import { BoltRushGame } from './bolt-rush/BoltRushGame';
import { InvasionGame } from './invasion/InvasionGame';
import { SnakeGame } from './snake/SnakeGame';
import { SoccerGame } from './soccer/SoccerGame';
import { SteelRaidGame } from './steel-raid/SteelRaidGame';
import type { GameDefinition } from './types';

export const GAMES: GameDefinition[] = [
  {
    id: 'bolt-rush',
    title: 'Bolt Rush',
    tagline: 'A high-speed platformer: hills, springs and boost pads across two zones.',
    players: '1 player',
    scoredAs: 'bolt-rush',
    controls: [
      { keys: '← →', action: 'Run' },
      { keys: 'Space', action: 'Jump' },
      { keys: '↓', action: 'Roll' },
      { keys: '↓ + Space', action: 'Charge dash' },
      { keys: 'P', action: 'Pause' },
    ],
    Component: BoltRushGame,
  },
  {
    id: 'steel-raid',
    title: 'Steel Raid',
    tagline: 'Run-and-gun commando mission: free prisoners, grab heavy weapons, topple the tank.',
    players: '1 player',
    scoredAs: 'steel-raid',
    controls: [
      { keys: '← →', action: 'Move' },
      { keys: '↑ / ↓', action: 'Aim up / crouch' },
      { keys: 'Space', action: 'Jump' },
      { keys: 'X', action: 'Fire (knife up close)' },
      { keys: 'C', action: 'Grenade' },
      { keys: 'P', action: 'Pause' },
    ],
    Component: SteelRaidGame,
  },
  {
    id: 'bug-invasion',
    title: 'Bug Invasion',
    tagline: 'Hold the line against a marching alien fleet, wave after faster wave.',
    players: '1 player',
    scoredAs: 'bug-invasion',
    controls: [
      { keys: '← →', action: 'Move' },
      { keys: 'Space', action: 'Fire' },
      { keys: 'Enter', action: 'Start' },
      { keys: 'P', action: 'Pause' },
    ],
    Component: InvasionGame,
  },
  {
    id: 'snake',
    title: 'Snake',
    tagline: 'The classic: eat, grow, and do not bite your own tail.',
    players: '1 player',
    scoredAs: 'snake',
    controls: [
      { keys: 'Arrows / WASD', action: 'Steer' },
      { keys: 'Enter', action: 'Start' },
      { keys: 'P', action: 'Pause' },
    ],
    Component: SnakeGame,
  },
  {
    id: 'duel-cup',
    title: 'Duel Cup',
    tagline: 'Head-to-head football on one keyboard, or take on the CPU.',
    players: '2 players',
    controls: [
      { keys: 'A D · W · S', action: 'Player 1' },
      { keys: '← → · ↑ · ↓', action: 'Player 2' },
      { keys: '1 / 2', action: 'CPU or 2P' },
      { keys: 'P', action: 'Pause' },
    ],
    Component: SoccerGame,
  },
];
