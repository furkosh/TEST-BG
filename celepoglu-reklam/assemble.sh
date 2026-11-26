#!/usr/bin/env bash
# Kareleri + sesi birleştirir: Full HD (1920x1080) ve 4K UHD (3840x2160) 60 fps kopyalar.
# Kullanım: bash assemble.sh <kare_klasörü> [çıktı_klasörü]
set -euo pipefail
FR="${1:?kare klasörü}"; OUT="${2:-out}"; mkdir -p "$OUT"
HERE="$(cd "$(dirname "$0")" && pwd)"
AUD="$HERE/audio/mix_raw.wav"
[ -f "$AUD" ] || python3 "$HERE/audio/make_audio.py"
# Ses: -13.1 LUFS -> -14 LUFS (web/sosyal medya). TV (RTÜK/EBU R128 -23 LUFS) için: volume=-9.9dB
AF="volume=-0.9dB"
COMMON=(-color_primaries bt709 -color_trc bt709 -colorspace bt709 -af "$AF" -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart)
# Full HD (yerel render çözünürlüğü)
ffmpeg -hide_banner -y -framerate 60 -i "$FR/f%05d.jpg" -i "$AUD" \
  -vf "format=yuv420p" -c:v libx264 -preset slow -crf 17 -maxrate 24M -bufsize 48M -profile:v high -level 4.2 -r 60 -g 120 \
  "${COMMON[@]}" "$OUT/Celepoglu_Tasimacilik_Reklam_FullHD_1080p_60fps.mp4"
# 4K UHD (lanczos ölçekleme + hafif keskinleştirme)
ffmpeg -hide_banner -y -framerate 60 -i "$FR/f%05d.jpg" -i "$AUD" \
  -vf "scale=3840:2160:flags=lanczos,unsharp=5:5:0.5:5:5:0.0,format=yuv420p" \
  -c:v libx264 -preset medium -crf 19 -maxrate 40M -bufsize 80M -profile:v high -level 5.2 -r 60 -g 120 \
  "${COMMON[@]}" "$OUT/Celepoglu_Tasimacilik_Reklam_4K_UHD_60fps.mp4"
