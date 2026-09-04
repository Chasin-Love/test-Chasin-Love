import React, { useState } from 'react';
import { REALITIES, getReality, RealityConfig, GalaxyClusterData, createNewRealityConfig } from '../realities';
import { actions, getState, useUniverse } from '../state';
import { Globe, Sparkles, Orbit, Layers, ChevronRight, Compass, Zap, Eye, Edit3, Shield, ShieldCheck, Flame, X, Plus, Trash2 } from 'lucide-react';
import { CreateRealityModal } from './CreateRealityModal';

interface MultiverseBarProps {
  activeRealityId: string;
  currentScaleLabel: string;
  onWarpReality: (id: string) => void;
  onZoomToMultiverse: () => void;
  onZoomToSystem: () => void;
  onZoomToHierarchy?: (stageIndex: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onEditRealityLore?: (reality: RealityConfig) => void;
  onInspectLineage?: (cluster: GalaxyClusterData) => void;
  onZoomToDemonCore?: () => void;
  onTriggerKamui?: () => void;
  onCloseBar?: () => void;
  kamuiKey?: number;
}

export const MultiverseBar: React.FC<MultiverseBarProps> = ({
  activeRealityId,
  currentScaleLabel,
  onWarpReality,
  onZoomToMultiverse,
  onZoomToSystem,
  onZoomToHierarchy,
  onZoomIn,
  onZoomOut,
  onEditRealityLore,
  onInspectLineage,
  onZoomToDemonCore,
  onTriggerKamui,
  onCloseBar,
  kamuiKey = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHierarchyBar, setShowHierarchyBar] = useState(true);
  const [selectedPreview, setSelectedPreview] = useState<RealityConfig | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const universeState = useUniverse();
  const allRealities: RealityConfig[] = REALITIES;
  const activeReality = getReality(activeRealityId, universeState.customRealityDescriptions);

  const hierarchyStages = [
    { label: 'Multiverse', short: 'Bulk', key: 'MULTIVERSE', desc: 'Omni-dimensional bulk space hosting all parallel bubble realities' },
    { label: 'Reality / Universe', short: 'Reality', key: 'REALITY', desc: 'Isolated universe continuum with unique physical parameters' },
    { label: 'Cosmic Web', short: 'Web', key: 'COSMIC WEB', desc: 'Observable universe dark matter filaments & voids' },
    { label: 'Supercluster Complex', short: 'Complex', key: 'COMPLEX', desc: 'Hyper-scale gravitational complex containing multiple superclusters' },
    { label: 'Supercluster', short: 'Supercluster', key: 'SUPERCLUSTER', desc: 'Virgo & Laniakea supercluster galaxy streams' },
    { label: 'Galaxy Cluster / Group', short: 'Cluster', key: 'GALAXY CLUSTER', desc: 'Local group, interacting galaxies & satellite cluster' },
    { label: 'Galaxy', short: 'Galaxy', key: 'SPIRAL GALAXY', desc: 'The Milliandra galactic disk & luminous core' },
    { label: 'Galactic Region', short: 'Region', key: 'REGION', desc: 'Local galactic quadrant & stellar neighborhood' },
    { label: 'Spiral Arm', short: 'Arm', key: 'SPIRAL ARM', desc: 'Local density wave spur & starburst arm' },
    { label: 'Star-Forming Region', short: 'Nursery', key: 'STAR-FORMING', desc: 'Stellar nursery & molecular cloud forge' },
    { label: 'Stellar System', short: 'System', key: 'STELLAR SYSTEM', desc: 'Planets, moons, rings & central star' },
  ];

  const activeStageIndex = hierarchyStages.findIndex(s => currentScaleLabel.toUpperCase().includes(s.key));
  const currentIdx = activeStageIndex !== -1 ? activeStageIndex : (currentScaleLabel.includes('SURFACE') || currentScaleLabel.includes('APPROACH') ? 10 : 10);

  const handleCreateReality = (params: {
    name: string;
    codeName?: string;
    spectral: string;
    description: string;
    colorA: string;
    colorB: string;
    planetsCount: number;
  }) => {
    const newConfig = createNewRealityConfig(params);
    actions.createReality(newConfig);
  };

  const handleDeleteReality = (e: React.MouseEvent, realityId: string) => {
    e.stopPropagation();
    if (realityId === 'sol-prime') {
      alert('Sol Prime is the primordial anchor reality and cannot be eliminated.');
      return;
    }
    if (window.confirm('Are you sure you want to eliminate this parallel reality branch from the multiverse?')) {
      actions.deleteReality(realityId);
      if (selectedPreview?.id === realityId) {
        setSelectedPreview(null);
      }
    }
  };

  return (
    <>
      <CreateRealityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateReality}
      />

      {/* Floating Multiverse HUD Controls at Top Center with Kamui Animation */}
      <div 
        key={kamuiKey}
        className="kamui-appear fixed top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 select-none pointer-events-none"
      >
        {/* Top Control Bar */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/15 hover:bg-slate-950/25 backdrop-blur-md border border-cyan-400/25 hover:border-cyan-400/40 rounded-full px-4 py-1.5 text-xs shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-all">
          {/* Core Controller Badge */}
          <button
            onClick={() => {
              if (onTriggerKamui) onTriggerKamui();
              if (onZoomToDemonCore) onZoomToDemonCore();
              else onZoomToMultiverse();
            }}
            className="kamui-demon-badge flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/35 hover:bg-red-900/50 border border-red-500/50 hover:border-red-400 text-red-300 hover:text-white transition-all font-mono text-[11px] font-bold shadow-[0_0_10px_rgba(255,23,68,0.35)] cursor-pointer backdrop-blur-sm"
            title="Core: The central singularity of the Multiverse. Click to trigger Kamui vortex and focus."
          >
            <span className="demon-eye-spin inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ff1744] ring-1 ring-white/80" />
            <span className="tracking-wider text-red-200">CORE</span>
          </button>

          <div className="h-3 w-[1px] bg-white/20 mx-0.5" />

          <div 
            className="w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ring-1 ring-white/30" 
            style={{ backgroundColor: activeReality.colorA, color: activeReality.colorA }}
          />
          <div className="flex items-center gap-1.5 font-medium text-slate-200">
            <span className="text-cyan-300 font-mono uppercase tracking-wider text-[10px]">REALITY:</span>
            <span className="text-white font-semibold drop-shadow-sm">{activeReality.name}</span>
            <span className="text-slate-300/80 font-mono text-[10px]">({activeReality.spectral})</span>
          </div>

          <div className="h-3 w-[1px] bg-white/15 mx-0.5" />

          {/* Dimensional Barrier Badge */}
          <div 
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border bg-cyan-950/20 border-cyan-400/25 text-cyan-300 backdrop-blur-sm shadow-[0_0_8px_rgba(6,182,212,0.1)]"
            title="Dimensional Barrier: Quantum isolation active. Stars, planets, and moons of other realities are completely filtered out."
          >
            <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
            <span className="hidden sm:inline">BARRIER:</span>
            <span className="font-semibold text-cyan-200">{currentIdx === 0 ? 'MACRO BULK' : 'ISOLATED'}</span>
          </div>

          <div className="h-3 w-[1px] bg-white/15 mx-0.5" />

          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 text-cyan-200 hover:text-white bg-white/[0.04] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 rounded-full px-3 py-1 transition-all text-[11px] font-medium backdrop-blur-sm shadow-sm cursor-pointer"
          >
            <Layers className="w-3 h-3" />
            <span>Realities ({allRealities.length})</span>
          </button>

          <button
            onClick={() => setShowHierarchyBar(!showHierarchyBar)}
            className={`flex items-center gap-1 border rounded-full px-3 py-1 transition-all text-[11px] font-medium backdrop-blur-sm shadow-sm cursor-pointer ${
              showHierarchyBar 
                ? 'text-cyan-300 bg-cyan-500/15 border-cyan-400/45' 
                : 'text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] border-white/10'
            }`}
            title="Toggle 11-Stage Cosmic Hierarchy Navigator"
          >
            <Compass className="w-3 h-3" />
            <span>Hierarchy (11)</span>
          </button>

          <div className="h-3 w-[1px] bg-white/15 mx-0.5" />

          {onZoomIn && (
            <button
              onClick={onZoomIn}
              className="flex items-center justify-center w-6 h-6 text-slate-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.15] border border-white/15 rounded-full text-xs font-bold transition-all backdrop-blur-sm cursor-pointer"
              title="Zoom In (closer view)"
            >
              +
            </button>
          )}

          {onZoomOut && (
            <button
              onClick={onZoomOut}
              className="flex items-center justify-center w-6 h-6 text-slate-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.15] border border-white/15 rounded-full text-xs font-bold transition-all backdrop-blur-sm cursor-pointer"
              title="Zoom Out (extended macro limit)"
            >
              -
            </button>
          )}

          {onCloseBar && (
            <button
              onClick={onCloseBar}
              className="flex items-center justify-center w-6 h-6 text-slate-300 hover:text-red-300 bg-white/[0.04] hover:bg-red-500/20 border border-white/10 hover:border-red-400/40 rounded-full transition-all ml-0.5 cursor-pointer backdrop-blur-sm"
              title="Retract Toolbar (Click Core at Multiverse center anytime to summon back via Kamui)"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 11-Stage Interactive Cosmic Hierarchy Breadcrumb Ribbon */}
        {showHierarchyBar && (
          <div className="pointer-events-auto flex items-center gap-1 bg-slate-950/20 hover:bg-slate-950/30 backdrop-blur-md border border-cyan-400/20 rounded-2xl px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] text-[11px] max-w-[98vw] overflow-x-auto custom-scroll transition-all">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/80 mr-1 hidden sm:inline">SCALE:</span>
            {hierarchyStages.map((stage, idx) => {
              const isActive = currentIdx === idx;
              return (
                <React.Fragment key={stage.key}>
                  {idx > 0 && (
                    <ChevronRight className="w-3 h-3 text-cyan-400/40 flex-shrink-0" />
                  )}
                  <button
                    onClick={() => onZoomToHierarchy && onZoomToHierarchy(idx)}
                    title={`Stage ${idx + 1}: ${stage.label} — ${stage.desc}`}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl whitespace-nowrap transition-all font-medium flex-shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/20 text-white border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.25)] ring-1 ring-cyan-300/30 font-semibold'
                        : 'text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/25'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold ${
                      isActive ? 'bg-cyan-400 text-slate-950 shadow-[0_0_6px_#22d3ee]' : 'bg-white/10 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="hidden md:inline">{stage.label}</span>
                    <span className="md:hidden">{stage.short}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Multiverse Reality Selector Drawer Modal - Frosted Transparent Glass */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-2xl animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-slate-950/20 backdrop-blur-3xl border border-cyan-400/25 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(6,182,212,0.12),inset_0_1px_1px_rgba(255,255,255,0.18)] flex flex-col overflow-hidden text-slate-100 relative">
            {/* Specular glass reflection */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-wide drop-shadow-sm">Parallel Realities Directory</h2>
                  <p className="text-xs text-slate-300/80">
                    {allRealities.length} parallel realities across the Multiverse. Each reality hosts its own complete 11-stage cosmic hierarchy.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/80 to-blue-600/80 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-300/40 backdrop-blur-md transition-all font-mono cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Reality</span>
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.15] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors font-bold text-sm backdrop-blur-md cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Dimensional Barrier Isolation Status Bar */}
            <div className="px-6 py-2.5 bg-cyan-950/20 border-b border-cyan-500/20 flex items-center justify-between text-xs backdrop-blur-sm">
              <div className="flex items-center gap-2 text-cyan-300 font-mono">
                <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>DIMENSIONAL BARRIER: <strong className="text-white font-semibold">STRICT QUANTUM ISOLATION ACTIVE</strong></span>
              </div>
              <span className="text-[11px] text-slate-300/80 font-mono">
                Current Anchor: <span className="text-cyan-300 font-semibold">{activeReality.name}</span>
              </span>
            </div>

            {/* Modal Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden p-4 gap-4">
              {/* Realities List */}
              <div className="md:col-span-2 overflow-y-auto pr-2 space-y-2 max-h-[58vh] custom-scroll">
                {allRealities.map((r) => {
                  const isActive = r.id === activeRealityId;
                  const isProtected = r.id === 'sol-prime';
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedPreview(r)}
                      className={`group p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between backdrop-blur-md ${
                        isActive
                          ? 'bg-cyan-500/20 border-cyan-400/70 shadow-[0_0_20px_rgba(6,182,212,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner ring-1 ring-white/20"
                          style={{
                            background: `radial-gradient(circle at 30% 30%, ${r.colorA}, ${r.colorB})`,
                          }}
                        >
                          <Sparkles className="w-4 h-4 text-white drop-shadow" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white group-hover:text-cyan-300 transition-colors text-sm">
                              {r.name}
                            </span>
                            {isActive && (
                              <span className="bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 text-[10px] px-2 py-0.5 rounded-full font-mono font-medium backdrop-blur-sm">
                                Active Reality
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300/80 line-clamp-1">{r.description}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-1">
                            <span>Code: {r.codeName}</span>
                            <span>•</span>
                            <span>{r.spectral}</span>
                            <span>•</span>
                            <span>{r.bodies.length} Celestial Bodies</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onEditRealityLore && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditRealityLore(r);
                              setIsOpen(false);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1 bg-amber-400/10 hover:bg-amber-400/20 text-amber-200 hover:text-amber-100 border border-amber-300/30 transition-all backdrop-blur-md cursor-pointer"
                            title="Edit Lore Description"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Lore</span>
                          </button>
                        )}

                        {!isProtected && (
                          <button
                            onClick={(e) => handleDeleteReality(e, r.id)}
                            className="p-1.5 rounded-lg text-xs flex items-center justify-center bg-red-500/10 hover:bg-red-500/25 text-red-300 hover:text-red-100 border border-red-500/30 transition-all backdrop-blur-md cursor-pointer"
                            title="Delete this reality branch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onWarpReality(r.id);
                            setIsOpen(false);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all backdrop-blur-md cursor-pointer ${
                            isActive
                              ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                              : 'bg-white/[0.08] hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-200 border border-white/10 hover:border-cyan-400/40'
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          <span>{isActive ? 'Current' : 'Travel'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Reality Preview Panel */}
              <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto max-h-[58vh] custom-scroll">
                {selectedPreview ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-white/20"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, ${selectedPreview.colorA}, ${selectedPreview.colorB})`,
                        }}
                      >
                        <Orbit className="w-6 h-6 text-white drop-shadow" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">{selectedPreview.name}</h3>
                        <p className="text-xs text-cyan-300 font-mono">{selectedPreview.spectral}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed bg-white/[0.04] p-3 rounded-xl border border-white/10 backdrop-blur-md">
                      {selectedPreview.description}
                    </p>

                    {/* Cosmic Lineage & Clusters */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <Layers className="w-3 h-3 text-cyan-400" />
                          <span>Galaxy Clusters & Cosmic Lineage</span>
                        </h4>
                        {onInspectLineage && selectedPreview.clusters?.[0] && (
                          <button
                            onClick={() => {
                              if (selectedPreview.clusters?.[0]) {
                                onInspectLineage(selectedPreview.clusters[0]);
                                setIsOpen(false);
                              }
                            }}
                            className="text-[10px] font-mono text-cyan-300 hover:text-white flex items-center gap-0.5 hover:underline cursor-pointer"
                          >
                            <Compass className="w-2.5 h-2.5" />
                            <span>Inspect Hierarchy</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {selectedPreview.clusters?.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              if (onInspectLineage) {
                                onInspectLineage(c);
                                setIsOpen(false);
                              }
                            }}
                            className="group/cluster p-2.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/40 transition-all cursor-pointer text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: c.color }}
                                />
                                <span className="font-semibold text-white group-hover/cluster:text-cyan-200">
                                  {c.name}
                                </span>
                              </div>
                              <span className="font-mono text-[9.5px] text-amber-300">
                                {c.galaxiesCount} galaxies
                              </span>
                            </div>
                            <div className="mt-1 font-mono text-[9px] text-slate-400 truncate pl-4">
                              <span>{c.lineage.galaxy.name}</span>
                              <span className="text-slate-600"> ➔ </span>
                              <span>{c.lineage.spiralArm.name}</span>
                              <span className="text-slate-600"> ➔ </span>
                              <span className="text-emerald-400">{c.lineage.stellarSystem.starName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">
                        Worlds in this Reality
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPreview.bodies.map((b) => (
                          <span
                            key={b.id}
                            className="text-[11px] bg-white/[0.06] border border-white/10 px-2.5 py-0.5 rounded-lg text-slate-200 backdrop-blur-sm"
                          >
                            {b.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      {onEditRealityLore && (
                        <button
                          onClick={() => {
                            onEditRealityLore(selectedPreview);
                            setIsOpen(false);
                          }}
                          className="flex-1 py-2.5 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-300/30 hover:border-amber-300/60 text-amber-200 hover:text-amber-100 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all backdrop-blur-md cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Lore</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onWarpReality(selectedPreview.id);
                          setIsOpen(false);
                        }}
                        className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] backdrop-blur-md cursor-pointer"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Travel to {selectedPreview.name}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <Eye className="w-8 h-8 mb-2 opacity-50 text-cyan-400" />
                    <p className="text-xs">Click any reality on the left to inspect its celestial structure and properties.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px] text-cyan-300">{allRealities.length} Parallel Bubble Universes Available</span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 rounded-xl text-xs backdrop-blur-md transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
