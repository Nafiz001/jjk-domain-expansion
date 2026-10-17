import * as THREE from 'three';

/** Deterministic PRNG so every visit builds the same world. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (r: () => number, min: number, max: number) => min + r() * (max - min);

/** Colour that blooms: scale an sRGB hex past 1.0 in linear space. */
export const glow = (hex: string | number, intensity: number) => new THREE.Color(hex).multiplyScalar(intensity);

const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
`;

export type GroundKind = 'void' | 'blood' | 'shadow' | 'field' | 'neon' | 'flesh';
const GROUND_KINDS: GroundKind[] = ['void', 'blood', 'shadow', 'field', 'neon', 'flesh'];

/**
 * Procedural animated ground surface: one shader, six domain looks. Each realm's ground is bounded
 * (realms sit 760 apart) and dissolves into the fog colour at its edges, so the gap between realms
 * reads as a misty abyss instead of overlapping, z-fighting planes.
 */
export function makeGround(kind: GroundKind, base: string, accent: string, width = 1400, length = 760): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        baseColor: { value: new THREE.Color(base) },
        glowColor: { value: new THREE.Color(accent) },
        time: { value: 0 },
        kind: { value: GROUND_KINDS.indexOf(kind) }
      }
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 baseColor;
      uniform vec3 glowColor;
      uniform float time;
      uniform float kind;
      varying vec3 vWorld;
      varying vec2 vUv;
      ${NOISE_GLSL}
      float gridLine(vec2 p, float cell) {
        vec2 q = p / cell;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main() {
        vec2 p = vWorld.xz;
        vec3 col = baseColor;
        if (kind < 0.5) {
          // Void: faint infinite grid of light
          col = baseColor + glowColor * gridLine(p, 24.0) * 0.45 + glowColor * gridLine(p, 120.0) * 0.6;
        } else if (kind < 1.5) {
          // Blood sea: rolling fbm swell, glints and slow ripples
          float n = fbm(p * 0.025 + vec2(time * 0.04, time * 0.025));
          float glint = pow(fbm(p * 0.09 - time * 0.08), 5.0);
          float rip = sin(length(p) * 0.12 - time * 1.4) * 0.5 + 0.5;
          col = mix(baseColor * 0.45, baseColor * 1.5, n) + glowColor * glint * 2.4 + glowColor * rip * 0.04;
        } else if (kind < 2.5) {
          // Shadow mirror: black liquid with expanding cyan rings
          vec2 cell = floor(p / 70.0);
          vec2 local = (fract(p / 70.0) - 0.5) * 70.0;
          float r = length(local);
          float phase = hash(cell) * 6.2831;
          float ring = smoothstep(0.35, 0.0, abs(sin(r * 0.22 - time * 1.8 + phase))) * exp(-r * 0.05);
          float n = fbm(p * 0.02 + time * 0.015);
          col = baseColor * (0.6 + n) + glowColor * ring * 0.55 + glowColor * pow(n, 6.0) * 0.6;
        } else if (kind < 3.5) {
          // Sword field: dusty plain
          float n = fbm(p * 0.04);
          col = mix(baseColor * 0.7, baseColor * 1.35, n) + glowColor * pow(fbm(p * 0.25), 6.0) * 0.6;
        } else if (kind < 4.5) {
          // Neon gambling grid with travelling pulses
          float lines = gridLine(p, 10.0);
          float major = gridLine(p, 50.0);
          float pulse = 0.55 + 0.45 * sin(p.y * 0.06 + time * 4.0);
          col = baseColor + glowColor * (lines * 0.35 + major * 0.9) * pulse;
        } else {
          // Flesh membrane with glowing veins
          float v = fbm(p * 0.035 + vec2(0.0, time * 0.02));
          float veins = 1.0 - smoothstep(0.0, 0.035, abs(v - 0.5));
          float skin = fbm(p * 0.12);
          col = baseColor * mix(0.65, 1.25, skin) + glowColor * veins * (0.7 + 0.3 * sin(time * 2.0 + v * 9.0));
        }
        float edge = smoothstep(0.0, 0.2, min(vUv.y, 1.0 - vUv.y)) * smoothstep(0.0, 0.08, min(vUv.x, 1.0 - vUv.x));
        gl_FragColor = vec4(mix(fogColor, col, edge), 1.0);
        #include <fog_fragment>
      }
    `,
    fog: true
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(width, length, 1, 1), material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -50;
  return ground;
}

/** Glossy-black body with a glowing fresnel rim — shadows, orbs, tendrils. Works with InstancedMesh. */
export function makeRimMaterial(base: string, rim: string, power = 2.5, intensity = 1.6): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        baseColor: { value: new THREE.Color(base) },
        rimColor: { value: new THREE.Color(rim) },
        power: { value: power },
        intensity: { value: intensity }
      }
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 local = vec4(position, 1.0);
        vec3 n = normal;
        #ifdef USE_INSTANCING
          local = instanceMatrix * local;
          n = mat3(instanceMatrix) * n;
        #endif
        vec4 mvPosition = modelViewMatrix * local;
        vNormal = normalize(normalMatrix * n);
        vView = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 baseColor;
      uniform vec3 rimColor;
      uniform float power;
      uniform float intensity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), power);
        gl_FragColor = vec4(baseColor + rimColor * f * intensity, 1.0);
        #include <fog_fragment>
      }
    `,
    fog: true
  });
}

export interface DriftOptions {
  count: number;
  box: THREE.Vector3; // extent of the wrap volume (centred on the object)
  velocity: THREE.Vector3; // base velocity per second
  jitter: number; // random velocity spread
  sway: number; // horizontal sine sway amplitude
  size: number;
  color: string;
  colorB?: string;
  opacity?: number;
  seed: number;
}

/** GPU-animated particles that drift and wrap inside a box: petals, wisps, embers, confetti. */
export function makeDriftPoints(o: DriftOptions): THREE.Points {
  const r = rng(o.seed);
  const start = new Float32Array(o.count * 3);
  const vel = new Float32Array(o.count * 3);
  const phase = new Float32Array(o.count);
  const tint = new Float32Array(o.count);
  for (let i = 0; i < o.count; i++) {
    start.set([range(r, -0.5, 0.5) * o.box.x, range(r, -0.5, 0.5) * o.box.y, range(r, -0.5, 0.5) * o.box.z], i * 3);
    vel.set(
      [
        o.velocity.x + range(r, -1, 1) * o.jitter,
        o.velocity.y + range(r, -1, 1) * o.jitter,
        o.velocity.z + range(r, -1, 1) * o.jitter
      ],
      i * 3
    );
    phase[i] = r() * 100;
    tint[i] = r();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(start, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(vel, 3));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  geometry.setAttribute('tint', new THREE.BufferAttribute(tint, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), o.box.length());

  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        time: { value: 0 },
        box: { value: o.box.clone() },
        size: { value: o.size },
        sway: { value: o.sway },
        colorA: { value: new THREE.Color(o.color) },
        colorB: { value: new THREE.Color(o.colorB ?? o.color) },
        opacity: { value: o.opacity ?? 0.9 },
        pixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) }
      }
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      attribute vec3 velocity;
      attribute float phase;
      attribute float tint;
      uniform float time;
      uniform vec3 box;
      uniform float size;
      uniform float sway;
      uniform float pixelRatio;
      varying float vTint;
      void main() {
        vec3 p = position + velocity * time;
        p.x += sin(time * 0.9 + phase) * sway;
        p.z += cos(time * 0.7 + phase * 1.3) * sway;
        p = mod(p + box * 0.5, box) - box * 0.5;
        vTint = tint;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = size * pixelRatio * (300.0 / max(1.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 colorA;
      uniform vec3 colorB;
      uniform float opacity;
      varying float vTint;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * opacity;
        gl_FragColor = vec4(mix(colorA, colorB, vTint), a);
        #include <fog_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true
  });
  return new THREE.Points(geometry, material);
}

/** Big glowing text sprite (domain names, neon signs). */
export function makeTextSprite(text: string, color: string, font = `900 150px 'Noto Serif JP', serif`): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 40;
  g.fillStyle = '#ffffff';
  g.fillText(text, 512, 132);
  g.shadowBlur = 0;
  g.globalAlpha = 0.65;
  g.fillStyle = color;
  g.fillText(text, 512, 132);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false })
  );
  sprite.scale.set(160, 40, 1);
  return sprite;
}

let glowTexture: THREE.Texture | null = null;

/** Billboarded additive glow (sun, moon halo, lamp, eyes). */
export function makeGlowSprite(color: THREE.ColorRepresentation, size: number, opacity = 1): THREE.Sprite {
  if (!glowTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    glowTexture = new THREE.CanvasTexture(c);
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false
    })
  );
  sprite.scale.set(size, size, 1);
  return sprite;
}
