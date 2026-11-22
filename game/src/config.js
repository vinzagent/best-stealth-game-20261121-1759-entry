// config.js — every tunable number for Lantern Heist lives here, in one place.

export const TILE = 48;
export const COLS = 24;
export const ROWS = 16;
export const VIEW_W = COLS * TILE; // 1152
export const VIEW_H = ROWS * TILE; // 768

export const PLAYER_SPEED = 150; // px per second, sneaking
export const PLAYER_RUN_SPEED = 235; // px per second, running (loud)
export const PLAYER_RADIUS = 13;

export const GUARD_SPEED = 88; // patrol
export const GUARD_CHASE_SPEED = 168; // chasing
export const GUARD_RADIUS = 14;

export const CONE_RANGE = 225; // how far a guard can see, px
export const CONE_HALF_ANGLE = 0.61; // radians, ~35 degrees each side
export const CONE_RANGE_IN_COVER = 110; // a hiding player is much harder to spot

export const DETECT_RATE = 1.15; // suspicion gained per second, fully in view
export const DETECT_RATE_COVER = 0.28; // suspicion gained while crouched in cover
export const DETECT_DECAY = 0.45; // suspicion lost per second while unseen
export const LOSE_SIGHT_SECONDS = 2.5; // chase gives up after this long blind
export const SEARCH_SECONDS = 3.0; // guard searches the last seen spot this long

export const NOISE_RUN_RADIUS = 190; // running is heard this far away
export const NOISE_WALK_RADIUS = 55;
export const PEBBLE_COUNT = 3;
export const PEBBLE_NOISE_RADIUS = 230;
export const PEBBLE_THROW_RANGE = 260;

export const INTEL_TOTAL = 3;

export const COLORS = {
  floorA: '#1b2036',
  floorB: '#181d31',
  wall: '#3a4266',
  wallTop: '#565f8f',
  crate: '#7a5a34',
  crateTop: '#9c7648',
  bush: '#2e6b3a',
  bushTop: '#3f8f4f',
  display: '#274b63',
  displayGlass: '#7fd4ff',
  intel: '#ffd94d',
  exit: '#39d98a',
  player: '#e8e4d8',
  playerCloak: '#5b4a8a',
  guard: '#d84a4a',
  guardUniform: '#7a2e2e',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneSuspicious: 'rgba(255, 150, 40, 0.30)',
  coneAlert: 'rgba(255, 60, 60, 0.34)',
};
