---
title: "Holotomography: refractive index in three dimensions"
short: holotomography
weight: 20
summary: >-
  Recording holograms from many illumination angles lets us reconstruct the 3D
  refractive index of a specimen, from nanoscale structures in living neurons to
  myelin in brain tissue, without any stain.
figure_from: /publication/2026_SciRep_Oguz
figure_caption: Refractive index maps of demyelinated and non-lesioned brain tissue. From Oguz et al., *Scientific Reports* (2026).
figure_alt: Refractive index maps of demyelinated and non-lesioned mouse brain tissue, with a refractive index scale from 1.300 to 1.450.
papers:
  - 2026_SciRep_Oguz
  - 2013_NPHOTON_Cotte
  - 2019_QPI_Toy
  - 2013_DH_Depeursinge
  - 2011_BOPEX_Cotte
  - 2011_FIO_Cotte
funding: [116F437]
tags: [Holotomography, Optical Diffraction Tomography]
demos: [tomo]
demos_intro: >-
  Each illumination angle contributes one cap of the Ewald sphere in Fourier space. Scanning the
  angle fills a volume of Fourier space, and its extent along kz is what gives holotomography its
  sectioning along the optical axis.
---

A single hologram gives the phase delay integrated along the light path. Recording holograms while the illumination is steered through many angles, and combining them with a model of how light scatters, recovers the refractive index of the specimen in three dimensions. Refractive index tracks the local concentration of proteins and lipids, so a holotomogram shows organelles, membranes and lipid-rich structures without labels.
{{< video src="video.mp4" caption="3D rendering of a holotomographic reconstruction of a cell." >}}

## Marker-free phase nanoscopy

At EPFL we recorded holograms from many illumination directions and deconvolved the complex field with the measured coherent transfer function of the microscope. This reached a lateral resolution of 90 nm without any label, enough to follow the dynamics of living dendritic spines in neurons, image bacteria and resolve the nanoscale pores of diatom shells. The work was published as *marker-free phase nanoscopy* in Nature Photonics.

This work fed into the 3D Cell Explorer, the holotomographic microscope of Nanolive SA, which Fatih Toy co-founded in 2013 and still advises without a salary. The lab now has a 3D Cell Explorer of its own, [contributed by Nanolive](/funding/nanolive/).

## Myelin without stains

Myelin, the lipid-rich sheath around nerve fibres, has a markedly higher refractive index than the surrounding tissue. Together with the Kerman lab, we use holotomography to image myelin in mouse brain sections without staining, including demyelinated lesions. Label-free imaging of this kind could make it simpler to follow demyelination and repair in models of disease.

Our TÜBİTAK 2515 project also combined multi-wavelength 3D phase imaging with fluorescence, so that refractive-index maps can be read alongside specific molecular labels.
