---
# Leave the homepage title empty to use the site title
title:
date: 2022-10-24
type: landing

sections:
  - block: hero
    content:
      title: |
        Biophotonics and Computational Imaging Laboratory
      image:
        filename: welcome.jpg
      text: |
        <br>
        
        ## Welcome to BiocIL

We are the **Biophotonics and Computational Imaging Laboratory (BiocIL)**, a multidisciplinary research group led by **Dr. Muhammed Fatih Toy** at **Istanbul Medipol University**. Our laboratory focuses on cutting-edge techniques such as **Quantitative Phase Imaging (QPI)**, **Digital Holography**, and **Fluorescence Microscopy** to explore the microscopic world of biological systems.

## Research Areas
Our main research areas include
- **Quantitative Phase Imaging (QPI)**: Label-free, high-resolution imaging of live cells.
- **Digital Holography**: Real-time 3D imaging of biological samples.
- **Fluorescence Microscopy**: Advanced molecular tracking using fluorescence techniques.

## Our Team
Meet our dedicated team of researchers and graduate students who drive innovation at BiocIL.

## Get in Touch
For collaboration opportunities, student inquiries, or any questions related to our research, please [contact us](contact/).
  
  - block: collection
    content:
      title: Latest News
      subtitle:
      text:
      count: 5
      filters:
        author: ''
        category: ''
        exclude_featured: false
        publication_type: ''
        tag: ''
      offset: 0
      order: desc
      page_type: post
    design:
      view: card
      columns: '1'
  
  - block: markdown
    content:
      title:
      subtitle: ''
      text:
    design:
      columns: '1'
      background:
        image: 
          filename: coders.jpg
          filters:
            brightness: 1
          parallax: false
          position: center
          size: cover
          text_color_light: true
      spacing:
        padding: ['20px', '0', '20px', '0']
      css_class: fullscreen

  - block: collection
    content:
      title: Latest Preprints
      text: ""
      count: 5
      filters:
        folders:
          - publication
        publication_type: 'article'
    design:
      view: citation
      columns: '1'

  - block: markdown
    content:
      title:
      subtitle:
      text: |
        {{% cta cta_link="./people/" cta_text="Meet the team →" %}}
    design:
      columns: '1'
---
