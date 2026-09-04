import React from 'react';
import { GalaxyClusterData } from '../realities';
import { Sparkles, Orbit, Layers, ArrowRight, Compass, Shield, ChevronRight } from 'lucide-react';

interface ClusterHoverCardProps {
  cluster: GalaxyClusterData;
  realityName: string;
  screenPos?: { x: number; y: number } | null;
  onInspectLineage: (cluster: GalaxyClusterData) => void;
  onWarp: (realityId: string) => void;
}

export const ClusterHoverCard: React.FC<ClusterHoverCardProps> = ({
  cluster,
  realityName,
  screenPos,
  onInspectLineage,
  onWarp,
}) => {
  // Determine smart card positioning based on cursor location
  let style: React.CSSProperties = {
    bottom: '2.5rem',
    left: '2rem',
  };

  if (screenPos && screenPos.x > 0 && screenPos.y > 0) {
    const cardWidth = 400;
    const cardHeight = 290;
    const padding = 20;

    let left = screenPos.x + 24;
    let top = screenPos.y - 50;

    // Boundary protection
    if (left + cardWidth > window.innerWidth - padding) {
      left = screenPos.x - cardWidth - 24;
    }
    if (top + cardHeight > window.innerHeight - padding) {
      top = window.innerHeight - cardHeight - padding;
    }
    if (top < padding) {
      top = padding;
    }

    style = {
      position: 'fixed',
      left: `${Math.max(padding, left)}px`,
      top: `${Math.max(padding, top)}px`,
    };
  }

  const { lineage } = cluster;

  return (
    <div
      style={style}
      className="fixed z-50 pointer-events-auto w-[400px] rounded-2xl border border-cyan-400/40 bg-slate-950/45 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.7),0_0_35px_rgba(6,182,212,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] p-4 text-slate-100 rise-in select-none transition-all duration-150 relative overflow-hidden group"
    >
      {/* Specular glass highlight reflection */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-4 h-4 rounded-full shadow-[0_0_16px_currentColor] animate-pulse ring-2 ring-white/30"
            style={{ backgroundColor: cluster.color, color: cluster.color }}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-cyan-300 font-semibold drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">
                {cluster.code}
              </span>
              <span className="text-[10px] text-slate-400">·</span>
              <span className="font-mono text-[8.5px] tracking-wider text-amber-300 font-medium">
                {cluster.type}
              </span>
            </div>
            <h3 className="font-display text-sm tracking-wider font-semibold text-white mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {cluster.name}
            </h3>
          </div>
        </div>

        {cluster.isHomeCluster ? (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[9.5px] font-mono tracking-wider backdrop-blur-md">
            ✦ Home Cluster
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/50 border border-white/10 text-slate-300 text-[9.5px] font-mono tracking-wider backdrop-blur-md">
            Parallel Node
          </span>
        )}
      </div>

      {/* Cluster Stats Pill */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/10 relative z-10 text-slate-300">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>{cluster.galaxiesCount} Member Galaxies</span>
        </div>
        <div className="text-slate-400">
          Span: <span className="text-slate-200">{lineage.galaxyCluster.diameterMly}</span>
        </div>
      </div>

      {/* Cosmic Lineage Breadcrumb & Breakdown */}
      <div className="mt-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 relative z-10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-cyan-300 font-semibold">
            COSMIC NESTING LINEAGE
          </span>
          <span className="font-mono text-[8px] text-slate-400">{realityName}</span>
        </div>

        <div className="space-y-1 text-[10.5px]">
          {/* Step 1: Galaxy Cluster */}
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-cyan-400 text-[9px] font-mono font-bold w-3">1.</span>
            <span className="font-semibold text-white truncate max-w-[130px]">{cluster.name}</span>
            <ChevronRight className="w-2.5 h-2.5 text-slate-500 shrink-0" />
            <span className="text-slate-400 truncate text-[9.5px]">{lineage.galaxy.name}</span>
          </div>

          {/* Step 2: Galactic Region & Spiral Arm */}
          <div className="flex items-center gap-1 text-slate-300 pl-4 text-[10px]">
            <ChevronRight className="w-2.5 h-2.5 text-cyan-500 shrink-0" />
            <span className="text-cyan-200 truncate">{lineage.galacticRegion.name}</span>
            <span className="text-slate-500">·</span>
            <span className="text-amber-200 truncate">{lineage.spiralArm.name}</span>
          </div>

          {/* Step 3: Star-Forming Region -> Stellar System */}
          <div className="flex items-center gap-1 text-slate-300 pl-4 text-[10px]">
            <ChevronRight className="w-2.5 h-2.5 text-amber-500 shrink-0" />
            <span className="text-pink-200 truncate">{lineage.starFormingRegion.name}</span>
            <span className="text-slate-500">➔</span>
            <span className="font-semibold text-emerald-300 truncate">{lineage.stellarSystem.starName}</span>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10 relative z-10">
        <button
          onClick={() => onInspectLineage(cluster)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-slate-200 hover:text-cyan-200 text-[10.5px] font-mono transition-all backdrop-blur-md"
        >
          <Compass className="w-3 h-3 text-cyan-400" />
          <span>Inspect Full Hierarchy</span>
        </button>

        <button
          onClick={() => onWarp(cluster.realityId)}
          className="flex items-center gap-1.5 text-cyan-950 font-bold bg-cyan-400 hover:bg-cyan-300 px-3 py-1.5 rounded-lg text-[10.5px] backdrop-blur-md transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)]"
        >
          <span>Warp to Reality</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="mt-1.5 text-center relative z-10">
        <span className="font-mono text-[7.5px] tracking-[0.18em] text-slate-400/80 uppercase">
          ✦ Click node to explore full astronomical scale
        </span>
      </div>
    </div>
  );
};
