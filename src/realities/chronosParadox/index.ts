import { RealityConfig } from '../types';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const chronosParadoxReality: RealityConfig = {
  id: 'chronos-paradox',
  name: 'Chronos Paradox Realm',
  codeName: 'REALITY-08 // SIG-Theta',
  spectral: 'Temporal Magnetar Pulsar',
  description: 'A universe where time flows in non-linear loops, creating temporal echoes and causality ripples.',
  bubblePos: [16000, -26000, -6000],
  bubbleSize: 7100,
  colorA: '#eab308',
  colorB: '#f97316',
  starColor: '#fde047',
  bodies: [
    { id: 'chr-star', name: 'CHRONOS PULSAR', kind: 'star', meaning: null, note: 'Rapidly spinning magnetar emitting temporal pulses every 3.2 seconds.', createdAt: now - 980 * day, radius: 5.8, palette: { deep: '#713f12', base: '#ca8a04', high: '#fef08a', atmo: '#fde047', ice: '#ffffff' }, orbit: { a: 0, speed: 0, phase: 0, incl: 0 } },
    { id: 'chr-retrograde', name: 'Retrograde', kind: 'planet', meaning: 'moment', note: 'World orbiting backwards through time relative to stellar spin.', createdAt: now - 840 * day, radius: 2.0, palette: { deep: '#431407', base: '#ea580c', high: '#ffedd5', atmo: '#fdba74', ice: '#fff7ed' }, orbit: { a: 38, speed: -TAU / 310, phase: 0.4, incl: 0.18 } },
    { id: 'chr-entropy', name: 'Entropy Ring', kind: 'planet', meaning: 'project', note: 'Ring world frozen halfway between creation and collapse.', createdAt: now - 710 * day, radius: 3.4, rings: true, palette: { deep: '#365314', base: '#65a30d', high: '#ecfccb', atmo: '#bef264', ice: '#f7fee7' }, orbit: { a: 82, speed: TAU / 1250, phase: 2.9, incl: 0.04 } },
  ],
  entries: [
    { id: 'e-chr-1', planetId: 'chr-retrograde', title: 'Yesterday Happened Tomorrow', body: 'On Retrograde, rivers flow backwards into rain clouds and old thoughts become new again.', tags: ['time', 'paradox'], bookmarked: true, archived: false, createdAt: now - 690 * day, updatedAt: now - 690 * day, attachments: [] },
  ],
};
