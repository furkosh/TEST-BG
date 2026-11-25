#!/usr/bin/env bash
# Assemble the final 9:16 video: rendered JPEG frames + loudness-normalised soundtrack.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/mix_audio.py
# two-pass EBU R128 normalisation to -14 LUFS / -1.5 dBTP (Instagram Reels / TikTok / Shorts)
stats=$(ffmpeg -hide_banner -i out/mix_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i out/mix_raw.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):linear=true,aresample=48000" -c:a pcm_s16le out/mix.wav
# two-pass ABR (30 s, well under 50 MB; film grain needs the bits)
V="-c:v libx264 -preset slow -b:v 8000k -maxrate 14000k -bufsize 20000k -pix_fmt yuv420p -profile:v high -tune film -r 24 -g 48"
ffmpeg -v error -y -framerate 24 -i out/frames/f_%05d.jpg $V -pass 1 -passlogfile out/x264 -an -f mp4 /dev/null
ffmpeg -v error -y -framerate 24 -i out/frames/f_%05d.jpg -i out/mix.wav $V -pass 2 -passlogfile out/x264 \
  -c:a aac -b:a 192k -ar 48000 -t 30 -movflags +faststart \
  -metadata title="ÇARŞAMBA KARISI – Giriş" out/carsamba_karisi_giris_9x16.mp4
rm -f out/x264*.log out/x264*.mbtree
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact out/carsamba_karisi_giris_9x16.mp4
