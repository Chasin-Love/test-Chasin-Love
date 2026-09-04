import { RealityConfig } from '../types';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const ignisEmberReality: RealityConfig = {
  id: 'ignis-ember',
  name: 'Ignis Ember Realm',
  codeName: 'REALITY-03 // SIG-Gamma',
  spectral: 'M-Class Red Dwarf Binary',
  description: 'A scorching volcanic cosmos born of twin crimson suns, magma oceans, and obsidian spires.',
  bubblePos: [-18000, -6000, 12000],
  bubbleSize: 6800,
  colorA: '#ef4444',
  colorB: '#f97316',
  starColor: '#f87171',
  bodies: [
    { id: 'ign-star', name: 'VULKAN CORE', kind: 'star', meaning: null, note: 'Twin flare stars locked in a perpetual fiery dance.', createdAt: now - 950 * day, radius: 6.5, palette: { deep: '#450a0a', base: '#dc2626', high: '#fca5a5', atmo: '#f87171', ice: '#fff1f2' }, orbit: { a: 0, speed: 0, phase: 0, incl: 0 } },
    { id: 'ign-ashfall', name: 'Ashfall', kind: 'planet', meaning: 'moment', note: 'Constant volcanic soot clouds drifting over glowing obsidian crust.', createdAt: now - 810 * day, radius: 1.8, clouds: true, palette: { deep: '#18181b', base: '#71717a', high: '#d4d4d8', atmo: '#a1a1aa', ice: '#f4f4f5' }, orbit: { a: 30, speed: TAU / 150, phase: 2.1, incl: 0.1 } },
    { id: 'ign-spire', name: 'Obsidian Spire', kind: 'planet', meaning: 'project', note: 'Towering basalt peaks piercing orange sulfur skies.', createdAt: now - 680 * day, radius: 2.5, palette: { deep: '#292524', base: '#ea580c', high: '#ffedd5', atmo: '#fb923c', ice: '#ffffff' }, orbit: { a: 65, speed: TAU / 750, phase: 4.8, incl: 0.05 } },
    { id: 'ign-forge', name: 'Nether Forge', kind: 'vault', meaning: null, note: 'Deep mantle vault storing thermal energy records.', createdAt: now - 500 * day, radius: 2.1, palette: { deep: '#451a03', base: '#9a3412', high: '#fed7aa', atmo: '#f97316', ice: '#fff7ed' }, orbit: { a: 115, speed: TAU / 3100, phase: 1.0, incl: 0.2 } },
  ],
  entries: [
    { id: 'e-ign-1', planetId: 'ign-spire', title: 'Forge of the Crimson Star', body: 'The basalt towers sang as solar flares swept the night hemisphere.', tags: ['fire', 'magma'], bookmarked: true, archived: false, createdAt: now - 620 * day, updatedAt: now - 620 * day, attachments: [] },
  ],
};
