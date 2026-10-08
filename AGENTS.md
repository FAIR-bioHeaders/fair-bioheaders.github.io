# AGENTS.md

Guidance for automated agents working in this repository. This is the project
website for FAIR BioHeaders, a trimmed Academic Pages / Minimal Mistakes Jekyll
site published by GitHub Pages from `main` at the repository root.

Start with `README.md`, `CONTRIBUTING.md`, and `docs/maintenance.md`. This file
records the non-obvious things that are easy to get wrong.

## Build and validate

Run the full check sequence before proposing a change. It mirrors CI.

```sh
npm ci --ignore-scripts          # once
npm run build:js                 # regenerate assets/js/main.min.js
JEKYLL_ENV=production bundle exec jekyll build --strict_front_matter
python3 scripts/check_site.py _site
python3 -m unittest discover -s scripts -p 'test_*.py'
node --test scripts/test_cite.mjs
```

Toolchain is pinned in `.ruby-version` (Ruby 3.3.4) and `.nvmrc` (Node 24).

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
  stale bundle fails the build. `package.json` script order also matters.
- **This is Jekyll 3.10 (GitHub Pages 232), not current Jekyl.** Liquid include
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
- **Citation microdata is the single source of truth.** References in
  `_data/references.yml` render as Schema.org microdata, and `assets/js/cite.js`
  reads that microdata back into BibTeX. Do not add a separate `.bib` copy, and
  keep the Schema.org itemprop ↔ BibTeX field mapping in `_includes/reference.html`
  and `cite.js` in sync.
- **Element IDs must be unique per page.** Each reference uses its citation key as
  an `id`. Do not render the same reference twice on one page (for example, in both
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
  appear in the resources list or the publications `ItemList`.
- A reference record needs either a `doi` or a `repository`; software/dataset
  records also carry `repository`, `programming_language`, and `license`.
- Maintainer identities live in `_data/team.yml` and render as h-cards and Person
  JSON-LD. Do not invent social accounts, Wikidata IDs, or affiliations — use
  verified sources (ORCID, Crossref, the project's `CITATION.cff` files).
- Verify factual and citation claims against primary sources (Crossref, DataCite,
  ORCID, publisher pages) before adding them.
- Self-hosted font lives in `assets/fonts/public-sans`; keep font requests local.

## Scope

Make focused changes that preserve published URLs and the project's metadata
guarantees. Avoid reintroducing unused template features. Update `docs/` and the
PR description when behavior or conventions change.
