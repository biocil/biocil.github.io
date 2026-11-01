---
title: Quantitative phase and digital holographic microscopy
short: phase imaging
weight: 10
summary: >-
  A transparent cell barely changes how bright light is, but it does delay it.
  Off-axis digital holographic microscopy records that delay as interference
  fringes and turns it into a phase map sensitive to nanometre changes in optical
  thickness.
figure_from: /publication/2012_BOPEX_Toy
figure_caption: Phase maps of a living cell (surfaces) above its fluorescence image, before and during simulated microgravity on a random positioning machine. From Toy et al., *Biomedical Optics Express* (2012).
figure_alt: Four 3D phase maps of a living cell shown as coloured surfaces, each above the matching green fluorescence image, recorded before and during simulated microgravity.
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

Most cells are almost transparent. In a conventional microscope they need stains or fluorescent labels to be seen, and those labels can change or harm the very thing being studied. Light passing through a cell is not dimmed much, but it is delayed, because the cell has a slightly higher refractive index than the medium around it. Quantitative phase imaging measures that delay at every pixel.

In off-axis digital holography, the light that went through the sample interferes with a tilted reference beam. The camera records straight fringes that the sample bends; a Fourier filter and an inverse transform turn them into a phase map. The phase is proportional to the optical path difference, so the image is a measurement, not just a picture: it reports thickness and dry mass, and how they change over time.

## Sharper than the optics allow

Because holography records the full complex field rather than intensity alone, the field can be deconvolved with the microscope’s transfer function. We showed that this resolves structures below the classical Rayleigh limit, work that later led to three-dimensional phase nanoscopy (see [holotomography](/research/holotomography/)).

## Cells in microgravity

Digital holographic microscopy is fast and needs no scanning, which makes it robust enough for demanding environments. We built systems that monitored the shape of living cells under simulated microgravity and during parabolic flights for space-biology research.

## Phase imaging for every lab

Holography usually needs a dedicated interferometer. A wedge prism placed in the imaging path of a standard microscope turns part of the beam into a tilted reference, making an ordinary instrument a quantitative phase microscope. We have also taken the method to the macroscale for label-free imaging of whole tissue sections, and to total internal reflection holography for imaging how cells meet a surface.

## Try it: intensity versus complex field

An ordinary camera sees only what absorbs light. Holography records amplitude and phase; the phase converts into the thickness of transparent cells, the shape of micro-optics, or the height of a reflective surface.

{{< field-demo >}}

## How the microscopes are built

Three typical holographic microscopes, animated: a Mach–Zehnder interferometer in transmission, a Michelson in reflection, and a lens-free in-line set-up.

{{< setups >}}

## Try it: off-axis holography

The demo below runs the same reconstruction steps we use in the lab on a simulated hologram, including numerical refocusing and aberration compensation.

{{< dhm-bench >}}

## Try it: in-line holography

Without a separate reference beam the set-up becomes lens-free and compact, but the camera loses the phase and a twin image appears. Iterative phase retrieval with physical constraints removes it.

{{< inline-holo >}}
