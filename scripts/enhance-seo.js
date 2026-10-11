// Focused, repeatable SEO pass. Does not rebuild the existing page layouts.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const geo = require('./geo-content.js');
geo.buildGuide(root);
const base = 'https://simseklerferforje.com';
const brand = 'Şimşekler Ferforje';
const reviewed = '2026-10-11'; // Content review date, not the generator execution date.
const address = 'Yalıkavak Mahallesi, Yalıkavak Sanayi Sitesi 171. sokak no:26, 48990 Bodrum/Muğla';
const mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
const pages = [
  [geo.route, geo.title, geo.description],
  ['/', 'Yalıkavak ve Bodrum Ferforje, Demir Kapı', 'Yalıkavak’taki atölyemizden Bodrum için ölçüye özel ferforje, demir kapı, korkuluk, çelik konstrüksiyon ve BoardeX çözümleri. Keşif ve teklif için ulaşın.'],
  ['/hakkimizda/', 'Hakkımızda · Yalıkavak, Bodrum', 'Şimşekler Ferforje’yi tanıyın. Yalıkavak, Bodrum’da ölçüye özel metal üretimi, ferforje, kapı ve korkuluk işlerinde keşiften montaja çalışma sürecimiz.'],
  ['/hizmetler/', 'Bodrum Ferforje ve Metal İşleri', 'Bodrum ve Yalıkavak’ta ferforje, çelik konstrüksiyon, kapı, korkuluk, özel tasarım ve BoardeX hizmetleri. İhtiyacınıza uygun hizmeti inceleyin.'],
  ['/hizmetler/ferforje/', 'Bodrum ve Yalıkavak Ferforje', 'Bodrum ve Yalıkavak’ta ölçüye özel ferforje kapı ve demir detay üretimi. Model, ölçü ve montaj ihtiyacınıza göre keşif ve teklif alın.'],
  ['/hizmetler/celik-konstruksiyon/', 'Bodrum Çelik Konstrüksiyon', 'Bodrum’da çelik konstrüksiyon ve metal yapı çözümleri. Projenize, ölçülere ve saha koşullarına uygun üretim ve montaj için bizimle görüşün.'],
  ['/hizmetler/kapi-uretimleri/', 'Yalıkavak ve Bodrum Demir Kapı', 'Yalıkavak ve Bodrum’da villa girişi ve bahçe için ölçüye özel demir kapı üretimi. Model, dolgu ve montaj detayları için keşif ve teklif alın.'],
  ['/hizmetler/korkuluk-balkon/', 'Bodrum Balkon ve Merdiven Korkuluğu', 'Bodrum’da balkon, merdiven ve teras için ölçüye özel metal korkuluk çözümleri. Kullanım alanına uygun model, üretim ve montaj için iletişime geçin.'],
  ['/hizmetler/ozel-tasarim/', 'Bodrum Özel Tasarım Metal Üretimi', 'Bodrum’da özel tasarım metal üretimi: referans fotoğraf, çizim ve ölçülerden projeye uygun çözümler. Üretim ve montaj detaylarını birlikte netleştirelim.'],
  ['/hizmetler/boardex-uygulamalari/', 'Bodrum BoardeX Uygulamaları', 'Bodrum’da BoardeX ve cephe uygulamaları. Yapının koşullarına ve proje detayına uygun sistem, uygulama kapsamı ve teklif için bize ulaşın.'],
  ['/projeler/', 'Bodrum Metal ve Ferforje Projeleri', 'Ferforje kapı, korkuluk, çelik konstrüksiyon ve BoardeX proje örneklerini inceleyin. Bodrum’daki projeniz için ölçüye özel çözümleri konuşalım.'],
  ['/projeler/modern-staircase-design/', 'Villa Giriş Kapısı Projesi', 'Villa giriş kapısı projesinde metal işçiliği, tasarım ve uygulama detaylarını inceleyin. Bodrum’da kendi giriş kapınız için bizimle görüşün.'],
  ['/projeler/architectural-metalwork/', 'Balkon ve Merdiven Korkuluk Projesi', 'Balkon ve merdiven korkuluk projesindeki metal detayları inceleyin. Bodrum’da alanınıza ve ölçülerinize uygun korkuluk için teklif isteyin.'],
  ['/projeler/sheet-metal-creations/', 'Çelik Pergola Projesi', 'Çelik pergola projesinin tasarım ve uygulama detaylarını inceleyin. Bodrum’da projenize özel çelik konstrüksiyon çözümleri için bize ulaşın.'],
  ['/projeler/custom-machine-parts/', 'BoardeX Cephe Projesi', 'BoardeX cephe projesindeki uygulama detaylarını inceleyin. Bodrum’da yapınıza uygun sistem ve uygulama kapsamını birlikte değerlendirelim.'],
  ['/sss/', 'Ferforje ve Metal İşleri · Sık Sorulanlar', 'Ferforje, kapı ve korkulukta fiyat, keşif, ölçü, teslim süresi ve özel tasarım hakkında sorularınız. Bodrum’daki çalışma sürecimizi öğrenin.'],
  ['/iletisim/', 'Yalıkavak Atölye · İletişim ve Teklif', 'Şimşekler Ferforje: Yalıkavak Sanayi Sitesi 171. Sokak No:26, Bodrum. 0532 359 53 49 · info@simseklerferforje.com. Keşif ve teklif için ulaşın.'],
];
const services = {
  ferforje: ['Ferforje', 'Ferforje fiyatı nasıl belirlenir?', 'Ölçü, model, dolgu tipi ve montaj koşulları fiyatı etkiler. Yaklaşık ölçü ve fotoğraf paylaşarak başlayabilirsiniz; teklif kapsamı keşif ve detaylar netleşince belirlenir.'],
  'celik-konstruksiyon': ['Çelik konstrüksiyon', 'Çelik konstrüksiyon teklifi için neler gerekir?', 'Varsa mimari ve statik proje, yaklaşık ölçüler, kullanım amacı ve saha fotoğrafları paylaşılmalıdır. Kesit ve bağlantı kararları yalnız fotoğrafa göre kesinleştirilmez; proje ve saha koşulları değerlendirilir.'],
  'kapi-uretimleri': ['Demir kapı', 'Demir kapı modeli ve fiyatı nasıl netleşir?', 'Giriş açıklığı, kapının kullanım amacı, model, dolgu ve montaj koşulları birlikte değerlendirilir. Referans fotoğraf ve yaklaşık ölçüyle başlayabilir, üretim ölçüsünü keşifte netleştirebilirsiniz.'],
  'korkuluk-balkon': ['Korkuluk', 'Balkon veya merdiven korkuluğu için hangi bilgileri paylaşmalıyım?', 'Uygulama yeri, yaklaşık uzunluk, merdiven ya da balkon fotoğrafları ve beğendiğiniz modeli paylaşabilirsiniz. Bağlantı noktaları ve kesin ölçüler üretim öncesinde yerinde değerlendirilir.'],
  'ozel-tasarim': ['Özel tasarım metal', 'Bir fotoğraftan özel metal tasarım yapılabilir mi?', 'Referans fotoğraf, eskiz ve yaklaşık ölçüler ilk değerlendirme için kullanılabilir. Üretilebilirlik, malzeme ve montaj ayrıntıları birlikte netleştirilir; görsel tek başına kesin üretim ölçüsü değildir.'],
  'boardex-uygulamalari': ['BoardeX', 'BoardeX uygulamasında sistem nasıl seçilir?', 'Uygulama yeri, mevcut yapı ve proje detayları birlikte değerlendirilir. Dış cephede levha tek başına tüm sistemi tanımlamaz; taşıyıcı, birleşim ve kaplama detayları teklif kapsamıyla birlikte netleştirilir.'],
};
const aliases = {'ferforje':'ferforje','celik-konstruksiyon':'celik-konstruksiyon','kapilar':'kapi-uretimleri','korkuluklar':'korkuluk-balkon','ozel-tasarim':'ozel-tasarim','boardex':'boardex-uygulamalari'};
const esc = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fileFor = route => path.join(root, route, 'index.html');
function meta(html, key, value, property = false) {
  const re = new RegExp('<meta\\b(?=[^>]*(?:name|property)=["\\\']' + key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '["\\\'])[^>]*>', 'gi');
  return html.replace(re, '').replace('</head>', `<meta ${property?'property':'name'}="${key}" content="${esc(value)}"/></head>`);
}
function fixServiceCards(html) {
  // Related-service cards inherited mismatched links from the old template.
  const routes = {'Ferforje':'ferforje','Çelik Konstrüksiyon':'celik-konstruksiyon','Kapı Üretimleri':'kapi-uretimleri','Özel Tasarım':'ozel-tasarim','BoardeX Uygulamaları':'boardex-uygulamalari','Korkuluk & Balkon Demirleri':'korkuluk-balkon'};
  const starts=[...html.matchAll(/<div\b[^>]*class="[^"]*\bcollection-item-service\b[^"]*"[^>]*>/g)].reverse();
  for(const start of starts){
    const tags=/<\/?div\b[^>]*>/g;tags.lastIndex=start.index;
    let depth=0,end;for(let t;(t=tags.exec(html));){depth+=t[0].startsWith('</')?-1:1;if(!depth){end=tags.lastIndex;break;}}
    if(!end)throw new Error('Unclosed service card');
    let card=html.slice(start.index,end);
    const name=card.match(/<a\b[^>]*class="service-name"[^>]*>([^<]+)<\/a>/)?.[1].replace(/&amp;/g,'&');
    if(routes[name])card=card.replace(/href="\/hizmetler\/[^"#?]+"/g,`href="/hizmetler/${routes[name]}/"`);
    html=html.slice(0,start.index)+card+html.slice(end);
  }
  return html;
}
for (const [route, label, description] of pages) {
  const file = fileFor(route);
  let html = fs.readFileSync(file,'utf8');
  html = html.replace(/<link\b[^>]*href="\/assets\/service-help\.css"[^>]*>/g,'');
  const title = label + ' | ' + brand;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = html.replace(/<link\b(?=[^>]*rel="canonical")[^>]*>/gi,'').replace('</head>',`<link rel="canonical" href="${base+route}"/></head>`);
  for (const [k,v,p] of [['description',description],['og:title',title,true],['og:description',description,true],['og:url',base+route,true],['og:locale','tr_TR',true],['og:site_name',brand,true],['og:image',base+'/assets/business-logo-square.png',true],['og:image:alt',brand+' logosu',true],['twitter:title',title],['twitter:description',description],['twitter:image',base+'/assets/business-logo-square.png'],['twitter:card','summary'],['robots','index,follow,max-image-preview:large']]) html=meta(html,k,v,p);
  const match = html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new Error('Missing structured data: '+route);
  const parsed=JSON.parse(match[1]);
  let graph=Array.isArray(parsed)?parsed:parsed['@graph'];
  graph=graph.filter(n=>!['WebSite','WebPage','AboutPage','ContactPage','CollectionPage'].includes(n['@type']));
  graph.forEach(n=>delete n['@context']);
  const business=graph.find(n=>n['@type']==='LocalBusiness');
  Object.assign(business, {'@id':base+'/#business',name:brand,logo:base+'/assets/business-logo-square.png',telephone:'+905323595349',hasMap:mapUrl,areaServed:[{'@type':'Place',name:'Bodrum'},{'@type':'Place',name:'Yalıkavak'}]});
  const crumbs=graph.find(n=>n['@type']==='BreadcrumbList');
  if(crumbs){crumbs['@id']=base+route+'#breadcrumb';crumbs.itemListElement.at(-1).name=route==='/'?'Ana Sayfa':label;crumbs.itemListElement.at(-1).item=base+route;}
  const service=graph.find(n=>n['@type']==='Service');
  if(service){Object.assign(service,{'@id':base+route+'#service',provider:{'@id':base+'/#business'},description,areaServed:business.areaServed});}
  const faq=graph.find(n=>n['@type']==='FAQPage');
  if(faq) faq['@id']=base+route+'#webpage';
  graph.push({'@type':'WebSite','@id':base+'/#website',url:base+'/',name:brand,inLanguage:'tr-TR',publisher:{'@id':base+'/#business'}});
  const page={'@type':route==='/iletisim/'?'ContactPage':route==='/hakkimizda/'?'AboutPage':route==='/projeler/'||route==='/hizmetler/'?'CollectionPage':'WebPage','@id':base+route+'#webpage',url:base+route,name:title,description,inLanguage:'tr-TR',isPartOf:{'@id':base+'/#website'},about:{'@id':service?service['@id']:base+'/#business'}};
  if(crumbs)page.breadcrumb={'@id':crumbs['@id']};
  if(faq)Object.assign(faq,{...page,'@type':'FAQPage'});else graph.push(page);
  html=geo.enrichPage(html,route,graph,base);
  html=html.replace(match[0],`<script type="application/ld+json" data-seo-script="simsekler">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}</script>`);
  const key=route.split('/')[2];
  if(route.startsWith('/hizmetler/') && services[key]){
    const [name,q,a]=services[key];
    const questions=[[q,a],['Bodrum ve Yalıkavak için nasıl teklif alabilirim?','Yalıkavak’taki atölyemize ulaşabilir veya alanın fotoğraflarını, yaklaşık ölçülerini ve konumunu paylaşabilirsiniz. Keşif, üretim ve montaj kapsamını birlikte netleştiriyoruz.'],['Üretim ve montaj ne kadar sürer?','Süre, işin kapsamına, tasarım detayına ve saha koşullarına göre değişir. Net teslim planı, keşif ve üretim detayları belirlendikten sonra paylaşılır.']];
    const block=`<!-- service-help:start --><section class="service-help" aria-labelledby="service-help-title"><div class="base-container w-container"><h2 id="service-help-title">${name} hakkında merak edilenler</h2>${questions.map(([question,answer])=>`<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join('')}<p class="service-help-contact">Projenizi birlikte değerlendirelim: <a href="/iletisim/">Keşif ve teklif için iletişim</a> · <a href="tel:+905323595349">0532 359 53 49</a></p></div></section><!-- service-help:end -->`;
    html=html.replace(/<!-- service-help:start -->[\s\S]*?<!-- service-help:end -->/g,'');
    if(!html.includes('<div class="footer">'))throw new Error('Missing footer: '+route);
    html=html.replace('<div class="footer">',block+'<div class="footer">');
    if(!html.includes('href="/assets/service-help.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/service-help.css"/></head>');
  }
  // Make the address actionable even when JavaScript is unavailable.
  html=html.replace(/<a\b([^>]*href=")[^"]*("[^>]*)>(Yalıkavak Mahallesi[^<]*171\. sokak no:26[^<]*)<\/a>/g,`<a$1${esc(mapUrl)}$2>$3</a>`);
  html=html.replace(/local-only\.js\?v=[^"']+/g,'local-only.js?v=seo-20261011');
  html=fixServiceCards(html);
  for(const [target] of pages)if(target!=='/')html=html.replaceAll(`href="${target.slice(0,-1)}"`,`href="${target}"`);
  fs.writeFileSync(file,html);
}
for(const [alias,target] of Object.entries(aliases)){
  const route='/hizmetler/'+target+'/';
  fs.writeFileSync(fileFor('/'+alias+'/'),`<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${services[target][0]} | ${brand}</title><meta name="robots" content="noindex,follow"/><link rel="canonical" href="${base+route}"/><meta http-equiv="refresh" content="0; url=${route}"/></head><body><p>Hizmet sayfamız güncellendi. <a href="${route}">${services[target][0]} sayfasına devam edin.</a></p></body></html>`);
}
fs.writeFileSync(path.join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(([r])=>`  <url><loc>${base+r}</loc><lastmod>${reviewed}</lastmod></url>`).join('\n')}\n</urlset>\n`);
console.log(`SEO pass complete: ${pages.length} pages, ${Object.keys(aliases).length} redirects.`);
