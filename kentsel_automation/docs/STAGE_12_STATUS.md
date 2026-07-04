# ASAMA 12 Teknik Durum

## SharingPayment ve OfferDataPackage

Tamamlandi.

Bu asama, unit layout sonucunu paylasim ve teklif hazirligi katmanina baglar. Sistem artik her engine run icinde en yuksek fit skoruna sahip daire dagilimi uzerinden uc farkli mal sahibi/muteahhit paylasim senaryosu uretir, oda tiplerine gore allocation satirlarini saklar ve teklif PDF renderer icin ilk offer data package taslagini hazirlar.

## Eklenen Tablolar

- `sharing_payment_options`
- `sharing_unit_allocations`
- `offer_data_packages`

## Dogrulanan Sayilar

- Sharing payment secenegi: 9
- Sharing unit allocation: 54
- Offer data package: 3

Seed import sirasinda 3 prototip input proje icin her run:

- 3 adet paylasim secenegi
- 18 adet allocation satiri
- 1 adet offer data package

uretir.

## SharingPayment Motoru

Motor su girdileri kullanir:

- en iyi `unit_layout_options` secenegi
- `unit_mix_options` oda tipi/adet/alan satirlari
- `company_sharing_patterns` eski teklif paylasim oruntuleri
- `existing_area_inputs` mevcut alan sinyali
- proposal/CAD/company datasetinden mevcut bagimsiz bolum sinyalleri

Uretilen uc strateji:

1. `dataset_pattern`: parselde acik oruntu varsa onu, yoksa firma median muteahhit payini kullanir.
2. `owner_protection`: muteahhit payini dataset hedefinin altina cekerek mal sahibi korumali senaryo uretir.
3. `contractor_feasibility`: muteahhit payini yukari cekerek fizibilite senaryosu uretir.

Her secenek icin:

- mal sahibi birim adedi
- muteahhit birim adedi
- muteahhit pay yuzdesi
- mal sahibi alan tahmini
- muteahhit alan tahmini
- mevcut alan karsilastirmasi
- katilim payi prototip tahmini
- fairness skoru
- feasibility skoru
- offer ready skoru
- review bulgulari

saklanir.

## OfferDataPackage

Her run icin en yuksek `offer_ready_score` degerine sahip paylasim secenegi secilir ve `offer_data_packages` tablosuna teklif renderer girdisi olarak yazilir.

Paket su alanlari icerir:

- secilen layout ozeti
- secilen paylasim ozeti
- katilim payi tahmini
- allocation satirlari
- review bulgulari
- renderer hedefleri

Bu paket henuz PDF uretmez; ASAMA 13 kapsaminda PDF/teklif renderer motoru bu paketi kullanacaktir.

## Backend Entegrasyonu

Eklenen endpointler:

- `GET /api/sharing-payment-options?project_key=&run_key=&layout_option_key=&strategy_key=&q=&limit=&offset=`
- `GET /api/sharing-payment-options/{sharing_key}`
- `GET /api/sharing-unit-allocations?project_key=&run_key=&sharing_key=&role=&room_mix=&q=&limit=&offset=`
- `GET /api/offer-data-packages?project_key=&run_key=&package_status=&q=&limit=&offset=`
- `GET /api/offer-data-packages/{package_key}`

Guncellenen endpointler:

- `GET /api/summary`
- `GET /api/parcels/{parcel_key}`
- `GET /api/input-projects/{project_key}`
- `GET /api/engine-runs/{run_key}`

## Arayuz Entegrasyonu

Parsel detay ekranindaki `Otomasyon Girdisi ve Run` bolumu artik sunlari da gosterir:

- paylasim ve katilim payi secenekleri
- secili paylasim allocation tablosu
- offer data package durumu
- run ozetinde mal sahibi/muteahhit adetleri ve offer skoru

## Sonraki Kod Asamasi

ASAMA 13 icin hedef `OfferRenderer` prototipi:

1. `offer_data_packages` kaydini branded teklif dokumanina cevirmek.
2. Paylasim tablosu, katilim payi ozeti ve review notlarini PDF/HTML taslagina yerlestirmek.
3. Eksik degerlerde review gate uretmek.
4. Teklif ciktisini dosya ve API kaydi olarak saklamak.
5. UI'da teklif taslagini indirilebilir/onaylanabilir hale getirmek.
