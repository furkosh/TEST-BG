# ÇARŞAMBA KARISI – 30 SANİYELİK VİRAL GİRİŞ

Ege'nin eski köylerinde (Tire, Ödemiş, Bayındır çevresi) anlatılan **Çarşamba Karısı** halk inanışına dayanan, ana
hikâyeye bağlanan 30 saniyelik sinematik korku girişi (Instagram Reels / TikTok / Shorts, 9:16).

> **Not:** Video bir halk anlatısının canlandırmasıdır. Sahneler dramatize edilmiştir; doğrulanmış gerçek olaylar olarak
> sunulmaz. Anlatım "inanılan", "anlatılan", "eski bir halk anlatısında" ifadeleriyle inanış çerçevesinde kalır ve
> köy sahnelerinde "HALK ANLATISI · CANLANDIRMA" etiketi görünür.

| Özellik | Değer |
|---|---|
| Süre | 30 sn (logo / durağan açılış yok, ilk karede çığlık) |
| Çözünürlük | 1080 × 1920 (9:16), 24 FPS |
| Video | H.264 High, yuv420p, faststart, 2 geçişli |
| Ses | AAC 48 kHz stereo, iki geçişli loudnorm (−14 LUFS, −1.5 dBTP) |
| Altyazı | Görüntüye gömülü, kelime kelime, seslendirmeyle senkron; kilit kelimeler kırmızı |

Video: `out/carsamba_karisi_giris_9x16.mp4`

## Sahne akışı
| Aralık | Sahne | Görüntü |
|---|---|---|
| 00:00–00:04 | Şok edici açılış | Gece köy sokağında çığlık atarak koşan genç kadın; arkasında sağa sola insanüstü hızla sıçrayan varlık; alçak açı; yüzüne hızlı zoom |
| 00:04–00:09 | İlk korku anı | Kapıyı yumruklar (omuz üstü), ayak sesleri birden kesilir, yavaşça döner; varlık tam arkasında belirir → korkutma, ani karartma |
| 00:09–00:15 | Efsanenin kökeni | Gün batımında köy ("TİRE · ÖDEMİŞ · BAYINDIR"), eve koşan köylüler, kapanan kapı, çekilen perdeler, sönen ışıklar, boşalan sokak |
| 00:15–00:21 | Varlığın tanıtımı | Çıplak ayaklardan yukarı tilt, ikinci açıdan bele–çeneye; yüz görünmeden kameranın önünden geçer; başlık **ÇARŞAMBA KARISI** (0,95 sn) |
| 00:21–00:26 | Merak | Kandil ışığında çıkrık başında iplik eğiren kadın; pencerede siluet; iplik kendiliğinden tutuşur; sürgü kendi kendine açılır |
| 00:26–00:30 | Geçiş | Korkmuş gözlere aşırı yakın plan; üç vuruş; tüm müzik kesilir; kapının ardından boğuk ses: “Bitmedi mi işin?”; karartma |

Kamera açısı/kompozisyon her 1–2,5 saniyede değişir; varlığın yüzü hiçbir zaman tam gösterilmez (yalnızca saç
aralığından tek bir soluk göz).

## Nasıl yapıldı (Kapıdaki Suret ile aynı teknikler)
- **Işın izlenmiş setler (`bake/`):** Numba ile yazılmış ışın izleyici; Arnavut kaldırımlı (Voronoi taş dokusu) dar
  Ege sokağı, cumbalı iki katlı köy evleri, eski sokak feneri, çınar ve minare; gün batımında köyün tepeden görünümü;
  köy odası (kireç badanalı duvar, kirişli tavan, sedir ve kilim, kandil, demir parmaklıklı pencere, tahta kapı).
  Ay ışığı, fener ve kandil ayrı katmanlarda pişirilir (titreyebilsinler diye); gökyüzü alfa kanalıyla ayrılır.
- **Yüzler ve bedenler (`render/face.js`):** MediaPipe kanonik yüz ağı (Apache-2.0) üzerine piksel piksel aydınlatma,
  çizgi integral evrişimiyle tel tel saç. Genç kadın: kestane uzun saç, basma entari ve yelek. Çarşamba Karısı: kül
  rengi ten, yüzü örten dağınık kır-siyah saç perdesi (göz ve ağız hizasında aralık), yırtık keten giysi, çıplak ayak.
- **Işık rigleri:** ay ışığı + sıcak fener kenar ışığı, kandil (alttan sıcak) + pencereden soğuk ay, varlık için sert
  üst ışık. Gece sahnelerinde mavi ton, bloom, vinyet, film greni; hız izi (ghost trail), zoom-blur, glitch, flaş.
- **Seslendirme:** ElevenLabs `eleven_v4` (anlatıcı "Göksel", kapıdaki ses "Esin"); 30 sn'ye sığdırmak için iç
  duraklar kısaltıldı ve perde korunarak %10–21 hızlandırıldı (rubberband). Kelime zamanlamaları Scribe ile.
  Kapıdaki ses: alçak geçiren filtre, kutu rezonansı, hafif pes perde, kısa oda yankısı.
- **Ses tasarımı (ElevenLabs SFX + sentez):** çığlık, kaldırımda koşu, sıçrayan varlığın hışırtısı, kapı yumruklama,
  aniden kesilen ayak sesleri, nefes tutma, hızlanan kalp atışı, fısıltılar, köy akşamı, rüzgâr, çıkrık gıcırtısı,
  ipliğin tutuşması, sürgü, üç kuru vuruş; drone, uyumsuz küme, braam vuruşları, yükselen ince ton; karartmada ve
  ilk vuruştan itibaren müziğin tamamen kesildiği sessizlikler.

## Yeniden üretme
```bash
pip install numba
python3 bake/facemesh.py                                   # yüz ağı -> render/facemesh.js
for v in street_run door_pov creature_low dusk_street village_sunset room_spin room_door; do
  (cd bake && python3 bake_view.py $v 1.25 --final); done
(cd bake && python3 export_cams.py)                       # kameralar + sokak düzeni (kapılar, pencereler)
python3 scripts/process_vo.py                              # duraklar, hız, kapı ardı ses -> audio/build, data/words.json
python3 scripts/build_timeline.py
DUR=30 node render/render_frames.cjs frames out/frames 0 720 4
scripts/build_video.sh
```
