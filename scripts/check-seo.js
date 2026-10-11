// Validate the published static content, not just generator functions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base='https://simseklerferforje.com';
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const titles=new Set();let questions=0,links=0;
for(const url of urls){
  const route=new URL(url).pathname;
  const html=fs.readFileSync(path.join(root,route,'index.html'),'utf8');
  const title=html.match(/<title>(.*?)<\/title>/)?.[1];
  assert(title&&!titles.has(title),'Missing/duplicate title '+route);titles.add(title);
  assert.equal((html.match(/<h1\b/g)||[]).length,1,'H1 '+route);
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1,'Canonical count '+route);
  assert(html.includes(`rel="canonical" href="${url}"`),'Canonical destination '+route);
  assert(!/<meta[^>]*content="[^"]*noindex/.test(html),'Noindex '+route);
  const graph=JSON.parse(html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1])['@graph'];
  const ids=new Set();graph.forEach(n=>{if(n['@id']){assert(!ids.has(n['@id']),'Duplicate entity '+route);ids.add(n['@id']);}});
  assert(ids.has(url+'#webpage'),'Page entity '+route);
  assert(ids.has(base+'/#business'),'Business entity '+route);
  assert.equal(graph.find(n=>n['@type']==='LocalBusiness').email,'info@simseklerferforje.com');
  const breadcrumbs=graph.find(n=>n['@type']==='BreadcrumbList');
  if(breadcrumbs)assert.equal(breadcrumbs.itemListElement.at(-1).item,url,'Breadcrumb '+route);
  const plain=html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
  const faq=graph.find(n=>n['@type']==='FAQPage');
  if(faq)for(const q of faq.mainEntity){assert(plain.includes(q.name)&&plain.includes(q.acceptedAnswer.text),'Invisible FAQ '+q.name);questions++;}
  for(const m of html.matchAll(/(?:href|src)="(\/[^"?#]*)(?:[?#][^"]*)?"/g)){
    let target=path.join(root,decodeURIComponent(m[1]));
    if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
    assert(fs.existsSync(target),'Missing local target '+route+' -> '+m[1]);links++;
  }
  if(route==='/bodrum-ferforje-rehberi/'){
    for(const m of html.matchAll(/href="#([^"]+)"/g))assert(html.includes(`id="${m[1]}"`),'Missing guide anchor');
    assert.equal(graph.find(n=>n['@type']==='Article').mainEntityOfPage['@id'],url+'#webpage');
    assert(plain.includes('Yalıkavak Sanayi Sitesi 171. sokak no:26'));
    assert.equal((html.match(/<th scope="row">/g)||[]).length,6);
  }
}
assert(urls.includes(base+'/bodrum-ferforje-rehberi/'),'Guide missing from sitemap');
for(const route of ['/','/sss/','/hizmetler/ferforje/'])assert(fs.readFileSync(path.join(root,route,'index.html'),'utf8').includes('href="/bodrum-ferforje-rehberi/"'),'Guide discovery '+route);
console.log(`PASS: ${urls.length} indexable pages, ${links} local references, ${questions} schema FAQ answers; guide identity, anchors and discovery.`);
