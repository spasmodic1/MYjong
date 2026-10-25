// Original synthesized notes; no recordings, network, or third-party music assets.
export function createAudio(settings) {
  let context, musicTimer, step = 0;
  const notes = [261.63,329.63,392,493.88,440,392,329.63,293.66,220,261.63,329.63,392,349.23,329.63,293.66,246.94];
  function ready() { context ||= new AudioContext(); if (context.state === 'suspended') context.resume(); return context; }
  function note(freq, duration = .25, level = .08, delay = 0) {
    const ctx = ready(), osc = ctx.createOscillator(), gain = ctx.createGain(), time = ctx.currentTime + delay;
    osc.type = 'sine'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(level * settings().volume, time + .03);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(gain).connect(ctx.destination); osc.start(time); osc.stop(time + duration + .1);
  }
  function sync() {
    clearInterval(musicTimer); musicTimer = null;
    if (settings().music && !document.hidden) {
      ready(); musicTimer = setInterval(() => { note(notes[step++ % notes.length], 2.2, .09); }, 1250);
    }
  }
  return { sync, play(kind) {
    if (!settings().sound) return;
    if (kind === 'win') [523.25,659.25,783.99,1046.5].forEach((f,i) => note(f,.8,.16,i*.16));
    else if (kind === 'match') { note(659.25,.25,.16); note(880,.45,.12,.12); }
    else if (kind === 'blocked') note(180,.12,.1);
    else note(440,.1,.06);
  }, pause() { clearInterval(musicTimer); musicTimer = null; context?.suspend(); } };
}
