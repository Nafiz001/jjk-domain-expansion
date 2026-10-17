import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from 'remotion';
import { coverCrop, getContentRect } from '../../../src/engine/imageContent';
import { ALL_PLATES, DOMAINS, DOMAIN_ORDER } from '../lib/data';
import { getWorld3D, usePlates, useWorldMap } from '../lib/engines';

const STEPS = ALL_PLATES.length - 1;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const plateIndex = (domain: string, index: number) => DOMAIN_ORDER.indexOf(domain as never) * 6 + index;

interface CameraMove {
  /** Station float along the 36-plate path (0 … 35). */
  from: number;
  to: number;
  duration: number;
  ease?: (t: number) => number;
  /** Clock offset in seconds so animated scenery keeps moving across cuts. */
  time0?: number;
}

/** Gentle hand-held drift standing in for the site's pointer parallax. */
const drift = (time: number) => ({ x: Math.sin(time * 0.55) * 0.28, y: Math.cos(time * 0.41) * 0.18 });

/** Fly the three.js Domain Realms camera between two stations. */
export const RealmShot: React.FC<CameraMove> = ({ from, to, duration, ease = Easing.inOut(Easing.cubic), time0 = 0 }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const plates = usePlates();
  const host = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!plates || !host.current) return;
    const { world, canvas } = getWorld3D(plates, width, height);
    if (canvas.parentElement !== host.current) host.current.appendChild(canvas);
    const t = clamp01(frame / Math.max(1, duration - 1));
    const step = from + (to - from) * ease(t);
    const time = time0 + frame / fps;
    const p = drift(time);
    world.render({
      progress: step / STEPS,
      pointerX: p.x,
      pointerY: p.y,
      reducedMotion: false,
      inverted: false,
      tinted: false,
      shake: 0,
      time,
      dwell: false
    });
  }, [frame, plates, width, height, fps, from, to, duration, ease, time0]);

  return <AbsoluteFill ref={host} style={{ backgroundColor: '#040509' }} />;
};

/** Glide the 2D World Map camera across the mural. */
export const MapShot: React.FC<CameraMove> = ({ from, to, duration, ease = Easing.inOut(Easing.quad), time0 = 0 }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const plates = usePlates();
  const map = useWorldMap();
  const canvas = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!plates || !map || !ctx) return;
    const t = clamp01(frame / Math.max(1, duration - 1));
    const step = from + (to - from) * ease(t);
    const time = time0 + frame / fps;
    const p = drift(time);
    const domain = DOMAINS[DOMAIN_ORDER[Math.min(5, Math.floor(step / 6))]];
    map.render(
      ctx,
      width,
      height,
      { progress: step / STEPS, pointerX: p.x, pointerY: p.y, reducedMotion: false, primaryColor: domain.primaryColor, time, velocity: { x: 0, y: 0 } },
      (k) => {
        const plate = ALL_PLATES[k];
        return { img: plates[k], focalX: plate.spec.focalX, focalY: plate.spec.focalY };
      }
    );
  }, [frame, plates, map, width, height, fps, from, to, duration, ease, time0]);

  return <canvas ref={canvas} width={width} height={height} style={{ width: '100%', height: '100%' }} />;
};

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, scale: number, ox: number, oy: number, rot = 0) {
  const r = coverCrop(getContentRect(img), w / h);
  ctx.save();
  ctx.translate(w / 2 + ox, h / 2 + oy);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** A painted keyframe with a slow push-in, drift and RGB split — the "character" beat of each domain. */
export const PaintingShot: React.FC<{
  domain: string;
  index: number;
  duration: number;
  zoom?: [number, number];
  pan?: [number, number];
  chroma?: number;
}> = ({ domain, index, duration, zoom = [1.08, 1.22], pan = [0, 0], chroma = 6 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const plates = usePlates();
  const canvas = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!plates || !ctx) return;
    const img = plates[plateIndex(domain, index)];
    const t = Easing.out(Easing.cubic)(clamp01(frame / Math.max(1, duration - 1)));
    const scale = zoom[0] + (zoom[1] - zoom[0]) * t;
    const ox = pan[0] * width * t;
    const oy = pan[1] * height * t;
    ctx.fillStyle = '#040509';
    ctx.fillRect(0, 0, width, height);
    drawCover(ctx, img, width, height, scale, ox, oy);
    // RGB split that settles as the push-in lands
    const shift = chroma * (1 - t) * (width / 1920);
    if (shift > 0.4) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.35;
      drawCover(ctx, img, width, height, scale, ox + shift, oy);
      drawCover(ctx, img, width, height, scale, ox - shift, oy);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [frame, plates, width, height, domain, index, duration, zoom, pan, chroma]);

  return <canvas ref={canvas} width={width} height={height} style={{ width: '100%', height: '100%' }} />;
};

/** The site's portal-tunnel transition, re-staged deterministically: plate A rushes past while B opens through a portal. */
export const PortalShot: React.FC<{ plates: Array<[string, number]>; duration: number }> = ({ plates: sequence, duration }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const plates = usePlates();
  const canvas = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!plates || !ctx) return;
    const segs = sequence.length - 1;
    const f = clamp01(frame / Math.max(1, duration - 1)) * segs;
    const k = Math.min(segs - 1, Math.floor(f));
    const t = f - k;
    const e = t * t * (3 - 2 * t);
    const a = plates[plateIndex(...sequence[k])];
    const b = plates[plateIndex(...sequence[k + 1])];
    ctx.fillStyle = '#040509';
    ctx.fillRect(0, 0, width, height);
    drawCover(ctx, a, width, height, Math.pow(2.1, e), 0, 0, e * 0.05);
    const radius = (1 - Math.pow(1 - t, 3)) * Math.hypot(width, height) * 0.62;
    if (radius > 2) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = Math.min(1, t * 1.5);
      drawCover(ctx, b, width, height, 0.48 + 0.52 * e, 0, 0, -0.03 * (1 - e));
      ctx.restore();
      // Cursed-energy seam along the portal edge
      const color = DOMAINS[sequence[k + 1][0] as keyof typeof DOMAINS].primaryColor;
      const g = ctx.createRadialGradient(width / 2, height / 2, radius * 0.8, width / 2, height / 2, radius * 1.15);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, color + 'aa');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = Math.sin(t * Math.PI);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [frame, plates, width, height, sequence, duration]);

  return <canvas ref={canvas} width={width} height={height} style={{ width: '100%', height: '100%' }} />;
};
