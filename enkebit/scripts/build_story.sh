#!/usr/bin/env bash
# 30 s Instagram Story (needs out/frames_story: PAGE=story.html node render/render_frames.cjs frames out/frames_story)
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/build_story_timeline.py > /dev/null
python3 scripts/mix_story.py
stats=$(ffmpeg -hide_banner -i out/story_mix_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i out/story_mix_raw.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):linear=true,aresample=48000" -c:a pcm_s16le out/story_mix.wav
ffmpeg -v error -y -framerate 24 -i out/frames_story/f_%05d.jpg -i out/story_mix.wav \
  -c:v libx264 -preset slow -crf 20 -maxrate 8000k -bufsize 12000k -pix_fmt yuv420p -profile:v high -tune film -r 24 -g 48 \
  -c:a aac -b:a 192k -ar 48000 -t 30 -movflags +faststart -metadata title="ENKEBİT - Story (Saat 12:00 Reels)" out/enkebit_story_30s_9x16.mp4
ffprobe -v error -show_entries format=duration,size -of compact out/enkebit_story_30s_9x16.mp4
ffmpeg -hide_banner -nostats -i out/story_mix.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | head -2
