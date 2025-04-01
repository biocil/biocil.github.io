---
# Leave the homepage title empty to use the site title
title: 
date: 2022-10-24
type: landing

sections:
  - block: markdown
    content:
      title:
      subtitle: ''
      text:
    design:
      columns: '1'
      background:
        image: 
          filename: lab_name_with_logo.svg
          filters:
            brightness: 1
          parallax: false
          position: center
          size: contain
          text_color_light: true
      spacing:
        padding: ['100px', '50px', '100px', '50px']
      #css_class: fullscreen

  - block: hero
    content:
      #title: |
      #  Biophotonics and Computational Imaging Laboratory
      image:
        filename: welcome.jpg
      text: |
        <br>
        
         We are a multidisciplinary research group at [**Istanbul Medipol University**](https://www.medipol.edu.tr/en/)

        Our laboratory develops novel techniques in the fields of **Quantitative Phase Imaging (QPI)**, **Digital Holographic Microscopy**, and **Holo-Tomography** to explore the unseen microscopic world.
  
  - block: markdown
    content:
      title:
      subtitle: ''
      text:
    design:
      columns: '1'
      background:
        image: 
          filename: lab3.jpg
          filters:
            brightness: 1
          parallax: false
          position: center
          size: contain
          text_color_light: true
      spacing:
        padding: ['200px', '0', '200px', '0']
      #css_class: fullscreen

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
  


#  - block: collection
#    content:
#      title: Latest Preprints
#      text: ""
#      count: 5
#      filters:
#        folders:
#          - publication
#        publication_type: 'article'
#    design:
#      view: citation
#      columns: '1'

  - block: collection
    content:
      title: Latest Publications
      text: ""
      count: 5
      filters:
        folders:
          - publication
        publication_type: ''
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
