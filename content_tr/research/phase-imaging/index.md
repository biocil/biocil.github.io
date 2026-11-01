---
title: Nicel faz ve dijital holografik mikroskopi
short: faz görüntüleme
weight: 10
summary: >-
  Saydam bir hücre ışığın parlaklığını pek değiştirmez ama onu geciktirir. Eksen dışı
  dijital holografik mikroskopi bu gecikmeyi girişim saçakları olarak kaydeder ve
  optik kalınlıktaki nanometre düzeyindeki değişimlere duyarlı bir faz haritasına çevirir.
figure_from: /publication/2012_BOPEX_Toy
figure_caption: Benzetim mikroyerçekimi öncesinde ve sırasında, rastgele konumlandırma makinesinde canlı bir hücrenin faz haritaları (yüzeyler) ve altında floresan görüntüsü. Toy ve ark., *Biomedical Optics Express* (2012).
figure_alt: Canlı bir hücrenin renkli yüzeyler olarak gösterilen dört 3B faz haritası ve altlarında yeşil floresan görüntüleri.
papers:
  - 2012_BOPEX_Toy
  - 2019_OC_Toy
  - 2010_OL_Cotte
  - 2010_JBO_Pache
  - 2012_OL_Toy
  - 2021_ELECTRICA_Toy
  - 2022_SPIEPE_Gurcan_a
funding: [120F099, ISTKA]
tags: [Digital Holographic Microscopy, Quantitative Phase Imaging]
---

Hücrelerin çoğu neredeyse saydamdır. Geleneksel bir mikroskopta görünür olmaları için boyalara ya da floresan işaretleyicilere ihtiyaç duyarlar; bu işaretleyiciler ise incelenen şeyi değiştirebilir ya da ona zarar verebilir. Bir hücreden geçen ışık pek sönümlenmez ama gecikir, çünkü hücrenin kırılma indisi çevresindeki ortamınkinden biraz yüksektir. Nicel faz görüntüleme bu gecikmeyi her pikselde ölçer.

Eksen dışı dijital holografide numuneden geçen ışık, eğik bir referans ışınıyla girişim yapar. Kamera, numunenin büktüğü düz saçakları kaydeder; bir Fourier filtresi ve ters dönüşüm bunları faz haritasına çevirir. Faz optik yol farkıyla orantılı olduğundan görüntü yalnızca bir resim değil, bir ölçümdür: kalınlığı, kuru kütleyi ve bunların zaman içindeki değişimini verir.

## Optiğin izin verdiğinden daha keskin

Holografi yalnızca şiddeti değil karmaşık alanın tamamını kaydettiği için alan, mikroskobun aktarım fonksiyonuyla ters evrişime (dekonvolüsyon) tabi tutulabilir. Bunun klasik Rayleigh sınırının altındaki yapıları çözdüğünü gösterdik; bu çalışma daha sonra üç boyutlu faz nanoskopisine ulaştı (bkz. [holotomografi](/tr/research/holotomography/)).

## Mikroyerçekiminde hücreler

Dijital holografik mikroskopi hızlıdır ve tarama gerektirmez; bu da onu zorlu ortamlar için yeterince dayanıklı kılar. Benzetim mikroyerçekiminde ve parabolik uçuşlarda canlı hücrelerin biçimini izleyen sistemler kurduk.

## Her laboratuvar için faz görüntüleme

Holografi genellikle özel bir interferometre gerektirir. Standart bir mikroskobun görüntüleme yoluna yerleştirilen bir kama prizma, ışının bir kısmını eğik bir referansa çevirerek sıradan bir cihazı nicel faz mikroskobuna dönüştürür. Yöntemi ayrıca tüm doku kesitlerinin etiketsiz görüntülenmesi için makro ölçeğe ve hücrelerin bir yüzeyle buluştuğu bölgeyi görüntülemek için tam iç yansıma holografisine taşıdık.

## Deneyin: şiddet ve karmaşık alan

Sıradan bir kamera yalnızca ışığı soğuranı görür. Holografi genliği ve fazı kaydeder; faz, saydam hücrelerin kalınlığına, mikro-optiklerin biçimine ya da yansıtıcı bir yüzeyin yüksekliğine dönüşür.

{{< field-demo >}}

## Mikroskoplar nasıl kurulur

Tipik holografik mikroskoplar, animasyonlu olarak: geçirgenlikte Mach–Zehnder interferometresi, yansımada Michelson, merceksiz eksen içi düzenek ve taramalı holotomografi.

{{< setups >}}

## Deneyin: eksen dışı holografi

Aşağıdaki demo, laboratuvarda kullandığımız rekonstrüksiyon adımlarını sayısal yeniden odaklama ve aberasyon düzeltme dahil olmak üzere benzetim bir hologram üzerinde çalıştırır.

{{< dhm-bench >}}

## Deneyin: eksen içi holografi

Ayrı bir referans ışını olmadığında düzenek merceksiz ve kompakt hâle gelir, ancak kamera fazı kaybeder ve ikiz görüntü ortaya çıkar. Fiziksel kısıtlarla yinelemeli faz geri kazanımı ikiz görüntüyü giderir.

{{< inline-holo >}}
