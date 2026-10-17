#!/usr/bin/env bash
# Builds the final soundtrack stems in ../public/audio from the chosen raw takes.
set -euo pipefail
OUT=../public/audio
mkdir -p "$OUT"
norm() { # in out integrated-loudness [extra-filters]
  ffmpeg -v error -y -i "$1" -af "${4:+$4,}loudnorm=I=$3:TP=-1.5:LRA=11" -ar 48000 -ac 2 -b:a 256k "$OUT/$2"
}
norm music-trailer-a.mp3 music-trailer.mp3 -16
norm music-demo-b.mp3    music-demo.mp3    -16
norm sfx-heartbeat-a.mp3 sfx-heartbeat.mp3 -14
norm sfx-shatter-a.mp3   sfx-shatter.mp3   -13
norm sfx-impact-a.mp3    sfx-impact.mp3    -12
norm sfx-whoosh-a.mp3    sfx-whoosh.mp3    -16
norm sfx-riser-a.mp3     sfx-riser.mp3     -15
norm sfx-black-flash-a.mp3 sfx-black-flash.mp3 -12
# Chant: the trailer cuts it after 「闇より黒く」, the demo after 「その穢れを」 — the barrier shatters mid-incantation
norm vo-chant-a.mp3 vo-chant-trailer.mp3 -15 "atrim=0:3.35,afade=t=out:st=3.15:d=0.2"
norm vo-chant-a.mp3 vo-chant-demo.mp3    -15 "atrim=0:5.32,afade=t=out:st=5.12:d=0.2"
norm "$RYOIKI" vo-ryoiki-tenkai.mp3 -12
# Six domain names, split at the measured silences
i=0
for seg in "0:1.32" "1.92:3.17" "3.77:5.52" "6.07:7.42" "8.02:9.27" "9.82:11.44"; do
  s=${seg%%:*}; e=${seg##*:}
  norm vo-names-a.mp3 "vo-name-$i.mp3" -14 "atrim=$s:$e,asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=$(python -c "print(round($e-$s-0.08,3))"):d=0.08"
  i=$((i+1))
done
