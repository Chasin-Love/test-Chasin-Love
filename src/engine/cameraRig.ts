/* -------------------------------------------------------------------------- */
/*                          ADVANCED UNIVERSE CAMERA                          */
/* A frame-rate-independent orbit / pan / log-zoom rig built for the 11-scale */
/* universe. Replaces the legacy theta/phi/zoomT block that lived inline in   */
/* engine.ts. All easing is exponential-with-lambda (1 - e^(-λ·dt)), all      */
/* inertia decays per-second — identical feel at 30, 60 or 144 fps.           */
/*                                                                            */
/* Distance model: dist = DIST_BASE · DIST_SPAN^zoomT with zoomT ∈ [0,1].     */
/* Six decades of travel in one dial; every wheel notch multiplies the        */
/* distance by the same factor at every scale, so zooming never feels slow    */
/* near a planet or twitchy at the multiverse.                                */
/* -------------------------------------------------------------------------- */

import * as THREE from 'three';

export const DIST_BASE = 3.0;
export const DIST_SPAN = 800000;

const PHI_MIN = 0.06;
const PHI_MAX = Math.PI - 0.06;

/* easing speeds (1/s) */
const LAMBDA_ORBIT = 7.5;
const LAMBDA_ZOOM = 3.6;
const LAMBDA_FOCUS = 6.0;

/* inertia */
const ORBIT_FRICTION = 2.6; /* 1/s — flick glide time ≈ 0.4 s */
const PAN_FRICTION = 5.5;
const ZOOM_FRICTION = 7.0;

/* input response */
const WHEEL_ZOOM_PER_UNIT = 0.00021; /* zoomT per (clamped) wheel unit */
const WHEEL_CLAMP = 140;
const PINCH_ZOOM_PER_PX = 0.0016;
const ORBIT_SENSITIVITY = 0.0048; /* rad per px */
const PAN_PER_PX = 0.0016; /* × distance */
const KEY_PAN_SPEED = 0.55; /* × distance per second */
const FLING_PX_CAP = 2600; /* px/s — fastest flick the rig believes */
const ORBIT_FLING_CAP = 2.2; /* rad/s */
const PAN_FLING_FACTOR = 2.2; /* × distance per second */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const damp = (cur: number, target: number, lambda: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-lambda * dt));

export interface RigFrame {
  /** world-space point the camera orbits this frame (body position or origin) */
  focus: THREE.Vector3;
  /** a body is focused — distance is framed to focusRadius */
  focused: boolean;
  /** radius of the focused body */
  focusRadius: number;
  /** 0..1 portal distortion — squeezes the rendered distance while warping */
  portalEase: number;
  /** when focused: closest allowed orbit distance (defaults sized for planets) */
  focusMin?: number;
  /** when focused: farthest allowed orbit distance before focus releases */
  focusMax?: number;
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;

  /* the public zoom dial — zoomToHierarchy / Core Mode / portals drive this */
  zoomT = 0.47;
  tZoomT = 0.335;

  /* spherical orbit around the focus point */
  theta = 0.32;
  tTheta = 0.9;
  phi = 1.28;
  tPhi = 1.12;

  private orbitVX = 0; /* rad/s */
  private orbitVY = 0; /* rad/s */
  private zoomVel = 0; /* zoomT/s */
  private panVel = new THREE.Vector3(); /* world units/s */

  private panOffset = new THREE.Vector3();
  private panRight = new THREE.Vector3();
  private panUp = new THREE.Vector3();
  private focus = new THREE.Vector3();
  private renderCenter = new THREE.Vector3();
  private focused = false;
  private focusRadius = 6;
  private focusMin = 1.35;
  private focusMax = 3500;

  private panKeys: Record<string, boolean> = {};
  private dragging = false;
  private panning = false;
  /* exponential moving average of drag velocity (px/s) for the release fling */
  private dragVX = 0;
  private dragVY = 0;
  private lastMoveT = 0;

  /* touch pinch state */
  private pinchD = 0;
  private pinchX = 0;
  private pinchY = 0;

  private canvas: HTMLCanvasElement;

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: true });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /* ------------------------------ input API ------------------------------ */

  private onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    this.panKeys[e.key.toLowerCase()] = true;
  };
  private onKeyUp = (e: KeyboardEvent) => { this.panKeys[e.key.toLowerCase()] = false; };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const units = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const d = clamp(e.deltaY * units, -WHEEL_CLAMP, WHEEL_CLAMP);
    /* impulse → velocity: one notch settles to ΔzoomT ≈ WHEEL_ZOOM_PER_UNIT·d
       with the same glide envelope at every scale */
    this.zoomVel += d * WHEEL_ZOOM_PER_UNIT * ZOOM_FRICTION;
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      this.pinchD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      this.pinchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      this.pinchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      this.dragging = false; this.panning = false;
      this.orbitVX = 0; this.orbitVY = 0; this.panVel.set(0, 0, 0);
    }
  };
  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 2) return;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    /* pinch = direct, crisp zoom */
    this.tZoomT = clamp(this.tZoomT - (d - this.pinchD) * PINCH_ZOOM_PER_PX, 0, 1);
    this.zoomVel = 0;
    this.pinchD = d;
    /* two-finger drag = pan */
    const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    this.panBy(mx - this.pinchX, my - this.pinchY);
    this.pinchX = mx; this.pinchY = my;
  };

  beginDrag(pan: boolean) {
    this.dragging = true;
    this.panning = pan;
    this.dragVX = 0; this.dragVY = 0;
    this.lastMoveT = performance.now();
    this.orbitVX = 0; this.orbitVY = 0; this.panVel.set(0, 0, 0);
  }

  dragMove(dx: number, dy: number) {
    if (!this.dragging) return;
    const now = performance.now();
    const dt = Math.max(0.001, (now - this.lastMoveT) / 1000);
    this.lastMoveT = now;
    const a = 0.6; /* EMA weight for velocity tracking */
    const vx = clamp(dx / dt, -FLING_PX_CAP, FLING_PX_CAP);
    const vy = clamp(dy / dt, -FLING_PX_CAP, FLING_PX_CAP);
    if (this.panning) {
      this.panBy(dx, dy);
      this.dragVX = a * this.dragVX + (1 - a) * vx;
      this.dragVY = a * this.dragVY + (1 - a) * vy;
    } else {
      this.tTheta += dx * ORBIT_SENSITIVITY;
      this.tPhi = clamp(this.tPhi - dy * ORBIT_SENSITIVITY, PHI_MIN, PHI_MAX);
      this.dragVX = a * this.dragVX + (1 - a) * vx;
      this.dragVY = a * this.dragVY + (1 - a) * vy;
    }
  }

  endDrag() {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.panning) {
      /* fling along the averaged screen motion, scaled like a pan step */
      this.panRight.setFromMatrixColumn(this.camera.matrixWorld, 0);
      this.panUp.setFromMatrixColumn(this.camera.matrixWorld, 1);
      const s = this.dist() * PAN_PER_PX;
      this.panVel.addScaledVector(this.panRight, -this.dragVX * s).addScaledVector(this.panUp, this.dragVY * s);
      const maxVel = this.dist() * PAN_FLING_FACTOR;
      if (this.panVel.length() > maxVel) this.panVel.setLength(maxVel);
    } else {
      /* orbit fling in rad/s */
      this.orbitVX = clamp(this.dragVX * ORBIT_SENSITIVITY, -ORBIT_FLING_CAP, ORBIT_FLING_CAP);
      this.orbitVY = clamp(this.dragVY * ORBIT_SENSITIVITY, -ORBIT_FLING_CAP, ORBIT_FLING_CAP);
    }
    this.panning = false;
    this.dragVX = 0; this.dragVY = 0;
  }

  private panBy(dx: number, dy: number) {
    const k = this.dist() * PAN_PER_PX;
    this.panRight.setFromMatrixColumn(this.camera.matrixWorld, 0);
    this.panUp.setFromMatrixColumn(this.camera.matrixWorld, 1);
    this.panOffset.addScaledVector(this.panRight, -dx * k).addScaledVector(this.panUp, dy * k);
    const maxPan = Math.max(60, this.dist() * 1.2);
    if (this.panOffset.length() > maxPan) this.panOffset.setLength(maxPan);
  }

  /* ------------------------------- state API ------------------------------ */

  setZoomTarget(z: number) { this.tZoomT = clamp(z, 0, 1); }
  nudgeZoom(delta: number) { this.tZoomT = clamp(this.tZoomT + delta, 0, 1); }
  /** zero the wheel/pinch velocity — the engine uses this when a warp lock
      lands so the momentum it absorbed can't push the dial back out */
  killZoomMomentum() { this.zoomVel = 0; }

  /** live wheel velocity (zoomT/s) — the engine reads it to detect the user
      pulling at a stage's edge, which is what fires the Kamui warp */
  get zoomVelocity(): number { return this.zoomVel; }
  setOrbit(theta: number | null, phi: number | null) {
    if (theta !== null) this.tTheta = theta;
    if (phi !== null) this.tPhi = clamp(phi, PHI_MIN, PHI_MAX);
  }
  clearPan() { this.panOffset.set(0, 0, 0); this.panVel.set(0, 0, 0); }

  /** current camera distance from the focus point (before portal squeeze) */
  dist(): number {
    const base = DIST_BASE * Math.pow(DIST_SPAN, this.zoomT);
    if (this.focused) return Math.min(Math.max(base, this.focusMin), this.focusMax);
    return base;
  }

  /** unclamped distance for the current dial — the engine uses this to
      release reality-focus seamlessly when the clamp's far bound binds */
  baseDist(): number {
    return DIST_BASE * Math.pow(DIST_SPAN, this.zoomT);
  }

  /** true while the focused-distance clamp's far bound is pinning the orbit
      — the engine releases reality-focus at exactly this moment (the
      rendered distance equals the unclamped base, so it never jumps) */
  get atFocusMax(): boolean {
    return this.focused && this.baseDist() >= this.focusMax;
  }

  /**
   * Zoom intent: negative = the camera is actively easing inward (user is
   * diving toward something), ≈0 = orbiting/panning, positive = pulling out.
   * The engine gates its auto-focus engage on this so a plain rotation can
   * never yank the camera onto a random body.
   */
  get zoomTrend(): number {
    return this.tZoomT - this.zoomT;
  }

  /** convert a world distance back to the equivalent zoomT dial value */
  static zoomTOf(dist: number): number {
    return clamp(Math.log(Math.max(dist, DIST_BASE) / DIST_BASE) / Math.log(DIST_SPAN), 0, 1);
  }

  /* -------------------------------- frame -------------------------------- */

  update(dt: number, s: RigFrame) {
    /* fling inertia → targets (only while the pointer is up) */
    if (!this.dragging) {
      if (Math.abs(this.orbitVX) > 1e-4 || Math.abs(this.orbitVY) > 1e-4) {
        this.tTheta += this.orbitVX * dt;
        this.tPhi = clamp(this.tPhi - this.orbitVY * dt, PHI_MIN, PHI_MAX);
        const f = Math.exp(-ORBIT_FRICTION * dt);
        this.orbitVX *= f; this.orbitVY *= f;
      }
      if (this.panVel.lengthSq() > 1e-8) {
        this.panOffset.addScaledVector(this.panVel, dt);
        const maxPan = Math.max(60, this.dist() * 1.2);
        if (this.panOffset.length() > maxPan) this.panOffset.setLength(maxPan);
        this.panVel.multiplyScalar(Math.exp(-PAN_FRICTION * dt));
      }
    }

    /* zoom impulse integration (wheel) */
    if (Math.abs(this.zoomVel) > 1e-5) {
      this.tZoomT = clamp(this.tZoomT + this.zoomVel * dt, 0, 1);
      this.zoomVel *= Math.exp(-ZOOM_FRICTION * dt);
    }

    /* keyboard pan — arrows / WASD, speed proportional to altitude */
    const pk = this.panKeys;
    if (pk['arrowup'] || pk['w'] || pk['arrowdown'] || pk['s'] || pk['arrowleft'] || pk['a'] || pk['arrowright'] || pk['d']) {
      const k = this.dist() * KEY_PAN_SPEED * dt;
      this.panRight.setFromMatrixColumn(this.camera.matrixWorld, 0);
      this.panUp.setFromMatrixColumn(this.camera.matrixWorld, 1);
      if (pk['arrowleft'] || pk['a']) this.panOffset.addScaledVector(this.panRight, -k);
      if (pk['arrowright'] || pk['d']) this.panOffset.addScaledVector(this.panRight, k);
      if (pk['arrowup'] || pk['w']) this.panOffset.addScaledVector(this.panUp, k);
      if (pk['arrowdown'] || pk['s']) this.panOffset.addScaledVector(this.panUp, -k);
      const maxPan = Math.max(60, this.dist() * 1.2);
      if (this.panOffset.length() > maxPan) this.panOffset.setLength(maxPan);
    }

    /* critically-smoothed channels */
    this.theta = damp(this.theta, this.tTheta, LAMBDA_ORBIT, dt);
    this.phi = damp(this.phi, this.tPhi, LAMBDA_ORBIT, dt);
    this.zoomT = damp(this.zoomT, this.tZoomT, LAMBDA_ZOOM, dt);

    /* follow the (moving) focus point */
    this.focus.x = damp(this.focus.x, s.focus.x, LAMBDA_FOCUS, dt);
    this.focus.y = damp(this.focus.y, s.focus.y, LAMBDA_FOCUS, dt);
    this.focus.z = damp(this.focus.z, s.focus.z, LAMBDA_FOCUS, dt);

    /* place the camera */
    this.focused = s.focused;
    this.focusRadius = s.focusRadius;
    this.focusMin = s.focusMin ?? this.focusRadius * 1.35;
    this.focusMax = s.focusMax ?? 3500;
    this.renderCenter.copy(this.focus).add(this.panOffset);
    const dist = Math.max(0.5, this.dist() * (1 - s.portalEase * 0.45));
    const sp = Math.sin(this.phi), cp = Math.cos(this.phi);
    this.camera.position.set(
      this.renderCenter.x + dist * sp * Math.cos(this.theta),
      this.renderCenter.y + dist * cp,
      this.renderCenter.z + dist * sp * Math.sin(this.theta),
    );
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.renderCenter);
    this.camera.near = clamp(dist * 0.004, 0.05, 5000);
    this.camera.far = 5000000;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
