import type { Particle, SlashCut, DomainId } from '../types';

interface TunnelRing {
  z: number;
  rot: number;
  vRot: number;
  sides: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private slashes: SlashCut[] = [];
  private tunnelRings: TunnelRing[] = [];
  private maxParticles = 220;

  constructor() {
    // Initialize 3D perspective tunnel rings distributed from z=60 to z=1000
    for (let i = 0; i < 14; i++) {
      this.tunnelRings.push({
        z: 60 + (i / 14) * 940,
        rot: (i * Math.PI) / 7,
        vRot: (i % 2 === 0 ? 1 : -1) * 0.008,
        sides: i % 3 === 0 ? 6 : i % 2 === 0 ? 8 : 12
      });
    }
  }

  public setMaxParticles(max: number) {
    this.maxParticles = Math.max(30, Math.min(450, max));
  }

  public getActiveCount(): number {
    return this.particles.length + this.slashes.length;
  }

  public update(
    width: number,
    height: number,
    domainId: DomainId,
    progress: number,
    scrollVelocity: number,
    isBlackFlash: boolean,
    overdrive120: boolean
  ) {
    // 1. Update 3D Z-Tunnel rings driven by scroll velocity + ambient forward drift
    const zSpeed = 2.8 + scrollVelocity * 1800 + (overdrive120 ? 3.5 : 0);
    for (const ring of this.tunnelRings) {
      ring.z -= zSpeed;
      ring.rot += ring.vRot + scrollVelocity * 1.5;
      if (ring.z < 40) {
        ring.z += 960;
      } else if (ring.z > 1000) {
        ring.z -= 960;
      }
    }

    // 2. Spawn particles based on domain & energy level
    const spawnRate = Math.floor(3 + progress * 6 + (overdrive120 ? 4 : 0));
    for (let i = 0; i < spawnRate; i++) {
      if (this.particles.length < this.maxParticles) {
        this.spawnParticle(width, height, domainId, progress, isBlackFlash, overdrive120);
      }
    }

    // 3. Domain-specific slashes (Malevolent Shrine & Authentic Mutual Love)
    if (
      (domainId === 'malevolent-shrine' || domainId === 'authentic-mutual-love') &&
      progress > 0.45 &&
      Math.random() < 0.22 + progress * 0.45
    ) {
      this.spawnSlash(
        width,
        height,
        domainId === 'malevolent-shrine' ? '#ff1744' : '#ffd166'
      );
    }

    // 4. Update existing particles (including 3D perspective z-motion)
    const cx = width * 0.5;
    const cy = height * 0.5;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.z -= (p.vz + scrollVelocity * 1400);
      if (p.z < 20) p.z = 980;
      if (p.z > 1000) p.z = 40;

      // Subtle radial camera pull when scrolling fast
      if (Math.abs(scrollVelocity) > 0.0005) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        p.x += dx * scrollVelocity * 4.5;
        p.y += dy * scrollVelocity * 4.5;
      }

      p.life++;
      if (p.rotation !== undefined && p.vRot !== undefined) {
        p.rotation += p.vRot;
      }

      p.vx *= 0.985;
      p.vy *= 0.985;

      if (p.type === 'smoke' || p.type === 'shadow') {
        p.size += 0.25;
      }

      if (
        p.life >= p.maxLife ||
        p.x < -80 ||
        p.x > width + 80 ||
        p.y < -80 ||
        p.y > height + 80
      ) {
        this.particles.splice(i, 1);
      }
    }

    // 5. Update slashes
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.life++;
      if (s.life >= s.maxLife) {
        this.slashes.splice(i, 1);
      }
    }
  }

  public drawZTunnel(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    primaryColor: string,
    secondaryColor: string,
    progress: number,
    scrollVelocity: number,
    focalX: number,
    focalY: number
  ) {
    ctx.save();
    const cx = width * focalX;
    const cy = height * focalY;
    const fov = Math.min(width, height) * 0.65;

    // 1. Speed lines radiating from focal vanishing point during scroll travel
    const velMag = Math.min(1, Math.abs(scrollVelocity) * 65);
    const baseSpeedAlpha = 0.08 + velMag * 0.45 + Math.sin(progress * Math.PI) * 0.08;
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.2;

    const rays = 24;
    for (let i = 0; i < rays; i++) {
      const ang = (i / rays) * Math.PI * 2 + progress * 1.4;
      const rInner = 60 + ((i * 37) % 90);
      const rOuter = rInner + 90 + velMag * 260;
      ctx.globalAlpha = baseSpeedAlpha * (i % 2 === 0 ? 0.9 : 0.45);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * rInner, cy + Math.sin(ang) * rInner);
      ctx.lineTo(cx + Math.cos(ang) * rOuter, cy + Math.sin(ang) * rOuter);
      ctx.stroke();
    }

    // 2. 3D Perspective Sacred Geometry Tunnel Rings flying past the camera
    for (const ring of this.tunnelRings) {
      const scale = fov / Math.max(40, ring.z);
      const radius = 140 * scale;
      if (radius > Math.max(width, height) * 1.1 || radius < 14) continue;

      const depthAlpha = Math.min(1, (1000 - ring.z) / 500) * Math.min(1, (ring.z - 40) / 140);
      ctx.globalAlpha = depthAlpha * (0.16 + velMag * 0.25);
      ctx.strokeStyle = ring.sides % 4 === 0 ? primaryColor : secondaryColor;
      ctx.lineWidth = Math.max(1, 1.8 * scale * 0.4);

      ctx.beginPath();
      for (let s = 0; s <= ring.sides; s++) {
        const a = ring.rot + (s / ring.sides) * Math.PI * 2;
        const px = cx + Math.cos(a) * radius;
        const py = cy + Math.sin(a) * radius;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    domainId: DomainId,
    progress: number
  ) {
    ctx.save();

    // 1. Draw Slashes
    for (const s of this.slashes) {
      const slashAlpha = (1 - s.life / s.maxLife) * s.alpha;
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = slashAlpha;
      ctx.lineWidth = s.width;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = slashAlpha * 0.85;
      ctx.lineWidth = Math.max(1, s.width * 0.32);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 2. Draw Particles
    for (const p of this.particles) {
      const lifeRatio = 1 - p.life / p.maxLife;
      const alpha = p.alpha * lifeRatio;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      if (p.type === 'talisman') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = '#f8f5e6';
        ctx.fillRect(-p.size * 0.55, -p.size * 1.35, p.size * 1.1, p.size * 2.7);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-p.size * 0.28, -p.size * 0.8, p.size * 0.56, p.size * 1.6);
      } else if (p.type === 'katana') {
        // Floating 3D katana silhouette for Yuta's Authentic Mutual Love
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.strokeStyle = '#f8fafc';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 2.2);
        ctx.lineTo(0, p.size * 1.4);
        ctx.stroke();
        // Tsuba guard
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-p.size * 0.45, p.size * 0.7);
        ctx.lineTo(p.size * 0.45, p.size * 0.7);
        ctx.stroke();
      } else if (p.type === 'coin') {
        // Pachinko token / neon orb for Hakari's Idle Death Gamble
        ctx.translate(p.x, p.y);
        ctx.strokeStyle = p.color;
        ctx.fillStyle = '#ffbe0b';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'suture') {
        // Soul stitch suture cross for Mahito
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.moveTo(-p.size * 0.4, -p.size * 0.45);
        ctx.lineTo(-p.size * 0.4, p.size * 0.45);
        ctx.moveTo(p.size * 0.4, -p.size * 0.45);
        ctx.lineTo(p.size * 0.4, p.size * 0.45);
        ctx.stroke();
      } else if (p.type === 'lightning') {
        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        let lx = p.x;
        let ly = p.y;
        for (let s = 0; s < 3; s++) {
          lx += (Math.random() - 0.5) * 32;
          ly += (Math.random() - 0.5) * 32;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      } else if (p.type === 'shadow') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.type === 'spark' ? 12 : 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 3. Domain-Specific Ambient Geometry Overlays
    const time = performance.now() * 0.001;
    if (domainId === 'infinite-void' && progress > 0.35) {
      const ringAlpha = Math.min(0.65, (progress - 0.35) * 1.1);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.strokeStyle = `rgba(0, 240, 255, ${ringAlpha * 0.42})`;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
      const baseRadius = Math.min(width, height) * 0.26;
      for (let r = 0; r < 3; r++) {
        ctx.beginPath();
        const rad = baseRadius + r * 58 + Math.sin(time + r) * 12;
        ctx.ellipse(0, 0, rad, rad * 0.44, time * 0.28 + r * (Math.PI / 3), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    } else if (domainId === 'idle-death-gamble' && progress > 0.35) {
      // Fever Jackpot probability rings
      const ringAlpha = Math.min(0.65, (progress - 0.35) * 1.1);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.strokeStyle = `rgba(0, 255, 136, ${ringAlpha * 0.45})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(width, height) * 0.34, time * 0.8, time * 0.8 + Math.PI * 1.8);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 190, 11, ${ringAlpha * 0.45})`;
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(width, height) * 0.28, -time * 1.1, -time * 1.1 + Math.PI * 1.6);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  public triggerBlackFlashBurst(width: number, height: number) {
    const cx = width / 2;
    const cy = height / 2;
    for (let i = 0; i < 95; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 24;
      this.particles.push({
        x: cx,
        y: cy,
        z: 200 + Math.random() * 600,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 8,
        size: 3 + Math.random() * 5,
        alpha: 1,
        life: 0,
        maxLife: 28 + Math.random() * 35,
        color: Math.random() > 0.3 ? '#0a0a0a' : '#ff0033',
        type: Math.random() > 0.38 ? 'lightning' : 'spark'
      });
    }
    for (let s = 0; s < 7; s++) {
      this.spawnSlash(width, height, '#ff0033');
    }
  }

  private spawnParticle(
    width: number,
    height: number,
    domainId: DomainId,
    progress: number,
    isBlackFlash: boolean,
    overdrive120: boolean
  ) {
    if (isBlackFlash) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 900 + 50,
        vx: (Math.random() - 0.5) * 9,
        vy: (Math.random() - 0.5) * 9,
        vz: 6,
        size: 2 + Math.random() * 4,
        alpha: 0.92,
        life: 0,
        maxLife: 30,
        color: Math.random() > 0.4 ? '#ff0033' : '#050505',
        type: 'lightning'
      });
      return;
    }

    if (progress < 0.2) {
      const isTalisman = Math.random() < 0.18;
      this.particles.push({
        x: Math.random() * width,
        y: height + 20,
        z: Math.random() * 900 + 80,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(1.2 + Math.random() * 2.5),
        vz: 3,
        size: isTalisman ? 11 + Math.random() * 9 : 2 + Math.random() * 3,
        alpha: isTalisman ? 0.68 : 0.45,
        life: 0,
        maxLife: 130 + Math.random() * 70,
        color: overdrive120 ? '#ffbe0b' : '#ffffff',
        type: isTalisman ? 'talisman' : 'spark',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.04
      });
      return;
    }

    if (domainId === 'infinite-void') {
      const isLightning = Math.random() < 0.35;
      this.particles.push({
        x: width * 0.5 + (Math.random() - 0.5) * width * 0.85,
        y: height * 0.5 + (Math.random() - 0.5) * height * 0.85,
        z: Math.random() * 900 + 60,
        vx: (Math.random() - 0.5) * (3 + progress * 6),
        vy: (Math.random() - 0.5) * (3 + progress * 6),
        vz: 5,
        size: isLightning ? 2.4 : 2 + Math.random() * 3.8,
        alpha: 0.85,
        life: 0,
        maxLife: 42 + Math.random() * 40,
        color: Math.random() > 0.4 ? '#00f0ff' : '#9945ff',
        type: isLightning ? 'lightning' : 'spark'
      });
    } else if (domainId === 'malevolent-shrine') {
      const isSmoke = Math.random() < 0.25;
      this.particles.push({
        x: Math.random() * width,
        y: height * 0.55 + Math.random() * height * 0.45,
        z: Math.random() * 900 + 60,
        vx: (Math.random() - 0.5) * (2 + progress * 5),
        vy: -(2 + Math.random() * 5),
        vz: 5,
        size: isSmoke ? 10 + Math.random() * 14 : 2 + Math.random() * 4,
        alpha: isSmoke ? 0.38 : 0.85,
        life: 0,
        maxLife: 50 + Math.random() * 40,
        color: Math.random() > 0.35 ? '#ff1744' : '#ff9100',
        type: isSmoke ? 'smoke' : 'spark'
      });
    } else if (domainId === 'chimera-shadow') {
      const isShadow = Math.random() < 0.38;
      this.particles.push({
        x: Math.random() * width,
        y: height * 0.65 + Math.random() * height * 0.35,
        z: Math.random() * 900 + 60,
        vx: (Math.random() - 0.5) * 3,
        vy: -(1.5 + Math.random() * 4),
        vz: 4,
        size: isShadow ? 8 + Math.random() * 18 : 2 + Math.random() * 3,
        alpha: isShadow ? 0.62 : 0.85,
        life: 0,
        maxLife: 60 + Math.random() * 50,
        color: isShadow ? '#020617' : '#00e5ff',
        type: isShadow ? 'shadow' : 'spark'
      });
    } else if (domainId === 'authentic-mutual-love') {
      const isKatana = Math.random() < 0.22;
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 900 + 60,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -(1.0 + Math.random() * 2.5),
        vz: 4.5,
        size: isKatana ? 10 + Math.random() * 8 : 2 + Math.random() * 3.5,
        alpha: 0.85,
        life: 0,
        maxLife: 65 + Math.random() * 45,
        color: Math.random() > 0.45 ? '#ff2a85' : '#ffd166',
        type: isKatana ? 'katana' : 'spark',
        rotation: (Math.random() - 0.5) * 0.5,
        vRot: (Math.random() - 0.5) * 0.015
      });
    } else if (domainId === 'idle-death-gamble') {
      const isCoin = Math.random() < 0.25;
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 900 + 60,
        vx: (Math.random() - 0.5) * 4.5,
        vy: (Math.random() - 0.5) * 4.5,
        vz: 6,
        size: isCoin ? 5 + Math.random() * 5 : 2 + Math.random() * 3.5,
        alpha: 0.9,
        life: 0,
        maxLife: 50 + Math.random() * 40,
        color: Math.random() > 0.5 ? '#00ff88' : Math.random() > 0.4 ? '#ffbe0b' : '#ff007f',
        type: isCoin ? 'coin' : 'spark'
      });
    } else {
      // Self-Embodiment of Perfection
      const isSuture = Math.random() < 0.28;
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 900 + 60,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        vz: 4,
        size: isSuture ? 8 + Math.random() * 8 : 2 + Math.random() * 3.5,
        alpha: 0.82,
        life: 0,
        maxLife: 55 + Math.random() * 45,
        color: Math.random() > 0.4 ? '#a855f7' : '#38bdf8',
        type: isSuture ? 'suture' : 'spark',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.03
      });
    }
  }

  private spawnSlash(width: number, height: number, color: string) {
    const angle = Math.random() * Math.PI;
    const length = 220 + Math.random() * (Math.max(width, height) * 0.72);
    const cx = width * (0.15 + Math.random() * 0.7);
    const cy = height * (0.15 + Math.random() * 0.7);

    const dx = Math.cos(angle) * (length / 2);
    const dy = Math.sin(angle) * (length / 2);

    this.slashes.push({
      x1: cx - dx,
      y1: cy - dy,
      x2: cx + dx,
      y2: cy + dy,
      alpha: 1,
      width: 2 + Math.random() * 4,
      life: 0,
      maxLife: 12 + Math.floor(Math.random() * 8),
      color
    });
  }
}
