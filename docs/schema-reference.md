# Schema reference pages (`/specifications/`)

Issue #46 added one documentation entry with four stable pages —
`/specifications/fhr/`, `/specifications/fht/`, `/specifications/fhp/` and
`/specifications/fhgff3/` — plus the `/specifications/` overview the masthead
dropdown points at. Each page carries the complete field reference for its header
type. The normative contracts stay in
[FAIR-bioHeaders-Specification](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification):
this site renders them and is never a second schema authority.

## How the field tables are produced

Nothing on those pages is a hand-copied field list. The tables are generated from
**byte-pinned copies** of the published schemas, so they can be verified offline in
CI and so a schema change cannot leave the documentation quietly stale.

| Path | Role |
| --- | --- |
| `scripts/schema_fields.py` | Generator, drift checker, coverage reporter and refresh command |
| `scripts/schema-snapshots/provenance.json` | Every pinned file with its repository, ref, commit, path, URLs and SHA-256, plus release dates |
| `scripts/schema-snapshots/*.json`, `*.yaml` | The pinned schema and shared-model bytes (FHR/FHP/FHGFF3 v0.6.0, FHT v0.7.0; the previous owning draft stays byte-exact under references/history, `schemas/core.yaml`, `schemas/shared.yaml`, `schemas/versions.json`; the superseded v0.5.0 copies stay pinned under `references` as immutable history) |
| `scripts/schema-snapshots/examples/*.json` | Pinned released example records — the source of the "Example" column |
| `scripts/schema-snapshots/shared-core.json` | Which slots and objects are shared core/shared-model rather than type-specific |
| `scripts/schema-snapshots/notes/<type>.json` | Curated editorial layer: status prose, serializations, tooling support, units, examples where no example reaches a field, migration notes, and the explanation of each conditional rule |
| `_includes/schema/<type>-reference.html` | **Generated** reference block, committed, included by the page |
| `_pages/specifications/<type>.md` | Hand-written overview, examples, validation boundaries and related guidance, plus `{% include schema/<type>-reference.html %}` |

Each generated block ends with a provenance paragraph carrying the schema's SHA-256,
so a rendered page states exactly which bytes it documents.

## Commands

```sh
python3 scripts/schema_fields.py            # regenerate the four _includes/schema blocks
python3 scripts/schema_fields.py --check    # what CI runs: fail on drift, print coverage
python3 scripts/schema_fields.py --report   # coverage statistics only
python3 scripts/schema_fields.py --fetch    # maintainer step: re-download every pinned file
```

All four commands are standard library only and offline except `--fetch`. The drift
check runs automatically inside the existing CI step
`python3 -m unittest discover -s scripts -p 'test_*.py'` through
`scripts/test_schema_fields.py`, and `scripts/check_site.py` additionally verifies the
**rendered** pages: the pinned digest still appears in the markup, every reference
table has a `<caption>` and scoped headers, each scrollable table is focusable and
named, the released pages link their fixed `w3id` URL and the version registry, and
FHT cites its actual v0.7.0 identity, rejects a stale current draft notice and refuses release aliases without FHT.

## What the drift check refuses to accept

- A field added, removed, renamed, re-typed or re-required in the pinned schema
  without the committed reference being regenerated.
- A documented field with no description (from the schema or the curated notes).
- A documented field with neither an example nor a written reason for omitting one,
  and an example that violates the schema's own enum, pattern, length, range or `date`
  format — every displayed example is validated against the pinned constraints.
- A curated note naming a field that no longer exists, or a rule id in the schema
  bytes without curated text (and vice versa), so conditional rules cannot disappear
  silently.
- A shared slot or object that stopped existing in the pinned `schemas/core.yaml` or
  `schemas/shared.yaml`, or a shared-core top-level field rendered without its
  inherited label.
- A pinned release that disagrees with `schemas/versions.json` (`current`, or a
  `preRelease` marker), with the schema's own `schemaVersion` enum, or with the
  `schemaVersion` recorded in `provenance.json`.
- Liquid delimiters in the generated markup.

## Refreshing a pinned schema

1. `python3 scripts/schema_fields.py --fetch` — re-downloads every pinned file from the
   recorded `fetchUrl` and reports digest changes.
2. Update `ref`, `commit`, `path` and the alias/raw URLs in
   `scripts/schema-snapshots/provenance.json`, and `schemaVersion`/`release`/`releaseDate`
   for the new release. Confirm the release from the authority's own
   `schemas/versions.json` and GitHub release, never from memory.
3. Update `scripts/schema-snapshots/shared-core.json` if the shared model changed, and
   the curated `notes/<type>.json` files where prose, examples or rules no longer match.
4. `python3 scripts/schema_fields.py`, then rebuild and run the checks below.
5. Review the regenerated diff: it is the documentation-side view of the contract change.

Never hand-edit `_includes/schema/*-reference.html`, never edit a released schema copy
to make a check pass, and never rewrite an immutable release, tag or alias.

## Support claims to keep honest

The pages distinguish four things that are easy to conflate:

- **Contract** — FHR/FHP/FHGFF3 retain the documented v0.6.0 pins, and
  FHT 1.0 uses published v0.7.0 at 623c79fe58edeb238a20fb6de518c62dd69b92bc.
  Each type selects its own immutable registry snapshot; promoting FHT does not
  rewrite older type/source bytes. The old owning FHT schema and example stay
  under references, and old notes/rendering stay under history with digests and
  fixed source links.
- **Toolkit** — the current PyPI release, `fair-bioheaders` 0.12.0 (2026-11-16), bundles the
  v0.6.0 schema set (FHR 2.1, FHP 1.2, FHGFF3 1.2), unchanged from 0.11.0, and accepts a
  `…/v0.6.0` citation for all three types (checked 2026-11-18). Releases before 0.11.0 do not bundle v0.6.0 — 0.9.0 and 0.10.0 both name v0.5.0 as
  current — and 0.10.0 reports a `…/v0.6.0` citation as an unsupported schema version
  (checked 2026-11-14). FHGFF3 HTML microdata is available from 0.10.0 onward but
  **experimental** — its binding is a draft, so reading or writing emits
  `ExperimentalMicrodataWarning`, and that runtime availability is not website enablement
  (see shared `docs/MICRODATA.md`). FHT handling in that published 0.12.0 wheel remains the historical opt-in
  owning-draft lane, not normal support for the new shared contract. Actual
  released final 0.13.0 installed-artifact acceptance is pending.
- **This site's builder** — `/table-builder/` validates its pinned **v0.6.0**
  snapshots (FHR "2.1", FHP/FHGFF3 "1.2") and can produce `x-` extension fields and
  dotted BUSCO dataset versions; extension fields go to the YAML export, never to
  HTML microdata (M5). Its **v0.4.0** snapshots (FHR "2.0", FHP/FHGFF3 "1.0") stay
  selectable on their own bytes, and shared release **v0.5.0 is not pinned**, so a
  `…/v0.5.0` citation is reported as unsupported rather than validated against a
  newer snapshot. FHGFF3 typed microdata is deployed; the prepared FHT 1.0/v0.7.0
  form has separate actual released-runtime and Pages gates. These are [issue #15](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/issues/15).
- **Verification** — schema validity, file checksum verification, parent-link checking
  and biological/feature validation are separate questions with separate tools, spelled
  out in each page's "Validation boundaries" section.

FHGM native model 0.1 is published in shared v0.8.0 at 72cb46b, DOI 10.5281/zenodo.24385999; installed final 0.13.0 acceptance remains separate. This header-type reference generator
does not invent an FHGM header registry row. Its existing overview links the exact raw-tag schema and publication.json while keeping the logical native alias unlinked pending registration. It has no generated header inventory or header selector. A native model editor is not a prerequisite for FHT support.

## FHT publication promotion

The generated current reference now uses exact shared v0.7.0 bytes,
seven published JSON examples and versions-v0.7.0.json. The generator's
registrySnapshot setting defaults to the prior v0.6.0 pin for unchanged types.
The FHT source explicitly selects the v0.7.0 registry; both assert published
preRelease:null. Documentation covers the fifth molecule value mixed, named
metadata authors, unique parents, C1 runtime arithmetic, canonical checksums and
typed F1 HTML. JSON-LD remains unsupported. A frozen v1 mapping matrix does not
acquire an FHT profile merely because its header contract was published.

Toolkit final 0.13.0 release/installed acceptance, final review/CI and actual Pages
verification remain required before browser activation. No FHGM condition is
added. A source commit or locally built package does not satisfy those gates.

## Checks after changing this section

```sh
npm ci --ignore-scripts && npm run build:js     # if the bundle inputs changed
python3 scripts/schema_fields.py --check
BUNDLE_FROZEN=true JEKYLL_ENV=production bundle exec jekyll build --strict_front_matter
python3 scripts/check_site.py _site
python3 -m unittest discover -s scripts -p 'test_*.py'
npm run test:browser                            # desktop and 320px, both themes, axe
```

See `docs/preview.md` for the pinned Docker Jekyll image when the host Ruby is too old.

Toolkit 0.10.0 selects by release URL and rejects v0.6.0 aliases even for the unchanged FHR 2.1 bytes. New FHR 2.1 records intended for that toolkit must use a supported alias such as `https://w3id.org/fair-bioheaders/fhr/v0.5.0`. FHP/FHGFF3 workflows in 0.10.0 cover 1.1/v0.5.0, and FHGFF3 HTML microdata is experimental.
