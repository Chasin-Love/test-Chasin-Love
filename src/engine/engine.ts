import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  starVert, starFrag, planetVert, planetFrag, cloudFrag, atmoFrag,
  ringVert, ringFrag, discFrag, nebulaVert, nebulaFrag, pointsVert, pointsFrag,
  portalFrag, terrainVert, terrainFrag, skyFrag,
  coronaVert, coronaFrag, backdropVert, backdropFrag,
  multiverseVert, multiverseFrag, asteroidVert, asteroidFrag,
  exoplanetPlateVert, exoplanetPlateFrag,
  demonCoreVert, demonCoreFrag,
  multiverseBoundaryVert, multiverseBoundaryFrag,
  blackHoleVert, blackHoleFrag,
} from './shaders';
import { CameraRig } from './cameraRig';
import type { CosmicBody } from '../types';
import { REALITIES, RealityConfig, GalaxyClusterData } from '../realities';
import { calculateKeplerPosition, calculatePhysics } from '../physics/physicsEngine';

interface ShootingMeteor {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  len: number;
  life: number;
  maxLife: number;
  headSprite: THREE.Sprite;
  line: THREE.Line;
  lineGeom: THREE.BufferGeometry;
  size: number;
}

export interface EngineCallbacks {
  onHover: (id: string | null, x?: number, y?: number) => void;
  onSelect: (id: string | null) => void;
  onActivate: (id: string) => void;
  onPortalPeak: (kind: 'diary' | 'vault', id: string) => void;
  onPortalDone: () => void;
  onContext: (id: string, x: number, y: number) => void;
  onScaleLabel: (label: string) => void;
  onSimDate: (iso: string) => void;
  onSelectReality?: (realityId: string) => void;
  onDoubleClickReality?: (realityId: string) => void;
  onSelectCluster?: (cluster: GalaxyClusterData) => void;
  onSelectDemonCore?: () => void;
}

interface RuntimeClusterNode {
  clusterData: GalaxyClusterData;
  realityId: string;
  group: THREE.Group;
  collider: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  orbitIncl: number;
  phase: number;
  centerPos: THREE.Vector3;
  subGalaxiesGroup: THREE.Group;
  glowSprite: THREE.Sprite;
  orbitLine: THREE.LineLoop;
}

interface RuntimeBody {
  data: CosmicBody;
  group: THREE.Group;
  collider: THREE.Mesh;
  mat?: THREE.ShaderMaterial;
  cloudMat?: THREE.ShaderMaterial;
  ringMat?: THREE.ShaderMaterial;
  atmo?: THREE.Mesh;
  cloudMesh?: THREE.Mesh;
  ringMesh?: THREE.Mesh;
  spinMesh?: THREE.Mesh;
  spinRate?: number;
  cloudSpinRate?: number;
  streakRing?: THREE.Mesh;
  streakTarget?: number;
  streakDays?: number;
  moons: { mesh: THREE.Mesh; a: number; speed: number; phase: number }[];
  extras?: THREE.ShaderMaterial[];
  orbitLine?: THREE.LineLoop;
  ghost: number;
  ghostTarget: number;
  fade: number;
  fadeTarget: number;
  hoverT: number;
  baseScale: number;
}

const DAY = 86400000;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function windowFn(d: number, inA: number, inB: number, outA: number, outB: number): number {
  return smoothstep(inA, inB, d) * (1 - smoothstep(outA, outB, d));
}

/* tiny CPU noise for terrain displacement */
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function cpuFbm(x: number, y: number): number {
  let f = 0, amp = 0.5, fx = x, fy = y;
  for (let i = 0; i < 4; i++) { f += amp * (vnoise(fx, fy) * 2 - 1); fx *= 2.07; fy *= 2.03; amp *= 0.5; }
  return f;
}

function makeGlowTexture(size: number, stops: [number, string][]): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, size, size);
  const half = size / 2;
  const radius = half - 1;
  const grad = g.createRadialGradient(half, half, 0, half, half, radius);
  stops.forEach(([p, col]) => grad.addColorStop(p, col));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(half, half, radius, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

function makeGalaxySprite(warm: boolean): THREE.Texture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, s, s);
  const half = s / 2;
  const radius = half - 1;
  const core = warm ? 'rgba(255,236,200,0.35)' : 'rgba(214,230,255,0.35)';
  const mid = warm ? 'rgba(240,190,130,0.08)' : 'rgba(150,180,235,0.08)';
  const grad = g.createRadialGradient(half, half, 0, half, half, radius);
  grad.addColorStop(0, core);
  grad.addColorStop(0.3, mid);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(half, half, radius, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

function makeRingGlowTexture(): THREE.Texture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, s, s);
  g.strokeStyle = 'rgba(240,248,255,0.95)';
  g.lineWidth = s * 0.028;
  g.shadowColor = 'rgba(180,235,225,0.9)';
  g.shadowBlur = s * 0.055;
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.40, 0, Math.PI * 2);
  g.stroke();
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = s * 0.008;
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

export class UniverseEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private portalPass: ShaderPass;
  private bloomPass: UnrealBloomPass;
  private cb: EngineCallbacks;
  private bodies: RuntimeBody[] = [];
  private colliderList: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private pointerMoved = false;
  private hoveredId: string | null = null;
  private selectedId: string | null = null;
  private focusId: string | null = null;
  private simDays = 0;
  private timeScale = 1;
  private paused = false;
  private rendering = true;
  private coreActive = false; private coreT = 0;
  private epoch = Date.now() - 400 * DAY;
  private portal = { phase: 'idle' as 'idle' | 'in' | 'hold' | 'out', t: 0, fired: false, uv: new THREE.Vector2(0.5, 0.5), kind: 'diary' as 'diary' | 'vault', bodyId: '' };
  private dragging = false; private lastPX = 0; private lastPY = 0; private downX = 0; private downY = 0; private downT = 0;
  private lastClickT = 0; private lastClickId: string | null = null; private clickTimer: ReturnType<typeof setTimeout> | null = null;
  private starUniforms: Record<string, THREE.IUniform> = {};
  private connectionLines!: THREE.LineSegments;
  private connectionMat!: THREE.LineBasicMaterial;
  private gNeighborhood = new THREE.Group();
  private gGalaxy = new THREE.Group();
  private gCluster = new THREE.Group();
  private gSupercluster = new THREE.Group();
  private gWeb = new THREE.Group();
  private gMultiverse = new THREE.Group();
  private meteors: ShootingMeteor[] = [];
  private asteroids3D: { mesh: THREE.Mesh; spin: THREE.Vector3 }[] = [];
  private multiverseColliders: THREE.Mesh[] = [];
  private clusterNodes: RuntimeClusterNode[] = [];
  private multiverseMats: THREE.ShaderMaterial[] = [];
  private exoplanetPlateMat!: THREE.ShaderMaterial;
  private clouds: { mat: THREE.ShaderMaterial; px: number }[] = [];
  private levelSprites: { mat: THREE.SpriteMaterial; base: number; level: 'neighborhood' | 'cluster' | 'supercluster' | 'beacon' | 'web' | 'multiverse' }[] = [];
  /* every Points material inside the six level groups — uScale is
     distance-compensated each frame (see updateLevels) so the galaxy spiral,
     cluster fields and cosmic web keep their designed screen size at their
     own scales instead of collapsing to the 1.5px shader floor. */
  private levelPointMats: THREE.ShaderMaterial[] = [];
  /* Pocket Cosmos Marbles — every reality bubble is a glass universe */
  private realityMarbles: { spiral: THREE.Points; glassMat: THREE.ShaderMaterial; speed: number }[] = [];
  private marbleRingTex: THREE.CanvasTexture | null = null;
  /* Stage system — the Cosmic Web and the Multiverse are two SEPARATE places.
     They are never visible at the same time and the zoom dial never carries
     you between them: the ONLY bridge is the Kamui warp. */
  private cosmicStage: 'web' | 'multiverse' = 'web';
  /* Kamui — the teleportation jutsu. kamuiFlight: 0..1 scripted progress.
     kamuiWarpFx: the tunnel envelope (fov kick + screen swirl). The suck
     drifts the focus along +z into the vortex; the eject throws it along -z. */
  private kamuiFlight: number | null = null;
  private kamuiFromZoom = 0;
  private arrivalZoom = 0.787;
  private warpDir: 'toMultiverse' | 'toWeb' = 'toMultiverse';
  private postWarpZoom: number | null = null;
  private kamuiWarpFx = 0;
  private kamuiEjectK = 0;
  private kamuiSuckDrift = 0;
  private realityFocused = false;
  private webLineMat!: THREE.ShaderMaterial;
  /* the gWeb materials that carry the Kamui tear vortex */
  private webVortexMats: THREE.ShaderMaterial[] = [];
  private beacon!: THREE.Sprite;
  private surface = new THREE.Group();
  private surfaceLocked = false;
  private surfaceQuat = new THREE.Quaternion();
  private surfaceMat!: THREE.ShaderMaterial;
  private skyMat!: THREE.ShaderMaterial;
  private surfaceParticlesMat!: THREE.ShaderMaterial;
  private surfaceBlend = 0;
  private activeRealityId = 'sol-prime';
  private activeReality: RealityConfig | null = null;
  private realityGroups: Record<string, THREE.Group> = {};
  private activeRealityShieldMesh: THREE.Group | null = null;
  private giantMultiverseBoundaryMat!: THREE.ShaderMaterial;
  private giantMultiverseSphereGroup!: THREE.Group;
  private demonCoreGroup!: THREE.Group;
  private demonCoreMat!: THREE.ShaderMaterial;
  private demonCoreRings: THREE.Mesh[] = [];
  private demonCoreSpires: THREE.Mesh[] = [];
  private demonCoreInnerGeom!: THREE.Mesh;
  private demonCorePulseRings: THREE.Mesh[] = [];
  private demonCoreJets: THREE.Mesh[] = [];
  private demonCoreTesseract: THREE.Group | null = null;
  private demonCoreTachyonNodes: THREE.Mesh[] = [];
  private coreStabilizerBeams!: THREE.LineSegments;
  private coreStabilizerBeamMat!: THREE.LineBasicMaterial;
  private corePulseOrbs: THREE.Mesh[] = [];
  private kamuiErase = 0;
  private skyDomeMesh!: THREE.Mesh;
  private farStarsPoints!: THREE.Points;
  private demonCoreLight!: THREE.PointLight;
  private demonCoreCollider!: THREE.Mesh;
  private kamuiTimer = 0;
  private lastLabel = '';
  private lastDateSent = 0;
  private clockT = 0;
  private disposed = false;

  /* Reusable scratchpad instances for zero-GC render frame updates */
  private _vScratch1 = new THREE.Vector3();
  private _vScratch2 = new THREE.Vector3();
  private _vScratch3 = new THREE.Vector3();
  private _vDirScratch = new THREE.Vector3();
  private _vFocusScratch = new THREE.Vector3();
  private _qScratch = new THREE.Quaternion();
  private _corePosBuffer = new Float32Array(1000 * 3);

  constructor(canvas: HTMLCanvasElement, bodies: CosmicBody[], cb: EngineCallbacks) {
    this.cb = cb;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor('#04060c', 1);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 8000000);
    this.rig = new CameraRig(this.camera, canvas);
    this.scene.add(new THREE.AmbientLight(0x1e293b, 0.3));
    const sun = new THREE.PointLight(0xfff0d6, 0.95, 0, 0);
    this.scene.add(sun);

    this.buildSky();
    this.buildBackdrop();
    this.buildAnchor();
    bodies.forEach((b) => this.buildBody(b));
    this.buildBelt();
    this.buildLevels();
    this.buildMultiverse();
    this.buildMeteors();
    this.buildSurface();

    /* collect level point-cloud materials for per-frame size compensation */
    [this.gNeighborhood, this.gGalaxy, this.gCluster, this.gSupercluster, this.gWeb, this.gMultiverse].forEach((g) => {
      const defaultMode = g === this.gMultiverse ? 'multiverse' : 'standard';
      g.traverse((obj) => {
        if (obj instanceof THREE.Points) {
          const m = obj.material as THREE.ShaderMaterial;
          if (m.uniforms && m.uniforms.uScale && !this.levelPointMats.includes(m)) {
            m.userData.pointMode = (m.userData.pointMode as string | undefined) ?? defaultMode;
            this.levelPointMats.push(m);
          }
        }
      });
    });

    this.connectionMat = new THREE.LineBasicMaterial({ color: 0xf2c178, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const initGeom = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(this._corePosBuffer, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    initGeom.setAttribute('position', posAttr);
    this.connectionLines = new THREE.LineSegments(initGeom, this.connectionMat);
    this.connectionLines.frustumCulled = false;
    this.scene.add(this.connectionLines);

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.12, 0.15, 0.90);
    this.composer.addPass(this.bloomPass);
    this.portalPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null }, uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uStrength: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 },
        uColor: { value: new THREE.Color('#f2c178') },
        uTrail: {
          value: [
            new THREE.Vector2(0.5, 0.5),
            new THREE.Vector2(0.5, 0.5),
            new THREE.Vector2(0.5, 0.5),
          ],
        },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: portalFrag,
    });
    this.composer.addPass(this.portalPass);
    this.composer.addPass(new OutputPass());

    this.bindEvents(canvas);
    this.resize();
    window.addEventListener('resize', this.resize);
    this.renderer.setAnimationLoop(this.tick);
  }

  /* ----------------------------- construction ----------------------------- */

  private pointsMaterial(px: number, twinkle: boolean): THREE.ShaderMaterial {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uScale: { value: 1 }, uTime: { value: 0 }, uTwinkle: { value: twinkle ? 1 : 0 }, uOpacity: { value: 1 },
        uVortexC: { value: new THREE.Vector3() }, uVortexR: { value: 0 }, uVortexS: { value: 0 }, uVortexT: { value: 0 },
      },
      vertexShader: pointsVert, fragmentShader: pointsFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.clouds.push({ mat, px });
    return mat;
  }

  private makePoints(count: number, posFn: (i: number, arr: Float32Array) => void, sizeFn: (i: number) => number, colFn: (i: number) => [number, number, number], alphaFn: (i: number) => number, px: number, twinkle: boolean): THREE.Points {
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const alp = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      posFn(i, pos); size[i] = sizeFn(i);
      const c = colFn(i); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      alp[i] = alphaFn(i);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alp, 1));
    return new THREE.Points(g, this.pointsMaterial(px, twinkle));
  }

  private buildBackdrop() {
    const R = () => Math.random();
    /* near star shell — doubles as the raw star field */
    const near = this.makePoints(
      2600,
      (i, a) => {
        const r = 700 + R() * 2300, t = R() * Math.PI * 2, p = Math.acos(2 * R() - 1);
        a[i * 3] = r * Math.sin(p) * Math.cos(t); a[i * 3 + 1] = r * Math.cos(p) * 0.7; a[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
      },
      () => 0.5 + R() * 1.1,
      () => { const w = R(); return w > 0.8 ? [1, 0.85, 0.65] : w > 0.5 ? [0.8, 0.88, 1] : [0.72, 0.78, 0.9]; },
      () => 0.35 + R() * 0.6,
      2.1, true,
    );
    this.gNeighborhood.add(near);

    /* bright named neighbors */
    const glowWarm = makeGlowTexture(128, [[0, 'rgba(255,244,220,1)'], [0.25, 'rgba(255,220,160,0.55)'], [1, 'rgba(255,200,120,0)']]);
    const glowCool = makeGlowTexture(128, [[0, 'rgba(230,240,255,1)'], [0.25, 'rgba(170,200,255,0.55)'], [1, 'rgba(150,180,255,0)']]);
    const named: [string, number, number, number, boolean][] = [
      ['SIRIUS', 900, 260, -1400, false], ['VEGA', -1300, 520, 800, false],
      ['PROXIMA', 420, -140, 640, true], ['ALTAIN', -700, -380, -900, true], ['KEID', 1500, -300, 600, false],
    ];
    named.forEach(([, x, y, z, warm]) => {
      const m = new THREE.SpriteMaterial({ map: warm ? glowWarm : glowCool, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
      const s = new THREE.Sprite(m); s.position.set(x, y, z); s.scale.setScalar(60 + R() * 50);
      this.gNeighborhood.add(s);
      this.levelSprites.push({ mat: m, base: m.opacity, level: 'neighborhood' });
    });

    /* milky way band */
    const band = this.makePoints(
      5200,
      (i, a) => {
        const ang = R() * Math.PI * 2, r = 14000 + R() * 42000;
        const off = (R() + R() + R() - 1.5) * 3400;
        a[i * 3] = Math.cos(ang) * r; a[i * 3 + 1] = off * 0.32; a[i * 3 + 2] = Math.sin(ang) * r;
      },
      () => 0.4 + R() * 0.9,
      () => { const w = R(); return w > 0.75 ? [1, 0.82, 0.6] : [0.62, 0.7, 0.88]; },
      () => 0.16 + R() * 0.3,
      1.5, true,
    );
    band.rotation.z = 0.42; band.rotation.x = 0.22;
    this.gGalaxy.add(band);

    /* far backdrop shell beyond everything */
    const far = this.makePoints(
      1600,
      (i, a) => {
        const r = 320000 + R() * 160000, t = R() * Math.PI * 2, p = Math.acos(2 * R() - 1);
        a[i * 3] = r * Math.sin(p) * Math.cos(t); a[i * 3 + 1] = r * Math.cos(p); a[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
      },
      () => 0.5 + R() * 1.0, () => [0.6, 0.68, 0.85], () => 0.25 + R() * 0.3, 1.2, false,
    );
    this.farStarsPoints = far;
    this.scene.add(far);
    this.scene.add(this.gNeighborhood);

    this.scene.traverse((obj) => {
      obj.frustumCulled = false;
    });
  }

  /* the real-universe canvas: an inverted celestial sphere + faint deep-sky nebulosity */
  private buildSky() {
    this.backdropMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uKamuiErase: { value: 0 },
        uVortexDir: { value: new THREE.Vector3(0, 0, -1) },
      },
      vertexShader: backdropVert,
      fragmentShader: backdropFrag,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      transparent: true,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(460000, 48, 32), this.backdropMat);
    dome.frustumCulled = false;
    dome.renderOrder = -100; /* always the first transparent layer — deep sky paints behind, never over, the level clouds */
    this.scene.add(dome);
    this.skyDomeMesh = dome;

    /* Deep sky volumetric nebulae using circular point clouds — zero quad plane boundaries */
    const mkNebulaPoints = (col: [number, number, number], center: [number, number, number], radius: number, count: number) => {
      const R = Math.random;
      const pts = this.makePoints(
        count,
        (i, a) => {
          const r = Math.pow(R(), 0.7) * radius;
          const t = R() * Math.PI * 2, p = Math.acos(2 * R() - 1);
          a[i * 3] = center[0] + r * Math.sin(p) * Math.cos(t);
          a[i * 3 + 1] = center[1] + r * Math.cos(p);
          a[i * 3 + 2] = center[2] + r * Math.sin(p) * Math.sin(t);
        },
        () => 3.2 + R() * 5.5,
        () => col,
        () => 0.08 + R() * 0.16,
        4.0,
        true,
      );
      this.skyNebulae.push(pts.material as THREE.ShaderMaterial);
      this.scene.add(pts);
    };
    mkNebulaPoints([0.15, 0.35, 0.55], [-140000, 60000, -190000], 120000, 1600);
    mkNebulaPoints([0.18, 0.40, 0.65], [170000, -50000, 120000], 100000, 1400);
    mkNebulaPoints([0.20, 0.42, 0.60], [60000, 140000, 170000], 90000, 1100);
  }
  private skyNebulae: THREE.ShaderMaterial[] = [];
  private backdropMat!: THREE.ShaderMaterial;

  private buildAnchor() {
    const g = new THREE.Group();
    this.starUniforms = { uTime: { value: 0 }, uBoost: { value: 1 } };
    const mat = new THREE.ShaderMaterial({ uniforms: this.starUniforms, vertexShader: starVert, fragmentShader: starFrag });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(6, 96, 64), mat);
    g.add(mesh);

    /* organic shader corona — rays breathe, no layered sprite rings */
    this.coronaMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uBoost: { value: 1 } },
      vertexShader: coronaVert, fragmentShader: coronaFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const corona = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), this.coronaMat);
    corona.renderOrder = 5;
    corona.frustumCulled = false;
    g.add(corona);

    /* the extraordinary quality: two counter-rotating rings of captured starlight */
    const ringPts = (radius: number, count: number, color: [number, number, number], tilt: number, size: number) => {
      const R = Math.random;
      const pts = this.makePoints(
        count,
        (i, a) => { const ang = (i / count) * Math.PI * 2 + R() * 0.06; const rr = radius + (R() - 0.5) * 0.7; a[i * 3] = Math.cos(ang) * rr; a[i * 3 + 1] = (R() - 0.5) * 0.35; a[i * 3 + 2] = Math.sin(ang) * rr; },
        () => 0.5 + R() * 0.9, () => color, () => 0.3 + R() * 0.55, size, true,
      );
      pts.rotation.x = tilt;
      g.add(pts);
      return pts;
    };
    const haloA = ringPts(9.6, 700, [1, 0.82, 0.55], 0.42, 1.6);
    const haloB = ringPts(11.4, 420, [0.55, 0.85, 0.8], -0.55, 1.3);
    g.userData.haloA = haloA; g.userData.haloB = haloB;
    g.userData.starMesh = mesh;
    /* Solar Axial Obliquity Tilt (7.25 degrees relative to ecliptic) */
    g.rotation.z = 0.126;
    this.scene.add(g);

    const collider = new THREE.Mesh(new THREE.SphereGeometry(8.4, 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
    collider.userData.bodyId = 'anchor';
    g.add(collider);
    this.colliderList.push(collider);
    (g as THREE.Group & { userData: Record<string, unknown> }).userData.anchorGroup = true;
    this.anchorGroup = g;
  }
  private anchorGroup!: THREE.Group;
  private coronaMat!: THREE.ShaderMaterial;
  private rig!: CameraRig;
  private grabCooldown = 0;

  private buildBody(data: CosmicBody) {
    if (data.id === 'anchor') return;
    const g = new THREE.Group();
    const rb: RuntimeBody = {
      data, group: g, collider: null as unknown as THREE.Mesh, moons: [],
      ghost: 0, ghostTarget: 0, fade: 1, fadeTarget: 1, hoverT: 0, baseScale: 1,
    };
    const p = data.palette;
    const col = (h: string) => new THREE.Color(h);

    if (data.kind === 'planet' || data.kind === 'dwarf') {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uDeep: { value: col(p.deep) }, uBase: { value: col(p.base) }, uHigh: { value: col(p.high) },
          uIce: { value: col(p.ice) }, uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uTime: { value: 0 },
          uSea: { value: data.id === 'aurelia' ? 0.02 : -0.55 }, uGhost: { value: 0 }, uFade: { value: 1 },
          uNight: { value: data.nightside ? 1 : 0 },
          uSeed: { value: new THREE.Vector3(hash(data.id.length, 3) * 40, hash(7, data.id.length) * 40, hash(data.id.length, 11) * 40) },
        },
        vertexShader: planetVert, fragmentShader: planetFrag, transparent: true,
      });
      /* tilted spin axis — the world turns under a fixed sun */
      const tilt = new THREE.Group();
      tilt.rotation.z = 0.35 + hash(data.id.length, 2) * 0.5;
      g.add(tilt);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(data.radius, 48, 32), mat);
      tilt.add(mesh);
      rb.mat = mat;

      /* each world keeps its own day length */
      const retrograde = hash(3, data.id.length) > 0.82 ? -1 : 1;
      rb.spinMesh = mesh;
      rb.spinRate = retrograde * (Math.PI * 2) / (24 + hash(data.id.length, 5) * 52);

      if (data.clouds) {
        const cm = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(1, 0, 0) },
            uSeed: { value: new THREE.Vector3(3.7, 8.1, 1.9) }, uCover: { value: data.id === 'veil' ? 0.95 : 0.5 },
            uFade: { value: 1 },
          },
          vertexShader: planetVert, fragmentShader: cloudFrag, transparent: true, depthWrite: false,
        });
        const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(data.radius * 1.018, 36, 24), cm);
        tilt.add(cloudMesh);
        rb.cloudMat = cm; rb.cloudMesh = cloudMesh;
        rb.cloudSpinRate = rb.spinRate * (0.86 + hash(9, data.id.length) * 0.2);
      }

      const am = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: col(p.atmo) }, uStrength: { value: data.id === 'mirror' ? 1.5 : 0.85 }, uSunDir: { value: new THREE.Vector3(1, 0, 0) } },
        vertexShader: planetVert, fragmentShader: atmoFrag,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
      });
      const atmo = new THREE.Mesh(new THREE.SphereGeometry(data.radius * 1.07, 36, 24), am);
      atmo.renderOrder = 2;
      g.add(atmo);
      rb.atmo = atmo;

      if (data.rings) {
        const inner = data.radius * 1.45, outer = data.radius * 2.5;
        const rm = new THREE.ShaderMaterial({
          uniforms: { uInner: { value: inner }, uOuter: { value: outer }, uTint: { value: col(p.high) }, uSunLocal: { value: new THREE.Vector3(1, 0, 0.4) } },
          vertexShader: ringVert, fragmentShader: ringFrag,
          transparent: true, depthWrite: false, side: THREE.DoubleSide,
        });
        const ringMesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 96, 1), rm);
        ringMesh.rotation.x = -Math.PI / 2 + 0.32;
        ringMesh.renderOrder = 3;
        g.add(ringMesh);
        rb.ringMat = rm; rb.ringMesh = ringMesh;
      }
      /* moons are generated dynamically — one per diary page (see syncMoons) */
    } else if (data.kind === 'nebula') {
      const s = data.radius * 3.2;
      const cA = col(p.base), cB = col(p.high);

      // 1. Primary Volumetric Raymarched 3D Density Bounding Geometry
      const nebMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: cA },
          uColorB: { value: cB },
          uOpacity: { value: 0.95 },
          uCamLocalP: { value: new THREE.Vector3() },
        },
        vertexShader: nebulaVert,
        fragmentShader: nebulaFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      });

      const nebBox = new THREE.Mesh(new THREE.BoxGeometry(s * 2.5, s * 2.5, s * 2.5), nebMat);
      nebBox.renderOrder = 3;
      g.add(nebBox);
      rb.mat = nebMat;

      // 2. Surrounding 3D Dense Starfield (Independent 3D points in volumetric space)
      const starfield3D = this.makePoints(
        1600,
        (i, a) => {
          const r = Math.pow(Math.random(), 0.55) * s * 1.8;
          const t = Math.random() * Math.PI * 2, pVal = Math.acos(2 * Math.random() - 1);
          a[i * 3] = r * Math.sin(pVal) * Math.cos(t);
          a[i * 3 + 1] = r * Math.cos(pVal);
          a[i * 3 + 2] = r * Math.sin(pVal) * Math.sin(t);
        },
        (i) => (i % 30 === 0 ? 3.5 + Math.random() * 2.8 : 0.6 + Math.random() * 1.2),
        (i) => {
          const w = Math.random();
          if (w > 0.85) return [0.72, 0.88, 1.0]; // Cool White-Blue
          if (w > 0.6) return [1.0, 0.95, 0.88]; // Neutral White
          return [1.0, 0.82, 0.62]; // Warm Yellow
        },
        () => 0.4 + Math.random() * 0.55,
        2.2,
        true
      );
      g.add(starfield3D);

      // 3. Embedded Protostar Seeds & Diffraction Starbursts
      const flareTex = makeGlowTexture(128, [
        [0, 'rgba(255,255,255,1)'],
        [0.15, 'rgba(255,220,130,0.9)'],
        [0.42, 'rgba(255,140,50,0.4)'],
        [1, 'rgba(0,0,0,0)'],
      ]);
      const flareMat = new THREE.SpriteMaterial({ map: flareTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });

      // Embedded protostar at Left Pillar Tip
      const ps1 = new THREE.Sprite(flareMat);
      ps1.position.set(-s * 0.42, s * 0.48, s * 0.02);
      ps1.scale.setScalar(s * 0.38);
      g.add(ps1);

      // Embedded protostar at Center Pillar Tip
      const ps2 = new THREE.Sprite(flareMat);
      ps2.position.set(-s * 0.05, s * 0.78, -s * 0.08);
      ps2.scale.setScalar(s * 0.42);
      g.add(ps2);

      // Embedded protostar in Lower Mound
      const ps3 = new THREE.Sprite(flareMat);
      ps3.position.set(s * 0.05, -s * 0.62, s * 0.32);
      ps3.scale.setScalar(s * 0.32);
      g.add(ps3);

      // 4. Fine 3D Dust Filaments Particle Cloud
      const dustCloud3D = this.makePoints(
        850,
        (i, a) => {
          const r = Math.pow(Math.random(), 0.7) * s * 1.1;
          const t = Math.random() * Math.PI * 2, pVal = Math.acos(2 * Math.random() - 1);
          a[i * 3] = r * Math.sin(pVal) * Math.cos(t);
          a[i * 3 + 1] = r * Math.cos(pVal) * 0.8;
          a[i * 3 + 2] = r * Math.sin(pVal) * Math.sin(t);
        },
        () => 2.2 + Math.random() * 4.2,
        () => {
          const w = Math.random();
          return w > 0.75 ? [0.25, 0.85, 1.0] : [0.85, 0.45, 0.15];
        },
        () => 0.3 + Math.random() * 0.45,
        2.6,
        true
      );
      g.add(dustCloud3D);
    } else if (data.kind === 'hole') {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.15, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      g.add(sphere);
      const discM = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }, uInner: { value: 1.5 }, uOuter: { value: 6.2 },
          uColor: { value: new THREE.Color('#fa8c2e') }, uColor2: { value: new THREE.Color('#ffe6b8') },
        },
        vertexShader: ringVert, fragmentShader: discFrag,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const disc = new THREE.Mesh(new THREE.RingGeometry(1.5, 6.2, 96, 1), discM);
      disc.rotation.x = -Math.PI / 2 + 0.5;
      disc.renderOrder = 4;
      g.add(disc);
      rb.mat = discM;
      const photon = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture(128, [[0, 'rgba(0,0,0,0)'], [0.3, 'rgba(255,190,110,0.7)'], [0.42, 'rgba(255,170,90,0.18)'], [1, 'rgba(255,150,70,0)']]),
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
      }));
      photon.scale.setScalar(6.5);
      g.add(photon);
    } else if (data.kind === 'vault') {
      /* the Universal Vault — a high-fidelity astrophysically grounded black hole */
      const R = data.radius;
      const bhMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorDiskInner: { value: new THREE.Color('#38bdf8') },
          uColorDiskOuter: { value: new THREE.Color('#f59e0b') },
          uRadius: { value: R * 3.5 },
        },
        vertexShader: blackHoleVert,
        fragmentShader: blackHoleFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const bhMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 3.5, 64, 48), bhMat);
      bhMesh.renderOrder = 4;
      g.add(bhMesh);

      const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.62, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      g.add(core);

      const latticeMat = new THREE.MeshStandardMaterial({ color: 0x0c1418, emissive: new THREE.Color('#6fc2b4'), emissiveIntensity: 1.8, metalness: 0.7, roughness: 0.35 });
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(R * 1.9, 0.04, 8, 110), latticeMat);
      const r2 = new THREE.Mesh(new THREE.TorusGeometry(R * 2.4, 0.026, 8, 110), latticeMat.clone());
      r1.rotation.x = 1.1; r2.rotation.x = -0.7; r2.rotation.y = 0.6;
      g.add(r1, r2);

      g.userData.spin = { core, shell: bhMesh, r1, r2 };
      rb.mat = bhMat;
      rb.extras = [bhMat];
    }

    const cr = Math.max(data.radius * 1.5, 2.6);
    const collider = new THREE.Mesh(new THREE.SphereGeometry(cr, 10, 10), new THREE.MeshBasicMaterial({ visible: false }));
    collider.userData.bodyId = data.id;
    g.add(collider);
    rb.collider = collider;
    this.colliderList.push(collider);

    if (data.kind === 'planet' || data.kind === 'dwarf' || data.kind === 'vault') {
      const pts: number[] = [];
      const phys = calculatePhysics(data);
      const e = phys.eccentricity;
      for (let i = 0; i <= 160; i++) {
        const simStep = (i / 160) * 10000;
        const pos = calculateKeplerPosition(data.orbit.a, e, data.orbit.phase, data.orbit.incl, simStep, data.orbit.speed || 0.01);
        pts.push(pos.x, pos.y, pos.z);
      }
      const og = new THREE.BufferGeometry();
      og.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const om = new THREE.LineBasicMaterial({ color: 0x8ba1c4, transparent: true, opacity: 0 });
      const line = new THREE.LineLoop(og, om);
      this.scene.add(line);
      rb.orbitLine = line;
    }

    this.scene.add(g);
    this.bodies.push(rb);
  }

  private buildBelt() {
    const R = Math.random;
    const belt = this.makePoints(
      2600,
      (i, a) => {
        const ang = R() * Math.PI * 2;
        const r = 79 + R() * 11 + Math.pow(R(), 3) * 4;
        a[i * 3] = Math.cos(ang) * r; a[i * 3 + 1] = (R() - 0.5) * 2.6; a[i * 3 + 2] = Math.sin(ang) * r;
      },
      () => 0.35 + R() * 0.75,
      () => { const w = 0.45 + R() * 0.3; return [w, w * 0.9, w * 0.78] as [number, number, number]; },
      () => 0.3 + R() * 0.5, 1.15, false,
    );
    this.scene.add(belt);
    this.belt = belt;
  }
  private belt!: THREE.Points;

  private buildMeteors() {
    const headTex = makeGlowTexture(128, [
      [0, 'rgba(255,255,255,1)'],
      [0.2, 'rgba(180,240,255,0.9)'],
      [0.5, 'rgba(100,200,255,0.4)'],
      [1, 'rgba(60,140,255,0)'],
    ]);
    const R = Math.random;
    for (let i = 0; i < 40; i++) {
      const headMat = new THREE.SpriteMaterial({ map: headTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
      const headSprite = new THREE.Sprite(headMat);
      
      const lineGeom = new THREE.BufferGeometry();
      lineGeom.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      lineGeom.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 0.2, 0.5, 1], 3));
      const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
      const line = new THREE.Line(lineGeom, lineMat);
      
      const g = new THREE.Group();
      g.add(headSprite); g.add(line);
      this.scene.add(g);
      
      const m: ShootingMeteor = {
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), len: 1, life: 0, maxLife: 1,
        headSprite, line, lineGeom, size: 1,
      };
      this.resetMeteor(m);
      m.life = R() * m.maxLife; // stagger initial life times
      this.meteors.push(m);
    }
  }

  private resetMeteor(m: ShootingMeteor) {
    const R = Math.random;
    const r = 180 + R() * 220000;
    const theta = R() * Math.PI * 2, phi = Math.acos(2 * R() - 1);
    m.pos.set(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.5, r * Math.sin(phi) * Math.sin(theta));
    const speed = 400 + R() * 3200;
    const dir = new THREE.Vector3((R() - 0.5) * 2, (R() - 0.5) * 0.8, (R() - 0.5) * 2).normalize();
    m.vel.copy(dir).multiplyScalar(speed);
    m.len = 120 + R() * 1100;
    m.life = 0;
    m.maxLife = 1.2 + R() * 3.5;
    m.size = Math.max(6, r * 0.007);
    m.headSprite.scale.setScalar(m.size);
  }

  private updateMeteors(dt: number) {
    this.meteors.forEach((m) => {
      m.life += dt;
      if (m.life >= m.maxLife) {
        this.resetMeteor(m);
        return;
      }
      m.pos.addScaledVector(m.vel, dt);
      m.headSprite.position.copy(m.pos);
      
      const tail = m.pos.clone().sub(m.vel.clone().normalize().multiplyScalar(m.len));
      const attr = m.lineGeom.getAttribute('position') as THREE.BufferAttribute;
      attr.setXYZ(0, m.pos.x, m.pos.y, m.pos.z);
      attr.setXYZ(1, tail.x, tail.y, tail.z);
      attr.needsUpdate = true;
      
      const fade = Math.sin((m.life / m.maxLife) * Math.PI);
      m.headSprite.material.opacity = fade * 0.95;
      (m.line.material as THREE.LineBasicMaterial).opacity = fade * 0.8;
    });
  }

  private buildMultiverse(customRealitiesList?: RealityConfig[]) {
    const R = Math.random;
    const realitiesToBuild = customRealitiesList || REALITIES;
    this.multiverseColliders = [];
    this.clusterNodes = [];
    this.multiverseMats = [];
    this.realityGroups = {};
    this.demonCorePulseRings = [];
    this.demonCoreRings = [];
    this.demonCoreSpires = [];
    this.demonCoreJets = [];
    this.demonCoreTachyonNodes = [];
    this.corePulseOrbs = [];

    /* 0. Giant Sovereign Multiverse Hypersphere Boundary (Enclosing ALL parallel realities & clusters inside) */
    const giantSphereGroup = new THREE.Group();
    const giantRadius = 960000;
    this.giantMultiverseBoundaryMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color('#06b6d4') },
        uColorB: { value: new THREE.Color('#8b5cf6') },
        uKamuiErase: { value: 0 },
        uVortexDir: { value: new THREE.Vector3(0, 0, -1) },
      },
      vertexShader: multiverseBoundaryVert,
      fragmentShader: multiverseBoundaryFrag,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const giantSphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(giantRadius, 64, 48),
      this.giantMultiverseBoundaryMat
    );
    giantSphereGroup.add(giantSphereMesh);

    // Geodesic Coordinate Latitude / Longitude Latticework Rings
    const giantRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    // Equator Ring
    const equatorRing = new THREE.Mesh(new THREE.TorusGeometry(giantRadius, 1800, 8, 160), giantRingMat);
    giantSphereGroup.add(equatorRing);
    // Polar Meridians
    const meridian1 = new THREE.Mesh(new THREE.TorusGeometry(giantRadius, 1400, 8, 160), giantRingMat.clone());
    meridian1.rotation.x = Math.PI / 2;
    giantSphereGroup.add(meridian1);
    const meridian2 = new THREE.Mesh(new THREE.TorusGeometry(giantRadius, 1400, 8, 160), giantRingMat.clone());
    meridian2.rotation.y = Math.PI / 2;
    giantSphereGroup.add(meridian2);

    // Outer Multiverse Boundary Horizon Marker Points
    const boundaryHalo = this.makePoints(
      480,
      (idx, arr) => {
        const bp = Math.acos(2 * R() - 1);
        const bt = R() * Math.PI * 2;
        arr[idx * 3] = giantRadius * Math.sin(bp) * Math.cos(bt);
        arr[idx * 3 + 1] = giantRadius * Math.cos(bp);
        arr[idx * 3 + 2] = giantRadius * Math.sin(bp) * Math.sin(bt);
      },
      () => 2.5 + R() * 3.5,
      (idx) => (idx % 2 === 0 ? [0.0, 0.96, 0.85] : [0.55, 0.35, 0.95]),
      () => 0.45 + R() * 0.45,
      2.8,
      true
    );
    giantSphereGroup.add(boundaryHalo);
    this.giantMultiverseSphereGroup = giantSphereGroup;
    this.gMultiverse.add(giantSphereGroup);

    /* 1. Parallel Illuminated Bubble Universes corresponding to REALITIES & their Galaxy Clusters */
    const marbleGlassVert = `varying vec3 vN; varying vec3 vV; varying vec3 vWN; void main(){ vN = normalize(normalMatrix * normal); vWN = normalize(normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
    const marbleGlassFrag = `uniform vec3 uColorA; uniform vec3 uColorB; uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vWN;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(vV);
  /* chromatic dispersion — each channel refracts at its own edge width */
  float fr = pow(1.0 - abs(dot(N, V)), 1.7);
  float fg = pow(1.0 - abs(dot(N, V)), 1.45);
  float fb = pow(1.0 - abs(dot(N, V)), 1.2);
  vec3 chroma = vec3(fr, fg, fb);
  float band = 0.5 + 0.5 * sin(vWN.y * 5.0 - uTime * 0.5) * sin(vWN.x * 3.0 + uTime * 0.35);
  vec3 base = mix(uColorA, uColorB, 0.35 + 0.3 * band);
  /* key-light specular glint — the sun catching the glass */
  vec3 L = normalize(vec3(0.35, 0.8, 0.42));
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 100.0);
  float sheen = pow(max(dot(N, H), 0.0), 12.0) * 0.22;
  vec3 col = base * (chroma * 4.2 + 0.07) + vec3(1.0, 0.98, 0.94) * (spec * 1.6 + sheen);
  float a = min(1.0, (chroma.r + chroma.g + chroma.b) * 0.9 + 0.07 + spec);
  gl_FragColor = vec4(col, a);
}`;
    const marbleTex = makeGlowTexture(128, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
    for (let i = 0; i < realitiesToBuild.length; i++) {
      const real = realitiesToBuild[i];
      const pos = new THREE.Vector3(...real.bubblePos);
      const size = real.bubbleSize;
      
      const realityGroup = new THREE.Group();
      realityGroup.userData = { realityId: real.id };
      
      const bubbleCollider = new THREE.Mesh(
        new THREE.SphereGeometry(size, 16, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      bubbleCollider.position.copy(pos);
      bubbleCollider.userData = { realityId: real.id, isRealityBubble: true };
      realityGroup.add(bubbleCollider);
      this.multiverseColliders.push(bubbleCollider);
      
      /* Soft chromatic star nucleus inside universe bubble */
      const bubbleCoreMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(real.colorA).lerp(new THREE.Color(real.colorB), 0.5),
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const bubbleCoreMesh = new THREE.Mesh(new THREE.SphereGeometry(size * 0.16, 24, 18), bubbleCoreMat);
      bubbleCoreMesh.position.copy(pos);
      realityGroup.add(bubbleCoreMesh);

      /* Pocket Cosmos — the reality itself is a grand glass marble: a wide
         fresnel shell with a faint glass body (visible from any angle) that
         encloses the nucleus, the cluster orbit rings and their swirling
         galaxies, with a blazing core and its own spiral galaxy turning
         slowly inside */
      const colA = new THREE.Color(real.colorA), colB = new THREE.Color(real.colorB);
      const glassMat = new THREE.ShaderMaterial({
        uniforms: { uColorA: { value: colA.clone() }, uColorB: { value: colB.clone() }, uTime: { value: 0 } },
        vertexShader: marbleGlassVert, fragmentShader: marbleGlassFrag,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      realityGroup.add(new THREE.Mesh(new THREE.SphereGeometry(size * 2.6, 48, 32), glassMat));

      /* glass silhouette — a billboard ring that always faces the camera, so
         every marble reads as a crisp glass circle with a galaxy inside even
         from across the multiverse (never mistakable for a web knot) */
      if (!this.marbleRingTex) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 256;
        const g2 = cv.getContext('2d')!;
        g2.strokeStyle = 'rgba(255,255,255,0.95)';
        g2.lineWidth = 10;
        g2.shadowColor = 'rgba(255,255,255,0.8)';
        g2.shadowBlur = 14;
        g2.beginPath();
        g2.arc(128, 128, 108, 0, Math.PI * 2);
        g2.stroke();
        this.marbleRingTex = new THREE.CanvasTexture(cv);
      }
      const rimSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.marbleRingTex, color: colA.clone().lerp(colB, 0.5),
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7,
      }));
      rimSprite.scale.setScalar(size * 5.0);
      rimSprite.position.copy(pos);
      realityGroup.add(rimSprite);

      /* blazing heart of the marble */
      const marbleCore = new THREE.Sprite(new THREE.SpriteMaterial({
        map: marbleTex, color: colA.clone().lerp(colB, 0.4).lerp(new THREE.Color('#ffffff'), 0.55),
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8,
      }));
      marbleCore.scale.setScalar(size * 0.9);
      marbleCore.position.copy(pos);
      realityGroup.add(marbleCore);

      let seed = 0;
      for (let c2 = 0; c2 < real.id.length; c2++) seed = (seed * 31 + real.id.charCodeAt(c2)) >>> 0;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const spiral = this.makePoints(
        700,
        (pi, pa) => {
          const arm = pi % 3;
          const rr = Math.pow(rnd(), 0.6) * size * 0.85;
          const ang = (arm / 3) * Math.PI * 2 + rr * 0.0008 + (rnd() - 0.5) * 0.4;
          const spread = (rnd() + rnd() - 1) * size * 0.08;
          pa[pi * 3] = Math.cos(ang) * rr + Math.cos(ang + 1.57) * spread;
          pa[pi * 3 + 1] = (rnd() + rnd() - 1) * size * 0.12;
          pa[pi * 3 + 2] = Math.sin(ang) * rr + Math.sin(ang + 1.57) * spread;
        },
        () => 1.1 + rnd() * 1.3,
        () => {
          const w = rnd();
          if (w > 0.85) return [1, 1, 1];
          const c = w > 0.5 ? colA : colB;
          return [c.r, c.g, c.b];
        },
        () => 0.45 + rnd() * 0.45,
        1.6, true,
      );
      (spiral.material as THREE.ShaderMaterial).userData.pointMode = 'marble';
      spiral.position.copy(pos); /* spin around the bubble's own center */
      spiral.rotation.x = (rnd() - 0.5) * 1.2;
      spiral.rotation.z = (rnd() - 0.5) * 1.2;
      realityGroup.add(spiral);
      this.realityMarbles.push({ spiral, glassMat, speed: 0.04 + rnd() * 0.06 });

      /* High-lighting circular particle halo */
      const haloPts = this.makePoints(
        140,
        (idx, arr) => {
          const pr = size * (1.08 + R() * 0.4);
          const pt = R() * Math.PI * 2, pp = Math.acos(2 * R() - 1);
          arr[idx * 3] = pos.x + pr * Math.sin(pp) * Math.cos(pt);
          arr[idx * 3 + 1] = pos.y + pr * Math.cos(pp);
          arr[idx * 3 + 2] = pos.z + pr * Math.sin(pp) * Math.sin(pt);
        },
        () => 2.2 + R() * 3.0,
        () => [1, 0.95, 0.85],
        () => 0.55 + R() * 0.35,
        2.6,
        true,
      );
      realityGroup.add(haloPts);

      /* 1.1 Galaxy Clusters and Galaxy Groups Orbiting this Parallel Reality Bubble */
      const clusters = real.clusters || [];
      for (let cIdx = 0; cIdx < clusters.length; cIdx++) {
        const cluster = clusters[cIdx];
        const orbitRadius = size * (1.35 + cIdx * 0.38);
        const orbitSpeed = (cIdx % 2 === 0 ? 1 : -1) * (0.022 + (cIdx % 3) * 0.012);
        const orbitIncl = (cIdx * 0.42) - 0.65;
        const phase = (cIdx / Math.max(1, clusters.length)) * Math.PI * 2 + real.bubblePos[0] * 0.0006;

        // Render Orbit Line Ring around reality bubble
        const orbitPts: number[] = [];
        const segments = 64;
        for (let s = 0; s <= segments; s++) {
          const ang = (s / segments) * Math.PI * 2;
          const ox = Math.cos(ang) * orbitRadius;
          const oy = Math.sin(ang) * orbitRadius * Math.sin(orbitIncl);
          const oz = Math.sin(ang) * orbitRadius * Math.cos(orbitIncl);
          orbitPts.push(pos.x + ox, pos.y + oy, pos.z + oz);
        }
        const og = new THREE.BufferGeometry();
        og.setAttribute('position', new THREE.Float32BufferAttribute(orbitPts, 3));
        const om = new THREE.LineBasicMaterial({
          color: new THREE.Color(cluster.color),
          transparent: true,
          opacity: cluster.isHomeCluster ? 0.32 : 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const orbitLine = new THREE.LineLoop(og, om);
        realityGroup.add(orbitLine);

        // Cluster Node Group
        const nodeGroup = new THREE.Group();
        const initialA = phase;
        nodeGroup.position.set(
          pos.x + Math.cos(initialA) * orbitRadius,
          pos.y + Math.sin(initialA) * orbitRadius * Math.sin(orbitIncl),
          pos.z + Math.sin(initialA) * orbitRadius * Math.cos(orbitIncl),
        );

        // Radiant Glowing Cluster Core Sprite (Dimmed chromatic glow, no blown-out white)
        const glowTex = makeGlowTexture(128, [
          [0, cluster.color],
          [0.35, `${cluster.color}88`],
          [0.7, `${cluster.color}22`],
          [1, 'rgba(0,0,0,0)'],
        ]);
        const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTex,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
        }));
        glowSprite.scale.setScalar(size * 0.12);
        nodeGroup.add(glowSprite);

        // Core Sphere representation
        const coreSphere = new THREE.Mesh(
          new THREE.SphereGeometry(size * 0.048, 16, 12),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(cluster.color), transparent: true, opacity: 0.95 })
        );
        nodeGroup.add(coreSphere);

        // Swirling Member Galaxies Cloud inside this Galaxy Cluster Node
        const subGalaxies = this.makePoints(
          30,
          (gi, gArr) => {
            const ga = (gi / 30) * Math.PI * 2 + R() * 0.35;
            const gr = (0.04 + Math.pow(R(), 0.65) * 0.18) * size;
            gArr[gi * 3] = Math.cos(ga) * gr;
            gArr[gi * 3 + 1] = (R() - 0.5) * size * 0.05;
            gArr[gi * 3 + 2] = Math.sin(ga) * gr;
          },
          () => 1.8 + R() * 2.8,
          (gi) => {
            const col = new THREE.Color(cluster.color);
            if (gi % 2 === 0) col.lerp(new THREE.Color('#ffffff'), 0.45);
            return [col.r, col.g, col.b] as [number, number, number];
          },
          () => 0.5 + R() * 0.45,
          2.4,
          true
        );
        const subGalaxiesGroup = new THREE.Group();
        subGalaxiesGroup.add(subGalaxies);
        nodeGroup.add(subGalaxiesGroup);

        // Interactive Collider for this Cluster Node
        const collider = new THREE.Mesh(
          new THREE.SphereGeometry(size * 0.22, 10, 10),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        collider.userData = { isGalaxyCluster: true, clusterData: cluster, realityId: real.id };
        nodeGroup.add(collider);
        this.multiverseColliders.push(collider);

        realityGroup.add(nodeGroup);

        this.clusterNodes.push({
          clusterData: cluster,
          realityId: real.id,
          group: nodeGroup,
          collider,
          orbitRadius,
          orbitSpeed,
          orbitIncl,
          phase,
          centerPos: pos,
          subGalaxiesGroup,
          glowSprite,
          orbitLine,
        });
      }
      
      realityGroup.visible = (real.id === this.activeRealityId);
      this.gMultiverse.add(realityGroup);
      this.realityGroups[real.id] = realityGroup;
    }
    /* 2. Colliding Interacting Spiral Galaxies */
    const gPair = new THREE.Group();
    gPair.position.set(65000, 12000, -55000);
    
    // Primary Large Spiral Galaxy
    const gal1 = this.makePoints(
      14000,
      (i, a) => {
        const arm = i % 4;
        const rr = Math.pow(R(), 0.58) * 9500;
        const ang = (arm / 4) * Math.PI * 2 + rr * 0.0006 * 3.4 + (R() - 0.5) * 0.4;
        const spread = (R() + R() - 1) * (400 + rr * 0.08);
        a[i * 3] = Math.cos(ang) * rr + Math.cos(ang + 1.57) * spread;
        a[i * 3 + 1] = (R() - 0.5) * (300 + rr * 0.03);
        a[i * 3 + 2] = Math.sin(ang) * rr + Math.sin(ang + 1.57) * spread;
      },
      () => 1.2 + R() * 2.2,
      () => { const w = R(); return w > 0.85 ? [1, 0.72, 0.85] : w > 0.6 ? [0.45, 0.75, 1] : [0.75, 0.85, 1]; },
      () => 0.35 + R() * 0.55, 2.2, true,
    );
    gal1.rotation.x = 0.8; gal1.rotation.z = -0.3;
    gPair.add(gal1);
    
    // Colliding Secondary Satellite Galaxy
    const gal2 = this.makePoints(
      8000,
      (i, a) => {
        const arm = i % 2;
        const rr = Math.pow(R(), 0.52) * 5200;
        const ang = (arm / 2) * Math.PI * 2 + rr * 0.001 * 4.2 + (R() - 0.5) * 0.35;
        a[i * 3] = Math.cos(ang) * rr - 6500;
        a[i * 3 + 1] = Math.sin(ang) * rr * 0.4 + 3200;
        a[i * 3 + 2] = Math.sin(ang) * rr - 4200;
      },
      () => 1.0 + R() * 2.0,
      () => [1, 0.8, 0.6] as [number, number, number],
      () => 0.4 + R() * 0.5, 2.0, true,
    );
    gPair.add(gal2);
    
    // Luminous core for colliding pair
    const c1 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(128, [[0, 'rgba(255,220,160,0.6)'], [0.35, 'rgba(255,160,80,0.25)'], [1, 'rgba(0,0,0,0)']]),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    c1.scale.setScalar(4500);
    gPair.add(c1);
    
    // Active Reality Dimensional Barrier Anchor (glowing isolation boundary shield in Multiverse view)
    const anchorShield = new THREE.Group();
    const anchorRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const anchorRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.035, 16, 64), anchorRingMat);
    const anchorRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.02, 16, 64), anchorRingMat);
    anchorRing2.rotation.x = Math.PI / 3;
    anchorRing2.rotation.y = Math.PI / 6;
    anchorShield.add(anchorRing1);
    anchorShield.add(anchorRing2);
    const activeRealityObj = realitiesToBuild.find((r) => r.id === this.activeRealityId) || realitiesToBuild[0];
    if (activeRealityObj) {
      anchorShield.position.set(...activeRealityObj.bubblePos);
      anchorShield.scale.setScalar(activeRealityObj.bubbleSize);
    }
    this.activeRealityShieldMesh = anchorShield;
    this.gMultiverse.add(anchorShield);

    /* 3. The Supreme Sovereign Multiverse Core & Universal Stabilizer Matrix (Calibrated, High-Contrast Detailing) */
    const demonCore = new THREE.Group();
    demonCore.position.set(0, 0, 0);

    // Sovereign Singularity Shader Material
    this.demonCoreMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorCore: { value: new THREE.Color('#ff0055') },
        uColorAura: { value: new THREE.Color('#8b5cf6') },
        uHover: { value: 0 },
        uTearStrength: { value: 0 },
      },
      vertexShader: demonCoreVert,
      fragmentShader: demonCoreFrag,
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Layer 1: Central Sovereign Icosahedron Core (Plasma Shell) - Monumental Presence
    const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(9200, 4), this.demonCoreMat);
    demonCore.add(coreMesh);

    // Layer 2: Inner Golden Quantum Octahedron Singularity
    this.demonCoreInnerGeom = new THREE.Mesh(
      new THREE.OctahedronGeometry(6200, 2),
      new THREE.MeshBasicMaterial({
        color: 0xffb703,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      })
    );
    demonCore.add(this.demonCoreInnerGeom);

    // Layer 2.5: 4D Tesseract Hypercube Matrix (Nested rotating wireframe cubes)
    const tesseractGroup = new THREE.Group();
    const cubeMatOuter = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const cubeMatInner = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.60,
      blending: THREE.AdditiveBlending,
    });
    const cubeOuter = new THREE.Mesh(new THREE.BoxGeometry(4800, 4800, 4800), cubeMatOuter);
    const cubeInner = new THREE.Mesh(new THREE.BoxGeometry(2400, 2400, 2400), cubeMatInner);
    tesseractGroup.add(cubeOuter);
    tesseractGroup.add(cubeInner);
    demonCore.add(tesseractGroup);
    this.demonCoreTesseract = tesseractGroup;

    // Layer 3: Central Nexus Crystal (Dodecahedron)
    const coreNexus = new THREE.Mesh(
      new THREE.DodecahedronGeometry(3200, 1),
      new THREE.MeshBasicMaterial({
        color: 0x00f5d4,
        wireframe: false,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      })
    );
    demonCore.add(coreNexus);

    // Layer 4: Relativistic Polar Plasma Jets (+Y and -Y Energetic Cones - Calibrated Opacity)
    this.demonCoreJets = [];
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.20,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const topJet = new THREE.Mesh(new THREE.ConeGeometry(2400, 95000, 32, 1, true), jetMat);
    topJet.position.set(0, 48000, 0);
    demonCore.add(topJet);
    this.demonCoreJets.push(topJet);

    const bottomJet = new THREE.Mesh(new THREE.ConeGeometry(2400, 95000, 32, 1, true), jetMat);
    bottomJet.position.set(0, -48000, 0);
    bottomJet.rotation.x = Math.PI;
    demonCore.add(bottomJet);
    this.demonCoreJets.push(bottomJet);

    // 4 Gyroscopic Armillary Stabilizer Rings (Managing & Stabilizing Space-Time)
    this.demonCoreRings = [];
    const ringColors = ['#f59e0b', '#06b6d4', '#8b5cf6', '#ff0055'];
    const ringRadii = [14000, 19500, 25000, 31000];
    const ringThickness = [110, 95, 80, 70];
    for (let r = 0; r < 4; r++) {
      const ringGeom = new THREE.TorusGeometry(ringRadii[r], ringThickness[r], 16, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(ringColors[r]),
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = (r * Math.PI) / 4 + 0.3;
      ringMesh.rotation.y = r * 0.65;
      demonCore.add(ringMesh);
      this.demonCoreRings.push(ringMesh);

      // Add 6 Stabilizer Node Crystals per ring
      for (let n = 0; n < 6; n++) {
        const nAngle = (n / 6) * Math.PI * 2;
        const nodeGeom = new THREE.OctahedronGeometry(550, 0);
        const nodeMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(ringColors[r]),
          wireframe: true,
          blending: THREE.AdditiveBlending,
        });
        const node = new THREE.Mesh(nodeGeom, nodeMat);
        node.position.set(Math.cos(nAngle) * ringRadii[r], Math.sin(nAngle) * ringRadii[r], 0);
        ringMesh.add(node);
      }
    }

    // 6 Eccentric Tachyon Satellite Probes Orbiting the Core
    this.demonCoreTachyonNodes = [];
    for (let t = 0; t < 6; t++) {
      const tGeom = new THREE.DodecahedronGeometry(600, 0);
      const tMat = new THREE.MeshBasicMaterial({
        color: t % 2 === 0 ? 0x00f5d4 : 0xf59e0b,
        wireframe: true,
        blending: THREE.AdditiveBlending,
      });
      const tNode = new THREE.Mesh(tGeom, tMat);
      tNode.userData = {
        radius: 36000 + t * 4500,
        speed: 0.015 + t * 0.005,
        incl: (t * Math.PI) / 6,
        phase: t * 1.05,
      };
      demonCore.add(tNode);
      this.demonCoreTachyonNodes.push(tNode);
    }

    // 12 Radiating Sovereign Stabilizer Spires / Energy Monoliths
    this.demonCoreSpires = [];
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x090314,
      emissive: new THREE.Color('#8b5cf6'),
      emissiveIntensity: 1.1,
      metalness: 0.95,
      roughness: 0.15,
    });
    const numSpires = 12;
    for (let h = 0; h < numSpires; h++) {
      const hAngle = (h / numSpires) * Math.PI * 2;
      const pitch = (h % 3 === 0 ? 0 : h % 3 === 1 ? 0.52 : -0.52);
      const spireGeom = new THREE.CylinderGeometry(240, 1100, 11000, 6);
      const spire = new THREE.Mesh(spireGeom, spireMat);
      const dist = 14500;
      spire.position.set(
        Math.cos(hAngle) * Math.cos(pitch) * dist,
        Math.sin(pitch) * dist,
        Math.sin(hAngle) * Math.cos(pitch) * dist
      );
      spire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spire.position.clone().normalize());
      demonCore.add(spire);
      this.demonCoreSpires.push(spire);
    }

    // Dynamic Multidimensional Spacetime Gyroscopic Pulse Waves (Non-concentric spiral orientations)
    this.demonCorePulseRings = [];
    const pulseColors = [0x00f5d4, 0xec4899, 0x8b5cf6, 0xf59e0b];
    for (let p = 0; p < 4; p++) {
      const pulseGeom = new THREE.TorusGeometry(11000, 75, 12, 90);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: pulseColors[p % pulseColors.length],
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pMesh = new THREE.Mesh(pulseGeom, pulseMat);
      pMesh.rotation.x = (p * Math.PI) / 4 + 0.35;
      pMesh.rotation.y = p * 0.78;
      pMesh.rotation.z = (p * Math.PI) / 3;
      pMesh.userData = { phase: p / 4, baseScale: 1.0, rotSpeed: 0.005 + p * 0.003 };
      demonCore.add(pMesh);
      this.demonCorePulseRings.push(pMesh);
    }

    // Swirling Celestial Mana Embers & Accretion Vortex
    const demonEmbers = this.makePoints(
      2200,
      (idx, arr) => {
        const rad = 11000 + Math.pow(R(), 0.6) * 28000;
        const ang = R() * Math.PI * 2;
        const pAng = Math.acos(2 * R() - 1);
        arr[idx * 3] = rad * Math.sin(pAng) * Math.cos(ang);
        arr[idx * 3 + 1] = rad * Math.cos(pAng) * 0.35 + (R() - 0.5) * 1200;
        arr[idx * 3 + 2] = rad * Math.sin(pAng) * Math.sin(ang);
      },
      () => 2.5 + R() * 4.5,
      (idx) => {
        const palette: [number, number, number][] = [
          [0.0, 0.85, 0.75], // Cyan
          [0.85, 0.60, 0.0],  // Amber Gold
          [0.45, 0.28, 0.85], // Violet
          [0.85, 0.0, 0.28],   // Sovereign Crimson
        ];
        return palette[idx % palette.length];
      },
      () => 0.45 + R() * 0.35,
      2.6,
      true
    );
    demonCore.add(demonEmbers);

    // Balanced Sovereign Ambient Point Lights (Dimmed to preserve crisp visual detail)
    this.demonCoreLight = new THREE.PointLight(0x8b5cf6, 0.45, 180000);
    demonCore.add(this.demonCoreLight);

    const cyanSubLight = new THREE.PointLight(0x00f5d4, 0.30, 150000);
    demonCore.add(cyanSubLight);

    // Multiverse Quantum Stabilization Beams (Direct Energy Tethers to all Realities)
    const beamPositions: number[] = [];
    const realityPositions: THREE.Vector3[] = [];
    realitiesToBuild.forEach((r) => {
      const targetPos = new THREE.Vector3(...r.bubblePos);
      realityPositions.push(targetPos);
      beamPositions.push(0, 0, 0);
      beamPositions.push(targetPos.x, targetPos.y, targetPos.z);
    });

    const beamGeom = new THREE.BufferGeometry();
    beamGeom.setAttribute('position', new THREE.Float32BufferAttribute(beamPositions, 3));
    this.coreStabilizerBeamMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.coreStabilizerBeams = new THREE.LineSegments(beamGeom, this.coreStabilizerBeamMat);
    this.gMultiverse.add(this.coreStabilizerBeams);

    // Quantum Pulse Orbs travelling along the stabilization lines
    this.corePulseOrbs = [];
    realityPositions.forEach((pos, idx) => {
      const orbGeom = new THREE.SphereGeometry(220, 8, 8);
      const orbMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x00f5d4 : 0xf59e0b,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const orb = new THREE.Mesh(orbGeom, orbMat);
      orb.userData = { targetPos: pos, progress: (idx * 0.05) % 1.0 };
      this.gMultiverse.add(orb);
      this.corePulseOrbs.push(orb);
    });

    // Interactive Raycasting Collider for the Core
    this.demonCoreCollider = new THREE.Mesh(
      new THREE.SphereGeometry(32000, 16, 14),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.demonCoreCollider.userData = { isDemonCore: true, id: 'demon-core' };
    demonCore.add(this.demonCoreCollider);
    /* the demon core is retired — the black inner sphere (and everything that
       comes with it) is not part of the multiverse anymore. The assembly stays
       in memory for its uniforms/lights, but never renders, lights, or picks. */
    demonCore.visible = false;
    this.demonCoreLight.intensity = 0;
    this.coreStabilizerBeams.visible = false;
    this.corePulseOrbs.forEach((o) => (o.visible = false));
    this.demonCoreGroup = demonCore;
    this.gMultiverse.add(demonCore);

    /* collect the gWeb materials that carry the Kamui tear vortex — the
       filaments and the node clouds all spiral into the tear together */
    this.gWeb.traverse((obj) => {
      const m = (obj as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
      if (m && m.uniforms && m.uniforms.uVortexS && !this.webVortexMats.includes(m)) this.webVortexMats.push(m);
    });

    this.gMultiverse.add(gPair);
    this.scene.add(this.gMultiverse);

    this.gMultiverse.traverse((obj) => {
      obj.frustumCulled = false;
    });
  }

  public rebuildMultiverse(customRealitiesList?: RealityConfig[]) {
    while (this.gMultiverse.children.length > 0) {
      const obj = this.gMultiverse.children[0];
      this.gMultiverse.remove(obj);
    }
    this.buildMultiverse(customRealitiesList);
  }

  private buildLevels() {
    const R = Math.random;
    /* spiral galaxy */
    const ARMS = 4, WIND = 3.1, RAD = 9200;
    const galaxy = this.makePoints(
      24000,
      (i, a) => {
        const arm = i % ARMS;
        const rr = Math.pow(R(), 0.62) * RAD;
        const ang = (arm / ARMS) * Math.PI * 2 + rr * 0.001 * WIND * 3.2 + (R() - 0.5) * (0.5 - rr / RAD * 0.32);
        const spread = (R() + R() + R() - 1.5) * (260 + rr * 0.09);
        a[i * 3] = Math.cos(ang) * rr + Math.cos(ang + 1.57) * spread;
        a[i * 3 + 1] = (R() + R() - 1) * (110 + rr * 0.012);
        a[i * 3 + 2] = Math.sin(ang) * rr + Math.sin(ang + 1.57) * spread;
      },
      () => 0.6 + R() * 1.3,
      () => {
        const w = R();
        if (w > 0.965) return [1, 0.62, 0.66];
        if (w > 0.8) return [1, 0.88, 0.66];
        const b = 0.55 + R() * 0.4;
        return [b * 0.75, b * 0.84, b];
      },
      () => 0.2 + R() * 0.55, 1.7, false,
    );
    galaxy.rotation.x = 0.5;
    this.gGalaxy.add(galaxy);

    const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(256, [[0, 'rgba(255,244,224,0.95)'], [0.25, 'rgba(255,214,160,0.5)'], [1, 'rgba(255,190,120,0)']]),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    coreGlow.scale.setScalar(4200);
    this.gGalaxy.add(coreGlow);
    this.levelSprites.push({ mat: coreGlow.material as THREE.SpriteMaterial, base: 1, level: 'cluster' });
    this.scene.add(this.gGalaxy);

    /* galaxy cluster */
    const clusterPts = this.makePoints(
      2800,
      (i, a) => {
        const galIdx = Math.floor(i / 40);
        const t = (galIdx / 70) * Math.PI * 2, p = Math.acos(2 * (galIdx / 70) - 1), r = 15000 + (galIdx % 10) * 2100;
        const cx = r * Math.sin(p) * Math.cos(t), cy = r * Math.cos(p) * 0.5, cz = r * Math.sin(p) * Math.sin(t);
        const pr = Math.pow(R(), 1.8) * 1400;
        const pa = R() * Math.PI * 2;
        a[i * 3] = cx + Math.cos(pa) * pr;
        a[i * 3 + 1] = cy + (R() - 0.5) * 400;
        a[i * 3 + 2] = cz + Math.sin(pa) * pr;
      },
      () => 1.2 + R() * 2.2,
      () => { const w = R(); return w > 0.5 ? [1, 0.88, 0.7] : [0.7, 0.85, 1]; },
      () => 0.4 + R() * 0.5,
      1.8,
      true,
    );
    this.gCluster.add(clusterPts);
    this.scene.add(this.gCluster);

    /* supercluster complex (Laniakea & Virgo) — galaxy streams flowing towards the Great Attractor */
    const superPts = this.makePoints(
      4500,
      (i, a) => {
        const streamIdx = Math.floor(i / 150);
        const t = (streamIdx / 30) * Math.PI * 2;
        const p = Math.acos(2 * (streamIdx / 30) - 1);
        const streamDist = 38000 + (streamIdx % 12) * 4500;
        const attractorBias = (i % 150) / 150;
        const basePos = new THREE.Vector3(
          streamDist * Math.sin(p) * Math.cos(t),
          streamDist * Math.cos(p) * 0.45,
          streamDist * Math.sin(p) * Math.sin(t)
        );
        const attractorPos = new THREE.Vector3(42000, 8000, -35000);
        const interp = basePos.lerp(attractorPos, attractorBias * 0.4);
        const jitter = (R() - 0.5) * (1800 + attractorBias * 800);
        a[i * 3] = interp.x + jitter;
        a[i * 3 + 1] = interp.y + (R() - 0.5) * 1200;
        a[i * 3 + 2] = interp.z + jitter;
      },
      () => 1.4 + R() * 2.5,
      (i) => {
        const w = R();
        return w > 0.7 ? [1, 0.85, 0.6] : w > 0.4 ? [0.4, 0.85, 0.9] : [0.75, 0.8, 1];
      },
      () => 0.35 + R() * 0.45,
      2.0,
      true,
    );
    this.gSupercluster.add(superPts);

    const attractorGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(256, [[0, 'rgba(255,220,160,0.9)'], [0.3, 'rgba(255,160,80,0.4)'], [1, 'rgba(0,0,0,0)']]),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    attractorGlow.position.set(42000, 8000, -35000);
    attractorGlow.scale.setScalar(11000);
    this.gSupercluster.add(attractorGlow);
    this.levelSprites.push({ mat: attractorGlow.material as THREE.SpriteMaterial, base: 1, level: 'supercluster' });
    this.scene.add(this.gSupercluster);

    /* cosmic web — hyper-detailed cosmological simulation (IllustrisTNG-grade dark matter & baryonic filaments) */
    const NODES = 240, WEB_R = 135000;
    const nodes: THREE.Vector3[] = [];
    const nodeCol: THREE.Color[] = [];
    for (let i = 0; i < NODES; i++) {
      const t = R() * Math.PI * 2, p = Math.acos(2 * R() - 1);
      // Voronoi-like clustering distribution simulating cosmic voids and dense walls
      const r = WEB_R * (0.18 + 0.82 * Math.pow(R(), 0.65));
      nodes.push(new THREE.Vector3(r * Math.sin(p) * Math.cos(t), r * Math.cos(p) * 0.55, r * Math.sin(p) * Math.sin(t)));
      const w = R();
      nodeCol.push(w > 0.82 ? new THREE.Color('#ffc878') : w > 0.5 ? new THREE.Color('#64dfdf') : new THREE.Color('#83c5be'));
    }
    const edges: [number, number][] = [];
    const degree = new Array(NODES).fill(0);
    nodes.forEach((n, i) => {
      const dists = nodes.map((m, j) => [j, n.distanceTo(m)] as [number, number]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]);
      const k = 3 + Math.floor(R() * 3);
      for (let e = 0; e < k; e++) {
        const j = dists[e][0];
        if (n.distanceTo(nodes[j]) < WEB_R * 0.52) { edges.push([i, j]); degree[i]++; degree[j]++; }
      }
    });

    /* multi-strand curved gravitational filaments sprinkled with galaxies */
    const SAMPLES = 220;
    const webPts = this.makePoints(
      edges.length * SAMPLES,
      (idx, a) => {
        const [i, j] = edges[idx % edges.length];
        const t = Math.floor(idx / edges.length) / SAMPLES;
        const pA = nodes[i], pB = nodes[j];
        // Add organic gravitational curvature (sine curve offset along the segment)
        const curveOffset = Math.sin(t * Math.PI * 3 + i * 0.5) * 1200 + Math.cos(t * Math.PI * 2 + j * 0.3) * 900;
        const n = pA.clone().lerp(pB, t).add(new THREE.Vector3(curveOffset, curveOffset * 0.5, -curveOffset));
        const jit = 450 + n.length() * 0.008;
        a[idx * 3] = n.x + (R() - 0.5) * jit;
        a[idx * 3 + 1] = n.y + (R() - 0.5) * jit;
        a[idx * 3 + 2] = n.z + (R() - 0.5) * jit;
      },
      () => 0.5 + R() * 1.8,
      () => { const w = R(); return w > 0.85 ? [1, 0.88, 0.62] : w > 0.55 ? [0.38, 0.82, 0.95] : [0.58, 0.72, 0.95]; },
      () => 0.22 + R() * 0.5, 1.8, true,
    );
    this.gWeb.add(webPts);

    /* cluster knots at high-degree intersection nodes */
    const knot = this.makePoints(
      NODES,
      (i, a) => { a[i * 3] = nodes[i].x; a[i * 3 + 1] = nodes[i].y; a[i * 3 + 2] = nodes[i].z; },
      (i) => 2.0 + degree[i] * 0.55,
      (i) => { const c = nodeCol[i]; return [c.r, c.g, c.b] as [number, number, number]; },
      () => 0.6 + R() * 0.4, 2.8, true,
    );
    this.gWeb.add(knot);

    /* ultra-detailed filaments with per-vertex color flow */
    const linePos: number[] = []; const lineCol: number[] = [];
    edges.forEach(([i, j]) => {
      linePos.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
      const a = nodeCol[i], b = nodeCol[j];
      lineCol.push(a.r, a.g, a.b, b.r, b.g, b.b);
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
    lg.setAttribute('color', new THREE.Float32BufferAttribute(lineCol, 3));
    /* the web filaments share the Kamui tear vortex — during the jutsu they
       bend, swirl and spiral into the tear point with the same wave */
    this.webLineMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uVortexC: { value: new THREE.Vector3() }, uVortexR: { value: 0 }, uVortexS: { value: 0 }, uVortexT: { value: 0 },
      },
      vertexShader: `
        attribute vec3 position; attribute vec3 color;
        uniform vec3 uVortexC; uniform float uVortexR; uniform float uVortexS; uniform float uVortexT;
        varying vec3 vColor; varying float vFade;
        void main(){
          vColor = color;
          vec3 vp = position;
          float d = distance(vp, uVortexC);
          float infl = uVortexS * smoothstep(uVortexR, uVortexR * 0.1, d);
          if (infl > 0.001) {
            vec3 axis = normalize(vec3(0.18, 1.0, 0.12));
            vec3 dir = vp - uVortexC;
            float a = infl * (5.0 + uVortexT * 3.5);
            vec3 spun = dir * cos(a) + cross(axis, dir) * sin(a) * 1.15;
            vp = uVortexC + spun * (1.0 - infl * 0.5);
            vFade = 1.0 - infl * 0.6;
          } else { vFade = 1.0; }
          gl_Position = projectionMatrix * modelViewMatrix * vec4(vp, 1.0);
        }`,
      fragmentShader: `
        uniform float uOpacity; varying vec3 vColor; varying float vFade;
        void main(){ gl_FragColor = vec4(vColor, uOpacity * vFade); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    });
    this.gWeb.add(new THREE.LineSegments(lg, this.webLineMat));

    /* luminous supercluster cores at major web intersections (e.g. Great Attractor & Perseus-Pisces) */
    const hubs = nodes.map((n, i) => [n, degree[i]] as [THREE.Vector3, number]).sort((a, b) => b[1] - a[1]).slice(0, 35);
    const hubPts = this.makePoints(
      hubs.length * 70,
      (idx, a) => {
        const hubIdx = Math.floor(idx / 70);
        const center = hubs[hubIdx][0];
        const pr = Math.pow(R(), 1.5) * 3200;
        const pa = R() * Math.PI * 2;
        a[idx * 3] = center.x + Math.cos(pa) * pr;
        a[idx * 3 + 1] = center.y + (R() - 0.5) * 1100;
        a[idx * 3 + 2] = center.z + Math.sin(pa) * pr;
      },
      () => 1.6 + R() * 3.0,
      (idx) => { const warm = Math.floor(idx / 70) % 3 === 0; return warm ? [1, 0.9, 0.7] : [0.5, 0.85, 1]; },
      () => 0.55 + R() * 0.45,
      2.4,
      true,
    );
    this.gWeb.add(hubPts);

    this.scene.add(this.gWeb);

    /* anchor beacon — your star, visible across galactic scales */
    this.beacon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(128, [[0, 'rgba(255,240,210,1)'], [0.3, 'rgba(255,205,130,0.5)'], [1, 'rgba(255,180,100,0)']]),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    this.beacon.scale.setScalar(1500);
    this.scene.add(this.beacon);

    [this.gNeighborhood, this.gGalaxy, this.gCluster, this.gSupercluster, this.gWeb].forEach((g) => {
      g.traverse((obj) => { obj.frustumCulled = false; });
    });
  }

  private buildSurface() {
    const geo = new THREE.PlaneGeometry(90, 90, 140, 140);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = cpuFbm(x * 0.055 + 3.1, z * 0.055 + 7.7) * 2.4 + cpuFbm(x * 0.19, z * 0.19) * 0.55;
      const curv = (x * x + z * z) / 2.05;
      pos.setY(i, 1 + h * 0.32 - curv * 0.011);
    }
    geo.computeVertexNormals();
    this.surfaceMat = new THREE.ShaderMaterial({
      uniforms: {
        uDeep: { value: new THREE.Color('#0b2d4d') }, uBase: { value: new THREE.Color('#1f6e52') },
        uHigh: { value: new THREE.Color('#9db88a') }, uIce: { value: new THREE.Color('#eef6ff') },
        uSunDir: { value: new THREE.Vector3(1, 0.2, 0) }, uFog: { value: new THREE.Color('#7fc4e8') },
        uFogDensity: { value: 0.02 },
      },
      vertexShader: terrainVert, fragmentShader: terrainFrag,
    });
    const terrain = new THREE.Mesh(geo, this.surfaceMat);
    this.surface.add(terrain);

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uZenith: { value: new THREE.Color('#0a1e38') }, uHorizon: { value: new THREE.Color('#7fc4e8') },
        uSunDir: { value: new THREE.Vector3(1, 0.2, 0) },
      },
      vertexShader: `varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW,1.0); }`,
      fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 20), this.skyMat);
    this.surface.add(sky);

    const R = Math.random;
    const parts = this.makePoints(
      320,
      (i, a) => { a[i * 3] = (R() - 0.5) * 60; a[i * 3 + 1] = 1 + R() * 7; a[i * 3 + 2] = (R() - 0.5) * 60; },
      () => 0.35 + R() * 0.6, () => [0.85, 0.92, 1] as [number, number, number], () => 0.25 + R() * 0.4, 1.1, true,
    );
    this.surfaceParticlesMat = parts.material as THREE.ShaderMaterial;
    this.surface.add(parts);

    this.surface.visible = false;
    this.scene.add(this.surface);
  }

  /* ------------------------------ interaction ----------------------------- */

  private bindEvents(canvas: HTMLCanvasElement) {
    /* the canvas owns its own pointer stream — immune to overlays & touch scrolling.
       Orbit / pan / zoom physics live in the CameraRig; this file only keeps
       pointer bookkeeping for picking & click detection. */
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => {
      this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      this.pointerMoved = true;
      const pan = e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey);
      if (e.button === 0 || pan) {
        try { canvas.setPointerCapture(e.pointerId); } catch { /* capture unsupported */ }
        this.dragging = true;
        this.rig.beginDrag(pan);
        this.lastPX = e.clientX; this.lastPY = e.clientY;
        this.downX = e.clientX; this.downY = e.clientY; this.downT = performance.now();
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      this.mouseScreenX = e.clientX;
      this.mouseScreenY = e.clientY;
      if (this.dragging) {
        const dx = e.clientX - this.lastPX, dy = e.clientY - this.lastPY;
        this.rig.dragMove(dx, dy);
        this.lastPX = e.clientX; this.lastPY = e.clientY;
      }
      this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      this.pointerMoved = true;
    });
    const endDrag = (e: PointerEvent, allowClick: boolean) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.rig.endDrag();
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      const moved = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
      if (allowClick && moved < 7 && performance.now() - this.downT < 600 && e.button === 0) this.handleClick();
    };
    canvas.addEventListener('pointerup', (e) => endDrag(e, true));
    canvas.addEventListener('pointercancel', (e) => endDrag(e, false));
    canvas.addEventListener('dblclick', (e) => {
      e.preventDefault();
      // Double clicks are handled with precise single/double click discrimination in handleClick()
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      /* a right-drag is a pan, not a menu request */
      if (Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > 8) return;
      const id = this.pick();
      if (id) this.cb.onContext(id, e.clientX, e.clientY);
    });
  }
  private mouseScreenX = 0;
  private mouseScreenY = 0;

  private pick(): string | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const d = this.currentDist();

    // Multiverse stage ONLY — reality bubbles and their orbiting clusters are
    // interactive in the multiverse stage (the web stage has its own picks)
    if (this.cosmicStage === 'multiverse' && this.gMultiverse && this.gMultiverse.visible) {
      this.raycaster.far = 5000000;
      const visibleColliders = this.multiverseColliders;
      const hits = this.raycaster.intersectObjects(visibleColliders, false);
      if (hits.length > 0) {
        const u = hits[0].object.userData;
        if (u.isDemonCore || u.id === 'demon-core') {
          return 'demon-core';
        }
        if (u.isGalaxyCluster && u.clusterData) {
          return `cluster:${u.clusterData.id}:${u.realityId}`;
        }
        if (u.isRealityBubble && u.realityId) {
          return `reality:${u.realityId}`;
        }
      }
      return null;
    }

    // Inside a reality at stellar system scale (d <= 1400) — pick local planets and moons
    if (d <= 1400) {
      this.raycaster.far = d * 3 + 120;
      const hits = this.raycaster.intersectObjects(this.colliderList, false);
      for (const h of hits) {
        const id = h.object.userData.bodyId as string;
        const b = this.bodies.find((x) => x.data.id === id);
        if (b && b.ghost > 0.6) continue;
        return id;
      }
    }
    return null;
  }

  private handleClick() {
    const id = this.pick();
    if (id === 'demon-core') {
      this.triggerKamui();
      if (this.cb.onSelectDemonCore) {
        this.cb.onSelectDemonCore();
      } else {
        this.cb.onActivate('demon-core');
      }
      return;
    }
    if (id && id.startsWith('cluster:')) {
      const parts = id.split(':');
      const clusterId = parts[1];
      const realityId = parts[2];
      const node = this.clusterNodes.find((n) => n.clusterData.id === clusterId && n.realityId === realityId);
      if (node && this.cb.onSelectCluster) {
        this.cb.onSelectCluster(node.clusterData);
      }
      return;
    }
    if (id && id.startsWith('reality:')) {
      const realityId = id.replace('reality:', '');
      const t = performance.now();
      if (t - this.lastClickT < 360 && id === this.lastClickId) {
        if (this.clickTimer) { clearTimeout(this.clickTimer); this.clickTimer = null; }
        this.lastClickT = 0;
        if (this.cb.onDoubleClickReality) {
          this.cb.onDoubleClickReality(realityId);
        }
        return;
      }
      this.lastClickT = t;
      this.lastClickId = id;
      if (this.clickTimer) clearTimeout(this.clickTimer);
      this.clickTimer = setTimeout(() => {
        if (this.cb.onSelectReality) {
          this.cb.onSelectReality(realityId);
        }
        this.clickTimer = null;
      }, 350);
      return;
    }
    const t = performance.now();
    if (t - this.lastClickT < 330 && id === this.lastClickId) {
      if (this.clickTimer) { clearTimeout(this.clickTimer); this.clickTimer = null; }
      this.lastClickT = 0;
      this.activate(id);
      return;
    }
    this.lastClickT = t;
    this.lastClickId = id;
    if (this.clickTimer) clearTimeout(this.clickTimer);
    this.clickTimer = setTimeout(() => {
      this.selectedId = id;
      this.cb.onSelect(id);
      this.clickTimer = null;
    }, 340);
  }

  private activate(id: string | null) {
    if (!id) {
      this.resetView();
      this.cb.onSelect(null);
      return;
    }
    if (id === 'demon-core') {
      this.triggerKamui();
      if (this.cb.onSelectDemonCore) {
        this.cb.onSelectDemonCore();
      } else {
        this.cb.onActivate('demon-core');
      }
      return;
    }
    const b = this.bodies.find((x) => x.data.id === id);
    if (id === 'anchor') {
      this.selectedId = id;
      this.cb.onActivate('anchor');
      return;
    }
    if (!b) return;
    this.selectedId = id;
    this.beginPortal(b);
  }

  /* ------------------------------ camera/api ------------------------------ */

  private currentDist(): number {
    return this.rig.dist();
  }
  private focusBody(): RuntimeBody | null {
    return this.focusId ? this.bodies.find((b) => b.data.id === this.focusId) ?? null : null;
  }

  resetView() {
    this.focusId = null;
    this.realityFocused = false;
    if (this.cosmicStage === 'multiverse') this.beginKamui('toWeb', 0.15);
    else { this.rig.setZoomTarget(0.15); this.rig.setOrbit(null, 1.12); this.rig.clearPan(); }
  }
  zoomToMultiverse() {
    this.focusId = null;
    this.rig.clearPan();
    if (this.cosmicStage === 'web') this.beginKamui('toMultiverse');
    else { this.realityFocused = true; this.rig.setOrbit(null, 1.05); this.rig.setZoomTarget(this.activeReality ? CameraRig.zoomTOf(this.activeReality.bubbleSize * 5.5) : 0.787); }
  }
  zoomToSystem() {
    this.focusId = null;
    this.realityFocused = false;
    if (this.cosmicStage === 'multiverse') this.beginKamui('toWeb', 0.15);
    else { this.rig.setZoomTarget(0.15); this.rig.setOrbit(null, 1.12); this.rig.clearPan(); }
  }
  zoomToHierarchy(stageIndex: number) {
    this.focusId = null;
    this.rig.clearPan();
    if (stageIndex === 0) { this.zoomToMultiverse(); return; }
    if (stageIndex === 1) { // Reality / Universe — multiverse side
      if (this.cosmicStage === 'multiverse') { this.realityFocused = false; this.rig.setZoomTarget(0.88); this.rig.setOrbit(null, 1.05); }
      else this.beginKamui('toMultiverse', 0.88);
      return;
    }
    // stages 2..10 — cosmic web side
    const dial = [0, 0.88, 0.82, 0.76, 0.71, 0.66, 0.6, 0.52, 0.44, 0.33, 0.15][stageIndex] ?? 0.15;
    const phi = stageIndex === 6 ? 1.08 : stageIndex <= 8 ? 1.1 : 1.12;
    if (this.cosmicStage === 'multiverse') this.beginKamui('toWeb', dial);
    else { this.realityFocused = false; this.rig.setZoomTarget(dial); this.rig.setOrbit(null, phi); }
  }
  /** fire the Kamui jutsu — the only bridge between the two stages */
  private beginKamui(dir: 'toMultiverse' | 'toWeb', postWarpZoom: number | null = null) {
    if (this.kamuiFlight !== null) return;
    this.warpDir = dir;
    this.postWarpZoom = postWarpZoom;
    this.kamuiFlight = 0;
    this.kamuiFromZoom = this.rig.zoomT;
    this.grabCooldown = 1.2;
    if (dir === 'toMultiverse') {
      this.realityFocused = false; /* the suck owns the camera until the ejection */
      this.arrivalZoom = this.activeReality ? CameraRig.zoomTOf(this.activeReality.bubbleSize * 5.5) : 0.787;
    }
  }
  zoomIn(step = 0.12) {
    this.rig.nudgeZoom(-step);
  }
  zoomOut(step = 0.12) {
    this.rig.nudgeZoom(step);
  }
  focusOn(id: string) {
    if (id === 'anchor') { this.resetView(); return; }
    this.focusId = id;
    this.realityFocused = false;
    if (this.cosmicStage === 'multiverse') { this.beginKamui('toWeb', 0.16); return; }
    this.rig.clearPan();
    this.rig.setZoomTarget(Math.min(this.rig.tZoomT, 0.16));
  }
  enterCoreMode() {
    this.coreActive = true;
    this.focusId = null;
    this.realityFocused = false;
    if (this.cosmicStage === 'multiverse') this.beginKamui('toWeb', 0.24);
    else this.rig.setZoomTarget(0.24);
  }
  exitCoreMode() {
    this.coreActive = false;
  }
  setPaused(p: boolean) { this.paused = p; }
  get pausedNow() { return this.paused; }
  setRendering(v: boolean) { this.rendering = v; }

  setTemporal(asOf: number | null) {
    this.bodies.forEach((b) => {
      const later = asOf !== null && b.data.createdAt > asOf;
      b.ghostTarget = later ? 1 : 0;
      b.fadeTarget = later ? 0 : 1; /* not yet formed → removed from this moment */
    });
  }

  beginPortal(b: RuntimeBody) {
    if (this.portal.phase !== 'idle') return;
    this.focusId = b.data.id;
    this.realityFocused = false;
    this.cosmicStage = 'web';
    this.rig.setZoomTarget(Math.min(this.rig.tZoomT, 0.1));
    this.portal = {
      phase: 'in', t: 0, fired: false, uv: new THREE.Vector2(0.5, 0.5),
      kind: b.data.kind === 'vault' ? 'vault' : 'diary', bodyId: b.data.id,
    };
    (this.portalPass.uniforms.uColor.value as THREE.Color).set(b.data.kind === 'vault' ? '#6fc2b4' : '#f2c178');
  }
  leavePortal() {
    this.portal.phase = 'out';
    this.portal.t = 1;
    this.portal.fired = false;
  }
  /* called once the destination overlay appears — the distortion settles away */
  finishEntry() {
    this.portal.phase = 'out';
    this.portal.t = Math.max(this.portal.t, 0.62);
  }
  /* public entry used by Core Mode "open world" */
  portalTo(id: string) {
    const b = this.bodies.find((x) => x.data.id === id);
    if (b) {
      this.selectedId = id;
      this.beginPortal(b);
    }
  }

  /* ------------------------- dynamic structure ------------------------- */

  private moonGeo?: THREE.SphereGeometry;
  private moonMat?: THREE.MeshStandardMaterial;
  private static dayKey(t: number) { return Math.floor(t / 86400000); }
  private static streakOf(es: { createdAt: number; updatedAt: number }[]): number {
    if (!es.length) return 0;
    const days = new Set(es.map((e) => UniverseEngine.dayKey(Math.max(e.createdAt, e.updatedAt))));
    let cursor = UniverseEngine.dayKey(Date.now());
    if (!days.has(cursor)) cursor -= 1;
    if (!days.has(cursor)) return 0;
    let n = 0;
    while (days.has(cursor)) { n += 1; cursor -= 1; }
    return n;
  }
  private static daysOf(es: { createdAt: number; updatedAt: number }[]): number {
    return new Set(es.map((e) => UniverseEngine.dayKey(Math.max(e.createdAt, e.updatedAt)))).size;
  }

  /** One moon per diary page. Rebuilds moons so they always match the pages.
      Also drives each world's commitment ring — it brightens with your writing streak. */
  syncMoons(entries: { planetId: string; createdAt: number; updatedAt: number }[]) {
    if (!this.moonGeo) this.moonGeo = new THREE.SphereGeometry(1, 22, 14);
    if (!this.moonMat) this.moonMat = new THREE.MeshStandardMaterial({ color: 0xa8a29a, roughness: 0.95, metalness: 0.02 });
    this.bodies.forEach((b) => {
      if (b.data.kind !== 'planet' && b.data.kind !== 'dwarf') return;
      const planetEntries = entries.filter((e) => e.planetId === b.data.id);

      /* the streak ring — a halo that remembers how regularly you write here.
         Thickness scales with the planet so it's actually visible. */
      if (!b.streakRing) {
        const rm = new THREE.Mesh(
          new THREE.TorusGeometry(b.data.radius * (b.data.rings ? 2.1 : 1.5), Math.max(0.02, b.data.radius * 0.011), 8, 128),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(b.data.palette.atmo), transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
          }),
        );
        rm.rotation.x = Math.PI / 2 - 0.12;
        b.group.add(rm);
        b.streakRing = rm;
      }
      /* store the streak; the render loop animates brightness + breathing */
      b.streakTarget = UniverseEngine.streakOf(planetEntries);
      b.streakDays = UniverseEngine.daysOf(planetEntries);

      const count = Math.min(12, planetEntries.length);
      if (count === b.moons.length) return;
      b.moons.forEach((m) => b.group.remove(m.mesh));
      b.moons = [];
      for (let i = 0; i < count; i++) {
        const seed = hash(i + 1, b.data.id.length + 3);
        const mr = b.data.radius * (0.1 + 0.09 * seed);
        const mesh = new THREE.Mesh(this.moonGeo!, this.moonMat!);
        mesh.scale.setScalar(Math.max(0.09, mr));
        b.group.add(mesh);
        b.moons.push({
          mesh,
          a: b.data.radius * (1.75 + 0.55 * i) + (b.data.rings ? b.data.radius * 1.5 : 0),
          speed: (Math.PI * 2) / (14 + i * 8),
          phase: seed * 6.28,
        });
      }
    });
  }

  /** Diff runtime bodies against the state list — form new worlds, dissolve removed ones. */
  syncBodies(list: CosmicBody[]) {
    const incoming = new Set(list.map((b) => b.id));
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const rb = this.bodies[i];
      if (!incoming.has(rb.data.id)) {
        this.scene.remove(rb.group);
        if (rb.orbitLine) this.scene.remove(rb.orbitLine);
        const ci = this.colliderList.indexOf(rb.collider);
        if (ci >= 0) this.colliderList.splice(ci, 1);
        this.bodies.splice(i, 1);
        if (this.focusId === rb.data.id) this.focusId = null;
      }
    }
    const existing = new Set(this.bodies.map((b) => b.data.id));
    list.forEach((data) => {
      if (!existing.has(data.id)) this.buildBody(data);
    });
  }

  /** Dimensional Barrier — strictly isolates state, star spectrum, corona, and local universe to active reality */
  setReality(reality: RealityConfig) {
    this.activeRealityId = reality.id;
    this.activeReality = reality;

    // 1. Update Anchor Star shader uniforms & corona palette
    const colA = new THREE.Color(reality.colorA);
    const colB = new THREE.Color(reality.colorB);
    const starCol = new THREE.Color(reality.starColor || reality.colorA);

    if (this.starUniforms) {
      if (!this.starUniforms.uColorA) this.starUniforms.uColorA = { value: colA };
      else (this.starUniforms.uColorA.value as THREE.Color).copy(colA);

      if (!this.starUniforms.uColorB) this.starUniforms.uColorB = { value: colB };
      else (this.starUniforms.uColorB.value as THREE.Color).copy(colB);

      if (!this.starUniforms.uCoreColor) this.starUniforms.uCoreColor = { value: starCol };
      else (this.starUniforms.uCoreColor.value as THREE.Color).copy(starCol);
    }

    if (this.coronaMat && this.coronaMat.uniforms) {
      if (!this.coronaMat.uniforms.uColorA) this.coronaMat.uniforms.uColorA = { value: colA };
      else (this.coronaMat.uniforms.uColorA.value as THREE.Color).copy(colA);

      if (!this.coronaMat.uniforms.uColorB) this.coronaMat.uniforms.uColorB = { value: colB };
      else (this.coronaMat.uniforms.uColorB.value as THREE.Color).copy(colB);
    }

    // 2. Re-anchor Active Reality Ring in Multiverse View
    if (this.activeRealityShieldMesh) {
      this.activeRealityShieldMesh.position.set(...reality.bubblePos);
      this.activeRealityShieldMesh.scale.setScalar(reality.bubbleSize);
      this.activeRealityShieldMesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.color.copy(colA);
        }
      });
    }

    // 3. Sync celestial bodies & diary moons strictly for this reality
    this.syncBodies(reality.bodies);
    this.syncMoons(reality.entries);

    // 4. Clean up any invalid selection / focus
    if (this.selectedId && !reality.bodies.some((b) => b.id === this.selectedId) && this.selectedId !== 'anchor') {
      this.selectedId = null;
      this.cb.onSelect(null);
    }
    if (this.focusId && !reality.bodies.some((b) => b.id === this.focusId) && this.focusId !== 'anchor') {
      this.focusId = null;
    }

    // 5. Dimensional Barrier: Hide all elements belonging to other realities (unless in multiverse view)
    if (this.realityGroups) {
      const isMultiverseMode = this.cosmicStage === 'multiverse';
      Object.keys(this.realityGroups).forEach((id) => {
        if (this.realityGroups[id]) {
          this.realityGroups[id].visible = isMultiverseMode || (id === reality.id);
        }
      });
    }
  }

  /** Kamui Space-Time Vortex Distortion — summons demonic vortex around center */
  triggerKamui(targetUv?: THREE.Vector2) {
    if (targetUv) {
      (this.portalPass.uniforms.uCenter.value as THREE.Vector2).copy(targetUv);
    } else if (this.demonCoreGroup) {
      this.demonCoreGroup.getWorldPosition(this._vScratch1).project(this.camera);
      if (this._vScratch1.z < 1) {
        (this.portalPass.uniforms.uCenter.value as THREE.Vector2).set(this._vScratch1.x * 0.5 + 0.5, this._vScratch1.y * 0.5 + 0.5);
      } else {
        (this.portalPass.uniforms.uCenter.value as THREE.Vector2).set(0.5, 0.5);
      }
    } else {
      (this.portalPass.uniforms.uCenter.value as THREE.Vector2).set(0.5, 0.5);
    }
    (this.portalPass.uniforms.uColor.value as THREE.Color).set('#ff1744');
    this.kamuiTimer = 1.0;
  }

  /** Pan and zoom camera to the supreme Multiverse Core {Demon} */
  zoomToDemonCore() {
    this.focusId = null;
    this.realityFocused = false;
    if (this.cosmicStage === 'web') this.beginKamui('toMultiverse', 0.94);
    else this.rig.setZoomTarget(0.94);
    this.rig.setOrbit(0.82, 1.12);
    this.rig.clearPan();
    this.triggerKamui();
  }

  /* -------------------------------- frame --------------------------------- */

  private resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.portalPass.uniforms.uAspect.value = w / h;
  };

  private tick = () => {
    if (this.disposed) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    this.clockT += dt;

    /* time */
    const rate = this.paused ? 0 : 6 * this.timeScale * (this.coreActive ? 0.35 : 1);
    this.simDays += dt * rate;
    if (this.clockT - this.lastDateSent > 0.25) {
      this.lastDateSent = this.clockT;
      this.cb.onSimDate(new Date(this.epoch + this.simDays * DAY).toISOString());
    }

    /* portal timeline */
    const pu = this.portalPass.uniforms;
    pu.uTime.value = this.clockT;
    if (this.portal.phase === 'in') {
      this.portal.t = Math.min(1, this.portal.t + dt / 1.9);
      if (this.portal.t > 0.55 && !this.portal.fired) {
        this.portal.fired = true;
        this.cb.onPortalPeak(this.portal.kind, this.portal.bodyId);
      }
      if (this.portal.t >= 1) this.portal.phase = 'hold';
    } else if (this.portal.phase === 'hold') {
      /* the tear keeps widening to full bloom while the destination arrives */
      this.portal.t = Math.min(1, this.portal.t + dt / 1.6);
    } else if (this.portal.phase === 'out') {
      this.portal.t = Math.max(0, this.portal.t - dt / 1.15);
      if (this.portal.t <= 0) { this.portal.phase = 'idle'; this.cb.onPortalDone(); }
    }
    let ease = this.portal.t * this.portal.t * (3 - 2 * this.portal.t);
    if (this.kamuiTimer > 0) {
      this.kamuiTimer = Math.max(0, this.kamuiTimer - dt * 1.15);
      const kEase = Math.sin(this.kamuiTimer * Math.PI);
      ease = Math.max(ease, kEase * 1.15);
    }
    const portalVal = (this.portal.phase === 'idle' && this.kamuiTimer <= 0) ? 0 : ease;
    const scaleKamuiPulse = Math.sin(this.kamuiErase * Math.PI) * 1.15;
    /* during the Kamui tunnel the screen itself swirls — full-strength
       hyperspace distortion that dies away as you are ejected */
    const tunnelSwirl = this.kamuiWarpFx * 1.35;
    pu.uStrength.value = Math.max(portalVal, scaleKamuiPulse, tunnelSwirl);

    if (this.portal.phase !== 'idle') {
      const b = this.bodies.find((x) => x.data.id === this.portal.bodyId);
      if (b) {
        b.group.getWorldPosition(this._vScratch1).project(this.camera);
        if (this._vScratch1.z < 1) this.portal.uv.set(this._vScratch1.x * 0.5 + 0.5, this._vScratch1.y * 0.5 + 0.5);
      }
      (pu.uCenter.value as THREE.Vector2).copy(this.portal.uv);
    } else {
      (pu.uCenter.value as THREE.Vector2).set(0.5, 0.5);
    }

    // Shift trailing history points for lingering space-time wake
    const trailArr = pu.uTrail.value as THREE.Vector2[];
    const curCenter = pu.uCenter.value as THREE.Vector2;
    trailArr[2].lerp(trailArr[1], 0.45);
    trailArr[1].lerp(trailArr[0], 0.55);
    trailArr[0].lerp(curCenter, 0.70);

    /* cinematic fov kick — during the Kamui tunnel the fov blows wide open
       (the hyperspace stretch), then snaps back at the ejection */
    const targetFov = 50 + ease * 14 - this.coreT * 4 + this.kamuiWarpFx * 28;
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4);
    this.camera.updateProjectionMatrix();

    /* camera — orbit/pan/zoom physics live in the CameraRig */
    this.grabCooldown = Math.max(0, this.grabCooldown - dt);

    /* auto release — zoom out of a focused world and it lets go seamlessly
       (while clamped, rendered distance equals the unclamped base, so the
       hand-off never jumps) */
    const fb = this.focusBody();
    if (fb && this.rig.dist() > 1200 && this.portal.phase === 'idle') {
      this.focusId = null;
      this.grabCooldown = 0.6;
    }

    /* KAMUI — the teleportation jutsu. At the end of the Cosmic Web the
       reality itself tears: the surface bends and swirls with black-hole
       gravity, everything spirals into the vortex, the scene teleports, and
       a second portal opens at your reality's marble that ejects you into
       the multiverse. Fully automatic — the script owns the dial. The same
       jutsu carries you back the other way. */
    if (this.kamuiFlight !== null) {
      /* KAMUI — the jutsu script. One continuous flight, four beats:
         TEAR (reality rips at one point) → SUCK (+z, nearest-first wave)
         → TUNNEL (through the fold) → EJECT (−z, out of the marble). */
      this.kamuiFlight = Math.min(1, this.kamuiFlight + dt / 3.6);
      const t = this.kamuiFlight;
      this.rig.killZoomMomentum();
      this.kamuiWarpFx = Math.sin(Math.min(t, 0.92) / 0.92 * Math.PI);
      if (this.warpDir === 'toMultiverse') {
        if (t < 0.55) {
          /* web side — THE TEAR, THE SUCK, into THE TUNNEL */
          const suck = Math.min(1, t / 0.45);
          const R = 45000 + suck * 480000;
          this.webVortexMats.forEach((m) => {
            (m.uniforms.uVortexC.value as THREE.Vector3).set(0, 0, 0);
            m.uniforms.uVortexR.value = R;
            m.uniforms.uVortexS.value = 1;
            m.uniforms.uVortexT.value = this.clockT;
          });
          this.kamuiSuckDrift = suck * 60000; /* dragged along +z into the vortex */
          if (t < 0.45) this.rig.setZoomTarget(THREE.MathUtils.lerp(0.86, 0.8, Math.min(1, t / 0.45)));
          else this.rig.setZoomTarget(THREE.MathUtils.lerp(0.8, 0.72, Math.min(1, (t - 0.45) / 0.1)));
          if (t >= 0.55 && this.cosmicStage !== 'multiverse') {
            /* through the fold — the multiverse takes over */
            this.cosmicStage = 'multiverse';
            this.realityFocused = true;
            this.kamuiSuckDrift = 0;
            this.kamuiEjectK = 0;
            this.webVortexMats.forEach((m) => { m.uniforms.uVortexS.value = 0; });
          }
        } else {
          /* THE EJECT — spat out of the marble's glass along -z */
          const k = Math.min(1, (t - 0.55) / 0.35);
          this.kamuiEjectK = k;
          const ease = 1 - Math.pow(1 - k, 3);
          this.rig.setZoomTarget(THREE.MathUtils.lerp(0.72, this.arrivalZoom, ease) + 0.05 * Math.sin(k * Math.PI));
        }
      } else {
        /* the return jutsu — the multiverse swirls you back into the web */
        if (t < 0.55) {
          if (this.cosmicStage !== 'multiverse') this.cosmicStage = 'multiverse';
          if (t < 0.45) this.rig.setZoomTarget(THREE.MathUtils.lerp(this.kamuiFromZoom, 0.8, Math.min(1, t / 0.45)));
          else this.rig.setZoomTarget(THREE.MathUtils.lerp(0.8, 0.72, Math.min(1, (t - 0.45) / 0.1)));
        } else {
          if (this.cosmicStage !== 'web') { this.cosmicStage = 'web'; this.realityFocused = false; }
          const k = Math.min(1, (t - 0.55) / 0.35);
          const end = this.postWarpZoom ?? 0.82;
          const ease = 1 - Math.pow(1 - k, 3);
          this.rig.setZoomTarget(THREE.MathUtils.lerp(0.72, end, ease) + 0.05 * Math.sin(k * Math.PI));
        }
      }
      if (t >= 1) {
        this.kamuiFlight = null;
        this.kamuiEjectK = 0;
        this.kamuiSuckDrift = 0;
        if (this.postWarpZoom !== null) { this.rig.setZoomTarget(this.postWarpZoom); this.postWarpZoom = null; }
      }
    } else {
      /* stage edges — the dial can never cross between the stages */
      if (this.cosmicStage === 'web' && this.rig.tZoomT > 0.855) this.rig.setZoomTarget(0.86);
      /* the web's edge — pulling beyond it is what tears reality open */
      if (
        this.cosmicStage === 'web' && this.rig.tZoomT >= 0.855 && this.rig.zoomVelocity > 0.05
        && this.grabCooldown <= 0 && !this.dragging && this.portal.phase === 'idle'
        && !this.focusId && !this.coreActive && this.activeReality
      ) {
        /* the tear begins */
        this.realityFocused = false;
        this.warpDir = 'toMultiverse';
        this.kamuiFlight = 0;
        this.kamuiFromZoom = this.rig.zoomT;
        this.arrivalZoom = this.activeReality ? CameraRig.zoomTOf(this.activeReality.bubbleSize * 5.5) : 0.787;
        this.grabCooldown = 1.2;
      }
      if (this.cosmicStage === 'multiverse') {
        if (this.realityFocused && this.rig.tZoomT < 0.787) this.rig.setZoomTarget(0.787);
        if (this.realityFocused && this.rig.atFocusMax && this.rig.zoomTrend > 0) {
          this.realityFocused = false;
          this.grabCooldown = 0.6;
        }
        if (this.rig.tZoomT < 0.8) this.rig.setZoomTarget(0.8);
        /* the return tear — pushed through the multiverse's floor */
        if (
          this.rig.tZoomT <= 0.802 && this.rig.zoomVelocity < -0.05 && this.grabCooldown <= 0
          && !this.dragging && this.portal.phase === 'idle'
        ) {
          this.realityFocused = false;
          this.warpDir = 'toWeb';
          this.kamuiFlight = 0;
          this.kamuiFromZoom = this.rig.zoomT;
          this.grabCooldown = 1.2;
        }
      }
    }

    /* auto engage — ONLY while actively zooming in: diving toward a world
       centers it. A plain rotation or pan must never yank the camera onto a
       random body (that made every other world leave the frame). */
    if (
      !this.focusId && !this.realityFocused && this.kamuiFlight === null && this.cosmicStage === 'web' && !this.coreActive && this.rig.dist() < 150 && this.portal.phase === 'idle'
      && this.grabCooldown <= 0 && !this.dragging && this.rig.zoomTrend < -0.008
    ) {
      let best: RuntimeBody | null = null, bestScore = Infinity;
      this.camera.getWorldDirection(this._vScratch1);
      for (let i = 0; i < this.bodies.length; i++) {
        const b = this.bodies[i];
        if (b.data.kind === 'nebula' || b.data.kind === 'hole') continue;
        b.group.getWorldPosition(this._vScratch2);
        this._vScratch3.copy(this._vScratch2).sub(this.camera.position);
        const dCam = this._vScratch3.length();
        const ang = this._vScratch3.normalize().angleTo(this._vScratch1);
        if (ang < 0.38 && dCam < 300 && dCam * (1 + ang) < bestScore) {
          best = b;
          bestScore = dCam * (1 + ang);
        }
      }
      if (best) this.focusId = (best as RuntimeBody).data.id;
    }

    const activeFb = this.focusBody();
    let focusMin: number | undefined, focusMax: number | undefined;
    if (this.realityFocused && this.activeReality) {
      /* orbit the active reality's marble — framed just outside its glass.
         During the eject the focus sweeps along -z, dragging the camera out
         of the marble with it (the throw of the jutsu). */
      this._vFocusScratch.set(...this.activeReality.bubblePos);
      if (this.kamuiEjectK > 0.001 && this.kamuiEjectK < 1) {
        this._vFocusScratch.z -= this.activeReality.bubbleSize * 2.0 * (1 - this.kamuiEjectK);
      }
      focusMin = this.activeReality.bubbleSize * 3.1;  /* just outside the glass */
      focusMax = 520000;                               /* release point on zoom-out */
    } else if (activeFb) {
      activeFb.group.getWorldPosition(this._vFocusScratch);
    } else {
      /* during the suck the focus drifts along +z into the vortex */
      this._vFocusScratch.set(0, 0, this.kamuiSuckDrift);
    }
    this.rig.update(dt, {
      focus: this._vFocusScratch,
      focused: !!activeFb || this.realityFocused,
      focusRadius: activeFb ? activeFb.data.radius : (this.activeReality ? this.activeReality.bubbleSize * 2.6 : 6),
      portalEase: ease,
      focusMin,
      focusMax,
    });

    this.updateBodies(dt);
    this.updateMeteors(dt);
    this.updateLevels(dt);
    this.updateSurface(dt);
    this.updateCore(dt);
    this.updateHover();

    if (this.rendering) this.composer.render();
  };
  private clock = new THREE.Clock();

  private updateBodies(dt: number) {
    const sysW = 1 - smoothstep(430, 860, this.currentDist());

    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      const o = b.data.orbit;
      const phys = calculatePhysics(b.data, this.simDays);
      const pos = calculateKeplerPosition(o.a, phys.eccentricity, o.phase, o.incl, this.simDays, o.speed || 0.01);
      b.group.position.set(pos.x, pos.y, pos.z);
      b.group.getWorldPosition(this._vScratch2);
      this._vScratch1.copy(this._vScratch2).multiplyScalar(-1).normalize();

      /* ghost + fade lerps */
      b.ghost += (b.ghostTarget - b.ghost) * Math.min(1, dt * 3);
      b.fade += (b.fadeTarget - b.fade) * Math.min(1, dt * 3);

      /* hover channel ONLY — the orbit line must never be pinned by a click */
      b.hoverT += ((this.hoveredId === b.data.id ? 1 : 0) - b.hoverT) * Math.min(1, dt * 8);

      if (b.mat) {
        if (b.mat.uniforms.uSunDir) (b.mat.uniforms.uSunDir.value as THREE.Vector3).copy(this._vScratch1);
        if (b.mat.uniforms.uTime) b.mat.uniforms.uTime.value = this.clockT;
        if (b.mat.uniforms.uGhost) b.mat.uniforms.uGhost.value = b.ghost;
        if (b.mat.uniforms.uFade) b.mat.uniforms.uFade.value = b.fade * sysW;
        if (b.mat.uniforms.uCamLocalP && b.data.kind === 'nebula') {
          this._vScratch3.copy(this.camera.position);
          b.group.worldToLocal(this._vScratch3);
          (b.mat.uniforms.uCamLocalP.value as THREE.Vector3).copy(this._vScratch3);
        }
      }
      b.extras?.forEach((m) => { m.uniforms.uTime.value = this.clockT; });

      /* axial rotation — the surface turns under the fixed sun */
      if (b.spinMesh && b.spinRate) b.spinMesh.rotation.y += dt * b.spinRate;
      if (b.cloudMesh && b.cloudSpinRate) b.cloudMesh.rotation.y += dt * b.cloudSpinRate;

      if (b.cloudMat) {
        b.cloudMat.uniforms.uTime.value = this.clockT;
        (b.cloudMat.uniforms.uSunDir.value as THREE.Vector3).copy(this._vScratch1);
        b.cloudMat.uniforms.uFade.value = b.fade * sysW * (1 - b.ghost);
        b.cloudMat.visible = b.cloudMat.uniforms.uFade.value > 0.02;
      }
      if (b.atmo) {
        ((b.atmo.material as THREE.ShaderMaterial).uniforms.uSunDir.value as THREE.Vector3).copy(this._vScratch1);
        b.atmo.visible = b.fade * sysW * (1 - b.ghost) > 0.05;
      }
      if (b.ringMat) {
        b.ringMesh!.getWorldQuaternion(this._qScratch).invert();
        (b.ringMat.uniforms.uSunLocal.value as THREE.Vector3).copy(this._vScratch1).applyQuaternion(this._qScratch);
        b.ringMesh!.visible = b.fade * sysW * (1 - b.ghost * 0.85) > 0.05;
      }

      b.moons.forEach((m) => {
        const ma = m.phase + this.simDays * m.speed;
        m.mesh.position.set(Math.cos(ma) * m.a, Math.sin(ma * 0.7) * m.a * 0.12, Math.sin(ma) * m.a);
        m.mesh.visible = b.fade * sysW * (1 - b.ghost) > 0.05;
      });

      if (b.orbitLine) {
        /* the orbit ring is driven ONLY by hover. Gate on .visible too so an
           opacity-0 line can never render — it must vanish the instant the
           pointer leaves the world. Selection pulses the body, never the ring. */
        const op = b.hoverT * sysW * 0.22;
        (b.orbitLine.material as THREE.LineBasicMaterial).opacity = op;
        b.orbitLine.visible = op > 0.01;
      }

      const selected = this.selectedId === b.data.id ? 1 : 0;
      const pulse = selected ? 1 + 0.025 * Math.sin(this.clockT * 3.2) : 1;
      b.group.scale.setScalar((1 + Math.max(b.hoverT, selected * 0.5) * 0.035) * pulse * (1 - b.ghost * 0.35));
      b.group.visible = b.fade * sysW > 0.03;

      if (b.streakRing) {
        const mat = b.streakRing.material as THREE.MeshBasicMaterial;
        const st = b.streakTarget ?? 0;
        const days = b.streakDays ?? 0;
        /* alive whenever this world has been written on; a live streak makes it
           distinctly brighter, and total devotion adds a warm base glow */
        const target = days > 0 ? Math.min(0.95, 0.22 + 0.16 * st + 0.02 * days) : 0;
        mat.opacity += (target - mat.opacity) * Math.min(1, dt * 3.5);
        /* breathe + shimmer so it never reads as a static decal */
        const breath = 1 + 0.022 * Math.sin(this.clockT * 1.8 + b.data.id.length);
        mat.opacity = Math.max(0, mat.opacity + 0.05 * target * Math.sin(this.clockT * 3.1));
        b.streakRing.scale.setScalar(breath);
        b.streakRing.rotation.z += dt * 0.25;
        b.streakRing.visible = mat.opacity > 0.02 && b.fade * sysW > 0.03;
      }

      if (b.data.kind === 'vault' && b.group.userData.spin) {
        const s = b.group.userData.spin as { core: THREE.Mesh; shell: THREE.Object3D; r1: THREE.Mesh; r2: THREE.Mesh };
        s.core.rotation.y += dt * 0.25; s.shell.rotation.z -= dt * 0.05;
        s.r1.rotation.z += dt * 0.3; s.r2.rotation.x += dt * 0.22;
      }
    }

    /* anchor — axial spin & core interface ember lerp */
    this.anchorGroup.rotation.y += dt * 0.08; /* Axial rotation around polar axis */
    const starMesh = this.anchorGroup.userData.starMesh as THREE.Mesh;
    if (starMesh) starMesh.rotation.y += dt * 0.15;

    this.starUniforms.uTime.value = this.clockT;
    const boostTarget = 1 - this.coreT * 0.42;
    this.starUniforms.uBoost.value += (boostTarget - this.starUniforms.uBoost.value) * Math.min(1, dt * 3);
    this.bloomPass.strength = 0.18 - this.coreT * 0.08;

    const haloA = this.anchorGroup.userData.haloA as THREE.Points;
    const haloB = this.anchorGroup.userData.haloB as THREE.Points;
    haloA.rotation.y += dt * 0.05;
    haloB.rotation.y -= dt * 0.038;
    (haloA.material as THREE.ShaderMaterial).uniforms.uTime.value = this.clockT;
    (haloB.material as THREE.ShaderMaterial).uniforms.uTime.value = this.clockT;
    (haloA.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 1 - this.coreT * 0.5;
    (haloB.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 1 - this.coreT * 0.5;

    /* corona dims with the star while the core is open */
    this.coronaMat.uniforms.uTime.value = this.clockT;
    this.coronaMat.uniforms.uBoost.value = (1 - this.coreT * 0.55) * (0.92 + 0.08 * Math.sin(this.clockT * 0.8));

    this.anchorGroup.visible = sysW > 0.02;
    this.belt.visible = sysW > 0.02;
    this.belt.rotation.y = this.simDays * 0.0016;

    this.asteroids3D.forEach((a) => {
      a.mesh.rotation.x += dt * a.spin.x;
      a.mesh.rotation.y += dt * a.spin.y;
      a.mesh.rotation.z += dt * a.spin.z;
      a.mesh.visible = sysW > 0.02;
    });
  }

  private updateLevels(dt = 0) {
    const d = this.currentDist();
    const camLen = this.camera.position.length() + 1;
    const wins = {
      neighborhood: windowFn(d, 260, 750, 4800, 12000),
      galaxy: windowFn(d, 3500, 7500, 38000, 250000),
      cluster: windowFn(d, 25000, 42000, 95000, 350000),
      supercluster: windowFn(d, 70000, 100000, 250000, 600000),
      web: windowFn(d, 180000, 280000, 650000, 1200000),
      multiverse: windowFn(d, 340000, 700000, 1e12, 1e12),
    };
    /* Cosmic Web stage — past dial 0.82 the view resolves to PURE web: the
       inner layers (supercluster, clusters, galaxy) hand their weight over
       to the web so nothing of them bleeds into the cosmic web stage. */
    const pureK = THREE.MathUtils.smoothstep(this.rig.tZoomT, 0.82, 0.86);
    if (pureK > 0) {
      wins.web = Math.max(wins.web, pureK);
      wins.supercluster *= 1 - pureK;
      wins.cluster *= 1 - pureK;
      wins.galaxy *= 1 - pureK;
      wins.neighborhood *= 1 - pureK;
    }

    /* the two stages never share the screen — the warp swaps them wholesale */
    if (this.cosmicStage === 'multiverse') {
      wins.neighborhood = 0; wins.galaxy = 0; wins.cluster = 0;
      wins.supercluster = 0; wins.web = 0; wins.multiverse = 1;
    } else {
      wins.multiverse = 0;
    }
    this.gNeighborhood.visible = wins.neighborhood > 0.01;
    this.gGalaxy.visible = wins.galaxy > 0.01;
    this.gCluster.visible = wins.cluster > 0.01;
    this.gSupercluster.visible = wins.supercluster > 0.01;
    this.gWeb.visible = wins.web > 0.01;
    this.gMultiverse.visible = wins.multiverse > 0.01;
    const isMultiverseMode = wins.multiverse > 0.01;
    if (this.realityGroups) {
      Object.keys(this.realityGroups).forEach((id) => {
        if (this.realityGroups[id]) {
          this.realityGroups[id].visible = isMultiverseMode || (id === this.activeRealityId);
        }
      });
    }
    const kamuiTear = Math.sin(this.kamuiErase * Math.PI) * 1.35;
    const portalTear = this.portal.phase !== 'idle' ? Math.sin(this.portal.t * Math.PI) * 1.5 : 0;
    const baseTear = Math.max(kamuiTear, portalTear);

    this.multiverseMats.forEach((m) => {
      m.uniforms.uTime.value = this.clockT;
      const isHover = this.hoveredId && this.hoveredId.startsWith('reality:');
      const tVal = Math.max(baseTear, isHover ? 0.35 + 0.15 * Math.sin(this.clockT * 3.5) : 0);
      if (m.uniforms.uTearStrength) m.uniforms.uTearStrength.value = tVal;
    });
    if (this.demonCoreMat) {
      this.demonCoreMat.uniforms.uTime.value = this.clockT;
      this.demonCoreMat.uniforms.uHover.value = (this.hoveredId === 'demon-core' ? 1.0 : 0.0);
      const isCoreHover = this.hoveredId === 'demon-core';
      const cTVal = Math.max(baseTear, isCoreHover ? 0.65 + 0.25 * Math.sin(this.clockT * 4.0) : 0);
      if (this.demonCoreMat.uniforms.uTearStrength) this.demonCoreMat.uniforms.uTearStrength.value = cTVal;
    }
    if (this.demonCoreGroup) {
      this.demonCoreGroup.rotation.y += 0.005;

      // Inner golden hyper-octahedron counter-rotation
      if (this.demonCoreInnerGeom) {
        this.demonCoreInnerGeom.rotation.x -= 0.014;
        this.demonCoreInnerGeom.rotation.y += 0.022;
        this.demonCoreInnerGeom.rotation.z += 0.008;
      }

      // 4D Tesseract hypercube matrix rotation
      if (this.demonCoreTesseract) {
        this.demonCoreTesseract.rotation.x += 0.016;
        this.demonCoreTesseract.rotation.y += 0.024;
        this.demonCoreTesseract.rotation.z -= 0.012;
      }

      // Relativistic polar plasma jets flickering / pulsation
      this.demonCoreJets.forEach((jet, idx) => {
        const jetFlicker = 1.0 + 0.18 * Math.sin(this.clockT * 12.0 + idx * Math.PI);
        const jetLength = 1.0 + 0.12 * Math.sin(this.clockT * 6.0 + idx * 2.0);
        jet.scale.set(jetFlicker, jetLength, jetFlicker);
      });

      // 4 Gyroscopic armillary stabilizer rings
      this.demonCoreRings.forEach((ring, idx) => {
        const dir = idx % 2 === 0 ? 1 : -1;
        ring.rotation.z += dir * (0.008 + idx * 0.004);
        ring.rotation.y += (idx % 3 === 0 ? 1 : -1) * 0.006;
        ring.rotation.x += 0.003;
      });

      // Eccentric Tachyon Satellite Probes Orbiting the Core
      this.demonCoreTachyonNodes.forEach((node) => {
        const u = node.userData;
        const a = u.phase + this.clockT * u.speed;
        const tx = Math.cos(a) * u.radius;
        const ty = Math.sin(a) * u.radius * Math.sin(u.incl);
        const tz = Math.sin(a) * u.radius * Math.cos(u.incl);
        node.position.set(tx, ty, tz);
        node.rotation.x += 0.02;
        node.rotation.y += 0.03;
      });

      // 12 Sovereign Monolith Spires (Stabilizer field breathing)
      this.demonCoreSpires.forEach((spire, idx) => {
        const pulse = 1.0 + 0.12 * Math.sin(this.clockT * 2.4 + idx * 0.52);
        spire.scale.set(pulse, 1.0 + 0.08 * Math.sin(this.clockT * 2.0 + idx * 0.3), pulse);
      });

      // Multidimensional Spacetime Gyroscopic Pulse Waves
      this.demonCorePulseRings.forEach((pMesh) => {
        pMesh.userData.phase = (pMesh.userData.phase + 0.006) % 1.0;
        const ph = pMesh.userData.phase as number;
        const currentScaleCrit = 1.0 + ph * 3.2;
        pMesh.scale.set(currentScaleCrit, currentScaleCrit, currentScaleCrit);
        const pMat = pMesh.material as THREE.MeshBasicMaterial;
        pMat.opacity = Math.sin(ph * Math.PI) * 0.55;
        const rotSpd = (pMesh.userData.rotSpeed as number) || 0.005;
        pMesh.rotation.z += rotSpd;
        pMesh.rotation.x += rotSpd * 0.7;
        pMesh.rotation.y += rotSpd * 0.5;
      });
    }

    // Multiverse Stabilization Beams & Traveling Quantum Flux Orbs
    if (this.coreStabilizerBeamMat && wins.multiverse > 0.01) {
      const isHoverCore = this.hoveredId === 'demon-core';
      this.coreStabilizerBeamMat.opacity = (isHoverCore ? 0.85 : 0.35) + 0.1 * Math.sin(this.clockT * 3.0);
    }

    if (this.corePulseOrbs && wins.multiverse > 0.01) {
      this.corePulseOrbs.forEach((orb) => {
        orb.userData.progress = (orb.userData.progress + 0.0035) % 1.0;
        const prog = orb.userData.progress as number;
        const targetPos = orb.userData.targetPos as THREE.Vector3;
        // Interpolate position from Core (0, 0, 0) to target reality position
        orb.position.set(
          targetPos.x * prog,
          targetPos.y * prog,
          targetPos.z * prog
        );
        const orbMat = orb.material as THREE.MeshBasicMaterial;
        orbMat.opacity = Math.sin(prog * Math.PI) * 0.95;
        const orbScale = 1.0 + 0.4 * Math.sin(this.clockT * 4.0 + prog * 6.28);
        orb.scale.set(orbScale, orbScale, orbScale);
      });
    }
    if (this.exoplanetPlateMat) this.exoplanetPlateMat.uniforms.uTime.value = this.clockT;
    (this.webLineMat.uniforms.uOpacity as { value: number }).value = wins.web * 0.17;
    this.gWeb.rotation.y = this.clockT * 0.0017;
    this.gSupercluster.rotation.y = this.clockT * 0.0011;
    this.gMultiverse.rotation.y = this.clockT * 0.0008;

    if (this.activeRealityShieldMesh && wins.multiverse > 0.01) {
      this.activeRealityShieldMesh.rotation.y += 0.012;
      this.activeRealityShieldMesh.rotation.z += 0.006;
    }

    /* Pocket Cosmos Marbles — each reality's galaxy turns inside its glass
       shell, shimmering in the reality's two colors */
    this.realityMarbles.forEach((m) => {
      if (wins.multiverse > 0.01 || wins.web > 0.01) {
        m.spiral.rotation.y += dt * m.speed;
        m.glassMat.uniforms.uTime.value = this.clockT;
      }
    });

    /* Update orbiting Galaxy Cluster / Galaxy Group positions and swirling galaxies */
    this.clusterNodes.forEach((node) => {
      const a = node.phase + this.clockT * node.orbitSpeed;
      const ox = Math.cos(a) * node.orbitRadius;
      const oy = Math.sin(a) * node.orbitRadius * Math.sin(node.orbitIncl);
      const oz = Math.sin(a) * node.orbitRadius * Math.cos(node.orbitIncl);
      node.group.position.set(node.centerPos.x + ox, node.centerPos.y + oy, node.centerPos.z + oz);
      
      // Apply subtle rotational velocity to the galaxy cluster itself
      node.group.rotation.y += 0.002;
      node.group.rotation.x += 0.001;
      
      node.subGalaxiesGroup.rotation.y += 0.006;
      const isHovered = this.hoveredId === `cluster:${node.clusterData.id}:${node.realityId}`;
      const scaleMult = isHovered ? 1.45 : 1.0;
      node.group.scale.setScalar(scaleMult);
    });

    // Kamui Spacetime Singularity Vortex — the jutsu's signature. It engulfs
    // the camera while the reality bends and swirls (black-hole pull), holds
    // through the teleport, then releases at the ejection. Roaming either
    // stage never replays it — only the flight drives it.
    let targetKamui = 0;
    if (this.kamuiFlight !== null) {
      const t = this.kamuiFlight;
      targetKamui = t < 0.35 ? t / 0.35 : t < 0.72 ? 1 : Math.max(0, 1 - (t - 0.72) / 0.28);
    }
    this.kamuiErase = THREE.MathUtils.damp(this.kamuiErase, targetKamui, 6, Math.max(dt, 0.001));

    if (this.backdropMat) {
      this.backdropMat.uniforms.uKamuiErase.value = this.kamuiErase;
      this.backdropMat.uniforms.uTime.value = this.clockT;
      this.camera.getWorldDirection(this._vDirScratch);
      (this.backdropMat.uniforms.uVortexDir.value as THREE.Vector3).copy(this._vDirScratch);
    }
    if (this.giantMultiverseBoundaryMat) {
      this.giantMultiverseBoundaryMat.uniforms.uTime.value = this.clockT;
      /* the reality surface itself bends and swirls with the warp — the
         flight's engulfment drives the boundary vortex at full strength */
      const boundaryKamui = Math.max(this.kamuiErase, wins.multiverse > 0.01 ? (1.0 - wins.multiverse) * 0.5 : 0);
      this.giantMultiverseBoundaryMat.uniforms.uKamuiErase.value = boundaryKamui;
      this.camera.getWorldDirection(this._vDirScratch);
      (this.giantMultiverseBoundaryMat.uniforms.uVortexDir.value as THREE.Vector3).copy(this._vDirScratch);
    }
    /* the universe sky (backdrop dome, far stars, deep nebulae) belongs
       INSIDE the reality sphere only — it never appears in the multiverse */
    const skyVisible = this.cosmicStage !== 'multiverse';
    if (this.skyDomeMesh) {
      this.skyDomeMesh.visible = skyVisible && this.kamuiErase < 0.998;
    }
    if (this.farStarsPoints) {
      const farMat = this.farStarsPoints.material as THREE.ShaderMaterial;
      if (farMat && farMat.uniforms && farMat.uniforms.uOpacity) {
        farMat.uniforms.uOpacity.value = skyVisible ? Math.max(0, 1 - this.kamuiErase) : 0;
      }
    }
    this.skyNebulae.forEach((m) => {
      if (m.uniforms && m.uniforms.uOpacity) {
        m.uniforms.uOpacity.value = skyVisible ? Math.max(0, 1 - this.kamuiErase) : 0;
      }
      m.uniforms.uTime.value = this.clockT * 0.4;
    });

    this.clouds.forEach((c) => {
      c.mat.uniforms.uScale.value = (c.px * camLen) / 240;
      c.mat.uniforms.uTime.value = this.clockT;
    });
    /* distance-compensated sizing for level point clouds — the raw 260/z
       attenuation collapses every point to the 1.5px shader floor beyond the
       home system, erasing the galaxy spiral, cluster fields and cosmic web
       at exactly the stages where they should shine. Scaling uScale with
       altitude keeps them at their designed screen size (~2.9× aSize at the
       cloud's center distance; intra-cloud perspective is preserved).
       Modes: 'standard' = the five inner levels, 'multiverse' = already dense
       at its own scale (kept at natural sizing), 'marble' = pocket-cosmos
       spirals inside the glass marbles (~2× aSize at marble viewing range). */
    const lvlScale = camLen / 90;
    this.levelPointMats.forEach((m) => {
      const mode = m.userData.pointMode as string;
      m.uniforms.uScale.value = mode === 'marble' ? camLen / 130 : mode === 'multiverse' ? 1 : lvlScale;
    });
    if (this.giantMultiverseBoundaryMat) {
      this.giantMultiverseBoundaryMat.uniforms.uTime.value = this.clockT;
    }
    this.setLevelOpacity(this.gNeighborhood, wins.neighborhood);
    this.setLevelOpacity(this.gGalaxy, wins.galaxy);
    this.setLevelOpacity(this.gCluster, wins.cluster);
    this.setLevelOpacity(this.gSupercluster, wins.supercluster);
    this.setLevelOpacity(this.gWeb, wins.web);
    this.setLevelOpacity(this.gMultiverse, wins.multiverse);

    this.levelSprites.forEach((s) => {
      let w = 1;
      if (s.level === 'neighborhood') w = wins.neighborhood;
      if (s.level === 'cluster') w = Math.max(wins.cluster, wins.galaxy * 0.9);
      if (s.level === 'supercluster') w = wins.supercluster;
      if (s.level === 'web') w = wins.web;
      if (s.level === 'multiverse') w = wins.multiverse;
      s.mat.opacity = s.base * w;
    });

    const beaconW = windowFn(d, 2600, 7000, 64000, 100000);
    this.beacon.visible = beaconW > 0.01;
    (this.beacon.material as THREE.SpriteMaterial).opacity = beaconW;
    this.beacon.scale.setScalar(camLen * 0.011);
    this.gGalaxy.rotation.y = this.clockT * 0.0022;

    /* Scale label covering exact 11-stage cosmological hierarchy:
       STELLAR SYSTEM → STAR-FORMING REGION → SPIRAL ARM → GALACTIC REGION → GALAXY → GALAXY CLUSTER / GALAXY GROUP → SUPERCLUSTER → SUPERCLUSTER COMPLEX → COSMIC WEB → REALITY / UNIVERSE → MULTIVERSE */
    let label = 'STELLAR SYSTEM';
    const fb = this.focusBody();
    if (fb && this.surfaceBlend > 0.5) label = `SURFACE · ${fb.data.name.toUpperCase()}`;
    else if (this.cosmicStage === 'multiverse') label = this.realityFocused ? 'MULTIVERSE' : 'REALITY / UNIVERSE';
    else if (d < 260) label = fb ? `APPROACH · ${fb.data.name.toUpperCase()}` : 'STELLAR SYSTEM';
    else if (d < 1200) label = 'STAR-FORMING REGION';
    else if (d < 4500) label = 'SPIRAL ARM';
    else if (d < 14000) label = 'GALACTIC REGION';
    else if (d < 38000) label = 'GALAXY';
    else if (d < 85000) label = 'GALAXY CLUSTER / GALAXY GROUP';
    else if (d < 160000) label = 'SUPERCLUSTER';
    else if (d < 320000) label = 'SUPERCLUSTER COMPLEX';
    else if (d < 650000) label = 'COSMIC WEB';
    else if (d < 1200000) label = 'REALITY / UNIVERSE';
    else label = 'MULTIVERSE';
    if (label !== this.lastLabel) {
      this.lastLabel = label;
      this.cb.onScaleLabel(label);
    }
  }

  private setLevelOpacity(group: THREE.Group, w: number) {
    const isVis = w > 0.001;
    group.visible = isVis;
    if (!isVis) return;
    group.traverse((obj) => {
      if (obj instanceof THREE.Points) {
        const m = obj.material as THREE.ShaderMaterial;
        if (m.uniforms && m.uniforms.uOpacity) m.uniforms.uOpacity.value = w;
      }
    });
  }

  private updateSurface(dt: number) {
    const fb = this.focusBody();
    let s = 0;
    if (fb && (fb.data.kind === 'planet' || fb.data.kind === 'dwarf')) {
      const dist = this.currentDist();
      const r = fb.data.radius;
      s = 1 - smoothstep(r * 1.9, r * 2.7, dist);
    }
    this.surfaceBlend += (s - this.surfaceBlend) * Math.min(1, dt * 4);
    const active = this.surfaceBlend > 0.02;
    this.surface.visible = active;
    if (!active) { this.surfaceLocked = false; return; }
    if (fb) {
      if (!this.surfaceLocked && this.surfaceBlend > 0.06) {
        this._vScratch1.copy(this.camera.position).sub(fb.group.position).normalize();
        this.surfaceQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this._vScratch1);
        this.surfaceLocked = true;
      }
      this.surface.position.copy(fb.group.position);
      this.surface.quaternion.slerp(this.surfaceQuat, Math.min(1, dt * 6));
      this.surface.scale.setScalar(fb.data.radius);
      const p = fb.data.palette;
      (this.surfaceMat.uniforms.uDeep.value as THREE.Color).set(p.deep);
      (this.surfaceMat.uniforms.uBase.value as THREE.Color).set(p.base);
      (this.surfaceMat.uniforms.uHigh.value as THREE.Color).set(p.high);
      (this.surfaceMat.uniforms.uIce.value as THREE.Color).set(p.ice);
      (this.skyMat.uniforms.uHorizon.value as THREE.Color).set(p.atmo);
      (this.skyMat.uniforms.uZenith.value as THREE.Color).set(p.deep);
      /* world-space sun direction (terrain normals are world-space) */
      this._vScratch2.copy(fb.group.position).multiplyScalar(-1).normalize();
      (this.surfaceMat.uniforms.uSunDir.value as THREE.Vector3).copy(this._vScratch2);
      (this.skyMat.uniforms.uSunDir.value as THREE.Vector3).copy(this._vScratch2);
      this.surfaceMat.uniforms.uFogDensity.value = 0.03 / fb.data.radius;
      (this.surfaceMat.uniforms.uFog.value as THREE.Color).set(p.atmo).multiplyScalar(0.75);
      this.surfaceParticlesMat.uniforms.uOpacity.value = this.surfaceBlend;
    }
    /* hide planet mesh under surface */
    if (fb && fb.mat && fb.mat.uniforms.uFade) {
      fb.mat.uniforms.uFade.value = Math.min(fb.mat.uniforms.uFade.value, 1 - this.surfaceBlend);
    }
  }

  private updateCore(dt: number) {
    const target = this.coreActive ? 1 : 0;
    this.coreT += (target - this.coreT) * Math.min(1, dt * 2.6);
    this.connectionMat.opacity = this.coreT * 0.3;
    if (this.coreT > 0.02) {
      const requiredFloats = this.connections.length * 6;
      if (requiredFloats > this._corePosBuffer.length) {
        this._corePosBuffer = new Float32Array(Math.max(requiredFloats * 2, 3000));
        const attr = new THREE.BufferAttribute(this._corePosBuffer, 3);
        attr.setUsage(THREE.DynamicDrawUsage);
        this.connectionLines.geometry.setAttribute('position', attr);
      }
      let idx = 0;
      for (let i = 0; i < this.connections.length; i++) {
        const [ia, ib] = this.connections[i];
        if (ia.ghostTarget > 0.5 || ib.ghostTarget > 0.5) continue; /* link to an un-formed world stays dark */
        ia.group.getWorldPosition(this._vScratch1);
        ib.group.getWorldPosition(this._vScratch2);
        this._corePosBuffer[idx++] = this._vScratch1.x;
        this._corePosBuffer[idx++] = this._vScratch1.y;
        this._corePosBuffer[idx++] = this._vScratch1.z;
        this._corePosBuffer[idx++] = this._vScratch2.x;
        this._corePosBuffer[idx++] = this._vScratch2.y;
        this._corePosBuffer[idx++] = this._vScratch2.z;
      }
      const attr = this.connectionLines.geometry.getAttribute('position') as THREE.BufferAttribute;
      if (attr) {
        attr.needsUpdate = true;
      }
      this.connectionLines.geometry.setDrawRange(0, idx / 3);
    }
    this.connectionLines.visible = this.coreT > 0.02;
  }
  private connections: [RuntimeBody, RuntimeBody][] = [];
  setConnections(pairs: [string, string][]) {
    this.connections = pairs
      .map(([a, b]) => [this.bodies.find((x) => x.data.id === a), this.bodies.find((x) => x.data.id === b)] as [RuntimeBody | undefined, RuntimeBody | undefined])
      .filter((p): p is [RuntimeBody, RuntimeBody] => Boolean(p[0] && p[1]));
  }

  private updateHover() {
    if (!this.pointerMoved && !this.dragging) return;
    this.pointerMoved = false;
    const id = this.pick();
    if (id !== this.hoveredId) {
      this.hoveredId = id;
      this.cb.onHover(id, this.mouseScreenX, this.mouseScreenY);
    }
    const canvas = this.renderer.domElement;
    canvas.style.cursor = id ? 'pointer' : this.dragging ? 'grabbing' : 'grab';
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.rig.dispose();
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
  }
}
