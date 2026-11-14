/**
 * An original, sparse Dorian miniature for plucked strings and a breathy flute.
 * Made for this site; it is an instrumental impression, not an archival recording.
 * No downloads, microphone, samples, paid service, or continuous traffic ambience.
 */
export function createQuietScore() {
  let context, master, dry, reverberant, filter, compressor, reverb;
  let timer, suspendTimer, running = false, disposed = false, generation = 0;
  let volume = .4, nextBeat = 0, beat = 0;
  const voices = new Set(), strings = new Map();
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
  // Four unhurried eight-beat phrases, D Dorian without a strong leading tone.
  const phrases = [
    { bass: 50, notes: [62, 69, 65, 64, 62, 60, 57, 60] },
    { bass: 48, notes: [64, 67, 69, 67, 64, 62, 60, 57] },
    { bass: 53, notes: [65, 69, 72, 69, 67, 65, 64, 62] },
    { bass: 50, notes: [64, 62, 60, 57, 60, 62, 57, 62] },
  ];

  function buildRoom() {
    const duration = 2.9, length = Math.ceil(context.sampleRate * duration);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      let seed = 9127 + channel * 761, smoothed = 0;
      for (let i = 0; i < length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const noise = (seed / 4294967296) * 2 - 1;
        smoothed = smoothed * .66 + noise * .34;
        const t = i / context.sampleRate;
        data[i] = smoothed * Math.min(1, t / .018) * Math.exp(-t * 2.1) * .75;
      }
    }
    return impulse;
  }

  function initialise() {
    if (context) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('Este navegador não disponibiliza o som ambiente.');
    context = new AudioContext({ latencyHint: 'playback' });
    master = context.createGain();
    master.gain.value = 0;
    filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3400;
    filter.Q.value = .45;
    compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 20;
    compressor.ratio.value = 3;
    compressor.attack.value = .035;
    compressor.release.value = .5;
    dry = context.createGain();
    dry.gain.value = .78;
    reverberant = context.createGain();
    reverberant.gain.value = .24;
    reverb = context.createConvolver();
    reverb.buffer = buildRoom();
    dry.connect(filter);
    reverb.connect(reverberant);
    reverberant.connect(filter);
    filter.connect(compressor);
    compressor.connect(master);
    master.connect(context.destination);
  }

  function stringBuffer(midi) {
    if (strings.has(midi)) return strings.get(midi);
    const duration = 5.2, count = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, count, context.sampleRate);
    const data = buffer.getChannelData(0), f = frequency(midi);
    for (let i = 0; i < count; i++) {
      const t = i / context.sampleRate;
      // The slight inharmonicity and progressively shorter upper partials give
      // a round plucked body instead of a sustained electronic oscillator.
      const attack = Math.min(1, t / .012);
      const fundamental = Math.sin(Math.PI * 2 * f * t) * Math.exp(-t * 1.15);
      const upper = .24 * Math.sin(Math.PI * 2 * f * 2.001 * t) * Math.exp(-t * 2.8)
        + .105 * Math.sin(Math.PI * 2 * f * 3.006 * t) * Math.exp(-t * 4.2)
        + .035 * Math.sin(Math.PI * 2 * f * 4.014 * t) * Math.exp(-t * 5.7);
      data[i] = (fundamental + upper) * attack * .36 * Math.min(1, (duration - t) / .2);
    }
    strings.set(midi, buffer);
    return buffer;
  }

  function retain(source, nodes) {
    const voice = { source, nodes };
    voices.add(voice);
    source.onended = () => {
      voices.delete(voice);
      for (const node of nodes) { try { node.disconnect(); } catch {} }
      try { source.disconnect(); } catch {}
    };
    return source;
  }

  function pluck(midi, time, velocity = .55, side = 0) {
    const source = context.createBufferSource(), envelope = context.createGain();
    const pan = context.createStereoPanner();
    source.buffer = stringBuffer(midi);
    envelope.gain.value = velocity;
    pan.pan.value = side;
    source.connect(envelope);
    envelope.connect(pan);
    pan.connect(dry);
    pan.connect(reverb);
    retain(source, [envelope, pan]).start(time);
  }

  function flute(midi, time) {
    const tone = context.createOscillator(), envelope = context.createGain();
    const pan = context.createStereoPanner();
    const real = new Float32Array(9), imaginary = new Float32Array(9);
    imaginary[1] = 1; imaginary[2] = .08; imaginary[3] = .11; imaginary[5] = .015;
    tone.setPeriodicWave(context.createPeriodicWave(real, imaginary));
    tone.frequency.value = frequency(midi);
    pan.pan.value = .12;
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(.022, time + .72);
    envelope.gain.setTargetAtTime(.012, time + 1.3, .4);
    envelope.gain.linearRampToValueAtTime(0, time + 3.9);
    tone.connect(envelope); envelope.connect(pan); pan.connect(dry); pan.connect(reverb);
    retain(tone, [envelope, pan]);
    tone.start(time); tone.stop(time + 4.05);
  }

  function scheduleBeat(index, time) {
    const phrase = phrases[Math.floor(index / 8) % phrases.length], position = index % 8;
    const note = phrase.notes[position];
    pluck(note, time, position % 2 ? .42 : .54, position % 2 ? .25 : -.24);
    if (position === 0 || position === 4) {
      pluck(phrase.bass, time + .06, .34, -.10);
      pluck(phrase.bass + 7, time + .48, .24, .18);
    }
    if (position === 2 || position === 6) pluck(note + 7, time + .72, .23, .32);
    // A short, soft flute answer leaves silence between phrases.
    if (position === 1 || position === 5) flute(note + 12, time + .14);
  }

  function schedule() {
    if (!running || disposed || context?.state !== 'running') return;
    // Do not catch up dozens of notes when a browser tab has slept.
    if (nextBeat < context.currentTime - .2) nextBeat = context.currentTime + .1;
    while (nextBeat < context.currentTime + .35) {
      scheduleBeat(beat++, nextBeat);
      nextBeat += 1.8;
    }
  }

  function stopVoices() {
    for (const voice of [...voices]) {
      try { voice.source.stop(); } catch {}
      for (const node of voice.nodes) { try { node.disconnect(); } catch {} }
      try { voice.source.disconnect(); } catch {}
    }
    voices.clear();
  }

  return {
    async start() {
      if (disposed) return false;
      initialise();
      clearTimeout(suspendTimer);
      const token = ++generation;
      await context.resume();
      if (disposed || token !== generation) return false;
      if (running) return true;
      running = true;
      nextBeat = context.currentTime + .12;
      beat = 0;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(volume * .8, context.currentTime, .45);
      schedule();
      timer = setInterval(schedule, 120);
      return true;
    },
    stop() {
      running = false;
      const token = ++generation;
      clearInterval(timer); clearTimeout(suspendTimer);
      if (!context || context.state === 'closed') return;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0, context.currentTime, .16);
      suspendTimer = setTimeout(() => {
        if (token !== generation || disposed) return;
        stopVoices();
        context.suspend().catch(() => {});
      }, 1000);
    },
    setVolume(next) {
      volume = clamp(next);
      if (context && running) {
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.setTargetAtTime(volume * .8, context.currentTime, .25);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true; running = false; ++generation;
      clearInterval(timer); clearTimeout(suspendTimer);
      stopVoices(); strings.clear();
      if (context && context.state !== 'closed') context.close().catch(() => {});
    },
  };
}

export default createQuietScore;
