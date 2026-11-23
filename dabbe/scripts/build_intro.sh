#!/usr/bin/env bash
# 12 s intro: frames (PAGE=intro.html DUR=12) + mix -> -14 LUFS -> H.264/AAC
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/mix_intro.py
stats=$(ffmpeg -hide_banner -i out/intro_mix_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$stats" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i out/intro_mix_raw.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):linear=true,aresample=48000" -c:a pcm_s16le out/intro_mix.wav
ffmpeg -v error -y -framerate 24 -i out/frames_intro/f_%05d.jpg -i out/intro_mix.wav -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -tune film -r 24 \
  -c:a aac -b:a 192k -ar 48000 -t 12 -movflags +faststart -metadata title="DÂBBETÜ'L-ARZ — Giriş" out/dabbetul_arz_giris_12s_9x16.mp4
ffprobe -v error -show_entries format=duration,size -of compact out/dabbetul_arz_giris_12s_9x16.mp4
