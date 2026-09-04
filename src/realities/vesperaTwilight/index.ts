import { RealityConfig } from '../types';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const vesperaTwilightReality: RealityConfig = {
  id: 'vespera-twilight',
  name: 'Vespera Twilight Realm',
  codeName: 'REALITY-05 // SIG-Epsilon',
  spectral: 'Violet Pulsing Subdwarf',
  description: 'A quiet, perpetual twilight universe bathed in deep violet auroras and silver moons.',
  bubblePos: [-12000, 16000, -14000],
  bubbleSize: 7000,
  colorA: '#a855f7',
  colorB: '#ec4899',
  starColor: '#c084fc',
  bodies: [
    { id: 'ves-star', name: 'VESPERA CORE', kind: 'star', meaning: null, note: 'Pulsing violet subdwarf surrounded by dark nebula dust.', createdAt: now - 920 * day, radius: 6.0, palette: { deep: '#3b0764', base: '#9333ea', high: '#f3e8ff', atmo: '#c084fc', ice: '#ffffff' }, orbit: { a: 0, speed: 0, phase: 0, incl: 0 } },
    { id: 'ves-bloom', name: 'Twilight Bloom', kind: 'planet', meaning: 'dream', note: 'Bioluminescent flora flourishing under perpetual dusk light.', createdAt: now - 830 * day, radius: 2.1, clouds: true, palette: { deep: '#4a044e', base: '#c026d3', high: '#fae8ff', atmo: '#e879f9', ice: '#fdf4ff' }, orbit: { a: 32, speed: TAU / 240, phase: 1.8, incl: 0.03 } },
    { id: 'ves-nocturne', name: 'Nocturne', kind: 'planet', meaning: 'person', note: 'Silver ice ocean world reflecting perpetual violet halos.', createdAt: now - 700 * day, radius: 1.9, palette: { deep: '#1e1b4b', base: '#4338ca', high: '#e0e7ff', atmo: '#818cf8', ice: '#eef2ff' }, orbit: { a: 70, speed: TAU / 920, phase: 4.0, incl: 0.07 } },
    { id: 'ves-archive', name: 'Shadow Archive', kind: 'vault', meaning: null, note: 'Vault hidden inside a dark icy moon.', createdAt: now - 520 * day, radius: 2.2, palette: { deep: '#2e1065', base: '#6b21a8', high: '#e9d5ff', atmo: '#a855f7', ice: '#faf5ff' }, orbit: { a: 130, speed: TAU / 3900, phase: 2.5, incl: 0.12 } },
  ],
  entries: [
    { id: 'e-ves-1', planetId: 'ves-bloom', title: 'Song of the Twilight Flora', body: 'The purple petals glowed brightly as the moon rose over the silver tides.', tags: ['twilight', 'violet'], bookmarked: true, archived: false, createdAt: now - 680 * day, updatedAt: now - 680 * day, attachments: [] },
  ],
};
