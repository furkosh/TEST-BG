# DÂBBETÜ'L-ARZ — TOPRAĞIN ALTINDAN GELEN SES

Dinî kaynaklarda adı geçen Dâbbetü'l-Arz'dan esinlenen, kurgusal bir 2D psikolojik korku kısa filmi.
Anlatıcı olayı yaşamış gibi anlatır, ancak bu bir tanıklık değil, kurgudur. Yaratığın görünüşü, mağaradan çıkışı ve
Mehmet'le konuşması dinî kaynaklarda doğrulanmış bir olay olarak sunulmaz. Yaratığın repliği Neml suresi 82. ayetin
temasından esinlenen kurgusal bir cümledir, ayetin metni değildir.

| Özellik | Değer |
|---|---|
| Süre | Giriş 12 sn · Film 135 sn (120 sn hikâye + 15 sn kapanış) · Birleşik 147 sn |
| Çözünürlük | 1080 × 1920 (9:16), 24 FPS |
| Video | H.264 High, yuv420p, faststart (2 geçişli, her dosya < 50 MB) |
| Ses | AAC 48 kHz stereo, iki geçişli loudnorm (hedef −14 LUFS) |
| Altyazı | Görüntüye gömülü, kelime kelime, seslendirmeyle senkron |

Videolar:
- `out/dabbetul_arz_giris_12s_9x16.mp4`: giriş. "Dâbbetü'l-Arz… İslam inancında kıyamet alametlerinden biri olarak kabul edilen
  ve yerden çıkacağı bildirilen canlıyı ifade eder."
- `out/dabbetul_arz_topragin_altindan_9x16.mp4`: film (135 sn)
- `out/dabbetul_arz_giris_ve_film_147s_9x16.mp4`: giriş + film art arda

## Nasıl yapıldı (ikinci sürüm)

- **Kabartma ışıklandırma:** Yaratığın yüzü, gövdesi ve yerden çıkan uzvu, çatlak toprak (`relief.js`, `dabbe2.js`, `ground.js`)
  prosedürel yükseklik haritalarından üretilir: piksel başına normal, ortam kapanması (AO) ve ışığa doğru yürütülen gerçek gölge.
  Her biri birkaç ışık geçişiyle (yerdeki fener, arkadan ay, sabah ışığı) önceden pişirilir; sahnede bu geçişler fenerin konumuna
  göre düşümlü olarak karıştırılır.
- **Yaratık (özgün yorum):** ~4 m, toprakla kaplı koyu taş deri, kaya plakaları, karnından sarkan kökler, uzun ve güçlü ön uzuvlar,
  ağır pençeler; yüzü üç derin yarıkla bölünmüş, mührü kapalı bir ağız ve göz bebeği olmayan soluk kehribar gözler.
  Konuşurken ağzı hareket etmez; yer onun sesiyle titrer.
- **Gerçek karanlık:** Mağara sahnelerinde görüntü bir ışık haritasıyla çarpılır (`postfx.js`, `cave2.js`): el fenerinin düştüğü
  yer dışında her yer karanlıktır. Hüzmede toz zerreleri, sarkıtlarda su parıltıları, mağara ağzından sızan soğuk ışık.
- **Dış mekân:** Bulutların ardında ay, ufka doğru açılan sis, alçak sis bantları, ışığa yakın yerde parlayan yağmur, su birikintileri
  ve sıçramalar, uzak şimşek. Köy: kiremit ve toprak damlı taş evler, ahşap hatıllar, tüten bacalar, rüzgârda sallanan sokak lambaları,
  minare. Taş ocağı: basamaklı kesimler, mağaraya giden paslı raylar, devrik vagon.
- **Mehmet:** 38 yaşında, kısa siyah saç, hafif sakal, koyu kahverengi mont, siyah pantolon, eski deri botlar, metal el feneri.
  Kenar (rim) ışığı, soğukta görünen hızlanan nefes buharı, korkuyla büyüyen göz bebekleri, titreyen fener hüzmesi.
- **Seslendirme:** ElevenLabs `eleven_v4`; anlatıcı "Göksel", yaratık sesi "Serdar Tekyildiz" sesinden perdesi düşürülüp alt oktav,
  yer altı uğultusu ve uzun mağara yankısıyla işlendi. Konuşma sırasında müzik ve tüm ortam sesleri kesilir.
- **Ses tasarımı:** yağmur, rüzgâr, uzak gök gürültüsü, susan köpekler, bardak titremesi, çakıl adımları, taş çatlaması, kaya düşmesi,
  dev nefes, ağır darbeler; drone, uyumsuz yaylı dokusu, ters yükselen dalgalar, kalp atışı, "braam" vuruşları, kritik anlarda sessizlik.
- **Altyazı:** ElevenLabs Scribe ile kelime düzeyinde zamanlama. Kırmızı vurgular: KIYAMET, DÂBBETÜ'L-ARZ, TOPRAK/TOPRAĞIN,
  YARATIK, KONUŞACAĞI, KAÇMAK, KAÇABİLİR, MEHMET (girişte ayrıca YERDEN, CANLIYI).

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
python3 scripts/build_timeline.py && python3 scripts/build_intro_timeline.py
node render/render_frames.cjs frames out/frames                               # film, 3240 kare
PAGE=intro.html DUR=12 node render/render_frames.cjs frames out/frames_intro  # giriş, 288 kare
scripts/build_video.sh && scripts/build_intro.sh && scripts/build_combined.sh
```
EOF
tail -1 out/render.log 2>/dev/null; ls out/frames_intro | wc -l