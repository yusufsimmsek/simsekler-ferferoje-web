# Kentsel Donusum Automation Prototype

Bu klasor, kentsel donusum proje dosyalarindan uretilen `automation_seed.json` verisini gercek bir uygulama cekirdegine tasir.

## Asama 1

- SQLite veritabani
- SourceFile, Parcel, CadPlan, ExcelOldMetraj, ProposalSummary, Warning tablolari
- `automation_seed.json` iceri aktarma komutu

## Asama 2

- JSON backend API
- Ada-parsel liste ve detay endpointleri
- Kaynak dosya endpointleri
- Uyari listeleme ve durum guncelleme endpointleri
- Genel ozet ve arama endpointleri

## Asama 3

- Human Review Queue arayuzu
- Uyari filtreleme
- Ada-parsel detay paneli
- CAD, Excel, PDF ve kaynak dosya ozetleri
- Uyari durumunu `open`, `reviewing`, `resolved`, `ignored` olarak guncelleme

## Asama 4

- ProposalPDFExtractor v2 analiz ciktilarinin SQLite importuna baglanmasi
- `proposal_v2_records` ve `proposal_v2_terms` tablolarinin eklenmesi
- Teklif parser uyarilarinin Human Review Queue icine acik uyari olarak dusmesi
- API'de v2 teklif kaydi ve v2 teklif terimi endpointleri
- Parsel detay ekraninda v2 teklif sinyalleri, finansal/kosul/parser uyarilari

## Asama 5

- ContractRuleEngine analiz motoru
- V2 teklif terimlerinden risk skoru ve karar onerisi uretme
- `contract_rule_evaluations` ve `contract_rule_findings` tablolarinin eklenmesi
- Blokaj/risk seviyesindeki sozlesme bulgularinin Human Review Queue'ya acik uyari olarak dusmesi
- Parsel detay ekraninda sozlesme kural degerlendirmeleri ve bulgulari

## Asama 6

- CadUnitMatcher analiz motoru
- CAD oda/m2 koordinatlarindan bagimsiz bolum adaylari uretme
- NET alan etiketlerini birincil aday sayimi olarak kullanma
- Teklif toplam birim sayisi ile CAD aday sayisini karsilastirma
- `cad_unit_plans`, `cad_unit_candidates`, `cad_unit_rooms`, `cad_unit_findings` tablolarinin eklenmesi
- Parsel detay ekraninda CAD bagimsiz bolum adaylari ve CAD-teklif fark bulgulari

## Asama 7

- DocumentQA kanit indeksleyici
- Parsel, kaynak dosya, uyari, CAD, Excel, teklif V2, sozlesme kural ve CAD bagimsiz bolum kanitlarini tek arama indeksinde toplama
- `document_qa_evidence` tablosunun eklenmesi
- Deterministik kanit arama ve soru-cevap endpointleri
- Parsel detay ekraninda `Kanit ve Soru-Cevap` bolumu

## Asama 8

- PermissionWorkflow gorev cekirdegi
- Acik uyarilari kanit bagli insan inceleme gorevlerine donusturme
- `review_tasks`, `review_task_evidence`, `review_decisions` tablolarinin eklenmesi
- Gorev karari girildiginde gorev ve uyari durumunu birlikte guncelleme
- Parsel detay ekraninda `Review Gorevleri` bolumu

## Asama 9

- Ilkbahar eski proje kayitlarini firma dataset/hafiza seed'ine donusturme
- Proje ornekleri, yerlesim oruntuleri, paylasim oruntuleri ve otomasyon motor modullerini uretme
- `company_profiles`, `company_project_examples`, `company_layout_patterns`, `company_sharing_patterns`, `automation_engine_modules` tablolarinin eklenmesi
- API'de firma dataset ve otomasyon core endpointleri
- Parsel detay ekraninda `Firma Dataset ve Motor` bolumu

## Asama 10

- Yeni proje girdisi veri modeli
- `input_projects`, `zoning_inputs`, `existing_area_inputs` tablolari
- `engine_runs` ve `engine_run_steps` ile otomasyon calisma gecmisi
- Ilk deterministik motor: `building_envelope`
- `building_envelope_results` tablosu
- Parsel detay ekraninda `Otomasyon Girdisi ve Run` bolumu
- UI'dan mevcut input proje icin motoru tekrar calistirma

## Asama 11

- `CorePlacement` prototipi
- Building envelope sonucundan cekirdek tipi, net tipik kat alani ve verimlilik skoru uretme
- `UnitLayout` prototipi
- Firma datasetindeki guclu konut oruntulerinden 3 layout alternatifi uretme
- `core_placement_results`, `unit_layout_options`, `unit_mix_options` tablolari
- API'de core placement, unit layout ve unit mix endpointleri
- Parsel detay ekraninda core, layout secenekleri ve secili layout birim karmasi

## Asama 12

- `SharingPayment` prototipi
- En yuksek fit skoruna sahip unit layout uzerinden 3 paylasim senaryosu uretme
- Firma paylasim oruntulerinden parsel/dataset muteahhit payi hedefi turetme
- Mal sahibi/muteahhit allocation satirlarini oda tiplerine gore saklama
- Katilim payi prototip tahmini ve review bulgulari
- `sharing_payment_options`, `sharing_unit_allocations`, `offer_data_packages` tablolari
- API'de sharing payment, allocation ve offer data package endpointleri
- Parsel detay ekraninda paylasim secenekleri ve offer package ozeti

## Asama 13

- `FloorPlan` prototipi
- En iyi unit layout adaylarindan tipik kat semasi uretme
- Cekirdek, dolasim ve daire zonlarini yuzdelik plan koordinatlariyla saklama
- Kat plan fit, gun isigi, uygulanabilirlik ve islak hacim skorlarini uretme
- `floor_plan_options`, `floor_plan_zones`, `floor_plan_findings` tablolari
- API'de floor plan option, zone ve finding endpointleri
- UI'da `Kat Plan` ekraninda sematik plan kanvasi ve skor paneli

## Calistirma

```powershell
python analysis_tools\document_qa_builder.py
python analysis_tools\permission_workflow_builder.py
python analysis_tools\company_dataset_builder.py
python kentsel_automation\backend\import_seed.py
python kentsel_automation\backend\api_server.py --host 127.0.0.1 --port 8765
```

Arayuz:

```text
http://127.0.0.1:8765/app
```

## Onemli Endpointler

- `GET /app`
- `GET /health`
- `GET /api/summary`
- `GET /api/parcels`
- `GET /api/parcels/2532-1`
- `GET /api/source-files`
- `GET /api/cad-units`
- `GET /api/cad-units/candidates`
- `GET /api/cad-units/findings`
- `GET /api/proposal-v2`
- `GET /api/proposal-v2/terms`
- `GET /api/contract-rules`
- `GET /api/contract-rules/findings`
- `GET /api/document-qa/evidence`
- `GET /api/document-qa/ask?parcel_key=2532-1&q=CAD`
- `GET /api/review-tasks`
- `GET /api/review-tasks/{id}`
- `POST /api/review-tasks/{id}/decisions`
- `GET /api/company-dataset`
- `GET /api/company-dataset/project-examples`
- `GET /api/company-dataset/layout-patterns`
- `GET /api/company-dataset/sharing-patterns`
- `GET /api/automation-core/modules`
- `GET /api/input-projects`
- `POST /api/input-projects`
- `GET /api/input-projects/{project_key}`
- `POST /api/input-projects/{project_key}/engine-runs`
- `GET /api/engine-runs`
- `GET /api/engine-runs/{run_key}`
- `GET /api/core-placement-results`
- `GET /api/unit-layout-options`
- `GET /api/unit-layout-options/{option_key}`
- `GET /api/unit-mix-options`
- `GET /api/floor-plan-options`
- `GET /api/floor-plan-options/{plan_key}`
- `GET /api/floor-plan-zones`
- `GET /api/floor-plan-findings`
- `GET /api/sharing-payment-options`
- `GET /api/sharing-payment-options/{sharing_key}`
- `GET /api/sharing-unit-allocations`
- `GET /api/offer-data-packages`
- `GET /api/offer-data-packages/{package_key}`
- `GET /api/warnings`
- `PATCH /api/warnings/{id}`
- `GET /api/search?q=4300`
- `POST /api/import-seed`
