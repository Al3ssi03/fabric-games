//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { Gamepad2, Moon, Sun, Users, User, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';

import { GameArt } from './arcade/GameArt';
import { GamePage } from './arcade/GamePage';
import { GAMES } from './games/registry';
import { playMusic } from './games/engine/music';
import { isMuted, setMuted } from './games/engine/sfx';
import { useTheme } from './hooks/theme.context';

const iconButton =
  'rounded-xl border bg-card p-200 text-card-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Header({ onHome }: { onHome: () => void }) {
  const theme = useTheme();
  const [muted, setMutedState] = useState(isMuted);
  const toggleSound = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  return (
    <header className="scanlines border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-400 px-400 py-300 lg:px-800">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-300 rounded-xl p-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="neon-frame grid h-800 w-800 place-items-center rounded-xl bg-secondary text-primary">
            <Gamepad2 className="icon-size-300" aria-hidden="true" />
          </span>
          <span className="font-heading text-300 leading-300 text-foreground">
            Fabric<span className="text-primary"> Arcade</span>
          </span>
        </button>
        <div className="flex items-center gap-200">
          <button
            type="button"
            className={iconButton}
            onClick={toggleSound}
            aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
            aria-pressed={!muted}
          >
            {muted ? (
              <VolumeX className="icon-size-200" aria-hidden="true" />
            ) : (
              <Volume2 className="icon-size-200" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={theme.toggleTheme}
            aria-label={theme.isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme.isDark ? (
              <Sun className="icon-size-200" aria-hidden="true" />
            ) : (
              <Moon className="icon-size-200" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function Lobby({ onPlay }: { onPlay: (id: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-800 px-400 py-800 lg:px-800">
      <div className="max-w-[640px]">
        <p className="mb-200 text-200 font-semibold uppercase tracking-widest text-primary">
          Insert coin · press start
        </p>
        <h1 className="font-heading text-hero-700 leading-hero-900 text-foreground">
          Pick a cabinet
        </h1>
        <p className="mt-300 text-400 leading-400 text-muted-foreground">
          Three games, right inside Microsoft Fabric. Single-player runs post to a shared
          leaderboard for everyone in your workspace.
        </p>
      </div>

      <ul className="grid gap-600 md:grid-cols-2 xl:grid-cols-3">
        {GAMES.map((game, index) => (
          <li key={game.id} className={index === 0 ? 'md:col-span-2 xl:col-span-1' : undefined}>
            <button
              type="button"
              onClick={() => onPlay(game.id)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-card text-left transition hover:-translate-y-100 hover:neon-frame focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="aspect-[16/9] w-full overflow-hidden border-b">
                <GameArt id={game.id} />
              </div>
              <div className="flex flex-1 flex-col gap-200 p-400">
                <div className="flex items-center justify-between gap-200">
                  <h2 className="font-heading text-300 leading-400 text-card-foreground">
                    {game.title}
                  </h2>
                  <span className="flex items-center gap-100 rounded-full bg-secondary px-200 py-100 text-200 font-semibold text-secondary-foreground">
                    {game.players.startsWith('2') ? (
                      <Users className="icon-size-100" aria-hidden="true" />
                    ) : (
                      <User className="icon-size-100" aria-hidden="true" />
                    )}
                    {game.players}
                  </span>
                </div>
                <p className="flex-1 text-300 text-muted-foreground">{game.tagline}</p>
                <span className="mt-200 text-300 font-semibold text-primary group-hover:underline">
                  Play now →
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = GAMES.find((game) => game.id === activeId);

  useEffect(() => {
    playMusic(active ? 'game' : 'lobby');
  }, [active]);

  useEffect(() => () => playMusic(null), []);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <Header onHome={() => setActiveId(null)} />
      <main className="flex-1">
        {active ? (
          <GamePage key={active.id} game={active} onBack={() => setActiveId(null)} />
        ) : (
          <Lobby onPlay={setActiveId} />
        )}
      </main>
    </div>
  );
}

export default App;
