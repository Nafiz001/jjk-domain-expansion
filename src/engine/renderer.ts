import type { DomainId, RenderPipelineConfig } from '../types';
import { DOMAINS } from '../data/domains';
import { ParticleSystem } from './particles';
import { WorldMap, type PlateInfo, type WorldView } from './worldMap';

export const DOMAIN_SEQUENCE: DomainId[] = [
  'infinite-void',
  'malevolent-shrine',
  'chimera-shadow',
  'authentic-mutual-love',
  'idle-death-gamble',
  'self-embodiment-of-perfection'
];

export interface FrameTelemetry {
  frame: number;
  totalFrames: number;
  progress: number;
  stageIndex: number;
  localT: number;
  scrollVelocity: number;
  fps: number;
  frameTimeMs: number;
  domainId: DomainId;
  nextDomainId: DomainId;
  chapterIndex: number;
  domainProgress: number;
  totalChapters: number;
}

export class DomainRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particleSystem: ParticleSystem;
  private world = new WorldMap();

  // Map<DomainId, HTMLImageElement[]> storing all 6 progressive keyframes per domain
  private domainFrames: Map<DomainId, HTMLImageElement[]> = new Map();
  private fallbackImages: Map<DomainId, HTMLImageElement> = new Map();
  private totalAssets = 0;
  private loadedAssets = 0;

  private currentProgress = 0;
  private targetProgress = 0;
  private scrollVelocity = 0;
  private currentDomainId: DomainId = 'infinite-void';

  private isBlackFlash = false;
  private blackFlashTimer = 0;
  private shakeIntensity = 0;

  // Manga impact frame (inverted monochrome + focus lines) on domain changes
  private impactTimer = 0;
  private impactDuration = 0;
  private impactColor = '#ffffff';
  private lastChapterIndex = -1;
  private lastChapterImpactAt = 0;
  private focusLineSeeds: Array<{ angle: number; width: number; depth: number }> = [];

  // Pointer-driven camera parallax (normalized -1..1, smoothed)
  private pointerTargetX = 0;
  private pointerTargetY = 0;
  private pointerX = 0;
  private pointerY = 0;

  // Performance & FPS tracking for Engineering HUD
  private lastRenderTime = performance.now();
  private smoothedFps = 60;
  private smoothedFrameMs = 16.6;

  private config: RenderPipelineConfig = {
    mode: 'world-map',
    enablePortalStack: true,
    enableZTunnel: true,
    enableWireframe: false,
    enableChromatic: true,
    enableParticles: true,
    lerpFactor: 0.08,
    zoomIntensity: 2.0,
    maxParticles: 220,
    overdrive120: false,
    enablePointerParallax: true,
    enableImpactFrames: true,
    reducedMotion: false
  };

  // Offscreen buffer used to feather the incoming plate's edges
  private featherCanvas = document.createElement('canvas');
  private featherCtx = this.featherCanvas.getContext('2d')!;

  private onFrameUpdateCallback?: (telemetry: FrameTelemetry) => void;
  private onLoadProgressCallback?: (loaded: number, total: number) => void;

  constructor(canvas: HTMLCanvasElement, particleSystem: ParticleSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.particleSystem = particleSystem;

    this.preloadAllKeyframes();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  public setOnFrameUpdate(cb: (telemetry: FrameTelemetry) => void) {
    this.onFrameUpdateCallback = cb;
  }

  public setOnLoadProgress(cb: (loaded: number, total: number) => void) {
    this.onLoadProgressCallback = cb;
  }

  public getConfig(): RenderPipelineConfig {
    return this.config;
  }

  public updateConfig(partial: Partial<RenderPipelineConfig>) {
    this.config = { ...this.config, ...partial };
    if (partial.maxParticles !== undefined) {
      this.particleSystem.setMaxParticles(partial.maxParticles);
    }
  }

  private preloadAllKeyframes() {
    const domainList = Object.values(DOMAINS);
    this.totalAssets = domainList.reduce((acc, d) => acc + d.frames.length, 0);

    domainList.forEach((domain) => {
      const fallback = new Image();
      fallback.src = domain.image;
      this.fallbackImages.set(domain.id, fallback);

      const frameImgs: HTMLImageElement[] = [];
      domain.frames.forEach((fSpec) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = fSpec.src;
        const settle = () => {
          this.loadedAssets++;
          if (this.onLoadProgressCallback) {
            this.onLoadProgressCallback(this.loadedAssets, this.totalAssets);
          }
        };
        img.onload = settle;
        img.onerror = settle;
        frameImgs.push(img);
      });
      this.domainFrames.set(domain.id, frameImgs);
    });
  }

  public getDomainFrameImage(domainId: DomainId, index: number): HTMLImageElement | undefined {
    const arr = this.domainFrames.get(domainId);
    if (arr && arr[index] && arr[index].complete && arr[index].naturalWidth > 0) {
      return arr[index];
    }
    return this.fallbackImages.get(domainId);
  }

  public setDomain(id: DomainId) {
    this.currentDomainId = id;
    this.shake(10);
  }

  public setTargetProgress(progress: number) {
    this.targetProgress = Math.max(0, Math.min(1, progress));
  }

  public getTargetProgress(): number {
    return this.targetProgress;
  }

  /** Camera viewport in world-grid cell units, or null outside world-map mode. */
  public getWorldView(): WorldView | null {
    return this.config.mode === 'world-map' ? this.world.view : null;
  }

  private plateAt(k: number): PlateInfo {
    const domainId = DOMAIN_SEQUENCE[Math.floor(k / 6)];
    const spec = DOMAINS[domainId].frames[k % 6];
    return { img: this.getDomainFrameImage(domainId, k % 6), focalX: spec.focalX, focalY: spec.focalY };
  }

  /** Smoothed pointer position (-1..1), shared with the three.js world. */
  public getPointer(): { x: number; y: number } {
    return { x: this.pointerX, y: this.pointerY };
  }

  /** Impact-frame / Black Flash / shake state, mirrored onto the WebGL canvas in 3D mode. */
  public getFxState(): { inverted: boolean; tinted: boolean; shake: number } {
    const impact = this.impactTimer > 0;
    const impactInverted = impact && (this.impactDuration - this.impactTimer) % 3 !== 1;
    return {
      inverted: this.isBlackFlash || impactInverted,
      tinted: impact && !impactInverted,
      shake: this.shakeIntensity
    };
  }

  public getCurrentProgress(): number {
    return this.currentProgress;
  }

  public triggerBlackFlash() {
    this.isBlackFlash = true;
    this.blackFlashTimer = 20;
    this.shake(28);
    this.particleSystem.triggerBlackFlashBurst(this.canvas.width, this.canvas.height);
  }

  public shake(magnitude: number) {
    if (this.config.reducedMotion) return;
    this.shakeIntensity = Math.max(this.shakeIntensity, magnitude);
  }

  /** Pointer position in normalized device space (-1..1). */
  public setPointer(nx: number, ny: number) {
    this.pointerTargetX = Math.max(-1, Math.min(1, nx));
    this.pointerTargetY = Math.max(-1, Math.min(1, ny));
  }

  /** Anime-style impact frame: a few frames of inverted monochrome with radial focus lines. */
  public triggerImpactFrame(color: string, frames = 8) {
    if (!this.config.enableImpactFrames || this.config.reducedMotion) return;
    this.impactDuration = frames;
    this.impactTimer = frames;
    this.impactColor = color;
    this.focusLineSeeds = Array.from({ length: 110 }, () => ({
      angle: Math.random() * Math.PI * 2,
      width: 0.004 + Math.random() * 0.014,
      depth: 0.18 + Math.random() * 0.32
    }));
  }

  private handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.featherCanvas.width = this.canvas.width;
    this.featherCanvas.height = this.canvas.height;
  }

  public render() {
    const now = performance.now();
    const dtMs = Math.min(100, Math.max(1, now - this.lastRenderTime));
    this.lastRenderTime = now;
    const instantFps = Math.min(120, 1000 / dtMs);
    this.smoothedFps = this.smoothedFps * 0.92 + instantFps * 0.08;
    this.smoothedFrameMs = this.smoothedFrameMs * 0.92 + dtMs * 0.08;

    // Smooth Lerp progress & compute continuous scroll velocity
    const prevProgress = this.currentProgress;
    // Frame-rate independent easing: lerpFactor is tuned per 60Hz frame
    const frameScale = dtMs / (1000 / 60);
    const k = 1 - Math.pow(1 - this.config.lerpFactor, frameScale);
    this.currentProgress += (this.targetProgress - this.currentProgress) * k;
    this.scrollVelocity = (this.currentProgress - prevProgress) / frameScale;

    const pk = 1 - Math.pow(1 - 0.06, frameScale);
    const parallaxOn = this.config.enablePointerParallax && !this.config.reducedMotion;
    this.pointerX += ((parallaxOn ? this.pointerTargetX : 0) - this.pointerX) * pk;
    this.pointerY += ((parallaxOn ? this.pointerTargetY : 0) - this.pointerY) * pk;

    const totalPlates = DOMAIN_SEQUENCE.length * 6; // 36 plates across 6 domains
    const totalTransitions = totalPlates - 1; // 35 transitions

    const stepFloat = this.currentProgress * totalTransitions;
    const stepFloor = Math.min(totalTransitions - 1, Math.max(0, Math.floor(stepFloat)));
    const localT = Math.max(0, Math.min(1, stepFloat - stepFloor));

    // Determine Plate A (outgoing)
    const chapterIndexA = Math.floor(stepFloor / 6);
    const frameIndexA = stepFloor % 6;
    const domainIdA = DOMAIN_SEQUENCE[chapterIndexA];

    // Determine Plate B (incoming)
    const nextStep = Math.min(totalTransitions, stepFloor + 1);
    const chapterIndexB = Math.floor(nextStep / 6);
    const frameIndexB = nextStep % 6;
    const domainIdB = DOMAIN_SEQUENCE[chapterIndexB];

    // Determine Plate C (deep lookahead)
    const lookaheadStep = Math.min(totalTransitions, stepFloor + 2);
    const chapterIndexC = Math.floor(lookaheadStep / 6);
    const frameIndexC = lookaheadStep % 6;
    const domainIdC = DOMAIN_SEQUENCE[chapterIndexC];

    this.currentDomainId = domainIdA;

    // Cooldown so a fast multi-chapter jump doesn't strobe
    if (this.lastChapterIndex !== -1 && chapterIndexA !== this.lastChapterIndex && now - this.lastChapterImpactAt > 900) {
      this.lastChapterImpactAt = now;
      this.triggerImpactFrame(DOMAINS[domainIdA].primaryColor);
      this.shake(16);
    }
    this.lastChapterIndex = chapterIndexA;

    const domainA = DOMAINS[domainIdA];
    const domainB = DOMAINS[domainIdB];
    const frameA = this.getDomainFrameImage(domainIdA, frameIndexA);
    const frameB = this.getDomainFrameImage(domainIdB, frameIndexB);
    const frameC = this.getDomainFrameImage(domainIdC, frameIndexC);

    const specA = domainA.frames[frameIndexA];
    const specB = domainB.frames[frameIndexB];
    const focalX = specA.focalX * (1 - localT) + specB.focalX * localT;
    const focalY = specA.focalY * (1 - localT) + specB.focalY * localT;

    if (this.onFrameUpdateCallback) {
      this.onFrameUpdateCallback({
        frame: Math.round(this.currentProgress * 240),
        totalFrames: 240,
        progress: this.currentProgress,
        stageIndex: frameIndexA,
        localT,
        scrollVelocity: this.scrollVelocity,
        fps: Math.round(this.smoothedFps),
        frameTimeMs: Number(this.smoothedFrameMs.toFixed(1)),
        domainId: domainIdA,
        nextDomainId: domainIdB,
        chapterIndex: chapterIndexA,
        domainProgress: (stepFloat % 6) / 5,
        totalChapters: DOMAIN_SEQUENCE.length
      });
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    ctx.save();
    let sx = 0;
    let sy = 0;
    if (this.shakeIntensity > 0.1) {
      sx = (Math.random() - 0.5) * this.shakeIntensity;
      sy = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.88;
    }
    ctx.translate(sx, sy);

    if (this.blackFlashTimer > 0) {
      this.blackFlashTimer--;
      if (this.blackFlashTimer === 0) {
        this.isBlackFlash = false;
      }
    }

    // In 3D mode this canvas is a transparent effects layer over the WebGL tower
    const is3D = this.config.mode === 'world-3d';
    if (is3D) {
      ctx.clearRect(-30, -30, width + 60, height + 60);
    } else {
      ctx.fillStyle = '#040509';
      ctx.fillRect(-30, -30, width + 60, height + 60);
    }

    // 1. Render Multi-Frame Depth Journey
    const isWorld = this.config.mode === 'world-map';
    if (is3D) {
      this.drawCinematicVignette(ctx, width, height, domainA.primaryColor, this.currentProgress);
    } else if (isWorld) {
      this.world.render(
        ctx,
        width,
        height,
        {
          progress: this.currentProgress,
          pointerX: this.pointerX,
          pointerY: this.pointerY,
          reducedMotion: this.config.reducedMotion,
          primaryColor: domainA.primaryColor
        },
        (k) => this.plateAt(k)
      );
      this.drawCinematicVignette(ctx, width, height, domainA.primaryColor, this.currentProgress);
    } else if (frameA && frameB) {
      if (this.config.mode === 'split-debug') {
        this.renderSplitComparison(ctx, width, height, frameA, frameB, domainA, domainB, frameIndexA, localT);
      } else if (this.config.mode === 'cinematic-morph' || !this.config.enablePortalStack) {
        this.renderCinematicMorph(ctx, width, height, frameA, frameB, domainA, domainB, localT, focalX, focalY);
      } else {
        this.renderPortalDepthTunnel(
          ctx,
          width,
          height,
          frameA,
          frameB,
          frameC,
          domainA,
          domainB,
          frameIndexA,
          localT,
          focalX,
          focalY
        );
      }
    }

    // 2. Render 3D Z-Tunnel perspective geometry & speed rays
    // (The radial tunnel implies forward travel; the world map draws its own directional streaks)
    if (this.config.enableZTunnel && !isWorld && !is3D) {
      this.particleSystem.drawZTunnel(
        ctx,
        width,
        height,
        domainA.primaryColor,
        domainB.secondaryColor,
        this.currentProgress,
        this.scrollVelocity,
        focalX,
        focalY
      );
    }

    // 3. Update & Draw Particles (the 3D world has its own volumetric dust)
    if (this.config.enableParticles && !is3D) {
      this.particleSystem.update(
        width,
        height,
        this.currentDomainId,
        this.currentProgress,
        this.scrollVelocity,
        this.isBlackFlash,
        this.config.overdrive120
      );
      this.particleSystem.draw(ctx, width, height, this.currentDomainId, this.currentProgress);
    }

    // 4. Phase 3 Fracture & Phase 5 Guaranteed-Hit HUD Overlays
    if (frameIndexA === 3) {
      this.drawFractureOverlays(ctx, width, height, localT, domainA.primaryColor);
    }
    if (frameIndexA === 5) {
      this.drawSureHitOverlays(ctx, width, height, domainIdA, localT);
    }

    // 5. 120% Overdrive Aura Rim if unlocked
    if (this.config.overdrive120) {
      this.drawOverdriveAura(ctx, width, height, domainA.primaryColor, domainA.secondaryColor);
    }

    // 6. Engineering Debug Wireframe & Camera Frustum Overlay
    if (this.config.enableWireframe) {
      this.drawEngineeringWireframe(
        ctx,
        width,
        height,
        domainA,
        frameIndexA,
        localT,
        focalX,
        focalY
      );
    }

    // 7. Manga impact frame on domain change
    if (this.impactTimer > 0) {
      const centred = isWorld || is3D;
      this.drawImpactFrame(ctx, width, height, centred ? 0.5 : focalX, centred ? 0.5 : focalY, !is3D);
      this.impactTimer--;
    }

    // 8. Black Flash Inversion Impact
    if (this.isBlackFlash) {
      this.drawBlackFlashFlash(ctx, width, height, !is3D);
    }

    ctx.restore();
  }

  /**
   * CORE MULTI-FRAME DEPTH-TUNNEL ENGINE:
   * Seamlessly travels through 6 distinct keyframe plates so they feel like a single continuous 3D world.
   * - Outgoing Frame[k] zooms past the camera (1.0x -> zoomIntensity) while separating into outer peripheral parallax + main plane.
   * - A feathered radial portal opens around the focal point (focalX, focalY) of Frame[k], revealing Incoming Frame[k+1]
   *   scaling up from deep space (0.42x -> 1.0x), and Lookahead Frame[k+2] at the deep vanishing core (0.18x -> 0.42x).
   */
  private renderPortalDepthTunnel(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    frameA: HTMLImageElement,
    frameB: HTMLImageElement,
    frameC: HTMLImageElement | undefined,
    domainA: typeof DOMAINS[DomainId],
    domainB: typeof DOMAINS[DomainId],
    stageIndex: number,
    t: number,
    focalX: number,
    focalY: number
  ) {
    const easeInOut = t * t * (3 - 2 * t);
    const easeOut = 1 - Math.pow(1 - t, 3);
    const breath = Math.sin(performance.now() * 0.0012) * 0.014;

    const maxZoom = this.config.zoomIntensity;
    // Outgoing Frame A zooms from 1.0x past the camera lens up to maxZoom
    const scaleA = Math.pow(maxZoom, easeInOut) + breath;
    // Outer peripheral ring of Frame A zooms even faster for 2.5D parallax depth
    const scaleAPeripheral = Math.pow(maxZoom * 1.28, easeInOut) + breath;
    // Incoming Frame B emerges from the focal vanishing point (1/maxZoom -> 1.0x)
    const startScaleB = 1 / maxZoom;
    const scaleB = startScaleB + (1.0 - startScaleB) * easeInOut + breath;
    // Lookahead Frame C sits deep inside the vanishing point
    const scaleC = startScaleB * 0.45 + startScaleB * 0.55 * easeInOut;

    const camRoll =
      Math.sin((stageIndex + t) * Math.PI * 0.5) * 0.016 + this.scrollVelocity * 0.45 + this.pointerX * 0.008;
    const focusPxX = (focalX - 0.5) * width * 0.35;
    const focusPxY = (focalY - 0.5) * height * 0.35;

    // Pointer parallax: near plane (A) shifts most, deep planes (B, C) least.
    // Overscan keeps the shifted near plane from exposing the canvas edge.
    const parallaxPx = Math.min(width, height) * 0.022;
    const pX = -this.pointerX * parallaxPx;
    const pY = -this.pointerY * parallaxPx;
    const overscan = 1.035;

    // 1. Base Layer: Outgoing Frame A (Main Plane + Peripheral 2.5D Parallax Ring)
    this.drawTransformedImage(
      ctx,
      frameA,
      width,
      height,
      width / 2 - focusPxX * easeInOut + pX,
      height / 2 - focusPxY * easeInOut + pY,
      scaleA * overscan,
      camRoll,
      1.0,
      this.config.enableChromatic && !this.config.reducedMotion && (Math.abs(this.scrollVelocity) > 0.002 || stageIndex === 2)
        ? Math.min(14, Math.abs(this.scrollVelocity) * 650 + (stageIndex === 2 ? 6 : 0))
        : 0
    );

    // Subtle 2.5D Outer Peripheral Parallax Ring of Frame A when zooming
    if (t > 0.05 && t < 0.95) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.arc(width * focalX, height * focalY, Math.min(width, height) * 0.38, 0, Math.PI * 2, true);
      ctx.clip();
      this.drawTransformedImage(
        ctx,
        frameA,
        width,
        height,
        width / 2 - focusPxX * easeInOut * 1.2 + pX * 1.6,
        height / 2 - focusPxY * easeInOut * 1.2 + pY * 1.6,
        scaleAPeripheral * overscan,
        camRoll * 1.3,
        Math.sin(t * Math.PI) * 0.42,
        0
      );
      ctx.restore();
    }

    // 2. Portal Emergence Layer: Incoming Frame B expanding from the focal center of Frame A
    if (t > 0.005) {
      const portalCenterX = width * focalX;
      const portalCenterY = height * focalY;
      const maxDiag = Math.hypot(width, height) * 0.78;
      const portalRadius = Math.max(20, easeOut * maxDiag);

      // Draw Frame B clipped inside expanding portal + soft alpha crossfade
      ctx.save();
      ctx.beginPath();
      ctx.arc(portalCenterX, portalCenterY, portalRadius, 0, Math.PI * 2);
      ctx.clip();

      this.drawFeatheredPlate(
        ctx,
        frameB,
        width,
        height,
        width / 2 + focusPxX * (1 - easeInOut) * 0.5 + pX * (0.35 + 0.65 * easeInOut),
        height / 2 + focusPxY * (1 - easeInOut) * 0.5 + pY * (0.35 + 0.65 * easeInOut),
        scaleB * overscan,
        camRoll * 0.6,
        Math.min(1, t * 1.45),
        easeInOut
      );

      // 3. Deep Vanishing Point Lookahead (Frame C) visible in the innermost core
      if (frameC && stageIndex < 4 && t > 0.35) {
        const innerRadius = portalRadius * 0.28 * ((t - 0.35) / 0.65);
        if (innerRadius > 15) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(portalCenterX, portalCenterY, innerRadius, 0, Math.PI * 2);
          ctx.clip();
          this.drawTransformedImage(
            ctx,
            frameC,
            width,
            height,
            width / 2 + pX * 0.15,
            height / 2 + pY * 0.15,
            scaleC,
            camRoll * 0.3,
            (t - 0.35) * 0.75,
            0
          );
          ctx.restore();
        }
      }

      ctx.restore();

      // 4. Feathered Cursed-Energy Shockwave Ring along the Portal Seam
      if (t > 0.02 && t < 0.96) {
        const seamAlpha = Math.sin(t * Math.PI) * 0.85;
        ctx.save();
        const innerR = Math.max(1, portalRadius * 0.78);
        const outerR = portalRadius * 1.18;
        const seamGrad = ctx.createRadialGradient(
          portalCenterX,
          portalCenterY,
          innerR,
          portalCenterX,
          portalCenterY,
          outerR
        );
        seamGrad.addColorStop(0, 'rgba(0,0,0,0)');
        seamGrad.addColorStop(0.45, domainA.primaryColor + '55');
        seamGrad.addColorStop(0.52, '#ffffffaa');
        seamGrad.addColorStop(0.62, domainB.secondaryColor + '55');
        seamGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = seamAlpha;
        ctx.fillStyle = seamGrad;
        ctx.beginPath();
        ctx.arc(portalCenterX, portalCenterY, outerR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 5. Atmospheric Vignette & Domain Rim Glow
    const activeColor = t > 0.5 ? domainB.primaryColor : domainA.primaryColor;
    this.drawCinematicVignette(ctx, width, height, activeColor, this.currentProgress);
  }

  private renderCinematicMorph(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    frameA: HTMLImageElement,
    frameB: HTMLImageElement,
    domainA: typeof DOMAINS[DomainId],
    domainB: typeof DOMAINS[DomainId],
    t: number,
    focalX: number,
    focalY: number
  ) {
    const ease = t * t * (3 - 2 * t);
    const scaleA = 1.0 + ease * 0.75;
    const scaleB = 0.65 + ease * 0.35;
    const panX = (focalX - 0.5) * 60;
    const panY = (focalY - 0.5) * 40;

    this.drawTransformedImage(ctx, frameA, width, height, width / 2 - panX * ease, height / 2 - panY * ease, scaleA, 0, 1 - ease * 0.6, 0);
    this.drawTransformedImage(ctx, frameB, width, height, width / 2 + panX * (1 - ease), height / 2 + panY * (1 - ease), scaleB, 0, ease, 0);
    const activeColor = t > 0.5 ? domainB.primaryColor : domainA.primaryColor;
    this.drawCinematicVignette(ctx, width, height, activeColor, this.currentProgress);
  }

  private renderSplitComparison(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    frameA: HTMLImageElement,
    frameB: HTMLImageElement,
    domainA: typeof DOMAINS[DomainId],
    domainB: typeof DOMAINS[DomainId],
    _stageIndex: number,
    t: number
  ) {
    const splitX = width * (0.2 + 0.6 * (1 - t));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, height);
    ctx.clip();
    this.drawTransformedImage(ctx, frameA, width, height, width / 2, height / 2, 1.05 + t * 0.25, 0, 1, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, width - splitX, height);
    ctx.clip();
    this.drawTransformedImage(ctx, frameB, width, height, width / 2, height / 2, 0.85 + t * 0.2, 0, 1, 0);
    ctx.restore();

    // Divider line & labels
    ctx.save();
    ctx.strokeStyle = domainA.primaryColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = domainA.primaryColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, height);
    ctx.stroke();

    ctx.fillStyle = 'rgba(5, 6, 12, 0.85)';
    ctx.fillRect(splitX - 150, height * 0.14, 140, 32);
    ctx.fillRect(splitX + 10, height * 0.14, 140, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`OUT: ${domainA.nameJa}`, splitX - 138, height * 0.14 + 20);
    ctx.fillStyle = domainB.primaryColor;
    ctx.fillText(`IN: ${domainB.nameJa}`, splitX + 22, height * 0.14 + 20);
    ctx.restore();
  }

  private drawTransformedImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    canvasW: number,
    canvasH: number,
    centerX: number,
    centerY: number,
    scale: number,
    rotation: number,
    alpha: number,
    chromaticShift: number
  ) {
    if (!img.complete || img.naturalWidth === 0) return;

    ctx.save();
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = canvasW / canvasH;
    let renderW = canvasW;
    let renderH = canvasH;

    if (canvasAspect > imgAspect) {
      renderW = canvasW;
      renderH = canvasW / imgAspect;
    } else {
      renderH = canvasH;
      renderW = canvasH * imgAspect;
    }

    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    if (chromaticShift > 0.5) {
      ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = Math.min(0.45, alpha * 0.4);
      ctx.drawImage(img, -renderW / 2 + chromaticShift, -renderH / 2, renderW, renderH);
      ctx.drawImage(img, -renderW / 2 - chromaticShift, -renderH / 2, renderW, renderH);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
    }

    ctx.restore();
  }

  /**
   * Draws a plate whose rectangular edges dissolve into a soft feather, so a shrunken
   * incoming plate reads as a portal rather than a pasted rectangle.
   * The feather narrows to zero as `openness` -> 1, leaving a full-bleed frame.
   */
  private drawFeatheredPlate(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    canvasW: number,
    canvasH: number,
    centerX: number,
    centerY: number,
    scale: number,
    rotation: number,
    alpha: number,
    openness: number
  ) {
    if (!img.complete || img.naturalWidth === 0) return;
    if (openness > 0.985) {
      this.drawTransformedImage(ctx, img, canvasW, canvasH, centerX, centerY, scale, rotation, alpha, 0);
      return;
    }

    const fctx = this.featherCtx;
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.globalCompositeOperation = 'source-over';
    fctx.clearRect(0, 0, canvasW, canvasH);
    this.drawTransformedImage(fctx, img, canvasW, canvasH, centerX, centerY, scale, rotation, 1, 0);

    // Plate half-extents after cover-fit + scale
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const coverW = canvasW / canvasH > imgAspect ? canvasW : canvasH * imgAspect;
    const coverH = canvasW / canvasH > imgAspect ? canvasW / imgAspect : canvasH;
    const halfW = (coverW * scale) / 2;
    const halfH = (coverH * scale) / 2;

    // Separable rectangular feather in plate space (-1..1 on each axis). The feather band
    // shrinks to nothing as the plate fills the screen, so the hand-off to a plain draw is seamless.
    const band = 0.5 * Math.sqrt(1 - openness);
    if (band > 0.004) {
      fctx.save();
      fctx.globalCompositeOperation = 'destination-in';
      fctx.translate(centerX, centerY);
      fctx.rotate(rotation);
      fctx.scale(halfW, halfH);
      for (const axis of [0, 1]) {
        const g = axis === 0 ? fctx.createLinearGradient(-1, 0, 1, 0) : fctx.createLinearGradient(0, -1, 0, 1);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(band / 2, 'rgba(0,0,0,1)');
        g.addColorStop(1 - band / 2, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        fctx.fillStyle = g;
        fctx.fillRect(-1, -1, 2, 2);
      }
      fctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    // Buffer is in unshaken canvas space; the active shake translate on ctx offsets it like any other layer
    ctx.drawImage(this.featherCanvas, 0, 0);
    ctx.restore();
  }

  private drawCinematicVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    primaryColor: string,
    progress: number
  ) {
    ctx.save();
    const radius = Math.max(width, height) * 0.76;
    const grad = ctx.createRadialGradient(width / 2, height / 2, radius * 0.24, width / 2, height / 2, radius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.68, 'rgba(3, 4, 8, 0.42)');
    grad.addColorStop(1, 'rgba(2, 2, 5, 0.94)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    if (progress < 0.18) {
      const darkAlpha = (1 - progress / 0.18) * 0.55;
      ctx.fillStyle = `rgba(3, 3, 6, ${darkAlpha})`;
      ctx.fillRect(0, 0, width, height);
    }

    const rimGrad = ctx.createLinearGradient(0, height, 0, height - 150);
    rimGrad.addColorStop(0, primaryColor + '36');
    rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, height - 150, width, 150);

    ctx.restore();
  }

  private drawFractureOverlays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    localT: number,
    primaryColor: string
  ) {
    const intensity = Math.sin(localT * Math.PI);
    if (intensity <= 0.02) return;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.65})`;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 12;

    const cx = width * 0.5;
    const cy = height * 0.5;
    const lines = 10;
    for (let i = 0; i < lines; i++) {
      const angle = (i / lines) * Math.PI * 2 + 0.25;
      const dist = Math.min(width, height) * (0.28 + intensity * 0.42);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const midDist = dist * 0.52;
      const midAngle = angle + Math.sin(i * 1.7) * 0.16;
      ctx.lineTo(cx + Math.cos(midAngle) * midDist, cy + Math.sin(midAngle) * midDist);
      ctx.lineTo(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawSureHitOverlays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    domainId: DomainId,
    localT: number
  ) {
    ctx.save();
    const alpha = Math.min(1, Math.max(0, localT * 1.4));

    if (domainId === 'infinite-void') {
      ctx.fillStyle = `rgba(0, 240, 255, ${alpha * 0.28})`;
      ctx.font = '11px monospace';
      for (let i = 0; i < 10; i++) {
        const y = height * 0.16 + i * 22;
        const text = `INF_VOID_0x${(i * 849204).toString(16).toUpperCase()} // SYNAPSE_SATURATION [100%] // 0.2S_DATA_DUMP`;
        ctx.fillText(text, 42, y);
      }
    } else if (domainId === 'malevolent-shrine') {
      ctx.strokeStyle = `rgba(255, 23, 68, ${alpha * 0.42})`;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) {
        const y = height * (0.12 + (i / 9) * 0.76);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y + 24);
        ctx.stroke();
      }
    } else if (domainId === 'idle-death-gamble') {
      ctx.fillStyle = `rgba(0, 255, 136, ${alpha * 0.35})`;
      ctx.font = 'bold 12px monospace';
      ctx.fillText('JACKPOT_777 // AUTO_RCT_ACTIVE // REMAINING: 04:11.00 // CE: INFINITE', 42, height * 0.16);
    } else if (domainId === 'authentic-mutual-love') {
      ctx.fillStyle = `rgba(255, 209, 102, ${alpha * 0.32})`;
      ctx.font = 'bold 12px monospace';
      ctx.fillText("SURE_HIT: JACOB'S_LADDER // COPY_ARSENAL: UNLIMITED_KATANAS // RIKA: FULL_MANIFEST", 42, height * 0.16);
    }
    ctx.restore();
  }

  private drawOverdriveAura(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    primaryColor: string,
    secondaryColor: string
  ) {
    ctx.save();
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.006);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3 + pulse * 3;
    ctx.shadowColor = secondaryColor;
    ctx.shadowBlur = 25;
    ctx.strokeRect(10, 10, width - 20, height - 20);
    ctx.restore();
  }

  private drawEngineeringWireframe(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    domain: typeof DOMAINS[DomainId],
    stageIndex: number,
    localT: number,
    focalX: number,
    focalY: number
  ) {
    ctx.save();
    const fx = width * focalX;
    const fy = height * focalY;

    // 1. Perspective Frustum Grid converging to Focal Point
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.32)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    const corners = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
      [width * 0.5, 0],
      [width * 0.5, height],
      [0, height * 0.5],
      [width, height * 0.5]
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(fx, fy);
      ctx.stroke();
    }

    // 2. Portal Aperture Wireframe Circle
    const maxDiag = Math.hypot(width, height) * 0.78;
    const easeOut = 1 - Math.pow(1 - localT, 3);
    const portalR = Math.max(24, easeOut * maxDiag);
    ctx.strokeStyle = '#ffbe0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fx, fy, portalR, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Focal Target Reticle
    ctx.setLineDash([]);
    ctx.strokeStyle = domain.primaryColor || '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx, fy, 18, 0, Math.PI * 2);
    ctx.moveTo(fx - 28, fy);
    ctx.lineTo(fx + 28, fy);
    ctx.moveTo(fx, fy - 28);
    ctx.lineTo(fx, fy + 28);
    ctx.stroke();

    // 4. Telemetry Readout Box next to Reticle
    ctx.fillStyle = 'rgba(5, 8, 16, 0.88)';
    ctx.fillRect(fx + 24, fy - 42, 255, 76);
    ctx.strokeStyle = domain.primaryColor || '#00ff88';
    ctx.lineWidth = 1;
    ctx.strokeRect(fx + 24, fy - 42, 255, 76);

    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`CAMERA VANISHING POINT`, fx + 32, fy - 25);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`FOCAL XY : (${focalX.toFixed(2)}, ${focalY.toFixed(2)})`, fx + 32, fy - 9);
    ctx.fillText(`OUT PLANE: FRAME_0${stageIndex} [${Math.pow(this.config.zoomIntensity, localT).toFixed(2)}x]`, fx + 32, fy + 7);
    ctx.fillText(`IN  PLANE: FRAME_0${Math.min(5, stageIndex + 1)} [PORTAL ${(localT * 100).toFixed(0)}%]`, fx + 32, fy + 23);

    ctx.restore();
  }

  private drawImpactFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    focalX: number,
    focalY: number,
    blendCanvas: boolean
  ) {
    const elapsed = this.impactDuration - this.impactTimer;
    // Flicker pattern: inverted, tinted, inverted, ... then release
    const inverted = elapsed % 3 !== 1;
    const fade = this.impactTimer / this.impactDuration;

    ctx.save();
    // Strip colour -> pure monochrome. Skipped over WebGL (blends need opaque pixels; the
    // 3D canvas mirrors this with a CSS filter instead).
    if (blendCanvas) {
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      if (inverted) {
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.globalCompositeOperation = 'color';
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = this.impactColor;
        ctx.fillRect(0, 0, width, height);
      }
    }

    // 集中線 focus lines converging on the focal point
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, 0.4 + fade);
    ctx.fillStyle = inverted ? '#000' : '#fff';
    const cx = width * focalX;
    const cy = height * focalY;
    const reach = Math.hypot(width, height);
    const minDim = Math.min(width, height);
    ctx.beginPath();
    for (const line of this.focusLineSeeds) {
      const inner = minDim * line.depth;
      const a0 = line.angle - line.width;
      const a1 = line.angle + line.width;
      ctx.moveTo(cx + Math.cos(line.angle) * inner, cy + Math.sin(line.angle) * inner);
      ctx.lineTo(cx + Math.cos(a0) * reach, cy + Math.sin(a0) * reach);
      ctx.lineTo(cx + Math.cos(a1) * reach, cy + Math.sin(a1) * reach);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  private drawBlackFlashFlash(ctx: CanvasRenderingContext2D, width: number, height: number, blendCanvas: boolean) {
    ctx.save();
    if (blendCanvas) {
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 24;

    const cx = width / 2;
    const cy = height / 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      let x = cx;
      let y = cy;
      for (let s = 0; s < 5; s++) {
        x += (Math.random() - 0.5) * 150;
        y += (Math.random() - 0.5) * 150;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}
