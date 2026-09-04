/* procedural spatial audio — ambient drones per mode + tiny interaction SFX */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = localStorage.getItem('my-universe:muted') === '1';
let droneNodes: AudioNode[] = [];
let mode: 'space' | 'diary' | 'vault' | 'core' = 'space';
let rec: MediaRecorder | null = null;
let recChunks: Blob[] = [];
let recStream: MediaStream | null = null;

let userInteracted = false;

function ensure(createIfMissing = true): AudioContext | null {
  try {
    if (!ctx && createIfMissing && userInteracted) {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.55;
      master.connect(ctx.destination);
    }
    if (ctx && ctx.state === 'suspended' && userInteracted) {
      void ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
}

/* create/resume the audio context on the first user gesture */
export function initAudio() {
  userInteracted = true;
  ensure(true);
  setAudioMode(mode);
}

export function isMuted() { return muted; }
export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem('my-universe:muted', muted ? '1' : '0');
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.2);
  return muted;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

export function chime(base = 660) { tone(base, 0.5, 'sine', 0.12); tone(base * 1.5, 0.6, 'sine', 0.06, 0.06); }
export function sfxTick() { tone(1240, 0.06, 'triangle', 0.05); }
export function sfxPage() { tone(320, 0.18, 'sine', 0.06); tone(240, 0.22, 'sine', 0.04, 0.05); }
export function sfxConnect() { tone(520, 0.3, 'sine', 0.07); tone(780, 0.35, 'sine', 0.05, 0.1); }
export function sfxPortal() { tone(90, 1.2, 'sawtooth', 0.05); tone(180, 1.0, 'sine', 0.06, 0.15); }

/* ------------------------------ ambience ------------------------------- */

function killDrone() {
  droneNodes.forEach((n) => { try { (n as OscillatorNode).stop?.(); } catch { /* */ } try { n.disconnect(); } catch { /* */ } });
  droneNodes = [];
}

export function setAudioMode(m: 'space' | 'diary' | 'vault' | 'core') {
  mode = m;
  const c = ensure();
  if (!c || !master) return;
  const dest: AudioNode = master;
  killDrone();
  const mk = (freq: number, vol: number, type: OscillatorType, lfoRate = 0.07) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = 0;
    g.gain.setTargetAtTime(vol, c.currentTime, 1.4);
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = lfoRate;
    lg.gain.value = vol * 0.5;
    lfo.connect(lg).connect(g.gain);
    o.connect(g).connect(dest);
    o.start(); lfo.start();
    droneNodes.push(o, g, lfo, lg);
  };
  if (m === 'space') { mk(46, 0.035, 'sine'); mk(69.3, 0.02, 'sine', 0.05); mk(92.5, 0.012, 'triangle', 0.09); }
  if (m === 'diary') { mk(110, 0.022, 'sine'); mk(165, 0.014, 'sine', 0.06); mk(220.5, 0.008, 'sine', 0.11); }
  if (m === 'vault') { mk(55, 0.03, 'sine'); mk(82.4, 0.018, 'triangle', 0.05); mk(58.3, 0.02, 'sine', 0.035); }
  if (m === 'core') { mk(41.2, 0.04, 'sine'); mk(61.7, 0.022, 'sine', 0.045); mk(123.5, 0.01, 'triangle', 0.08); }
}

/* ------------------------------ recording ------------------------------ */

export async function startRecording(): Promise<boolean> {
  const c = ensure();
  if (!c) return false;
  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    rec = new MediaRecorder(recStream);
    recChunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
    rec.start();
    return true;
  } catch {
    return false;
  }
}

export function stopRecording(): Promise<{ dataUrl: string; peaks: number[]; duration: number } | null> {
  return new Promise((resolve) => {
    if (!rec || !recStream) { resolve(null); return; }
    const started = performance.now();
    rec.onstop = () => {
      const blob = new Blob(recChunks, { type: rec!.mimeType || 'audio/webm' });
      const dur = (performance.now() - started) / 1000;
      recStream!.getTracks().forEach((t) => t.stop());
      recStream = null; rec = null;
      const r = new FileReader();
      r.onload = () => resolve({ dataUrl: r.result as string, peaks: fakePeaks(blob.size), duration: dur });
      r.readAsDataURL(blob);
    };
    rec.stop();
  });
}

function fakePeaks(size: number): number[] {
  const n = 42;
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(0.25 + 0.75 * Math.abs(Math.sin(i * 0.9 + size * 0.00001)) * (0.4 + 0.6 * Math.sin(i * 0.23 + 2)));
  return out;
}

export function getMode() { return mode; }
