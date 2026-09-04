import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { actions, computeStreak, fmtDate, newId } from '../state';
import { MEANING_LABEL, type Attachment, type CosmicBody, type DiaryEntry, type Mood, type Weather } from '../types';
import { sfxConnect, sfxTick } from '../audio';
import Book from './Book';
import { IcBook, IcClose, IcCompress, IcCopy, IcDownload, IcEdit, IcExpand, IcGlobe, IcImage, IcInline, IcMic, IcMin, IcMoon, IcPause, IcPlay, IcPlus, IcSearch, IcStar, IcStop, IcTrash, toast, useUniverse } from './bits';
import { exportDiaryDocument, type ExportFormat } from './exportDiary';
import { AudioPlate, VideoPlate, ImageOrGifPlate, FileOrCodePlate } from './MediaPlates';

export interface WinRect { x: number; y: number; w: number; h: number; }

function useSpringWindow(rect: WinRect, locked = false) {
  const elRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: rect.x, y: rect.y, w: rect.w, h: rect.h });
  const vel = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const target = useRef({ ...pos.current });

  useEffect(() => { target.current = { x: rect.x, y: rect.y, w: rect.w, h: rect.h }; }, [rect]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const el = elRef.current;
      if (!el) return;
      const k = 130, d = 15;
      (['x', 'y', 'w', 'h'] as const).forEach((ax) => {
        const f = -k * (pos.current[ax] - target.current[ax]) - d * vel.current[ax];
        vel.current[ax] += f * dt;
        pos.current[ax] += vel.current[ax] * dt;
      });
      el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      el.style.width = `${pos.current.w}px`;
      el.style.height = `${pos.current.h}px`;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onBarDown = (e: React.PointerEvent) => {
    if (locked) return;
    if ((e.target as HTMLElement).closest('button,input,select,textarea')) return;
    e.preventDefault();
    const start = { mx: e.clientX, my: e.clientY, ...target.current };
    const move = (ev: PointerEvent) => {
      ev.preventDefault();
      target.current.x = Math.max(-start.w + 120, Math.min(window.innerWidth - 80, start.x + ev.clientX - start.mx));
      target.current.y = Math.max(8, Math.min(window.innerHeight - 60, start.y + ev.clientY - start.my));
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onGripDown = (e: React.PointerEvent) => {
    if (locked) return;
    e.preventDefault(); e.stopPropagation();
    const start = { mx: e.clientX, my: e.clientY, w: target.current.w, h: target.current.h };
    const move = (ev: PointerEvent) => {
      ev.preventDefault();
      target.current.w = Math.max(430, Math.min(window.innerWidth - 40, start.w + ev.clientX - start.mx));
      target.current.h = Math.max(330, Math.min(window.innerHeight - 40, start.h + ev.clientY - start.my));
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return { elRef, onBarDown, onGripDown };
}

const MOODS: { id: Mood; label: string; color: string }[] = [
  { id: 'calm', label: 'calm', color: '#7fc4e8' },
  { id: 'warm', label: 'warm', color: '#f2c178' },
  { id: 'bright', label: 'bright', color: '#9fd8a8' },
  { id: 'heavy', label: 'heavy', color: '#8b93a8' },
  { id: 'burning', label: 'burning', color: '#e0785a' },
];
const moodOf = (id?: Mood) => MOODS.find((m) => m.id === id);

const WEATHERS: { id: Weather; label: string }[] = [
  { id: 'clear', label: 'clear sky' }, { id: 'rain', label: 'rain' }, { id: 'storm', label: 'storm' },
  { id: 'fog', label: 'fog' }, { id: 'dust', label: 'dust' },
];

function WeatherGlyph({ w, size = 13 }: { w: Weather; size?: number }) {
  const d: Record<Weather, string> = {
    clear: 'M12 8.2a3.8 3.8 0 100 7.6 3.8 3.8 0 000-7.6zM12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M18.4 5.6l-1.1 1.1M6.7 17.3l-1.1 1.1',
    rain: 'M7 14a4.5 4.5 0 111-8.9A5.5 5.5 0 0118 7.5 3.8 3.8 0 0117.5 15H7zM8.5 17l-.9 2.4M12.3 17l-.9 2.4M16 17l-.9 2.4',
    storm: 'M7 13.5a4.5 4.5 0 111-8.9A5.5 5.5 0 0118 7 3.8 3.8 0 0117.5 14.5H7zM12.6 14l-2.3 4h2.8l-1.6 3.6 4.2-5h-2.8l1.8-2.6z',
    fog: 'M4 9h16M6 12.5h14M5 16h12',
    dust: 'M4.5 9.5h.01M8 7h.01M12 10h.01M16 7.5h.01M19.5 10.5h.01M6.5 13.5h.01M10.5 15h.01M14.5 13h.01M18.5 15.5h.01M8.5 18h.01M13.5 17.5h.01',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d[w]} /></svg>;
}

function WeatherLayer({ weather }: { weather: Weather }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const g = cv.getContext('2d'); if (!g) return;
    const W = 460, H = 340;
    cv.width = W; cv.height = H;
    let raf = 0;
    const t0 = performance.now();
    const n = weather === 'rain' || weather === 'storm' ? 64 : weather === 'dust' ? 48 : 22;
    const parts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.7 + 0.4, v: Math.random() * 1.6 + 0.6, p: Math.random() * 7 }));
    let flash = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const t = (now - t0) / 1000;
      g.clearRect(0, 0, W, H);
      if (weather === 'rain' || weather === 'storm') {
        g.strokeStyle = 'rgba(165,195,235,0.3)';
        g.lineWidth = 1;
        g.beginPath();
        parts.forEach((pt) => {
          pt.y += pt.v * 5.4; pt.x += 0.7;
          if (pt.y > H + 8) { pt.y = -12; pt.x = Math.random() * W; }
          g.moveTo(pt.x, pt.y);
          g.lineTo(pt.x - 2.4, pt.y + 9 + pt.s * 4);
        });
        g.stroke();
        if (weather === 'storm') {
          if (flash <= 0 && Math.random() < 0.005) flash = 1;
          if (flash > 0) { g.fillStyle = `rgba(224,236,255,${(flash * 0.2).toFixed(3)})`; g.fillRect(0, 0, W, H); flash -= 0.055; }
        }
      } else if (weather === 'fog') {
        parts.forEach((pt, i) => {
          const x = ((pt.x + t * (9 + pt.s * 7)) % (W + 200)) - 100;
          const y = pt.y + Math.sin(t * 0.3 + pt.p) * 9;
          const r = 52 + pt.s * 26;
          const rg = g.createRadialGradient(x, y, 0, x, y, r);
          rg.addColorStop(0, `rgba(172,192,218,${(0.055 + 0.02 * Math.sin(t * 0.5 + i)).toFixed(3)})`);
          rg.addColorStop(1, 'rgba(172,192,218,0)');
          g.fillStyle = rg;
          g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        });
      } else if (weather === 'dust') {
        parts.forEach((pt) => {
          pt.x += pt.v * 0.65 + Math.sin(t + pt.p) * 0.3;
          pt.y += Math.sin(t * 0.8 + pt.p) * 0.22;
          if (pt.x > W + 4) pt.x = -4;
          g.fillStyle = `rgba(242,193,120,${(0.14 + 0.1 * Math.sin(t + pt.p)).toFixed(3)})`;
          g.fillRect(pt.x, pt.y, pt.s, pt.s);
        });
      } else {
        parts.forEach((pt) => {
          const x = pt.x + Math.sin(t * 0.4 + pt.p) * 15;
          const y = pt.y + Math.cos(t * 0.3 + pt.p) * 11;
          g.fillStyle = `rgba(222,236,255,${(0.05 + 0.05 * Math.sin(t + pt.p)).toFixed(3)})`;
          g.beginPath(); g.arc(x, y, pt.s, 0, 7); g.fill();
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [weather]);
  return <canvas ref={ref} className="weather-canvas" aria-hidden />;
}

const TEMPLATES: { label: string; title: string; body: string }[] = [
  { label: 'dream log', title: 'Dream log', body: 'The dream, before it evaporates:\n\n\n— on waking:\nwhat stayed? what slipped?' },
  { label: 'three lights', title: 'Three lights', body: '1. \n2. \n3. ' },
  { label: 'field note', title: 'Field note', body: 'observed:\n\ninterpreted:\n\nnext:' },
  { label: 'unsent letter', title: 'Letter, unsent', body: 'To —\n\n\n\n— from the far side of the planet' },
];

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

function loadVideoFrame(src: string): Promise<HTMLVideoElement | null> {
  return new Promise((res) => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    const done = (ok: boolean) => res(ok ? v : null);
    v.onloadeddata = () => { try { v.currentTime = 0.05; } catch { done(true); } };
    v.onseeked = () => done(true);
    v.onerror = () => done(false);
    setTimeout(() => done(false), 2500);
    v.src = src;
  });
}

const htmlToText = (html: string): string => {
  const d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll('.plate-spacer').forEach((n) => n.remove());
  return d.textContent || '';
};

const htmlToParagraphs = (html: string): string[] => {
  const d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll('.plate-spacer').forEach((n) => n.remove());
  
  // Replace <br> and block closing tags with newlines
  const text = d.innerHTML
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  
  const unescaped = document.createElement('textarea');
  unescaped.innerHTML = text;
  return unescaped.value.split(/\r?\n/);
};

async function exportPage(entry: DiaryEntry, planet: CosmicBody, pageWidthPx?: number) {
  // Ensure custom web fonts are fully rasterized
  try {
    await document.fonts.ready;
  } catch {
    /* proceed if font loading check is not supported */
  }

  const W = 1200;
  const DPR = 2; // 2x supersampling for high-DPI print/scan precision
  const refW = pageWidthPx && pageWidthPx > 100 ? pageWidthPx : 640;
  const scale = W / refW;

  const marginL = 80;
  const marginR = 80;
  const contentW = W - marginL - marginR;
  const headerTop = 64;

  const atts = entry.attachments;
  const media = await Promise.all(
    atts.map(async (a) => {
      if (a.kind === 'image') return { img: await loadImg(a.dataUrl), vid: null as HTMLVideoElement | null };
      if (a.kind === 'video') return { img: null as HTMLImageElement | null, vid: await loadVideoFrame(a.dataUrl) };
      return { img: null as HTMLImageElement | null, vid: null as HTMLVideoElement | null };
    }),
  );

  // Calculate high-precision bounding box for each attachment
  const bodyStartY = 310;
  interface AttBox {
    att: Attachment;
    left: number;
    top: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
    isLeft: boolean;
    isRight: boolean;
    isCenter: boolean;
    img: HTMLImageElement | null;
    vid: HTMLVideoElement | null;
  }

  const attBoxes: AttBox[] = atts.map((a, i) => {
    const rawX = a.x ?? 6;
    const left = marginL + (rawX / 100) * contentW;
    const width = ((a.w ?? PLATE_DEFAULT_W[a.kind]) / 100) * contentW;
    const top = bodyStartY + (a.y ?? 48) * (contentW / refW);
    const { img, vid } = media[i];

    let height: number;
    if (a.kind === 'image') {
      height = img && img.naturalWidth > 0 ? width * (img.naturalHeight / img.naturalWidth) : width * 0.62;
    } else if (a.kind === 'video') {
      height = width * 0.58;
    } else {
      height = (a.h ?? 64) * scale + 24;
    }

    const right = left + width;
    const bottom = top + height;
    const isLeft = rawX <= 38;
    const isRight = rawX > 38 && rawX + (a.w ?? PLATE_DEFAULT_W[a.kind]) >= 90;
    const isCenter = !isLeft && !isRight;

    return { att: a, left, top, width, height, right, bottom, isLeft, isRight, isCenter, img, vid };
  });

  // Calculate layout of text lines taking sealed obstacles into account
  const paragraphs = htmlToParagraphs(entry.body);
  const lineH = 36;
  const FONT_BODY = '400 22px "Space Grotesk", sans-serif';
  const testCanvas = document.createElement('canvas');
  const testCtx = testCanvas.getContext('2d')!;
  testCtx.font = FONT_BODY;

  interface TextLine {
    text: string;
    x: number;
    y: number;
  }

  const computedLines: TextLine[] = [];
  let curY = bodyStartY + 30;

  for (const para of paragraphs) {
    if (!para.trim()) {
      curY += lineH * 0.7;
      continue;
    }

    const words = para.split(/\s+/).filter(Boolean);
    let curLineWords: string[] = [];

    const getLineConfig = (y: number) => {
      // Find obstacles active at this vertical line position
      const intersecting = attBoxes.filter((b) => b.att.glued && y >= b.top - 6 && y <= b.bottom + 8);

      let startX = marginL;
      let availW = contentW;
      let nextY = y;

      if (intersecting.length > 0) {
        const rightObs = intersecting.find((b) => (b.att.x ?? 6) > 40);
        const leftObs = intersecting.find((b) => (b.att.x ?? 6) <= 40);

        if (leftObs && (leftObs.att.w ?? PLATE_DEFAULT_W[leftObs.att.kind]) > 35) {
          // Left attachment is wide (>35%): treat as a block plate and resume text below it
          nextY = Math.max(y, leftObs.bottom + 20);
          startX = marginL;
          availW = contentW;
        } else if (leftObs && rightObs) {
          // Obstructions on both sides: skip past
          nextY = Math.max(leftObs.bottom, rightObs.bottom) + 20;
          startX = marginL;
          availW = contentW;
        } else if (leftObs) {
          // Left attachment is compact (<=35%): text sits on right side
          startX = Math.max(marginL, leftObs.right + 24);
          availW = Math.max(220, marginL + contentW - startX);
        } else if (rightObs) {
          // Right attachment: text stays on normal left margin and wraps before attachment
          startX = marginL;
          availW = Math.max(220, rightObs.left - 24 - marginL);
        }
      }

      return { startX, availW, nextY };
    };

    const flushLine = () => {
      if (curLineWords.length === 0) return;
      const text = curLineWords.join(' ');
      const cfg = getLineConfig(curY);
      curY = cfg.nextY;
      computedLines.push({ text, x: cfg.startX, y: curY });
      curY += lineH;
      curLineWords = [];
    };

    for (const w of words) {
      const testWords = [...curLineWords, w];
      const testStr = testWords.join(' ');
      const cfg = getLineConfig(curY);

      if (testCtx.measureText(testStr).width > cfg.availW && curLineWords.length > 0) {
        flushLine();
        curLineWords = [w];
      } else {
        curLineWords.push(w);
      }
    }
    flushLine();
  }

  // Dynamic canvas height to comfortably fit all text and all attachments
  const maxAttBottom = attBoxes.reduce((max, b) => Math.max(max, b.bottom), 0);
  const maxTextBottom = curY;
  const contentMaxY = Math.max(maxAttBottom, maxTextBottom);
  const H = Math.max(1250, Math.ceil(contentMaxY + 160));

  // Instantiate high-resolution canvas
  const cv = document.createElement('canvas');
  cv.width = W * DPR;
  cv.height = H * DPR;
  const g = cv.getContext('2d')!;
  g.scale(DPR, DPR);

  // Enable crisp smoothing
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';

  // 1. Deep cosmic dark paper background with subtle vertical gradient
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#070b16');
  bg.addColorStop(0.5, '#050811');
  bg.addColorStop(1, '#03050a');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // Subtle celestial nebula tint in top right
  const m = moodOf(entry.mood);
  const glowColor = m ? m.color : planet.palette.atmo;
  const nebula = g.createRadialGradient(W * 0.82, 90, 10, W * 0.82, 90, 480);
  nebula.addColorStop(0, `${glowColor}25`);
  nebula.addColorStop(0.6, `${glowColor}08`);
  nebula.addColorStop(1, 'transparent');
  g.fillStyle = nebula;
  g.fillRect(0, 0, W, H);

  // Subtle scanned micro-texture weave
  g.fillStyle = 'rgba(255, 255, 255, 0.012)';
  for (let gx = 0; gx < W; gx += 28) {
    g.fillRect(gx, 0, 1, H);
  }
  for (let gy = 0; gy < H; gy += 28) {
    g.fillRect(0, gy, W, 1);
  }

  // Left planetary atmospheric binding spine
  const atmoSpine = g.createLinearGradient(0, 0, 12, 0);
  atmoSpine.addColorStop(0, planet.palette.atmo);
  atmoSpine.addColorStop(1, `${planet.palette.atmo}20`);
  g.fillStyle = atmoSpine;
  g.fillRect(0, 0, 12, H);

  // Archival corner registration tick marks
  const drawCorner = (cx: number, cy: number, dx: number, dy: number) => {
    g.strokeStyle = 'rgba(163, 184, 214, 0.35)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(cx, cy + dy * 14);
    g.lineTo(cx, cy);
    g.lineTo(cx + dx * 14, cy);
    g.stroke();
  };
  drawCorner(32, 32, 1, 1);
  drawCorner(W - 32, 32, -1, 1);
  drawCorner(32, H - 32, 1, -1);
  drawCorner(W - 32, H - 32, -1, -1);

  // 2. Archival Header
  // Top micro-bar
  g.fillStyle = 'rgba(163, 184, 214, 0.6)';
  g.font = '600 13px "Space Mono", monospace';
  g.fillText(
    `✦ MY UNIVERSE ARCHIVE  ·  ${planet.name.toUpperCase()} SYSTEM  ·  ID ${entry.id.slice(0, 8).toUpperCase()}`,
    marginL,
    headerTop,
  );

  // Main Page Title
  g.fillStyle = '#f2f6fc';
  g.font = '600 42px "Unbounded", sans-serif';
  const displayTitle = entry.title.trim() || 'Untitled Page';
  g.fillText(displayTitle, marginL, headerTop + 58);

  // Metadata Pill Strip
  const metaY = headerTop + 104;
  g.fillStyle = 'rgba(163, 184, 214, 0.85)';
  g.font = '500 15px "Space Mono", monospace';
  const dateStr = fmtDate(entry.createdAt);
  const timeStr = new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  let metaX = marginL;
  g.fillText(`${dateStr}  ${timeStr}`, metaX, metaY);
  metaX += g.measureText(`${dateStr}  ${timeStr}`).width + 24;

  // Weather badge
  if (entry.weather && entry.weather !== 'clear') {
    const wLabel = WEATHERS.find((w) => w.id === entry.weather)?.label || entry.weather;
    g.fillStyle = 'rgba(111, 194, 180, 0.88)';
    g.fillText(`·  ${wLabel}`, metaX, metaY);
    metaX += g.measureText(`·  ${wLabel}`).width + 24;
  }

  // Mood badge
  if (m) {
    g.fillStyle = m.color;
    g.beginPath();
    g.arc(metaX + 5, metaY - 5, 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = m.color;
    g.fillText(` ${m.label}`, metaX + 14, metaY);
    metaX += g.measureText(` ${m.label}`).width + 24;
  }

  // Reading stats
  const wordCount = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
  const readMins = Math.max(1, Math.round(wordCount / 200));
  g.fillStyle = 'rgba(139, 161, 196, 0.65)';
  g.fillText(`·  ${wordCount} words (${readMins}m read)`, metaX, metaY);

  // Tags Chips
  if (entry.tags && entry.tags.length > 0) {
    let tagX = marginL;
    const tagY = headerTop + 142;
    g.font = '600 12px "Space Mono", monospace';
    entry.tags.forEach((tag) => {
      const tagText = `#${tag}`;
      const tagW = g.measureText(tagText).width + 18;
      g.fillStyle = 'rgba(28, 39, 64, 0.6)';
      g.strokeStyle = 'rgba(111, 194, 180, 0.35)';
      g.lineWidth = 1;
      g.beginPath();
      if (typeof g.roundRect === 'function') {
        g.roundRect(tagX, tagY - 14, tagW, 20, 4);
      } else {
        g.rect(tagX, tagY - 14, tagW, 20);
      }
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(111, 194, 180, 0.9)';
      g.fillText(tagText, tagX + 9, tagY);
      tagX += tagW + 10;
    });
  }

  // Divider Line
  g.strokeStyle = 'rgba(163, 184, 214, 0.18)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(marginL, headerTop + 175);
  g.lineTo(W - marginR, headerTop + 175);
  g.stroke();

  // 3. Render Body Text with High Contrast & Perfect Spacing
  g.fillStyle = 'rgba(233, 238, 247, 0.95)';
  g.font = FONT_BODY;
  computedLines.forEach((line) => {
    g.fillText(line.text, line.x, line.y);
  });

  // 4. Render All Attachments with Pixel Precision & High Detail
  attBoxes.forEach((box) => {
    const { att, left, top, width, height, right, bottom, img, vid } = box;
    const isGlued = att.glued;

    // Soft drop shadow
    g.save();
    g.shadowColor = 'rgba(0, 0, 0, 0.65)';
    g.shadowBlur = 24;
    g.shadowOffsetX = 0;
    g.shadowOffsetY = 8;

    // Card Backing Plate
    g.fillStyle = '#0a0f1d';
    g.beginPath();
    if (typeof g.roundRect === 'function') {
      g.roundRect(left, top, width, height, 8);
    } else {
      g.rect(left, top, width, height);
    }
    g.fill();
    g.restore();

    // Card Content
    g.save();
    g.beginPath();
    if (typeof g.roundRect === 'function') {
      g.roundRect(left, top, width, height, 8);
    } else {
      g.rect(left, top, width, height);
    }
    g.clip();

    if (att.kind === 'image') {
      if (img && img.naturalWidth > 0) {
        g.drawImage(img, left, top, width, height);
      } else {
        g.fillStyle = '#0d1424';
        g.fillRect(left, top, width, height);
        g.fillStyle = 'rgba(163, 184, 214, 0.5)';
        g.font = '14px "Space Mono", monospace';
        g.fillText('IMAGE ATTACHMENT', left + 20, top + height / 2);
      }
    } else if (att.kind === 'video') {
      if (vid) {
        try {
          g.drawImage(vid, left, top, width, height);
        } catch {
          g.fillStyle = '#0d1424';
          g.fillRect(left, top, width, height);
        }
      } else {
        g.fillStyle = '#0d1424';
        g.fillRect(left, top, width, height);
      }
      // Center Glass Play Insignia
      const cx = left + width / 2;
      const cy = top + height / 2;
      g.fillStyle = 'rgba(9, 13, 24, 0.75)';
      g.strokeStyle = 'rgba(111, 194, 180, 0.6)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(cx, cy, 26, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#6fc2b4';
      g.beginPath();
      g.moveTo(cx - 7, cy - 11);
      g.lineTo(cx - 7, cy + 11);
      g.lineTo(cx + 12, cy);
      g.closePath();
      g.fill();
    } else {
      // Audio Cassette / Waveform Card
      const audioGrad = g.createLinearGradient(left, top, left, bottom);
      audioGrad.addColorStop(0, '#0c1322');
      audioGrad.addColorStop(1, '#070b14');
      g.fillStyle = audioGrad;
      g.fillRect(left, top, width, height);

      // Play Button Circle
      g.fillStyle = 'rgba(111, 194, 180, 0.15)';
      g.strokeStyle = '#6fc2b4';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(left + 36, top + height / 2, 18, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#6fc2b4';
      g.beginPath();
      g.moveTo(left + 32, top + height / 2 - 8);
      g.lineTo(left + 32, top + height / 2 + 8);
      g.lineTo(left + 44, top + height / 2);
      g.closePath();
      g.fill();

      // Synthesizer Waveform Visualizer Bars
      const peaks = att.peaks && att.peaks.length ? att.peaks : synthBars(att.name, 36);
      const waveStartX = left + 70;
      const waveW = width - 90;
      const barW = Math.max(2, (waveW - peaks.length * 3) / peaks.length);
      const waveH = height - 28;

      g.fillStyle = 'rgba(111, 194, 180, 0.75)';
      peaks.forEach((p, k) => {
        const bh = Math.max(4, p * waveH);
        const bx = waveStartX + k * (barW + 3);
        const by = top + (height - bh) / 2;
        g.fillRect(bx, by, barW, bh);
      });
    }

    // Top Caption/Name Gradient Scrim & Label
    const scrim = g.createLinearGradient(left, bottom - 34, left, bottom);
    scrim.addColorStop(0, 'rgba(4, 7, 14, 0)');
    scrim.addColorStop(1, 'rgba(4, 7, 14, 0.92)');
    g.fillStyle = scrim;
    g.fillRect(left, bottom - 34, width, 34);

    g.fillStyle = '#e9ecf1';
    g.font = '500 13px "Space Mono", monospace';
    const cleanName = att.name.length > 32 ? att.name.slice(0, 31) + '…' : att.name;
    g.fillText(`✦ ${cleanName}`, left + 12, bottom - 11);

    g.restore();

    // Crisp Border
    g.strokeStyle = isGlued ? 'rgba(111, 194, 180, 0.75)' : 'rgba(242, 193, 120, 0.85)';
    g.lineWidth = isGlued ? 1.5 : 1.2;
    g.beginPath();
    if (typeof g.roundRect === 'function') {
      g.roundRect(left, top, width, height, 8);
    } else {
      g.rect(left, top, width, height);
    }
    g.stroke();

    // Archival Seal Badge on Top Right
    const sealBadgeW = isGlued ? 88 : 96;
    const sealBadgeH = 22;
    const sealBadgeX = right - sealBadgeW - 8;
    const sealBadgeY = top + 8;

    g.fillStyle = isGlued ? 'rgba(8, 18, 26, 0.92)' : 'rgba(24, 18, 8, 0.92)';
    g.strokeStyle = isGlued ? '#6fc2b4' : '#f2c178';
    g.lineWidth = 1;
    g.beginPath();
    if (typeof g.roundRect === 'function') {
      g.roundRect(sealBadgeX, sealBadgeY, sealBadgeW, sealBadgeH, 4);
    } else {
      g.rect(sealBadgeX, sealBadgeY, sealBadgeW, sealBadgeH);
    }
    g.fill();
    g.stroke();

    g.fillStyle = isGlued ? '#6fc2b4' : '#f2c178';
    g.font = '700 10.5px "Space Mono", monospace';
    g.fillText(isGlued ? '✦ SEALED' : '◇ UNSEALED', sealBadgeX + 9, sealBadgeY + 15);
  });

  // 5. Document Archival Footer
  const footerY = H - 56;
  g.strokeStyle = 'rgba(163, 184, 214, 0.15)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(marginL, footerY - 24);
  g.lineTo(W - marginR, footerY - 24);
  g.stroke();

  g.fillStyle = 'rgba(163, 184, 214, 0.55)';
  g.font = '500 13px "Space Mono", monospace';
  g.fillText('MY UNIVERSE · ARCHIVAL COSMIC SCAN · DOCUMENT INTEGRITY VERIFIED', marginL, footerY);

  g.fillStyle = 'rgba(163, 184, 214, 0.4)';
  g.fillText(`RECORD ID: ${entry.id}  ·  PLANET: ${planet.name.toUpperCase()}`, marginL, footerY + 22);

  // Trigger high-precision PNG download
  cv.toBlob(
    (b) => {
      if (!b) {
        toast('could not render the document', 'warn');
        return;
      }
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url;
      const sanitizedPlanet = planet.name.replace(/[^\w\- ]+/g, '').trim();
      const sanitizedTitle = entry.title.replace(/[^\w\- ]+/g, '').trim() || 'page';
      a.download = `${sanitizedPlanet}_${sanitizedTitle}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 6000);
      toast(
        `document exported — high-precision scan with ${atts.length ? atts.length + ' attachment' + (atts.length > 1 ? 's' : '') : 'text'}`
      );
    },
    'image/png',
    1.0,
  );
}

function readAsDataURL(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error('read failed'));
    r.readAsDataURL(f);
  });
}

function synthBars(seedStr: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const v = ((h >>> 0) % 1000) / 1000;
    const env = Math.sin((i / n) * Math.PI) * 0.7 + 0.3;
    out.push(Math.max(0.08, v * env));
  }
  return out;
}

const TONES: { id: string; label: string; css: string }[] = [
  { id: '', label: 'original', css: 'none' },
  { id: 'noir', label: 'noir', css: 'grayscale(1) contrast(1.12)' },
  { id: 'warm', label: 'warm', css: 'sepia(0.38) saturate(1.25)' },
  { id: 'fade', label: 'faded', css: 'saturate(0.55) brightness(1.1) contrast(0.88)' },
];
const toneCss = (id?: string) => TONES.find((t) => t.id === (id ?? ''))?.css ?? 'none';

const PLATE_DEFAULT_W: Record<Attachment['kind'], number> = {
  image: 55,
  video: 65,
  audio: 78,
  code: 85,
  file: 75,
};

const GluedPage = memo(function GluedPage({
  entry,
  active,
  planet,
  onTagFilter,
  onMediaAttach,
}: {
  entry: DiaryEntry;
  active: boolean;
  planet: CosmicBody;
  onTagFilter: (t: string) => void;
  onMediaAttach?: (files: FileList | null) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [cropId, setCropId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ id: string; mode: 'move' | 'resize'; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const atts = entry.attachments;
  const mood = moodOf(entry.mood);
  const weather = entry.weather ?? 'clear';
  const pageText = htmlToText(entry.body);
  const words = pageText.trim() ? pageText.trim().split(/\s+/).length : 0;
  const mins = words ? Math.max(1, Math.round(words / 200)) : 0;
  const isEmpty = !pageText.trim() && atts.length === 0;

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* the editor's HTML is owned imperatively, NOT by React — React must never
     rewrite it while you're typing/clicking, or the caret gets destroyed */
  const loadedEntryId = useRef<string | null>(null);

  const saveText = () => {
    const el = bodyRef.current;
    if (!el) return;
    /* keep the saved body clean of the transient text spacers */
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.plate-spacer').forEach((n) => n.remove());
    actions.updateEntry(entry.id, { body: clone.innerHTML });
  };

  const onInput = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(saveText, 550);
  };

  const syncTextSpacers = useCallback(() => {
    const textEl = bodyRef.current;
    if (!textEl) return;
    textEl.querySelectorAll('.plate-spacer').forEach((n) => n.remove());

    const gluedAtts = atts.filter((a) => a.glued);
    if (gluedAtts.length === 0) return;

    const leftAtts = gluedAtts
      .filter((a) => (a.x ?? 0) <= 40)
      .sort((a, b) => (a.y ?? 48) - (b.y ?? 48));
    const rightAtts = gluedAtts
      .filter((a) => (a.x ?? 0) > 40)
      .sort((a, b) => (a.y ?? 48) - (b.y ?? 48));

    const frag = document.createDocumentFragment();

    let prevLeftY = 0;
    leftAtts.forEach((a) => {
      const targetTop = a.y ?? 48;
      const leadH = Math.max(0, targetTop - prevLeftY);
      const cardEl = cardRefs.current[a.id];
      const cardH = cardEl ? cardEl.offsetHeight : (a.kind === 'audio' ? (a.h ?? 64) + 26 : 180);
      const widthPct = Math.min(85, Math.max(20, (a.x ?? 6) + (a.w ?? PLATE_DEFAULT_W[a.kind])));

      if (leadH > 0) {
        const lead = document.createElement('div');
        lead.className = 'plate-spacer';
        lead.contentEditable = 'false';
        lead.style.cssText = `
          float: left;
          clear: left;
          width: 1px;
          height: ${leadH}px;
          pointer-events: none;
          user-select: none;
        `;
        frag.appendChild(lead);
      }

      const obstacle = document.createElement('div');
      obstacle.className = 'plate-spacer';
      obstacle.contentEditable = 'false';
      obstacle.style.cssText = `
        float: left;
        clear: left;
        width: ${widthPct}%;
        height: ${cardH}px;
        margin-right: 14px;
        margin-bottom: 8px;
        shape-outside: margin-box;
        pointer-events: none;
        user-select: none;
      `;
      frag.appendChild(obstacle);
      prevLeftY = targetTop + cardH + 8;
    });

    let prevRightY = 0;
    rightAtts.forEach((a) => {
      const targetTop = a.y ?? 48;
      const leadH = Math.max(0, targetTop - prevRightY);
      const cardEl = cardRefs.current[a.id];
      const cardH = cardEl ? cardEl.offsetHeight : (a.kind === 'audio' ? (a.h ?? 64) + 26 : 180);
      const widthPct = Math.min(85, Math.max(20, 100 - (a.x ?? 45)));

      if (leadH > 0) {
        const lead = document.createElement('div');
        lead.className = 'plate-spacer';
        lead.contentEditable = 'false';
        lead.style.cssText = `
          float: right;
          clear: right;
          width: 1px;
          height: ${leadH}px;
          pointer-events: none;
          user-select: none;
        `;
        frag.appendChild(lead);
      }

      const obstacle = document.createElement('div');
      obstacle.className = 'plate-spacer';
      obstacle.contentEditable = 'false';
      obstacle.style.cssText = `
        float: right;
        clear: right;
        width: ${widthPct}%;
        height: ${cardH}px;
        margin-left: 14px;
        margin-bottom: 8px;
        shape-outside: margin-box;
        pointer-events: none;
        user-select: none;
      `;
      frag.appendChild(obstacle);
      prevRightY = targetTop + cardH + 8;
    });

    textEl.insertBefore(frag, textEl.firstChild);
  }, [atts]);

  /* load the page body exactly once per entry — afterwards the DOM is yours;
     React never rewrites it, so the caret never jumps while you click/type */
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || loadedEntryId.current === entry.id) return;
    el.innerHTML = entry.body || '';
    loadedEntryId.current = entry.id;
    syncTextSpacers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  /* re-sync the text spacers only when the sealed layout actually changes —
     not on every keystroke, so the caret is never disturbed */
  const spacerKey = atts
    .filter((a) => a.glued)
    .map((a) => `${a.id}:${a.x ?? 0}:${a.y ?? 0}:${a.w ?? 0}:${a.h ?? 0}`)
    .join('|');
  useEffect(() => {
    if (loadedEntryId.current === entry.id) syncTextSpacers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spacerKey]);

  const handlePointerDown = (a: Attachment, mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    if (a.glued) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setSelId(a.id);
    setDragState({
      id: a.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: a.x ?? 6,
      origY: a.y ?? 48,
      origW: a.w ?? PLATE_DEFAULT_W[a.kind],
      origH: a.h ?? 64,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragState.startX) / rect.width) * 100;
    const dy = e.clientY - dragState.startY;

    if (dragState.mode === 'move') {
      const newX = Math.max(0, Math.min(90, dragState.origX + dx));
      const newY = Math.max(0, dragState.origY + dy);
      actions.updateAttachment(entry.id, dragState.id, { x: newX, y: newY });
    } else {
      const newW = Math.max(20, Math.min(100, dragState.origW + dx));
      const newH = Math.max(40, dragState.origH + dy);
      actions.updateAttachment(entry.id, dragState.id, { w: newW, h: newH });
    }
  };

  const handlePointerUp = () => {
    if (dragState) {
      setDragState(null);
      sfxTick();
      setTimeout(syncTextSpacers, 20);
    }
  };

  const toggleGlue = (a: Attachment) => {
    const isGlued = !a.glued;
    actions.updateAttachment(entry.id, a.id, { glued: isGlued });
    sfxTick();
    toast(isGlued ? 'attachment sealed into the paper' : 'attachment unsealed & freed');
  };

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    const el = bodyRef.current;
    if (!el) return;
    el.innerText = t.body;
    actions.updateEntry(entry.id, { body: t.body, title: entry.title === 'Untitled page' ? t.title : entry.title });
    sfxTick();
    toast(`${t.label} formed`);
  };

  const cropEntry = cropId ? atts.find((a) => a.id === cropId) ?? null : null;

  return (
    <div
      className="relative flex flex-col h-full px-8 pt-5 pb-7 overflow-hidden"
      ref={containerRef}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onMediaAttach?.(e.dataTransfer.files);
        }
      }}
    >
      {active && <WeatherLayer weather={weather} />}
      {mood && (
        <span
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(120% 85% at 88% 0%, ${mood.color}1f, transparent 58%)` }}
        />
      )}

      <div className="relative page-head flex items-start justify-between gap-3 pb-3 mb-3">
        <div className="min-w-0 flex-1">
          <input
            className="bg-transparent font-display text-[16px] font-medium tracking-[0.06em] text-paper w-full outline-none placeholder:text-slate-dim/50"
            defaultValue={entry.title}
            placeholder="Untitled page"
            onBlur={(e) => actions.updateEntry(entry.id, { title: e.target.value || 'Untitled page' })}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          <span className="font-mono text-[7.5px] tracking-[0.24em] uppercase text-slate-dim/80 block mt-1">
            {entry.archived ? 'on the dark side · ' : entry.bookmarked ? 'bookmarked · ' : ''}
            edited {fmtDate(entry.updatedAt)}{words ? ` · ${words} words · ${mins} min read` : ''}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="date-stamp">{fmtDate(entry.createdAt)}</span>
          <div className="flex items-center gap-1.5" title="set the mood of this page">
            {MOODS.map((mm) => (
              <button
                key={mm.id}
                title={mm.label}
                onClick={() => {
                  sfxTick();
                  actions.updateEntry(entry.id, { mood: entry.mood === mm.id ? undefined : mm.id });
                }}
                className={`mood-dot ${entry.mood === mm.id ? 'on' : ''}`}
                style={{ background: mm.color, boxShadow: entry.mood === mm.id ? `0 0 8px ${mm.color}` : 'none' }}
              />
            ))}
          </div>
          <div className="flex items-center gap-0.5" title="set the weather of this page">
            {WEATHERS.map((ww) => (
              <button
                key={ww.id}
                title={ww.label}
                onClick={() => {
                  sfxTick();
                  actions.updateEntry(entry.id, { weather: weather === ww.id && ww.id !== 'clear' ? undefined : ww.id });
                }}
                className={`weather-btn ${weather === ww.id ? 'on' : ''}`}
              >
                <WeatherGlyph w={ww.id} size={12} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {isEmpty && (
        <div className="relative templates">
          <span className="font-mono text-[7.5px] tracking-[0.3em] uppercase text-slate-dim/80">begin as</span>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {TEMPLATES.map((t) => (
              <button key={t.label} onClick={() => applyTemplate(t)} className="template-card">
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="page-scroll relative flex-1 min-h-0 overflow-y-auto pr-1.5"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="relative min-h-[500px]">
          <div
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            className="page-body whitespace-pre-wrap outline-none relative z-10"
            style={{ minHeight: '500px' }}
            onInput={onInput}
            onClick={() => setSelId(null)}
          />

          <div className="absolute inset-0 pointer-events-none z-20">
            {atts.map((a) => {
              const isSel = selId === a.id;
              const style: React.CSSProperties = {
                position: 'absolute',
                left: `${a.x ?? 6}%`,
                top: `${a.y ?? 48}px`,
                width: `${a.w ?? PLATE_DEFAULT_W[a.kind]}%`,
                height: a.kind === 'audio' ? `${a.h ?? 64}px` : 'auto',
                filter: a.kind === 'image' && a.tone ? toneCss(a.tone) : 'none',
              };

              return (
                <div
                  key={a.id}
                  ref={(el) => { cardRefs.current[a.id] = el; }}
                  style={style}
                  className={`pointer-events-auto rounded-lg transition-shadow border ${
                    a.glued ? 'border-teal-ice/40 shadow-lg' : 'border-solar/60 shadow-xl cursor-move'
                  } ${isSel ? 'ring-2 ring-solar' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelId(a.id);
                  }}
                  onPointerDown={handlePointerDown(a, 'move')}
                >
                  <div className="relative overflow-hidden rounded-md bg-panel/90">
                    {a.kind === 'image' && (
                      <ImageOrGifPlate
                        att={a}
                        onImageLoad={() => { setTimeout(syncTextSpacers, 10); }}
                      />
                    )}
                    {a.kind === 'video' && (
                      <VideoPlate
                        att={a}
                        isGlued={a.glued}
                      />
                    )}
                    {a.kind === 'audio' && (
                      <AudioPlate
                        att={a}
                        isGlued={a.glued}
                      />
                    )}
                    {(a.kind === 'file' || a.kind === 'code') && (
                      <FileOrCodePlate
                        att={a}
                        isGlued={a.glued}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1 mt-1 px-1 py-0.5 bg-void/80 rounded border border-line/30 text-[9px] font-mono">
                    <span className="truncate text-slate-dim max-w-[100px]">{a.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGlue(a);
                        }}
                        className={`px-1.5 py-0.5 rounded ${a.glued ? 'bg-teal-ice/20 text-teal-ice' : 'bg-solar/20 text-solar'}`}
                      >
                        {a.glued ? 'sealed' : 'unsealed'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          actions.deleteAttachment(entry.id, a.id);
                          toast('attachment removed');
                        }}
                        className="text-red-400 hover:text-red-300 px-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {!a.glued && (
                    <div
                      className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-solar rounded-full cursor-nwse-resize shadow"
                      onPointerDown={handlePointerDown(a, 'resize')}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-3 mt-2.5 pt-2.5 border-t border-line/40">
        <div className="flex items-center gap-1.5 flex-wrap min-h-[24px] min-w-0">
          {entry.tags.map((t) => (
            <button key={t} onClick={() => onTagFilter(t)} className="tag-chip">
              {t}
            </button>
          ))}
          <TagInput entryId={entry.id} tags={entry.tags} />
        </div>
        <span className="font-mono text-[7px] tracking-[0.2em] uppercase text-slate-dim/40 shrink-0">
          glue·v7-cavity
        </span>
        <div className="relative flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              className={`win-icon ${showExportMenu ? 'bg-solar/20 text-solar' : ''}`}
              title="Export document (Vector PDF / Ultra-HD Image / Print)"
              onClick={() => {
                sfxTick();
                setShowExportMenu(!showExportMenu);
              }}
            >
              <IcDownload size={12} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 bottom-full mb-2 z-50 p-2.5 rounded-lg border border-teal-ice/30 bg-[#070b16]/95 backdrop-blur-xl shadow-2xl flex flex-col gap-1.5 w-64 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-line/40 text-[8.5px] font-mono text-slate-dim tracking-wider uppercase">
                  <span>Export Document Scan</span>
                  <button onClick={() => setShowExportMenu(false)} className="text-slate-dim hover:text-paper text-xs px-1">✕</button>
                </div>
                
                <button
                  disabled={isExporting}
                  onClick={async () => {
                    setIsExporting(true);
                    sfxTick();
                    await exportDiaryDocument(entry, planet, containerRef.current, { format: 'pdf', quality: 'ultra' });
                    setIsExporting(false);
                    setShowExportMenu(false);
                  }}
                  className="flex items-start gap-2 p-1.5 rounded hover:bg-void/80 text-left transition-colors border border-transparent hover:border-teal-ice/20 group"
                >
                  <span className="text-sm mt-0.5">📄</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-sans text-xs text-paper font-medium group-hover:text-teal-ice transition-colors">Vector PDF (Infinite Zoom)</div>
                    <div className="font-mono text-[8px] text-slate-dim leading-snug mt-0.5">Multi-page paginated A4, 100% vector text, zero pixel cracking</div>
                  </div>
                </button>

                <button
                  disabled={isExporting}
                  onClick={async () => {
                    setIsExporting(true);
                    sfxTick();
                    await exportDiaryDocument(entry, planet, containerRef.current, { format: 'png', quality: 'master' });
                    setIsExporting(false);
                    setShowExportMenu(false);
                  }}
                  className="flex items-start gap-2 p-1.5 rounded hover:bg-void/80 text-left transition-colors border border-transparent hover:border-solar/20 group"
                >
                  <span className="text-sm mt-0.5">🖼️</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-sans text-xs text-paper font-medium group-hover:text-solar transition-colors">Ultra-HD Image (300 DPI)</div>
                    <div className="font-mono text-[8px] text-slate-dim leading-snug mt-0.5">100% exact live DOM scan, 3x master resolution for sharing</div>
                  </div>
                </button>

                <button
                  disabled={isExporting}
                  onClick={async () => {
                    setIsExporting(true);
                    sfxTick();
                    await exportDiaryDocument(entry, planet, containerRef.current, { format: 'print' });
                    setIsExporting(false);
                    setShowExportMenu(false);
                  }}
                  className="flex items-start gap-2 p-1.5 rounded hover:bg-void/80 text-left transition-colors border border-transparent hover:border-line/40 group"
                >
                  <span className="text-sm mt-0.5">🖨️</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-sans text-xs text-paper font-medium group-hover:text-slate-soft transition-colors">Cosmic Print / Native PDF</div>
                    <div className="font-mono text-[8px] text-slate-dim leading-snug mt-0.5">Direct system print engine with dark celestial borders</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            className={`bookmark-btn ${entry.archived ? 'on' : ''}`}
            onClick={() => {
              sfxTick();
              actions.updateEntry(entry.id, { archived: !entry.archived });
              toast(entry.archived ? 'back in the light' : 'moved to the dark side');
            }}
          >
            <IcMoon size={13} />
            <span>{entry.archived ? 'return' : 'dark side'}</span>
          </button>
          {confirmDel ? (
            <button
              className="font-mono text-[8.5px] tracking-[0.16em] uppercase text-red-300 border border-red-400/50 px-2 py-1 hover:bg-red-400/10 transition-colors"
              onClick={() => {
                actions.deleteEntry(entry.id);
                toast('page dissolved into the planet');
              }}
              onMouseLeave={() => setConfirmDel(false)}
            >
              confirm?
            </button>
          ) : (
            <button
              className="font-mono text-[8.5px] tracking-[0.16em] uppercase text-slate-dim hover:text-red-300 transition-colors"
              onClick={() => setConfirmDel(true)}
            >
              dissolve
            </button>
          )}
          <button
            className={`bookmark-btn ${entry.bookmarked ? 'on' : ''}`}
            onClick={() => {
              sfxTick();
              actions.toggleBookmark(entry.id);
            }}
          >
            <IcStar size={13} filled={entry.bookmarked} />
            <span>{entry.bookmarked ? 'marked' : 'mark'}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

function TagInput({ entryId, tags }: { entryId: string; tags: string[] }) {
  return (
    <input
      className="bg-transparent font-mono text-[9.5px] tracking-[0.14em] uppercase text-slate-soft w-[76px] placeholder:text-slate-dim/60 border-b border-transparent focus:border-line transition-colors"
      placeholder="+ tag"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const v = (e.target as HTMLInputElement).value.trim().toLowerCase().replace(/\s+/g, '-');
          if (v && !tags.includes(v)) { sfxTick(); actions.updateEntry(entryId, { tags: [...tags, v] }); }
          (e.target as HTMLInputElement).value = '';
        }
      }}
    />
  );
}

function ConstellationBar({ planetId, onOpen }: { planetId: string; onOpen?: (id: string) => void }) {
  const state = useUniverse();
  const [picking, setPicking] = useState(false);
  const links = state.connections.filter((c) => c.a === planetId || c.b === planetId);
  const linkedIds = new Set(links.map((c) => (c.a === planetId ? c.b : c.a)));
  const candidates = state.bodies.filter((b) => b.id !== planetId && b.id !== 'anchor' && !linkedIds.has(b.id));
  const bodyOf = (id: string) => state.bodies.find((b) => b.id === id);

  return (
    <div className="flex items-center gap-1.5 flex-wrap px-4 py-2 border-t border-line/50 shrink-0" style={{ background: 'rgba(6,9,17,0.5)' }}>
      <span className="font-mono text-[7.5px] tracking-[0.3em] uppercase text-slate-dim/90 mr-1">linked with</span>
      {links.length === 0 && <span className="font-mono text-[8.5px] tracking-[0.14em] text-slate-dim/70">no constellations yet</span>}
      {links.map((c) => {
        const otherId = c.a === planetId ? c.b : c.a;
        const other = bodyOf(otherId);
        if (!other) return null;
        return (
          <span key={c.id} className="link-chip group">
            <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: other.palette.atmo, boxShadow: `0 0 6px ${other.palette.atmo}` }} />
            <button className="truncate max-w-[110px] hover:text-paper transition-colors" onClick={() => { sfxTick(); onOpen?.(otherId); }} title={`open ${other.name}'s diary`}>
              {other.name}
            </button>
            <button
              className="opacity-40 group-hover:opacity-100 hover:text-red-300 transition-all"
              onClick={() => { sfxTick(); actions.disconnect(c.id); toast(`link to ${other.name} dissolved`); }}
              title="dissolve this link"
            >
              <IcClose size={8} />
            </button>
          </span>
        );
      })}
      <span className="relative">
        <button className="link-chip accent" onClick={() => setPicking((v) => !v)} title="link another world">
          <IcPlus size={9} /> link
        </button>
        {picking && (
          <>
            <span className="fixed inset-0 z-[290]" onClick={() => setPicking(false)} />
            <span className="link-pop absolute bottom-full left-0 mb-1.5 z-[295]">
              <span className="block font-mono text-[7.5px] tracking-[0.28em] uppercase text-slate-dim px-3 pt-2.5 pb-1.5">form a constellation</span>
              {candidates.length === 0 && <span className="block px-3 pb-2.5 font-mono text-[9px] text-slate-dim/70">every world is already linked</span>}
              <span className="block max-h-[150px] overflow-y-auto thin-scroll">
                {candidates.map((b) => (
                  <button key={b.id} className="link-pop-item" onClick={() => { sfxConnect(); actions.connect(planetId, b.id); setPicking(false); toast(`constellation formed with ${b.name}`); }}>
                    <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: b.palette.atmo }} />
                    <span className="truncate">{b.name}</span>
                    {b.meaning && <span className="font-mono text-[7px] tracking-[0.18em] uppercase text-slate-dim ml-auto pl-2">{b.meaning}</span>}
                  </button>
                ))}
              </span>
            </span>
          </>
        )}
      </span>
    </div>
  );
}

interface Props {
  planet: CosmicBody;
  rect: WinRect;
  maximized?: boolean;
  focused: boolean;
  onFocus: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onOpenLinked?: (id: string) => void;
}

export default function DiaryWindow({ planet, rect, maximized, focused, onFocus, onMinimize, onMaximize, onClose, onOpenLinked }: Props) {
  const state = useUniverse();
  const { elRef, onBarDown, onGripDown } = useSpringWindow(rect, !!maximized);
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [cosmos, setCosmos] = useState(false);
  const [page, setPage] = useState(0);
  const [recording, setRecording] = useState(false);
  const [confirmPageDel, setConfirmPageDel] = useState(false);
  const [darkSide, setDarkSide] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const allEntries = useMemo(() => state.entries.filter((e) => e.planetId === planet.id), [state.entries, planet.id]);
  const streak = useMemo(() => computeStreak(allEntries), [allEntries]);

  const entries = useMemo(() => {
    let list = allEntries.filter((e) => (darkSide ? e.archived : !e.archived));
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(s) || e.body.toLowerCase().includes(s) || e.tags.some((t) => t.includes(s)));
    }
    return [...list].sort((a, b) => a.createdAt - b.createdAt);
  }, [allEntries, q, darkSide]);

  const cosmosResults = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.trim().toLowerCase();
    return state.entries
      .filter((e) => e.planetId !== planet.id && (e.title.toLowerCase().includes(s) || e.body.toLowerCase().includes(s)))
      .slice(0, 6);
  }, [q, state.entries, planet.id]);

  const clamped = Math.min(page, Math.max(0, entries.length - 1));
  useEffect(() => { if (clamped !== page) setPage(clamped); }, [clamped, page]);

  const currentEntry = entries[clamped];

  const climate = useMemo(() => {
    const counts: Record<string, number> = {};
    allEntries.forEach((e) => { if (e.mood) counts[e.mood] = (counts[e.mood] ?? 0) + 1; });
    return counts;
  }, [allEntries]);
  const climateTotal = Object.values(climate).reduce((a, b) => a + b, 0);

  const addPage = () => {
    setQ('');
    actions.addEntry(planet.id);
    toast(`new page formed on ${planet.name}`);
    setTimeout(() => setPage(entries.length), 60);
  };

  const onMic = async () => {
    const { startRecording, stopRecording } = await import('../audio');
    if (recording) {
      const res = await stopRecording();
      setRecording(false);
      if (res) {
        let target = currentEntry;
        if (!target) { target = actions.addEntry(planet.id); setPage(entries.length); }
        actions.addAttachment(target.id, { kind: 'audio', name: 'voice memo', dataUrl: res.dataUrl, peaks: res.peaks, duration: res.duration });
        toast('voice memo glued to the page — drag it where you want it');
      }
      return;
    }
    const ok = await startRecording();
    if (!ok) { toast('microphone unreachable in this runtime', 'warn'); return; }
    setRecording(true);
    toast('recording — the planet is listening');
  };

  const onMediaAttach = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f) continue;

      let target = currentEntry;
      if (!target) {
        target = actions.addEntry(planet.id);
        setPage(entries.length);
      }

      // 1. Audio files (mp3, wav, ogg, m4a, flac, aac)
      if (f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i)) {
        try {
          const dataUrl = await readAsDataURL(f);
          const tempAudio = new Audio();
          tempAudio.src = dataUrl;
          await new Promise<void>((resolve) => {
            tempAudio.onloadedmetadata = () => resolve();
            tempAudio.onerror = () => resolve();
            setTimeout(resolve, 800);
          });
          const dur = (tempAudio.duration && isFinite(tempAudio.duration)) ? Math.round(tempAudio.duration) : undefined;
          actions.addAttachment(target.id, {
            kind: 'audio',
            name: f.name,
            dataUrl,
            duration: dur,
            peaks: synthBars(f.name + f.size, 40),
          });
          toast(`audio track glued — playable immediately`);
        } catch {
          toast('failed to read audio attachment', 'warn');
        }
      }
      // 2. Video files (mp4, webm, mov, ogg, mkv)
      else if (f.type.startsWith('video/') || f.name.match(/\.(mp4|webm|mov|ogg|mkv)$/i)) {
        try {
          if (f.size > 80 * 1024 * 1024) {
            toast('video exceeds 80MB — select a shorter clip to glue', 'warn');
            continue;
          }
          const dataUrl = await readAsDataURL(f);
          actions.addAttachment(target.id, {
            kind: 'video',
            name: f.name,
            dataUrl,
          });
          toast(`video glued to page — fully playable`);
        } catch {
          toast('failed to read video attachment', 'warn');
        }
      }
      // 3. Animated GIF files
      else if (f.type === 'image/gif' || f.name.toLowerCase().endsWith('.gif')) {
        try {
          const dataUrl = await readAsDataURL(f);
          actions.addAttachment(target.id, {
            kind: 'image',
            name: f.name,
            dataUrl,
            isGif: true,
          });
          toast(`animated GIF glued — loopable & playable`);
        } catch {
          toast('failed to read GIF attachment', 'warn');
        }
      }
      // 4. Standard Images (png, jpg, webp, svg)
      else if (f.type.startsWith('image/')) {
        const img = new Image();
        const url = URL.createObjectURL(f);
        img.onload = () => {
          const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
          const cv = document.createElement('canvas');
          cv.width = Math.round(img.width * scale);
          cv.height = Math.round(img.height * scale);
          cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
          const dataUrl = cv.toDataURL('image/jpeg', 0.90);
          actions.addAttachment(target!.id, {
            kind: 'image',
            name: f.name,
            dataUrl,
            size: f.size,
          });
          toast(`photo glued to page`);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }
      // 5. Code & Text Files (HTML, JS, TS, CSS, JSON, Markdown, Python, SQL, Shell, etc. — stored safely, no execution)
      else if (
        f.name.match(/\.(html|htm|js|jsx|ts|tsx|mjs|cjs|css|scss|sass|less|json|md|markdown|py|sql|sh|bash|zsh|c|cpp|h|hpp|rs|go|java|kt|php|rb|swift|wasm|txt|log|yml|yaml|xml|csv|tsv|env|toml)$/i) ||
        f.type.startsWith('text/') ||
        f.type.includes('json') ||
        f.type.includes('javascript') ||
        f.type.includes('xml')
      ) {
        try {
          const text = await f.text();
          const dataUrl = await readAsDataURL(f);
          const lines = text.split('\n');
          const ext = f.name.split('.').pop()?.toLowerCase();
          actions.addAttachment(target.id, {
            kind: 'code',
            name: f.name,
            dataUrl,
            size: f.size,
            fileExt: ext,
            codeSnippet: text,
            lineCount: lines.length,
            mimeType: f.type || 'text/plain',
          });
          if (ext === 'html' || ext === 'htm') {
            toast(`HTML code documented & stored safely (safe no-run mode)`);
          } else {
            toast(`${f.name} documented & stored safely`);
          }
        } catch {
          toast('failed to read code file', 'warn');
        }
      }
      // 6. Any other documents & archives (PDF, ZIP, TAR, DOCX, etc. — vaulted safely)
      else {
        try {
          const dataUrl = await readAsDataURL(f);
          const ext = f.name.split('.').pop()?.toLowerCase();
          actions.addAttachment(target.id, {
            kind: 'file',
            name: f.name,
            dataUrl,
            size: f.size,
            fileExt: ext,
            mimeType: f.type || 'application/octet-stream',
          });
          toast(`${f.name} archived in document vault`);
        } catch {
          toast('failed to read document', 'warn');
        }
      }
    }
  };

  const fronts: ReactNode[] = entries.map((e, i) => (
    <GluedPage
      key={e.id}
      entry={e}
      planet={planet}
      active={Math.abs(i - clamped) <= 1}
      onTagFilter={(t) => { setSearchOpen(true); setQ(t); }}
      onMediaAttach={onMediaAttach}
    />
  ));

  const verso = () => (
    <div className="h-full flex flex-col items-center justify-center gap-3 opacity-70">
      <div className="w-10 h-10 rounded-full border border-line flex items-center justify-center">
        <IcBook size={16} className="text-slate-dim" />
      </div>
      <p className="font-mono text-[9.5px] tracking-[0.3em] uppercase text-slate-dim">verso · {planet.name}</p>
      <p className="font-body text-[11px] italic text-slate-dim/70 max-w-[220px] text-center leading-relaxed">{planet.note}</p>
    </div>
  );

  return (
    <div
      ref={elRef}
      className={`diary-window overlay-in ${focused ? 'focused' : ''}`}
      style={{ '--atmo': planet.palette.atmo, left: 0, top: 0, width: rect.w, height: rect.h, zIndex: focused ? 60 : 40 } as React.CSSProperties}
      onPointerDown={onFocus}
    >
      <div className="win-bar flex items-center gap-3 px-4 h-[46px] border-b border-line/60 shrink-0" onPointerDown={onBarDown}>
        <span className="swatch-orb shrink-0" style={{ background: `radial-gradient(circle at 32% 30%, #fff8, ${planet.palette.atmo})`, boxShadow: `0 0 12px ${planet.palette.atmo}66, inset 0 0 4px rgba(0,0,0,0.5)` }} />
        <div className="min-w-0 shrink">
          <span className="font-display text-[11.5px] font-medium tracking-[0.24em] uppercase text-paper truncate block leading-tight">{planet.name}</span>
          <span className="font-mono text-[7.5px] tracking-[0.22em] uppercase text-slate-dim block leading-tight mt-[2px]">
            personal diary · {entries.length} page{entries.length === 1 ? '' : 's'} · {entries.length} moon{entries.length === 1 ? '' : 's'} in orbit
          </span>
        </div>
        {streak >= 1 && (
          <span className="streak-chip" title={`${streak} day${streak === 1 ? '' : 's'} of writing in a row — the planet remembers`}>
            <span className="streak-spark" />{streak}d
          </span>
        )}
        {planet.meaning && (
          <span className="meaning-chip shrink-0" style={{ color: 'var(--atmo)', borderColor: 'color-mix(in srgb, var(--atmo) 40%, transparent)' }}>
            {MEANING_LABEL[planet.meaning]}
          </span>
        )}
        {climateTotal > 0 && (
          <span
            className="climate-strip"
            title={'mood climate — ' + MOODS.filter((m) => climate[m.id]).map((m) => `${m.label} ${climate[m.id]}`).join(' · ')}
          >
            {MOODS.filter((m) => climate[m.id]).map((m) => (
              <span key={m.id} style={{ width: `${(climate[m.id] / climateTotal) * 100}%`, background: m.color }} />
            ))}
          </span>
        )}
        <div className="flex-1" />
        {searchOpen && (
          <div className="search-pill flex items-center gap-1.5 mr-1">
            <IcSearch size={11} className="text-slate-dim shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder={cosmos ? 'search the cosmos…' : 'search pages…'}
              className="bg-transparent font-mono text-[10px] text-paper w-28 placeholder:text-slate-dim/60 outline-none"
            />
            <button
              onClick={() => setCosmos((v) => !v)}
              className={`shrink-0 ${cosmos ? 'text-teal-ice' : 'text-slate-dim'}`}
              title={cosmos ? 'searching every world' : 'searching this world only'}
            >
              {cosmos ? <IcGlobe size={11} /> : <IcMoon size={11} />}
            </button>
          </div>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => { setDarkSide((v) => !v); setPage(0); }}
            className={`win-icon ${darkSide ? 'active' : ''}`} title={darkSide ? 'return to the light' : 'view the dark side (archived pages)'}>
            <IcMoon size={13} />
          </button>
          <button onClick={() => { setSearchOpen((v) => !v); if (searchOpen) { setQ(''); setCosmos(false); } }}
            className={`win-icon ${searchOpen ? 'active' : ''}`} title="search pages">
            <IcSearch size={13} />
          </button>
          <button onClick={() => void onMic()} className={`win-icon ${recording ? 'recording' : ''}`} title="record a voice memo into this page">
            {recording ? <IcStop size={13} /> : <IcMic size={13} />}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="win-icon"
            title="attach media (video, gif, audio, image) or document/code files (HTML, JS, CSS, JSON, Python, etc.)"
          >
            <IcImage size={13} />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.gif,.mp4,.webm,.mov,.mp3,.wav,.ogg,.m4a,.flac,.html,.htm,.css,.js,.jsx,.ts,.tsx,.json,.md,.py,.sql,.sh,.txt,.pdf,.zip,.tar,.gz,.wasm"
            className="hidden"
            onChange={(e) => { onMediaAttach(e.target.files); e.target.value = ''; }}
          />
          <button onClick={addPage} className="win-icon accent" title="new page — a new moon forms">
            <IcPlus size={13} />
          </button>
          {currentEntry && (
            confirmPageDel ? (
              <button
                onClick={() => { actions.deleteEntry(currentEntry.id); setConfirmPageDel(false); toast('page dissolved — its moon is gone'); }}
                onMouseLeave={() => setConfirmPageDel(false)}
                className="font-mono text-[8px] tracking-[0.16em] uppercase text-red-300 border border-red-400/50 px-2 py-1.5 hover:bg-red-400/10 transition-colors"
                title="confirm delete page"
              >
                sure?
              </button>
            ) : (
              <button onClick={() => { setConfirmPageDel(true); setTimeout(() => setConfirmPageDel(false), 2400); }} className="win-icon danger" title="dissolve this page">
                <IcTrash size={13} />
              </button>
            )
          )}
          <span className="w-px h-5 bg-line/70 mx-1.5" />
          <button onClick={onMinimize} className="win-icon" title="minimize"><IcMin size={13} /></button>
          <button onClick={onMaximize} className={`win-icon ${maximized ? 'active' : ''}`} title={maximized ? 'restore size' : 'maximize'}>
            {maximized ? <IcCompress size={13} /> : <IcExpand size={13} />}
          </button>
          <button onClick={onClose} className="win-icon danger" title="close diary"><IcClose size={13} /></button>
        </div>
      </div>

      {cosmos && q.trim() && (
        <div className="cosmos-panel">
          {cosmosResults.length === 0 && (
            <p className="px-3 py-2 font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim">no memory answers that anywhere</p>
          )}
          {cosmosResults.map((e) => {
            const p = state.bodies.find((b) => b.id === e.planetId);
            if (!p) return null;
            const snippet = e.body.replace(/\n/g, ' ').slice(0, 70);
            const m = moodOf(e.mood);
            return (
              <button
                key={e.id}
                className="cosmos-item"
                onClick={() => { setCosmos(false); setQ(''); onOpenLinked?.(e.planetId); }}
                title={`open ${p.name}'s diary`}
              >
                <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: p.palette.atmo, boxShadow: `0 0 6px ${p.palette.atmo}` }} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[11px] text-paper truncate">{e.title}</span>
                  <span className="block font-mono text-[8px] text-slate-dim truncate">{snippet || '…'}</span>
                </span>
                <span className="font-mono text-[7.5px] tracking-[0.2em] uppercase text-slate-dim shrink-0">{p.name}{m ? ` · ${m.label}` : ''}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 relative overflow-hidden p-3.5 pb-4">
        <div className="book-plate relative w-full h-full">
          <Book
            fronts={fronts}
            verso={verso}
            index={clamped}
            onIndex={setPage}
            emptyText={darkSide ? 'the dark side is empty — archive a page to send it here' : q ? 'no pages answer that search' : 'this world holds no pages yet — press + to form one'}
          />
        </div>
      </div>

      <ConstellationBar planetId={planet.id} onOpen={onOpenLinked} />

      {!maximized && <div className="resize-grip" onPointerDown={onGripDown} />}
    </div>
  );
}
