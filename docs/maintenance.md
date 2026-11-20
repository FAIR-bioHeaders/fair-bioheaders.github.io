# Website maintenance

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

The family builder defaults to released FHR v0.6.0 (string schemaVersion 2.1),
with the v0.4.0 releases and explicit legacy v0.3.1 and historical October 9
cache support kept on their own pinned snapshots.
Do not refresh a schema cache without updating its form, typed serialization,
fixtures and provenance in a dedicated schema-support change. Repository-link
cleanup must not rewrite existing embedded schema URLs/checksums or frozen
release snapshots. Never present the October 9 cache as validation of current
raw-main. See [the resource audit](resource-audit.md).

## Decision for issue #6

Trim the existing theme into a project-specific site instead of merging the entire Academic Pages v0.9 template. The inherited npm version 0.8.1.1 identified the template's 2024 origin, not a deployed theme dependency. The project now has its own package identity. Do not infer that it is upgraded to upstream v0.9.

Keep the home page, maintainer h-cards, publications and their existing URLs, resource/citation guidance, privacy page, and sitemaps. Remove demo posts, CVs, talks, teaching, portfolio, template documentation, fake PDFs, demo images, and comment fixtures. Organization metadata links the project's GitHub identity; person metadata links each maintainer's ORCID. Do not invent a Twitter account or Wikidata identifier to fill empty fields.

The sidebar and footer use text links, eliminating the need to ship full Font Awesome and Academicons fonts. Preserve the upstream attribution and license. The responsive navigation and locally hosted JavaScript remain. Public Sans v2.001 is self-hosted as WOFF2 files in `assets/fonts/public-sans`, with the upstream license. Keep font requests local. Keyboard accessibility, HTTPS links, metadata fallbacks, and a small light/dark preference control are maintained locally.

Analytics and comments are disabled. MathJax is loaded only when a page explicitly sets `math: true`, at a fixed version; no current page needs it. There is no global polyfill. No tracking ID or service is introduced as part of this cleanup.

Bibliography records live in `_data/references.yml` using a BibTeX-shaped schema (`type`, `title`, `authors`, `journal`, `year`, `volume`, `number`, `pages`, `doi`, plus `repository`, `programming_language`, and `license` for software and datasets). `_includes/reference.html` renders each as Schema.org microdata (ScholarlyArticle, SoftwareSourceCode, or Dataset) plus a "Cite" button that reveals a panel with the generated BibTeX and a "Copy BibTeX" control. `assets/js/cite.js` reads that microdata back into a BibTeX entry on demand, so the microdata is the single source of truth and no separate `.bib` copy can drift. Publications reference a record with `cite_key` in their front matter. `_data/reference_order.yml` fixes display order for the resources list and the publications `ItemList`. Keep the mapping between Schema.org itemprops and BibTeX fields consistent when adding entries.

`_includes/seo.html` emits the structured-data layer: an `Organization` (with `keywords`, `knowsAbout`, `sameAs`, and `member` persons carrying `jobTitle`/`worksFor`/`description`), a `WebSite` on the home page, a `BreadcrumbList` on content pages, an `ItemList` of `ScholarlyArticle`s on `/publications/`, and a `ScholarlyArticle` block plus Highwire Press `citation_*` meta tags on each publication page for Google Scholar. `/terms/`, `/sitemap/`, and the 404 page are `noindex`. `jekyll-feed` publishes an Atom feed at `/publications/feed.xml` (linked from the head and footer).

The former adoption list is removed because the repository did not provide evidence for those deployment claims. The home page now describes the published standard and links maintained repositories. Verified adoption examples can be added with a supporting source.

## Dependencies and checks

`github-pages` is pinned to 232, matching the [published GitHub Pages dependency set](https://pages.github.com/versions/). `Gemfile.lock` pins its resolved dependencies. Ruby 3.3.4 matches the verified Pages image. `package-lock.json` pins the JavaScript build tools; the production bundle uses jQuery 3.7.1. Dependabot proposes updates for Ruby, npm, and Actions. Actions are pinned to immutable commits. CI checks do not alter the existing branch-based Pages publishing configuration.

Builds are verified with the committed lockfiles. Before accepting dependency updates, run the site checks and inspect desktop/mobile rendering and keyboard behavior. Further theme changes should have a concrete benefit to this small project site; avoid reintroducing unused template features.

## Review corrections

The inherited template tag dates from February 2024, older than the upstream `v0.9` release and the issue title's “~4 years.” The original SEO include already assigned a description fallback, but failed to emit a standard description tag and gated its Open Graph description on page excerpts. Both outputs now use the fallback. A `.nojekyll` file would disable this site's required Jekyll processing and must not be added. The production origin is `https://fhref.org` with an empty `baseurl`. Pages publishes `main` from the repository root, so preserve the existing root `CNAME` containing only `fhref.org`, aligned with Settings → Pages. The site-check workflow builds a preview artifact and does not deploy it. Production metadata checks, deployed smoke checks, and Lychee use the custom domain. See [GitHub’s custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Acceptance checks

- Demo and utility URLs are absent from the XML sitemap, with no duplicate entries.
- Local links, fragments, and assets pass checks on every PR; external links are checked weekly or on demand.
- Every content page has description and social image metadata; home identities include both maintainer ORCIDs.
- Current pages load no MathJax, polyfill, icon fonts, or analytics. Opted-in math pages emit an explicit marker and must load exactly the pinned MathJax script.
- CI builds with lockfiles; generated JavaScript is reproducible.
- Every `.reference` block carries Schema.org microdata with a title, author name parts, and a DOI or repository identifier, and each cite button has a matching output element. `scripts/test_cite.mjs` covers the microdata-to-BibTeX mapping.
- Publication pages include `ScholarlyArticle` JSON-LD and Highwire `citation_*` meta; the home page includes `WebSite`, `/publications/` includes an `ItemList`, and utility pages are `noindex`. All JSON-LD blocks parse as valid JSON.

The scheduled/manual Lychee step resolves relative links against the production URL and excludes this site, since `check_site.py` validates local paths and fragments on every build. `.lycheeignore` documents DOI and ISO exclusions for automated-client blocking. Run the workflow manually when changing this configuration to exercise the external-link step.

## Schema reference pages

`/specifications/` publishes a complete field reference per header type, generated
from byte-pinned copies of the authoritative schemas. Regenerate it with
`python3 scripts/schema_fields.py`; the drift gate and the refresh procedure are in
[Schema reference pages](schema-reference.md). Never hand-edit the generated
`_includes/schema/*-reference.html` files, and never treat this site as a schema
authority.

## Browser, accessibility, and deployment checks

`npm run test:browser` runs a Playwright suite over the built `_site` at desktop and 320px widths in both themes. It checks horizontal overflow, masthead clearance, the skip link, the overflow menu (including Escape), theme persistence, console errors, and the Cite/Copy interaction, and runs axe accessibility scans that fail on any violation, including color contrast. New colors must pass axe against the code and footer backgrounds in both themes; the Rouge syntax palette has light values in `_sass/_syntax.scss` and dark overrides in `_project.scss`.

`npm run test:deploy` (and the `deploy-smoke.yml` workflow) smoke-checks the deployed site after a Pages build: the homepage, sitemap, robots policy, and both feeds must respond, and the live XML sitemap is parsed for the production origin, unique URLs, intended indexable pages, and reachable targets. Keep the sitemap allow-list in `scripts/check_site.py` and `scripts/check_deployed.py` in sync when adding an indexable page.

## Citation container hierarchy

Articles model the levels actually present: issue and volume use `ScholarlyArticle` → `PublicationIssue` → `PublicationVolume` → `Periodical`; issue-only uses `PublicationIssue` → `Periodical`; volume-only uses `PublicationVolume` → `Periodical`; and records with neither use `Periodical`. `volumeNumber` belongs on `PublicationVolume` and `issueNumber` on `PublicationIssue`. Keep `_includes/reference.html`, `_includes/seo.html`, and the `containerInfo` reader in `assets/js/cite.js` consistent when changing this, and keep the semantic checks in `check_site.py` in step.

The optional MathJax 3.2.2 script uses a verified SHA-384 integrity digest and `crossorigin="anonymous"`. A version change requires recomputing the digest from the CDN file and updating the template/checker together; MathJax may fetch additional components, so the entry-script digest is not a guarantee for all downstream requests.

## Biological visual identity

The homepage uses biological hexagon imagery and a wider project introduction,
with clear paths to the specification, tools, and resources. See `docs/design.md`
for the selected direction, source/license documentation, preparation commands,
and responsive behavior. Image licenses are independent of the project code licensing;
keep the visible credits and `_data/image_credits.yml` synchronized. Existing
publication/citation metadata and navigation remain part of the acceptance checks.

## FAIR BioHeaders table builder

`/table-builder/` supports released FHR, FHP and FHGFF3 metadata (issues #16/#15).
Each form drives one typed record, validated against its selected schema,
previewed as a readable table, and serialized as standalone HTML and YAML.
FHR, FHP and FHGFF3 HTML include type-specific microdata; FHGFF3 is experimental. All processing
is local; there is no backend, upload, login, or persistence.

- **Schema copy:** `assets/schema/fhr.json` is a cache of
  `https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/main/fhr.json`.
  It was retrieved from FHR-Specification `main` commit `21fef56` on 2026-10-09
  (sha256 `e3d3843e1a1646e12495ccc9a615df94b7abe71b833c5f336c59444e0a49620a`).
  Refresh it by re-downloading that URL and updating this note; the raw-main URL
  remains a supported compatibility URL, but this October 9 cache no longer
  represents current main. Schema-support updates are separate from link cleanup.
- **Validation is structural only.** It follows the schema's required fields,
  types, patterns, formats, and `additionalProperties`. Passing it is not a
  claim about biological quality and does not verify a checksum against any file.
- **Microdata:** the standalone FHR HTML emits the same item scope that
  the FHR converter writes and reads (`_html_value`/`_input_microdata`). It
  round-trips through `fhr-convert` in FAIR-bioHeaders-Tools. The FHP export
  follows the FHP microdata binding developed in FHP-Specification
  (`docs/FHP-MICRODATA.md`): the raw-main FHP schema itemtype (never the FHR
  itemtype), record-order properties and `data-fhr-type` typing. It
  round-trips through `bioheaders/fhp_microdata.py` in FAIR-bioHeaders-Tools.
  Keep `assets/js/table-builder.js` in step with those conventions.
- **Assets and JS:** `table-builder.js` loads only on `/table-builder/` (like
  `theme.js`, it is not part of the bundled `main.min.js`). Node unit tests live
  in `scripts/test_table_builder.mjs`; browser checks in
  `scripts/browser/table-builder.spec.mjs`. The page is indexable and in the
  sitemap allow-list.
- **Browser coverage:** the Playwright suite runs Chromium at desktop and 320px
  widths (light and dark), plus Firefox and WebKit at desktop width; CI installs
  all three (`npx playwright install --with-deps chromium firefox webkit`,
  added 2026-11-19 for issue #15). Four behaviors are engine conventions, not
  site defects, and each accommodation is documented in
  `scripts/browser/engine-helpers.mjs` with the 2026-11-19 local matrix run as
  evidence: (1) axe-core color sampling on WebKit misreads computed colors
  after a mid-session theme switch (it reported masthead links as `#16171a`
  while `getComputedStyle` returned `rgb(255,181,102)`), so the two
  mid-session theme scans of the filled builder form run on Chromium and
  Firefox while WebKit keeps its load-time light+dark axe scans of every page
  in `site.spec.mjs`; (2) `grantPermissions` for the clipboard is Chromium-only,
  so Firefox/WebKit assert the Copy control through a captured `writeText`
  payload; (3) WebKit's platform default keeps links out of the Tab order, so
  the skip-link and dropdown tests focus links directly on that engine while
  the Tab path stays asserted on Chromium/Firefox; (4) srcset candidate choice
  is UA discretion — the exact `-400.webp` selection is a Chromium assertion
  and other engines must select a local small-family candidate. The 320px
  project runs on Chromium only. A synthetic example pair for review is
  committed at `docs/table-builder-example.html` and `docs/table-builder-example.yaml` (not
  deployed, since `docs/` is excluded). That pair was generated from the legacy
  FHR v0.3.1 contract and is kept unchanged as a frozen artifact: it is not
  current-release builder output, and the current-release outputs are the
  `scripts/fixtures/family-v0.6.0/` records exercised by the tests.


### Version-aware validation decision (2026-10-09)

The repository/raw-main copy remains canonical for development. Validation must
honor a record's cited schema version; versioned w3id aliases resolve to fixed
repository releases/revisions. A latest-schema check is explicit, never a silent
replacement for a cited version (FAIR-bioHeaders-Specification #44, #35, #54).

The legacy v0.3.1 selection uses
`assets/schema/fhr-v0.3.1.json`, verified byte-for-byte against the v0.3.1 tag at
commit `378b534dda9c1d759f25b4b32287172402492233` on 2026-10-09. SHA-256:
`e3d3843e1a1646e12495ccc9a615df94b7abe71b833c5f336c59444e0a49620a`.
The tag raw URL and that exact commit raw URL are also supported aliases.
Keep this released snapshot fixed when refreshing `assets/schema/fhr.json`.
The unit test pins its digest. Add separate snapshots and tests when supporting
new releases; do not route new version aliases to whichever schema is current.

Explicit raw-main selection validates the separately documented development
cache, not a live fetch or a promise that the cache is current main. The UI names
that snapshot in its result. Unsupported targets block downloads. All schema
files load locally; selecting a URL never causes arbitrary network requests.
The numeric `schemaVersion` field (1.0) is distinct from the release tag (v0.3.1).
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
The installed-converter round trip in the maintenance notes stays a local
verification; since 2026-11-19 CI additionally re-reads every builder export
with standard library parsers and re-validates the reconstructions against the
pinned snapshots (`scripts/test_builder_roundtrip.py`), but CI still does not
run an installed converter.

## Resource and citation data after the repository split

`_data/references.yml` holds actual resource citation records; stable citation
keys retain the titles this site cites, FHR Specification / FHR File Converter
(DataCite registers the specification record as FAIR-bioHeaders Specification and the
toolkit record as FHR File Converter, checked 2026-11-14).
`resource_name` is the current overview label, and `release`/`version_doi`
provide explicit release links without replacing the concept DOI in Cite output.
`_data/development.yml` holds the four per-type development homes without
inventing independent release citations. Published artifacts link to the shared
publication repository; active converter links use FAIR-bioHeaders-Tools.
FHT remains Draft; Nextflow (FAIR-bioHeaders-Nextflow) is Published from v0.1.0. The standalone FHT converter is
retired and has no active download link.

The current specification/toolkit records use MPL-2.0, verified against the
October 14 DataCite/CITATION records. Supporting resource notices retain
historical public-domain/third-party exceptions. Do not relabel older releases
or use a copied per-type CITATION DOI as that type's independent identity.
See [resource-audit.md](resource-audit.md) for exact primary sources and the
intentional historical guide/builder URLs. New ownership/citation requirements
are checked in rendered resources and browser regression tests.

### FHR v0.4.0 builder support (issue #15, first slice)

The default schema URL was `https://w3id.org/fair-bioheaders/fhr/v0.4.0` when
this slice landed; it is now one of several pinned aliases (see "Current-release
builder support" below).
`assets/schema/fhr-v0.4.0.json` was verified byte-for-byte against release commit
`84c2f90ab0e97c81d8afbf33eafe80ebade7a009` on 2026-10-17. SHA-256:
`168a60467e3651dfdfe9855747f38257d5889bfcce6ec8661d9a378762a362dd`.
The existing validator covers the validation keywords used by this FHR snapshot;
the family extension also implements the FHGFF3 conditional validation keywords.
FHT remains deferred. Keep #15 open for its outstanding full delivery gates.

Schema selection sets the read-only schemaVersion to string `"2.0"` for v0.4.0,
or numeric `1.0` for the legacy contracts. Preserve entries when switching;
legacy validation follows its permissive nested-property policy rather than
dropping values or inventing stricter requirements.
GC is always a percentage: never guess that 0.42 means 42 percent. The frozen
legacy snapshots and example downloads remain unchanged.

### Released family forms (issue #15)

The header-type selector enables FHR, FHP and FHGFF3 v0.4.0. Type-specific
drafts are retained only in page memory. Switching clears previews/downloads;
never leak a previous profile's output into the selected profile. FHP and
FHGFF3 use string schemaVersion `"1.0"`, not the FHR `"2.0"`. Unknown targets
and cross-type targets block exports; selecting a URL makes no network request.

FHP/FHGFF3 controls use an explicit section layout, with nested field types,
requiredness, descriptions and vocabularies taken from the released schemas.
Optional objects may be omitted entirely; their required subfields apply when
the object is populated. Array order and numeric zero survive generation.
These are producer-reported assertions, not sequence/BUSCO/GFF3 verification.

Both schemas were retrieved from shared release v0.4.0 at commit
`84c2f90ab0e97c81d8afbf33eafe80ebade7a009` on 2026-10-17. SHA-256:

- `fhp-v0.4.0.json`: `e3f8f45260b833f931644e87ff7530cb9b4151e67094023dd96edde9a1d90366`
- `fhgff3-v0.4.0.json`: `f89635f252f6e204944de99e6c40bad1b0c9b37af5108fce05ee63f6dfd40bbd`

The browser validator covers the keywords in these snapshots, including
`allOf`, `not`, `contains`/`minContains`, `if`/`then` and `const`. Regression
fixtures under `scripts/fixtures/family-v0.4.0` are unmodified released examples
from that same tag; verify them and the validator against a reference JSON
Schema implementation when updating support. Avoid general JSON Schema claims.

FHR HTML retains its established microdata binding. FHP/FHGFF3 HTML includes its own typed microdata with a readable table.
FHGFF3 carries the experimental label and no JSON-LD support; YAML retains
extension fields. Do not emit FHR microdata for another header type. These
exports are metadata documents and do not embed headers into sequence files.

### Current-release builder support: v0.6.0 snapshots (issue #15)

The builder now cites shared release **v0.6.0** by default for all three released
types and can produce what that release added. This was one dedicated
schema-support change: pinned bytes plus form support, typed serialization,
fixtures, digests and provenance together — never a cache refresh on its own.

New pinned snapshots, retrieved 2026-11-14 from shared release `v0.6.0`
(tag object `ab7e3ddd53bfccee9a31d59fc10524eadf32c1da` → commit
`0ae18b00ee4bd71ab2dc28bae706b0f9d195076b`), verified byte-for-byte against
`https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/v0.6.0/<type>.json`
(HTTP 200) and byte-identical to the copies the `/specifications/` pages already
pin in `scripts/schema-snapshots/` (a unit test asserts both facts):

| Snapshot | SHA-256 | Declared `schemaVersion` |
| --- | --- | --- |
| `assets/schema/fhr-v0.6.0.json` | `694ab5afaf8c3743eacf9e2aacb5551f7cbe37073b6f4afc3ae4a65b47f9d4df` | `"2.1"` |
| `assets/schema/fhp-v0.6.0.json` | `92a0b3cbcfe69939ebfaac69f0c5958ce426c005873efe8d3e3eb0fc0dab6de5` | `"1.2"` |
| `assets/schema/fhgff3-v0.6.0.json` | `1942be4cefc8b3a2537942c2252b45fbcef87a5532486e4fd0f5d4c540e0fbf9` | `"1.2"` |

The declared versions come from the shared registry
(`schemas/versions.json`), pinned at
`scripts/schema-snapshots/versions-v0.6.0.json` (SHA-256
`7535e3569ce4157b22f14b9cd89dc98612b4e90cf553ef0a3250f5811529ce62`), and a unit
test ties the builder's release table to it: `v0.6.0` is FHR `2.1`, FHP `1.2`,
FHGFF3 `1.2`; `v0.4.0` is FHR `2.0`, FHP `1.0`, FHGFF3 `1.0`. The declared value
is never read off "whichever enum comes first".

**Frozen snapshots unchanged.** `fhr.json` (the raw-main development cache, the
October 9 copy), `fhr-v0.3.1.json`, `fhr-v0.4.0.json`, `fhp-v0.4.0.json` and
`fhgff3-v0.4.0.json` keep their bytes, their digests and their selection
aliases. `scripts/fixtures/family-v0.4.0/` is unchanged too. The builder added
`scripts/fixtures/family-v0.6.0/`: six unmodified released examples from the
`v0.6.0` tag plus one clearly labelled site-authored vector, with digests and
derivation in that directory's `README.md`.

**Pinned set, stated limitation.** The pinned releases are v0.6.0 (default) and
v0.4.0 for FHP/FHGFF3, and v0.6.0, v0.4.0 and v0.3.1 plus the raw-main cache for
FHR. Shared release **v0.5.0 is not pinned**, so a `…/v0.5.0` citation is an
unsupported target here even though the toolkit reads it; so are v0.4.1 and
v0.4.2. That is deliberate — no citation is ever validated against a snapshot
for another release.

**What the form gained.** Extension fields (rule R15) are a name/value section
whose key pattern is read from the cited snapshot's own `patternProperties`, not
duplicated in code; the value is recorded as text. Structured (object or list)
extension values are therefore not editable here, and that limit is stated on
the page. Dotted BUSCO `completeness.lineageDataset` values need no form change:
the field's pattern comes from the pinned schema, so `diptera_odb12.2` validates
at `1.2` and the schema's own conditional still rejects it in a record that
states `1.0` or `1.1`.

**Validator keywords.** The browser validator now implements `patternProperties`
and `propertyNames`, and `additionalProperties: false` only rejects a key that
matches neither `properties` nor `patternProperties` — without that fix every
extension field would have been wrongly rejected against its own contract. The
drift test that lists the keywords the validator claims to implement was
extended in the same commit.

**Microdata boundary (rule M5).** HTML microdata carries no extension fields.
The builder leaves every top-level `x-` key out of the item and says which ones
it left out in the standalone document; they survive only in the YAML. This
mirrors the binding, and it is required rather than stylistic: the released
toolkit refuses to read a page whose item has an `itemprop` starting with `x-`.

**Round-trip proof (local, dated — not a CI step).** `fair-bioheaders` 0.11.0
(PyPI, 2026-11-14) was installed in a throwaway venv and used on 2026-11-14
against output produced by this repository's own `standaloneHtml()`/`toYaml()`:

- builder FHR page citing `…/fhr/v0.6.0` with `x-` fields → `FHR metadata is
  valid`; `convert` returned the identical record minus the `x-` fields (M5).
- builder FHR YAML with scalar *and* structured `x-` fields → `FHR metadata is
  valid`; `convert` → record equal to the source, `x-` keys retained.
- builder FHP page (FHP 1.2, `x-` field, dotted `diptera_odb12.2`) → `FHP
  metadata is valid`; the YAML form converted back equal.
- the same record under a `…/v9.9.9` citation → `unsupported schema version:
  https://w3id.org/fair-bioheaders/fhp/v9.9.9 (this tool has FHP schemas for main
  (v0.6.0), v0.4.0, v0.4.1, v0.4.2, v0.5.0, v0.6.0)` — an explicit refusal, no
  silent substitution.
- the seven fixtures in `scripts/fixtures/family-v0.6.0/` (including the
  site-authored one) → each `bioheaders validate` clean.
- every fixture and rejection vector was also checked against a reference
  implementation (`python3 -m jsonschema`, Draft 2020-12): 21 cases, site
  verdict equal to the reference verdict in all of them.

**Round-trip proof, refreshed 2026-11-19 (local, dated — not a CI step).**
`fair-bioheaders` 0.12.0 (PyPI wheel, SHA-256
`fe1407bb91887bd41b2e47b756fb46a4b2a2e45405c29f5d6a325a284e6a29d6`) was
installed in a throwaway venv on Python 3.15 and run against the exports now
produced by `scripts/builder_roundtrip.mjs`: all seven v0.6.0 fixtures **plus
the two hostile vectors** validated from both the YAML and the standalone
HTML (`bioheaders validate`), `convert` of every builder HTML page returned a
record equal to the source minus the `x-` keys (M5, all seven pages), and
YAML→JSON conversion of `vector.fhr`, `vector.fhp` and
`extension-fields.fhr` returned the source record with `x-` keys retained.
The vector payloads are bidi overrides, zero-width and control bytes, YAML
indicator/tag characters, and valid-but-hostile URIs (`javascript:alert(1)`,
percent-encoded `data:`). One divergence from the runtime and its fix: the
site's `format: uri` check had used WHATWG `new URL()`, which accepts
`data:text/html,<script>alert(1)</script>` while the toolkit's strict RFC 3986
checker rejects it (`... is not a 'uri'`, reproduced with 0.12.0 on
2026-11-19). `table-builder.js` now enforces the RFC 3986 absolute-URI
grammar, the round-trip suite pins the boundary in both directions, and a
14-case probe against 0.12.0's checker (seven strings the site now rejects,
seven it accepts, including `javascript:` and percent-encoded `data:` as
valid URIs that render inert) showed zero disagreements.

CI does not install the toolkit, so the converter round trip above remains a
documented local procedure with a dated result; pinning a toolkit version into
website CI remains a maintainer decision (see issue #15).

**What CI does gate (added 2026-11-19, issue #15):**
`scripts/test_builder_roundtrip.py` runs in the standard `unittest discover`
step and automates the repository's own producer boundary for the pinned
v0.6.0 releases. It drives the shipping `table-builder.js` export functions
through `scripts/builder_roundtrip.mjs` over the seven v0.6.0 fixtures plus two
hostile vectors, then re-reads the exports with standard library parsing only
(a strict loader for the builder's restricted YAML subset, an `html.parser`
walk of the typed-span microdata and the readable table) and re-validates each
reconstructed record against the same byte-pinned snapshot with this
repository's own validator. It asserts YAML/microdata/table round-trip
equality including zero/false/absence, array order, bidi and zero-width
control bytes, YAML indicator and tag characters, and `javascript:`/`data:`
URI values rendering as inert text with no link, script or attribute
position; it asserts FHGFF3 output uses its own experimental itemtype. This is a
structural tripwire over this repository's bytes and bindings — it is not a
toolkit round trip, and the dated 0.11.0/0.12.0 local procedure above stays
the authority for released-runtime acceptance.

### Builder draft paths and schema loading

Validation uses the compact exported record, omitting blank rows. Error summaries,
focus links and field descriptions map record paths back to visible draft indexes,
including nested arrays and missing properties of populated objects. Do not remove
blank draft rows merely to align validation indexes. Rebuild this mapping for each
generation so corrected or removed rows cannot keep stale errors. Extension-field
rows live outside the record draft and merge in at generate time; a blank row is
omitted, while a duplicate name or a name that is also a standard field is
reported instead of silently winning over the field it would overwrite. Committing
a different pinned release rebuilds the form from that snapshot's bytes, because
vocabularies, patterns and extension-field availability are all read from them.

After local schemas finish loading, initialize through the selected header type,
including a selection made while requests were pending. The selected type, form,
validation contract and export identity must agree from the first render.

## Family terminology and navigation

Use FAIR BioHeaders as the project name and explain FH* as collective shorthand
on entry pages. FHR names the reference-genome header; FHT, FHP and FHGFF3 have
their own resource scope and independently stated release/tooling support.
Retain historical paper/registered citation titles, command/package names,
schema URLs, vocabulary IRIs and checksum-bearing examples. An FHR example or
browser form must not imply support for every family type. The historical guide
workflow remains unchanged; link versioned current examples separately.

`_data/navigation.yml` can mark secondary links with `overflow: true`. JavaScript
examples uses this flag to stay in the existing More navigation dropdown at all
widths. Greedy navigation may add responsive overflow links ahead of it, but must
never promote a flagged link into the primary row on resize. Without JavaScript,
all links remain in the visible wrapping list. Test keyboard/Enter/Escape access,
resize behavior and no-JavaScript navigation when changing this mechanism.

An entry with `children:` renders as one masthead group: a link to the section page,
a disclosure button (`aria-expanded` + `aria-controls`, caret drawn with borders, no
icon font) and the child list. The bundle hides the list and operates the disclosure;
without JavaScript the list stays visible, and once greedy navigation moves the group
into More the children are listed inline and the button is hidden — the fixed
masthead's height and the article clearance must not change. The current page is
marked with `aria-current="page"` (bold text plus the existing gradient rule, never
colour alone) and its group with `is-current`. `scripts/browser/specifications.spec.mjs`
covers open/close, Escape-and-return-focus, the 320px overflow case and the no-JavaScript
case; keep those assertions when changing this mechanism.
