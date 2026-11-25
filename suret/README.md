# KONYA EREĞLİ – KAPIDAKİ SURET

2016'da Konya'nın Ereğli ilçesinde basına yansıyan paranormal iddialardan esinlenen, 120 saniyelik gerçekçi sinematik 2D
korku / psikolojik gerilim filmi (Instagram Reels, 9:16).

> **Önemli not:** Senaryo, 2016'da Konya Ereğli'de basına yansıyan paranormal iddialardan esinlenmiştir. Diyaloglar,
> varlığın gülümsemesi, hareket eden gölgeler ve bazı sahneler dramatize edilmiştir. Olayların doğaüstü bir nedene
> dayandığı kanıtlanmamıştır. Videonun başında "CANLANDIRMA" ibaresi, sonunda bu not yer alır. Gazete sayfaları
> temsilîdir; gerçek bir yayın kuruluşunun adı veya logosu kullanılmamıştır.

| Özellik | Değer |
|---|---|
| Süre | 120 sn (giriş 20 sn) |
| Çözünürlük | 1080 × 1920 (9:16), 24 FPS |
| Video | H.264 High, yuv420p, faststart, 2 geçişli (44 MB) |
| Ses | AAC 48 kHz stereo, iki geçişli loudnorm (−14 LUFS, −1.3 dBTP) |
| Altyazı | Görüntüye gömülü, kelime kelime, seslendirmeyle senkron |

Video: `out/kapidaki_suret_9x16.mp4`

## Nasıl yapıldı
- **Işın izlenmiş setler (`bake/`):** Ailenin evi (yatak odası, koridor, mutfak, salon, cephe, avlu, sokaklar) tek bir
  3B modeldir; tüm sahneler aynı modelden farklı kameralarla alınır. Numba ile yazılmış küçük bir ışın izleyici kutu,
  elipsoid, silindir, çokyüzlü ve yükseklik alanı (yorgan ve yastıklar) çizer; yumuşak gölgeler, ortam kapanması,
  dantel tülden süzülen ay ışığı, hacimsel ışık hüzmeleri ve sokak lambasının sarı ışığı ayrı katmanlar halinde pişirilir
  (lamba katmanı videoda titreyebilsin diye). Gece Ereğli'nin havadan görüntüsü de aynı yöntemle (tek katlı evler,
  çatısında güneş enerjili su ısıtıcıları olan apartmanlar, minareli cami, kavaklar, 264 sokak lambası) üretildi.
- **Yüzler (`render/face.js`):** Anatomik temel olarak MediaPipe'ın kanonik yüz ağı (Apache-2.0, `bake/third_party`)
  kullanıldı; kadın, eşi ve suret için ayrı biçim değişiklikleri, gülümseme ve ağız açılması ağ üzerinde yapılır. Yüz,
  saç (akış alanı + çizgi integral evrişimi ile tel tel), boyun ve gövde piksel piksel aydınlatılır: sahnenin ışığıyla
  aynı yönde ana ışık, sıcak/soğuk geçiş, yumuşak düşen gölgeler (burun, kaş, çene), dolgu ve kenar ışığı. Gözler,
  kaşlar, gözyaşı ve açılan ağız her karede canlı çizilir.
- **Karakterler:** Kadın (35 yaş civarı, koyu kahve uzun saç ortadan ayrık, sol yanağında ben; gece leylak rengi çiçekli
  gecelik, gündüz bordo hırka), eşi (kısa siyah saç, hafif sakal, koyu gri tişört) ve kapıdaki suret (eşinin birebir
  aynısı, biraz daha solgun). Suret yalnızca tülden süzülen sokak lambası ışığında görünür; yüzünün üstü karanlıkta kalır.
- **Seslendirme:** ElevenLabs `eleven_v4`; anlatıcı "Göksel", kadının tanıklığı "Esin". Kelime zamanlamaları Scribe ile.
- **Ses tasarımı:** soğuk rüzgâr, saat tik takları, nefesler, ahşap gıcırtıları, fısıltılar, uzak ayak sesleri, kendi
  kendine açılan kapı, bavul, araba motoru, ön kapı, gazete hışırtısı; drone, uyumsuz yaylı dokusu, yükselen ince ton,
  hızlanan kalp atışı, vuruşlar, ayrılış için hüzünlü piyano; son korkutma efektinden sonra tam sessizlik.

## Sahne zaman çizelgesi
| Sahne | Aralık |
|---|---|
| 1 Giriş: Ereğli'de gece | 00:00–00:20 |
| 2 İlk gece | 00:20–00:34,5 |
| 3 İkinci suret | 00:34,5–00:48,5 |
| 4 Bitmeyen geceler | 00:48,5–01:02,5 |
| 5 Kaçış | 01:02,5–01:16,5 |
| 6 Geri dönüş | 01:16,5–01:29,5 |
| 7 Yardım çağrısı | 01:29,5–01:41,5 |
| 8 Son sahne + HALK EFSANELERİ | 01:41,5–02:00 |

## Yeniden üretme
```bash
pip install numba                                    # setleri pişirmek için
python3 bake/facemesh.py                             # yüz ağı -> render/facemesh.js
for v in bed_door bed_door_dbl pillow_top bed_sit corridor_n kitchen_n ext_win_n corridor_dawn_back bed_dawn \
         window_day ext_front_dawn ext_front_day frontdoor_in table_n aerial; do
  python3 bake/bake_view.py $v 1.25 --final; done
python3 bake/bake_view.py bed_wide 1.6 --final; python3 bake/bake_view.py corridor_dawn 1.0 --final
python3 bake/split_tree.py && python3 bake/export_cams.py   # sallanan ağaç katmanı, kameralar
python3 scripts/build_timeline.py
DUR=120 node render/render_frames.cjs frames out/frames     # 2880 kare (~6 dk)
scripts/build_video.sh
```
