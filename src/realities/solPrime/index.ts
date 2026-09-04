import { RealityConfig } from '../types';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const solPrimeReality: RealityConfig = {
  id: 'sol-prime',
  name: 'Sol-Prime Continuum',
  codeName: 'REALITY-01 // SIG-Alpha',
  spectral: 'G2V Main Sequence',
  description: 'The baseline universe anchor. Home to Sol, Aurelia, and the original Eventide Vault.',
  bubblePos: [0, 0, 0],
  bubbleSize: 7500,
  colorA: '#38bdf8',
  colorB: '#f59e0b',
  starColor: '#ffb54d',
  bodies: [
    { id: 'anchor', name: 'ANCHOR STAR', kind: 'star', meaning: null, note: 'The stabilizing core of Sol-Prime. Double-click to enter Core Mode.', createdAt: now - 980 * day, radius: 6, palette: { deep: '#5a2a08', base: '#ffb54d', high: '#fff3d9', atmo: '#ffd9a0', ice: '#ffffff' }, orbit: { a: 0, speed: 0, phase: 0, incl: 0 } },
    { id: 'cinder', name: 'Cinder', kind: 'planet', meaning: 'moment', note: 'Small, fast, scorched close to the light. A moment that burned bright and brief.', createdAt: now - 940 * day, radius: 1.15, palette: { deep: '#1c1512', base: '#6e5a4c', high: '#b39a83', atmo: '#8a7462', ice: '#d8cfc4' }, orbit: { a: 26, speed: TAU / 88, phase: 0.8, incl: 0.12 } },
    { id: 'veil', name: 'Veil', kind: 'planet', meaning: 'dream', note: 'Under a permanent shroud of cloud. Where dreams stay unverified.', createdAt: now - 860 * day, radius: 1.9, clouds: true, palette: { deep: '#2a1f14', base: '#c9a86a', high: '#efd9a8', atmo: '#e8cf9e', ice: '#fff2d8' }, orbit: { a: 38, speed: TAU / 224, phase: 2.4, incl: 0.05 } },
    { id: 'aurelia', name: 'Aurelia', kind: 'planet', meaning: 'memory', note: 'The inhabited one. Oceans, weather, city light on the dark side.', createdAt: now - 800 * day, radius: 2.05, clouds: true, nightside: true, palette: { deep: '#0b2d4d', base: '#1f6e52', high: '#9db88a', atmo: '#7fc4e8', ice: '#eef6ff' }, orbit: { a: 52, speed: TAU / 365, phase: 4.2, incl: 0.0 } },
    { id: 'rust', name: 'Rust', kind: 'planet', meaning: 'project', note: 'Half-finished terrain, dust storms, old machinery.', createdAt: now - 640 * day, radius: 1.5, palette: { deep: '#2b120c', base: '#a34b2a', high: '#d98d5f', atmo: '#d9a184', ice: '#f0d9c8' }, orbit: { a: 68, speed: TAU / 687, phase: 1.1, incl: 0.09 } },
    { id: 'goliath', name: 'Goliath', kind: 'planet', meaning: 'chapter', note: 'A gas giant with a ring system and three moons.', createdAt: now - 520 * day, radius: 4.3, rings: true, clouds: true, palette: { deep: '#241a12', base: '#b08d5f', high: '#e8d3a8', atmo: '#e0c493', ice: '#f5ead0' }, orbit: { a: 100, speed: TAU / 1600, phase: 5.4, incl: 0.04 } },
    { id: 'mirror', name: 'Mirror', kind: 'planet', meaning: 'person', note: 'Ice world, almost perfectly reflective.', createdAt: now - 330 * day, radius: 1.75, palette: { deep: '#10222e', base: '#4f7f96', high: '#bcd9e6', atmo: '#a8d8ea', ice: '#f2fbff' }, orbit: { a: 132, speed: TAU / 2600, phase: 3.0, incl: 0.14 } },
    { id: 'hollow', name: 'Hollow', kind: 'dwarf', meaning: 'idea', note: 'A small dwarf world, mostly unexplored.', createdAt: now - 150 * day, radius: 0.8, palette: { deep: '#191d24', base: '#5c6672', high: '#9aa7b4', atmo: '#7d8b99', ice: '#dfe6ec' }, orbit: { a: 160, speed: TAU / 3800, phase: 0.2, incl: 0.22 } },
    { id: 'wisp', name: 'Wisp Nebula', kind: 'nebula', meaning: 'idea', note: 'A stellar nursery at the system edge.', createdAt: now - 420 * day, radius: 7, palette: { deep: '#0a2a2c', base: '#2f8f83', high: '#9fe8d8', atmo: '#6fc2b4', ice: '#e8fff8' }, orbit: { a: 205, speed: TAU / 9000, phase: 2.0, incl: 0.3 } },
    { id: 'eventide', name: 'Eventide', kind: 'vault', meaning: null, note: 'A quiet black hole. Digital storage object.', createdAt: now - 900 * day, radius: 2.6, palette: { deep: '#000000', base: '#14100c', high: '#3a2c1c', atmo: '#6fc2b4', ice: '#ffffff' }, orbit: { a: 250, speed: TAU / 12000, phase: 4.6, incl: -0.18 } },
  ],
  entries: [
    { id: 'e-sol-1', planetId: 'aurelia', title: 'First light on the water', body: 'I named this planet on a Tuesday. The oceans came first — I wrote the shoreline before I knew what the memory actually was.\n\nThings to keep: the color of 6am, the train ticket, her exact wording.', tags: ['origin', 'sea'], bookmarked: true, archived: false, createdAt: now - 780 * day, updatedAt: now - 780 * day, attachments: [] },
    { id: 'e-sol-2', planetId: 'aurelia', title: 'Weather report, interior', body: 'Rained all day inside this memory. That is allowed — planets have weather, memories do too.', tags: ['weather', 'walking'], bookmarked: false, archived: false, createdAt: now - 610 * day, updatedAt: now - 610 * day, attachments: [] },
    { id: 'e-sol-3', planetId: 'veil', title: 'A dream about staircases', body: 'The staircase kept arriving before the building. Marble, then water, then just the idea of ascent.', tags: ['dream', 'stairs'], bookmarked: false, archived: false, createdAt: now - 500 * day, updatedAt: now - 500 * day, attachments: [] },
  ],
};
