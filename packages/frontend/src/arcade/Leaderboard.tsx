import type { ScoredGameId } from '@rayfin-app/shared';
import { RotateCw, Trophy } from 'lucide-react';

import type { LeaderboardState } from '@/scores/use-leaderboard';
import { LEADERBOARD_SIZE } from '@/scores/use-leaderboard';

interface LeaderboardProps {
  game: ScoredGameId;
  state: LeaderboardState;
  currentUserId: string | undefined;
  onReload: () => void;
}

export function Leaderboard({ state, currentUserId, onReload }: LeaderboardProps) {
  return (
    <section aria-labelledby="leaderboard-title" className="rounded-2xl border bg-card p-400">
      <div className="mb-300 flex items-center justify-between gap-200">
        <h2
          id="leaderboard-title"
          className="flex items-center gap-200 font-heading text-200 leading-200 text-card-foreground"
        >
          <Trophy className="icon-size-200 text-primary" aria-hidden="true" />
          Top {LEADERBOARD_SIZE}
        </h2>
        <button
          type="button"
          onClick={onReload}
          className="rounded-lg p-100 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Refresh leaderboard"
        >
          <RotateCw className="icon-size-200" aria-hidden="true" />
        </button>
      </div>

      {state.status === 'loading' ? (
        <ol className="space-y-200" aria-label="Loading leaderboard">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="h-600 animate-pulse rounded-lg bg-muted" />
          ))}
        </ol>
      ) : state.status === 'error' ? (
        <p role="alert" className="text-300 text-destructive">
          {state.message}
        </p>
      ) : state.entries.length === 0 ? (
        <p className="py-400 text-center text-300 text-muted-foreground">
          No scores yet. Finish a run to claim the top spot.
        </p>
      ) : (
        <ol className="space-y-100">
          {state.entries.map((entry, index) => {
            const mine = entry.owner_id === currentUserId;
            return (
              <li
                key={entry.id}
                className={
                  'flex items-center gap-300 rounded-lg px-200 py-200-nudge text-300 ' +
                  (mine ? 'bg-accent text-accent-foreground' : 'text-card-foreground')
                }
              >
                <span className="w-600 font-numeric text-200 text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {entry.playerName}
                  {mine ? <span className="ml-100 text-200 opacity-80">(you)</span> : null}
                </span>
                <span className="font-numeric text-200">{entry.points.toLocaleString()}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
