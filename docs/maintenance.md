# Website maintenance

## JSON schema source of truth

Maintainer decision (2026-10-09): the JSON schemas served from the owning
repository's raw `main` branch are the single source of truth for FH* validation
and form fields. For FHR this is
`https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/main/fhr.json`.
Use the actual schema path in its owning repository for other header types.
LinkML models, generated bindings, bundled copies and release snapshots must not
silently replace that authority or define divergent required fields.

Tools may bundle/cache a copy for availability, but must document its raw-main
source, retrieval/build provenance and refresh behavior; a stale copy must not
be advertised as current-main validation. Record a retrieved commit/digest when
useful for reproducibility without making it a different canonical schema URL.
Keep schemaVersion, software/release version and resource version distinct.
Do not require persistent/versioned schema URLs as a prerequisite for the table
builder. Changing this source-of-truth policy needs an explicit maintainer decision.

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

The inherited template tag dates from February 2024, older than the upstream `v0.9` release and the issue title's “~4 years.” The original SEO include already assigned a description fallback, but failed to emit a standard description tag and gated its Open Graph description on page excerpts. Both outputs now use the fallback. A `.nojekyll` file would disable this site's required Jekyll processing and must not be added. The existing `github.io` hostname needs no `CNAME`.

## Acceptance checks

- Demo and utility URLs are absent from the XML sitemap, with no duplicate entries.
- Local links, fragments, and assets pass checks on every PR; external links are checked weekly or on demand.
- Every content page has description and social image metadata; home identities include both maintainer ORCIDs.
- Current pages load no MathJax, polyfill, icon fonts, or analytics. Opted-in math pages emit an explicit marker and must load exactly the pinned MathJax script.
- CI builds with lockfiles; generated JavaScript is reproducible.
- Every `.reference` block carries Schema.org microdata with a title, author name parts, and a DOI or repository identifier, and each cite button has a matching output element. `scripts/test_cite.mjs` covers the microdata-to-BibTeX mapping.
- Publication pages include `ScholarlyArticle` JSON-LD and Highwire `citation_*` meta; the home page includes `WebSite`, `/publications/` includes an `ItemList`, and utility pages are `noindex`. All JSON-LD blocks parse as valid JSON.

The scheduled/manual Lychee step resolves relative links against the production URL and excludes this site, since `check_site.py` validates local paths and fragments on every build. `.lycheeignore` documents DOI and ISO exclusions for automated-client blocking. Run the workflow manually when changing this configuration to exercise the external-link step.

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

## FHR table builder

`/table-builder/` is an FHR-only browser prototype (issue #16). One form drives
one typed record, which is validated against the FHR JSON schema, previewed as a
readable table, and serialized to a standalone HTML document (with FHR
microdata) and a YAML metadata file. All processing is local; there is no
backend, upload, login, or persistence.

- **Schema copy:** `assets/schema/fhr.json` is a cache of
  `https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/main/fhr.json`.
  It was retrieved from FHR-Specification `main` commit `21fef56` on 2026-10-09
  (sha256 `e3d3843e1a1646e12495ccc9a615df94b7abe71b833c5f336c59444e0a49620a`).
  Refresh it by re-downloading that URL and updating this note; the raw-main URL
  remains the canonical schema, and a stale copy must not be presented as
  current-main validation.
- **Validation is structural only.** It follows the schema's required fields,
  types, patterns, formats, and `additionalProperties`. Passing it is not a
  claim about biological quality and does not verify a checksum against any file.
- **Microdata:** the standalone HTML emits the same FHR item scope that
  the FHR converter writes and reads (`_html_value`/`_input_microdata`). It
  round-trips through `fhr-convert` in the FHR-File-Converter. Keep
  `assets/js/table-builder.js` in step with that convention.
- **Assets and JS:** `table-builder.js` loads only on `/table-builder/` (like
  `theme.js`, it is not part of the bundled `main.min.js`). Node unit tests live
  in `scripts/test_table_builder.mjs`; browser checks in
  `scripts/browser/table-builder.spec.mjs`. The page is indexable and in the
  sitemap allow-list.
- **Browser coverage:** the Playwright project runs Chromium at desktop and 320px
  widths (light and dark). Firefox and WebKit were not added to CI to keep the
  browser install small; the download and cleanup paths use only standard
  `Blob`/`URL.createObjectURL`/anchor behavior, and this limitation is noted in
  the PR. A synthetic example pair for review is committed at
  `docs/table-builder-example.html` and `docs/table-builder-example.yaml` (not
  deployed, since `docs/` is excluded).


### Version-aware validation decision (2026-10-09)

The repository/raw-main copy remains canonical for development. Validation must
honor a record's cited schema version; versioned w3id aliases resolve to fixed
repository releases/revisions. A latest-schema check is explicit, never a silent
replacement for a cited version (FHR-Specification #44, #35, #54).

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
The converter round-trip in the PR validation notes is a local verification;
CI currently checks microdata markup, not an installed-converter round-trip.
