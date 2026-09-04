/**
 * Procedural Celestial Physics & Color Generation
 * Deterministic & randomized planetary radius, atmospheric palette, and HSL color helpers.
 */

import type { BodyKind, CosmicBody } from '../types';

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** Freshly accreted worlds receive palettes grown from a harmonized randomized hue */
export function procPalette(kind: BodyKind): CosmicBody['palette'] {
  const r = Math.random;
  const hue = Math.floor(r() * 360);
  if (kind === 'nebula') {
    return {
      deep: hslToHex(hue, 45, 8),
      base: hslToHex(hue, 55, 30),
      high: hslToHex((hue + 40) % 360, 60, 62),
      atmo: hslToHex((hue + 20) % 360, 55, 58),
      ice: '#e8fff8',
    };
  }
  if (kind === 'hole') {
    return {
      deep: '#000000',
      base: '#14100c',
      high: '#3a2c1c',
      atmo: hslToHex(20 + r() * 30, 70, 62),
      ice: '#ffffff',
    };
  }
  return {
    deep: hslToHex(hue, 50, 12),
    base: hslToHex(hue, 42, 34),
    high: hslToHex((hue + 30) % 360, 38, 66),
    atmo: hslToHex((hue + 15) % 360, 60, 72),
    ice: hslToHex(hue, 20, 92),
  };
}

export function procRadius(kind: BodyKind): number {
  const r = Math.random;
  if (kind === 'planet') return 1.2 + r() * 1.4;
  if (kind === 'dwarf') return 0.7 + r() * 0.4;
  if (kind === 'nebula') return 5 + r() * 3;
  return 1.8 + r() * 0.8;
}
