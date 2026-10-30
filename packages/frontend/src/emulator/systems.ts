/**
 * Consoles playable through EmulatorJS (libretro cores compiled to WebAssembly).
 * The emulator is fetched from the EmulatorJS CDN at play time; the app ships no
 * emulator code, BIOS or games. Players load ROM files they own from disk.
 */
export const EMULATOR_DATA = 'https://cdn.emulatorjs.org/stable/data/';

export type SystemId = 'gba' | 'psx';

export interface EmulatorSystem {
  id: SystemId;
  /** EmulatorJS `EJS_core` value. */
  core: string;
  title: string;
  tagline: string;
  /** Extensions offered in the file picker. */
  extensions: string[];
  hint: string;
  color: string;
}

export const SYSTEMS: EmulatorSystem[] = [
  {
    id: 'gba',
    core: 'gba',
    title: 'Game Boy Advance',
    tagline: 'Handheld classics on the mGBA core.',
    extensions: ['.gba', '.gb', '.gbc', '.zip', '.7z'],
    hint: 'Pick a .gba file (a .zip or .7z containing one also works).',
    color: '#7b5cff',
  },
  {
    id: 'psx',
    core: 'psx',
    title: 'PlayStation',
    tagline: 'PS1 discs on the PCSX ReARMed core.',
    extensions: ['.chd', '.pbp', '.bin', '.iso', '.img', '.zip', '.7z'],
    hint:
      'Pick a single-file image (.chd or .pbp work best). For .cue + .bin dumps, put both in one .zip.',
    color: '#2f8fff',
  },
];
