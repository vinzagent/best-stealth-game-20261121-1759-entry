// guards.js — museum guards: patrol routes, vision cones, suspicion,
// chase, search, and recovery back to patrol. This is the stealth core.

import {
  GUARD_SPEED, GUARD_CHASE_SPEED, GUARD_RADIUS,
  CONE_RANGE, CONE_HALF_ANGLE, CONE_RANGE_IN_COVER,
  DETECT_RATE, DETECT_RATE_COVER, DETECT_DECAY,
  LOSE_SIGHT_SECONDS, SEARCH_SECONDS, PEBBLE_NOISE_RADIUS,
} from './config.js';
import { moveCircle, hasLineOfSight, tileCenter } from './level.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious', // heard something, walking to look
  CHASE: 'chase', // sees the player, running them down
  SEARCH: 'search', // lost the player, checking the last seen spot
};

// Four patrol routes, in tile coordinates: [tx, ty] waypoints.
const ROUTES = [
  [[3.5, 1.5], [10.5, 1.5], [10.5, 5.5], [3.5, 5.5]], // north-west hall
  [[17.5, 1.5], [21.5, 1.5], [21.5, 5.5], [17.5, 5.5]], // north-east hall
  [[11.5, 7.5], [11.5, 13.5]], // central corridor, up and down
  [[2.5, 12.5], [21.5, 12.5]], // long south hall, past the exit approach
];

export function createGuards() {
  return ROUTES.map((route, i) => {
    const points = route.map(([tx, ty]) => tileCenter(tx, ty));
    return {
      id: i,
      x: points[0].x,
      y: points[0].y,
      radius: GUARD_RADIUS,
      facing: 0,
      route: points,
      waypoint: 1,
      state: GUARD_STATE.PATROL,
      suspicion: 0, // 0 calm .. 1 fully alerted
      blindTimer: 0, // how long the player has been out of sight while chasing
      searchTimer: 0,
      investigate: null, // {x, y} a noise to walk toward
      lastSeen: null, // {x, y} where the player was last spotted
      stepTimer: Math.random() * 0.4,
      paused: 0, // seconds to stand still at a waypoint, looking around
      lookTimer: 0,
    };
  });
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Can this guard see the player right now?
export function guardSeesPlayer(guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = player.hidden ? CONE_RANGE_IN_COVER : CONE_RANGE;
  if (dist > range) return false;
  const angleToPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(angleToPlayer, guard.facing)) > CONE_HALF_ANGLE) return false;
  if (!hasLineOfSight(guard.x, guard.y, player.x, player.y)) return false;
  return true;
}

// A guard hears the player when the player's noise reaches them.
export function guardHearsPlayer(guard, player) {
  if (player.noiseRadius <= 0) return false;
  return Math.hypot(player.x - guard.x, player.y - guard.y) <= player.noiseRadius;
}

function walkToward(guard, target, speed, dt) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true; // arrived
  const step = Math.min(dist, speed * dt);
  const nx = (dx / dist) * step;
  const ny = (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  const moved = moveCircle(guard, guard.radius, nx, ny);
  guard.x = moved.x;
  guard.y = moved.y;
  return false;
}

export function updateGuard(guard, player, dt, events) {
  const sees = guardSeesPlayer(guard, player);
  const hears = guardHearsPlayer(guard, player);

  // Suspicion grows in view (slower when the player hides in cover),
  // and drains when the player is out of sight.
  if (sees) {
    const rate = player.hidden ? DETECT_RATE_COVER : DETECT_RATE;
    // Closer is scarier: up to double rate point-blank.
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    const closeness = 1 + (1 - dist / CONE_RANGE);
    guard.suspicion = Math.min(1, guard.suspicion + rate * closeness * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.blindTimer = 0;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - DETECT_DECAY * dt);
    guard.blindTimer += dt;
  }

  // A noise the guard hears becomes a place to investigate.
  if (hears && guard.state === GUARD_STATE.PATROL) {
    guard.investigate = { x: player.x, y: player.y };
    guard.state = GUARD_STATE.SUSPICIOUS;
  }

  // Full suspicion trips the chase.
  if (guard.suspicion >= 1 && guard.state !== GUARD_STATE.CHASE) {
    guard.state = GUARD_STATE.CHASE;
    guard.blindTimer = 0;
    events.onAlert(guard);
  }

  switch (guard.state) {
    case GUARD_STATE.PATROL: {
      if (guard.paused > 0) {
        guard.paused -= dt;
        guard.lookTimer += dt;
        // Look around while paused at a waypoint: sweep the cone.
        guard.facing += Math.sin(guard.lookTimer * 1.6) * 0.9 * dt;
        break;
      }
      const target = guard.route[guard.waypoint];
      if (walkToward(guard, target, GUARD_SPEED, dt)) {
        guard.waypoint = (guard.waypoint + 1) % guard.route.length;
        guard.paused = 1.2; // pause and look around at each waypoint
        guard.lookTimer = 0;
      }
      break;
    }
    case GUARD_STATE.SUSPICIOUS: {
      const target = guard.investigate || guard.lastSeen;
      if (!target) { guard.state = GUARD_STATE.PATROL; break; }
      if (walkToward(guard, target, GUARD_SPEED * 1.25, dt)) {
        guard.investigate = null;
        guard.state = GUARD_STATE.PATROL;
        guard.paused = 1.5;
      }
      break;
    }
    case GUARD_STATE.CHASE: {
      if (sees && guard.lastSeen) {
        walkToward(guard, guard.lastSeen, GUARD_CHASE_SPEED, dt);
      } else if (guard.blindTimer > LOSE_SIGHT_SECONDS) {
        // Lost them: go search the last seen spot, then recover.
        guard.state = GUARD_STATE.SEARCH;
        guard.searchTimer = SEARCH_SECONDS;
      } else if (guard.lastSeen) {
        walkToward(guard, guard.lastSeen, GUARD_CHASE_SPEED, dt);
      }
      // Caught! The guard is on top of the player.
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < guard.radius + player.radius + 2) {
        events.onCaught(guard);
      }
      break;
    }
    case GUARD_STATE.SEARCH: {
      guard.searchTimer -= dt;
      if (guard.lastSeen) {
        const arrived = walkToward(guard, guard.lastSeen, GUARD_SPEED * 1.2, dt);
        if (arrived) guard.facing += dt * 2.2; // scan the room
      }
      if (guard.searchTimer <= 0) {
        guard.state = GUARD_STATE.PATROL;
        guard.suspicion = 0.35; // still wary, but back on patrol
        guard.paused = 1.0;
      }
      break;
    }
    default:
      break;
  }

  // Footstep timing for the guard's own audible steps.
  const moving = guard.state !== GUARD_STATE.PATROL || guard.paused <= 0;
  if (moving) {
    guard.stepTimer -= dt;
    if (guard.stepTimer <= 0) {
      guard.stepTimer = guard.state === GUARD_STATE.CHASE ? 0.32 : 0.55;
      events.onGuardStep(guard);
    }
  }
  return guard;
}

// A thrown pebble lands: every guard in earshot investigates the spot.
export function distractGuards(guards, landing) {
  for (const guard of guards) {
    const dist = Math.hypot(landing.x - guard.x, landing.y - guard.y);
    if (dist <= PEBBLE_NOISE_RADIUS && guard.state !== GUARD_STATE.CHASE) {
      guard.investigate = { x: landing.x, y: landing.y };
      guard.state = GUARD_STATE.SUSPICIOUS;
      guard.suspicion = Math.max(guard.suspicion, 0.45);
    }
  }
}
