/**
 * Universe & Vault Seed Data Engine
 * Creates initial cosmic bodies, default journal entries, and synthetic vault payloads.
 */

import type { CosmicBody, DiaryEntry, UniverseState, VaultFile } from '../types';
import { BTRFS_DEFAULT_SUBVOLS, initBtrfsSuperblock } from './btrfs';

export const ATLAS_HTML =
  '<!doctype html><html><head><meta charset="utf-8"><title>Anchor Atlas</title><style>body{background:#070b16;color:#cfe0ee;font-family:monospace;padding:2rem}h1{color:#6fc2b4;letter-spacing:.3em}li{margin:.4rem 0}</style></head><body><h1>ANCHOR ATLAS</h1><ul><li>Anchor Star — core, 6.0 R</li><li>Aurelia — memory, 4 moons</li><li>Eventide — the vault</li></ul></body></html>';

export const SCOPE_HTML =
  '<!doctype html><html><head><meta charset="utf-8"><title>Signal Scope</title><style>html,body{margin:0;height:100%;background:#04060c;overflow:hidden}canvas{display:block;width:100%;height:100%}#n{position:fixed;top:12px;left:14px;color:#6fc2b4;font:11px monospace;letter-spacing:.2em}</style></head><body><div id="n">SIGNAL SCOPE — live</div><canvas id="c"></canvas><script>var c=document.getElementById("c"),x=c.getContext("2d");function R(){c.width=innerWidth;c.height=innerHeight}addEventListener("resize",R);R();var t=0;(function d(){t+=.02;x.fillStyle="rgba(4,6,12,.16)";x.fillRect(0,0,c.width,c.height);for(var i=0;i<3;i++){x.beginPath();x.strokeStyle=i?"rgba(242,193,120,.5)":"rgba(111,194,180,.7)";for(var p=0;p<c.width;p+=4){var y=c.height/2+Math.sin(p*.012+t*(1+i*.5)+i*2)*c.height*.18*Math.sin(t*.7+i);p?x.lineTo(p,y):x.moveTo(p,y)}x.stroke()}requestAnimationFrame(d)})()</script></body></html>';

export const THEME_CSS =
  '/* eventide theme — edit me and watch the preview */\n:root {\n  --void: #04060c;\n  --panel: #0b101d;\n  --teal: #6fc2b4;\n  --solar: #f2c178;\n  --paper: #e9ecf1;\n}\n\nbody {\n  margin: 0;\n  background: var(--void);\n  color: var(--paper);\n  font-family: monospace;\n}\n\n.card {\n  background: var(--panel);\n  border: 1px solid var(--teal);\n  padding: 1.5rem;\n  letter-spacing: 0.2em;\n  text-transform: uppercase;\n}\n\n.accent { color: var(--solar); }';

export function synthWavDataUrl(): string {
  const sr = 22050;
  const secs = 1.4;
  const n = Math.floor(sr * secs);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  ws(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  ws(8, 'WAVE');
  ws(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ws(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, t * 9) * Math.exp(-t * 2.1);
    const smp =
      (Math.sin(2 * Math.PI * 294 * t) * 0.6 + Math.sin(2 * Math.PI * 441 * t) * 0.2) * env;
    v.setInt16(44 + i * 2, Math.max(-32000, Math.min(32000, smp * 26000)), true);
  }
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return 'data:audio/wav;base64,' + btoa(bin);
}

export function synthCsv(): string {
  let csv = 'node_id,ra_deg,dec_deg,dist_mly,cluster_mass\n';
  for (let i = 0; i < 180; i++) {
    csv += `${i},${(Math.sin(i * 7.3) * 180 + 180).toFixed(4)},${(Math.cos(i * 3.1) * 90).toFixed(4)},${((i * 51.7) % 9000).toFixed(1)},${(1e12 + ((i * 3.7e13) % 1e15)).toExponential(3)}\n`;
  }
  return csv;
}

export function seedBodies(now: number, day: number): CosmicBody[] {
  const TAU = Math.PI * 2;
  return [
    {
      id: 'anchor',
      name: 'ANCHOR STAR',
      kind: 'star',
      meaning: null,
      note: 'The stabilizing core of this universe. Double-click to enter Core Mode.',
      createdAt: now - 980 * day,
      radius: 6,
      palette: {
        deep: '#5a2a08',
        base: '#ffb54d',
        high: '#fff3d9',
        atmo: '#ffd9a0',
        ice: '#ffffff',
      },
      orbit: { a: 0, speed: 0, phase: 0, incl: 0 },
    },
    {
      id: 'cinder',
      name: 'Cinder',
      kind: 'planet',
      meaning: 'moment',
      note: 'Small, fast, scorched close to the light. A moment that burned bright and brief.',
      createdAt: now - 940 * day,
      radius: 1.15,
      palette: {
        deep: '#1c1512',
        base: '#6e5a4c',
        high: '#b39a83',
        atmo: '#8a7462',
        ice: '#d8cfc4',
      },
      orbit: { a: 26, speed: TAU / 88, phase: 0.8, incl: 0.12 },
    },
    {
      id: 'veil',
      name: 'Veil',
      kind: 'planet',
      meaning: 'dream',
      note: 'Under a permanent shroud of cloud. Where dreams stay unverified.',
      createdAt: now - 860 * day,
      radius: 1.9,
      clouds: true,
      palette: {
        deep: '#2a1f14',
        base: '#c9a86a',
        high: '#efd9a8',
        atmo: '#e8cf9e',
        ice: '#fff2d8',
      },
      orbit: { a: 38, speed: TAU / 224, phase: 2.4, incl: 0.05 },
    },
    {
      id: 'aurelia',
      name: 'Aurelia',
      kind: 'planet',
      meaning: 'memory',
      note: 'The inhabited one. Oceans, weather, city light on the dark side.',
      createdAt: now - 800 * day,
      radius: 2.05,
      clouds: true,
      nightside: true,
      palette: {
        deep: '#0b2d4d',
        base: '#1f6e52',
        high: '#9db88a',
        atmo: '#7fc4e8',
        ice: '#eef6ff',
      },
      orbit: { a: 52, speed: TAU / 365, phase: 4.2, incl: 0.0 },
    },
    {
      id: 'rust',
      name: 'Rust',
      kind: 'planet',
      meaning: 'project',
      note: 'Half-finished terrain, dust storms, old machinery. Projects live here.',
      createdAt: now - 640 * day,
      radius: 1.5,
      palette: {
        deep: '#2b120c',
        base: '#a34b2a',
        high: '#d98d5f',
        atmo: '#d9a184',
        ice: '#f0d9c8',
      },
      orbit: { a: 68, speed: TAU / 687, phase: 1.1, incl: 0.09 },
    },
    {
      id: 'goliath',
      name: 'Goliath',
      kind: 'planet',
      meaning: 'chapter',
      note: 'A gas giant with a ring system and three moons. A whole chapter of life.',
      createdAt: now - 520 * day,
      radius: 4.3,
      rings: true,
      clouds: true,
      palette: {
        deep: '#241a12',
        base: '#b08d5f',
        high: '#e8d3a8',
        atmo: '#e0c493',
        ice: '#f5ead0',
      },
      orbit: { a: 100, speed: TAU / 1600, phase: 5.4, incl: 0.04 },
    },
    {
      id: 'mirror',
      name: 'Mirror',
      kind: 'planet',
      meaning: 'person',
      note: 'Ice world, almost perfectly reflective. Someone I keep returning to.',
      createdAt: now - 330 * day,
      radius: 1.75,
      palette: {
        deep: '#10222e',
        base: '#4f7f96',
        high: '#bcd9e6',
        atmo: '#a8d8ea',
        ice: '#f2fbff',
      },
      orbit: { a: 132, speed: TAU / 2600, phase: 3.0, incl: 0.14 },
    },
    {
      id: 'hollow',
      name: 'Hollow',
      kind: 'dwarf',
      meaning: 'idea',
      note: 'A small dwarf world, mostly unexplored. An idea waiting for a landing.',
      createdAt: now - 150 * day,
      radius: 0.8,
      palette: {
        deep: '#191d24',
        base: '#5c6672',
        high: '#9aa7b4',
        atmo: '#7d8b99',
        ice: '#dfe6ec',
      },
      orbit: { a: 160, speed: TAU / 3800, phase: 0.2, incl: 0.22 },
    },
    {
      id: 'wisp',
      name: 'Wisp Nebula',
      kind: 'nebula',
      meaning: 'idea',
      note: 'A stellar nursery at the system edge. Ideas condense here before they become planets.',
      createdAt: now - 420 * day,
      radius: 7,
      palette: {
        deep: '#0a2a2c',
        base: '#2f8f83',
        high: '#9fe8d8',
        atmo: '#6fc2b4',
        ice: '#e8fff8',
      },
      orbit: { a: 205, speed: TAU / 9000, phase: 2.0, incl: 0.3 },
    },
    {
      id: 'eventide',
      name: 'Eventide',
      kind: 'vault',
      meaning: null,
      note: 'A quiet black hole. The single storage and execution object of the universe — all digital matter lives here.',
      createdAt: now - 900 * day,
      radius: 2.6,
      palette: {
        deep: '#000000',
        base: '#14100c',
        high: '#3a2c1c',
        atmo: '#6fc2b4',
        ice: '#ffffff',
      },
      orbit: { a: 250, speed: TAU / 12000, phase: 4.6, incl: -0.18 },
    },
  ];
}

export function seedEntries(
  now: number,
  day: number,
  newIdFn: () => string
): DiaryEntry[] {
  const mk = (
    planetId: string,
    title: string,
    body: string,
    tags: string[],
    ageDays: number,
    mood?: DiaryEntry['mood'],
    weather?: DiaryEntry['weather'],
    bookmarked = false
  ): DiaryEntry => ({
    id: newIdFn(),
    planetId,
    title,
    body,
    tags,
    bookmarked,
    archived: false,
    mood,
    weather,
    createdAt: now - ageDays * day,
    updatedAt: now - ageDays * day + 3600000,
    attachments: [],
  });

  return [
    mk(
      'aurelia',
      'First light on the water',
      'I named this planet on a Tuesday. The oceans came first — I wrote the shoreline before I knew what the memory actually was.\n\nThings to keep: the color of 6am, the train ticket, her exact wording.',
      ['origin', 'sea'],
      780,
      undefined,
      undefined,
      true
    ),
    mk(
      'aurelia',
      'Weather report, interior',
      'Rained all day inside this memory. That is allowed — planets have weather, memories do too.',
      ['weather', 'walking'],
      610
    ),
    mk(
      'aurelia',
      'The city on the dark side',
      'There is a city on Aurelia’s night side that only exists as light. I keep adding windows.',
      ['city', '2019'],
      300,
      undefined,
      undefined,
      true
    ),
    mk(
      'veil',
      'A dream about staircases',
      'The staircase kept arriving before the building. Marble, then water, then just the idea of ascent.',
      ['dream', 'stairs'],
      500
    ),
    mk(
      'veil',
      'Second dream ledger',
      'Flying low over an ocean made of glass. Below it, another sky.',
      ['dream'],
      220
    ),
    mk(
      'rust',
      'Project: cartography engine',
      'Day 41. The contour generator finally stops lying about coastlines.',
      ['code', 'maps'],
      400,
      undefined,
      undefined,
      true
    ),
    mk(
      'rust',
      'Project: cartography engine — II',
      'Shipped the contour fix. The dust storm season on this planet is just me refusing to close tabs.',
      ['code', 'maps'],
      120
    ),
    mk(
      'goliath',
      'Chapter nine: the ring system',
      'Every ring particle is a day. I counted for a while and stopped — that is the whole chapter.',
      ['writing', 'chapter'],
      460,
      undefined,
      undefined,
      true
    ),
    mk(
      'mirror',
      'About M.',
      'Mirror reflects exactly what you bring to it. I brought a person.',
      ['person', 'm.'],
      260,
      undefined,
      undefined,
      true
    ),
    mk(
      'hollow',
      'Idea: gravity as attention',
      'What you attend to gains mass. What gains mass bends the paths of everything near it.',
      ['theory', 'seed'],
      140
    ),
    mk(
      'cinder',
      'The afternoon that burned',
      'Some moments are short period, high temperature, forever close to the light.',
      ['moment'],
      700
    ),
    mk(
      'aurelia',
      'Recent: the archive decision',
      'Archived the 2018 pages today. A planet can keep its night side. That is not loss, that is rotation.',
      ['archive', 'decision'],
      26
    ),
  ];
}

export function seedVault(
  now: number,
  day: number,
  newIdFn: () => string
): VaultFile[] {
  const mk = (
    name: string,
    folder: string,
    kind: VaultFile['kind'],
    mime: string,
    size: number,
    ageDays: number,
    content?: string,
    sealed?: boolean
  ): VaultFile => ({
    id: newIdFn(),
    name,
    folder,
    kind,
    mime,
    size,
    addedAt: now - ageDays * day,
    content,
    sealed,
    realityId: 'sol-prime',
  });

  return [
    mk(
      'field-notes.md',
      '/documents',
      'document',
      'text/markdown',
      4820,
      380,
      '# Field notes\n\nCollected across all planets.\n\n## Aurelia\n- Shoreline color: #1f6e52\n- Night city window count: 412\n'
    ),
    mk(
      'universe-manifest.json',
      '/documents',
      'document',
      'application/json',
      1240,
      800,
      '{\n  "anchor": "star",\n  "bodies": 10,\n  "law": "attention is gravity"\n}'
    ),
    mk('anchor-atlas.html', '/documents', 'document', 'text/html', 2860, 210, ATLAS_HTML),
    mk('signal-scope.html', '/documents', 'document', 'text/html', 1900, 60, SCOPE_HTML),
    mk('eventide-theme.css', '/projects', 'document', 'text/css', 640, 40, THEME_CSS),
    mk(
      'expedition-log.md',
      '/documents/research',
      'document',
      'text/markdown',
      3110,
      95,
      '# Expedition log\n\nApproach vector stable.\nEventide accretion: teal-gold.\nNote: the horizon keeps its own time.'
    ),
    mk(
      'reconstruction-of-the-village.md',
      '/documents/logs',
      'document',
      'text/markdown',
      4250,
      14,
      '# Two Weeks Later: Reconstruction of the Village\n\n**Timestamp:** Stardate +14 Days Post-Singularity  \n**Location:** Eventide Outpost / Sector Sol-Prime  \n\nTwo weeks have passed since the reality drift destroyed the outer perimeter of the village. The initial shock waves collapsed the old data structures, but the community gathered at the central black hole horizon to begin rebuild efforts.\n\n## Milestones Achieved\n1. **Structural Foundations**: Rebuilt 14 solar-shielded living modules around the accretion ring.\n2. **FileSystem Restoration**: Upgraded storage architecture to high-performance native Origin Private File System (OPFS) with IndexedDB fallback.\n3. **Quantum Encryption**: Re-established isolated vault seals across all parallel realities.\n4. **Communal Harmony**: The central pulse engine is back online at 99.8% stability.\n\n*“From the ashes of collapsed data, we forge enduring structures.”*'
    ),
    mk('aurora-timelapse.mp4', '/media', 'video', 'video/mp4', 84_300_000, 240, undefined, true),
    {
      ...mk('voice-memo-idea-41.wav', '/media', 'audio', 'audio/wav', 114_000, 140),
      content: synthWavDataUrl(),
    },
    mk('starfield-raw.fits', '/datasets', 'dataset', 'application/fits', 512_000_000, 500, undefined, true),
    {
      ...mk('cosmic-web-nodes.csv', '/datasets', 'dataset', 'text/csv', 6100, 310),
      content: synthCsv(),
    },
    mk('orbital-mechanics.iso', '/iso', 'iso', 'application/x-iso9660-image', 1_460_000_000, 420, undefined, true),
    mk('terraformer.exe', '/applications', 'exe', 'application/x-msdownload', 88_400_000, 350, undefined, true),
    mk('atmosphere-synth.app', '/applications', 'application', 'application/octet-stream', 214_000_000, 60, undefined, true),
    mk('deepfield-archive.zip', '/archives', 'archive', 'application/zip', 2_340_000_000, 190, undefined, true),
    mk('gravity-garden.exe', '/games', 'game', 'application/x-msdownload', 1_930_000_000, 90, undefined, true),
    mk('ring-particle-sim.app', '/projects/ring-sim', 'application', 'application/octet-stream', 96_500_000, 30, undefined, true),
  ];
}

export function createInitialSeed(newIdFn: () => string): UniverseState {
  const now = Date.now();
  const day = 86400000;
  const bodies = seedBodies(now, day);
  const entries = seedEntries(now, day, newIdFn);
  const conn = (a: string, b: string, ageDays: number) => ({
    id: newIdFn(),
    a,
    b,
    createdAt: now - ageDays * day,
  });

  return {
    activeRealityId: 'sol-prime',
    bodies,
    entries,
    connections: [
      conn('aurelia', 'mirror', 250),
      conn('aurelia', 'rust', 390),
      conn('veil', 'hollow', 130),
      conn('goliath', 'aurelia', 440),
      conn('cinder', 'veil', 500),
      conn('rust', 'hollow', 60),
    ],
    vault: seedVault(now, day, newIdFn),
    vaultFolders: [
      '/documents',
      '/documents/research',
      '/documents/logs',
      '/media',
      '/datasets',
      '/applications',
      '/games',
      '/archives',
      '/iso',
      '/projects',
      '/projects/ring-sim',
    ],
    vaultTrash: [],
    vaultUsers: [],
    secrets: null,
    audit: [],
    visitedAt: now,
    btrfsSubvolumes: BTRFS_DEFAULT_SUBVOLS,
    btrfsSnapshots: [
      {
        id: 'snap-genesis',
        name: '@snapshot-genesis-core',
        subvolId: 'subvol-root',
        generation: 140,
        createdAt: now - 30 * day,
        fileCount: 16,
        totalBytes: 7195438530,
        filesSnapshot: seedVault(now, day, newIdFn),
        foldersSnapshot: [
          '/documents',
          '/documents/research',
          '/media',
          '/datasets',
          '/applications',
          '/games',
          '/archives',
          '/iso',
          '/projects',
          '/projects/ring-sim',
        ],
        readOnly: true,
        description: 'System initialization baseline snapshot (@root)',
      },
    ],
    btrfsSuperblock: initBtrfsSuperblock(),
    activeSubvolId: 'subvol-root',
  };
}
