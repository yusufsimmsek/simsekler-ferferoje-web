const fs = require("fs");
const path = require("path");

const root = process.cwd();
const baseUrl = "https://simseklerferforje.com";
const today = new Date().toISOString().slice(0, 10);

const indexablePages = new Set([
  "index.html",
  "hakkimizda/index.html",
  "hizmetler/index.html",
  "hizmetler/ferforje/index.html",
  "hizmetler/celik-konstruksiyon/index.html",
  "hizmetler/kapi-uretimleri/index.html",
  "hizmetler/korkuluk-balkon/index.html",
  "hizmetler/ozel-tasarim/index.html",
  "hizmetler/boardex-uygulamalari/index.html",
  "projeler/index.html",
  "projeler/modern-staircase-design/index.html",
  "projeler/architectural-metalwork/index.html",
  "projeler/sheet-metal-creations/index.html",
  "projeler/custom-machine-parts/index.html",
  "sss/index.html",
  "iletisim/index.html",
]);

const pageConfigs = {
  "index.html": {
    title: "Çelik Konstrüksiyon ve Metal Tasarım | ŞimşeklerFerforje",
    description:
      "Bodrum ve Yalıkavak'ta çelik konstrüksiyon, ferforje, villa kapısı ve korkuluk işlerinde keşiften montaja kurumsal çözümler sunuyoruz.",
    canonical: "/",
    robots: "index,follow",
    h1: "Bodrum'da çelik konstrüksiyon, ferforje ve proje çözümleri",
    replacements: [
      [
        `Bodrum'da ferforje, kapı, çelik konstrüksiyon ve BoardeX uygulamalarını ölçüye özel, estetik ve güvenilir şekilde üretiyoruz.`,
        `Bodrum ve Yalıkavak'ta ferforje kapı, villa kapısı, demir kapı, ferforje korkuluk ve çelik çözümlerini ölçüye özel, estetik ve güvenilir şekilde üretiyoruz.`,
      ],
      [
        `Ferforje, kapı, korkuluk, çelik konstrüksiyon ve BoardeX ihtiyaçlarınız için ölçü, fotoğraf ve beklentinizi paylaşın; size en uygun çözümü birlikte netleştirelim.`,
        `Ferforje kapı, villa kapısı, korkuluk, çelik konstrüksiyon ve BoardeX ihtiyaçlarınız için ölçü, fotoğraf ve lokasyon bilgisini paylaşın; Bodrum'da keşif ve uygulama planını birlikte netleştirelim.`,
      ],
      [
        `Şimşekler Ferforje ile <span class="black-text">projenizi</span> planlayın.`,
        `Şimşekler Ferforje ile <span class="black-text">Bodrum projenizi</span> planlayın.`,
      ],
      [
        `Ferforje, kapı, korkuluk, çelik konstrüksiyon ve BoardeX ihtiyaçlarınız için ölçü, fotoğraf ve beklentinizi paylaşın; size en uygun çözümü birlikte netleştirelim.`,
        `Ferforje kapı, demir kapı, korkuluk, çelik konstrüksiyon ve BoardeX ihtiyaçlarınız için ölçü, fotoğraf ve beklentinizi paylaşın; Bodrum ve Yalıkavak için en uygun çözümü birlikte netleştirelim.`,
      ],
    ],
    removeSections: ["references", "helpfulContent"],
    extraSchema: "home",
  },
  "home-1/index.html": {
    title: "Çelik Konstrüksiyon ve Metal Tasarım | ŞimşeklerFerforje",
    description:
      "Bodrum ve Yalıkavak'ta çelik konstrüksiyon, ferforje, villa kapısı ve korkuluk işlerinde keşiften montaja kurumsal çözümler sunuyoruz.",
    canonical: "/",
    robots: "noindex,follow",
    h1: "Bodrum'da çelik konstrüksiyon, ferforje ve proje çözümleri",
    replacements: [
      [
        `Bodrum'da ferforje, kapı, çelik konstrüksiyon ve BoardeX uygulamalarını ölçüye özel, estetik ve güvenilir şekilde üretiyoruz.`,
        `Bodrum ve Yalıkavak'ta ferforje kapı, villa kapısı, demir kapı, ferforje korkuluk ve çelik çözümlerini ölçüye özel, estetik ve güvenilir şekilde üretiyoruz.`,
      ],
      [
        `Ferforje, kapı, korkuluk, çelik konstrüksiyon ve BoardeX ihtiyaçlarınız için ölçü, fotoğraf ve beklentinizi paylaşın; size en uygun çözümü birlikte netleştirelim.`,
        `Ferforje kapı, villa kapısı, korkuluk, çelik konstrüksiyon ve BoardeX ihtiyaçlarınız için ölçü, fotoğraf ve lokasyon bilgisini paylaşın; Bodrum'da keşif ve uygulama planını birlikte netleştirelim.`,
      ],
    ],
    removeSections: ["references", "helpfulContent"],
    extraSchema: "home",
  },
  "hakkimizda/index.html": {
    title: "Kurumsal Profil | Şimşekler Mühendislik",
    description:
      "Bodrum'da ferforje, demir kapı ve çelik işlerinde uzun yıllardır hizmet veren Şimşekler Ferforje'yi yakından tanıyın.",
    canonical: "/hakkimizda/",
    robots: "index,follow",
    h1: "Bodrum'da uzun yıllardır ferforje ve demir işleri üreten ekip",
    replacements: [
      [
        `Şimşekler Ferforje ile <span class="black-text">projenizi</span> planlayın.`,
        `Şimşekler Ferforje ile <span class="black-text">Bodrum projenizi</span> planlayın.`,
      ],
      [
        `Ferforje kapı, demir kapı, korkuluk, çelik konstrüksiyon ve BoardeX ihtiyaçlarınız için ölçü, fotoğraf ve beklentinizi paylaşın; Bodrum ve Yalıkavak için en uygun çözümü birlikte netleştirelim.`,
        `Ferforje kapı, demir kapı, korkuluk, çelik konstrüksiyon ve BoardeX ihtiyaçlarınız için ölçü, fotoğraf ve lokasyon bilgisini paylaşın; Bodrum ve Yalıkavak için keşif sürecini birlikte netleştirelim.`,
      ],
    ],
    extraSchema: "about",
  },
  "hizmetler/index.html": {
    title: "Metal Tasarım ve Yapısal Çözümler | Şimşekler Mühendislik",
    description:
      "Ferforje kapı, demir kapı, ferforje korkuluk, çelik konstrüksiyon ve BoardeX hizmetlerini Bodrum'da keşfedin.",
    canonical: "/hizmetler/",
    robots: "index,follow",
    h1: "Bodrum'da ferforje, demir kapı ve çelik hizmetleri",
    replacements: [
      [
        `Bodrum'daki villa ve yaşam alanları için ölçüye özel üretim, uygulama ve montaj çözümleri sunuyoruz.`,
        `Bodrum, Yalıkavak ve çevresindeki villa ile yaşam alanları için ferforje kapı, demir kapı, korkuluk ve çelik çözümlerini ölçüye özel üretiyor ve uyguluyoruz.`,
      ],
      [
        `Şimşekler Ferforje'de <span class="black-text">sonuçlar</span> sahadaki işçilikle konuşur.`,
        `Şimşekler Ferforje'de <span class="black-text">sonuçlar</span> sahadaki ustalıkla görünür.`,
      ],
      [
        `Kapıdan korkuluğa, çelik pergoladan BoardeX uygulamalarına kadar her işte ölçü, detay ve temiz montaj çizgisini koruyoruz.`,
        `Ferforje kapıdan korkuluğa, çelik pergoladan BoardeX uygulamalarına kadar her işte ölçü, detay ve temiz montaj çizgisini koruyoruz.`,
      ],
    ],
    extraSchema: "servicesIndex",
  },
  "hizmetler/ferforje/index.html": {
    title: "Metal Tasarım ve Kapı Çözümleri | Şimşekler Mühendislik",
    description:
      "Bodrum'da ferforje kapı, villa giriş kapısı ve özel demir detay çözümleri için ölçüye özel üretim ve montaj.",
    canonical: "/hizmetler/ferforje/",
    robots: "index,follow",
    h1: "Bodrum'da ferforje kapı ve özel üretim çözümleri",
    heroText:
      "Bodrum ve Yalıkavak villa projelerinde ferforje kapı, ferforje korkuluk ve özel demir detayları ölçüye özel üretiyoruz.",
    richText: [
      "Ferforje kapı ve korkulukta ölçü, detay ve işçilik",
      "Ferforje; villa kapısından ferforje korkuluğa, balkon demirinden dekoratif detaylara kadar yaşam alanına karakter kazandıran güçlü bir uygulamadır. Şimşekler Ferforje olarak Bodrum'daki projelerde klasik ve modern çizgileri mekâna uygun ölçülerle üretime dönüştürüyoruz.",
      "Projeye keşif ve ölçü alma ile başlıyor; model, dolgu, hat ve bitiş kararlarını birlikte netleştiriyoruz. Böylece ferforje kapı ve korkuluk uygulamalarında hem güvenlik hem de görsel bütünlük korunuyor.",
      "Bodrum iklimine uygun malzeme ve uygulama disipliniyle villa girişlerinde, bahçe kapılarında ve dış mekân projelerinde uzun ömürlü çözümler sunuyoruz.",
      "Hedefimiz; mimariye uyumlu, güven veren ve uzun süre keyifle kullanılacak ferforje işler üretmek.",
    ],
    imageAlt: "bodrum ferforje villa kapısı modern tasarım",
    extraSchema: "service",
  },
  "hizmetler/celik-konstruksiyon/index.html": {
    title: "Yapısal Çelik Çözümleri | Şimşekler Mühendislik",
    description:
      "Bodrum'da çelik konstrüksiyon, pergola, sundurma ve taşıyıcı sistem çözümleri için proje ölçüsüne uygun üretim.",
    canonical: "/hizmetler/celik-konstruksiyon/",
    robots: "index,follow",
    h1: "Bodrum'da çelik konstrüksiyon ve pergola çözümleri",
    heroText:
      "Bodrum ve Yalıkavak'ta pergola, sundurma, taşıyıcı sistem ve dış mekân kullanımı için sağlam çelik konstrüksiyon çözümleri üretiyoruz.",
    richText: [
      "Çelik konstrüksiyonda güvenilir üretim ve montaj",
      "Çelik konstrüksiyon uygulamalarında pergola, sundurma, taşıyıcı karkas ve benzeri dış mekân çözümlerini proje ihtiyacına göre planlıyoruz. Her işte saha ölçüsü, kullanım amacı ve mimari uyum birlikte değerlendirilir.",
      "Üretimde dayanım kadar detay çözümü de önemlidir. Taşıyıcı birleşimler, açıklıklar ve montaj noktaları netleşmeden iş başlamaz; böylece uygulama sahada sürpriz yaratmadan ilerler.",
      "Şimşekler Ferforje olarak Bodrum'daki villa ve dış yaşam alanları için hem sağlam hem temiz görünen çelik çözümler sunuyoruz.",
      "Hedefimiz; yapıya uyum sağlayan ve uzun süre güvenle kullanılacak çelik uygulamalar üretmek.",
    ],
    imageAlt: "yalikavak celik konstruksiyon pergola uygulamasi",
    extraSchema: "service",
  },
  "hizmetler/kapi-uretimleri/index.html": {
    title: "Villa Giriş Sistemleri | Şimşekler Mühendislik",
    description:
      "Bodrum'da villa kapısı, demir kapı, sürgülü kapı ve bahçe kapısı üretimi için özel ölçü ve montaj çözümleri.",
    canonical: "/hizmetler/kapi-uretimleri/",
    robots: "index,follow",
    h1: "Bodrum'da villa kapısı ve demir kapı üretimi",
    heroText:
      "Bodrum ve Yalıkavak'ta villa kapısı, demir kapı, sürgülü kapı ve bahçe kapısı çözümlerini projeye özel ölçülerle üretiyoruz.",
    richText: [
      "Villa ve bahçe kapılarında ölçüye özel üretim",
      "Kapı üretiminde ilk karar; kullanım senaryosunu doğru okumaktır. Giriş kapısı mı, bahçe kapısı mı, sürgülü mü, kanatlı mı? Şimşekler Ferforje olarak her projede geçiş genişliği, cephe uyumu ve günlük kullanım rahatlığını birlikte değerlendiriyoruz.",
      "Kapı tasarımında dolgu yapısı, çizgi dili, kilit ve açılım detayı kadar uygulama kalitesi de sonucu belirler. Bu nedenle üretim öncesinde ölçü ve model kararlarını netleştiriyor, montajı buna göre planlıyoruz.",
      "Bodrum villa projelerinde hem estetik görünen hem de güven veren demir kapı ve villa kapısı çözümleri için temiz işçilik ve doğru kurgu ile ilerliyoruz.",
    ],
    imageAlt: "bodrum demir kapi ve villa kapisi uretimi",
    extraSchema: "service",
  },
  "hizmetler/korkuluk-balkon/index.html": {
    title: "Korkuluk ve Mimari Metal | Şimşekler Mühendislik",
    description:
      "Bodrum'da ferforje korkuluk, balkon demiri ve merdiven korkuluğu çözümleri için dayanıklı ve estetik üretim.",
    canonical: "/hizmetler/korkuluk-balkon/",
    robots: "index,follow",
    h1: "Bodrum'da ferforje korkuluk ve balkon demiri çözümleri",
    heroText:
      "Bodrum ve Yalıkavak'ta balkon, merdiven ve duvar üstü alanlar için ferforje korkuluk ve balkon demiri çözümleri üretiyoruz.",
    richText: [
      "Ferforje korkulukta güvenlik ve mimari uyum",
      "Ferforje korkuluk ve balkon demiri uygulamalarında güvenlik, oran ve detay aynı anda düşünülmelidir. Şimşekler Ferforje olarak merdiven, balkon ve duvar üstü çözümlerinde hem güven veren hem de mekâna uyum sağlayan üretimler yapıyoruz.",
      "Kullanım alanına göre yükseklik, hat, dolgu ve birleşim kararlarını netleştiriyor; montajı da buna göre planlıyoruz. Böylece uygulama tamamlandığında hem görsel bütünlük hem dayanım dengeli bir sonuç veriyor.",
      "Bodrum villaları ve yaşam alanları için ürettiğimiz ferforje korkuluklarda temiz işçilik, uzun ömürlü kullanım ve mimariye uyum odağını koruyoruz.",
    ],
    imageAlt: "bodrum ferforje korkuluk ve balkon demiri uygulamasi",
    extraSchema: "service",
  },
  "hizmetler/ozel-tasarim/index.html": {
    title: "Özel Üretim Metal Tasarım | Şimşekler Mühendislik",
    description:
      "Bodrum'da özel tasarım ferforje, dekoratif metal detay ve mimariye uygun özel üretim çözümleri.",
    canonical: "/hizmetler/ozel-tasarim/",
    robots: "index,follow",
    h1: "Bodrum'da özel tasarım demir işleri",
    heroText:
      "Bodrum ve Yalıkavak'ta mekâna özel ferforje, demir detay ve dekoratif metal işleri tasarımdan üretime taşıyoruz.",
    richText: [
      "Standart ölçüye sığmayan işler için özel tasarım çözümler",
      "Her proje standart çözümlerle ilerlemez. Özel tasarım işlerde önce mekânı, kullanım amacını ve istenen stili dinler; ardından buna uygun ferforje ya da metal detayları üretime hazır hale getiririz.",
      "Dekoratif panel, özel kapı detayı, konsol ayağı veya mekâna özgü farklı çözümler için ölçü, oran ve yüzey hissi birlikte ele alınır. Böylece ortaya yalnızca işlevsel değil, mimariye değer katan bir sonuç çıkar.",
      "Bodrum villa projelerinde referans görsel veya fikir aşamasındaki bir detay üzerinden ilerleyebilir; onu uygulamaya uygun hale getirip üretim sürecini netleştirebiliriz.",
    ],
    imageAlt: "bodrum ozel tasarim ferforje detay uygulamasi",
    extraSchema: "service",
  },
  "hizmetler/boardex-uygulamalari/index.html": {
    title: "Cephe ve BoardeX Sistemleri | Şimşekler Mühendislik",
    description:
      "Bodrum'da BoardeX cephe ve yardımcı alan uygulamalarında doğru sistem detayı ve temiz işçilik sunuyoruz.",
    canonical: "/hizmetler/boardex-uygulamalari/",
    robots: "index,follow",
    h1: "Bodrum'da BoardeX uygulama çözümleri",
    heroText:
      "Bodrum ve Yalıkavak'ta BoardeX cephe ve yardımcı alan uygulamalarında doğru sistem detaylarıyla planlı çözümler sunuyoruz.",
    richText: [
      "BoardeX uygulamalarında doğru detay ve temiz işçilik",
      "BoardeX; doğru sistem kurgusu ile dış cephe, yardımcı alan ve belirli kuru duvar çözümlerinde kullanılan önemli bir uygulama alanıdır. Burada kritik olan yalnızca malzemeyi seçmek değil, alt yapıyı ve birleşim detaylarını doğru planlamaktır.",
      "Şimşekler Ferforje olarak BoardeX işlerinde metal karkas, detay çözümü, uygulama sırası ve sahadaki temizlik odağını birlikte yönetiyoruz. Böylece sistem performansını olumsuz etkileyebilecek uygulama hatalarını en aza indiriyoruz.",
      "Bodrum ve Muğla bölgesindeki projelerde dış cephe ya da ilgili kaplama altı ihtiyaçlar için keşif ve doğru sistem kararıyla ilerlemek en sağlıklı sonucu verir.",
    ],
    imageAlt: "bodrum boardex dis cephe uygulamasi",
    extraSchema: "service",
  },
  "projeler/index.html": {
    title: "Proje Referansları | Şimşekler Mühendislik",
    description:
      "Bodrum, Yalıkavak ve çevresinde tamamladığımız ferforje kapı, korkuluk, villa kapısı ve çelik proje örneklerini inceleyin.",
    canonical: "/projeler/",
    robots: "index,follow",
    h1: "Bodrum ve Yalıkavak'ta tamamlanan ferforje projeleri",
    replacements: [
      [
        `Ferforje, kapı, korkuluk, çelik konstrüksiyon ve BoardeX uygulamalarında ölçüye özel, planlı ve güvenilir çözümler sunuyoruz.`,
        `Bodrum, Yalıkavak ve çevresinde ferforje kapı, villa kapısı, korkuluk, çelik pergola ve BoardeX uygulamalarında ölçüye özel çözümler sunuyoruz.`,
      ],
      [
        `Şimşekler Ferforje ile <span class="black-text">projenizi</span> planlayın.`,
        `Şimşekler Ferforje ile <span class="black-text">Bodrum projenizi</span> planlayın.`,
      ],
    ],
    extraSchema: "projectsIndex",
  },
  "projeler/modern-staircase-design/index.html": {
    title: "Villa Giriş Projesi | Şimşekler Mühendislik",
    description:
      "Bodrum'da tamamladığımız villa kapısı ve ferforje giriş kapısı projesinin detaylarını inceleyin.",
    canonical: "/projeler/modern-staircase-design/",
    robots: "index,follow",
    h1: "Villa Giriş Kapısı",
    projectIntro:
      "Bodrum'da tamamladığımız bu villa kapısı projesinde ölçü, güvenlik ve cephe estetiğini birlikte çözdük.",
    imageAlt: "bodrum ferforje villa kapisi proje uygulamasi",
    extraSchema: "project",
    location: "Bodrum",
    serviceName: "Villa kapısı projesi",
  },
  "projeler/architectural-metalwork/index.html": {
    title: "Korkuluk Projesi | Şimşekler Mühendislik",
    description:
      "Yalıkavak'ta tamamladığımız ferforje korkuluk ve balkon demiri uygulamasının detaylarını inceleyin.",
    canonical: "/projeler/architectural-metalwork/",
    robots: "index,follow",
    h1: "Ferforje Korkuluklar",
    projectIntro:
      "Yalıkavak'ta uyguladığımız bu ferforje korkuluk projesinde güvenlik, oran ve mimari uyumu birlikte ele aldık.",
    imageAlt: "yalikavak ferforje korkuluk proje uygulamasi",
    extraSchema: "project",
    location: "Yalıkavak",
    serviceName: "Ferforje korkuluk projesi",
  },
  "projeler/sheet-metal-creations/index.html": {
    title: "Pergola Projesi | Şimşekler Mühendislik",
    description:
      "Gündoğan'da tamamladığımız çelik pergola uygulamasının proje detaylarını inceleyin.",
    canonical: "/projeler/sheet-metal-creations/",
    robots: "index,follow",
    h1: "Çelik Pergola",
    projectIntro:
      "Gündoğan'da tamamlanan bu çelik pergola uygulamasında gölge, taşıyıcılık ve dış mekân kullanımı birlikte planlandı.",
    imageAlt: "gundogan celik pergola proje uygulamasi",
    extraSchema: "project",
    location: "Gündoğan",
    serviceName: "Çelik pergola projesi",
  },
  "projeler/custom-machine-parts/index.html": {
    title: "BoardeX Cephe Projesi | Şimşekler Mühendislik",
    description:
      "Konacık'ta tamamladığımız BoardeX dış cephe uygulamasının sistem ve uygulama detaylarını inceleyin.",
    canonical: "/projeler/custom-machine-parts/",
    robots: "index,follow",
    h1: "BoardeX Dış Cephe",
    projectIntro:
      "Konacık'taki bu BoardeX dış cephe uygulamasında sistem detayı, alt konstrüksiyon ve temiz işçiliği birlikte yönettik.",
    imageAlt: "konacik boardex dis cephe proje uygulamasi",
    extraSchema: "project",
    location: "Konacık",
    serviceName: "BoardeX dış cephe projesi",
  },
  "sss/index.html": {
    title: "Süreç ve Sık Sorulanlar | Şimşekler Mühendislik",
    description:
      "Bodrum ferforje, demir kapı, montaj, keşif ve teklif süreci hakkında sık sorulan soruların yanıtlarını inceleyin.",
    canonical: "/sss/",
    robots: "index,follow",
    h1: "Bodrum ferforje hizmetleri hakkında sık sorulan sorular",
    replacements: [
      [
        `Ferforje, kapı, korkuluk, çelik konstrüksiyon ve BoardeX uygulamalarında kullanıcıların en çok sorduğu soruları burada topladık.`,
        `Bodrum ve Yalıkavak'ta ferforje kapı, demir kapı, korkuluk, çelik konstrüksiyon ve BoardeX uygulamalarında en çok sorulan soruları burada topladık.`,
      ],
    ],
    extraSchema: "faq",
  },
  "iletisim/index.html": {
    title: "İletişim ve Keşif | Şimşekler Mühendislik",
    description:
      "Bodrum ve Yalıkavak'ta ferforje kapı, demir kapı ve korkuluk için teklif alın. Şimşekler Ferforje iletişim bilgileri burada.",
    canonical: "/iletisim/",
    robots: "index,follow",
    h1: "Bodrum ferforje teklif ve keşif iletişimi",
    replacements: [
      [`placeholder="Loren"`, `placeholder="Adınız"`],
      [`placeholder="Tomson"`, `placeholder="Soyadınız"`],
      [`placeholder="Loren@example.com"`, `placeholder="ornek@eposta.com"`],
      [`placeholder="+1 000 00 22 33"`, `placeholder="0532 359 53 49"`],
      [`<label for="field-2" class="field-label">Hizmet*</label>`, `<label for="field-2" class="field-label">Mesaj*</label>`],
      [`placeholder="Your message"`, `placeholder="Projenizi, yaklaşık ölçüleri ve lokasyonu kısaca yazın"`],
      [`value="Submit"`, `value="Talep Gönder"`],
      [
        `href="https://www.google.com/maps/place/14+Tottenham+Rd,+London+N1+4EP,+UK/@51.5455362,-0.0809731,17z/data=!3m1!4b1!4m10!1m2!2m1!1s14+Tottenham+Road,+London,+England!3m6!1s0x48761c921c1fe0f3:0xa177cd610facc449!8m2!3d51.545533!4d-0.0761022!15sCiIxNCBUb3R0ZW5oYW0gUm9hZCwgTG9uZG9uLCBFbmdsYW5kkgERY29tcG91bmRfYnVpbGRpbmfgAQA!16s%2Fg%2F11fs__ncrt?entry=ttu"`,
        `href="https://www.google.com/maps/search/?api=1&query=6171.%20Sokak%20No%3A28%2C%20Bodrum%2FMu%C4%9Fla"`,
      ],
      [
        `Ferforje, kapı, çelik ve BoardeX işleriniz için bize yazın.`,
        `Ferforje kapı, demir kapı, korkuluk ve BoardeX işleriniz için bize yazın.`,
      ],
      [
        `En hızlı teklif süreci için mümkünse alanın 2-3 fotoğrafını ve yaklaşık ölçüleri paylaşın. Sonrasında keşif, ölçü ve uygulama planını birlikte netleştirelim.`,
        `En hızlı teklif süreci için alanın 2-3 fotoğrafını, yaklaşık ölçüleri ve lokasyonu paylaşın. Bodrum ve Yalıkavak için keşif, ölçü ve uygulama planını birlikte netleştirelim.`,
      ],
    ],
    removeSections: ["references"],
    extraSchema: "contact",
  },
};

const serviceCardContent = [
  {
    title: "Ferforje",
    href: "/hizmetler/ferforje",
    description:
      "Villa girişleri, balkon korkulukları ve özel detaylar için estetik ferforje kapı ve korkuluk üretimleri.",
    alt: "bodrum ferforje villa kapısı modern tasarım",
  },
  {
    title: "Çelik Konstrüksiyon",
    href: "/hizmetler/celik-konstruksiyon",
    description:
      "Pergola, sundurma, taşıyıcı sistem ve dış mekân çözümlerinde sağlam çelik konstrüksiyon imalatları.",
    alt: "yalikavak celik konstruksiyon pergola uygulamasi",
  },
  {
    title: "Kapı Üretimleri",
    href: "/hizmetler/kapi-uretimleri",
    description:
      "Sürgülü, kanatlı ve özel tasarım villa kapısı ile demir kapı üretiminde ölçüye uygun imalat ve montaj.",
    alt: "bodrum demir kapi ve villa kapisi uretimi",
  },
  {
    title: "Özel Tasarım",
    href: "/hizmetler/ozel-tasarim",
    description:
      "Mekâna özel ferforje ve metal detayları tasarımdan üretime premium işçilikle taşıyoruz.",
    alt: "bodrum ozel tasarim ferforje detay uygulamasi",
  },
  {
    title: "BoardeX Uygulamaları",
    href: "/hizmetler/boardex-uygulamalari",
    description:
      "BoardeX uygulamalarında doğru sistem detaylarıyla cephe ve yardımcı alan çözümleri sunuyoruz.",
    alt: "bodrum boardex dis cephe uygulamasi",
  },
  {
    title: "Korkuluk & Balkon Demirleri",
    href: "/hizmetler/korkuluk-balkon",
    description:
      "Balkon, merdiven ve duvar üstü alanlarda ferforje korkuluk ve balkon demiri çözümleri üretiyoruz.",
    alt: "bodrum ferforje korkuluk ve balkon demiri uygulamasi",
  },
];

const projectCardContent = [
  {
    href: "/projeler/modern-staircase-design",
    title: "Villa Giriş Kapısı",
    paragraph:
      "Bodrum'da tamamladığımız villa kapısı projesinde güvenlik, cephe uyumu ve temiz işçiliği birlikte ele aldık.",
    alt: "bodrum ferforje villa kapisi proje uygulamasi",
  },
  {
    href: "/projeler/architectural-metalwork",
    title: "Ferforje Korkuluklar",
    paragraph:
      "Yalıkavak'ta uyguladığımız ferforje korkuluk projesinde oran, güvenlik ve mimari uyum öne çıktı.",
    alt: "yalikavak ferforje korkuluk proje uygulamasi",
  },
  {
    href: "/projeler/sheet-metal-creations",
    title: "Çelik Pergola",
    paragraph:
      "Gündoğan'da tamamlanan çelik pergola uygulamasında dış mekân kullanımı, gölge ve taşıyıcılık birlikte planlandı.",
    alt: "gundogan celik pergola proje uygulamasi",
  },
  {
    href: "/projeler/custom-machine-parts",
    title: "BoardeX Dış Cephe",
    paragraph:
      "Konacık'ta tamamladığımız BoardeX dış cephe uygulamasında sistem detayı ve temiz uygulama disiplini öne çıktı.",
    alt: "konacik boardex dis cephe proje uygulamasi",
  },
];

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function write(relPath, content) {
  fs.writeFileSync(path.join(root, relPath), content, "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function replaceAllSafe(content, search, replacement) {
  return content.includes(search) ? content.split(search).join(replacement) : content;
}

function replaceFirstH1(content, newH1) {
  return content.replace(/(<h1\b[^>]*>)(.*?)(<\/h1>)/s, `$1${newH1}$3`);
}

function replaceFirstParagraphByClass(content, classNeedle, newText) {
  const re = new RegExp(
    `(<p[^>]*class="[^"]*${escapeRegExp(classNeedle)}[^"]*"[^>]*>)(.*?)(<\\/p>)`,
    "s"
  );
  return content.replace(re, `$1${newText}$3`);
}

function replaceServiceHero(content, newText) {
  return content.replace(
    /(<div class="right-content-banner-3 service-right-content">[\s\S]*?<p[^>]*class="white-text"[^>]*>)(.*?)(<\/p>)/s,
    `$1${newText}$3`
  );
}

function replaceRichTextBlock(content, paragraphs) {
  const richHtml =
    `<h2>${paragraphs[0]}</h2>` +
    paragraphs.slice(1).map((paragraph) => `<p>${paragraph}</p>`).join("");
  const startNeedle = `class="rich-text-style w-richtext">`;
  const endNeedle = `</div></div></div><img`;
  const startIndex = content.indexOf(startNeedle);
  if (startIndex === -1) {
    return content;
  }

  const startDivIndex = content.lastIndexOf("<div", startIndex);
  if (startDivIndex === -1) {
    return content;
  }

  const endIndex = content.indexOf(endNeedle, startIndex);
  if (endIndex === -1) {
    return content;
  }

  return (
    content.slice(0, startDivIndex) +
    `<div class="rich-text-style w-richtext">${richHtml}` +
    content.slice(endIndex)
  );
}

function replaceProjectIntro(content, text) {
  return content.replace(
    /(<h1\b[^>]*>.*?<\/h1><p[^>]*>)(.*?)(<\/p>)/s,
    `$1${text}$3`
  );
}

function setTitle(content, title) {
  return content.replace(/<title>.*?<\/title>/s, `<title>${title}</title>`);
}

function upsertMeta(content, attrName, attrValue, metaContent) {
  const escapedKey = escapeRegExp(attrValue);
  const attrValueEscaped = escapeHtml(metaContent);
  const patterns = [
    new RegExp(`<meta[^>]*${attrName}="${escapedKey}"[^>]*content="[^"]*"[^>]*\\/?>`, "i"),
    new RegExp(`<meta[^>]*content="[^"]*"[^>]*${attrName}="${escapedKey}"[^>]*\\/?>`, "i"),
  ];
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      return content.replace(pattern, `<meta content="${attrValueEscaped}" ${attrName}="${attrValue}"/>`);
    }
  }
  return content.replace(
    /<\/head>/i,
    `<meta content="${attrValueEscaped}" ${attrName}="${attrValue}"/></head>`
  );
}

function upsertLink(content, relValue, hrefValue) {
  const relEscaped = escapeRegExp(relValue);
  const linkTag = `<link rel="${relValue}" href="${escapeHtml(hrefValue)}"/>`;
  const pattern = new RegExp(`<link[^>]*rel="${relEscaped}"[^>]*href="[^"]*"[^>]*\\/?>`, "i");
  if (pattern.test(content)) {
    return content.replace(pattern, linkTag);
  }
  return content.replace(/<\/head>/i, `${linkTag}</head>`);
}

function removeTaggedSchema(content) {
  return content.replace(
    /<script type="application\/ld\+json" data-seo-script="simsekler">[\s\S]*?<\/script>/g,
    ""
  );
}

function upsertSchema(content, schemaObject) {
  const script = `<script type="application/ld+json" data-seo-script="simsekler">${JSON.stringify(
    schemaObject
  )}</script>`;
  return removeTaggedSchema(content).replace(/<\/head>/i, `${script}</head>`);
}

function normalizeCanonical(relPath, overrideCanonical) {
  if (overrideCanonical) {
    return overrideCanonical === "/" ? `${baseUrl}/` : `${baseUrl}${overrideCanonical}`;
  }
  if (relPath === "index.html") {
    return `${baseUrl}/`;
  }
  return `${baseUrl}/${relPath.replace(/\\/g, "/").replace(/index\.html$/, "")}`;
}

function toPageUrl(relPath) {
  if (relPath === "index.html") {
    return `${baseUrl}/`;
  }
  return `${baseUrl}/${relPath.replace(/\\/g, "/").replace(/index\.html$/, "")}`;
}

function breadcrumbFor(relPath, name) {
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Ana Sayfa",
      item: `${baseUrl}/`,
    },
  ];

  const segmentMap = {
    hakkimizda: "Hakkımızda",
    hizmetler: "Hizmetler",
    projeler: "Projeler",
    sss: "SSS",
    iletisim: "İletişim",
    ferforje: "Ferforje",
    "celik-konstruksiyon": "Çelik Konstrüksiyon",
    "kapi-uretimleri": "Kapı Üretimleri",
    "korkuluk-balkon": "Korkuluk & Balkon Demirleri",
    "ozel-tasarim": "Özel Tasarım",
    "boardex-uygulamalari": "BoardeX Uygulamaları",
    "modern-staircase-design": "Villa Giriş Kapısı",
    "architectural-metalwork": "Ferforje Korkuluklar",
    "sheet-metal-creations": "Çelik Pergola",
    "custom-machine-parts": "BoardeX Dış Cephe",
  };

  const segments = relPath.replace(/index\.html$/, "").split("/").filter(Boolean);
  let currentUrl = baseUrl;
  segments.forEach((segment, index) => {
    currentUrl += `/${segment}`;
    const isLast = index === segments.length - 1;
    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      name: isLast ? name : segmentMap[segment] || segment,
      item: `${currentUrl}/`,
    });
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function baseBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Şimşekler Ferforje",
    image: `${baseUrl}/assets/simseklermuhendislik.png`,
    url: `${baseUrl}/`,
    telephone: "+90 532 359 53 49",
    email: "simsek_ferforje@hotmail.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "6171. Sokak No:28",
      addressLocality: "Bodrum",
      addressRegion: "Muğla",
      addressCountry: "TR",
    },
    areaServed: ["Bodrum", "Yalıkavak", "Muğla"],
    sameAs: [
      "https://www.instagram.com/simseklerferforje/",
      "https://www.facebook.com/simseklerferforje/?locale=tr_TR",
    ],
  };
}

function schemaForPage(relPath, config, html) {
  const pageUrl = normalizeCanonical(relPath, config.canonical);
  const displayTitle = config.h1 || config.title.split("|")[0].trim();
  const schemas = [baseBusinessSchema(), breadcrumbFor(relPath, displayTitle)];

  if (config.extraSchema === "service") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Service",
      name: displayTitle,
      provider: {
        "@type": "LocalBusiness",
        name: "Şimşekler Ferforje",
        url: `${baseUrl}/`,
      },
      areaServed: ["Bodrum", "Yalıkavak", "Muğla"],
      serviceType: displayTitle,
      url: pageUrl,
      description: config.description,
    });
  }

  if (config.extraSchema === "projectsIndex") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: displayTitle,
      url: pageUrl,
      description: config.description,
    });
  }

  if (config.extraSchema === "project") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: displayTitle,
      url: pageUrl,
      description: config.description,
      about: config.serviceName,
      contentLocation: config.location,
      provider: {
        "@type": "LocalBusiness",
        name: "Şimşekler Ferforje",
      },
    });
  }

  if (config.extraSchema === "servicesIndex") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Şimşekler Ferforje Hizmetleri",
      itemListElement: serviceCardContent.map((service, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: service.title,
        url: `${baseUrl}${service.href}`,
      })),
    });
  }

  if (config.extraSchema === "faq") {
    const questions = [...html.matchAll(/class="accordion-title">(.*?)<\/h5>/g)].map((match) =>
      match[1].replace(/<[^>]+>/g, "").trim()
    );
    const answers = [...html.matchAll(/class="accordion-list-content">(.*?)<\/p>/g)].map((match) =>
      match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: questions.map((question, index) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answers[index] || "",
        },
      })),
    });
  }

  if (config.extraSchema === "contact") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: displayTitle,
      url: pageUrl,
      description: config.description,
    });
  }

  return schemas;
}

function setCommonHead(content, relPath, config) {
  const canonical = normalizeCanonical(relPath, config.canonical);
  content = setTitle(content, config.title);
  content = upsertMeta(content, "name", "description", config.description);
  content = upsertMeta(content, "property", "og:title", config.title);
  content = upsertMeta(content, "property", "og:description", config.description);
  content = upsertMeta(content, "property", "og:url", canonical);
  content = upsertMeta(content, "property", "og:type", "website");
  content = upsertMeta(content, "property", "og:image", `${baseUrl}/assets/simseklermuhendislik.png`);
  content = upsertMeta(content, "property", "twitter:title", config.title);
  content = upsertMeta(content, "property", "twitter:description", config.description);
  content = upsertMeta(content, "name", "twitter:card", "summary_large_image");
  content = upsertMeta(content, "name", "robots", config.robots);
  content = upsertLink(content, "canonical", canonical);
  return content;
}

function updateServiceCards(content) {
  serviceCardContent.forEach((card) => {
    const blockPattern = new RegExp(
      `<div class="content-service-wrapper"><a href="[^"]*" class="service-name">${escapeRegExp(
        card.title
      )}<\\/a><p>.*?<\\/p><div[^>]*class="link-hover-wrapper mt---10"><a href="[^"]*" class="link-with-icon">Detaylar<span class="arrow-link"> <\\/span><\\/a><div class="line-link"><\\/div><\\/div><\\/div><a[^>]*href="[^"]*" class="link-photo-service w-inline-block"><img[^>]*alt="[^"]*"`,
      "s"
    );

    if (blockPattern.test(content)) {
      content = content.replace(
        blockPattern,
        `<div class="content-service-wrapper"><a href="${card.href}" class="service-name">${card.title}</a><p>${card.description}</p><div data-w-id="cc3626bc-e03e-6437-b945-870cfbe43f42" class="link-hover-wrapper mt---10"><a href="${card.href}" class="link-with-icon">Detaylar<span class="arrow-link"> </span></a><div class="line-link"></div></div></div><a data-w-id="cc3626bc-e03e-6437-b945-870cfbe43f48" href="${card.href}" class="link-photo-service w-inline-block"><img alt="${card.alt}"`
      );
    } else {
      const hrefPattern = new RegExp(
        `(<a[^>]*href=")${escapeRegExp(card.href)}(" class="service-name">${escapeRegExp(
          card.title
        )}<\\/a><p>)(.*?)(<\\/p>)`,
        "s"
      );
      content = content.replace(hrefPattern, `$1${card.href}$2${card.description}$4`);
      const imgPattern = new RegExp(
        `(<a[^>]*href="${escapeRegExp(card.href)}" class="link-photo-service w-inline-block"><img[^>]*?)alt="[^"]*"`,
        "g"
      );
      content = content.replace(imgPattern, `$1alt="${card.alt}"`);
    }
  });

  content = replaceAllSafe(
    content,
    `href="/hizmetler/boardex-uygulamalari" class="service-name">Özel Tasarım</a>`,
    `href="/hizmetler/ozel-tasarim" class="service-name">Özel Tasarım</a>`
  );
  content = replaceAllSafe(
    content,
    `href="/hizmetler/korkuluk-balkon" class="service-name">BoardeX Uygulamaları</a>`,
    `href="/hizmetler/boardex-uygulamalari" class="service-name">BoardeX Uygulamaları</a>`
  );
  content = replaceAllSafe(
    content,
    `href="/hizmetler/ozel-tasarim" class="service-name">Korkuluk & Balkon Demirleri</a>`,
    `href="/hizmetler/korkuluk-balkon" class="service-name">Korkuluk & Balkon Demirleri</a>`
  );
  return content;
}

function updateProjectCards(content) {
  projectCardContent.forEach((project) => {
    const titlePattern = new RegExp(
      `(<a href="${escapeRegExp(project.href)}" class="project-name">)(.*?)(<\\/a>)`,
      "s"
    );
    const paragraphPattern = new RegExp(
      `(<a href="${escapeRegExp(project.href)}" class="project-name">.*?<\\/a><p class="paragraph-project">)(.*?)(<\\/p>)`,
      "s"
    );
    const imagePattern = new RegExp(
      `(<a[^>]*href="${escapeRegExp(project.href)}" class="link-block w-inline-block"><img[^>]*?)alt="[^"]*"`,
      "g"
    );
    content = content.replace(titlePattern, `$1${project.title}$3`);
    content = content.replace(paragraphPattern, `$1${project.paragraph}$3`);
    content = content.replace(imagePattern, `$1alt="${project.alt}"`);
  });
  return content;
}

function setProjectImageAlts(content, alt) {
  content = content.replace(/(<img[^>]*class="project-image"[^>]*?)alt="[^"]*"/, `$1alt="${alt}"`);
  content = content.replace(
    /(<figure[\s\S]*?<img[^>]*?)alt="[^"]*"/,
    `$1alt="${alt}"`
  );
  return content;
}

function setServiceImageAlts(content, alt) {
  content = content.replace(
    /(<img[^>]*class="details-image-collection"[^>]*?)alt="[^"]*"/,
    `$1alt="${alt}"`
  );
  content = content.replace(
    /(<img[^>]*class="services-banner-image"[^>]*?)alt="[^"]*"/,
    `$1alt="${alt}"`
  );
  content = content.replace(
    /(<img[^>]*class="service-details-image"[^>]*?)alt="[^"]*"/,
    `$1alt="${alt}"`
  );
  content = content.replace(
    /(<div class="service-image-wrapper">[\s\S]*?<img[^>]*?)alt="[^"]*"/,
    `$1alt="${alt}"`
  );
  content = content.replace(
    /(<img src="[^"]*Det%20service[^"]*"[^>]*?)alt="[^"]*"/,
    `$1alt="${alt}"`
  );
  return content;
}

function removeSections(content, sections = []) {
  if (sections.includes("references")) {
    content = content.replace(
      /<section class="section"><div class="w-layout-blockcontainer base-container w-container"><div class="top-big-title-section"><div class="left-title-wrapper"><h2[^>]*>Öne Çıkan[\s\S]*?<div class="line-testimonials gray-line"><\/div><\/div><\/div><\/div><\/section>/s,
      ""
    );
  }

  if (sections.includes("helpfulContent")) {
    content = content.replace(
      /<section class="section blog-home">[\s\S]*?<\/section>/s,
      ""
    );
  }

  return content;
}

function applyGlobalContentFixes(content) {
  content = replaceAllSafe(content, `alt="Black Logo"`, `alt="Şimşekler Ferforje logosu"`);
  content = content.replace(
    /href="\/sss"([^>]*class="primary-button[^"]*"[^>]*><div>Teklif Al<\/div>)/g,
    `href="/iletisim"$1`
  );
  return content;
}

function walkIndexFiles(dir = root, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkIndexFiles(fullPath, results);
      return;
    }
    if (entry.isFile() && entry.name === "index.html") {
      results.push(path.relative(root, fullPath).replace(/\\/g, "/"));
    }
  });
  return results;
}

function buildSitemap() {
  const urls = [...indexablePages]
    .filter((relPath) => relPath !== "home-1/index.html")
    .map((relPath) => normalizeCanonical(relPath, pageConfigs[relPath]?.canonical))
    .map(
      (url) =>
        `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`;
}

const allIndexFiles = walkIndexFiles();
const modified = [];

allIndexFiles.forEach((relPath) => {
  let content = read(relPath);
  const config = pageConfigs[relPath];

  if (config) {
    content = setCommonHead(content, relPath, config);
    content = applyGlobalContentFixes(content);

    if (config.h1) {
      content = replaceFirstH1(content, config.h1);
    }

    if (config.replacements) {
      config.replacements.forEach(([from, to]) => {
        content = replaceAllSafe(content, from, to);
      });
    }

    if (config.removeSections) {
      content = removeSections(content, config.removeSections);
    }

    if (relPath === "index.html" || relPath === "home-1/index.html") {
      content = replaceFirstParagraphByClass(content, "paragraph-banner-home-1", pageConfigs[relPath].replacements[0][1]);
      content = updateProjectCards(content);
    }

    if (relPath === "hizmetler/index.html") {
      content = replaceFirstParagraphByClass(content, "inner-banner-paragraph", config.replacements[0][1]);
      content = updateServiceCards(content);
    }

    if (relPath === "projeler/index.html") {
      content = replaceFirstParagraphByClass(content, "inner-banner-paragraph", config.replacements[0][1]);
      content = updateProjectCards(content);
    }

    if (relPath === "sss/index.html") {
      content = replaceFirstParagraphByClass(content, "inner-banner-paragraph", config.replacements[0][1]);
    }

    if (relPath.startsWith("hizmetler/") && relPath !== "hizmetler/index.html") {
      content = replaceServiceHero(content, config.heroText);
      content = replaceRichTextBlock(content, config.richText);
      content = setServiceImageAlts(content, config.imageAlt);
    }

    if (relPath.startsWith("projeler/") && relPath !== "projeler/index.html") {
      content = replaceProjectIntro(content, config.projectIntro);
      content = setProjectImageAlts(content, config.imageAlt);
    }

    const schema = schemaForPage(relPath, config, content);
    content = upsertSchema(content, schema);

    write(relPath, content);
    modified.push(relPath);
    return;
  }

  let noindexContent = applyGlobalContentFixes(content);
  noindexContent = setCommonHead(noindexContent, relPath, {
    title: "Şimşekler Ferforje | Şimşekler Ferforje Bodrum",
    description:
      "Şimşekler Ferforje'nin Bodrum odaklı ferforje, demir kapı ve çelik çözümlerine ulaşmak için ana sayfayı ziyaret edin.",
    canonical: toPageUrl(relPath).replace(baseUrl, ""),
    robots: "noindex,follow",
  });
  write(relPath, noindexContent);
  modified.push(relPath);
});

write("sitemap.xml", buildSitemap());
write("robots.txt", buildRobots());

console.log(`SEO update complete. Updated ${modified.length} pages.`);
modified.forEach((file) => console.log(`- ${file}`));
