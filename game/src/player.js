// player.js — the burglar Wren: movement, noise, pebbles, intel, hiding.

import {
  PLAYER_SPEED, PLAYER_RUN_SPEED, PLAYER_RADIUS, TILE,
  NOISE_RUN_RADIUS, NOISE_WALK_RADIUS,
  PEBBLE_COUNT, PEBBLE_THROW_RANGE,
} from './config.js';
import { moveCircle, tileAt, isCoverTile } from './level.js';
import { moveDirection } from './input.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: PLAYER_RADIUS,
    facing: 0, // radians, direction the player last moved
    moving: false,
    running: false,
    noiseRadius: 0,
    pebbles: PEBBLE_COUNT,
    intel: 0,
    hidden: false, // crouched in cover this frame
    stepTimer: 0, // time until the next footstep sound
  };
}

export function updatePlayer(player, input, dt, onPebble) {
  const dir = moveDirection(input);
  let tx = 0;
  let ty = 0;

  if (dir.x !== 0 || dir.y !== 0) {
    tx = dir.x;
    ty = dir.y;
  } else if (input.clickTarget) {
    // Click-to-walk: steer toward the clicked point until close or blocked.
    const dx = input.clickTarget.x - player.x;
    const dy = input.clickTarget.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      input.clickTarget = null;
    } else {
      tx = dx / dist;
      ty = dy / dist;
    }
  }

  player.moving = tx !== 0 || ty !== 0;
  player.running = player.moving && input.keys.has('run');
  const speed = player.running ? PLAYER_RUN_SPEED : PLAYER_SPEED;

  if (player.moving) {
    player.facing = Math.atan2(ty, tx);
    const moved = moveCircle(player, player.radius, tx * speed * dt, ty * speed * dt);
    // Click-to-walk stops when a wall blocks all progress.
    if (input.clickTarget && moved.x === player.x && moved.y === player.y) input.clickTarget = null;
    player.x = moved.x;
    player.y = moved.y;
    player.noiseRadius = player.running ? NOISE_RUN_RADIUS : NOISE_WALK_RADIUS;
    player.stepTimer -= dt;
  } else {
    player.noiseRadius = 0;
    player.stepTimer = 0.12;
  }

  // Hiding: standing on a shrub, or pressed against a crate / display case.
  const txTile = Math.floor(player.x / TILE);
  const tyTile = Math.floor(player.y / TILE);
  player.hidden = isCoverTile(txTile, tyTile);

  // Pebble: thrown toward where the player faces, up to its range.
  if (input.pebbleQueued) {
    input.pebbleQueued = false;
    if (player.pebbles > 0) {
      player.pebbles -= 1;
      const range = PEBBLE_THROW_RANGE;
      const lx = player.x + Math.cos(player.facing) * range;
      const ly = player.y + Math.sin(player.facing) * range;
      onPebble({ x: lx, y: ly });
    }
  }

  return player.stepTimer <= 0 && player.moving;
}

// Is the player standing on an intel document? Returns the spot or null.
export function intelUnderPlayer(player, intelSpots) {
  for (const spot of intelSpots) {
    if (spot.taken) continue;
    if (Math.hypot(spot.x - player.x, spot.y - player.y) < 34) return spot;
  }
  return null;
}

// Is the player standing on the exit tile?
export function onExitTile(player, exit) {
  return Math.hypot(exit.x - player.x, exit.y - player.y) < 34;
}
