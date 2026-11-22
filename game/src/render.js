// render.js — all canvas drawing: the museum, the vision cones, the people,
// the lighting, the HUD and the title / end screens. No game rules here.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, CONE_RANGE, CONE_HALF_ANGLE, COLORS, INTEL_TOTAL } from './config.js';
import { GUARD_STATE } from './guards.js';

function coneColor(guard) {
  if (guard.state === GUARD_STATE.CHASE) return COLORS.coneAlert;
  if (guard.suspicion > 0.45 || guard.state === GUARD_STATE.SUSPICIOUS || guard.state === GUARD_STATE.SEARCH) {
    return COLORS.coneSuspicious;
  }
  return COLORS.coneCalm;
}

function drawCone(ctx, guard) {
  const range = CONE_RANGE;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, range, guard.facing - CONE_HALF_ANGLE, guard.facing + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fillStyle = coneColor(guard);
  ctx.fill();
  // Cone edge lines so the shape reads at a glance.
  ctx.strokeStyle = 'rgba(255, 220, 120, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing - CONE_HALF_ANGLE) * range, guard.y + Math.sin(guard.facing - CONE_HALF_ANGLE) * range);
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing + CONE_HALF_ANGLE) * range, guard.y + Math.sin(guard.facing + CONE_HALF_ANGLE) * range);
  ctx.stroke();
}

function drawFloor(ctx) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  // Faint carpet runner down the middle halls, for orientation.
  ctx.fillStyle = 'rgba(120, 40, 60, 0.25)';
  ctx.fillRect(0, 6 * TILE, VIEW_W, TILE);
  ctx.fillRect(0, 12 * TILE, VIEW_W, TILE);
}

function drawWalls(ctx, level) {
  for (const w of level.walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.tx * TILE, w.ty * TILE, TILE, TILE);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(w.tx * TILE, w.ty * TILE, TILE, 6);
  }
}

function drawProps(ctx, level, time) {
  for (const c of level.crates) {
    ctx.fillStyle = COLORS.crate;
    ctx.fillRect(c.x - 20, c.y - 20, 40, 40);
    ctx.fillStyle = COLORS.crateTop;
    ctx.fillRect(c.x - 20, c.y - 20, 40, 8);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x - 20, c.y - 20, 40, 40);
    ctx.beginPath();
    ctx.moveTo(c.x - 20, c.y - 20);
    ctx.lineTo(c.x + 20, c.y + 20);
    ctx.stroke();
  }
  for (const d of level.displays) {
    ctx.fillStyle = COLORS.display;
    ctx.fillRect(d.x - 21, d.y - 21, 42, 42);
    ctx.fillStyle = COLORS.displayGlass;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(d.x - 15, d.y - 15, 30, 30);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(127, 212, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(d.x - 21, d.y - 21, 42, 42);
  }
  for (const b of level.bushes) {
    ctx.fillStyle = COLORS.bush;
    ctx.beginPath();
    ctx.arc(b.x - 10, b.y + 6, 15, 0, Math.PI * 2);
    ctx.arc(b.x + 11, b.y + 8, 14, 0, Math.PI * 2);
    ctx.arc(b.x, b.y - 9, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.bushTop;
    ctx.beginPath();
    ctx.arc(b.x - 6, b.y - 6, 7, 0, Math.PI * 2);
    ctx.arc(b.x + 9, b.y - 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const spot of level.intelSpots) {
    if (spot.taken) continue;
    const pulse = 0.75 + 0.25 * Math.sin(time * 3 + spot.x);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = COLORS.intel;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // The document itself: a little white page with lines.
    ctx.fillStyle = '#fdf6d8';
    ctx.fillRect(spot.x - 7, spot.y - 9, 14, 18);
    ctx.strokeStyle = '#8a7a2a';
    ctx.lineWidth = 1;
    ctx.strokeRect(spot.x - 7, spot.y - 9, 14, 18);
    ctx.beginPath();
    ctx.moveTo(spot.x - 4, spot.y - 4);
    ctx.lineTo(spot.x + 4, spot.y - 4);
    ctx.moveTo(spot.x - 4, spot.y);
    ctx.lineTo(spot.x + 4, spot.y);
    ctx.moveTo(spot.x - 4, spot.y + 4);
    ctx.lineTo(spot.x + 1, spot.y + 4);
    ctx.stroke();
  }
  // Exit door: green, with an arrow; locked (grey) until all intel is taken.
  const exit = level.exit;
  const open = level.intelSpots.every((s) => s.taken);
  ctx.fillStyle = open ? COLORS.exit : '#4a5568';
  ctx.fillRect(exit.x - 22, exit.y - 16, 44, 32);
  ctx.fillStyle = open ? '#0b3d24' : '#d7dce8';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', exit.x, exit.y + 1);
}

function drawPlayer(ctx, player, time) {
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 10, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded burglar: cloak circle, pale face, direction nose.
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 5, player.y + Math.sin(player.facing) * 5, 6, 0, Math.PI * 2);
  ctx.fill();
  // Hidden-in-cover ring, so the player can tell they are safe.
  if (player.hidden) {
    ctx.strokeStyle = 'rgba(63, 143, 79, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawGuard(ctx, guard) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(guard.x, guard.y + 11, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guardUniform;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
  ctx.fill();
  // Helmet + face, looking where the guard faces.
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.facing) * 5, guard.y + Math.sin(guard.facing) * 5, 7, 0, Math.PI * 2);
  ctx.fill();
  // Suspicion: a ring filling up, then "!" when chasing, "?" when suspicious.
  if (guard.suspicion > 0.05 && guard.state !== GUARD_STATE.CHASE) {
    ctx.strokeStyle = guard.suspicion > 0.45 ? '#ff9632' : '#ffd65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius + 7, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
    ctx.stroke();
  }
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (guard.state === GUARD_STATE.CHASE) {
    ctx.fillStyle = '#ff3c3c';
    ctx.fillText('!', guard.x, guard.y - 28);
  } else if (guard.state === GUARD_STATE.SUSPICIOUS || guard.state === GUARD_STATE.SEARCH) {
    ctx.fillStyle = '#ffb347';
    ctx.fillText('?', guard.x, guard.y - 28);
  }
}

function drawLighting(ctx, player) {
  // Night lighting: dark everywhere except a pool of lamplight around Wren.
  const gradient = ctx.createRadialGradient(
    player.x, player.y, 90,
    player.x, player.y, 520,
  );
  gradient.addColorStop(0, 'rgba(4, 6, 18, 0)');
  gradient.addColorStop(0.55, 'rgba(4, 6, 18, 0.18)');
  gradient.addColorStop(1, 'rgba(4, 6, 18, 0.62)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawHud(ctx, game) {
  const { player, guards, time, intelTaken } = game;
  ctx.fillStyle = 'rgba(5, 8, 20, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText('INTEL  ' + intelTaken + ' / ' + INTEL_TOTAL, 14, 18);
  ctx.fillStyle = '#e8e4d8';
  ctx.fillText('PEBBLES  ' + player.pebbles, 170, 18);
  ctx.fillText('TIME  ' + formatTime(time), 300, 18);
  const anyAlert = guards.some((g) => g.state === GUARD_STATE.CHASE);
  const anyWary = guards.some((g) => g.suspicion > 0.45 && g.state !== GUARD_STATE.CHASE);
  ctx.textAlign = 'right';
  if (anyAlert) {
    ctx.fillStyle = '#ff3c3c';
    ctx.fillText('SPOTTED — RUN!', VIEW_W - 14, 18);
  } else if (anyWary) {
    ctx.fillStyle = '#ffb347';
    ctx.fillText('A guard is suspicious…', VIEW_W - 14, 18);
  } else if (intelTaken === INTEL_TOTAL) {
    ctx.fillStyle = '#39d98a';
    ctx.fillText('EXIT IS OPEN — GO!', VIEW_W - 14, 18);
  } else {
    ctx.fillStyle = '#8b93b8';
    ctx.fillText('stay out of the yellow cones', VIEW_W - 14, 18);
  }
  if (player.hidden) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7ddc8f';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText('HIDDEN IN COVER', VIEW_W / 2, VIEW_H - 16);
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 8, 20, 0.82)';
  ctx.fillRect(VIEW_W / 2 - 330, 150, 660, 420);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(VIEW_W / 2 - 330, 150, 660, 420);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(title, VIEW_W / 2, 220);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '18px Georgia, serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, 285 + i * 32);
  });
}

export function drawTitle(ctx) {
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('LANTERN HEIST', VIEW_W / 2, 180);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('A tiny stealth game — one burglar, four guards, three secrets.', VIEW_W / 2, 230);
  ctx.font = '19px Georgia, serif';
  const lines = [
    'Sneak through the Lantern Museum at night.',
    'Collect all 3 intel documents, then reach the green EXIT unseen.',
    '',
    'Guards patrol with yellow vision cones. Crouch in shrubs and',
    'behind crates and cases to hide — the cone shrinks over cover.',
    'A filling ring means a guard is getting suspicious. Break line of',
    'sight to cool down; if one catches you, the night is over.',
    '',
    'WASD / arrows — sneak    Shift — run (loud!)',
    'Space — toss a pebble to distract    Click — walk there',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 300 + i * 30));
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText('Press any key to begin', VIEW_W / 2, 640);
}

export function drawWorld(ctx, game, time) {
  const { level, player, guards } = game;
  drawFloor(ctx);
  drawWalls(ctx, level);
  drawProps(ctx, level, time);
  drawLighting(ctx, player);
  for (const guard of guards) drawCone(ctx, guard);
  drawPlayer(ctx, player, time);
  for (const guard of guards) drawGuard(ctx, guard);
  drawHud(ctx, game);
}

export function drawCaught(ctx, game) {
  drawWorld(ctx, game, game.time);
  panel(ctx, 'CAUGHT!', [
    'A guard caught Wren under the lamplight.',
    'Intel gathered: ' + game.intelTaken + ' / ' + INTEL_TOTAL,
    'Time in the museum: ' + formatTime(game.time),
    '',
    'Press R to try again — the patrols are learnable.',
  ], '#ff3c3c');
}

export function drawWin(ctx, game) {
  drawWorld(ctx, game, game.time);
  panel(ctx, 'CLEAN GETAWAY!', [
    'All 3 intel documents, and nobody saw a thing.',
    'Time: ' + formatTime(game.time) + '    Spotted: ' + game.timesSpotted + ' time' + (game.timesSpotted === 1 ? '' : 's'),
    '',
    'Wren slips out into the night. The museum never knew.',
    '',
    'Press R to run it again, faster and quieter.',
  ], '#39d98a');
}
