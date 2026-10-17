#!/usr/bin/env node
/**
 * Paints "bridge" plates with the agy CLI: one transition image per consecutive pair of plates on the
 * world-map path, so neighbouring keyframes melt into one continuous mural.
 *
 *   npm run bridges                     # paint every missing bridge
 *   npm run bridges -- --from 0 --to 5  # only steps 0..5
 *   npm run bridges -- --dry-run        # print the prompts without calling agy
 *   npm run bridges -- --model gemini-3.8-flash-high
 *
 * Each finished bridge is appended to public/assets/bridges/manifest.json right away, so partial
 * runs are usable; the world-map renderer only loads bridges listed there. Stops on quota errors.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const world = JSON.parse(readFileSync(resolve(root, 'src/data/world-path.json'), 'utf8'));
const bridgesDir = resolve(root, 'public/assets/bridges');
const manifestPath = resolve(bridgesDir, 'manifest.json');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const dryRun = args.includes('--dry-run');
const model = flag('model', 'gemini-3.8-flash-high');
const steps = world.path.length - 1;
const from = Math.max(0, Number(flag('from', 0)));
const to = Math.min(steps - 1, Number(flag('to', steps - 1)));

const platePath = (k) => {
  const domain = world.domains[Math.floor(k / 6)];
  return resolve(root, `public/assets/frames/${domain}/frame_${k % 6}.jpg`).replaceAll('\\', '/');
};
const bridgePath = (step) => resolve(bridgesDir, `bridge_${String(step).padStart(2, '0')}.jpg`).replaceAll('\\', '/');

function readManifest() {
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8')).bridges ?? [];
  } catch {
    return [];
  }
}

function addToManifest(step) {
  const bridges = [...new Set([...readManifest(), step])].sort((a, b) => a - b);
  writeFileSync(manifestPath, JSON.stringify({ bridges }, null, 2) + '\n');
}

function isImage(file) {
  if (!existsSync(file) || statSync(file).size < 10_000) return false;
  const head = readFileSync(file).subarray(0, 4);
  const jpeg = head[0] === 0xff && head[1] === 0xd8;
  const png = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  return jpeg || png;
}

function promptFor(step) {
  const [ax, ay] = world.path[step];
  const [bx, by] = world.path[step + 1];
  const horizontal = ay === by;
  // Describe the pair by screen position, not travel direction
  const first = horizontal ? (ax < bx ? step : step + 1) : ay < by ? step : step + 1;
  const second = first === step ? step + 1 : step;
  const [posA, posB, edgeA, edgeB, shape] = horizontal
    ? ['LEFT', 'RIGHT', 'RIGHT edge', 'LEFT edge', 'a 4:3 landscape image (1152x864)']
    : ['TOP', 'BOTTOM', 'BOTTOM edge', 'TOP edge', 'a 16:9 landscape image (1280x720)'];
  return [
    'Use your image generation tool to create exactly ONE image.',
    `Input images: ${posA} panel = ${platePath(first)} and ${posB} panel = ${platePath(second)}.`,
    `They are neighbouring panels of one giant continuous painted world map; the ${posA} panel sits directly ${horizontal ? 'to the left of' : 'above'} the ${posB} panel.`,
    `Create ${shape} that bridges them: its ${posA === 'LEFT' ? 'LEFT' : 'TOP'} side must seamlessly continue the ${edgeA} of the ${posA} panel,`,
    `and its ${posA === 'LEFT' ? 'RIGHT' : 'BOTTOM'} side must seamlessly continue the ${edgeB} of the ${posB} panel, so the two scenes melt into each other.`,
    'Match the Jujutsu Kaisen anime painting style, colour palette and lighting of both inputs; fill the middle with cursed-energy mist, light and environment that connect the two scenes.',
    'The artwork must reach all four edges: no letterbox bars, no borders, no frames, no text, no UI, no new faces.',
    `Save the result at ${bridgePath(step)}. Do not create or modify any other files.`,
    // Without this, agy's print-mode turn ends while the image subagent is still running and nothing is saved
    'IMPORTANT: image generation runs asynchronously - you must WAIT for it to finish, then copy the generated file to that exact path and verify the file exists with a shell command before you end your turn. Do not end your turn while generation is still running.',
    'When done reply with only the saved path.'
  ].join(' ');
}

let painted = 0;
for (let step = from; step <= to; step++) {
  const out = bridgePath(step);
  if (isImage(out)) {
    addToManifest(step);
    continue;
  }
  const prompt = promptFor(step);
  if (dryRun) {
    console.log(`\n[step ${step}] ${prompt}`);
    continue;
  }
  console.log(`[step ${step}/${steps - 1}] painting ${out} ...`);
  const res = spawnSync(
    'agy',
    ['--mode', 'accept-edits', '--model', model, '--print-timeout', '900s', '--print', prompt],
    { cwd: root, encoding: 'utf8', shell: false, timeout: 16 * 60 * 1000 }
  );
  const output = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  if (/RESOURCE_EXHAUSTED|quota/i.test(output)) {
    console.error(`agy quota exhausted at step ${step}; ${painted} bridge(s) painted this run.\n${output.trim()}`);
    process.exit(2);
  }
  if (!isImage(out)) {
    console.error(`step ${step}: agy did not produce an image.\n${output.trim()}`);
    continue;
  }
  addToManifest(step);
  painted++;
  console.log(`[step ${step}] done`);
}
console.log(dryRun ? '\n(dry run)' : `Finished: ${painted} new bridge(s). Manifest: ${readManifest().length}/${steps}.`);
