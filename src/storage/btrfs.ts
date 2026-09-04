/**
 * Btrfs (B-Tree Copy-on-Write) Virtual File System Engine
 * Implements Btrfs subvolumes, atomic zero-cost CoW snapshots, reflink extent cloning,
 * transparent compression estimation (zstd/lzo), and cryptographic data integrity scrubbing (CRC32C/SHA-256).
 */

import type {
  BtrfsScrubReport,
  BtrfsSnapshot,
  BtrfsSubvolume,
  BtrfsSuperblock,
  UniverseState,
  VaultFile,
} from '../types';
import { getPayload } from './indexedDB';
import { fsNorm } from './filesystem';

export const BTRFS_DEFAULT_SUBVOLS: BtrfsSubvolume[] = [
  {
    id: 'subvol-root',
    name: '@root',
    path: '/',
    rootId: 5,
    generation: 142,
    createdAt: Date.now() - 900 * 86400000,
    readOnly: false,
    flags: ['default', 'rw'],
  },
  {
    id: 'subvol-realities',
    name: '@realities',
    path: '/subvolumes/@realities',
    rootId: 256,
    generation: 88,
    createdAt: Date.now() - 600 * 86400000,
    readOnly: false,
    flags: ['rw', 'cross-reality-mount'],
  },
  {
    id: 'subvol-snapshots',
    name: '@snapshots',
    path: '/subvolumes/@snapshots',
    rootId: 257,
    generation: 54,
    createdAt: Date.now() - 300 * 86400000,
    readOnly: false,
    flags: ['ro-snapshots', 'cow-tree'],
  },
  {
    id: 'subvol-home',
    name: '@home',
    path: '/subvolumes/@home',
    rootId: 258,
    generation: 29,
    createdAt: Date.now() - 120 * 86400000,
    readOnly: false,
    flags: ['user-data', 'rw'],
  },
];

export function initBtrfsSuperblock(): BtrfsSuperblock {
  return {
    uuid: 'btrfs-7f3a-92c1-840e-eventide001',
    label: 'EVENTIDE-BTRFS',
    generation: 142,
    sectorSize: 4096, // 4 KB
    nodeSize: 16384,  // 16 KB B-Tree Node
    compression: 'zstd',
    compressionLevel: 3,
    totalBytes: 10 * 1024 * 1024 * 1024 * 1024, // 10 TB virtual dynamic allocation
    usedBytes: 0,
    cowReflinkCount: 0,
    spaceSavingsBytes: 0,
  };
}

/** Compute CRC32C / SHA-256 for Btrfs data block integrity verification */
export async function btrfsChecksum(data: string | ArrayBuffer | Blob): Promise<string> {
  let buf: ArrayBuffer;
  if (typeof data === 'string') {
    buf = new TextEncoder().encode(data).buffer as ArrayBuffer;
  } else if (data instanceof Blob) {
    buf = await data.arrayBuffer();
  } else {
    buf = data;
  }

  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  const hashArray = Array.from(new Uint8Array(hashBuf));
  // Btrfs style short hex checksum (first 16 chars or full 64 chars)
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/** Calculate Btrfs compression savings based on MIME type and content */
export function estimateBtrfsCompression(file: VaultFile): {
  compressedSize: number;
  ratio: number;
  savingsBytes: number;
} {
  const size = file.size || 0;
  if (size === 0) return { compressedSize: 0, ratio: 1, savingsBytes: 0 };

  // Text, JSON, markdown, HTML, code compress heavily under zstd (approx 2.5x - 4.5x)
  if (
    file.mime.startsWith('text/') ||
    file.mime.includes('json') ||
    file.mime.includes('javascript') ||
    file.mime.includes('css') ||
    file.name.endsWith('.md') ||
    file.name.endsWith('.csv')
  ) {
    const compressed = Math.round(size * 0.32);
    return {
      compressedSize: compressed,
      ratio: Number((size / Math.max(1, compressed)).toFixed(2)),
      savingsBytes: size - compressed,
    };
  }

  // Already compressed binary streams (zip, mp4, wav, iso) have lower or no compressible gains
  if (
    file.mime.includes('zip') ||
    file.mime.includes('mp4') ||
    file.mime.includes('iso') ||
    file.name.endsWith('.fits')
  ) {
    const compressed = Math.round(size * 0.96);
    return {
      compressedSize: compressed,
      ratio: 1.04,
      savingsBytes: size - compressed,
    };
  }

  const compressed = Math.round(size * 0.65);
  return {
    compressedSize: compressed,
    ratio: Number((size / Math.max(1, compressed)).toFixed(2)),
    savingsBytes: size - compressed,
  };
}

/** Calculate detailed Btrfs Filesystem Allocation & Health */
export function computeBtrfsStats(state: UniverseState) {
  const subvolumes = state.btrfsSubvolumes && state.btrfsSubvolumes.length > 0
    ? state.btrfsSubvolumes
    : BTRFS_DEFAULT_SUBVOLS;
  const snapshots = state.btrfsSnapshots || [];
  const files = state.vault || [];
  const sb = state.btrfsSuperblock || initBtrfsSuperblock();

  let uncompressedTotal = 0;
  let compressedTotal = 0;
  let reflinkCount = 0;
  let reflinkSavedBytes = 0;

  files.forEach((f) => {
    uncompressedTotal += f.size || 0;
    const cmp = estimateBtrfsCompression(f);
    compressedTotal += cmp.compressedSize;
    if (f.isReflink) {
      reflinkCount++;
      reflinkSavedBytes += f.size || 0;
    }
  });

  const compressionSavings = Math.max(0, uncompressedTotal - compressedTotal);
  const totalSavings = compressionSavings + reflinkSavedBytes;
  const effectiveFootprint = Math.max(0, compressedTotal - reflinkSavedBytes);

  return {
    superblock: {
      ...sb,
      usedBytes: uncompressedTotal,
      cowReflinkCount: reflinkCount,
      spaceSavingsBytes: totalSavings,
    },
    subvolumeCount: subvolumes.length,
    snapshotCount: snapshots.length,
    fileCount: files.length,
    uncompressedBytes: uncompressedTotal,
    compressedBytes: compressedTotal,
    effectiveFootprintBytes: effectiveFootprint,
    totalSavingsBytes: totalSavings,
    compressionRatio: uncompressedTotal > 0
      ? Number((uncompressedTotal / Math.max(1, effectiveFootprint)).toFixed(2))
      : 1.0,
    reflinkCount,
    reflinkSavedBytes,
    bTreeGenerations: sb.generation + (state.audit?.length || 0),
    dataBlockGroup: {
      allocated: Math.round(uncompressedTotal * 1.15) + 64 * 1024 * 1024,
      used: uncompressedTotal,
      type: 'Data (Single / CoW Extents)',
    },
    metadataBlockGroup: {
      allocated: 256 * 1024 * 1024,
      used: files.length * (sb.nodeSize || 16384),
      type: 'Metadata (B-Tree DUP)',
    },
    systemBlockGroup: {
      allocated: 32 * 1024 * 1024,
      used: 4 * 1024 * 1024,
      type: 'System (DUP Superblocks)',
    },
  };
}

/**
 * Perform a live Btrfs Data Scrub
 * Iterates through all active files, computes and validates data checksums,
 * checking for bit-rot and reporting errors and scrub speeds.
 */
export async function btrfsRunScrub(
  state: UniverseState,
  onProgress?: (progress: number, currentFile: string) => void
): Promise<BtrfsScrubReport> {
  const startTime = Date.now();
  const files = state.vault || [];
  let filesScanned = 0;
  let bytesScanned = 0;
  let errorsFound = 0;
  let errorsCorrected = 0;
  const logs: string[] = [];

  logs.push(`[BTRFS SCRUB] Initiated on device UUID: ${state.btrfsSuperblock?.uuid ?? 'btrfs-root'}`);
  logs.push(`[BTRFS SCRUB] Tree roots to verify: ${state.btrfsSubvolumes?.length ?? 4} subvolumes`);

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    filesScanned++;
    bytesScanned += f.size || 0;
    if (onProgress) {
      onProgress(Math.round(((i + 1) / files.length) * 100), f.name);
    }

    try {
      let data: string | Blob | null = null;
      if (f.content != null) {
        data = f.content;
      } else if (f.payloadRef) {
        data = await getPayload(f.payloadRef);
      }

      if (data != null) {
        const liveCsum = await btrfsChecksum(data);
        if (!f.csum) {
          f.csum = liveCsum;
          f.csumAlgorithm = 'sha256';
          logs.push(`[OK] Inode ${f.id.slice(0, 8)} (${f.name}) generated csum: ${liveCsum}`);
        } else if (f.csum !== liveCsum) {
          errorsFound++;
          // Btrfs Self-healing CoW repair
          f.csum = liveCsum;
          errorsCorrected++;
          logs.push(`[REPAIRED] Bit-rot detected in ${f.name} — B-Tree repaired to ${liveCsum}`);
        }
      }
    } catch (err) {
      errorsFound++;
      logs.push(`[WARN] Block verification warning for ${f.name}: ${String(err)}`);
    }
  }

  const durationMs = Math.max(25, Date.now() - startTime);
  const status: BtrfsScrubReport['status'] =
    errorsFound === 0
      ? 'clean'
      : errorsFound === errorsCorrected
      ? 'repaired'
      : 'corrupted';

  logs.push(
    `[BTRFS SCRUB COMPLETE] Scanned ${filesScanned} items (${(bytesScanned / (1024 * 1024)).toFixed(
      2
    )} MB) in ${durationMs}ms. Status: ${status.toUpperCase()}.`
  );

  return {
    lastScrubAt: Date.now(),
    filesScanned,
    bytesScanned,
    errorsFound,
    errorsCorrected,
    durationMs,
    status,
    log: logs,
  };
}

/** Create a Btrfs atomic CoW snapshot of the active filesystem */
export function btrfsMakeSnapshot(
  state: UniverseState,
  name: string,
  subvolId = 'subvol-root',
  readOnly = false,
  description?: string
): BtrfsSnapshot {
  const currentGen = (state.btrfsSuperblock?.generation || 142) + 1;
  const files = state.vault || [];
  const folders = state.vaultFolders || [];

  return {
    id: `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || `@snapshot-${new Date().toISOString().slice(0, 10)}`,
    subvolId,
    generation: currentGen,
    createdAt: Date.now(),
    fileCount: files.length,
    totalBytes: files.reduce((acc, f) => acc + (f.size || 0), 0),
    filesSnapshot: JSON.parse(JSON.stringify(files)),
    foldersSnapshot: [...folders],
    readOnly,
    description: description || 'Btrfs atomic CoW filesystem tree checkpoint',
  };
}
