import { useEffect, useMemo, useState } from 'react';
import type { BodyKind, CosmicBody, Meaning } from '../types';
import { MEANING_LABEL, MEANINGS } from '../types';
import { actions, computeStats, eventsOf, fmtBytes, fmtDate, fmtStamp, snapshotAt } from '../state';
import { useUniverse, toast } from './bits';

interface Props {
  onClose: () => void;
  onInspect: (id: string) => void;
  onTemporal: (ms: number | null) => void;
  onEnterWorld: (id: string) => void;
}

const MINUTE = 60000;

const MEANING_COLOR: Record<string, string> = {
  memory: '#7fc4e8', dream: '#b49ae8', person: '#f2a0b0', project: '#f2c178',
  moment: '#e0785a', idea: '#9fd8a8', chapter: '#d8b48a', unresolved: '#8b93a8',
};

const MEANING_DESC: Record<string, string> = {
  memory: 'something that happened and stays with you',
  idea: 'a thought not yet condensed into a world',
  person: 'someone this universe orbits around',
  dream: 'night logic — vivid, unverified',
  project: 'work in motion, half-built terrain',
  moment: 'brief, bright, gone fast',
  unresolved: 'an open question that still has mass',
  chapter: 'a long arc of life, ringed and slow',
};

const KIND_LABEL: Record<BodyKind, string> = {
  star: 'Star Core', planet: 'Planet', dwarf: 'Dwarf World', nebula: 'Nebula', hole: 'Black Hole', vault: 'Universal Vault',
};

const KIND_ICON: Record<BodyKind, string> = {
  star: '☀️', planet: '🪐', dwarf: '🌕', nebula: '🌌', hole: '🕳️', vault: '🔒',
};

/* Vector icons */
const I = {
  close: <path d="M5 5l10 10M15 5L5 15" />,
  pencil: <path d="M4 16l1-4L14 3l3 3-9 9-4 1zM12 5l3 3" />,
  trash: <path d="M5 7h10M9 7V5h2v2M6.5 7l.7 9h5.6l.7-9M8.5 10v4M11.5 10v4" />,
  play: <path d="M7 5l9 5-9 5V5z" />,
  pause: <path d="M6 5h3v10H6zM11 5h3v10h-3z" />,
  plus: <path d="M10 4v12M4 10h12" />,
  book: <path d="M4 5.5C6 4.4 8.5 4.4 10 5.6c1.5-1.2 4-1.2 6-.1V15c-2-1.1-4.5-1.1-6 .1-1.5-1.2-4-1.2-6-.1V5.5zM10 5.6V15" />,
  eye: <path d="M3 10s2.6-4.5 7-4.5S17 10 17 10s-2.6 4.5-7 4.5S3 10 3 10zM10 10a1.8 1.8 0 100-.01" />,
  search: <path d="M14.5 14.5l3.5 3.5M9 15a6 6 0 100-12 6 6 0 000 12z" />,
  download: <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 17h14" />,
  upload: <path d="M10 13V3m0 0L6 7m4-4l4 4M3 17h14" />,
  reset: <path d="M3 10a7 7 0 101.9-4.9M3 4v6h6" />,
  planet: <path d="M10 3a7 7 0 100 14 7 7 0 000-14zM2 10c0-2 4-4 8-4s8 2 8 4-4 4-8 4-8-2-8-4z" />,
  clock: <path d="M10 4v6l4 2M10 18a8 8 0 100-16 8 8 0 000 16z" />,
  cpu: <path d="M4 4h12v12H4zM8 2v2M12 2v2M8 16v2M12 16v2M2 8h2M2 12h2M16 8h2M16 12h2" />,
};

function Icon({ d, size = 14 }: { d: keyof typeof I; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {I[d]}
    </svg>
  );
}

function MeaningChip({ m, dim }: { m: Meaning; dim?: boolean }) {
  if (!m) return <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-paper/30">—</span>;
  const c = MEANING_COLOR[m] ?? '#8b93a8';
  return (
    <span
      title={MEANING_DESC[m]}
      className="inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.16em] uppercase px-2 py-0.5 rounded border transition-colors"
      style={{
        color: dim ? 'rgba(233,236,241,0.35)' : c,
        borderColor: dim ? 'rgba(233,236,241,0.12)' : `${c}44`,
        background: dim ? 'transparent' : `${c}12`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dim ? 'rgba(233,236,241,0.3)' : c }} />
      {MEANING_LABEL[m]}
    </span>
  );
}

export default function CoreMode({ onClose, onInspect, onTemporal, onEnterWorld }: Props) {
  const state = useUniverse();
  const [activeTab, setActiveTab] = useState<'objects' | 'timeline' | 'system'>('objects');
  const [t, setT] = useState<number>(() => Date.now());
  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState<CosmicBody | null>(null);
  const [creating, setCreating] = useState(false);

  /* search & filters for objects */
  const [search, setSearch] = useState('');
  const [selectedMeaning, setSelectedMeaning] = useState<Meaning | 'all'>('all');
  const [selectedKind, setSelectedKind] = useState<BodyKind | 'all'>('all');

  const max = Date.now();
  const events = useMemo(() => eventsOf(state), [state]);
  const min = events.length ? Math.min(events[0].t, max - 30 * 86400000) : max - 365 * 86400000;
  const isPast = max - t > MINUTE;
  const asOf = isPast ? t : undefined;

  const stats = useMemo(() => computeStats(state, asOf), [state, asOf]);
  const snap = useMemo(() => (asOf ? snapshotAt(state, asOf) : null), [state, asOf]);
  const laterCount = asOf
    ? state.bodies.filter((b) => b.id !== 'anchor' && b.createdAt > asOf).length +
      state.entries.filter((e) => e.createdAt > asOf).length
    : 0;

  useEffect(() => { onTemporal(isPast ? t : null); }, [t, isPast, onTemporal]);
  useEffect(() => () => onTemporal(null), [onTemporal]);

  /* temporal playback loop — throttled to ~25fps state updates to keep WebGL smooth and prevent UI jank */
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let lastUpdate = last;
    const span = max - min;
    const loop = (n: number) => {
      last = n;
      const elapsed = n - lastUpdate;
      if (elapsed >= 40) {
        lastUpdate = n;
        setT((cur) => {
          const next = cur + elapsed * (span / 12000);
          if (next >= max) { setPlaying(false); return max; }
          return next;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, min, max]);

  const pagesOf = (id: string) => state.entries.filter((e) => e.planetId === id);
  const visibleEvents = useMemo(() => events.filter((e) => e.t <= t).reverse(), [events, t]);

  /* Filtered bodies */
  const filteredBodies = useMemo(() => {
    return state.bodies.filter((b) => {
      if (b.id === 'anchor') return false;
      if (selectedKind !== 'all' && b.kind !== selectedKind) return false;
      if (selectedMeaning !== 'all' && b.meaning !== selectedMeaning) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchNote = b.note?.toLowerCase().includes(q);
        const matchMeaning = b.meaning?.toLowerCase().includes(q);
        if (!matchName && !matchNote && !matchMeaning) return false;
      }
      return true;
    });
  }, [state.bodies, selectedKind, selectedMeaning, search]);

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `universe-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Universe backup exported');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        actions.importUniverse(parsed);
        toast('Universe state restored from backup');
      } catch (err) {
        toast('Failed to parse JSON backup file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto overlay-in bg-slate-950/20 flex flex-col justify-between p-6 md:p-8 overflow-hidden text-paper">
      {/* Past temporal veil tint */}
      {isPast && (
        <div className="absolute inset-0 temporal-veil pointer-events-none" />
      )}

      {/* Top right floating Close / Return button */}
      <div className="absolute top-6 right-8 z-[110] flex items-center gap-3">
        {isPast && (
          <button
            onClick={() => { setPlaying(false); setT(max); }}
            className="sifi-btn-gold px-3 py-1 rounded font-mono text-[10px] tracking-wider uppercase shadow-[0_0_12px_rgba(242,193,120,0.3)]"
          >
            Return to Now
          </button>
        )}
        <button
          onClick={onClose}
          aria-label="Close Core Mode"
          className="w-8 h-8 grid place-items-center text-paper/50 hover:text-paper hover:bg-paper/10 rounded-lg transition-all"
        >
          <Icon d="close" size={16} />
        </button>
      </div>

      {/* MAIN TWO-COLUMN CONTAINER MATCHING SCREENSHOT */}
      <main className="flex-1 min-h-0 grid grid-cols-12 gap-6 lg:gap-10 overflow-hidden max-w-[1400px] w-full mx-auto pt-2 pb-4">
        
        {/* ================= LEFT COLUMN: COSMIC OBJECTS ================= */}
        <section className="col-span-7 flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div className="shrink-0 mb-3 pb-2.5 border-b border-paper/15">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-mono text-[13px] tracking-[0.35em] uppercase text-paper font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-ice animate-pulse" />
                  COSMIC OBJECTS
                </h2>
                <p className="text-[11.5px] text-paper/60 leading-normal mt-1 max-w-xl">
                  Every world is a thought you gave mass. <span className="font-semibold text-paper/80 uppercase">MEANING</span> is what it represents to you. Its <span className="font-semibold text-paper/80 font-mono">moons</span> are its diary pages — one moon per page.
                </p>
              </div>

              <button
                onClick={() => setCreating(true)}
                className="shrink-0 border border-teal-ice/40 hover:border-teal-ice bg-transparent hover:bg-teal-ice/10 text-teal-ice px-3 py-1.5 rounded font-mono text-[10px] tracking-wider uppercase flex items-center gap-1.5 transition-all shadow-sm font-semibold"
              >
                + FORM NEW WORLD
              </button>
            </div>

            {/* Quick Search & Filters Bar */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-paper/10">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-2 text-paper/40 pointer-events-none">
                  <Icon d="search" size={12} />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter worlds..."
                  className="w-full bg-slate-900/60 border border-paper/15 focus:border-teal-ice/70 rounded-md px-2.5 py-1 pl-8 text-[11px] text-paper placeholder:text-paper/35 outline-none transition-all"
                />
              </div>

              <select
                value={selectedMeaning || 'all'}
                onChange={(e) => setSelectedMeaning(e.target.value as Meaning | 'all')}
                className="bg-slate-900/80 border border-paper/15 focus:border-teal-ice/70 rounded-md px-2 py-1 text-[10px] font-mono tracking-wider uppercase text-paper/80 outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-paper">All Meanings</option>
                {MEANINGS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-paper">
                    {MEANING_LABEL[m.id]}
                  </option>
                ))}
              </select>

              <select
                value={selectedKind}
                onChange={(e) => setSelectedKind(e.target.value as BodyKind | 'all')}
                className="bg-slate-900/80 border border-paper/15 focus:border-teal-ice/70 rounded-md px-2 py-1 text-[10px] font-mono tracking-wider uppercase text-paper/80 outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-paper">All Kinds</option>
                <option value="planet" className="bg-slate-900 text-paper">Planets</option>
                <option value="dwarf" className="bg-slate-900 text-paper">Dwarf Worlds</option>
                <option value="nebula" className="bg-slate-900 text-paper">Nebulae</option>
                <option value="hole" className="bg-slate-900 text-paper">Black Holes</option>
                <option value="vault" className="bg-slate-900 text-paper">Vaults</option>
              </select>
            </div>
          </div>

          {/* Column Headers */}
          <div className="shrink-0 grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_0.6fr_1.1fr_auto] gap-4 px-3 py-2 border-b border-paper/15 font-mono text-[9px] tracking-[0.25em] uppercase text-paper/50 font-semibold">
            <span>OBJECT</span>
            <span>MEANING</span>
            <span>MOONS</span>
            <span>FORMED</span>
            <span className="text-right">ACTIONS</span>
          </div>

          {/* Y-AXIS SCROLLABLE LIST OF WORLDS */}
          <div className="flex-1 min-h-0 overflow-y-auto thin-scroll divide-y divide-paper/10 pt-1">
            {filteredBodies.length === 0 ? (
              <div className="py-16 text-center text-paper/40 font-mono text-[11px] tracking-wider">
                No cosmic objects match criteria
              </div>
            ) : (
              filteredBodies.map((b) => {
                const pages = pagesOf(b.id).length;
                const isLater = asOf !== undefined && b.createdAt > asOf;
                return (
                  <div
                    key={b.id}
                    className="group grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_0.6fr_1.1fr_auto] gap-4 items-center px-3 py-2.5 hover:bg-paper/5 transition-all rounded-lg border-l-2 border-l-transparent hover:border-l-teal-ice/70"
                  >
                    <button
                      onClick={() => onInspect(b.id)}
                      className="min-w-0 text-left group-hover:translate-x-1 transition-transform"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] opacity-75">{KIND_ICON[b.kind]}</span>
                        <span className="font-display text-[14.5px] font-medium text-paper group-hover:text-teal-ice transition-colors truncate">
                          {b.name}
                        </span>
                      </div>
                      <div className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-paper/40 mt-0.5">
                        {b.kind === 'vault' ? 'UNIVERSAL VAULT · SEALED' : KIND_LABEL[b.kind]}
                      </div>
                    </button>

                    <div>
                      {b.meaning ? (
                        <MeaningChip m={b.meaning} dim={isLater} />
                      ) : (
                        <span className="font-mono text-[11px] text-paper/30">—</span>
                      )}
                    </div>

                    <span className="font-mono text-[11px] text-paper/70 tabular-nums">
                      • {pages}
                    </span>

                    <span className="font-mono text-[10.5px] text-paper/50 tabular-nums">
                      {fmtDate(b.createdAt)}
                    </span>

                    <div className="flex items-center gap-1.5 justify-end opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Focus 3D View"
                        onClick={() => onInspect(b.id)}
                        className="p-1.5 rounded text-paper/70 hover:text-teal-ice hover:bg-teal-ice/10 transition-all"
                      >
                        <Icon d="eye" size={13} />
                      </button>
                      {b.kind !== 'vault' && (
                        <button
                          title="Open Diary Moons"
                          onClick={() => onEnterWorld(b.id)}
                          className="p-1.5 rounded text-solar/80 hover:text-solar hover:bg-solar/10 transition-all"
                        >
                          <Icon d="book" size={13} />
                        </button>
                      )}
                      <button
                        title="Edit World Settings"
                        onClick={() => setEditing(b)}
                        className="p-1.5 rounded text-paper/70 hover:text-paper hover:bg-paper/10 transition-all"
                      >
                        <Icon d="pencil" size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ================= RIGHT COLUMN: UNIVERSE TIMELINE & CHRONICLE ================= */}
        <section className="col-span-5 flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div className="shrink-0 mb-3 pb-2 border-b border-paper/15">
            <h2 className="font-mono text-[13px] tracking-[0.35em] uppercase text-paper font-semibold flex items-center gap-2">
              <Icon d="clock" size={13} />
              UNIVERSE TIMELINE
            </h2>
            <p className="text-[11.5px] text-paper/60 leading-normal mt-1">
              Drag to rewind the universe itself. Anything not yet formed at that moment is removed from space until you return to now.
            </p>
          </div>

          {/* Time Readout & Replay Button */}
          <div className="shrink-0 space-y-2 pb-4 border-b border-paper/15">
            <div className="flex items-center justify-between">
              <div className={`font-display text-[24px] font-medium tracking-[0.04em] tabular-nums ${isPast ? 'text-solar sifi-glow-gold' : 'text-paper'}`}>
                {fmtStamp(t)}
              </div>
              <button
                onClick={() => {
                  if (!playing && t >= max - MINUTE) setT(min);
                  setPlaying((p) => !p);
                }}
                className="border border-solar/40 hover:border-solar text-solar hover:bg-solar/10 px-3.5 py-1 rounded font-mono text-[10px] tracking-wider uppercase flex items-center gap-1.5 transition-all shadow-sm font-semibold"
              >
                <Icon d={playing ? 'pause' : 'play'} size={11} /> {playing ? 'PAUSE' : 'REPLAY'}
              </button>
            </div>

            {/* Timeline Slider */}
            <div className="space-y-1.5 pt-1">
              <input
                type="range"
                min={min}
                max={max}
                step={MINUTE}
                value={t}
                onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }}
                className="timeline-range w-full cursor-pointer"
                aria-label="Universe timeline slider"
              />
              <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.2em] uppercase text-paper/40">
                <span>{fmtDate(min).toUpperCase()}</span>
                <span>{fmtDate(max).toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Chronicle Feed Section */}
          <div className="flex-1 min-h-0 flex flex-col pt-3 overflow-hidden">
            <div className="shrink-0 flex items-center justify-between pb-2.5 border-b border-paper/15">
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-paper/80 font-semibold">
                CHRONICLE
              </span>
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-paper/50">
                {state.bodies.length - 1} WORLDS · {state.entries.length} PAGES
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto thin-scroll space-y-2.5 pt-3">
              {visibleEvents.length === 0 ? (
                <div className="py-12 text-center text-paper/40 font-mono text-[10.5px]">No chronicle events logged</div>
              ) : (
                visibleEvents.map((e) => (
                  <button
                    key={e.refId + e.t}
                    onClick={() => { setPlaying(false); setT(e.t); }}
                    className="w-full text-left flex items-start gap-2.5 group opacity-75 hover:opacity-100 transition-all p-1.5 rounded hover:bg-paper/5"
                  >
                    <span
                      className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full"
                      style={{ background: e.kind === 'body' ? '#7fc4e8' : e.kind === 'entry' ? '#f2c178' : '#e0785a' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[9px] tabular-nums text-paper/50 group-hover:text-solar transition-colors">
                        {fmtStamp(e.t)}
                      </div>
                      <div className="text-[12px] text-paper truncate mt-0.5 font-medium">
                        {e.label}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

      </main>

      {/* ================= BOTTOM FOOTER ================= */}
      <footer className="shrink-0 pt-4 border-t border-paper/15 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[9.5px] tracking-[0.22em] uppercase text-paper/50 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <span>CORE MODE — DRAG THE TIMELINE TO REWIND THE UNIVERSE · ESC TO LEAVE</span>
          <div className="hidden md:flex items-center gap-2 text-paper/30">
            <span>·</span>
            <button onClick={handleExportJSON} className="hover:text-paper transition-colors">EXPORT JSON</button>
            <span>·</span>
            <label className="hover:text-paper cursor-pointer transition-colors">
              IMPORT JSON
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>
        <div className="text-[8.5px] text-paper/40">
          DRAG ORBITS · SHIFT / RIGHT-DRAG / ARROWS PANS · DOUBLE-CLICK ENTERS · ? SHORTCUTS
        </div>
      </footer>

      {/* World Editor Dialog */}
      {editing && <WorldEditor body={editing} onClose={() => setEditing(null)} onEnterWorld={onEnterWorld} />}
      {/* World Former Dialog */}
      {creating && <WorldFormer onClose={() => setCreating(false)} />}
    </div>
  );
}

/* --------------------------- WORLD EDITOR MODAL --------------------------- */

function WorldEditor({ body, onClose, onEnterWorld }: { body: CosmicBody; onClose: () => void; onEnterWorld: (id: string) => void }) {
  const state = useUniverse();
  const [name, setName] = useState(body.name);
  const [meaning, setMeaning] = useState<Meaning>(body.meaning);
  const [note, setNote] = useState(body.note);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmPage, setConfirmPage] = useState<string | null>(null);
  const pages = state.entries.filter((e) => e.planetId === body.id).sort((a, b) => b.createdAt - a.createdAt);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onClose]);

  const save = () => {
    actions.renameBody(body.id, name);
    actions.setMeaning(body.id, meaning);
    actions.setNote(body.id, note);
    toast('World settings updated');
    onClose();
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-[120] flex items-center justify-center overlay-in bg-slate-950/40" onClick={onClose}>
      <div
        className="w-[640px] max-w-[92vw] max-h-[86vh] flex flex-col hud-pod-card border border-solar/40 shadow-[0_30px_90px_rgba(0,0,0,0.8),0_0_45px_rgba(242,193,120,0.2)] rise-in overflow-hidden sifi-corners"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-solar/25 bg-slate-950/50">
          <div>
            <p className="font-mono text-[9px] tracking-[0.34em] uppercase sifi-glow-gold">{KIND_LABEL[body.kind]} · formed {fmtDate(body.createdAt)}</p>
            <h3 className="font-display text-[20px] font-medium tracking-[0.08em] text-paper mt-0.5 sifi-glow-cyan">EDIT COSMIC WORLD</h3>
          </div>
          <button onClick={onClose} aria-label="Close edit window" className="w-8 h-8 grid place-items-center text-paper/50 hover:text-paper rounded-lg border border-teal-ice/30 hover:border-teal-ice/60 transition-colors">
            <Icon d="close" size={14} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto thin-scroll px-6 py-5 space-y-5">
          <label className="block">
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-paper/50">World Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1.5 bg-slate-950/70 border border-teal-ice/30 focus:border-teal-ice/80 outline-none rounded-lg px-3.5 py-2.5 text-[14px] text-paper font-medium shadow-inner transition-all focus:shadow-[0_0_15px_rgba(111,194,180,0.2)]"
            />
          </label>

          <div>
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-paper/50 block mb-2">Meaning — Core Representation</span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(MEANING_DESC) as (keyof typeof MEANING_DESC)[]).map((m) => {
                const active = meaning === m;
                const c = MEANING_COLOR[m];
                return (
                  <button
                    key={m}
                    onClick={() => setMeaning(m as Meaning)}
                    className={`text-left px-3.5 py-2.5 rounded-lg border transition-all ${
                      active ? 'bg-solar/15 border-solar/70 shadow-[0_0_15px_rgba(242,193,120,0.2)]' : 'bg-slate-950/40 border-teal-ice/20 hover:bg-teal-ice/10'
                    }`}
                  >
                    <span className="block font-mono text-[9.5px] tracking-[0.2em] uppercase font-bold" style={{ color: active ? c : 'rgba(233,236,241,0.7)' }}>
                      {MEANING_LABEL[m]}
                    </span>
                    <span className="block text-[11px] text-paper/40 mt-0.5 leading-snug">{MEANING_DESC[m]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-paper/50">Cosmic Note</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full mt-1.5 bg-slate-950/70 border border-teal-ice/30 focus:border-teal-ice/80 outline-none rounded-lg px-3.5 py-2.5 text-[13px] text-paper/85 resize-none leading-relaxed shadow-inner transition-all focus:shadow-[0_0_15px_rgba(111,194,180,0.2)]"
            />
          </label>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-paper/50">Moons / Diary Pages</span>
              <span className="font-mono text-[10px] text-paper/50 tabular-nums">{pages.length} Moons</span>
            </div>
            <div className="border border-teal-ice/20 rounded-xl bg-slate-950/60 divide-y divide-teal-ice/15 max-h-[160px] overflow-y-auto thin-scroll">
              {pages.length === 0 && <p className="px-4 py-3 text-[12px] text-paper/35">No moons orbiting this world yet.</p>}
              {pages.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3.5 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-paper/85 truncate">{p.title}</span>
                    <span className="block font-mono text-[9px] text-paper/40 tabular-nums">{fmtStamp(p.createdAt)}</span>
                  </span>
                  <button
                    onClick={() => onEnterWorld(body.id)}
                    className="sifi-btn px-2.5 py-1 rounded-md text-[9px]"
                  >
                    Open
                  </button>
                  {confirmPage === p.id ? (
                    <button
                      onClick={() => { actions.deleteEntry(p.id); setConfirmPage(null); toast('Page deleted'); }}
                      className="font-mono text-[9px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={() => { setConfirmPage(p.id); setTimeout(() => setConfirmPage((c) => (c === p.id ? null : c)), 2600); }}
                      className="p-1 rounded text-paper/40 hover:text-rose-400 transition-colors"
                    >
                      <Icon d="trash" size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-rose-500/40 rounded-xl p-4 bg-rose-950/25 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[9.5px] tracking-[0.24em] uppercase text-rose-300 font-semibold">Dissolve World</p>
              <p className="text-[11.5px] text-paper/50 mt-0.5">Permanently removes this world and all attached diary pages.</p>
            </div>
            {confirmDel ? (
              <button
                onClick={() => { actions.deleteBody(body.id); toast(`${body.name} dissolved`); onClose(); }}
                className="shrink-0 font-mono text-[9.5px] tracking-[0.2em] uppercase px-4 py-2 rounded-lg bg-rose-500/35 border border-rose-500 text-rose-100 hover:bg-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all"
              >
                Confirm Dissolve
              </button>
            ) : (
              <button
                onClick={() => { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); }}
                className="shrink-0 font-mono text-[9.5px] tracking-[0.2em] uppercase px-4 py-2 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/15 transition-all"
              >
                Dissolve
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-solar/20 bg-slate-950/50 flex justify-end gap-3">
          <button onClick={onClose} className="font-mono text-[9.5px] tracking-[0.2em] uppercase px-4 py-2 rounded-lg text-paper/60 hover:text-paper transition-colors">
            Cancel
          </button>
          <button onClick={save} className="sifi-btn-gold px-5 py-2 rounded-lg">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- WORLD FORMER MODAL --------------------------- */

function WorldFormer({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<BodyKind>('planet');
  const [meaning, setMeaning] = useState<Meaning>('idea');

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onClose]);

  const kinds: BodyKind[] = ['planet', 'dwarf', 'nebula', 'hole'];

  const create = () => {
    if (!name.trim()) { toast('Please enter a world name'); return; }
    const b = actions.addBody(name.trim(), kind, meaning);
    toast(`${b.name} formed in your universe`);
    onClose();
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-[120] flex items-center justify-center overlay-in bg-slate-950/40" onClick={onClose}>
      <div
        className="w-[480px] max-w-[92vw] hud-pod-card border border-solar/40 shadow-[0_30px_90px_rgba(0,0,0,0.8),0_0_45px_rgba(242,193,120,0.2)] rise-in overflow-hidden sifi-corners"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-solar/25 bg-slate-950/50">
          <p className="font-mono text-[9px] tracking-[0.34em] uppercase sifi-glow-gold">Cosmic Accretion</p>
          <h3 className="font-display text-[20px] font-medium tracking-[0.08em] text-paper mt-0.5 sifi-glow-cyan">FORM NEW COSMIC WORLD</h3>
        </div>

        <div className="px-6 py-5 space-y-5">
          <label className="block">
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-paper/50">World Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="e.g. Solstice"
              className="w-full mt-1.5 bg-slate-950/70 border border-teal-ice/30 focus:border-teal-ice/80 outline-none rounded-lg px-3.5 py-2.5 text-[14px] text-paper placeholder:text-paper/25 shadow-inner transition-all focus:shadow-[0_0_15px_rgba(111,194,180,0.2)]"
            />
          </label>

          <div>
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-paper/50 block mb-2">Body Type</span>
            <div className="grid grid-cols-4 gap-2">
              {kinds.map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`font-mono text-[9.5px] tracking-[0.16em] uppercase py-2.5 rounded-lg border transition-all ${
                    kind === k ? 'bg-solar/20 border-solar text-solar font-bold shadow-[0_0_15px_rgba(242,193,120,0.25)]' : 'bg-slate-950/40 border-teal-ice/20 text-paper/60 hover:bg-teal-ice/10'
                  }`}
                >
                  {KIND_LABEL[k].split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-paper/50 block mb-2">Meaning / Significance</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(MEANING_DESC) as (keyof typeof MEANING_DESC)[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMeaning(m as Meaning)}
                  className="font-mono text-[9.5px] tracking-[0.16em] uppercase px-3 py-1.5 rounded-lg border transition-all"
                  style={{
                    borderColor: meaning === m ? `${MEANING_COLOR[m]}aa` : 'rgba(233,236,241,0.15)',
                    color: meaning === m ? MEANING_COLOR[m] : 'rgba(233,236,241,0.5)',
                    background: meaning === m ? `${MEANING_COLOR[m]}20` : 'transparent',
                    boxShadow: meaning === m ? `0 0 12px ${MEANING_COLOR[m]}30` : 'none',
                  }}
                >
                  {MEANING_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-solar/25 bg-slate-950/50 flex justify-end gap-3">
          <button onClick={onClose} className="font-mono text-[9.5px] tracking-[0.2em] uppercase px-4 py-2 rounded-lg text-paper/60 hover:text-paper transition-colors">
            Cancel
          </button>
          <button onClick={create} className="sifi-btn-gold px-5 py-2 rounded-lg">
            Form World
          </button>
        </div>
      </div>
    </div>
  );
}
