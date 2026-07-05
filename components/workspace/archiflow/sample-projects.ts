import type { KentselProject as Project } from "@/lib/domain/kentsel-project";

export const sampleProjects: Project[] = [
  {
    id: "PRJ-4300-02",
    name: "Kadıköy 4300/2 Dönüşüm",
    client: "İlkbahar İnşaat",
    architect: "Deniz A.",
    district: "Kadıköy",
    neighborhood: "Feneryolu",
    ada: "4300",
    parsel: "2",
    area: "684 m²",
    zoning: "Ayrık nizam / 5 kat",
    ratio: "%50",
    units: "18",
    createdAt: "02 Tem 2026",
    updatedAt: "Bugün",
    status: "İnceleme",
    source: "Demo",
    progress: 64,
    stepIndex: 11,
    offerReady: false,
    locked: false,
    files: [
      { id: "f-1", name: "4300-2_e-imar.pdf", type: "İmar", status: "Okundu" },
      { id: "f-2", name: "4300_arch_son.dwg", type: "CAD", status: "Kontrol" },
      { id: "f-3", name: "mevcut_metraj.xlsx", type: "Metraj", status: "Okundu" }
    ],
    notes: "Malik konum koruma hassasiyeti yüksek. Teklif paketinde 2+1 / 3+1 dağılımı açık anlatılmalı.",
    activity: [
      { id: "a-1", title: "Tip plan B-2 seçime hazırlandı", time: "Az önce", tone: "success" },
      { id: "a-2", title: "Otopark yönetmeliği kontrol bekliyor", time: "43 dk önce", tone: "warning" }
    ]
  },
  {
    id: "PRJ-2532-01",
    name: "Bostancı 2532/1 Teklif",
    client: "Cayvox Yapı",
    architect: "Ece K.",
    district: "Kadıköy",
    neighborhood: "Bostancı",
    ada: "2532",
    parsel: "1",
    area: "512 m²",
    zoning: "Blok nizam / 6 kat",
    ratio: "%48",
    units: "16",
    createdAt: "29 Haz 2026",
    updatedAt: "Dün",
    status: "Teklif",
    source: "Demo",
    progress: 94,
    stepIndex: 16,
    offerReady: true,
    locked: false,
    files: [
      { id: "f-4", name: "teklif2532.pdf", type: "Teklif", status: "Yüklendi" },
      { id: "f-5", name: "paylasim_cetveli.xlsx", type: "Paylaşım", status: "Okundu" }
    ],
    notes: "Teklif paketi üretildi. Yönetici onayı sonrası versiyon kilitlenecek.",
    activity: [
      { id: "a-3", title: "Teklif PDF paketi üretildi", time: "Dün", tone: "success" },
      { id: "a-4", title: "Paylaşım cetveli güncellendi", time: "2 gün önce", tone: "info" }
    ]
  },
  {
    id: "PRJ-5340-13",
    name: "Fikirtepe 5340/13 Ön Analiz",
    client: "Mira Ortaklığı",
    architect: "Selin M.",
    district: "Kadıköy",
    neighborhood: "Fikirtepe",
    ada: "5340",
    parsel: "13",
    area: "940 m²",
    zoning: "Karma kullanım",
    ratio: "%52",
    units: "32",
    createdAt: "18 Haz 2026",
    updatedAt: "3 gün önce",
    status: "Hazırlık",
    source: "Demo",
    progress: 28,
    stepIndex: 5,
    offerReady: false,
    locked: false,
    files: [
      { id: "f-6", name: "5340-13_derinlik_emsal.dwg", type: "CAD", status: "Kontrol" }
    ],
    notes: "E-imar ve malik listesi eksik. Mevcut metraj yüklenmeden teklif üretimine geçilmemeli.",
    activity: [{ id: "a-5", title: "Parsel dosyaları sınıflandırıldı", time: "3 gün önce", tone: "info" }]
  },
  {
    id: "PRJ-1182-07",
    name: "Moda 1182/7 Kilitli Teklif",
    client: "Arven Kentsel",
    architect: "Mert T.",
    district: "Kadıköy",
    neighborhood: "Moda",
    ada: "1182",
    parsel: "7",
    area: "726 m²",
    zoning: "Konut + ticaret / 6 kat",
    ratio: "%51",
    units: "24",
    createdAt: "11 Haz 2026",
    updatedAt: "Geçen hafta",
    status: "Kilitli",
    source: "Arşiv",
    progress: 100,
    stepIndex: 16,
    offerReady: true,
    locked: true,
    files: [
      { id: "f-7", name: "1182-7_kilitli_teklif.pdf", type: "Teklif", status: "Yüklendi" },
      { id: "f-8", name: "1182-7_kaynak_izleri.zip", type: "Belge", status: "Okundu" }
    ],
    notes: "Final teklif paketi mimar onayıyla kilitlendi. Arşiv kartı yalnızca izlenebilir durumda tutulur.",
    activity: [
      { id: "a-6", title: "Final teklif paketi kilitlendi", time: "Geçen hafta", tone: "success" },
      { id: "a-7", title: "Kaynak dosya izi arşive taşındı", time: "Geçen hafta", tone: "info" }
    ]
  }
];
