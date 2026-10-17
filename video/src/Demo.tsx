import React from 'react';
import { AbsoluteFill, Easing, Sequence } from 'remotion';
import { BlackFlash, Caption, Chant, DomainCard, EndCard, Flash, Grain, ImpactFrame, SectionCard, TitleSlam, Vignette } from './components/fx';
import { MapShot, PaintingShot, PortalShot, RealmShot } from './components/shots';
import { REALMS } from './lib/data';
import { Soundtrack } from './audio';
import { DEMO, DEMO_CUES, type Cue } from './timeline';

const REALM_FROM = 0.2;
const REALM_TO = 34.6;

/** Frame (relative to the realms section) at which the continuous flight enters domain d. */
const realmEntry = (d: number) => {
  const span = DEMO.realms.to - DEMO.realms.from;
  const step = Math.max(REALM_FROM, d * 6 - 0.4);
  return Math.round(((step - REALM_FROM) / (REALM_TO - REALM_FROM)) * span);
};

/** Domain-name voice lines land as the flight crosses into each realm. */
export const DEMO_ALL_CUES: Cue[] = [
  ...DEMO_CUES,
  ...REALMS.map((_, d) => ({ file: `vo-name-${d}.mp3`, at: DEMO.realms.from + realmEntry(d) + 8, volume: 0.9 }))
];

/**
 * 60 s showcase: veil chant → title → 01 2D World Map → 02 3D Domain Realms → 03 effects → end card
 * with the tech stack.
 */
export const Demo: React.FC = () => {
  const D = DEMO;
  const mapLen = D.map.to - D.map.from;
  const realmLen = D.realms.to - D.realms.from;

  return (
    <AbsoluteFill style={{ backgroundColor: '#040509' }}>
      <Sequence from={D.chant.from} durationInFrames={D.chant.to - D.chant.from}>
        <Chant
          duration={D.chant.to - D.chant.from}
          lines={[
            { text: '闇より出でて', from: 4, to: 39 },
            { text: '闇より黒く', from: 58, to: 99 },
            { text: 'その穢れを', from: 123, to: 157 }
          ]}
        />
      </Sequence>

      <Sequence from={D.title.from} durationInFrames={D.title.to - D.title.from}>
        <RealmShot from={0} to={1.4} duration={D.title.to - D.title.from} ease={Easing.out(Easing.quad)} />
        <Vignette />
        <TitleSlam subtitle="AN INTERACTIVE DOMAIN-EXPANSION EXPERIENCE" color="#00f0ff" subtitleDelay={18} />
      </Sequence>
      <Sequence from={D.veilBreak} durationInFrames={14}>
        <Flash length={12} />
      </Sequence>
      <Sequence from={D.veilBreak + 2} durationInFrames={8}>
        <ImpactFrame length={8} tint="#00f0ff" seed="veil-demo" />
      </Sequence>

      {/* 01 — 2D World Map */}
      <Sequence from={D.map.from} durationInFrames={mapLen}>
        <MapShot from={0} to={11.5} duration={mapLen} ease={(t) => t} />
        <Vignette strength={0.75} />
      </Sequence>
      <Sequence from={D.map.from} durationInFrames={54}>
        <SectionCard number="01" title="2D WORLD MAP" kanji="地図" color="#00f0ff" duration={54} />
      </Sequence>
      <Sequence from={D.map.from + 60} durationInFrames={110}>
        <Caption label="ONE CONTINUOUS MURAL" text="36 painted keyframes stitched into one world" duration={110} />
      </Sequence>
      <Sequence from={D.map.from + 180} durationInFrames={110}>
        <Caption label="SCROLL-DRIVEN CAMERA" text="Up · down · left · right — scroll flies you across it" duration={110} color="#ff1744" />
      </Sequence>
      <Sequence from={D.map.from + 300} durationInFrames={110}>
        <Caption label="SEAMLESS" text="Feathered seams, letterbox trimming, painted bridge plates" duration={110} color="#ff1744" />
      </Sequence>

      {/* 02 — 3D Domain Realms: one continuous flight through all six */}
      <Sequence from={D.realms.from} durationInFrames={realmLen}>
        <RealmShot from={REALM_FROM} to={REALM_TO} duration={realmLen} ease={(t) => t} time0={20} />
        <Vignette strength={0.7} />
      </Sequence>
      <Sequence from={D.realms.from} durationInFrames={54}>
        <SectionCard number="02" title="3D DOMAIN REALMS" kanji="界" color="#a855f7" duration={54} />
      </Sequence>
      {REALMS.map((realm, d) => {
        const at = D.realms.from + realmEntry(d) + (d === 0 ? 56 : 0);
        const next = d < 5 ? D.realms.from + realmEntry(d + 1) : D.realms.to;
        const len = Math.max(30, next - at - 4);
        return (
          <Sequence key={realm.id} from={at} durationInFrames={len}>
            <DomainCard index={d} nameJa={realm.nameJa} romaji={realm.romaji} nameEn={realm.nameEn} color={realm.color} duration={len} />
          </Sequence>
        );
      })}
      <Sequence from={D.realms.from + 60} durationInFrames={100}>
        <Caption label="THREE.JS · GLSL · BLOOM" text="Six procedurally built worlds, one flight" duration={100} color="#a855f7" />
      </Sequence>

      {/* 03 — Effects */}
      <Sequence from={D.effects.from} durationInFrames={90}>
        <PortalShot plates={[['infinite-void', 0], ['infinite-void', 1], ['infinite-void', 2], ['infinite-void', 3]]} duration={90} />
        <Vignette />
        <Caption label="PORTAL TUNNEL MODE" text="Plates rush past as the next opens through a portal" duration={90} color="#00f0ff" position="bottom" />
      </Sequence>
      <Sequence from={D.effects.from} durationInFrames={50}>
        <SectionCard number="03" title="CURSED EFFECTS" kanji="術" color="#ff1744" duration={50} />
      </Sequence>
      <Sequence from={D.effects.from + 90} durationInFrames={60}>
        <PaintingShot domain="chimera-shadow" index={0} duration={60} zoom={[1.05, 1.16]} chroma={4} />
        <Vignette />
        <Caption label="集中線 IMPACT FRAMES" text="Manga impact frames on every domain change" duration={60} color="#00e5ff" position="bottom" />
      </Sequence>
      <Sequence from={D.effects.from + 92} durationInFrames={10}>
        <ImpactFrame length={9} tint="#00e5ff" seed="demo-impact" />
      </Sequence>
      <Sequence from={D.effects.from + 150} durationInFrames={90}>
        <PaintingShot domain="malevolent-shrine" index={0} duration={90} zoom={[1.04, 1.2]} chroma={6} />
        <Vignette />
        <Caption label="黒閃 BLACK FLASH" text="Press Space to land a Black Flash" duration={90} color="#ff1744" position="bottom" />
      </Sequence>
      <Sequence from={D.effects.from + 152} durationInFrames={8}>
        <BlackFlash seed="demo-kokusen" />
      </Sequence>

      {/* End card */}
      <Sequence from={D.end.from} durationInFrames={D.end.to - D.end.from}>
        <RealmShot from={3.6} to={4.4} duration={D.end.to - D.end.from} time0={80} />
        <AbsoluteFill style={{ backgroundColor: 'rgba(3,3,8,0.66)' }} />
        <Vignette />
        <EndCard
          tagline="A scroll-driven domain-expansion experience — 2D world map, 3D realms and a portal tunnel."
          stack={['TypeScript', 'Canvas 2D', 'three.js', 'GLSL', 'WebAudio', 'Vite']}
          duration={D.end.to - D.end.from}
        />
      </Sequence>
      <Sequence from={D.end.from} durationInFrames={12}>
        <Flash length={12} />
      </Sequence>

      <Grain />
      <Soundtrack cues={DEMO_ALL_CUES} />
    </AbsoluteFill>
  );
};
