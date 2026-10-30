/** Static layout of the single Steel Raid mission. All units are pixels. */

export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;
export const GROUND = 470;
export const WORLD_END = 7000;
export const ARENA_START = WORLD_END - VIEW_WIDTH;

export type EnemyKind = 'soldier' | 'gunner' | 'drone' | 'tank';
export type PickupKind = 'heavy' | 'bombs' | 'points';

/** One-way ledge: you land on it from above and can jump up through it. */
export interface Ledge {
  x: number;
  y: number;
  w: number;
}

export interface SpawnSpec {
  kind: EnemyKind;
  /** Offset from the right edge of the screen when the wave triggers. */
  dx: number;
  /** Feet height (center for drones); defaults to the ground. */
  y?: number;
}

export interface Wave {
  /** Triggers when the right edge of the screen reaches this x. */
  at: number;
  /** Holds the camera until every enemy of the wave is down. */
  lock?: boolean;
  enemies: SpawnSpec[];
}

export interface PowSpec {
  x: number;
  drop: PickupKind;
}

export const LEDGES: Ledge[] = [
  { x: 1180, y: 380, w: 160 },
  { x: 2240, y: 370, w: 220 },
  { x: 3260, y: 360, w: 200 },
  { x: 3520, y: 290, w: 160 },
  { x: 4060, y: 360, w: 240 },
  { x: 5000, y: 380, w: 180 },
  { x: 5600, y: 350, w: 260 },
];

export const WAVES: Wave[] = [
  { at: 1200, enemies: [{ kind: 'soldier', dx: 60 }, { kind: 'soldier', dx: 180 }] },
  { at: 1700, enemies: [{ kind: 'soldier', dx: 80 }] },
  {
    at: 2300,
    lock: true,
    enemies: [
      { kind: 'gunner', dx: -120 },
      { kind: 'soldier', dx: 60 },
      { kind: 'soldier', dx: 200 },
    ],
  },
  { at: 2900, enemies: [{ kind: 'drone', dx: 40, y: 170 }] },
  {
    at: 3400,
    enemies: [
      { kind: 'soldier', dx: 40 },
      { kind: 'soldier', dx: 140 },
      { kind: 'soldier', dx: 260 },
    ],
  },
  {
    at: 4250,
    lock: true,
    enemies: [
      { kind: 'gunner', dx: -40, y: 360 },
      { kind: 'drone', dx: 80, y: 150 },
      { kind: 'soldier', dx: 120 },
    ],
  },
  {
    at: 5000,
    enemies: [
      { kind: 'soldier', dx: 60 },
      { kind: 'soldier', dx: 160 },
      { kind: 'drone', dx: 100, y: 190 },
    ],
  },
  {
    at: 5800,
    lock: true,
    enemies: [
      { kind: 'gunner', dx: -90, y: 350 },
      { kind: 'soldier', dx: 60 },
      { kind: 'soldier', dx: 160 },
      { kind: 'soldier', dx: 280 },
    ],
  },
  { at: WORLD_END, lock: true, enemies: [{ kind: 'tank', dx: 220 }] },
];

export const POWS: PowSpec[] = [
  { x: 1550, drop: 'heavy' },
  { x: 3380, drop: 'bombs' },
  { x: 4800, drop: 'heavy' },
  { x: 5450, drop: 'points' },
];
