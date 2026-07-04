# AŞAMA 3 Teknik Durum

## Human Review Queue

Tamamlandı.

Canlı arayüz:

```text
http://127.0.0.1:8765/app
```

Eklenen dosyalar:

- `kentsel_automation/frontend/index.html`
- `kentsel_automation/frontend/styles.css`
- `kentsel_automation/frontend/app.js`

Backend tarafında `/app` statik servis desteği eklendi.

## Arayüz Kapsamı

- Genel metrik şeridi
- Açık uyarı kuyruğu
- Durum, seviye ve metin arama filtreleri
- Seçilen uyarıya bağlı ada-parsel detay paneli
- CAD özeti
- Excel eski metraj özeti
- Teklif PDF özeti
- Kaynak dosya listesi
- Uyarı durum güncelleme paneli
- Ada-parsel arama paneli

## Doğrulama

Test edilen akışlar:

- `/app` HTML yükleniyor.
- `/app/styles.css` ve `/app/app.js` servis ediliyor.
- API metrikleri arayüze geliyor.
- Uyarı listesi 25 açık uyarı ile yükleniyor.
- Uyarı seçilince ada-parsel detayı doluyor.
- Uyarı durumu UI üzerinden `reviewing` yapılıp tekrar `open` durumuna alınabiliyor.
- Masaüstü görünümde yatay taşma yok.
- Mobil görünümde yatay taşma yok.
- Browser console hata kaydı yok.

## Sonraki Kod Aşaması

AŞAMA 4 için hedef `ProposalPDFExtractor v2`:

- PDF metin akışını daha güvenilir ayrıştırma
- Hak dağılımını satır/senaryo bazlı çıkarma
- Kira desteği, katılım payı, otopark ve özel şartları ayrı alanlara ayırma
- Başlık-gövde ada/parsel uyumsuzluklarını otomatik risk olarak yükseltme
