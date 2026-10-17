import { Config } from '@remotion/cli/config';

// public/assets is a copy of the site's public/assets (`npm run sync-assets`; Remotion can't bundle
// links on Windows). public/audio holds the soundtrack so it never ships with the website.
// Hardware WebGL for the three.js realms (default software GL is far slower)
Config.setChromiumOpenGlRenderer('angle');
// Each tab builds its own 3D world; keep GPU memory in check on integrated graphics
Config.setConcurrency(3);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
