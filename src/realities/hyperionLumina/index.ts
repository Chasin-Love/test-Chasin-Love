import { RealityConfig } from '../types';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const hyperionLuminaReality: RealityConfig = {
  id: 'hyperion-lumina',
  name: 'Hyperion Lumina Realm',
  codeName: 'REALITY-02 // SIG-Beta',
  spectral: 'B0V Blue Hypergiant',
  description: 'A universe illuminated by radiant sapphire stars, massive ice rings, and crystal monolith worlds.',
  bubblePos: [14000, 4000, -8000],
  bubbleSize: 7200,
  colorA: '#06b6d4',
  colorB: '#3b82f6',
  starColor: '#7dd3fc',
  bodies: [
    { id: 'hyp-star', name: 'HYPERION CORE', kind: 'star', meaning: null, note: 'Intense blue hypergiant emitting high-energy ultraviolet radiation.', createdAt: now - 900 * day, radius: 7.2, palette: { deep: '#0c4a6e', base: '#38bdf8', high: '#f0f9ff', atmo: '#bae6fd', ice: '#ffffff' }, orbit: { a: 0, speed: 0, phase: 0, incl: 0 } },
    { id: 'hyp-azurea', name: 'Azurea Prime', kind: 'planet', meaning: 'memory', note: 'Liquid methane oceans reflecting neon nebular auroras.', createdAt: now - 850 * day, radius: 2.2, clouds: true, palette: { deep: '#082f49', base: '#0284c7', high: '#7dd3fc', atmo: '#38bdf8', ice: '#e0f2fe' }, orbit: { a: 34, speed: TAU / 210, phase: 1.2, incl: 0.04 } },
    { id: 'hyp-sapphire', name: 'Sapphire Ring', kind: 'planet', meaning: 'project', note: 'Massive ring system made of luminescent frozen diamond crystals.', createdAt: now - 720 * day, radius: 3.8, rings: true, palette: { deep: '#1e3a8a', base: '#2563eb', high: '#93c5fd', atmo: '#60a5fa', ice: '#eff6ff' }, orbit: { a: 78, speed: TAU / 1100, phase: 3.5, incl: 0.08 } },
    { id: 'hyp-monolith', name: 'Lumina Monolith', kind: 'vault', meaning: null, note: 'Ancient crystalline vault recording photon signatures.', createdAt: now - 600 * day, radius: 2.4, palette: { deep: '#0f172a', base: '#334155', high: '#cbd5e1', atmo: '#94a3b8', ice: '#f8fafc' }, orbit: { a: 140, speed: TAU / 4200, phase: 0.9, incl: 0.15 } },
  ],
  entries: [
    { id: 'e-hyp-1', planetId: 'hyp-azurea', title: 'The Sapphire Tide', body: 'The methane seas reflected the hypergiant star in shades of pure cyan. Every wave carried whispers of parallel timelines.', tags: ['sapphire', 'cyan'], bookmarked: true, archived: false, createdAt: now - 700 * day, updatedAt: now - 700 * day, attachments: [] },
  ],
};
