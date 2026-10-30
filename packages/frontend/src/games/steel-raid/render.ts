import { DISPLAY_FONT } from '../engine/overlay';
import { GROUND, LEDGES, VIEW_HEIGHT, VIEW_WIDTH } from './level';
import { enemyBox, type Enemy, type Hero, type Pow, type SteelState } from './steel.engine';

export const WIDTH = VIEW_WIDTH;
export const HEIGHT = VIEW_HEIGHT;

/** Rook, the game's own commando: blue fatigues and a red bandana. */
const HERO = {
  skin: '#f2c49b',
  vest: '#2f5fb3',
  vestDark: '#1f3f7a',
  pants: '#6b5a3a',
  bandana: '#e23b3b',
  boots: '#2a2018',
  gun: '#3a3a44',
};

const ENEMY = {
  uniform: '#7a8a4a',
  uniformDark: '#55623a',
  helmet: '#5d6b36',
  skin: '#e8b88f',
};

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawBackdrop(ctx: CanvasRenderingContext2D, cameraX: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#f08a4b');
  sky.addColorStop(0.55, '#f7c98a');
  sky.addColorStop(1, '#f9e2b4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(720 - cameraX * 0.02, 150, 46, 0, Math.PI * 2);
  ctx.fill();

  // Far mesas.
  ctx.fillStyle = '#c9845a';
  const far = cameraX * 0.15;
  for (let i = -1; i < 8; i++) {
    const x = i * 260 - (far % 260);
    ctx.beginPath();
    ctx.moveTo(x, 360);
    ctx.lineTo(x + 40, 260 + ((i * 37) % 50));
    ctx.lineTo(x + 170, 260 + ((i * 37) % 50));
    ctx.lineTo(x + 220, 360);
    ctx.fill();
  }

  // Ruined town, mid layer.
  const mid = cameraX * 0.45;
  for (let i = -1; i < 10; i++) {
    const seed = Math.abs((Math.floor(mid / 180) + i) * 9301 + 49297) % 233280;
    const x = i * 180 - (mid % 180);
    const h = 90 + (seed % 90);
    rect(ctx, x + 10, GROUND - h - 30, 120, h + 30, '#a5684a');
    rect(ctx, x + 10, GROUND - h - 30, 120, 8, '#8a5238');
    // Broken roofline.
    ctx.fillStyle = '#f7c98a';
    ctx.beginPath();
    ctx.moveTo(x + 70 + (seed % 40), GROUND - h - 30);
    ctx.lineTo(x + 130, GROUND - h - 30);
    ctx.lineTo(x + 130, GROUND - h + 10 + (seed % 20));
    ctx.fill();
    for (let wy = 0; wy < 2; wy++) {
      for (let wx = 0; wx < 3; wx++) {
        rect(ctx, x + 24 + wx * 36, GROUND - h - 4 + wy * 40, 16, 22, '#4a2a22');
      }
    }
  }
}

function drawGround(ctx: CanvasRenderingContext2D, cameraX: number) {
  rect(ctx, 0, GROUND, WIDTH, HEIGHT - GROUND, '#c9a165');
  rect(ctx, 0, GROUND, WIDTH, 6, '#e6c48a');
  ctx.fillStyle = '#b08850';
  for (let x = -(cameraX % 64); x < WIDTH; x += 64) {
    ctx.fillRect(x, GROUND + 22, 30, 4);
    ctx.fillRect(x + 34, GROUND + 44, 18, 4);
  }

  for (const ledge of LEDGES) {
    const x = ledge.x - cameraX;
    if (x > WIDTH || x + ledge.w < 0) continue;
    // Sandbag-topped scaffold.
    rect(ctx, x + 8, ledge.y, 8, GROUND - ledge.y, '#5a4030');
    rect(ctx, x + ledge.w - 16, ledge.y, 8, GROUND - ledge.y, '#5a4030');
    rect(ctx, x, ledge.y, ledge.w, 14, '#7b5a3c');
    for (let bx = 0; bx < ledge.w; bx += 28) {
      ctx.fillStyle = '#c7b07a';
      ctx.beginPath();
      ctx.ellipse(x + bx + 14, ledge.y - 2, 15, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGun(ctx: CanvasRenderingContext2D, hero: Hero, chestY: number) {
  ctx.save();
  ctx.translate(hero.x, chestY);
  const angle = hero.aim === 'up' ? -Math.PI / 2 : hero.aim === 'down' ? Math.PI / 2 : 0;
  ctx.scale(hero.facing, 1);
  ctx.rotate(hero.facing === 1 ? angle : -angle);
  const long = hero.weapon === 'heavy';
  rect(ctx, 0, -3, long ? 30 : 20, 6, HERO.gun);
  if (long) rect(ctx, 6, 2, 8, 6, '#555560');
  rect(ctx, -2, -4, 8, 8, HERO.skin);
  if (hero.muzzle > 0) {
    ctx.fillStyle = '#fff6a0';
    ctx.beginPath();
    const tip = long ? 30 : 20;
    ctx.moveTo(tip, -6);
    ctx.lineTo(tip + 18, 0);
    ctx.lineTo(tip, 6);
    ctx.fill();
  }
  ctx.restore();
}

function drawHero(ctx: CanvasRenderingContext2D, hero: Hero, clock: number) {
  if (hero.invulnerable > 0 && Math.floor(clock * 16) % 2 === 0) return;
  ctx.save();
  if (hero.dead) {
    ctx.translate(hero.x, hero.y);
    ctx.rotate(-hero.facing * Math.min(1.4, (1.4 - hero.deathTimer) * 3));
    ctx.translate(-hero.x, -hero.y);
  }
  const { x, y } = hero;
  const crouch = hero.crouch;
  const legSwing = hero.grounded ? Math.sin(hero.stride) * 7 : 4;
  const hip = y - (crouch ? 16 : 24);
  const chest = crouch ? y - 22 : y - 34;
  const head = crouch ? y - 40 : y - 56;

  // Legs.
  if (crouch) {
    rect(ctx, x - 12, y - 14, 24, 10, HERO.pants);
    rect(ctx, x - 14, y - 6, 12, 6, HERO.boots);
    rect(ctx, x + 2, y - 6, 12, 6, HERO.boots);
  } else {
    rect(ctx, x - 9 + legSwing, hip, 8, 20, HERO.pants);
    rect(ctx, x + 1 - legSwing, hip, 8, 20, HERO.pants);
    rect(ctx, x - 11 + legSwing, y - 5, 12, 5, HERO.boots);
    rect(ctx, x - 1 - legSwing, y - 5, 12, 5, HERO.boots);
  }
  // Body.
  rect(ctx, x - 11, chest - 8, 22, crouch ? 18 : 24, HERO.vest);
  rect(ctx, x - 11, chest + 2, 22, 4, HERO.vestDark);
  // Head and bandana.
  rect(ctx, x - 8, head, 16, 16, HERO.skin);
  rect(ctx, x - 9, head - 2, 18, 6, HERO.bandana);
  rect(ctx, x - hero.facing * 9 - (hero.facing === 1 ? 6 : 0), head, 6, 3, HERO.bandana);
  rect(ctx, x - hero.facing * 14 - 3, head + 2 + Math.sin(clock * 12) * 2, 6, 3, HERO.bandana);
  rect(ctx, x + hero.facing * 3 - 1, head + 6, 3, 3, '#20140c');

  if (hero.knife > 0) {
    ctx.strokeStyle = '#e8eef5';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + hero.facing * 14, chest - 4, 22, -1.2, 1.2, hero.facing === -1);
    ctx.stroke();
  } else {
    drawGun(ctx, hero, chest - 2);
  }
  ctx.restore();
}

function drawSoldier(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  const { x, y } = enemy;
  const f = enemy.facing;
  ctx.save();
  if (enemy.dead) {
    ctx.globalAlpha = Math.max(0, enemy.deathTimer / 0.7);
    ctx.translate(x, y);
    ctx.rotate(-f * (1 - enemy.deathTimer / 0.7) * 1.4);
    ctx.translate(-x, -y);
  }
  const swing = Math.sin(enemy.stride) * 6;
  const body = enemy.flash > 0 ? '#ffffff' : ENEMY.uniform;
  rect(ctx, x - 8 + swing, y - 22, 7, 20, ENEMY.uniformDark);
  rect(ctx, x + 1 - swing, y - 22, 7, 20, ENEMY.uniformDark);
  rect(ctx, x - 10, y - 4, 20, 4, '#2a2018');
  rect(ctx, x - 10, y - 42, 20, 22, body);
  rect(ctx, x - 7, y - 54, 14, 13, ENEMY.skin);
  rect(ctx, x - 9, y - 58, 18, 7, ENEMY.helmet);
  rect(ctx, x + f * 2 - 1, y - 50, 3, 3, '#20140c');
  rect(ctx, f === 1 ? x + 4 : x - 26, y - 37, 22, 5, '#3a3a44');
  ctx.restore();
}

function drawGunner(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  const { x, y } = enemy;
  const f = enemy.facing;
  ctx.save();
  if (enemy.dead) ctx.globalAlpha = Math.max(0, enemy.deathTimer / 0.7);
  // Sandbag nest.
  ctx.fillStyle = '#b8a06a';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x - 18 + i * 18, y - 8, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(x - 9, y - 22, 12, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 9, y - 22, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const body = enemy.flash > 0 ? '#ffffff' : ENEMY.uniform;
  rect(ctx, x - 9, y - 42, 18, 14, body);
  rect(ctx, x - 7, y - 54, 14, 12, ENEMY.skin);
  rect(ctx, x - 9, y - 58, 18, 7, ENEMY.helmet);
  rect(ctx, f === 1 ? x + 2 : x - 36, y - 34, 34, 6, '#2e2e36');
  rect(ctx, x - 3, y - 30, 6, 8, '#2e2e36');
  ctx.restore();
}

function drawDrone(ctx: CanvasRenderingContext2D, enemy: Enemy, clock: number) {
  const { x, y } = enemy;
  ctx.save();
  if (enemy.dead) ctx.globalAlpha = Math.max(0, enemy.deathTimer / 0.7);
  const hull = enemy.flash > 0 ? '#ffffff' : '#6d7480';
  rect(ctx, x - 24, y - 8, 48, 16, hull);
  rect(ctx, x - 18, y + 8, 36, 4, '#454b55');
  rect(ctx, x - 4, y - 16, 8, 8, '#454b55');
  const blade = 22 * Math.abs(Math.cos(clock * 30));
  rect(ctx, x - blade, y - 18, blade * 2, 3, '#2a2e36');
  rect(ctx, x + enemy.facing * 12 - 4, y - 4, 8, 6, '#ff4f4f');
  ctx.restore();
}

function drawTank(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  const box = enemyBox(enemy);
  const { x, y } = enemy;
  const flash = enemy.flash > 0;
  const hull = flash ? '#ffffff' : enemy.dead ? '#3d3a30' : '#6e7444';
  const dark = enemy.dead ? '#2a281f' : '#4d5230';
  // Treads.
  rect(ctx, box.x, y - 34, box.w, 34, '#2c2c2c');
  for (let i = 0; i < 9; i++) {
    const wx = box.x + 14 + i * 24;
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath();
    ctx.arc(wx, y - 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c2c2c';
    ctx.fillRect(wx - 2 + Math.sin(enemy.stride + i) * 4, y - 20, 4, 8);
  }
  // Hull and turret.
  rect(ctx, box.x + 8, y - 70, box.w - 16, 38, hull);
  rect(ctx, box.x + 8, y - 70, box.w - 16, 6, dark);
  rect(ctx, x - 50, y - 112, 110, 44, hull);
  rect(ctx, x - 50, y - 112, 110, 6, dark);
  rect(ctx, x - 150, y - 98, 100, 12, dark);
  rect(ctx, x - 30, y - 104, 24, 10, '#2c2c2c');
  // Hull machine gun.
  rect(ctx, box.x - 18, y - 30, 26, 6, '#2c2c2c');
  // Star emblem.
  ctx.fillStyle = flash ? '#ffcccc' : '#c23a2a';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 12 : 5;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(x + 20 + Math.cos(a) * r, y - 52 + Math.sin(a) * r);
  }
  ctx.fill();
}

function drawPow(ctx: CanvasRenderingContext2D, pow: Pow, clock: number) {
  const { x, y } = pow;
  const freed = pow.state === 'freed';
  const salute = freed && pow.timer > 0;
  const bob = freed && !salute ? Math.abs(Math.sin(clock * 14)) * 3 : 0;
  rect(ctx, x - 8, y - 20 - bob, 16, 20, '#7a6040');
  rect(ctx, x - 10, y - 42 - bob, 20, 22, '#e9e2cf');
  rect(ctx, x - 8, y - 56 - bob, 16, 14, '#f2c49b');
  rect(ctx, x - 8, y - 46 - bob, 16, 6, '#6b4a2a'); // beard
  if (!freed) {
    // Tied to a post.
    rect(ctx, x + 10, y - 60, 6, 60, '#5a4030');
    rect(ctx, x - 11, y - 32, 26, 4, '#c9a165');
    rect(ctx, x - 11, y - 24, 26, 4, '#c9a165');
    if (Math.floor(clock * 2) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `10px ${DISPLAY_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('HELP!', x, y - 70);
    }
  } else if (salute) {
    rect(ctx, x + 6, y - 58, 4, 16, '#e9e2cf');
  }
}

function drawPickups(ctx: CanvasRenderingContext2D, state: SteelState, clock: number) {
  for (const pickup of state.pickups) {
    const x = pickup.x;
    const y = pickup.y - Math.abs(Math.sin(clock * 5)) * 3;
    const color = pickup.kind === 'heavy' ? '#e23b3b' : pickup.kind === 'bombs' ? '#2f8f3f' : '#e0a020';
    rect(ctx, x - 14, y - 28, 28, 28, '#2a2018');
    rect(ctx, x - 12, y - 26, 24, 24, color);
    ctx.fillStyle = '#ffffff';
    ctx.font = `14px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pickup.kind === 'heavy' ? 'H' : pickup.kind === 'bombs' ? 'B' : '★', x, y - 13);
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, state: SteelState) {
  for (const bullet of state.bullets) {
    if (bullet.owner === 'hero') {
      ctx.fillStyle = bullet.heavy ? '#fff27a' : '#ffffff';
      const horizontal = bullet.vy === 0;
      const w = horizontal ? (bullet.heavy ? 16 : 10) : 4;
      const h = horizontal ? 4 : bullet.heavy ? 16 : 10;
      ctx.fillRect(bullet.x - w / 2, bullet.y - h / 2, w, h);
    } else {
      ctx.fillStyle = '#ff6a3a';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const bomb of state.bombs) {
    ctx.save();
    ctx.translate(bomb.x, bomb.y);
    ctx.rotate(bomb.spin);
    ctx.fillStyle = bomb.shell ? '#3a3a3a' : bomb.owner === 'hero' ? '#3d5a2a' : '#5a3a2a';
    ctx.fillRect(bomb.shell ? -9 : -6, -4, bomb.shell ? 18 : 12, 8);
    ctx.fillStyle = '#c9a165';
    ctx.fillRect(bomb.shell ? 6 : 3, -4, 3, 8);
    ctx.restore();
  }
}

function drawEffects(ctx: CanvasRenderingContext2D, state: SteelState) {
  for (const blast of state.blasts) {
    const t = 1 - blast.life / blast.max;
    const r = blast.radius * (0.4 + t * 0.8);
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = '#ffdf6a';
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff7a2a';
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, r * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const p of state.particles) {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    const color =
      p.kind === 'spark' ? '#fff27a' : p.kind === 'smoke' ? '#5a5048' : p.kind === 'casing' ? '#e0b040' : '#6b4a2a';
    const size = p.kind === 'smoke' ? 10 : p.kind === 'casing' ? 3 : 4;
    rect(ctx, p.x - size / 2, p.y - size / 2, size, size, color);
  }
  ctx.globalAlpha = 1;
  ctx.font = `12px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  for (const item of state.popups) {
    ctx.globalAlpha = Math.min(1, item.life * 2);
    ctx.fillStyle = '#20140c';
    ctx.fillText(item.text, item.x + 2, item.y + 2);
    ctx.fillStyle = '#fff6c0';
    ctx.fillText(item.text, item.x, item.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx: CanvasRenderingContext2D, state: SteelState) {
  const hero = state.hero;
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = `14px ${DISPLAY_FONT}`;
  const text = (value: string, x: number, y: number, color = '#ffffff') => {
    ctx.fillStyle = '#20140c';
    ctx.fillText(value, x + 2, y + 2);
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  };
  text(`1UP ${String(state.score).padStart(7, '0')}`, 20, 18, '#fff27a');
  text(`LIVES ${'♥'.repeat(Math.max(0, state.lives))}`, 20, 42, '#ff6a6a');
  rect(ctx, 330, 14, 210, 46, 'rgba(20,12,6,0.55)');
  ctx.font = `11px ${DISPLAY_FONT}`;
  text('ARMS', 344, 20);
  text('BOMB', 452, 20);
  ctx.font = `14px ${DISPLAY_FONT}`;
  text(hero.weapon === 'heavy' ? String(hero.ammo) : '∞', 344, 38, '#fff27a');
  text(String(hero.bombs), 452, 38, '#fff27a');

  const boss = state.boss;
  if (boss && !boss.dead) {
    rect(ctx, WIDTH - 300, 20, 280, 18, '#20140c');
    rect(ctx, WIDTH - 297, 23, 274 * (boss.hp / boss.maxHp), 12, '#e23b3b');
    ctx.font = `11px ${DISPLAY_FONT}`;
    text('IRON BEETLE', WIDTH - 300, 44);
  }
  if (state.lockX !== null && !boss && Math.floor(state.time * 3) % 2 === 0) {
    ctx.font = `12px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    text('CLEAR THE AREA!', WIDTH / 2, 80, '#ffdf6a');
  }
  ctx.restore();
}

export function drawFrame(ctx: CanvasRenderingContext2D, state: SteelState, clock: number): void {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake * 24, (Math.random() - 0.5) * state.shake * 24);
  }
  drawBackdrop(ctx, state.cameraX);
  drawGround(ctx, state.cameraX);

  ctx.save();
  ctx.translate(-Math.round(state.cameraX), 0);
  for (const pow of state.pows) if (pow.state !== 'gone') drawPow(ctx, pow, clock);
  drawPickups(ctx, state, clock);
  for (const enemy of state.enemies) {
    if (enemy.kind === 'soldier') drawSoldier(ctx, enemy);
    else if (enemy.kind === 'gunner') drawGunner(ctx, enemy);
    else if (enemy.kind === 'drone') drawDrone(ctx, enemy, clock);
    else drawTank(ctx, enemy);
  }
  drawHero(ctx, state.hero, clock);
  drawProjectiles(ctx, state);
  drawEffects(ctx, state);
  ctx.restore();
  ctx.restore();

  drawHud(ctx, state);
}
