import React from 'react';
import { AbsoluteFill, Easing, Sequence } from 'remotion';
import { BlackFlash, Chant, DomainCard, EndCard, Flash, Grain, ImpactFrame, TitleSlam, Vignette } from './components/fx';
import { MapShot, PaintingShot, RealmShot } from './components/shots';
import { HERO_FRAME, REALMS } from './lib/data';
import { Soundtrack } from './audio';
import { TRAILER, TRAILER_CUES } from './timeline';

/**
 * 30 s trailer: veil chant → 領域展開 → six domains (painted beat + 3D realm flight each)
 * → mural montage → Black Flash → end card.
 */
export const Trailer: React.FC = () => {
  const T = TRAILER;
  const { each, painted } = T.domains;

  return (
    <AbsoluteFill style={{ backgroundColor: '#040509' }}>
      {/* Cold open: the veil is lowered */}
      <Sequence from={T.chant.from} durationInFrames={T.chant.to - T.chant.from}>
        <Chant
          duration={T.chant.to - T.chant.from}
          lines={[
            { text: '闇より出でて', from: 10, to: 45 },
            { text: '闇より黒く', from: 64, to: 105 }
          ]}
        />
      </Sequence>

      {/* 領域展開 over the first realm */}
      <Sequence from={T.title.from} durationInFrames={T.title.to - T.title.from}>
        <RealmShot from={0} to={1.1} duration={T.title.to - T.title.from} ease={Easing.out(Easing.quad)} />
        <Vignette />
        <TitleSlam subtitle="RYŌIKI TENKAI" color="#00f0ff" />
      </Sequence>
      <Sequence from={T.veilBreak} durationInFrames={14}>
        <Flash length={12} />
      </Sequence>
      <Sequence from={T.veilBreak + 2} durationInFrames={8}>
        <ImpactFrame length={8} tint="#00f0ff" seed="veil" />
      </Sequence>

      {/* Six domains: painted beat, then a flight through the realm */}
      {REALMS.map((realm, d) => {
        const start = T.domains.from + d * each;
        return (
          <React.Fragment key={realm.id}>
            <Sequence from={start} durationInFrames={painted}>
              <PaintingShot domain={realm.id} index={HERO_FRAME[realm.id]} duration={painted} zoom={[1.18, 1.04]} chroma={10} />
            </Sequence>
            <Sequence from={start + painted} durationInFrames={each - painted}>
              <RealmShot from={d * 6 + 0.6} to={d * 6 + 4.7} duration={each - painted} time0={d * 7} />
            </Sequence>
            <Sequence from={start} durationInFrames={each}>
              <Vignette strength={0.7} />
              <DomainCard index={d} nameJa={realm.nameJa} romaji={realm.romaji} nameEn={realm.nameEn} color={realm.color} duration={each} />
            </Sequence>
            <Sequence from={start} durationInFrames={6}>
              <ImpactFrame length={5} tint={realm.color} seed={`cut-${d}`} />
            </Sequence>
          </React.Fragment>
        );
      })}

      {/* Montage: race across the whole painted mural */}
      <Sequence from={T.montage.from} durationInFrames={T.montage.to - T.montage.from}>
        <MapShot from={0} to={35} duration={T.montage.to - T.montage.from} ease={Easing.in(Easing.quad)} />
        <Vignette strength={0.8} />
      </Sequence>
      <Sequence from={T.strobeAt} durationInFrames={8}>
        <BlackFlash />
      </Sequence>

      {/* End card over the hands cathedral */}
      <Sequence from={T.end.from} durationInFrames={T.end.to - T.end.from}>
        <RealmShot from={33.6} to={34.2} duration={T.end.to - T.end.from} time0={60} />
        <AbsoluteFill style={{ backgroundColor: 'rgba(3,3,8,0.62)' }} />
        <Vignette />
        <EndCard tagline="Six domain expansions. One continuous world." duration={T.end.to - T.end.from} />
      </Sequence>
      <Sequence from={T.end.from} durationInFrames={12}>
        <Flash length={12} />
      </Sequence>

      <Grain />
      <Soundtrack cues={TRAILER_CUES} />
    </AbsoluteFill>
  );
};
