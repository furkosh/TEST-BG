# YALMAVUZ — YEDİ BAŞLI KÂBUS

Türk mitolojisindeki Yalmavuz (Yelmoğuz) anlatılarından esinlenen, kurgusal bir 2D korku kısa filmi.
Instagram Reels ve TikTok için dikey 9:16 formatında hazırlandı. Anlatım birinci tekil şahıs, kamera her zaman üçüncü şahıs.

| Özellik | Değer |
|---|---|
| Süre | 135,0 sn (120 sn hikâye + 15 sn kapanış) |
| Çözünürlük | 1080 × 1920 (9:16) |
| Kare hızı | 24 FPS (3240 kare) |
| Video | H.264 High, yuv420p, faststart, ~2,8 Mbit/s (2 geçişli, 48,3 MiB) |
| Ses | AAC 48 kHz stereo, ≈ −14,8 LUFS / −0,7 dBTP (ölçülen) |
| Altyazı | Görüntüye gömülü, kelime kelime, seslendirmeyle senkron |

Video: `out/yalmavuz_yedi_basli_kabus_9x16.mp4`

## Nasıl yapıldı

- **Görüntü:** `render/` altındaki HTML Canvas kodu. Orman tek bir 3B dünya (`forest.js`): ağaçlar, yer örtüsü, sis, ay ışığı
  ve hareketli fener ışığı (ağaç gövdelerine düşen sıcak ışık, yere düşen gölgeler). Her çekim bu dünyaya bir kamera yerleştirir;
  paralaks, alçak açılar, kuş bakışı ve karakterin etrafında dönen kamera buradan gelir.
- **Karakterler:** Anlatıcı (`figure.js` tam boy, `man.js` + `sets.js` yakın plan): 40'lı yaşlarda, hafif sakallı, eski kahverengi palto,
  koyu pantolon, deri çizme, gaz feneri. Yalmavuz (`yalmavuz.js`): ~3 m, solgun kırışık deri, uzun kollar ve tırnaklar,
  omuzlardan yükselen yedi boyun ve her biri farklı yedi yüz (anne, çocuk, yaşlı adam, sarkık çene, dikişli ağız, sırıtan, ağlayan),
  uzun dağınık siyah saçlar. Başlar birbirinden bağımsız hareket eder.
- **Seslendirme:** ElevenLabs `eleven_v4`, anlatıcı "Göksel" (derin erkek sesi). Annenin sesi ayrı bir kadın sesiyle üretildi ve
  `scripts/mix_audio.py` içinde yaratığın taklidine dönüştürüldü: ilk seslenişte doğal ve uzak, sonra katmanlı,
  yaratık göründükten sonra perdesi kaydırılmış, distorsiyonlu ve fısıltılı.
- **Altyazı zamanlaması:** Her parça ElevenLabs Scribe ile kelime düzeyinde zamanlandı (`data/words_raw.json`),
  `scripts/build_timeline.py` ile zaman çizelgesine yerleştirildi. Ekranda tek kelime, korku vurgulu kelimeler kırmızı büyük harf.
- **Ses tasarımı:** Yönlü fısıltılar (sol/sağ/her yönden), orman ambiyansı, ayak sesleri, koşu, devasa adımlar, kapı, sürgü,
  üç vuruş, tavan gıcırtısı; sentez drone, kalp atışı ve "braam" vuruşları. Kritik anlarda müzik tamamen kesilir
  (sesler sustuğunda, tavandan sonra kararmada).

## Sahne zaman çizelgesi

| Sahne | Aralık | İçerik |
|---|---|---|
| 1 | 00:00–00:10 | Siyah ekran ve fısıltılar, sisli orman, ağaçlar arasında dev gölge, yedi çift göz, kameraya dönen baş |
| 2 | 00:10–00:23 | Kuş bakışı orman, fenerli adam, kararan gökyüzü, yolu kontrol eder, arkasında geçen gölge |
| 3 | 00:23–00:38 | "Oğlum… Buraya gel…", yüz yakın planı, ağaçlarda arayan fener, uzaktaki ağacın ardında siyah saçlar |
| 4 | 00:38–00:52 | Hızla döner, fener titrer, soldan çocuk, sağdan yaşlı sesi, kamera etrafında döner, sesler bir anda susar |
| 5 | 00:52–01:10 | Ağacın arkasından kemikli el, devasa beden, ilk baş, omuzlarda yükselen diğer başlar, hepsi ona döner, "Neden kaçıyorsun, oğlum?" |
| 6 | 01:10–01:29 | Yandan takip eden koşu, yüze çarpan dallar, sallanan ağaçlar, paralel koşan gölge, düşüş, kayan fener, yaklaşan yedi baş, kulübe |
| 7 | 01:29–01:44 | Kapı çarpılır ve sürgülenir, dışarıdan kapıya yaklaşma, üç vuruş, köşede ağzını kapatan adam, tavan gıcırtısı, "Kapıyı açmana gerek yok…" |
| 8 | 01:44–01:59 | Korku dolu gözler, yukarı bakış, tavandan sarkan yedi yüz, kesme; yıllar sonra karanlık oda, pencerede yedi çift solgun göz |
| 9 | 01:59–02:15 | Karanlık ormanda ilerleyen kamera, dev gölge, kameraya tek tek dönen yedi baş, kararma, kırmızı "YALMAVUZ", "Buraya gel…" |

## Yeniden üretme

```bash
python3 scripts/build_timeline.py                 # zaman çizelgesi + render/timeline.js
node render/render_frames.cjs frames out/frames   # 3240 kare (4 paralel sekme)
scripts/build_video.sh                            # ses miksi + loudnorm + H.264/AAC mp4
```

Tek kare önizleme: `node render/render_frames.cjs stills /tmp/kareler 8.3 58.5 108.2`

Gereksinimler: Node + Playwright (Chromium), Python 3 + numpy + scipy, ffmpeg, Inter fontu.

Bu eser, Türk mitolojisinden esinlenen kurgusal bir uyarlamadır.
