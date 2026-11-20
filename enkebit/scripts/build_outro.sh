#!/usr/bin/env bash
# Build the 15 s outro and the full 135 s cut (main film + outro).
# Needs out/frames (main), out/mix.wav (from build_video.sh) and out/frames_outro:
#   PAGE=outro.html node render/render_frames.cjs frames out/frames_outro
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/build_outro_timeline.py > /dev/null
python3 scripts/mix_outro.py
lufs() { ffmpeg -hide_banner -nostats "$@" -af ebur128 -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}'; }
main_i=$(lufs -i out/mix.wav)
seg_i=$(lufs -t 13.5 -i out/outro_mix_raw.wav)
gain=$(python3 -c "print(round($main_i - ($seg_i), 2))")
echo "main ${main_i} LUFS, outro narration ${seg_i} LUFS -> gain ${gain} dB"
# match the narration level of the main film; the limiter only catches the jumpscare peaks
ffmpeg -v error -y -i out/outro_mix_raw.wav -af "volume=${gain}dB,alimiter=limit=0.84:attack=1:release=80:level=disabled,aresample=48000" -c:a pcm_s16le out/outro_mix.wav
V="-c:v libx264 -preset slow -maxrate 6000k -bufsize 9000k -pix_fmt yuv420p -profile:v high -tune film -r 24 -g 48"
# 15 s outro on its own
ffmpeg -v error -y -framerate 24 -i out/frames_outro/f_%05d.jpg -i out/outro_mix.wav $V -crf 21 \
  -c:a aac -b:a 192k -ar 48000 -t 15 -movflags +faststart -metadata title="ENKEBİT - Kapanış" out/enkebit_kapanis_15s_9x16.mp4
# full 135 s cut: film + outro, two-pass to stay under 50 MiB
ffmpeg -v error -y -framerate 24 -i out/frames/f_%05d.jpg -framerate 24 -i out/frames_outro/f_%05d.jpg \
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v]" -map "[v]" $V -b:v 2850k -pass 1 -passlogfile out/x264full -an -f mp4 /dev/null
ffmpeg -v error -y -framerate 24 -i out/frames/f_%05d.jpg -framerate 24 -i out/frames_outro/f_%05d.jpg -i out/mix.wav -i out/outro_mix.wav \
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v];[2:a][3:a]concat=n=2:v=0:a=1[a]" -map "[v]" -map "[a]" $V -b:v 2850k -pass 2 -passlogfile out/x264full \
  -c:a aac -b:a 192k -ar 48000 -t 135 -movflags +faststart -metadata title="ENKEBİT: BOĞAZ DEŞEN (tam)" out/enkebit_bogaz_desen_tam_135s_9x16.mp4
rm -f out/x264full*
for f in out/enkebit_kapanis_15s_9x16.mp4 out/enkebit_bogaz_desen_tam_135s_9x16.mp4; do
  ffprobe -v error -show_entries format=duration,size -of compact "$f"
done
