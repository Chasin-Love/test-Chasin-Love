/* -------------------------------------------------------------------------- */
/*                  ASTROPHYSICS TELEMETRY & PHYSICS HUD                      */
/* -------------------------------------------------------------------------- */

import React, { useState } from 'react';
import type { CosmicBody } from '../types';
import { calculatePhysics, type BodyPhysicsData } from '../physics/physicsEngine';

interface PhysicsHUDProps {
  body: CosmicBody;
  onClose?: () => void;
}

export const PhysicsHUD: React.FC<PhysicsHUDProps> = ({ body, onClose }) => {
  const [activeTab, setActiveTab] = useState<'orbital' | 'gravity' | 'thermo' | 'relativity' | 'galaxy' | 'laws'>('orbital');
  const phys: BodyPhysicsData = calculatePhysics(body);

  const fmtNum = (num: number, dec: number = 2) => {
    if (isNaN(num)) return '0';
    if (Math.abs(num) >= 1e9) return num.toExponential(3);
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(dec) + 'M';
    if (Math.abs(num) < 0.001 && num !== 0) return num.toExponential(3);
    return num.toLocaleString(undefined, { maximumFractionDigits: dec });
  };

  return (
    <div className="w-full bg-slate-950/90 border border-teal-ice/30 rounded-xl p-4 shadow-2xl text-paper font-sans text-xs max-w-md animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-paper/15">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-ice animate-pulse" />
          <h3 className="font-mono text-sm tracking-widest uppercase text-teal-ice font-bold">
            {body.name} · ASTROPHYSICS TELEMETRY
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-paper/50 hover:text-paper font-mono text-xs px-2 py-0.5 rounded hover:bg-paper/10"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 mt-3 pb-2 border-b border-paper/10 text-[10px] font-mono tracking-wider uppercase">
        <button
          onClick={() => setActiveTab('orbital')}
          className={`px-2.5 py-1 rounded transition-colors ${
            activeTab === 'orbital' ? 'bg-teal-ice/20 text-teal-ice font-bold border border-teal-ice/40' : 'text-paper/60 hover:text-paper'
          }`}
        >
          Orbital
        </button>
        <button
          onClick={() => setActiveTab('gravity')}
          className={`px-2.5 py-1 rounded transition-colors ${
            activeTab === 'gravity' ? 'bg-teal-ice/20 text-teal-ice font-bold border border-teal-ice/40' : 'text-paper/60 hover:text-paper'
          }`}
        >
          Gravity
        </button>
        <button
          onClick={() => setActiveTab('thermo')}
          className={`px-2.5 py-1 rounded transition-colors ${
            activeTab === 'thermo' ? 'bg-teal-ice/20 text-teal-ice font-bold border border-teal-ice/40' : 'text-paper/60 hover:text-paper'
          }`}
        >
          Thermo
        </button>
        {phys.isRelativistic && (
          <button
            onClick={() => setActiveTab('relativity')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'relativity' ? 'bg-solar/20 text-solar font-bold border border-solar/40' : 'text-paper/60 hover:text-paper'
            }`}
          >
            Relativity
          </button>
        )}
        <button
          onClick={() => setActiveTab('galaxy')}
          className={`px-2.5 py-1 rounded transition-colors ${
            activeTab === 'galaxy' ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40' : 'text-paper/60 hover:text-paper'
          }`}
        >
          Spin & Galaxy
        </button>
        <button
          onClick={() => setActiveTab('laws')}
          className={`px-2.5 py-1 rounded transition-colors ${
            activeTab === 'laws' ? 'bg-teal-ice/20 text-teal-ice font-bold border border-teal-ice/40' : 'text-paper/60 hover:text-paper'
          }`}
        >
          Laws
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-3 space-y-2.5">
        {/* 1. KEPLERIAN ORBITAL DYNAMICS */}
        {activeTab === 'orbital' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Semi-Major Axis (a)</span>
                <span className="font-mono text-sm text-paper font-semibold">{fmtNum(phys.a_AU)} AU</span>
                <span className="text-paper/40 text-[9px] block">({fmtNum(phys.a_AU * 149.6, 1)} M km)</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Orbital Period (T)</span>
                <span className="font-mono text-sm text-teal-ice font-semibold">{fmtNum(phys.periodDays, 1)} Days</span>
                <span className="text-paper/40 text-[9px] block">({fmtNum(phys.periodYears, 2)} Earth yrs)</span>
              </div>
            </div>

            <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
              <div className="flex justify-between items-center text-[10px] font-mono text-paper/70 mb-1">
                <span>Orbital Eccentricity (e): <strong className="text-paper">{phys.eccentricity.toFixed(4)}</strong></span>
                <span>{phys.eccentricity < 0.05 ? 'Near Circular' : 'Elliptical'}</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-teal-ice h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, phys.eccentricity * 100 * 3)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-paper/40 mt-1">
                <span>Periapsis: {fmtNum(phys.periapsisAU)} AU</span>
                <span>Apoapsis: {fmtNum(phys.apoapsisAU)} AU</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Vis-Viva Orbital Velocity</span>
                <span className="font-mono text-sm text-solar font-semibold">{fmtNum(phys.currentVelocityKms, 2)} km/s</span>
                <span className="text-paper/40 text-[9px] block">Mean: {fmtNum(phys.meanVelocityKms, 2)} km/s</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Kepler 3rd Law Test</span>
                <span className="font-mono text-xs text-paper/90 font-semibold">T² / a³ = 1.000</span>
                <span className="text-paper/40 text-[9px] block">Central Mass: 1.0 M☉</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. NEWTONIAN GRAVITY & GRAVITATIONAL FORCES */}
        {activeTab === 'gravity' && (
          <div className="space-y-2">
            <div className="bg-slate-900/80 p-2.5 rounded border border-solar/40">
              <span className="font-mono text-[9.5px] uppercase font-bold text-solar block mb-1">
                NEWTON'S INVERSE-SQUARE GRAVITATIONAL FORCE (F_g = G·m₁·m₂ / r²)
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-paper/60 text-[10px]">Attraction to Star:</span>
                <span className="font-mono text-sm font-bold text-solar">{phys.gravitationalForceN.toExponential(3)} N</span>
              </div>
              <div className="flex items-baseline justify-between mt-1 text-[10px]">
                <span className="text-paper/60">Centripetal Force (m·v²/r):</span>
                <span className="font-mono text-teal-ice font-semibold">{phys.centripetalForceN.toExponential(3)} N</span>
              </div>
              <div className="flex items-baseline justify-between mt-1 text-[10px]">
                <span className="text-paper/60">Gravitational Potential (U):</span>
                <span className="font-mono text-paper font-semibold">{phys.gravitationalPotentialJ.toExponential(3)} J</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Surface Gravity (g)</span>
                <span className="font-mono text-sm text-solar font-semibold">{fmtNum(phys.surfaceGravityMs2, 2)} m/s²</span>
                <span className="text-paper/40 text-[9px] block">({fmtNum(phys.surfaceGravityRelative, 2)} g Earth)</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Orbital Field Acceleration</span>
                <span className="font-mono text-sm text-teal-ice font-semibold">{phys.orbitalFieldMs2.toExponential(2)} m/s²</span>
                <span className="text-paper/40 text-[9px] block">g(r) at {fmtNum(phys.a_AU, 2)} AU</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Mass (M)</span>
                <span className="font-mono text-sm text-paper font-semibold">{fmtNum(phys.massEarth, 2)} M⊕</span>
                <span className="text-paper/40 text-[9px] block">({phys.massKg.toExponential(2)} kg)</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Escape Velocity (v_esc)</span>
                <span className="font-mono text-sm text-teal-ice font-semibold">{fmtNum(phys.escapeVelocityKms, 2)} km/s</span>
                <span className="text-paper/40 text-[9px] block">√(2GM / R)</span>
              </div>
            </div>

            <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
              <span className="text-paper/50 font-mono text-[9px] uppercase block mb-0.5">Mean Density & Composition</span>
              <span className="font-mono text-xs text-paper font-semibold">{phys.densityGcm3.toFixed(2)} g/cm³</span>
              <span className="text-paper/40 text-[9px] ml-2">
                {phys.densityGcm3 > 4 ? 'Terrestrial Silicate/Iron Core' : phys.densityGcm3 > 1.5 ? 'Water-Ice Complex' : 'Gas Giant Envelope'}
              </span>
            </div>
          </div>
        )}

        {/* 3. THERMODYNAMICS & CLIMATE */}
        {activeTab === 'thermo' && (
          <div className="space-y-2">
            <div className="bg-slate-900/60 p-2.5 rounded border border-paper/10">
              <div className="flex justify-between items-center mb-1">
                <span className="text-paper/50 font-mono text-[9px] uppercase">Equilibrium Surface Temp</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  phys.habitableStatus.includes('Goldilocks') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                  phys.habitableStatus.includes('Too Hot') ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                  'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                }`}>
                  {phys.habitableStatus}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-lg text-solar font-bold">{fmtNum(phys.eqTempKelvin, 1)} K</span>
                <span className="font-mono text-sm text-paper/70">({fmtNum(phys.eqTempCelsius, 1)} °C)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Stellar Insolation (S)</span>
                <span className="font-mono text-sm text-paper font-semibold">{fmtNum(phys.stellarFluxWm2, 1)} W/m²</span>
                <span className="text-paper/40 text-[9px] block">({fmtNum(phys.solarFluxRelative, 2)} S☉)</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Bond Albedo (A)</span>
                <span className="font-mono text-sm text-teal-ice font-semibold">{(phys.albedo * 100).toFixed(0)}%</span>
                <span className="text-paper/40 text-[9px] block">Reflectivity</span>
              </div>
            </div>

            {phys.rocheLimitKm > 0 && (
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-paper/50 font-mono uppercase">Fluid Roche Limit</span>
                  <span className="font-mono text-paper">{fmtNum(phys.rocheLimitKm, 0)} km</span>
                </div>
                {body.rings && (
                  <p className="text-[9px] text-teal-ice mt-1">
                    ✓ Ring system exists inside the Roche Limit ({fmtNum(phys.radiusKm * 1.45, 0)} km &lt; {fmtNum(phys.rocheLimitKm, 0)} km) — Tidal destruction verified.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. GENERAL RELATIVITY (Black Hole) */}
        {activeTab === 'relativity' && phys.isRelativistic && (
          <div className="space-y-2">
            <div className="bg-slate-950/80 p-2.5 rounded border border-solar/40 text-solar">
              <span className="font-mono text-[10px] uppercase font-bold block mb-1">GENERAL RELATIVITY METRICS</span>
              <p className="text-[10.5px] text-paper/80 leading-relaxed">
                Schwarzschild spacetime geometry calculated for 10 Solar Mass black hole core.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Schwarzschild Radius (R_s)</span>
                <span className="font-mono text-sm text-solar font-semibold">{fmtNum(phys.schwarzschildRadiusKm ?? 29.5, 2)} km</span>
                <span className="text-paper/40 text-[9px] block">Event Horizon</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Photon Sphere (1.5 R_s)</span>
                <span className="font-mono text-sm text-teal-ice font-semibold">{fmtNum(phys.photonSphereKm ?? 44.25, 2)} km</span>
                <span className="text-paper/40 text-[9px] block">Light Orbits</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">ISCO (3 R_s)</span>
                <span className="font-mono text-sm text-paper font-semibold">{fmtNum(phys.iscoKm ?? 88.5, 2)} km</span>
                <span className="text-paper/40 text-[9px] block">Innermost Stable Orbit</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Time Dilation (r=2 R_s)</span>
                <span className="font-mono text-sm text-solar font-semibold">dτ/dt = {fmtNum(phys.timeDilationFactor ?? 0.707, 3)}</span>
                <span className="text-paper/40 text-[9px] block">Clocks run 29.3% slower</span>
              </div>
            </div>
          </div>
        )}

        {/* 5. AXIAL SPIN & GALACTIC ORBIT */}
        {activeTab === 'galaxy' && (
          <div className="space-y-2">
            <div className="bg-slate-900/80 p-2.5 rounded border border-amber-400/40">
              <span className="font-mono text-[9.5px] uppercase font-bold text-amber-300 block mb-1">
                STELLAR AXIAL ROTATION & GALACTIC DYNAMICS
              </span>
              <p className="text-[10px] text-paper/80 leading-relaxed">
                {body.kind === 'star'
                  ? 'Anchor Star rotates on its polar axis (7.25° solar obliquity tilt) while orbiting the Galactic Core (Sagittarius A*).'
                  : `${body.name} rotates on its rotational axis while following Anchor Star on its galactic trajectory around the Milky Way.`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Axial Spin Period (T_spin)</span>
                <span className="font-mono text-sm text-solar font-semibold">{fmtNum(phys.axialRotationPeriodDays, 2)} Days</span>
                <span className="text-paper/40 text-[9px] block">Equatorial Sidereal Rotation</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Equatorial Spin Speed</span>
                <span className="font-mono text-sm text-teal-ice font-semibold">{fmtNum(phys.axialSpinVelocityKms, 3)} km/s</span>
                <span className="text-paper/40 text-[9px] block">({fmtNum(phys.axialSpinVelocityKms * 3600, 0)} km/h)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Axial Obliquity Tilt</span>
                <span className="font-mono text-sm text-paper font-semibold">{fmtNum(phys.axialTiltDeg, 2)}°</span>
                <span className="text-paper/40 text-[9px] block">Tilt to Ecliptic Plane</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Galactic Orbital Radius</span>
                <span className="font-mono text-sm text-amber-300 font-semibold">{fmtNum(phys.galacticRadiusKpc, 2)} kpc</span>
                <span className="text-paper/40 text-[9px] block">~26,700 Light-Years</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Galactic Orbital Speed</span>
                <span className="font-mono text-sm text-teal-ice font-semibold">{fmtNum(phys.galacticVelocityKms, 0)} km/s</span>
                <span className="text-paper/40 text-[9px] block">Driven by Dark Matter Halo</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
                <span className="text-paper/50 font-mono text-[9px] uppercase block">Cosmic / Galactic Year</span>
                <span className="font-mono text-sm text-solar font-semibold">{fmtNum(phys.galacticYearMillionYrs, 0)} Million Yrs</span>
                <span className="text-paper/40 text-[9px] block">1 Orbit around Sgr A*</span>
              </div>
            </div>

            <div className="bg-slate-900/60 p-2 rounded border border-paper/10 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-paper/50 font-mono uppercase">Galactic Central Black Hole</span>
                <span className="font-mono text-solar font-bold">Sagittarius A* ({phys.supermassiveBlackHoleMassSun.toExponential(2)} M☉)</span>
              </div>
            </div>
          </div>
        )}

        {/* 6. ASTROPHYSICS LAWS & FORMULAS */}
        {activeTab === 'laws' && (
          <div className="space-y-2 text-[10px]">
            <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
              <span className="font-mono text-teal-ice font-bold block mb-0.5">KEPLER'S 3RD LAW OF PLANETARY MOTION</span>
              <p className="font-mono text-solar text-xs my-1">T² = (4π² / G M) · a³</p>
              <p className="text-paper/70 text-[9.5px]">
                The square of the orbital period is proportional to the cube of the semi-major axis.
              </p>
            </div>

            <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
              <span className="font-mono text-teal-ice font-bold block mb-0.5">VIS-VIVA ORBITAL VELOCITY EQUATION</span>
              <p className="font-mono text-solar text-xs my-1">v² = G M · (2/r - 1/a)</p>
              <p className="text-paper/70 text-[9.5px]">
                Computes real-time orbital velocity as distance r changes in an elliptical orbit.
              </p>
            </div>

            <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
              <span className="font-mono text-teal-ice font-bold block mb-0.5">STEFAN-BOLTZMANN & equilibrium TEMP</span>
              <p className="font-mono text-solar text-xs my-1">T_eq = T_* · √(R_* / 2d) · (1 - A)^(1/4)</p>
              <p className="text-paper/70 text-[9.5px]">
                Relates stellar radiation flux and planetary albedo to thermal equilibrium temperature.
              </p>
            </div>

            <div className="bg-slate-900/60 p-2 rounded border border-paper/10">
              <span className="font-mono text-teal-ice font-bold block mb-0.5">NEWTON'S UNIVERSAL GRAVITATION</span>
              <p className="font-mono text-solar text-xs my-1">g = G M / R²  ·  v_esc = √(2 G M / R)</p>
              <p className="text-paper/70 text-[9.5px]">
                Governs surface acceleration and velocity required to break free of gravitational potential.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
