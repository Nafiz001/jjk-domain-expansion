import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  type DriftOptions,
  glow,
  makeDriftPoints,
  makeGlowSprite,
  makeGround,
  makeRimMaterial,
  makeTextSprite,
  range,
  rng
} from './shared';

/**
 * The six innate domains, each built procedurally as its own realm. Every builder returns a group
 * in local space (camera enters from +z, travels toward -z), six camera stations (one per story
 * phase), its atmosphere palette, and a per-frame tick.
 */

export interface ZonePalette {
  fog: string;
  fogDensity: number;
  skyTop: string;
  skyBottom: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sun: string;
  sunIntensity: number;
}

export interface Station {
  pos: [number, number, number];
  look: [number, number, number];
}

export interface Zone {
  group: THREE.Group;
  stations: Station[];
  palette: ZonePalette;
  tick: (time: number) => void;
}

export interface ZoneContext {
  accent: string;
  nameJa: string;
  seed: number;
}

type Tick = (time: number) => void;

/** Collects time-driven shader materials and custom animations for a zone. */
function animator() {
  const ticks: Tick[] = [];
  return {
    ticks,
    timeUniform(material: THREE.Material) {
      const m = material as THREE.ShaderMaterial;
      ticks.push((t) => {
        m.uniforms.time.value = t;
      });
    },
    add(fn: Tick) {
      ticks.push(fn);
    },
    run(t: number) {
      for (const fn of ticks) fn(t);
    }
  };
}

function addTitle(group: THREE.Group, ctx: ZoneContext, pos: [number, number, number]) {
  const title = makeTextSprite(ctx.nameJa, ctx.accent);
  title.position.set(...pos);
  (title.material as THREE.SpriteMaterial).opacity = 0.55;
  group.add(title);
}

function addDrift(group: THREE.Group, anim: ReturnType<typeof animator>, options: DriftOptions) {
  const points = makeDriftPoints(options);
  anim.timeUniform(points.material as THREE.Material);
  group.add(points);
}

function makeStarfield(count: number, radius: number, seed: number, color = '#ffffff', size = 1.6) {
  const r = rng(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = r() * Math.PI * 2;
    const phi = Math.acos(2 * r() - 1);
    const rr = radius * (0.7 + 0.3 * r());
    positions.set([rr * Math.sin(phi) * Math.cos(theta), Math.abs(rr * Math.cos(phi)) * 0.8, rr * Math.sin(phi) * Math.sin(theta)], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color, size, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9, depthWrite: false })
  );
}

/** Twisting tube rising from the ground (shadow tendrils, flesh tentacles). */
function makeTendril(r: () => number, base: THREE.Vector3, height: number, radius: number, twist = 1): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  const phase = r() * Math.PI * 2;
  const segs = 7;
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const sway = 4 + f * height * 0.12;
    pts.push(
      new THREE.Vector3(
        base.x + Math.sin(phase + f * 4 * twist) * sway,
        base.y + f * height,
        base.z + Math.cos(phase + f * 3.3 * twist) * sway
      )
    );
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 56, radius, 8, false);
}

function scatterInstances(
  mesh: THREE.InstancedMesh,
  place: (i: number, m: THREE.Matrix4) => void
) {
  const m = new THREE.Matrix4();
  for (let i = 0; i < mesh.count; i++) {
    place(i, m);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();

function compose(m: THREE.Matrix4, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy = sx, sz = sx) {
  tmpP.set(x, y, z);
  tmpQ.setFromEuler(tmpE.set(rx, ry, rz));
  tmpS.set(sx, sy, sz);
  return m.compose(tmpP, tmpQ, tmpS);
}

// ─────────────────────────────────────────────────────────────────────────────
// 01 無量空処 INFINITE VOID — a black hole drinking an endless stream of information
// ─────────────────────────────────────────────────────────────────────────────
export function buildInfiniteVoid(ctx: ZoneContext): Zone {
  const group = new THREE.Group();
  const anim = animator();
  const r = rng(ctx.seed);

  const ground = makeGround('void', '#01020a', '#1aa3d9');
  ground.position.y = -40;
  group.add(ground);
  anim.timeUniform(ground.material as THREE.Material);
  group.add(makeStarfield(5000, 900, ctx.seed + 1, '#cfe9ff', 1.4));

  // Black hole: horizon, photon ring, tilted accretion disk and its lensed halo
  const bh = new THREE.Group();
  bh.position.set(0, 55, -310);
  group.add(bh);
  bh.add(new THREE.Mesh(new THREE.SphereGeometry(24, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })));
  bh.add(new THREE.Mesh(new THREE.TorusGeometry(25.6, 0.55, 16, 180), new THREE.MeshBasicMaterial({ color: glow('#d8f6ff', 2.4), fog: false })));
  const diskMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, inner: { value: 28 }, outer: { value: 100 } },
    vertexShader: `varying vec3 vLocal; void main() { vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform float inner;
      uniform float outer;
      varying vec3 vLocal;
      void main() {
        float rad = length(vLocal.xy);
        float f = clamp((rad - inner) / (outer - inner), 0.0, 1.0);
        float ang = atan(vLocal.y, vLocal.x);
        float bands = 0.55 + 0.45 * sin(ang * 3.0 + rad * 0.35 - time * 2.2) * sin(rad * 0.9 - time * 1.3);
        vec3 hot = vec3(1.0, 0.97, 0.92) * 1.9;
        vec3 mid = vec3(0.25, 0.85, 1.0) * 1.15;
        vec3 cold = vec3(0.35, 0.15, 0.9) * 0.9;
        vec3 col = mix(mix(hot, mid, smoothstep(0.0, 0.35, f)), cold, smoothstep(0.35, 1.0, f));
        float a = (1.0 - f) * (1.0 - f) * bands * smoothstep(0.0, 0.03, f);
        gl_FragColor = vec4(col * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  anim.timeUniform(diskMaterial);
  const disk = new THREE.Mesh(new THREE.RingGeometry(28, 100, 200, 1), diskMaterial);
  disk.rotation.x = -Math.PI / 2 + 0.28;
  bh.add(disk);
  const halo = new THREE.Mesh(new THREE.RingGeometry(26, 62, 160, 1), diskMaterial);
  halo.position.z = -2;
  bh.add(halo);
  const bhGlow = makeGlowSprite('#69d8ff', 320, 0.2);
  bhGlow.position.z = -8;
  bh.add(bhGlow);

  // Infinite information: thousands of motes spiralling into the horizon
  const count = 3500;
  const start = new Float32Array(count * 3);
  const offset = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const theta = r() * Math.PI * 2;
    const phi = Math.acos(2 * r() - 1);
    const rad = range(r, 140, 420);
    start.set([rad * Math.sin(phi) * Math.cos(theta), rad * Math.cos(phi) * 0.5, rad * Math.sin(phi) * Math.sin(theta)], i * 3);
    offset[i] = r();
  }
  const flowGeometry = new THREE.BufferGeometry();
  flowGeometry.setAttribute('position', new THREE.BufferAttribute(start, 3));
  flowGeometry.setAttribute('offset', new THREE.BufferAttribute(offset, 1));
  const flowMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, pixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) } },
    vertexShader: /* glsl */ `
      attribute float offset;
      uniform float time;
      uniform float pixelRatio;
      varying float vLife;
      void main() {
        float f = fract(time * 0.05 + offset);
        float ang = f * 5.0;
        vec3 p = position * (1.0 - f * f);
        p.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xz;
        vLife = f;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.5 + f * 3.0) * pixelRatio * (300.0 / max(1.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vLife;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * sin(vLife * 3.14159);
        gl_FragColor = vec4(mix(vec3(0.3, 0.9, 1.0), vec3(1.0), vLife) * 1.6 * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  anim.timeUniform(flowMaterial);
  const flow = new THREE.Points(flowGeometry, flowMaterial);
  flow.frustumCulled = false;
  bh.add(flow);

  // Floating crystal monoliths with glowing edges
  const crystals = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), makeRimMaterial('#020610', '#00f0ff', 1.8, 1.6), 80);
  const crystalData = Array.from({ length: crystals.count }, () => ({
    x: range(r, -150, 150),
    y: range(r, -15, 95),
    z: range(r, -230, 190),
    s: range(r, 2.5, 7),
    h: range(r, 2.2, 4),
    spin: range(r, -0.4, 0.4),
    bob: r() * 6
  })).filter((c) => Math.abs(c.x) > 14 || c.y > 50);
  crystals.count = crystalData.length;
  const cm = new THREE.Matrix4();
  anim.add((t) => {
    crystalData.forEach((c, i) => {
      crystals.setMatrixAt(i, compose(cm, c.x, c.y + Math.sin(t * 0.5 + c.bob) * 2, c.z, 0, t * c.spin, 0.2, c.s, c.s * c.h, c.s));
    });
    crystals.instanceMatrix.needsUpdate = true;
  });
  anim.run(0);
  crystals.computeBoundingSphere();
  group.add(crystals);

  // Distant spiral galaxy
  const gCount = 9000;
  const gPos = new Float32Array(gCount * 3);
  const gCol = new Float32Array(gCount * 3);
  const c1 = new THREE.Color('#9ad8ff');
  const c2 = new THREE.Color('#b388ff');
  for (let i = 0; i < gCount; i++) {
    const arm = i % 3;
    const rad = Math.pow(r(), 0.7) * 260;
    const ang = arm * ((Math.PI * 2) / 3) + rad * 0.022 + range(r, -0.3, 0.3);
    gPos.set([Math.cos(ang) * rad + range(r, -10, 10), range(r, -6, 6), Math.sin(ang) * rad + range(r, -10, 10)], i * 3);
    const c = c1.clone().lerp(c2, rad / 260).multiplyScalar(1.4 - rad / 400);
    gCol.set([c.r, c.g, c.b], i * 3);
  }
  const gGeometry = new THREE.BufferGeometry();
  gGeometry.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
  gGeometry.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
  const galaxy = new THREE.Points(
    gGeometry,
    new THREE.PointsMaterial({ size: 1.8, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })
  );
  galaxy.position.set(-300, 250, -470);
  galaxy.rotation.set(1.1, 0, 0.4);
  anim.add((t) => {
    galaxy.rotation.y = t * 0.01;
  });
  group.add(galaxy);

  addTitle(group, ctx, [0, 165, -360]);

  return {
    group,
    palette: {
      fog: '#02040d',
      fogDensity: 0.0032,
      skyTop: '#000004',
      skyBottom: '#071733',
      hemiSky: '#7fd9ff',
      hemiGround: '#05060b',
      hemiIntensity: 0.9,
      sun: '#bfe9ff',
      sunIntensity: 1.2
    },
    stations: [
      { pos: [0, 12, 210], look: [0, 45, -310] },
      { pos: [-45, 28, 115], look: [0, 50, -310] },
      { pos: [32, 6, 30], look: [-25, 30, -70] },
      { pos: [0, 48, -70], look: [0, 55, -310] },
      { pos: [70, 95, -170], look: [0, 50, -310] },
      { pos: [0, 58, -228], look: [0, 55, -310] }
    ],
    tick: anim.run
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 02 伏魔御廚子 MALEVOLENT SHRINE — a sea of blood, a ribcage gate, mountains of skulls
// ─────────────────────────────────────────────────────────────────────────────
export function buildMalevolentShrine(ctx: ZoneContext): Zone {
  const group = new THREE.Group();
  const anim = animator();
  const r = rng(ctx.seed);

  const sea = makeGround('blood', '#3d0407', '#ff3b3b');
  group.add(sea);
  anim.timeUniform(sea.material as THREE.Material);

  const bone = new THREE.MeshStandardMaterial({ color: '#d9ccb4', roughness: 0.75, metalness: 0.05 });
  const darkWood = new THREE.MeshStandardMaterial({ color: '#1c0505', roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#0f0203', roughness: 0.6, metalness: 0.2 });
  const ember = new THREE.MeshBasicMaterial({ color: glow('#ff2a1a', 2.6) });
  const toriiMat = new THREE.MeshStandardMaterial({ color: '#b5121b', roughness: 0.55, emissive: '#3a0004' });

  // Torii avenue rising out of the blood
  for (let i = 0; i < 8; i++) {
    const torii = new THREE.Group();
    const pillarGeo = new THREE.CylinderGeometry(1.1, 1.3, 24, 12);
    for (const x of [-9, 9]) {
      const pillar = new THREE.Mesh(pillarGeo, toriiMat);
      pillar.position.set(x, 10, 0);
      torii.add(pillar);
    }
    const kasagi = new THREE.Mesh(new THREE.BoxGeometry(31, 2.2, 3.2), toriiMat);
    kasagi.position.y = 22.5;
    torii.add(kasagi);
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(24, 1.3, 1.8), toriiMat);
    nuki.position.y = 17.5;
    torii.add(nuki);
    torii.position.set(Math.sin(i * 0.7) * 4, 0, 230 - i * 20);
    torii.rotation.z = Math.sin(i * 1.9) * 0.04;
    group.add(torii);
  }

  // Ribcage tunnel arching over the approach
  const ribGeo = new THREE.TorusGeometry(46, 2.2, 10, 56, Math.PI);
  for (let i = 0; i < 9; i++) {
    const rib = new THREE.Mesh(ribGeo, bone);
    rib.position.set(0, -2, 70 - i * 15);
    rib.scale.set(1, 1.25 - i * 0.02, 1);
    rib.rotation.z = Math.sin(i * 1.3) * 0.05;
    group.add(rib);
  }

  // The shrine: tiered pagoda with ember-lit eaves and curling horns
  const shrine = new THREE.Group();
  shrine.position.set(0, 0, -160);
  group.add(shrine);
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(58, 64, 8, 48), bone);
  platform.position.y = 2;
  shrine.add(platform);
  let y = 6;
  for (let i = 0; i < 5; i++) {
    const w = 40 - i * 7;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 9, w), darkWood);
    body.position.y = y + 4.5;
    shrine.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(w * 1.01, 1.2, w * 1.01), ember);
    band.position.y = y + 6;
    shrine.add(band);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.3, w * 0.98, 5.5, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = y + 11.5;
    shrine.add(roof);
    y += 14;
  }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(2.4, 18, 8), roofMat);
  spire.position.y = y + 6;
  shrine.add(spire);
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 6, y - 4, 0),
      new THREE.Vector3(side * 20, y + 8, 0),
      new THREE.Vector3(side * 26, y + 26, -4),
      new THREE.Vector3(side * 18, y + 40, -10)
    ]);
    shrine.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 2.4, 10, false), bone));
  }
  const shrineGlow = makeGlowSprite('#ff2a1a', 110, 0.3);
  shrineGlow.position.y = 40;
  shrine.add(shrineGlow);

  // Mountains of skulls
  const mounds = [
    [-125, -150, 50, 70],
    [125, -150, 55, 62],
    [-85, -270, 60, 80],
    [105, -275, 55, 72],
    [0, -320, 70, 95],
    [-175, -55, 40, 46],
    [175, -65, 42, 50]
  ];
  const skulls = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.5, 0), bone, 3200);
  const tint = new THREE.Color();
  scatterInstances(skulls, (i, m) => {
    const [cx, cz, R, H] = mounds[i % mounds.length];
    const rr = R * Math.sqrt(r());
    const a = r() * Math.PI * 2;
    const yMax = H * (1 - rr / R);
    compose(m, cx + Math.cos(a) * rr, yMax * (0.55 + 0.45 * r()), cz + Math.sin(a) * rr, r() * 6, r() * 6, r() * 6, range(r, 0.8, 2.2));
    skulls.setColorAt(i, tint.setHSL(0.07, 0.25, range(r, 0.45, 0.85)));
  });
  group.add(skulls);

  // Dismantle: slashes flickering across the air
  const slashMat = new THREE.MeshBasicMaterial({
    color: glow('#ffe1e1', 3),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false
  });
  const slashes = Array.from({ length: 16 }, () => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), slashMat.clone());
    s.position.set(range(r, -160, 160), range(r, 10, 120), range(r, -260, 140));
    s.rotation.set(range(r, -0.4, 0.4), range(r, -1, 1), range(r, -Math.PI, Math.PI));
    s.scale.set(range(r, 120, 260), range(r, 0.4, 1.1), 1);
    group.add(s);
    return { mesh: s, phase: r() * 10, rate: range(r, 0.3, 0.9) };
  });
  anim.add((t) => {
    for (const s of slashes) {
      const f = (t * s.rate + s.phase) % 1;
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = f < 0.08 ? 1 - f / 0.08 : 0;
    }
  });

  // Eclipse in a red sky
  const eclipse = new THREE.Group();
  eclipse.position.set(60, 220, -470);
  eclipse.add(makeGlowSprite('#ff1f2f', 420, 0.75));
  const moon = new THREE.Mesh(new THREE.CircleGeometry(48, 64), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }));
  moon.position.z = 1;
  eclipse.add(moon);
  const corona = new THREE.Mesh(new THREE.TorusGeometry(49, 1.2, 8, 96), new THREE.MeshBasicMaterial({ color: glow('#ff6b5b', 3), fog: false }));
  corona.position.z = 1.5;
  eclipse.add(corona);
  group.add(eclipse);

  addDrift(group, anim, {
    count: 1400,
    box: new THREE.Vector3(500, 160, 700),
    velocity: new THREE.Vector3(2, 6, 0),
    jitter: 2,
    sway: 3,
    size: 1.8,
    color: '#ff5a2a',
    colorB: '#ffc07a',
    seed: ctx.seed + 7
  });
  addTitle(group, ctx, [0, 175, -380]);

  return {
    group,
    palette: {
      fog: '#1d0204',
      fogDensity: 0.0042,
      skyTop: '#080000',
      skyBottom: '#5e0a0d',
      hemiSky: '#ff6b5b',
      hemiGround: '#2a0204',
      hemiIntensity: 1.1,
      sun: '#ff4a3a',
      sunIntensity: 1.6
    },
    stations: [
      { pos: [0, 7, 250], look: [0, 18, -160] },
      { pos: [14, 5, 150], look: [0, 12, 40] },
      { pos: [0, 15, 62], look: [0, 22, -160] },
      { pos: [0, 20, -36], look: [0, 40, -160] },
      { pos: [-95, 78, -70], look: [0, 30, -170] },
      { pos: [0, 105, -78], look: [0, 20, -168] }
    ],
    tick: anim.run
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 03 嵌合暗翳庭 CHIMERA SHADOW GARDEN — a black liquid mirror where shadows grow and watch
// ─────────────────────────────────────────────────────────────────────────────
export function buildChimeraShadow(ctx: ZoneContext): Zone {
  const group = new THREE.Group();
  const anim = animator();
  const r = rng(ctx.seed);

  const mirror = makeGround('shadow', '#010406', '#00e5ff');
  group.add(mirror);
  anim.timeUniform(mirror.material as THREE.Material);

  const shadowMat = makeRimMaterial('#000102', '#00e5ff', 2.4, 1.5);
  const tendrils: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 36; i++) {
    const x = range(r, -170, 170);
    const z = range(r, -280, 200);
    if (Math.abs(x) < 16 && z > -60) continue; // keep the flight corridor clear
    tendrils.push(makeTendril(r, new THREE.Vector3(x, -4, z), range(r, 40, 130), range(r, 1.2, 3.4)));
  }
  // The central knot: giant shadows braided around each other
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    tendrils.push(makeTendril(r, new THREE.Vector3(Math.cos(a) * 14, -4, -130 + Math.sin(a) * 14), range(r, 150, 190), range(r, 4.5, 7), 0.6));
  }
  group.add(new THREE.Mesh(mergeGeometries(tendrils), shadowMat));

  // Shadow orbs bobbing over the mirror
  const orbs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), shadowMat, 60);
  const orbData = Array.from({ length: orbs.count }, () => ({
    x: range(r, -150, 150),
    y: range(r, 6, 70),
    z: range(r, -260, 180),
    s: range(r, 1.5, 6),
    p: r() * 6
  }));
  const om = new THREE.Matrix4();
  anim.add((t) => {
    orbData.forEach((o, i) => orbs.setMatrixAt(i, compose(om, o.x, o.y + Math.sin(t * 0.6 + o.p) * 3, o.z, 0, 0, 0, o.s)));
    orbs.instanceMatrix.needsUpdate = true;
  });
  anim.run(0);
  orbs.computeBoundingSphere();
  group.add(orbs);

  // Eyes in the dark: shikigami watching, blinking out of sync
  const pairs = 170;
  const eyePos = new Float32Array(pairs * 2 * 3);
  const eyePhase = new Float32Array(pairs * 2);
  for (let i = 0; i < pairs; i++) {
    const x = range(r, -180, 180);
    const yy = range(r, 3, 40);
    const z = range(r, -300, 200);
    const gap = range(r, 0.8, 1.6);
    eyePos.set([x - gap, yy, z, x + gap, yy, z], i * 6);
    const ph = r() * 20;
    eyePhase[i * 2] = ph;
    eyePhase[i * 2 + 1] = ph;
  }
  const eyeGeometry = new THREE.BufferGeometry();
  eyeGeometry.setAttribute('position', new THREE.BufferAttribute(eyePos, 3));
  eyeGeometry.setAttribute('phase', new THREE.BufferAttribute(eyePhase, 1));
  const eyeMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, pixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) } }]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      attribute float phase;
      uniform float time;
      uniform float pixelRatio;
      varying float vOpen;
      void main() {
        float cycle = fract(time * 0.12 + phase * 0.05);
        vOpen = smoothstep(0.0, 0.03, cycle) * (1.0 - smoothstep(0.55, 0.6, cycle));
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 2.6 * pixelRatio * (300.0 / max(1.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      varying float vOpen;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        q.y *= 1.0 / max(0.05, vOpen);
        float d = length(q);
        if (d > 0.5 || vOpen < 0.02) discard;
        gl_FragColor = vec4(vec3(0.75, 1.0, 1.0) * 2.4, smoothstep(0.5, 0.1, d));
        #include <fog_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true
  });
  anim.timeUniform(eyeMaterial);
  group.add(new THREE.Points(eyeGeometry, eyeMaterial));

  // Pale moon
  const moon = new THREE.Group();
  moon.position.set(140, 230, -470);
  moon.add(makeGlowSprite('#bfe8ff', 360, 0.55));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshBasicMaterial({ color: glow('#eaf8ff', 1.4), fog: false }));
  disc.position.z = 1;
  moon.add(disc);
  group.add(moon);

  addDrift(group, anim, {
    count: 900,
    box: new THREE.Vector3(420, 60, 600),
    velocity: new THREE.Vector3(0, 1.2, -1),
    jitter: 0.6,
    sway: 5,
    size: 2.2,
    color: '#5ff3ff',
    opacity: 0.6,
    seed: ctx.seed + 9
  });
  addTitle(group, ctx, [0, 185, -380]);

  return {
    group,
    palette: {
      fog: '#01080c',
      fogDensity: 0.0055,
      skyTop: '#000000',
      skyBottom: '#04202b',
      hemiSky: '#5ff3ff',
      hemiGround: '#000000',
      hemiIntensity: 0.6,
      sun: '#bfe8ff',
      sunIntensity: 0.8
    },
    stations: [
      { pos: [0, 5, 225], look: [0, 35, -130] },
      { pos: [-48, 2.6, 135], look: [0, 10, 30] },
      { pos: [38, 9, 40], look: [0, 30, -130] },
      { pos: [0, 32, -40], look: [0, 50, -150] },
      { pos: [80, 70, -120], look: [0, 40, -130] },
      { pos: [0, 14, -215], look: [0, 80, -120] }
    ],
    tick: anim.run
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 04 真贋相愛 AUTHENTIC MUTUAL LOVE — a field of countless swords under Jacob's Ladder
// ─────────────────────────────────────────────────────────────────────────────
export function buildAuthenticMutualLove(ctx: ZoneContext): Zone {
  const group = new THREE.Group();
  const anim = animator();
  const r = rng(ctx.seed);

  const field = makeGround('field', '#2b1521', '#ff7ab0');
  group.add(field);
  anim.timeUniform(field.material as THREE.Material);

  // Katana: blade driven into the ground, guard and grip above
  const blade = new THREE.BoxGeometry(0.34, 9, 0.07).translate(0, -4.5, 0);
  const guard = new THREE.CylinderGeometry(0.75, 0.75, 0.22, 12);
  const grip = new THREE.CylinderGeometry(0.17, 0.17, 3.2, 8).translate(0, 1.7, 0);
  const katana = mergeGeometries([blade, guard, grip]);
  const steel = new THREE.MeshStandardMaterial({ color: '#d4d6df', metalness: 0.85, roughness: 0.25, emissive: '#2a0a1a', emissiveIntensity: 0.6 });
  const swords = new THREE.InstancedMesh(katana, steel, 3200);
  scatterInstances(swords, (_, m) => {
    let x = 0;
    let z = 0;
    do {
      x = range(r, -280, 280);
      z = range(r, -340, 240);
    } while (Math.abs(x) < 10 && z > -90);
    compose(m, x, range(r, 0.5, 4), z, range(r, -0.3, 0.3), r() * Math.PI, range(r, -0.3, 0.3), range(r, 0.8, 1.5));
  });
  group.add(swords);

  // Giant crosses with gilded rims
  const crossMat = makeRimMaterial('#120a0e', '#ffd166', 2.0, 1.4);
  const crossGeo = mergeGeometries([new THREE.BoxGeometry(4, 64, 4).translate(0, 32, 0), new THREE.BoxGeometry(30, 4, 4).translate(0, 46, 0)]);
  for (const [x, z, tilt] of [
    [-70, -80, 0.06],
    [85, -120, -0.08],
    [-120, -220, 0.1],
    [110, -250, -0.05],
    [0, -300, 0],
    [-40, -170, -0.04]
  ]) {
    const cross = new THREE.Mesh(crossGeo, crossMat);
    cross.position.set(x, -2, z);
    cross.rotation.set(0, range(r, -0.5, 0.5), tilt);
    group.add(cross);
  }

  // Jacob's Ladder: columns of light pouring down from a halo
  const beamMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: glow('#ffe7b0', 1.8) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 color;
      varying vec2 vUv;
      void main() {
        float streak = 0.6 + 0.4 * sin(vUv.x * 40.0 + time * 1.5) * sin(vUv.y * 6.0 - time * 2.0);
        float a = pow(vUv.y, 0.6) * (1.0 - smoothstep(0.85, 1.0, vUv.y)) * 0.35 * streak;
        gl_FragColor = vec4(color * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  anim.timeUniform(beamMaterial);
  for (const [x, z, rad] of [
    [0, -150, 18],
    [-60, -110, 7],
    [70, -190, 9],
    [-110, -260, 8],
    [40, -60, 5]
  ]) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.85, rad * 1.4, 420, 40, 1, true), beamMaterial);
    beam.position.set(x, 205, z);
    group.add(beam);
    const pool = makeGlowSprite('#ffd9a0', rad * 6, 0.6);
    pool.position.set(x, 2, z);
    group.add(pool);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(80, 1.4, 12, 160), new THREE.MeshBasicMaterial({ color: glow('#ffd166', 2.6), fog: false }));
  halo.position.set(0, 300, -150);
  halo.rotation.x = Math.PI / 2;
  group.add(halo);
  anim.add((t) => {
    halo.rotation.z = t * 0.05;
  });

  addDrift(group, anim, {
    count: 2600,
    box: new THREE.Vector3(560, 200, 640),
    velocity: new THREE.Vector3(5, -6, -2),
    jitter: 2,
    sway: 6,
    size: 2.6,
    color: '#ff8fbf',
    colorB: '#ffe0ec',
    opacity: 0.85,
    seed: ctx.seed + 3
  });
  addTitle(group, ctx, [0, 190, -380]);

  return {
    group,
    palette: {
      fog: '#2a0c1c',
      fogDensity: 0.0036,
      skyTop: '#14030d',
      skyBottom: '#c04a7c',
      hemiSky: '#ffc2dc',
      hemiGround: '#2a0c1c',
      hemiIntensity: 1.2,
      sun: '#ffd8a8',
      sunIntensity: 2.0
    },
    stations: [
      { pos: [0, 9, 230], look: [0, 25, -150] },
      { pos: [-24, 3.5, 140], look: [0, 4, 50] },
      { pos: [26, 7, 55], look: [0, 40, -150] },
      { pos: [0, 38, -25], look: [0, 25, -150] },
      { pos: [-90, 80, -95], look: [0, 0, -150] },
      { pos: [0, 22, -118], look: [0, 160, -150] }
    ],
    tick: anim.run
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 05 坐殺博徒 IDLE DEATH GAMBLE — neon rails, 777 reels and a pachinko wall
// ─────────────────────────────────────────────────────────────────────────────
function makeReelTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#04120b';
  g.fillRect(0, 0, c.width, c.height);
  const symbols = ['7', 'BAR', '♦', '7', '★', 'BAR', '♥', '7'];
  const colors = ['#00ff88', '#ff3d9a', '#ffd166', '#00ff88', '#7ad7ff', '#ff3d9a', '#ff5d5d', '#00ff88'];
  const cell = c.width / symbols.length;
  symbols.forEach((s, i) => {
    g.save();
    g.translate(cell * i + cell / 2, c.height / 2);
    g.rotate(Math.PI / 2);
    g.font = `900 ${s.length > 1 ? 120 : 210}px 'Space Grotesk', sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = colors[i];
    g.shadowBlur = 30;
    g.fillStyle = colors[i];
    g.fillText(s, 0, 0);
    g.restore();
    g.fillStyle = 'rgba(0,255,136,0.25)';
    g.fillRect(cell * i, 0, 3, c.height);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildIdleDeathGamble(ctx: ZoneContext): Zone {
  const group = new THREE.Group();
  const anim = animator();
  const r = rng(ctx.seed);

  const grid = makeGround('neon', '#010503', '#00ff88');
  group.add(grid);
  anim.timeUniform(grid.material as THREE.Material);

  // Rails the camera rides like the train into the station
  const railMat = new THREE.MeshBasicMaterial({ color: glow('#9affd0', 2) });
  for (const x of [-3.2, 3.2]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 520), railMat);
    rail.position.set(x, 0.4, 30);
    group.add(rail);
  }
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(9, 0.3, 1.1), new THREE.MeshStandardMaterial({ color: '#0d1f17', roughness: 0.9 }), 170);
  scatterInstances(sleepers, (i, m) => compose(m, 0, 0.15, 285 - i * 3, 0, 0, 0, 1));
  group.add(sleepers);

  // Neon arches with a chasing light pattern
  const archGeo = new THREE.TorusGeometry(15, 0.5, 10, 64, Math.PI);
  const archMats: THREE.MeshBasicMaterial[] = [];
  for (let i = 0; i < 11; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: '#00ff88' });
    archMats.push(mat);
    const arch = new THREE.Mesh(archGeo, mat);
    arch.position.set(0, 0, 240 - i * 22);
    group.add(arch);
  }
  const green = new THREE.Color('#00ff88');
  const pink = new THREE.Color('#ff3d9a');
  anim.add((t) => {
    archMats.forEach((m, i) => {
      const lit = Math.max(0, Math.sin(t * 5 - i * 0.7));
      m.color.copy(i % 2 ? pink : green).multiplyScalar(0.4 + lit * 2.8);
    });
  });

  // Three giant slot reels in a neon cabinet
  const reels = new THREE.Group();
  reels.position.set(-72, 34, -70);
  reels.rotation.y = 0.5;
  group.add(reels);
  const reelTex = makeReelTexture();
  const reelSpin: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const reel = new THREE.Mesh(
      new THREE.CylinderGeometry(13, 13, 15, 48, 1, true),
      new THREE.MeshBasicMaterial({ map: reelTex, color: glow('#ffffff', 1.3), side: THREE.DoubleSide })
    );
    reel.rotation.z = Math.PI / 2;
    reel.position.x = (i - 1) * 17;
    reels.add(reel);
    reelSpin.push(reel);
  }
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(56, 34, 30), new THREE.MeshStandardMaterial({ color: '#03100a', roughness: 0.4, metalness: 0.5 }));
  cabinet.position.z = -16;
  reels.add(cabinet);
  const frameMat = new THREE.MeshBasicMaterial({ color: glow('#ff3d9a', 2.4) });
  for (const [w, h, x, yy] of [
    [58, 1, 0, 17],
    [58, 1, 0, -17],
    [1, 34, -29, 0],
    [1, 34, 29, 0]
  ]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1), frameMat);
    bar.position.set(x, yy, 1);
    reels.add(bar);
  }
  const sevens = makeTextSprite('7 7 7', '#00ff88', `900 170px 'Space Grotesk', sans-serif`);
  sevens.scale.set(70, 17.5, 1);
  sevens.position.set(0, 30, 0);
  reels.add(sevens);
  anim.add((t) => {
    reelSpin.forEach((reel, i) => {
      reel.rotation.x = t * (2.2 + i * 0.7);
    });
  });

  // Pachinko wall: pins, falling balls, neon frame
  const board = new THREE.Group();
  board.position.set(0, 62, -185);
  group.add(board);
  board.add(new THREE.Mesh(new THREE.PlaneGeometry(160, 116), new THREE.MeshStandardMaterial({ color: '#04140c', roughness: 0.35, metalness: 0.4 })));
  const pins = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.28, 0.28, 2.4, 6).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#e8fff4', metalness: 0.8, roughness: 0.25, emissive: '#0f3a26' }),
    28 * 40
  );
  scatterInstances(pins, (i, m) => {
    const row = Math.floor(i / 40);
    const col = i % 40;
    compose(m, -74 + col * 3.8 + (row % 2) * 1.9, 52 - row * 3.8, 1.2, 0, 0, 0, 1);
  });
  board.add(pins);
  const balls = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.95, 16, 12),
    new THREE.MeshStandardMaterial({ color: '#f4fffa', metalness: 0.6, roughness: 0.2, emissive: '#1b4a36' }),
    280
  );
  balls.frustumCulled = false;
  const ballData = Array.from({ length: balls.count }, () => ({ x: range(r, -72, 72), speed: range(r, 14, 30), phase: r() * 110 }));
  const bm = new THREE.Matrix4();
  anim.add((t) => {
    ballData.forEach((b, i) => {
      const fall = (t * b.speed + b.phase) % 110;
      const yy = 55 - fall;
      balls.setMatrixAt(i, compose(bm, b.x + Math.sin(yy * 0.55 + b.phase) * 2.2, yy, 2.4, 0, 0, 0, 1));
    });
    balls.instanceMatrix.needsUpdate = true;
  });
  board.add(balls);
  const boardFrame = new THREE.MeshBasicMaterial({ color: glow('#00ff88', 2.6) });
  for (const [w, h, x, yy] of [
    [164, 1.6, 0, 59],
    [164, 1.6, 0, -59],
    [1.6, 118, -81, 0],
    [1.6, 118, 81, 0]
  ]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.6), boardFrame);
    bar.position.set(x, yy, 1);
    board.add(bar);
  }
  const jackpot = makeTextSprite('JACKPOT', '#ff3d9a', `900 170px 'Space Grotesk', sans-serif`);
  jackpot.scale.set(120, 30, 1);
  jackpot.position.set(0, 82, 2);
  board.add(jackpot);
  anim.add((t) => {
    (jackpot.material as THREE.SpriteMaterial).opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 3));
  });

  addDrift(group, anim, {
    count: 1600,
    box: new THREE.Vector3(420, 180, 520),
    velocity: new THREE.Vector3(0, -9, 0),
    jitter: 3,
    sway: 4,
    size: 2.2,
    color: '#00ff88',
    colorB: '#ff3d9a',
    opacity: 0.8,
    seed: ctx.seed + 5
  });
  addTitle(group, ctx, [0, 175, -380]);

  return {
    group,
    palette: {
      fog: '#010d08',
      fogDensity: 0.004,
      skyTop: '#000000',
      skyBottom: '#06301e',
      hemiSky: '#9affd0',
      hemiGround: '#010d08',
      hemiIntensity: 1.0,
      sun: '#ff9fd0',
      sunIntensity: 1.4
    },
    stations: [
      { pos: [0, 9, 270], look: [0, 7, 120] },
      { pos: [0, 4.5, 165], look: [0, 4.5, 40] },
      { pos: [0, 7, 60], look: [-72, 34, -70] },
      { pos: [-30, 32, -12], look: [-72, 34, -70] },
      { pos: [45, 58, -80], look: [0, 62, -185] },
      { pos: [0, 62, -122], look: [0, 62, -185] }
    ],
    tick: anim.run
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 06 自閉円頓裹 SELF-EMBODIMENT OF PERFECTION — a forest of hands closing into a dome
// ─────────────────────────────────────────────────────────────────────────────
function makeHandGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const forearm = new THREE.CapsuleGeometry(1.7, 10, 6, 14).translate(0, -6, 0);
  parts.push(forearm);
  const palm = new THREE.CapsuleGeometry(2.3, 2.6, 6, 14).scale(1.2, 1, 0.5).translate(0, 2.2, 0);
  parts.push(palm);
  const fingers: Array<[number, number, number]> = [
    [-1.7, 3.4, 0.12],
    [-0.57, 4.3, 0.04],
    [0.57, 4.1, -0.03],
    [1.7, 3.3, -0.12]
  ];
  for (const [x, len, spread] of fingers) {
    const f = new THREE.CapsuleGeometry(0.55, len, 5, 10);
    f.translate(0, len / 2 + 0.4, 0).rotateZ(spread).translate(x, 4.8, 0);
    parts.push(f);
  }
  const thumb = new THREE.CapsuleGeometry(0.62, 3, 5, 10).translate(0, 1.8, 0).rotateZ(-1.0).translate(2.4, 1.8, 0.4);
  parts.push(thumb);
  // Root at the bottom of the forearm so instances rise out of the ground
  return mergeGeometries(parts).translate(0, 12.85, 0);
}

export function buildSelfEmbodiment(ctx: ZoneContext): Zone {
  const group = new THREE.Group();
  const anim = animator();
  const r = rng(ctx.seed);

  const flesh = makeGround('flesh', '#2a0f33', '#c56bff');
  group.add(flesh);
  anim.timeUniform(flesh.material as THREE.Material);

  const skin = new THREE.MeshStandardMaterial({ color: '#c6afd6', roughness: 0.5, emissive: '#24082f', emissiveIntensity: 0.8 });
  const handGeo = makeHandGeometry();

  // Forest of hands reaching out of the membrane
  const forest = new THREE.InstancedMesh(handGeo, skin, 110);
  scatterInstances(forest, (_, m) => {
    let x = 0;
    let z = 0;
    do {
      x = range(r, -240, 240);
      z = range(r, -320, 220);
    } while ((Math.abs(x) < 14 && z > -90) || Math.hypot(x, z + 140) < 70);
    const s = range(r, 1.2, 3.6);
    compose(m, x, -range(r, 3, 9) * s, z, range(r, -0.3, 0.3), r() * Math.PI * 2, range(r, -0.3, 0.3), s);
  });
  group.add(forest);

  // Dome of colossal hands closing over the centre
  const dome = new THREE.InstancedMesh(handGeo, skin, 14);
  const centre = new THREE.Vector3(0, 0, -140);
  const apex = new THREE.Vector3(0, 175, -140);
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const twist = new THREE.Quaternion();
  scatterInstances(dome, (i, m) => {
    const a = (i / dome.count) * Math.PI * 2;
    const base = new THREE.Vector3(centre.x + Math.cos(a) * 92, -12, centre.z + Math.sin(a) * 92);
    const dir = apex.clone().sub(base).normalize();
    q.setFromUnitVectors(up, dir);
    twist.setFromAxisAngle(up, -a + Math.PI / 2);
    q.multiply(twist);
    m.compose(base, q, new THREE.Vector3(8.4, 8.4, 8.4));
  });
  group.add(dome);
  const core = makeGlowSprite('#b46bff', 260, 0.55);
  core.position.set(0, 70, -140);
  group.add(core);
  // Soul-light pouring through the gap where the fingertips meet, silhouetting the dome
  const apexLight = makeGlowSprite('#e9d4ff', 240, 0.9);
  apexLight.position.set(0, 185, -140);
  group.add(apexLight);

  // Purple tentacles
  const tentacles: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 16; i++) {
    const x = range(r, -200, 200);
    const z = range(r, -300, 160);
    if (Math.abs(x) < 16 && z > -90) continue;
    tentacles.push(makeTendril(r, new THREE.Vector3(x, -3, z), range(r, 30, 80), range(r, 1.4, 2.6), 1.4));
  }
  group.add(new THREE.Mesh(mergeGeometries(tentacles), makeRimMaterial('#1a0624', '#c56bff', 2.2, 1.4)));

  // Souls rising as blue wisps
  addDrift(group, anim, {
    count: 2000,
    box: new THREE.Vector3(520, 200, 620),
    velocity: new THREE.Vector3(0, 5, 0),
    jitter: 1.5,
    sway: 4,
    size: 3.2,
    color: '#7ad7ff',
    colorB: '#e3c2ff',
    opacity: 0.75,
    seed: ctx.seed + 11
  });
  addTitle(group, ctx, [0, 200, -380]);

  return {
    group,
    palette: {
      fog: '#100518',
      fogDensity: 0.0032,
      skyTop: '#05010a',
      skyBottom: '#43175c',
      hemiSky: '#e3c2ff',
      hemiGround: '#1a0624',
      hemiIntensity: 1.1,
      sun: '#9ad8ff',
      sunIntensity: 1.3
    },
    stations: [
      { pos: [0, 10, 230], look: [0, 35, -140] },
      { pos: [30, 6, 145], look: [0, 15, 40] },
      { pos: [-25, 13, 55], look: [0, 45, -140] },
      { pos: [0, 20, -50], look: [0, 60, -140] },
      { pos: [0, 8, -122], look: [0, 175, -142] },
      { pos: [45, 14, -150], look: [-10, 40, -140] }
    ],
    tick: anim.run
  };
}

export const ZONE_BUILDERS = [
  buildInfiniteVoid,
  buildMalevolentShrine,
  buildChimeraShadow,
  buildAuthenticMutualLove,
  buildIdleDeathGamble,
  buildSelfEmbodiment
];
