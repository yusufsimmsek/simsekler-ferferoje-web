# ASAMA 5 Teknik Durum

## ContractRuleEngine

Tamamlandi.

ContractRuleEngine, ProposalPDFExtractor v2 kayitlarini sozlesme inceleme kurallarina cevirir. Her teklif PDF'i icin risk skoru, risk seviyesi, karar onerisi ve detay bulgu listesi uretir.

## Kural Katmanlari

- Kimlik/blokaj kontrolleri
- Hak dagilimi ve taraf payi kontrolleri
- Finansal madde kontrolleri
- Kosul ve alternatif teklif kontrolleri
- Parser guvenilirligi, tarih ve tekrarli teklif kontrolleri

## Cikti Dosyalari

- `analysis_tools/contract_rule_engine.py`
- `project_analysis/contract_rules/contract_rule_analysis.json`
- `project_analysis/contract_rules/contract_rule_summary.csv`
- `project_analysis/contract_rules/contract_rule_findings.csv`
- `project_analysis/contract_rules/CONTRACT_RULE_REPORT.md`

## Dogrulanan Sayilar

- Kontrat degerlendirmesi: 11
- Kontrat kural bulgusu: 38
- Risk seviyesi:
  - blocking: 1
  - high: 4
  - medium: 3
  - low: 3
- Bulgu seviyesi:
  - blocking: 1
  - risk: 10
  - review: 24
  - info: 3
- Veritabani toplam acik uyarisi: 43

## Backend Entegrasyonu

Eklenen tablolar:

- `contract_rule_evaluations`
- `contract_rule_findings`

Eklenen endpointler:

- `GET /api/contract-rules?parcel_key=&risk_level=&decision=&q=&limit=&offset=`
- `GET /api/contract-rules/findings?parcel_key=&severity=&code=&q=&limit=&offset=`

Parsel detay endpointi artik su alanlari da dondurur:

- `contract_rule_evaluations`
- `contract_rule_findings`

Blokaj ve risk seviyesindeki kontrat bulgulari `warnings` tablosuna `contract_*` koduyla acik uyari olarak eklenir.

## Arayuz Entegrasyonu

Human Review Queue parsel detay ekranina `Sozlesme Kurallari` bolumu eklendi:

- risk seviyesi
- risk skoru
- karar onerisi
- blokaj/risk sayisi
- muteahhit payi
- detay kural bulgulari ve oneriler

## Sonraki Kod Asamasi

ASAMA 6 icin hedef `CadUnitMatcher`:

- CAD semantik oda/m2 sinyallerinden bagimsiz bolum adaylari uretme
- NET etiketlerini kat, oda grubu ve alan yaklasikligina gore eslestirme
- teklif dagilimi ile CAD bagimsiz bolum adaylarini karsilastirma
- sozlesme kural motoruna CAD kaniti ekleme
