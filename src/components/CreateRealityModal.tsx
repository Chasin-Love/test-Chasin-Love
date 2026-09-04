import React, { useState } from 'react';
import { RealityConfig, RAW_REALITIES } from '../realities';
import { X, Sparkles, Plus, Orbit, Globe, Compass, Shield, Check } from 'lucide-react';

interface CreateRealityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (params: {
    name: string;
    codeName?: string;
    spectral: string;
    description: string;
    colorA: string;
    colorB: string;
    planetsCount: number;
  }) => void;
}

export const CreateRealityModal: React.FC<CreateRealityModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [codeName, setCodeName] = useState('');
  const [spectral, setSpectral] = useState('Class B Blue Luminary · Binary Companion');
  const [colorA, setColorA] = useState('#00f5d4');
  const [colorB, setColorB] = useState('#8b5cf6');
  const [description, setDescription] = useState('');
  const [planetsCount, setPlanetsCount] = useState(5);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const generatedCode = codeName.trim() || `PARALLEL-${Math.floor(1000 + Math.random() * 9000)}`;

    onCreate({
      name: name.trim(),
      codeName: generatedCode,
      spectral,
      colorA,
      colorB,
      description: description.trim() || 'A newly synthesized custom universe branch within the sovereign multiverse.',
      planetsCount,
    });

    setName('');
    setCodeName('');
    setDescription('');
    onClose();
  };

  const presetThemes = [
    { name: 'Aurora Borealis', colorA: '#00f5d4', colorB: '#8b5cf6', spectral: 'Class A Neon Emerald' },
    { name: 'Supernova Core', colorA: '#ff0055', colorB: '#ffb703', spectral: 'Class O Stellar Flare' },
    { name: 'Deep Cyberpunk', colorA: '#38bdf8', colorB: '#ec4899', spectral: 'Class B Tachyon Radiance' },
    { name: 'Celestial Gold', colorA: '#f59e0b', colorB: '#fbbf24', spectral: 'Class G Solar Crown' },
    { name: 'Abyssal Void', colorA: '#6366f1', colorB: '#06b6d4', spectral: 'Class M Gravitational Halo' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xl animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl border border-cyan-400/30 bg-slate-950/30 backdrop-blur-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.65),0_0_40px_rgba(6,182,212,0.18),inset_0_1px_1px_rgba(255,255,255,0.2)] text-slate-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto custom-scroll select-none relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular glass reflection */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide drop-shadow-sm">Synthesize New Reality</h2>
              <p className="text-xs text-slate-300/80">
                Spawns a new parallel bubble universe with its own autonomous celestial hierarchy.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.15] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors font-bold text-sm backdrop-blur-md"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} className="flex flex-col gap-4 relative z-10">
          {/* Reality Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-cyan-300 mb-1">Reality Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Elysium Prime, Nexus-IX"
                className="w-full rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 px-3 py-2 text-xs text-white placeholder-slate-400 outline-none backdrop-blur-md transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-cyan-300 mb-1">Code Name</label>
              <input
                type="text"
                value={codeName}
                onChange={(e) => setCodeName(e.target.value)}
                placeholder="e.g. REALITY-21"
                className="w-full rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 px-3 py-2 text-xs text-white placeholder-slate-400 outline-none backdrop-blur-md transition-all font-mono"
              />
            </div>
          </div>

          {/* Spectral Classification */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-cyan-300 mb-1">Spectral Class & Core Type</label>
            <input
              type="text"
              value={spectral}
              onChange={(e) => setSpectral(e.target.value)}
              placeholder="e.g. Class O Hypergiant · Azure Accretion"
              className="w-full rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 px-3 py-2 text-xs text-white placeholder-slate-400 outline-none backdrop-blur-md transition-all font-mono"
            />
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-cyan-300 mb-1.5">Chromatic Theme Presets</label>
            <div className="flex flex-wrap gap-2">
              {presetThemes.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setColorA(preset.colorA);
                    setColorB(preset.colorB);
                    setSpectral(preset.spectral);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/40 text-[10px] text-slate-200 transition-all backdrop-blur-sm"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full shadow-inner ring-1 ring-white/20"
                    style={{ background: `linear-gradient(135deg, ${preset.colorA}, ${preset.colorB})` }}
                  />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-cyan-300 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorA}
                  onChange={(e) => setColorA(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={colorA}
                  onChange={(e) => setColorA(e.target.value)}
                  className="flex-1 rounded-xl bg-white/[0.05] border border-white/15 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-cyan-300 mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorB}
                  onChange={(e) => setColorB(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={colorB}
                  onChange={(e) => setColorB(e.target.value)}
                  className="flex-1 rounded-xl bg-white/[0.05] border border-white/15 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                />
              </div>
            </div>
          </div>

          {/* Lore Description */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-cyan-300 mb-1">Cosmological Lore</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the anomalies, star system, physics, or civilization in this reality..."
              className="w-full rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 p-3 text-xs text-slate-100 placeholder-slate-400 outline-none leading-relaxed backdrop-blur-md transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white text-xs font-medium backdrop-blur-md transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-300/40 backdrop-blur-md transition-all font-mono"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manifest Reality</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
