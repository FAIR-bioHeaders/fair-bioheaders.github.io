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
links live in `_data/development.yml`. Keep their roles distinct. The site cites
the specification as **FAIR-bioHeaders Specification** and the toolkit under its
registered title **FHR File Converter**, distinct from its current product name.
Preserve citation keys, version DOIs and historical records; see the
[resource audit](docs/resource-audit.md).

The table builder supports FHR 2.1, FHP 1.2 and FHGFF3 1.2 from shared v0.6.0,
and FHT 1.0 from v0.7.0. Earlier selectable releases retain their own snapshots.
FHGFF3 HTML has an experimental type-specific binding; FHT is normal released
support. Extension fields survive YAML and the readable table but are omitted
from HTML microdata. Structural validation does not verify files, parents or biology.
FHGM model 0.1 (shared v0.8.0) has a separate overview; it is not another header form.

[Tools and language guides](https://fhref.org/tools/) distinguish the released
Python toolkit from native R, Node.js, Java and Julia source libraries. Native
library support is determined by each build, independently of specification releases.

The [FHR JavaScript guide](docs/metadata-viewer.md) teaches reading/querying JSON,
changing a metadata copy, extracting an authored typed HTML microdata example,
and displaying records on another website. Local examples do not upload data or
claim schema, checksum or parent verification.
