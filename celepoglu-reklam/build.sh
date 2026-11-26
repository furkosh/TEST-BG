#!/usr/bin/env bash
# Celepoğlu Taşımacılık reklam filmini baştan üretir.
#   ./build.sh          → 4K 60fps ana dosya + 1080p kopya
#   ./build.sh preview  → 1080p 30fps hızlı önizleme
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p output

python3 src/music.py audio/muzik.wav
python3 src/mix.py audio/final_miks.wav

if [[ "${1:-}" == "preview" ]]; then
  python3 src/render.py --width 1920 --fps 30 --workers 4 --out output/_onizleme_sessiz.mp4
  ffmpeg -y -loglevel error -i output/_onizleme_sessiz.mp4 -i audio/final_miks.wav \
    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest output/onizleme_1080p.mp4
  rm output/_onizleme_sessiz.mp4
  exit 0
fi

python3 src/render.py --width 3840 --fps 60 --workers 4 --crf 18 --maxrate 12M \
  --out output/_video_4k_sessiz.mp4
ffmpeg -y -loglevel error -i output/_video_4k_sessiz.mp4 -i audio/final_miks.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart \
  -metadata title="Celepoğlu Taşımacılık – Yolunuz, güvenle bizimle." \
  output/celepoglu_reklam_4K_60fps.mp4
rm output/_video_4k_sessiz.mp4

ffmpeg -y -loglevel error -i output/celepoglu_reklam_4K_60fps.mp4 \
  -vf "scale=1920:1080:flags=lanczos" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a copy -movflags +faststart output/celepoglu_reklam_1080p_60fps.mp4

# arşiv için kayıpsız sıkıştırılmış ses kopyaları
ffmpeg -y -loglevel error -i audio/muzik.wav -c:a flac audio/muzik.flac
ffmpeg -y -loglevel error -i audio/final_miks.wav -c:a flac audio/final_miks.flac
echo "Tamam → output/"
