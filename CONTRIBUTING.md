# Contributing

Report problems and propose changes in the [website issue tracker](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/issues). Type-specific schema changes belong in FHR-Specification, FHT-Specification, FHP-Specification or FHGFF3. Shared release/core questions belong in [FAIR-bioHeaders-Specification](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues); conversion/validation bugs belong in [FAIR-bioHeaders-Tools](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools/issues).

Create a branch from `main`, make the change, and open a pull request. Use [the preview instructions](docs/preview.md) to build and check the site. Keep new content focused on the project and its related research, verify claims against primary sources, and preserve published URLs.

For a new publication, add a Markdown file under `_publications/` with `title`, `collection: publications`, a stable `permalink`, `excerpt`, `date`, `venue`, `paperurl`, and `citation`. Use the DOI for `paperurl` and the online publication date when known. Explain how related research connects to FAIR BioHeaders. CI validates local links and metadata; external links are checked weekly and on demand.

Be considerate of contributors and readers. Use descriptive link text and accessible images and controls.

## License of contributions

New project contributions from March 2025 onward use [MPL-2.0](LICENSE). The existing MIT notice is retained verbatim for previously MIT-licensed material; prior permissions remain available. Third-party code and assets retain their own terms. Consult LICENSE and version history for scope. New contributions must have the rights needed for their declared license; retain source notices.

## Agent review and human-only PR merges (maintainer direction, 2026-11-20)

[Authoritative Round 16 policy and plan](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/211#issuecomment-7042896529) supersedes the former conditional agent-merge authorization.
This rule applies to all repositories and operators, including FAIR-bioHeaders,
external upstream repositories and personal forks.

Agents must never merge pull requests. A human performs the merge. Agents must
not enable auto-merge, enter a merge queue, use another agent/service as a merge
proxy, or push directly to a default branch instead of merging a PR. Model
review never grants an agent merge authority. Preserve platform protections;
do not forge approval or work around repository permissions.

Every PR receives independent review from another actual model. Prefer another
model family, for example Qwen or Gemma reviewing Codex work, but a different
family is a preference rather than a hard requirement. A second session of the
same model is not another model. Record actual author/reviewer model identities
and never invent review provenance.

Agents continue monitoring CI and fixing failures and actionable review
findings. Read overall and inline reviews, fix in new commits, reply with
disposition/evidence, resolve handled findings and acknowledge clean reviews.
Validate the current head after changes; hand the human exact head/base,
review, CI, dependency and remaining-risk information. Missing, failed and
NOT_RUN checks are not passes. Contract adoption, curator acceptance and
publication keep their separate authority and gates.

Port the current policy through live AGENTS and applicable existing LLM/llms,
plugin/skill, contribution and workplan guidance. The six specification holders
remain semantically in step, not byte-identical; preserve local sections.
Immutable published/vendored historical instruction copies keep their bytes
and provenance and are explicitly non-operative from current parent guidance.
Their older text never authorizes an agent merge. Earlier rounds' authorized
merges and dated receipts remain historical facts, not future permission.
