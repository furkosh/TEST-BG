# Celepoğlu Taşımacılık – Kurumsal Reklam Filmi (60 sn)

Bu klasör, Celepoğlu Taşımacılık reklam filminin **tamamen kodla üretilmiş** görüntü, animasyon ve ses projesidir.
Film, senaryodaki 6 sahneyi, seslendirmeyi, ekran yazılarını ve final logo ekranını birebir zamanlamayla içerir.

| | |
|---|---|
| Süre | 60 sn |
| Çıktı | 3840×2160 (4K UHD), 16:9, 60 FPS, H.264 + AAC 320 kbps |
| Render | 1920×1080 (Full HD) @ 60 FPS (yazılımsal GPU) → 4K'ya lanczos + keskinleştirme ile ölçekleme |
| Görsel stil | 3B animasyon (three.js): fiziksel tabanlı malzemeler, yumuşak gölgeler, atmosferik gökyüzü ve bulutlar, alan derinliği (bokeh), bloom, lens flare, renk düzenleme, film greni |
| Ses | Türkçe erkek seslendirme (ElevenLabs, "Muhammet Yolcu – Derin, Sakin ve Tok"), prosedürel orkestral müzik, ses efektleri |

## Önemli notlar

* **Fotogerçekçilik:** Bu ortamda gerçek kamera çekimi ya da fotogerçekçi video üreten bir model yok. Film,
  stilize 3B animasyon olarak üretildi; insanlar yüzsüz, sade figürlerdir (bozuk yüz/parmak sorunu olmaması için bilinçli tercih).
  Ulusal TV kalitesinde fotogerçekçi sürüm için gerçek çekim ya da bir video üretim modeli gerekir; bu proje o çekimler için
  birebir zamanlanmış bir *animatik / kurgu referansı* olarak da kullanılabilir.
* **Logo:** Firmanın kendi logosu kullanılır (`assets/logo_orijinal.png`). `assets/logo_hazirla.py` iki sürüm üretir:
  koyu zeminler ve final ekranı için orijinal renkler (`logo_koyu_zemin.png`), beyaz araç gövdesinde okunabilmesi için
  "CELEPOĞLU" harfleri koyu grafit tonda (`logo_acik_zemin.png`). Logo dosyası değişirse betik yeniden çalıştırılır; araç
  kaplaması, kaput, arka kapı, VIP koltuk başlıkları, kokpit ekranı ve final ekranı otomatik güncellenir.
* **Araç:** Beyaz, yüksek tavanlı 19+1 minibüs modeli prosedürel olarak modellendi. Marka hakları nedeniyle ön ızgaradaki amblem
  yazısız mavi oval olarak bırakıldı; plaka yerine "CELEPOĞLU" yazılı plaka kullanıldı.
* İletişim bilgileri (web sitesi, e-posta, İzmir / Tire) senaryodan alınmıştır.

## Sahne akışı

| Zaman | Sahne | Ekran yazısı |
|---|---|---|
| 00:00–00:07 | Tire üzerinde gün doğumu (drone), minibüsün farlarına / kaput logosuna yaklaşma | – |
| 00:07–00:18 | Servis durağı: öğrenciler ve veliler, minibüs yanaşır, kapı açılır, rehber personel, el sallayan anne, kemerli öğrenciler (iç mekân) | ÖĞRENCİ TAŞIMACILIĞI |
| 00:18–00:28 | Tire OSB: işçiler servise biner, kuşbakışı takip, yan logoya kilitli takip çekimi | PERSONEL TAŞIMACILIĞI |
| 00:28–00:38 | Gün batımında davet mekânı ve kırmızı halı, VIP iç mekân, zeytinlikler arasında kıvrımlı yol | VIP VE ÖZEL ULAŞIM HİZMETLERİ |
| 00:38–00:50 | Lastik kontrolü, far, gösterge paneli, emniyet kemeri, gün batımında takip çekimleri | GÜVEN · KONFOR · KALİTE · PROFESYONELLİK |
| 00:50–01:00 | Park halindeki araç etrafında 180° kamera dönüşü, siyaha geçiş, ışık efektli logo, slogan ve iletişim | YOLUNUZ, GÜVENLE BİZİMLE. |

## Klasör yapısı

```
src/film.js      sahneler, kamera hareketleri, zaman çizelgesi
src/van.js       minibüs modeli (kaplama, farlar, sürgülü kapı, tekerlek dönüşü)
src/world.js     Tire şehir merkezi, OSB, davet mekânı, zeytinlik yolu, gün batımı yolu
src/people.js    figürler ve yürüme / el sallama / çömelme / oturma animasyonları
src/interior.js  yolcu kabini (öğrenci / VIP), kokpit, emniyet kemeri
src/overlay.js   ekran yazıları ve final logo ekranı
src/engine.js    renderer, gökyüzü, ışık, post-prodüksiyon (bloom, lens flare, renk)
audio/make_audio.py   seslendirme kurgusu + müzik + efektler + ducking + limitleyici
audio/src/       seslendirme ve ses efekti kaynakları (ElevenLabs)
```

## Yeniden üretme

```bash
npm install                 # three.js + yazı tipleri (+ playwright)
npm run preview             # out/ altına birkaç önizleme karesi
node src/render.js out/frames 1600 0 1   # 3600 kare (paralel: işçi no / işçi sayısı)
python3 audio/make_audio.py # audio/mix_raw.wav
bash assemble.sh out/frames # out/…_4K_60fps.mp4 ve …_1080p_60fps.mp4
```

Ses seviyesi web için −14 LUFS'tur. TV yayını (EBU R128 / −23 LUFS) için `assemble.sh` içindeki `AF` değerini `volume=-9.9dB` yapın.
