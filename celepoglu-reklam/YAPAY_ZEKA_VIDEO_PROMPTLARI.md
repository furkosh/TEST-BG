# Celepoğlu Taşımacılık – Fotogerçekçi Çekimler İçin Yapay Zekâ Video Promptları

Bu klasördeki film, elinizdeki **gerçek araç fotoğrafı** ve **logo** ile kurgulandı.
Brifte istenen insanlı sahneler (öğrenciler, veliler, fabrika çalışanları, VIP yolcular,
sürücünün lastik kontrolü, drone ile şehir üstü gün doğumu) tek bir fotoğraftan
üretilemez. Bu sahneler için iki yol var:

1. **Gerçek çekim (önerilen):** Aşağıdaki çekim listesi bir prodüksiyon ekibine
   doğrudan çekim planı olarak verilebilir.
2. **Video üretim modeli:** Google Veo 3, OpenAI Sora 2, Kling 2.x, Runway Gen-4 gibi
   modellerle her çekimi ayrı ayrı üretip `src/render.py` içindeki ilgili çekimin yerine
   koyabilirsiniz (bkz. README → “Çekimleri değiştirmek”).

## Tutarlılık kuralları (her prompta uygulayın)

- **Referans görsel kullanın (image-to-video / ingredients):** `assets/arac_on.jpg`
  aracın kendisi, `assets/logo_orijinal.png` logo. Model izin veriyorsa ikisini de her
  çekimde referans olarak yükleyin.
- Araç tanımını **her promptta aynen** tekrarlayın (aşağıdaki “ARAÇ” bloğu).
- Logo yazısını modele yazdırmaya çalışmayın: modeller harfleri bozabilir. Logoyu
  aracın yan yüzeyine sonradan **kurguda yerleştirin** (motion tracking) ya da gerçek
  araçta zaten bulunan logolu çekimleri kullanın.
- Plaka ve ön camdaki tabelalar: Promptta “no readable text other than the logo”
  ifadesini koruyun; kurgu aşamasında gerçek plakayı/logoyu kullanın.
- 16:9, 4K (3840×2160), 24 veya 60 fps üretin; kısa (5–8 sn) klipler üretip kurguda
  birleştirin. Her klip için 3–4 varyasyon alıp en doğal olanı seçin.

**ARAÇ bloğu (kopyala-yapıştır):**
> a white 2024 Ford Transit high-roof 19+1 seat passenger minibus, chrome horizontal
> grille with the blue oval Ford emblem, black hood deflector, clean glossy white paint,
> tinted side windows, blue ambient interior lighting, a small red-white-black company
> logo sticker on the front hood

**Negatif prompt (destekleyen modellerde):**
> cartoon, CGI look, animation, plastic skin, deformed hands, extra fingers, warped
> faces, distorted wheels, melting vehicle, wrong brand logo, gibberish text, random
> letters on vehicle, watermark, low resolution, jitter, flicker, unrealistic physics

---

## SAHNE 1 – Güvenle Başlayan Bir Sabah (00:00–00:07)

**1.1 Drone – Tire üzerinde gün doğumu (0:00–0:03)**
> Cinematic aerial drone shot at sunrise over the small Aegean town of Tire, İzmir,
> Turkey: low-rise houses with terracotta roofs, minarets, olive groves and mountains
> behind, golden sun rising over the ridge, light morning haze, slow forward dolly,
> photorealistic, shot on ARRI Alexa 35 with DJI Inspire 3, natural color, 4K.

**1.2 Araç – temiz caddede ilerleme (0:03–0:05)**
> Low tracking shot from the front-left of [ARAÇ] driving slowly on a clean sunlit
> street in Tire at sunrise, warm golden light raking across the white body, realistic
> suspension and tyre rotation, subtle lens flare, shallow depth of field, 50 mm
> anamorphic look, photorealistic car commercial.

**1.3 Detay – farlar ve amblem (0:05–0:07)**
> Extreme close-up slow push-in on the headlight and chrome grille with the Ford oval
> emblem of [ARAÇ], morning sun reflecting on the paint, slow motion 120 fps feel,
> premium automotive commercial lighting, photorealistic.

## SAHNE 2 – Öğrenci Taşımacılığı (00:07–00:18)

**2.1 Bekleyen öğrenciler (0:07–0:10)**
> Turkish primary school children aged 8–11 with backpacks waiting with their parents
> on a clean sidewalk in front of a school in the morning, natural relaxed poses,
> realistic faces and hands, soft warm morning light, documentary-style handheld,
> photorealistic, 35 mm.

**2.2 Servis yanaşıyor (0:10–0:12)**
> [ARAÇ] pulls up smoothly and stops at the curb next to the waiting children, the
> sliding side door opens, physically accurate braking, camera at child eye level,
> photorealistic.

**2.3 Rehber personel karşılıyor, öğrenciler biniyor (0:12–0:15)**
> A friendly female school bus attendant in a neat navy uniform greets children at the
> open sliding door of [ARAÇ]; children step in one by one holding the handrail; natural
> smiles, realistic hands and walking, photorealistic.

**2.4 Anne el sallıyor (0:15–0:16)**
> A mother in her thirties on the sidewalk smiles and waves goodbye to her daughter
> through the minibus window, warm emotional moment, shallow depth of field,
> photorealistic.

**2.5 İç mekân – kemerler takılı (0:16–0:18)**
> Interior of [ARAÇ]: clean upholstered seats in rows, happy children seated with seat
> belts fastened, soft daylight through tinted windows, slow dolly along the aisle,
> photorealistic.

Ekran yazısı: **ÖĞRENCİ TAŞIMACILIĞI** (kurguda eklenir, filmde hazır)

## SAHNE 3 – Personel Taşımacılığı (00:18–00:28)

**3.1 Sanayi bölgesi (0:18–0:21)**
> Modern organized industrial zone in Tire, İzmir at early morning: clean factory
> buildings, wide roads, workers in hi-vis vests and work clothes walking to a white
> minibus, photorealistic, cinematic wide shot.

**3.2 Çalışanlar biniyor (0:21–0:24)**
> Factory workers in work uniforms board [ARAÇ] through the sliding door, natural
> conversation and movement, realistic faces and hands, morning light, photorealistic.

**3.3 Drone takip (0:24–0:26)**
> Top-down drone shot following [ARAÇ] driving toward a factory gate on a clean
> industrial road, smooth motion, realistic shadows, photorealistic.

**3.4 Yan yüzey – logo (0:26–0:28)**
> Side tracking shot of [ARAÇ] passing the camera, clean flat white side panel for a
> large company logo (logo added in post), photorealistic.
> *(Logoyu kurguda yan panele motion-track ile yerleştirin.)*

Ekran yazısı: **PERSONEL TAŞIMACILIĞI**

## SAHNE 4 – VIP ve Özel Taşımacılık (00:28–00:38)

**4.1 Şık yolcular (0:28–0:31)**
> Elegantly dressed adults (business attire and evening wear) walk toward [ARAÇ] in
> front of a boutique hotel at golden hour; a professional male chauffeur in a dark
> suit opens the door and greets them politely, photorealistic.

**4.2 Premium iç mekân (0:31–0:34)**
> Slow gimbal shot inside [ARAÇ]: spotless premium leather-look seats, ambient blue
> LED lighting, curtains, clean floor, soft focus transitions, luxury automotive
> commercial style, photorealistic.

**4.3 Doğada yolculuk (0:34–0:38)**
> [ARAÇ] driving on a winding asphalt road through olive groves and green hills near
> Tire at golden hour, drone tracking from the side, realistic motion, photorealistic.

Ekran yazısı: **VIP VE ÖZEL ULAŞIM HİZMETLERİ**

## SAHNE 5 – Güven ve Profesyonellik (00:38–00:50)

**5.1 Lastik kontrolü (0:38–0:40)**
> A professional middle-aged Turkish male driver in a clean uniform crouches and checks
> the tyre and wheel of [ARAÇ], realistic hands, focused expression, photorealistic.

**5.2 Detaylar (0:40–0:44)** — her biri ~1 sn:
> macro shots: headlight turning on; steering wheel with hands at ten-and-two;
> illuminated dashboard gauges; seat belt buckle clicking shut; clean seat row.

**5.3 Gün batımında yol (0:44–0:50)**
> [ARAÇ] driving on a wide open road at sunset, cinematic tracking shots from the
> front, side and rear, long shadows, warm golden backlight, slow motion feel,
> photorealistic.

Ekran yazıları sırayla: **GÜVEN · KONFOR · KALİTE · PROFESYONELLİK**

## SAHNE 6 – Kurumsal Final (00:50–01:00)

**6.1 180° dönüş (0:50–0:54)**
> [ARAÇ] parked on a wide clean road at sunset, camera orbits slowly 180 degrees around
> the vehicle at waist height, golden rim light on the white body, photorealistic.

**6.2 Logo kartı (0:54–1:00)** — filmdeki hazır logo animasyonunu kullanın.

---

### Seslendirme metni (kelimesi kelimesine – filmde hazır)

| Sahne | Metin |
|---|---|
| 1 | Her yolculuk, bir güven hikâyesiyle başlar. |
| 2 | Kimi zaman geleceğimiz olan çocuklarımızı okullarına, ailelerinin bize duyduğu güvenle ulaştırıyoruz. |
| 3 | Kimi zaman emeğiyle geleceği inşa eden çalışanlarımızı iş yerlerine, zamanında ve konforla ulaştırıyoruz. |
| 4 | Özel yolculuklarınızda ve organizasyonlarınızda, konforu ve profesyonelliği bir araya getiriyoruz. |
| 5 | Modern araçlarımız, deneyimli sürücülerimiz ve profesyonel hizmet anlayışımızla her yolculuğunuzda yanınızdayız. Çünkü biz, sadece yolcu değil, sorumluluk taşıyoruz. |
| 6 | Celepoğlu Taşımacılık. Güvenle başlayan, kaliteyle devam eden yolculuklar. Yolunuz, güvenle bizimle. |
