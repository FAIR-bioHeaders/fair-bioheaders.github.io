# AGENTS.md

Guidance for automated agents working in this repository. This is the project
website for FAIR BioHeaders, a trimmed Academic Pages / Minimal Mistakes Jekyll
site published by GitHub Pages from `main` at the repository root.

Start with `README.md`, `CONTRIBUTING.md`, and `docs/maintenance.md`. This file
records the non-obvious things that are easy to get wrong.

## Build and validate

Run the full check sequence before proposing a change. It mirrors CI.

```sh
bundle install                  # install the committed Ruby lockfile
npm ci --ignore-scripts          # install the committed npm lockfile
npm run build:js                 # regenerate assets/js/main.min.js
BUNDLE_FROZEN=true JEKYLL_ENV=production bundle exec jekyll build --strict_front_matter
python3 scripts/check_site.py _site
python3 -m unittest discover -s scripts -p 'test_*.py'
node --test scripts/test_cite.mjs
npm run test:browser             # once: npx playwright install --with-deps chromium
```

After a deployment, `npm run test:deploy` smoke-checks the live homepage,
sitemap, robots policy, and feeds. Toolchain is pinned in `.ruby-version`
(Ruby 3.3.4) and `.nvmrc` (Node 24).

- **`_site` must be fresh before checks and Playwright.** Some checks (sitemap,
  browser) read rendered output; delete `_site` and rebuild after config or Sass
  changes, or stale files cause false failures. `test-results/` and
  `playwright-report/` are gitignored and excluded from the Jekyll build.
- **Accessibility and contrast are enforced.** `npm run test:browser` runs axe in
  light and dark themes and fails on any violation, including color contrast.
  Check new colors against the code and footer backgrounds in both themes. The
  Rouge syntax palette in `_sass/_syntax.scss` has dark overrides in
  `_project.scss`; extend both when adding token styles.

- **Host Ruby may be too old.** On macOS the system Ruby 2.6 cannot install this
  `Gemfile.lock`. Use the pinned Docker image from `docs/preview.md`
  (`jekyll/jekyll:pages@sha256:84c4382...`), which is verified to build the site.
- `_site/`, `vendor/`, `node_modules/`, `.sass-cache/`, and `.jekyll-cache/` are
  gitignored. Never commit `_site`.
- Build with `--strict_front_matter`; CI does, and front-matter typos should fail.

## Things that will bite you

- **The JavaScript bundle is committed and CI verifies it is reproducible.** After
  editing anything under `assets/js/` (including `_main.js` and `cite.js`), run
  `npm run build:js`. CI runs `git diff --exit-code -- assets/js/main.min.js`; a
  stale bundle fails the build. Dependency bumps (including Dependabot PRs)
  also require regenerating this bundle. jQuery 4 removes `$.isArray` and
  `$.isFunction`; use `Array.isArray` and `typeof value === "function"` in
  vendored plugins rather than relying on removed helpers. `package.json` script order also matters.
  The unused `onchange` watcher was removed with its vulnerable dependency tree;
  use `npm run build:js` for source changes. `theme.js` loads separately and does
  not appear in the bundle inputs.
- **This is Jekyll 3.10 (GitHub Pages 232), not current Jekyll.** Liquid include
  parameters cannot contain bracket lookups. This fails to parse:
  `{% include reference.html reference=site.data.references[page.cite_key] %}`.
  Assign to a variable first, then pass it:
  `{% assign reference = site.data.references[page.cite_key] %}`.
- **`scripts/check_site.py` is the source of truth for metadata expectations.** It
  parses rendered HTML and fails on missing links, assets, `alt` text, SEO/social
  tags, structured data, citation microdata, and sitemap problems. When you add a
  new metadata requirement, add a check and a regression test in the same change.
- **JSON-LD must be valid JSON.** `check_site.py` parses every
  `<script type="application/ld+json">` block. Watch trailing commas in loops and
  always emit strings with the `jsonify` filter (a bare URL produces invalid JSON).
- **Bibliography data is authored once.** References in
  `_data/references.yml` render as Schema.org microdata, and `assets/js/cite.js`
  reads that microdata back into BibTeX. Do not add a separate `.bib` copy, and
  keep the Schema.org itemprop ↔ BibTeX field mapping in `_includes/reference.html`
  and `cite.js` in sync.
- **Element IDs must be unique per page.** Each reference uses its citation key as
  an `id`; the checker rejects duplicate IDs. Do not render the same reference twice on one page (for example, in both
  a list and a citation block).
- **Do not reintroduce removed things.** `check_site.py` fails on Google Fonts
  URLs, icon-font markup (`fa-*`, `fas`, `fab`, `academicons`, "font awesome"),
  Universal Analytics, `polyfill`, jQuery 1.12, and template demo text. Icons are
  CSS/hexagon accents and text, not an icon font.
- **`.nojekyll` and `CNAME` must not be added.** The former disables the Jekyll
  processing this site requires; the latter is unnecessary on `github.io`.
- **Preserve published URLs.** Publication `permalink`s are stable and indexed.
  Do not rename or restructure them without an explicit request.
- **The sitemap is allow-listed.** Only `/`, `/publications/`, `/resources/`, and
  `/publication/*` belong in `sitemap.xml`. Utility pages set `sitemap: false` and
  should be `noindex`.
- **External links.** Lychee checks them weekly/on demand. DOI resolvers and
  iso.org return 403 to automated clients; these are excluded via `.lycheeignore`
  with a comment. Add exclusions there rather than removing real links.

## Content conventions

- Add publications as Markdown in `_publications/`. Front matter needs `title`,
  `collection: publications`, a stable `permalink`, `excerpt`, `date`, `venue`,
  `paperurl`, `doi`, `citation`, and a `cite_key` that matches a record in
  `_data/references.yml`. Add the key to `_data/reference_order.yml` if it should
  appear in the resources list. The publications ItemList is generated from
  `site.publications`, independently of this order file.
- A reference record needs either a `doi` or a `repository`; software/dataset
  records also carry `repository` and `license`; software records may carry
  `programming_language`. Repository entries need `purpose` and `status`
  (`Published`, `Draft`, or `Demo`). Keep both FHT repositories Draft and
  FHR Nextflow Demo unless the user explicitly changes these statuses.
- Maintainer identities live in `_data/team.yml` and render as h-cards and Person
  JSON-LD. Do not invent social accounts, Wikidata IDs, or affiliations — use
  verified sources (ORCID, Crossref, the project's `CITATION.cff` files).
- Concept DOI metadata can change with releases. The FHR specification and
  converter concept records list publication year 2026 and both maintainers as
  creators in DataCite as checked on 2026-10-08; recheck before changing citations,
  and use version DOIs for reproducible release citations.
- Verify factual and citation claims against primary sources (Crossref, DataCite,
  ORCID, publisher pages) before adding them.
- Self-hosted font lives in `assets/fonts/public-sans`; keep font requests local.

## Presentation and metadata

- Preserve the repository overview table (Resource, Purpose, Status) alongside
  repository citation controls. New metadata must not hide names, purposes, or
  draft/demo status from readers. Avoid explaining implementation details in
  visitor-facing content.
- Keep the Zenodo community (`https://zenodo.org/communities/fh-/`) after GitHub
  in `_data/navigation.yml`, and linked from Resources and the footer.
- The fixed masthead and its inner wrap need opaque backgrounds in both themes;
  the masthead has automatic height and no ordinary bottom border. Preserve the
  gradient rule and article clearance. The brand hexagon uses `::after` because
  navigation underlines already use `::before`.
- Public Sans v2.001 has local Regular 400, SemiBold 600, ExtraBold 800, and Italic
  400 WOFF2 files. Keep `LICENSE.txt` and provenance with them; Markdown README
  files in assets can become unintended pages with the Pages plugin set.
- MathJax is optional: only boolean `math: true` emits `fhr:math` and the pinned
  3.2.2 jsDelivr script with verified SHA-384 integrity and anonymous CORS.
  When changing the script URL, recompute the digest from the actual CDN bytes
  and update the template and checker together. Ordinary pages must not load it; keep the privacy text
  aligned with actual requests.
- Escape values in HTML text/attributes with `escape`; use `jsonify` for JSON-LD.
  Dates in JSON-LD must be strings, not YAML year integers. `codeRepository`
  describes SoftwareSourceCode, not Dataset. Do not label abstract/summary pages
  as full-text URLs in scholarly metadata or promise search-engine indexing.
- Cite and Copy BibTeX must work with keyboard input, keep `aria-expanded` and
  `aria-controls` consistent, preserve author order/DOIs, and support clipboard
  failure. The Node parser tests do not prove browser interaction works.
- Current automation covers production builds, deterministic JS, Python site
  regressions, Node citation mapping, and weekly/manual external links. Browser
  accessibility/layout/network tests have been discussed but are not implemented.
  Inspect changed views in a browser at desktop and 320px, in both themes, using
  keyboard navigation and reduced-motion preferences. Check Cite/Copy after
  citation changes. Do not claim those checks ran unless actually performed.
- Lychee resolves relative links against the production origin and excludes that
  origin; the offline checker owns local links. Exercise `workflow_dispatch`
  when editing Lychee configuration, since PR runs skip external checks. Keep
  exclusions narrow and documented; a passing run does not verify excluded URLs.

## Scope

Make focused changes that preserve published URLs and the project's metadata
guarantees. Avoid reintroducing unused template features. Update `docs/` and the
PR description when behavior or conventions change.

## Spacing and typography

`_sass/_project.scss` defines one vertical-rhythm scale (`$space-section`,
`$space-subhead`, `$space-block`, `$space-text`) applied to `.page__content`
direct sections and to the project/imagery blocks. Use it for new sections
rather than ad-hoc margins so the rhythm stays consistent across pages. Each
page has a single `h1` (`.page__title`); on the home page the hero tagline is a
`.project-intro__lead` paragraph, not a heading, so the `h1` remains the largest
element, including on mobile: stack the logo/title there so the title has room
without shrinking below the tagline. Keep heading levels in order (h2 for
sections, h3 for subsections).

## Biological imagery (issue #11)

The homepage has no author sidebar and uses `.page--home` for its full-width
composition. Keep the original `images/logo.png` beside the homepage h1 in
`.home-brand`, with its white backing in both themes; biological imagery and
the small navigation hexagon do not replace it. Keep the main h1 and metadata;
introductory and supporting headings
remain real headings. Image credits live in `_data/image_credits.yml`, rendered
beside the images, with detailed provenance in `docs/design.md` and per-image
license scope in `images/biology/LICENSE.txt`. Honeycomb derivatives are CC BY-SA
3.0, separately from the repository's project code licensing. Do not remove credits or
crop the eye micrograph's scale bar. Use local responsive WebP/JPEG pairs, explicit
dimensions, and meaningful alt text. Keep caption text outside hexagonal masks.
The main image is eager; the supporting image is lazy. Review artifacts under
`docs/design/` are excluded from deployment. Run browser/axe checks in both themes
and widths after changing layout or colors; `assets.spec.mjs` verifies decoding
and local responsive image selection.

Parallel browser checks need the current `scripts/preview.py` server (backlog
128); restart a stale reused server after editing it. Connection resets for
CSS/fonts/images can cause misleading layout failures. Browser layout checks
wait for the local font and reduced-motion rendering; axe waits for existing
keyboard initialization of code scrollers. Preserve those assertions when
adjusting test timing.

## DNA identity and interior imagery (issue #13)

The hexagon's primary meaning is the six-membered ring in all four DNA bases.
Thymine/cytosine have one such ring; adenine/guanine also have a fused five-membered
ring. Nature patterns support this molecular identity; they do not replace it.
Preserve the homepage `#why-the-hexagon` explanation and links from interior pages.
`nature-panel.html` renders different manifest-backed images on Publications
(insect eggs), Guide (tortoise scutes), and Resources (pineapple eyes). Keep full
frames, visible source/license credits, local 400/800px WebP/JPEG variants, and
intrinsic dimensions. Do not infer perfect hexagons or an unverified species.
These three panels are near the top and load eagerly; below-fold homepage imagery
remains lazy. The new egg/tortoise derivatives are CC BY-SA 2.0, pineapple CC BY-SA
4.0; retain their independent image licenses. Run image decode/credit checks and
axe/layout checks on all three pages in both themes and widths.

## Licensing policy (2026-10-09)

New FAIR BioHeaders project contributions from March 2025 onward use MPL-2.0.
David Molik left USDA in February 2025. Preserve historical USDA public-domain
material, previously granted permissions, and third-party licenses/notices;
do not label all current contributors as government employees. See LICENSE
for scope. Do not rewrite historical releases or silently relicense upstream
material. Keep README badges, package metadata and citation metadata consistent.
