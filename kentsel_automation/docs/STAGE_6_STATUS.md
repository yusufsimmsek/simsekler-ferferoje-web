# ASAMA 6 Teknik Durum

## CadUnitMatcher

Tamamlandi.

CadUnitMatcher, semantik CAD parserindan gelen oda/m2 ciftlerini bagimsiz bolum adaylarina donusturur. NET alan etiketleri olan planlarda NET etiket sayisini birincil aday sayimi olarak kullanir; NET etiketi olmayan planlarda oda/m2 koordinat siralamasindan aday kumeler uretir.

## Cikti Dosyalari

- `analysis_tools/cad_unit_matcher.py`
- `project_analysis/cad_units/cad_unit_analysis.json`
- `project_analysis/cad_units/cad_unit_plan_summary.csv`
- `project_analysis/cad_units/cad_unit_candidates.csv`
- `project_analysis/cad_units/cad_unit_findings.csv`
- `project_analysis/cad_units/CAD_UNIT_MATCHER_REPORT.md`

## Dogrulanan Sayilar

- CAD unit plani: 11
- CAD unit adayi: 346
- CAD unit oda satiri: 1492
- CAD unit bulgusu: 13
- Birincil aday toplamı: 243
- Veritabani toplam acik uyarisi: 49

## Backend Entegrasyonu

Eklenen tablolar:

- `cad_unit_plans`
- `cad_unit_candidates`
- `cad_unit_rooms`
- `cad_unit_findings`

Eklenen endpointler:

- `GET /api/cad-units?parcel_key=&offer_match_status=&q=&limit=&offset=`
- `GET /api/cad-units/candidates?parcel_key=&method=&unit_type=&q=&limit=&offset=`
- `GET /api/cad-units/findings?parcel_key=&severity=&code=&q=&limit=&offset=`

Parsel detay endpointi artik su alanlari da dondurur:

- `cad_unit_plans`
- `cad_unit_candidates`
- `cad_unit_findings`

Review/risk seviyesindeki CAD unit bulgulari `warnings` tablosuna `cad_unit_*` koduyla acik uyari olarak eklenir.

## Arayuz Entegrasyonu

Human Review Queue parsel detay ekranina `CAD Bagimsiz Bolum` bolumu eklendi:

- plan eslestirme ozeti
- birincil aday sayisi
- NET ve oda kumesi aday sayilari
- teklif toplam birim sayisi ve fark durumu
- aday bolum tipi, oda karmasi, alan ve guven skoru
- CAD bulgulari ve onerileri

## Sonraki Kod Asamasi

ASAMA 7 icin hedef `DocumentQA`:

- ada-parsel bazli PDF/CAD/Excel kanit arama
- teklif, CAD adaylari ve sozlesme kurallarini tek soru-cevap katmaninda birlestirme
- cevaplara kaynak dosya ve bulgu referansi ekleme
- insan inceleme kuyruğundan kanitli karar notu uretme
