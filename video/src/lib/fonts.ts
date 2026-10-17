import { loadFont as loadNotoSerifJP } from '@remotion/google-fonts/NotoSerifJP';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as loadSpaceGrotesk } from '@remotion/google-fonts/SpaceGrotesk';

export const SERIF = loadNotoSerifJP('normal', { weights: ['700', '900'] }).fontFamily;
export const MONO = loadJetBrainsMono('normal', { weights: ['600', '800'], subsets: ['latin'] }).fontFamily;
export const SANS = loadSpaceGrotesk('normal', { weights: ['500', '700'], subsets: ['latin'] }).fontFamily;
