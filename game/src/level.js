// level.js — the museum floor plan and everything that asks about it:
// which tiles are solid, which block a guard's sight, where cover is,
// where the intel and the exit sit. No drawing, no game rules.

import { TILE, COLS, ROWS } from './config.js';

// Legend:
//   # wall (solid, blocks sight)      C crate (solid, blocks sight, cover)
//   D display case (solid, blocks sight, cover)
//   B shrub (walkable, hides the player, does not block sight)
//   . polished floor                  P player start
//   I intel document                   E exit door
const MAP = [
  '########################',
  '#P....#......#....I....#',
  '#.....#..B...#....#....#',
  '#..C..#......#..C.#....#',
  '#.....#......#....#....#',
  '#..D..D......D....D....#',
  '#......................#',
  '#..C....####....C.....##',
  '#......#..#....#......I#',
  '#..B...#..#....#..B....#',
  '#......#..#....#.......#',
  '#..D...#..#....#..D....#',
  '#......................#',
  '#..C....#....#....C...I#',
  '#......#....#..........#',
  '#######E################',
];

export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

export function buildLevel() {
  if (MAP.length !== ROWS) throw new Error('map has ' + MAP.length + ' rows, expected ' + ROWS);
  for (const row of MAP) {
    if (row.length !== COLS) throw new Error('map row is ' + row.length + ' wide, expected ' + COLS);
  }

  const walls = [];
  const crates = [];
  const displays = [];
  const bushes = [];
  const intelSpots = [];
  let playerStart = null;
  let exit = null;

  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const ch = MAP[ty][tx];
      const c = tileCenter(tx, ty);
      if (ch === '#') walls.push({ tx, ty, ...c });
      else if (ch === 'C') crates.push({ tx, ty, ...c });
      else if (ch === 'D') displays.push({ tx, ty, ...c });
      else if (ch === 'B') bushes.push({ tx, ty, ...c });
      else if (ch === 'I') intelSpots.push({ tx, ty, ...c, taken: false });
      else if (ch === 'P') playerStart = { ...c };
      else if (ch === 'E') exit = { tx, ty, ...c };
    }
  }
  if (!playerStart) throw new Error('map has no player start');
  if (!exit) throw new Error('map has no exit');
  if (intelSpots.length !== 3) throw new Error('map has ' + intelSpots.length + ' intel, expected 3');

  return { walls, crates, displays, bushes, intelSpots, playerStart, exit };
}

export function tileAt(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return MAP[ty][tx];
}

// Solid to walk through: walls, crates and display cases.
export function isSolidTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const ch = MAP[ty][tx];
  return ch === '#' || ch === 'C' || ch === 'D';
}

// Blocks a guard's line of sight: the same tall things.
export function blocksSightTile(tx, ty) {
  return isSolidTile(tx, ty);
}

export function isCoverTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
  const ch = MAP[ty][tx];
  return ch === 'B' || ch === 'C' || ch === 'D';
}

// Move a circle (x, y, radius) by (dx, dy), sliding along solid tiles.
// Axis-separated so the circle never tunnels into a wall corner.
export function moveCircle(pos, radius, dx, dy) {
  const next = { x: pos.x, y: pos.y };
  next.x += dx;
  if (circleHitsSolid(next.x, next.y, radius)) next.x = pos.x;
  next.y += dy;
  if (circleHitsSolid(next.x, next.y, radius)) next.y = pos.y;
  return next;
}

function circleHitsSolid(x, y, radius) {
  const minTx = Math.floor((x - radius) / TILE);
  const maxTx = Math.floor((x + radius) / TILE);
  const minTy = Math.floor((y - radius) / TILE);
  const maxTy = Math.floor((y + radius) / TILE);
  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      if (!isSolidTile(tx, ty)) continue;
      const closestX = Math.max(tx * TILE, Math.min(x, (tx + 1) * TILE));
      const closestY = Math.max(ty * TILE, Math.min(y, (ty + 1) * TILE));
      const ddx = x - closestX;
      const ddy = y - closestY;
      if (ddx * ddx + ddy * ddy < radius * radius) return true;
    }
  }
  return false;
}

// Does a straight line between two points cross any sight-blocking tile?
// Steps along the line in small hops; cheap and good enough for cones.
export function hasLineOfSight(ax, ay, bx, by) {
  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(dist / 12));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (blocksSightTile(tx, ty)) return false;
  }
  return true;
}
