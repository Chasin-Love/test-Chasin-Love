import React, { useState } from 'react';
import { GalaxyClusterData, CosmicLineage } from '../realities';
import {
  Globe, Sparkles, Orbit, Layers, ArrowRight, Compass,
  ChevronRight, Disc, Activity, Eye, Zap, Shield, Sun, CircleDot, Plus
} from 'lucide-react';

interface CosmicLineageModalProps {
  cluster: GalaxyClusterData;
  realityName: string;
  onClose: () => void;
  onWarpToReality: (realityId: string) => void;
}

export const CosmicLineageModal: React.FC<CosmicLineageModalProps> = ({
  cluster,
  realityName,
  onClose,
  onWarpToReality,
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [createdItems, setCreatedItems] = useState<Record<string, string[]>>({});
  const { lineage } = cluster;

  const steps = [
    {
      id: 'multiverse',
      title: 'Multiverse',
      subtitle: 'Omni-Dimensional Bulk',
      name: lineage.multiverse?.name || 'The Infinite Multiverse',
      icon: Globe,
      color: '#06b6d4',
      data: {
        'Multiverse ID': lineage.multiverse?.id || 'multiverse-prime',
        'Bulk Dimensions': '11-Dimensional Calabi-Yau Manifold',
        'Parallel Continuum Count': '20 Bubble Universes Active',
        'Vacuum Energy': 'Cosmological Constant Vacuum Density',
        'Containment Shield': 'Dimensional Barrier Isolated',
      },
      description: lineage.multiverse?.description || 'Omni-dimensional bulk space hosting all parallel bubble universes and quantum continuums.',
      createLabel: '+ Create Bubble Reality',
    },
    {
      id: 'reality',
      title: 'Reality / Universe',
      subtitle: 'Parallel Bubble Continuum',
      name: lineage.reality.name,
      icon: Shield,
      color: '#8b5cf6',
      data: {
        'Reality ID': lineage.reality.id,
        'Spectral Class': lineage.reality.spectral,
        'Quantum Isolation': 'Dimensional Barrier Active',
        'Anchor Star': `${lineage.reality.name} Anchor Star`,
        'Singularity Vault': 'Isolated Eventide Black Hole',
      },
      description: lineage.reality.description,
      createLabel: '+ Create Cosmic Web Sector',
    },
    {
      id: 'cosmicWeb',
      title: 'Cosmic Web',
      subtitle: 'Filamentary Matrix',
      name: lineage.cosmicWeb.name,
      icon: Activity,
      color: '#38bdf8',
      data: {
        'Filament ID': lineage.cosmicWeb.id,
        'Baryonic Mass Density': lineage.cosmicWeb.filamentDensity,
        'Dark Matter Halos': 'IllustrisTNG-Grade Filament Network',
        'Void Boundaries': 'Cosmic Void Wall Structures',
        'Expansion Rate': 'Hubble Constant H0 ~ 67.4 km/s/Mpc',
      },
      description: lineage.cosmicWeb.description,
      createLabel: '+ Create Supercluster Complex',
    },
    {
      id: 'superclusterComplex',
      title: 'Supercluster Complex',
      subtitle: 'Hyper-Scale Gravitational Complex',
      name: lineage.superclusterComplex.name,
      icon: Layers,
      color: '#a855f7',
      data: {
        'Complex ID': lineage.superclusterComplex.id,
        'Spatial Span': lineage.superclusterComplex.spanMly,
        'Gravitational Well': 'Great Attractor Anomaly Well',
        'Filament Infall': '420 km/s Infall Stream Velocity',
        'Node Density': 'High-Mass Supercluster Node Array',
      },
      description: lineage.superclusterComplex.description,
      createLabel: '+ Create Supercluster Node',
    },
    {
      id: 'supercluster',
      title: 'Supercluster',
      subtitle: 'Cluster Association',
      name: lineage.supercluster.name,
      icon: Layers,
      color: '#3b82f6',
      data: {
        'Supercluster ID': lineage.supercluster.id,
        'Member Clusters': `${lineage.supercluster.clustersCount} Galaxy Clusters`,
        'Hot Gas Fraction': '12% Intergalactic Intracluster Gas',
        'Core Velocity Dispersion': '850 km/s Velocity Dispersion',
        'Mass Equivalence': '10^15 Solar Masses M☉',
      },
      description: lineage.supercluster.description,
      createLabel: '+ Create Galaxy Cluster',
    },
    {
      id: 'cluster',
      title: 'Galaxy Cluster / Group',
      subtitle: lineage.galaxyCluster.type,
      name: lineage.galaxyCluster.name,
      icon: Layers,
      color: '#38bdf8',
      data: {
        'Cluster Designation': lineage.galaxyCluster.id,
        'Member Galaxies': `${lineage.galaxyCluster.galaxiesCount} Galaxies`,
        'Cluster Diameter': lineage.galaxyCluster.diameterMly,
        'Classification': lineage.galaxyCluster.type,
        'Intracluster Medium': 'Hot X-ray emitting plasma (10–100M Kelvin)',
        'Gravitational Binding': 'Virialized dark matter halo & sub-halo clusters',
      },
      description: lineage.galaxyCluster.description,
      createLabel: '+ Create Member Galaxy',
    },
    {
      id: 'galaxy',
      title: 'Galaxy',
      subtitle: lineage.galaxy.type,
      name: lineage.galaxy.name,
      icon: Disc,
      color: '#a855f7',
      data: {
        'Galaxy Name': lineage.galaxy.name,
        'Morphological Class': lineage.galaxy.type,
        'Diameter': lineage.galaxy.diameterKly,
        'Stellar Population': lineage.galaxy.starsCount,
        'Central Core': 'Supermassive Black Hole Singularity',
        'Rotational Velocity': '220 km/s flat rotation curve',
      },
      description: lineage.galaxy.description,
      createLabel: '+ Create Galactic Region',
    },
    {
      id: 'region',
      title: 'Galactic Region',
      subtitle: 'Sub-Galactic Quadrant',
      name: lineage.galacticRegion.name,
      icon: Activity,
      color: '#06b6d4',
      data: {
        'Sector Name': lineage.galacticRegion.name,
        'Galactocentric Radius': lineage.galacticRegion.distanceFromCore,
        'Medium Temperature': lineage.galacticRegion.temperature,
        'Metallicity (Z)': 'Solar Metallicity [Fe/H] ~ 0.02',
        'Cosmic Ray Flux': 'Shielded by local interstellar magnetic bubble',
      },
      description: lineage.galacticRegion.description,
      createLabel: '+ Create Spiral Arm',
    },
    {
      id: 'arm',
      title: 'Spiral Arm / Spur',
      subtitle: 'Density Wave Compression',
      name: lineage.spiralArm.name,
      icon: Compass,
      color: '#f59e0b',
      data: {
        'Spiral Arm': lineage.spiralArm.name,
        'Pitch Angle': lineage.spiralArm.pitchAngle,
        'Wave Velocity': 'Pattern speed ~28 km/s/kpc',
        'Shock Front': 'Cold molecular gas & OB stellar association lane',
        'Stellar Infall Rate': '1.8 Solar masses / year',
      },
      description: lineage.spiralArm.description,
      createLabel: '+ Create Star-Forming Region',
    },
    {
      id: 'nebula',
      title: 'Star-Forming Region',
      subtitle: lineage.starFormingRegion.type,
      name: lineage.starFormingRegion.name,
      icon: Sparkles,
      color: '#ec4899',
      data: {
        'Nebula Complex': lineage.starFormingRegion.name,
        'Nursery Type': lineage.starFormingRegion.type,
        'Diameter Span': lineage.starFormingRegion.spanLy,
        'Protostellar Cores': lineage.starFormingRegion.protostarsCount,
        'Dust Temperature': '10 – 35 Kelvin (Cold dense cores)',
        'Trigger Mechanism': 'Supernova shock compression & photo-ionization',
      },
      description: lineage.starFormingRegion.description,
      createLabel: '+ Create Stellar System',
    },
    {
      id: 'system',
      title: 'Stellar System',
      subtitle: 'Planetary & Celestial Worlds',
      name: lineage.stellarSystem.starName,
      icon: Sun,
      color: '#10b981',
      data: {
        'Primary Star': lineage.stellarSystem.starName,
        'Spectral Class': lineage.stellarSystem.spectralClass,
        'Habitable Goldilocks Zone': lineage.stellarSystem.habitableZoneAU,
        'Tracked Worlds': `${lineage.stellarSystem.worldsCount} Celestial Bodies`,
        'Orbital Stability': 'Secular resonance-stabilized multi-planet system',
        'Vault Isolation': 'Quantum eventide containment active',
      },
      description: lineage.stellarSystem.description,
      createLabel: '+ Create Celestial Planet',
    },
  ];

  const current = steps[activeStep];

  const handleCreateMore = (stepId: string) => {
    const num = (createdItems[stepId]?.length || 0) + 1;
    const newItemName = `${current.name} Branch #${num}`;
    setCreatedItems((prev) => ({
      ...prev,
      [stepId]: [...(prev[stepId] || []), newItemName],
    }));
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-950/45 backdrop-blur-2xl border border-cyan-400/35 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_45px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] flex flex-col overflow-hidden text-slate-100">
        {/* Specular glass highlight reflection across top */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-cyan-300 font-semibold">
                  11-STAGE COSMIC HIERARCHY
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-mono text-[9px] text-amber-300">{realityName}</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide drop-shadow-sm flex items-center gap-2">
                <span>{cluster.name}</span>
                {cluster.isHomeCluster && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    Home Cluster
                  </span>
                )}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.15] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors font-bold text-sm backdrop-blur-md cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Step-by-Step Cosmic Lineage Interactive Breadcrumb Strip */}
        <div className="px-6 py-3 border-b border-white/10 bg-white/[0.01] overflow-x-auto custom-scroll">
          <div className="flex items-center justify-between min-w-[1000px] gap-2">
            {steps.map((s, idx) => {
              const isSelected = idx === activeStep;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStep(idx)}
                  className={`flex-1 flex items-center gap-2 p-2 rounded-xl border transition-all text-left backdrop-blur-md cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/25 border-cyan-400/70 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-white/20"
                    style={{ backgroundColor: `${s.color}25`, color: s.color }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-wider text-slate-400">
                      <span>{idx + 1}.</span>
                      <span className="truncate">{s.title.split(' ')[0]}</span>
                    </div>
                    <div className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {s.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Scale Stage Detail View */}
        <div className="flex-1 overflow-y-auto p-6 custom-scroll space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Stage Card */}
            <div className="md:col-span-2 space-y-4">
              <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-cyan-300 font-bold">
                        STAGE {activeStep + 1} OF 11
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono text-[10px] text-amber-300">{current.subtitle}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-1 drop-shadow-sm">{current.name}</h3>
                  </div>

                  <div
                    className="p-3 rounded-2xl shadow-inner ring-1 ring-white/20"
                    style={{ backgroundColor: `${current.color}25`, color: current.color }}
                  >
                    {React.createElement(current.icon, { className: 'w-6 h-6' })}
                  </div>
                </div>

                <div className="mt-4 p-3.5 rounded-xl bg-slate-950/40 border border-white/10 text-slate-200 text-xs leading-relaxed font-body backdrop-blur-sm">
                  {current.description}
                </div>

                {/* Controlled "+ Create More" Expansion Control */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="text-xs text-slate-300">
                    Custom Structures: <span className="font-mono font-bold text-cyan-300">{createdItems[current.id]?.length || 0}</span>
                  </div>
                  <button
                    onClick={() => handleCreateMore(current.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-200 hover:text-white font-mono text-xs font-semibold transition-all backdrop-blur-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{current.createLabel}</span>
                  </button>
                </div>

                {createdItems[current.id] && createdItems[current.id].length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {createdItems[current.id].map((itemName, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-cyan-950/40 border border-cyan-400/30 text-cyan-200">
                        ✦ {itemName}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Complete Lineage Path Visual Indicator */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
                <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-3">
                  COMPLETE 11-LEVEL COSMIC HIERARCHY TREE
                </h4>
                <div className="space-y-1.5 font-mono text-[10.5px]">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-4 text-cyan-400 font-bold">1</span>
                    <span className="text-slate-400">Multiverse:</span>
                    <span className="font-semibold text-white">{lineage.multiverse?.name || 'The Infinite Multiverse'}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-2 text-slate-300">
                    <span className="text-slate-500">↳</span>
                    <span className="w-4 text-purple-400 font-bold">2</span>
                    <span className="text-slate-400">Reality:</span>
                    <span className="font-semibold text-purple-200">{lineage.reality.name}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4 text-slate-300">
                    <span className="text-slate-500">↳</span>
                    <span className="w-4 text-cyan-400 font-bold">3</span>
                    <span className="text-slate-400">Cosmic Web:</span>
                    <span className="font-semibold text-cyan-200">{lineage.cosmicWeb.name}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-6 text-slate-300">
                    <span className="text-slate-500">↳</span>
                    <span className="w-4 text-indigo-400 font-bold">4</span>
                    <span className="text-slate-400">Complex:</span>
                    <span className="font-semibold text-indigo-200">{lineage.superclusterComplex.name}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-8 text-slate-300">
                    <span className="text-slate-500">↳</span>
                    <span className="w-4 text-blue-400 font-bold">5</span>
                    <span className="text-slate-400">Supercluster:</span>
                    <span className="font-semibold text-blue-200">{lineage.supercluster.name}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-10 text-slate-300">
                    <span className="text-slate-500">↳</span>
                    <span className="w-4 text-teal-400 font-bold">6</span>
                    <span className="text-slate-400">Cluster / Group:</span>
                    <span className="font-semibold text-teal-200">{lineage.galaxyCluster.name}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-12 text-slate-300">
                    <span className="text-slate-500">↳</span>
                    <span className="w-4 text-purple-400 font-bold">7</span>
                    <span className="text-slate-400">Galaxy:</span>
                    <span className="font-semibold text-purple-200">{lineage.galaxy.name}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-14 text-slate-300">
                    <span className="text-slate-500">↳</span>
                    <span className="w-4 text-cyan-400 font-bold">8</span>
                    <span className="text-slate-400">Galactic Region:</span>
                    <span className="font-semibold text-cyan-200">{lineage.galacticRegion.name}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-16 text-slate-300">
                    <span className="text-slate-500">↳</span>
                    <span className="w-4 text-amber-400 font-bold">9</span>
                    <span className="text-slate-400">Spiral Arm:</span>
                    <span className="font-semibold text-amber-200">{lineage.spiralArm.name}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-18 text-slate-300">
                    <span className="text-slate-500">↳</span>
                    <span className="w-4 text-pink-400 font-bold">10</span>
                    <span className="text-slate-400">Star Nursery:</span>
                    <span className="font-semibold text-pink-200">{lineage.starFormingRegion.name}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-20 text-slate-300">
                    <span className="text-slate-500">↳</span>
                    <span className="w-4 text-emerald-400 font-bold">11</span>
                    <span className="text-slate-400">Stellar System:</span>
                    <span className="font-semibold text-emerald-300">{lineage.stellarSystem.starName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Astrophysical Telemetry & Specifications */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md space-y-3">
                <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300 font-semibold">
                  ASTROPHYSICAL DATA & METRICS
                </h4>

                <div className="space-y-2">
                  {Object.entries(current.data).map(([key, value]) => (
                    <div
                      key={key}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-0.5"
                    >
                      <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">{key}</span>
                      <span className="font-medium text-xs text-slate-100">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-2">
                <button
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                  className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-30 disabled:pointer-events-none border border-white/10 text-xs font-mono transition-all backdrop-blur-md cursor-pointer"
                >
                  ← Scale Up
                </button>
                <button
                  disabled={activeStep === steps.length - 1}
                  onClick={() => setActiveStep((s) => Math.min(steps.length - 1, s + 1))}
                  className="flex-1 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 disabled:opacity-30 disabled:pointer-events-none border border-cyan-400/40 text-cyan-200 text-xs font-mono transition-all backdrop-blur-md cursor-pointer"
                >
                  Scale Down →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
            <Orbit className="w-3.5 h-3.5 text-cyan-400" />
            <span>Complete 11-Level Astronomical Chain: Multiverse → ... → Stellar System</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 text-xs font-medium backdrop-blur-md transition-all cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={() => {
                onWarpToReality(cluster.realityId);
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs backdrop-blur-md transition-all shadow-[0_0_15px_rgba(6,182,212,0.35)] cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Warp to Reality System</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
