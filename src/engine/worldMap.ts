import worldPath from '../data/world-path.json';
import { coverCrop, getContentRect, type SourceRect } from './imageContent';

/**
 * WORLD MAP CAMERA:
 * All 36 keyframe plates are laid out as one giant mural on a 6x6 grid. Scrolling flies a camera
 * along a serpentine path through it (up / down / left / right), pulling back between plates so the
 * surrounding world is revealed, banking on lateral moves, and separating plates by depth for parallax.
 * Seams are hidden by drawing every plate twice at the same over-sized rect: an opaque base for full
 * coverage, then a feathered copy whose ramp cross-fades into its neighbours over the overlap zone. Optional agy-painted bridge plates cover consecutive seams.
 */

export const CELL_W = worldPath.cellWidth;
export const CELL_H = worldPath.cellHeight;
export const WORLD_COLS = worldPath.cols;
export const WORLD_ROWS = worldPath.rows;
export const WORLD_PATH = worldPath.path as Array<[number, number]>;

const PLATES_PER_DOMAIN = 6;
const OVERLAP = 0.24; // every plate extends 12% past each cell edge into its neighbours
// The feather ramp spans exactly the shared overlap zone, so neighbouring ramps are complementary
// and each opaque base plate's hard edge lands where its own crossfade weight is zero.
const PLATE_FEATHER = OVERLAP / (1 + OVERLAP);
const BRIDGE_FEATHER = 0.3;
const BAKE_CACHE_LIMIT = 16;
const BACKDROP_W = 96;
const BACKDROP_H = 54;

const GRID_INDEX: number[][] = Array.from({ length: WORLD_ROWS }, () => new Array(WORLD_COLS).fill(-1));
WORLD_PATH.forEach(([gx, gy], k) => {
  GRID_INDEX[gy][gx] = k;
});

export interface PlateInfo {
  img: HTMLImageElement | undefined;
  focalX: number;
  focalY: number;
}

export interface WorldFrameInput {
  progress: number;
  pointerX: number;
  pointerY: number;
  reducedMotion: boolean;
  primaryColor: string;
  /** Seconds; overrides the wall clock so offline (video) renders are deterministic. */
  time?: number;
  /** Screen-space camera velocity in px/frame; overrides the frame-to-frame estimate. */
  velocity?: { x: number; y: number };
}

/** Camera viewport in cell units (centre + size), for the minimap. */
export interface WorldView {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function bridgeSrc(step: number, resolve: (path: string) => string = (p) => `/${p}`): string {
  return resolve(`assets/bridges/bridge_${String(step).padStart(2, '0')}.jpg`);
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Small deterministic depth offset per plate so neighbours drift apart as the camera moves. */
const plateDepth = (k: number) => (((k * 37) % 7) - 3) * 0.009;

function featherInPlace(g: CanvasRenderingContext2D, w: number, h: number, band: number) {
  g.globalCompositeOperation = 'destination-in';
  for (const horizontal of [true, false]) {
    const grad = horizontal ? g.createLinearGradient(0, 0, w, 0) : g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(band, 'rgba(0,0,0,1)');
    grad.addColorStop(1 - band, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }
  g.globalCompositeOperation = 'source-over';
}

export class WorldMap {
  private bakedPlates = new Map<HTMLImageElement, HTMLCanvasElement>();
  private bakedBridges = new Map<number, HTMLCanvasElement>();
  private bridgeImages = new Map<number, HTMLImageElement>();
  private backdrops = new Map<HTMLImageElement, HTMLCanvasElement>();
  private streaks = Array.from({ length: 46 }, () => ({
    x: Math.random(),
    y: Math.random(),
    len: 0.4 + Math.random() * 0.6,
    weight: 0.3 + Math.random() * 0.7
  }));
  private lastCamX: number | null = null;
  private lastCamY = 0;

  public view: WorldView = { x: 0.5, y: 0.5, w: 1, h: 1 };

  /** Resolves once the bridge manifest and its images have loaded (or failed), for offline renders. */
  public readonly ready: Promise<void>;
  private readonly resolveAsset: (path: string) => string;

  /** `resolveAsset` maps a public-folder path (e.g. `assets/...`) to a URL; defaults to site-root. */
  constructor(resolveAsset: (path: string) => string = (p) => `/${p}`) {
    this.resolveAsset = resolveAsset;
    this.ready = this.loadBridges();
  }

  /** Bridges are optional art: the manifest lists which steps have been painted so far. */
  private async loadBridges(): Promise<void> {
    try {
      const res = await fetch(this.resolveAsset('assets/bridges/manifest.json'), { cache: 'no-cache' });
      if (!res.ok) return;
      const { bridges } = (await res.json()) as { bridges: number[] };
      await Promise.all(
        bridges.map(
          (step) =>
            new Promise<void>((done) => {
              const img = new Image();
              img.decoding = 'async';
              img.onload = () => {
                this.bridgeImages.set(step, img);
                done();
              };
              img.onerror = () => done();
              img.src = bridgeSrc(step, this.resolveAsset);
            })
        )
      );
    } catch {
      // No manifest yet: seams are blended in code only
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: WorldFrameInput,
    plateAt: (k: number) => PlateInfo
  ) {
    const steps = WORLD_PATH.length - 1;
    const stepFloat = clamp01(input.progress) * steps;
    const k = Math.min(steps - 1, Math.floor(stepFloat));
    const t = clamp01(stepFloat - k);
    // Dwell on each plate, then glide to the next
    const e = smoothstep(0.12, 0.88, t);
    const arc = Math.sin(Math.PI * e);

    const [ax, ay] = WORLD_PATH[k];
    const [bx, by] = WORLD_PATH[k + 1];
    const dirX = bx - ax;
    const dirY = by - ay;
    const crossesDomain = k % PLATES_PER_DOMAIN === PLATES_PER_DOMAIN - 1;

    // Camera centre in world px, nudged toward each plate's focal point
    const plateA = plateAt(k);
    const plateB = plateAt(k + 1);
    const focusAX = (ax + 0.5 + (plateA.focalX - 0.5) * 0.14) * CELL_W;
    const focusAY = (ay + 0.5 + (plateA.focalY - 0.5) * 0.14) * CELL_H;
    const focusBX = (bx + 0.5 + (plateB.focalX - 0.5) * 0.14) * CELL_W;
    const focusBY = (by + 0.5 + (plateB.focalY - 0.5) * 0.14) * CELL_H;
    const motionScale = input.reducedMotion ? 0 : 1;
    const camX = focusAX + (focusBX - focusAX) * e + input.pointerX * CELL_W * 0.025 * motionScale;
    const camY = focusAY + (focusBY - focusAY) * e + input.pointerY * CELL_H * 0.025 * motionScale;

    // Pull back mid-flight to reveal the surrounding world; further when crossing into a new domain
    const pull = (crossesDomain ? 0.46 : 0.24) * (input.reducedMotion ? 0.5 : 1);
    const cover = Math.max(width / CELL_W, height / CELL_H);
    const zoom = cover * 1.05 * (1 - pull * arc);
    // Bank into lateral moves; squash slightly on vertical moves to fake a pitch
    const roll = (dirX * 0.024 * arc + input.pointerX * 0.006) * motionScale;
    const pitch = 1 - Math.abs(dirY) * 0.035 * arc * motionScale;

    // Screen-space camera velocity drives motion streaks
    const velX = input.velocity?.x ?? (this.lastCamX === null ? 0 : (camX - this.lastCamX) * zoom);
    const velY = input.velocity?.y ?? (this.lastCamX === null ? 0 : (camY - this.lastCamY) * zoom);
    this.lastCamX = camX;
    this.lastCamY = camY;

    // 1. Deep backdrop: heavily upscaled thumbnail of the nearest plate (cheap blur), slow parallax
    ctx.fillStyle = '#040509';
    ctx.fillRect(-30, -30, width + 60, height + 60);
    const nearest = e < 0.5 ? plateA : plateB;
    const backdrop = nearest.img && this.getBackdrop(nearest.img);
    if (backdrop) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      const bw = width * 1.4;
      const bh = height * 1.4;
      ctx.drawImage(
        backdrop,
        (width - bw) / 2 - velX * 2,
        (height - bh) / 2 - velY * 2,
        bw,
        bh
      );
      ctx.restore();
    }

    // Visible cell range (generous margin for roll and depth drift)
    const halfViewW = (width / 2 / zoom) * 1.35;
    const halfViewH = (height / 2 / zoom) * 1.35;
    const minGX = Math.max(0, Math.floor((camX - halfViewW) / CELL_W));
    const maxGX = Math.min(WORLD_COLS - 1, Math.floor((camX + halfViewW) / CELL_W));
    const minGY = Math.max(0, Math.floor((camY - halfViewH) / CELL_H));
    const maxGY = Math.min(WORLD_ROWS - 1, Math.floor((camY + halfViewH) / CELL_H));

    const visible: Array<{ k: number; gx: number; gy: number; img: HTMLImageElement }> = [];
    for (let gy = minGY; gy <= maxGY; gy++) {
      for (let gx = minGX; gx <= maxGX; gx++) {
        const idx = GRID_INDEX[gy][gx];
        const img = idx >= 0 ? plateAt(idx).img : undefined;
        if (img && img.complete && img.naturalWidth > 0) visible.push({ k: idx, gx, gy, img });
      }
    }

    const withCamera = (depth: number, draw: () => void) => {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(roll);
      const s = zoom * (1 + depth);
      ctx.scale(s, s * pitch);
      ctx.translate(-camX, -camY);
      draw();
      ctx.restore();
    };

    const dx = (gx: number) => (gx - OVERLAP / 2) * CELL_W;
    const dy = (gy: number) => (gy - OVERLAP / 2) * CELL_H;
    const dw = CELL_W * (1 + OVERLAP);
    const dh = CELL_H * (1 + OVERLAP);

    // 2. Opaque base pass: full coverage; its hard edges sit where the crossfade weight is zero
    for (const p of visible) {
      const r = this.getSourceRect(p.img);
      withCamera(plateDepth(p.k), () => ctx.drawImage(p.img, r.sx, r.sy, r.sw, r.sh, dx(p.gx), dy(p.gy), dw, dh));
    }

    // 3. Feathered pass: complementary ramps cross-fade each pair of neighbours across the overlap
    for (const p of visible) {
      const baked = this.getBakedPlate(p.img);
      withCamera(plateDepth(p.k), () => ctx.drawImage(baked, dx(p.gx), dy(p.gy), dw, dh));
    }

    // 4. Painted bridge plates straddling consecutive seams (when agy art exists)
    for (let j = Math.max(0, k - 2); j <= Math.min(steps - 1, k + 2); j++) {
      const bridge = this.getBakedBridge(j);
      if (!bridge) continue;
      const [sx, sy] = WORLD_PATH[j];
      const [tx, ty] = WORLD_PATH[j + 1];
      const horizontal = sy === ty;
      const midX = ((sx + tx) / 2 + 0.5) * CELL_W;
      const midY = ((sy + ty) / 2 + 0.5) * CELL_H;
      const w = (horizontal ? 0.9 : 0.96) * CELL_W;
      const h = (horizontal ? 0.96 : 0.9) * CELL_H;
      withCamera((plateDepth(j) + plateDepth(j + 1)) / 2, () => {
        ctx.drawImage(bridge, midX - w / 2, midY - h / 2, w, h);
      });
    }

    // 5. Cursed-energy mist drifting over nearby seams
    const now = input.time ?? performance.now() * 0.001;
    withCamera(0, () => {
      ctx.globalCompositeOperation = 'screen';
      for (let j = Math.max(0, k - 1); j <= Math.min(steps - 1, k + 1); j++) {
        const [sx, sy] = WORLD_PATH[j];
        const [tx, ty] = WORLD_PATH[j + 1];
        const mx = ((sx + tx) / 2 + 0.5) * CELL_W + Math.sin(now * 0.4 + j) * CELL_W * 0.05;
        const my = ((sy + ty) / 2 + 0.5) * CELL_H + Math.cos(now * 0.3 + j) * CELL_H * 0.05;
        const r = CELL_H * 0.55;
        const mist = ctx.createRadialGradient(mx, my, 0, mx, my, r);
        mist.addColorStop(0, input.primaryColor + '26');
        mist.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mist;
        ctx.fillRect(mx - r, my - r, r * 2, r * 2);
      }
    });

    // 6. Directional motion streaks in screen space
    const speed = Math.hypot(velX, velY);
    if (speed > 0.6 && !input.reducedMotion) {
      const ux = velX / speed;
      const uy = velY / speed;
      ctx.save();
      ctx.strokeStyle = input.primaryColor;
      ctx.lineCap = 'round';
      const lengthPx = Math.min(width * 0.35, speed * 9);
      for (const s of this.streaks) {
        s.x = (((s.x - (velX / width) * 1.6) % 1) + 1) % 1;
        s.y = (((s.y - (velY / height) * 1.6) % 1) + 1) % 1;
        const px = s.x * width;
        const py = s.y * height;
        ctx.globalAlpha = Math.min(0.32, speed * 0.012) * s.weight;
        ctx.lineWidth = 1 + s.weight * 1.6;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - ux * lengthPx * s.len, py - uy * lengthPx * s.len);
        ctx.stroke();
      }
      ctx.restore();
    }

    this.view = {
      x: camX / CELL_W,
      y: camY / CELL_H,
      w: width / zoom / CELL_W,
      h: height / zoom / pitch / CELL_H
    };
  }

  private getBakedPlate(img: HTMLImageElement): HTMLCanvasElement {
    const hit = this.bakedPlates.get(img);
    if (hit) {
      // LRU touch
      this.bakedPlates.delete(img);
      this.bakedPlates.set(img, hit);
      return hit;
    }
    const r = this.getSourceRect(img);
    const c = document.createElement('canvas');
    c.width = Math.round(r.sw);
    c.height = Math.round(r.sh);
    const g = c.getContext('2d')!;
    g.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, c.width, c.height);
    featherInPlace(g, c.width, c.height, PLATE_FEATHER);
    this.bakedPlates.set(img, c);
    if (this.bakedPlates.size > BAKE_CACHE_LIMIT) {
      const oldest = this.bakedPlates.keys().next().value;
      if (oldest) this.bakedPlates.delete(oldest);
    }
    return c;
  }

  private getBakedBridge(step: number): HTMLCanvasElement | null {
    const cached = this.bakedBridges.get(step);
    if (cached) return cached;
    const img = this.bridgeImages.get(step);
    if (!img) return null;
    const [, sy] = WORLD_PATH[step];
    const [, ty] = WORLD_PATH[step + 1];
    const horizontal = sy === ty;
    // Bake at the bridge rect's aspect (bars trimmed, cover-cropped) so the art isn't stretched
    const rectAspect = horizontal ? (0.9 * CELL_W) / (0.96 * CELL_H) : (0.96 * CELL_W) / (0.9 * CELL_H);
    const r = this.getSourceRect(img, rectAspect);
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = Math.round(1024 / rectAspect);
    const g = c.getContext('2d')!;
    g.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, c.width, c.height);
    featherInPlace(g, c.width, c.height, BRIDGE_FEATHER);
    this.bakedBridges.set(step, c);
    return c;
  }

  private getSourceRect(img: HTMLImageElement, aspect = CELL_W / CELL_H): SourceRect {
    return coverCrop(getContentRect(img), aspect);
  }

  private getBackdrop(img: HTMLImageElement): HTMLCanvasElement | null {
    if (!img.complete || img.naturalWidth === 0) return null;
    let c = this.backdrops.get(img);
    if (!c) {
      c = document.createElement('canvas');
      c.width = BACKDROP_W;
      c.height = BACKDROP_H;
      const g = c.getContext('2d')!;
      g.imageSmoothingQuality = 'high';
      const r = this.getSourceRect(img);
      g.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, BACKDROP_W, BACKDROP_H);
      this.backdrops.set(img, c);
    }
    return c;
  }
}
