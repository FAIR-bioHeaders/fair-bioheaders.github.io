# AGENTS.md

## Current repository context

This is the public Jekyll website and browser-tool implementation. Normative
contracts and reviewed mappings live in FAIR-bioHeaders-Specification; type
repositories own type development. Website issues #15/#21 track builder expansion,
grouped with #29 (a mapping explainer blocked on specification #56) under tracker
#39; #23 delivered the JavaScript guide (closed 2026-10-20) and the
/metadata-viewer/ page doubles as it.
The FHR-only prototype does not establish support for all types or current
schemas. Add profile support through its linked contract/toolkit work, preserving
local-file privacy, typed metadata and separate parsed/valid/verified states.

## Schema additions and their own development cycle

A new optional field, structured alternative, enum value, constraint, required
field or changed meaning is a schema-contract change, even when motivated by a
UI, exporter, parser fix or documentation task. Identify it explicitly as a
**schema addition** or other contract change in its issue and PR. Supporting an
already adopted field in a consumer is implementation work, not a new field.

Schema additions have their own proposal, review, compatibility, versioning and
release cycle. Keep them separately reviewable from routine fixes, website work,
packaging and dependency updates; link dependent implementation PRs rather than
silently adopting a field downstream. Shared fields/objects and cross-type rules
belong in FAIR-bioHeaders-Specification; type-specific design starts in the owning
development repository and is coordinated into shared publication. Name affected
types, requiredness, semantics, mappings, serializers and conformance fixtures.

During active construction of FHP, FHT and FHGFF3, maintainers may iterate on draft
fields with lighter process and include coordinated schema/implementation work in
one clearly scoped PR. Record the proposal and compatibility impact in that PR;
this flexibility does not make every field adopted or supported. Preserve already
published contracts and cited versions, label draft behavior, and obtain joint
maintainer review before publication. FHR additions retain the separate cycle.
Do not apply draft flexibility to released FHP/FHGFF3 schemas retroactively.

Use the shared specification's `docs/SCHEMA-VERSIONS.md` and
`schemas/versions.json`: contract versions are per type, distinct from repository
release tags and biological resource versions. Additive changes that preserve all
valid values and meanings qualify for a minor increment; invalidating records or
changing meanings requires a major increment. Do not assign a new version merely
for implementing an existing contract. Never rewrite immutable releases, fixed
schema aliases or existing file-bound headers as incidental cleanup. Header edits
require checksum recomputation and may affect downstream parent links.

Check the adoption decision and released support before implementing a proposal;
an issue or PR's existence does not establish adoption. Structured vouchers
(FAIR-bioHeaders-Specification#139/#140) and mapping profiles (#56 in that same
repository) have their own review history. Implemented subsets do not establish
full profile or header-family support. The mapping page tracked in
fair-bioheaders.github.io#29 depends on approved profiles. Recheck these records
rather than relying on a copied description of their temporary status.

## Schema authority and repository roles

The October 14, 2026 maintainer decision separates per-type development from
shared final publication. `FAIR-bioHeaders-Specification` publishes the reviewed
schemas, shared core, version registry, vocabulary and release artifacts.
FHR-Specification, FHT-Specification, FHP-Specification and FHGFF3 are development
homes; compatibility files in the fresh FHR repository retain established raw
URLs. See the [migration record](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/107).

Validate against the record's cited supported release, using its fixed w3id or
raw-tag alias. Raw-main means the current contract, with no v0.3 fallback;
unknown versions must not silently substitute another schema. A latest-schema
check is a separate explicit compatibility/migration operation. LinkML bindings
and offline caches follow the reviewed JSON contract, rather than becoming
independent authorities. Keep schemaVersion, software/repository release and
biological resource version distinct.

The FHR-only builder still supports v0.3.1 and its separately documented
October 9 development cache. It does not implement the newly released v0.4 form.
Do not refresh a schema cache without updating its form, typed serialization,
fixtures and provenance in a dedicated schema-support change. Repository-link
cleanup must not rewrite existing embedded schema URLs/checksums or frozen
release snapshots. Never present the October 9 cache as validation of current
raw-main. See [the resource audit](docs/resource-audit.md).

Guidance for automated agents working in this repository. This is the project
website for FAIR BioHeaders, a trimmed Academic Pages / Minimal Mistakes Jekyll
site published by GitHub Pages from `main` at the repository root.

Start with `README.md`, `CONTRIBUTING.md`, and `docs/maintenance.md`. This file
records the non-obvious things that are easy to get wrong.

## Build and validate

For site, asset or browser behavior changes, run the relevant checks below; the
full sequence mirrors CI. For AGENTS.md-only edits, review guidance and links and
run `git diff --check`; rebuilding the site is unnecessary.

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
  editing a bundle input listed in `package.json` (including `_main.js` and `cite.js`), run
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
- **`.nojekyll` must not be added.** It disables the Jekyll processing this site
  requires. Preserve the root `CNAME` containing `fhref.org` for branch-based
  Pages publishing, and keep `_config.yml` and production checks on that origin.
- **Preserve published URLs.** Publication `permalink`s are stable and indexed.
  Do not rename or restructure them without an explicit request.
- **The sitemap is allow-listed.** Use the current checker allow-list, including `/table-builder/`,
  and update sitemap/deployment checks together when adopting new public pages.
  Nonpublic utility pages use `sitemap: false` and `noindex`.
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
  (`Published`, `Draft`, or `Demo`). Keep FHR Nextflow Demo. Development
  entries in `_data/development.yml` use Development, with FHT Draft until its
  contract is released. Do not advertise the retired FHT converter as active.
  Keep registered citation titles separate from `resource_name` display labels;
  version DOI links must identify the exact release.
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
  regressions, Node citation mapping, Chromium browser/accessibility/layout
  checks, and weekly/manual external links.
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

## FHR table builder (issue #16)

`/table-builder/` is an FHR-only browser prototype: one form -> one typed record ->
validation against the selected supported FHR schema snapshot -> readable table +
standalone HTML (with FHR microdata) + YAML metadata, with local downloads.
Its delivered scope is FHR-only. Other header types require the linked family
builder issues and adopted contracts; uploads and persistence need explicit scope.

- The established FHR raw-main compatibility URL is
  `https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/main/fhr.json`.
  `assets/schema/fhr.json` is a documented cache (see `docs/maintenance.md` for
  its retrieved commit/digest). Refresh schema support in a dedicated change; never present a stale copy as
  current-main validation. Released aliases use their separate fixed snapshot
  as described in the version-aware decision below.
- The standalone HTML microdata must keep round-tripping through the converter
  (`_html_value`/`_input_microdata` in FAIR-bioHeaders-Tools). `table-builder.js`
  owns the record->table/microdata/YAML mapping; unit tests are in
  `scripts/test_table_builder.mjs` and browser tests in
  `scripts/browser/table-builder.spec.mjs`.
- `table-builder.js` loads only on that page (not bundled into `main.min.js`,
  like `theme.js`). It uses native Blob/object-URL downloads and revokes URLs on
  page hide; keep downloads exactly equal to the displayed source, mark output
  stale on edit, and never claim a checksum is verified or a file was saved.
- The page is indexable; keep `/table-builder/` in the sitemap allow-lists in
  `scripts/check_site.py` and `scripts/check_deployed.py`.

### Version-aware validation decision (2026-10-09)

The repository/raw-main copy remains canonical for development. Validation must
honor a record's cited schema version; versioned w3id aliases resolve to fixed
repository releases/revisions. A latest-schema check is explicit, never a silent
replacement for a cited version (FAIR-bioHeaders-Specification #44, #35, #54).

The builder defaults to `https://w3id.org/fair-bioheaders/fhr/v0.3.1` and uses
`assets/schema/fhr-v0.3.1.json`, verified byte-for-byte against the v0.3.1 tag at
commit `378b534dda9c1d759f25b4b32287172402492233` on 2026-10-09. SHA-256:
`e3d3843e1a1646e12495ccc9a615df94b7abe71b833c5f336c59444e0a49620a`.
The tag raw URL and that exact commit raw URL are also supported aliases.
Keep this released snapshot fixed when refreshing `assets/schema/fhr.json`.
The unit test pins its digest. Add separate snapshots and tests when supporting
new releases; do not route new version aliases to whichever schema is current.

Explicit raw-main selection validates the separately documented development
cache, not a live fetch or a promise that the cache is current main. The UI names
that snapshot in its result. Unsupported targets block downloads. Both schema
files load locally; selecting a URL never causes arbitrary network requests.
The legacy v0.3.1 `schemaVersion` is numeric `1`; newer contracts use quoted
`MAJOR.MINOR` strings. Neither is the repository release tag.
HTML microdata retains the canonical itemtype for converter compatibility; its
`schema` property carries the selected record schema URL.

String values are always YAML double-quoted using JSON escapes. Real YAML 1.1
and 1.2 parser tests protect types and control characters. `yaml` is a dev-only
test dependency and must not be loaded by the browser. Numeric object controls
convert to numbers before validation. Error links use registered controls or
focusable group fieldsets; clear removed controls from the registry.

Field errors must join existing `aria-describedby` help references while invalid,
and only the error reference should be removed when validation clears. Apply
this to repeatable scalar controls as well as ordinary/nested inputs. Browser
regressions check computed accessible descriptions and corrected-input cleanup.
The converter round-trip in the PR validation notes is a local verification;
CI currently checks microdata markup, not an installed-converter round-trip.

## Family terminology and browser-only boundaries

Use FAIR BioHeaders as the project name and explain FH* as the collective
shorthand; FHR specifically names the reference-genome header. The family-language
audit is tracked in #32. Preserve historical paper/registered DOI titles,
executable names, citation keys, schema URLs and vocabulary identifiers. Describe
each type's verified release and implementation status separately. The current
builder's FHR-only support does not become family support through renamed copy.

For metadata viewers/builders, local selection keeps data in the browser. Do not
upload files, persist their contents or automatically fetch schema, parent or
metadata URLs. Any future remote loading needs explicitly scoped, user-initiated
behavior. Render untrusted values as text and distinguish parsed, schema-valid,
file-verified and parent-verified results. Reuse reviewed readers instead of
implementing a second independent family parser.

`package.json`'s `uglify` script lists the actual bundle inputs. Changes to those
inputs require `npm run build:js` and the reproducibility check; standalone scripts
such as `theme.js` and `table-builder.js` are not bundle inputs. Test their own
behavior and page-loading scope rather than adding them to the bundle. Keep the
schema-authority/version-selection section as the governing rule; repeated
builder details describe its supported snapshots, not another schema policy.

## Metadata viewer (issue #23)

`/metadata-viewer/` is independent of the table builder. The initial draft reads
bounded JSON metadata only; no shared JavaScript reader or container parser is
claimed shipped. See `docs/metadata-viewer.md` for adapter semantics, example
provenance and the draft custom-element API. Never equate a recognized schema
identity or parsed JSON with schema validity or file/parent verification.

Keep all values as text, enforce file/complexity/numeric limits, clear stale
records on error/replacement, and preserve the pending-read cancellation token.
No upload, persistence, automatic URL resolution or arbitrary schema fetching.
Examples are local and fetched on deliberate button action. Keep the page in
both sitemap allow-lists and deploy fixtures; controls stay disabled without JS.
Add the viewer's Node test to CI and test populated/error/clear/no-JS views,
keyboard scrolling, local-only requests, both themes and narrow screens. #23 delivered
the JavaScript teaching page for FHR JSON and HTML microdata examples (closed
2026-10-20; the guide ships on the site).
The October 20 maintainer correction removes JBrowse integration, sequence-file
parsing and a released library as acceptance gates for #23. Preserve the stable
/metadata-viewer/ URL. The typed-span teaching helper is deliberately limited to
the authored layout, not a general HTML parser; keep runnable JSON/microdata
examples, extraction/query/edit/serialization code and scope/type tests together.

The viewer page doubles as the public JavaScript integration guide. Keep
`_includes/metadata-embed.html` as the single source for its escaped snippet and
standalone noindex example. Test the snippet outside the site theme using only
the component script/CSS and public `json` property. Underflow checks must use
original numeric tokens; expanded JSON Pointer budgets must be checked before
allocating paths, not merely after JSON input size/depth checks.

## Issue, project and code-review behavior

### Issues and the connected project

- Add every issue you work on to the connected project (project #9, "FAIR
  BioHeaders — 2026 refresh") and set `Status` to `In Progress` when work starts.
- Keep `Status` current as the work moves (`Todo`, `In Progress`, `Blocked`,
  `Blocked - In Progress`, `Done`), and set `Outcome` when it closes.
- Link every PR to its issue (`Closes #N` or `Refs #N`). Do not do unreported work.
- After each work run (implementation, tests, review pass), post a status comment
  on the issue or PR: what changed, checks run and results, commit/PR links,
  blockers, and the next action. Do not rely on chat history.

### Code review on a PR

When a PR receives code review (human or Copilot):

1. Read the overall review and every inline comment before changing anything.
2. Make each fix in a **new commit**. Do not amend or force-push over reviewed
   commits; if a rebase is required, cite the new head in the replies.
3. Reply to each inline finding with the fix and the relevant commit hash.
4. Resolve that inline comment/thread.
5. After all findings are handled, post an overall reply to the review
   summarizing each finding's disposition and the commits.
6. Treat optional suggestions as required unless they are genuinely out of
   scope; state why and link a follow-up issue.

Do not push to a repository's main branch or merge a PR without maintainer
approval.
