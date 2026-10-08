# Biological imagery and layout

Issue #11 introduces a wider homepage with an adjacent text/image composition,
three routes into the project, and a secondary microscopy feature. The logo,
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
