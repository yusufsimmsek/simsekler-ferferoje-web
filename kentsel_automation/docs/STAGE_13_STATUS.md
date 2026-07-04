# ASAMA 13 Teknik Durum

## FloorPlan Sistemi

Tamamlandi.

Bu asama, unit layout ve core placement sonucunu kat plan prototipine baglar. Sistem artik her engine run icinde layout seceneklerinden tipik kat planlari uretir, cekirdek/dolasim/daire zonlarini yuzdelik koordinatlarla saklar ve UI tarafinda cizilebilir bir plan kanvasina donusturur.

## Eklenen Tablolar

- `floor_plan_options`
- `floor_plan_zones`
- `floor_plan_findings`

## Dogrulanan Sayilar

- Floor plan secenegi: 9
- Floor plan zone: 36
- Floor plan finding: 6
- Automation module: 9

Seed import sirasinda 3 prototip input proje icin her run:

- 3 adet kat plan secenegi
- cekirdek, dolasim ve daire zonlari
- fit/gun isigi/uygulanabilirlik/islak hacim skorlarini

uretir.

## Backend Entegrasyonu

Eklenen endpointler:

- `GET /api/floor-plan-options?project_key=&run_key=&layout_option_key=&plan_type=&q=&limit=&offset=`
- `GET /api/floor-plan-options/{plan_key}`
- `GET /api/floor-plan-zones?project_key=&run_key=&plan_key=&zone_type=&q=&limit=&offset=`
- `GET /api/floor-plan-findings?project_key=&run_key=&plan_key=&severity=&code=&q=&limit=&offset=`

Guncellenen endpointler:

- `GET /api/summary`
- `GET /api/parcels/{parcel_key}`
- `GET /api/input-projects/{project_key}`
- `GET /api/engine-runs/{run_key}`

## Arayuz Entegrasyonu

Yeni `Kat Plan` ekrani:

- en yuksek fit skoruna sahip plan secenegini secer
- backend zone koordinatlarini plan kanvasinda cizer
- brut/net/konut/cekirdek/dolasim metriklerini gosterir
- fit, gun isigi, uygulanabilirlik ve islak hacim skorlarini gosterir
- plan seceneklerini tablo olarak listeler

## Sonraki Kod Asamasi

ASAMA 14 icin hedef `OfferRenderer` prototipi:

1. `offer_data_packages` ve `floor_plan_options` kayitlarini teklif dokumanina baglama.
2. Kat plan semasini HTML/PDF teklif taslaginda gorsellestirme.
3. Plan bulgularini review gate olarak teklif paketine ekleme.
4. Paylasim tablosu ve kat planini birlikte indirilebilir ciktida sunma.
