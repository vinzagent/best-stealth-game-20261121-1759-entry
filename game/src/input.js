// input.js — keyboard + mouse state, nothing else.
// The game reads this each frame; no game logic lives here.

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    clickTarget: null, // {x, y} in canvas pixels, or null
    pebbleQueued: false,
    restartQueued: false,
    anyKeyQueued: false,
  };

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    input.anyKeyQueued = true;
    if (event.code === 'Space') input.pebbleQueued = true;
    if (event.code === 'KeyR') input.restartQueued = true;
    const mapped = KEYMAP[event.code];
    if (mapped) keys.add(mapped);
  });

  window.addEventListener('keyup', (event) => {
    const mapped = KEYMAP[event.code];
    if (mapped) keys.delete(mapped);
  });

  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.clickTarget = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    input.anyKeyQueued = true;
  });

  window.addEventListener('blur', () => keys.clear());

  return input;
}

// Read the current move direction from held keys. Returns {x, y} unit-ish.
export function moveDirection(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('left')) x -= 1;
  if (input.keys.has('right')) x += 1;
  if (input.keys.has('up')) y -= 1;
  if (input.keys.has('down')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}
