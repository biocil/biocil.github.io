---
title: "sesameseeds: LaTeX belgeleriniz için simit kırıntıları"
date: 2026-11-03
summary: Her sayfayı, makalenin üzerinde yenen bir simitten dökülen susamlar ve kırıntılarla süsleyen bir LaTeX paketi. Kahve lekesi gibi, ama İstanbul usulü.
image:
  caption: sesameseeds ile dizilmiş tanıtım belgesinin sayfaları.
---

Kahve lekesi uzun zamandır gerçekten okunmuş bir makalenin işareti sayılır. İstanbul’da ise okurken yenen atıştırmalık, her iskelede kırmızı arabalarda satılan **simit**tir. Fırında pişmiş simit kurudur, leke bırakmaz; ama altında ne varsa üzerine susam ve pekmezle karamelleşmiş kabuk kırıntıları dökmeden yenemez.

**sesameseeds** bu sahiciliği LaTeX’e taşıyor. Her sayfaya fırınlanmış susamlardan ve kırıntılardan rastgele ama tekrarlanabilir bir serpinti düşer; her derlemede aynıdır, yani hakem sürecinden sağ çıkar. Susamı elle de serpebilir, bir sayfayı peçeteyle koruyabilir ve telefona bakmak için simidin bırakıldığı yerde kalan kırıntı halkasını ekleyebilirsiniz.

**İndir:** [sesameseeds.zip](/fun/sesameseeds/sesameseeds.zip) (paket, tanıtım belgesi ve README) · [sesameseeds.sty](/fun/sesameseeds/sesameseeds.sty) · [tanıtım PDF’i](/fun/sesameseeds/sesameseeds-demo.pdf) · [tanıtım kaynağı](/fun/sesameseeds/sesameseeds-demo.tex)

Sürüm 1.1, 3 Kasım 2026. LaTeX Project Public License 1.3c ile yayımlanmıştır.

## Kurulum

`sesameseeds.sty` dosyasını `.tex` dosyanızın yanına ya da yerel texmf ağacınıza koyun (macOS’ta `~/Library/texmf/tex/latex/sesameseeds/`, Linux’ta `~/texmf/tex/latex/sesameseeds/`). LaTeX 2020-10 ya da daha yenisi, TikZ ve pgfopts gerekir; hepsi TeX Live ve MiKTeX’te bulunur. pdfLaTeX, XeLaTeX ve LuaLaTeX ile çalışır.

## Kullanım

```latex
\usepackage[mess=medium]{sesameseeds}   % none | light | medium | heavy | catastrophic
```

Otomatik dağınıklık ikinci bir derlemeye gerek kalmadan her sayfada görünür. Yapabileceği birkaç şey daha:

```latex
\usepackage[heavy, randomseed=42, black=0.1, firstpage=false]{sesameseeds}

\sesamesetup{mess=catastrophic}      % bundan sonraki sayfalara uygulanır
\nosesame                            % bu sayfa peçeteyle okundu
\sesameoff ... \sesameon             % dağınıklığı durdur ve sürdür

% Elle yerleştirme; sayfanın sol alt köşesinden ölçülür
% (remember picture kullanır, iki kez derleyin)
\sesamesprinkle[count=25, spread=1.5cm]{14cm}{6cm}
\simitring[radius=6cm]{10.5cm}{15cm} % simidin bırakıldığı yerde kalan halka
\sesameseed[angle=30, roast=0.9]{3cm}{3cm}
```

Baskıya hazır sürüm için `\usepackage[off]{sesameseeds}` elle yerleştirilenler dahil her şeyi kapatır. Ya da kapatmaz.

## Seçenekler

| Anahtar | Varsayılan | Anlamı |
|---|---|---|
| `mess` | `medium` | `none`, `light`, `medium`, `heavy` ya da `catastrophic` |
| `off` | | elle yerleştirilenler dahil her şeyi kapatır |
| `seeds` | | sayfa başına sabit susam sayısı |
| `probability` | 0.8 | bir sayfaya bir şey düşme olasılığı |
| `randomseed` | 1525 | başka ama yine tekrarlanabilir bir dağınıklık için değiştirin |
| `crumbs` | true | karamelleşmiş kabuk kırıntıları |
| `layer` | foreground | `background` susamları metnin altına koyar |
| `firstpage` | true | başlık sayfasında susama izin verir |
| `size`, `spread`, `stray` | 1, 2.5cm, 0.2 | susam boyutu, döküntü bölgesinin genişliği, sekip uzağa düşen susam oranı |
| `roast`, `black` | 0.5, 0 | altın sarısından (0) koyu kahveye (1) kavrulma, siyah susam oranı |
| `crumbratio`, `shadow` | 0.35, 0.28 | susam başına kırıntı, gölge opaklığı |
| `count`, `radius`, `angle` | 15 / 60, 6.5cm, rastgele | elle yerleştirme komutları için |

## Tanıtım belgesi

Kahvaltı Çalışmaları Bölümü’nden A. Hungry Academic’in *On the Stochastic Deposition of Sesamum indicum Seeds on Scholarly Manuscripts* başlıklı belgesi tüm özellikleri gösteriyor: telefona bakmak için simidin bırakıldığı bir sayfa, peçeteyle okunmuş bir sayfa ve vapur geçen bir tankerin dalgasına girerken dizilmiş bir ek.

{{< gallery >}}
page-1.png | Sayfa 1: hafifçe susamlanmış başlık sayfası.
page-3.png | Sayfa 3: simit buraya bırakıldı (`\simitring`).
page-5.png | Sayfa 5: vapur dalgaya girerken `mess=catastrophic`.
{{< /gallery >}}

Afiyet olsun.
