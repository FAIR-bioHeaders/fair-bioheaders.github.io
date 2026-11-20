---
title: "FAIR BioHeaders metadata mappings"
permalink: /mappings/
excerpt: "How FHR header fields relate to qualified Dublin Core: the adopted mapping v1 crosswalk, its worked example, and what it does not claim."
---

**Reference material, not a converter.** This page renders the
[FAIR-bioHeaders Specification][spec] **mapping v1** surface: a root-field handling
inventory from FHR to qualified [DCMI Terms][dcmi], a supplemental export-context contract,
and one worked bundle. The maintainers adopted that surface on 2026-11-14 as
*correct-but-not-final* and **withheld the "official" label until a deterministic exporter
ships**. No exporter ships, here or in the toolkit: nothing on this page writes a Dublin
Core file for you, validates a DataCite or Crossref deposit, registers a DOI, or mints an
ARK.

The completed foundation is deliberately limited to the FHR root-field inventory,
export context and curated DCMI example. Additional target adapters and nested or
reverse mappings are deferred work, not conditions for this reference page.
The table lists other targets to explain their current limits, without claiming
that they are implemented. The label remains conditional on a released exporter.

Every table below is generated from byte-pinned copies of the upstream artifacts and
re-checked against them in CI, so the page cannot quietly grow a meaning of its own. The
specification repository is the authority, and
[#56](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/56) is where
adoption, the label and any version bump are recorded. See
[mapping v1 adoption packet][packet] for the row-by-row decision sheet the wording here
follows.

## Four subjects, and why their values never substitute

The v1 resource model describes **one assembly resource** and keeps four subjects apart. A
name, a date or an identifier belongs to exactly one of them, and moving it between subjects
merely because both appear in the same file is the failure mode this inventory exists to
prevent.

<div class="field-table" role="region" tabindex="0" aria-label="The four subjects of an assembly record">
<table>
<caption class="visually-hidden">The four subjects an FHR record touches, what each one supplies, and what it must never be read as.</caption>
<thead><tr><th scope="col">Subject</th><th scope="col">What it is</th><th scope="col">Supplies</th><th scope="col">Never read as</th></tr></thead>
<tbody>
<tr><th scope="row">The assembly</th><td>The biological resource the header describes</td><td><code>genome</code>, <code>version</code>, <code>taxon</code>, <code>assemblyAuthor</code>, <code>dateCreated</code>, <code>masking</code>, <code>vitalStats</code>, <code>checksum</code></td><td>A bibliographic record: <code>genome</code> is not automatically a citation title</td></tr>
<tr><th scope="row">The metadata record</th><td>The header document itself</td><td><code>metadataAuthor</code>, the cited <code>schema</code> and <code>schemaVersion</code>, its own IRI</td><td>The assembly: <code>dcterms:conformsTo</code> applies to this subject only</td></tr>
<tr><th scope="row">A describing publication</th><td>A paper about the resource</td><td><code>scholarlyArticle</code>, a resource DOI when context supplies one</td><td>The assembly: an article DOI is not the genome's identifier</td></tr>
<tr><th scope="row">The specification and software</th><td>The contract and the tools</td><td>Repository and version references</td><td>Any of the three above: software authorship is not dataset authorship</td></tr>
</tbody>
</table>
</div>

Three consequences the upstream checker enforces rather than merely recommends:

- **Authors do not cross.** `assemblyAuthor` names who assembled the genome;
  `metadataAuthor` names who asserted this header. Order, full names, identifiers and the
  optional `nameType` stay in the source; a person/organization class is never inferred and
  a name is never split.
- **Dates do not cross.** `dateCreated` is assembly creation. A publication date or year
  arrives with the export context and is never defaulted from creation, from a file
  timestamp, or from metadata authorship. When both a publication date and a year are
  supplied they must agree, and a disagreement is rejected rather than resolved silently.
- **Identifiers do not cross.** A supplied `checksum` or `seqcol_id` is not a registered
  identifier; `accessionID.name` may name a repository without yielding an accession; and
  arbitrary strings in `identifier` are not DOIs. A resource IRI equal to the related
  article's DOI, or equal to the metadata record's own IRI, is a scope conflict and is
  rejected.

The fixture proves the split rather than asserting it: the assembly subject is created
`2022-03-21` and issued `2026-02-02`, two different authors are attached to two different
subjects, and the contract assertion sits on the record.

## How to read the crosswalk

Each FHR root field carries a disposition on the v1 descriptive surface, the subject it
belongs to, the condition under which anything is emitted, the transformation applied, and
the loss that remains:

- **Conditional** — a projection exists when the stated condition holds. The condition is
  part of the rule: without the stated scope or context, nothing is emitted.
- **Not projected by mapping v1** — the value stays in the preserved source record. This
  describes the surface rather than the field: the inventory names why the value is left out
  and where it survives.

Root cardinality counts field or container presence, not the number of array items, and no
row asserts a SKOS equivalence. DCMI term IRIs are **names pinned to the
[2020-01-20 versioned page][dcmi]**, not living documents: the adoption packet's 2026-11-13
link audit found several `purl.org` dereferences returning 503 through `purl.archive.org`,
so this page deliberately invites no "resolve it yourself" demonstration.

V1 covers root fields on purpose. Nested structure keeps its home in the preserved source
record and in the older canonical JSON-LD/DCMI table, which stays a separate contract with
its own version metadata.

## Descriptive export is not deposit readiness

A crosswalk that reads well is not a deposit that would be accepted. The delivery matrix
below records one target with any v1 surface and five as planned; their candidate version
numbers are review references, not claims that an adapter validates those formats. In
particular, REST retrieval JSON is not the Crossref deposit format, and a missing publisher,
title, publication date or resource identifier is reported as missing context rather than
filled in.

Source and output stay distinct too: the canonical JSON-LD form round-trips by design, the
schema.org export is one-way, and the qualified-DC graph here is lossy in a third way — it
drops array order and nested structure. That is why the bundle keeps `source.json` and
`context.json` as the preservation layer, and why no reverse mapping is claimed.

## Referencing an assembly without downloading its sequence

A metadata-only source reference can identify an externally held assembly while
keeping its evidence separate from a file-bound header. The adopted
[source-reference example][reference-example] uses a dated NCBI metadata snapshot:

> *Drosophila melanogaster*, “Release 6 plus ISO1 MT”; NCBI RefSeq assembly
> [GCF_000001215.4](https://www.ncbi.nlm.nih.gov/datasets/genome/GCF_000001215.4/)
> (repository release date: 2014-08-01).

The [authored reference][reference-json] preserves the source's submitter as
“The FlyBase Consortium/Berkeley Drosophila Genome Project/Celera Genomics”.
That is a **submitter**, not an inferred assembly creator list. The repository
release date is not automatically assembly creation, article publication,
specimen collection or deposition. The accession includes its accession version;
no separate assembly version, resource DOI or describing article is supplied.

The [unmodified NCBI response][reference-snapshot] was retrieved on 2026-11-16.
The authored reference records its actual downloaded length (3,681 bytes), API
source URL and SHA-256. This digest identifies the **metadata snapshot**, not a
sequence file. The upstream fixture checks that the transcribed values match that
snapshot without making live requests.

No sequence was obtained. Metadata statistics therefore establish no exact file
checksum, SeqCol digest or verified parent-file identity. This reference is
**not a complete FHR header or export-context input**: do not invent missing
authors, dates or checksums to make it one. A landing URL records a source; it
does not archive the assembly or guarantee future persistence. The example
illustrates resource identity within the adopted foundation, without claiming
DataCite validity, a formatted citation adapter or deposit readiness.

The pinned v1 delivery matrix predates the FHT v0.7.0 release. FHT now has
a published header contract, but no FHT mapping profile is adopted by that
assembly-only foundation; contract publication does not expand this crosswalk.

## Generated from the pinned v1 surface

{% include mappings/v1-crosswalk.html %}

## Separate contracts, kept separate

Three existing artifacts are not part of mapping v1 and are not re-described here: the
[canonical JSON-LD/DCMI table][canonical], which covers property paths rather than root
fields and declares its own conditional equivalences; the
[schema.org one-way export][schemaorg]; and the [MIxS/MIGS projection][mlixs], whose scope
is environmental-marker metadata. Showing them side by side is not endorsement by DCMI,
DataCite, Crossref or the ARK community, and it is not a submission recipe.

## Where the authority lies

- The pinned artifacts, their commit and their digests are named in the provenance line
  above, and recorded in `scripts/mapping-snapshots/provenance.json`.
- `scripts/mapping_crosswalk.py` renders the tables and its `--check` mode is the drift gate
  CI runs; refresh procedure and wording rules are in
  [`docs/mappings-reference.md`](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/blob/main/docs/mappings-reference.md).
- Propose a mapping change in the specification repository, never here. An issue's or a
  merged proposal's existence does not establish adoption.

## Related

- [FHR schema reference](/specifications/fhr/) — the contract whose root fields are crosswalked above.
- [Specifications overview](/specifications/) — released header contracts and the FHGM development model.
- [Table builder](/table-builder/) — builds and structurally validates FH\* metadata records against pinned released contracts; it performs no mapping export.
- [Using FH\*](/guide/) — choosing a header type and a supported workflow.
- [Resources & citation](/resources/) — repositories, releases and citation records.

[spec]: https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification
[dcmi]: https://www.dublincore.org/specifications/dublin-core/dcmi-terms/2020-01-20/
[packet]: https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/1e6d692a37d55f322d7fa27c519b9a5254874e7e/docs/mappings/v1-adoption-packet.md
[canonical]: https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/mappings/fhr-jsonld-dcmi.yml
[schemaorg]: https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/SCHEMAORG-EXPORT.md
[mlixs]: https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/MAPPINGS.md

[reference-example]: https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/1a0792e6f8db1b73959999d30f5e6575b982cbfc/tests/fixtures/mapping-reference/README.md
[reference-json]: https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/1a0792e6f8db1b73959999d30f5e6575b982cbfc/tests/fixtures/mapping-reference/reference.json
[reference-snapshot]: https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/1a0792e6f8db1b73959999d30f5e6575b982cbfc/tests/fixtures/mapping-reference/ncbi-response.json
