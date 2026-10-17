import React from 'react';
import { Audio, interpolate, Sequence, staticFile } from 'remotion';
import { FPS } from './lib/data';
import type { Cue } from './timeline';

/** Mastered stems in public/audio with their lengths in seconds (cues for missing files are skipped). */
const STEMS: Record<string, number> = {
  'music-trailer.mp3': 30,
  'music-demo.mp3': 60,
  'sfx-heartbeat.mp3': 2.48,
  'sfx-shatter.mp3': 1.76,
  'sfx-impact.mp3': 3,
  'sfx-whoosh.mp3': 1,
  'sfx-riser.mp3': 2.56,
  'sfx-black-flash.mp3': 1.48,
  'vo-chant-trailer.mp3': 3.35,
  'vo-chant-demo.mp3': 5.32,
  'vo-ryoiki-tenkai.mp3': 2.56,
  'vo-name-0.mp3': 1.32,
  'vo-name-1.mp3': 1.25,
  'vo-name-2.mp3': 1.75,
  'vo-name-3.mp3': 1.35,
  'vo-name-4.mp3': 1.25,
  'vo-name-5.mp3': 1.62
};

const DUCK_TO = 0.45;
const DUCK_RAMP = 6;

/** Music volume multiplier at an absolute frame: dips under any narrator line. */
function duckAt(frame: number, voice: Cue[]) {
  let level = 1;
  for (const v of voice) {
    const end = v.at + Math.round((STEMS[v.file] ?? 0) * FPS);
    const k = interpolate(frame, [v.at - DUCK_RAMP, v.at, end, end + DUCK_RAMP * 2], [1, DUCK_TO, DUCK_TO, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    });
    level = Math.min(level, k);
  }
  return level;
}

export const Soundtrack: React.FC<{ cues: Cue[] }> = ({ cues }) => {
  const present = cues.filter((c) => c.file in STEMS);
  const voice = present.filter((c) => c.file.startsWith('vo-'));
  return (
    <>
      {present.map((c, i) => {
        const base = c.volume ?? 1;
        const isMusic = c.file.startsWith('music-');
        return (
          <Sequence key={`${c.file}-${i}`} from={c.at} durationInFrames={Math.ceil(STEMS[c.file] * FPS) + 1} layout="none">
            <Audio
              src={staticFile(`audio/${c.file}`)}
              startFrom={c.startFrom}
              volume={isMusic ? (f) => base * duckAt(c.at + f, voice) : base}
            />
          </Sequence>
        );
      })}
    </>
  );
};
