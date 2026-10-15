# Resource and link audit — issue #22

Checked 2026-10-14 against primary repository/release and DataCite records.

## Published resources and development

- [Shared specification v0.4.0](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/releases/tag/v0.4.0): FHR schemaVersion `"2.0"`, FHP/FHGFF3 `"1.0"`. Per-type development belongs in FHR-Specification, FHT-Specification, FHP-Specification and FHGFF3; final artifacts publish together.
- [Toolkit v0.7.0](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools/releases/tag/v0.7.0): active family converter/validator, with FHP/FHGFF3 JSON-LD and microdata still unsupported. FHT awaits its reviewed contract. The old FHT converter is retired and no longer recommended.
- [Nextflow](https://github.com/FAIR-bioHeaders/FHR-Nextflow) is a development prototype, not a released family workflow suite. Its pinned dependencies differ from the newest toolkit release; the site retains Demo status.
- [FHGFF3 licensing review](https://github.com/FAIR-bioHeaders/FHGFF3/issues/3) concerns inherited gff-schema material. The released, independently authored annotation header is a separate artifact; linking its development home does not grant reuse permission for the whole inherited tree.

## Citation identity and provenance

DataCite still registers the titles **FHR Specification** and **FHR File Converter**. The site preserves those titles, both creators (David Molik, then Adam Wright), publication year 2026, and the concept DOI citation keys. Overview labels use the current repository roles; they do not silently rename the cited resource.

| Resource | Concept DOI | Current release DOI |
| --- | --- | --- |
| Shared specifications | [10.5281/zenodo.6762549](https://doi.org/10.5281/zenodo.6762549) | [v0.4.0: 10.5281/zenodo.23376528](https://doi.org/10.5281/zenodo.23376528) |
| Family toolkit | [10.5281/zenodo.6762547](https://doi.org/10.5281/zenodo.6762547) | [v0.7.0: 10.5281/zenodo.23376802](https://doi.org/10.5281/zenodo.23376802) |

Evidence: DataCite [specification concept](https://api.datacite.org/dois/10.5281/zenodo.6762549), [toolkit concept](https://api.datacite.org/dois/10.5281/zenodo.6762547), [specification release](https://api.datacite.org/dois/10.5281/zenodo.23376528), [toolkit release](https://api.datacite.org/dois/10.5281/zenodo.23376802), and each owning repository's CITATION.cff. All four DOI records declare MPL-2.0. Current FHR-Citation/Nextflow license notices also support MPL-2.0 for applicable work; retained historical public-domain material and third-party permissions remain separate. This audit does not relicense historical releases.

Development rows deliberately have no fabricated independent DOI, release year or citation authors. The copied FHT citation record references an FHR DOI; it is not evidence of an FHT-specific released resource.

## Intentional legacy references

- The guide's fhr 0.3.3 worked example is historical. Its schema URL, checksum and output bytes remain intact; its descriptive example link now points to the fixed toolkit v0.3.3 tree. The guide explains current v0.4/0.7 compatibility separately and directs new work to release examples.
- The builder defaults to its frozen FHR v0.3.1 snapshot. Its HTML itemtype, embedded metadata, JavaScript selection URLs, release digest and October 9 development cache are unchanged. Its page now states that v0.4 and other type forms are not supported. A link cleanup is not authorization to replace the schema under that form.
- Historical citation keys and the old FHT resource fragments are retained. The FHT development link remains reachable at `#FHT_Specification`; `#FHT_File_Converter` leads to retirement guidance without an unavailable active-tool link.
- Published article permalinks and publication data, site origin, CNAME, fonts, imagery and licenses are unchanged. The global navigation continues to use the organization URL.

## Validation boundary

Rendered resource regression checks reject old active converter links, misplaced publication links, incorrect citation identities and unsupported license metadata. Browser tests exercise resource roles and both registered citations through Cite/Copy at desktop and 320px. Existing build, accessibility, builder and deployment checks remain in force.

A tested source PR is not a production deployment. After merge and Pages publication, run `npm run test:deploy` and inspect the changed live pages before marking the deployment criterion complete. Live endpoint checks before that event only describe the previously deployed site.
