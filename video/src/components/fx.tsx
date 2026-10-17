import React from 'react';
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { MONO, SANS, SERIF } from '../lib/fonts';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Layout unit: 1 = 1px on the short side of a 1080p frame, so both aspect ratios scale together. */
export function useUnit() {
  const { width, height } = useVideoConfig();
  return { u: Math.min(width, height) / 1080, vertical: height > width, width, height };
}

// ─── Atmosphere ──────────────────────────────────────────────────────────────

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.85 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(2,2,6,${strength}) 100%)`
    }}
  />
);

/** Full-frame flash that decays over `length` frames. */
export const Flash: React.FC<{ color?: string; length?: number }> = ({ color = '#ffffff', length = 10 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, length], [1, 0], { ...clamp, easing: Easing.out(Easing.quad) });
  return <AbsoluteFill style={{ backgroundColor: color, opacity, pointerEvents: 'none' }} />;
};

// ─── Manga impact frame (集中線) ───────────────────────────────────────────

const FocusLines: React.FC<{ seed: string; color: string; density?: number }> = ({ seed, color, density = 110 }) => {
  const { width, height } = useVideoConfig();
  const cx = width / 2;
  const cy = height / 2;
  const reach = Math.hypot(width, height);
  const minDim = Math.min(width, height);
  let d = '';
  for (let i = 0; i < density; i++) {
    const angle = random(`${seed}-a-${i}`) * Math.PI * 2;
    const w = 0.004 + random(`${seed}-w-${i}`) * 0.014;
    const inner = minDim * (0.2 + random(`${seed}-d-${i}`) * 0.3);
    d += `M${cx + Math.cos(angle) * inner},${cy + Math.sin(angle) * inner}`;
    d += `L${cx + Math.cos(angle - w) * reach},${cy + Math.sin(angle - w) * reach}`;
    d += `L${cx + Math.cos(angle + w) * reach},${cy + Math.sin(angle + w) * reach}Z`;
  }
  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
      <path d={d} fill={color} />
    </svg>
  );
};

/**
 * Inverted-monochrome impact frames with focus lines, flickering inverted / tinted like the site's
 * domain-change effect. Uses backdrop-filter so it treats whatever is rendered underneath.
 */
export const ImpactFrame: React.FC<{ length?: number; tint?: string; seed?: string }> = ({ length = 8, tint = '#ffffff', seed = 'impact' }) => {
  const frame = useCurrentFrame();
  if (frame >= length) return null;
  const inverted = frame % 3 !== 1;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill
        style={{
          backdropFilter: inverted ? 'grayscale(1) invert(1) contrast(1.35)' : 'grayscale(1) contrast(1.6) brightness(1.1)'
        }}
      />
      {!inverted && <AbsoluteFill style={{ backgroundColor: tint, mixBlendMode: 'color', opacity: 0.85 }} />}
      <FocusLines seed={`${seed}-${Math.floor(frame / 2)}`} color={inverted ? '#000' : '#fff'} />
    </AbsoluteFill>
  );
};

/** 黒閃 Black Flash: a two-frame inversion with a crimson burst and black lightning. */
export const BlackFlash: React.FC<{ seed?: string }> = ({ seed = 'kokusen' }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (frame > 5) return null;
  const cx = width / 2;
  const cy = height / 2;
  // Jagged bolts cracking outward from the point of impact
  const reach = Math.hypot(width, height) * 0.55;
  const bolts = Array.from({ length: 9 }, (_, i) => {
    const angle = (i / 9) * Math.PI * 2 + random(`${seed}-a-${i}`) * 0.5;
    let d = `M${cx},${cy}`;
    for (let s = 1; s <= 7; s++) {
      const r = (s / 7) * reach * (0.6 + random(`${seed}-r-${i}`) * 0.4);
      const a = angle + (random(`${seed}-j-${i}-${s}`) - 0.5) * 0.45;
      d += `L${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
    }
    return d;
  });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {frame < 3 && <AbsoluteFill style={{ backdropFilter: 'invert(1) saturate(2.4)' }} />}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle, rgba(255,0,51,0.6) 0%, rgba(0,0,0,0.9) 75%)',
          mixBlendMode: 'hard-light',
          opacity: interpolate(frame, [0, 5], [1, 0], clamp)
        }}
      />
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        {bolts.map((d, i) => (
          <path key={i} d={d} stroke="#050505" strokeWidth={6} fill="none" style={{ filter: 'drop-shadow(0 0 14px #ff0033)' }} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/** Seeded screen shake for a few frames after an impact. */
export function useShake(start: number, length: number, magnitude: number) {
  const frame = useCurrentFrame();
  const t = frame - start;
  if (t < 0 || t >= length) return 'none';
  const k = magnitude * (1 - t / length);
  return `translate(${(random(`sx${frame}`) - 0.5) * k}px, ${(random(`sy${frame}`) - 0.5) * k}px)`;
}

// ─── 帳 Veil chant (cold open) ──────────────────────────────────────────────

export interface ChantLine {
  text: string;
  /** Frames (relative to the chant) over which this phrase is spoken; its characters reveal across it. */
  from: number;
  to: number;
}

/** The veil incantation, revealed in sync with the whispered narration. */
export const Chant: React.FC<{ duration: number; lines: ChantLine[] }> = ({ duration, lines }) => {
  const frame = useCurrentFrame();
  const { u, vertical } = useUnit();
  const fill = interpolate(frame, [6, duration - 10], [0, 36], clamp);
  const ringSize = (vertical ? 420 : 380) * u;
  // Heartbeats under the chant
  const beat = (at: number) => Math.exp(-Math.pow((frame - at) / 3, 2));
  const pulse = 1 + 0.045 * (beat(4) + beat(12) + beat(79) + beat(87));

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(circle at 50% 45%, rgba(46,12,70,0.65) 0%, rgba(3,3,8,1) 62%)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 56 * u
      }}
    >
      <div style={{ position: 'relative', width: ringSize, height: ringSize, transform: `scale(${pulse})` }}>
        <svg viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, transform: `rotate(${-90 + frame * 0.4}deg)` }}>
          <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i / 36) * Math.PI * 2;
            const lit = i < fill;
            return (
              <line
                key={i}
                x1={100 + Math.cos(a) * 80}
                y1={100 + Math.sin(a) * 80}
                x2={100 + Math.cos(a) * 90}
                y2={100 + Math.sin(a) * 90}
                stroke={lit ? '#b46bff' : 'rgba(255,255,255,0.14)'}
                strokeWidth={3}
                strokeLinecap="round"
                style={lit ? { filter: 'drop-shadow(0 0 3px #a855f7)' } : undefined}
              />
            );
          })}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontFamily: SERIF,
            fontWeight: 900,
            fontSize: ringSize * 0.48,
            color: '#f5f3ff',
            textShadow: '0 0 40px rgba(168,85,247,0.7)',
            opacity: interpolate(frame, [0, 10], [0, 1], clamp)
          }}
        >
          帳
        </div>
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: (vertical ? 50 : 42) * u,
          letterSpacing: '0.22em',
          color: 'rgba(226,232,240,0.92)',
          textAlign: 'center',
          lineHeight: 1.7,
          padding: `0 ${40 * u}px`,
          display: 'flex',
          flexDirection: vertical ? 'column' : 'row',
          gap: vertical ? 0 : 40 * u,
          minHeight: 80 * u
        }}
      >
        {lines.map((line, li) => {
          const chars = Array.from(line.text);
          return (
            <span key={li}>
              {chars.map((ch, i) => {
                const at = line.from + ((line.to - line.from) * i) / chars.length;
                return (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      opacity: interpolate(frame, [at, at + 6], [0, 1], clamp),
                      filter: `blur(${interpolate(frame, [at, at + 6], [8, 0], clamp)}px)`
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── 領域展開 title slam ────────────────────────────────────────────────────

export const TitleSlam: React.FC<{ title?: string; subtitle?: string; color?: string; subtitleDelay?: number }> = ({
  title = '領域展開',
  subtitle,
  color = '#00f0ff',
  subtitleDelay = 14
}) => {
  const frame = useCurrentFrame();
  const { u, vertical } = useUnit();
  const slam = Easing.out(Easing.exp)(interpolate(frame, [0, 7], [0, 1], clamp));
  const scale = 2.8 - 1.8 * slam;
  const split = (1 - slam) * 28 * u + Math.max(0, Math.sin(frame * 1.7)) * 2 * u;
  const shake = useShake(0, 12, 26 * u);
  const size = (vertical ? 190 : 230) * u;
  const subOpacity = interpolate(frame, [subtitleDelay, subtitleDelay + 12], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', transform: shake }}>
      <div
        style={{
          fontFamily: SERIF,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: vertical ? '0.04em' : '0.14em',
          color: '#ffffff',
          transform: `scale(${scale})`,
          filter: `blur(${(1 - slam) * 16}px)`,
          textShadow: `${split}px 0 0 rgba(255,0,60,0.75), ${-split}px 0 0 rgba(0,240,255,0.75), 0 0 ${60 * u}px ${color}, 0 ${6 * u}px ${30 * u}px rgba(0,0,0,0.95)`,
          writingMode: vertical ? 'vertical-rl' : 'horizontal-tb'
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            marginTop: 36 * u,
            fontFamily: MONO,
            fontWeight: 800,
            fontSize: 26 * u,
            letterSpacing: '0.42em',
            color,
            textShadow: `0 0 ${18 * u}px ${color}`,
            opacity: subOpacity,
            textAlign: 'center',
            padding: `0 ${40 * u}px`
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Domain name card ───────────────────────────────────────────────────────

export const DomainCard: React.FC<{
  index: number;
  nameJa: string;
  romaji: string;
  nameEn: string;
  color: string;
  duration: number;
}> = ({ index, nameJa, romaji, nameEn, color, duration }) => {
  const frame = useCurrentFrame();
  const { u, vertical } = useUnit();
  const enter = Easing.out(Easing.cubic)(interpolate(frame, [0, 12], [0, 1], clamp));
  const exit = interpolate(frame, [duration - 8, duration], [1, 0], clamp);
  const chars = Array.from(nameJa);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: vertical ? 'center' : 'flex-start',
        padding: vertical ? `0 ${60 * u}px ${300 * u}px` : `0 ${120 * u}px ${110 * u}px`,
        opacity: exit
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: vertical ? 'center' : 'flex-start', gap: 10 * u }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 * u }}>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 24 * u, color, letterSpacing: '0.3em' }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span style={{ width: 120 * u * enter, height: 2 * u, background: color, boxShadow: `0 0 ${12 * u}px ${color}` }} />
          <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: 18 * u, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.35em' }}>
            領域展開
          </span>
        </div>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: (vertical ? 120 : 132) * u, lineHeight: 1.05, color: '#fff' }}>
          {chars.map((ch, i) => {
            const at = 3 + i * 2.5;
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  opacity: interpolate(frame, [at, at + 7], [0, 1], clamp),
                  transform: `translateY(${interpolate(frame, [at, at + 9], [0.4, 0], { ...clamp, easing: Easing.out(Easing.cubic) })}em)`,
                  textShadow: `0 0 ${36 * u}px ${color}, 0 ${4 * u}px ${24 * u}px rgba(0,0,0,0.95)`
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 800,
            fontSize: 24 * u,
            letterSpacing: '0.38em',
            color,
            textShadow: `0 0 ${16 * u}px ${color}`,
            opacity: interpolate(frame, [12, 22], [0, 1], clamp)
          }}
        >
          {romaji.toUpperCase()}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: 26 * u,
            color: 'rgba(226,232,240,0.85)',
            letterSpacing: '0.12em',
            opacity: interpolate(frame, [16, 26], [0, 1], clamp)
          }}
        >
          {nameEn}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Demo captions ─────────────────────────────────────────────────────────

export const Caption: React.FC<{ label?: string; text: string; duration: number; color?: string; position?: 'top' | 'bottom' }> = ({
  label,
  text,
  duration,
  color = '#00f0ff',
  position = 'top'
}) => {
  const frame = useCurrentFrame();
  const { u, vertical } = useUnit();
  const shown = Math.floor(interpolate(frame, [4, 4 + text.length * 0.9], [0, text.length], clamp));
  const opacity = interpolate(frame, [0, 6, duration - 8, duration], [0, 1, 1, 0], clamp);
  const pad = vertical ? `${200 * u}px ${60 * u}px` : `${90 * u}px ${110 * u}px`;

  return (
    <AbsoluteFill style={{ justifyContent: position === 'top' ? 'flex-start' : 'flex-end', padding: pad, opacity }}>
      <div
        style={{
          alignSelf: vertical ? 'center' : 'flex-start',
          textAlign: vertical ? 'center' : 'left',
          maxWidth: vertical ? '100%' : '62%',
          background: 'linear-gradient(90deg, rgba(5,6,11,0.72), rgba(5,6,11,0.25))',
          borderLeft: vertical ? 'none' : `${3 * u}px solid ${color}`,
          padding: `${18 * u}px ${26 * u}px`,
          backdropFilter: 'blur(8px)'
        }}
      >
        {label && (
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 20 * u, letterSpacing: '0.3em', color, marginBottom: 10 * u }}>
            {label}
          </div>
        )}
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: (vertical ? 44 : 40) * u, color: '#fff', lineHeight: 1.25 }}>
          {text.slice(0, shown)}
          <span style={{ opacity: shown < text.length ? 1 : 0, color }}>▍</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Big section header for the demo: "01 — 2D WORLD MAP". */
export const SectionCard: React.FC<{ number: string; title: string; kanji: string; color: string; duration: number }> = ({
  number,
  title,
  kanji,
  color,
  duration
}) => {
  const frame = useCurrentFrame();
  const { u } = useUnit();
  const enter = Easing.out(Easing.exp)(interpolate(frame, [0, 10], [0, 1], clamp));
  const exit = interpolate(frame, [duration - 8, duration], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: exit, background: `rgba(3,3,8,${0.55 * exit})` }}>
      <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 200 * u, color: 'transparent', WebkitTextStroke: `${2 * u}px ${color}`, opacity: 0.55, transform: `scale(${1.3 - 0.3 * enter})` }}>
        {kanji}
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 28 * u, letterSpacing: '0.4em', color, marginTop: -40 * u }}>{number}</div>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 72 * u, color: '#fff', letterSpacing: '0.08em', textShadow: `0 0 ${30 * u}px ${color}`, clipPath: `inset(0 ${(1 - enter) * 100}% 0 0)` }}>
        {title}
      </div>
    </AbsoluteFill>
  );
};

// ─── End card ───────────────────────────────────────────────────────────────

export const EndCard: React.FC<{ tagline: string; stack?: string[]; credit?: string; duration: number }> = ({ tagline, stack, credit, duration }) => {
  const frame = useCurrentFrame();
  const { u, vertical } = useUnit();
  const fadeOut = interpolate(frame, [duration - 12, duration], [1, 0], clamp);
  const appear = (at: number) => interpolate(frame, [at, at + 12], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 26 * u, opacity: fadeOut, padding: `0 ${60 * u}px`, textAlign: 'center' }}>
      <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: (vertical ? 150 : 170) * u, color: '#fff', letterSpacing: '0.12em', textShadow: `0 0 ${50 * u}px #a855f7, 0 ${6 * u}px ${30 * u}px #000`, opacity: appear(0), transform: `scale(${1.08 - 0.08 * appear(0)})` }}>
        領域展開
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30 * u, letterSpacing: '0.55em', color: '#c4b5fd', opacity: appear(8) }}>RYŌIKI TENKAI</div>
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 34 * u, color: 'rgba(226,232,240,0.9)', opacity: appear(16), maxWidth: 1200 * u }}>{tagline}</div>
      {stack && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 * u, marginTop: 12 * u, maxWidth: 1300 * u }}>
          {stack.map((s, i) => (
            <span
              key={s}
              style={{
                fontFamily: MONO,
                fontWeight: 600,
                fontSize: 22 * u,
                color: '#e2e8f0',
                padding: `${8 * u}px ${18 * u}px`,
                border: `${1.5 * u}px solid rgba(168,85,247,0.6)`,
                borderRadius: 999,
                background: 'rgba(168,85,247,0.12)',
                opacity: appear(22 + i * 3)
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {credit && <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 20 * u, letterSpacing: '0.25em', color: 'rgba(148,163,184,0.85)', marginTop: 18 * u, opacity: appear(40) }}>{credit}</div>}
    </AbsoluteFill>
  );
};
