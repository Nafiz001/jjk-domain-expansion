import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { World3D } from '../../../src/engine/world3d';
import { WorldMap } from '../../../src/engine/worldMap';
import { ALL_PLATES, DOMAINS, DOMAIN_ORDER } from './data';

/**
 * The site's own engines, shared per render tab. Remotion renders frames in parallel tabs and
 * out of order, so everything here is built once and then driven purely by frame number.
 */

let platesPromise: Promise<HTMLImageElement[]> | null = null;
let platesCache: HTMLImageElement[] | null = null;

function loadPlates(): Promise<HTMLImageElement[]> {
  platesPromise ??= Promise.all(
    ALL_PLATES.map(
      (p) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load ${p.src}`));
          img.src = p.src;
        })
    )
  ).then((plates) => (platesCache = plates));
  return platesPromise;
}

/** Blocks rendering until something async is ready, then returns it. */
function useBlockingResource<T>(label: string, load: () => Promise<T>, cached: () => T | null): T | null {
  const [value, setValue] = useState<T | null>(cached);
  const [handle] = useState(() => (cached() ? null : delayRender(label)));
  useEffect(() => {
    if (handle === null) return;
    load()
      .then((v) => {
        setValue(v);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, load]);
  return value;
}

export const usePlates = () => useBlockingResource('Loading keyframe plates', loadPlates, () => platesCache);

// ─── three.js Domain Realms ───
const worlds = new Map<string, { world: World3D; canvas: HTMLCanvasElement }>();

export function getWorld3D(plates: HTMLImageElement[], width: number, height: number) {
  const key = `${width}x${height}`;
  let entry = worlds.get(key);
  if (!entry) {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    const world = new World3D(
      canvas,
      plates.map((img) => ({ img })),
      DOMAIN_ORDER.map((id) => ({ color: DOMAINS[id].primaryColor, nameJa: DOMAINS[id].nameJa })),
      { width, height, pixelRatio: 1, preserveDrawingBuffer: true }
    );
    world.setActive(true);
    entry = { world, canvas };
    worlds.set(key, entry);
  }
  return entry;
}

// ─── 2D World Map ───
let mapPromise: Promise<WorldMap> | null = null;
let mapCache: WorldMap | null = null;

function loadWorldMap(): Promise<WorldMap> {
  mapPromise ??= (async () => {
    const map = new WorldMap((p) => staticFile(p));
    await Promise.all([loadPlates(), map.ready]);
    return (mapCache = map);
  })();
  return mapPromise;
}

export const useWorldMap = () => useBlockingResource('Loading world map + bridges', loadWorldMap, () => mapCache);
