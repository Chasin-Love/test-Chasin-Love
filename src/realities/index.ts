import { RealityConfig } from './types';
import { solPrimeReality } from './solPrime';
import { hyperionLuminaReality } from './hyperionLumina';
import { ignisEmberReality } from './ignisEmber';
import { kardashevMatrixReality } from './kardashevMatrix';
import { vesperaTwilightReality } from './vesperaTwilight';
import { singularityRiftReality } from './singularityRift';
import { biolumePrimordialReality } from './biolumePrimordial';
import { chronosParadoxReality } from './chronosParadox';
import { parallelRealities } from './parallels';
import { generateClustersForReality } from './clusterGenerator';

export * from './types';
export * from './hierarchyTypes';
export * from './clusterGenerator';
export * from './solPrime';
export * from './hyperionLumina';
export * from './ignisEmber';
export * from './kardashevMatrix';
export * from './vesperaTwilight';
export * from './singularityRift';
export * from './biolumePrimordial';
export * from './chronosParadox';
export * from './parallels';

export const RAW_REALITIES: any[] = [
  solPrimeReality,
  hyperionLuminaReality,
  ignisEmberReality,
  kardashevMatrixReality,
  vesperaTwilightReality,
  singularityRiftReality,
  biolumePrimordialReality,
  chronosParadoxReality,
  ...parallelRealities,
];

/**
 * Cosmological 3D Golden Spiral structural layout algorithm for parallel bubble universes orbiting the central Core.
 * Features user-friendly, spacious orbital separation to eliminate visual crowding.
 */
export function buildRealityConfig(
  r: any,
  i: number,
  total: number,
  customDescriptions?: Record<string, string>
): RealityConfig {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.399963
  const phi = i * goldenAngle;
  const yNorm = total > 1 ? ((i + 0.5) / total) * 2 - 1 : 0; // vertical spread from -1 to +1
  const radFactor = Math.sqrt(Math.max(0.35, 1 - yNorm * yNorm * 0.65));

  // Harmonious orbital distance from Core (0,0,0) comfortably inside the giant 960,000-unit Multiverse Hypersphere
  const R = 540000 + (i % 6) * 42000;
  const x = Math.round(Math.cos(phi) * radFactor * R);
  const y = Math.round(yNorm * 360000);
  const z = Math.round(Math.sin(phi) * radFactor * R);
  const bubblePos: [number, number, number] = [x, y, z];

  let hasVault = false;
  let updatedBodies = (r.bodies || []).map((b: any, bIdx: number) => {
    if (bIdx === 0) {
      return {
        ...b,
        id: 'anchor',
        kind: 'star' as const,
        name: b.name.includes('ANCHOR STAR') ? b.name : `${b.name.replace('CORE', '').trim()} ANCHOR STAR`.trim(),
        note: b.note || 'The Anchor Star — central gravitational & physical regulator of this reality stellar system.',
      };
    }
    if (b.kind === 'vault') {
      hasVault = true;
      return {
        ...b,
        kind: 'vault' as const,
        name: b.name.includes('BLACK HOLE') || b.name.includes('VAULT') ? b.name : `${b.name.replace('Vault', '').replace('Monolith', '').trim()} BLACK HOLE`.trim(),
        note: 'Isolated Eventide Black Hole (Vault). Stores, protects, and executes quantum memory data buffers in total isolation.',
      };
    }
    return b;
  });

  if (!hasVault) {
    const day = 86400000;
    const now = Date.now();
    const TAU = Math.PI * 2;
    const vaultBody = {
      id: `${r.id}-vault-blackhole`,
      name: `${r.name.split(' ')[0]} Eventide Black Hole`,
      kind: 'vault' as const,
      meaning: null,
      note: 'Isolated Eventide Black Hole (Vault). Stores, protects, and executes quantum memory data buffers in total isolation.',
      createdAt: now - 850 * day,
      radius: 2.8,
      palette: { deep: '#000000', base: '#0f172a', high: '#38bdf8', atmo: '#6fc2b4', ice: '#ffffff' },
      orbit: { a: 220 + (i % 4) * 20, speed: TAU / (10000 + i * 500), phase: (i * 1.3) % TAU, incl: -0.15 + (i % 3) * 0.1 },
    };
    updatedBodies.push(vaultBody);
  } else {
    let vaultFound = false;
    updatedBodies = updatedBodies.filter((b: any) => {
      if (b.kind === 'vault') {
        if (vaultFound) return false;
        vaultFound = true;
      }
      return true;
    });
  }

  const bubbleSize = 24000;
  const { clusters, homeLineage } = generateClustersForReality(
    r.id,
    r.name,
    r.colorA,
    r.colorB,
    updatedBodies,
    bubbleSize
  );

  const desc = customDescriptions && customDescriptions[r.id] ? customDescriptions[r.id] : r.description;

  return {
    ...r,
    description: desc,
    bubblePos,
    bubbleSize,
    bodies: updatedBodies,
    clusters: r.clusters || clusters,
    homeLineage: r.homeLineage || homeLineage,
  };
}

export function computeAllRealities(
  customRealities?: RealityConfig[],
  deletedIds?: string[],
  customDescriptions?: Record<string, string>
): RealityConfig[] {
  const deletedSet = new Set(deletedIds || []);
  const baseList = RAW_REALITIES.filter((r) => !deletedSet.has(r.id));
  const customList = (customRealities || []).filter((r) => !deletedSet.has(r.id));
  const combined = [...baseList, ...customList];
  const total = combined.length;

  return combined.map((r, i) => buildRealityConfig(r, i, total, customDescriptions));
}

// Initial statically built realities
export let REALITIES: RealityConfig[] = computeAllRealities();

export function setRuntimeRealities(realities: RealityConfig[]) {
  REALITIES = realities;
}

export function getReality(id: string, customDescriptions?: Record<string, string>): RealityConfig {
  const found = REALITIES.find((r) => r.id === id) || REALITIES[0];
  if (customDescriptions && customDescriptions[found.id]) {
    return {
      ...found,
      description: customDescriptions[found.id],
    };
  }
  return found;
}

/**
 * Factory to construct a complete, validated new parallel reality
 */
export function createNewRealityConfig(params: {
  name: string;
  codeName?: string;
  spectral: string;
  description: string;
  colorA: string;
  colorB: string;
  planetsCount: number;
  clusterName?: string;
}): RealityConfig {
  const day = 86400000;
  const now = Date.now();
  const TAU = Math.PI * 2;
  const id = `reality-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const codeName = params.codeName || `UNIV-${Math.floor(100 + Math.random() * 900)}-${params.name.slice(0, 3).toUpperCase()}`;

  // Generate Anchor Star
  const anchorStar: any = {
    id: 'anchor',
    name: `${params.name.toUpperCase()} ANCHOR STAR`,
    kind: 'star',
    meaning: 'chapter',
    note: `Primary cosmic anchor star for the ${params.name} continuum.`,
    createdAt: now - 1200 * day,
    radius: 4.8,
    palette: { deep: '#0f172a', base: params.colorA, high: params.colorB, atmo: params.colorA, ice: '#ffffff' },
    orbit: { a: 0, speed: 0, phase: 0, incl: 0 },
  };

  // Generate Black Hole Vault
  const vaultBody: any = {
    id: `${id}-vault`,
    name: `${params.name.split(' ')[0]} Eventide Singularity Vault`,
    kind: 'vault',
    meaning: null,
    note: `Eventide Vault for encrypted memories and datasets native to ${params.name}.`,
    createdAt: now - 900 * day,
    radius: 2.9,
    palette: { deep: '#000000', base: '#0b0f19', high: params.colorA, atmo: params.colorB, ice: '#ffffff' },
    orbit: { a: 210, speed: TAU / 12000, phase: 1.2, incl: -0.1 },
  };

  const planetNames = [
    'Aethelgard', 'Celestia', 'Vesperion', 'Chronos', 'Astraea', 'Hyperion', 'Zephyria', 'Elysium', 'Nocturne', 'Pyros'
  ];

  const generatedBodies = [anchorStar];
  const count = Math.min(8, Math.max(1, params.planetsCount));
  for (let p = 0; p < count; p++) {
    const pName = planetNames[p % planetNames.length] + (p >= planetNames.length ? ` ${p + 1}` : '');
    const semiMajor = 35 + p * 22 + Math.random() * 6;
    const speed = TAU / (1400 + p * 600);
    const phase = Math.random() * TAU;
    const incl = (Math.random() - 0.5) * 0.18;
    generatedBodies.push({
      id: `${id}-planet-${p + 1}`,
      name: pName,
      kind: 'planet',
      meaning: (['memory', 'dream', 'project', 'idea', 'moment'] as const)[p % 5],
      note: `Celestial world in the ${params.name} system.`,
      createdAt: now - (600 - p * 50) * day,
      radius: 1.2 + (p % 3) * 0.45,
      rings: p % 3 === 1,
      clouds: true,
      palette: {
        deep: '#030712',
        base: p % 2 === 0 ? params.colorA : params.colorB,
        high: '#e2e8f0',
        atmo: params.colorA,
        ice: '#ffffff',
      },
      orbit: { a: semiMajor, speed, phase, incl },
    });
  }
  generatedBodies.push(vaultBody);

  const rawConfig = {
    id,
    name: params.name,
    codeName,
    spectral: params.spectral,
    description: params.description,
    colorA: params.colorA,
    colorB: params.colorB,
    starColor: params.colorA,
    bodies: generatedBodies,
    entries: [],
  };

  return buildRealityConfig(rawConfig, REALITIES.length, REALITIES.length + 1);
}
