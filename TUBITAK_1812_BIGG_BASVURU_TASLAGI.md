
Kaynak alınan resmî belgeler:

* [1812 2026-1 Çağrı Duyurusu PDF](https://tubitak.gov.tr/sites/default/files/2026-03/1812-2026-1_Cagri_Duyurusu_260225.pdf)
* [BiGG 1. Aşama PRODİS Kılavuzu PDF](https://tubitak.gov.tr/sites/default/files/2026-03/BiGG_1_Asama_PRODIS_Kilavuzu.pdf)
* [1812 Uygulama Esasları PDF](https://tubitak.gov.tr/sites/default/files/2026-01/1812_72YK_islenmis_hali.pdf)

## 1. İş Fikri / Girişim Adı

**Project Asylum**

## 2. İş Fikrinin Kısa Tanımı

Project Asylum; kurumların kendi bilgi işlem altyapılarında çalışacak şekilde tasarlanan, dış servis bağımlılığı bulunmayan, yerel çalışan yapay zeka destekli siber güvenlik analiz, karar destek ve kademeli otomasyon platformudur.

Sistem, klasik güvenlik tarama araçlarından farklı olarak yalnızca açık tespiti yapmakla kalmamakta; yerel sistemlerden güvenlik sinyalleri toplamakta, bu sinyalleri risklere dönüştürmekte, akıl yürütme ve politika katmanlarıyla karar gerekçesi üretmekte ve uzun vadede güven kazanımına dayalı kontrollü otonom güvenlik aksiyonları için temel oluşturmaktadır.

## 3. Problem Tanımı ve İhtiyaç Analizi

Küçük ve orta ölçekli işletmeler ile sınırlı güvenlik ekibine sahip kurumlar, siber güvenlik operasyonlarını sürekli, tutarlı ve maliyet etkin biçimde yürütememektedir. Mevcut durumda kullanılan araçlar çoğunlukla güvenlik bulgusu üretmekte; ancak bu bulguların bağlama oturtulması, önceliklendirilmesi ve güvenli aksiyon planına dönüştürülmesi yüksek oranda insan uzmanlığı gerektirmektedir.

Bu durum aşağıdaki temel problemlere yol açmaktadır:

* güvenlik uyarılarının yorumlanması için sürekli uzman ihtiyacı,
* yanlış pozitifler nedeniyle verimsizlik,
* kritik açıkların önceliklendirilmesinde gecikme,
* küçük ekiplerin kurumsal seviyede güvenlik görünürlüğü sağlayamaması,
* dış API veya dış bulut servislerine bağlı güvenlik çözümlerinde veri egemenliği sorunu.

Project Asylum, bu problemlere şirket içinde çalışabilen, kararlarını açıklayabilen ve zaman içinde daha güvenli otomasyona ilerleyebilen bir güvenlik ajanı yaklaşımıyla çözüm üretmeyi hedeflemektedir.

## 4. Çözüm Önerisi

Project Asylum’un sunduğu çözüm, yerel ve self-hosted çalışan bir yapay zeka destekli güvenlik platformudur. Sistem aşağıdaki temel bileşenler üzerinden çalışmaktadır:

* **Observation Engine:** yerel sistem, süreç, ağ, yapılandırma ve runtime sinyallerinin toplanması,
* **Risk Engine:** sinyallerin risk seviyesine ve kanıt yoğunluğuna göre puanlanması,
* **Reasoning Engine:** bulgulardan inanç ve hipotez üretimi,
* **Critic Engine:** üretilen kararların ikinci kez değerlendirilmesi,
* **Policy Engine:** farklı güvenlik duruşlarına göre kararların filtrelenmesi,
* **Trust / Autonomy Engine:** sistemin geçmiş başarı ve triage sonuçlarına göre güven kazanımı oluşturması,
* **Planning ve Task Layer:** kararların kontrollü görev adımlarına dönüştürülmesi.

Bu yapı sayesinde sistem, sadece “risk bulundu” dememekte; aynı zamanda:

* riskin neden önemli olduğunu,
* hangi politika eşiğine takıldığını,
* hangi durumda aksiyonun ertelendiğini,
* hangi ortamda daha yüksek güvene sahip olduğunu
  açıklayabilmektedir.

## 5. Teknoloji Düzeyi ve Yenilikçi Yönü

Project Asylum’un yenilikçi yönü, klasik tarama mantığını aşan, açıklanabilir karar zinciri ve policy-aware güvenlik ajanı mimarisi sunmasıdır.

Yenilikçi unsurlar aşağıda özetlenmiştir:

* dış API’ye bağımlı olmayan local-first mimari,
* self-hosted kullanım ve veri egemenliği odağı,
* observation → risk → reasoning → critic → policy → trust zinciri ile açıklanabilir karar üretimi,
* farklı SOC profillerine göre değişebilen güvenlik karar mantığı,
* güven kazanımına dayalı “earned autonomy” yaklaşımı,
* aynı ortam ve aksiyon tipine göre öğrenen güven skoru altyapısı.

Teknoloji düzeyi açısından proje; güvenlik yazılımı, karar destek sistemleri ve yapay zeka tabanlı siber güvenlik otomasyonu alanlarının kesişiminde konumlanmaktadır.Bu yaklaşım, klasik SIEM/XDR sistemlerinden farklı olarak yalnızca tespit değil, karar üretimi ve açıklanabilirlik katmanlarını entegre ederek yeni bir güvenlik operasyon paradigması sunmaktadır.

## 6. Ürün / Hizmetin Hedef Kullanıcıları

Projenin hedef müşteri kitlesi aşağıdaki yapı ve segmentlerden oluşmaktadır:

* küçük ve orta ölçekli teknoloji şirketleri,
* kendi altyapısını yöneten yazılım firmaları,
* güvenlik ekibi sınırlı olan işletmeler,
* verisini üçüncü taraf servislerle paylaşmak istemeyen kurumlar,
* self-hosted ve kurum içi kurulabilen güvenlik çözümlerine ihtiyaç duyan yapılar,
* operasyonel güvenlik yükünü azaltmak isteyen SOC benzeri ekipler.

## 7. Hedef Pazar ve Ticarileşme Potansiyeli

Siber güvenlik alanında özellikle son yıllarda artan düzenleyici baskılar, veri güvenliği hassasiyeti ve uzman insan kaynağı maliyeti; güvenlik operasyonlarını daha verimli ve açıklanabilir sistemlerle destekleme ihtiyacını artırmıştır.

Project Asylum’un ticarileşme potansiyeli aşağıdaki eksenlerde değerlendirilmektedir:

* self-hosted ve local-first çözüm ihtiyacının artması,
* küçük ekiplerin güvenlik operasyonlarında otomasyon talebinin yükselmesi,
* dış API bağımlılığı olmayan çözümlere kurumsal ilginin artması,
* lisanslanabilir ve kurum içine kurulabilir bir ürün modeli sunması.

Öngörülen gelir modeli:

* yıllık/aylık lisanslama,
* kurulum ve konfigürasyon hizmeti,
* kurumsal bakım / destek sözleşmeleri,
* ileri seviye modüller için katmanlı ürünleme.

Projenin hedef iş modelinde, müşteri başına aylık 500 – 1500 USD aralığında lisans geliri hedeflenmektedir. Ürün olgunluğu ve kurumsal kullanım düzeyine bağlı olarak bu değer ilerleyen aşamalarda artış gösterebilir.

## 8. Teknik Uygulanabilirlik ve Mevcut Geliştirme Düzeyi

Project Asylum yalnızca fikir aşamasında değildir. Hâlihazırda backend odaklı çalışan bir prototip mimarisi geliştirilmiştir.

Mevcut durumda sistemde aşağıdaki teknik bileşenler mevcuttur:

* prompt analizi,
* observation katmanı,
* risk puanlama katmanı,
* reasoning ve hypothesis üretimi,
* critic ve policy katmanı,
* planning ve task execution modeli,
* execution geçmişinin kalıcı tutulması,
* trust / confidence modeli,
* environment ve action bazlı güven trend hafızası,
* backend test altyapısı.

Mevcut sistem, farklı senaryolar üzerinden test edilmiş olup, log analizi ve risk üretimi süreçlerinde çalışır çıktılar elde edilmiştir. İlk aşamada kontrollü test ortamlarında doğrulama yapılmış, bir sonraki aşamada gerçek sistemlerde pilot kurulum planlanmaktadır.

Mevcut teknik seviye, projenin konsept aşamasını geçtiğini; prototipleme, ürünleşme ve pilot hazırlık fazına girebilecek olgunluğa ulaştığını göstermektedir.

## 9. Ticarileşmeye Giden Yol Haritası

### Kısa Vadeli Hedefler

* detection ve triage odaklı ilk ürünleştirme,
* güvenilir execution pipeline’ın iyileştirilmesi,
* test ve false positive ölçüm altyapısının genişletilmesi,
* kurulum ve deployment süreçlerinin sadeleştirilmesi.

### Orta Vadeli Hedefler

* policy-backed remediation dry-run katmanı,
* güvenli ve kontrollü otomasyon seviyeleri,
* kurum içi pilot kurulumlar,
* raporlama ve operasyonel görünürlük modülleri.

### Uzun Vadeli Hedefler

* güven kazanımına bağlı kademeli otonomi,
* action-level trust modeli,
* kurumsal ölçekte çok profilli güvenlik operasyon desteği,
* lisanslanabilir ürün ve destek modeli ile sürdürülebilir gelir yapısı.

## 10. Rekabet Avantajı

Project Asylum’un rekabet avantajı aşağıdaki başlıklarda öne çıkmaktadır:

* dış API bağımlılığı olmaması,
* veriyi kurum dışında işlememe yaklaşımı,
* açıklanabilir karar zinciri,
* farklı politika profilleriyle çalışabilen mimari,
* güvenlik taraması ile güvenlik karar desteğini aynı platformda birleştirmesi,
* zaman içinde güven kazanımına dayalı kontrollü otomasyon yaklaşımı.

Mevcut pazarda CrowdStrike, SentinelOne ve Elastic Security gibi çözümler güçlü tespit yeteneklerine sahiptir. Ancak bu sistemler çoğunlukla tespit odaklıdır ve karar üretimi ile açıklanabilirlik katmanlarında sınırlıdır. Project Asylum bu boşluğu doldurmayı hedeflemektedir.

## 11. Proje Ekibi ve Yetkinlik

Proje kurucusu; ürün vizyonu, teknik mimari, yerel çalışan güvenlik ajanı yaklaşımı ve backend karar motoru omurgası üzerinde aktif geliştirme yapmaktadır. Proje, erken aşamada teknik derinlik ve ürünleşme potansiyeli taşıyan bir girişim olarak ilerlemektedir.

İlerleyen aşamalarda aşağıdaki alanlarda ekip genişlemesi planlanmaktadır:

* backend / güvenlik yazılım geliştirme,
* ürünleştirme ve deployment,
* test/evaluation altyapısı,
* kurumsal satış ve pilot yönetimi.

## 12. Riskler ve Önlemler

### Teknik Riskler

* yanlış pozitif oranlarının yüksek kalması,
* otomatik aksiyon tarafında güvenlik riski,
* farklı kurum ortamlarında davranış farklılığı.

### Alınacak Önlemler

* formal test katmanının genişletilmesi,
* confidence ve trust modelinin kalıcı hafıza ile güçlendirilmesi,
* önce dry-run sonra düşük riskli otomasyon yaklaşımının benimsenmesi,
* policy ile sınırlandırılmış aksiyon modeli.

## 13. Beklenen Katma Değer

Project Asylum’un beklenen katma değeri aşağıdaki alanlarda ortaya çıkmaktadır:

* güvenlik operasyon maliyetlerini düşürme,
* küçük ekiplerin daha güçlü güvenlik görünürlüğü elde etmesi,
* güvenlik kararlarını açıklanabilir hale getirme,
* veri egemenliği yüksek, kurum içi kullanım senaryolarında güçlü alternatif oluşturma,
* yerli ve ticarileştirilebilir teknoloji geliştirme potansiyeli.

Projenin, güvenlik ekiplerinin manuel analiz yükünü %30-50 oranında azaltması ve yanlış pozitifleri önemli ölçüde düşürmesi hedeflenmektedir. Sistem olgunluğu arttıkça bu etkinin daha da yükselmesi öngörülmektedir.

## 14. Yatırım İhtiyacı ve Kullanım Planı

Talep edilen yatırım:

200.000 – 300.000 TL

Bu yatırım ile:
* gerekli teknik alt yapı kurulacak
* sistem geliştirmesi için gerekli araçlar alınacak
* test ortamları ve pilot hazırlıkları kurulup gerçek hayata hazırlanılacak

* Bu yatırımın %40’ı test ve pilot altyapısına, %35’i geliştirme süreçlerine, %25’i deployment ve doğrulama süreçlerine ayrılacaktır.

## 15. Pilot ve Doğrulama Stratejisi

Project Asylum’un pazara giriş stratejisinde pilot kurulumlar kritik rol oynamaktadır.

Pilot süreç kapsamında:

* sınırlı sayıda kurumda kontrollü kurulum yapılması,
* yalnızca detection ve triage modüllerinin aktif kullanılması,
* false positive ve risk doğruluğu metriklerinin ölçülmesi,
* kullanıcı geri bildirimlerinin toplanması,
* sistemin güven skorlarının gerçek ortamda test edilmesi hedeflenmektedir.

## 16. Başarı Metrikleri (KPI)

Projenin teknik ve ticari başarısı aşağıdaki metrikler üzerinden ölçülecektir:

* false positive oranı,
* tespit edilen risklerin doğruluk oranı,
* kullanıcı başına düşen manuel müdahale süresinin azalması,
* pilot müşterilerden elde edilen geri bildirimler,
* sistemin önerdiği aksiyonların uygulanabilirlik oranı.

## 17. Go-To-Market Yaklaşımı

İlk aşamada hedeflenen pazara giriş stratejisi aşağıdaki gibidir:

* küçük ve orta ölçekli teknoloji firmalarına doğrudan erişim,
* pilot kurulum üzerinden referans müşteri oluşturma,
* teknik demo ve canlı sistem gösterimleri ile satış sürecinin desteklenmesi,
* güvenlik danışmanlığı ve kurulum hizmetleri ile birlikte paket satış modeli oluşturulması.



## 18. Yatırımcıya Sunulan Değer Önerisi

Project Asylum, erken aşamada yatırımcıya aşağıdaki fırsatları sunmaktadır:

* yüksek büyüme potansiyeline sahip siber güvenlik pazarına giriş,
* farklılaşmış local-first ve explainable AI yaklaşımı,
* teknik olarak geliştirilmiş ve prototip seviyesini aşmış bir ürün,
* doğru konumlandırma ile ölçeklenebilir lisans modeli.

Bu doğrultuda proje, erken aşama yatırım ile hızla ürünleşebilecek ve pazarda konumlanabilecek bir girişim olarak değerlendirilmektedir.

## 19. İlk Kullanım Senaryosu

Project Asylum’un ilk ürün versiyonu, özellikle Linux tabanlı sunucu ortamlarında log analizi ve risk triage üzerine odaklanmaktadır.

Sistem, syslog, auth.log ve uygulama loglarını analiz ederek:

brute force saldırılarını
privilege escalation girişimlerini
anormal süreç davranışlarını
otomatik olarak tespit edip önceliklendirmektedir.

## 20. Sonuç

Project Asylum; teknoloji ve yenilik odaklı, ciddi bir ticarileşme potansiyeli bulunan, mevcut durumda çalışan teknik omurgaya sahip bir girişimdir. 



