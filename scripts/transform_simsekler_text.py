from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


TARGET_FILES = [
    "home-1/index.html",
    "about-us/index.html",
    "services/index.html",
    "services/sheet-metal-work/index.html",
    "services/architectural-elements/index.html",
    "services/machinery-components/index.html",
    "services/metal-forming/index.html",
    "services/welding-and-repairs/index.html",
    "services/industrial-metalwork/index.html",
    "projects/index.html",
    "projects/modern-staircase-design/index.html",
    "projects/architectural-metalwork/index.html",
    "projects/sheet-metal-creations/index.html",
    "projects/custom-machine-parts/index.html",
    "faq/index.html",
    "contact-us/index.html",
]


ALIAS_ROUTES = {
    "projeler/index.html": "/projects/",
    "hizmetler/index.html": "/services/",
    "hakkimizda/index.html": "/about-us/",
    "iletisim/index.html": "/contact-us/",
    "sss/index.html": "/faq/",
    "ferforje/index.html": "/services/sheet-metal-work/",
    "celik-konstruksiyon/index.html": "/services/architectural-elements/",
    "kapilar/index.html": "/services/machinery-components/",
    "ozel-tasarim/index.html": "/services/metal-forming/",
    "boardex/index.html": "/services/welding-and-repairs/",
    "korkuluklar/index.html": "/services/industrial-metalwork/",
}


COMMON_ROUTE_REPLACEMENTS = [
    (r'href="/home-2/?', 'href="/about-us/'),
    (r'href="/home-3/?', 'href="/services/'),
    (r'href="/our-history/?', 'href="/projects/'),
    (r'href="/work-process/?', 'href="/faq/'),
    (r'href="/why-choose-us/?', 'href="/about-us/'),
    (r'href="/career/?', 'href="/projects/'),
    (r'href="/clients/?', 'href="/projects/'),
    (r'href="/pricing/?', 'href="/faq/'),
    (r'href="/our-team/?', 'href="/contact-us/'),
    (r'href="/blog/?', 'href="/faq/'),
    (r'href="/blog-posts/how-to-choose-the-right-metal-for-project/?', 'href="/faq/'),
    (r'href="/testimonials/?', 'href="/projects/'),
    (r'href="/job-positions/sheet-metal-worker/?', 'href="/services/sheet-metal-work/'),
    (r'href="https://www.linkedin.com/"', 'href="/contact-us/"'),
]


COMMON_TEXT_REPLACEMENTS = [
    ("lang=\"en\"", "lang=\"tr\""),
    ("https://cdn.prod.website-files.com/688b105b2269d2924df670a4/688b757065f51cfc4af0299a_Logo%20Dark%20Ironis.svg", "/assets/simseklermuhendislik.png"),
    ("https://cdn.prod.website-files.com/688b105b2269d2924df670a4/688b83553948907ce70cf6fb_Logo%20Light%20Ironis.svg", "/assets/simseklermuhendislik.png"),
    ("https://cdn.prod.website-files.com/688b105b2269d2924df670a4/689ddf55ce9c335630506d80_Ironis%20Favicon.png", "/assets/simseklermuhendislik.png"),
    ("https://cdn.prod.website-files.com/688b105b2269d2924df670a4/689ddf75b00f47eaa96f3fc0_Ironis%20Webclip.png", "/assets/simseklermuhendislik.png"),
    ("Demos", "Hızlı Erişim"),
    ("Home 1", "Ana Sayfa"),
    ("Home 2", "Hakkımızda"),
    ("Home 3", "Hizmetler"),
    ("Company", "Şimşekler"),
    ("About Us", "Hakkımızda"),
    ("Services", "Hizmetler"),
    ("Pricing", "SSS"),
    ("Projects", "Projeler"),
    ("All Pages", "Tüm Sayfalar"),
    ("Project Details", "Proje Detayı"),
    ("Service Details", "Hizmet Detayı"),
    ("Career Details", "Ferforje Detayı"),
    ("Contact us", "İletişim"),
    ("Testimonials", "Yorumlar"),
    ("Blog Details", "Bilgi Detayı"),
    ("Blog posts", "Faydalı Bilgiler"),
    ("Blog", "Bilgiler"),
    ("FAQ's", "SSS"),
    ("Interested?", "Teklif için"),
    ("Let’s work together", "Bize Ulaşın"),
    ("Read more", "Detaylar"),
    ("Learn more", "İncele"),
    ("All services", "Tüm Hizmetler"),
    ("All projects", "Tüm Projeler"),
    ("All posts", "Tüm Bilgiler"),
    ("Our services", "Hizmetlerimiz"),
    ("Our Values", "Değerlerimiz"),
    ("Our values", "Değerlerimiz"),
    ("Get a quote", "Teklif Al"),
    ("Work with us", "Projeleri İncele"),
    ("Our projects", "Projelerimiz"),
    ("Recent", "Seçili"),
    ("Creation", "Uygulama"),
    ("Our Clients.", "Referanslarımız."),
    ("Subscribe to be in touch with latest updates.", "Teklif ve keşif için iletişim bilgilerinizi bırakabilirsiniz."),
    ("Email address", "E-posta adresiniz"),
    ("Thank you! Your submission has been received!", "Teşekkürler! Talebiniz alındı."),
    ("Oops! Something went wrong while submitting the form.", "Bir hata oluştu. Lütfen tekrar deneyin."),
    ("© Ironis. All Rights Reserved.", "© Şimşekler Ferforje. Tüm hakları saklıdır."),
    ("ironis@example.com", "simsek_ferforje@hotmail.com"),
    ("London office", "Atölye / Bodrum"),
    ("5 Washington Square, London, Uk", "6171. Sokak No:28, Bodrum/Muğla"),
    ("+3 000 00 22 33", "0532 359 53 49"),
    ("LinkedIn", "@simseklerferforje"),
    ("Sheet Metal Work", "Ferforje"),
    ("Architectural Elements", "Çelik Konstrüksiyon"),
    ("Machinery Components", "Kapı Üretimleri"),
    ("Metal Forming", "Özel Tasarım"),
    ("Welding & Repairs", "BoardeX Uygulamaları"),
    ("Industrial Metalwork", "Korkuluk & Balkon Demirleri"),
    ("Modern Staircase Design", "Villa Giriş Kapısı"),
    ("Architectural Metalwork", "Ferforje Korkuluklar"),
    ("Sheet Metal Creations", "Çelik Pergola"),
    ("Custom Machine Parts", "BoardeX Dış Cephe"),
    ("Reliability", "Güven"),
    ("Innovation", "Ustalık"),
    ("Quality", "Estetik"),
    ("Precision", "Hassasiyet"),
    ("Integrity", "Disiplin"),
    ("Safety", "Dayanım"),
    ("Sustainability", "Uyum"),
    ("What Sets Ironis Apart in Metal Fabrication", "Ferforjede doğru model seçimi"),
    ("Smart Practices for a Stronger Future", "Kıyı ikliminde metal bakım notları"),
    ("Why Accuracy Matters in Metal Fabrication", "Kapı ve korkulukta fiyatı neler belirler?"),
    ("Explore expert tips, industry trends, and behind-the-scenes stories from the world of metal fabrication and manufacturing.", "Ferforje, kapı, korkuluk ve çelik uygulamalarında karar vermeyi kolaylaştıran kısa içerikler."),
    ("History", "Projeler"),
    ("Work Process", "SSS"),
    ("Why Choose Us", "Neden Biz"),
    ("Why choose us", "Neden Biz"),
    ("Career", "Ferforje"),
    ("Clients", "Referanslar"),
    ("Insights &", "Kısa"),
    ("Updates.", "Notlar."),
    ("Let&#x27;s tallk", "Bize Ulaşın"),
]


COMMON_HTML_REPLACEMENTS = [
    (
        '<div class="footer-rights"><a href="https://wcopilot.com/templates" target="_blank" class="footer-copyright-link">Template</a>by <a href="https://wcopilot.com/" target="_blank" class="footer-copyright-link">wCopilot.</a></div><div class="footer-rights">Powered by <a href="https://webflow.com/" target="_blank" class="footer-copyright-link">Webflow</a></div>',
        '<div class="footer-rights">6171. Sokak No:28, Bodrum/Muğla</div><div class="footer-rights">0532 359 53 49</div>',
    ),
    (
        '<div class="footer-copyright">© Şimşekler Ferforje. Tüm hakları saklıdır. <a href="/templates/licensing" class="footer-copyright-link">Licensing</a></div>',
        '<div class="footer-copyright">© Şimşekler Ferforje. Tüm hakları saklıdır. <a href="/contact-us/" class="footer-copyright-link">İletişim</a></div>',
    ),
    (
        'href="/contact-us/" target="_blank" class="footer-link social-link"><span class="icon-linkedin"></span>@simseklerferforje</a>',
        'href="/contact-us/" class="footer-link social-link"><span class="icon-linkedin"></span>@simseklerferforje</a>',
    ),
    (
        'Partner with <span class="black-text">Ironis</span> today!',
        'Şimşekler Ferforje ile <span class="black-text">projenizi</span> planlayın.',
    ),
    (
        'Let Ironis handle the cutting, bending, and welding - plus all the things your last supplier said were “impossible.” We turn raw steel into real results with just the right amount of sparks, sweat, and sarcasm.',
        'Ferforje, kapı, korkuluk, çelik konstrüksiyon ve BoardeX ihtiyaçlarınız için ölçü, fotoğraf ve beklentinizi paylaşın; size en uygun çözümü birlikte netleştirelim.',
    ),
    (
        '⚙️ Built Like Steel',
        '⚙️ Ölçüye Özel Üretim',
    ),
    (
        '🔥 Crafted Under Pressure',
        '🔥 Temiz Uygulama Disiplini',
    ),
    (
        '🧲 Precision That Sticks',
        '🧲 Zamanında Teslim Odağı',
    ),
]


CLEANUP_REPLACEMENTS = [
    ('href="/faq/-posts/how-to-choose-the-right-metal-for-project"', 'href="/faq/"'),
    ('href="/faq/-posts/what-sets-ironis-apart-in-metal-fabrication"', 'href="/faq/"'),
    ('href="/faq/-posts/smart-practices-for-a-stronger-future"', 'href="/faq/"'),
    ('href="/faq/-posts/why-accuracy-matters-in-metal-fabrication"', 'href="/faq/"'),
    ("Building Ustalık. Forging Hassasiyet. ", "Bodrum'da ölçüye özel ferforje ve çelik çözümler. "),
    ("We specialize in high-quality<br/>metal fabrication, strength and efficiency<br/>. From individual parts to complex structures.", "Ferforje, çelik ve özel üretim işlerinde estetik ile dayanımı bir araya getiriyoruz."),
    ("We specialize in high-quality <span class=\"black-text\">metal fabrication, strength and efficiency</span>. From individual parts to complex structures.<br/>", "Ferforje, çelik ve özel üretim işlerinde <span class=\"black-text\">estetik ile dayanımı</span> bir araya getiriyoruz.<br/>"),
    ("At Ironis, we take pride in forging strong,<br/>partnerships with businesses across<br/>a wide range.", "Şimşekler Ferforje, Bodrum'da kaliteyi estetik detay ve güvenilir uygulama ile buluşturur."),
    ("At Ironis, we take pride in forging strong, <span class=\"black-text\">partnerships with businesses across</span> a wide range.", "Şimşekler Ferforje, Bodrum'da kaliteyi <span class=\"black-text\">estetik detay ve güvenilir uygulama</span> ile buluşturur."),
    ("We take pride in forging strong,<br/>partnerships across<br/>diverse industries.", "Villa ve yaşam alanlarında estetik, güvenlik ve dayanımı birlikte düşünüyoruz."),
    ("We take pride in forging strong, <span class=\"black-text\">partnerships across</span> diverse industries.", "Villa ve yaşam alanlarında <span class=\"black-text\">estetik, güvenlik ve dayanımı</span> birlikte düşünüyoruz."),
    ("We are a passionate team dedicated to shaping the future of the industry through <span class=\"black-text\">craftsmanship and innovation.</span>", "Şimşekler Ferforje, ölçüye özel üretimi sahadaki disiplinle birleştirir."),
    ("Ustalıked by Experts,", "Usta işçilik,"),
    ("Driven by Passion.", "planlı üretim ve temiz montaj."),
    ("Sheet Metal Uygulamas", "Çelik Pergola"),
    ("Hassasiyet-crafted staircases, railings, and facades for commercial and residential spaces.", "Pergola, sundurma, taşıyıcı sistem ve dış mekân çözümlerinde sağlam çelik imalatlar."),
    ("Custom-engineered frames for industrial facilities, built to handle heavy loads and tight tolerances.", "Villa girişleri, balkon korkulukları ve özel detaylar için estetik ferforje üretimleri."),
    ("High-accuracy parts for manufacturing and production lines, produced to exact specifications.", "Sürgülü, kanatlı ve özel tasarım kapılarda proje ölçüsüne uygun üretim ve montaj."),
    ("Shaping metals with precision and expertise to create durable, custom components for any industrial.", "Mekâna özel ferforje ve metal detayları tasarımdan üretime taşıyoruz."),
    ("We specialize in crafting durable, high-precision metal components and structures for industrial.", "Balkon, merdiven ve duvar üstü uygulamalarda dayanıklı korkuluk çözümleri üretiyoruz."),
    ("Welding &amp; Repairs", "BoardeX Uygulamaları"),
    ("View details", "Detayı Gör"),
    ("FAQ&#x27;s", "SSS"),
    ("Team", "İletişim"),
    ('class="footer-link">About</a>', 'class="footer-link">Hakkımızda</a>'),
    ('class="footer-link">İletişim</a>', 'class="footer-link">İletişim</a>'),
    ("Years of Metal Experience", "Yıllık Ustalık Tecrübesi"),
    ("Client Satisfaction Across", "Ölçüye Özel Üretim"),
    ("Tons of Steel Processed Annually", "Ana Hizmet Alanı"),
    ("Tons of Steel Processed", "Ana Hizmet Alanı"),
    ("Tailored to Every Need", "Bodrum Odaklı Atölye"),
    ("15+", "30+"),
    ("98%", "%100"),
    ("5k+", "5"),
    ("100%", "1"),
    ("Trusted by", "Öne Çıkan"),
    ("Güvened by <span class=\"black-text\">Referanslarımız.</span>", "Öne Çıkan <span class=\"black-text\">Referanslarımız.</span>"),
    ("Frequently Asked<br/>Questions.", "Sık Sorulan<br/>Sorular."),
    ("Frequently Asked <span class=\"black-text\">Questions.</span>", "Sık Sorulan <span class=\"black-text\">Sorular.</span>"),
    ("&quot;Ironis provided exceptional metal fabrication services that perfectly met our project requirements. Their team demonstrated great professionalism and technical expertise from start to finish.&quot;", "&quot;Villa giriş kapımız ve korkuluklarımızda hem güvenlik hem estetik tam istediğimiz gibi oldu.&quot;"),
    ("“Ironis provided exceptional metal fabrication services that perfectly met our project requirements. Their team demonstrated great professionalism and technical expertise from start to finish.&quot;", "“Villa giriş kapımız ve korkuluklarımızda hem güvenlik hem estetik tam istediğimiz gibi oldu.&quot;"),
    ("David B., TechForm Engineering", "Bodrum / Villa projesi"),
    ("John S., NovaBuild Systems", "Yalıkavak / Dış mekân uygulaması"),
    ("Sarah J., ForgeTech Systems", "Konacık / Kapı ve korkuluk"),
    ("We combine precision engineering with hands-on craftsmanship to bring your designs to life in steel, metal, and beyond.", "Tamamlanan işlerde öne çıkan bazı örnekler ve müşteri deneyimleri."),
    ("From initial concept through final production, we’re committed to excellence, reliability, and results that help your business thrive.", "Ferforje, kapı, korkuluk, çelik konstrüksiyon ve BoardeX uygulamalarında ölçüye özel, planlı ve güvenilir çözümler sunuyoruz."),
    ("Providing strong, precise welding and reliable repair solutions to restore and extend the life of metal.", "BoardeX uygulamalarında doğru sistem detaylarıyla cephe ve yardımcı alan çözümleri sunuyoruz."),
    ("Each project we take on is built with precision, durability, and a commitment to excellence in every detail.", "Her proje; ölçü, uygulama disiplini ve temiz işçilik odağıyla tamamlandı."),
    ("Dayanım & Functionality – Designed not only for style but also for everyday use and reliability.", "Güvenli kullanım – Günlük açılıp kapanmaya uygun sağlam kurgu."),
    ("Dayanım &amp; Functionality – Designed not only for style but also for everyday use and reliability.", "Güvenli kullanım – Günlük açılıp kapanmaya uygun sağlam kurgu."),
    ("Durability & Strength – Built to withstand time and environmental challenges.", "Uzun ömürlü kullanım – Dış mekân koşullarına uygun üretim yaklaşımı."),
    ("Durability &amp; Strength – Built to withstand time and environmental challenges.", "Uzun ömürlü kullanım – Dış mekân koşullarına uygun üretim yaklaşımı."),
    ("Feb 2025", "Bodrum"),
    ("Oct 2024", "Yalıkavak"),
    ("Sep 2023", "Gündoğan"),
    ("Des 2023", "Konacık"),
    ("🔥 Dayanımed Under Pressure", "🔥 Temiz Uygulama Disiplini"),
    ("🔥 Ustalıked Under Pressure", "🔥 Temiz Uygulama Disiplini"),
    ("🧲 Hassasiyet That Sticks", "🧲 Zamanında Teslim Odağı"),
    ("Steel Frames", "Ferforje Kapılar"),
    ("Hassasiyet Prototypes", "Çelik ve BoardeX Çözümleri"),
    ("Kısaamp; <span class=\"black-text\">Notlar.</span>", "Faydalı <span class=\"black-text\">İçerikler.</span>"),
    ("Schedule a Demo", ""),
    ("Buy this Template", ""),
    ("All Templates", ""),
    ("Webflow Development and Design", ""),
    ("at fraction of Cost by wCopilot", ""),
    ("Get Unlimited <span class=\"text-orange\"></span> ", ""),
    ("Please wait...", "Lütfen bekleyin..."),
    ("View SSS", ""),
]


GLOBAL_BRAND_REPLACEMENTS = [
    ("https://cdn.prod.website-files.com/688b105b2269d2924df670a4/688b757065f51cfc4af0299a_Logo%20Dark%20Ironis.svg", "/assets/simseklermuhendislik.png"),
    ("https://cdn.prod.website-files.com/688b105b2269d2924df670a4/688b83553948907ce70cf6fb_Logo%20Light%20Ironis.svg", "/assets/simseklermuhendislik.png"),
    ("https://cdn.prod.website-files.com/688b105b2269d2924df670a4/688c79bc92ffa5008f67d20d_Icon%20Logo.svg", "/assets/simsekler-mark.svg"),
    ("https://cdn.prod.website-files.com/688b105b2269d2924df670a4/689ddf55ce9c335630506d80_Ironis%20Favicon.png", "/assets/simseklermuhendislik.png"),
    ("https://cdn.prod.website-files.com/688b105b2269d2924df670a4/689ddf75b00f47eaa96f3fc0_Ironis%20Webclip.png", "/assets/simseklermuhendislik.png"),
]


PAGE_REPLACEMENTS = {
    "home-1/index.html": [
        ("<title>Ironis - Webflow HTML website template</title>", "<title>Şimşekler Ferforje | Bodrum Ferforje ve Çelik Çözümleri</title>"),
        ("<meta content=\"Ironis - Webflow HTML website template\" property=\"og:title\"/>", "<meta content=\"Şimşekler Ferforje | Bodrum Ferforje ve Çelik Çözümleri\" property=\"og:title\"/>"),
        ("<meta content=\"Ironis - Webflow HTML website template\" property=\"twitter:title\"/>", "<meta content=\"Şimşekler Ferforje | Bodrum Ferforje ve Çelik Çözümleri\" property=\"twitter:title\"/>"),
        ("High-quality metalwork, built for efficiency, accuracy, and long-term performance.", "Bodrum'da ferforje, kapı, çelik konstrüksiyon ve BoardeX uygulamalarını ölçüye özel, estetik ve güvenilir şekilde üretiyoruz."),
        ("Strength", "Estetik"),
        ("Craft", "Dayanım"),
        ("Trust", "Ustalık"),
        ("Building Trust. Forging Precision. ", "Bodrum'da ölçüye özel ferforje ve çelik çözümler. "),
        ("Custom-engineered frames for industrial facilities, built to handle heavy loads and tight tolerances.", "Villa girişleri, balkon korkulukları ve özel detaylar için estetik ferforje üretimleri."),
        ("Precision-crafted staircases, railings, and facades for commercial and residential spaces.", "Pergola, sundurma, taşıyıcı sistem ve dış mekân çözümlerinde sağlam çelik imalatlar."),
        ("High-accuracy parts for manufacturing and production lines, produced to exact specifications.", "Sürgülü, kanatlı ve özel tasarım kapılarda proje ölçüsüne uygun üretim ve montaj."),
        ("About us", "Hakkımızda"),
        ("About Company", "Şimşekler Ferforje"),
        ("We specialize in high-quality<br/>metal fabrication, strength and efficiency<br/>. From individual parts to complex structures.", "Ferforje, çelik ve özel üretim işlerinde estetik ile dayanımı bir araya getiriyoruz."),
        ("Specializing in metal fabrication, custom components, and industrial builds, we bring together experience, precision, and hands-on craftsmanship.", "Şimşekler Ferforje; Bodrum'da villa ve yaşam alanları için ferforje, kapı, korkuluk, çelik konstrüksiyon ve BoardeX uygulamaları üretir. Her projede ölçü, detay ve teslim disipliniyle ilerler."),
        ("Steel Frames", "Ferforje Kapılar"),
        ("Precision Prototypes", "Çelik ve BoardeX Çözümleri"),
        ("We combine precision engineering with hands-on craftsmanship to bring your designs to life in steel, metal, and beyond.", "Villa kapıları, korkuluklar, çelik pergolalar ve cephe uygulamalarında tamamladığımız işlerden seçmeler."),
        ("15+", "30+"),
        ("Years of Metal Experience", "Yıllık Ustalık Tecrübesi"),
        ("98%", "%100"),
        ("Client Satisfaction Across", "Ölçüye Özel Üretim"),
        ("5k+", "5"),
        ("Tons of Steel Processed Annually", "Ana Hizmet Alanı"),
        ("100%", "1"),
        ("Tailored to Every Need", "Bodrum Odaklı Atölye"),
        ("Who we are", "Biz Kimiz"),
        ("At Ironis, we take pride in forging strong,<br/>partnerships with businesses across<br/>a wide range.", "Şimşekler Ferforje, Bodrum'da kaliteyi estetik detay ve güvenilir uygulama ile buluşturur."),
        ("&quot;Ironis has completely elevated our manufacturing process. Their precision, craftsmanship, and reliability have helped us meet even the toughest project demands. We trust them with every custom part, every weld, every time.&quot;", "&quot;Villa giriş kapımız ve korkuluklarımız tam istediğimiz gibi üretildi; süreç net, işçilik temizdi.&quot;"),
        ("Michael R., Materials Coordinator", "Bodrum villa müşterisi"),
        ("Our values", "Değerlerimiz"),
        ("We are committed to crafting <span class=\"white-semibold-text\">reliable, efficient, and innovative metal solutions</span> - standards of precision and quality.", "Her projede <span class=\"white-semibold-text\">sağlamlık, estetik ve teslim disipliniyle</span> ilerliyoruz."),
        ("Our work holds up - literally. From first cut to final weld, we deliver consistent quality you can count on.", "Her projede ölçü, detay ve uygulama kalitesini birlikte düşünürüz.", 1),
        ("Efficiency", "Estetik"),
        ("Our work holds up - literally. From first cut to final weld, we deliver consistent quality you can count on.", "Mekânın mimarisine uygun temiz çizgiler ve dengeli detaylarla üretim yaparız.", 1),
        ("Innovation", "Ustalık"),
        ("Our work holds up - literally. From first cut to final weld, we deliver consistent quality you can count on.", "Yıllara dayanan saha tecrübesiyle işlevsel ve uzun ömürlü çözümler geliştiririz.", 1),
    ],
    "about-us/index.html": [
        ("<title>About Us</title>", "<title>Hakkımızda | Şimşekler Ferforje</title>"),
        ("<meta content=\"About Us\" property=\"og:title\"/>", "<meta content=\"Hakkımızda | Şimşekler Ferforje\" property=\"og:title\"/>"),
        ("<meta content=\"About Us\" property=\"twitter:title\"/>", "<meta content=\"Hakkımızda | Şimşekler Ferforje\" property=\"twitter:title\"/>"),
        ("Metalwork Excellence Since Day One.", "Bodrum'da usta işçilikle ferforje ve çelik üretim."),
        ("We are dedicated to shaping the metal industry through our commitment to quality.", "Ferforje, kapı, korkuluk, çelik konstrüksiyon ve BoardeX işlerinde kalite odaklı üretim yapıyoruz."),
        ("We strive to push the boundaries of the metal industry by combining craftsmanship with advanced technology. From concept to completion, every project is handled with care.", "Şimşekler Ferforje, Bodrum'da villa ve yaşam alanları için ölçüye özel çözümler üretir. Tasarımdan uygulamaya kadar her işi temiz işçilik, net ölçü ve güvenilir teslim anlayışıyla yönetir."),
        ("Strength", "Estetik"),
        ("Craft", "Ustalık"),
        ("Trust", "Güven"),
        ("About us", "Hakkımızda"),
        ("We are a passionate team dedicated to shaping the future of the industry through<br/>craftsmanship and innovation.", "Şimşekler Ferforje, ölçüye özel üretimi sahadaki disiplinle birleştirir."),
        ("Our mission is to deliver exceptional results that stand the test of time, forging strong relationships with industries and communities we serve. In every piece we create, you’ll find a blend of skill.", "Amacımız; estetik görünen, güven veren ve uzun süre keyifle kullanılacak işler üretmek. Ferforje kapılardan korkuluklara, çelik taşıyıcılardan BoardeX uygulamalarına kadar her projede doğru ölçü ve doğru detayla ilerliyoruz."),
        ("Our history", "Projelerimiz"),
        ("Our team", "İletişim"),
        ("Crafted by Experts,<br/>Driven by Passion.", "Usta işçilik, planlı üretim ve temiz montaj."),
        ("Michael Lee", "Ferforje"),
        ("Lead Engineer", "Kapılar ve özel detaylar"),
        ("David Brown", "Çelik"),
        ("Quality Control Specialist", "Pergola ve taşıyıcı çözümler"),
        ("Emily Davis", "BoardeX"),
        ("Head of Operations", "Cephe ve yardımcı alan uygulamaları"),
        ("Shaping the future", "Neden Şimşekler"),
        ("We take pride in forging strong,<br/>partnerships across<br/>diverse industries.", "Villa ve yaşam alanlarında estetik, güvenlik ve dayanımı birlikte düşünüyoruz."),
        ("With years of experience, our skilled team transforms raw materials into custom metal components and structures tailored to meet the unique needs of diverse industries.", "Her projede önce alanı ve ihtiyacı doğru okur, sonra üretim detayını netleştiririz. Bu yaklaşım; hem tasarım kararlarını hem de montaj sürecini daha sağlıklı hale getirir."),
        ("🔩 Reliability high-quality metalwork you can count on.", "🔩 Ölçüye göre üretim ve mimariye uygun detay"),
        ("⚙️ Precision to every detail for flawless fabrication.", "⚙️ Temiz işçilik ve sahaya uygun uygulama"),
        ("🛠️ Durability long-lasting metal solutions that stand up.", "🛠️ Zamanında teslim ve uzun ömürlü kullanım"),
        ("“Ironis provided exceptional metal fabrication services that perfectly met our project requirements. Their team demonstrated great professionalism and technical expertise from start to finish.\"", "“Villa giriş kapımız ve korkuluklarımızda hem güvenlik hem estetik tam istediğimiz gibi oldu.”", 1),
        ("“Ironis provided exceptional metal fabrication services that perfectly met our project requirements. Their team demonstrated great professionalism and technical expertise from start to finish.\"", "“Çelik pergola sürecinde ölçüden montaja kadar her adım planlı ilerledi.”", 1),
        ("“Ironis provided exceptional metal fabrication services that perfectly met our project requirements. Their team demonstrated great professionalism and technical expertise from start to finish.\"", "“Kapı ve dış mekân detaylarında temiz işçilik ve net iletişim gördük.”", 1),
        ("David B., TechForm Engineering", "Bodrum / Villa projesi"),
        ("John S., NovaBuild Systems", "Yalıkavak / Dış mekân uygulaması"),
        ("Sarah J., ForgeTech Systems", "Konacık / Kapı ve korkuluk"),
    ],
    "services/index.html": [
        ("<title>Services</title>", "<title>Hizmetler | Şimşekler Ferforje</title>"),
        ("<meta content=\"Services\" property=\"og:title\"/>", "<meta content=\"Hizmetler | Şimşekler Ferforje\" property=\"og:title\"/>"),
        ("<meta content=\"Services\" property=\"twitter:title\"/>", "<meta content=\"Hizmetler | Şimşekler Ferforje\" property=\"twitter:title\"/>"),
        ("Expert Metalwork Solutions for Every Need.", "Ferforje, kapı, çelik ve BoardeX hizmetlerimiz."),
        ("From initial concept through final production, we’re committed to excellence, reliability, and results that help your business thrive.", "Bodrum'daki villa ve yaşam alanları için ölçüye özel üretim, uygulama ve montaj çözümleri sunuyoruz."),
        ("Shaping metals with precision and expertise to create durable, custom components for any industrial.", "Mekâna özel ferforje ve metal detayları tasarımdan üretime taşıyoruz."),
        ("Providing strong, precise welding and reliable repair solutions to restore and extend the life of metal.", "BoardeX uygulamalarında doğru sistem detaylarıyla cephe ve yardımcı alan çözümleri sunuyoruz."),
        ("We specialize in crafting durable, high-precision metal components and structures for industrial.", "Balkon, merdiven ve duvar üstü uygulamalarda dayanıklı korkuluk çözümleri üretiyoruz."),
        ("At Ironis, we let the <span class=\"black-text\">results speak</span> for themselves.", "Şimşekler Ferforje'de <span class=\"black-text\">sonuçlar</span> sahadaki işçilikle konuşur."),
        ("From successful projects to satisfied clients, each number reflects our commitment to quality, precision, and trust. These aren’t just statistics - they represent the strength we build every day.", "Kapıdan korkuluğa, çelik pergoladan BoardeX uygulamalarına kadar her işte ölçü, detay ve temiz montaj çizgisini koruyoruz."),
        ("How we work", "Teklif Al"),
        ("Decades of hands-on experience in metal fabrication.", "Ferforje, kapı, çelik ve yardımcı uygulamalarda usta işçilik odağı."),
    ],
    "services/sheet-metal-work/index.html": [
        ("<title>Sheet Metal Work</title>", "<title>Ferforje | Şimşekler Ferforje</title>"),
        ("Custom-engineered frames for industrial facilities, built to handle heavy loads and tight tolerances.", "Villa girişleri, balkonlar ve özel mekânlar için ölçüye özel ferforje üretimleri yapıyoruz."),
        ("Precision Sheet Metal Fabrication", "Ferforjede ölçü, detay ve işçilik bir arada"),
        ("At Ironis, our sheet metal fabrication combines precision, versatility, and craftsmanship to meet a wide range of industrial and commercial needs. We specialize in cutting, bending, shaping, and assembling sheet metal components with tight tolerances and high-quality finishes.", "Ferforje; kapıdan korkuluğa, balkon demirinden dekoratif detaylara kadar yaşam alanına karakter kazandıran en güçlü uygulamalardan biridir. Şimşekler Ferforje olarak klasik ve modern çizgileri, mekânın mimarisine uygun ölçülerle üretime dönüştürüyoruz."),
        ("Whether you need custom panels, enclosures, ductwork, or structural elements, our team uses advanced machinery and skilled techniques to ensure each piece fits perfectly and performs reliably. Our in-house capabilities allow us to handle projects of all sizes - from one-off prototypes to large production runs.", "Projeye önce keşif ve ölçü alma ile başlıyor; ardından model, dolgu, hat ve bitiş kararlarını netleştiriyoruz. Uygulama boyunca hem güvenlik hem görsel bütünlük odakta kalıyor."),
        ("We focus on material efficiency, durability, and exact specifications to deliver components that integrate seamlessly into your designs. With a deep understanding of different metals including steel, aluminum, and stainless steel, we advise on the best material choice for your application.", "Bodrum iklimine uygun kullanım için doğru malzeme ve uygulama disiplinini esas alıyor, villa ve dış mekân projelerinde uzun ömürlü çözümler sunuyoruz."),
        ("Ironis’s sheet metal work supports industries ranging from manufacturing and construction to electronics and automotive - providing robust solutions that stand the test of time.", "Ferforjede hedefimiz; mimariye uyumlu, güven veren ve uzun süre keyifle kullanılacak işler üretmek."),
        ("Scope of service", "Hizmet kapsamı"),
        ("What", "Diğer"),
        ("We Offer.", "Hizmetler."),
    ],
    "services/architectural-elements/index.html": [
        ("<title>Architectural Elements</title>", "<title>Çelik Konstrüksiyon | Şimşekler Ferforje</title>"),
        ("Precision-crafted staircases, railings, and facades for commercial and residential spaces.", "Pergola, sundurma, taşıyıcı sistem ve dış mekân çözümlerinde proje odaklı çelik imalat yapıyoruz."),
        ("Metal Designs for Architecture", "Çelik konstrüksiyonda güvenilir üretim ve montaj"),
        ("At Ironis, we craft custom architectural metal elements that combine functionality, durability, and aesthetic appeal. From sleek staircases and elegant railings to decorative facades and structural supports, our metalwork enhances the beauty and strength of any building.", "Çelik konstrüksiyon uygulamalarında pergola, sundurma, taşıyıcı karkas, platform ve benzeri dış mekân çözümlerini proje ihtiyacına göre planlıyoruz. Her işte saha ölçüsü, kullanım amacı ve mimari uyum birlikte değerlendirilir."),
        ("Using precision fabrication techniques and high-quality materials such as steel, aluminum, and stainless steel, we create pieces that meet exact design specifications while withstanding the demands of daily use and environmental exposure.", "Üretimde dayanım kadar detay çözümü de önemlidir. Taşıyıcı birleşimler, açıklıklar ve montaj noktaları netleşmeden iş başlamaz; böylece uygulama sahada sürpriz yaratmadan ilerler."),
        ("Our experienced team works closely with architects, designers, and contractors to ensure every element integrates seamlessly with the overall project vision, delivering solutions that are as visually striking as they are structurally sound.", "Şimşekler Ferforje olarak Bodrum'daki villa ve dış yaşam alanları için hem sağlam hem temiz görünen çelik çözümler sunuyoruz."),
        ("Ironis’s architectural metal elements are trusted in commercial, residential, and public spaces - providing timeless craftsmanship that elevates spaces and endures for years to come.", "Hedefimiz; mekânı zorlamayan, yapıya uyum sağlayan ve uzun süre güvenle kullanılacak çelik uygulamalar üretmek."),
        ("Scope of service", "Hizmet kapsamı"),
        ("What", "Diğer"),
        ("We Offer.", "Hizmetler."),
    ],
    "services/machinery-components/index.html": [
        ("<title>Machinery Components</title>", "<title>Kapı Üretimleri | Şimşekler Ferforje</title>"),
        ("High-accuracy parts for manufacturing and production lines, produced to exact specifications.", "Sürgülü, kanatlı ve özel tasarım kapıları projeye uygun ölçü ve detaylarla üretiyoruz."),
        ("Industrial Machine Fabrication", "Villa ve bahçe kapılarında ölçüye özel üretim"),
        ("Ironis specializes in fabricating high-precision metal components essential for machinery performance and reliability. From custom brackets and housings to complex assemblies, our expert team ensures every part meets strict specifications for fit, strength, and durability.", "Kapı üretiminde ilk karar; kullanım senaryosunu doğru okumaktır. Giriş kapısı mı, bahçe kapısı mı, sürgülü mü, kanatlı mı? Şimşekler Ferforje olarak her projede geçiş genişliği, cephe uyumu ve günlük kullanım rahatlığını birlikte değerlendiriyoruz."),
        ("Using advanced CNC machining, welding, and finishing techniques, we produce components from a variety of metals including steel, stainless steel, and aluminum. Each piece is engineered to withstand demanding industrial environments and mechanical stress.", "Kapı tasarımında dolgu yapısı, çizgi dili, kilit ve açılım detayı kadar uygulama kalitesi de sonucu belirler. Bu nedenle üretim öncesinde ölçü ve model kararlarını netleştiriyor, montajı buna göre planlıyoruz."),
        ("We work closely with manufacturers and engineers to deliver components that seamlessly integrate into machines, helping optimize functionality and extend equipment lifespan. Whether prototyping or large-scale production, Ironis delivers metal parts built to exacting standards.", "Villa ve dış mekân projelerinde hem estetik görünen hem de güven veren kapılar üretmek için temiz işçilik ve doğru kurgu ile ilerliyoruz."),
        ("Scope of service", "Hizmet kapsamı"),
        ("What", "Diğer"),
        ("We Offer.", "Hizmetler."),
    ],
    "services/metal-forming/index.html": [
        ("<title>Metal Forming</title>", "<title>Özel Tasarım | Şimşekler Ferforje</title>"),
        ("Shaping metals with precision and expertise to create durable, custom components for any industrial.", "Mekâna özel ferforje ve metal detayları tasarımdan üretime taşıyoruz."),
        ("Shaping Metal with Expertise", "Standart ölçüye sığmayan işler için özel tasarım çözümler"),
        ("At Ironis, our metal forming services transform raw metal sheets and plates into precise, functional shapes tailored to your project needs. Utilizing advanced bending, rolling, and pressing techniques, we shape metals like steel, aluminum, and stainless steel with exceptional accuracy and consistency.", "Her proje standart çözümlerle ilerlemez. Özel tasarım işlerde önce mekânı, kullanım amacını ve istenen stili dinler; ardından buna uygun ferforje ya da metal detayları üretime hazır hale getiririz."),
        ("Our skilled team works with tight tolerances to produce components ranging from simple bends to complex curves and contours. Whether creating structural parts, custom enclosures, or decorative elements, we ensure every piece meets strict quality and performance standards.", "Ayna çerçevesi, konsol ayağı, dekoratif panel, özel kapı detayı ya da mekâna özgü farklı çözümler için ölçü, oran ve yüzey hissi birlikte ele alınır. Bu sayede ortaya sadece işlevsel değil, mekâna değer katan bir sonuç çıkar."),
        ("With capabilities to handle both small-scale prototypes and large production runs, Ironis delivers metal forming solutions that support diverse industries - combining craftsmanship with cutting-edge technology to bring your designs to life.", "Referans görsel veya fikir aşamasındaki bir detay üzerinden ilerleyebilir; onu uygulamaya uygun hale getirip üretim sürecini netleştirebiliriz."),
        ("Scope of service", "Hizmet kapsamı"),
        ("What", "Diğer"),
        ("We Offer.", "Hizmetler."),
    ],
    "services/welding-and-repairs/index.html": [
        ("<title>Welding &amp; Repairs</title>", "<title>BoardeX Uygulamaları | Şimşekler Ferforje</title>"),
        ("Providing strong, precise welding and reliable repair solutions to restore and extend the life of metal.", "BoardeX uygulamalarında doğru sistem detaylarıyla cephe ve yardımcı alan çözümleri sunuyoruz."),
        ("Custom Welding Solutions", "BoardeX uygulamalarında doğru detay ve temiz işçilik"),
        ("At Ironis, our welding and repair services ensure the longevity and strength of your metal structures and components. Whether it’s joining new parts or restoring worn or damaged equipment, our skilled welders use advanced techniques—including MIG, TIG, and stick welding - to provide precise, durable results.", "BoardeX; doğru sistem kurgusu ile dış cephe, yardımcı alan ve belirli kuru duvar çözümlerinde kullanılan önemli bir uygulama alanıdır. Burada kritik olan yalnızca malzemeyi seçmek değil, alt yapıyı ve birleşim detaylarını doğru planlamaktır."),
        ("We specialize in repairing industrial machinery, structural frameworks, and custom metalwork, addressing cracks, breaks, and wear with expert care. Our team works closely with clients to understand the specific requirements and challenges of each project, ensuring repairs meet or exceed original specifications.", "Şimşekler Ferforje olarak BoardeX işlerinde metal karkas, detay çözümü, uygulama sırası ve sahadaki temizlik odağını birlikte yönetiyoruz. Böylece sistem performansını olumsuz etkileyebilecek uygulama hatalarını en aza indiriyoruz."),
        ("From emergency fixes to planned maintenance, Ironis is committed to restoring your metal assets efficiently and reliably, helping you minimize downtime and extend the life of your equipment.", "Eğer projenizde dış cephe ya da ilgili kaplama altı bir ihtiyaç varsa, keşif ve doğru sistem kararıyla ilerlemek en sağlıklı sonuçları verir."),
        ("Scope of service", "Hizmet kapsamı"),
        ("What", "Diğer"),
        ("We Offer.", "Hizmetler."),
    ],
    "services/industrial-metalwork/index.html": [
        ("<title>Industrial Metalwork</title>", "<title>Korkuluk & Balkon Demirleri | Şimşekler Ferforje</title>"),
        ("We specialize in crafting durable, high-precision metal components and structures for industrial.", "Balkon, merdiven ve duvar üstü uygulamalarda dayanıklı korkuluk çözümleri üretiyoruz."),
        ("Precision Fabrication for Industry", "Korkuluklarda güvenlik ve mimari uyum"),
        ("Ironis specializes in robust and precise industrial metalwork designed to meet the rigorous demands of heavy-duty applications. Our expertise spans fabricating structural components, custom machinery parts, and large-scale assemblies crafted from high-grade metals like steel and aluminum.", "Korkuluk ve balkon demiri uygulamalarında güvenlik, oran ve detay aynı anda düşünülmelidir. Şimşekler Ferforje olarak merdiven, balkon ve duvar üstü çözümlerinde hem güven veren hem de mekâna uyum sağlayan üretimler yapıyoruz."),
        ("Utilizing advanced fabrication techniques including cutting, welding, and finishing, we ensure every product meets stringent quality and safety standards. Our skilled team works closely with industrial clients to provide tailored solutions that enhance operational efficiency and durability.", "Kullanım alanına göre yükseklik, hat, dolgu ve birleşim kararlarını netleştiriyor; montajı da buna göre planlıyoruz. Böylece uygulama tamamlandığında hem görsel bütünlük hem dayanım dengeli bir sonuç veriyor."),
        ("From prototype development to mass production, Ironis delivers industrial metalwork built for performance and longevity across sectors such as manufacturing, construction, and energy.", "Bodrum villaları ve yaşam alanları için ürettiğimiz korkuluklarda temiz işçilik ve uzun ömürlü kullanım odağını koruyoruz."),
        ("Scope of service", "Hizmet kapsamı"),
        ("What", "Diğer"),
        ("We Offer.", "Hizmetler."),
    ],
    "projects/index.html": [
        ("<title>Portfolio</title>", "<title>Projeler | Şimşekler Ferforje</title>"),
        ("<meta content=\"Portfolio\" property=\"og:title\"/>", "<meta content=\"Projeler | Şimşekler Ferforje\" property=\"og:title\"/>"),
        ("<meta content=\"Portfolio\" property=\"twitter:title\"/>", "<meta content=\"Projeler | Şimşekler Ferforje\" property=\"twitter:title\"/>"),
        ("Crafted with Precision.", "Tamamlanan işlerimizden seçmeler."),
        ("Each project we take on is built with precision, durability, and a commitment to excellence in every detail.", "Her proje; ölçü, uygulama disiplini ve temiz işçilik odağıyla tamamlandı."),
        ("Feb 2025", "Bodrum"),
        ("Oct 2024", "Yalıkavak"),
        ("Sep 2023", "Gündoğan"),
        ("Des 2023", "Konacık"),
    ],
    "projects/modern-staircase-design/index.html": [
        ("<title>Modern Staircase Design</title>", "<title>Villa Giriş Kapısı | Şimşekler Ferforje</title>"),
        ("Client:", "Proje türü:"),
        ("Insight Studio", "Villa girişi"),
        ("Date:", "Konum:"),
        ("Bodrum", "Bodrum"),
        ("The Modern Staircase Design project represents our dedication to merging functionality with aesthetics. Built with premium-grade metals, this staircase combines durability, safety, and sleek style, making it a centerpiece for any modern interior. Every element, from the precision cutting to the smooth finishing, was carefully executed to ensure long-lasting performance and a flawless appearance. Our team worked closely with designers and architects to bring the client’s vision to life, resulting in a staircase that not only enhances the space but also reflects contemporary design standards. This project is a clear example of how we transform raw materials into architectural features that are both practical and visually inspiring.", "Bu villa giriş kapısı projesinde, yapının mimarisine uygun çizgilerle güvenlik ve estetiği birlikte ele aldık. Açılım yönü, geçiş genişliği, dolgu oranı ve cepheye uyum gibi kararlar saha ölçüsüyle netleştirildi; üretim ve montaj tek plan üzerinden ilerletildi. Ortaya, dış mekânda uzun ömürlü kullanım sunan ve güçlü ilk izlenim oluşturan bir giriş çözümü çıktı."),
        ("Key Features of the Project:", "Proje öne çıkanları:"),
        ("Premium Materials – Built with high-grade metals for maximum strength and longevity.", "Çift kanat giriş çözümü – Cepheye uygun oran ve rahat kullanım."),
        ("Precision Craftsmanship – Each component was carefully cut, welded, and finished to perfection.", "Özel detaylı metal işçilik – Hat, birleşim ve bitişlerde temiz sonuç."),
        ("Contemporary Aesthetics – Clean lines and sleek design that enhance modern interiors.", "Sahaya uygun ölçülendirme – Montaj sırasında sorunsuz yerleşim."),
        ("Client Collaboration – Close teamwork with architects and designers to match the client’s vision.", "Mimari uyum – Giriş cephesini tamamlayan dengeli görünüm."),
        ("Safety & Functionality – Designed not only for style but also for everyday use and reliability.", "Güvenli kullanım – Günlük açılıp kapanmaya uygun sağlam kurgu."),
        ("This project stands as a true example of how our expertise turns raw metal into architectural art that elevates any space.", "Bu uygulama, Şimşekler Ferforje'nin ölçüye özel kapı üretiminde estetik ve dayanımı bir araya getiren yaklaşımını yansıtıyor."),
    ],
    "projects/architectural-metalwork/index.html": [
        ("<title>Architectural Metalwork</title>", "<title>Ferforje Korkuluklar | Şimşekler Ferforje</title>"),
        ("Client:", "Proje türü:"),
        ("Insight Studio", "Korkuluk uygulaması"),
        ("Date:", "Konum:"),
        ("Yalıkavak", "Yalıkavak"),
        ("Our Architectural Metalwork project reflects the seamless blend of design and durability. With precision engineering and a creative approach, we crafted custom metal structures that not only serve functional purposes but also stand out as striking design elements. Every curve, cut, and finish was executed with care to bring the architect’s vision to life.", "Bu ferforje korkuluk projesinde güvenlik, oran ve mimari detay birlikte ele alındı. Balkon ve geçiş alanlarında kullanılan çizgi dili, yapının genel karakterine uyacak şekilde sade ama güçlü bir görünüm hedefiyle üretildi."),
        ("Key Features of the Project:", "Proje öne çıkanları:"),
        ("Custom Design Solutions – Tailored to meet unique architectural requirements.", "Ölçüye özel uygulama – Alanın mimarisine göre netleştirilen ölçüler."),
        ("High-Quality Finishes – Polished, brushed, or coated metals for long-lasting beauty.", "Temiz ferforje işçiliği – Hatlarda ve birleşimlerde dengeli görünüm."),
        ("Integration with Structures – Designed to complement both modern and traditional spaces.", "Güvenlik odağı – Kullanım alanına uygun yükseklik ve detay çözümü."),
        ("Detail-Oriented Craftsmanship – From small accents to large-scale elements.", "Cepheyle uyum – Yapıyı ağırlaştırmadan tamamlayan çizgiler."),
        ("Durability & Strength – Built to withstand time and environmental challenges.", "Uzun ömürlü kullanım – Dış mekân koşullarına uygun üretim yaklaşımı."),
        ("This project demonstrates our ability to transform metal into a versatile medium for architecture, adding elegance, strength, and character to any space.", "Sonuç; güven veren, estetik görünen ve yaşam alanını daha karakterli hale getiren bir korkuluk uygulaması oldu."),
    ],
    "projects/sheet-metal-creations/index.html": [
        ("<title>Sheet Metal Creations</title>", "<title>Çelik Pergola | Şimşekler Ferforje</title>"),
        ("Client:", "Proje türü:"),
        ("Insight Studio", "Pergola uygulaması"),
        ("Date:", "Konum:"),
        ("Gündoğan", "Gündoğan"),
        ("Our Sheet Metal Creations project highlights the versatility and precision of modern metalworking. By shaping and forming sheet metal into functional and artistic pieces, we were able to deliver results that balance strength, aesthetics, and innovation. From intricate designs to large-scale structures, this project reflects our commitment to craftsmanship and adaptability.", "Bu çelik pergola projesinde hedef; dış yaşam alanına gölge, düzen ve mimari bütünlük kazandıran sağlam bir çözüm üretmekti. Taşıyıcı sistem, açıklıklar ve montaj noktaları kullanıma göre planlandı; üretim sahaya uygun şekilde hazırlandı."),
        ("Key Features of the Project:", "Proje öne çıkanları:"),
        ("Precision Forming – Accurate shaping and bending for flawless results.", "Taşıyıcı planlama – Açıklık ve yük dengesine uygun kurgu."),
        ("Custom Fabrication – Designed to meet specific client needs and visions.", "Ölçüye özel üretim – Alanın kullanımına göre hazırlanan sistem."),
        ("Durable Materials – High-quality sheet metal built to last.", "Dış mekâna uygun çözüm – Dayanım ve kullanım rahatlığı odağı."),
        ("Versatile Applications – From industrial parts to decorative elements.", "Temiz uygulama – Montajda net ve dengeli bitiş."),
        ("Attention to Detail – Every cut, curve, and finish executed with care.", "Mimariye uyum – Yapının genel çizgisiyle uyumlu görünüm."),
        ("This project is a testament to how sheet metal can be transformed into both practical solutions and works of art, showcasing the limitless possibilities of metal fabrication.", "Bu uygulama, Şimşekler Ferforje'nin çelik konstrüksiyonda işlev ve estetiği birlikte ele alan yaklaşımını gösteriyor."),
    ],
    "projects/custom-machine-parts/index.html": [
        ("<title>Custom Machine Parts</title>", "<title>BoardeX Dış Cephe | Şimşekler Ferforje</title>"),
        ("Client:", "Proje türü:"),
        ("Insight Studio", "BoardeX uygulaması"),
        ("Date:", "Konum:"),
        ("Konacık", "Konacık"),
        ("The Custom Machine Parts project demonstrates our expertise in producing highly accurate and durable components tailored to unique industrial needs. Each part was designed and fabricated with precision, ensuring perfect compatibility, reliability, and performance for our client’s machinery. By combining advanced equipment with skilled craftsmanship, we delivered solutions that not only met but exceeded technical requirements.", "Bu BoardeX dış cephe uygulamasında amaç; sistem detaylarını doğru kurarak temiz ve güvenilir bir yüzey elde etmekti. Alt konstrüksiyon, levha kararları ve birleşim detayları saha şartlarına göre planlandı; uygulama boyunca sistem disiplini ön planda tutuldu."),
        ("Key Features of the Project:", "Proje öne çıkanları:"),
        ("Tailored Solutions – Every part designed to fit exact machinery specifications.", "Doğru sistem kurgusu – Alt yapı ve detayların proje ihtiyacına göre planlanması."),
        ("High Precision – Fabricated with advanced tools for flawless accuracy.", "Temiz uygulama sırası – Sahada hatayı azaltan planlı ilerleyiş."),
        ("Durability Guaranteed – Built with robust metals to withstand heavy use.", "Cephe uyumu – Yüzey bütünlüğünü koruyan dikkatli montaj."),
        ("Efficient Performance – Parts engineered for optimal functionality.", "Yerinde çözüm – Projeye göre şekillenen detay yaklaşımı."),
        ("Quality Control – Rigorous inspections at every stage of production.", "Kontrollü sonuç – Uygulama kalitesini öne alan bitiş."),
        ("This project reflects our ability to create custom-engineered components that support industrial efficiency and long-term reliability.", "Bu iş, Şimşekler Ferforje'nin BoardeX uygulamalarında malzeme kadar detay ve uygulama disiplinine önem veren yaklaşımını yansıtıyor."),
    ],
    "faq/index.html": [
        ("<title>FAQ</title>", "<title>SSS | Şimşekler Ferforje</title>"),
        ("Your Guide to Ironis.", "Süreç, fiyat ve uygulama hakkında sık sorulanlar."),
        ("From initial concept through final production, we’re committed to excellence, reliability, and results that help your business thrive.", "Ferforje, kapı, korkuluk, çelik konstrüksiyon ve BoardeX uygulamalarında kullanıcıların en çok sorduğu soruları burada topladık."),
        ("Frequently Asked<br/>Questions.", "Sık Sorulan<br/>Sorular."),
        ("What services does Ironis offer?", "Hangi alanlarda hizmet veriyorsunuz?"),
        ("We specialize in metal fabrication, welding, sheet metal work, CNC machining, custom parts production, structural frames, and industrial prototyping.", "Ferforje, kapı üretimleri, korkuluklar, çelik konstrüksiyon, özel tasarım ve BoardeX uygulamalarında hizmet veriyoruz."),
        ("Do you handle custom projects?", "Keşif ve ölçü alma süreci nasıl ilerliyor?"),
        ("Yes. We work closely with clients to design and produce custom components based on technical drawings, specifications, or ideas.", "Önce alanı görüyor veya fotoğraf ve yaklaşık ölçüleri inceliyoruz. Ardından ihtiyaç, model ve uygulama detayını netleştirip teklif sürecine geçiyoruz."),
        ("What industries do you serve?", "Ferforje kapı veya korkuluk fiyatını neler belirler?"),
        ("We serve a wide range of sectors including construction, automotive, agriculture, furniture, energy, and electronics.", "Ölçü, model, dolgu tipi, uygulama alanı, montaj koşulu ve tercih edilen detay seviyesi fiyatı doğrudan etkiler."),
        ("How long does a typical project take?", "Teslim süresi neye göre değişiyor?"),
        ("Project timelines vary depending on complexity, but most orders are completed within 2–6 weeks.", "Teslim süresi işin kapsamına, üretim detayına ve sahadaki montaj gereksinimine göre değişir. Net süre, keşif ve ölçü sonrası paylaşılır."),
        ("Can you work with custom designs?", "Özel tasarım işler için örnek görsel gönderebilir miyim?"),
        ("Yes. Our team can work with your drawings or create a design from scratch to meet your exact specifications.", "Evet. Beğendiğiniz görseller, yaklaşık ölçüler veya el çizimi üzerinden ilerleyip projeye uygun çözüm geliştirebiliriz."),
        ("What materials do you work with?", "BoardeX hangi alanlarda kullanılır?"),
        ("We work with a variety of metals, including steel, stainless steel, aluminum, and other specialty alloys.", "BoardeX; doğru sistem detayıyla dış cephe ve ilgili yardımcı uygulamalarda kullanılan bir çözümdür. En doğru yaklaşım, projeye göre sistem kararı almaktır."),
        ("How do you ensure product quality?", "Bodrum ikliminde paslanmaya karşı nasıl bir yaklaşım izleniyor?"),
        ("Every project goes through strict inspection and quality control processes to meet industry standards and client expectations.", "Dış mekân uygulamalarında doğru malzeme, yüzey hazırlığı ve uygulama disiplini birlikte düşünülür. Projeye göre uygun çözüm seçilerek uzun ömürlü kullanım hedeflenir."),
    ],
    "contact-us/index.html": [
        ("<title>Contact Us</title>", "<title>İletişim | Şimşekler Ferforje</title>"),
        ("Get in Touch With Our Metal Experts.", "Teklif ve keşif için bize ulaşın."),
        ("First name*", "Ad*"),
        ("Last name*", "Soyad*"),
        ("Email*", "E-posta*"),
        ("Phone number*", "Telefon*"),
        ("Service*", "Hizmet*"),
        ("Select service...", "Hizmet seçin..."),
        ("Get in touch with our metal team today.", "Ferforje, kapı, çelik ve BoardeX işleriniz için bize yazın."),
        ("We’re ready to bring your ideas to life. Reach out today and let’s discuss how we can support your next project.", "En hızlı teklif süreci için mümkünse alanın 2-3 fotoğrafını ve yaklaşık ölçüleri paylaşın. Sonrasında keşif, ölçü ve uygulama planını birlikte netleştirelim."),
        ("Trusted by", "Öne Çıkan"),
        ("Frequently Asked<br/>Questions.", "Sık Sorulan<br/>Sorular."),
        ("What services does Ironis offer?", "Keşif için hangi bilgileri paylaşmalıyım?"),
        ("We specialize in metal fabrication, welding, sheet metal work, CNC machining, custom parts production, structural frames, and industrial prototyping.", "Alan fotoğrafları, yaklaşık ölçü ve beklentinizi paylaşırsanız daha hızlı yönlendirme yapabiliriz."),
        ("Do you handle custom projects?", "Montaj hizmeti veriyor musunuz?"),
        ("Yes. We work closely with clients to design and produce custom components based on technical drawings, specifications, or ideas.", "Evet. Üretim kadar sahadaki temiz uygulama ve montaj sürecini de planlı şekilde yürütüyoruz."),
        ("What industries do you serve?", "Bodrum dışındaki projeler için de iletişime geçebilir miyim?"),
        ("We serve a wide range of sectors including construction, automotive, agriculture, furniture, energy, and electronics.", "Projenin lokasyonu ve kapsamına göre değerlendirme yapabiliriz. En doğru yönlendirme için iş detaylarını paylaşmanız yeterli."),
        ("How long does a typical project take?", "Teklif süresi nasıl ilerliyor?"),
        ("Project timelines vary depending on complexity, but most orders are completed within 2–6 weeks.", "İhtiyaç netleştikten sonra işin kapsamına göre kısa sürede teklif ve yol haritası paylaşılır."),
    ],
}


def replace_literal(content: str, old: str, new: str, count: int | None = None) -> str:
    if old in content:
        if count is None:
            return content.replace(old, new)
        return content.replace(old, new, count)
    if new in content:
        return content
    return content


def apply_route_replacements(content: str) -> str:
    for pattern, replacement in COMMON_ROUTE_REPLACEMENTS:
        content = re.sub(pattern, replacement, content)
    return content


def iter_site_html_paths():
    for path in ROOT.rglob("*.html"):
        relative = path.relative_to(ROOT)
        if relative.parts and relative.parts[0] == "docs":
            continue
        yield path


def apply_global_brand_replacements() -> None:
    for path in iter_site_html_paths():
        content = path.read_text(encoding="utf-8-sig")
        updated = content

        for old, new in GLOBAL_BRAND_REPLACEMENTS:
            updated = updated.replace(old, new)

        if updated != content:
            path.write_text(updated, encoding="utf-8-sig")


def write_alias_pages() -> None:
    template = """<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/><meta http-equiv="refresh" content="0; url={target}"/><title>Yönlendiriliyor...</title><script>window.location.replace('{target}');</script></head><body></body></html>"""
    for relative_path, target in ALIAS_ROUTES.items():
        path = ROOT / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(template.format(target=target), encoding="utf-8")


def main() -> None:
    for relative_path in TARGET_FILES:
        path = ROOT / relative_path
        content = path.read_text(encoding="utf-8-sig")

        content = apply_route_replacements(content)

        for replacement in PAGE_REPLACEMENTS.get(relative_path, []):
            if len(replacement) == 2:
                old, new = replacement
                count = None
            else:
                old, new, count = replacement
            content = replace_literal(content, old, new, count)

        for replacement in COMMON_TEXT_REPLACEMENTS:
            if len(replacement) == 2:
                old, new = replacement
                count = None
            else:
                old, new, count = replacement
            content = replace_literal(content, old, new, count)

        for replacement in COMMON_HTML_REPLACEMENTS:
            if len(replacement) == 2:
                old, new = replacement
                count = None
            else:
                old, new, count = replacement
            content = replace_literal(content, old, new, count)

        for replacement in CLEANUP_REPLACEMENTS:
            if len(replacement) == 2:
                old, new = replacement
                count = None
            else:
                old, new, count = replacement
            content = replace_literal(content, old, new, count)

        path.write_text(content, encoding="utf-8-sig")

    write_alias_pages()
    apply_global_brand_replacements()


if __name__ == "__main__":
    main()
