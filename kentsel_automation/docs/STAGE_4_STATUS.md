# ASAMA 4 Teknik Durum

## ProposalPDFExtractor v2

Tamamlandi.

V2 parser temizlenmis ASAMA 7 teklif PDF metinlerinden asagidaki sinyalleri ayiklar:

- ada-parsel kimligi, baslik/govde uyumsuzlugu
- teklif tarihi
- mevcut bagimsiz bolum sayisi
- otopark kat/etiket bilgisi
- mal sahibi ve muteahhit dagitim terimleri
- alternatif teklif maddeleri
- finansal terimler
- ozel kosul terimleri
- parser uyarilari ve guven skoru

## Cikti Dosyalari

- `analysis_tools/proposal_pdf_extractor_v2.py`
- `project_analysis/proposal_v2/proposal_v2_analysis.json`
- `project_analysis/proposal_v2/proposal_v2_summary.csv`
- `project_analysis/proposal_v2/proposal_v2_terms.csv`
- `project_analysis/proposal_v2/PROPOSAL_V2_REPORT.md`

## Dogrulanan V2 Sayilari

- Teklif PDF kaydi: 11
- V2 terim kaydi: 84
- Dagitim terimi olan PDF: 7
- Alternatif terim olan PDF: 1
- Finansal terim olan PDF: 3
- Parser uyarisi olan PDF: 6
- Veritabani toplam uyarisi: 32

## Backend Entegrasyonu

Eklenen tablolar:

- `proposal_v2_records`
- `proposal_v2_terms`

Eklenen endpointler:

- `GET /api/proposal-v2?parcel_key=&q=&limit=&offset=`
- `GET /api/proposal-v2/terms?parcel_key=&group_name=&term_type=&label=&q=&limit=&offset=`

Parsel detay endpointi artik su alanlari da dondurur:

- `proposal_v2_records`
- `proposal_v2_terms`

## Arayuz Entegrasyonu

Human Review Queue parsel detay ekraninda `Teklif PDF` bolumu artik iki katmanlidir:

- eski kisa teklif ozeti
- V2 kayitlari ve V2 terim tablosu

Parser uyarilari veritabanina acik uyari olarak eklenir; boylece riskli teklif maddeleri ayni inceleme kuyrugundan takip edilir.

## Sonraki Kod Asamasi

ASAMA 5 icin hedef `ContractRuleEngine`:

- V2 teklif terimlerini is kurallarina baglama
- finansal ve hak dagilimi risklerini onceliklendirme
- parser sinyallerinden kanitli karar kaydi uretme
- insan onayi sonrasi kurumsal karar notu olusturma
