import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { sfxPage } from '../audio';
import { IcChevL, IcChevR } from './bits';

const SEGMENTS = 12;
const TURN_MS = 900;

interface Props {
  fronts: ReactNode[];
  verso: (leaf: number) => ReactNode;
  index: number;
  onIndex: (i: number) => void;
  emptyText?: string;
}

/* physical book — pages turn as a rippling wave of vertical strips */
const Book = memo(function Book({ fronts, verso, index, onIndex, emptyText }: Props) {
  const [turning, setTurning] = useState<number | null>(null);
  const [turnFwd, setTurnFwd] = useState(true);
  const prevIndex = useRef(index);
  const segRefs = useRef<(HTMLDivElement | null)[]>([]);

  const count = fronts.length;

  useEffect(() => {
    if (prevIndex.current !== index) {
      const fwd = index > prevIndex.current;
      const leaf = fwd ? index - 1 : index;
      sfxPage();
      setTurnFwd(fwd);
      setTurning(leaf);
      prevIndex.current = index;
    }
  }, [index]);

  /* the sea wave — every frame, each segment's angle follows a travelling
     sine curve, so the page ripples continuously like water instead of
     stepping through keyframes */
  useEffect(() => {
    if (turning === null) return;
    let raf = 0;
    const t0 = performance.now();
    const dir = turnFwd ? 1 : -1;
    const step = (now: number) => {
      const P = Math.min(1, (now - t0) / TURN_MS);
      /* ease-in-out cubic for the whole flip */
      const e = P < 0.5 ? 4 * P * P * P : 1 - Math.pow(-2 * P + 2, 3) / 2;
      /* wave energy — rises, crests mid-turn, and is exactly 0 at both ends
         so the page starts and finishes perfectly flat */
      const env = Math.sin(Math.PI * e);
      segRefs.current.forEach((el, i) => {
        if (!el) return;
        const u = i / (SEGMENTS - 1); /* 0 at spine → 1 at free edge */
        /* travelling sine: the phase slides across the page as the turn
           progresses, so the ripple visibly moves like water */
        const phase = Math.PI * 2 * (u * 1.5 - dir * e * 2.2);
        const theta = -180 * e + dir * 20 * env * Math.sin(phase);
        const lift = 32 * env * Math.max(0, Math.sin(phase + 0.9));
        el.style.transform = `translateZ(${lift.toFixed(2)}px) rotateY(${theta.toFixed(2)}deg)`;
      });
      if (P < 1) raf = requestAnimationFrame(step);
      else {
        /* snap every segment to the final flat-turned pose, then clear */
        segRefs.current.forEach((el) => { if (el) el.style.transform = 'rotateY(-180deg)'; });
        setTurning(null);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [turning, turnFwd]);

  if (count === 0) {
    return (
      <div className="h-full grid place-items-center">
        <p className="font-mono text-[9.5px] tracking-[0.26em] uppercase text-slate-dim/70 text-center px-8">{emptyText ?? 'nothing here yet'}</p>
      </div>
    );
  }

  const segW = 100 / SEGMENTS;

  return (
    <div className="book-stage relative h-full select-none" style={{ perspective: '1900px' }}>
      {/* destination page physically underneath the wave */}
      {turning !== null && (
        <div className="absolute inset-0">
          <div className="leaf-face absolute inset-0">
            <div className="h-full overflow-hidden">{turnFwd ? fronts[turning + 1] : verso(turning)}</div>
          </div>
          <div
            className="leaf-shadow-right absolute inset-0"
            style={{ animation: `leafShadowR ${TURN_MS}ms ease both` }}
          />
        </div>
      )}

      {/* calm pages */}
      {fronts.map((front, i) => {
        const turned = i < index;
        const z = turned ? 10 + i : 10 + (count - i);
        if (i === turning) return null;
        const show = turned || i === index;
        return (
          <div key={i} className="leaf" style={{ transform: turned ? 'rotateY(-180deg)' : 'rotateY(0deg)', zIndex: z, visibility: show ? 'visible' : 'hidden' }}>
            <div className="leaf-face front">{front}</div>
            <div className="leaf-face back"><div className="h-full overflow-hidden">{verso(i)}</div></div>
          </div>
        );
      })}

      {/* the sea wave — the turning leaf sliced into segments whose angles
          are driven per-frame by a travelling sine curve */}
      {turning !== null && fronts[turning] && (
        <div className="wave-wrap">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <div
              key={i}
              ref={(el) => { segRefs.current[i] = el; }}
              className="wave-seg"
              style={{ left: `${i * segW}%`, width: `${segW + 0.7}%`, transform: 'rotateY(0deg)' }}
            >
              <div className="leaf-face seg-face front">
                <div className="seg-inner" style={{ left: `${-i * 100}%`, width: `${SEGMENTS * 100}%` }}>
                  {fronts[turning]}
                </div>
              </div>
              <div className="leaf-face seg-face back">
                <div className="seg-inner" style={{ left: `${-i * 100}%`, width: `${SEGMENTS * 100}%` }}>
                  <div className="h-full overflow-hidden">{verso(turning)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* spine light */}
      <span className="book-spine" />

      {/* navigation */}
      <button
        className="nav-btn left"
        onClick={() => index > 0 && onIndex(index - 1)}
        style={{ opacity: index > 0 ? 1 : 0.25, pointerEvents: index > 0 ? 'auto' : 'none' }}
        title="previous page"
      >
        <IcChevL size={15} />
      </button>
      <button
        className="nav-btn right"
        onClick={() => index < count - 1 && onIndex(index + 1)}
        style={{ opacity: index < count - 1 ? 1 : 0.25, pointerEvents: index < count - 1 ? 'auto' : 'none' }}
        title="next page"
      >
        <IcChevR size={15} />
      </button>
      <span className="page-pill">{String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span>
    </div>
  );
});

export default Book;
