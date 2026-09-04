import React, { useState, useEffect } from 'react';
import { RealityConfig, RAW_REALITIES } from '../realities';
import { X, Sparkles, Save, RotateCcw, BookOpen, Compass, Check } from 'lucide-react';

interface EditRealityModalProps {
  reality: RealityConfig | null;
  onClose: () => void;
  onSave: (realityId: string, description: string) => void;
  onReset: (realityId: string) => void;
}

export const EditRealityModal: React.FC<EditRealityModalProps> = ({
  reality,
  onClose,
  onSave,
  onReset,
}) => {
  const [description, setDescription] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (reality) {
      setDescription(reality.description || '');
      setSavedToast(false);
    }
  }, [reality]);

  if (!reality) return null;

  const rawDefault = RAW_REALITIES.find((r) => r.id === reality.id);
  const defaultDescription = rawDefault ? rawDefault.description : '';

  const handleSave = () => {
    onSave(reality.id, description);
    setSavedToast(true);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const handleReset = () => {
    onReset(reality.id);
    setDescription(defaultDescription);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const loreInspirations = [
    {
      title: 'Quantum Divergence',
      snippet: 'A universe where the cosmological constant underwent symmetric spontaneous breaking during inflation, forging crystalline nebular corridors and exotic energy fields.',
    },
    {
      title: 'Dyson Megastructures',
      snippet: 'An advanced Kardashev-II stellar manifold enclosed in nested geometric megastructures, extracting the full thermodynamic luminosity of the central anchor star.',
    },
    {
      title: 'Primordial Biolume',
      snippet: 'A warm, radiant stellar cradle harboring oceanic gas giants with bioluminescent microbial atmospheric clouds that pulse with harmonic planetary resonance.',
    },
    {
      title: 'Eventide Singularity',
      snippet: 'A spacetime bubble bordering the event horizon of a primordial supermassive singularity, warping time dilation and preserving quantum memories indefinitely.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-fade-in"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl border border-cyan-400/30 bg-slate-950/40 backdrop-blur-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(6,182,212,0.15),inset_0_1px_1px_rgba(255,255,255,0.2)] text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto custom-scroll select-none relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular glass reflection */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div
              className="w-9 h-9 rounded-2xl shadow-[0_0_20px_currentColor] flex items-center justify-center border border-white/30 backdrop-blur-md"
              style={{
                background: `linear-gradient(135deg, ${reality.colorA}cc, ${reality.colorB}88)`,
                color: reality.colorA,
              }}
            >
              <Compass className="w-4.5 h-4.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-cyan-300 font-semibold px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 backdrop-blur-md shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  {reality.codeName || 'PARALLEL REALITY'}
                </span>
                <span className="font-mono text-[9.5px] tracking-wider text-slate-300">
                  {reality.spectral}
                </span>
              </div>
              <h2 className="font-display text-lg tracking-wider font-bold text-white mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {reality.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 transition-all backdrop-blur-md"
            title="Close editor"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Description Editor Section */}
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-cyan-300">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cosmological Lore & Description</span>
            </label>
            <span className="font-mono text-[10px] text-slate-400">
              {description.length} characters
            </span>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Write down the history, physics, civilization lore, or anomalies of this reality..."
            className="w-full rounded-2xl bg-white/[0.05] hover:bg-white/[0.07] border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 p-4 text-sm text-slate-100 placeholder-slate-400 outline-none leading-relaxed transition-all resize-y min-h-[120px] backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
            autoFocus
          />
        </div>

        {/* Quick Lore Inspirations */}
        <div className="flex flex-col gap-2 bg-white/[0.03] border border-white/10 p-4 rounded-2xl backdrop-blur-md relative z-10">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Lore Inspirations (Click to append or adopt)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {loreInspirations.map((insp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDescription((prev) =>
                    prev.trim()
                      ? `${prev.trim()}\n\n${insp.snippet}`
                      : insp.snippet
                  );
                }}
                className="text-left p-2.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/40 transition-all text-[11px] group backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
              >
                <div className="font-medium text-slate-200 group-hover:text-cyan-200 flex items-center justify-between">
                  <span>{insp.title}</span>
                  <span className="text-[9px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                    + Add
                  </span>
                </div>
                <p className="text-slate-400 text-[10px] mt-1 line-clamp-2 leading-relaxed">
                  {insp.snippet}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 relative z-10">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-slate-300 hover:text-white text-xs font-medium backdrop-blur-md transition-all shadow-sm"
            title="Reset description to canon default"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white text-xs font-medium backdrop-blur-md transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/80 to-blue-600/80 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(6,182,212,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-cyan-300/40 backdrop-blur-md transition-all font-mono tracking-wider"
            >
              {savedToast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Lore</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
