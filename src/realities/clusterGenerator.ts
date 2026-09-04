import { CosmicBody } from '../types';
import { CosmicAddress, CosmicLineage, GalaxyClusterData } from './hierarchyTypes';

interface ClusterTemplate {
  name: string;
  type: 'Galaxy Cluster' | 'Galaxy Group' | 'Supercluster Node';
  code: string;
  galaxiesCount: number;
  diameterMly: string;
  galaxyName: string;
  galaxyType: string;
  starsCount: string;
  regionName: string;
  armName: string;
  nebulaName: string;
  nebulaType: string;
  spanLy: string;
  description: string;
}

const CLUSTER_TEMPLATES_BY_REALITY: Record<string, ClusterTemplate[]> = {
  'sol-prime': [
    {
      name: 'Local Galaxy Group (Home)',
      type: 'Galaxy Group',
      code: 'GRP-LOCAL-01',
      galaxiesCount: 84,
      diameterMly: '9.8 Mly',
      galaxyName: 'Milky Way / The Milliandra Spiral',
      galaxyType: 'Barred Spiral (SBbc)',
      starsCount: '250–400 Billion Stars',
      regionName: 'Local Interstellar Fluff & Gould Belt',
      armName: 'Orion–Cygnus Arm (Local Spur)',
      nebulaName: 'Orion Molecular Cloud Complex',
      nebulaType: 'Giant H II Stellar Nursery',
      spanLy: '240 ly',
      description: 'Gravitationally bound group of galaxies containing the Milky Way, Andromeda, Triangulum, and over 80 satellite dwarf galaxies.',
    },
    {
      name: 'Virgo Supercluster Core',
      type: 'Galaxy Cluster',
      code: 'CLST-VIRGO-01',
      galaxiesCount: 1500,
      diameterMly: '15.0 Mly',
      galaxyName: 'Messier 87 Elliptical Giant',
      galaxyType: 'Supergiant Elliptical (cD / E+0-1)',
      starsCount: '1.2 Trillion Stars',
      regionName: 'Virgo Core Relativistic Jet Field',
      armName: 'Elliptical Diffuse Stellar Halo',
      nebulaName: 'Virgo Central Cooling Flow',
      nebulaType: 'Intracluster Star Forge',
      spanLy: '1200 ly',
      description: 'Massive gravitational anchor of our local universe containing over 1,500 giant galaxies and supermassive relativistic jet sources.',
    },
    {
      name: 'Fornax Cluster System',
      type: 'Galaxy Cluster',
      code: 'CLST-FORNAX-42',
      galaxiesCount: 620,
      diameterMly: '6.5 Mly',
      galaxyName: 'NGC 1365 Great Barred Spiral',
      galaxyType: 'Barred Spiral (SBb)',
      starsCount: '320 Billion Stars',
      regionName: 'Fornax Southern Filament',
      armName: 'Prominent Nuclear Ring Arm',
      nebulaName: 'Fornax Starburst Cloud',
      nebulaType: 'Compact Starburst Core',
      spanLy: '450 ly',
      description: 'The second richest galaxy cluster within 100 million light-years, dominated by central giant elliptical and magnificent barred spirals.',
    },
    {
      name: 'Centaurus Supercluster Node',
      type: 'Supercluster Node',
      code: 'NODE-CENT-88',
      galaxiesCount: 2200,
      diameterMly: '28.0 Mly',
      galaxyName: 'Centaurus A (NGC 5128)',
      galaxyType: 'Peculiar Lenticular / Active Galactic Nucleus',
      starsCount: '500 Billion Stars',
      regionName: 'Great Attractor Gravity Well',
      armName: 'Bisected Dusty Torus Ring',
      nebulaName: 'Centaurus Radio Lobe Forge',
      nebulaType: 'High-Energy Plasma Shock Nursery',
      spanLy: '850 ly',
      description: 'A colossal supercluster complex pulling millions of galaxies toward the gravitational Great Attractor anomaly.',
    },
    {
      name: 'Perseus Molecular Cluster',
      type: 'Galaxy Cluster',
      code: 'CLST-PERSEUS-05',
      galaxiesCount: 950,
      diameterMly: '11.2 Mly',
      galaxyName: 'NGC 1275 Perseus A',
      galaxyType: 'Seyfert / Filamental Giant',
      starsCount: '800 Billion Stars',
      regionName: 'Intracluster Sound Wave Filament',
      armName: 'Accretion Filaments',
      nebulaName: 'Perseus Sonic Emission Bubble',
      nebulaType: 'Resonant Acoustic Nursery',
      spanLy: '600 ly',
      description: 'One of the most massive clusters in the observable universe, known for generating rhythmic acoustic soundwaves across light-years.',
    },
    {
      name: 'Sculptor Polar Group',
      type: 'Galaxy Group',
      code: 'GRP-SCULPT-12',
      galaxiesCount: 42,
      diameterMly: '5.2 Mly',
      galaxyName: 'NGC 253 Silver Coin Galaxy',
      galaxyType: 'Intermediate Spiral (SABc)',
      starsCount: '180 Billion Stars',
      regionName: 'South Galactic Pole Void',
      armName: 'Dusty Outflow Arm',
      nebulaName: 'Sculptor Starburst Core',
      nebulaType: 'Nuclear Superwind Nursery',
      spanLy: '310 ly',
      description: 'A loose group of galaxies situated near the South Galactic Pole undergoing rapid starburst generation and stellar winds.',
    },
  ],
};

export function buildCosmicAddress(realityId: string, clusterIdx: number): CosmicAddress {
  return {
    realityId,
    cosmicWebId: `web-${realityId}`,
    complexId: `complex-${realityId}-${Math.floor(clusterIdx / 2)}`,
    superclusterId: `supercluster-${realityId}-${clusterIdx}`,
    clusterId: `cluster-${realityId}-${clusterIdx}`,
    galaxyId: `galaxy-${realityId}-${clusterIdx}`,
    regionId: `region-${realityId}-${clusterIdx}`,
    spiralArmId: `arm-${realityId}-${clusterIdx}`,
    starFormingRegionId: `sfr-${realityId}-${clusterIdx}`,
    stellarSystemId: `system-${realityId}-${clusterIdx}`,
  };
}

export function generateClustersForReality(
  realityId: string,
  realityName: string,
  colorA: string,
  colorB: string,
  bodies: CosmicBody[],
  bubbleSize: number
): { clusters: GalaxyClusterData[]; homeLineage: CosmicLineage } {
  const templates = CLUSTER_TEMPLATES_BY_REALITY[realityId] || [
    {
      name: `${realityName} Home Cluster`,
      type: 'Galaxy Group',
      code: `GRP-${realityId.slice(0, 4).toUpperCase()}-01`,
      galaxiesCount: 78 + (bodies.length * 6),
      diameterMly: '12.4 Mly',
      galaxyName: `${realityName} Grand Spiral`,
      galaxyType: 'Barred Grand-Design Spiral',
      starsCount: '340 Billion Stars',
      regionName: `${realityName} Primary Sector`,
      armName: 'Luminous Sagittarius-Cygnus Spur',
      nebulaName: `${realityName} Starforge Nebula`,
      nebulaType: 'Giant H II Emission Complex',
      spanLy: '380 ly',
      description: `The gravitational home cluster of ${realityName}, containing the anchor star system and dozens of gravitationally bound sister galaxies.`,
    },
    {
      name: `${realityName} Hypercluster Alpha`,
      type: 'Galaxy Cluster',
      code: `CLST-${realityId.slice(0, 3).toUpperCase()}-ALPH`,
      galaxiesCount: 850,
      diameterMly: '18.2 Mly',
      galaxyName: 'Aegis Major Elliptical',
      galaxyType: 'Giant CD Elliptical',
      starsCount: '1.4 Trillion Stars',
      regionName: 'Deep Intracluster High-Gravity Void',
      armName: 'Diffuse Relativistic Jet Cloud',
      nebulaName: 'Aegis Central Plasma Forge',
      nebulaType: 'Cooling Flow Nebula',
      spanLy: '1100 ly',
      description: `A dense, high-mass galaxy cluster dominating the northern sector of this parallel universe.`,
    },
    {
      name: `${realityName} Outer Filament Group`,
      type: 'Galaxy Group',
      code: `GRP-${realityId.slice(0, 3).toUpperCase()}-OUT`,
      galaxiesCount: 52,
      diameterMly: '8.6 Mly',
      galaxyName: 'Vesper Starburst Spiral',
      galaxyType: 'Peculiar Interacting Spiral',
      starsCount: '210 Billion Stars',
      regionName: 'Periphery Filament Boundary',
      armName: 'Tidal Tail Arm',
      nebulaName: 'Outer Veil Molecular Nursery',
      nebulaType: 'Dust-Obscured Star Nursery',
      spanLy: '420 ly',
      description: `An outer cosmic filament group traversing the perimeter boundary of this reality bubble.`,
    },
    {
      name: `${realityName} Resonance Supercluster Node`,
      type: 'Supercluster Node',
      code: `NODE-${realityId.slice(0, 3).toUpperCase()}-RES`,
      galaxiesCount: 1800,
      diameterMly: '32.0 Mly',
      galaxyName: 'Chronos Lens Core',
      galaxyType: 'Gravitational Lensing Galaxy',
      starsCount: '950 Billion Stars',
      regionName: 'Curvature Focal Plane',
      armName: 'Einstein Ring Arm Structure',
      nebulaName: 'Lensing Forge Complex',
      nebulaType: 'Resonant Acoustic Nursery',
      spanLy: '750 ly',
      description: `A high-density supercluster node producing strong gravitational lensing across multi-megaparsec distances.`,
    },
    {
      name: `${realityName} Nebulaic Cluster`,
      type: 'Galaxy Cluster',
      code: `CLST-${realityId.slice(0, 3).toUpperCase()}-NEB`,
      galaxiesCount: 640,
      diameterMly: '14.5 Mly',
      galaxyName: 'Lumina Twin Disc',
      galaxyType: 'Colliding Twin Spiral System',
      starsCount: '580 Billion Stars',
      regionName: 'Shockwave Bridge',
      armName: 'Tidal Compression Arm',
      nebulaName: 'Tarantula Class Nursery',
      nebulaType: 'Ultra-Luminous H II Region',
      spanLy: '890 ly',
      description: `A cluster energized by colliding galaxy discs, producing thousands of new protostars every millennium.`,
    },
  ];

  const anchor = bodies[0] || { name: 'Anchor Star', kind: 'star' };
  const worldsCount = bodies.length;

  const clusters: GalaxyClusterData[] = templates.map((tmpl, idx) => {
    const isHome = idx === 0;
    const count = templates.length;
    const angle = (idx / count) * Math.PI * 2 + (idx * 0.4);
    const orbitRadius = bubbleSize * (1.15 + (idx % 3) * 0.22);
    const orbitSpeed = (Math.PI * 2) / (60 + idx * 25);
    const orbitPhase = (idx * 1.37) % (Math.PI * 2);
    const orbitIncl = ((idx % 2 === 0 ? 1 : -1) * (0.15 + idx * 0.12));
    const clusterColor = idx === 0 ? colorA : idx % 2 === 0 ? colorB : '#38bdf8';
    const address = buildCosmicAddress(realityId, idx);

    const lineage: CosmicLineage = {
      multiverse: {
        id: 'multiverse-prime',
        name: 'The Infinite Multiverse',
        description: 'Omni-dimensional bulk space hosting all parallel bubble universes and quantum continuums.',
      },
      reality: {
        id: realityId,
        name: realityName,
        spectral: 'Quantum Bubble Reality',
        description: `Parallel Universe continuum ${realityName} operating with isolated physical parameters.`,
      },
      cosmicWeb: {
        id: address.cosmicWebId,
        name: `${realityName} Cosmic Filament Web`,
        filamentDensity: '0.84 Baryonic Mass / Vol',
        description: 'Large-scale dark matter filaments and vast cosmic voids interconnecting all supercluster complexes.',
      },
      superclusterComplex: {
        id: address.complexId!,
        name: `${realityName} Complex ${String.fromCharCode(65 + Math.floor(idx / 2))}`,
        spanMly: `${400 + idx * 80} Mly`,
        description: 'Hyper-scale gravitational complex containing multiple supercluster nodes.',
      },
      supercluster: {
        id: address.superclusterId!,
        name: `${tmpl.name.replace(/(Group|Cluster|Node)/, '').trim()} Supercluster`,
        clustersCount: 12 + idx * 4,
        description: 'Dense concentration of galaxy clusters and group filaments.',
      },
      galaxyCluster: {
        id: tmpl.code,
        name: tmpl.name,
        type: tmpl.type,
        galaxiesCount: tmpl.galaxiesCount,
        diameterMly: tmpl.diameterMly,
        description: tmpl.description,
        isHomeCluster: isHome,
      },
      galaxy: {
        id: address.galaxyId!,
        name: tmpl.galaxyName,
        type: tmpl.galaxyType,
        diameterKly: `${100 + (idx * 15)} kly`,
        starsCount: tmpl.starsCount,
        description: `Major luminous galaxy within ${tmpl.name}, hosting vast spiral arms and hundreds of star-forming nebulae.`,
      },
      galacticRegion: {
        id: address.regionId!,
        name: tmpl.regionName,
        distanceFromCore: `${24 + (idx * 2)} kly from Galactic Core`,
        temperature: 'Warm Interstellar Medium (~7,000 K)',
        description: `The surrounding galactic sub-sector with balanced cosmic radiation and rich heavy-element abundance.`,
      },
      spiralArm: {
        id: address.spiralArmId!,
        name: tmpl.armName,
        pitchAngle: '12.4° Galactic Pitch',
        description: `A major density wave compressing interstellar molecular clouds and triggering new generations of stars.`,
      },
      starFormingRegion: {
        id: address.starFormingRegionId!,
        name: tmpl.nebulaName,
        type: tmpl.nebulaType,
        spanLy: tmpl.spanLy,
        protostarsCount: `${1200 + idx * 450} Protostellar Cores`,
        description: `Vast stellar nursery where gas and dust collapse gravitationally to birth proto-planetary solar systems.`,
      },
      stellarSystem: {
        id: address.stellarSystemId!,
        starName: isHome ? anchor.name : `${tmpl.name.split(' ')[0]} Primary Star`,
        spectralClass: isHome ? 'G2V Main Sequence / Spectral Core' : 'F5V Luminous Dwarf',
        habitableZoneAU: '0.95 – 1.42 AU',
        worldsCount: isHome ? worldsCount : 4 + (idx % 5),
        description: isHome
          ? `The primary anchor stellar system of ${realityName}, holding all ${worldsCount} recorded cosmic worlds, memory planets, and quantum vault.`
          : `A neighboring stellar system within the ${tmpl.nebulaName} nebula sector.`,
      },
    };

    return {
      id: `${realityId}-cluster-${idx}`,
      realityId,
      address,
      name: tmpl.name,
      type: tmpl.type,
      code: tmpl.code,
      color: clusterColor,
      orbitRadius,
      orbitSpeed,
      orbitPhase,
      orbitIncl,
      galaxiesCount: tmpl.galaxiesCount,
      isHomeCluster: isHome,
      lineage,
    };
  });

  return {
    clusters,
    homeLineage: clusters[0].lineage,
  };
}
