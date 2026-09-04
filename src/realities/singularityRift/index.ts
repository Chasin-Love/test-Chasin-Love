import { RealityConfig } from '../types';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const singularityRiftReality: RealityConfig = {
  id: 'singularity-rift',
  name: 'Singularity Rift Domain',
  codeName: 'REALITY-06 // SIG-Zeta',
  spectral: 'Kerr Black Hole Event Horizon',
  description: 'A gravitationally warped universe orbiting a supermassive rotating black hole.',
  bubblePos: [22000, -12000, -18000],
  bubbleSize: 7600,
  colorA: '#6366f1',
  colorB: '#d946ef',
  starColor: '#a5b4fc',
  bodies: [
    { id: 'sin-core', name: 'GARGANTUA RIFT', kind: 'vault', meaning: null, note: 'Supermassive rotating black hole with glowing relativistic accretion ring.', createdAt: now - 999 * day, radius: 8.0, palette: { deep: '#000000', base: '#0f172a', high: '#e2e8f0', atmo: '#818cf8', ice: '#ffffff' }, orbit: { a: 0, speed: 0, phase: 0, incl: 0 } },
    { id: 'sin-arc', name: 'Relativistic Arc', kind: 'planet', meaning: 'moment', note: 'World experiencing extreme gravitational time dilation (1 hr = 7 yrs).', createdAt: now - 870 * day, radius: 2.3, rings: true, palette: { deep: '#1e1b4b', base: '#3730a3', high: '#c7d2fe', atmo: '#6366f1', ice: '#e0e7ff' }, orbit: { a: 40, speed: TAU / 280, phase: 0.8, incl: 0.15 } },
    { id: 'sin-hawking', name: 'Hawking Cloud', kind: 'nebula', meaning: 'idea', note: 'Glowing nebula fed by quantum radiation from the horizon.', createdAt: now - 740 * day, radius: 6.5, palette: { deep: '#311042', base: '#86198f', high: '#f5d0fe', atmo: '#d946ef', ice: '#fdf4ff' }, orbit: { a: 110, speed: TAU / 2200, phase: 3.4, incl: 0.25 } },
  ],
  entries: [
    { id: 'e-sin-1', planetId: 'sin-arc', title: 'Time Dilation Horizon', body: 'Standing on the Relativistic Arc, we watched centuries pass in the outer galaxy within minutes.', tags: ['gravity', 'blackhole'], bookmarked: true, archived: false, createdAt: now - 720 * day, updatedAt: now - 720 * day, attachments: [] },
  ],
};
