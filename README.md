(sarthaksarma7@gmail.com ---- for contact)

# MY UNIVERSE — a personal cosmos

A personal infinite-scale cosmic environment. Not a website that looks like
space — a real-time universe that happens to be a website. One continuous
Three.js scene spans eleven nested cosmological scales, from a single
star system you can stand on up to a multiverse of parallel bubble
universes — and every object in it is a piece of your life: planets are
thoughts, moons are diary pages, a black hole is your file vault.

This README is a **full reconstruction spec**. It contains enough detail —
architecture, data model, scales, algorithms, constants, shaders, file map,
and interaction grammar — for an AI (or a human) to regenerate this project
faithfully, **including its current visual state** (see
[§ Current visual state](#current-visual-state--intentional-deviations) for
intentional deviations from earlier versions).

---

## 1. Tech stack (exact)

| Layer | Choice |
|---|---|
| Build | Vite 6 + `@vitejs/plugin-react`, TypeScript 5 (`tsc --noEmit` as lint), Tailwind CSS 4 via `@tailwindcss/vite` |
| Runtime | React 18, react-router-dom 6 |
| 3D | three 0.185 (+ `@types/three` 0.185), raw `three/examples/jsm` postprocessing (`EffectComposer`, `UnrealBloomPass`, `ShaderPass`, `OutputPass`) — **no react-three-fiber** |
| Storage | localStorage (main state) + IndexedDB (large vault payloads), `@supabase/supabase-js` dependency present but storage is browser-local |
| Utils | uuid 9, date-fns, framer-motion 11, lucide-react, recharts, dnd-kit (core/sortable/util), canvas-confetti, jspdf 4 + html-to-image (diary PDF export) |

```bash
npm install
npm run dev       # vite dev server (project convention: port 3000, host 127.0.0.1)
npm run build     # production build → dist/
npm run typecheck # tsc --noEmit
```

Dev-server convention: `vite --host 127.0.0.1 --port 3000`, log appended to
`dev_server.log` in the project root.

---

## 2. The concept (what this thing is)

- The **Anchor Star** is the core of your personal universe — double-click it
  to enter **Core Mode**, inspect every world you've formed, and drag the
  timeline to rewind the universe itself.
- **Planets are thoughts.** Every world carries a *meaning* — `memory`,
  `dream`, `person`, `project`, `moment`, `idea`, `chapter`, `unresolved`.
  Its **moons are its diary pages**: one moon generated per diary page, live.
- Double-click a world and space bends — a gravitational **portal** forms
  (a post-processing distortion pass) and pulls you into that world's
  **physical diary**: pages you turn like paper, windows that behave like
  matter, voice memos you can record, moods and weather each memory carries.
- The **Universal Vault** (a black-hole-class object, the "Eventide Black
  Hole") is the single place your actual digital matter lives — files, apps,
  games, ISOs — behind a master-key identity system with a sealed Key Ring
  (AES-256-GCM payloads, PBKDF2-SHA256 @ 310,000 rounds). The vault simulates
  a **Btrfs filesystem**: subvolumes, CoW reflink clones, snapshots,
  scrub reports, a superblock, checksums (crc32c/sha256/xxhash64), zstd-style
  compression accounting, and an in-vault terminal.
- Zoom out forever: stellar system → star-forming region → spiral arm →
  galactic region → galaxy → galaxy cluster/group → supercluster →
  supercluster complex → cosmic web → reality/universe → multiverse.
- **Nine authored parallel realities** (plus user-created ones) orbit a
  Sovereign Multiverse Core inside a 960,000-unit hypersphere boundary, each
  with its own seeded galaxy clusters and a full 11-level cosmic lineage.

**Design principles.** The universe is the interface — no dashboards, no
permanent panels. UI appears only when you interact; it fades when you don't
(idle chrome fade). Everything persists to the browser; the Key Ring is
encrypted per master key and can never be reset — rotate it while you still
know it.

---

## 3. File map (what every file does)

```
index.html               single-page shell, canvas host
vite.config.js           react + tailwind plugins, dev server config
src/
  main.tsx               React root
  App.tsx (~760 ln)      orchestrator: engine lifecycle, keyboard, modes
                         ('space' | 'core' | 'vault' | 'diary' | 'vault-guest'),
                         diary windows as free-floating WinRects, portal
                         callbacks, idle chrome fade, MultiverseBar wiring
  state.ts  (~780 ln)    the store: useSyncExternalStore + actions dispatcher,
                         localStorage persistence under key 'my-universe:v4',
                         re-exports everything from ./storage
  types.ts               the entire shared model (see §5)
  audio.ts               procedural WebAudio: ambient drone per mode
                         (space/diary/vault/core), interaction chimes,
                         MediaRecorder voice-memo capture, mute flag in
                         localStorage 'my-universe:muted'
  db.ts                  IndexedDB open/get/put helpers for big payloads
  engine/
    engine.ts (~2930 ln) the universe: renderer/scene, body factory,
                         sky & backdrop, anchor star, asteroid belt, LOD
                         level groups, multiverse, meteors, walkable surface,
                         portal state machine, Core Mode connection lines,
                         frame tick, hover/pick
    cameraRig.ts         the advanced camera: damped orbit / inertial pan /
                         log-zoom rig (see §7.1)
    shaders.ts (~1390 ln) every GLSL program (see §7)
  physics/
    physicsEngine.ts     real astrophysics from body metadata (see §9)
  realities/
    index.ts             RAW_REALITIES registry + buildRealityConfig +
                         computeAllRealities + createNewRealityConfig
    types.ts             RealityConfig, RealityInput
    hierarchyTypes.ts    CosmicAddress, CosmicLineage (11 nested levels),
                         GalaxyClusterData
    clusterGenerator.ts  seeded cluster/galaxy/region/arm/nebula templates
                         per reality (deterministic lineage text)
    solPrime/            REALITY-01 // SIG-Alpha — 'Sol-Prime Continuum'
                         (G2V Main Sequence). Home reality: ANCHOR STAR +
                         Cinder, Veil, Aurelia, Rust, Goliath, Mirror,
                         Hollow, Wisp Nebula + Eventide black hole vault
    hyperionLumina/      REALITY-02 — 'Hyperion Lumina Realm' (blue
                         hypergiant; Azurea Prime…)
    ignisEmber/          REALITY-03 // SIG-Gamma — 'Ignis Ember Realm'
                         (M-class red dwarf binary, magma worlds)
    kardashevMatrix/     REALITY-04 // SIG-Delta — 'Kardashev Dyson Matrix'
                         (Dyson-swarm star, Ringworld Prime, Quantum Lattice)
    vesperaTwilight/     REALITY-05 — 'Vespera Twilight Realm'
    singularityRift/     REALITY-06 // SIG-Zeta — 'Singularity Rift Domain'
                         (Kerr black hole, GARGANTUA RIFT, time-dilated worlds)
    biolumePrimordial/   REALITY-07 // SIG-Eta — 'Biolume Primordial Realm'
                         (emerald F-class star, glowing ocean biomes)
    chronosParadox/      REALITY-08 — 'Chronos Paradox Realm'
    parallels/           4 extra 'parallel' realities: Aetheria Cloud
                         Matrix, Nebulus Veil Void, Astral Nexus Web,
                         Solaria Radiant… (each with bodies + starter diary
                         entries)
  storage/
    index.ts / filesystem.ts / btrfs.ts / crypto.ts / indexedDB.ts /
    procedural.ts / formatters.ts / metrics.ts / seeds.ts
                         crypto: PBKDF2 (KDF_TARGET_ROUNDS = 310000; legacy
                         90k/120k supported), AES-GCM-256, verifiers, SHA-256.
                         btrfs: superblock init, subvolume defaults (@root,
                         @realities, @snapshots, @home), snapshots, scrub,
                         checksums. seeds.ts: the initial universe seed —
                         bodies, diary entries, seeded vault files (~535 ln).
  ui/
    CoreMode.tsx (~740 ln)    Anchor Star core overlay + universe timeline
                              scrubber (TimelineEvent stream)
    DiaryWindow.tsx (~1810 ln) physical diary windows: draggable WinRects,
                              moods (calm/warm/bright/heavy/burning), weather
                              (clear/rain/storm/fog/dust), free-floating or
                              'glued' attachment plates, voice memos
    Book.tsx                  wave page-turn mechanics (paper physics)
    MediaPlates.tsx (~1100 ln) image/audio/video/file/code plates, photo
                              grading tones (noir/warm/fade), tilt
    VaultUI.tsx (~4530 ln)    the vault OS: file grid + folders, identity
                              users, Key Ring (password records), integrity
                              scanners, VaultTerminal (shell + deep scan),
                              download synthesis, crop modal, avatar picker,
                              Btrfs manager UI (snapshots/scrub/subvolumes)
    VaultBtrfsManager.tsx     subvolume/snapshot/scrub dashboard
    PhysicsHUD.tsx            live astrophysics readout per body (Kepler
                              orbit, gravity, escape velocity, photon sphere…)
    exportDiary.ts            diary → PDF (jspdf + html-to-image)
    bits.tsx                  useUniverse store hook, toast host, inline
                              icon set, ErrorBoundary
  components/
    MultiverseBar.tsx    top multiverse chrome: CORE pill, reality name +
                         barrier status, SCALE ladder (11 buttons), core
                         stabilizer controls, zoom in/out
    CosmicWebHUD.tsx     web-scale settings panel
    CosmicLineageModal.tsx  full 11-level lineage browser per cluster
    RealityHoverCard.tsx / ClusterHoverCard.tsx / CreateRealityModal.tsx /
    EditRealityModal.tsx
```

There is also a **`RESTORE.md`** disaster-recovery map in the repo root.

---

## 4. Runtime boot sequence

1. `App.tsx` mounts → constructs `UniverseEngine(canvas, bodies, callbacks)`
   once (engine also exposed as `window.__ENGINE__` for debugging).
2. Constructor order: renderer setup → `buildSky()` → `buildBackdrop()` →
   `buildAnchor()` → one `buildBody()` per CosmicBody → `buildBelt()` →
   `buildLevels()` (neighborhood/galaxy/cluster/supercluster/web groups) →
   `buildMultiverse()` → `buildMeteors()` → `buildSurface()` → connection
   lines → `EffectComposer` (RenderPass → UnrealBloomPass(0.12 strength,
   0.15 radius, 0.90 threshold) → portal ShaderPass → OutputPass).
3. Renderer constants: pixel ratio `min(devicePixelRatio, 1.35)` (composer
   1.5), `SRGBColorSpace`, `ACESFilmicToneMapping` exposure 1.0, clear color
   `#04060c`. Camera: fov 50, near 0.1, **far 8,000,000**.
4. `setRendering(false)` while the Vault glass scene covers the screen
   (perf guard).
5. Audio initializes on first pointerdown anywhere (browser autoplay rule).

---

## 5. Data model (`src/types.ts`) — verbatim shape

```ts
type BodyKind = 'star' | 'planet' | 'dwarf' | 'nebula' | 'hole' | 'vault';
type Meaning  = 'memory' | 'dream' | 'person' | 'project' | 'moment'
              | 'idea' | 'chapter' | 'unresolved' | null;
// each meaning has a label, a one-line poetic description, and a color
// (memory #7fc4e8, dream #b49ae8, person #f2a0b0, project #f2c178,
//  moment #e0785a, idea #9fd8a8, chapter #d8b48a, unresolved #8b93a8)

interface Palette { deep: string; base: string; high: string; atmo: string; ice: string; }
interface Orbit   { a: number; speed: number; phase: number; incl: number; } // a in world units, speed rad/ms-ish (TAU/periodDays)

interface CosmicBody {
  id; name; kind: BodyKind; meaning; note; createdAt; radius;
  rings?: boolean; clouds?: boolean; nightside?: boolean;
  palette: Palette; orbit: Orbit;
}

interface Connection { id; a; b; createdAt; }   // Core Mode links between worlds

type Mood    = 'calm' | 'warm' | 'bright' | 'heavy' | 'burning';
type Weather = 'clear' | 'rain' | 'storm' | 'fog' | 'dust';

interface Attachment {
  id; kind: 'image'|'audio'|'video'|'file'|'code'; name; dataUrl;
  isGif?; peaks?; duration?; size?; fileExt?; codeSnippet?; lineCount?; mimeType?;
  x?; y?; w?; h?;          // free-form placement (% width / px down)
  tone?: ''|'noir'|'warm'|'fade'; tilt?: boolean; glued?: boolean;
}

interface DiaryEntry { id; planetId; title; body; tags[]; bookmarked; archived;
                       mood?; weather?; createdAt; updatedAt; attachments[]; }

type VaultKind = 'document'|'image'|'audio'|'video'|'dataset'|'archive'
               |'iso'|'exe'|'application'|'game'|'other';

interface VaultFile {
  id; name; folder /* absolute path e.g. "/documents/research" */; kind; mime;
  size; addedAt;
  content?;        // inline payload when the browser can hold it
  payloadRef?;     // large payload → IndexedDB key
  thumb?; sealed?; // sealed = payload lives in the execution layer only
  lock?;           // per-object password (plaintext never stored)
  versions?: FileVersion[]; realityId?;
  // Btrfs extensions:
  subvol?; csum?; csumAlgorithm?: 'crc32c'|'sha256'|'xxhash64';
  generation?; isReflink?; sourceFileId?;
  compression?: 'zstd'|'lzo'|'none'; compressedSize?;
}

interface VaultUser { id; name; avatar; avatarFrames?; avatarFps?; avatarFit?;
                      avatarNote?; createdAt; lastSeen; salt; verifier;
                      kdfRounds?; }
interface PasswordRecord { id; label; user; secret; category?; notes?; updatedAt; }
interface VaultSecrets { salt; iv; data; rounds?; }   // AES-GCM sealed Key Ring
interface AuditEntry  { t; msg; }

interface UniverseState {
  activeRealityId?; customRealityDescriptions?; customRealities?;
  deletedRealityIds?;
  bodies: CosmicBody[]; entries: DiaryEntry[]; connections: Connection[];
  vault: VaultFile[]; vaultFolders: string[]; vaultTrash: TrashedFile[];
  vaultUsers: VaultUser[]; secrets: VaultSecrets | null; audit: AuditEntry[];
  visitedAt: number; version?;      // migration marker
  btrfsSubvolumes?; btrfsSnapshots?; btrfsScrub?; btrfsSuperblock?;
  activeSubvolId?;
}
interface TimelineEvent { t; label; kind: 'body'|'entry'|'link'|'vault'; refId; }
```

Btrfs simulation types mirror the real filesystem: `BtrfsSubvolume`
(rootId 5 for `@root`, 256+ for user subvolumes, generation = CoW transaction
id), `BtrfsSnapshot` (full `filesSnapshot` + `foldersSnapshot`, readOnly),
`BtrfsScrubReport` (status clean/repaired/corrupted/running/idle + log),
`BtrfsSuperblock` (uuid, label, sectorSize, nodeSize, compression + level,
CoW reflink count, space-savings bytes).

---

## 6. Realities & the multiverse

### 6.1 Registry & placement

`RAW_REALITIES` = 8 authored realities (solPrime, hyperionLumina,
ignisEmber, kardashevMatrix, vesperaTwilight, singularityRift,
biolumePrimordial, chronosParadox) + 4 `parallelRealities` (Aetheria Cloud
Matrix, Nebulus Veil Void, Astral Nexus Web, Solaria Radiant…). Users can
create more (`createNewRealityConfig`) and delete any (soft delete via
`deletedRealityIds`).

`buildRealityConfig(r, i, total)` lays bubbles on a **3D golden spiral**:
golden angle `π(3−√5) ≈ 2.399963`, vertical spread `yNorm ∈ [−1,1]`,
orbital radius `R = 540000 + (i % 6) * 42000`, y = `yNorm * 360000` —
comfortably inside the **960,000-unit Multiverse Hypersphere**. Every bubble
is `bubbleSize = 24000`.

Every reality is normalized to contain exactly:
- one body with `id: 'anchor'`, `kind: 'star'` (the Anchor Star), and
- one `kind: 'vault'` black hole (an "Eventide Black Hole") — auto-created
  if missing, duplicates filtered.

`generateClustersForReality(realityId, …)` produces seeded
`GalaxyClusterData` — each cluster carries a full `CosmicLineage` (multiverse
→ reality → cosmic web → supercluster complex → supercluster → galaxy
cluster/group → galaxy → galactic region → spiral arm → star-forming region
→ stellar system) built from deterministic per-reality text templates
(e.g. sol-prime home: "Local Galaxy Group (Home)", GRP-LOCAL-01, 84 galaxies,
9.8 Mly, "Milky Way / The Milliandra Spiral", SBbc).

### 6.2 Scene construction (multiverse group)

Built in `buildMultiverse()`:

0. **Giant Sovereign Multiverse Hypersphere Boundary** — radius 960,000
   sphere with `multiverseBoundaryVert/Frag` shader (uColorA `#06b6d4`,
   uColorB `#8b5cf6`, time-driven spiral swirl + "Kamui" spacetime-bending
   vortex uniforms + iridescent aurora membrane), plus equator ring and two
   meridians (`#06b6d4`, opacity 0.28, DoubleSide) and a boundary halo of
   points. The whole group slowly rotates (`0.0008 rad/s`).
1. **Parallel Illuminated Bubble Universes** — one group per reality:
   - invisible `SphereGeometry(size)` collider with
     `userData.isRealityBubble` (pushed to `multiverseColliders`);
   - soft chromatic nucleus: small sphere (`size * 0.16`), color =
     `colorA.lerp(colorB, 0.5)`, additive, opacity 0.45;
   - 140-point circular halo at `size * (1.08 + rand*0.4)`;
   - **orbiting galaxy clusters**: for each cluster an orbit ring
     (`radius = size * (1.35 + idx*0.38)`, alternating direction, incl
     spread) drawn as `LineLoop` (home cluster opacity 0.32, else 0.18), a
     node group orbiting it (phase seeded by `bubblePos[0]*0.0006`) with a
     glow sprite (`makeGlowTexture`), a core sphere (`size*0.048`), a
     30-point swirling member-galaxy cloud, an invisible hover collider,
     hover scale-up 1.45, and per-node self-rotation.
   - **Pocket Cosmos Marble (1.2)** — each reality bubble *is* a glass
     marble: a fresnel glass shell at exactly `bubbleSize` shimmering in
     `colorA/colorB` with a slow band sweep, a **billboard glass-silhouette
     ring** (`marbleRingTex`, always camera-facing) so the marble reads as a
     crisp glass circle from any distance, and a 520-point miniature
     spiral galaxy (own shader material, `pointMode: 'marble'` size
     compensation) turning slowly inside around the chromatic nucleus. The
     orbiting galaxy clusters ride outside the glass like moons
     (`realityMarbles` animated in `updateLevels`).
2. **Active Reality Anchor Shield** — two cyan (`#06b6d4`) torus rings
   (radius 1.2 / 1.38) around the *active* reality's bubble, spinning
   (`rotation.y += 0.012; rotation.z += 0.006`).
3. **The Supreme Sovereign Multiverse Core ("demon core")** at origin —
   plasma `IcosahedronGeometry(9200, 4)` with `demonCoreVert/Frag` shader
   (core `#ff0055`, aura `#8b5cf6`, hover + tear uniforms), inner golden
   wireframe `OctahedronGeometry(6200, 2)` (`#ffb703`), a 4D tesseract
   hypercube nest of counter-rotating wireframe cubes (`#00f5d4`), a
   `DodecahedronGeometry(3200, 1)` shell, plus "core stabilizer beams"
   (`LineSegments`) and cyan sub-lights. Clicking it triggers the "Kamui"
   activation toast and opens the MultiverseBar.

### 6.3 Scale ladder

`MultiverseBar` exposes exactly these SCALE stages (buttons):

```
1 Multiverse · 2 Reality / Universe · 3 Cosmic Web · 4 Supercluster Complex
5 Supercluster · 6 Galaxy Cluster / Group · 7 Galaxy · 8 Galactic Region
9 Spiral Arm · 10 Star-Forming Region · 11 Stellar System
```

`zoomToHierarchy(stageIndex)` maps them to target zoom `tZoomT` values
descending from **0.96** (multiverse) through 0.88, 0.82, 0.76, 0.71, 0.66,
0.60, 0.52, 0.44 … to **0.15** (system). Camera distance is a pure
exponential of zoom:

```ts
dist = 3.0 * Math.pow(800000, zoomT)   // 0.15 ≈ home-system view, 0.96 ≈ multiverse
```

The engine cross-fades level groups by camera distance (`wins.*` weights per
scale), rotates the giant boundary, animates cluster orbits, and drives the
"Kamui erase" vortex when zooming 650,000 → 1,200,000.

---

## 7. The engine (`engine.ts` + `shaders.ts`) — level by level

**Sky & backdrop.** Inverted celestial dome `SphereGeometry(460000, 48, 32)`
with a `backdropMat` shader (deep-sky nebulosity, faint star fields, responds
to the Kamui vortex uniforms), plus a "near star shell" point cloud and
several `skyNebulae` shader point clouds.

**Anchor Star** (`buildAnchor`): `SphereGeometry(6, 96, 64)` with the
`starFrag` shader, an organic `coronaMat` plane (64×64, additive, breathing
rays), two counter-rotating halo rings of points (700 pts @ r 9.6 warm
`[1,0.82,0.55]`; 420 pts @ r 11.4 teal `[0.55,0.85,0.8]`), axial tilt 7.25°
(`rotation.z = 0.126`), and an invisible collider (`radius 8.4`) with
`userData.bodyId = 'anchor'`.

**Bodies** (`buildBody`, one per CosmicBody):
- planet/star mesh `SphereGeometry(radius, 96, 64)` with the per-body
  `planetFrag` shader (palette uniforms deep/base/high/atmo/ice, day-night
  terminator, fade uniform for temporal ghosts);
- optional cloud shell `SphereGeometry(radius * 1.018, 36, 24)`;
- optional atmosphere shell `radius * 1.07` (rim-lit shader);
- optional ring shader mesh;
- **moons**: one moon mesh per diary page of that planet (rebuilt whenever
  pages change; moons orbit with individual phases), each world also gets a
  "commitment ring" that brightens with the writing streak (computed from
  entry `createdAt/updatedAt` days);
- black-hole vault bodies: event-horizon black core
  (`SphereGeometry(R*0.62)` pure black), accretion disc shader, photon-ring
  (`bhMat`), a lattice shell variant for some kinds, plus spin groups;
- nebula bodies: volumetric-looking `nebulaFrag` billboards with ionized
  cyan rims and dust structures;
- every body gets a collider registered for raycast picking and an orbit
  integrated in the frame tick (`orbit.a`, `speed`, `phase`, `incl`).

**Asteroid belt** (`buildBelt`): thousands of 3D-asteroid-shaded points
between orbits, plus dust filaments.

**LOD level groups** (`buildLevels`, `gNeighborhood…gWeb`): the same system
re-rendered as sprites/point clouds for far scales — neighborhood, galaxy
(barred spiral with arms), local cluster, supercluster, and:

**Cosmic web** (`gWeb`): 240 nodes at `WEB_R = 135000` with Voronoi-like
void/wall distribution (`r = WEB_R * (0.18 + 0.82 * R()^0.65)`), edges
connecting nodes closer than `WEB_R * 0.52`, multi-strand curved
gravitational filaments sprinkled with galaxies, per-vertex color-flow
`webLineMat` (`LineSegments`, additive, opacity animated by scale weight),
35 luminous hub clouds at the highest-degree intersections, and a colliding
galaxy pair subgroup (8000-point satellite galaxy + warm core sprite).

**Level point-cloud sizing (critical)**: the shared points shader sizes
points as `aSize · uScale · (260 / −mv.z)` clamped to `[1.5, 36]` px. Raw,
that formula collapses every level cloud to the 1.5px floor beyond the home
system — erasing the galaxy spiral, cluster fields and cosmic web at exactly
the stages where they should shine. `engine.ts` therefore collects every
Points material inside the six level groups (`levelPointMats`) and drives
`uScale` each frame — `camLen / 90` for the five inner levels, `1` for the
multiverse (already dense at its own scale), and `camLen / 130` for the
pocket-cosmos marble spirals (`pointMode` tag) — making points render at
their designed screen size at each cloud's center distance while preserving
intra-cloud perspective. The
backdrop dome also carries `renderOrder = -100` so the deep sky always paints
behind, never over, the additive content.

**Meteors**, **walkable surface** (`buildSurface`): a CPU-noise
`PlaneGeometry(90, 90, 140, 140)` terrain (+ sky + surface particles +
fog uniforms from the planet palette) blended in when the camera closes to a
body — you can stand on your worlds.

**Portal** (entering a world/vault): `beginPortal(body)` → shader pass with
gravitational distortion, `uCenter` at the body's screen UV, chromatic
trail of the last 3 positions, portal color `#6fc2b4` (vault) / `#f2c178`
(diary); phases `idle → in → fired → out`; `finishEntry()` settles it once
the destination overlay is up.

**Core Mode** (`enterCoreMode()`): sets `coreActive`, `tZoomT = 0.24`,
`focusId = null`; `updateCore()` eases `coreT` (dt*2.6 damp), fades in the
amber `#f2c178` connection `LineSegments` between the user's linked worlds
(`connections` from state, ghosted bodies excluded, dynamic position buffer
with `DynamicDrawUsage` + draw range), and pulls the camera back
(`targetFov = 50 + ease*14 − coreT*4`, bloom strength eases down).

**Camera (`cameraRig.ts`)** — a dedicated frame-rate-independent rig (all
easing is `1 − e^(−λ·dt)`, all inertia decays per-second):
- **Distance model**: `dist = 3 · 800000^zoomT`, `zoomT ∈ [0,1]` — six
  decades on one dial; every wheel notch multiplies distance by the same
  factor at every scale (impulse → velocity → exponential settle).
- **Orbit**: drag rotates theta/phi (pole-safe clamp 0.06..π−0.06); release
  flings with a velocity-capped inertia (±2600 px/s input belief, ±2.2 rad/s
  output).
- **Pan**: right-drag / two-finger drag / arrows-WASD, speed proportional to
  altitude, screen-plane aligned, offset clamped and inertial.
- **Focus**: focusId targets a body whose world position is damped-followed
  each frame (moons orbit while you hold the frame); distance framed to
  `[radius·1.35, 3500]`; zooming past 1200 releases seamlessly; auto-engage
  fires **only on active zoom-in intent** (`rig.zoomTrend < −0.008`, angle
  < 0.38, dCam < 300, dist < 150) so diving onto a world centers it while a
  plain rotation or pan can never yank the camera onto a random body.
- **Stage system — Cosmic Web ⇄ Multiverse**: the two scales are **separate
  places** (`cosmicStage: 'web' | 'multiverse'`); their scene layers are
  never visible at the same time **and the zoom dial never crosses between
  them**. The web stage caps the dial at **0.86** (the end of the Cosmic
  Web); the multiverse stage floors it at **0.80**. Between dial **0.82 and
  0.86** the view resolves to the **pure Cosmic Web stage** — the inner
  layers (supercluster, clusters, galaxy, neighborhood) hand their weight
  over to the web (`pureK` smoothstep), so nothing of them bleeds into it.
  The only way between
  stages is the SCALE bar — `zoomToMultiverse()` / SCALE stage 1 enters the
  multiverse, `zoomToHierarchy(2+)` returns to the web. The multiverse stage
  always frames the **active reality's Pocket Cosmos Marble** on entry
  (`realityFocused`, framed between `bubbleSize·3.1` and 520k); zooming out
  past the far frame under outward intent (`rig.atFocusMax` + `zoomTrend >
  0`) releases into the free multiverse orbit. While in the multiverse
  stage, the label reads MULTIVERSE / REALITY · UNIVERSE, multiverse picking
  stays active, and the scale windows are forced to the multiverse layer.
  **The universe sky (backdrop dome, far stars, deep nebulae) belongs inside
  the reality sphere only** — it is hidden in the multiverse stage, so the
  shell of realities floats in clean empty space. The old Kamui vortex
  transition was removed entirely.
- **Kamui jutsu — the only bridge between the stages (Naruto-accurate
  teleportation)**: at the very end of the Cosmic Web (dial pinned at 0.86
  with live outward wheel momentum) the jutsu triggers automatically. A
  scripted 2.8s flight (`kamuiFlight` 0→1) owns the camera completely:
  **reality tears at a single point** — the web's heart — and a consumption
  wave expands outward from that tear (`uVortexR` 45k → 385k in the web's
  materials), so the **nearest structures spiral into the swirl and are
  consumed first**, then the wave reaches farther ones — GPU vertex swirl
  (`pointsVert` + the web filament shader) bends everything around the tear
  in a black-hole whirlpool while the sky tears with it (`kamuiErase` → 1).
  At t = 0.4 the scene **teleports**: the multiverse stage swaps in under
  the full-screen vortex, the web is restored intact for the return trip,
  and the camera emerges from the second portal — **the marble's glass** —
  being ejected to the arrival frame at the active reality's Pocket Cosmos
  Marble. Outward scrolling is swallowed mid-jutsu and wheel momentum is
  killed on landing. Exactly **one** jutsu per crossing, both directions
  (the return swaps web↔multiverse symmetrically via `warpDir` +
  `postWarpZoom`).
- **Demon core retired**: the black inner sphere at the multiverse center
  (Sovereign plasma core + tesseract + stabilizer beams + pulse orbs) no
  longer renders, lights, or picks — the assembly is kept in memory for its
  uniforms but `demonCore.visible = false`, its light is zeroed and its
  collider is never registered. The multiverse center is now open space
  around the reality marbles.
- **Portal squeeze**: rendered distance scales `(1 − ease·0.45)` during the
  warp; FOV kicks 50 → 64 (engine-side).
- **Near/far**: adaptive `near = clamp(dist·0.004, 0.05, 5000)`, far 5M.

**Interaction grammar.** Orbit-drag rotates, wheel/pinch zoom (log dial),
right-drag / two-finger pans, hover raycasts highlight bodies/clusters/
bubbles, click selects, double-click on a body `beginPortal`s into it,
double-click on the anchor enters Core Mode, hover cards (React) follow
cluster/reality colliders.

**Frame tick.** One rAF loop (`setAnimationLoop`): dt clamp → orbit
integration → level weight computation → shader time uniforms → portal/
surface/core updates → composer render. `paused` flag freezes time flow
(space key).

---

## 8. Shaders inventory (`shaders.ts`)

`star`, `planet` (with `limbGlow` day-night blending), `clouds`,
`atmosphere` (fresnel rim `pow(1−ndotv, 3.5)`), `rings`, `nebula`
(multi-octave FBM dust + ionized rim glow), `portal` pass (radial
distortion + chroma trail), `anchor corona` (breathing rays), `points`
(twinkle), `multiverse bubble`, `multiverse boundary` (giant hypersphere
with spiral swirl + Kamui vortex + aurora membrane), `3D asteroid`,
`surface sky` + `terrain` (fog, sun dir), `demon core` (Sovereign
Singularity plasma), `crack/tear` FBM helpers. Uniform style: per-mesh
`ShaderMaterial` with `uTime` driven from `clockT`; colors passed as
`THREE.Color` uniforms.

---

## 9. Physics engine (`physics/physicsEngine.ts`)

Purely derived from each body's `radius` + `orbit.a` — real astrophysics for
the HUD (`PhysicsHUD.tsx`):

- Constants: G, c, σ (Stefan-Boltzmann), Wien `b`, M/R/L/T☉, M/R⊕, AU, g⊕.
- Kepler III: period from semi-major axis (days + years), peri/apoapsis,
  eccentricity, vis-viva instantaneous + mean velocity (km/s).
- Newton: mass from radius × assumed density, surface gravity, escape
  velocity, gravitational force/potential/field/centripetal force vectors.
- Black holes: Schwarzschild radius (`R_s = 2GM/c²`) and **photon sphere
  (1.5 R_s)** readout.
- Atmosphere greenhouse adjustment for Earth/Venus analogues.

---

## 10. The Universal Vault

- **Identities**: `VaultUser` with PBKDF2 salt + verifier (never a password
  hash you can invert — verifier challenge). KDF: 310,000 rounds target,
  legacy 90,000 / 120,000 records still honored and upgraded on unlock.
- **Key Ring**: `PasswordRecord`s sealed as a single AES-256-GCM blob
  (`VaultSecrets`: salt/iv/data/rounds). Unsealing requires the master key;
  the ring can never be reset — only rotated while known.
- **Files**: small payloads inline (`content`), large ones in IndexedDB under
  `payloadRef` with a tiny inline `thumb`; `sealed` objects exist as
  integrity-verified stubs whose payload "lives in the execution layer";
  per-file `lock` passwords; `versions[]` edit history; trash
  (`vaultTrash`) before final purge.
- **Btrfs simulation**: subvolumes (`@root` rootId 5, user subvols 256+),
  CoW reflink clones sharing extents (`isReflink`, `sourceFileId`),
  checksums (`crc32c`/`sha256`/`xxhash64`), zstd/lzo compression accounting
  with space-savings stats, read-only snapshots (deep copy of files +
  folders + generation), scrub runs (scanned bytes, errors found/corrected,
  status log), a superblock with UUID/label/generation. Managed through
  `VaultBtrfsManager.tsx` + parts of `VaultUI.tsx`.
- **VaultTerminal**: an in-vault shell (help, ls/cd/cat-style navigation,
  `scan` deep-integrity scan printing "scan complete · N objects · integrity
  100%", seal/unlock commands).
- **Download synthesis**: sealed/stub objects synthesize a markdown
  materialization note on export instead of faking binary data.
- While the vault is open, the universe composer stops rendering
  (`setRendering(false)`) — the vault is a full-screen glass scene.

## 11. Diary worlds

- `DiaryEntry`s render as **physical paper windows**: draggable, resizable
  `WinRect`s over the scene; `Book.tsx` provides the wave page-turn.
- Each page carries mood + weather (which tint the paper and drive ambient
  particle weather inside the window), tags, bookmark/archive flags.
- Attachments are **plates**: images (with photo grading noir/warm/fade,
  optional hand-placed tilt), audio voice memos (recorded in-browser via
  MediaRecorder, waveform `peaks` + duration), video, files, and code
  snippets (with line counts). A plate is either free-floating (drag to any
  x/y, resizable `w`) or `glued: true` — sealed into the paper inline like a
  typed sentence.
- One moon is generated per page around the planet, live; the planet's
  commitment ring brightens with consecutive writing days.
- `exportDiary.ts` renders the diary to PDF via html-to-image + jspdf.

---

## 12. State, persistence & audio

- `state.ts`: a tiny external store — `getState()`, `actions` dispatcher,
  `useUniverse()` via `useSyncExternalStore`. Whole `UniverseState`
  serialized to `localStorage['my-universe:v4']` on every mutation
  (`version` field gates one-time migrations). `newId()` = crypto.randomUUID
  with a fallback.
- Re-exported helpers: `seedBodies`, `createInitialSeed`, `procPalette`,
  `procRadius` (procedural body generation for new worlds), `fsNorm`,
  btrfs helpers, formatters, metrics (streaks: consecutive-day writing
  streaks computed from entry timestamps).
- `audio.ts`: one master gain (0.55, mutable), per-mode drones (space /
  diary / vault / core) synthesized from oscillators + filters — no audio
  assets; interaction chimes (e.g. 520 Hz on diary open, 960 Hz on Kamui);
  MediaRecorder pipeline for voice memos; mute persisted to
  `localStorage['my-universe:muted']`.

---

## 13. Keyboard & interaction reference (`App.tsx`)

| Key | Action |
|---|---|
| `?` | toggle the key-help overlay |
| `Esc` | close menu / overlay / exit core / exit vault (in priority order) |
| `h` | home — `resetView()`, exit core mode, "returning home" |
| `c` | toggle **Core Mode** (anchor core + world connections + timeline) |
| `v` | focus Eventide (the vault black hole) — space mode only |
| `m` | mute / unmute |
| `Space` | pause / resume time ("time held" / "time flows") |

Mouse: drag = orbit, wheel = zoom through scales, right-drag = pan,
double-click world = portal into its diary, double-click Anchor Star =
Core Mode, click reality bubbles / cluster nodes / demon core in multiverse
scale for hover cards and modals. The MultiverseBar (top chrome) appears
when interacting with multiverse-scale objects or the demon core, and
contains the SCALE ladder, reality name + barrier status, Realities (count),
Hierarchy, and zoom buttons.

---

## 14. Current visual state & intentional deviations

Reconstruction must reproduce the project **as it is now**, including this
deliberate change:

- **The blue "cosmic horizon" sphere has been removed.** Earlier versions
  of `engine.ts` built a decorative fresnel-glow sphere
  (`SphereGeometry(165000, 64, 48)`, uniform `uColor = #38b6ff`,
  `side: BackSide`, opacity driven by `wins.web * 0.5`) inside `gWeb` —
  the "edge of the observable universe" that appeared as a huge translucent
  blue ball around the cosmic web in Core/web-scale views. It was
  intentionally deleted (mesh, field declaration, and its opacity update
  line) at the owner's request. **Do not re-add it.** The cosmic web
  (nodes, filaments, hubs, colliding pair) and every other scale render
  unchanged without it.

---

## 15. Design principles (for regenerators)

1. **The universe is the interface.** No dashboards, no permanent panels;
   chrome fades after idle.
2. **Everything is a metaphor of matter.** Thoughts = planets, pages =
   moons, files = vault matter in a black hole, relationships = connection
   lines in Core Mode, history = a scrubbable timeline.
3. **One continuous scene.** Scales cross-fade by camera distance; there is
   never a scene switch — only zoom.
4. **Procedural over assets.** Every texture (glow sprites, terrain, drones,
   nebulae) is generated in code; the repo ships no binary art.
5. **Local-first and sealed.** All state in the browser; payloads can be
   inline, IndexedDB-backed, or `sealed` behind AES-256-GCM; the Key Ring is
   non-resettable by design.
6. **Real numbers where it flatters.** Orbital periods, gravity, photon
   spheres and lineage text are computed/deterministic, not lorem ipsum.
