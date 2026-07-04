# ASAMA 11 Teknik Durum

## CorePlacement ve UnitLayout

Tamamlandi.

Bu asama, otomasyonu yalniz yapilasma zarfi ureten prototipten, ilk mimari program taslagini ureten prototipe tasir. Sistem artik her engine run icinde building envelope sonucundan cekirdek yerlesimi varsayimi uretir ve firma datasetindeki konut oruntulerini kullanarak uc farkli daire dagilimi alternatifi olusturur.

## Eklenen Tablolar

- `core_placement_results`
- `unit_layout_options`
- `unit_mix_options`

## Dogrulanan Sayilar

- Core placement sonucu: 3
- Unit layout secenegi: 9
- Unit mix satiri: 27

Seed import sirasinda 3 prototip input proje icin her run:

- 1 adet building envelope
- 1 adet core placement
- 3 adet unit layout secenegi
- 9 adet unit mix satiri

uretir.

## CorePlacement Motoru

Motor su girdileri kullanir:

- tipik kat alani
- tahmini kat sayisi
- toplam yapilabilir alan
- building envelope bulgulari

Motor su sonuclari uretir:

- cekirdek tipi
- cekirdek alani
- sirkulasyon alani
- net tipik kat alani
- core verimlilik yuzdesi
- islak hacim/aks hizalama skoru
- review bulgulari

Bu prototip mimari avan proje yerine paylasim ve layout motoruna girdi ureten deterministik bir hesap katmanidir.

## UnitLayout Motoru

Motor firma datasetindeki guclu konut oruntulerini kullanir:

- `1+1`
- `2+1`
- `3+1`
- `2+0`
- `4+1`

Uretilen uc strateji:

1. `balanced_family_mix`: dengeli aile karmasi
2. `compact_high_count`: kompakt yuksek adet
3. `family_large_units`: buyuk aile agirligi

Her secenek icin:

- hedef birim adedi
- uretilen birim adedi
- ortalama birim alani
- net/gross konut alani
- alan sapmasi
- fit skoru
- review durumu
- oda tiplerine gore unit mix

saklanir.

## Backend Entegrasyonu

Eklenen endpointler:

- `GET /api/core-placement-results?project_key=&run_key=&core_type=&q=&limit=&offset=`
- `GET /api/unit-layout-options?project_key=&run_key=&strategy_key=&q=&limit=&offset=`
- `GET /api/unit-layout-options/{option_key}`
- `GET /api/unit-mix-options?project_key=&run_key=&option_key=&room_mix=&q=&limit=&offset=`

Guncellenen endpointler:

- `GET /api/summary`
- `GET /api/parcels/{parcel_key}`
- `GET /api/input-projects/{project_key}`
- `GET /api/engine-runs/{run_key}`

## Arayuz Entegrasyonu

Parsel detay ekranindaki `Otomasyon Girdisi ve Run` bolumu artik sunlari gosterir:

- input proje tablosu
- building envelope sonucu
- core placement sonucu
- unit layout secenekleri
- secili layout birim karmasi
- son engine run kayitlari
- motor adimlari

## Sonraki Kod Asamasi

ASAMA 12 tamamlandi ve bu hedefler uygulamaya baglandi:

1. Secilen unit layout secenegini mal sahibi/muteahhit paylasim motoruna girdi yapmak.
2. Firma paylasim oruntulerinden olasi hak dagilimi adaylari uretmek.
3. Mevcut metraj ve mevcut bagimsiz bolum sinyallerini katilim payi hesabina baglamak.
4. Paylasim seceneklerini risk, esitlik ve teklif hazirligi skoruyla siralamak.
5. Teklif PDF renderer icin teklif veri paketini hazirlamak.

Guncel detay icin `docs/STAGE_12_STATUS.md` dosyasina bak.
