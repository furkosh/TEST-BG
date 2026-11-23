#!/usr/bin/env bash
# Intro (12 s) + main film (135 s) back to back = 147 s, one file (< 50 MB): two-pass ~2.55 Mbit/s.
set -euo pipefail
cd "$(dirname "$0")/.."
A=out/dabbetul_arz_giris_12s_9x16.mp4; B=out/dabbetul_arz_topragin_altindan_9x16.mp4; O=out/dabbetul_arz_giris_ve_film_147s_9x16.mp4
F="[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]"; F1="[0:v][1:v]concat=n=2:v=1:a=0[v]"
V="-c:v libx264 -preset slow -b:v 2550k -maxrate 6000k -bufsize 9000k -pix_fmt yuv420p -profile:v high -tune film -r 24 -g 48"
ffmpeg -v error -y -i $A -i $B -filter_complex "$F1" -map "[v]" $V -pass 1 -passlogfile out/x264c -an -f mp4 /dev/null
ffmpeg -v error -y -i $A -i $B -filter_complex "$F" -map "[v]" -map "[a]" $V -pass 2 -passlogfile out/x264c -c:a aac -b:a 192k -ar 48000 -movflags +faststart \
  -metadata title="DÂBBETÜ'L-ARZ — Giriş + Toprağın Altından Gelen Ses" $O
rm -f out/x264c*.log out/x264c*.mbtree
ffprobe -v error -show_entries format=duration,size -of compact $O
