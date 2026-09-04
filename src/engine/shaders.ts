/* GLSL library for MY UNIVERSE — all shaders share a simplex noise chunk. */

export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0,0.5,1.0,2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0,i1.z,i2.z,1.0))
        + i.y + vec4(0.0,i1.y,i2.y,1.0)) + i.x + vec4(0.0,i1.x,i2.x,1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0*floor(p*ns.z*ns.z);
  vec4 x_ = floor(j*ns.z);
  vec4 y_ = floor(j - 7.0*x_);
  vec4 x = x_*ns.x + ns.yyyy;
  vec4 y = y_*ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
  m = m*m;
  return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float f = 0.0; float a = 0.5;
  for(int i=0;i<5;i++){ f += a*snoise(p); p *= 2.03; a *= 0.5; }
  return f;
}
float fbm3(vec3 p){
  float f = 0.0; float a = 0.5;
  for(int i=0;i<3;i++){ f += a*snoise(p); p *= 2.11; a *= 0.5; }
  return f;
}
`;

/* ------------------------------ star ------------------------------ */

export const starVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vW = (modelMatrix * vec4(position,1.0)).xyz;
  vP = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const starFrag = /* glsl */ `
uniform float uTime; uniform float uBoost;
uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uCoreColor;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}

// Ultra-detailed thermal palette adapted to current reality's star spectrum
vec3 getStarColor(float t, float spot) {
  vec3 colA = length(uColorA) > 0.05 ? uColorA : vec3(1.0, 0.65, 0.15);
  vec3 colB = length(uColorB) > 0.05 ? uColorB : vec3(0.9, 0.2, 0.02);
  vec3 coreCol = length(uCoreColor) > 0.05 ? uCoreColor : vec3(1.0, 1.0, 1.0);

  vec3 dark = colB * 0.12;
  vec3 cool = colB;
  vec3 warm = colA;
  vec3 hot  = mix(colA, coreCol, 0.65);
  vec3 core = coreCol;
  
  vec3 col = mix(dark, cool, smoothstep(0.0, 0.3, t));
  col = mix(col, warm, smoothstep(0.3, 0.6, t));
  col = mix(col, hot, smoothstep(0.6, 0.85, t));
  col = mix(col, core, smoothstep(0.85, 1.0, t));
  
  // Sunspots dim the thermal emission strongly
  return mix(col, dark, spot);
}

void main(){
  vec3 n = normalize(vN);
  vec3 viewDir = normalize(cameraPosition - vW);
  float mu = max(dot(n, viewDir), 0.0);
  
  vec3 q = normalize(vP);
  float t_slow = uTime * 0.015;
  float t_fast = uTime * 0.04;
  
  // 1. High-frequency Granulation (convection cells)
  float n1 = fbm3(q * 38.0 + vec3(t_fast));
  float n2 = fbm3(q * 72.0 - vec3(t_fast * 1.3));
  float gran = abs(n1 + n2 * 0.5); // cellular look
  gran = 1.0 - smoothstep(0.0, 1.3, gran);
  gran = pow(gran, 2.2); // sharp cell edges
  
  // 2. Magnetic Flux Tubes / Solar Filaments (swirling structures)
  vec3 warp = q * 2.2 + vec3(fbm3(q * 1.8 + t_slow));
  float tubes = fbm(warp * 4.2 - vec3(0.0, t_slow, 0.0));
  
  // 3. Sunspots (dark magnetic disturbances)
  float spotNoise = fbm(q * 3.2 + vec3(t_slow * 0.6));
  float spots = smoothstep(0.62, 0.85, spotNoise);
  // Penumbra (lighter outer ring of spot)
  float penumbra = smoothstep(0.45, 0.62, spotNoise) - spots;
  
  // Combine temperatures
  // Base temp modified by granulation and filaments
  float temp = 0.25 + 0.35 * gran + 0.4 * tubes;
  // Boost temperature at filament ridges (plages/active regions)
  temp += smoothstep(0.4, 0.8, tubes) * 0.35;
  
  // spot strength
  float spotFactor = spots * 0.95 + penumbra * 0.55;
  
  vec3 col = getStarColor(clamp(temp, 0.0, 1.0), spotFactor);
  
  // Extreme limb darkening (center is much brighter, edges are darker/redder)
  float limb = pow(max(mu, 0.0), 0.55); 
  col *= mix(vec3(0.5, 0.1, 0.0), vec3(1.0), limb);
  
  // Active region glowing near limbs
  float limbGlow = pow(1.0 - mu, 3.0);
  vec3 limbCol = length(uColorA) > 0.05 ? uColorA : vec3(1.0, 0.5, 0.1);
  col += limbCol * limbGlow * (tubes * 1.8) * uBoost;
  
  float pulse = 1.0 + 0.02 * sin(uTime * 0.6);
  col *= pulse * uBoost;
  
  // Incandescent central glow
  vec3 coreHighlight = length(uCoreColor) > 0.05 ? uCoreColor : vec3(1.0, 0.95, 0.85);
  col += coreHighlight * pow(max(mu, 0.0), 4.5) * 0.35;
  
  gl_FragColor = vec4(col * 1.25, 1.0);
}`;

/* ----------------------------- planet ----------------------------- */

export const planetVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vW = (modelMatrix * vec4(position,1.0)).xyz;
  vP = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const planetFrag = /* glsl */ `
uniform vec3 uDeep; uniform vec3 uBase; uniform vec3 uHigh; uniform vec3 uIce;
uniform vec3 uSunDir; uniform float uTime; uniform float uSea; uniform float uGhost;
uniform float uNight; uniform vec3 uSeed; uniform float uFade;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 q = normalize(vP) + uSeed;
  
  float warp = fbm3(q*2.3);
  float h = fbm(q*2.9 + warp*0.55);
  
  // High-frequency detail added to the height directly for coloring (not normals)
  float detail = fbm(q*9.0)*0.16;
  h += detail;
  
  float land = smoothstep(uSea - 0.03, uSea + 0.03, h);
  vec3 terrain = mix(uDeep, uBase, smoothstep(uSea, uSea + 0.30, h));
  terrain = mix(terrain, uHigh, smoothstep(uSea + 0.28, uSea + 0.62, h));
  
  float lat = abs(normalize(vP).y);
  float iceMask = smoothstep(0.62, 0.86, lat + h*0.18 - 0.1);
  terrain = mix(terrain, uIce, iceMask);
  
  vec3 ocean = uDeep * (0.75 + 0.45*smoothstep(-0.5, uSea, h));
  vec3 col = mix(ocean, terrain, land);
  
  // Smooth lighting based on actual sphere normal
  float sun = dot(n, normalize(uSunDir));
  float day = smoothstep(-0.12, 0.28, sun);
  
  // Gentle ambient boost
  vec3 lit = col * (0.15 + 1.15*day);
  
  vec3 viewDir = normalize(cameraPosition - vW);
  float spec = pow(max(dot(reflect(-normalize(uSunDir), n), viewDir), 0.0), 42.0);
  lit += vec3(1.0, 0.92, 0.78) * spec * (1.0 - land) * day * 0.55;
  
  float cityMask = smoothstep(0.52, 0.78, fbm(q*7.5 + 11.0)) * land * (1.0 - iceMask);
  vec3 nightCol = vec3(1.0, 0.78, 0.42) * cityMask * uNight * (1.0 - day) * 0.9;
  lit += nightCol;
  
  float term = smoothstep(-0.14, 0.14, sun);
  lit = mix(lit * vec3(0.5, 0.62, 0.85), lit, term);
  lit = mix(lit, vec3(0.45, 0.53, 0.66) * (0.25 + 0.75*day), uGhost);
  
  gl_FragColor = vec4(lit, uFade);
}`;

/* ----------------------------- clouds ----------------------------- */

export const cloudFrag = /* glsl */ `
uniform float uTime; uniform vec3 uSunDir; uniform vec3 uSeed; uniform float uCover; uniform float uFade;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}
void main(){
  vec3 q = normalize(vP) + uSeed;
  float c = fbm(q*3.4 + vec3(uTime*0.012, 0.0, uTime*0.008));
  c += 0.35*fbm(q*8.0 - vec3(uTime*0.02));
  float a = smoothstep(0.62 - uCover*0.3, 0.86, c);
  float sun = dot(normalize(vN), normalize(uSunDir));
  float day = smoothstep(-0.2, 0.4, sun); // softened terminator
  vec3 col = vec3(1.0) * (0.25 + 0.85*day); // gentler ambient
  gl_FragColor = vec4(col, a * 0.82 * uFade);
}`;

/* --------------------------- atmosphere --------------------------- */

export const atmoFrag = /* glsl */ `
uniform vec3 uColor; uniform float uStrength; uniform vec3 uSunDir;
varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float ndotv = abs(dot(n, v));
  float rim = pow(max(1.0 - ndotv, 0.0), 3.5);
  float sun = dot(n, normalize(uSunDir));
  float day = smoothstep(-0.25, 0.25, sun);
  float a = rim * uStrength * (0.35 + 0.65*day);
  vec3 col = mix(uColor * 0.8, uColor * 1.5, day);
  gl_FragColor = vec4(col, a);
}`;

/* ------------------------------ rings ----------------------------- */

export const ringVert = /* glsl */ `
varying vec2 vP;
void main(){
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const ringFrag = /* glsl */ `
uniform float uInner; uniform float uOuter; uniform vec3 uTint; uniform vec3 uSunLocal;
varying vec2 vP;
${NOISE}
void main(){
  float r = length(vP);
  float t = (r - uInner) / (uOuter - uInner);
  if(t < 0.0 || t > 1.0) discard;
  float bands = 0.5 + 0.5*snoise(vec3(t*46.0, 3.7, 1.3));
  bands *= 0.55 + 0.45*snoise(vec3(t*130.0, 9.1, 4.4));
  float gap1 = smoothstep(0.02, 0.07, abs(t - 0.62));
  float gap2 = smoothstep(0.015, 0.05, abs(t - 0.31));
  float edge = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.9, 1.0, t));
  float a = bands * gap1 * gap2 * edge * 0.9;
  vec2 dir = normalize(vP + vec2(1e-5));
  vec2 sl = normalize(uSunLocal.xy + vec2(1e-4));
  float shade = 0.3 + 0.7*smoothstep(-0.5, 0.35, dot(dir, sl));
  float lit = 0.45 + 0.55*abs(uSunLocal.z);
  vec3 col = mix(vec3(0.62, 0.55, 0.44), uTint, 0.45) * lit * shade * 1.5;
  gl_FragColor = vec4(col, a);
}`;

/* -------------------------- accretion disc ------------------------ */

export const discFrag = /* glsl */ `
uniform float uTime; uniform float uInner; uniform float uOuter;
uniform vec3 uColor; uniform vec3 uColor2;
varying vec2 vP;
${NOISE}
void main(){
  float r = length(vP);
  float t = (r - uInner) / (uOuter - uInner);
  if(t < 0.0 || t > 1.0) discard;
  float ang = atan(vP.y, vP.x);
  float swirl = fbm3(vec3(cos(ang)*2.0 + r*3.0 - uTime*0.9, sin(ang)*2.0, r*6.0 - uTime*0.6));
  float heat = pow(1.0 - t, 2.2);
  float streaks = 0.55 + 0.45*sin(ang*9.0 + r*30.0 - uTime*2.4 + swirl*4.0);
  vec3 col = mix(uColor, uColor2, heat);
  float a = heat * streaks * (0.4 + 0.6*smoothstep(0.0, 0.18, t)) * (1.0 - smoothstep(0.7, 1.0, t));
  a *= 0.75 + 0.25*swirl;
  gl_FragColor = vec4(col * (0.8 + heat*1.4), a * 0.9);
}`;

/* ------------------------- SCIENTIFIC BLACK HOLE ----------------------- */
/* Astrophysics-grounded Black Hole renderer:
   Event horizon shadow + Ray-curving Gravitational Lensing + Accretion Disk with Relativistic Doppler asymmetry/redshift + Photon Ring */

export const blackHoleVert = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
varying vec3 vP;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vW = (modelMatrix * vec4(position, 1.0)).xyz;
  vP = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const blackHoleFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColorDiskInner;
uniform vec3 uColorDiskOuter;
uniform float uRadius;
varying vec3 vN;
varying vec3 vW;
varying vec3 vP;
${NOISE}

void main(){
  vec3 viewDir = normalize(cameraPosition - vW);
  vec3 n = normalize(vN);
  float mu = max(dot(n, viewDir), 0.0);

  // Radial distance from center in normalized local coordinates
  float r = length(vP) / max(0.001, uRadius);

  // 1. Schwarzschild Shadow & Event Horizon Boundary (r < 0.45 = Total Absorptive Shadow)
  float shadowRadius = 0.45;
  float eventHorizon = smoothstep(shadowRadius, shadowRadius * 1.15, r);

  // 2. Gravitational Lensing Deflection / Einstein Ring Approximation
  // Light paths near the compact mass bend radially around the shadow boundary
  float lensDist = abs(r - shadowRadius * 1.35);
  float gravitationalLens = exp(-lensDist * 8.0);

  // 3. Photon Ring Structure (Bright critical photon orbit boundary r ~ 0.52)
  float photonRingRadius = 0.52;
  float photonRingWidth = 0.045;
  float photonRing = exp(-pow((r - photonRingRadius) / photonRingWidth, 2.0));

  // 4. Relativistic Accretion Disk with Orbital Motion & Doppler Boosting Asymmetry
  float ang = atan(vP.z, vP.x);
  float orbitalVelocity = 3.5 / (r + 0.2);
  float angOrbit = ang + uTime * orbitalVelocity;

  // Doppler beaming factor: approaching side (positive X/Z projected) is boosted and blueshifted
  float dopplerFactor = sin(angOrbit) * 0.45 + 0.55;
  float dopplerShift = pow(dopplerFactor, 2.5);

  // High-frequency Magnetohydrodynamic (MHD) plasma turbulence
  vec3 plasmaCoord = vec3(cos(angOrbit) * r * 4.0, vP.y * 3.0, sin(angOrbit) * r * 4.0 + uTime * 0.8);
  float turbulence = fbm(plasmaCoord) * 0.6 + fbm3(plasmaCoord * 2.5) * 0.4;

  // Thermal Radial Temperature Gradient: Extremely hot inner disk (ultraviolet/cyan-white) to cooler outer disk (amber/red)
  vec3 innerCol = length(uColorDiskInner) > 0.05 ? uColorDiskInner : vec3(0.3, 0.85, 1.0);
  vec3 outerCol = length(uColorDiskOuter) > 0.05 ? uColorDiskOuter : vec3(0.95, 0.42, 0.08);
  vec3 hotCoreCol = vec3(1.0, 0.98, 0.92);

  // Thermal blend based on radial distance
  float heatFraction = pow(clamp(1.0 - (r - shadowRadius) / 1.8, 0.0, 1.0), 2.0);
  vec3 diskColor = mix(outerCol, innerCol, heatFraction);
  diskColor = mix(diskColor, hotCoreCol, pow(heatFraction, 2.5));

  // Apply Doppler redshift/blueshift color modification
  vec3 blueshift = vec3(0.2, 0.5, 1.2);
  vec3 redshift = vec3(1.3, 0.3, 0.1);
  diskColor *= mix(redshift, blueshift, dopplerFactor);
  diskColor *= dopplerShift * (0.65 + 0.35 * turbulence);

  // 5. Composite Black Hole Physical Emission Structure
  vec3 col = vec3(0.0);

  // Accretion disk radial extent mask
  float diskMask = smoothstep(shadowRadius * 1.05, shadowRadius * 1.25, r) * (1.0 - smoothstep(1.8, 2.4, r));
  col += diskColor * diskMask * 1.8;

  // Photon Ring Luminous Boost
  vec3 photonCol = mix(vec3(1.0, 0.95, 0.85), innerCol, 0.5);
  col += photonCol * photonRing * 2.8;

  // Gravitational Lensing Distorted Background Halo
  vec3 lensHaloCol = mix(outerCol, vec3(0.2, 0.7, 1.0), 0.5);
  col += lensHaloCol * gravitationalLens * 0.85;

  // Enforce Event Horizon Shadow Capture (Pure darkness at center)
  col *= eventHorizon;

  float alpha = (diskMask * 0.88 + photonRing * 0.95 + gravitationalLens * 0.45) * eventHorizon;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}`;

/* ------------------------------ nebula ---------------------------- */

export const nebulaVert = /* glsl */ `
uniform vec3 uCamLocalP;
varying vec2 vUv;
varying vec3 vLocalP;
varying vec3 vWorldP;
varying vec3 vCamLocalP;

void main(){
  vUv = uv;
  vLocalP = position;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldP = worldPosition.xyz;
  vCamLocalP = uCamLocalP;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}`;

export const nebulaFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA; // Ionized gas / cyan-indigo ambient
uniform vec3 uColorB; // Deep dust / amber warm scattering
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vLocalP;
varying vec3 vWorldP;
varying vec3 vCamLocalP;

${NOISE}

// Intersect ray O + t*D with axis-aligned bounding box [-bounds, bounds]
vec2 intersectAABB(vec3 ro, vec3 rd, vec3 boxMin, vec3 boxMax) {
  vec3 invD = 1.0 / (rd + vec3(1e-7));
  vec3 t0 = (boxMin - ro) * invD;
  vec3 t1 = (boxMax - ro) * invD;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  float tn = max(max(tmin.x, tmin.y), tmin.z);
  float tf = min(min(tmax.x, tmax.y), tmax.z);
  return vec2(tn, tf);
}

// 3D Density evaluation for procedural astronomical Pillars of Creation & Stellar Nursery
// Returns vec4(dustDensity, gasDensity, photoIonization, temperature)
vec4 evalNebula3D(vec3 p, float t) {
  // Domain warping for multi-scale turbulent 3D fluid motion & filaments
  vec3 warp = vec3(
    fbm3(p * 2.2 + vec3(0.0, t * 0.01, 0.0)),
    fbm3(p * 2.4 + vec3(1.7, -t * 0.008, 0.5)),
    fbm3(p * 2.1 + vec3(3.2, 0.8, t * 0.012))
  );
  vec3 pw = p + warp * 0.38;

  // 1. LEFT TOWERING PILLAR (Rising from lower-middle, broad base narrowing upward, top bending right)
  vec3 p1 = pw - vec3(-0.42, -0.15, 0.02);
  p1.x += sin(p1.y * 2.8 + t * 0.02) * 0.08; // Organic curving body
  p1.z += cos(p1.y * 3.2) * 0.05;
  float h1 = (p1.y + 0.8) / 1.35; // Normalized height [0, 1]
  float width1 = 0.22 * (1.0 - smoothstep(-0.8, 0.55, p1.y) * 0.58);
  // Finger-like columns and eroded tip extensions at upper tip
  float tip1 = exp(-pow((p1.y - 0.48) / 0.14, 2.0)) * (sin(p1.x * 22.0 + 1.2) * 0.035 + cos(p1.z * 18.0) * 0.025);
  float d1 = length(p1.xz) - (width1 + tip1);
  float p1Mask = smoothstep(0.08, -0.06, d1) * smoothstep(-0.9, -0.65, p1.y) * (1.0 - smoothstep(0.48, 0.62, p1.y));

  // 2. CENTER TALLEST & MOST VISUALLY DOMINANT PILLAR (Elongated, narrow/bulky sections, protruding ridges)
  vec3 p2 = pw - vec3(-0.05, -0.05, -0.08);
  p2.x += cos(p2.y * 3.4 - t * 0.015) * 0.06;
  p2.z += sin(p2.y * 4.1) * 0.06;
  float width2 = 0.18 * (1.0 - smoothstep(-0.85, 0.75, p2.y) * 0.52);
  // Protruding 3D ridges and branching structures
  float ridges2 = sin(p2.y * 14.0) * cos(p2.x * 12.0) * 0.03;
  float tip2 = exp(-pow((p2.y - 0.78) / 0.16, 2.0)) * (cos(p2.x * 26.0) * 0.04 + sin(p2.z * 20.0) * 0.03);
  float d2 = length(p2.xz) - (width2 + ridges2 + tip2);
  float p2Mask = smoothstep(0.08, -0.05, d2) * smoothstep(-0.92, -0.72, p2.y) * (1.0 - smoothstep(0.78, 0.88, p2.y));

  // 3. UPPER-RIGHT BRANCHING PILLAR COMPLEX (Claw-like sculpted silhouette, connected via diffuse gas)
  vec3 p3 = pw - vec3(0.42, 0.25, -0.12);
  p3.x += sin(p3.y * 4.5) * 0.05;
  p3.z += cos(p3.y * 3.8) * 0.05;
  // Multiple upward extensions / claw arms
  float claw1 = length(p3.xz - vec2(-0.06, 0.02)) - 0.09;
  float claw2 = length(p3.xz - vec2(0.08, -0.04)) - 0.07;
  float d3 = min(claw1, claw2);
  float p3Mask = smoothstep(0.07, -0.05, d3) * smoothstep(-0.4, -0.15, p3.y) * (1.0 - smoothstep(0.68, 0.82, p3.y));

  // 4. LOWER-CENTER FOREGROUND BULBOUS CLOUD MOUND (Dense mound of gas & dust with dark cavities & folds)
  vec3 p4 = pw - vec3(0.05, -0.62, 0.32);
  float d4 = length(p4) - 0.38 + fbm3(p4 * 6.0) * 0.12;
  float p4Mask = smoothstep(0.12, -0.08, d4);

  // 5. FAR-RIGHT / LOWER-RIGHT EDGE CLOUD (Enormous cloud structure entering frame partially)
  vec3 p5 = pw - vec3(0.85, -0.48, 0.08);
  float d5 = length(p5) - 0.48 + fbm3(p5 * 4.5) * 0.15;
  float p5Mask = smoothstep(0.15, -0.1, d5);

  // Combine primary dust structures
  float mainPillars = max(max(max(p1Mask, p2Mask), p3Mask), max(p4Mask, p5Mask));

  // Multi-scale 3D FBM noise to carve filaments, cavities, knots, and erosion channels
  float microNoise = fbm(pw * 5.8) * 0.5 + fbm3(pw * 14.0) * 0.25;
  float dustDensity = clamp(mainPillars * (0.65 + microNoise * 0.75) - (microNoise - 0.35) * 0.3, 0.0, 1.0);

  // Diffuse background nebular gas fill between structures
  float bgGas = fbm3(pw * 1.8 + vec3(0.0, 0.0, t * 0.01)) * 0.45;
  bgGas += exp(-length(pw.xy) * 1.8) * 0.35;
  float gasDensity = clamp(bgGas + dustDensity * 0.85, 0.0, 1.0);

  // Photo-ionization UV radiation surface erosion calculation
  vec3 lightDirUV = normalize(vec3(-0.75, 0.65, 0.8));
  // Compute finite difference numerical gradient of dust density for surface normals
  vec3 eps = vec3(0.02, 0.02, 0.02);
  float dX = fbm(pw + vec3(eps.x, 0.0, 0.0)) - fbm(pw - vec3(eps.x, 0.0, 0.0));
  float dY = fbm(pw + vec3(0.0, eps.y, 0.0)) - fbm(pw - vec3(0.0, eps.y, 0.0));
  float dZ = fbm(pw + vec3(0.0, 0.0, eps.z)) - fbm(pw - vec3(0.0, 0.0, eps.z));
  vec3 grad = normalize(vec3(dX, dY, dZ) + vec3(1e-5));
  float photoIonization = pow(clamp(dot(-grad, lightDirUV), 0.0, 1.0), 1.8) * smoothstep(0.05, 0.6, dustDensity);

  float temperature = smoothstep(0.1, 0.85, dustDensity) + photoIonization * 0.5;

  return vec4(dustDensity, gasDensity, photoIonization, temperature);
}

void main(){
  // Bounding local space [-1.2, 1.2]^3
  vec3 boxMin = vec3(-1.25);
  vec3 boxMax = vec3(1.25);

  vec3 ro = vCamLocalP;
  vec3 rd = normalize(vLocalP - vCamLocalP);

  vec2 hit = intersectAABB(ro, rd, boxMin, boxMax);
  if (hit.x > hit.y || hit.y < 0.0) discard;

  float tNear = max(0.0, hit.x);
  float tFar = hit.y;

  // Volumetric Raymarching Settings
  const int STEPS = 54;
  float stepSize = (tFar - tNear) / float(STEPS);
  float tCurrent = tNear;

  vec3 accumColor = vec3(0.0);
  float transmittance = 1.0;

  // Color Palette Definitions
  vec3 colDeepBackground = vec3(0.008, 0.015, 0.038); // Deep Cosmic Blue Backdrop
  vec3 colIonizedCyan = length(uColorA) > 0.05 ? uColorA : vec3(0.12, 0.78, 0.95); // Ionized Cyan/Blue
  vec3 colGoldenYellow = vec3(1.0, 0.72, 0.22); // Warm Golden Yellow
  vec3 colAmberOrange = length(uColorB) > 0.05 ? uColorB : vec3(0.95, 0.48, 0.12); // Amber Orange
  vec3 colCopperRed = vec3(0.82, 0.26, 0.06); // Copper Reddish
  vec3 colDarkDustCharcoal = vec3(0.08, 0.05, 0.04); // Dark Charcoal Dust
  vec3 colDarkRedUmber = vec3(0.22, 0.10, 0.05); // Dark Reddish Brown
  vec3 colPaleCreamHighlight = vec3(1.0, 0.96, 0.88); // Subtle Pale Cream Highlights

  float simTime = uTime * 0.05;

  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * tCurrent;

    // Sample 3D Nebular Density
    vec4 nData = evalNebula3D(p, uTime);
    float dDust = nData.x;
    float dGas = nData.y;
    float photoIon = nData.z;
    float temp = nData.w;

    if (dGas > 0.001 || dDust > 0.001) {
      // Physical Dust Color Transition (Charcoal -> Reddish Brown -> Illuminated Amber)
      vec3 dustColor = mix(colDarkDustCharcoal, colDarkRedUmber, smoothstep(0.1, 0.6, dDust));

      // Physical Gas Emission Color Transition (Golden Yellow -> Amber -> Copper -> Cream Highlights)
      vec3 gasColor = mix(colCopperRed, colAmberOrange, smoothstep(0.1, 0.45, temp));
      gasColor = mix(gasColor, colGoldenYellow, smoothstep(0.45, 0.8, temp));
      gasColor = mix(gasColor, colPaleCreamHighlight, smoothstep(0.8, 1.0, temp));

      // Photo-ionization UV Rim Glow (Cool blue-white & electric cyan edges)
      vec3 rimGlow = mix(colIonizedCyan, vec3(0.85, 0.95, 1.0), photoIon * 0.6) * photoIon * 2.4;

      // Combine emission and scattering
      vec3 stepEmission = mix(gasColor, dustColor, dDust * 0.88) * dGas * 1.6 + rimGlow;

      // Optical Absorption / Extinction
      float stepAbsorption = (dDust * 4.8 + dGas * 0.85) * stepSize;
      float stepTransmittance = exp(-stepAbsorption);

      // Accumulate color scaled by current transmittance
      accumColor += transmittance * stepEmission * (1.0 - stepTransmittance);
      transmittance *= stepTransmittance;

      if (transmittance < 0.015) break; // Early ray termination when optically opaque
    }

    tCurrent += stepSize;
  }

  // Blend background cosmic blue into unabsorbed ray transmittance
  vec3 finalCol = accumColor + colDeepBackground * transmittance;

  // Edge boundary opacity falloff
  vec3 edgeDist = abs(vLocalP) / 1.25;
  float maxEdge = max(max(edgeDist.x, edgeDist.y), edgeDist.z);
  float edgeFade = smoothstep(1.0, 0.6, maxEdge);

  float alpha = (1.0 - transmittance) * edgeFade * uOpacity;
  if (alpha < 0.002) discard;

  gl_FragColor = vec4(finalCol * 1.35, clamp(alpha, 0.0, 1.0));
}`;

/* ------------------------- generic points ------------------------- */

export const pointsVert = /* glsl */ `
attribute float aSize; attribute vec3 aColor; attribute float aAlpha;
uniform float uScale; uniform float uTime; uniform float uTwinkle;
uniform vec3 uVortexC; uniform float uVortexR; uniform float uVortexS; uniform float uVortexT;
varying vec3 vColor; varying float vAlpha; varying float vSize;
void main(){
  vColor = aColor;
  float tw = uTwinkle > 0.5 ? (0.76 + 0.24 * sin(uTime * 2.6 + position.x * 17.3 + position.y * 11.1 + position.z * 7.7)) : 1.0;
  vAlpha = aAlpha * tw;
  /* Kamui tear vortex — a consumption wave expands from the tear point:
     nearest points are bent, spun and pulled into the center first, then the
     wave reaches farther ones (nearest-first suction). Consumed points dissolve. */
  vec3 vp = position;
  if (uVortexS > 0.001) {
    float d = distance(vp, uVortexC);
    float infl = uVortexS * smoothstep(uVortexR, uVortexR * 0.1, d);
    if (infl > 0.001) {
      vec3 axis = normalize(vec3(0.18, 1.0, 0.12));
      vec3 dir = vp - uVortexC;
      float a = infl * (5.0 + uVortexT * 3.5);
      vec3 spun = dir * cos(a) + cross(axis, dir) * sin(a) * 1.15;
      vp = uVortexC + spun * (1.0 - infl * 0.5);
      vAlpha *= (1.0 - infl * 0.6);
    }
  }
  vec4 mv = modelViewMatrix * vec4(vp, 1.0);
  float pSize = aSize * uScale * (260.0 / max(-mv.z, 0.001));
  gl_PointSize = clamp(pSize, 1.5, 36.0);
  vSize = gl_PointSize;
  gl_Position = projectionMatrix * mv;
}`;

export const pointsFrag = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor; varying float vAlpha; varying float vSize;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if(d >= 0.49) discard;
  
  float mask = smoothstep(0.49, 0.0, d);
  float core = exp(-d * d * 36.0);
  float halo = exp(-d * 6.0) * 0.22;
  
  vec3 col = mix(vColor, vec3(1.0, 0.96, 0.9), core * 0.5);
  float a = (core * 0.85 + halo) * mask * vAlpha * uOpacity;
  
  if (a < 0.003) discard;
  
  gl_FragColor = vec4(col, a);
}`;

/* --------------------------- portal pass -------------------------- */

export const portalFrag = /* glsl */ `
uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uStrength;
uniform float uTime; uniform vec3 uColor; uniform float uAspect;
uniform vec2 uTrail[3];
varying vec2 vUv;
${NOISE}

float distToSegment(vec2 p, vec2 a, vec2 b, float aspect) {
  vec2 pa = vec2((p.x - a.x) * aspect, p.y - a.y);
  vec2 ba = vec2((b.x - a.x) * aspect, b.y - a.y);
  float h = clamp(dot(pa, ba) / (dot(ba, ba) + 1e-8), 0.0, 1.0);
  return length(pa - ba * h);
}

void main(){
  vec2 uv = vUv;
  if (uStrength < 0.001) {
    gl_FragColor = texture2D(tDiffuse, uv);
    return;
  }
  
  vec2 o = uv - uCenter;
  vec2 d = vec2(o.x * uAspect, o.y);
  float r = length(d);
  float s = uStrength;
  
  // Calculate short-lived trailing path behind distortion
  float dSeg0 = distToSegment(uv, uCenter, uTrail[0], uAspect);
  float dSeg1 = distToSegment(uv, uTrail[0], uTrail[1], uAspect);
  float dSeg2 = distToSegment(uv, uTrail[1], uTrail[2], uAspect);
  
  float trailWake = exp(-dSeg0 * 16.0) * 0.75 +
                    exp(-dSeg1 * 20.0) * 0.45 +
                    exp(-dSeg2 * 25.0) * 0.22;
  trailWake *= s;

  // Localized Kamui Portal Space-Time Distortion
  float fall = exp(-r * 3.8);
  float spiralTwist = s * 6.5 * fall + trailWake * 1.8;
  float ripple = sin(r * 32.0 - uTime * 6.0) * s * 0.18 * fall;
  float ang = spiralTwist + ripple;
  
  float ca = cos(ang); float sa = sin(ang);
  d = mat2(ca, -sa, sa, ca) * d;
  
  // Subtle radial space-time distortion lens as the portal expands
  float radialDistort = (sin(r * 22.0 - uTime * 5.0) * 0.05 + (pow(r, 1.2) - r) * 0.25) * exp(-r * 2.2) * s;
  
  // Gravitational implosion pull towards portal center with trailing wake distortion
  vec2 pullDir = normalize(o + vec2(1e-6));
  vec2 suv = uCenter + vec2(d.x / uAspect, d.y) - pullDir * (s * 0.28 * fall + radialDistort + trailWake * 0.06);
  
  // Chromatic dispersion along local gravitational gradient & lingering wake
  float ab = s * 0.025 * fall + trailWake * 0.012 + 0.0002;
  vec3 col;
  col.r = texture2D(tDiffuse, suv + vec2(ab, 0.0)).r;
  col.g = texture2D(tDiffuse, suv).g;
  col.b = texture2D(tDiffuse, suv - vec2(ab, 0.0)).b;
  
  // Central Kamui singularity void
  float coreR = 0.22 * s;
  float core = smoothstep(coreR, coreR * 0.2, r);
  col *= 1.0 - core * 0.98;
  
  // Concentric spatial rift energy rings
  float ring = exp(-abs(r - (0.15 + 0.12 * s)) * 28.0);
  float ring2 = exp(-abs(r - (0.06 + 0.24 * s)) * 45.0);
  float KamuiGlow = exp(-abs(r - 0.05) * 50.0) * s;
  
  vec3 portalHue = mix(uColor, vec3(0.3, 0.9, 1.0), sin(uTime * 4.0) * 0.3 + 0.3);
  col += portalHue * (ring * 1.2 + ring2 * 0.6 + KamuiGlow * 1.5) * s;
  col += vec3(1.0, 0.95, 0.85) * core * 0.2 * s;
  
  // Lingering space-time trailing path glow
  col += vec3(0.4, 0.85, 1.0) * trailWake * 0.65;
  
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ------------------------- surface terrain ------------------------ */

export const terrainFrag = /* glsl */ `
uniform vec3 uDeep; uniform vec3 uBase; uniform vec3 uHigh; uniform vec3 uIce;
uniform vec3 uSunDir; uniform vec3 uFog; uniform float uFogDensity;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 q = vP * 0.16;
  float h = fbm(q*1.4);
  float patch = smoothstep(0.0, 0.4, fbm(q*0.5 + 9.0));
  vec3 col = mix(uBase, uHigh, smoothstep(0.05, 0.5, h));
  col = mix(col, uDeep, smoothstep(-0.1, -0.45, h) * 0.7);
  col = mix(col, uIce * 0.9, smoothstep(0.55, 0.8, h) * 0.4);
  float sun = max(dot(n, normalize(uSunDir)), 0.0);
  vec3 lit = col * (0.16 + 1.05*sun);
  float dist = length(cameraPosition - vW);
  float fog = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
  lit = mix(lit, uFog, clamp(fog, 0.0, 1.0));
  gl_FragColor = vec4(lit, 1.0);
}`;

export const terrainVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vW = (modelMatrix * vec4(position,1.0)).xyz;
  vP = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

/* --------------------------- anchor corona ------------------------- */
/* view-space billboard with organic ray structure — no sprite ring edges */
export const coronaVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy;
  gl_Position = projectionMatrix * mv;
}`;

export const coronaFrag = /* glsl */ `
uniform float uTime; uniform float uBoost;
uniform vec3 uColorA; uniform vec3 uColorB;
varying vec2 vUv;
${NOISE}

void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  if(r > 1.0) discard;
  
  float ang = atan(p.y, p.x);
  float t = uTime * 0.05;
  
  // Base field distortion for plasma swirling
  float swirl = fbm(vec3(p * 2.5, t)) * 0.8;
  float angDist = ang + swirl * (1.0 - r); 
  
  // Radial magnetic rays (high frequency)
  float rayNoise1 = snoise(vec3(cos(angDist)*4.0, sin(angDist)*4.0, t * 2.0));
  float rayNoise2 = snoise(vec3(cos(angDist)*14.0, sin(angDist)*14.0, t * 4.0 + 10.0));
  float rays = rayNoise1 * 0.5 + rayNoise2 * 0.25;
  rays = rays * 0.5 + 0.5; // map to 0..1
  
  // Sweeping Coronal Mass Ejections (CMEs) / Prominences
  float eruptDist = ang - swirl * 1.5 - r * 2.5;
  float eruptions = fbm3(vec3(cos(eruptDist)*1.5, sin(eruptDist)*1.5, t*1.2));
  eruptions = smoothstep(0.3, 0.8, eruptions);
  
  // Smooth physical falloff — inner K-corona bright, outer F-corona faint
  float inner = pow(1.0 - smoothstep(0.12, 0.45, r), 2.8);
  float outer = pow(1.0 - smoothstep(0.2, 1.0, r), 1.8);
  
  // Structure details
  float streaks = 0.35 + 0.65 * pow(rays, 1.8);
  float wisps = eruptions * (1.0 - smoothstep(0.15, 1.0, r)) * 1.8;
  
  // Dynamic spectral palette adapted to active reality
  vec3 colA = length(uColorA) > 0.05 ? uColorA : vec3(1.0, 0.6, 0.15);
  vec3 colB = length(uColorB) > 0.05 ? uColorB : vec3(0.9, 0.15, 0.02);

  vec3 ultraHot = mix(vec3(1.0, 1.0, 1.0), colA, 0.4);
  vec3 warm = colA;
  vec3 deep = colB;
  
  // Blend colors radially and structurally
  vec3 col = mix(deep, warm, inner * streaks + wisps * 0.5);
  col = mix(col, ultraHot, pow(inner, 3.0));
  
  // Opacity masking
  float a = (inner * streaks * 0.9 + outer * 0.3 * (0.3 + 0.7*streaks) + wisps * 0.45);
  
  // Hide the center slightly so it doesn't wash out the star completely (additive blending)
  float starMask = smoothstep(0.15, 0.20, r);
  a *= (0.4 + 0.6 * starMask);
  
  a *= uBoost;
  
  gl_FragColor = vec4(col * (1.0 + inner * 1.5), a * (1.0 - smoothstep(0.8, 1.0, r)));
}`;

/* ------------------------- deep-sky backdrop ----------------------- */
export const backdropVert = /* glsl */ `
varying vec3 vDir;

void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const backdropFrag = /* glsl */ `
uniform float uTime;
uniform float uKamuiErase;
uniform vec3 uVortexDir;
varying vec3 vDir;
${NOISE}

float starHash(vec3 p){
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main(){
  float k = clamp(uKamuiErase, 0.0, 1.0);
  if (k >= 0.998) {
    discard;
  }
  
  vec3 rawD = normalize(vDir);
  vec3 d = rawD;
  float edgeAlpha = 1.0;
  
  // =========================================================================
  // AUTHENTIC KAMUI SPACE-TIME NINJUTSU: PURE GEOMETRIC SPACE BENDING & VACUUM
  // =========================================================================
  // No external lightning, no artificial lines, no fake energy fx.
  // Space itself bends, twists, spirals into a singularity vacuum that sucks
  // reality in (and uncurls/releases when entering).
  if (k > 0.0005) {
    vec3 vAxis = normalize(uVortexDir);
    if (length(vAxis) < 0.01) {
      vAxis = vec3(0.0, 0.0, -1.0);
    }
    
    // Dynamic orthonormal coordinate frame aligned directly with camera sightline
    vec3 upRef = abs(vAxis.y) < 0.92 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangentX = normalize(cross(vAxis, upRef));
    vec3 tangentY = cross(tangentX, vAxis);
    
    // Angular displacement from the Kamui vortex center [0, PI]
    float dotV = clamp(dot(rawD, vAxis), -1.0, 1.0);
    float alpha = acos(dotV);
    float r = alpha / 3.14159265; // Normalized spherical radius [0, 1]
    
    // Azimuthal angle around vortex center [-PI, PI]
    float theta = atan(dot(rawD, tangentY), dot(rawD, tangentX));
    
    // 1. Relativistic Logarithmic Spiral Streamlines & Frame-Dragging Vortex
    // In polar vortex flow, space flows along logarithmic spirals: theta'(r) = theta + Omega(r, t)
    float vortexTwist = (18.0 * pow(k, 1.25)) / (pow(r, 0.58) + 0.035) + uTime * (5.5 + 4.5 * k);
    float twistedTheta = theta + vortexTwist;
    
    // 2. 3-Blade Spiral Streamline Phase Coordinate
    // Points of constant psi define continuous logarithmic spiral arms twisting into the core
    float psi = 3.0 * theta + (14.0 * pow(k, 1.2)) / (pow(r, 0.52) + 0.05) - uTime * 7.2;
    float spiralArmMetric = sin(psi) * 0.35 * k + cos(psi * 2.0 + uTime * 3.0) * 0.12 * k;
    
    // 3. Authentic Spiral Suction Horizon (True Spiraling Vortex Edge, NOT Concentric Circles)
    // The reality boundary contracts inward as an authentic multi-armed spiral whirlpool
    float spiralHorizon = (1.0 - pow(k, 1.12)) * 1.35 + spiralArmMetric * (1.0 - 0.3 * k);
    spiralHorizon = max(0.0001, spiralHorizon);

    // 4. Inward Logarithmic Suction & Space-Time Metric Compression
    // Coordinates are drawn inward along the logarithmic spiral streamlines into the throat
    float rNorm = r / max(0.001, spiralHorizon);
    float rSuction = pow(clamp(rNorm, 0.0002, 1.0), 1.0 + k * 1.5) * (1.0 + sin(psi) * 0.15 * k);
    rSuction = clamp(rSuction, 0.0002, 1.0);
    float warpedAlpha = rSuction * 3.14159265;

    // Reconstruct the curved, twisted 3D ray through warped space-time
    vec3 warpedRay = cos(twistedTheta) * sin(warpedAlpha) * tangentX +
                     sin(twistedTheta) * sin(warpedAlpha) * tangentY +
                     cos(warpedAlpha) * vAxis;
    d = normalize(warpedRay);

    // Smooth natural edge falloff at the spiraling horizon boundary of the vacuum portal
    float distToHorizon = spiralHorizon - r;
    edgeAlpha = r > spiralHorizon ? smoothstep(0.12, 0.0, r - spiralHorizon) : smoothstep(-0.07, 0.0, distToHorizon);
  }
  
  // Abyssal deep space vacuum background (360-degree dark universe base)
  vec3 col = vec3(0.001, 0.0015, 0.003);
  
  // =========================================================================
  // COSMOLOGICAL HIERARCHY STRUCTURE (From Cosmic Web to Solar System Scale)
  // =========================================================================
  
  // 1. COSMIC WEB & SUPERCLUSTER COMPLEX (Filaments & Voids across billions of light-years)
  vec3 webCoord = d * 4.5 + vec3(uTime * 0.001, 0.0, uTime * 0.0005);
  float n1 = snoise(webCoord);
  float n2 = snoise(webCoord * 2.1 + vec3(3.2, 7.1, 1.4));
  float filaments = pow(max(0.0, 1.0 - abs(n1) - abs(n2)), 3.5);
  float cosmicVoid = smoothstep(0.2, 0.7, abs(fbm3(d * 1.8)));
  
  vec3 webCol = mix(vec3(0.015, 0.035, 0.095), vec3(0.045, 0.025, 0.11), filaments);
  col += webCol * filaments * cosmicVoid * 1.6;
  
  // 2. SUPERCLUSTERS & GALAXY CLUSTERS AT WEB NODES
  float nodes = pow(filaments, 2.5) * smoothstep(0.3, 0.8, fbm3(d * 6.0));
  vec3 superclusterGlow = vec3(0.08, 0.09, 0.16) * nodes * 2.5;
  col += superclusterGlow;
  
  // 3. DISTANT GALAXIES & GALAXY GROUPS
  vec3 galCell = floor(d * 32.0);
  float galHash = starHash(galCell);
  if (galHash > 0.985) {
    float galDist = length(fract(d * 32.0) - 0.5);
    float galFall = smoothstep(0.42, 0.0, galDist);
    float galCore = pow((galHash - 0.985) / 0.015, 3.0) * galFall;
    vec3 galCol = mix(vec3(0.9, 0.7, 0.5), vec3(0.5, 0.7, 1.0), fract(galHash * 43.0));
    col += galCol * galCore * 0.45;
  }
  
  // 4. MILKY WAY GALAXY PLANE & SPIRAL ARMS
  vec3 bn = normalize(vec3(d.x, d.y * 2.2, d.z));
  float galacticPlane = exp(-pow(bn.y * 3.2, 2.0));
  
  vec3 bulgeCol = vec3(0.065, 0.05, 0.075);
  col += bulgeCol * galacticPlane;
  
  // 5. DARK MATTER & INTERSTELLAR DUST LANES
  float dustLanes = fbm3(d * 3.5 + vec3(1.4, -2.1, 4.8));
  float dustMask = 1.0 - smoothstep(0.35, 0.75, dustLanes) * galacticPlane * 0.85;
  col *= dustMask;
  
  // 6. LOCAL STAR-FORMING REGIONS
  float HII_region = fbm3(d * 2.2 + vec3(-5.2, 3.1, -1.8));
  float nebulaIon = pow(smoothstep(0.45, 0.82, HII_region), 2.2) * galacticPlane;
  vec3 HII_col = mix(vec3(0.05, 0.015, 0.06), vec3(0.02, 0.05, 0.08), sin(d.x * 3.0) * 0.5 + 0.5);
  col += HII_col * nebulaIon * 1.5;
  
  // 7. STELLAR SYSTEM & LOCAL FOREGROUND STARS
  vec3 starCell1 = floor(d * 900.0);
  float s1 = starHash(starCell1);
  if(s1 > 0.9986) {
    float starDist1 = length(fract(d * 900.0) - 0.5);
    float b = pow((s1 - 0.9986) / 0.0014, 2.5) * smoothstep(0.45, 0.0, starDist1);
    vec3 specCol = mix(vec3(0.65, 0.82, 1.0), vec3(1.0, 0.85, 0.65), fract(s1 * 17.0));
    col += specCol * b * 0.5 * dustMask;
  }

  vec3 starCell2 = floor(d * 1500.0);
  float s2 = starHash(starCell2);
  if(s2 > 0.9997) {
    float starDist2 = length(fract(d * 1500.0) - 0.5);
    float b = pow((s2 - 0.9997) / 0.0003, 3.0) * smoothstep(0.45, 0.0, starDist2);
    vec3 specCol = mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 0.92, 0.75), fract(s2 * 31.0));
    col += specCol * b * 0.85;
  }
  
  float alpha = edgeAlpha * (1.0 - smoothstep(0.88, 0.998, k));
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

/* --------------------------- multiverse bubble ----------------------- */
export const multiverseVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec2 vUv;
void main(){
  vN = normalize(normalMatrix * normal);
  vW = (modelMatrix * vec4(position, 1.0)).xyz;
  vP = position;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const multiverseFrag = /* glsl */ `
uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity;
uniform float uTearStrength;
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec2 vUv;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float rim = 1.0 - abs(dot(n, v));
  float irid = pow(rim, 2.2);
  
  // Internal cosmic swirl inside bubble universe
  vec3 q = vP * 0.00015 + vec3(uTime * 0.02, uTime * 0.01, 0.0);
  float swirl = fbm(q * 4.0);
  float galCore = exp(-length(vP.xy) * 0.0001);
  
  vec3 col = mix(uColorA, uColorB, swirl * 0.8 + 0.2);
  vec3 rimCol = mix(vec3(0.4, 0.85, 1.0), vec3(1.0, 0.45, 0.85), sin(uTime * 0.8 + rim * 6.2) * 0.5 + 0.5);
  col += rimCol * irid * 2.2;
  col += vec3(1.0, 0.96, 0.88) * galCore * 0.8;
  
  // Semi-transparent animated surface tears & cracks overlay before entering Kamui vortex
  float tear = clamp(uTearStrength, 0.0, 1.0);
  float crackMask = 0.0;
  if (tear > 0.001) {
    vec3 spherePos = normalize(vP);
    vec3 crackCoord = spherePos * 8.5 + vec3(uTime * 0.12, -uTime * 0.08, uTime * 0.09);
    vec3 warp = vec3(
      fbm3(crackCoord + vec3(0.0, 1.5, 3.1)),
      fbm3(crackCoord + vec3(4.1, 0.9, 2.2)),
      fbm3(crackCoord + vec3(2.3, 3.8, 0.5))
    );
    vec3 tearP = crackCoord * 1.5 + warp * 2.2;
    
    // Sharp zero-crossing ridge noise for jagged dimensional surface fissures
    float ridge1 = abs(snoise(tearP));
    float ridge2 = abs(snoise(tearP * 2.5 + vec3(3.8)));
    
    float crackCore = smoothstep(0.075 * tear + 0.008, 0.0, ridge1);
    float crackEdge = smoothstep(0.24 * tear + 0.015, 0.0, ridge1);
    float subCrack = smoothstep(0.055 * tear + 0.008, 0.0, ridge2) * 0.65;
    
    float crackPattern = max(crackCore, subCrack);
    crackMask = smoothstep(1.0 - tear * 1.35, 1.0 - tear * 0.75, fbm3(spherePos * 3.2));
    
    // High-energy electric cyan / magenta / white hot rift glow bleeding through fractures
    vec3 tearGlowCol = mix(vec3(0.0, 0.95, 1.0), vec3(1.0, 0.2, 0.75), sin(uTime * 4.5 + tearP.y * 3.0) * 0.5 + 0.5);
    vec3 tearHotCore = vec3(1.0, 0.98, 0.92);
    vec3 tearColor = mix(tearGlowCol * 3.0, tearHotCore * 5.0, crackCore);
    
    col = mix(col, col + tearColor * (crackPattern * 2.0 + crackEdge * 0.7), crackMask * tear);
  }
  
  float alpha = (irid * 0.88 + galCore * 0.5 + swirl * 0.2) * uOpacity;
  if (tear > 0.001) {
    alpha = max(alpha, crackMask * tear * 0.92);
  }
  gl_FragColor = vec4(col * 1.25, alpha);
}`;

/* --------------------------- 3D asteroid ----------------------------- */
export const asteroidVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}
void main(){
  vec3 p = position;
  float bump = fbm(p * 1.4) * 0.28 + fbm3(p * 4.8) * 0.08;
  p += normal * bump;
  // Compute displaced normal for smooth non-blocky lighting
  vec3 e1 = vec3(0.01, 0.0, 0.0);
  vec3 e2 = vec3(0.0, 0.01, 0.0);
  float bX = fbm((p + e1) * 1.4) * 0.28;
  float bY = fbm((p + e2) * 1.4) * 0.28;
  vec3 norm = normalize(normal + vec3((bX - bump)*20.0, (bY - bump)*20.0, 0.0));
  vN = normalize(normalMatrix * norm);
  vW = (modelMatrix * vec4(p, 1.0)).xyz;
  vP = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const asteroidFrag = /* glsl */ `
uniform vec3 uSunDir; uniform vec3 uColor;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  float sun = max(dot(n, normalize(uSunDir)), 0.0);
  float detail = fbm(vP * 5.5) * 0.35 + 0.65;
  // Crater rim details
  float crater = smoothstep(0.42, 0.68, fbm3(vP * 8.0));
  detail -= crater * 0.25;
  vec3 base = uColor * detail;
  vec3 lit = base * (0.15 + 1.15 * sun);
  gl_FragColor = vec4(lit, 1.0);
}`;

/* -------------------- distant exoplanet horizon plate ------------------- */
export const exoplanetPlateVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec2 vUv;
void main(){
  vN = normalize(normalMatrix * normal);
  vW = (modelMatrix * vec4(position, 1.0)).xyz;
  vP = position;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const exoplanetPlateFrag = /* glsl */ `
uniform float uTime; uniform vec3 uSunDir; uniform vec3 uColorAtm; uniform float uOpacity;
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec2 vUv;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float sun = dot(n, normalize(uSunDir));
  float day = smoothstep(-0.25, 0.35, sun);
  
  // High-detail planetary landmass & gas giant bands
  vec3 q = vP * 0.002 + vec3(uTime * 0.005, 0.0, 0.0);
  float continent = fbm(q * 2.2);
  float clouds = fbm(q * 5.5 + vec3(uTime * 0.008, 0.0, 0.0));
  
  // Planet surface colors
  vec3 deepSea = vec3(0.04, 0.12, 0.28);
  vec3 land = vec3(0.18, 0.42, 0.32);
  vec3 desert = vec3(0.65, 0.48, 0.28);
  vec3 ice = vec3(0.85, 0.92, 1.0);
  
  vec3 surfCol = mix(deepSea, land, smoothstep(0.38, 0.55, continent));
  surfCol = mix(surfCol, desert, smoothstep(0.58, 0.75, continent));
  surfCol = mix(surfCol, ice, smoothstep(0.72, 0.9, clouds));
  
  // Night side bioluminescent city clusters
  float nightCities = smoothstep(0.62, 0.85, fbm(q * 12.0)) * (1.0 - day);
  vec3 nightGlow = vec3(1.0, 0.75, 0.38) * nightCities * 1.4;
  
  // Surface lighting
  vec3 lit = surfCol * (0.08 + 1.12 * day) + nightGlow;
  
  // Atmospheric rim glow (Rayleigh scattering edge)
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.2);
  vec3 atmoCol = mix(uColorAtm * 0.8, uColorAtm * 1.6, day);
  lit += atmoCol * rim * 2.2;
  
  // Alpha edge fade so it blends gracefully into deep space
  float alphaEdge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
  
  gl_FragColor = vec4(lit, (0.85 + rim * 0.3) * alphaEdge * uOpacity);
}`;

/* --------------------------- surface sky -------------------------- */

export const skyFrag = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunDir;
varying vec3 vW;
void main(){
  vec3 d = normalize(vW - cameraPosition);
  float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.8));
  float sun = pow(max(dot(d, normalize(uSunDir)), 0.0), 220.0);
  float halo = pow(max(dot(d, normalize(uSunDir)), 0.0), 8.0);
  col += vec3(1.0, 0.9, 0.72) * sun * 2.2 + vec3(1.0, 0.85, 0.6) * halo * 0.18;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* --------------------------- sovereign multiverse core -------------------------- */

export const demonCoreVert = /* glsl */ `
uniform float uTime;
varying vec3 vN;
varying vec3 vW;
varying vec3 vP;
${NOISE}
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vP = position;
  
  // Relativistic Kerr gravitational pulsating surface distortion
  float disp = fbm(position * 0.00035 + vec3(uTime * 0.3, -uTime * 0.2, uTime * 0.25)) * 420.0;
  float pulse = sin(uTime * 2.8 + length(position) * 0.0008) * 180.0;
  vec3 displaced = position + normal * (disp + pulse);
  
  vW = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

export const demonCoreFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColorCore;
uniform vec3 uColorAura;
uniform float uHover;
uniform float uTearStrength;
varying vec3 vN;
varying vec3 vW;
varying vec3 vP;
${NOISE}

void main(){
  vec3 n = normalize(vN);
  vec3 viewDir = normalize(cameraPosition - vW);
  float mu = max(dot(n, viewDir), 0.0);
  
  vec3 q = normalize(vP);
  float t = uTime * 0.55;
  
  // 1. Relativistic Kerr Frame-Dragging Vortex (differential angular rotation)
  float ang = atan(q.z, q.x);
  float radius = length(q.xz);
  float vortexSpeed = 1.8 / (radius + 0.35);
  float rotAng = ang + t * vortexSpeed;
  
  // 2. Relativistic Doppler Beaming Asymmetry (approaching side is blueshifted & brighter)
  float doppler = sin(ang + t * 0.9) * 0.35 + 0.65;
  
  // 3. Multi-scale Quantum Vacuum Fluctuations & Turbulent Magnetohydrodynamics
  vec3 warpedQ = vec3(cos(rotAng) * radius, q.y, sin(rotAng) * radius);
  float warp = fbm3(warpedQ * 3.8 + vec3(t * 0.25, -t * 0.15, t * 0.18));
  float n1 = fbm(warpedQ * 5.5 + warp * 0.75);
  float n2 = fbm(warpedQ * 12.0 - vec3(t * 0.35, t * 0.2, -t * 0.25));
  float plasma = (n1 * 0.55 + n2 * 0.35 + warp * 0.2) * (0.75 + 0.35 * doppler);
  
  // 4. Supreme Multiverse Spectrum: Deep Void Black -> Electric Sapphire -> Dimensional Violet -> Supernova Amber-Gold
  // Dimmed to preserve rich geometric contrast without blinding white saturation
  vec3 colVoid = vec3(0.008, 0.005, 0.018);
  vec3 colSapphire = vec3(0.015, 0.32, 0.75);
  vec3 colViolet = vec3(0.52, 0.08, 0.72);
  vec3 colAmberGold = vec3(0.85, 0.48, 0.06);
  vec3 colWarmGlow = vec3(0.95, 0.82, 0.65);
  
  vec3 col = mix(colVoid, colSapphire, smoothstep(0.08, 0.42, plasma));
  col = mix(col, colViolet, smoothstep(0.42, 0.72, plasma));
  col = mix(col, colAmberGold, smoothstep(0.72, 0.90, plasma));
  col = mix(col, colWarmGlow, smoothstep(0.90, 0.99, plasma));
  
  // 5. Chromatic Gravitational Lensing Separation
  float chromaR = fbm(warpedQ * 6.2 + vec3(0.05, 0.0, 0.0));
  float chromaB = fbm(warpedQ * 6.2 - vec3(0.05, 0.0, 0.0));
  col.r += chromaR * 0.15 * (1.0 - mu);
  col.b += chromaB * 0.22 * (1.0 - mu);
  
  // 6. Sacred Multidimensional Tesseract Resonance Grid (Crisp neon filament lines)
  float gridX = abs(fract(q.x * 12.0 + t * 0.15) - 0.5);
  float gridY = abs(fract(q.y * 12.0 - t * 0.12) - 0.5);
  float gridZ = abs(fract(q.z * 12.0 + t * 0.18) - 0.5);
  float tesseractLattice = smoothstep(0.46, 0.495, min(gridX, min(gridY, gridZ)));
  col += vec3(0.0, 0.85, 0.75) * tesseractLattice * 0.85 * smoothstep(0.15, 0.85, plasma);
  
  // 7. Photon Ring & Relativistic Event Horizon Rim Glow (Tightly calibrated, non-overexposing)
  float photonRing = pow(1.0 - mu, 3.2);
  float thinCorona = pow(1.0 - mu, 8.5);
  vec3 rimCol = mix(vec3(0.0, 0.85, 0.75), vec3(0.85, 0.12, 0.55), sin(t * 1.2 + q.y * 5.0) * 0.5 + 0.5);
  col += rimCol * photonRing * 0.95 + vec3(0.85, 0.92, 0.98) * thinCorona * 1.1;
  
  // 8. Central Singularity Focus
  float eyeGaze = pow(mu, 6.0);
  col += mix(vec3(0.85, 0.08, 0.32), vec3(0.2, 0.75, 0.85), sin(t * 1.6) * 0.5 + 0.5) * eyeGaze * 0.75;
  
  // Hover & Active Resonance Boost (Clean & subtle)
  col *= 0.92 + uHover * 0.35 + sin(t * 2.5) * 0.06;
  
  // Semi-transparent animated surface tears & cracks overlay before entering Kamui vortex
  float tear = clamp(uTearStrength, 0.0, 1.0);
  if (tear > 0.001) {
    vec3 crackCoord = q * 9.5 + vec3(uTime * 0.14, -uTime * 0.09, uTime * 0.11);
    vec3 warpTear = vec3(
      fbm3(crackCoord + vec3(0.0, 1.5, 3.1)),
      fbm3(crackCoord + vec3(4.1, 0.9, 2.2)),
      fbm3(crackCoord + vec3(2.3, 3.8, 0.5))
    );
    vec3 tearP = crackCoord * 1.5 + warpTear * 2.4;
    
    float ridge1 = abs(snoise(tearP));
    float ridge2 = abs(snoise(tearP * 2.7 + vec3(4.5)));
    
    float crackCore = smoothstep(0.08 * tear + 0.008, 0.0, ridge1);
    float crackEdge = smoothstep(0.25 * tear + 0.015, 0.0, ridge1);
    float subCrack = smoothstep(0.06 * tear + 0.008, 0.0, ridge2) * 0.65;
    
    float crackPattern = max(crackCore, subCrack);
    float crackMask = smoothstep(1.0 - tear * 1.35, 1.0 - tear * 0.75, fbm3(q * 3.5));
    
    vec3 tearGlowCol = mix(vec3(0.0, 0.95, 1.0), vec3(1.0, 0.25, 0.75), sin(uTime * 4.0 + tearP.y * 3.0) * 0.5 + 0.5);
    vec3 tearHotCore = vec3(1.0, 0.98, 0.92);
    vec3 tearColor = mix(tearGlowCol * 3.2, tearHotCore * 5.0, crackCore);
    
    col = mix(col, col + tearColor * (crackPattern * 2.2 + crackEdge * 0.7), crackMask * tear);
  }
  
  gl_FragColor = vec4(col, 0.95);
}
`;

/* ----------------- Giant Multiverse Boundary Hypersphere ---------------- */
export const multiverseBoundaryVert = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
varying vec3 vP;
varying vec2 vUv;
void main(){
  vN = normalize(normalMatrix * normal);
  vW = (modelMatrix * vec4(position, 1.0)).xyz;
  vP = position;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

export const multiverseBoundaryFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uKamuiErase;
uniform vec3 uVortexDir;
varying vec3 vN;
varying vec3 vW;
varying vec3 vP;
varying vec2 vUv;
${NOISE}

void main(){
  float k = clamp(uKamuiErase, 0.0, 1.0);
  vec3 q = normalize(vP);
  
  // Kamui Space-Time Bending & Spiral Suction directly on the Multiverse Hypersphere surface
  if (k > 0.001) {
    vec3 vAxis = normalize(uVortexDir);
    if (length(vAxis) < 0.01) vAxis = vec3(0.0, 0.0, -1.0);
    
    vec3 upRef = abs(vAxis.y) < 0.92 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangentX = normalize(cross(vAxis, upRef));
    vec3 tangentY = cross(tangentX, vAxis);
    
    float dotV = clamp(dot(q, vAxis), -1.0, 1.0);
    float alpha = acos(dotV);
    float r = alpha / 3.14159265;
    float theta = atan(dot(q, tangentY), dot(q, tangentX));
    
    // Logarithmic spiral swirling on the giant sphere surface
    float vortexTwist = (14.0 * pow(k, 1.25)) / (pow(r, 0.58) + 0.038) + uTime * (4.2 + 3.8 * k);
    float twistedTheta = theta + vortexTwist;
    
    // Logarithmic metric suction pulling geodesic lines toward vortex axis
    float rSuction = pow(clamp(r, 0.0001, 1.0), 1.0 + k * 1.5);
    float warpedAlpha = rSuction * 3.14159265;
    
    vec3 warpedQ = cos(twistedTheta) * sin(warpedAlpha) * tangentX +
                   sin(twistedTheta) * sin(warpedAlpha) * tangentY +
                   cos(warpedAlpha) * vAxis;
    q = normalize(warpedQ);
  }

  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float ndotv = abs(dot(n, v));
  float rim = pow(1.0 - ndotv, 2.8);
  
  // Spherical celestial coordinates (Quantum flux geodesics & spiral streamlines)
  float lat = q.y;
  float lon = atan(q.z, q.x);
  
  // Continuous Helical & Spiral Flux Streamlines (No static concentric circles)
  float spiral1 = abs(fract((lon / 3.14159265) * 4.0 + lat * 3.5 - uTime * 0.04) - 0.5);
  float spiral2 = abs(fract((lon / 3.14159265) * 4.0 - lat * 3.5 + uTime * 0.035) - 0.5);
  float flowLines = min(spiral1, spiral2);
  float grid = smoothstep(0.46, 0.492, flowLines);
  
  // Subtle iridescent aurora membrane across outer multiverse sphere
  float aurora = fbm3(q * 3.8 + vec3(uTime * 0.012, uTime * 0.008, 0.0));
  vec3 baseCol = mix(uColorA, uColorB, aurora * 0.5 + 0.5);
  vec3 gridCol = vec3(0.0, 0.96, 0.85);
  
  vec3 col = mix(baseCol * 0.4, gridCol, grid * 0.55);
  col += vec3(0.65, 0.35, 0.95) * rim * 1.4;
  
  if (k > 0.01) {
    float kGlow = sin(uTime * 5.0 + lat * 4.0) * 0.2 + 0.8;
    col += vec3(0.0, 0.95, 0.85) * k * kGlow * 0.45;
  }
  
  float alpha = rim * 0.28 + grid * 0.16 + aurora * 0.07;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.55));
}
`;
