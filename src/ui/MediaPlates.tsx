import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import type { Attachment } from '../types';
import { sfxTick } from '../audio';
import { toast } from './bits';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  RotateCcw,
  Maximize2,
  Minimize2,
  Repeat,
  Sparkles,
  Film,
  Music,
  Image as ImageIcon,
  FileCode,
  FileText,
  Code2,
  Copy,
  Check,
  Download,
  File as FileIcon,
  FileArchive,
  Eye,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Activity,
  Sliders,
  Radio,
  FastForward,
  Rewind,
  ZoomIn,
  ZoomOut,
  Layers,
  Terminal,
  Cpu,
} from 'lucide-react';

function fmtTime(sec: number): string {
  if (isNaN(sec) || !isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function fmtSMPTE(sec: number): string {
  if (isNaN(sec) || !isFinite(sec) || sec < 0) return '00:00:00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const frames = Math.floor((sec % 1) * 30);
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}:${frames < 10 ? '0' : ''}${frames}`;
}

function synthBars(seedStr: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const v = ((h >>> 0) % 1000) / 1000;
    const env = Math.sin((i / n) * Math.PI) * 0.7 + 0.3;
    out.push(Math.max(0.15, v * env));
  }
  return out;
}

/* =========================================================================
   AUDIO PLAYER PLATE — Holographic Cosmic Audio Console
   ========================================================================= */

export const AudioPlate = memo(function AudioPlate({
  att,
  isGlued,
}: {
  att: Attachment;
  isGlued?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(att.duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(0.85);
  const [eqPreset, setEqPreset] = useState<'Cosmic' | 'Vocal' | 'Bass' | 'Flat'>('Cosmic');
  const [hoverFrac, setHoverFrac] = useState<number | null>(null);

  const peaks = att.peaks && att.peaks.length ? att.peaks : synthBars(att.name + att.id, 48);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMeta = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMeta);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  const handleSeek = (fraction: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const target = fraction * duration;
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const skipSeconds = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + delta));
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) setIsMuted(true);
      else if (isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const toggleLoop = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = !isLooping;
    setIsLooping(!isLooping);
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  };

  const progressFraction = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div className="relative rounded-2xl bg-gradient-to-b from-slate-950/90 via-slate-900/90 to-slate-950/95 border border-cyan-400/30 p-3.5 select-none text-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.12),inset_0_1px_1px_rgba(255,255,255,0.15)] overflow-hidden group font-mono">
      <audio ref={audioRef} src={att.dataUrl} preload="metadata" />

      {/* Holographic Specular Rim & Accent */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Telemetry Bar */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-cyan-500/20 text-[10px]">
        <div className="flex items-center gap-2 truncate min-w-0">
          <div className="p-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.25)] shrink-0">
            <Music size={12} className={isPlaying ? 'animate-pulse text-cyan-300' : ''} />
          </div>
          <div className="truncate min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white tracking-wide text-xs truncate drop-shadow-sm">{att.name}</span>
              <span className="px-1.5 py-0.2 rounded text-[8px] bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 uppercase tracking-widest shrink-0">
                DSP-AUDIO
              </span>
            </div>
            <div className="flex items-center gap-2 text-[8.5px] text-slate-400 mt-0.5">
              <span className="text-cyan-300/80">320kbps · 48kHz</span>
              <span>•</span>
              <span>SMPTE: {fmtSMPTE(currentTime)}</span>
            </div>
          </div>
        </div>

        {/* Live Audio Status / Preset Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              const presets: ('Cosmic' | 'Vocal' | 'Bass' | 'Flat')[] = ['Cosmic', 'Vocal', 'Bass', 'Flat'];
              const next = presets[(presets.indexOf(eqPreset) + 1) % presets.length];
              setEqPreset(next);
              toast(`EQ Mode: ${next}`);
            }}
            className="px-2 py-0.5 rounded-lg bg-white/[0.05] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/30 text-[9px] text-cyan-300 transition-colors flex items-center gap-1 backdrop-blur-sm"
            title="Toggle EQ Harmonic Filter"
          >
            <Sliders size={9} />
            <span>{eqPreset}</span>
          </button>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-400/25 text-[9px] text-cyan-300">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse' : 'bg-slate-500'}`} />
            <span>{isPlaying ? 'ACTIVE' : 'IDLE'}</span>
          </div>
        </div>
      </div>

      {/* Central Visualizer & Waveform Matrix */}
      <div className="my-2.5">
        <div
          className="relative h-14 w-full bg-black/60 rounded-xl border border-cyan-500/25 p-1.5 flex items-center gap-[2px] cursor-pointer overflow-hidden shadow-inner group/wave"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            handleSeek(frac, e);
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoverFrac(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
          }}
          onMouseLeave={() => setHoverFrac(null)}
          title="Click or drag across waveform to seek"
        >
          {/* Subtle Grid Scanning Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d40a_1px,transparent_1px),linear-gradient(to_bottom,#06b6d40a_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />

          {/* Dual Channel VU Meters on left */}
          <div className="flex flex-col justify-between h-full pr-1.5 border-r border-white/10 shrink-0 z-10">
            <span className="text-[7px] text-cyan-400 font-bold">L</span>
            <div className="w-1 flex-1 flex flex-col justify-end gap-[1px] my-0.5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-full h-1 rounded-sm ${
                    isPlaying && Math.random() > i * 0.15
                      ? i < 2 ? 'bg-red-400 shadow-[0_0_4px_#f87171]' : i < 4 ? 'bg-amber-400' : 'bg-cyan-400'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <span className="text-[7px] text-cyan-400 font-bold">R</span>
          </div>

          {/* Waveform Spectral Bars */}
          <div className="flex-1 h-full flex items-center gap-[2px] z-10">
            {peaks.map((p, i) => {
              const barFrac = i / peaks.length;
              const isFilled = barFrac <= progressFraction;
              const isHovered = hoverFrac !== null && barFrac <= hoverFrac;

              // Animated amplitude boost when playing
              const dynamicHeight = isPlaying
                ? Math.min(100, Math.max(18, p * 100 + Math.sin(currentTime * 8 + i * 0.4) * 15))
                : Math.max(18, p * 100);

              return (
                <div key={i} className="flex-1 flex items-center justify-center h-full relative">
                  <div
                    className={`w-full rounded-full transition-all duration-75 ${
                      isFilled
                        ? 'bg-gradient-to-t from-cyan-500 via-cyan-400 to-white shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                        : isHovered
                        ? 'bg-cyan-400/40'
                        : 'bg-slate-700/40 hover:bg-slate-600/60'
                    }`}
                    style={{ height: `${dynamicHeight}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Glowing Playhead Line */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_#fff,0_0_20px_#22d3ee] pointer-events-none z-20 transition-all duration-75"
            style={{ left: `${progressFraction * 100}%` }}
          />

          {/* Hover Seek Ghost Line & Tooltip */}
          {hoverFrac !== null && (
            <div
              className="absolute top-0 bottom-0 w-[1px] bg-amber-400/80 pointer-events-none z-20"
              style={{ left: `${hoverFrac * 100}%` }}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900 border border-amber-400/50 text-[8.5px] font-mono text-amber-300 shadow-md">
                {fmtTime(hoverFrac * duration)}
              </div>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="flex items-center justify-between text-[9px] text-slate-400 px-1 mt-1 font-mono">
          <span className="text-cyan-300 font-semibold">{fmtTime(currentTime)}</span>
          <span className="text-slate-500">BANDWIDTH: 20Hz - 20kHz</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Main Transport & Navigation Controls */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-xs">
        {/* Left: Transport Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => skipSeconds(-5, e)}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Rewind 5s"
          >
            <Rewind size={13} />
          </button>

          {/* Primary Play Button */}
          <button
            onClick={togglePlay}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-lg ${
              isPlaying
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_18px_rgba(6,182,212,0.5)] ring-2 ring-white/40 scale-105'
                : 'bg-white/[0.08] hover:bg-cyan-500/20 text-white border border-white/15 hover:border-cyan-400/50 shadow-[0_0_12px_rgba(0,0,0,0.3)]'
            }`}
            title={isPlaying ? 'Pause playback' : 'Start audio stream'}
          >
            {isPlaying ? <Pause size={15} className="fill-current" /> : <Play size={15} className="fill-current ml-0.5" />}
          </button>

          <button
            onClick={(e) => skipSeconds(5, e)}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Skip forward 5s"
          >
            <FastForward size={13} />
          </button>

          <button
            onClick={toggleLoop}
            className={`p-1.5 rounded-xl border transition-colors ${
              isLooping
                ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : 'bg-white/[0.04] hover:bg-white/[0.1] border-white/10 text-slate-400 hover:text-white'
            }`}
            title={isLooping ? 'Loop mode active' : 'Enable loop mode'}
          >
            <Repeat size={13} />
          </button>

          <button
            onClick={cycleSpeed}
            className="px-2 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 hover:border-cyan-400/30 text-[10px] text-cyan-200 transition-colors font-mono font-semibold"
            title="Adjust playback speed"
          >
            {playbackRate}x
          </button>
        </div>

        {/* Right: Volume Slider & Gain */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${isMuted ? 'text-rose-400' : 'text-slate-300'}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX size={14} /> : volume < 0.5 ? <Volume1 size={14} /> : <Volume2 size={14} />}
          </button>

          <div className="w-16 flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
          <span className="text-[9px] text-slate-400 font-mono w-7 text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
});

/* =========================================================================
   VIDEO PLAYER PLATE — High-Fidelity Holographic Video Theater
   ========================================================================= */

export const VideoPlate = memo(function VideoPlate({
  att,
  isGlued,
}: {
  att: Attachment;
  isGlued?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [aspectMode, setAspectMode] = useState<'contain' | 'cover' | 'cinema'>('contain');
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMeta = () => {
      if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMeta);
    video.addEventListener('ended', onEnded);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMeta);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    if (isPlaying) {
      hideTimerRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 2600);
    }
  }, [isPlaying]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
    resetHideTimer();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = frac * duration;
    setCurrentTime(frac * duration);
  };

  const stepFrame = (frames: number, e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const video = videoRef.current;
    if (!video || !duration) return;
    const fps = 30;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + frames / fps));
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleLoop = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const video = videoRef.current;
    if (!video) return;
    video.loop = !isLooping;
    setIsLooping(!isLooping);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const cont = containerRef.current;
    if (!cont) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      cont.requestFullscreen().catch(() => {});
    }
  };

  const togglePictureInPicture = async (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch {
      toast('PiP unavailable in this browser', 'warn');
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (videoRef.current) videoRef.current.playbackRate = nextSpeed;
  };

  const progressFraction = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl bg-black border border-cyan-400/30 overflow-hidden group select-none shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(6,182,212,0.15)]"
      onMouseMove={resetHideTimer}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Specular Rim Glow */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent pointer-events-none z-30" />

      <video
        ref={videoRef}
        src={att.dataUrl}
        preload="metadata"
        playsInline
        className={`w-full h-auto block max-h-[380px] mx-auto bg-[#02050b] transition-all ${
          aspectMode === 'cover' ? 'object-cover' : 'object-contain'
        }`}
        onClick={togglePlay}
      />

      {/* Big Central Holographic Play Button (when paused) */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-16 h-16 rounded-2xl bg-slate-950/70 backdrop-blur-xl border border-cyan-400/60 text-cyan-300 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all hover:scale-110 active:scale-95 z-20 group/btn"
          title="Play Stream"
        >
          <Play size={28} className="fill-current ml-1 group-hover/btn:text-white transition-colors" />
        </button>
      )}

      {/* Top Telemetry Header Tag */}
      <div className="absolute top-2.5 left-2.5 right-2.5 pointer-events-none flex items-center justify-between z-20">
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 text-[10px] font-mono text-slate-200 shadow-md">
          <Film size={11} className="text-cyan-400" />
          <span className="truncate max-w-[180px] font-medium text-white">{att.name}</span>
          <span className="text-cyan-400/60">·</span>
          <span className="text-cyan-300 text-[9px]">4K H.264/MP4</span>
        </div>

        <div className="flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 text-cyan-300">
          <span>SMPTE {fmtSMPTE(currentTime)}</span>
        </div>
      </div>

      {/* Overlay Video Control Console */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-3 pt-8 flex flex-col gap-2 transition-all duration-200 z-20 ${
          showControls || !isPlaying ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Interactive Progress Scrubber with Buffer Bar */}
        <div
          className="w-full h-2 bg-slate-800/80 hover:h-3 rounded-full cursor-pointer relative transition-all overflow-hidden border border-white/10 group/scrub shadow-inner"
          onClick={handleSeek}
          title="Seek playback position"
        >
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 rounded-full relative shadow-[0_0_10px_rgba(6,182,212,0.7)]"
            style={{ width: `${progressFraction * 100}%` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-slate-100 text-xs font-mono">
          {/* Left: Playback & Timestamps */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-cyan-500/20 text-slate-200 hover:text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={15} className="fill-current text-cyan-300" /> : <Play size={15} className="fill-current ml-0.5" />}
            </button>

            <button
              onClick={(e) => stepFrame(-1, e)}
              className="px-1.5 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.15] text-[9px] text-slate-300 hover:text-white border border-white/10"
              title="Previous Frame (1/30s)"
            >
              -1f
            </button>

            <button
              onClick={(e) => stepFrame(1, e)}
              className="px-1.5 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.15] text-[9px] text-slate-300 hover:text-white border border-white/10"
              title="Next Frame (1/30s)"
            >
              +1f
            </button>

            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={toggleMute}
                className={`p-1 hover:text-white transition-colors ${isMuted ? 'text-rose-400' : 'text-slate-300'}`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <span className="text-[10px] text-slate-300">
                <strong className="text-white font-semibold">{fmtTime(currentTime)}</strong> / {fmtTime(duration)}
              </span>
            </div>
          </div>

          {/* Right: Loop, Rate, PiP, Fullscreen */}
          <div className="flex items-center gap-1.5 text-[9.5px]">
            <button
              onClick={toggleLoop}
              className={`p-1.5 rounded-lg border transition-colors ${
                isLooping
                  ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.1] border-white/10 text-slate-400 hover:text-white'
              }`}
              title={isLooping ? 'Looping enabled' : 'Enable continuous loop'}
            >
              <Repeat size={12} />
            </button>

            <button
              onClick={cycleSpeed}
              className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.15] border border-white/10 text-cyan-200 font-semibold transition-colors"
              title="Playback speed"
            >
              {playbackRate}x
            </button>

            <button
              onClick={togglePictureInPicture}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-colors"
              title="Picture-in-Picture mode"
            >
              <Layers size={13} />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-colors"
              title="Fullscreen view"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

/* =========================================================================
   IMAGE / ANIMATED GIF PLATE — Lens Inspector & Chromatic Frame Control
   ========================================================================= */

export const ImageOrGifPlate = memo(function ImageOrGifPlate({
  att,
  onImageLoad,
}: {
  att: Attachment;
  onImageLoad?: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGifPaused, setIsGifPaused] = useState(false);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const isGif =
    att.isGif ||
    att.name.toLowerCase().endsWith('.gif') ||
    att.dataUrl.startsWith('data:image/gif');

  const toggleGifPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();

    if (!isGif) return;

    if (!isGifPaused) {
      // Pause GIF by freezing current frame to canvas
      const img = imgRef.current;
      const cv = canvasRef.current;
      if (img && cv) {
        cv.width = img.naturalWidth || img.width || 300;
        cv.height = img.naturalHeight || img.height || 200;
        const g = cv.getContext('2d');
        if (g) {
          g.drawImage(img, 0, 0, cv.width, cv.height);
          setIsGifPaused(true);
        }
      }
    } else {
      // Resume animated GIF
      setIsGifPaused(false);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const a = document.createElement('a');
    a.href = att.dataUrl;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast(`Saved ${att.name}`);
  };

  return (
    <div className="relative w-full rounded-2xl bg-slate-950/80 border border-cyan-400/30 overflow-hidden group select-none shadow-[0_12px_36px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.12)]">
      {/* Specular Rim Lighting */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none z-20" />

      {/* Live Image or Frame */}
      <div className="relative overflow-hidden flex items-center justify-center bg-[#030712]">
        <img
          ref={imgRef}
          src={att.dataUrl}
          alt={att.name}
          draggable={false}
          className={`w-full h-auto block select-none transition-transform duration-200 ${
            isGifPaused ? 'hidden' : 'block'
          } ${isZoomed ? 'scale-125 cursor-zoom-out' : 'cursor-zoom-in'}`}
          onClick={() => setIsZoomed(!isZoomed)}
          onLoad={() => {
            if (imgRef.current) {
              setDimensions({
                w: imgRef.current.naturalWidth,
                h: imgRef.current.naturalHeight,
              });
            }
            onImageLoad?.();
          }}
        />

        {/* Frozen Frame Canvas when GIF is paused */}
        <canvas
          ref={canvasRef}
          className={`w-full h-auto select-none ${isGifPaused ? 'block' : 'hidden'}`}
        />
      </div>

      {/* Top Floating Badge & GIF Toggle */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {isGif ? (
            <button
              onClick={toggleGifPlay}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-400/50 text-[9px] font-mono text-cyan-300 shadow-md hover:bg-slate-900 transition-colors"
              title={isGifPaused ? 'Resume GIF stream' : 'Freeze GIF frame'}
            >
              {isGifPaused ? (
                <>
                  <Play size={10} className="fill-current text-amber-300" />
                  <span className="text-amber-300 font-semibold">GIF · FROZEN</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="font-semibold">GIF · PLAYING</span>
                  <Pause size={10} className="fill-current ml-0.5 opacity-70" />
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-[9px] font-mono text-slate-300">
              <ImageIcon size={10} className="text-cyan-400" />
              <span>{dimensions ? `${dimensions.w}×${dimensions.h}` : 'IMAGE'}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white transition-colors"
            title={isZoomed ? 'Reset zoom' : 'Inspect 1.25x lens zoom'}
          >
            {isZoomed ? <ZoomOut size={12} /> : <ZoomIn size={12} />}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Download image artifact"
          >
            <Download size={12} />
          </button>
        </div>
      </div>
    </div>
  );
});

/* =========================================================================
   FILE & CODE STORAGE PLATE — Holographic IDE & Data Vault
   ========================================================================= */

function fmtFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeInfo(name: string, ext?: string) {
  const cleanExt = (ext || name.split('.').pop() || '').toLowerCase();
  switch (cleanExt) {
    case 'html':
    case 'htm':
      return { label: 'HTML5', color: 'text-orange-400 border-orange-500/40 bg-orange-950/30', isCode: true, icon: FileCode };
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return { label: 'CSS3', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30', isCode: true, icon: FileCode };
    case 'js':
    case 'mjs':
    case 'cjs':
      return { label: 'JAVASCRIPT', color: 'text-yellow-400 border-yellow-500/40 bg-yellow-950/30', isCode: true, icon: Code2 };
    case 'ts':
    case 'tsx':
    case 'jsx':
      return { label: cleanExt.toUpperCase(), color: 'text-sky-400 border-sky-500/40 bg-sky-950/30', isCode: true, icon: Code2 };
    case 'json':
      return { label: 'JSON-DATA', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30', isCode: true, icon: FileCode };
    case 'md':
    case 'markdown':
      return { label: 'MARKDOWN', color: 'text-purple-400 border-purple-500/40 bg-purple-950/30', isCode: true, icon: FileText };
    case 'py':
      return { label: 'PYTHON', color: 'text-amber-300 border-amber-500/40 bg-amber-950/30', isCode: true, icon: Code2 };
    case 'sql':
      return { label: 'SQL-QUERY', color: 'text-blue-400 border-blue-500/40 bg-blue-950/30', isCode: true, icon: FileCode };
    case 'sh':
    case 'bash':
    case 'zsh':
      return { label: 'SHELL', color: 'text-green-400 border-green-500/40 bg-green-950/30', isCode: true, icon: Terminal };
    case 'pdf':
      return { label: 'PDF DOC', color: 'text-rose-400 border-rose-500/40 bg-rose-950/30', isCode: false, icon: FileText };
    case 'zip':
    case 'tar':
    case 'gz':
    case '7z':
    case 'rar':
      return { label: 'ARCHIVE', color: 'text-amber-400 border-amber-500/40 bg-amber-950/30', isCode: false, icon: FileArchive };
    default:
      return { label: cleanExt ? cleanExt.toUpperCase() : 'DOCUMENT', color: 'text-cyan-300 border-cyan-400/40 bg-cyan-950/30', isCode: false, icon: FileIcon };
  }
}

export const FileOrCodePlate = memo(function FileOrCodePlate({
  att,
  isGlued,
}: {
  att: Attachment;
  isGlued?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const info = getFileTypeInfo(att.name, att.fileExt);
  const Icon = info.icon;

  const hasCode = Boolean(att.codeSnippet && att.codeSnippet.trim().length > 0);
  const lines = att.codeSnippet ? att.codeSnippet.split('\n') : [];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const content = att.codeSnippet || att.name;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      toast('Copied code to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast('Failed to copy', 'warn');
    });
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    try {
      const a = document.createElement('a');
      a.href = att.dataUrl;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast(`Downloaded ${att.name}`);
    } catch {
      toast('Download failed', 'warn');
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    setExpanded(!expanded);
  };

  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-b from-slate-950/90 via-slate-900/90 to-slate-950/95 border border-cyan-400/30 overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.12)] select-none text-slate-100 font-sans">
      {/* Specular Top Line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 p-3 bg-white/[0.02] border-b border-cyan-500/20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`p-2 rounded-xl border shrink-0 backdrop-blur-md ${info.color}`}>
            <Icon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-mono text-xs font-semibold text-white" title={att.name}>
                {att.name}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[8px] font-mono font-bold tracking-wider uppercase border shrink-0 ${info.color}`}>
                {info.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 font-mono text-[9px] text-slate-400">
              {att.size && <span>{fmtFileSize(att.size)}</span>}
              {att.size && (lines.length > 0 || att.lineCount) && <span>•</span>}
              {(att.lineCount || lines.length > 0) && (
                <span>{att.lineCount || lines.length} lines</span>
              )}
              <span>•</span>
              <span className="text-cyan-300/80 flex items-center gap-1">
                <ShieldCheck size={11} className="text-cyan-400" />
                Protected Vault Asset
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {hasCode && (
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/30 text-slate-300 hover:text-white transition-colors"
              title="Copy code to clipboard"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          )}

          <button
            onClick={handleDownload}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/30 text-slate-300 hover:text-white transition-colors"
            title={`Download ${att.name}`}
          >
            <Download size={13} />
          </button>

          {hasCode && (
            <button
              onClick={toggleExpand}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-[9px] font-mono border border-cyan-400/30 text-cyan-200 transition-colors"
              title={expanded ? 'Collapse preview' : 'View full code'}
            >
              <Eye size={11} className="text-cyan-400" />
              <span>{expanded ? 'HIDE' : 'PREVIEW'}</span>
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* Code Snippet Viewer (Safe Non-Executing Plaintext / Syntax Box) */}
      {hasCode && (
        <div
          className={`border-t border-cyan-500/15 bg-black/70 transition-all duration-200 overflow-hidden ${
            expanded ? 'max-h-[360px] overflow-y-auto' : 'max-h-[100px] overflow-hidden'
          }`}
        >
          <pre className="p-3 font-mono text-[10px] leading-[1.6] text-slate-300 select-text overflow-x-auto">
            {lines.slice(0, expanded ? 400 : 4).map((line, idx) => (
              <div key={idx} className="flex items-start gap-3 hover:bg-white/[0.02] px-1 rounded">
                <span className="select-none text-slate-500 text-right w-6 shrink-0 font-mono text-[9px]">
                  {idx + 1}
                </span>
                <span className="flex-1 whitespace-pre break-all font-mono text-slate-200">
                  {line || ' '}
                </span>
              </div>
            ))}
            {!expanded && lines.length > 4 && (
              <div
                onClick={toggleExpand}
                className="mt-1 pt-1 text-[9px] text-cyan-300 font-mono flex items-center justify-center gap-1 cursor-pointer hover:underline border-t border-white/10"
              >
                <span>+{lines.length - 4} more lines… click PREVIEW to inspect full source</span>
              </div>
            )}
          </pre>
        </div>
      )}

      {/* Non-Code Binary Document Badge */}
      {!hasCode && (
        <div className="p-3 bg-black/40 flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-white/10">
          <span>Encrypted cryptographic payload preserved in vault storage</span>
          <button
            onClick={handleDownload}
            className="text-cyan-300 hover:text-white hover:underline flex items-center gap-1 font-semibold"
          >
            <Download size={11} />
            <span>Download file</span>
          </button>
        </div>
      )}
    </div>
  );
});
