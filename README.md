# FAIR BioHeaders website

Project website for the FAIR BioHeaders (FH*) family: genome, transcriptome, protein-set and annotation metadata, provenance, publications and citation guidance: [fhref.org](https://fhref.org).

[![Site checks](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/actions/workflows/build.yml/badge.svg)](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/actions/workflows/build.yml)

The site uses a trimmed Academic Pages / Minimal Mistakes theme and the GitHub Pages Jekyll dependency set. Publications live in `_publications/`, project pages in `_pages/`, and maintainer identities in `_data/team.yml`.

See [local preview and checks](docs/preview.md), [maintenance decisions](docs/maintenance.md), and [contributing](CONTRIBUTING.md). GitHub Pages publishes `main` from the repository root; CI checks and uploads a preview without deploying pull requests. The root `CNAME` contains `fhref.org` for this branch-based publishing workflow; keep it aligned with the custom domain in Settings → Pages.

## Licensing

[![License: MPL-2.0](https://img.shields.io/badge/License-MPL--2.0-blue.svg)](LICENSE)

New project contributions from March 2025 onward use [MPL-2.0](LICENSE). The existing MIT notice is retained verbatim for previously MIT-licensed material; prior permissions remain available. Third-party code and assets retain their own terms. Consult LICENSE and version history for scope.

## Repository roles

[FAIR-bioHeaders-Specification](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification)
publishes the reviewed family contracts and shared releases. FHR-Specification,
FHT-Specification, FHP-Specification and FHGFF3 are development homes.
[FAIR-bioHeaders-Tools](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools)
is the active family converter/validator; the standalone FHT converter is retired.

Resource citations live in `_data/references.yml`, while per-type development
links live in `_data/development.yml`. Keep their roles distinct. The registered
specification/toolkit DOI titles remain FHR Specification / FHR File Converter;
repository display names do not change those citation identities. See the
[resource audit](docs/resource-audit.md) for primary-source evidence and retained
historical URLs. The table builder supports released FHR, FHP and FHGFF3 v0.4.0 metadata,
with explicit legacy FHR v0.3.1 support. FHT remains deferred under issue #15.

The [FHR JavaScript guide](docs/metadata-viewer.md) teaches reading/querying JSON,
changing a metadata copy, extracting an authored typed HTML microdata example,
and displaying records on another website. Local examples do not upload data or
claim schema, checksum or parent verification.
