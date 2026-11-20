#!/usr/bin/env bash
# Assemble the final 9:16 video: rendered JPEG frames + loudness-normalised soundtrack.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/mix_audio.py
# two-pass EBU R128 normalisation to -14 LUFS / -1.5 dBTP (Instagram Reels / TikTok)
stats=$(ffmpeg -hide_banner -i out/mix_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi=$(echo "$stats" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['input_i'])")
mtp=$(echo "$stats" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['input_tp'])")
mlra=$(echo "$stats" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['input_lra'])")
mth=$(echo "$stats" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['input_thresh'])")
ffmpeg -v error -y -i out/mix_raw.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$mi:measured_TP=$mtp:measured_LRA=$mlra:measured_thresh=$mth:linear=true,aresample=48000" -c:a pcm_s16le out/mix.wav
# two-pass ABR (~3.1 Mbit/s video): keeps the file < 50 MB for GitHub while staying above Reels' own re-encode quality
V="-c:v libx264 -preset slow -b:v 3100k -maxrate 6000k -bufsize 9000k -pix_fmt yuv420p -profile:v high -tune film -r 24 -g 48"
ffmpeg -v error -y -framerate 24 -i out/frames/f_%05d.jpg $V -pass 1 -passlogfile out/x264 -an -f mp4 /dev/null
ffmpeg -v error -y -framerate 24 -i out/frames/f_%05d.jpg -i out/mix.wav $V -pass 2 -passlogfile out/x264 \
  -c:a aac -b:a 192k -ar 48000 -t 120 -movflags +faststart \
  -metadata title="ENKEBİT: BOĞAZ DEŞEN" out/enkebit_bogaz_desen_9x16.mp4
rm -f out/x264*.log out/x264*.mbtree
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact out/enkebit_bogaz_desen_9x16.mp4
