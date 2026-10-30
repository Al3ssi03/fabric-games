import type { ScoredGameId } from '@rayfin-app/shared';
import type { ComponentType } from 'react';

/** What a game reports when a run ends. `points` is only set for scored games. */
export interface GameResult {
  points?: number;
  summary: string;
}

export interface GameProps {
  onFinish: (result: GameResult) => void;
}

export interface GameControl {
  keys: string;
  action: string;
}

export interface GameDefinition {
  id: string;
  title: string;
  tagline: string;
  players: string;
  /** Present when runs post to the shared leaderboard. */
  scoredAs?: ScoredGameId;
  controls: GameControl[];
  Component: ComponentType<GameProps>;
}
