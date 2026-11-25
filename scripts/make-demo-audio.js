// Generates short instrumental demo tracks (WAV) for the preview sample players.
// Run: node scripts/make-demo-audio.js   → writes public/demo/*.wav
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '..', 'public', 'demo');
fs.mkdirSync(OUT, { recursive: true });

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz

// Soft "electric piano" voice: a few harmonics with exponential decay
function pluck(buf, start, freq, dur, vol) {
  const s0 = Math.floor(start * RATE);
  const len = Math.floor(dur * RATE);
  for (let i = 0; i < len && s0 + i < buf.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.01) * Math.exp(-t * 2.2);
    const v = Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(4 * Math.PI * freq * t) + 0.12 * Math.sin(6 * Math.PI * freq * t);
    buf[s0 + i] += v * env * vol;
  }
}

function track({ name, root, bpm, prog, melody, bars = 8 }) {
  const beat = 60 / bpm;
  const seconds = bars * 4 * beat + 2;
  const buf = new Float32Array(Math.ceil(seconds * RATE));
  for (let bar = 0; bar < bars; bar++) {
    const chord = prog[bar % prog.length].map((x) => root + x);
    const t0 = bar * 4 * beat;
    // pad chord + arpeggio
    chord.forEach((n) => pluck(buf, t0, NOTE(n - 12), 4 * beat, 0.10));
    for (let b = 0; b < 8; b++) pluck(buf, t0 + b * beat / 2, NOTE(chord[b % chord.length]), beat, 0.07);
    // bass
    pluck(buf, t0, NOTE(chord[0] - 24), 2 * beat, 0.22);
    pluck(buf, t0 + 2 * beat, NOTE(chord[0] - 24), 2 * beat, 0.18);
    // melody
    const mel = melody[bar % melody.length];
    mel.forEach(([offset, step, len]) => pluck(buf, t0 + offset * beat, NOTE(root + 12 + step), len * beat, 0.16));
  }
  // fade out + normalise
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
  const fade = 2 * RATE;
  const pcm = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    let v = (buf[i] / peak) * 0.85;
    if (i > buf.length - fade) v *= (buf.length - i) / fade;
    pcm.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([header, pcm]));
  console.log('wrote', name, Math.round(seconds) + 's');
}

const I = [0, 4, 7], V = [7, 11, 14], vi = [9, 12, 16], IV = [5, 9, 12], ii = [2, 5, 9], iii = [4, 7, 11];

track({ name: 'romantic.wav', root: 60, bpm: 76, prog: [I, V, vi, IV],
  melody: [[[0, 4, 1], [1, 7, 1], [2, 9, 2]], [[0, 7, 1.5], [1.5, 11, 0.5], [2, 14, 2]], [[0, 12, 1], [1, 9, 1], [2, 7, 2]], [[0, 5, 1], [1, 4, 1], [2, 2, 2]]] });
track({ name: 'emotional.wav', root: 57, bpm: 68, prog: [vi, IV, I, V],
  melody: [[[0, 9, 2], [2, 12, 2]], [[0, 9, 1], [1, 7, 1], [2, 5, 2]], [[0, 4, 1], [1, 7, 1], [2, 12, 2]], [[0, 11, 3]]] });
track({ name: 'happy.wav', root: 62, bpm: 104, prog: [I, IV, V, IV],
  melody: [[[0, 0, 0.5], [0.5, 4, 0.5], [1, 7, 1], [2, 9, 0.5], [2.5, 7, 1.5]], [[0, 9, 1], [1, 12, 1], [2, 9, 2]], [[0, 11, 0.5], [0.5, 9, 0.5], [1, 7, 1], [2, 14, 2]], [[0, 12, 1], [1, 9, 1], [2, 7, 2]]] });
track({ name: 'sufi.wav', root: 59, bpm: 84, prog: [vi, iii, IV, ii],
  melody: [[[0, 9, 1], [1, 11, 0.5], [1.5, 12, 0.5], [2, 11, 2]], [[0, 7, 2], [2, 4, 2]], [[0, 5, 1], [1, 9, 1], [2, 12, 2]], [[0, 14, 1], [1, 12, 1], [2, 9, 2]]] });
