import { RealityConfig } from '../types';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const biolumePrimordialReality: RealityConfig = {
  id: 'biolume-primordial',
  name: 'Biolume Primordial Realm',
  codeName: 'REALITY-07 // SIG-Eta',
  spectral: 'F-Class Emerald Main Sequence',
  description: 'A universe dominated by organic ocean planets and self-luminous organic cosmic spores.',
  bubblePos: [-24000, 10000, 8000],
  bubbleSize: 6900,
  colorA: '#10b981',
  colorB: '#84cc16',
  starColor: '#a7f3d0',
  bodies: [
    { id: 'bio-star', name: 'GENESIS CORE', kind: 'star', meaning: null, note: 'Warm emerald star nurturing biogenic organic light across the system.', createdAt: now - 940 * day, radius: 6.4, palette: { deep: '#064e3b', base: '#059669', high: '#ecfdf5', atmo: '#34d399', ice: '#ffffff' }, orbit: { a: 0, speed: 0, phase: 0, incl: 0 } },
    { id: 'bio-ocean', name: 'Genesis Ocean', kind: 'planet', meaning: 'memory', note: 'Global ocean teeming with glowing planktonic life forms.', createdAt: now - 820 * day, radius: 2.6, clouds: true, palette: { deep: '#022c22', base: '#10b981', high: '#d1fae5', atmo: '#6ee7b7', ice: '#f0fdf4' }, orbit: { a: 36, speed: TAU / 290, phase: 2.3, incl: 0.02 } },
    { id: 'bio-spore', name: 'Spore Nursery', kind: 'nebula', meaning: 'idea', note: 'Giant organic dust cloud generating planet-sized spores.', createdAt: now - 690 * day, radius: 5.8, palette: { deep: '#1a2e05', base: '#65a30d', high: '#ecfccb', atmo: '#a3e635', ice: '#f7fee7' }, orbit: { a: 95, speed: TAU / 1800, phase: 4.1, incl: 0.12 } },
  ],
  entries: [
    { id: 'e-bio-1', planetId: 'bio-ocean', title: 'Bioluminescent Waves', body: 'The water lit up in bright turquoise with every heartbeat of the planetary organism.', tags: ['organic', 'emerald'], bookmarked: true, archived: false, createdAt: now - 650 * day, updatedAt: now - 650 * day, attachments: [] },
  ],
};
