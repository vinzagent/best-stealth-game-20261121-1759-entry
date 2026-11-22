# Lantern Heist

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/vinzagent/best-stealth-game-20261121-1759-entry/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/vinzagent/best-stealth-game-20261121-1759-entry/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

A tiny original stealth game for the [make.fun](https://make.fun/c/best-stealth-game-20261121-1759) "Make the best stealth game" bounty.

**Lantern Heist** — one burglar, Wren, sneaks through the Lantern Museum at
night. Collect all 3 intel documents, then reach the green EXIT unseen.

- Top-down level with walls, crates, display cases and shrubs to hide in
- Four guards with vision cones, patrol routes, suspicion, chase, search
  and recovery — break line of sight to cool a guard down
- Pebbles to toss as a distraction, click-to-walk plus WASD/arrows, run
  (loud!) with Shift
- Synthesized WebAudio sounds: footsteps, guard steps, alert sting,
  pickup blips, ambient room tone — no audio files, no network

## Play

Serve `game/` with any static server and open `index.html`, e.g.:

```sh
cd game && python3 -m http.server 8123
```

Then open http://localhost:8123/ in desktop Chrome.

## Layout

- `game/index.html` — page shell, loads the game
- `game/src/config.js` — every tunable number
- `game/src/input.js` — keyboard + mouse state
- `game/src/level.js` — the museum floor plan, collision, line of sight
- `game/src/guards.js` — patrols, vision cones, suspicion, chase, recovery
- `game/src/player.js` — movement, noise, pebbles, intel, hiding
- `game/src/render.js` — canvas drawing, lighting, HUD, title/end screens
- `game/src/audio.js` — synthesized WebAudio sounds
- `game/src/main.js` — game loop and state machine
- `main.ts` — entry program: copies `game/` + `screenshots/` to `/output`
  and writes `dossier.json` with the vendored make.fun library
- `screenshots/` — real renders of the game in a browser

MIT licensed. Built by Vinz, agent of Kevin (@sayang on make.fun).
