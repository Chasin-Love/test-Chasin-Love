/**
 * Core Universe State Management & Action Dispatcher
 * Provides unified reactive state subscription, local storage synchronization,
 * and dispatch actions across realities, bodies, diary entries, and the universal vault.
 */

import { useSyncExternalStore } from 'react';
import type {
  Attachment,
  BodyKind,
  BtrfsScrubReport,
  BtrfsSnapshot,
  BtrfsSubvolume,
  CosmicBody,
  DiaryEntry,
  FileVersion,
  Meaning,
  UniverseState,
  VaultFile,
  VaultSecrets,
} from './types';
import {
  getReality,
  REALITIES,
  RAW_REALITIES,
  computeAllRealities,
  setRuntimeRealities,
  RealityConfig,
} from './realities';
import {
  BTRFS_DEFAULT_SUBVOLS,
  btrfsChecksum,
  btrfsMakeSnapshot,
  btrfsRunScrub,
  createInitialSeed,
  fsNorm,
  initBtrfsSuperblock,
  procPalette,
  procRadius,
  seedBodies,
} from './storage';

// Re-export all storage, filesystem, crypto, formatting, and metrics helpers for backward compatibility
export * from './storage';

const STORAGE_KEY = 'my-universe:v4';
const DAY_MS = 86400000;

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return (
      'id-' +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36)
    );
  }
}

/* ================================ store ================================== */

let state: UniverseState = loadState();
let snapshot: UniverseState = createSnapshot(state);
const listeners = new Set<() => void>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function createSnapshot(s: UniverseState): UniverseState {
  return {
    ...s,
    customRealityDescriptions: s.customRealityDescriptions
      ? { ...s.customRealityDescriptions }
      : {},
    customRealities: s.customRealities ? [...s.customRealities] : [],
    deletedRealityIds: s.deletedRealityIds ? [...s.deletedRealityIds] : [],
    bodies: [...s.bodies],
    entries: [...s.entries],
    connections: [...s.connections],
    vault: [...s.vault],
    vaultFolders: [...s.vaultFolders],
    vaultTrash: [...s.vaultTrash],
    vaultUsers: [...s.vaultUsers],
    audit: [...s.audit],
    btrfsSubvolumes: s.btrfsSubvolumes ? [...s.btrfsSubvolumes] : [...BTRFS_DEFAULT_SUBVOLS],
    btrfsSnapshots: s.btrfsSnapshots ? [...s.btrfsSnapshots] : [],
    btrfsSuperblock: s.btrfsSuperblock ? { ...s.btrfsSuperblock } : initBtrfsSuperblock(),
    btrfsScrub: s.btrfsScrub ? { ...s.btrfsScrub } : undefined,
  };
}

/**
 * Prime recent diary timestamp on first boot or idle return so living streak indicators
 * remain active without modifying user-authored text content.
 */
function primeState(p: UniverseState): UniverseState {
  const nowMs = Date.now();
  const RECENT_THRESHOLD = 2 * DAY_MS;
  const hasRecent = p.entries.some(
    (e) => Math.max(e.createdAt, e.updatedAt) > nowMs - RECENT_THRESHOLD
  );
  if (!hasRecent && p.entries.length) {
    const latest = [...p.entries].sort(
      (a, b) =>
        Math.max(b.createdAt, b.updatedAt) - Math.max(a.createdAt, a.updatedAt)
    )[0];
    latest.updatedAt = nowMs - 3600000;
  }
  // Synchronize runtime realities with custom realities & deletions
  setRuntimeRealities(
    computeAllRealities(p.customRealities, p.deletedRealityIds, p.customRealityDescriptions)
  );
  return p;
}

function loadState(): UniverseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UniverseState;
      if (parsed && Array.isArray(parsed.bodies) && parsed.bodies.length) {
        if (!parsed.activeRealityId) parsed.activeRealityId = 'sol-prime';
        if (!Array.isArray(parsed.customRealities)) parsed.customRealities = [];
        if (!Array.isArray(parsed.deletedRealityIds)) parsed.deletedRealityIds = [];
        if (!Array.isArray(parsed.vaultFolders)) parsed.vaultFolders = [];
        if (!Array.isArray(parsed.vaultTrash)) parsed.vaultTrash = [];
        if (!Array.isArray(parsed.vaultUsers)) parsed.vaultUsers = [];
        if (!Array.isArray(parsed.audit)) parsed.audit = [];
        // Auto-upgrade Btrfs structures
        if (!Array.isArray(parsed.btrfsSubvolumes) || parsed.btrfsSubvolumes.length === 0) {
          parsed.btrfsSubvolumes = BTRFS_DEFAULT_SUBVOLS;
        }
        if (!Array.isArray(parsed.btrfsSnapshots)) parsed.btrfsSnapshots = [];
        if (!parsed.btrfsSuperblock) parsed.btrfsSuperblock = initBtrfsSuperblock();
        if (!parsed.activeSubvolId) parsed.activeSubvolId = 'subvol-root';

        // Migration: reset legacy demo moods so strip appears only when user selects a mood
        if (!parsed.version || parsed.version < 2) {
          parsed.entries.forEach((e) => {
            e.mood = undefined;
          });
          parsed.version = 2;
        }
        return primeState(parsed);
      }
    }
  } catch {
    /* fallback to fresh seed on parse failure */
  }
  return primeState(createInitialSeed(newId));
}

function persistState() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const slim = {
        ...state,
        vaultUsers: state.vaultUsers.map((u) => {
          const n = { ...u };
          if (n.avatar && n.avatar.length > 2_600_000) n.avatar = null;
          if (n.avatarFrames && n.avatarFrames.join('').length > 3_500_000)
            n.avatarFrames = null;
          return n;
        }),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {
      /* quota exceeded — state continues seamlessly in memory */
    }
  }, 350);
}

function notify() {
  snapshot = createSnapshot(state);
  persistState();
  listeners.forEach((listener) => listener());
}

export function getState(): UniverseState {
  return snapshot;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useUniverse(): UniverseState {
  return useSyncExternalStore(subscribe, getState, getState);
}

function audit(msg: string) {
  state.audit = [...state.audit.slice(-199), { t: Date.now(), msg }];
}

/* =============================== actions ================================= */

export const actions = {
  /* -------------------------- Multiverse & Lore -------------------------- */
  switchReality(realityId: string) {
    const r = getReality(realityId, state.customRealityDescriptions);
    state.activeRealityId = r.id;
    state.bodies = [...r.bodies];
    state.entries = [...r.entries];
    // Filter connections to only link celestial bodies native to this reality
    const validBodyIds = new Set(r.bodies.map((b) => b.id));
    state.connections = (state.connections || []).filter(
      (c) => validBodyIds.has(c.a) && validBodyIds.has(c.b)
    );
    audit(`[Dimensional Barrier] Quantum resonance shifted to Reality: ${r.name}`);
    notify();
  },

  updateRealityDescription(realityId: string, description: string) {
    if (!state.customRealityDescriptions) state.customRealityDescriptions = {};
    state.customRealityDescriptions[realityId] = description.trim();
    const r = REALITIES.find((x) => x.id === realityId);
    if (r) r.description = description.trim();
    audit(`Updated lore for Reality: ${r ? r.name : realityId}`);
    notify();
  },

  resetRealityDescription(realityId: string) {
    if (state.customRealityDescriptions) {
      delete state.customRealityDescriptions[realityId];
    }
    const r = REALITIES.find((x) => x.id === realityId);
    const raw = RAW_REALITIES.find((x) => x.id === realityId);
    if (r && raw) r.description = raw.description;
    audit(`Reset description for Reality: ${r ? r.name : realityId}`);
    notify();
  },

  createReality(newReality: RealityConfig) {
    if (!state.customRealities) state.customRealities = [];
    state.customRealities = [...state.customRealities.filter((x) => x.id !== newReality.id), newReality];
    // Recompute runtime realities
    setRuntimeRealities(
      computeAllRealities(state.customRealities, state.deletedRealityIds, state.customRealityDescriptions)
    );
    audit(`[Multiverse Nexus] Manifested new parallel reality: ${newReality.name}`);
    notify();
  },

  deleteReality(realityId: string) {
    // Protect core default reality from deletion
    if (realityId === 'sol-prime') return;

    if (!state.deletedRealityIds) state.deletedRealityIds = [];
    if (!state.deletedRealityIds.includes(realityId)) {
      state.deletedRealityIds = [...state.deletedRealityIds, realityId];
    }
    if (state.customRealities) {
      state.customRealities = state.customRealities.filter((r) => r.id !== realityId);
    }
    if (state.customRealityDescriptions) {
      delete state.customRealityDescriptions[realityId];
    }
    // Recompute runtime realities
    setRuntimeRealities(
      computeAllRealities(state.customRealities, state.deletedRealityIds, state.customRealityDescriptions)
    );
    // If the active reality was deleted, switch back to Sol-Prime
    if (state.activeRealityId === realityId) {
      const fallback = REALITIES[0] || RAW_REALITIES[0];
      state.activeRealityId = fallback.id;
      state.bodies = [...fallback.bodies];
      state.entries = [...(fallback.entries || [])];
    }
    audit(`[Multiverse Nexus] Collapsed parallel reality: ${realityId}`);
    notify();
  },

  /* --------------------------- Celestial Bodies -------------------------- */
  setMeaning(id: string, meaning: CosmicBody['meaning']) {
    const b = state.bodies.find((x) => x.id === id);
    if (b) {
      b.meaning = meaning;
      notify();
    }
  },

  renameBody(id: string, name: string) {
    const b = state.bodies.find((x) => x.id === id);
    if (b && name.trim()) {
      b.name = name.trim();
      notify();
    }
  },

  setNote(id: string, note: string) {
    const b = state.bodies.find((x) => x.id === id);
    if (b) {
      b.note = note;
      notify();
    }
  },

  addBody(name: string, kind: BodyKind, meaning: Meaning): CosmicBody {
    const TAU = Math.PI * 2;
    const r = Math.random;
    const body: CosmicBody = {
      id: newId(),
      name,
      kind,
      meaning,
      note: '',
      createdAt: Date.now(),
      radius: procRadius(kind),
      clouds: kind === 'planet' && r() > 0.4,
      palette: procPalette(kind),
      orbit: {
        a: 170 + r() * 70,
        speed: TAU / (4000 + r() * 4000),
        phase: r() * TAU,
        incl: (r() - 0.5) * 0.4,
      },
    };
    state.bodies.push(body);
    notify();
    return body;
  },

  removeBody(id: string) {
    if (id === 'anchor' || id === 'eventide') return;
    state.bodies = state.bodies.filter((b) => b.id !== id);
    state.entries = state.entries.filter((e) => e.planetId !== id);
    state.connections = state.connections.filter((c) => c.a !== id && c.b !== id);
    notify();
  },

  deleteBody(id: string) {
    actions.removeBody(id);
  },

  connect(a: string, b: string) {
    if (a === b) return;
    if (
      state.connections.some(
        (c) => (c.a === a && c.b === b) || (c.a === b && c.b === a)
      )
    )
      return;
    state.connections.push({ id: newId(), a, b, createdAt: Date.now() });
    notify();
  },

  disconnect(id: string) {
    state.connections = state.connections.filter((c) => c.id !== id);
    notify();
  },

  /* ---------------------------- Diary & Journal -------------------------- */
  addEntry(planetId: string): DiaryEntry {
    const e: DiaryEntry = {
      id: newId(),
      planetId,
      title: 'Untitled page',
      body: '',
      tags: [],
      bookmarked: false,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachments: [],
    };
    state.entries.push(e);
    notify();
    return e;
  },

  updateEntry(id: string, patch: Partial<DiaryEntry>) {
    const e = state.entries.find((x) => x.id === id);
    if (e) {
      Object.assign(e, patch, { updatedAt: Date.now() });
      notify();
    }
  },

  deleteEntry(id: string) {
    state.entries = state.entries.filter((x) => x.id !== id);
    notify();
  },

  toggleBookmark(id: string) {
    const e = state.entries.find((x) => x.id === id);
    if (e) {
      e.bookmarked = !e.bookmarked;
      notify();
    }
  },

  addAttachment(entryId: string, att: Omit<Attachment, 'id'>) {
    const e = state.entries.find((x) => x.id === entryId);
    if (e) {
      e.attachments.push({ ...att, id: newId() });
      e.updatedAt = Date.now();
      notify();
    }
  },

  removeAttachment(entryId: string, attId: string) {
    const e = state.entries.find((x) => x.id === entryId);
    if (e) {
      e.attachments = e.attachments.filter((a) => a.id !== attId);
      notify();
    }
  },

  deleteAttachment(entryId: string, attId: string) {
    actions.removeAttachment(entryId, attId);
  },

  updateAttachment(
    entryId: string,
    attId: string,
    patch: Partial<Attachment>
  ) {
    const e = state.entries.find((x) => x.id === entryId);
    const a = e?.attachments.find((x) => x.id === attId);
    if (e && a) {
      Object.assign(a, patch);
      e.updatedAt = Date.now();
      notify();
    }
  },

  /* ------------------------- Vault File System -------------------------- */
  addVaultFiles(files: VaultFile[]) {
    const activeRid = state.activeRealityId || 'sol-prime';
    const stamped = files.map((f) => ({ ...f, realityId: f.realityId ?? activeRid }));
    state.vault.push(...stamped);
    notify();
  },

  updateVaultFile(id: string, patch: Partial<VaultFile>) {
    const f = state.vault.find((x) => x.id === id);
    if (f) {
      Object.assign(f, patch);
      notify();
    }
  },

  deleteVaultFile(id: string) {
    state.vault = state.vault.filter((x) => x.id !== id);
    notify();
  },

  deleteVaultFiles(ids: string[]) {
    const set = new Set(ids);
    state.vault = state.vault.filter((x) => !set.has(x.id));
    notify();
  },

  moveVaultFile(id: string, dest: string) {
    const f = state.vault.find((x) => x.id === id);
    if (f) {
      f.folder = fsNorm(dest) || '/';
      notify();
    }
  },

  addVaultFolder(path: string) {
    const n = fsNorm(path);
    if (n === '/') return;
    if (!state.vaultFolders.includes(n)) {
      state.vaultFolders = [...state.vaultFolders, n];
      notify();
    }
  },

  renameVaultFile(id: string, name: string) {
    const f = state.vault.find((x) => x.id === id);
    if (f && name.trim() && !name.includes('/')) {
      f.name = name.trim();
      notify();
    }
  },

  renameVaultFolder(from: string, to: string) {
    const fn = fsNorm(from);
    const tn = fsNorm(to);
    if (!fn || !tn || fn === tn || tn === '/') return;
    state.vaultFolders = state.vaultFolders.map((p) =>
      p === fn ? tn : p.startsWith(fn + '/') ? tn + p.slice(fn.length) : p
    );
    state.vault.forEach((f) => {
      const p = fsNorm(f.folder || '/');
      if (p === fn) f.folder = tn;
      else if (p.startsWith(fn + '/')) f.folder = tn + p.slice(fn.length);
    });
    notify();
  },

  deleteVaultFolder(path: string) {
    const n = fsNorm(path);
    const doomed = state.vault.filter((f) => {
      const p = fsNorm(f.folder || '/');
      return p === n || p.startsWith(n + '/');
    });
    if (doomed.length) {
      this.releaseVaultFiles(doomed.map((f) => f.id));
    }
    state.vaultFolders = state.vaultFolders.filter(
      (p) => !(p === n || p.startsWith(n + '/'))
    );
    notify();
  },

  /* ----------------------- The Void (Recycle Bin) ------------------------ */
  releaseVaultFile(id: string) {
    this.releaseVaultFiles([id]);
  },

  releaseVaultFiles(ids: string[]) {
    const set = new Set(ids);
    const released = state.vault
      .filter((x) => set.has(x.id))
      .map((item) => ({ item, deletedAt: Date.now() }));
    if (!released.length) return;
    state.vaultTrash = [...state.vaultTrash, ...released];
    state.vault = state.vault.filter((x) => !set.has(x.id));
    notify();
  },

  restoreTrashed(id: string) {
    const t = state.vaultTrash.find((x) => x.item.id === id);
    if (!t) return;
    state.vaultTrash = state.vaultTrash.filter((x) => x.item.id !== id);
    state.vault = [...state.vault, t.item];
    notify();
  },

  purgeTrashed(id: string) {
    state.vaultTrash = state.vaultTrash.filter((x) => x.item.id !== id);
    notify();
  },

  purgeTrash() {
    state.vaultTrash = [];
    notify();
  },

  /* --------------------------- Version Control --------------------------- */
  saveVersion(id: string, label?: string) {
    const f = state.vault.find((x) => x.id === id);
    if (!f || f.content == null) return;
    const v: FileVersion = {
      id: newId(),
      savedAt: Date.now(),
      label: label ?? 'snapshot',
      size: f.content.length,
      content: f.content,
    };
    f.versions = [...(f.versions ?? []), v].slice(-10);
    notify();
  },

  restoreVersion(id: string, versionId: string) {
    const f = state.vault.find((x) => x.id === id);
    const v = f?.versions?.find((x) => x.id === versionId);
    if (!f || !v || v.content == null) return;
    this.saveVersion(id, 'before restore');
    f.content = v.content;
    f.size = v.content.length;
    notify();
  },

  /* ------------------------ Universe Portability ------------------------- */
  resetUniverse() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    state = primeState(createInitialSeed(newId));
    notify();
  },

  importUniverse(next: UniverseState) {
    if (!next || !Array.isArray(next.bodies) || !Array.isArray(next.vault))
      return;
    if (!Array.isArray(next.entries)) next.entries = [];
    if (!Array.isArray(next.connections)) next.connections = [];
    if (!Array.isArray(next.vaultTrash)) next.vaultTrash = [];
    if (!Array.isArray(next.vaultFolders)) next.vaultFolders = [];
    if (!Array.isArray(next.vaultUsers)) next.vaultUsers = [];
    if (!Array.isArray(next.audit)) next.audit = [];

    // Ensure anchor & eventide core system bodies exist
    const defaults = seedBodies(Date.now(), DAY_MS);
    const anchor = defaults.find((b) => b.id === 'anchor')!;
    const eventide = defaults.find((b) => b.id === 'eventide')!;
    if (!next.bodies.some((b) => b.id === 'anchor')) next.bodies.unshift(anchor);
    if (!next.bodies.some((b) => b.id === 'eventide')) next.bodies.push(eventide);

    state = next;
    notify();
  },

  /* ----------------------------- Identities ------------------------------ */
  addUser(u: UniverseState['vaultUsers'][number]) {
    state.vaultUsers = [...state.vaultUsers, u];
    notify();
  },

  updateUser(
    id: string,
    patch: Partial<UniverseState['vaultUsers'][number]>
  ) {
    state.vaultUsers = state.vaultUsers.map((u) =>
      u.id === id ? { ...u, ...patch } : u
    );
    notify();
  },

  removeUser(id: string) {
    state.vaultUsers = state.vaultUsers.filter((u) => u.id !== id);
    notify();
  },

  touchUser(id: string) {
    this.updateUser(id, { lastSeen: Date.now() });
  },

  setSecrets(s: VaultSecrets | null) {
    state.secrets = s;
    audit(s ? 'key ring re-sealed' : 'key ring emptied');
    notify();
  },

  /* ----------------------- Btrfs Copy-on-Write Engine ------------------- */
  btrfsCreateSubvolume(name: string, path?: string): BtrfsSubvolume {
    const cleanName = name.trim().startsWith('@') ? name.trim() : `@${name.trim()}`;
    const subvolPath = path ? fsNorm(path) : `/subvolumes/${cleanName}`;
    const existing = state.btrfsSubvolumes?.find((s) => s.name === cleanName);
    if (existing) return existing;

    const nextRootId = Math.max(256, ...(state.btrfsSubvolumes?.map((s) => s.rootId) || [256])) + 1;
    const currentGen = (state.btrfsSuperblock?.generation || 142) + 1;

    const subvol: BtrfsSubvolume = {
      id: `subvol-${newId().slice(0, 8)}`,
      name: cleanName,
      path: subvolPath,
      rootId: nextRootId,
      generation: currentGen,
      createdAt: Date.now(),
      readOnly: false,
      flags: ['rw', 'user-subvolume'],
    };

    state.btrfsSubvolumes = [...(state.btrfsSubvolumes || BTRFS_DEFAULT_SUBVOLS), subvol];
    if (state.btrfsSuperblock) state.btrfsSuperblock.generation = currentGen;
    audit(`[Btrfs] Created subvolume ${cleanName} (tree root ID ${nextRootId})`);
    notify();
    return subvol;
  },

  btrfsDeleteSubvolume(id: string) {
    if (id === 'subvol-root' || id === 'subvol-snapshots') return;
    const doomed = state.btrfsSubvolumes?.find((s) => s.id === id);
    state.btrfsSubvolumes = (state.btrfsSubvolumes || []).filter((s) => s.id !== id);
    if (state.activeSubvolId === id) state.activeSubvolId = 'subvol-root';
    audit(`[Btrfs] Deleted subvolume ${doomed ? doomed.name : id}`);
    notify();
  },

  btrfsSetActiveSubvolume(id: string) {
    state.activeSubvolId = id;
    const subvol = state.btrfsSubvolumes?.find((s) => s.id === id);
    audit(`[Btrfs] Switched active subvolume tree to ${subvol?.name ?? id}`);
    notify();
  },

  btrfsCreateSnapshot(
    name: string,
    subvolId = 'subvol-root',
    readOnly = false,
    description?: string
  ): BtrfsSnapshot {
    const snap = btrfsMakeSnapshot(state, name, subvolId, readOnly, description);
    state.btrfsSnapshots = [snap, ...(state.btrfsSnapshots || [])].slice(0, 30);
    if (state.btrfsSuperblock) {
      state.btrfsSuperblock.generation += 1;
    }
    audit(`[Btrfs CoW Snapshot] Created snapshot '${snap.name}' (${snap.fileCount} files, gen ${snap.generation})`);
    notify();
    return snap;
  },

  btrfsRestoreSnapshot(snapshotId: string) {
    const snap = state.btrfsSnapshots?.find((s) => s.id === snapshotId);
    if (!snap) return;

    // Automatic pre-rollback checkpoint
    const preRollback = btrfsMakeSnapshot(
      state,
      `@snapshot-pre-rollback-${Date.now().toString(36)}`,
      'subvol-root',
      true,
      'Automatic safety snapshot created before snapshot rollback'
    );
    state.btrfsSnapshots = [preRollback, ...(state.btrfsSnapshots || [])].slice(0, 30);

    // Atomic restore
    state.vault = JSON.parse(JSON.stringify(snap.filesSnapshot));
    state.vaultFolders = [...snap.foldersSnapshot];
    if (state.btrfsSuperblock) {
      state.btrfsSuperblock.generation = snap.generation + 1;
    }
    audit(`[Btrfs Rollback] Restored active filesystem tree to snapshot '${snap.name}'`);
    notify();
  },

  btrfsDeleteSnapshot(snapshotId: string) {
    const doomed = state.btrfsSnapshots?.find((s) => s.id === snapshotId);
    state.btrfsSnapshots = (state.btrfsSnapshots || []).filter((s) => s.id !== snapshotId);
    audit(`[Btrfs] Deleted snapshot '${doomed?.name ?? snapshotId}'`);
    notify();
  },

  btrfsCloneFileReflink(fileId: string, destFolder?: string, newName?: string): VaultFile | null {
    const orig = state.vault.find((f) => f.id === fileId);
    if (!orig) return null;

    const baseName = newName || (orig.name.includes('.')
      ? orig.name.replace(/(\.[^.]+)$/, '-reflink$1')
      : `${orig.name}-reflink`);
    
    const clone: VaultFile = {
      ...orig,
      id: newId(),
      name: baseName,
      folder: destFolder ? fsNorm(destFolder) : orig.folder,
      addedAt: Date.now(),
      isReflink: true,
      sourceFileId: orig.id,
      realityId: orig.realityId ?? state.activeRealityId ?? 'sol-prime',
      generation: (state.btrfsSuperblock?.generation || 142) + 1,
    };

    state.vault.push(clone);
    if (state.btrfsSuperblock) {
      state.btrfsSuperblock.cowReflinkCount = (state.btrfsSuperblock.cowReflinkCount || 0) + 1;
      state.btrfsSuperblock.generation += 1;
    }
    audit(`[Btrfs Reflink] CoW zero-cost extent clone created: ${clone.name}`);
    notify();
    return clone;
  },

  btrfsSetCompression(algo: 'zstd' | 'lzo' | 'zlib' | 'none', level = 3) {
    if (!state.btrfsSuperblock) state.btrfsSuperblock = initBtrfsSuperblock();
    state.btrfsSuperblock.compression = algo;
    state.btrfsSuperblock.compressionLevel = level;
    audit(`[Btrfs] Compression algorithm switched to ${algo.toUpperCase()} (level ${level})`);
    notify();
  },

  btrfsSetScrubReport(report: BtrfsScrubReport) {
    state.btrfsScrub = report;
    audit(`[Btrfs Scrub] Checked ${report.filesScanned} items — status: ${report.status}`);
    notify();
  },

  async btrfsRunLiveScrub(onProgress?: (percent: number, currentFile: string) => void): Promise<BtrfsScrubReport> {
    const report = await btrfsRunScrub(state, onProgress);
    state.btrfsScrub = report;
    audit(`[Btrfs Scrub] Checked ${report.filesScanned} items, repaired ${report.errorsCorrected} — ${report.status.toUpperCase()}`);
    notify();
    return report;
  },

  logAudit(msg: string) {
    audit(msg);
    notify();
  },
};
