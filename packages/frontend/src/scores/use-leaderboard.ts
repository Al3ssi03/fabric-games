import type { ScoreRecord, ScoredGameId } from '@rayfin-app/shared';
import { useCallback, useEffect, useState } from 'react';

import { getRayfinClient } from '@/lib/rayfin-client';

export const LEADERBOARD_SIZE = 10;

export type LeaderboardEntry = Pick<
  ScoreRecord,
  'id' | 'points' | 'playerName' | 'createdAt' | 'owner_id'
>;

export type LeaderboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: LeaderboardEntry[] };

function describe(error: unknown): string {
  if (error instanceof Error && error.name === 'MissingRayfinConfigError') {
    return 'The leaderboard is not configured for this environment.';
  }
  return 'The leaderboard could not be reached. Try again in a moment.';
}

async function fetchLeaderboard(game: ScoredGameId): Promise<LeaderboardState> {
  try {
    const client = await getRayfinClient();
    // Bounded query: only the top rows are ever needed.
    const entries = await client.data.Score.select([
      'id', 'points', 'playerName', 'createdAt', 'owner_id',
    ])
      .where({ game: { eq: game } })
      .orderBy({ points: 'desc' })
      .first(LEADERBOARD_SIZE)
      .execute();
    return { status: 'ready', entries };
  } catch (error) {
    return { status: 'error', message: describe(error) };
  }
}

/** Top scores for one game, fetched on mount and on demand. */
export function useLeaderboard(game: ScoredGameId) {
  const [state, setState] = useState<LeaderboardState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void fetchLeaderboard(game).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [game]);

  const reload = useCallback(async () => {
    setState({ status: 'loading' });
    setState(await fetchLeaderboard(game));
  }, [game]);

  return { state, reload };
}

/** Posts a finished run under the signed-in user; the server checks ownership. */
export async function submitScore(game: ScoredGameId, points: number): Promise<void> {
  const client = await getRayfinClient();
  const session = client.auth.getSession();
  if (!session.isAuthenticated || !session.user) {
    throw new Error('Sign in again to save your score.');
  }
  const { user } = session;
  await client.data.Score.create({
    game,
    points: Math.max(0, Math.round(points)),
    playerName: (user.email.split('@')[0] || 'Player').slice(0, 120),
    createdAt: new Date(),
    owner_id: user.id,
  });
}
