export type DomainId =
  | 'infinite-void'
  | 'malevolent-shrine'
  | 'chimera-shadow'
  | 'authentic-mutual-love'
  | 'idle-death-gamble'
  | 'self-embodiment-of-perfection';

export type CameraTransitionMode = 'world-map' | 'world-3d' | 'portal-tunnel' | 'cinematic-morph' | 'split-debug';

export interface KeyframeSpec {
  index: number;
  src: string;
  focalX: number; // Normalized 0..1 focal vanishing center X
  focalY: number; // Normalized 0..1 focal vanishing center Y
  labelJa: string;
  labelEn: string;
  cameraZ: string;
}

export interface DomainPhase {
  id: string;
  nameJa: string;
  nameRomaji: string;
  nameEn: string;
  frameStart: number;
  frameEnd: number;
  subtitle: string;
  incantation: string;
  description: string;
  telemetryLabel: string;
  telemetryValue: string;
}

export interface CombatMetrics {
  refinement: number;      // 0..100 Barrier Refinement
  lethality: number;       // 0..100 Sure-Hit Lethality
  efficiency: number;      // 0..100 Cursed Energy Efficiency
  activationSpeed: number; // 0..100 Expansion Speed (0.2s capability)
  rangeScore: number;      // 0..100 Effective Radius
  clashResilience: number; // 0..100 Tug-of-War Stability
}

export interface ChantStep {
  ja: string;
  romaji: string;
  en: string;
}

export interface DomainData {
  id: DomainId;
  nameJa: string;
  nameRomaji: string;
  nameEn: string;
  sorcererJa: string;
  sorcererEn: string;
  image: string;
  frames: KeyframeSpec[];
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgGlow: string;
  mudraNameJa: string;
  mudraNameEn: string;
  mudraDeity: string;
  mudraDescription: string;
  barrierType: string;
  isOpenBarrier: boolean;
  barrierRadius: string;
  sureHitRule: string;
  cursedEnergyOutput: string;
  baseCeNumeric: number;
  grade: string;
  bindingVows: string[];
  metrics: CombatMetrics;
  chants: ChantStep[];
  phases: DomainPhase[];
}

export interface Particle {
  x: number;
  y: number;
  z: number; // 3D tunnel depth (1..1000)
  vx: number;
  vy: number;
  vz: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'spark' | 'smoke' | 'talisman' | 'shard' | 'lightning' | 'blood' | 'shadow' | 'katana' | 'coin' | 'suture';
  rotation?: number;
  vRot?: number;
}

export interface SlashCut {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  width: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface RenderPipelineConfig {
  mode: CameraTransitionMode;
  enablePortalStack: boolean;
  enableZTunnel: boolean;
  enableWireframe: boolean;
  enableChromatic: boolean;
  enableParticles: boolean;
  lerpFactor: number;
  zoomIntensity: number;
  maxParticles: number;
  overdrive120: boolean;
  enablePointerParallax: boolean;
  enableImpactFrames: boolean;
  reducedMotion: boolean;
}
