#!/usr/bin/env bash
# Peak-limits the mixed soundtrack of each rendered video to -1 dBTP (stacked impacts otherwise clip);
# the video stream is copied untouched.
set -euo pipefail
for f in out/ryoiki-tenkai-*.mp4; do
  tmp="${f%.mp4}.tmp.mp4"
  ffmpeg -v error -y -i "$f" -c:v copy -af "alimiter=limit=0.84:attack=2:release=60:level=disabled" -c:a aac -b:a 256k -movflags +faststart "$tmp"
  mv "$tmp" "$f"
  echo "limited $f"
done
