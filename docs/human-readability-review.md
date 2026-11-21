# Human readability review — November21,2026

This is an editorial and usability review for people using the website, not a
claim that a human participant study was run. No automated reading-age score is
used as a substitute for understanding the technical material.

## Routes and decisions

| Entry path | Problem observed | Change |
| --- | --- | --- |
| `/` | Intro relies on identity/provenance jargon; the short contract list omits transcripts; FHT text still frames shipped browser support as pending | Explain what the metadata records in plain language; include transcripts; align FHT support wording with the already published site/toolkit facts |
| `/table-builder/` | Readers encounter detailed version history and extension rules before reaching the form | Add three concrete steps and a form jump link; move all existing technical detail intact into an accessible disclosure after the form; retain the validation boundaries |
| `/specifications/` | Opening paragraph is a dense list of schema terminology | Define contract, explain what the field references contain, and keep the authoritative/generated-source distinction |
| `/resources/` | The first action is unclear among releases, citations and repositories | Add direct links for finding a repository, citing a release and using a header |
| `/tools/` | Installation and safety guidance are unheaded paragraphs after a comparison table | Add task headings; preserve installation, operation and source-build limits |
| `/mappings/` | Specialist terminology appears before a reader knows the purpose | Explain mapping and qualified Dublin Core first; preserve the adopted scope, publication evidence, withheld-label history and loss/disposition vocabulary |
| `/guide/` and the native language guides | The historical workflow and scattered setup information need separate focused work | Owned by issue76 and its independent language-libraries PR; do not mix those edits into this PR |

Generated field tables and crosswalks remain technical reference material and are
unchanged. Existing public URLs, citation keys, DOI titles, schema snapshots and
example bytes are preserved. New FHGM functionality belongs to issue74 and its
own PR. These three PRs share a base and can be reviewed independently.

## Validation boundary

Review changed pages at desktop and320px in light/dark themes; follow the primary
links, reach the builder form, expand its reference details by keyboard and check
for overflow and contrast. Keep existing browser and accessibility checks active.
Production build/link/sitemap regressions still apply. Record actual outcomes in
the PR; a source review alone does not claim browser or human-participant testing.
