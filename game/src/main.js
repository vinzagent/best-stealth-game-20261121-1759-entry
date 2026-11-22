// main.js — Lantern Heist: wires input, level, player, guards, audio and
// rendering into one game loop, and owns the title / playing / caught / won
// states. Also stages fixed scenes for screenshots (?shot=1..3).

import { VIEW_W, VIEW_H, INTEL_TOTAL } from './config.js';
import { createInput } from './input.js';
import { buildLevel, tileCenter } from './level.js';
import { createPlayer, updatePlayer, intelUnderPlayer, onExitTile } from './player.js';
import { createGuards, updateGuard, distractGuards, GUARD_STATE } from './guards.js';
import { createAudio } from './audio.js';
import { drawTitle, drawWorld, drawCaught, drawWin } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shotMode = params.get('shot'); // '1' | '2' | '3' | null

const audio = createAudio();
const input = createInput(canvas);

const game = {
  state: 'title', // title | playing | caught | won
  level: null,
  player: null,
  guards: null,
  time: 0,
  intelTaken: 0,
  timesSpotted: 0,
  exitOpen: false,
};

function resetGame() {
  game.level = buildLevel();
  game.player = createPlayer(game.level.playerStart);
  game.guards = createGuards();
  game.time = 0;
  game.intelTaken = 0;
  game.timesSpotted = 0;
  game.exitOpen = false;
  game.state = 'playing';
}

// Staged scenes so screenshots show the game at its best, deterministically.
function stageShot(kind) {
  resetGame();
  if (kind === '1') {
    // Sneaking past a patrol: Wren in the middle hall, a guard's cone near.
    game.player.x = tileCenter(6.5, 6.5).x;
    game.player.y = tileCenter(6.5, 6.5).y;
    game.player.facing = 0;
    game.guards[0].x = tileCenter(9.5, 4.5).x;
    game.guards[0].y = tileCenter(9.5, 4.5).y;
    game.guards[0].facing = Math.PI;
    game.guards[0].suspicion = 0.55;
    game.guards[3].x = tileCenter(14.5, 12.5).x;
    game.guards[3].y = tileCenter(14.5, 12.5).y;
    game.guards[3].facing = Math.PI;
  } else if (kind === '2') {
    // The chase: a guard has spotted Wren near the exit with 2 intel taken.
    game.level.intelSpots[0].taken = true;
    game.level.intelSpots[1].taken = true;
    game.intelTaken = 2;
    game.player.x = tileCenter(10.5, 13.5).x;
    game.player.y = tileCenter(10.5, 13.5).y;
    game.player.facing = -Math.PI / 2;
    const chaser = game.guards[2];
    chaser.x = tileCenter(11.5, 10.5).x;
    chaser.y = tileCenter(11.5, 10.5).y;
    chaser.facing = Math.PI / 2;
    chaser.state = GUARD_STATE.CHASE;
    chaser.suspicion = 1;
    chaser.lastSeen = { x: game.player.x, y: game.player.y };
    game.timesSpotted = 1;
  }
}

resetGame();
game.state = 'title';
if (shotMode === '1' || shotMode === '2') {
  stageShot(shotMode);
} else if (shotMode === '3') {
  game.state = 'title';
}

let lastNow = performance.now();
let shotElapsed = 0;
let shotFrozen = false;

function frame(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;

  if (game.state === 'title') {
    if (input.anyKeyQueued) {
      input.anyKeyQueued = false;
      audio.unlock();
      resetGame();
    }
    drawTitle(ctx);
    requestAnimationFrame(frame);
    return;
  }

  // In screenshot mode, let the scene settle for ~1.2s, then freeze it
  // so the captured frame is stable.
  const freeze = shotMode && (shotMode === '1' || shotMode === '2') && shotFrozen;
  if (!freeze) {
    update(dt);
    if (shotMode && (shotMode === '1' || shotMode === '2')) {
      shotElapsed += dt;
      if (shotElapsed > 1.2) shotFrozen = true;
    }
  }

  if (game.state === 'playing') drawWorld(ctx, game, game.time);
  else if (game.state === 'caught') drawCaught(ctx, game);
  else if (game.state === 'won') drawWin(ctx, game);

  if (input.restartQueued) {
    input.restartQueued = false;
    audio.unlock();
    resetGame();
  }
  requestAnimationFrame(frame);
}

function update(dt) {
  if (game.state !== 'playing') return;
  game.time += dt;

  audio.unlock();
  input.anyKeyQueued = false;

  const stepped = updatePlayer(game.player, input, dt, (landing) => {
    audio.pebble();
    distractGuards(game.guards, landing);
  });
  if (stepped) {
    game.player.stepTimer = game.player.running ? 0.30 : 0.45;
    audio.footstep(game.player.running);
  }

  const events = {
    onAlert: (guard) => {
      game.timesSpotted += 1;
      audio.alert();
    },
    onCaught: () => {
      game.state = 'caught';
      audio.caught();
    },
    onGuardStep: (guard) => {
      const dist = Math.hypot(guard.x - game.player.x, guard.y - game.player.y);
      audio.guardStep(dist);
    },
  };
  for (const guard of game.guards) {
    updateGuard(guard, game.player, dt, events);
    if (game.state !== 'playing') return;
  }

  // Intel pickup.
  const spot = intelUnderPlayer(game.player, game.level.intelSpots);
  if (spot) {
    spot.taken = true;
    game.intelTaken += 1;
    audio.pickup();
    if (game.intelTaken === INTEL_TOTAL) {
      game.exitOpen = true;
      audio.unlockExit();
    }
  }

  // Exit: only open once all intel is gathered.
  if (game.exitOpen && onExitTile(game.player, game.level.exit)) {
    game.state = 'won';
    audio.win();
  }
}

requestAnimationFrame(frame);
