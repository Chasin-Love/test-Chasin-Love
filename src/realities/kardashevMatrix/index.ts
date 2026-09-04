import { RealityConfig } from '../types';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const kardashevMatrixReality: RealityConfig = {
  id: 'kardashev-matrix',
  name: 'Kardashev Dyson Matrix',
  codeName: 'REALITY-04 // SIG-Delta',
  spectral: 'Class II Dyson Structure',
  description: 'A Type-II megastructure universe where entire star systems are encased in solar energy grids.',
  bubblePos: [8000, -18000, 16000],
  bubbleSize: 7400,
  colorA: '#10b981',
  colorB: '#06b6d4',
  starColor: '#34d399',
  bodies: [
    { id: 'kar-core', name: 'DYSON SWARM STAR', kind: 'star', meaning: null, note: 'Central sun encased in solar collection mirrors.', createdAt: now - 990 * day, radius: 6.8, palette: { deep: '#064e3b', base: '#10b981', high: '#d1fae5', atmo: '#6ee7b7', ice: '#ffffff' }, orbit: { a: 0, speed: 0, phase: 0, incl: 0 } },
    { id: 'kar-ring', name: 'Ringworld Prime', kind: 'planet', meaning: 'project', note: 'Artificial ring habitat encircling the star at 1 AU.', createdAt: now - 880 * day, radius: 3.5, rings: true, palette: { deep: '#022c22', base: '#059669', high: '#a7f3d0', atmo: '#34d399', ice: '#ecfdf5' }, orbit: { a: 45, speed: TAU / 365, phase: 0.5, incl: 0 } },
    { id: 'kar-lattice', name: 'Quantum Lattice', kind: 'planet', meaning: 'idea', note: 'Computronium world built purely for supercomputing simulations.', createdAt: now - 720 * day, radius: 2.0, palette: { deep: '#0f172a', base: '#0e7490', high: '#cff4fc', atmo: '#22d3ee', ice: '#f0fdfa' }, orbit: { a: 90, speed: TAU / 1400, phase: 3.1, incl: 0.02 } },
    { id: 'kar-nexus', name: 'Data Nexus Vault', kind: 'vault', meaning: null, note: 'Stellar archive containing galactic neural logs.', createdAt: now - 540 * day, radius: 2.3, palette: { deep: '#065f46', base: '#047857', high: '#6ee7b7', atmo: '#10b981', ice: '#ffffff' }, orbit: { a: 155, speed: TAU / 4800, phase: 2.2, incl: 0.06 } },
  ],
  entries: [
    { id: 'e-kar-1', planetId: 'kar-ring', title: 'Calculations on Ringworld', body: 'The Dyson ring harvested 99.8% of solar flux. Data streams flowed like liquid emerald.', tags: ['dyson', 'cyber'], bookmarked: true, archived: false, createdAt: now - 650 * day, updatedAt: now - 650 * day, attachments: [] },
  ],
};
