# Phi-X lab website

Source of [biocil.github.io](https://biocil.github.io), the website of the Phi-X Biophotonics and Computational Imaging Laboratory at Istanbul Medipol University.

The site is built with [Hugo](https://gohugo.io) (extended edition, version 0.168.0) and a theme of our own in `themes/phix/`. Every push to `main` rebuilds and publishes the site through GitHub Actions (`.github/workflows/publish.yaml`), usually within two minutes.

## Preview on your computer

1. Install Hugo extended 0.168.0 ([releases](https://github.com/gohugoio/hugo/releases/tag/v0.168.0); on macOS, `brew install hugo` installs the latest version, which is normally fine).
2. In this folder, run `hugo server` and open http://localhost:1313. Pages reload as you edit.

## Where things live

| To change | Edit |
| --- | --- |
| Home page texts (hero, demo intro) | `content/_index.md` |
| Research themes | `content/research/<theme>/index.md` (one folder per theme; `weight` sets the order) |
| Publications | `content/publication/<id>/index.md`, with `cite.bib`, `featured.jpg` and the PDF in the same folder |
| People | `content/authors/<name>/_index.md` and `avatar.jpg` |
| People page groups | `content/people/index.md` |
| News | `content/post/<yyyymmdd>/index.md` |
| Funding and awards | `content/funding/<id>/index.md` |
| Student projects | `content/student_projects/<id>/index.md` |
| Join us, Contact | `content/join/index.md`, `content/contact/index.md` |
| Menu | `config/_default/menus.yaml` |
| Lab name, address, email, footer links | `config/_default/params.yaml` |
| Design (colours, layout, demos) | `themes/phix/` |

## Common tasks

**Add a publication.** Copy an existing folder in `content/publication/`, rename it (for example `2027_OL_Surname`), and edit `index.md`. Put the figure in the folder as `featured.jpg` (or `.png`), the BibTeX as `cite.bib`, and the PDF next to them with `url_pdf: 'filename.pdf'`. Use `publication_types: ["article-journal"]`, `["paper-conference"]` or `["patent"]`. Authors are matched to people by name, so write lab members exactly as in their profile title. To feature the paper on a research theme page, add its folder name to that theme’s `papers:` list.

Only post the publisher’s PDF when the paper is open access or the publisher allows it; otherwise post the accepted manuscript or leave `url_pdf` empty and rely on the DOI.

**Add a person.** Create `content/authors/firstname-lastname/_index.md` (copy an existing one) and add `avatar.jpg`. The folder name must be the name in lower case with spaces replaced by hyphens and accents removed, otherwise their publications will not link to the profile. Set `user_groups` to one of the groups listed in `content/people/index.md`. When someone graduates, change their group to `Alumni` and add an `alumni_note`, such as `MSc 2027, now at …`.

**Post news.** Create `content/post/20270115/index.md` with `title`, `date`, `kind` (Paper, Talk, Project, Press, Video) and a short `summary`. For press coverage on another site, add `external_link:`; the news list then links straight to it. Use `figure_from: /publication/<id>` to reuse a paper’s figure.

**Announce an opening.** Fill in the `openings:` list in `content/join/index.md`. When the list is empty, the page says there is no open call.

**Add a video.** Put the file in the page folder (or in `assets/media/`) and write `{{< video src="clip.mp4" caption="…" >}}` in the Markdown. Without `controls="yes"` it plays muted on a loop. Keep files under about 5 MB (H.264 MP4); host longer videos on YouTube or figshare and embed them.

**Add a photo gallery.** Put the photos in the page folder and list them, one per line, as `file | caption`:

```
{{< gallery >}}
photo1.jpg | Caption for the first photo
photo2.jpg | Caption for the second photo
{{< /gallery >}}
```

**Change the home page highlight.** The band under the hero comes from the `feature:` block in `content/_index.md`; point `page:` at any news post, or delete the block to hide it. The current highlight is the Optics Continuum cover: save the cover image as `content/post/20260815/featured.jpg` and it replaces the paper figure there and on the home page.

**Mark a cover article.** Add `cover: "Cover article, Journal 5(8), August 2026"` and `cover_url:` to the publication’s `index.md`.

**Embed the interactive demos** on any page: `{{< field-demo >}}` (intensity versus complex field), `{{< setups >}}` (animated Mach–Zehnder, Michelson and in-line set-ups), `{{< dhm-bench >}}` (off-axis holography with numerical refocusing and aberration compensation), `{{< inline-holo >}}` (in-line holography and the twin image), `{{< tomo-demo >}}` (holotomography from an illumination scan), or `{{< demo-tabs >}}` for all five in tabs. Use each one at most once per page.

**The 3D demos** (holotomography and the 3D set-up) run on WebGL with three.js, bundled in `themes/phix/static/js/phix3d.js`; its source and rebuild instructions are in `themes/phix/src/`. Browsers without WebGL automatically get the 2D versions.

**Change the colours.** Set `palette:` in `config/_default/params.yaml` to `glass` (bottle green and brass), `tint` (aubergine and magenta) or `phoenix` (the lab’s red). The colours are defined at the top of `themes/phix/assets/css/main.css`.

## Notes

- Old addresses from the previous site (for example `/research/116f437/`) redirect to their new pages.
- The Archivo font is served from the site itself (`themes/phix/static/fonts/`, SIL Open Font License), so no visitor data goes to Google Fonts.
- The interactive demos (`themes/phix/assets/js/holo.js`) run entirely in the visitor’s browser on simulated data.
