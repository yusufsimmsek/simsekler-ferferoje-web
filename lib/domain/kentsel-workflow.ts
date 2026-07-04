export type KentselWorkflowStep = {
  title: string;
  group: string;
  owner: string;
  time: string;
  objective: string;
  inputs: string[];
  outputs: string[];
  checks: string[];
};

export type KentselProjectWorkflowState = {
  stepIndex: number;
  offerReady: boolean;
};

export const kentselWorkflowSteps: KentselWorkflowStep[] = [
  {
    title: "Yeni proje açılır",
    group: "Kurulum",
    owner: "Mimar",
    time: "5 dk",
    objective: "Proje kodunu, sorumlu mimarı, müşteri bilgisini ve teklif klasörünü oluştur.",
    inputs: ["Proje adı", "Sorumlu mimar", "Müşteri", "Teklif notu"],
    outputs: ["Proje kartı", "İlk görev listesi", "Teklif klasörü"],
    checks: ["Proje kodu benzersiz", "Sorumlu kişi atanmış", "Zorunlu alanlar dolu"]
  },
  {
    title: "Ada/parsel ve konum bilgileri girilir",
    group: "Kurulum",
    owner: "Mimar",
    time: "8 dk",
    objective: "Parsel kimliğini ve kentsel dönüşüm dosyasının mekansal bağlamını netleştir.",
    inputs: ["İlçe", "Mahalle", "Ada", "Parsel", "Parsel alanı"],
    outputs: ["Konum kartı", "Parsel etiketi", "İlk risk notları"],
    checks: ["Ada/parsel formatı tutarlı", "Alan bilgisi girildi", "Mahalle eşleşmesi kontrol edildi"]
  },
  {
    title: "E-imar, TKGM ve pafta dosyaları bağlanır",
    group: "İmar ve Mevcut",
    owner: "Teknik ekip",
    time: "15 dk",
    objective: "Resmi kaynakları ve mimari paftaları aynı proje kaydına bağla.",
    inputs: ["E-imar PDF", "TKGM çıktısı", "Pafta", "Mevcut plan"],
    outputs: ["Kaynak dosya listesi", "Dosya sınıfları", "Okuma kuyruğu"],
    checks: ["Dosya tipi tanındı", "Versiyon tarihi kayıtlı", "Eksik kaynak uyarısı üretildi"]
  },
  {
    title: "Sistem parsel dosyalarını sınıflandırır",
    group: "İmar ve Mevcut",
    owner: "Otomasyon",
    time: "2 dk",
    objective: "Yüklenen dosyaları imar, CAD, metraj, malik ve teklif kaynakları olarak ayrıştır.",
    inputs: ["Proje klasörü", "Dosya adları", "Dosya hashleri"],
    outputs: ["Dosya envanteri", "Okuma görevleri", "Eksik veri listesi"],
    checks: ["Tekrarlı dosya ayrıldı", "Kritik dosya yokluğu işaretlendi", "Okunamayan dosya raporlandı"]
  },
  {
    title: "Derinlik, hmax ve çekme hesapları üretilir",
    group: "İmar ve Mevcut",
    owner: "Hesap motoru",
    time: "4 dk",
    objective: "Parsel ve imar girdilerinden yapılaşma zarfını hesapla.",
    inputs: ["Parsel alanı", "İmar notu", "Nizam", "Yol cepheleri"],
    outputs: ["Yapı yaklaşma sınırı", "Hmax notu", "Emsal zarfı"],
    checks: ["Çekme mesafesi tanımlı", "Hmax kaynağı mevcut", "Emsal dışı alan notu açık"]
  },
  {
    title: "Mevcut plan ve Excel metrajları yüklenir",
    group: "İmar ve Mevcut",
    owner: "Mimar",
    time: "10 dk",
    objective: "Mevcut bağımsız bölüm bilgilerini çizim ve tablo kaynağından topla.",
    inputs: ["Mevcut plan", "Excel metraj", "Bağımsız bölüm listesi"],
    outputs: ["Metraj okuma tablosu", "Plan kaynak eşleşmesi", "Eksik BB notu"],
    checks: ["m² kolonları tanındı", "Plan dosyası bağlı", "Excel satırları normalize edildi"]
  },
  {
    title: "Eski bağımsız bölüm tablosu normalize edilir",
    group: "İmar ve Mevcut",
    owner: "Otomasyon",
    time: "3 dk",
    objective: "Eski malik ve bağımsız bölüm verisini karşılaştırılabilir tabloya dönüştür.",
    inputs: ["Eski BB tablosu", "Malik listesi", "Kat/daire bilgisi"],
    outputs: ["Normalize BB tablosu", "Hak sahipliği çekirdeği", "Çakışma uyarıları"],
    checks: ["BB no tekil", "Toplam alan tutarlı", "Malik eşleşmeleri açık"]
  },
  {
    title: "Daire karması hedefleri girilir",
    group: "Tasarım",
    owner: "Mimar",
    time: "12 dk",
    objective: "Kat karşılığı, daire tipi, müteahhit tercihi ve malik konum koruma hedeflerini belirle.",
    inputs: ["Kat karşılığı oranı", "Min/max daire tipleri", "Müteahhit tercihi", "Konum koruma"],
    outputs: ["Daire karması hedefi", "Paylaşım hedefi", "Alternatif üretim girdisi"],
    checks: ["Oran girildi", "Tip aralığı dolu", "Özel malik notları kayıtlı"]
  },
  {
    title: "Çekirdek adayları önerilir",
    group: "Tasarım",
    owner: "Tasarım motoru",
    time: "5 dk",
    objective: "Merdiven, asansör, şaft ve sirkülasyon çekirdeği için yerleşim adayları üret.",
    inputs: ["Yapı zarfı", "Cepheler", "Daire karması", "Yangın kaçış notları"],
    outputs: ["Çekirdek alternatifleri", "Dolaşım verimi", "Risk bayrakları"],
    checks: ["Kaçış mesafesi kontrol edildi", "Şaft sürekliliği işaretlendi", "Verim oranı hesaplandı"]
  },
  {
    title: "Tip plan ve daire karması alternatifleri üretilir",
    group: "Tasarım",
    owner: "Tasarım motoru",
    time: "8 dk",
    objective: "Mimari kütleye uygun tip kat, daire ve paylaşım alternatifleri hazırla.",
    inputs: ["Çekirdek adayları", "Karma hedefi", "Net/brüt oranı"],
    outputs: ["Tip plan adayları", "Daire listesi", "Karşılaştırma skoru"],
    checks: ["Her alternatif m² üretti", "Karma hedefi karşılandı", "Daire cepheleri kontrol edildi"]
  },
  {
    title: "Mimar alternatifleri inceler ve seçer",
    group: "Tasarım",
    owner: "Mimar",
    time: "20 dk",
    objective: "Alternatifleri mimari kalite, paylaşım dengesi ve uygulanabilirlik açısından değerlendir.",
    inputs: ["Alternatifler", "Skor kartları", "Mimar notu"],
    outputs: ["Seçili alternatif", "Revizyon notu", "Karar kaydı"],
    checks: ["İnsan onayı var", "Revizyon gerekçesi yazıldı", "Seçim tarihi kayıtlı"]
  },
  {
    title: "CAD/BIM üretimi veya çizim yardımı çalışır",
    group: "Tasarım",
    owner: "CAD/BIM",
    time: "15 dk",
    objective: "Seçili alternatifi çizim üretimi veya yarı otomatik plan desteğine taşı.",
    inputs: ["Seçili alternatif", "Kat şeması", "Çizim standartları"],
    outputs: ["CAD/BIM üretim görevi", "Plan önizleme", "Çizim revizyon listesi"],
    checks: ["Kat standardı seçildi", "Ölçek bilgisi var", "Çıktı dosyası takipte"]
  },
  {
    title: "Alanlar hesaplanır",
    group: "Hesap ve Paylaşım",
    owner: "Hesap motoru",
    time: "4 dk",
    objective: "Brüt, net, emsal, ortak alan ve satış alanlarını hesapla.",
    inputs: ["Plan geometrisi", "Daire listesi", "Ortak alan kuralları"],
    outputs: ["Alan tablosu", "Verim oranı", "Emsal kontrolü"],
    checks: ["Net/brüt farkı açık", "Toplam alan tutarlı", "Emsal aşımı yok"]
  },
  {
    title: "Paylaşım cetveli oluşur",
    group: "Hesap ve Paylaşım",
    owner: "Finans",
    time: "6 dk",
    objective: "Malik ve müteahhit paylarını seçili plan üzerinden hesapla.",
    inputs: ["Eski BB tablosu", "Yeni daire listesi", "Kat karşılığı oranı"],
    outputs: ["Paylaşım cetveli", "Denge skoru", "Fark ödeme notu"],
    checks: ["Malik payı hesaplandı", "Müteahhit payı hesaplandı", "Adalet kontrolü yapıldı"]
  },
  {
    title: "Mevzuat ve kalite kontrol raporu üretilir",
    group: "Teklif ve Onay",
    owner: "Kontrol",
    time: "5 dk",
    objective: "İmar, otopark, yangın, sığınak ve mimari kalite uyarılarını raporla.",
    inputs: ["Alan tablosu", "Plan notları", "Mevzuat kuralları"],
    outputs: ["Kontrol raporu", "Kritik uyarılar", "Düzeltme görevleri"],
    checks: ["Kırmızı uyarı yok", "Kaynak maddeler bağlı", "Mimar kontrolü hazır"]
  },
  {
    title: "Teklif PDF/PNG paketi oluşur",
    group: "Teklif ve Onay",
    owner: "Sistem",
    time: "3 dk",
    objective: "Müşteriye sunulacak teklif, plan önizleme ve paylaşım paketini üret.",
    inputs: ["Seçili alternatif", "Paylaşım cetveli", "Kontrol raporu", "Marka bilgisi"],
    outputs: ["Teklif PDF", "Plan PNG", "Paylaşım eki", "İndirme paketi"],
    checks: ["PDF üretildi", "Plan görseli eklendi", "Teklif tarihi yazıldı"]
  },
  {
    title: "İnsan onayı ile versiyon kilitlenir",
    group: "Teklif ve Onay",
    owner: "Proje yöneticisi",
    time: "2 dk",
    objective: "Teklif versiyonunu onayla, kilitle ve sonraki revizyonları yeni versiyona al.",
    inputs: ["Teklif paketi", "Onay notu", "Versiyon etiketi"],
    outputs: ["Kilitli versiyon", "Revizyon geçmişi", "Teslim kaydı"],
    checks: ["Onay veren kayıtlı", "Versiyon kilitli", "Teslim notu oluşturuldu"]
  }
];

export const offerPrerequisiteStepIndex = 15;
export const offerPackageStepIndex = 16;

export function getKentselOfferReadiness(project: KentselProjectWorkflowState) {
  const completedSteps = Math.min(project.stepIndex, kentselWorkflowSteps.length);
  const missingSteps = kentselWorkflowSteps
    .slice(completedSteps, offerPrerequisiteStepIndex)
    .map((step, index) => ({
      stepNumber: completedSteps + index + 1,
      title: step.title
    }));

  return {
    canGenerateFinalOffer: project.stepIndex >= offerPrerequisiteStepIndex,
    finalOfferReady: project.offerReady && project.stepIndex >= offerPackageStepIndex,
    missingSteps
  };
}
