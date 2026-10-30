//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { Cpu, Gamepad2, Moon, Sun, Users, User, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';

import { GameArt } from './arcade/GameArt';
import { GamePage } from './arcade/GamePage';
import { EmulatorPage } from './emulator/EmulatorPage';
import { SystemArt } from './emulator/SystemArt';
import { SYSTEMS, type SystemId } from './emulator/systems';
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

function Lobby({
  onPlay,
  onEmulate,
}: {
  onPlay: (id: string) => void;
  onEmulate: (id: SystemId) => void;
}) {
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
          Five games, right inside Microsoft Fabric. Single-player runs post to a shared
          leaderboard for everyone in your workspace.
        </p>
      </div>

      <ul className="grid gap-600 md:grid-cols-2 xl:grid-cols-3">
        {GAMES.map((game) => (
          <li key={game.id}>
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

      <section aria-labelledby="emulator-title" className="flex flex-col gap-400">
        <div className="max-w-[640px]">
          <h2
            id="emulator-title"
            className="flex items-center gap-200 font-heading text-400 leading-500 text-foreground"
          >
            <Cpu className="icon-size-300 text-primary" aria-hidden="true" />
            Emulator lounge
          </h2>
          <p className="mt-200 text-300 text-muted-foreground">
            Bring your own cartridges: load a game file you own and play it in the browser.
          </p>
        </div>
        <ul className="grid gap-600 md:grid-cols-2">
          {SYSTEMS.map((system) => (
            <li key={system.id}>
              <button
                type="button"
                onClick={() => onEmulate(system.id)}
                className="group flex h-full w-full overflow-hidden rounded-2xl border bg-card text-left transition hover:-translate-y-100 hover:neon-frame focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="w-[38%] shrink-0 border-r">
                  <SystemArt id={system.id} />
                </div>
                <div className="flex flex-1 flex-col gap-200 p-400">
                  <h3 className="font-heading text-300 leading-400 text-card-foreground">
                    {system.title}
                  </h3>
                  <p className="flex-1 text-300 text-muted-foreground">{system.tagline}</p>
                  <span className="text-300 font-semibold text-primary group-hover:underline">
                    Load a game →
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function App() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [systemId, setSystemId] = useState<SystemId | null>(null);
  const active = GAMES.find((game) => game.id === activeId);
  const system = SYSTEMS.find((entry) => entry.id === systemId);
  const home = () => {
    setActiveId(null);
    setSystemId(null);
  };

  useEffect(() => {
    // Emulated games bring their own soundtrack.
    playMusic(system ? null : active ? 'game' : 'lobby');
  }, [active, system]);

  useEffect(() => () => playMusic(null), []);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <Header onHome={home} />
      <main className="flex-1">
        {system ? (
          <EmulatorPage key={system.id} system={system} onBack={home} />
        ) : active ? (
          <GamePage key={active.id} game={active} onBack={home} />
        ) : (
          <Lobby onPlay={setActiveId} onEmulate={setSystemId} />
        )}
      </main>
    </div>
  );
}

export default App;
