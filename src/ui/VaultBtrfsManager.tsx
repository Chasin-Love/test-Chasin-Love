import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  CheckCircle2,
  Copy,
  Database,
  FileCode,
  FolderTree,
  HardDrive,
  History,
  Layers,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { actions, computeBtrfsStats, fmtBytes, fmtDate } from '../state';
import type { BtrfsScrubReport, BtrfsSnapshot, BtrfsSubvolume, VaultFile } from '../types';
import { toast, useUniverse } from './bits';

export function VaultBtrfsManager() {
  const state = useUniverse();
  const [tab, setTab] = useState<'subvols' | 'snapshots' | 'scrub' | 'reflink'>('subvols');

  // Subvolume creation form
  const [newSubvolName, setNewSubvolName] = useState('');
  const [newSubvolPath, setNewSubvolPath] = useState('');

  // Snapshot creation form
  const [newSnapName, setNewSnapName] = useState('');
  const [newSnapDesc, setNewSnapDesc] = useState('');
  const [snapReadOnly, setSnapReadOnly] = useState(false);

  // Live scrub status
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubProgress, setScrubProgress] = useState(0);
  const [scrubCurrentFile, setScrubCurrentFile] = useState('');

  // Reflink clone tool
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [reflinkName, setReflinkName] = useState<string>('');

  const stats = computeBtrfsStats(state);
  const subvolumes = state.btrfsSubvolumes || [];
  const snapshots = state.btrfsSnapshots || [];
  const activeSubvol = subvolumes.find((s) => s.id === state.activeSubvolId) || subvolumes[0];
  const scrubReport: BtrfsScrubReport | undefined = state.btrfsScrub;

  const handleCreateSubvol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubvolName.trim()) return;
    const sub = actions.btrfsCreateSubvolume(newSubvolName, newSubvolPath);
    toast(`Btrfs subvolume ${sub.name} created (Root ID ${sub.rootId})`);
    setNewSubvolName('');
    setNewSubvolPath('');
  };

  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const snap = actions.btrfsCreateSnapshot(
      newSnapName,
      state.activeSubvolId || 'subvol-root',
      snapReadOnly,
      newSnapDesc
    );
    toast(`Atomic Btrfs snapshot '${snap.name}' sealed`);
    setNewSnapName('');
    setNewSnapDesc('');
  };

  const handleRunScrub = async () => {
    setScrubbing(true);
    setScrubProgress(0);
    setScrubCurrentFile('Initializing B-Tree checksum scrub…');

    const report = await actions.btrfsRunLiveScrub((percent, currentFile) => {
      setScrubProgress(percent);
      setScrubCurrentFile(currentFile);
    });

    setScrubbing(false);
    toast(`Btrfs Scrub Complete: ${report.status.toUpperCase()} (${report.filesScanned} files scanned)`);
  };

  const handleReflinkClone = (fileId: string) => {
    const cloned = actions.btrfsCloneFileReflink(fileId, undefined, reflinkName.trim() || undefined);
    if (cloned) {
      toast(`Zero-cost reflink clone created: ${cloned.name}`);
      setReflinkName('');
      setSelectedFileId('');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950/80 text-slate-100 rounded-lg border border-teal-500/20">
      {/* Top Banner: Btrfs Superblock & Global Metrics */}
      <div className="p-4 bg-slate-900/90 border-b border-teal-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Layers className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold tracking-wider text-teal-300 uppercase">
                Btrfs Copy-on-Write File System
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-teal-950 text-teal-400 border border-teal-500/40">
                UUID: {stats.superblock.uuid.slice(0, 16)}…
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                ACTIVE: {activeSubvol?.name ?? '@root'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              B-Tree Gen #{stats.bTreeGenerations} • Compression:{' '}
              <span className="text-teal-300 uppercase font-mono">{stats.superblock.compression}</span> (
              {stats.compressionRatio}x ratio) • Integrity: CRC32C / SHA-256
            </p>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded bg-slate-800/80 border border-slate-700/60 text-right">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Total Space Saved</div>
            <div className="text-xs font-mono font-bold text-teal-400">
              {fmtBytes(stats.totalSavingsBytes)}
            </div>
          </div>
          <div className="px-3 py-1.5 rounded bg-slate-800/80 border border-slate-700/60 text-right">
            <div className="text-[10px] font-mono text-slate-400 uppercase">CoW Reflink Extents</div>
            <div className="text-xs font-mono font-bold text-purple-400">
              {stats.reflinkCount} clones
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900/50 px-4">
        <button
          onClick={() => setTab('subvols')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-mono tracking-wider border-b-2 transition-colors ${
            tab === 'subvols'
              ? 'border-teal-400 text-teal-300 bg-teal-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          Subvolumes ({subvolumes.length})
        </button>

        <button
          onClick={() => setTab('snapshots')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-mono tracking-wider border-b-2 transition-colors ${
            tab === 'snapshots'
              ? 'border-teal-400 text-teal-300 bg-teal-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Snapshots ({snapshots.length})
        </button>

        <button
          onClick={() => setTab('scrub')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-mono tracking-wider border-b-2 transition-colors ${
            tab === 'scrub'
              ? 'border-teal-400 text-teal-300 bg-teal-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Data Scrub & Repair
        </button>

        <button
          onClick={() => setTab('reflink')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-mono tracking-wider border-b-2 transition-colors ${
            tab === 'reflink'
              ? 'border-teal-400 text-teal-300 bg-teal-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Copy className="w-3.5 h-3.5" />
          Reflink & Compression
        </button>
      </div>

      {/* Main Tab Viewports */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: SUBVOLUMES */}
        {tab === 'subvols' && (
          <div className="space-y-4">
            {/* Create Subvolume Form */}
            <form
              onSubmit={handleCreateSubvol}
              className="p-3.5 bg-slate-900/60 rounded-lg border border-slate-800 flex flex-wrap items-center gap-3"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Subvolume Name (e.g. @realities, @projects)
                </label>
                <input
                  type="text"
                  value={newSubvolName}
                  onChange={(e) => setNewSubvolName(e.target.value)}
                  placeholder="@subvolume_name"
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Mount Point Path (Optional)
                </label>
                <input
                  type="text"
                  value={newSubvolPath}
                  onChange={(e) => setNewSubvolPath(e.target.value)}
                  placeholder="/subvolumes/@name"
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="mt-4 px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-slate-950 font-mono text-xs font-bold rounded flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                btrfs subvol create
              </button>
            </form>

            {/* Subvolume List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subvolumes.map((sub) => {
                const isActive = sub.id === state.activeSubvolId;
                return (
                  <div
                    key={sub.id}
                    className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all ${
                      isActive
                        ? 'bg-teal-950/20 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)]'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-teal-300 flex items-center gap-2">
                          <FolderTree className="w-4 h-4 text-teal-400" />
                          {sub.name}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                            MOUNTED ROOT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-1">Path: {sub.path}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-2">
                        <span>Tree Root ID: #{sub.rootId}</span>
                        <span>Gen #{sub.generation}</span>
                        <span>Created: {fmtDate(sub.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => actions.btrfsSetActiveSubvolume(sub.id)}
                        disabled={isActive}
                        className={`px-3 py-1 text-[11px] font-mono rounded transition-colors ${
                          isActive
                            ? 'bg-slate-800 text-slate-500 cursor-default'
                            : 'bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 border border-teal-500/30'
                        }`}
                      >
                        {isActive ? 'Current Tree' : 'Mount Subvolume'}
                      </button>

                      {sub.id !== 'subvol-root' && sub.id !== 'subvol-snapshots' && (
                        <button
                          onClick={() => actions.btrfsDeleteSubvolume(sub.id)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          title="btrfs subvolume delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ATOMIC COW SNAPSHOTS */}
        {tab === 'snapshots' && (
          <div className="space-y-4">
            {/* Create Snapshot Form */}
            <form
              onSubmit={handleCreateSnapshot}
              className="p-3.5 bg-slate-900/60 rounded-lg border border-slate-800 flex flex-wrap items-center gap-3"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Snapshot Label
                </label>
                <input
                  type="text"
                  value={newSnapName}
                  onChange={(e) => setNewSnapName(e.target.value)}
                  placeholder={`@snapshot-${new Date().toISOString().slice(0, 10)}`}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Description / Note
                </label>
                <input
                  type="text"
                  value={newSnapDesc}
                  onChange={(e) => setNewSnapDesc(e.target.value)}
                  placeholder="e.g., Pre-warp reality jump checkpoint"
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="snapRo"
                  checked={snapReadOnly}
                  onChange={(e) => setSnapReadOnly(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0"
                />
                <label htmlFor="snapRo" className="text-xs text-slate-300 font-mono">
                  Read-Only (-r)
                </label>
              </div>

              <button
                type="submit"
                className="mt-4 px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-slate-950 font-mono text-xs font-bold rounded flex items-center gap-1.5 transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                btrfs subvol snapshot
              </button>
            </form>

            {/* Snapshots List */}
            <div className="space-y-2">
              {snapshots.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-lg">
                  No snapshots recorded yet. Click above to create an instant atomic CoW snapshot.
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3 bg-slate-900/40 border border-slate-800 hover:border-slate-700 rounded-lg flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-200">{snap.name}</span>
                          {snap.readOnly && (
                            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-amber-950 text-amber-300 border border-amber-500/40">
                              RO
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{snap.description}</p>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 mt-1">
                          <span>{snap.fileCount} files</span>
                          <span>{fmtBytes(snap.totalBytes)}</span>
                          <span>B-Tree Gen #{snap.generation}</span>
                          <span>{fmtDate(snap.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Restore Vault tree to snapshot '${snap.name}'? An automatic safety snapshot will be taken prior to rollback.`
                            )
                          ) {
                            actions.btrfsRestoreSnapshot(snap.id);
                            toast(`FileSystem restored to snapshot ${snap.name}`);
                          }
                        }}
                        className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-mono rounded transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Rollback
                      </button>

                      <button
                        onClick={() => actions.btrfsDeleteSnapshot(snap.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete snapshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DATA SCRUB & BIT-ROT HEALING */}
        {tab === 'scrub' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-mono text-xs font-bold text-teal-300 uppercase flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  Btrfs Integrity Scrubbing & Self-Healing
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Btrfs continuous checksum validation continuously scans data blocks for bit-rot caused by silent corruption or cosmic noise. Unreadable or damaged extents are automatically repaired using B-Tree copy trees.
                </p>
              </div>

              <button
                onClick={handleRunScrub}
                disabled={scrubbing}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-slate-950 font-mono text-xs font-bold rounded transition-colors flex items-center gap-2"
              >
                {scrubbing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {scrubbing ? 'Scrubbing Filesystem…' : 'btrfs scrub start'}
              </button>
            </div>

            {/* Scrub Progress Bar */}
            {scrubbing && (
              <div className="p-4 bg-slate-900/80 rounded-lg border border-teal-500/30 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-teal-300">Scrubbing: {scrubCurrentFile}</span>
                  <span className="text-teal-400 font-bold">{scrubProgress}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-teal-500 h-full transition-all duration-150"
                    style={{ width: `${scrubProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Scrub Report & Console Log */}
            {scrubReport && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-900/40 border border-slate-800 rounded">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Status</div>
                    <div className="text-xs font-mono font-bold text-teal-400 uppercase mt-0.5">
                      {scrubReport.status}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900/40 border border-slate-800 rounded">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Items Scanned</div>
                    <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                      {scrubReport.filesScanned} objects
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900/40 border border-slate-800 rounded">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Bytes Verified</div>
                    <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                      {fmtBytes(scrubReport.bytesScanned)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900/40 border border-slate-800 rounded">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Errors Repaired</div>
                    <div className="text-xs font-mono font-bold text-teal-300 mt-0.5">
                      {scrubReport.errorsCorrected} self-healed
                    </div>
                  </div>
                </div>

                {/* Log Output */}
                <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-400 max-h-48 overflow-y-auto space-y-1">
                  {scrubReport.log?.map((line, idx) => (
                    <div
                      key={idx}
                      className={
                        line.includes('[OK]')
                          ? 'text-slate-400'
                          : line.includes('[REPAIRED]')
                          ? 'text-teal-300 font-bold'
                          : line.includes('[BTRFS SCRUB COMPLETE]')
                          ? 'text-purple-300 font-bold border-t border-slate-800 pt-1 mt-1'
                          : 'text-slate-300'
                      }
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REFLINK EXTENTS & COMPRESSION */}
        {tab === 'reflink' && (
          <div className="space-y-4">
            {/* Compression Engine Selector */}
            <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
              <h4 className="font-mono text-xs font-bold text-teal-300 uppercase flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-400" />
                Transparent Inline Compression Engine
              </h4>
              <p className="text-xs text-slate-400">
                Select the transparent compression algorithm applied to data extents prior to IndexedDB storage.
              </p>

              <div className="flex flex-wrap gap-2">
                {(['zstd', 'lzo', 'zlib', 'none'] as const).map((algo) => {
                  const isCurrent = stats.superblock.compression === algo;
                  return (
                    <button
                      key={algo}
                      onClick={() => actions.btrfsSetCompression(algo)}
                      className={`px-4 py-2 font-mono text-xs rounded border transition-colors flex items-center gap-2 ${
                        isCurrent
                          ? 'bg-teal-600/20 text-teal-300 border-teal-500/50 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="uppercase">{algo}</span>
                      {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zero-Cost Reflink Extent Cloning (cp --reflink) */}
            <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
              <h4 className="font-mono text-xs font-bold text-purple-300 uppercase flex items-center gap-2">
                <Copy className="w-4 h-4 text-purple-400" />
                CoW Zero-Cost Extent Cloning (<code className="text-teal-400">cp --reflink</code>)
              </h4>
              <p className="text-xs text-slate-400">
                Instantly duplicate any object in the Vault without allocating additional bytes. The new inode points directly to existing data extent trees until written to.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedFileId}
                  onChange={(e) => setSelectedFileId(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-teal-500 font-mono min-w-[200px]"
                >
                  <option value="">Select file to reflink clone…</option>
                  {state.vault.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({fmtBytes(f.size)})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={reflinkName}
                  onChange={(e) => setReflinkName(e.target.value)}
                  placeholder="Custom cloned name (optional)"
                  className="flex-1 bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-teal-500 font-mono min-w-[200px]"
                />

                <button
                  onClick={() => selectedFileId && handleReflinkClone(selectedFileId)}
                  disabled={!selectedFileId}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-mono text-xs font-bold rounded transition-colors"
                >
                  cp --reflink
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
