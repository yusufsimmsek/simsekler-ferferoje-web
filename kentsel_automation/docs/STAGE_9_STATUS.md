# ASAMA 9 Teknik Durum

## Firma Dataset ve Otomasyon Cekirdegi

Tamamlandi.

Bu asama, Ilkbahar eski proje kayitlarini nihai otomasyon motoru icin firma hafizasi olarak normallestirir. Eski dosyalar artik sadece arsiv/veri inceleme malzemesi degil; yeni proje girdilerinde referans alinacak proje ornekleri, daire yerlesim oruntuleri, paylasim oruntuleri ve motor sirasina donusur.

## Cikti Dosyalari

- `analysis_tools/company_dataset_builder.py`
- `project_analysis/company_dataset/company_dataset_seed.json`
- `project_analysis/company_dataset/project_examples.csv`
- `project_analysis/company_dataset/layout_patterns.csv`
- `project_analysis/company_dataset/sharing_patterns.csv`
- `project_analysis/company_dataset/COMPANY_DATASET_REPORT.md`

## Dogrulanan Sayilar

- Firma profili: 1
- Proje ornegi: 20
- Yerlesim oruntusu: 18
- Paylasim oruntusu: 11
- Otomasyon motor modulu: 8
- Guclu yerlesim oruntusu: 9
- Acik paylasim oruntusu: 6
- Risk iceren proje ornegi: 7

## Backend Entegrasyonu

Eklenen tablolar:

- `company_profiles`
- `company_project_examples`
- `company_layout_patterns`
- `company_sharing_patterns`
- `automation_engine_modules`

Eklenen endpointler:

- `GET /api/company-dataset`
- `GET /api/company-dataset/project-examples?parcel_key=&status=&quality=&q=&limit=&offset=`
- `GET /api/company-dataset/layout-patterns?unit_type=&room_mix=&pattern_role=&pattern_status=&q=&limit=&offset=`
- `GET /api/company-dataset/sharing-patterns?parcel_key=&risk_level=&pattern_status=&q=&limit=&offset=`
- `GET /api/automation-core/modules?status=`

Parsel detay endpointi artik su alanlari da dondurur:

- `company_project_example`
- `company_layout_patterns`
- `company_sharing_patterns`
- `automation_engine_modules`

## Arayuz Entegrasyonu

Human Review Queue parsel detay ekranina `Firma Dataset ve Motor` bolumu eklendi:

- kaynak, CAD, metraj, kanit ve risk dersleri
- bu parsele benzeyen daire/yerlesim oruntuleri
- tekliflerden cikan paylasim oruntuleri
- otomasyon motor sirasi ve cikti kontratlari

## Sonraki Kod Asamasi

ASAMA 10 icin hedef `InputProject` ve ilk pipeline prototipi olarak belirlendi ve tamamlandi:

1. Yeni proje baslatma girdisi: imar durumu, parsel alani, TAKS/KAKS/emsal, kat siniri, cekme mesafeleri, mevcut metraj.
2. `input_projects`, `zoning_inputs`, `existing_area_inputs` tablolari.
3. `engine_runs` ve `engine_run_steps` ile otomasyon calisma gecmisi.
4. Ilk deterministik motor: `building_envelope`.
