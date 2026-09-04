/* -------------------------------------------------------------------------- */
/*             REAL UNIVERSE PHYSICS ENGINE & ASTROPHYSICS LAWS              */
/* -------------------------------------------------------------------------- */

import type { CosmicBody } from '../types';

/* Physical Constants (SI & Astronomical) */
export const CONSTANTS = {
  G: 6.67430e-11,                 /* Gravitational Constant m^3 kg^-1 s^-2 */
  c: 299792458,                   /* Speed of light m/s */
  sigma: 5.670374e-8,             /* Stefan-Boltzmann Constant W m^-2 K^-4 */
  b_wien: 2.8977719e-3,           /* Wien's displacement constant m K */
  M_sun: 1.98847e30,              /* Solar Mass kg */
  R_sun: 6.96342e8,               /* Solar Radius m */
  L_sun: 3.828e26,                /* Solar Luminosity W */
  T_sun: 5778,                    /* Solar Effective Temperature K */
  M_earth: 5.9722e24,             /* Earth Mass kg */
  R_earth: 6.371e6,               /* Earth Mean Radius m */
  AU: 1.495978707e11,             /* Astronomical Unit m */
  g_earth: 9.80665,               /* Standard Earth Surface Gravity m/s^2 */
};

export interface BodyPhysicsData {
  /* Orbital Physics (Kepler's Laws) */
  a_AU: number;                   /* Semi-major axis in Astronomical Units */
  eccentricity: number;           /* Orbital Eccentricity (0 = circle, <1 = ellipse) */
  periodDays: number;             /* Kepler's 3rd Law Orbital Period in Earth Days */
  periodYears: number;            /* Kepler's 3rd Law Orbital Period in Earth Years */
  periapsisAU: number;            /* Periapsis (closest distance to star) */
  apoapsisAU: number;             /* Apoapsis (furthest distance from star) */
  currentDistanceAU: number;      /* Instantaneous distance r(t) */
  currentVelocityKms: number;     /* Vis-Viva Instantaneous Orbital Velocity km/s */
  meanVelocityKms: number;        /* Average orbital speed km/s */

  /* Mass, Density & Surface Gravity (Newton's Gravitation) */
  radiusKm: number;               /* Estimated mean radius in km */
  radiusEarth: number;            /* Radius in Earth Radii */
  densityGcm3: number;            /* Mean density in g/cm^3 */
  massKg: number;                 /* Calculated Mass in kg */
  massEarth: number;              /* Mass in Earth Masses */
  surfaceGravityMs2: number;      /* Surface Gravity g in m/s^2 */
  surfaceGravityRelative: number; /* Relative to Earth g (1.0 = Earth) */
  escapeVelocityKms: number;      /* Escape Velocity in km/s */

  /* Gravitational Attraction & Force Vectors (Newton's Law of Gravitation: F = G*m1*m2/r^2) */
  gravitationalForceN: number;    /* Instantaneous Gravitational Force exerted by Central Star (Newtons) */
  gravitationalPotentialJ: number;/* Gravitational Potential Energy U = -G*m1*m2/r (Joules) */
  orbitalFieldMs2: number;        /* Gravitational Acceleration Field g(r) at distance r (m/s^2) */
  centripetalForceN: number;      /* Centripetal Force F_c = m*v^2/r (Newtons, equals F_g) */

  /* Thermodynamics & Spectral Physics (Stefan-Boltzmann & Wien) */
  stellarFluxWm2: number;         /* Solar Radiation Intensity W/m^2 */
  solarFluxRelative: number;      /* Relative to Earth Solar Constant (1361 W/m^2) */
  albedo: number;                 /* Bond Albedo (reflection fraction 0..1) */
  eqTempKelvin: number;           /* Equilibrium Surface Temperature in Kelvin */
  eqTempCelsius: number;          /* Equilibrium Surface Temperature in Celsius */
  habitableStatus: 'Too Hot' | 'Goldilocks (Habitable)' | 'Frozen Outer Realm';

  /* Tidal & Roche Physics */
  rocheLimitKm: number;           /* Fluid Roche Limit distance for satellites */
  ringsInsideRoche: boolean;      /* Verification of ring disruption physics */

  /* General Relativity (Black Holes & Universal Vaults) */
  isRelativistic: boolean;
  schwarzschildRadiusKm?: number; /* Event Horizon Radius R_s */
  photonSphereKm?: number;        /* Photon Sphere Radius (1.5 R_s) */
  iscoKm?: number;                /* Innermost Stable Circular Orbit (3 R_s) */
  timeDilationFactor?: number;    /* Gravitational time dilation factor at 2 R_s */

  /* Solar/Stellar Axial Spin & Galactic Orbit Telemetry */
  axialRotationPeriodDays: number;  /* Sidereal axial spin period (25.05 Earth Days at equator) */
  axialSpinVelocityKms: number;     /* Surface spin velocity at equator (1.997 km/s) */
  axialTiltDeg: number;             /* Axial obliquity tilt relative to ecliptic (7.25°) */
  galacticRadiusKpc: number;        /* Distance to Galactic Core / Sagittarius A* (8.18 kpc / 26,700 ly) */
  galacticVelocityKms: number;      /* Galactic Orbital Velocity around Galactic Core (230 km/s) */
  galacticYearMillionYrs: number;   /* Cosmic Year (duration of 1 orbit around Galactic Core: 230 Myr) */
  supermassiveBlackHoleMassSun: number; /* Mass of central galactic supermassive black hole Sgr A* (4.15M M☉) */
}

/* Preset physical profiles based on cosmic body characteristics */
const BODY_PROFILES: Record<string, { eccentricity: number; density: number; albedo: number }> = {
  anchor:  { eccentricity: 0.0,    density: 1.41, albedo: 0.00 },
  cinder:  { eccentricity: 0.2056, density: 5.43, albedo: 0.12 },  /* Mercury analogue */
  veil:    { eccentricity: 0.0067, density: 5.24, albedo: 0.77 },  /* Venus analogue */
  aurelia: { eccentricity: 0.0167, density: 5.51, albedo: 0.30 },  /* Earth analogue */
  rust:    { eccentricity: 0.0934, density: 3.93, albedo: 0.25 },  /* Mars analogue */
  goliath: { eccentricity: 0.0489, density: 1.33, albedo: 0.52 },  /* Jupiter analogue */
  mirror:  { eccentricity: 0.0444, density: 1.90, albedo: 0.85 },  /* Ice world analogue */
  hollow:  { eccentricity: 0.2488, density: 1.85, albedo: 0.14 },  /* Pluto analogue */
  wisp:    { eccentricity: 0.1500, density: 0.001, albedo: 0.40 }, /* Nebula */
  eventide:{ eccentricity: 0.0000, density: 1e12, albedo: 0.00 },  /* Black Hole / Vault */
};

/**
 * Calculates complete astrophysics telemetry for a given body under real physical laws.
 */
export function calculatePhysics(body: CosmicBody, simTimeSec: number = 0): BodyPhysicsData {
  const profile = BODY_PROFILES[body.id] || { eccentricity: 0.05, density: 3.5, albedo: 0.3 };
  const e = body.orbit.a > 0 ? profile.eccentricity : 0;

  /* 1. Scale Simulation Distance (a) to Astronomical Units (AU) */
  /* Scale factor: Aurelia (a=52) = 1.0 AU (Earth baseline) */
  const a_AU = body.orbit.a > 0 ? body.orbit.a / 52.0 : 0;

  /* 2. KEPLER'S THIRD LAW OF PLANETARY MOTION: T^2 = a^3 / M_star */
  /* Assuming M_star = 1.0 Solar Mass */
  const M_star = 1.0;
  const periodYears = a_AU > 0 ? Math.sqrt(Math.pow(a_AU, 3) / M_star) : 0;
  const periodDays = periodYears * 365.256;

  /* Periapsis & Apoapsis */
  const periapsisAU = a_AU * (1 - e);
  const apoapsisAU = a_AU * (1 + e);

  /* 3. KEPLER'S FIRST & SECOND LAWS (Elliptical position & Vis-Viva Equation) */
  /* True anomaly calculation */
  const meanMotion = periodYears > 0 ? (2 * Math.PI) / periodYears : 0;
  const meanAnomaly = (body.orbit.phase + simTimeSec * (body.orbit.speed || 0.01)) % (2 * Math.PI);
  
  /* Approximate Kepler's Equation E - e*sin(E) = M */
  let E = meanAnomaly;
  for (let i = 0; i < 5; i++) {
    E = E - (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
  }
  const trueAnomaly = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));

  /* Instantaneous Distance r(theta) = a(1 - e^2) / (1 + e cos(theta)) */
  const currentDistanceAU = a_AU > 0 ? (a_AU * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly)) : 0;

  /* VIS-VIVA EQUATION: v^2 = GM (2/r - 1/a) */
  /* Earth mean orbital velocity = 29.78 km/s */
  const v_earth = 29.78;
  const currentVelocityKms = (a_AU > 0 && currentDistanceAU > 0)
    ? v_earth * Math.sqrt(Math.max(0, 2 / currentDistanceAU - 1 / a_AU))
    : 0;
  const meanVelocityKms = a_AU > 0 ? v_earth / Math.sqrt(a_AU) : 0;

  /* 4. NEWTON'S LAW OF UNIVERSAL GRAVITATION & PLANETARY MASS */
  /* Radius scaling: Aurelia radius=2.05 -> 6,371 km (Earth radius) */
  const radiusKm = (body.radius / 2.05) * 6371;
  const radiusM = radiusKm * 1000;
  const radiusEarth = radiusKm / 6371;

  const densityKgM3 = profile.density * 1000;
  const volumeM3 = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
  
  let massKg = volumeM3 * densityKgM3;
  if (body.kind === 'star') massKg = CONSTANTS.M_sun;
  if (body.kind === 'hole' || body.kind === 'vault') massKg = 10 * CONSTANTS.M_sun; /* 10 Solar Mass Stellar BH */

  const massEarth = massKg / CONSTANTS.M_earth;

  /* Surface Gravity g = G * M / R^2 */
  const surfaceGravityMs2 = radiusM > 0 ? (CONSTANTS.G * massKg) / (radiusM * radiusM) : 0;
  const surfaceGravityRelative = surfaceGravityMs2 / CONSTANTS.g_earth;

  /* Escape Velocity v_esc = sqrt(2 * G * M / R) */
  const escapeVelocityKms = radiusM > 0 ? Math.sqrt((2 * CONSTANTS.G * massKg) / radiusM) / 1000 : 0;

  /* 4b. NEWTON'S INVERSE-SQUARE LAW OF UNIVERSAL GRAVITATION (F_g = G * M1 * M2 / r^2) */
  const M_centralStar = CONSTANTS.M_sun;
  const currentDistMeters = currentDistanceAU * CONSTANTS.AU;
  const gravitationalForceN = currentDistMeters > 0 ? (CONSTANTS.G * M_centralStar * massKg) / Math.pow(currentDistMeters, 2) : 0;
  const gravitationalPotentialJ = currentDistMeters > 0 ? -(CONSTANTS.G * M_centralStar * massKg) / currentDistMeters : 0;
  const orbitalFieldMs2 = currentDistMeters > 0 ? (CONSTANTS.G * M_centralStar) / Math.pow(currentDistMeters, 2) : 0;
  const currentVelMs = currentVelocityKms * 1000;
  const centripetalForceN = currentDistMeters > 0 ? (massKg * Math.pow(currentVelMs, 2)) / currentDistMeters : 0;

  /* 5. STEFAN-BOLTZMANN & WIEN'S LAW (Thermodynamics) */
  /* Solar Flux S = L_sun / (4 * pi * d^2) */
  const stellarFluxWm2 = currentDistMeters > 0 ? CONSTANTS.L_sun / (4 * Math.PI * Math.pow(currentDistMeters, 2)) : 0;
  const solarFluxRelative = stellarFluxWm2 / 1361.0;

  /* Equilibrium Temperature: T_eq = T_sun * sqrt(R_sun / (2 * d)) * (1 - Albedo)^(1/4) */
  const albedo = profile.albedo;
  let eqTempKelvin = currentDistMeters > 0
    ? CONSTANTS.T_sun * Math.sqrt(CONSTANTS.R_sun / (2 * currentDistMeters)) * Math.pow(1 - albedo, 0.25)
    : 0;

  /* Atmosphere Greenhouse adjustment for Earth/Venus equivalents */
  if (body.id === 'aurelia') eqTempKelvin += 33; /* Earth 33K greenhouse warming */
  if (body.id === 'veil') eqTempKelvin += 450;   /* Venus runaway greenhouse */

  const eqTempCelsius = eqTempKelvin - 273.15;

  let habitableStatus: BodyPhysicsData['habitableStatus'] = 'Frozen Outer Realm';
  if (eqTempKelvin >= 250 && eqTempKelvin <= 325) {
    habitableStatus = 'Goldilocks (Habitable)';
  } else if (eqTempKelvin > 325) {
    habitableStatus = 'Too Hot';
  }

  /* 6. ROCHE LIMIT (Satellites & Planetary Rings) */
  /* Fluid Roche Limit = 2.44 * R * (rho_planet / rho_moon)^(1/3) */
  const rho_moon = 3000; /* typical rocky moon density */
  const rocheLimitKm = 2.44 * radiusKm * Math.pow(densityKgM3 / rho_moon, 1 / 3);
  const ringInnerKm = radiusKm * 1.45;
  const ringsInsideRoche = body.rings ? ringInnerKm <= rocheLimitKm : false;

  /* 7. GENERAL RELATIVITY (Black Hole Eventide & Vault) */
  const isRelativistic = body.kind === 'hole' || body.kind === 'vault';
  let schwarzschildRadiusKm: number | undefined;
  let photonSphereKm: number | undefined;
  let iscoKm: number | undefined;
  let timeDilationFactor: number | undefined;

  if (isRelativistic) {
    /* R_s = 2 * G * M / c^2 */
    const Rs_meters = (2 * CONSTANTS.G * massKg) / Math.pow(CONSTANTS.c, 2);
    schwarzschildRadiusKm = Rs_meters / 1000;
    photonSphereKm = 1.5 * schwarzschildRadiusKm;
    iscoKm = 3.0 * schwarzschildRadiusKm;
    /* Time dilation at r = 2 R_s: dt_tau = sqrt(1 - R_s / 2 R_s) = sqrt(0.5) ≈ 0.707 */
    timeDilationFactor = Math.sqrt(1 - 1 / 2.0);
  }

  /* 8. AXIAL ROTATION & GALACTIC ORBIT (Milky Way / Galactic Core dynamics) */
  /* Anchor Star / Sun axial rotation period: 25.05 Earth days at equator */
  const axialRotationPeriodDays = body.kind === 'star' ? 25.05 : 1.0 + (radiusKm / 6371) * 0.5;
  /* v_spin = 2 * pi * R / T */
  const axialSpinVelocityKms = (2 * Math.PI * radiusKm) / (axialRotationPeriodDays * 86400);
  const axialTiltDeg = body.kind === 'star' ? 7.25 : 23.44; /* Solar 7.25° vs Earth 23.44° obliquity */

  /* Galactic Orbit around Supermassive Black Hole (Sagittarius A*) */
  const galacticRadiusKpc = 8.18; /* 8.18 kiloparsecs ≈ 26,700 light-years */
  const galacticVelocityKms = 230.0; /* Flat galactic rotation velocity driven by Dark Matter halo */
  const galacticYearMillionYrs = 230.0; /* 1 Cosmic Year = ~230 Million Earth Years */
  const supermassiveBlackHoleMassSun = 4.15e6; /* Sagittarius A* Mass = 4.15 Million Solar Masses */

  return {
    a_AU,
    eccentricity: e,
    periodDays,
    periodYears,
    periapsisAU,
    apoapsisAU,
    currentDistanceAU,
    currentVelocityKms,
    meanVelocityKms,
    radiusKm,
    radiusEarth,
    densityGcm3: profile.density,
    massKg,
    massEarth,
    surfaceGravityMs2,
    surfaceGravityRelative,
    escapeVelocityKms,
    gravitationalForceN,
    gravitationalPotentialJ,
    orbitalFieldMs2,
    centripetalForceN,
    stellarFluxWm2,
    solarFluxRelative,
    albedo,
    eqTempKelvin,
    eqTempCelsius,
    habitableStatus,
    rocheLimitKm,
    ringsInsideRoche,
    isRelativistic,
    schwarzschildRadiusKm,
    photonSphereKm,
    iscoKm,
    timeDilationFactor,
    axialRotationPeriodDays,
    axialSpinVelocityKms,
    axialTiltDeg,
    galacticRadiusKpc,
    galacticVelocityKms,
    galacticYearMillionYrs,
    supermassiveBlackHoleMassSun,
  };
}

/**
 * Calculates exact elliptical position (x, y, z) for Kepler's 1st Law.
 */
export function calculateKeplerPosition(
  a: number,
  eccentricity: number,
  phase: number,
  inclination: number,
  simDays: number,
  speed: number,
): { x: number; y: number; z: number; trueAnomaly: number; currentRadius: number } {
  const e = Math.min(0.85, Math.max(0, eccentricity));
  
  /* Mean anomaly M = M0 + n*t */
  const M = (phase + simDays * speed) % (2 * Math.PI);

  /* Solve Kepler's Equation E - e sin(E) = M */
  let E = M;
  for (let i = 0; i < 5; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }

  /* True anomaly nu */
  const trueAnomaly = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));

  /* Distance r(theta) = a * (1 - e^2) / (1 + e * cos(nu)) */
  const currentRadius = (a * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly));

  /* Position in orbital plane */
  const x = Math.cos(trueAnomaly) * currentRadius;
  const z = Math.sin(trueAnomaly) * currentRadius;
  const y = Math.sin(trueAnomaly + phase) * currentRadius * inclination;

  return { x, y, z, trueAnomaly, currentRadius };
}
