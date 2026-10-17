import type { DomainId } from '../types';
import { DOMAINS } from '../data/domains';
import { DomainRenderer } from './renderer';

export interface ClashSideState {
  domainId: DomainId;
  refinement: number;    // 50..100
  ceOutputPct: number;   // 50..200
  shellCondition: 'standard' | 'inverted' | 'compressed';
  antiDomainCounter: 'none' | 'simple-domain' | 'wicker-basket' | 'falling-blossom';
}

export interface ClashTelemetryResult {
  dominanceA: number; // 0.05..0.95 (percentage of arena controlled by Left Domain A)
  shellIntegrityA: number;
  shellIntegrityB: number;
  sureHitStatus: string;
  tacticalVerdict: string;
  winnerId: DomainId | 'equilibrium';
}

export class DomainClashSimulator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mainRenderer: DomainRenderer;

  private sideA: ClashSideState = {
    domainId: 'infinite-void',
    refinement: 100,
    ceOutputPct: 120,
    shellCondition: 'compressed',
    antiDomainCounter: 'none'
  };

  private sideB: ClashSideState = {
    domainId: 'malevolent-shrine',
    refinement: 100,
    ceOutputPct: 120,
    shellCondition: 'standard',
    antiDomainCounter: 'none'
  };

  private currentBoundary = 0.5;
  private targetBoundary = 0.5;
  private clashShockwave = 0;

  constructor(canvas: HTMLCanvasElement, mainRenderer: DomainRenderer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.mainRenderer = mainRenderer;
  }

  public setSideA(partial: Partial<ClashSideState>) {
    this.sideA = { ...this.sideA, ...partial };
    this.clashShockwave = 1.0;
  }

  public setSideB(partial: Partial<ClashSideState>) {
    this.sideB = { ...this.sideB, ...partial };
    this.clashShockwave = 1.0;
  }

  public getSideA(): ClashSideState {
    return this.sideA;
  }

  public getSideB(): ClashSideState {
    return this.sideB;
  }

  public triggerClashBurst() {
    this.clashShockwave = 2.2;
  }

  public computeTelemetry(): ClashTelemetryResult {
    const domA = DOMAINS[this.sideA.domainId];
    const domB = DOMAINS[this.sideB.domainId];

    // Base score combines refinement (heaviest weight in JJK lore), CE output, and clash resilience
    let scoreA =
      this.sideA.refinement * 1.8 +
      (this.sideA.ceOutputPct / 100) * 35 +
      domA.metrics.clashResilience * 0.5;

    let scoreB =
      this.sideB.refinement * 1.8 +
      (this.sideB.ceOutputPct / 100) * 35 +
      domB.metrics.clashResilience * 0.5;

    let shellIntegrityA = 100;
    let shellIntegrityB = 100;

    // Open-Barrier vs Closed-Barrier interaction (Shinjuku Gojo vs Sukuna mechanics!)
    if (domB.isOpenBarrier && !domA.isOpenBarrier) {
      if (this.sideA.shellCondition === 'standard') {
        scoreB += 28;
        shellIntegrityA = 42;
      } else if (this.sideA.shellCondition === 'inverted') {
        scoreA += 8;
        shellIntegrityA = 78;
      } else if (this.sideA.shellCondition === 'compressed') {
        scoreA += 22; // Basketball-sized barrier withstands 3 minutes of Malevolent Shrine
        shellIntegrityA = 94;
      }
    }

    if (domA.isOpenBarrier && !domB.isOpenBarrier) {
      if (this.sideB.shellCondition === 'standard') {
        scoreA += 28;
        shellIntegrityB = 42;
      } else if (this.sideB.shellCondition === 'inverted') {
        scoreB += 8;
        shellIntegrityB = 78;
      } else if (this.sideB.shellCondition === 'compressed') {
        scoreB += 22;
        shellIntegrityB = 94;
      }
    }

    // Non-lethal rule domain speed/tug-of-war bonus (Hakari's Idle Death Gamble)
    if (this.sideA.domainId === 'idle-death-gamble') scoreA += 14;
    if (this.sideB.domainId === 'idle-death-gamble') scoreB += 14;

    // Anti-domain counter mitigation
    if (this.sideA.antiDomainCounter !== 'none') scoreA += 10;
    if (this.sideB.antiDomainCounter !== 'none') scoreB += 10;

    const diff = scoreA - scoreB;
    const dominanceA = Math.max(0.08, Math.min(0.92, 0.5 + diff / 180));
    this.targetBoundary = dominanceA;

    let sureHitStatus = 'MUTUAL CANCELLATION INSIDE OVERLAP';
    let tacticalVerdict = '';
    let winnerId: DomainId | 'equilibrium' = 'equilibrium';

    if (Math.abs(dominanceA - 0.5) <= 0.06) {
      sureHitStatus = 'SURE-HIT COMMANDS LOCKED IN DEADLOCK (0% LETHAL HIT)';
      if (domB.isOpenBarrier && !domA.isOpenBarrier && this.sideA.shellCondition === 'compressed') {
        tacticalVerdict = `${domA.nameEn} matches ${domB.nameEn}'s interior refinement while basketball-compression resists outside slashes for 3m 00s.`;
      } else {
        tacticalVerdict = `Evenly matched barrier refinement! Both guaranteed-hit protocols cancel out until one sorcerer takes physical damage.`;
      }
    } else if (dominanceA > 0.56) {
      winnerId = this.sideA.domainId;
      sureHitStatus = `${domA.nameEn.toUpperCase()} OVERWHELMS OPPOSING BARRIER`;
      tacticalVerdict = `${domA.sorcererEn}'s ${domA.nameEn} (${(dominanceA * 100).toFixed(0)}% dominance) crushes ${domB.nameEn}'s shell and engages its guaranteed-hit rule!`;
      shellIntegrityB = Math.max(0, Math.round((1 - dominanceA) * 140));
    } else {
      winnerId = this.sideB.domainId;
      sureHitStatus = `${domB.nameEn.toUpperCase()} OVERWHELMS OPPOSING BARRIER`;
      tacticalVerdict = `${domB.sorcererEn}'s ${domB.nameEn} (${((1 - dominanceA) * 100).toFixed(0)}% dominance) shatters ${domA.nameEn}'s barrier and enforces its sure-hit!`;
      shellIntegrityA = Math.max(0, Math.round(dominanceA * 140));
    }

    return {
      dominanceA,
      shellIntegrityA,
      shellIntegrityB,
      sureHitStatus,
      tacticalVerdict,
      winnerId
    };
  }

  public render() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    if (width === 0 || height === 0) return;

    const ctx = this.ctx;
    this.currentBoundary += (this.targetBoundary - this.currentBoundary) * 0.1;
    if (this.clashShockwave > 0.01) {
      this.clashShockwave *= 0.92;
    }

    const domA = DOMAINS[this.sideA.domainId];
    const domB = DOMAINS[this.sideB.domainId];
    const imgA = this.mainRenderer.getDomainFrameImage(this.sideA.domainId, 4);
    const imgB = this.mainRenderer.getDomainFrameImage(this.sideB.domainId, 4);

    const time = performance.now() * 0.001;
    const splitX = width * this.currentBoundary;

    ctx.save();
    ctx.fillStyle = '#05060b';
    ctx.fillRect(0, 0, width, height);

    // Build jagged lightning fault-line polygon between Domain A and Domain B
    const faultPoints: Array<[number, number]> = [];
    const segments = 18;
    for (let i = 0; i <= segments; i++) {
      const y = (i / segments) * height;
      const wave =
        Math.sin(i * 0.9 + time * 8) * (10 + this.clashShockwave * 18) +
        Math.cos(i * 2.3 - time * 13) * 6;
      const x = splitX + (i === 0 || i === segments ? wave * 0.3 : wave);
      faultPoints.push([x, y]);
    }

    // 1. Draw Left Domain A clipped to left of fault line
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const [fx, fy] of faultPoints) ctx.lineTo(fx, fy);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.clip();

    if (imgA && imgA.complete && imgA.naturalWidth > 0) {
      const zoomA = 1.08 + Math.sin(time * 1.5) * 0.03;
      this.drawCoverImage(ctx, imgA, width, height, -width * 0.12, 0, zoomA);
    }
    const gradA = ctx.createLinearGradient(0, 0, splitX, 0);
    gradA.addColorStop(0, 'rgba(0,0,0,0.2)');
    gradA.addColorStop(1, domA.primaryColor + '44');
    ctx.fillStyle = gradA;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 2. Draw Right Domain B clipped to right of fault line
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(width, 0);
    for (let i = 0; i < faultPoints.length; i++) {
      ctx.lineTo(faultPoints[i][0], faultPoints[i][1]);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.clip();

    if (imgB && imgB.complete && imgB.naturalWidth > 0) {
      const zoomB = 1.08 + Math.cos(time * 1.5) * 0.03;
      this.drawCoverImage(ctx, imgB, width, height, width * 0.12, 0, zoomB);
    }
    const gradB = ctx.createLinearGradient(width, 0, splitX, 0);
    gradB.addColorStop(0, 'rgba(0,0,0,0.2)');
    gradB.addColorStop(1, domB.primaryColor + '44');
    ctx.fillStyle = gradB;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 3. Draw Crackling Clash Fault Line & Colliding Cursed Energy Sparks
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < faultPoints.length; i++) {
      const [fx, fy] = faultPoints[i];
      if (i === 0) ctx.moveTo(fx, fy);
      else ctx.lineTo(fx, fy);
    }
    ctx.strokeStyle = domA.primaryColor;
    ctx.lineWidth = 8 + this.clashShockwave * 6;
    ctx.shadowColor = domA.primaryColor;
    ctx.shadowBlur = 22;
    ctx.stroke();

    ctx.strokeStyle = domB.primaryColor;
    ctx.lineWidth = 5 + this.clashShockwave * 4;
    ctx.shadowColor = domB.primaryColor;
    ctx.shadowBlur = 18;
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Central Clash Nexus Orb
    const midPt = faultPoints[Math.floor(faultPoints.length / 2)];
    const orbR = 26 + Math.sin(time * 10) * 5 + this.clashShockwave * 24;
    const orbGrad = ctx.createRadialGradient(midPt[0], midPt[1], 2, midPt[0], midPt[1], orbR * 2.2);
    orbGrad.addColorStop(0, '#ffffff');
    orbGrad.addColorStop(0.35, domA.primaryColor);
    orbGrad.addColorStop(0.7, domB.primaryColor);
    orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(midPt[0], midPt[1], orbR * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. HUD Labels on Arena Canvas
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 12, 0.78)';
    ctx.fillRect(16, 16, 230, 54);
    ctx.strokeStyle = domA.primaryColor;
    ctx.strokeRect(16, 16, 230, 54);
    ctx.fillStyle = domA.primaryColor;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${domA.nameJa} // ${domA.nameEn.toUpperCase()}`, 26, 36);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px monospace';
    ctx.fillText(`DOMINANCE: ${(this.currentBoundary * 100).toFixed(1)}%`, 26, 56);

    ctx.fillStyle = 'rgba(4, 6, 12, 0.78)';
    ctx.fillRect(width - 246, 16, 230, 54);
    ctx.strokeStyle = domB.primaryColor;
    ctx.strokeRect(width - 246, 16, 230, 54);
    ctx.fillStyle = domB.primaryColor;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${domB.nameJa} // ${domB.nameEn.toUpperCase()}`, width - 236, 36);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px monospace';
    ctx.fillText(`DOMINANCE: ${((1 - this.currentBoundary) * 100).toFixed(1)}%`, width - 236, 56);
    ctx.restore();

    ctx.restore();
  }

  private drawCoverImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
    offsetX: number,
    offsetY: number,
    scale: number
  ) {
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = w / h;
    let rw = w;
    let rh = h;
    if (canvasAspect > imgAspect) {
      rw = w;
      rh = w / imgAspect;
    } else {
      rh = h;
      rw = h * imgAspect;
    }
    ctx.save();
    ctx.translate(w / 2 + offsetX, h / 2 + offsetY);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -rw / 2, -rh / 2, rw, rh);
    ctx.restore();
  }
}
