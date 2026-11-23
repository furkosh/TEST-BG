# DÂBBETÜ'L-ARZ — TOPRAĞIN ALTINDAN GELEN SES

Dinî kaynaklarda adı geçen Dâbbetü'l-Arz'dan esinlenen, kurgusal bir 2D psikolojik korku kısa filmi.
Anlatıcı olayı yaşamış gibi anlatır, ancak bu bir tanıklık değil, kurgudur. Yaratığın görünüşü, mağaradan çıkışı ve
Mehmet'le konuşması dinî kaynaklarda doğrulanmış bir olay olarak sunulmaz. Yaratığın repliği Neml suresi 82. ayetin
temasından esinlenen kurgusal bir cümledir, ayetin metni değildir.

| Özellik | Değer |
|---|---|
| Süre | 135,0 sn (120 sn hikâye + 15 sn izleyiciye kapanış) |
| Çözünürlük | 1080 × 1920 (9:16), 24 FPS (3240 kare) |
| Video | H.264 High, yuv420p, faststart, ~2,8 Mbit/s (2 geçişli, 48,3 MiB) |
| Ses | AAC 48 kHz stereo, ölçülen ≈ −14,8 LUFS / −1,3 dBTP |
| Altyazı | Görüntüye gömülü, kelime kelime, seslendirmeyle senkron |

Videolar:
- `out/dabbetul_arz_topragin_altindan_9x16.mp4`: ana film (135 sn)
- `out/dabbetul_arz_giris_12s_9x16.mp4`: giriş (12 sn). Seslendirme: "Dâbbetü'l-Arz… İslam inancında kıyamet alametlerinden biri
  olarak kabul edilen ve yerden çıkacağı bildirilen canlıyı ifade eder." Çatlak toprak, "İSLAM İNANCINDA / KIYAMET ALAMETİ" kartı,
  toprağın altında kayan gölge, "yerden çıkacağı" sözünde açılan yarık, "canlıyı" sözünde açılan kehribar gözler, kırmızı başlık.
  Üretim: `scripts/build_intro_timeline.py`, `PAGE=intro.html DUR=12 node render/render_frames.cjs frames out/frames_intro`, `scripts/build_intro.sh`.

## Nasıl yapıldı
- **Görüntü:** `render/` altındaki HTML Canvas kodu. Köy, orman yolu ve taş ocağı aynı 3B dünyada (`forest.js`, `world.js`):
  yağmur, sis, taş evler, dağ sırtları, mağara ağzı, çatlayan zemin, el feneri konisi ve ışık hüzmesi.
  Çatlak toprak, toprağın altına iniş ve mağara tüneli `ground.js` içinde; yaratık `dabbe.js` içinde.
- **Mehmet:** 38 yaşında, kısa siyah saç, hafif sakal, koyu kahverengi mont, siyah pantolon, eski deri botlar, küçük metal el feneri.
  Tam boy model `figure.js`, yakın plan yüz `man.js` + `sets.js`.
- **Dâbbetü'l-Arz (özgün yorum):** ~4 m, toprakla kaplı taş dokulu deri, uzun ve güçlü ön uzuvlar, derin yarıklarla kaplı yüz,
  soluk kehribar gözler. İlk sahnelerde yalnızca toprağın altındaki gölge ve gözler görünür.
- **Seslendirme:** ElevenLabs `eleven_v4`. Anlatıcı "Göksel", yaratık "Serdar Tekyildiz" sesinden perdesi düşürülüp
  alt oktav, yer altı uğultusu ve uzun mağara yankısıyla işlendi (`scripts/mix_audio.py`). Konuşurken müzik ve ortam sesleri tamamen kesilir.
- **Altyazı:** ElevenLabs Scribe ile kelime düzeyinde zamanlama (`data/words_raw.json`, `scripts/build_timeline.py`).
  Kırmızı vurgular: KIYAMET, DÂBBETÜ'L-ARZ, TOPRAK/TOPRAĞIN, YARATIK, KONUŞACAĞI, KAÇMAK, KAÇABİLİR, MEHMET.

## Sahne zaman çizelgesi (gerçek konuşma hızına göre)
| Sahne | Aralık |
|---|---|
| 1 Kıyametin habercisi | 00:00–00:14,6 |
| 2 Toprağın altından gelen ses | 00:14,6–00:28,4 |
| 3 Terk edilmiş taş ocağı | 00:28,4–00:41,9 |
| 4 Yerin altındaki nefes | 00:41,9–00:55,2 |
| 5 Toprak yarılıyor | 00:55,2–01:09,6 |
| 6 Dâbbetü'l-Arz konuşuyor | 01:09,6–01:29,6 |
| 7 Kaçış | 01:29,6–01:41,6 |
| 8 Son işaret | 01:41,6–02:00 |
| 9 İzleyiciye kapanış | 02:00–02:15 |

## Yeniden üretme
```bash
python3 scripts/build_timeline.py
node render/render_frames.cjs frames out/frames
scripts/build_video.sh
```
