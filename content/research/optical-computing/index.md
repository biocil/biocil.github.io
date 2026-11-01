---
title: Optical computing for augmented-reality microscopy
short: optical computing
weight: 40
summary: >-
  Instead of processing images on a computer afterwards, we let the optics do part
  of the work. An optimised phase pattern on a spatial light modulator highlights
  selected targets directly in the live view of a microscope.
figure_from: /publication/2026_OptCon_Sahloul
figure_caption: Highlighting results for different targets compared with the ground truth. From Sahloul, Akşit and Toy, *Optics Continuum* (2026), the cover article of Volume 5, Issue 8.
figure_alt: Grid of microscope images comparing input scenes, ground truth and the highlighted output of three optimisation methods.
papers:
  - 2026_OptCon_Sahloul
funding: [123N774]
tags: [Augmented Reality Microscopy, Spatial Light Modulators]
---

Augmented-reality microscopes overlay information on what the user sees, for example by highlighting cells of a certain size or shape. Doing that with a camera and a computer adds processing time, which limits real-time use.

We do the selection optically. A phase mask, computed in advance by optimising it against a physical model of the microscope, is displayed on a spatial light modulator placed in a Fourier plane of the imaging path. Objects that match the target shape or size are highlighted, and the highlighting follows them as they move through the field of view, with no continuous image processing or tracking.

The paper was selected for the [cover of Optics Continuum](/post/20260815/), Volume 5, Issue 8 (August 2026).

The setup is built around a Zeiss Axio Observer 7 with a 655 nm laser and a 4f relay to the modulator. The [project page](/projects/target-highlighting/) has the full method, results and a video.
