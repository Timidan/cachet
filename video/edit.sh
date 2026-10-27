#!/usr/bin/env bash
# Joins the clips from record.mjs into the film: an H.264 master at the recorded size (3840x2160 from `record.mjs 2`)
# and a 1080p copy for upload. Every clip opens and closes on the yellow curtain, so a plain join reads as a dissolve.
# Usage: ./edit.sh [clip dir, default out/2x]
set -euo pipefail
cd "$(dirname "$0")"
D=${1:-out/2x}
printf "file '%s'\n" coldopen.mkv open.mkv dash.mkv claim.mkv proof.mkv paid.mkv end.mkv > "$D/list.txt"
ffmpeg -y -v error -f concat -safe 0 -i "$D/list.txt" \
  -c:v libx264 -preset slow -crf 14 -profile:v high -pix_fmt yuv420p -r 60 -movflags +faststart "$D/cachet-demo.mp4"
ffmpeg -y -v error -i "$D/cachet-demo.mp4" -vf scale=1920:1080:flags=lanczos \
  -c:v libx264 -preset slow -crf 16 -profile:v high -pix_fmt yuv420p -movflags +faststart "$D/cachet-demo-1080p.mp4"
for f in "$D/cachet-demo.mp4" "$D/cachet-demo-1080p.mp4"; do
  ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt \
    -show_entries format=duration,size -of compact "$f"
done
