import React from 'react';
import { Composition, Folder } from 'remotion';
import { Demo } from './Demo';
import { Trailer } from './Trailer';
import { FPS } from './lib/data';
import { DEMO, TRAILER } from './timeline';

const LANDSCAPE = { width: 1920, height: 1080 };
const VERTICAL = { width: 1080, height: 1920 };

export const Root: React.FC = () => (
  <>
    <Folder name="Trailer">
      <Composition id="Trailer-16x9" component={Trailer} durationInFrames={TRAILER.duration} fps={FPS} {...LANDSCAPE} />
      <Composition id="Trailer-9x16" component={Trailer} durationInFrames={TRAILER.duration} fps={FPS} {...VERTICAL} />
    </Folder>
    <Folder name="Demo">
      <Composition id="Demo-16x9" component={Demo} durationInFrames={DEMO.duration} fps={FPS} {...LANDSCAPE} />
      <Composition id="Demo-9x16" component={Demo} durationInFrames={DEMO.duration} fps={FPS} {...VERTICAL} />
    </Folder>
  </>
);
