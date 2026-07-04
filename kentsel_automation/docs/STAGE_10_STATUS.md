# ASAMA 10 Teknik Durum

## InputProject ve BuildingEnvelope

Tamamlandi.

Bu asama, otomasyonu eski dosya inceleme katmanindan yeni proje girdisi calistiran ilk motor katmanina tasir. Sistem artik imar durumu ve mevcut metraj girdisini `input_project` olarak saklayabilir, bu girdi uzerinden otomasyon run gecmisi olusturabilir ve ilk deterministik motor olan `building_envelope` sonucunu uretebilir.

## Eklenen Tablolar

- `input_projects`
- `zoning_inputs`
- `existing_area_inputs`
- `engine_runs`
- `engine_run_steps`
- `building_envelope_results`

## Dogrulanan Sayilar

- Input proje: 3
- Imar girdisi: 3
- Mevcut metraj girdisi: 3
- Engine run: 3
- Engine run adimi: 24
- Building envelope sonucu: 3

Seed import sirasinda 3 prototip input proje olusturulur:

- `INPUT-2532-1`
- `INPUT-2647-6`
- `INPUT-4309-21`

Bu projelerde parsel alani ve imar degerleri demonstrasyon amaciyla varsayimsal uretilmistir. Gercek kullanimda bu degerler yeni proje baslatma formundan girilecek.

## Backend Entegrasyonu

Eklenen endpointler:

- `GET /api/input-projects?parcel_key=&status=&q=&limit=&offset=`
- `POST /api/input-projects`
- `GET /api/input-projects/{project_key}`
- `POST /api/input-projects/{project_key}/engine-runs`
- `GET /api/engine-runs?project_key=&status=&q=&limit=&offset=`
- `GET /api/engine-runs/{run_key}`

Parsel detay endpointi artik su alanlari da dondurur:

- `input_projects`
- `engine_runs`
- `engine_run_steps`
- `building_envelope_results`

## BuildingEnvelope Motoru

Motor su girdileri kullanir:

- parsel alani
- yol cephesi
- TAKS
- KAKS/emsal
- maksimum kat sayisi
- yukseklik siniri
- on/yan/arka cekme mesafeleri
- otopark, siginak ve yangin kural versiyonlari

Motor su sonuclari uretir:

- TAKS zemin oturumu
- cekme mesafesi yaklasik zemin oturumu
- yapilabilir zemin oturumu
- toplam yapilabilir alan
- tipik kat alani
- tahmini kat sayisi
- tahmini konut alani
- firma datasetine gore tahmini bagimsiz birim kapasitesi
- otopark ihtiyaci tahmini
- review bulgulari

## Arayuz Entegrasyonu

Parsel detay ekranina `Otomasyon Girdisi ve Run` bolumu eklendi:

- input proje tablosu
- imar girdisi ozeti
- son building envelope sonucu
- son engine run kayitlari
- motor adimlari
- `Calistir` butonu ile yeni engine run baslatma

## Sonraki Kod Asamasi

ASAMA 11 tamamlandi ve bu hedefler uygulamaya baglandi:

1. Building envelope sonucundan core placement cikarma.
2. Firma datasetindeki guclu konut oruntulerinden layout adaylari uretme.
3. Cekirdek, sirkulasyon ve net tipik kat verimliligi hesaplama.
4. `core_placement_results`, `unit_layout_options` ve `unit_mix_options` tablolarini ekleme.
5. Paylasim motoruna gidecek ilk daire dagilimi taslagini uretme.

Guncel detay icin `docs/STAGE_11_STATUS.md` dosyasina bak.
