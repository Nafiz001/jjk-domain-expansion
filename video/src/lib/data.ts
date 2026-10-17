import { staticFile } from 'remotion';
import { DOMAINS, DOMAIN_ORDER } from '../../../src/data/domains';
import type { DomainId } from '../../../src/types';

export { DOMAINS, DOMAIN_ORDER };
export type { DomainId };

export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);

/** Short display data per domain, in story order. */
export const REALMS = DOMAIN_ORDER.map((id) => {
  const d = DOMAINS[id];
  return {
    id,
    nameJa: d.nameJa,
    nameEn: d.nameEn,
    romaji: d.nameRomaji,
    color: d.primaryColor,
    secondary: d.secondaryColor
  };
});

export const frameSrc = (domain: DomainId, index: number) =>
  staticFile(`assets/frames/${domain}/frame_${index}.jpg`);

/** Every keyframe plate in path order (domain-major, 6 per domain). */
export const ALL_PLATES = DOMAIN_ORDER.flatMap((id) =>
  Array.from({ length: 6 }, (_, i) => ({ domain: id, index: i, src: frameSrc(id, i), spec: DOMAINS[id].frames[i] }))
);

/** The painted character beat shown for each domain (its awakening plate). */
export const HERO_FRAME: Record<DomainId, number> = {
  'infinite-void': 0,
  'malevolent-shrine': 0,
  'chimera-shadow': 0,
  'authentic-mutual-love': 0,
  'idle-death-gamble': 0,
  'self-embodiment-of-perfection': 0
};
