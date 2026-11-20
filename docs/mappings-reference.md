# The `/mappings/` reference page (issue #29)

`/mappings/` publishes the FAIR-bioHeaders **mapping v1** surface as reference material.
Normative mapping semantics live in
[`FAIR-bioHeaders-Specification`](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification)
— in `mappings/proposals/`, `tests/fixtures/mapping-proposal/` and
[`docs/mappings/README.md`](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/mappings/README.md)
— and issue
[#56](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/56) is the
only place where adoption, the "official" label and any profile version bump are recorded.
This page renders them; it defines nothing.

## Status language is load-bearing

The historical adoption remains the authority. The maintainers adopted v1 as **correct-but-not-final** on 2026-11-14 and **withheld the
"official" label until a deterministic exporter ships**. Two consequences are enforced by
checks rather than left to discipline:

- the page must keep the inventory's own vocabulary — a root field is
  **"Not projected by mapping v1"**, never "unmappable", because the ruling is about this
  surface and not about what a later version might do;
- the page may not claim a new official status, browser conversion or deposit readiness.
  Published toolkit 0.13.1 now ships the scoped export-dcmi CLI, verified in an
  actual noneditable install with two identical output bundles and exact input preservation. The upstream
  artifacts still carry `status: proposal` and `profile_version: 0.1.0-draft.1`, and the
  worked graph is a **manually curated fixture, not tool output**.

`scripts/mapping_crosswalk.py` refuses to emit wording containing
`official guidance`, `official mapping`, `unmappable`, `this page exports` or
`deposit-ready output`, and `scripts/check_site.py` re-checks the rendered page (including
the hand-written prose) for the same phrases. If the label is ever granted, that change
must be made deliberately, together with the two guards.

## How the page is produced

| Path | Role |
| --- | --- |
| `scripts/mapping-snapshots/provenance.json` | commit, URL and SHA-256 of every pinned artifact, plus the adoption record |
| `scripts/mapping-snapshots/assembly-dcmi.yml` | the root-field handling inventory (24 FHR root fields + 4 context keys) |
| `scripts/mapping-snapshots/profile-status.yml` | the per-target and per-type delivery matrix |
| `scripts/mapping-snapshots/assembly-export-context.schema.json` | the proposed supplemental context contract |
| `scripts/mapping-snapshots/{source,context,report}.json`, `qualified-dc.ttl` | the worked bundle |
| `scripts/mapping_crosswalk.py` | the generator and drift gate |
| `_includes/mappings/v1-crosswalk.html` | the generated fragment (never hand-edited) |
| `_pages/mappings.md` | the reader-facing prose around the fragment |

Commands, from the repository root:

```sh
python3 scripts/mapping_crosswalk.py            # regenerate the fragment
python3 scripts/mapping_crosswalk.py --check    # CI drift check (no writes)
python3 scripts/mapping_crosswalk.py --fetch    # refresh the pins (maintainer step)
```

## Refreshing after an upstream change

1. Run `--fetch`. It re-downloads every pinned file from the URL recorded in
   `provenance.json`, rewrites the bytes when they differ and prints old and new digests.
2. Update `ref`/`commit` in `provenance.json` to the exact revision you fetched. Pins cite a
   commit, never a moving branch, so the page can always name what it rendered. Do not
   widen the pins to include an artifact the page does not render.
3. Run the generator. Validation runs first and **refuses to render** when the surface has
   changed shape rather than content: a root-field count that is no longer 24, a disposition
   outside `conditional`/`unsupported`, a conditional row with no target term, an
   unsupported row that suddenly names terms, a target or header-type status this generator
   does not know, or a `source_schema` that is no longer FHR `v0.4.0`.
4. Read that refusal as a scope change, not a build error. A re-scoped inventory needs its
   wording and its rows reviewed here before it can be rendered — never re-tune the guards
   to make a page fit.
5. Commit the pins, `provenance.json` and the regenerated fragment together, then run the
   usual checks: `python3 scripts/mapping_crosswalk.py --check`,
   `python3 -m unittest discover -s scripts -p 'test_*.py'`, a production build and
   `python3 scripts/check_site.py _site`.

## Scope limits to preserve

- **FHR only.** v1 rules on FHR root fields for an assembly resource. FHP and FHGFF3 are
  recorded upstream as *not yet profiled* and FHT as *blocked* on its contract; a table row
  must not be invented for them.
- **Root fields only.** Nested detail stays in the preserved source record and in the older
  canonical JSON-LD/DCMI table, which is a separate contract with its own version metadata.
- **No dereference claims.** DCMI term IRIs are names pinned to the versioned specification
  page. The adoption packet's 2026-11-13 link audit found some `purl.org` dereferences
  returning 503, so the page deliberately does not invite readers to resolve them.
- **No minting, deposit or endorsement.** Publishing an example does not register a DOI,
  assign an ARK, or imply that DCMI, DataCite, Crossref or any other body endorses it.
- Interactive exploration, per-target adapters and any change to `/table-builder/` are
  separate work; this page is documentation only.

## Metadata-only source-reference example

The separate “Referencing an assembly without downloading its sequence” section
uses the adopted upstream fixture at immutable commit
`1a0792e6f8db1b73959999d30f5e6575b982cbfc`,
`tests/fixtures/mapping-reference/{README.md,reference.json,ncbi-response.json}`.
It links those authoritative artifacts rather than refreshing or duplicating
the older crosswalk snapshots. It preserves accession, submitter and repository
release-date roles, and distinguishes the metadata-snapshot digest from sequence
identity. No complete FHR input, additional target adapter, exporter or official
label follows from publishing this reference. The mappings browser suite checks
the rendered facts, immutable links and evidence boundaries.
