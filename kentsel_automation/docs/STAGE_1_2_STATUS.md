# AŞAMA 1-2 Teknik Durum

## AŞAMA 1: SQLite Proje Çekirdeği

Tamamlandı.

- `automation_seed.json` verisi SQLite'a aktarılıyor.
- Kurulan ana tablolar:
  - `source_files`
  - `parcels`
  - `parcel_source_files`
  - `cad_plans`
  - `excel_old_metraj`
  - `proposal_summaries`
  - `warnings`
  - `meta`
- Varsayılan veritabanı:
  - `kentsel_automation/data/kentsel.db`

Import komutu:

```powershell
python kentsel_automation\backend\import_seed.py
```

Son doğrulanan veri sayıları:

- Source files: 71
- Parcels: 20
- CAD plans: 11
- Excel old metraj: 7
- Proposal summaries: 11
- Warnings: 25

## AŞAMA 2: Backend API

Tamamlandı.

Server komutu:

```powershell
python kentsel_automation\backend\api_server.py --host 127.0.0.1 --port 8765
```

Canlı test edilen endpointler:

- `GET /health`
- `GET /api/summary`
- `GET /api/parcels`
- `GET /api/parcels/2532-1`
- `GET /api/source-files?kind=proposal_pdf`
- `GET /api/source-files?kind=cad_plan_dwg`
- `GET /api/warnings`
- `PATCH /api/warnings/1`
- `GET /api/search?q=4300`

## Sonraki Kod Aşaması

AŞAMA 3 için ilk hedef `HumanReviewQueue` arayüzüdür:

- Açık uyarıları listeleme
- Ada-parsel detayına geçiş
- Uyarı durumunu `open`, `reviewing`, `resolved`, `ignored` olarak değiştirme
- CAD/Excel/PDF kaynak dosyalarını aynı ekranda gösterme
