/**
 * Bolt Rush levels: a heightfield of ground segments (with pits) plus the
 * objects placed along it. Zones are written with a small builder so the
 * layout reads like a course description rather than a table of numbers.
 */

export interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  solid: boolean;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
}

export interface Spark {
  x: number;
  y: number;
  taken: boolean;
}

export interface Spring {
  x: number;
  y: number;
  power: number;
  dir: 'up' | 'left' | 'right';
  squash: number;
}

export interface Boost {
  x: number;
  y: number;
  dir: 1 | -1;
}

export interface Spike {
  x: number;
  y: number;
  w: number;
}

export interface Enemy {
  kind: 'crawler' | 'drone';
  x: number;
  y: number;
  home: number;
  homeY: number;
  range: number;
  dir: 1 | -1;
  alive: boolean;
  phase: number;
}

export interface Checkpoint {
  x: number;
  y: number;
  active: boolean;
}

export interface Palette {
  sky: [string, string, string];
  sun: string;
  far: string;
  mid: string;
  near: string;
  soil: [string, string];
  top: string;
  topEdge: string;
  accent: string;
}

export interface Level {
  name: string;
  act: number;
  palette: Palette;
  segments: Segment[];
  platforms: Platform[];
  sparks: Spark[];
  springs: Spring[];
  boosts: Boost[];
  spikes: Spike[];
  enemies: Enemy[];
  checkpoints: Checkpoint[];
  start: { x: number; y: number };
  goal: number;
  end: number;
  lowest: number;
}

type Placement = (level: Level) => void;

/** Ground height at `x`, or `null` over a pit or outside the course. */
export function groundAt(
  segments: Segment[],
  x: number
): { y: number; angle: number } | null {
  let lo = 0;
  let hi = segments.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const segment = segments[mid];
    if (x < segment.x0) hi = mid - 1;
    else if (x >= segment.x1) lo = mid + 1;
    else {
      if (!segment.solid) return null;
      const t = (x - segment.x0) / (segment.x1 - segment.x0);
      return {
        y: segment.y0 + (segment.y1 - segment.y0) * t,
        angle: Math.atan2(segment.y1 - segment.y0, segment.x1 - segment.x0),
      };
    }
  }
  return null;
}

/** Ground height, falling back to the pit's rim height so objects can float over gaps. */
function surfaceAt(segments: Segment[], x: number): number {
  const ground = groundAt(segments, x);
  if (ground) return ground.y;
  const segment = segments.find((s) => x >= s.x0 && x < s.x1);
  return segment ? segment.y0 : segments[segments.length - 1].y1;
}

class Builder {
  x = 0;
  y = 420;
  private readonly segments: Segment[] = [];
  private readonly placements: Placement[] = [];
  private goalX = 0;

  private push(x1: number, y1: number, solid = true) {
    this.segments.push({ x0: this.x, y0: this.y, x1, y1, solid });
    this.x = x1;
    this.y = y1;
  }

  flat(length: number) {
    this.push(this.x + length, this.y);
    return this;
  }

  slope(length: number, rise: number) {
    this.push(this.x + length, this.y + rise);
    return this;
  }

  /** An eased slope (cosine profile), sampled finely so it reads as a curve. */
  curve(length: number, rise: number) {
    const x0 = this.x;
    const y0 = this.y;
    const steps = Math.max(4, Math.round(length / 24));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.push(x0 + length * t, y0 + rise * (1 - Math.cos(Math.PI * t)) * 0.5);
    }
    return this;
  }

  /** A bump (positive height) or a dip (negative height) back to the same level. */
  hill(length: number, height: number) {
    const x0 = this.x;
    const y0 = this.y;
    const steps = Math.max(6, Math.round(length / 24));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.push(x0 + length * t, y0 - height * Math.sin(Math.PI * t));
    }
    return this;
  }

  pit(length: number) {
    this.push(this.x + length, this.y, false);
    return this;
  }

  private at(offset: number) {
    return this.x + offset;
  }

  sparks(offset: number, count: number, gap = 40, lift = 44) {
    const x0 = this.at(offset);
    this.placements.push((level) => {
      for (let i = 0; i < count; i++) {
        const x = x0 + i * gap;
        level.sparks.push({ x, y: surfaceAt(level.segments, x) - lift, taken: false });
      }
    });
    return this;
  }

  /** Sparks along a jump arc, starting at ground level. */
  sparkArc(offset: number, count: number, width: number, height: number) {
    const x0 = this.at(offset);
    this.placements.push((level) => {
      const base = surfaceAt(level.segments, x0);
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        level.sparks.push({
          x: x0 + width * t,
          y: base - 40 - height * Math.sin(Math.PI * t),
          taken: false,
        });
      }
    });
    return this;
  }

  sparkColumn(offset: number, count: number, from = 120, gap = 50) {
    const x = this.at(offset);
    this.placements.push((level) => {
      const base = surfaceAt(level.segments, x);
      for (let i = 0; i < count; i++) {
        level.sparks.push({ x, y: base - from - i * gap, taken: false });
      }
    });
    return this;
  }

  platform(offset: number, lift: number, w: number, sparkCount = 0) {
    const x = this.at(offset);
    this.placements.push((level) => {
      const y = surfaceAt(level.segments, x) - lift;
      level.platforms.push({ x, y, w });
      for (let i = 0; i < sparkCount; i++) {
        level.sparks.push({
          x: x + ((i + 0.5) * w) / sparkCount,
          y: y - 36,
          taken: false,
        });
      }
    });
    return this;
  }

  spring(offset: number, power = 1150, dir: Spring['dir'] = 'up') {
    const x = this.at(offset);
    this.placements.push((level) => {
      level.springs.push({ x, y: surfaceAt(level.segments, x), power, dir, squash: 0 });
    });
    return this;
  }

  boost(offset: number, dir: 1 | -1 = 1) {
    const x = this.at(offset);
    this.placements.push((level) => {
      level.boosts.push({ x, y: surfaceAt(level.segments, x), dir });
    });
    return this;
  }

  spikes(offset: number, w = 64) {
    const x = this.at(offset);
    this.placements.push((level) => {
      level.spikes.push({ x, y: surfaceAt(level.segments, x), w });
    });
    return this;
  }

  crawler(offset: number, range = 120) {
    const x = this.at(offset);
    this.placements.push((level) => {
      const y = surfaceAt(level.segments, x);
      level.enemies.push({
        kind: 'crawler', x, y, home: x, homeY: y, range, dir: -1, alive: true, phase: 0,
      });
    });
    return this;
  }

  drone(offset: number, lift = 110, range = 80) {
    const x = this.at(offset);
    this.placements.push((level) => {
      const y = surfaceAt(level.segments, x) - lift;
      level.enemies.push({
        kind: 'drone', x, y, home: x, homeY: y, range, dir: 1, alive: true, phase: x * 0.01,
      });
    });
    return this;
  }

  checkpoint(offset = 0) {
    const x = this.at(offset);
    this.placements.push((level) => {
      level.checkpoints.push({ x, y: surfaceAt(level.segments, x), active: false });
    });
    return this;
  }

  goal(offset = 0) {
    this.goalX = this.at(offset);
    return this;
  }

  build(name: string, act: number, palette: Palette): Level {
    const segments = this.segments.map((segment) => ({ ...segment }));
    const level: Level = {
      name,
      act,
      palette,
      segments,
      platforms: [],
      sparks: [],
      springs: [],
      boosts: [],
      spikes: [],
      enemies: [],
      checkpoints: [],
      start: { x: 120, y: surfaceAt(segments, 120) },
      goal: this.goalX,
      end: this.x,
      lowest: Math.max(...segments.map((s) => Math.max(s.y0, s.y1))),
    };
    for (const place of this.placements) place(level);
    return level;
  }
}

const MEADOW: Palette = {
  sky: ['#38c9ff', '#8fe3ff', '#e9fbff'],
  sun: '#fff6b0',
  far: '#7ab8e8',
  mid: '#3fae8c',
  near: '#1f8a5c',
  soil: ['#7a3fc2', '#6a32ad'],
  top: '#4dff88',
  topEdge: '#1ec266',
  accent: '#ffe14d',
};

const FOUNDRY: Palette = {
  sky: ['#0d0626', '#2b0f52', '#ff6a3d'],
  sun: '#ffb347',
  far: '#2a1650',
  mid: '#3d1d6b',
  near: '#2a0f45',
  soil: ['#1f2a44', '#18213a'],
  top: '#ff9a2e',
  topEdge: '#d9561b',
  accent: '#3dfcff',
};

function circuitMeadow(): Level {
  const b = new Builder();
  b.sparks(260, 5).flat(700);
  b.crawler(160, 140).curve(500, 70);
  b.sparks(40, 4).flat(320);
  b.sparkArc(80, 7, 440, 150).hill(600, 130);
  b.boost(40).sparks(140, 5).flat(380);
  b.sparks(150, 8, 50, 30).hill(800, -170);
  b.spring(180).sparkColumn(180, 4, 150).platform(80, 260, 260, 4).flat(420);
  b.crawler(140, 100).sparks(60, 4).slope(420, -110);
  b.sparkArc(0, 6, 260, 110).pit(280);
  b.checkpoint(140).flat(420);
  b.spikes(130, 64).crawler(320, 90).flat(460);
  b.boost(60).sparks(200, 10, 60, 30).curve(900, 220);
  b.drone(200, 120).drone(420, 90).sparks(260, 3).flat(560);
  b.hill(500, 90).crawler(80, 120);
  b.sparkArc(60, 7, 420, 130).hill(520, 90);
  b.flat(160);
  b.platform(90, 30, 140, 3).platform(320, 90, 140, 3).platform(560, 60, 160, 3).pit(760);
  b.checkpoint(120).flat(420);
  b.spikes(160, 96).curve(320, -90);
  b.drone(120, 70).crawler(250, 80).flat(380);
  b.spring(260, 1050, 'right').flat(380);
  b.sparks(160, 10, 55, 26).hill(1000, -230);
  b.boost(80).flat(360);
  b.sparkArc(40, 5, 220, 120).goal(420).flat(1000);
  return b.build('CIRCUIT MEADOW', 1, MEADOW);
}

function neonFoundry(): Level {
  const b = new Builder();
  b.y = 380;
  b.sparks(260, 5).flat(640);
  b.drone(120, 90).curve(520, 150);
  b.boost(20).sparks(100, 6, 50, 30).flat(380);
  b.sparkArc(40, 6, 280, 120).slope(360, -140);
  b.pit(320);
  b.crawler(180, 120).spikes(360, 64).flat(520);
  b.platform(60, 40, 150, 3).platform(300, 110, 150, 3).platform(540, 170, 150, 3)
    .platform(780, 100, 170, 3).pit(980);
  b.checkpoint(120).flat(380);
  b.spring(240, 1300).sparkColumn(240, 5, 180).flat(380);
  b.platform(0, 360, 420, 6).drone(220, 430, 100).flat(500);
  b.sparks(120, 8, 50, 28).hill(900, -210);
  b.crawler(120, 90).crawler(380, 90).flat(560);
  b.boost(40).sparks(160, 8, 60, 30).curve(800, 240);
  b.drone(160, 80).drone(360, 140).drone(560, 80).flat(720);
  b.sparkArc(120, 7, 360, 140).hill(560, 110);
  b.spikes(80, 64).spikes(300, 64).sparkArc(140, 4, 140, 110).flat(440);
  b.checkpoint(120).flat(360);
  b.sparks(60, 5).slope(380, -160);
  b.sparkArc(0, 7, 340, 140).pit(360);
  b.crawler(200, 120).flat(460);
  b.spring(120, 1050, 'right').flat(260);
  b.sparks(120, 12, 55, 26).hill(1100, -260);
  b.boost(60).drone(360, 100).flat(500);
  b.platform(80, 50, 140, 3).platform(300, 90, 140, 3).pit(520);
  b.sparks(140, 5).goal(520).flat(1100);
  return b.build('NEON FOUNDRY', 2, FOUNDRY);
}

export const ZONES: Array<() => Level> = [circuitMeadow, neonFoundry];
