import { Component, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { getState, subscribe } from '../state';
import type { UniverseState } from '../types';

export function useUniverse(): UniverseState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/* catches a crash inside a panel and offers a one-click remount instead of a black screen */
export class ErrorBoundary extends Component<{ children: ReactNode; label?: string }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="absolute inset-0 z-[200] grid place-items-center" style={{ background: 'rgba(4,6,12,0.94)' }}>
        <div className="text-center max-w-[360px] px-6">
          <p className="font-mono text-[9px] tracking-[0.34em] uppercase text-solar/80">local distortion</p>
          <p className="font-display text-[17px] tracking-[0.14em] text-paper mt-2">
            {this.props.label ?? 'THIS PANEL'} HICCUPED
          </p>
          <p className="text-[12px] text-slate-dim leading-relaxed mt-3">
            Something inside this panel threw an error. Your universe and data are untouched — remount the panel to continue.
          </p>
          <button
            onClick={() => this.setState({ err: false })}
            className="mt-5 font-mono text-[9.5px] tracking-[0.26em] uppercase border border-teal-ice/50 text-teal-ice px-5 py-2.5 hover:bg-teal-ice/10 transition-colors"
          >
            stabilize panel
          </button>
        </div>
      </div>
    );
  }
}

/* --------------------------------- icons -------------------------------- */

interface IconProps { size?: number; className?: string; strokeWidth?: number; }
const I = ({ d, size = 14, className = '', strokeWidth = 1.6 }: IconProps & { d: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

export const IcClose = (p: IconProps) => <I {...p} d="M6 6l12 12M18 6L6 18" />;
export const IcEdit = (p: IconProps) => <I {...p} d="M4 16l1-4L14 3l3 3-9 9-4 1zM12 5l3 3" />;
export const IcDownload = (p: IconProps) => <I {...p} d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 19.5h16" />;
export const IcMoon = (p: IconProps) => <I {...p} d="M20 12.6A8.1 8.1 0 1 1 11.4 4a6.6 6.6 0 0 0 8.6 8.6z" />;
export const IcGlobe = (p: IconProps) => <I {...p} d="M12 3a9 9 0 100 18 9 9 0 000-18zM3.5 12h17M12 3c2.7 2.4 2.7 15.6 0 18M12 3c-2.7 2.4-2.7 15.6 0 18" />;
export const IcEye = (p: IconProps) => <I {...p} d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.4a2.6 2.6 0 100 5.2 2.6 2.6 0 000-5.2z" />;
export const IcCopy = (p: IconProps) => <I {...p} d="M9 9h10v10H9zM5 15V5h10" />;
export const IcMin = (p: IconProps) => <I {...p} d="M5 12h14" />;
export const IcExpand = (p: IconProps) => <I {...p} d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />;
export const IcCompress = (p: IconProps) => <I {...p} d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5" />;
export const IcPlus = (p: IconProps) => <I {...p} d="M12 5v14M5 12h14" />;
export const IcSearch = (p: IconProps) => <I {...p} d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5" />;
export const IcChevL = (p: IconProps) => <I {...p} d="M14 6l-6 6 6 6" />;
export const IcChevR = (p: IconProps) => <I {...p} d="M10 6l6 6-6 6" />;
export const IcMic = (p: IconProps) => <I {...p} d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4" />;
export const IcStop = (p: IconProps) => <I {...p} d="M8 8h8v8H8z" />;
export const IcPlay = (p: IconProps) => (
  <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="currentColor" className={p.className}><path d="M8 5.5v13l11-6.5z" /></svg>
);
export const IcPause = (p: IconProps) => (
  <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="currentColor" className={p.className}><path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z" /></svg>
);
export const IcBook = (p: IconProps) => <I {...p} d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5V5.5M20 18v3H6.5" />;
export const IcInline = (p: IconProps) => <I {...p} d="M4 5h16M4 19h16M8.5 9h7v6h-7z" />;
export const IcImage = (p: IconProps) => <I {...p} d="M4 5h16v14H4zM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM4 16l5-4 3 2.5L16 11l4 4" />;
export const IcLock = (p: IconProps) => <I {...p} d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6zM12 15v2" />;
export const IcUnlock = (p: IconProps) => <I {...p} d="M7 11V8a5 5 0 0 1 9.6-2M6 11h12v9H6zM12 15v2" />;
export const IcTrash = (p: IconProps) => <I {...p} d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10.5 11v5M13.5 11v5" />;
export const IcUser = (p: IconProps) => <I {...p} d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM5 20a7 7 0 0 1 14 0" />;
export const IcLink = (p: IconProps) => <I {...p} d="M9 15l6-6M8.5 12.5l-2 2a3.5 3.5 0 0 0 5 5l2-2M15.5 11.5l2-2a3.5 3.5 0 0 0-5-5l-2 2" />;
export const IcStar = (p: IconProps & { filled?: boolean }) => (
  <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill={p.filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" className={p.className}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.9z" />
  </svg>
);
export const IcTerminal = (p: IconProps) => <I {...p} d="M4 5h16v14H4zM7.5 9l3 3-3 3M12.5 15h4" />;
export const IcScan = (p: IconProps) => <I {...p} d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M3 12h18" />;
export const IcFolder = (p: IconProps) => <I {...p} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />;
export const IcGrid = (p: IconProps) => <I {...p} d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />;
export const IcRows = (p: IconProps) => <I {...p} d="M4 6h16M4 12h16M4 18h16" />;
export const IcMove = (p: IconProps) => <I {...p} d="M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5" />;
export const IcPulse = (p: IconProps) => <I {...p} d="M3 12h4l2.5-6 4 12L16 12h5" />;

/* --------------------------------- toast -------------------------------- */

let toastFn: ((msg: string, tone?: 'ok' | 'warn') => void) | null = null;
export function toast(msg: string, tone: 'ok' | 'warn' = 'ok') { toastFn?.(msg, tone); }

export function ToastHost() {
  const [items, setItems] = useState<{ id: number; msg: string; tone: string }[]>([]);
  const idRef = useRef(0);
  useEffect(() => {
    toastFn = (msg, tone = 'ok') => {
      const id = ++idRef.current;
      setItems((cur) => [...cur.slice(-3), { id, msg, tone }]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), 3400);
    };
    return () => { toastFn = null; };
  }, []);
  return (
    <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-[250] flex flex-col items-center gap-2 pointer-events-none">
      {items.map((t) => (
        <div key={t.id} className={`toast-item ${t.tone === 'warn' ? 'warn' : ''}`}>{t.msg}</div>
      ))}
    </div>
  );
}

/* ------------------------------- audio chip ------------------------------ */

export function AudioChip({ dataUrl, peaks, duration }: { dataUrl: string; peaks?: number[]; duration?: number }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bars = peaks ?? Array.from({ length: 34 }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 0.7)));
  return (
    <div className="flex items-center gap-3 bg-void/50 border border-line/60 px-2.5 py-2">
      <button
        className="w-7 h-7 grid place-items-center border border-line text-slate-soft hover:text-teal-ice hover:border-teal-ice/50 transition-colors shrink-0"
        onClick={() => {
          if (!audioRef.current) {
            audioRef.current = new Audio(dataUrl);
            audioRef.current.onended = () => setPlaying(false);
          }
          if (playing) { audioRef.current.pause(); setPlaying(false); }
          else { void audioRef.current.play(); setPlaying(true); }
        }}
        title={playing ? 'pause' : 'play'}
      >
        {playing ? <IcPause size={11} /> : <IcPlay size={11} />}
      </button>
      <div className="flex items-end gap-[2px] h-6 flex-1" aria-hidden>
        {bars.map((b, i) => (
          <span key={i} className="flex-1 bg-teal-ice/60" style={{ height: `${Math.round(b * 100)}%`, opacity: playing ? 1 : 0.55 }} />
        ))}
      </div>
      {duration !== undefined && <span className="font-mono text-[8.5px] text-slate-dim tabular-nums shrink-0">{duration.toFixed(1)}s</span>}
    </div>
  );
}

export function WaveStrip({ name, height = 30 }: { name: string; height?: number }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const bars = Array.from({ length: 40 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 0.8 + h % 7)));
  return (
    <div className="flex items-end gap-[2px] w-full" style={{ height }}>
      {bars.map((b, i) => <span key={i} className="flex-1 bg-teal-ice/50" style={{ height: `${Math.round(b * 100)}%` }} />)}
    </div>
  );
}
