# Celepoğlu Taşımacılık – Kurumsal Reklam Filmi (60 sn)

**“Yolunuz, güvenle bizimle.”**

| Özellik | Değer |
|---|---|
| Süre | 60,0 sn |
| Çözünürlük | 3840 × 2160 (4K UHD), 16:9 (2.20:1 sinematik bantlı) |
| Kare hızı | 60 fps |
| Video | H.264 High, yuv420p, BT.709 |
| Ses | AAC 320 kb/s, 48 kHz stereo, −16 LUFS / −1 dBTP |
| Dış ses | Türkçe erkek sesi (ElevenLabs v4 · “Serdar Tekyıldız”) |
| Müzik | Bu proje için sentezlenmiş özgün müzik (telifsiz) |

## Çıktılar

- `output/celepoglu_reklam_4K_60fps.mp4` – ana teslim dosyası
- `output/celepoglu_reklam_1080p_60fps.mp4` – hızlı paylaşım / önizleme
- `output/kareler/` – sahnelerden örnek kareler

## Önemli not: bu film neyle yapıldı?

Elimizdeki tek görsel malzeme **aracın gece çekilmiş bir ön fotoğrafı** ve
**logo** idi. Film bu iki gerçek varlıktan üretildi; yapay zekâ ile insan/araç
görüntüsü *uydurulmadı*. Böylece araç modeli, plaka, Ford amblemi ve kaput logosu
her karede **birebir gerçek** ve tutarlı.

Brifteki insanlı sahneler (öğrenciler, veliler, fabrika çalışanları, VIP yolcular,
lastik kontrolü, drone gün doğumu) tek fotoğraftan gerçekçi üretilemez. Bunlar için
hazır çekim listesi ve video modeli promptları: **`YAPAY_ZEKA_VIDEO_PROMPTLARI.md`**.
Çekimler elde edildiğinde aynı kurgu, müzik, dış ses ve grafiklerle film yeniden
üretilebilir.

Fotoğraf üzerinde yapılan tek rötuş: ön camın arkasındaki üçüncü taraf firma
tabelası (Bozzetto Group) temizlenip yerine Celepoğlu logosu yerleştirildi
(`src/render.py → retouch_sign`).

## Sahne akışı

| Zaman | Sahne | Görüntü | Ekran yazısı | Ses |
|---|---|---|---|---|
| 00:00–00:07 | 1 · Güvenle başlayan bir sabah | Siyahtan açılış, sağ far yakın plan (anamorfik far parlaması), kaputtaki Celepoğlu logosuna yaklaşma + ışık süpürmesi; sıcak “gün doğumu” renk düzenlemesi | – | Piyano, kuş sesli sabah ambiyansı · “Her yolculuk, bir güven hikâyesiyle başlar.” |
| 00:07–00:18 | 2 · Öğrenci taşımacılığı | Ön camdan temiz koltuklara yatay kaydırma, ardından aracın geniş ön planı | **ÖĞRENCİ TAŞIMACILIĞI** | Kapı açılma/kapanma · dış ses |
| 00:18–00:28 | 3 · Personel taşımacılığı | Ford ızgarasından ön cama yükselen kamera, yan perspektifte kayma | **PERSONEL TAŞIMACILIĞI** | Motor sesi, yükselen yaylılar · dış ses |
| 00:28–00:38 | 4 · VIP ve özel ulaşım | Ön cam/iç mekâna itiş, far + ızgara detayı, ışık süpürmesi | **VIP VE ÖZEL ULAŞIM HİZMETLERİ** | Yumuşak geçişler · dış ses |
| 00:38–00:50 | 5 · Güven ve profesyonellik | Müziğin ölçülerine oturan 4 sert kesme: far, koltuklar, ızgara, geniş plan (gün batımı tonu) | **GÜVEN · KONFOR · KALİTE · PROFESYONELLİK** | Timpani vuruşları, orkestral yükseliş · dış ses |
| 00:50–01:00 | 6 · Kurumsal final | Aracın etrafında yavaş yay hareketi → siyaha geçiş → kırmızı/beyaz ışık izleri birleşir, logo parlayarak belirir | **YOLUNUZ, GÜVENLE BİZİMLE.** · www.celepogluturizm.com · iletisim@celepogluturizm.com · İZMİR / TİRE | Büyük çözülme akoru, logo bass vuruşu · final dış ses |

## Klasör yapısı

```
celepoglu-reklam/
├── assets/            arac_on.jpg, logo_orijinal.png, fonts/ (Saira, Montserrat – OFL)
├── audio/
│   ├── dis_ses.mp3              seçilen dış ses (tek çekim, 6 cümle)
│   ├── dis_ses_alternatif.mp3   ikinci çekim
│   ├── muzik.flac               sentezlenmiş müzik
│   ├── final_miks.flac          miks + mastering (−16 LUFS)
│   └── sfx/                     ElevenLabs ses efektleri
├── src/
│   ├── render.py      görüntü motoru (kamera, renk, efekt, tipografi, logo kartı)
│   ├── music.py       müzik sentezi (80 BPM, ölçüler kesmelere hizalı)
│   └── mix.py         dış ses yerleşimi, ducking, efektler, loudness
├── build.sh           tüm filmi baştan üretir
└── YAPAY_ZEKA_VIDEO_PROMPTLARI.md
```

## Yeniden üretmek

Gereksinimler: Python 3.10+, `numpy`, `opencv-python-headless`, `scipy`, `Pillow`, `ffmpeg`.

```bash
./build.sh            # 4K 60fps (4 çekirdekte ~20–30 dk)
./build.sh preview    # 1080p 30fps hızlı önizleme
```

Tek kare kontrolü:

```bash
python3 src/render.py --width 1920 --stills 10,30,55.5 --stills-dir /tmp/kareler
```

## Çekimleri değiştirmek

`src/render.py` içindeki `SHOTS` listesi her çekimin zamanını, kamera hareketini
(`c0` → `c1`: merkez x, merkez y, kadraj genişliği, rotasyon), renk düzenlemesini ve
efektlerini tanımlar. Gerçek ya da yapay zekâ ile üretilmiş klipler geldiğinde bu
çekimler video kaynaklarıyla değiştirilir; yazılar, geçişler, logo finali ve ses aynen
kalır.

## TV yayını için

Ulusal kanallar genelde **EBU R128 (−23 LUFS)** ister:

```bash
ffmpeg -i output/celepoglu_reklam_4K_60fps.mp4 -c:v copy \
  -af loudnorm=I=-23:TP=-1:LRA=11 -c:a aac -b:a 320k tv_teslim.mp4
```

Kanalın istediği formata (ör. 1080i50 XDCAM/ProRes) dönüştürme de ffmpeg ile
yapılabilir; teslim şartnamesini kanaldan isteyin.
