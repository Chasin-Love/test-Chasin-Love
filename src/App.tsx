import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { UniverseEngine } from './engine/engine';
import { actions, getState, newId } from './state';
import { MEANING_LABEL, type CosmicBody, type Meaning } from './types';
import { chime, initAudio, isMuted, setAudioMode, toggleMute } from './audio';
import DiaryWindow, { type WinRect } from './ui/DiaryWindow';
import CoreMode from './ui/CoreMode';
import VaultUI from './ui/VaultUI';
import { PhysicsHUD } from './ui/PhysicsHUD';
import { ErrorBoundary, IcLink, toast, ToastHost, useUniverse } from './ui/bits';
import { MultiverseBar } from './components/MultiverseBar';
import { RealityHoverCard } from './components/RealityHoverCard';
import { EditRealityModal } from './components/EditRealityModal';
import { ClusterHoverCard } from './components/ClusterHoverCard';
import { CosmicLineageModal } from './components/CosmicLineageModal';
import { CosmicWebHUD, type CosmicWebSettings } from './components/CosmicWebHUD';
import { getReality, type RealityConfig, type GalaxyClusterData } from './realities';

interface Win { key: string; planetId: string; rect: WinRect; minimized: boolean; maximized?: boolean }

/* when maximized, the diary fills the viewport edge-to-edge (with a slim margin) */
const MAX_RECT = (): WinRect => ({ x: 12, y: 12, w: window.innerWidth - 24, h: window.innerHeight - 24 });

/* bump on every shipped build — lets you confirm the running bundle is current */
export const BUILD = 'R28';

const MEANINGS: Meaning[] = ['memory', 'idea', 'person', 'dream', 'project', 'moment', 'unresolved', 'chapter'];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<UniverseEngine | null>(null);
  const state = useUniverse();

  const [mode, setMode] = useState<'space' | 'core' | 'vault'>('space');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverRealityId, setHoverRealityId] = useState<string | null>(null);
  const [hoverCluster, setHoverCluster] = useState<GalaxyClusterData | null>(null);
  const [hoverScreenPos, setHoverScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [activeLineageCluster, setActiveLineageCluster] = useState<GalaxyClusterData | null>(null);
  const [editingReality, setEditingReality] = useState<RealityConfig | null>(null);
  const [selectId, setSelectId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [label, setLabel] = useState('PLANETARY SYSTEM');
  const [clock, setClock] = useState(() => new Date());
  const [paused, setPaused] = useState(false);
  const [showPhysics, setShowPhysics] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [idle, setIdle] = useState(false);
  const [wins, setWins] = useState<Win[]>([]);
  const [zTop, setZTop] = useState(0);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [entered, setEntered] = useState<string | null>(null);
  const [intro, setIntro] = useState(true);
  const [cosmicSettings, setCosmicSettings] = useState<CosmicWebSettings>({
    mode: 'simulation',
    showMatterDensity: true,
    showDarkMatterHalos: true,
    showFilaments: true,
    showVoidBoundaries: true,
    showClusterMass: true,
    showRedshift: true,
    showCoordinates: true,
  });
  const [showMultiverseBar, setShowMultiverseBar] = useState(false);
  const [kamuiKey, setKamuiKey] = useState(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 5000);
    return () => clearTimeout(t);
  }, []);

  /* announce the running build so you can confirm the bundle is current */
  useEffect(() => {
    console.log(`%c✦ MY UNIVERSE — build ${BUILD}`, 'color:#f2c178;font-weight:bold');
  }, []);

  /* real local time, ticking */
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const clockDate = useMemo(
    () => clock.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
    [clock],
  );
  const clockTime = useMemo(() => clock.toLocaleTimeString(undefined, { hour12: false }), [clock]);

  const bodyOf = useCallback((id: string | null) => (id ? state.bodies.find((b) => b.id === id) ?? null : null), [state.bodies]);

  /* ---------------------------- engine boot ---------------------------- */
  useEffect(() => {
    if (!canvasRef.current || engineRef.current) return;
    const engine = new UniverseEngine(canvasRef.current, getState().bodies, {
      onHover: (id, x, y) => {
        setHoverId(id);
        if (id && id.startsWith('cluster:')) {
          const parts = id.split(':');
          const clusterId = parts[1];
          const rId = parts[2];
          const r = getReality(rId, getState().customRealityDescriptions);
          const cl = r.clusters?.find((c) => c.id === clusterId) ?? null;
          setHoverCluster(cl);
          setHoverRealityId(null);
          if (x !== undefined && y !== undefined) {
            setHoverScreenPos({ x, y });
          }
        } else if (id && id.startsWith('reality:')) {
          const rId = id.replace('reality:', '');
          setHoverRealityId(rId);
          setHoverCluster(null);
          if (x !== undefined && y !== undefined) {
            setHoverScreenPos({ x, y });
          }
        } else {
          setHoverRealityId(null);
          setHoverCluster(null);
          setHoverScreenPos(null);
        }
      },
      onSelect: (id) => setSelectId(id),
      onSelectCluster: (cluster) => {
        setActiveLineageCluster(cluster);
        chime(720);
      },
      onActivate: (id) => {
        if (id === 'anchor') {
          engine.enterCoreMode();
          engine.setConnections(getState().connections.map((c) => [c.a, c.b] as [string, string]));
          setMode('core');
          setAudioMode('core');
          chime(440);
        }
      },
      onPortalPeak: (kind, id) => {
        engine.finishEntry();
        chime(kind === 'vault' ? 520 : 660);
        if (kind === 'vault') {
          setMode('vault');
          setAudioMode('vault');
        } else {
          setEntered(id);
          setAudioMode('diary');
          setWins((cur) => {
            const existing = cur.find((w) => w.planetId === id);
            if (existing) {
              queueMicrotask(() => { setFocusKey(existing.key); setZTop((z) => z + 1); });
              return cur.map((w) => (w.planetId === id ? { ...w, minimized: false } : w));
            }
            const key = newId();
            const n = cur.length;
            queueMicrotask(() => { setFocusKey(key); setZTop((z) => z + 1); });
            return [...cur, {
              key, planetId: id, minimized: false,
              rect: { x: 90 + n * 44, y: 70 + n * 34, w: Math.min(680, window.innerWidth - 200), h: Math.min(520, window.innerHeight - 170) },
            }];
          });
        }
      },
      onPortalDone: () => undefined,
      onContext: (id, x, y) => setMenu({ id, x, y }),
      onScaleLabel: (l) => setLabel(l),
      onSimDate: () => undefined,
      onSelectReality: (realityId) => {
        actions.switchReality(realityId);
        const r = getReality(realityId, getState().customRealityDescriptions);
        toast(`Quantum Warp: Traveled into Reality — ${r.name}`);
        chime(880);
        engineRef.current?.resetView();
      },
      onDoubleClickReality: (realityId) => {
        const r = getReality(realityId, getState().customRealityDescriptions);
        setEditingReality(r);
        chime(520);
      },
      onSelectDemonCore: () => {
        setKamuiKey((k) => k + 1);
        setShowMultiverseBar(true);
        toast('✦ Kamui: Core Activated');
        chime(960);
      },
    });
    engineRef.current = engine;
    (window as any).__ENGINE__ = engine;

    const boot = () => { initAudio(); window.removeEventListener('pointerdown', boot); };
    window.addEventListener('pointerdown', boot);
    return () => { engine.dispose(); engineRef.current = null; };
  }, []);

  /* while the vault's own glass scene covers the screen, stop the heavy
     universe composer from drawing a scene nobody can see — kills the lag */
  useEffect(() => {
    engineRef.current?.setRendering(mode !== 'vault');
    return () => { engineRef.current?.setRendering(true); };
  }, [mode]);

  /* ------------------------------ keyboard ------------------------------ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      const eng = engineRef.current;
      if (!eng) return;
      if (e.key === '?') { setShowKeys((v) => !v); return; }
      if (e.key === 'Escape') {
        if (menu) setMenu(null);
        else if (showKeys) setShowKeys(false);
        else if (mode === 'core') closeCore();
        else if (mode === 'vault') closeVault();
        return;
      }
      if (e.key === 'h' || e.key === 'H') { eng.resetView(); setMode('space'); eng.exitCoreMode(); toast('returning home'); }
      if (e.key === 'c' || e.key === 'C') {
        if (mode === 'core') closeCore();
        else { eng.enterCoreMode(); eng.setConnections(getState().connections.map((c) => [c.a, c.b] as [string, string])); setMode('core'); setAudioMode('core'); }
      }
      if (e.key === 'v' || e.key === 'V') { if (mode === 'space') eng.focusOn('eventide'); }
      if (e.key === 'm' || e.key === 'M') { const m = toggleMute(); toast(m ? 'silence — the universe mutes' : 'the hum returns'); }
      if (e.key === ' ') { e.preventDefault(); eng.setPaused(!eng.pausedNow); setPaused(eng.pausedNow); toast(paused ? 'time flows' : 'time held'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, menu, showKeys, paused]);

  /* idle chrome fade */
  useEffect(() => {
    const wake = () => {
      setIdle(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIdle(true), 6500);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    wake();
    return () => {
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  /* keep connection lines fresh while core is open */
  useEffect(() => {
    if (mode === 'core' && engineRef.current) {
      engineRef.current.setConnections(state.connections.map((c) => [c.a, c.b] as [string, string]));
    }
  }, [state.connections, mode]);

  /* sync reality and dimensional barrier when active reality shifts */
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const r = getReality(state.activeRealityId || 'sol-prime', state.customRealityDescriptions);
    eng.setReality(r);
  }, [state.activeRealityId, state.customRealityDescriptions]);

  /* keep the living structure in sync — new worlds form, dissolved worlds vanish,
     and moons always mirror the diary pages of their planet */
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.syncBodies(state.bodies);
    eng.syncMoons(state.entries);
    eng.setConnections(state.connections.map((c) => [c.a, c.b] as [string, string]));
  }, [state.bodies, state.entries, state.connections]);

  /* close diary windows whose world has dissolved */
  useEffect(() => {
    setWins((cur) => cur.filter((w) => state.bodies.some((b) => b.id === w.planetId)));
    setEntered((cur) => (cur && !state.bodies.some((b) => b.id === cur) ? null : cur));
  }, [state.bodies]);

  /* ------------------------------ helpers ------------------------------ */

  const closeCore = useCallback(() => {
    engineRef.current?.exitCoreMode();
    engineRef.current?.setTemporal(null);
    setMode('space');
    setAudioMode('space');
  }, []);

  const closeVault = useCallback(() => {
    setMode('space');
    setAudioMode('space');
    engineRef.current?.leavePortal();
    engineRef.current?.resetView();
  }, []);

  const closeWin = (key: string) => {
    setWins((cur) => {
      const next = cur.filter((w) => w.key !== key);
      if (next.length === 0) {
        engineRef.current?.leavePortal();
        setAudioMode('space');
        setEntered(null);
      }
      return next;
    });
  };

  const minimizeWin = (key: string) => setWins((cur) => cur.map((w) => (w.key === key ? { ...w, minimized: true } : w)));
  const restoreWin = (key: string) => {
    setWins((cur) => cur.map((w) => (w.key === key ? { ...w, minimized: false } : w)));
    setFocusKey(key);
  };
  const maximizeWin = (key: string) => setWins((cur) => cur.map((w) => (w.key === key ? { ...w, maximized: !w.maximized } : w)));

  /* open (or raise) a diary window for a world — used by constellation links */
  const openDiaryFor = useCallback((id: string) => {
    setAudioMode('diary');
    setWins((cur) => {
      const existing = cur.find((w) => w.planetId === id);
      if (existing) {
        queueMicrotask(() => { setFocusKey(existing.key); setZTop((z) => z + 1); });
        return cur.map((w) => (w.planetId === id ? { ...w, minimized: false } : w));
      }
      const key = newId();
      const n = cur.length;
      queueMicrotask(() => { setFocusKey(key); setZTop((z) => z + 1); });
      return [...cur, {
        key, planetId: id, minimized: false,
        rect: { x: 110 + n * 44, y: 84 + n * 34, w: Math.min(680, window.innerWidth - 200), h: Math.min(520, window.innerHeight - 170) },
      }];
    });
  }, []);

  const onTemporal = useCallback((ms: number | null) => {
    engineRef.current?.setTemporal(ms);
  }, []);

  const hoverBody = bodyOf(hoverId);
  const selectBody = bodyOf(selectId);
  const menuBody = bodyOf(menu?.id ?? null);

  const caption = useMemo(() => {
    if (hoverBody) {
      const m = hoverBody.meaning ? ` · ${MEANING_LABEL[hoverBody.meaning]}` : '';
      if (hoverBody.id === 'anchor') return 'ANCHOR STAR — the core · double-click to enter core mode';
      return `${hoverBody.name.toUpperCase()}${m} · double-click to enter · right-click for meaning`;
    }
    if (selectBody) return `${selectBody.name.toUpperCase()} selected · double-click to enter`;
    if (mode === 'core') return 'core mode — drag the timeline to rewind the universe · esc to leave';
    if (entered) return `${bodyOf(entered)?.name.toUpperCase()} environment — windows are physical · drag them`;
    if (paused) return 'time held — press space to release';
    return 'scroll — travel the scales · click — select · double-click — enter · ? — keys';
  }, [hoverBody, selectBody, mode, entered, paused, bodyOf]);

  /* ------------------------------- render ------------------------------- */

  return (
    <div className="fixed inset-0 overflow-hidden bg-void">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ cursor: 'grab', touchAction: 'none' }} />

      {/* ambient vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(130% 100% at 50% 45%, transparent 55%, rgba(2,4,9,0.5) 100%)' }} />

      {/* opening veil */}
      {intro && (
        <div className="intro-veil fixed inset-0 z-[35] pointer-events-none flex flex-col items-center justify-center" style={{ background: 'radial-gradient(80% 70% at 50% 50%, rgba(4,6,12,0.28), rgba(4,6,12,0.6))' }}>
          <div className="intro-track font-display font-medium text-paper/90 text-[clamp(20px,3.4vw,34px)]" style={{ letterSpacing: '0.5em', textIndent: '0.5em' }}>
            MY UNIVERSE
          </div>
          <div className="mt-4 font-mono text-[9.5px] tracking-[0.34em] uppercase text-solar/70">
            a personal cosmos · scroll to travel · double-click to enter
          </div>
        </div>
      )}

      {/* wordmark + scale */}
      <div className={`chrome absolute top-5 left-6 pointer-events-none ${idle ? 'idle' : ''}`}>
        <div className="wordmark text-[13px] text-paper/85">MY&nbsp;UNIVERSE</div>
        <div className="font-mono text-[9px] tracking-[0.3em] text-solar/70 mt-1.5">{label}</div>
      </div>

      {/* local time */}
      <div className={`chrome absolute top-5 right-6 text-right pointer-events-none ${idle ? 'idle' : ''}`}>
        <div className="font-mono text-[11px] tracking-[0.22em] text-slate-soft tabular-nums">{clockTime}</div>
        <div className="font-mono text-[8.5px] tracking-[0.22em] text-slate-dim mt-1 tabular-nums">{clockDate}</div>
        <div className="font-mono text-[7.5px] tracking-[0.26em] text-slate-dim/70 mt-1">
          LOCAL TIME{paused ? ' · EPHEMERIS HELD' : ''}{isMuted() ? ' · MUTED' : ''}
        </div>
      </div>

      {/* caption container removed per user request */}

      {/* selection card */}
      {selectBody && (
        <div className="chrome absolute bottom-12 left-6 rise-in z-[50]" key={selectBody.id}>
          <div className="px-4 py-3 border-l-2 max-w-[320px] rounded-r-lg" style={{ borderColor: selectBody.palette.atmo, background: 'rgba(8,12,22,0.85)', backdropFilter: 'blur(6px)' }}>
            <div className="flex items-center justify-between">
              <p className="font-display text-[12px] tracking-[0.18em] text-paper">{selectBody.name.toUpperCase()}</p>
              <button
                onClick={() => setShowPhysics(!showPhysics)}
                className="font-mono text-[9px] tracking-wider uppercase px-2 py-0.5 rounded bg-teal-ice/15 hover:bg-teal-ice/30 text-teal-ice border border-teal-ice/30 transition-colors"
              >
                {showPhysics ? 'HIDE LAWS' : 'PHYSICS LAWS'}
              </button>
            </div>
            <p className="font-body text-[11px] text-slate-soft leading-relaxed mt-1">{selectBody.note}</p>
            {selectBody.meaning && (
              <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-solar/80 mt-1.5">represents · {MEANING_LABEL[selectBody.meaning]}</p>
            )}

            {showPhysics && (
              <div className="mt-3 pointer-events-auto">
                <PhysicsHUD body={selectBody} onClose={() => setShowPhysics(false)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* context menu */}
      {menu && menuBody && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
          <div className="ctx-menu fixed z-[95] w-[218px] py-1.5" style={{ left: Math.min(menu.x, window.innerWidth - 230), top: Math.min(menu.y, window.innerHeight - 330) }}>
            <p className="px-4 py-1.5 font-mono text-[8.5px] tracking-[0.26em] uppercase text-slate-dim">
              {menuBody.kind === 'vault' ? `${menuBody.name} — the universal vault` : `${menuBody.name} — assign meaning`}
            </p>
            <p className="px-4 pb-2 font-mono text-[7.5px] leading-relaxed text-slate-dim/85">
              The colored chip is this world's <span className="text-solar/80">meaning</span> — what it represents to you.
              {selectId && selectId !== menuBody.id && selectId !== 'anchor' && menuBody.kind !== 'vault'
                ? <> Linking ties it to <span className="text-paper/70">{bodyOf(selectId)?.name}</span> as a constellation — drawn in the Anchor core.</>
                : ' Single-click another world first to enable “link”.'}
            </p>
            {menuBody.kind !== 'vault' && MEANINGS.map((m) => (
              <button key={m ?? 'x'} className="ctx-item w-full text-left px-4 py-[7px] text-[12px] text-slate-soft flex items-center justify-between"
                onClick={() => { actions.setMeaning(menuBody.id, m); setMenu(null); toast(`${menuBody.name} now represents: ${MEANING_LABEL[m!]}`); }}>
                {MEANING_LABEL[m!]}
                {menuBody.meaning === m && <span className="text-solar">·</span>}
              </button>
            ))}
            <div className="h-px bg-line/70 my-1.5" />
            <button className="ctx-item w-full text-left px-4 py-[7px] text-[12px] text-slate-soft flex items-center gap-2"
              onClick={() => {
                if (selectId && selectId !== menuBody.id && selectId !== 'anchor') {
                  actions.connect(selectId, menuBody.id);
                  toast('a new constellation is born');
                  if (mode === 'core') engineRef.current?.setConnections(getState().connections.map((c) => [c.a, c.b] as [string, string]));
                } else toast('select another body first, then link', 'warn');
                setMenu(null);
              }}>
              <IcLink size={11} /> link with selected
            </button>
            <button className="ctx-item w-full text-left px-4 py-[7px] text-[12px] text-teal-ice flex items-center gap-2"
              onClick={() => { setSelectId(menuBody.id); setShowPhysics(true); setMenu(null); }}>
              <span>✦</span> physics telemetry & laws
            </button>
            <button className="ctx-item w-full text-left px-4 py-[7px] text-[12px] text-slate-soft"
              onClick={() => { engineRef.current?.focusOn(menuBody.id); setMenu(null); }}>
              focus camera
            </button>
            <RenameRow body={menuBody} onDone={() => setMenu(null)} />
          </div>
        </>
      )}

      {/* diary windows */}
      {wins.filter((w) => !w.minimized).map((w, i) => {
        const planet = state.bodies.find((b) => b.id === w.planetId);
        if (!planet) return null;
        return (
          <DiaryWindowFrame key={w.key} z={zTop + i} focused={focusKey === w.key}>
            <ErrorBoundary label="THE DIARY">
              <DiaryWindow
                planet={planet}
                rect={w.maximized ? MAX_RECT() : w.rect}
                maximized={!!w.maximized}
                focused={focusKey === w.key}
                onFocus={() => { setFocusKey(w.key); setZTop((z) => z + 1); }}
                onMinimize={() => minimizeWin(w.key)}
                onMaximize={() => maximizeWin(w.key)}
                onClose={() => closeWin(w.key)}
                onOpenLinked={openDiaryFor}
              />
            </ErrorBoundary>
          </DiaryWindowFrame>
        );
      })}

      {/* minimized dock */}
      {wins.some((w) => w.minimized) && (
        <div className="fixed bottom-5 right-5 z-[65] flex gap-2">
          {wins.filter((w) => w.minimized).map((w) => {
            const p = state.bodies.find((b) => b.id === w.planetId);
            return (
              <button key={w.key} onClick={() => restoreWin(w.key)}
                className="rise-in flex items-center gap-2 px-3 py-1.5 border border-line bg-abyss/90 hover:border-solar/40 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: p?.palette.atmo }} />
                <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-slate-soft">{p?.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* core mode */}
      {mode === 'core' && (
        <CoreMode
          onClose={closeCore}
          onInspect={(id) => { closeCore(); engineRef.current?.focusOn(id); }}
          onTemporal={onTemporal}
          onEnterWorld={(id) => { closeCore(); engineRef.current?.portalTo(id); }}
        />
      )}

      {/* vault */}
      {mode === 'vault' && (
        <ErrorBoundary label="THE VAULT">
          <VaultUI onClose={closeVault} />
        </ErrorBoundary>
      )}

      {/* shortcuts */}
      {showKeys && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center overlay-in" style={{ background: 'rgba(3,5,10,0.7)' }} onClick={() => setShowKeys(false)}>
          <div className="ctx-menu w-[300px] p-5 rise-in" onClick={(e) => e.stopPropagation()}>
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-solar/80 mb-4">hidden keys</p>
            {[
              ['H', 'return home'], ['C', 'anchor star core'], ['V', 'find the vault'],
              ['SPACE', 'hold / release time'], ['M', 'mute the hum'], ['?', 'this list'], ['ESC', 'leave'],
            ].map(([k, d]) => (
              <div key={k} className="flex items-center justify-between py-1.5 border-b border-line/40 last:border-0">
                <span className="font-mono text-[10px] text-solar">{k}</span>
                <span className="text-[11.5px] text-slate-soft">{d}</span>
              </div>
            ))}
            <div className="mt-4 pt-3 border-t border-line/50 flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  if (window.confirm('Reset universe to fresh defaults? Local changes will be re-seeded.')) {
                    actions.resetUniverse();
                    setShowKeys(false);
                    toast('Universe reset to clean defaults');
                  }
                }}
                className="px-3 py-1 font-mono text-[9px] tracking-[0.16em] uppercase text-rose-300 hover:text-rose-100 border border-rose-500/30 hover:border-rose-400 bg-rose-950/20 rounded transition-colors"
              >
                Reset Universe Data
              </button>
              <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-slate-dim/70 text-center">
                build <span className="text-teal-ice">{BUILD}</span> · active
              </p>
            </div>
          </div>
        </div>
      )}

      {showMultiverseBar && (
        <MultiverseBar
          activeRealityId={state.activeRealityId || 'sol-prime'}
          currentScaleLabel={label}
          onWarpReality={(id) => {
            actions.switchReality(id);
            const r = getReality(id, state.customRealityDescriptions);
            toast(`Quantum Warp: Switched to Reality ${r.name}`);
            chime(880);
            engineRef.current?.resetView();
          }}
          onZoomToMultiverse={() => {
            engineRef.current?.zoomToMultiverse();
            toast('Camera set to Multiverse Scale');
          }}
          onZoomToSystem={() => {
            engineRef.current?.zoomToSystem();
            toast('Camera focused on Stellar System');
          }}
          onZoomToHierarchy={(stageIndex) => {
            engineRef.current?.zoomToHierarchy(stageIndex);
            chime(720);
          }}
          onZoomIn={() => {
            engineRef.current?.zoomIn();
          }}
          onZoomOut={() => {
            engineRef.current?.zoomOut();
          }}
          onEditRealityLore={(r) => {
            const fresh = getReality(r.id, state.customRealityDescriptions);
            setEditingReality(fresh);
          }}
          onInspectLineage={(cluster) => {
            setActiveLineageCluster(cluster);
            chime(720);
          }}
          onZoomToDemonCore={() => {
            engineRef.current?.zoomToDemonCore();
            setKamuiKey((k) => k + 1);
            toast('✦ Kamui: Focused on Core');
            chime(960);
          }}
          onTriggerKamui={() => {
            engineRef.current?.triggerKamui();
            setKamuiKey((k) => k + 1);
            chime(960);
          }}
          onCloseBar={() => {
            setShowMultiverseBar(false);
          }}
          kamuiKey={kamuiKey}
        />
      )}

      {/* Hover Tooltip / HUD for Core */}
      {hoverId === 'demon-core' && mode === 'space' && label.includes('MULTIVERSE') && !editingReality && !hoverCluster && !activeLineageCluster && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-slate-950/85 backdrop-blur-2xl border border-red-500/60 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(255,23,68,0.4)] text-slate-100 max-w-md w-[92vw] sm:w-[420px] kamui-demon-badge">
          <div className="flex items-center justify-between border-b border-red-500/30 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="demon-eye-spin inline-block w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_10px_#ff1744] ring-1 ring-white/70" />
              <h3 className="font-bold text-sm tracking-wider text-red-200 uppercase font-mono">CORE</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/80 border border-red-400/40 text-red-300">
              ORIGIN (0, 0, 0)
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            The supreme cosmic singularity anchoring and stabilizing all 20 parallel bubble realities through quantum flux resonance and space-time harmonic containment.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                engineRef.current?.triggerKamui();
                setKamuiKey((k) => k + 1);
                setShowMultiverseBar((prev) => !prev);
                chime(960);
              }}
              className="flex-1 py-1.5 px-3 bg-red-600/30 hover:bg-red-600/50 border border-red-500/60 rounded-xl font-mono text-[11px] font-bold text-red-200 hover:text-white transition-all shadow-[0_0_12px_rgba(255,23,68,0.3)] cursor-pointer text-center"
            >
              ✦ ACTIVATE TOOLBAR
            </button>
            <button
              onClick={() => {
                engineRef.current?.zoomToDemonCore();
                setKamuiKey((k) => k + 1);
                setShowMultiverseBar(true);
                chime(960);
              }}
              className="py-1.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-mono text-[11px] text-slate-200 hover:text-white transition-all cursor-pointer"
            >
              ZOOM
            </button>
          </div>
        </div>
      )}

      {/* Hover Tooltip / HUD for Parallel Realities (Only active at Multiverse Macro Scale) */}
      {hoverRealityId && mode === 'space' && label.includes('MULTIVERSE') && !editingReality && !hoverCluster && !activeLineageCluster && (
        <RealityHoverCard
          reality={getReality(hoverRealityId, state.customRealityDescriptions)}
          screenPos={hoverScreenPos}
          onEditDescription={(r) => {
            const fresh = getReality(r.id, state.customRealityDescriptions);
            setEditingReality(fresh);
          }}
          onWarp={(id) => {
            actions.switchReality(id);
            const r = getReality(id, state.customRealityDescriptions);
            toast(`Quantum Warp: Switched to Reality ${r.name}`);
            chime(880);
            engineRef.current?.resetView();
          }}
          onInspectLineage={(cluster) => {
            setActiveLineageCluster(cluster);
            chime(720);
          }}
        />
      )}

      {/* Hover Tooltip / HUD for Orbiting Galaxy Clusters / Galaxy Groups (Only active at Multiverse Macro Scale) */}
      {hoverCluster && mode === 'space' && label.includes('MULTIVERSE') && !editingReality && !activeLineageCluster && (
        <ClusterHoverCard
          cluster={hoverCluster}
          realityName={getReality(hoverCluster.realityId, state.customRealityDescriptions).name}
          screenPos={hoverScreenPos}
          onInspectLineage={(cluster) => {
            setActiveLineageCluster(cluster);
            chime(720);
          }}
          onWarp={(realityId) => {
            actions.switchReality(realityId);
            const r = getReality(realityId, state.customRealityDescriptions);
            toast(`Quantum Warp: Traveled into Reality — ${r.name}`);
            chime(880);
            engineRef.current?.resetView();
          }}
        />
      )}

      {/* Deep-Dive Cosmic Lineage & Hierarchy Explorer Modal */}
      {activeLineageCluster && (
        <CosmicLineageModal
          cluster={activeLineageCluster}
          realityName={getReality(activeLineageCluster.realityId, state.customRealityDescriptions).name}
          onClose={() => setActiveLineageCluster(null)}
          onWarpToReality={(realityId) => {
            actions.switchReality(realityId);
            const r = getReality(realityId, state.customRealityDescriptions);
            toast(`Quantum Warp: Traveled into Reality — ${r.name}`);
            chime(880);
            engineRef.current?.resetView();
            setActiveLineageCluster(null);
          }}
        />
      )}

      {/* Reality Lore Description Writer / Editor Modal */}
      {editingReality && (
        <EditRealityModal
          reality={editingReality}
          onClose={() => setEditingReality(null)}
          onSave={(realityId, description) => {
            actions.updateRealityDescription(realityId, description);
            toast('Reality description saved to cosmological record');
            chime(660);
            setEditingReality(null);
          }}
          onReset={(realityId) => {
            actions.resetRealityDescription(realityId);
            toast('Reality description reset to default lore');
          }}
        />
      )}

      <ToastHost />
    </div>
  );
}

/* wrapper that controls stacking without fighting the spring transform.
   pointer-events pass straight through — the window root re-enables them —
   so the universe stays clickable while diaries are open. */
function DiaryWindowFrame({ children, z }: { children: ReactNode; z: number; focused: boolean }) {
  return <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 40 + (z % 50) }}>{children}</div>;
}

function RenameRow({ body, onDone }: { body: CosmicBody; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(body.name);
  if (!editing) {
    return (
      <button className="ctx-item w-full text-left px-4 py-[7px] text-[12px] text-slate-soft" onClick={() => setEditing(true)}>
        rename
      </button>
    );
  }
  return (
    <div className="px-4 py-1.5">
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { actions.renameBody(body.id, val); toast('the world answers to a new name'); onDone(); }
          if (e.key === 'Escape') onDone();
        }}
        onBlur={() => { actions.renameBody(body.id, val); onDone(); }}
        className="field w-full px-2 py-1 text-[12px] text-paper"
      />
    </div>
  );
}
