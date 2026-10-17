/** Source rectangle of an image's real artwork, in image pixels (top-left origin). */
export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const contentRects = new WeakMap<HTMLImageElement, SourceRect>();

/**
 * Generated frames often carry baked-in cinematic letterbox bars. Detect near-black, near-uniform
 * rows/columns at each edge on a downscaled copy and return the rect inside them (cached per image).
 */
export function getContentRect(img: HTMLImageElement): SourceRect {
  const cached = contentRects.get(img);
  if (cached) return cached;
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  let top = 0;
  let bottom = 0;
  let left = 0;
  let right = 0;
  const AW = 320;
  const AH = 180;
  try {
    const c = document.createElement('canvas');
    c.width = AW;
    c.height = AH;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0, AW, AH);
    const data = g.getImageData(0, 0, AW, AH).data;
    const lum = (x: number, y: number) => {
      const i = (y * AW + x) * 4;
      return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    };
    const isBar = (sample: (i: number) => number, n: number) => {
      let sum = 0;
      let sq = 0;
      for (let i = 0; i < n; i++) {
        const v = sample(i);
        sum += v;
        sq += v * v;
      }
      const mean = sum / n;
      return mean < 14 && Math.sqrt(Math.max(0, sq / n - mean * mean)) < 7;
    };
    const maxRows = Math.floor(AH * 0.3);
    const maxCols = Math.floor(AW * 0.3);
    while (top < maxRows && isBar((x) => lum(x, top), AW)) top++;
    while (bottom < maxRows && isBar((x) => lum(x, AH - 1 - bottom), AW)) bottom++;
    const rows = AH - top - bottom;
    while (left < maxCols && isBar((y) => lum(left, top + y), rows)) left++;
    while (right < maxCols && isBar((y) => lum(AW - 1 - right, top + y), rows)) right++;
    // Step one more analysis pixel inward past any bar to drop its JPEG-softened edge
    if (top) top++;
    if (bottom) bottom++;
    if (left) left++;
    if (right) right++;
  } catch {
    // Tainted or undecodable image: use it as-is
  }
  const kx = W / AW;
  const ky = H / AH;
  const rect = { sx: left * kx, sy: top * ky, sw: W - (left + right) * kx, sh: H - (top + bottom) * ky };
  contentRects.set(img, rect);
  return rect;
}

/** Centre-crop a rect to the given aspect ratio (cover fit). */
export function coverCrop({ sx, sy, sw, sh }: SourceRect, aspect: number): SourceRect {
  if (sw / sh > aspect) {
    const nw = sh * aspect;
    return { sx: sx + (sw - nw) / 2, sy, sw: nw, sh };
  }
  const nh = sw / aspect;
  return { sx, sy: sy + (sh - nh) / 2, sw, sh: nh };
}
