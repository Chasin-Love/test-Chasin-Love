/**
 * Virtual File-System Path & Hierarchy Manager
 * Handles path normalization, parent/base resolution, directory tree indexing,
 * and recursive file/folder queries for the Eventide Universal Vault.
 */

import type { UniverseState, VaultFile } from '../types';

export function fsNorm(p: string): string {
  let n = (p || '/').replace(/\/+/g, '/');
  if (!n.startsWith('/')) n = '/' + n;
  if (n.length > 1 && n.endsWith('/')) n = n.slice(0, -1);
  return n;
}

export function fsParent(p: string): string | null {
  const n = fsNorm(p);
  if (n === '/') return null;
  const i = n.lastIndexOf('/');
  return i <= 0 ? '/' : n.slice(0, i);
}

export function fsBase(p: string): string {
  const n = fsNorm(p);
  return n === '/' ? '/' : n.slice(n.lastIndexOf('/') + 1);
}

export function fsJoin(a: string, b: string): string {
  return fsNorm((a === '/' ? '' : a) + '/' + b);
}

export function fsResolve(cwd: string, arg: string): string {
  const t = (arg || '').trim();
  if (!t || t === '.') return fsNorm(cwd);
  if (t.startsWith('/')) return fsNorm(t);
  if (t === '..') return fsParent(fsNorm(cwd)) ?? '/';
  return fsJoin(cwd, t);
}

export function fsActiveVault(s: UniverseState): VaultFile[] {
  const activeRid = s.activeRealityId || 'sol-prime';
  return s.vault.filter((f) => (f.realityId ?? 'sol-prime') === activeRid);
}

export function fsAllFolders(s: UniverseState): string[] {
  const set = new Set<string>();
  const add = (p: string) => {
    let n = fsNorm(p);
    while (n !== '/') {
      set.add(n);
      n = fsParent(n) ?? '/';
    }
  };
  s.vaultFolders.forEach(add);
  fsActiveVault(s).forEach((f) => add(f.folder || '/'));
  return [...set].sort();
}

export function fsChildren(
  s: UniverseState,
  dir: string
): { folders: string[]; files: VaultFile[] } {
  const d = fsNorm(dir);
  const folders = fsAllFolders(s).filter((f) => fsParent(f) === d);
  const files = fsActiveVault(s).filter((f) => fsNorm(f.folder || '/') === d);
  return { folders, files };
}

export function fsDescendantFiles(s: UniverseState, dir: string): VaultFile[] {
  const d = fsNorm(dir);
  return fsActiveVault(s).filter((f) => {
    const p = fsNorm(f.folder || '/');
    return p === d || p.startsWith(d + '/');
  });
}
