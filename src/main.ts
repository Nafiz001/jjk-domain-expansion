import './style.css';
import type { CameraTransitionMode, DomainId } from './types';
import { DOMAINS, DOMAIN_ORDER } from './data/domains';
import { AudioEngine } from './engine/audio';
import { ParticleSystem } from './engine/particles';
import { DomainRenderer, DOMAIN_SEQUENCE } from './engine/renderer';
import { WORLD_COLS, WORLD_PATH, WORLD_ROWS } from './engine/worldMap';
import type { World3D } from './engine/world3d';

// 1. Initialize Core Engines
const canvas = document.getElementById('domain-canvas') as HTMLCanvasElement;
const audioWaveCanvas = document.getElementById('audio-wave') as HTMLCanvasElement;
const audioWaveCtx = audioWaveCanvas ? audioWaveCanvas.getContext('2d') : null;
const fpsSparkCanvas = document.getElementById('fps-sparkline') as HTMLCanvasElement;

const particleSystem = new ParticleSystem();
const renderer = new DomainRenderer(canvas, particleSystem);
const audio = new AudioEngine();

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
function applyMotionPreference() {
  renderer.updateConfig({ reducedMotion: reducedMotionQuery.matches });
}
applyMotionPreference();
reducedMotionQuery.addEventListener('change', applyMotionPreference);

// 2. Application State
let currentDomainId: DomainId = 'infinite-void';
let lastPhaseIndex = -1;
let lastDomainId: DomainId = 'infinite-void';
let isVeiled = true;
let latestProgress = 0;

// FPS Sparkline history
const fpsHistory: number[] = new Array(56).fill(60);

// 3. UI Element References
const btnAudio = document.getElementById('btn-audio') as HTMLButtonElement;
const blackFlashFx = document.getElementById('black-flash-fx') as HTMLElement;

// Nav Indicators
const navChapterNum = document.getElementById('nav-chapter-num') as HTMLElement;
const navChapterName = document.getElementById('nav-chapter-name') as HTMLElement;

// Bottom bar elements
const progressFill = document.getElementById('progress-fill') as HTMLElement;
const hudChapterChip = document.getElementById('hud-chapter-chip') as HTMLElement;
const hudPhaseChip = document.getElementById('hud-phase-chip') as HTMLElement;
const hudCeChip = document.getElementById('hud-ce-chip') as HTMLElement;

// Engineering HUD Elements
const devHud = document.getElementById('dev-hud') as HTMLElement;
const hudFps = document.getElementById('hud-fps') as HTMLElement;
const hudStage = document.getElementById('hud-stage') as HTMLElement;
const hudCameraZ = document.getElementById('hud-camera-z') as HTMLElement;
const hudVelocity = document.getElementById('hud-velocity') as HTMLElement;
const btnCloseDev = document.getElementById('btn-close-dev') as HTMLButtonElement;

// 4. Smooth Scroll Sync to Multi-Domain Continuous Depth Tunnel
function onScroll() {
  const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollY = window.scrollY;
  const progress = Math.max(0, Math.min(1, scrollY / Math.max(1, totalScrollHeight)));
  renderer.setTargetProgress(progress);
}

window.addEventListener('scroll', onScroll, { passive: true });

// 5. Continuous Frame Telemetry from Renderer
renderer.setOnFrameUpdate((telemetry) => {
  const {
    progress,
    stageIndex,
    localT,
    scrollVelocity,
    fps,
    frameTimeMs,
    domainId,
    chapterIndex,
    totalChapters
  } = telemetry;

  currentDomainId = domainId;
  latestProgress = progress;
  const domain = DOMAINS[domainId];
  const activeKfIdx = localT > 0.55 ? Math.min(5, stageIndex + 1) : stageIndex;
  const activeSpec = domain.frames[activeKfIdx];

  // Dynamic Theme Colors
  if (lastDomainId !== domainId) {
    document.documentElement.style.setProperty('--primary-color', domain.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', domain.secondaryColor);
    document.documentElement.style.setProperty('--bg-glow', domain.bgGlow);
    lastDomainId = domainId;
  }

  // Top Nav Chapter Indicator
  navChapterNum.textContent = String(chapterIndex + 1).padStart(2, '0');
  navChapterName.textContent = `${domain.nameJa} // ${domain.nameEn.toUpperCase()}`;

  // Bottom Progress Track & Chips
  progressFill.style.width = `${(progress * 100).toFixed(1)}%`;
  hudChapterChip.textContent = `${String(chapterIndex + 1).padStart(2, '0')} / ${String(totalChapters).padStart(2, '0')} // ${domain.nameEn.toUpperCase()}`;
  hudPhaseChip.textContent = `${String(stageIndex).padStart(2, '0')}. ${activeSpec.labelJa} (${activeSpec.labelEn.toUpperCase()})`;

  // Cursed Energy Output
  const currentCe = Math.floor(domain.baseCeNumeric * (0.3 + (stageIndex / 5) * 0.7));
  hudCeChip.textContent = `${currentCe.toLocaleString()} CE`;

  // Engineering HUD telemetry
  hudFps.textContent = `${fps} FPS (${frameTimeMs}ms)`;
  hudStage.textContent = `CH 0${chapterIndex + 1} • P 0${stageIndex} (${Math.round(localT * 100)}%)`;
  hudCameraZ.textContent = activeSpec.cameraZ;
  hudVelocity.textContent = `${(scrollVelocity * 100).toFixed(2)} Δ%/f`;

  fpsHistory.push(fps);
  if (fpsHistory.length > 56) fpsHistory.shift();

  // Phase & Domain Transition Audio FX
  if (activeKfIdx !== lastPhaseIndex) {
    if (activeKfIdx === 2) {
      audio.playMudraChime();
    } else if (activeKfIdx === 3) {
      audio.playBarrierShatter();
      renderer.shake(12);
    } else if (activeKfIdx === 5) {
      if (domainId === 'malevolent-shrine' || domainId === 'authentic-mutual-love') {
        audio.playSlash();
      } else if (domainId === 'idle-death-gamble') {
        audio.playJackpotFanfare();
      }
    }
    lastPhaseIndex = activeKfIdx;
  }

  audio.updateCursedHum(progress, domainId);
});

// 6. Audio Controls & Visualizer
btnAudio.addEventListener('click', () => {
  audio.init();
  const isMuted = audio.toggleMute();
  btnAudio.classList.toggle('muted', isMuted);
});

function drawAudioWave() {
  if (audioWaveCtx && audioWaveCanvas) {
    audioWaveCtx.clearRect(0, 0, audioWaveCanvas.width, audioWaveCanvas.height);
    const data = audio.getVisualizerData();
    if (data && !audio.getMuted()) {
      audioWaveCtx.strokeStyle = DOMAINS[currentDomainId].primaryColor;
      audioWaveCtx.lineWidth = 1.4;
      audioWaveCtx.beginPath();
      const sliceWidth = audioWaveCanvas.width / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0;
        const y = (v * audioWaveCanvas.height) / 2;
        if (i === 0) audioWaveCtx.moveTo(x, y);
        else audioWaveCtx.lineTo(x, y);
        x += sliceWidth;
      }
      audioWaveCtx.stroke();
    }
  }
}

// 7. Engineering HUD
btnCloseDev.addEventListener('click', () => {
  devHud.classList.remove('open');
});

function drawFpsSparkline() {
  if (!fpsSparkCanvas || !devHud.classList.contains('open')) return;
  const ctx = fpsSparkCanvas.getContext('2d');
  if (!ctx) return;
  const w = fpsSparkCanvas.width;
  const h = fpsSparkCanvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  fpsHistory.forEach((val, idx) => {
    const x = (idx / (fpsHistory.length - 1)) * w;
    const norm = Math.max(0, Math.min(1, val / 75));
    const y = h - 4 - norm * (h - 10);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

// 8. 帳 Veil Loader — lowers while plates load, lifts on entry (the click also unlocks WebAudio)
const veil = document.getElementById('veil') as HTMLElement;
const veilTicks = document.getElementById('veil-ticks') as unknown as SVGGElement;
const veilCount = document.getElementById('veil-count') as HTMLElement;
const veilTotal = document.getElementById('veil-total') as HTMLElement;
const veilChant = document.getElementById('veil-chant') as HTMLElement;
const veilEnter = document.getElementById('veil-enter') as HTMLButtonElement;
const veilMuted = document.getElementById('veil-muted') as HTMLButtonElement;

const totalPlates = DOMAIN_ORDER.reduce((n, id) => n + DOMAINS[id].frames.length, 0);
veilTotal.textContent = String(totalPlates);

const SVG_NS = 'http://www.w3.org/2000/svg';
const tickEls: SVGLineElement[] = [];
for (let i = 0; i < totalPlates; i++) {
  const a = (i / totalPlates) * Math.PI * 2;
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', String(100 + Math.cos(a) * 80));
  line.setAttribute('y1', String(100 + Math.sin(a) * 80));
  line.setAttribute('x2', String(100 + Math.cos(a) * 90));
  line.setAttribute('y2', String(100 + Math.sin(a) * 90));
  line.setAttribute('class', 'veil-tick');
  veilTicks.appendChild(line);
  tickEls.push(line);
}

Array.from(veilChant.textContent ?? '').forEach((ch, i, all) => {
  if (i === 0) {
    veilChant.setAttribute('aria-label', all.join(''));
    veilChant.textContent = '';
  }
  const span = document.createElement('span');
  span.className = 'ch';
  span.setAttribute('aria-hidden', 'true');
  span.style.setProperty('--i', String(i));
  span.textContent = ch;
  veilChant.appendChild(span);
});

let veilReady = false;
function markVeilReady() {
  if (veilReady) return;
  veilReady = true;
  veilEnter.disabled = false;
  veilMuted.disabled = false;
  veilEnter.focus({ preventScroll: true });
}

renderer.setOnLoadProgress((loaded, total) => {
  veilCount.textContent = String(loaded).padStart(2, '0');
  tickEls.forEach((el, i) => el.classList.toggle('lit', i < loaded));
  if (loaded >= total) markVeilReady();
});
// Never trap visitors behind a slow network
setTimeout(markVeilReady, 15000);

function liftVeil(withSound: boolean) {
  if (!isVeiled) return;
  isVeiled = false;
  audio.init();
  if (!withSound && !audio.getMuted()) {
    btnAudio.classList.toggle('muted', audio.toggleMute());
  }
  veil.classList.add('lifted');
  document.body.classList.remove('is-veiled');
  renderer.triggerImpactFrame(DOMAINS[currentDomainId].primaryColor, 10);
  renderer.shake(18);
  audio.playBarrierShatter();
  setTimeout(() => {
    veil.hidden = true;
    startKineticTypography();
    onEnteredWorld();
  }, 650);
}

veilEnter.addEventListener('click', () => liftVeil(true));
veilMuted.addEventListener('click', () => liftVeil(false));

// 9. Kinetic Typography — per-character reveals and scramble-decoded labels
const ASCII_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*';
const CJK_GLYPHS = '呪術廻戦領域展開無量空処伏魔御廚子嵌合暗翳庭真贋相愛坐殺博徒自閉円頓裹黒閃';
const CJK_RE = /[　-鿿＀-￯]/;

function splitText(el: HTMLElement) {
  const text = el.textContent ?? '';
  el.setAttribute('aria-label', text);
  el.textContent = '';
  let i = 0;
  const makeChar = (ch: string) => {
    const span = document.createElement('span');
    span.className = 'ch';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--i', String(i++));
    span.textContent = ch;
    return span;
  };
  for (const token of text.split(/(\s+)/)) {
    if (!token) continue;
    if (/^\s+$/.test(token)) {
      el.append(' ');
    } else if (CJK_RE.test(token)) {
      // CJK may break between any characters, so don't group into a nowrap word
      Array.from(token).forEach((ch) => el.append(makeChar(ch)));
    } else {
      const word = document.createElement('span');
      word.className = 'word';
      word.setAttribute('aria-hidden', 'true');
      Array.from(token).forEach((ch) => word.append(makeChar(ch)));
      el.append(word);
    }
  }
  el.classList.add('split');
}

const scrambleFrames = new WeakMap<HTMLElement, number>();
function scrambleDecode(el: HTMLElement) {
  const final = el.dataset.text ?? (el.dataset.text = el.textContent ?? '');
  if (reducedMotionQuery.matches) {
    el.textContent = final;
    return;
  }
  const chars = Array.from(final);
  const start = performance.now();
  const duration = 650;
  cancelAnimationFrame(scrambleFrames.get(el) ?? 0);
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const revealed = Math.floor(p * chars.length);
    el.textContent = chars
      .map((ch, i) => {
        if (i < revealed || /\s|\/|\./.test(ch)) return ch;
        const pool = CJK_RE.test(ch) ? CJK_GLYPHS : ASCII_GLYPHS;
        return pool[Math.floor(Math.random() * pool.length)];
      })
      .join('');
    if (p < 1) scrambleFrames.set(el, requestAnimationFrame(step));
  };
  scrambleFrames.set(el, requestAnimationFrame(step));
}

function startKineticTypography() {
  document
    .querySelectorAll<HTMLElement>('.hero-kanji, .hero-title, .phase-title, .phase-quote')
    .forEach(splitText);
  document.documentElement.classList.add('kinetic');

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          if (!el.classList.contains('is-visible')) {
            el.classList.add('is-visible');
            el.querySelectorAll<HTMLElement>('.phase-label, .chapter-badge').forEach(scrambleDecode);
          }
        } else {
          el.classList.remove('is-visible');
        }
      }
    },
    { threshold: 0.3 }
  );
  document.querySelectorAll('.phase-overlay').forEach((el) => observer.observe(el));
}

// 10. Cursor Reticle & Pointer Parallax
const cursorRing = document.getElementById('cursor-ring') as HTMLElement;
const cursorDot = document.getElementById('cursor-dot') as HTMLElement;
let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let ringX = pointerX;
let ringY = pointerY;
let hasMousePointer = false;

window.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  pointerX = e.clientX;
  pointerY = e.clientY;
  if (!hasMousePointer) {
    hasMousePointer = true;
    ringX = pointerX;
    ringY = pointerY;
    document.documentElement.classList.add('has-cursor');
  }
  cursorDot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
  renderer.setPointer((pointerX / window.innerWidth) * 2 - 1, (pointerY / window.innerHeight) * 2 - 1);
});

document.addEventListener('pointerout', (e) => {
  if (!e.relatedTarget) renderer.setPointer(0, 0);
});
window.addEventListener('pointerdown', () => cursorRing.classList.add('pressed'));
window.addEventListener('pointerup', () => cursorRing.classList.remove('pressed'));
document.addEventListener('mouseover', (e) => {
  const interactive = (e.target as Element | null)?.closest('button, a, [role="button"]');
  cursorRing.classList.toggle('hover', Boolean(interactive));
});

function updateCursorRing(dt: number) {
  if (!hasMousePointer) return;
  const k = 1 - Math.pow(1 - 0.22, dt * 60);
  ringX += (pointerX - ringX) * k;
  ringY += (pointerY - ringY) * k;
  cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
}

// 11. World Minimap & Camera Mode
const minimap = document.getElementById('minimap') as HTMLCanvasElement;
const minimapCtx = minimap.getContext('2d')!;
const viewButtons = document.querySelectorAll<HTMLButtonElement>('[data-view-mode]');
const world3dCanvas = document.getElementById('world3d-canvas') as HTMLCanvasElement;
const VIEW_CYCLE: CameraTransitionMode[] = ['world-map', 'world-3d', 'portal-tunnel'];

const toast = document.getElementById('toast') as HTMLElement;
let toastTimer = 0;
function showToast(message: string, kind: 'info' | 'error' = 'info', ms = 0) {
  toast.textContent = message;
  toast.dataset.kind = kind;
  toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  if (ms) toastTimer = window.setTimeout(hideToast, ms);
}
function hideToast() {
  toast.classList.remove('visible');
}

// Remember the chosen camera mode across reloads (a per-viewer convenience only)
const VIEW_KEY = 'jjk-view';
const RELOAD_KEY = 'jjk-3d-reloaded';
function savedView(): CameraTransitionMode {
  try {
    const v = localStorage.getItem(VIEW_KEY) as CameraTransitionMode | null;
    return v && VIEW_CYCLE.includes(v) ? v : 'world-map';
  } catch {
    return 'world-map';
  }
}
function saveView(mode: CameraTransitionMode) {
  try {
    localStorage.setItem(VIEW_KEY, mode);
  } catch {
    // Storage blocked: the mode just won't persist
  }
}

// three.js is code-split: the 3D realms are only downloaded when needed (prefetched after entry)
let world3d: World3D | null = null;
let world3dLoading: Promise<World3D> | null = null;
let world3dModule: Promise<typeof import('./engine/world3d')> | null = null;
let requestedView: CameraTransitionMode = 'world-map';

function importWorld3D() {
  world3dModule ??= import('./engine/world3d');
  return world3dModule;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function hasWebGL2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

function loadWorld3D(): Promise<World3D> {
  world3dLoading ??= (async () => {
    if (!hasWebGL2()) {
      throw new Error('WebGL2 is unavailable — enable hardware acceleration in your browser settings.');
    }
    const { World3D } = await importWorld3D();
    // Let the "summoning" toast paint before the heavy synchronous world build
    await nextFrame();
    await nextFrame();
    world3d = new World3D(
      world3dCanvas,
      Array.from({ length: DOMAIN_ORDER.length * 6 }, (_, k) => ({
        img: renderer.getDomainFrameImage(DOMAIN_ORDER[Math.floor(k / 6)], k % 6)
      })),
      DOMAIN_ORDER.map((id) => ({ color: DOMAINS[id].primaryColor, nameJa: DOMAINS[id].nameJa }))
    );
    return world3d;
  })();
  return world3dLoading;
}

/** A tab opened before a rebuild/redeploy can request a chunk that no longer exists. */
function isStaleChunkError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg);
}

function applyViewMode(mode: CameraTransitionMode) {
  renderer.updateConfig({ mode });
  world3d?.setActive(mode === 'world-3d');
  document.documentElement.dataset.view = mode;
  viewButtons.forEach((b) => {
    b.classList.toggle('active', b.dataset.viewMode === mode);
    b.classList.remove('loading');
  });
}

function setViewMode(mode: CameraTransitionMode) {
  requestedView = mode;
  saveView(mode);
  if (mode !== 'world-3d' || world3d) {
    applyViewMode(mode);
    return;
  }
  viewButtons.forEach((b) => b.classList.toggle('loading', b.dataset.viewMode === mode));
  showToast('界 Summoning the domain realms…');
  loadWorld3D()
    .then(() => {
      hideToast();
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        // ignore
      }
      if (requestedView === 'world-3d') applyViewMode('world-3d');
    })
    .catch((err) => {
      console.error('3D world failed to load', err);
      world3dLoading = null;
      world3dModule = null;
      if (isStaleChunkError(err)) {
        // Reload once to pick up the current build; the saved mode reopens 3D afterwards
        let alreadyTried = false;
        try {
          alreadyTried = sessionStorage.getItem(RELOAD_KEY) === '1';
          sessionStorage.setItem(RELOAD_KEY, '1');
        } catch {
          alreadyTried = true;
        }
        if (!alreadyTried) {
          showToast('Updating to the latest build…');
          window.location.reload();
          return;
        }
      }
      saveView('world-map');
      applyViewMode('world-map');
      showToast(`3D realms couldn't start: ${(err as Error)?.message ?? err}`, 'error', 9000);
    });
}

viewButtons.forEach((b) =>
  b.addEventListener('click', () => setViewMode(b.dataset.viewMode as CameraTransitionMode))
);
// Start on the map without saving, so the remembered mode survives until the veil lifts
applyViewMode('world-map');

/** Called once the veil lifts: restore the remembered mode and quietly prefetch three.js. */
function onEnteredWorld() {
  const preferred = savedView();
  if (preferred !== requestedView) setViewMode(preferred);
  const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
  idle(() => {
    if (hasWebGL2()) importWorld3D().catch(() => (world3dModule = null));
  });
}

function drawMinimap() {
  const view = renderer.getWorldView();
  if (!view) return;
  const w = minimap.width;
  const h = minimap.height;
  const cw = w / WORLD_COLS;
  const ch = h / WORLD_ROWS;
  const ctx = minimapCtx;
  ctx.clearRect(0, 0, w, h);

  WORLD_PATH.forEach(([gx, gy], k) => {
    const id = DOMAIN_ORDER[Math.floor(k / 6)];
    ctx.fillStyle = DOMAINS[id].primaryColor + (id === currentDomainId ? '50' : '1c');
    ctx.fillRect(gx * cw + 1.5, gy * ch + 1.5, cw - 3, ch - 3);
  });

  // Route, with the travelled part highlighted
  const centre = (i: number): [number, number] => [(WORLD_PATH[i][0] + 0.5) * cw, (WORLD_PATH[i][1] + 0.5) * ch];
  const travelled = latestProgress * (WORLD_PATH.length - 1);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  WORLD_PATH.forEach((_, i) => (i === 0 ? ctx.moveTo(...centre(i)) : ctx.lineTo(...centre(i))));
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.moveTo(...centre(0));
  const whole = Math.floor(travelled);
  for (let i = 1; i <= whole; i++) ctx.lineTo(...centre(i));
  if (whole < WORLD_PATH.length - 1) {
    const [x0, y0] = centre(whole);
    const [x1, y1] = centre(whole + 1);
    const f = travelled - whole;
    ctx.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
  }
  ctx.stroke();

  // Camera viewport
  const color = DOMAINS[currentDomainId].primaryColor;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect((view.x - view.w / 2) * cw, (view.y - view.h / 2) * ch, view.w * cw, view.h * ch);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(view.x * cw, view.y * ch, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

minimap.addEventListener('click', (e) => {
  const rect = minimap.getBoundingClientRect();
  const gx = Math.floor(((e.clientX - rect.left) / rect.width) * WORLD_COLS);
  const gy = Math.floor(((e.clientY - rect.top) / rect.height) * WORLD_ROWS);
  const k = WORLD_PATH.findIndex(([x, y]) => x === gx && y === gy);
  if (k < 0) return;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: (k / (WORLD_PATH.length - 1)) * total, behavior: 'smooth' });
});

// 12. Black Flash Trigger
function triggerBlackFlash() {
  audio.init();
  audio.playBlackFlash();
  renderer.triggerBlackFlash();

  blackFlashFx.classList.add('active');
  setTimeout(() => {
    blackFlashFx.classList.remove('active');
  }, 95);
}

// 0.2-second Shibuya domain burst: impact frame + barrier shatter
function triggerDomainBurst() {
  renderer.triggerImpactFrame(DOMAINS[currentDomainId].primaryColor, 12);
  renderer.shake(22);
  audio.playBarrierShatter();
}

// 13. Keyboard Controls
window.addEventListener('keydown', (e) => {
  if (isVeiled || e.ctrlKey || e.metaKey || e.altKey) return;
  audio.init();

  if (e.code === 'Space' && document.activeElement?.tagName !== 'BUTTON') {
    e.preventDefault();
    triggerBlackFlash();
  } else if (e.key >= '1' && e.key <= '6') {
    // Jump scroll position to target chapter
    const idx = parseInt(e.key, 10) - 1;
    if (idx >= 0 && idx < DOMAIN_SEQUENCE.length) {
      const targetP = idx / DOMAIN_SEQUENCE.length;
      const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({
        top: targetP * totalScrollHeight,
        behavior: 'smooth'
      });
    }
  } else if (e.key.toLowerCase() === 'm') {
    btnAudio.click();
  } else if (e.key.toLowerCase() === 'v') {
    const i = VIEW_CYCLE.indexOf(requestedView);
    setViewMode(VIEW_CYCLE[(i + 1) % VIEW_CYCLE.length]);
  } else if (e.key.toLowerCase() === 'd') {
    triggerDomainBurst();
  } else if (e.key.toLowerCase() === 'h') {
    devHud.classList.toggle('open');
  }
});

// 14. Master Animation Loop
let lastTime = performance.now();
function loop(now: number) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  renderer.render();
  if (world3d && renderer.getConfig().mode === 'world-3d') {
    const pointer = renderer.getPointer();
    try {
      world3d.render({
        progress: renderer.getCurrentProgress(),
        pointerX: pointer.x,
        pointerY: pointer.y,
        reducedMotion: reducedMotionQuery.matches,
        ...renderer.getFxState()
      });
    } catch (err) {
      // Never let a WebGL failure freeze the whole page: fall back to the 2D map
      console.error('3D render failed', err);
      world3d = null;
      world3dLoading = null;
      setViewMode('world-map');
      showToast(`3D realms stopped: ${(err as Error)?.message ?? err}`, 'error', 9000);
    }
  }
  updateCursorRing(dt);
  drawMinimap();
  drawAudioWave();
  drawFpsSparkline();

  requestAnimationFrame(loop);
}

// 15. Initial Launch
onScroll();
requestAnimationFrame(loop);
