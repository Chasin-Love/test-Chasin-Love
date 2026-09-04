/**
 * Timeline, History, & Universe Analytics Engine
 * Calculates writing streaks, chronological events, state snapshots, and cosmic statistics.
 */

import type { TimelineEvent, UniverseState } from '../types';

const DAY_MS = 86400000;

export function eventsOf(s: UniverseState): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  s.bodies.forEach((b) => {
    if (b.id !== 'anchor') {
      ev.push({ t: b.createdAt, label: `${b.name} formed`, kind: 'body', refId: b.id });
    }
  });
  s.entries.forEach((e) => {
    const p = s.bodies.find((b) => b.id === e.planetId);
    ev.push({
      t: e.createdAt,
      label: `“${e.title}” written on ${p ? p.name : 'a world'}`,
      kind: 'entry',
      refId: e.id,
    });
  });
  s.connections.forEach((c) => {
    const a = s.bodies.find((b) => b.id === c.a);
    const b = s.bodies.find((x) => x.id === c.b);
    ev.push({
      t: c.createdAt,
      label: `Link formed — ${a?.name ?? '?'} ⟷ ${b?.name ?? '?'}`,
      kind: 'link',
      refId: c.id,
    });
  });
  s.vault.forEach((f) =>
    ev.push({ t: f.addedAt, label: `${f.name} sealed in Vault`, kind: 'vault', refId: f.id })
  );
  return ev.sort((x, y) => x.t - y.t);
}

export function snapshotAt(s: UniverseState, t: number) {
  return {
    bodies: s.bodies.filter((b) => b.createdAt <= t),
    entries: s.entries.filter((e) => e.createdAt <= t),
    connections: s.connections.filter((c) => c.createdAt <= t),
    vault: s.vault.filter((f) => f.addedAt <= t),
  };
}

export function computeStats(s: UniverseState, asOf?: number) {
  const snap = asOf ? snapshotAt(s, asOf) : s;
  const thoughts = snap.entries.length;
  const bytes = snap.vault.reduce((acc, f) => acc + f.size, 0);
  return {
    bodies: snap.bodies.filter((b) => b.id !== 'anchor').length,
    planets: snap.bodies.filter((b) => b.kind === 'planet').length,
    thoughts,
    entries: thoughts,
    memories: snap.bodies.filter((b) => b.meaning === 'memory').length,
    connections: snap.connections.length,
    personalObjects: snap.bodies.length,
    projects:
      snap.bodies.filter((b) => b.meaning === 'project').length +
      snap.entries.filter((e) => e.tags.includes('code')).length,
    vaultBytes: bytes,
    vaultFiles: snap.vault.length,
    vaultApps: snap.vault.filter((f) => f.kind === 'application' || f.kind === 'exe').length,
    vaultGames: snap.vault.filter((f) => f.kind === 'game').length,
    vaultDocs: snap.vault.filter((f) => f.kind === 'document').length,
  };
}

/** Computes consecutive writing days ending today or yesterday */
export function computeStreak(entries: { createdAt: number }[]): number {
  if (!entries.length) return 0;
  const days = new Set(entries.map((e) => Math.floor(e.createdAt / DAY_MS)));
  let cursor = Math.floor(Date.now() / DAY_MS);
  if (!days.has(cursor)) cursor -= 1;
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}

export function writingDays(entries: { createdAt: number }[]): number {
  return new Set(entries.map((e) => Math.floor(e.createdAt / DAY_MS))).size;
}
