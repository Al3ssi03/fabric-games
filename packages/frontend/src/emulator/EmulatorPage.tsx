import { ArrowLeft, FolderOpen, ShieldCheck } from 'lucide-react';
import { useId, useState } from 'react';

import { EmulatorFrame } from './EmulatorFrame';
import type { EmulatorSystem } from './systems';

type Loaded =
  | { kind: 'empty' }
  | { kind: 'reading'; file: File }
  | { kind: 'ready'; file: File; rom: ArrayBuffer }
  | { kind: 'error'; message: string };

const panel = 'rounded-2xl border bg-card p-400';

export function EmulatorPage({ system, onBack }: { system: EmulatorSystem; onBack: () => void }) {
  const inputId = useId();
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'empty' });

  const choose = (file: File | undefined) => {
    if (!file) return;
    setLoaded({ kind: 'reading', file });
    file.arrayBuffer().then(
      (rom) => setLoaded({ kind: 'ready', file, rom }),
      () => setLoaded({ kind: 'error', message: `Could not read ${file.name}. Try another file.` })
    );
  };

  const picker = (
    <label
      htmlFor={inputId}
      className="inline-flex cursor-pointer items-center gap-200 rounded-xl bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground transition hover:opacity-90 focus-within:ring-2 focus-within:ring-ring"
    >
      <FolderOpen className="icon-size-200" aria-hidden="true" />
      {loaded.kind === 'ready' ? 'Load another game' : 'Choose a game file'}
      <input
        id={inputId}
        type="file"
        accept={system.extensions.join(',')}
        className="sr-only"
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </label>
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
          <h1 className="font-heading text-500 leading-600 text-foreground">{system.title}</h1>
          <p className="text-300 text-muted-foreground">{system.tagline}</p>
        </div>
      </div>

      <div className="grid gap-600 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-300">
          <div className="neon-frame overflow-hidden rounded-2xl bg-muted">
            {loaded.kind === 'ready' ? (
              <EmulatorFrame key={loaded.file.name + loaded.rom.byteLength} system={system} file={loaded.file} rom={loaded.rom} />
            ) : (
              <div className="grid aspect-[4/3] w-full place-items-center bg-black p-600 text-center">
                <div className="flex max-w-[420px] flex-col items-center gap-400">
                  <p className="font-heading text-300 leading-400 text-white">Insert a cartridge</p>
                  <p className="text-300 text-white/70">{system.hint}</p>
                  {loaded.kind === 'reading' ? (
                    <p role="status" className="text-300 text-white">
                      Reading {loaded.file.name}…
                    </p>
                  ) : (
                    picker
                  )}
                  {loaded.kind === 'error' && (
                    <p role="alert" className="text-300 text-destructive">
                      {loaded.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          {loaded.kind === 'ready' && (
            <div className="flex flex-wrap items-center justify-between gap-300">
              <p className="text-200 text-muted-foreground">
                Playing <span className="font-semibold text-foreground">{loaded.file.name}</span>. Click
                the screen if the keys stop responding.
              </p>
              {picker}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-400">
          <section className={panel}>
            <h2 className="mb-300 font-heading text-200 leading-200 text-card-foreground">How it works</h2>
            <ul className="flex list-disc flex-col gap-200 pl-400 text-300 text-card-foreground">
              <li>Accepted files: {system.extensions.join(' ')}</li>
              <li>Keys and gamepads are set from the controller icon in the emulator toolbar.</li>
              <li>Save states and in-game saves stay in this browser.</li>
              {system.id === 'psx' && (
                <li>Runs on the core&apos;s built-in BIOS; a few games may not boot without an original one.</li>
              )}
            </ul>
          </section>
          <section className={panel}>
            <h2 className="mb-300 flex items-center gap-200 font-heading text-200 leading-200 text-card-foreground">
              <ShieldCheck className="icon-size-200 text-primary" aria-hidden="true" />
              Your games, your files
            </h2>
            <p className="text-300 text-muted-foreground">
              Load only games you own. The file is read in your browser and never uploaded; the
              emulator itself is downloaded from cdn.emulatorjs.org.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
