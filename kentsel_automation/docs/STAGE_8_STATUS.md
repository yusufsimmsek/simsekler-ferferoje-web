# ASAMA 8 Teknik Durum

## PermissionWorkflow

Tamamlandi.

PermissionWorkflow, acik uyarilari kanit bagli insan inceleme gorevlerine donusturur. Her gorev bir uyaridan turetilir, DocumentQA kanitlariyla desteklenir ve insan kararlari `review_decisions` tablosunda gecmis olarak tutulur.

## Cikti Dosyalari

- `analysis_tools/permission_workflow_builder.py`
- `project_analysis/permission_workflow/permission_workflow_seed.json`
- `project_analysis/permission_workflow/review_tasks.csv`
- `project_analysis/permission_workflow/review_task_evidence.csv`
- `project_analysis/permission_workflow/PERMISSION_WORKFLOW_REPORT.md`

## Dogrulanan Sayilar

- Review gorevi: 49
- Gorev-kanit bagi: 147
- Baslangic karar kaydi: 0
- Risk gorevi: 15
- Review gorevi: 33
- Info gorevi: 1

Kategori dagilimi:

- `cad`: 20
- `contract`: 11
- `proposal`: 11
- `general`: 6
- `source`: 1

Termin dagilimi:

- `same_day`: 15
- `three_days`: 21
- `backlog`: 13

## Backend Entegrasyonu

Eklenen tablolar:

- `review_tasks`
- `review_task_evidence`
- `review_decisions`

Eklenen endpointler:

- `GET /api/review-tasks?parcel_key=&status=&level=&category=&q=&limit=&offset=`
- `GET /api/review-tasks/{id}`
- `POST /api/review-tasks/{id}/decisions`

Parsel detay endpointi artik su alani da dondurur:

- `review_tasks`

Karar girildiginde:

- `review_decisions` icine karar ve kanit snapshot'i yazilir
- `review_tasks.status` guncellenir
- bagli `warnings.status` ayni karara gore senkronize edilir

## Arayuz Entegrasyonu

Human Review Queue parsel detay ekranina `Review Gorevleri` bolumu eklendi:

- gorev durumu
- oncelik ve termin kovasi
- kategori
- gerekli aksiyon
- kanit ve karar sayisi
- hizli `Incele`, `Coz`, `Yoksay` karar butonlari

## Sonraki Kod Asamasi

ASAMA 9 icin hedef `Firma Dataset ve Otomasyon Cekirdegi`:

- eski Ilkbahar proje kayitlarini firma dataset/hafiza seed'ine donusturme
- layout ve paylasim oruntulerini otomasyon motorlari icin normallestirme
- Cayvox mimarisindeki motor sirasini uygulama cekirdegine baglama
