/**
 * Browser-safe contracts shared by the data registration package and frontend.
 *
 * Keep each record shape aligned with its decorated runtime entity in
 * `@rayfin-app/data`. This package must stay isomorphic, so do not import the
 * decorated classes here.
 */

/** Games that post to the leaderboard. Two-player games keep no scores. */
export const SCORED_GAMES = ['snake', 'bolt-rush'] as const;
export type ScoredGameId = (typeof SCORED_GAMES)[number];

export interface ScoreRecord {
  id: string;
  game: string;
  points: number;
  playerName: string;
  createdAt: Date;
  owner_id: string;
}

export type UniversalAppSchema = {
  Score: ScoreRecord;
};
