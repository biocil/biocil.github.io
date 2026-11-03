---
title: "sesameseeds: simit crumbs for your LaTeX documents"
date: 2026-11-03
summary: A LaTeX package that decorates every page with the sesame seeds and crumbs left behind by a simit eaten over the manuscript. Like coffee stains, but for Istanbul.
image:
  caption: Pages of the demo document, typeset with sesameseeds.
---

The coffee stain has long been the mark of a manuscript that was actually read. In Istanbul, though, the reading snack of choice is the **simit**, the sesame-crusted bread ring sold from red carts on every ferry pier. A baked simit is dry, so it leaves no stain, but it cannot be eaten without shedding sesame seeds and crumbs of caramelised crust onto whatever lies beneath it.

**sesameseeds** brings that authenticity to LaTeX. Every page gets a random but reproducible scatter of oven-roasted seeds and crumbs, the same on every compilation, so the mess survives peer review. You can also sprinkle seeds by hand, protect a page with a napkin, and leave the ring of debris where a simit was put down to answer the phone.

**Download:** [sesameseeds.zip](sesameseeds.zip) (package, demo and README) · [sesameseeds.sty](sesameseeds.sty) · [demo PDF](sesameseeds-demo.pdf) · [demo source](sesameseeds-demo.tex)

Version 1.1, 3 November 2026. Released under the LaTeX Project Public License 1.3c.

## Install

Put `sesameseeds.sty` next to your `.tex` file, or in your local texmf tree (`~/Library/texmf/tex/latex/sesameseeds/` on macOS, `~/texmf/tex/latex/sesameseeds/` on Linux). It needs LaTeX 2020-10 or newer, TikZ and pgfopts, all included in TeX Live and MiKTeX, and works with pdfLaTeX, XeLaTeX and LuaLaTeX.

## Use

```latex
\usepackage[mess=medium]{sesameseeds}   % none | light | medium | heavy | catastrophic
```

The automatic mess appears on every page without a second run. A few more things it can do:

```latex
\usepackage[heavy, randomseed=42, black=0.1, firstpage=false]{sesameseeds}

\sesamesetup{mess=catastrophic}      % applies to pages shipped from now on
\nosesame                            % this page was read with a napkin
\sesameoff ... \sesameon             % pause and resume the mess

% Placed by hand, measured from the bottom-left corner of the page
% (these use remember picture, so compile twice)
\sesamesprinkle[count=25, spread=1.5cm]{14cm}{6cm}
\simitring[radius=6cm]{10.5cm}{15cm} % the ring left where the simit was put down
\sesameseed[angle=30, roast=0.9]{3cm}{3cm}
```

For the camera-ready version, `\usepackage[off]{sesameseeds}` turns everything off, including the debris you placed by hand. Or not.

## Options

| Key | Default | Meaning |
|---|---|---|
| `mess` | `medium` | `none`, `light`, `medium`, `heavy` or `catastrophic` |
| `off` | | turn everything off, hand-placed debris included |
| `seeds` | | a fixed number of seeds per page |
| `probability` | 0.8 | chance that a page gets anything at all |
| `randomseed` | 1525 | change it for a different mess that is still reproducible |
| `crumbs` | true | crumbs of caramelised crust |
| `layer` | foreground | `background` puts the seeds under the text |
| `firstpage` | true | allow seeds on the title page |
| `size`, `spread`, `stray` | 1, 2.5cm, 0.2 | seed size, size of the fall-out zone, fraction of seeds that bounced away |
| `roast`, `black` | 0.5, 0 | golden (0) to deep-brown (1) roast, fraction of black sesame |
| `crumbratio`, `shadow` | 0.35, 0.28 | crumbs per seed, shadow opacity |
| `count`, `radius`, `angle` | 15 / 60, 6.5cm, random | for the manual commands |

## The demo document

*On the Stochastic Deposition of Sesamum indicum Seeds on Scholarly Manuscripts*, by A. Hungry Academic of the Department of Breakfast Studies, shows every feature: a page where the simit was put down to answer a phone call, a page read with a napkin, and an appendix typeset while the ferry crossed the wake of a passing tanker.

{{< gallery >}}
page-1.png | Page 1: the title page, lightly seeded.
page-3.png | Page 3: the simit was put down here (`\simitring`).
page-5.png | Page 5: `mess=catastrophic`, as the ferry crosses a wake.
{{< /gallery >}}

Afiyet olsun.
