/**
 * Frame-exact timing (30 fps) for both cuts. The visuals are built from these numbers and the
 * soundtrack cue sheet below is generated against them, so cuts and hits always line up.
 */

// Veil breaks sit on the scores' measured impact hits: 3.78 s (trailer) and 5.30 s (demo).
export const TRAILER = {
  duration: 900, // 30 s
  chant: { from: 0, to: 113 },
  veilBreak: 113,
  title: { from: 113, to: 168 },
  domains: { from: 168, each: 90, painted: 36 },
  montage: { from: 708, to: 810 },
  strobeAt: 790,
  end: { from: 810, to: 900 }
} as const;

export const DEMO = {
  duration: 1800, // 60 s
  chant: { from: 0, to: 159 },
  veilBreak: 159,
  title: { from: 159, to: 270 },
  map: { from: 270, to: 690 },
  realms: { from: 690, to: 1290 },
  effects: { from: 1290, to: 1530 },
  end: { from: 1530, to: 1800 }
} as const;

export interface Cue {
  file: string;
  at: number;
  volume?: number;
  /** Trim in frames from the start of the file. */
  startFrom?: number;
}

const domainCut = (d: number) => TRAILER.domains.from + d * TRAILER.domains.each;

export const TRAILER_CUES: Cue[] = [
  { file: 'music-trailer.mp3', at: 0, volume: 0.85 },
  { file: 'sfx-heartbeat.mp3', at: 0, volume: 0.9 },
  { file: 'vo-chant-trailer.mp3', at: 6, volume: 1 },
  { file: 'sfx-shatter.mp3', at: TRAILER.veilBreak - 4, volume: 0.9 },
  { file: 'sfx-impact.mp3', at: TRAILER.veilBreak, volume: 1 },
  { file: 'vo-ryoiki-tenkai.mp3', at: TRAILER.veilBreak + 6, volume: 1 },
  ...[1, 2, 3, 4, 5].map((d) => ({ file: 'sfx-whoosh.mp3', at: domainCut(d) - 8, volume: 0.6 })),
  ...[0, 1, 2, 3, 4, 5].map((d) => ({ file: `vo-name-${d}.mp3`, at: domainCut(d) + 8, volume: 0.95 })),
  // Riser lands exactly on the Black Flash
  { file: 'sfx-riser.mp3', at: TRAILER.strobeAt - 77, volume: 0.7 },
  { file: 'sfx-black-flash.mp3', at: TRAILER.strobeAt, volume: 1 },
  { file: 'sfx-impact.mp3', at: TRAILER.end.from, volume: 1 }
];

export const DEMO_CUES: Cue[] = [
  { file: 'music-demo.mp3', at: 0, volume: 0.8 },
  { file: 'sfx-heartbeat.mp3', at: 0, volume: 0.9 },
  { file: 'sfx-heartbeat.mp3', at: 75, volume: 0.6 },
  { file: 'vo-chant-demo.mp3', at: 0, volume: 1 },
  { file: 'sfx-shatter.mp3', at: DEMO.veilBreak - 4, volume: 0.9 },
  { file: 'sfx-impact.mp3', at: DEMO.veilBreak, volume: 1 },
  { file: 'vo-ryoiki-tenkai.mp3', at: DEMO.veilBreak + 6, volume: 1 },
  { file: 'sfx-whoosh.mp3', at: DEMO.map.from - 6, volume: 0.6 },
  { file: 'sfx-whoosh.mp3', at: DEMO.realms.from - 6, volume: 0.6 },
  { file: 'sfx-whoosh.mp3', at: DEMO.effects.from - 6, volume: 0.6 },
  { file: 'sfx-impact.mp3', at: DEMO.effects.from + 90, volume: 0.9 },
  { file: 'sfx-black-flash.mp3', at: DEMO.effects.from + 150, volume: 1 },
  { file: 'sfx-impact.mp3', at: DEMO.end.from, volume: 1 }
];
