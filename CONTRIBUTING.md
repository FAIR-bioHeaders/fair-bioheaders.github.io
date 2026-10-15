# Contributing

Report problems and propose changes in the [website issue tracker](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/issues). Type-specific schema changes belong in FHR-Specification, FHT-Specification, FHP-Specification or FHGFF3. Shared release/core questions belong in [FAIR-bioHeaders-Specification](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues); conversion/validation bugs belong in [FAIR-bioHeaders-Tools](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools/issues).

Create a branch from `main`, make the change, and open a pull request. Use [the preview instructions](docs/preview.md) to build and check the site. Keep new content focused on the project and its related research, verify claims against primary sources, and preserve published URLs.

For a new publication, add a Markdown file under `_publications/` with `title`, `collection: publications`, a stable `permalink`, `excerpt`, `date`, `venue`, `paperurl`, and `citation`. Use the DOI for `paperurl` and the online publication date when known. Explain how related research connects to FAIR BioHeaders. CI validates local links and metadata; external links are checked weekly and on demand.

Be considerate of contributors and readers. Use descriptive link text and accessible images and controls.

## License of contributions

New project contributions from March 2025 onward use [MPL-2.0](LICENSE). The existing MIT notice is retained verbatim for previously MIT-licensed material; prior permissions remain available. Third-party code and assets retain their own terms. Consult LICENSE and version history for scope. New contributions must have the rights needed for their declared license; retain source notices.
