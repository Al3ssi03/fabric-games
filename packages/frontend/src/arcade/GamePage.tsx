import type { ScoredGameId } from '@rayfin-app/shared';
import { ArrowLeft, Users, User } from 'lucide-react';
import { useCallback, useState } from 'react';

import { useAuth } from '@/hooks/auth.context';
import type { GameDefinition, GameResult } from '@/games/types';
import { submitScore, useLeaderboard } from '@/scores/use-leaderboard';

import { Leaderboard } from './Leaderboard';

type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; points: number }
  | { kind: 'skipped'; summary: string }
  | { kind: 'error'; message: string };

function ScoredSidebar({ game, last }: { game: ScoredGameId; last: SaveStatus }) {
  const { session } = useAuth();
  const { state, reload } = useLeaderboard(game);
  return (
    <>
      <ResultBanner status={last} />
      <Leaderboard
        game={game}
        state={state}
        currentUserId={session?.user?.id}
        onReload={() => void reload()}
      />
    </>
  );
}

function ResultBanner({ status }: { status: SaveStatus }) {
  if (status.kind === 'idle') return null;
  const text =
    status.kind === 'saving'
      ? 'Saving your score…'
      : status.kind === 'saved'
        ? `Saved ${status.points.toLocaleString()} points to the leaderboard.`
        : status.kind === 'skipped'
          ? status.summary
          : status.message;
  return (
    <p
      role={status.kind === 'error' ? 'alert' : 'status'}
      className={
        'rounded-xl border px-400 py-300 text-300 ' +
        (status.kind === 'error'
          ? 'border-destructive text-destructive'
          : 'bg-secondary text-secondary-foreground')
      }
    >
      {text}
    </p>
  );
}

export function GamePage({ game, onBack }: { game: GameDefinition; onBack: () => void }) {
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });
  const [boardKey, setBoardKey] = useState(0);
  const { Component } = game;
  const scoredAs = game.scoredAs;

  const handleFinish = useCallback(
    (result: GameResult) => {
      if (!scoredAs || result.points === undefined) {
        setStatus({ kind: 'skipped', summary: result.summary });
        return;
      }
      if (result.points <= 0) {
        setStatus({ kind: 'skipped', summary: `${result.summary}. No points this time.` });
        return;
      }
      const points = result.points;
      setStatus({ kind: 'saving' });
      submitScore(scoredAs, points).then(
        () => {
          setStatus({ kind: 'saved', points });
          // Remount the sidebar so the leaderboard reloads with the new score.
          setBoardKey((key) => key + 1);
        },
        () =>
          setStatus({
            kind: 'error',
            message: 'Your score could not be saved. Check your connection and play again.',
          })
      );
    },
    [scoredAs]
  );

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-600 px-400 py-600 lg:px-800">
      <div className="flex flex-wrap items-center gap-400">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-200 rounded-xl border bg-card px-300 py-200 text-300 font-semibold text-card-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="icon-size-200" aria-hidden="true" />
          All games
        </button>
        <div className="min-w-0">
          <h1 className="font-heading text-500 leading-600 text-foreground">{game.title}</h1>
          <p className="text-300 text-muted-foreground">{game.tagline}</p>
        </div>
      </div>

      <div className="grid gap-600 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-300">
          <div className="neon-frame overflow-hidden rounded-2xl bg-muted">
            <Component onFinish={handleFinish} />
          </div>
          <p className="text-200 text-muted-foreground">
            Click the game if the keys stop responding — it needs keyboard focus inside Fabric.
          </p>
        </div>

        <aside className="flex flex-col gap-400">
          <section aria-labelledby="controls-title" className="rounded-2xl border bg-card p-400">
            <h2
              id="controls-title"
              className="mb-300 flex items-center gap-200 font-heading text-200 leading-200 text-card-foreground"
            >
              {game.players.startsWith('2') ? (
                <Users className="icon-size-200 text-primary" aria-hidden="true" />
              ) : (
                <User className="icon-size-200 text-primary" aria-hidden="true" />
              )}
              Controls
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-400 gap-y-200 text-300">
              {game.controls.map((control) => (
                <div key={control.action} className="contents">
                  <dt>
                    <kbd className="rounded-md border bg-secondary px-200 py-100 font-monospace text-200 text-secondary-foreground">
                      {control.keys}
                    </kbd>
                  </dt>
                  <dd className="self-center text-card-foreground">{control.action}</dd>
                </div>
              ))}
            </dl>
          </section>

          {scoredAs ? (
            <ScoredSidebar key={boardKey} game={scoredAs} last={status} />
          ) : (
            <>
              <ResultBanner status={status} />
              <p className="rounded-2xl border bg-card p-400 text-300 text-muted-foreground">
                Two-player matches are played for bragging rights — no leaderboard here.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
