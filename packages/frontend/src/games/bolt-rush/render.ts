import { DISPLAY_FONT } from '../engine/overlay';
import { enemyBox, type BoltState, type Pose } from './bolt.engine';
import type { Level, Palette } from './level';

export const WIDTH = 960;
export const HEIGHT = 540;

/** Volt, the game's own mascot: a teal robo-armadillo with a yellow visor. */
const HERO = {
  shell: '#18c8b8',
  shellDark: '#0d8f86',
  plate: '#0b5f68',
  belly: '#e9fff8',
  visor: '#ffd84a',
  boots: '#ff5a4f',
  bolt: '#fff27a',
};

export interface Camera {
  x: number;
  y: number;
}

export function updateCamera(camera: Camera, state: BoltState, dt: number): void {
  const hero = state.hero;
  const velocity = hero.grounded ? hero.speed : hero.vx;
  const lookAhead = Math.max(-160, Math.min(160, velocity * 0.22));
  const targetX = hero.x - WIDTH * 0.42 + lookAhead;
  const targetY = hero.y - HEIGHT * 0.6;
  camera.x += (targetX - camera.x) * Math.min(1, dt * 8);
  camera.y += (targetY - camera.y) * Math.min(1, dt * (hero.dead ? 0 : 5));
  camera.x = Math.max(0, Math.min(state.level.end - WIDTH, camera.x));
  camera.y = Math.min(state.level.lowest + 120 - HEIGHT, camera.y);
}

const patterns = new WeakMap<Palette, CanvasPattern | null>();

function soilPattern(ctx: CanvasRenderingContext2D, palette: Palette) {
  if (patterns.has(palette)) return patterns.get(palette)!;
  const tile = document.createElement('canvas');
  tile.width = 48;
  tile.height = 48;
  const t = tile.getContext('2d');
  let pattern: CanvasPattern | null = null;
  if (t) {
    t.fillStyle = palette.soil[0];
    t.fillRect(0, 0, 48, 48);
    t.fillStyle = palette.soil[1];
    // Diagonal circuit stripes with node dots.
    t.beginPath();
    t.moveTo(0, 48);
    t.lineTo(24, 24);
    t.lineTo(48, 24);
    t.lineTo(48, 32);
    t.lineTo(28, 32);
    t.lineTo(8, 52);
    t.closePath();
    t.fill();
    t.fillStyle = 'rgba(255,255,255,0.12)';
    t.beginPath();
    t.arc(24, 24, 3, 0, Math.PI * 2);
    t.arc(40, 10, 2, 0, Math.PI * 2);
    t.fill();
    pattern = ctx.createPattern(tile, 'repeat');
  }
  patterns.set(palette, pattern);
  return pattern;
}

function drawBackdrop(ctx: CanvasRenderingContext2D, level: Level, camera: Camera, clock: number) {
  const { palette } = level;
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, palette.sky[0]);
  sky.addColorStop(0.6, palette.sky[1]);
  sky.addColorStop(1, palette.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.shadowColor = palette.sun;
  ctx.shadowBlur = 60;
  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(WIDTH * 0.72 - camera.x * 0.02, 120, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const verticalShift = Math.max(-80, Math.min(80, -camera.y * 0.1));
  const layer = (factor: number, base: number, amplitude: number, color: string, freq: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT);
    for (let sx = 0; sx <= WIDTH + 16; sx += 16) {
      const wx = sx + camera.x * factor;
      const y =
        base + verticalShift * factor * 2 -
        amplitude * (0.6 * Math.sin(wx * freq) + 0.4 * Math.sin(wx * freq * 2.7 + 1.3));
      ctx.lineTo(sx, y);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.fill();
  };
  layer(0.1, 300, 70, palette.far, 0.004);
  layer(0.3, 360, 50, palette.mid, 0.007);

  // Near layer: pylons with blinking lights give a sense of speed.
  ctx.fillStyle = palette.near;
  const spacing = 220;
  const offset = (camera.x * 0.55) % spacing;
  for (let sx = -offset - spacing; sx < WIDTH + spacing; sx += spacing) {
    const index = Math.round((sx + camera.x * 0.55) / spacing);
    const h = 120 + ((index * 53) % 90);
    const top = 470 - h + verticalShift;
    ctx.fillRect(sx, top, 14, h + 200);
    ctx.fillRect(sx - 16, top + 18, 46, 8);
    ctx.fillStyle = Math.sin(clock * 3 + index) > 0 ? palette.accent : palette.near;
    ctx.fillRect(sx + 3, top - 8, 8, 8);
    ctx.fillStyle = palette.near;
  }
  layer(0.6, 470, 22, palette.near, 0.012);
}

function drawTerrain(ctx: CanvasRenderingContext2D, level: Level, camera: Camera) {
  const { palette, segments } = level;
  const left = camera.x - 20;
  const right = camera.x + WIDTH + 20;
  const bottom = camera.y + HEIGHT + 40;
  const pattern = soilPattern(ctx, palette);

  // Group consecutive solid segments into runs and fill each as one polygon.
  let run: typeof segments = [];
  const flush = () => {
    if (run.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(run[0].x0, bottom);
    ctx.lineTo(run[0].x0, run[0].y0);
    for (const segment of run) ctx.lineTo(segment.x1, segment.y1);
    ctx.lineTo(run[run.length - 1].x1, bottom);
    ctx.closePath();
    ctx.fillStyle = pattern ?? palette.soil[0];
    ctx.fill();

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(run[0].x0, run[0].y0 + 6);
    for (const segment of run) ctx.lineTo(segment.x1, segment.y1 + 6);
    ctx.strokeStyle = palette.topEdge;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(run[0].x0, run[0].y0 + 2);
    for (const segment of run) ctx.lineTo(segment.x1, segment.y1 + 2);
    ctx.strokeStyle = palette.top;
    ctx.lineWidth = 8;
    ctx.stroke();
    run = [];
  };
  for (const segment of segments) {
    if (segment.x1 < left || segment.x0 > right) continue;
    if (segment.solid) run.push(segment);
    else flush();
  }
  flush();

  for (const platform of level.platforms) {
    if (platform.x + platform.w < left || platform.x > right) continue;
    ctx.fillStyle = pattern ?? palette.soil[0];
    ctx.beginPath();
    ctx.roundRect(platform.x, platform.y, platform.w, 26, [0, 0, 12, 12]);
    ctx.fill();
    ctx.fillStyle = palette.top;
    ctx.fillRect(platform.x, platform.y - 2, platform.w, 8);
    ctx.fillStyle = palette.topEdge;
    ctx.fillRect(platform.x, platform.y + 6, platform.w, 4);
  }
}

function drawObjects(ctx: CanvasRenderingContext2D, state: BoltState, camera: Camera, clock: number) {
  const { level } = state;
  const visible = (x: number, pad = 60) => x > camera.x - pad && x < camera.x + WIDTH + pad;
  const { palette } = level;

  for (const checkpoint of level.checkpoints) {
    if (!visible(checkpoint.x)) continue;
    ctx.fillStyle = '#d8d4f0';
    ctx.fillRect(checkpoint.x - 3, checkpoint.y - 70, 6, 70);
    ctx.save();
    const color = checkpoint.active ? '#4dff88' : '#4d7cff';
    ctx.shadowColor = color;
    ctx.shadowBlur = checkpoint.active ? 20 : 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(checkpoint.x, checkpoint.y - 78, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Goal: a holo-panel that spins once the hero passes it.
  if (visible(level.goal)) {
    const x = level.goal;
    const ground = level.segments.find((s) => x >= s.x0 && x < s.x1);
    const y = ground ? ground.y0 : 420;
    ctx.fillStyle = '#d8d4f0';
    ctx.fillRect(x - 4, y - 110, 8, 110);
    const turn = state.cleared ? Math.cos(clock * 12) : 1;
    ctx.save();
    ctx.translate(x, y - 140);
    ctx.scale(turn, 1);
    ctx.fillStyle = '#1b1530';
    ctx.beginPath();
    ctx.roundRect(-36, -34, 72, 68, 10);
    ctx.fill();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = Math.abs(turn) < 0.2 ? palette.accent : HERO.visor;
    ctx.beginPath();
    ctx.moveTo(6, -24);
    ctx.lineTo(-14, 4);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 26);
    ctx.lineTo(16, -4);
    ctx.lineTo(2, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (const boost of level.boosts) {
    if (!visible(boost.x)) continue;
    ctx.fillStyle = '#1b1530';
    ctx.fillRect(boost.x - 26, boost.y - 6, 52, 8);
    for (let i = 0; i < 3; i++) {
      const on = Math.floor(clock * 10) % 3 === i;
      ctx.fillStyle = on ? palette.accent : '#ff5a4f';
      const cx = boost.x - 14 * boost.dir + i * 14 * boost.dir;
      ctx.beginPath();
      ctx.moveTo(cx - 5 * boost.dir, boost.y - 5);
      ctx.lineTo(cx + 3 * boost.dir, boost.y - 2);
      ctx.lineTo(cx - 5 * boost.dir, boost.y + 1);
      ctx.fill();
    }
  }

  for (const spike of level.spikes) {
    if (!visible(spike.x, spike.w + 40)) continue;
    ctx.fillStyle = '#c9c6dd';
    ctx.strokeStyle = '#6e6a8a';
    ctx.lineWidth = 2;
    for (let x = spike.x; x < spike.x + spike.w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, spike.y);
      ctx.lineTo(x + 8, spike.y - 22);
      ctx.lineTo(x + 16, spike.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  for (const spring of level.springs) {
    if (!visible(spring.x)) continue;
    ctx.save();
    ctx.translate(spring.x, spring.y);
    if (spring.dir !== 'up') ctx.rotate(spring.dir === 'right' ? Math.PI / 2 : -Math.PI / 2);
    if (spring.dir !== 'up') ctx.translate(-14, 0);
    const stretch = spring.squash > 0 ? 14 * spring.squash : 0;
    ctx.fillStyle = '#5b5778';
    ctx.fillRect(-18, -6, 36, 6);
    ctx.strokeStyle = '#c9c6dd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      ctx.lineTo(i % 2 ? 10 : -10, -6 - i * (3 + stretch / 4));
    }
    ctx.stroke();
    ctx.fillStyle = spring.power > 1200 ? '#ff4f6d' : '#ffd84a';
    ctx.beginPath();
    ctx.roundRect(-20, -22 - stretch, 40, 8, 3);
    ctx.fill();
    ctx.restore();
  }

  for (const spark of level.sparks) {
    if (spark.taken || !visible(spark.x)) continue;
    const spin = Math.cos(clock * 4 + spark.x * 0.01);
    ctx.save();
    ctx.translate(spark.x, spark.y);
    ctx.scale(Math.max(0.25, Math.abs(spin)), 1);
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 12;
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(3, 0);
    ctx.lineTo(0, 5);
    ctx.lineTo(-3, 0);
    ctx.fill();
    ctx.restore();
  }

  for (const enemy of level.enemies) {
    if (!enemy.alive || !visible(enemy.x)) continue;
    const [left, top, right, bottom] = enemyBox(enemy);
    const cx = (left + right) / 2;
    ctx.save();
    if (enemy.kind === 'crawler') {
      // A beetle-bot on a single treaded wheel.
      ctx.fillStyle = '#2b2440';
      ctx.beginPath();
      ctx.arc(cx, bottom - 8, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9c6dd';
      ctx.lineWidth = 2;
      const a = enemy.phase * 8 * enemy.dir;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 8, bottom - 8 + Math.sin(a) * 8);
      ctx.lineTo(cx - Math.cos(a) * 8, bottom - 8 - Math.sin(a) * 8);
      ctx.stroke();
      ctx.fillStyle = '#ff4f6d';
      ctx.beginPath();
      ctx.ellipse(cx, top + 12, 20, 13, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffd84a';
      ctx.fillRect(cx + enemy.dir * 10 - 4, top + 6, 8, 5);
      ctx.strokeStyle = '#2b2440';
      ctx.beginPath();
      ctx.moveTo(cx, top + 1);
      ctx.lineTo(cx, top + 12);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#c9c6dd';
      const blade = Math.sin(enemy.phase * 40) * 18;
      ctx.fillRect(cx - Math.abs(blade), top - 6, Math.abs(blade) * 2, 3);
      ctx.fillRect(cx - 1, top - 6, 2, 8);
      ctx.fillStyle = '#7a5cff';
      ctx.beginPath();
      ctx.ellipse(cx, (top + bottom) / 2, 18, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = '#ff4f6d';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff4f6d';
      ctx.beginPath();
      ctx.arc(cx + enemy.dir * 8, (top + bottom) / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawBolt(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.fillStyle = HERO.bolt;
  ctx.beginPath();
  ctx.moveTo(x + 2 * scale, y - 7 * scale);
  ctx.lineTo(x - 4 * scale, y + 1 * scale);
  ctx.lineTo(x, y + 1 * scale);
  ctx.lineTo(x - 2 * scale, y + 7 * scale);
  ctx.lineTo(x + 4 * scale, y - 1 * scale);
  ctx.lineTo(x, y - 1 * scale);
  ctx.closePath();
  ctx.fill();
}

function drawHero(ctx: CanvasRenderingContext2D, state: BoltState, pose: Pose, clock: number) {
  const hero = state.hero;
  if (hero.invulnerable > 0 && !hero.dead && Math.floor(clock * 20) % 2 === 0) return;
  const speed = Math.abs(hero.grounded ? hero.speed : hero.vx);

  ctx.save();
  ctx.translate(hero.x, hero.y);

  if (pose === 'ball' || pose === 'charge') {
    const r = 15;
    const spin = pose === 'charge' ? clock * 40 : hero.stride * 1.6;
    ctx.translate(0, -r);
    if (speed > 900 || pose === 'charge') {
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.18 / i;
        ctx.fillStyle = HERO.shell;
        ctx.beginPath();
        ctx.arc(-hero.facing * i * 12, 0, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.rotate(spin * hero.facing);
    ctx.fillStyle = HERO.shellDark;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = HERO.shell;
    ctx.lineWidth = 4;
    for (const a of [0, Math.PI * 0.66, Math.PI * 1.33]) {
      ctx.beginPath();
      ctx.arc(0, 0, r - 4, a, a + 1.4);
      ctx.stroke();
    }
    drawBolt(ctx, 0, 0, 1.1);
    ctx.restore();
    return;
  }

  ctx.scale(hero.facing, 1);
  if (pose === 'dead') ctx.rotate(Math.PI);
  else if (pose === 'hurt') ctx.rotate(-0.4);
  else if (hero.grounded) ctx.rotate(hero.angle * hero.facing);
  if (pose === 'skid') ctx.rotate(-0.18);

  // Legs: a blur wheel at speed, stepping boots otherwise.
  const stride = hero.stride * 2.2;
  if (pose === 'run' && speed > 520) {
    ctx.strokeStyle = HERO.boots;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(2, -9, 12, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    const swing = pose === 'run' ? Math.sin(stride) * 8 : pose === 'spring' ? 0 : 0;
    for (const side of [-1, 1]) {
      ctx.fillStyle = side < 0 ? '#c8403a' : HERO.boots;
      ctx.beginPath();
      ctx.roundRect(-5 + side * swing - 2, -9 + (pose === 'spring' ? 4 : 0), 13, 9, 4);
      ctx.fill();
    }
  }

  // Body: banded shell over a pale belly.
  const bob = pose === 'run' ? Math.abs(Math.sin(stride)) * 2 : 0;
  ctx.translate(0, -bob);
  ctx.fillStyle = HERO.belly;
  ctx.beginPath();
  ctx.ellipse(3, -20, 11, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = HERO.shell;
  ctx.beginPath();
  ctx.ellipse(-3, -22, 14, 15, -0.2, Math.PI * 0.35, Math.PI * 1.75);
  ctx.fill();
  ctx.strokeStyle = HERO.plate;
  ctx.lineWidth = 2;
  for (const a of [-0.9, -0.2, 0.5]) {
    ctx.beginPath();
    ctx.ellipse(-3, -22, 14, 15, -0.2, Math.PI + a - 0.5, Math.PI + a + 0.5);
    ctx.stroke();
  }

  // Head with a wraparound visor and an antenna.
  ctx.fillStyle = HERO.shell;
  ctx.beginPath();
  ctx.arc(6, -37, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = HERO.visor;
  ctx.beginPath();
  ctx.roundRect(5, -41, 12, 7, 3);
  ctx.fill();
  ctx.fillStyle = '#1b1530';
  ctx.fillRect(12, -40, 3, 4);
  ctx.strokeStyle = HERO.plate;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, -46);
  ctx.lineTo(-3, -54);
  ctx.stroke();
  drawBolt(ctx, -4, -56, 0.6);

  // Tail: a crackling lightning tail that flickers with speed.
  ctx.strokeStyle = HERO.bolt;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-15, -16);
  const flick = Math.sin(clock * 30) * (speed > 300 ? 4 : 1.5);
  ctx.lineTo(-22, -20 + flick);
  ctx.lineTo(-20, -12);
  ctx.lineTo(-28, -15 - flick);
  ctx.stroke();

  // Arm
  ctx.fillStyle = HERO.shellDark;
  const arm = pose === 'spring' ? -14 : pose === 'run' ? Math.cos(stride) * 6 : 0;
  ctx.beginPath();
  ctx.ellipse(4 + arm * 0.3, -24 + (pose === 'spring' ? -8 : 0), 4, 7, arm * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, state: BoltState) {
  const { palette } = state.level;
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.min(1, particle.life * 2);
    ctx.fillStyle =
      particle.color === 'spark' ? palette.accent : particle.color === 'pop' ? '#ffffff' : '#d8cfb8';
    const size = particle.color === 'dust' ? 5 : 4;
    ctx.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
  ctx.font = `12px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  for (const popup of state.popups) {
    ctx.globalAlpha = Math.min(1, popup.life * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(popup.text, popup.x, popup.y);
  }
  ctx.globalAlpha = 1;
}

function hudText(ctx: CanvasRenderingContext2D, label: string, value: string, y: number, alert: boolean) {
  ctx.fillStyle = alert ? '#ff4f6d' : '#ffd84a';
  ctx.fillText(label, 20, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(value, 140, y);
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: BoltState,
  camera: Camera,
  pose: Pose,
  clock: number
): void {
  drawBackdrop(ctx, state.level, camera, clock);
  ctx.save();
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
  drawTerrain(ctx, state.level, camera);
  drawObjects(ctx, state, camera, clock);
  drawHero(ctx, state, pose, clock);
  drawParticles(ctx, state);
  ctx.restore();

  // HUD
  ctx.save();
  ctx.font = `14px ${DISPLAY_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  const minutes = Math.floor(state.time / 60);
  const seconds = Math.floor(state.time % 60);
  const flash = Math.floor(clock * 3) % 2 === 0;
  hudText(ctx, 'SCORE', String(state.score), 18, false);
  hudText(ctx, 'TIME', `${minutes}:${String(seconds).padStart(2, '0')}`, 42, false);
  hudText(ctx, 'SPARKS', String(state.sparks), 66, state.sparks === 0 && flash);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`VOLT × ${state.lives}`, WIDTH - 20, 18);
  ctx.restore();

  // Zone title card for the first seconds of a zone.
  if (state.time < 2.6 && !state.cleared) {
    const slide = Math.min(1, state.time * 3) * Math.min(1, (2.6 - state.time) * 3);
    ctx.save();
    ctx.globalAlpha = slide;
    ctx.fillStyle = 'rgba(6,4,20,0.75)';
    ctx.fillRect(0, HEIGHT / 2 - 60, WIDTH, 110);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `30px ${DISPLAY_FONT}`;
    ctx.fillStyle = state.level.palette.accent;
    ctx.fillText(state.level.name, WIDTH / 2, HEIGHT / 2 - 18);
    ctx.font = `16px ${DISPLAY_FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`ZONE ${state.level.act}`, WIDTH / 2, HEIGHT / 2 + 24);
    ctx.restore();
  }

  if (state.cleared && state.bonus) {
    ctx.save();
    ctx.fillStyle = 'rgba(6,4,20,0.7)';
    ctx.fillRect(WIDTH / 2 - 260, 120, 520, 190);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `22px ${DISPLAY_FONT}`;
    ctx.fillStyle = state.level.palette.accent;
    ctx.fillText('ZONE CLEAR!', WIDTH / 2, 160);
    ctx.font = `14px ${DISPLAY_FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`TIME BONUS   ${state.bonus.time}`, WIDTH / 2, 210);
    ctx.fillText(`SPARK BONUS  ${state.bonus.sparks}`, WIDTH / 2, 240);
    ctx.fillText(`SCORE        ${state.score}`, WIDTH / 2, 275);
    ctx.restore();
  }
}
