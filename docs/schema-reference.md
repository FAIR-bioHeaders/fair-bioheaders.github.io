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
| `scripts/schema-snapshots/*.json`, `*.yaml` | The pinned schema and shared-model bytes (FHR/FHP/FHGFF3 v0.6.0, the FHT development draft, `schemas/core.yaml`, `schemas/shared.yaml`, `schemas/versions.json`; the superseded v0.5.0 copies stay pinned under `references` as immutable history) |
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
the FHT page keeps its draft notice and never links a released alias.

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

- **Contract** — released types cite their fixed alias (`…/v0.6.0` = FHR "2.1",
  FHP "1.2", FHGFF3 "1.2"; the FHR 2.1 bytes are unchanged from v0.5.0).
  FHT cites only the FHT-Specification development URL and is
  marked draft on the page, in the nav and in the index tables.
- **Toolkit** — the current PyPI release, `fair-bioheaders` 0.10.0, bundles the v0.5.0
  schemas for the three released types; no released toolkit bundles the 1.2 schemas yet,
  and v0.6.0 support is prepared, not released. It recognises the FHT URL and reports
  `not assessed` / `unsupported-header-type`; that is detection, not support.
- **This site's builder** — `/table-builder/` still validates its documented **v0.4.0**
  snapshots (FHR "2.0", FHP/FHGFF3 "1.0"). It cannot produce `x-` extension fields, so the
  reference pages say so instead of implying coverage. Current-release builder support is
  [issue #15](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/issues/15).
- **Verification** — schema validity, file checksum verification, parent-link checking
  and biological/feature validation are separate questions with separate tools, spelled
  out in each page's "Validation boundaries" section.

FHGM (gene model) is a separate draft under review
([shared #204](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/204),
[#207](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/207)).
Since the #52 follow-up it has its own page, `/specifications/fhgm/`, but **not** a
generated field reference: FHGM has no contract to inventory, so nothing is pinned
for it in `scripts/schema-snapshots/`, `schema_fields.py` never learns an `fhgm`
type, and the page links the shared `docs/FHGM.md` as the authority instead of
mirroring the development repository's draft overlay. `check_site.py` enforces that
boundary on the rendered page (`fhgm_draft_errors`): the draft notice and the
`docs/FHGM.md` link must be present, and no generated field tables, `reference-provenance`
block or `w3id.org/fair-bioheaders/fhgm` alias may ever appear there. When — and only
when — #204 resolves into a reviewable model, the page gains a generated reference the
same way FHT's draft one did.

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
