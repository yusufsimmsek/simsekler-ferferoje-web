# ASAMA 7 Teknik Durum

## DocumentQA

Tamamlandi.

DocumentQA, onceki asamalarda uretilen PDF, CAD, Excel, teklif, sozlesme kurali ve CAD bagimsiz bolum analizlerini tek bir kanit indeksinde toplar. Bu indeks LLM cagirmadan deterministik arama ve ada-parsel bazli soru-cevap icin kullanilir.

## Cikti Dosyalari

- `analysis_tools/document_qa_builder.py`
- `project_analysis/document_qa/document_qa_index.json`
- `project_analysis/document_qa/document_qa_evidence.csv`
- `project_analysis/document_qa/DOCUMENT_QA_REPORT.md`

## Dogrulanan Sayilar

- DocumentQA kanit kaydi: 659
- Parselli kanit kapsami: 20 ada-parsel
- Kaynak tipi: 13
- Veritabani toplam acik uyarisi: 49

Kaynak tipi dagilimi:

- `cad_unit_candidate`: 346
- `proposal_term`: 84
- `source_file`: 71
- `contract_finding`: 38
- `warning`: 25
- `parcel_summary`: 20
- `cad_summary`: 11
- `cad_unit_finding`: 13
- `cad_unit_plan`: 11
- `contract_rule`: 11
- `proposal_legacy`: 11
- `proposal_v2`: 11
- `excel_metraj`: 7

## Backend Entegrasyonu

Eklenen tablo:

- `document_qa_evidence`

Eklenen endpointler:

- `GET /api/document-qa/evidence?parcel_key=&source_type=&q=&limit=&offset=`
- `GET /api/document-qa/ask?parcel_key=&q=&limit=`

Parsel detay endpointi artik su alani da dondurur:

- `document_qa_evidence`

## Arayuz Entegrasyonu

Human Review Queue parsel detay ekranina `Kanit ve Soru-Cevap` bolumu eklendi:

- parselin en onemli kanitlari
- soru girisi
- deterministik cevap
- cevapta kullanilan kanit tablosu
- onerilen inceleme aksiyonlari

## Sonraki Kod Asamasi

ASAMA 8 icin hedef `PermissionWorkflow`:

- uyari kayitlarini gorev/karar/not akisina baglama
- insan onaylarini kanitlarla birlikte saklama
- karar gecmisini sozlesme hazirligi ve proje takibi icin raporlanabilir hale getirme
- DocumentQA cevaplarini karar notu taslagina donusturme
