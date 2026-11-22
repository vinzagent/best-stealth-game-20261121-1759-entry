// audio.js — every sound is synthesized with WebAudio. No audio files,
// no network: oscillators and filtered noise, started after first input.

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    ambientOn: false,
    muted: false,
  };

  function ensureContext() {
    if (audio.ctx) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
      return true;
    } catch (err) {
      return false;
    }
  }

  // Call from any key/click handler: browsers need a gesture to start audio.
  audio.unlock = function unlock() {
    if (!ensureContext()) return;
    if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
    startAmbient();
  };

  function startAmbient() {
    if (audio.ambientOn || !audio.ctx) return;
    audio.ambientOn = true;
    // A low, slow-breathing room tone: two detuned sines through a lowpass.
    const oscA = audio.ctx.createOscillator();
    const oscB = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    const filter = audio.ctx.createBiquadFilter();
    oscA.type = 'sine';
    oscB.type = 'sine';
    oscA.frequency.value = 55;
    oscB.frequency.value = 55.7;
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    gain.gain.value = 0.05;
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    oscA.start();
    oscB.start();
    // Slow swell so the room feels alive, not flat.
    const lfo = audio.ctx.createOscillator();
    const lfoGain = audio.ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime + when;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (!audio.ctx || audio.muted) return;
    const len = Math.max(1, Math.floor(audio.ctx.sampleRate * dur));
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = audio.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start();
  }

  // Soft tap for the player's own steps; louder + lower when running.
  audio.footstep = function footstep(running) {
    noiseBurst(0.07, running ? 0.16 : 0.08, running ? 700 : 420);
  };

  // A guard's step, quieter the farther away they are.
  audio.guardStep = function guardStep(distance) {
    const vol = Math.max(0.02, 0.22 * (1 - distance / 520));
    noiseBurst(0.09, vol, 300);
  };

  // Two-note alarm sting when a guard spots the player.
  audio.alert = function alert() {
    tone(392, 0.16, 'square', 0.12);
    tone(311, 0.28, 'square', 0.12, 0.14);
  };

  // Bright blip when an intel document is collected.
  audio.pickup = function pickup() {
    tone(880, 0.1, 'sine', 0.16);
    tone(1318, 0.18, 'sine', 0.14, 0.08);
  };

  // The exit unlocking once all intel is gathered.
  audio.unlockExit = function unlockExit() {
    tone(523, 0.12, 'triangle', 0.16);
    tone(659, 0.12, 'triangle', 0.16, 0.1);
    tone(784, 0.24, 'triangle', 0.16, 0.2);
  };

  // A pebble clattering on the floor.
  audio.pebble = function pebble() {
    noiseBurst(0.12, 0.2, 1800);
    tone(1900, 0.05, 'sine', 0.05, 0.02);
  };

  // Low thud when caught.
  audio.caught = function caught() {
    tone(110, 0.4, 'sawtooth', 0.2);
    tone(82, 0.5, 'sawtooth', 0.18, 0.12);
  };

  // Little win arpeggio.
  audio.win = function win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.11));
  };

  return audio;
}
