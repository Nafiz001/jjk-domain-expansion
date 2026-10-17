# 領域展開 — trailer & demo videos

Code-driven videos for the Ryōiki Tenkai scroll experience, built with [Remotion](https://www.remotion.dev/).
They reuse the site's own engines (`../src/engine/worldMap.ts` and `../src/engine/world3d/`), driven frame by frame,
so every shot is deterministic and identical on every render.

| Composition | Length | Size | Output |
| --- | --- | --- | --- |
| `Trailer-16x9` | 30 s | 1920×1080 | `out/ryoiki-tenkai-trailer-16x9.mp4` |
| `Trailer-9x16` | 30 s | 1080×1920 | `out/ryoiki-tenkai-trailer-9x16.mp4` |
| `Demo-16x9` | 60 s | 1920×1080 | `out/ryoiki-tenkai-demo-16x9.mp4` |
| `Demo-9x16` | 60 s | 1080×1920 | `out/ryoiki-tenkai-demo-9x16.mp4` |

## Commands

```bash
npm install
npm run studio          # live preview / scrubbing in the Remotion Studio
npm run render:trailer  # both trailer formats
npm run render:demo     # both demo formats
npm run render:all      # all four, then `finalize`
npm run finalize        # peak-limit the mixed audio to -1 dBTP (video stream copied)
```

`npm run sync-assets` copies `../public/assets` (frames + bridge plates) into `public/assets` first —
Remotion can't bundle folder links on Windows. Rendering uses hardware WebGL (`--gl=angle`) with a
concurrency of 3; lower it in `remotion.config.ts` if a GPU runs out of memory.

## Structure

- `src/timeline.ts` — frame-exact timing for both cuts plus the audio cue sheets. Veil breaks sit on the
  scores' measured impact hits (3.78 s trailer, 5.30 s demo).
- `src/components/shots.tsx` — `RealmShot` (three.js realms), `MapShot` (2D world map), `PaintingShot`,
  `PortalShot` (portal-tunnel transition).
- `src/components/fx.tsx` — veil chant, 領域展開 title slam, domain cards, captions, manga impact frames,
  Black Flash, grain, vignette, end card. Layout scales to both aspect ratios.
- `src/audio.tsx` — soundtrack with automatic music ducking under narration.

## Soundtrack

`public/audio/` holds the mastered stems (music, sound effects, narration). Raw generation takes and the
tooling used to choose and master them live in `audio-src/`:

- `analyze.py` / `hits.py` — loudness envelopes, impact and silence detection used to pick takes, align
  the edit and split the domain-name narration.
- `master.sh` — trims, splits and loudness-normalises the chosen takes into `public/audio/`.

Narration is in hiragana (むりょうくうしょ, ふくまみずし, …) so the domain names are read correctly.
The soundtrack was generated on a free, non-commercial plan — check the provider's attribution terms
before publishing and credit it in the video description if required.
