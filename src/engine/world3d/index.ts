import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { coverCrop, getContentRect } from '../imageContent';
import { ZONE_BUILDERS, type Zone, type ZonePalette } from './zones';

/**
 * DOMAIN REALMS (three.js):
 * Six procedurally built innate domains laid out along one continuous flight. Scrolling flies the
 * camera through each realm's six story stations, then across the void and through a barrier
 * membrane into the next domain while fog, sky and light blend between their palettes. Each realm's
 * six keyframe paintings hang as a vast curved sky backdrop that cross-fades with the story phase.
 */

export interface World3DPlate {
  img: HTMLImageElement | undefined;
}

export interface World3DLevel {
  color: string;
  nameJa: string;
}

export interface World3DFrame {
  progress: number;
  pointerX: number;
  pointerY: number;
  reducedMotion: boolean;
  /** Impact-frame / Black Flash state from the 2D effects layer, mirrored as a CSS filter. */
  inverted: boolean;
  tinted: boolean;
  shake: number;
  /** Seconds; overrides the wall clock so offline (video) renders are deterministic. */
  time?: number;
  /** Ease-and-hold at each station (default true); off for continuous camera moves. */
  dwell?: boolean;
}

export interface World3DOptions {
  /** Fixed render size; when omitted the canvas tracks the window. */
  width?: number;
  height?: number;
  pixelRatio?: number;
  /** Keep the last frame readable for frame capture. */
  preserveDrawingBuffer?: boolean;
}

const PLATES_PER_ZONE = 6;
const ZONE_SPACING = 760;
const TEX_W = 1024;
const TEX_H = 576;

const zoneOrigin = (d: number) => new THREE.Vector3(Math.sin(d * 1.1) * 160, 0, -d * ZONE_SPACING);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Bake a plate texture: letterbox bars trimmed, cover-cropped to 16:9, capped at 1024px. */
function makePlateTexture(img: HTMLImageElement | undefined): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#05060b';
  g.fillRect(0, 0, TEX_W, TEX_H);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const paint = () => {
    if (!img || !img.naturalWidth) return;
    const r = coverCrop(getContentRect(img), TEX_W / TEX_H);
    g.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, TEX_W, TEX_H);
    tex.needsUpdate = true;
  };
  if (img?.complete) paint();
  else img?.addEventListener('load', paint, { once: true });
  return tex;
}

interface Backdrop {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  textures: THREE.Texture[];
}

/** A vast curved painting hung across the far side of a realm, fading into the sky at its edges. */
function makeBackdrop(textures: THREE.Texture[]): Backdrop {
  const radius = 560;
  const arc = 1.35;
  const height = (radius * arc) / (16 / 9);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      texA: { value: textures[0] },
      texB: { value: textures[1] },
      mixAmount: { value: 0 },
      opacity: { value: 0.5 }
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D texA;
      uniform sampler2D texB;
      uniform float mixAmount;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        vec2 uv = vec2(1.0 - vUv.x, vUv.y);
        vec3 col = mix(texture2D(texA, uv).rgb, texture2D(texB, uv).rgb, mixAmount);
        float fade = smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.82, uv.x) * smoothstep(0.0, 0.32, uv.y) * smoothstep(1.0, 0.86, uv.y);
        gl_FragColor = vec4(col, fade * opacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide
  });
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 64, 1, true, Math.PI - arc / 2, arc),
    material
  );
  mesh.position.set(0, height * 0.28, 40);
  mesh.renderOrder = -1;
  return { mesh, material, textures };
}

function makeBarrierMaterial(color: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color).multiplyScalar(2.2) }, opacity: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 color;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        float ang = atan(p.y, p.x);
        float rings = 0.5 + 0.5 * sin(r * 46.0 - time * 3.0);
        float spokes = 0.5 + 0.5 * sin(ang * 12.0 + time * 0.8);
        float a = (0.05 + 0.55 * pow(r, 5.0) + 0.14 * rings * r + 0.06 * spokes * r) * (1.0 - smoothstep(0.96, 1.0, r));
        a *= opacity;
        gl_FragColor = vec4(color * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
}

function lerpPalette(a: ZonePalette, b: ZonePalette, t: number) {
  const c = (x: string, y: string) => new THREE.Color(x).lerp(new THREE.Color(y), t);
  return {
    fog: c(a.fog, b.fog),
    fogDensity: a.fogDensity + (b.fogDensity - a.fogDensity) * t,
    skyTop: c(a.skyTop, b.skyTop),
    skyBottom: c(a.skyBottom, b.skyBottom),
    hemiSky: c(a.hemiSky, b.hemiSky),
    hemiGround: c(a.hemiGround, b.hemiGround),
    hemiIntensity: a.hemiIntensity + (b.hemiIntensity - a.hemiIntensity) * t,
    sun: c(a.sun, b.sun),
    sunIntensity: a.sunIntensity + (b.sunIntensity - a.sunIntensity) * t
  };
}

export class World3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.5, 2800);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private fog = new THREE.FogExp2(0x000000, 0.004);
  private hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  private sun = new THREE.DirectionalLight(0xffffff, 1);
  private sky: THREE.Mesh;
  private skyMaterial: THREE.ShaderMaterial;
  private zones: Zone[] = [];
  private backdrops: Backdrop[] = [];
  private barriers: Array<{ mesh: THREE.Mesh; material: THREE.ShaderMaterial }> = [];
  private camCurve: THREE.CatmullRomCurve3;
  private lookCurve: THREE.CatmullRomCurve3;
  private active = false;
  private lastFilter = '';
  private readonly canvas: HTMLCanvasElement;
  private readonly steps: number;

  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private tanA = new THREE.Vector3();
  private tanB = new THREE.Vector3();
  private right = new THREE.Vector3();
  private up = new THREE.Vector3();

  private readonly fixedSize: { width: number; height: number } | null;

  constructor(canvas: HTMLCanvasElement, plates: World3DPlate[], levels: World3DLevel[], options: World3DOptions = {}) {
    this.canvas = canvas;
    this.fixedSize = options.width && options.height ? { width: options.width, height: options.height } : null;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false
    });
    this.renderer.setPixelRatio(options.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 1.5));
    this.scene.fog = this.fog;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.45, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    // Gradient sky dome that follows the camera
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
      vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 top;
        uniform vec3 bottom;
        varying vec3 vDir;
        void main() { gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.05, 0.55, vDir.y)), 1.0); }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 32, 16), this.skyMaterial);
    this.sky.renderOrder = -2;
    this.scene.add(this.sky);

    this.scene.add(this.hemi, this.sun, this.sun.target);

    // Build the six realms and their sky paintings
    const textures = plates.map((p) => makePlateTexture(p.img));
    ZONE_BUILDERS.forEach((build, d) => {
      const level = levels[d];
      const zone = build({ accent: level.color, nameJa: level.nameJa, seed: 1000 + d * 97 });
      zone.group.position.copy(zoneOrigin(d));
      this.scene.add(zone.group);
      this.zones.push(zone);
      const backdrop = makeBackdrop(textures.slice(d * PLATES_PER_ZONE, d * PLATES_PER_ZONE + PLATES_PER_ZONE));
      backdrop.mesh.position.add(new THREE.Vector3(0, 0, -60));
      zone.group.add(backdrop.mesh);
      this.backdrops.push(backdrop);
    });

    // One continuous flight through every station
    const stationPos: THREE.Vector3[] = [];
    const stationLook: THREE.Vector3[] = [];
    this.zones.forEach((zone, d) => {
      const origin = zoneOrigin(d);
      for (const s of zone.stations) {
        stationPos.push(new THREE.Vector3(...s.pos).add(origin));
        stationLook.push(new THREE.Vector3(...s.look).add(origin));
      }
    });
    this.steps = stationPos.length - 1;
    this.camCurve = new THREE.CatmullRomCurve3(stationPos, false, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(stationLook, false, 'centripetal');

    // Barrier membranes the camera breaks through between realms
    for (let d = 1; d < this.zones.length; d++) {
      const u = (d * PLATES_PER_ZONE - 0.5) / this.steps;
      const at = this.camCurve.getPoint(u);
      const dir = this.camCurve.getTangent(u);
      const material = makeBarrierMaterial(levels[d].color);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), material);
      mesh.position.copy(at);
      mesh.lookAt(at.clone().add(dir));
      this.scene.add(mesh);
      this.barriers.push({ mesh, material });
    }

    this.resize();
    if (!this.fixedSize) window.addEventListener('resize', () => this.resize());
  }

  public setActive(on: boolean) {
    this.active = on;
    if (on) this.resize();
  }

  public render(frame: World3DFrame) {
    if (!this.active) return;
    const time = frame.time ?? performance.now() * 0.001;
    const stepFloat = clamp01(frame.progress) * this.steps;
    const k = Math.min(this.steps - 1, Math.floor(stepFloat));
    const e = frame.dwell === false ? stepFloat - k : smoothstep(0.1, 0.9, stepFloat - k);
    const u = (k + e) / this.steps;
    const calm = frame.reducedMotion ? 0 : 1;

    // Camera on the flight path, banking into turns
    this.camCurve.getPoint(u, this.pos);
    this.lookCurve.getPoint(u, this.look);
    this.camCurve.getTangent(Math.max(0, u - 0.004), this.tanA);
    this.camCurve.getTangent(Math.min(1, u + 0.004), this.tanB);
    const bank = THREE.MathUtils.clamp(this.tanA.clone().cross(this.tanB).y * 40, -0.3, 0.3);

    const cam = this.camera;
    cam.position.copy(this.pos);
    cam.lookAt(this.look);
    cam.updateMatrix();
    this.right.setFromMatrixColumn(cam.matrix, 0);
    this.up.setFromMatrixColumn(cam.matrix, 1);
    cam.position
      .addScaledVector(this.right, frame.pointerX * 2.2 * calm)
      .addScaledVector(this.up, -frame.pointerY * 1.4 * calm);
    if (frame.shake > 0.1 && calm) {
      const j = frame.shake * 0.03;
      cam.position.x += (Math.random() - 0.5) * j;
      cam.position.y += (Math.random() - 0.5) * j;
    }
    cam.lookAt(this.look);
    cam.rotateZ((bank + frame.pointerX * 0.02) * calm);

    // Atmosphere: blend palettes while crossing between realms
    const zoneIndex = Math.min(this.zones.length - 1, Math.floor(k / PLATES_PER_ZONE));
    const crossing = k % PLATES_PER_ZONE === PLATES_PER_ZONE - 1 && zoneIndex < this.zones.length - 1;
    const pal = lerpPalette(this.zones[zoneIndex].palette, this.zones[Math.min(this.zones.length - 1, zoneIndex + 1)].palette, crossing ? e : 0);
    this.fog.color.copy(pal.fog);
    this.fog.density = pal.fogDensity;
    this.renderer.setClearColor(pal.fog);
    this.skyMaterial.uniforms.top.value.copy(pal.skyTop);
    this.skyMaterial.uniforms.bottom.value.copy(pal.skyBottom);
    this.sky.position.copy(cam.position);
    this.hemi.color.copy(pal.hemiSky);
    this.hemi.groundColor.copy(pal.hemiGround);
    this.hemi.intensity = pal.hemiIntensity;
    this.sun.color.copy(pal.sun);
    this.sun.intensity = pal.sunIntensity;
    this.sun.position.copy(cam.position).add(new THREE.Vector3(80, 160, 60));
    this.sun.target.position.copy(cam.position);

    // Only the realms near the camera are drawn and animated
    const phaseInZone = k % PLATES_PER_ZONE;
    this.zones.forEach((zone, i) => {
      const visible = i === zoneIndex || (i === zoneIndex + 1 && phaseInZone >= 4) || (i === zoneIndex - 1 && phaseInZone === 0);
      zone.group.visible = visible;
      if (!visible) return;
      zone.tick(time);
      // Sky painting follows the story phase within its realm
      const local = THREE.MathUtils.clamp(stepFloat - i * PLATES_PER_ZONE, 0, PLATES_PER_ZONE - 1);
      const a = Math.floor(local);
      const b = Math.min(PLATES_PER_ZONE - 1, a + 1);
      const bd = this.backdrops[i];
      bd.material.uniforms.texA.value = bd.textures[a];
      bd.material.uniforms.texB.value = bd.textures[b];
      bd.material.uniforms.mixAmount.value = smoothstep(0.1, 0.9, local - a);
    });

    for (const b of this.barriers) {
      b.material.uniforms.time.value = time;
      const dist = b.mesh.position.distanceTo(cam.position);
      b.material.uniforms.opacity.value = smoothstep(520, 90, dist) * (0.35 + 0.65 * smoothstep(8, 60, dist));
    }

    const filter = frame.inverted
      ? 'grayscale(1) invert(1) contrast(1.3)'
      : frame.tinted
        ? 'grayscale(1) contrast(1.5) brightness(1.15)'
        : '';
    if (filter !== this.lastFilter) {
      this.canvas.style.filter = filter;
      this.lastFilter = filter;
    }

    this.composer.render();
  }

  private resize() {
    const w = this.fixedSize?.width ?? window.innerWidth;
    const h = this.fixedSize?.height ?? window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
