import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CosmicWebSettings {
  mode: 'simulation' | 'observational';
  showMatterDensity: boolean;
  showDarkMatterHalos: boolean;
  showFilaments: boolean;
  showVoidBoundaries: boolean;
  showClusterMass: boolean;
  showRedshift: boolean;
  showCoordinates: boolean;
}

interface CosmicWebHUDProps {
  settings: CosmicWebSettings;
  onUpdateSettings: (newSettings: Partial<CosmicWebSettings>) => void;
  scaleLabel: string;
}

export const CosmicWebHUD: React.FC<CosmicWebHUDProps> = ({
  settings,
  onUpdateSettings,
  scaleLabel,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Map scale label to hierarchical level
  const getLODInfo = (label: string) => {
    const l = label.toUpperCase();
    if (l.includes('MULTIVERSE') || l.includes('MACRO') || l.includes('UNIVERSE')) {
      return { level: 'LEVEL 0', name: 'Observable Universe Scale', distance: '~28.5 Gpc (93 Gly)', unit: 'Gigaparsec (Gpc)' };
    } else if (l.includes('WEB') || l.includes('COSMIC')) {
      return { level: 'LEVEL 1', name: 'Large-Scale Cosmic Web', distance: '~500 Mpc', unit: 'Megaparsec (Mpc)' };
    } else if (l.includes('SUPERCLUSTER') || l.includes('BEACON')) {
      return { level: 'LEVEL 2', name: 'Filament & Void Complex', distance: '~50 Mpc', unit: 'Megaparsec (Mpc)' };
    } else if (l.includes('CLUSTER')) {
      return { level: 'LEVEL 3', name: 'Galaxy Cluster / Node', distance: '~5 Mpc', unit: 'Megaparsec (Mpc)' };
    } else if (l.includes('NEIGHBORHOOD') || l.includes('GROUP')) {
      return { level: 'LEVEL 4', name: 'Galaxy Group Scale', distance: '~1 Mpc', unit: 'Kiloparsec (kpc)' };
    } else if (l.includes('GALACTIC') || l.includes('GALAXY')) {
      return { level: 'LEVEL 5', name: 'Galactic Scale', distance: '~30 kpc', unit: 'Kiloparsec (kpc)' };
    } else {
      return { level: 'LEVEL 6', name: 'Personal Universe / Thought System', distance: '~1 AU / Local', unit: 'Astronomical Unit (AU)' };
    }
  };

  const lod = getLODInfo(scaleLabel);

  return (
    <div className="fixed top-20 right-4 z-40 flex flex-col items-end pointer-events-auto select-none font-mono text-xs">
      {/* Quick Scientific HUD Pill */}
      <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 rounded-lg p-2 shadow-2xl text-cyan-200">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-[10px] uppercase tracking-wider text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {settings.mode === 'simulation' ? 'MODE B: COSMOLOGICAL SIMULATION' : 'MODE A: OBSERVATIONAL SURVEY'}
        </div>

        <div className="h-4 w-px bg-cyan-800/50" />

        <div className="text-[11px] font-semibold text-slate-300">
          <span className="text-cyan-400">{lod.level}:</span> {lod.name}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors border border-slate-700"
        >
          {expanded ? 'Hide Control Panel ▲' : 'Scientific HUD ▼'}
        </button>
      </div>

      {/* Expanded Control Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mt-2 w-80 bg-slate-950/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-4 shadow-2xl text-slate-300 space-y-4"
          >
            {/* Mode Switcher */}
            <div>
              <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-1 font-bold">
                VISUALIZATION MODE
              </div>
              <div className="grid grid-cols-2 gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => onUpdateSettings({ mode: 'observational' })}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium transition-all ${
                    settings.mode === 'observational'
                      ? 'bg-cyan-500 text-slate-950 shadow font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Observational
                </button>
                <button
                  onClick={() => onUpdateSettings({ mode: 'simulation' })}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium transition-all ${
                    settings.mode === 'simulation'
                      ? 'bg-cyan-500 text-slate-950 shadow font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Simulation
                </button>
              </div>
            </div>

            {/* Scale & Co-moving Info */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Co-moving Scale:</span>
                <span className="text-cyan-300 font-bold">{lod.distance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Primary Unit:</span>
                <span className="text-slate-200">{lod.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Structure Type:</span>
                <span className="text-emerald-400">Anisotropic Filamentary</span>
              </div>
            </div>

            {/* Analytical Overlays Toggle List */}
            <div>
              <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-2 font-bold">
                ANALYTICAL OVERLAYS
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/60 cursor-pointer">
                  <span className="text-slate-300">Continuous Matter Density</span>
                  <input
                    type="checkbox"
                    checked={settings.showMatterDensity}
                    onChange={(e) => onUpdateSettings({ showMatterDensity: e.target.checked })}
                    className="accent-cyan-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/60 cursor-pointer">
                  <span className="text-slate-300">Dark Matter Halos (Inferred)</span>
                  <input
                    type="checkbox"
                    checked={settings.showDarkMatterHalos}
                    onChange={(e) => onUpdateSettings({ showDarkMatterHalos: e.target.checked })}
                    className="accent-cyan-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/60 cursor-pointer">
                  <span className="text-slate-300">Filament Cross-Sections</span>
                  <input
                    type="checkbox"
                    checked={settings.showFilaments}
                    onChange={(e) => onUpdateSettings({ showFilaments: e.target.checked })}
                    className="accent-cyan-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/60 cursor-pointer">
                  <span className="text-slate-300">Cosmic Void Boundaries</span>
                  <input
                    type="checkbox"
                    checked={settings.showVoidBoundaries}
                    onChange={(e) => onUpdateSettings({ showVoidBoundaries: e.target.checked })}
                    className="accent-cyan-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/60 cursor-pointer">
                  <span className="text-slate-300">Cluster Mass Concentrations</span>
                  <input
                    type="checkbox"
                    checked={settings.showClusterMass}
                    onChange={(e) => onUpdateSettings({ showClusterMass: e.target.checked })}
                    className="accent-cyan-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/60 cursor-pointer">
                  <span className="text-slate-300">Cosmological Redshift Grid</span>
                  <input
                    type="checkbox"
                    checked={settings.showRedshift}
                    onChange={(e) => onUpdateSettings({ showRedshift: e.target.checked })}
                    className="accent-cyan-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/60 cursor-pointer">
                  <span className="text-slate-300">Co-moving Coordinates</span>
                  <input
                    type="checkbox"
                    checked={settings.showCoordinates}
                    onChange={(e) => onUpdateSettings({ showCoordinates: e.target.checked })}
                    className="accent-cyan-500 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Scientific Watermark / Disclaimer */}
            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 italic leading-relaxed">
              * Data structures represent continuous N-body gravitational density fields (IllustrisTNG / Millennium Model).
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
