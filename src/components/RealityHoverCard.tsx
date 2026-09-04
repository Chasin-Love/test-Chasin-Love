import React from 'react';
import { RealityConfig, GalaxyClusterData } from '../realities';
import { Sparkles, Edit3, Compass, Orbit, ArrowRight, Layers, ChevronRight } from 'lucide-react';

interface RealityHoverCardProps {
  reality: RealityConfig;
  screenPos?: { x: number; y: number } | null;
  onEditDescription: (reality: RealityConfig) => void;
  onWarp: (realityId: string) => void;
  onInspectLineage?: (cluster: GalaxyClusterData) => void;
}

export const RealityHoverCard: React.FC<RealityHoverCardProps> = ({
  reality,
  screenPos,
  onEditDescription,
  onWarp,
  onInspectLineage,
}) => {
  // Determine smart card positioning based on cursor location
  let style: React.CSSProperties = {
    bottom: '2.5rem',
    left: '2rem',
  };

  if (screenPos && screenPos.x > 0 && screenPos.y > 0) {
    const cardWidth = 380;
    const cardHeight = 280;
    const padding = 20;

    let left = screenPos.x + 24;
    let top = screenPos.y - 40;

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

  const homeCluster = reality.clusters?.[0];

  return (
    <div
      style={style}
      className="fixed z-50 pointer-events-auto w-[380px] rounded-2xl border border-cyan-400/30 bg-slate-950/40 backdrop-blur-2xl shadow-[0_16px_45px_rgba(0,0,0,0.65),0_0_30px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.18)] p-4 text-slate-100 rise-in select-none transition-all duration-150 relative overflow-hidden group"
    >
      {/* Specular glass highlight reflection across the top */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-3.5 h-3.5 rounded-full shadow-[0_0_14px_currentColor] animate-pulse ring-2 ring-white/20"
            style={{ backgroundColor: reality.colorA, color: reality.colorA }}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-cyan-300 font-semibold drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">
                {reality.codeName || 'PARALLEL REALITY'}
              </span>
              <span className="text-[10px] text-slate-400">·</span>
              <span className="font-mono text-[8.5px] tracking-wider text-slate-300/80">
                {reality.spectral}
              </span>
            </div>
            <h3 className="font-display text-sm tracking-wider font-semibold text-white mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {reality.name}
            </h3>
          </div>
        </div>

        {/* Quick Edit Lore Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditDescription(reality);
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-300/30 hover:border-amber-300/60 text-amber-200 hover:text-amber-100 text-[10px] font-mono tracking-wider backdrop-blur-md transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
          title="Write or customize reality description"
        >
          <Edit3 className="w-2.5 h-2.5" />
          <span>Edit Lore</span>
        </button>
      </div>

      {/* Description Body - Glass Plate */}
      <div className="mt-2 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-400/20 backdrop-blur-md text-xs text-slate-200 leading-relaxed font-body max-h-20 overflow-y-auto custom-scroll shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] transition-colors relative z-10">
        <p className="whitespace-pre-line drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{reality.description}</p>
      </div>

      {/* Cosmic Lineage & Galaxy Clusters Quick Strip */}
      {homeCluster && (
        <div className="mt-2 p-2 rounded-xl bg-cyan-950/25 border border-cyan-400/20 text-[10px] relative z-10">
          <div className="flex items-center justify-between font-mono text-[8.5px] uppercase tracking-wider text-cyan-300 mb-1">
            <span className="flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" />
              <span>Galaxy Clusters & Lineage ({reality.clusters?.length || 0} Groups)</span>
            </span>
            {onInspectLineage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectLineage(homeCluster);
                }}
                className="text-amber-300 hover:text-white flex items-center gap-0.5 hover:underline font-semibold"
              >
                <span>Explore Scale</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          <div className="text-slate-300 truncate font-mono text-[9.5px]">
            <span className="text-white font-semibold">{homeCluster.name}</span>
            <span className="text-slate-400"> ➔ {homeCluster.lineage.galaxy.name} ➔ {homeCluster.lineage.spiralArm.name}</span>
          </div>
        </div>
      )}

      {/* Footer Info & Quick Actions */}
      <div className="mt-2.5 flex items-center justify-between text-[10.5px] pt-2 border-t border-white/10 text-slate-300 relative z-10">
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <Orbit className="w-3 h-3 text-cyan-400" />
          <span>{reality.bodies.length} Worlds</span>
          <span className="text-slate-500">·</span>
          <span>{reality.clusters?.length || 5} Clusters</span>
        </div>

        <button
          onClick={() => onWarp(reality.id)}
          className="flex items-center gap-1.5 text-cyan-200 hover:text-white bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 hover:border-cyan-300/70 px-3 py-1 rounded-lg text-[10.5px] font-medium backdrop-blur-md transition-all shadow-[0_0_12px_rgba(6,182,212,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)]"
        >
          <span>Warp In</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Double click prompt hint */}
      <div className="mt-1.5 text-center relative z-10">
        <span className="font-mono text-[7.5px] tracking-[0.18em] text-slate-400/80 uppercase">
          ✦ Hover orbiting moons to inspect Galaxy Clusters & Groups
        </span>
      </div>
    </div>
  );
};

