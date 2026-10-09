# Biological imagery and layout

Issue #11 introduces a wider homepage with an adjacent text/image composition,
three routes into the project, and a secondary microscopy feature. The original
`images/logo.png` appears beside the homepage h1 in a compact brand area, with a
white backing in both themes; the small navigation hexagon is a separate accent. The logo,
orange/yellow accents, locally hosted Public Sans, publication URLs, and citation
components remain the visual and semantic anchors. Publications gain more space
between entries; resource tables keep their existing structure.

Two directions were considered: a microscopy-led monochrome introduction and a
warm honeycomb introduction with microscopy as a supporting feature. This PR
implements the latter. It is a proposed design for maintainer review, not a
previously approved mockup. The images represent biological patterning; neither
is an adoption claim or a claim that FHR is restricted to insects.

## Sources and license scope

`_data/image_credits.yml` records original and revision URLs, creators, selected
licenses, and modifications. The homepage reads its source/license links from
that manifest. Final images are served from `images/biology/`; visitors do not
request image files from Wikimedia or Dartmouth.

- **Honeycomb:** Waugsberg, *Honigwabe*, 2006. The selected license is
  [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), as offered on
  [the file page](https://commons.wikimedia.org/wiki/File:Honigwabe.jpg).
  The subject is honeycomb with open and capped cells. Resizing/compression and
  a CSS hexagonal crop are disclosed in the visible caption. These image
  derivatives remain CC BY-SA 3.0; the repository's MIT license does not replace
  their license. Do not remove attribution or the license link.
- **Fruit-fly eye:** Louisa Howard / Dartmouth College, scanning electron
  micrograph; the [selected version](https://commons.wikimedia.org/wiki/File:Drosophilidae_compound_eye_edit1.jpg)
  was retouched upstream by Papa Lima Whiskey and is listed as public domain
  following Dartmouth's dedication. Locally resized/compressed, with the full
  frame and scale bar retained. Do not infer a species more specific than the
  source identifies, recolor it without disclosure, or describe it as a project
  observation.

A first honeycomb candidate, *TransitionalHoney*, was rejected because its red
annotations distract from the introductory composition. No generated or stock
illustration is presented as a scientific photograph.

## Asset preparation

Download originals using the source links in the manifest. Do not overwrite
local files with an unreviewed future version of a source. The chosen revisions
are recorded; originals need not be shipped to visitors.

With `sips` (macOS) and `cwebp`, prepare 480/960px honeycomb and 400/800px eye
variants. JPEGs use `sips -Z WIDTH -s formatOptions 70 INPUT --out OUTPUT`;
WebP files use `cwebp -q 76 -resize WIDTH 0 INPUT -o OUTPUT`. Width and height
attributes describe the largest JPEG's aspect ratio. The honeycomb has a
separately reserved display ratio and `object-fit: cover`; its caption remains
outside the mask. The eye keeps its complete aspect ratio. Verify resulting
sizes/dimensions and inspect the images after processing.

Responsive `picture`/`srcset` attributes select smaller images on narrow views.
The introductory image is eager/high-priority; microscopy is lazy-loaded.
The design adds no animation or new external requests. Text remains on opaque
surfaces with explicit light/dark color tokens. At narrow widths the image and
text stack, as do the resource cards and maintainer cards.

## Review and validation

Before/after screenshots are in `docs/design/` and are excluded from the deployed
site through the existing `docs` exclusion. Screenshots are review artifacts,
not shipped homepage images. Run the normal checks in `docs/preview.md` against
a fresh production build. The browser asset test additionally decodes both
images, checks their reserved dimensions, and confirms local WebP selection.
Existing axe, theme, overflow, navigation, font/network, and citation checks
remain required.

Review desktop/mobile crops, light/dark themes, keyboard focus, and zoom. Avoid
extending masks to the microscopy image if doing so removes the scale bar.
Keep technical lists and tables readable when adding future images. A social
preview redesign and additional ecological imagery are optional future work;
this PR retains the existing logo preview.

### Image payloads

Bytes measured from committed assets after processing (the browser selects one
variant per image, not every row). The original honeycomb is 422,912 bytes and
original retouched eye is 840,509 bytes; those originals are not deployed.

| Image | Width | WebP bytes | JPEG fallback bytes |
| --- | ---: | ---: | ---: |
| Honeycomb | 480 | 28,536 | 62,442 |
| Honeycomb | 960 | 74,358 | 197,133 |
| Fruit-fly eye | 400 | 22,264 | 44,742 |
| Fruit-fly eye | 800 | 48,066 | 134,128 |

The large WebP pair totals 122,424 bytes; the small pair totals 50,800 bytes.
The previous homepage had no biological image payload. Both JPEG variants remain
available as fallbacks. Capture full-page transfer metrics separately if evaluating
site-wide performance; these numbers are image bytes, not total page weight.

## Interior pages and DNA identity (issue #13)

The primary reason for the hexagon is molecular: all four DNA bases contain a
six-membered ring. Thymine and cytosine are pyrimidines with one such ring;
adenine and guanine are purines with a fused six- and five-membered ring system.
See [NCBI's DNA structure chapter](https://www.ncbi.nlm.nih.gov/books/NBK21134/).
The homepage now states this explicitly at `#why-the-hexagon`; the interior panels
link to that explanation. Nature imagery supports this identity without implying
that every polygon is a perfect hexagon or that every base is just one hexagon.

Each interior page uses a distinct full-frame photograph in a compact shared
`nature-panel.html` composition, with text beside the image and a stacked mobile
layout. There are no new masks, recoloring, overlays, animation, or external asset
requests. Credit links use the manifest. Near-top images load eagerly with
reserved dimensions, local responsive WebP sources and JPEG fallbacks.

- **Publications — insect eggs:** Gilles San Martin's *Bug Eggs (Heteroptera,
  Pentatomidae) - Egg width 1 mm*, CC BY-SA 2.0, a focus-stacked microscope image.
  The round eggs display fine polygonal texture and close packing. Retain the
  full frame; do not describe the eggs themselves as hexagonal prisms or infer
  a more specific species. See the source and revision in the manifest.
- **Guide — tortoise shell:** pamsai's *Reflected tortoise shell (6063989199)*,
  CC BY-SA 2.0. This Galápagos giant tortoise photograph clearly shows polygonal
  scutes and growth rings, including near-hexagonal outlines. No species beyond
  the source's description is asserted.
- **Resources — pineapple:** Rhododendrites' *Pineapple close-up (81928)*,
  CC BY-SA 4.0. Polygonal fruitlets/eyes supply the repeating pattern; the caption
  does not claim a regular hexagonal lattice.

The original museum-shell candidate was rejected because the hollow interior
and background dominated its scutes. A distant wood-turtle view was rejected
because its pattern was unclear at display size. A file named “Tortoise shell”
was a butterfly photograph and was also rejected: filenames alone are not subject
verification. Selected originals were inspected visually before resizing.

### Reproduce the derivatives

Download the pinned source revision's original to a temporary directory; verify
its `original_sha256` against the manifest before processing. For each selected
image, create 400/800px variants using the same existing commands (`sips -Z WIDTH
-s formatOptions 70 INPUT --out OUTPUT` and `cwebp -q 76 -resize WIDTH 0 INPUT
-o OUTPUT`). Dimensions describe each largest JPEG; full frames are preserved.
Originals are not deployed. The manifest records exact source revisions, original
hashes, creators, licensing, and modifications. `images/biology/LICENSE.txt`
preserves the selected licenses independently of the code's MIT license.

### Added image payloads

Each page loads one variant, not all files below. Bytes from final assets:

| Image | Width | WebP bytes | JPEG bytes |
| --- | ---: | ---: | ---: |
| insect-eggs | 400 | 11,196 | 31,270 |
| insect-eggs | 800 | 44,338 | 117,396 |
| turtle-shell | 400 | 7,456 | 26,235 |
| turtle-shell | 800 | 21,676 | 81,921 |
| pineapple | 400 | 28,716 | 54,721 |
| pineapple | 800 | 84,570 | 184,615 |

Review screenshots for all three pages in light/dark desktop/mobile layouts live
in `docs/design/issue-13/` (excluded from deployment). The asset browser check now
decodes imagery and checks visible source/license links across all four primary
pages; existing axe, overflow, navigation, local-network and citation checks apply.

### Spacing and reading order

One vertical-rhythm scale in `_sass/_project.scss` (`$space-section`,
`$space-subhead`, `$space-block`, `$space-text`) governs section headings,
paragraphs, lists, and the project/imagery blocks, so the home, publications,
guide, and resources pages share the same spacing. The homepage `h1` is larger
than the hero tagline, which is a `.project-intro__lead` paragraph rather than a
heading; `page--home` uses the same section rhythm as interior pages.

The "Why the hexagon?" feature closes the "About the project" section, after the
related-work list it would otherwise interrupt; interior nature panels sit after
a short page introduction rather than leading the page, and each links back to
`/#why-the-hexagon`.
