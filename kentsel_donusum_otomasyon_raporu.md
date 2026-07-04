# Kentsel Donusum Projelendirme Akisi ve Otomasyon Raporu

Hazirlayan: Codex  
Incelenen kok klasor: `D:\Ilkbahar Insaat\KENTSEL DONUSUM PROJELENDIRME`  
Inceleme tarihi: 2026-07-02

## 1. Yonetici Ozeti

Bu dosya seti bir mimarlik ofisinin kentsel donusum teklif hazirlama surecini asama asama tasiyor. Klasor yapisi iki ana katmandan olusuyor:

1. `ASAMA 1-7`: Ofisin ham uretim akisi.
2. `CAYVOX TALEP 17-06-2026`: Otomasyon/aktarım icin derlenmis daha duzenli ornek paket.

Akis su omurgaya oturuyor:

1. Parsel ve imar paftasi bulunur.
2. Derinlik, hmax, cekme mesafeleri ve yapilabilir kitle yorumlanir.
3. Mevcut bina planlari ve eski metrajlar okunur.
4. Mevcut malik/daire haklari yeni projeye aktarilir.
5. Cekirdek kutuphanesinden uygun merdiven/asansor/cozum secilir.
6. Revit/DWG uzerinden yeni kat planlari ve alternatifler uretilir.
7. Net/brut alanlar, muteahhit/arsa sahibi paylasimi ve denklestirme hesaplanir.
8. Mevzuat kontrolleri yapilir.
9. PNG/PSD paftalar, paylasim cetveli ve teklif PDF dosyasi hazirlanir.

Bu akisin tam otomasyonu icin yalnizca dosya donusturme yeterli degil; bir "imar kurallari + geometrik planlama + paylasim optimizasyonu + teklif dokumantasyonu" sistemi gerekir. En kritik ihtiyaclar: standart veri modeli, DWG/RVT entegrasyonu, eski plan OCR/dijitizasyonu, parametrik cekirdek/daire kutuphanesi, mevzuat kurallari motoru, paylasim optimizasyonu ve versiyonlu cikti uretimi.

## 2. Dosya Envanteri

Toplam dosya sayisi: 214  
Yaklasik toplam veri: 2 GB+

Dosya tipleri:

| Tip | Adet | Yaklasik toplam boyut | Islev |
|---|---:|---:|---|
| `.dwg` | 81 | 176 MB | Imar paftalari, derinlik calismalari, cekirdek kutuphanesi, plan cizimleri |
| `.png` | 43 | 103 MB | Kat planlari, paylasim cetvelleri, sunum paftalari |
| `.psd` | 28 | 737 MB | Photoshop duzenleme dosyalari, pafta/sunum gorselleri |
| `.pdf` | 28 | 245 MB | Mevzuat, teklif dosyalari, CAD/Revit plan ciktilari |
| `.tif` | 12 | 78 MB | Mevcut bina plan taramalari |
| `.xlsx` | 8 | 0.07 MB | Eski metraj listeleri |
| `.rvt` | 4 | 352 MB | Revit modelleri |
| `.docx` | 2 | kucuk | Mimari karar mantigi ve operasyonel baglam |
| `.bak` | 6 | 5.8 MB | DWG yedekleri |
| `.log` | 1 | kucuk | AutoCAD plot kaydi |
| `.xz` | 1 | 414 MB | CAYVOX paket arsivi |

Ana klasorler:

| Klasor | Dosya | Islev |
|---|---:|---|
| `ASAMA 1/parsel paftalari` | 4 | Parsel/imar paftasi kaynak DWG'leri |
| `ASAMA 2/derinlik hesaplari` | 1 | Derinlik hesabi DWG calismasi |
| `ASAMA 3/cekirdek denemeleri` | 25 | Cekirdek tipleri: tek/cift asansor, isiklikli/isikliksiz, yangin merdiveni vb. |
| `ASAMA 4/mevzuat` | 4 | ABB imar, otopark, siginak, yangin yonetmelikleri |
| `ASAMA 5/eski planlar` | 8 | Mevcut bina TIF taramalari |
| `ASAMA 5/excel metraj` | 7 | Mevcut daire/mahal/net alan metrajlari |
| `ASAMA 6/plan cizme` | 11 | Yeni plan DWG calismalari |
| `ASAMA 7/teklif dosyalari` | 11 | Musteriye giden teklif PDF'leri |
| `CAYVOX.../2532-1 PARSEL` | 46 | Parsel ornek paketi: TIF, DWG, RVT, PDF, PNG, PSD, paylasim |
| `CAYVOX.../2647-6 PARSEL` | 20 | Parsel ornek paketi ve alternatifler |
| `CAYVOX.../4300-2 PARSEL` | 22 | Parsel ornek paketi, metraj, paylasim |
| `CAYVOX.../CEKIRDEK KUTUPHANESI` | 31 | Cekirdek kutuphanesinin tekrar paketlenmis hali |
| `CAYVOX.../DERINLIK EMSAL ORNEK PARSELLER` | 4 | Derinlik emsal ornekleri |
| `CAYVOX.../ORNEK KAT PLANLARI` | 17 | 50/60/70/80/90/100/110 m2 tip planlar ve RVT/DWG ornegi |

## 3. Kaynak Belgelerden Cikan Mimari Karar Mantigi

`MIMARI KARAR MANTIGI.docx` dosyasinda akisin karar kurallari yazilmis. Temel bulgular:

### 3.1 Daire karmasi

Daire karmasi iki ana olcute gore belirleniyor:

1. Dairenin m2 buyuklugu.
2. Yonetmelikten gelen cephe/oda olcusu sartlari.

Kodlanacak kurallar:

| Kural | Sistem karsiligi |
|---|---|
| Oda 9 m2 altina inmemeli | Mahal minimum alan kontrolu |
| Oda genisligi en az 2.5 m olmali | Geometrik minimum genislik kontrolu |
| Banyo genisligi en az 1.5 m olmali | Islak hacim minimum genislik kontrolu |
| Banyo 3 m2 altina inmemeli | Islak hacim minimum alan kontrolu |
| Acik mutfakta salon genisligi en az 3 m olmali | Acik mutfak-salon kombinasyon kontrolu |
| Acik mutfakli salon 16.5 m2 altina inmemeli | Minimum salon+mutfak alani |
| Cephe uygunsa minimum 1+1 yaklasik 28.5 m2 | Daire tipi alt siniri |
| 3+1'de acik mutfak tercih edilmiyor | Daire tipi/mutfak tipi karar kurali |
| Acik mutfak 2+1'e kadar kullaniliyor | Mutfak tipi ust siniri |
| 1+1'de 1 banyo makul | Daire tipi islak hacim sayisi |
| 2+1'den itibaren en az 2 banyo/WC/ebeveyn banyo | Islak hacim adet kurali |
| 4+1'de 3 banyo/WC/ebeveyn banyo olabilir | Ust tip plan konfor kurali |

### 3.2 Paylasim ve kat karsiligi

Ofisin varsayilan is modeli:

- Kat karsiligi orani genelde `muteahhit %40 / arsa sahipleri %60`.
- Pazar, bina konumu ve ilce gibi faktorler bu orani degistirebilir.
- Eski cephe/konumlar mumkun oldugunca korunur.
- Her arsa sahibine ayni kucultme orani uygulanmalidir.
- Muteahhit dairelerinin konumu muteahhit menfaatine gore secilir.

Sistem bunu sadece basit yuzde hesabina indirgememeli. Gerekli motor:

1. Eski bagimsiz bolum net/brut haklarini okur.
2. Yeni bagimsiz bolumleri daire tipi, cephe, kat, konum ve m2 ile puanlar.
3. Arsa sahibi paylarini esit kucultme oranina gore dagitir.
4. Muteahhit payini kalan/optimize edilen birimlerden olusturur.
5. Gerekirse denklestirme bedeli hesaplar.

### 3.3 Katilim payi / denklestirme

Katilim payi hedef orandan dusukse arsa sahibine para odenir; yuksekse arsa sahibinden para alinir. Bedel, fark m2 ile arsanin m2 birim fiyati uzerinden hesaplanir. Bu durum "nadir" tutulmali; yani sistem once mimari cozum ve paylasim optimizasyonuyla denge aramalidir.

### 3.4 Net-brut iliskisi

On calismada tipik katsayi `1.12`:  
`brut alan = net alan x 1.12`

Fakat finalde bu kaba katsayi yerine her daire ozelinde hesap gerekir:

- Duvar alanlari
- Saftlar
- Net supurulebilir alanlar
- Balkon/teras
- Ortak alan paylari

### 3.5 Derinlik hesabi

Dokumanda verilen hesap:

`derinlik = ((parsel sag kenari + parsel sol kenari) / 2) - yola mesafe - (hmax / 2)`

Ek kurallar:

- `hmax = 0.5 + 3 x parsel kat sayisi`
- Ayrik nizamda hmax en fazla 22 m.
- Bitisik nizamda hmax en fazla 20 m.
- Yola mesafe 5 m'den buyukse 5 m alinabilir.
- Derinlik 15 m'den kucukse 15 m kabul edilir.
- Arka cephe mesafesi en az 3 m olmali.
- Virgullu sonuc 0.5'ten kucukse alta, buyukse uste yuvarlanir.

Bu kisim otomasyonda ayri ve test edilebilir bir "imar/derinlik hesaplayici" olarak kurulmalidir.

### 3.6 Cekirdek secimi

Karar mantigi:

- Cekirdek en az m2 harcayacak sekilde secilmeli.
- Her daireden cekirdege ulasim kolay olmali.
- Hat holu en az 1.20 m olmali.
- Mevzuata uygun olmali.

Dosyalardaki cekirdek kutuphanesi:

- Tek asansor cekirdek
- Cift asansor cekirdek
- Isiklikli/isikliksiz cekirdek
- Yangin merdiveni
- Dubleks merdiveni
- Kucuk kare/oval varyasyonlar

Bu dosyalar sistemde parametrik blok/kutuphaneye donusturulmeli: boyut, asansor adedi, merdiven tipi, yangin kacis durumu, isiklik ihtiyaci, toplam alan, baglanti yonleri, minimum hol sartlari.

### 3.7 Otopark

Dokuman "yonetmelik ne diyorsa odur" diyor. Bu, otopark hesabinin statik metinden degil versiyonlu mevzuat kurallarindan gelmesi gerektigini gosterir. Daire sayisi, daire tipi/m2, ticari birimler, bodrum olanagi ve yerel idare kurallariyla hesaplanmali.

## 4. Operasyonel Baglam

`OPERASYONEL BAGLAM.docx` dosyasindan cikanlar:

- Parsel geldiginde hazir olmasi gerekenler:
  - Ada/parsel bilgisi
  - Mevcut bina plani
  - Her daire icin eski metraj olculeri
  - Cankaya e-imar bilgileri
  - TKGM eski bina bilgileri
- Kapasite: mimar basina ayda yaklasik 4 teklif; toplam yaklasik 8 teklif/ay.
- Teknik sartname sabit.

Bu kapasite, sistemin ilk etapta tam otomatik tasarimdan once "teklif hazirlama suresini kisaltan yarim otomatik operator sistemi" olarak kurulmasinin daha dogru oldugunu gosterir.

## 5. Gozlenen Uretim Akisi

### 5.1 ASAMA 1 - Parsel paftalari

Girdi:

- `BAHCELIEMEK-IMARPAFTASI.dwg`
- `kizlarpinari kentsel donusum imar.dwg`
- `CANKAYA-SAG.dwg`
- `CANKAYA-SOL.dwg`

Islev:

- Parselin pafta uzerinde bulunmasi.
- Sag/sol kenar, yol cepheleri, nizam, kat sayisi, cekme mesafeleri gibi imar girdilerinin okunmasi.

Otomasyon ihtiyaci:

- DWG parsel paftasi okuyucu.
- Parsel arama ve geometri eslestirme.
- Pafta koordinat sistemi/olcek standardi.
- E-imar/TKGM veri entegrasyonu ile manuel pafta okumanin azaltilmasi.

### 5.2 ASAMA 2 - Derinlik hesaplari

Girdi:

- `KENTSEL ON CALISMA (1).dwg`

Islev:

- Parsel derinligi ve yapilabilir kitle sinirinin calisilmasi.

Otomasyon ihtiyaci:

- Derinlik hesap motoru.
- Hmax, kat sayisi, nizam, yol mesafesi ve arka cekme mesafesi kontrolleri.
- Hesabin izlenebilir raporu.

### 5.3 ASAMA 3 - Cekirdek denemeleri

Girdi:

- 25 DWG cekirdek varyasyonu.

Islev:

- Parsel ve daire karmasina uygun merdiven/asansor/hol cozumunu secmek.

Otomasyon ihtiyaci:

- Cekirdek kutuphanesi katalogu.
- Her cekirdek icin metadata:
  - Alan
  - En/boy
  - Asansor adedi
  - Yangin merdiveni var/yok
  - Isiklik ihtiyaci
  - Giris yonleri
  - Uygun oldugu parsel/kat tipi

### 5.4 ASAMA 4 - Mevzuat

Mevcut dosyalar:

- Ankara Buyuksehir Belediyesi Imar Yonetmeligi
- Otopark Yonetmeligi
- Siginak Yonetmeligi
- Yangin Yonetmeligi

Islev:

- Tasarimin imar, yangin, otopark, siginak ve minimum mahal kurallarina uygunlugunu kontrol etmek.

Otomasyon ihtiyaci:

- Mevzuat versiyonlama.
- Kural motoru.
- Kural-test eslesmesi: her kuralin hangi hesapla kontrol edildigi izlenmeli.
- Insan onayi gerektiren gri alanlar icin manuel karar notu.

### 5.5 ASAMA 5 - Eski plan ve metraj

TIF dosyalari:

- 300 DPI, tek sayfa, 1-bit cok uzun tarama seritleri.
- Genellikle mevcut mimari proje paftalari.

Excel dosyalari:

Standartlasan kolonlar:

- `KAT NO`
- `BB NO` veya `Daire No`
- `MAHAL ADI` veya `Mesken Adi`
- `NET M2` veya `Alani`
- `TOPLAM`

Gozlenen toplamlar:

| Dosya | Non-empty satir | Yaklasik eski net/veri toplami | Birim etiketi sayisi |
|---|---:|---:|---:|
| `2532-1 ESKI METRAJ 2.xlsx` | 17 | 1652.00 | 16 |
| `2647-6 ESKI METRAJ.xlsx` | 48 | 533.37 | 6 |
| `2803-30 ESKI METRAJ.xlsx` | 113 | 1142.17 | 15 |
| `4300-2 eski metraj (1).xlsx` | 94 | 914.80 | 14 |
| `4306-33 eski metraj.xlsx` | 123 | 823.76 | karmasik format |
| `4307-54 eski metraj.xlsx` | 65 | 673.42 | 8 |
| `4309-21 ESKI METRAJLAR.xlsx` | 74 | 547.85 | karmasik format |
| `4300-2 eski metraj.xlsx` | 44 | 401.04 | 8 |

Not: Bazi Excel dosyalarinda formuller ve kolon yerlesimi standart degil. Bu nedenle ilk otomasyon modulu "Excel normalizasyonu" olmali.

### 5.6 ASAMA 6 - Plan cizme

Girdi/cikti:

- Yeni plan DWG'leri.
- Dosya adlari ada-parsel ve tarih/son/alternatif bilgisini tasiyor.

Ornekler:

- `2532-1 PLAN - 16-04-2026.dwg`
- `2647-6 plan - Floor Plan - L1 - Architectural.dwg`
- `4300-2 - Floor Plan - L1 - Architectural son (1).dwg`

Otomasyon ihtiyaci:

- Plan versiyon yonetimi.
- DWG/RVT kaynak-iliski takibi.
- Kat planlarinin semantik objelere ayrilmasi:
  - Daire
  - Mahal
  - Cekirdek
  - Islak hacim
  - Balkon/teras
  - Dukkan/depo
  - Arsa sahibi/muteahhit ayrimi

### 5.7 ASAMA 7 - Teklif dosyalari

11 adet teklif PDF'i var. Bunlar genellikle A3 yatay sayfa duzeninde.

2532 teklif PDF'inde gozlenen sayfa kurgusu:

1. Kapak
2. Kurumsal giris / marka anlatimi
3. Marka/konsept sayfasi
4. Projelerimiz listesi
5. Cephe modeli / malzeme anlatimi
6. Teknik sartname
7. Kentsel donusum on bilgilendirme
8. Neden kentsel donusum
9+. Eski kat planlari
Son bolumler:
- Yeni kat planlari
- Paylasim cetveli
- Notlar/disclaimer

PDF metinlerinde su sabit metin mantigi var:

- "Bu calisma on etut niteligindedir..."
- Uygulama projesi asamasinda revizyon yapilabilecegi notu.
- Nihai imalatlarin uygulama projeleri ve teknik sartnameye gore belirlenecegi notu.

Otomasyon ihtiyaci:

- Teklif PDF sablon motoru.
- Marka/kurumsal sablon.
- Parsel bazli otomatik kapak.
- Teknik sartname sablonu.
- Plan gorseli yerlestirme.
- Paylasim cetveli otomatik yerlestirme.
- Yasal/teknik disclaimer sabit metin yonetimi.

## 6. CAYVOX Paketinden Cikan Sistem Tasarimi

CAYVOX klasoru, ofis akisini daha sistematik bir ornek veri setine cevirmis.

### 6.1 Parsel paket yapisi

Bir parsel klasorunde beklenen dosyalar:

- Mevcut plan taramasi: `.tif`
- Eski metraj: `.xlsx`
- Derinlik calismasi: `.dwg`
- Yeni plan calismasi: `.dwg`
- Revit modeli: `.rvt`
- PDF model ciktisi: `.pdf`
- Sunum planlari: `.png`
- Duzenlenebilir sunum dosyalari: `.psd`
- Paylasim cetveli: `.png`
- Gerekirse plot logu: `.log`

Bu, otomasyonda her proje icin standart "project package" formatina donusturulmeli.

### 6.2 Ornek kat planlari

`ORNEK KAT PLANLARI` icinde 50, 60, 70, 80, 90, 100, 110 m2 tip plan PNG/PSD'leri var. Bunlar daire uretiminde tipoloji kutuphanesi olarak kullanilabilir.

Gerekli metadata:

- Hedef net m2
- Oda sayisi
- Mutfak tipi
- Banyo/WC sayisi
- Cephe ihtiyaci
- Minimum en/boy
- Balkon/teras durumu
- Ebeveyn banyo var/yok

### 6.3 Cikti formatlari

PNG/PSD ciktisi cogunlukla `4961x3508` piksel. Bu, yatay A3 sayfa oranina denk gelir. Sistem bu pafta formatini standart kabul edebilir.

AutoCAD plot logu:

- Kaynak: Model alanindan plot
- Cihaz: `AutoCAD PDF (High Quality Print).pc3`
- Kagit: `ISO full bleed A2 (594 x 420 mm)`
- Ornek olcek: `1:230.509`

Bu bilgiler cikti motorunda standart ayar olarak tanimlanmali.

## 7. Kritik Teknik Bulgular

### 7.1 DWG/RVT entegrasyonu

81 DWG dosyasinin tamami `AC1032`, yani AutoCAD 2018 ve sonrasi formatta.

Bu ortamda AutoCAD/Revit komut satiri araci yoktu; bu nedenle DWG/RVT ic geometrisi dogrudan acilmadi. Sistem gelistirilirken su yollardan biri gerekir:

1. Autodesk Platform Services / Design Automation
2. Lokal AutoCAD Core Console
3. Lokal Revit add-in
4. ODA/Teigha tabanli DWG okuyucu
5. Ofis tarafindan DXF/IFC/SVG/PDF export standardi

### 7.2 Tekrar ve versiyon problemi

Hash kontrolunde cok sayida birebir tekrar bulundu:

- ASAMA 3 cekirdek denemelerindeki 23 DWG, CAYVOX cekirdek kutuphanesinde birebir tekrar.
- 2532 TIF, ASAMA 5 ve CAYVOX parsel klasorunde birebir tekrar.
- 2647 TIF, ASAMA 5 ve CAYVOX parsel klasorunde birebir tekrar.
- 2532/2647/4300 plan DWG'leri ASAMA 6 ile CAYVOX parsel klasorlerinde tekrar.

Gerekli sistem ozelligi:

- Hash tabanli deduplikasyon.
- Kaynak dosya / turetilmis dosya ayrimi.
- Versiyon numarasi.
- `son`, `yeni`, `x`, `alternatif 1` gibi belirsiz adlar yerine semantik versiyonlama.

### 7.3 Eski plan taramalari zorlayici

TIF'ler cok buyuk 1-bit tarama seritleri. Bu dosyalar icin:

- Otomatik kirpma
- Pafta bolme
- OCR
- Oda siniri/duvar tespiti
- Metrajla capraz dogrulama

gerekir.

### 7.4 Excel formatlari tam standart degil

Bazi dosyalarda kolonlar standart; bazilarinda formuller ve alanlar farkli konumda. Bu nedenle once "metraj normalizasyon pipeline" kurulmalidir.

### 7.5 Teklif PDF'lerinde metin/gorsel karisimi var

Teklif PDF'lerinin bazi sayfalari metin cikartmaya uygun, bazi sayfalari imaj/plan olarak duruyor. Sistem cikti uretiminde her sayfayi yeniden sablondan olusturmali; mevcut PDF'ten tersine veri okumaya guvenmemeli.

## 8. Onerilen Otomasyon Sistemi

### 8.1 Ana moduller

1. Proje kabul ve dosya yutma modulu
   - Klasorleri tarar.
   - Dosya tiplerini siniflandirir.
   - Ada/parsel, tarih, asama, versiyon, kaynak/cikti iliskisi cikarir.
   - Hash ile tekrar dosyalari bulur.

2. Parsel ve imar veri modulu
   - Ada/parsel, mahalle, ilce, imar durumu, nizam, kat adedi, hmax, cekme mesafeleri.
   - E-imar/TKGM entegrasyonu.
   - DWG paftadan veya resmi kaynaktan parsel geometrisi.

3. Derinlik ve yapilabilir kitle motoru
   - Sag/sol parsel kenari.
   - Yol mesafesi.
   - Hmax.
   - Derinlik hesabi.
   - Minimum 15 m / arka 3 m kontrolu.
   - Ayrik/bitisik hmax siniri.

4. Mevcut bina okuma modulu
   - TIF/PDF eski proje on isleme.
   - Excel metraj parser.
   - Bagimsiz bolum, kat, mahal, net alan normalizasyonu.
   - Eski malik hak tablosu.

5. Tip plan ve cekirdek kutuphanesi
   - 50-110 m2 tip daireler.
   - Cekirdek DWG bloklari.
   - Parametrik metadata.
   - Kullanim kosullari.

6. Daire karmasi ve plan optimizasyon motoru
   - Minimum mahal kurallari.
   - Cephe uygunlugu.
   - Oda sayisi/m2 iliskisi.
   - Acik/kapali mutfak karari.
   - Banyo/WC sayisi.
   - Muteahhit/arsa sahibi pay hedefi.
   - Eski cephe/konum koruma.

7. CAD/BIM uretim modulu
   - Revit/DWG uretimi veya yari otomatik tasarim yardimi.
   - Mahal etiketleri.
   - Alan hesaplari.
   - Pafta export.
   - PDF/PNG/PSD yerine mumkunse vektor/sablon tabanli cikti.

8. Mevzuat uygunluk motoru
   - ABB imar yonetmeligi.
   - Otopark.
   - Siginak.
   - Yangin.
   - Mahal minimumlari.
   - Cekirdek/hol/kacis kontrolleri.

9. Paylasim ve denklestirme motoru
   - Eski haklar.
   - Yeni daire degerleri.
   - %40/%60 veya proje ozel orani.
   - Esit kucultme orani.
   - Arsa sahibi/muteahhit atamasi.
   - m2 farki ve bedel denklestirme.

10. Teklif dosyasi uretim modulu
    - Kapak.
    - Kurumsal sayfalar.
    - Teknik sartname.
    - Kentsel donusum bilgilendirme.
    - Eski planlar.
    - Yeni planlar.
    - Paylasim cetveli.
    - Disclaimer.

11. Kalite kontrol ve onay modulu
    - Mimari kontrol listesi.
    - Mevzuat kontrol listesi.
    - Alan/paylasim tutarlilik kontrolu.
    - Plot/pafta kontrolu.
    - Insan onayi.

### 8.2 Veri modeli

Minimum tablolar/objeler:

- `Project`
  - proje_id, ada, parsel, mahalle, ilce, tarih, durum
- `Parcel`
  - geometri, cepheler, sag/sol kenar, yol mesafesi, alan
- `ZoningInfo`
  - nizam, kat_sayisi, hmax, emsal, TAKS/KAKS, cekme mesafeleri
- `ExistingBuilding`
  - mevcut katlar, bagimsiz bolum sayisi, toplam alan
- `ExistingUnit`
  - malik, kat, bb_no, cephe, eski_net, eski_brut, mahal listesi
- `ExistingRoom`
  - unit_id, mahal_adi, net_m2
- `CoreType`
  - ad, dwg_ref, alan, asansor_adedi, merdiven_tipi, isiklik, yangin, giris_yonleri
- `UnitType`
  - 1+1/2+1/3+1/4+1, hedef_m2, min_cephe, mutfak_tipi, banyo_sayisi
- `NewPlan`
  - versiyon, rvt/dwg_ref, kat planlari, durum
- `NewUnit`
  - kat, unit_no, tip, net, brut, balkon, cephe, atanan_taraf
- `ShareAllocation`
  - eski_hak, yeni_hak, fark_m2, denklestirme_bedeli, atama_gerekcesi
- `ComplianceCheck`
  - kural, sonuc, tolerans, ihlal, onaylayan
- `Artifact`
  - dosya_yolu, hash, tip, kaynak_mi, turetilmis_mi, versiyon, bagli_project_id

### 8.3 Is akisi

1. Yeni proje acilir.
2. Ada/parsel ve temel konum bilgileri girilir.
3. E-imar/TKGM ve/veya pafta dosyalari baglanir.
4. Sistem parsel dosyalarini siniflandirir.
5. Derinlik/hmax/cekme hesaplari uretilir.
6. Mevcut plan ve Excel metrajlari yuklenir.
7. Eski bagimsiz bolum tablosu normalize edilir.
8. Daire karmasi icin hedefler girilir:
   - Kat karsiligi orani
   - Minimum/maximum daire tipleri
   - Muteahhit tercihleri
   - Malik konum koruma onceligi
9. Sistem cekirdek adaylarini onerir.
10. Sistem tip plan/daire karmasi alternatifleri uretir.
11. Mimar alternatifleri inceler ve secer.
12. CAD/BIM uretimi veya yari otomatik cizim yardimi calisir.
13. Alanlar hesaplanir.
14. Paylasim cetveli olusur.
15. Mevzuat ve kalite kontrol raporu uretilir.
16. Teklif PDF/PNG paketi olusur.
17. Insan onayi ile versiyon kilitlenir.

## 9. MVP Onerisi

Tam otomatik plan uretimi en zor katman. MVP asamali kurulmalidir.

### MVP-1: Veri ve teklif otomasyonu

Hedef: Mevcut mimari cizim surecini bozmadan teklif hazirlamayi hizlandirmak.

Kapsam:

- Dosya yutma ve otomatik siniflandirma.
- Excel metraj normalizasyonu.
- Derinlik hesaplayici.
- Mevcut/yeni alan tablolari.
- Paylasim cetveli uretimi.
- Teklif PDF sablonu.
- Proje paket standardi.
- Deduplikasyon/versiyon kontrolu.

Beklenen fayda:

- Teklif dosyasi hazirlama suresi azalir.
- Paylasim hatalari azalir.
- Teklifler standartlasir.
- Arama/arsivleme kolaylasir.

### MVP-2: CAD/BIM destekli yari otomasyon

Kapsam:

- Revit/AutoCAD eklentisi.
- Mahal ve daire alanlarini otomatik cekme.
- Plan PDF/PNG export standardi.
- Cekirdek kutuphanesi secim yardimcisi.
- Daire tipi uygunluk kontrolu.

### MVP-3: Parametrik plan alternatifleri

Kapsam:

- Parsel geometrisine gore cekirdek ve daire yerlesim onerileri.
- 50-110 m2 tip plan kutuphanesinden varyasyon uretimi.
- Paylasim ve mimari kaliteye gore alternatif puanlama.
- Mimar onayli iteratif tasarim.

## 10. Kalite Kontrol Listesi

Her proje icin otomatik kontrol edilmeli:

### Veri kontrolu

- Ada/parsel bilgisi var mi?
- E-imar/TKGM bilgisi var mi?
- Mevcut plan var mi?
- Eski metraj var mi?
- Malik/bagimsiz bolum listesi tamam mi?
- TIF/Excel toplam bagimsiz bolum sayisi uyumlu mu?

### Imar kontrolu

- Nizam dogru mu?
- Kat sayisi ve hmax dogru mu?
- Derinlik hesabi dogru mu?
- Arka cekme mesafesi en az 3 m mi?
- Derinlik minimum 15 m kuralina uyuyor mu?
- Yol mesafesi 5 m siniri dogru uygulanmis mi?

### Mimari kontrol

- Oda minimum 9 m2 mi?
- Oda genisligi minimum 2.5 m mi?
- Banyo minimum 3 m2 ve 1.5 m genislikte mi?
- Acik mutfakli salon minimum 16.5 m2 ve 3 m genislikte mi?
- 3+1'de acik mutfak kullanilmamis mi?
- 2+1 ve ustunde ikinci islak hacim var mi?
- Hat holu minimum 1.20 m mi?
- Her daire cekirdege erisebiliyor mu?

### Paylasim kontrol

- Kat karsiligi oran hedefi saglandi mi?
- Her arsa sahibine ayni kucultme orani uygulandi mi?
- Eski cephe/konum mumkun oldugunca korundu mu?
- Muteahhit payi dogru ayrildi mi?
- Denklestirme gerekiyorsa m2 ve bedel hesaplandi mi?

### Cikti kontrol

- PNG paftalar dogru boyutta mi?
- PDF sayfa sirasi dogru mu?
- Teknik sartname guncel mi?
- Disclaimer eklendi mi?
- Paylasim cetveli son versiyon mu?
- Dosya adlari ve versiyonlar temiz mi?

## 11. Riskler ve Kararlar

| Risk | Etki | Oneri |
|---|---|---|
| DWG/RVT ic geometrisi dogrudan okunamazsa | Plan otomasyonu kisitlanir | Autodesk/ODA/Revit eklentisi karari erken verilmeli |
| Dosya adlari belirsiz: `son`, `yeni`, `x` | Yanlis versiyon kullanimi | Semantik versiyonlama zorunlu olmali |
| Excel formatlari farkli | Metraj hatasi | Normalizasyon ve manuel onay ekrani |
| TIF taramalari cok buyuk ve 1-bit | OCR/dijitizasyon zor | On isleme ve pafta bolme modulu |
| Mevzuat yoruma acik | Yanlis otomatik karar | Kural motoru + mimar onayi |
| Paylasim sadece m2 degil, konum/deger de iceriyor | Adil olmayan dagitim | Daire deger puanlama modeli |
| Pazar/ilce/konum orani etkiliyor | %40/%60 her projeye uymaz | Proje bazli oran parametresi |

## 12. Sonuc

Bu klasor bir mimarlik ofisinin kentsel donusum teklif akisini oldukca iyi temsil ediyor. Dosyalar, akisin sadece cizim uretmekten ibaret olmadigini; imar okuma, mevcut hak analizi, daire karmasi, cekirdek secimi, plan alternatifleri, paylasim ekonomisi, mevzuat kontrolu ve teklif sunumu gibi birbirine bagli kararlardan olustugunu gosteriyor.

Onerilen sistem, ilk asamada mimarin karar surecini kayda alan ve tekrar eden isleri otomatiklestiren bir "teklif operasyon platformu" olarak kurulmalidir. Ikinci asamada CAD/BIM entegrasyonu, ucuncu asamada parametrik plan onerisi eklenmelidir.

En onemli tasarim ilkesi: Sistem, mimari karari tamamen kara kutu olarak vermemeli; her sonucu gerekcesi, kullanilan kural, kaynak dosya ve insan onayi ile izlenebilir hale getirmelidir.
