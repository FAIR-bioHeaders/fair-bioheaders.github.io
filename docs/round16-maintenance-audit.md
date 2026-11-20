# Round 16 website maintenance audit — November 20, 2026

This records maintenance evidence, not a security guarantee or publication receipt.
Humans merge; a source PR and its preview do not establish Pages publication.

## Scope and independent review

Codex (GPT-6 family) authored the maintenance changes. Independent `nrp/qwen3`
reviewed the PR diff, its fixes, and then two complete-source packets at
`1da6ae780dc1482ee620f98b7e161b2c59a3cbfd` with no tools or writes. The
complete-source reviews are separate from the earlier diff reviews.

The browser packet covered all nine first-party page scripts, the customized
greedy-navigation plugin, active rendering templates/layouts, project Sass and
navigation (38 paths). The build packet covered all five production Python
scripts, the round-trip driver, both workflows, dependency manifests/locks,
Jekyll/Playwright configuration and toolchain/link-check settings (18 paths).

Excluded: frozen schemas/examples/fixtures and mapping pins; generated bundle and
reference fragments (checked against their sources); other vendored plugins,
inactive inherited templates and base theme Sass; images/fonts; test source and
static publications. These exclusions are not claims that those files received
an independent full code audit. Dependency advisories and maintained regressions
provide additional, distinct coverage. OS/image advisories and historical secret
scanning were not covered by this website packet.

## Verified changes

- Explicit maintainer snapshot refresh now accepts only HTTPS on the family
  paths at GitHub/raw GitHub/w3id, checks redirects and final authority, limits
  each response to 8 MiB, and confines destinations to the snapshot directory,
  including existing symlinks. This hardens a maintainer-only path; normal CI
  remains offline. No refresh command was run against real pins.
- Missing, chained-missing, cyclic and invalid schema-reference targets now fail
  closed. Browser initialization checks references before enabling a form;
  boolean-false schema targets cannot validate vacuously. Current valid pinned
  contracts and examples remain unchanged.
- Citation checks now parse HTML independently of attribute/class order and
  quoting, detect unclosed references and missing control bindings, and compare
  publication DOI/title identity between Highwire, JSON-LD and visible DOI links.
- BibTeX output escapes literal TeX punctuation in human-readable fields while
  preserving DOI/URL identifier spelling, percent encoding and underscores.
- The restricted mapping YAML reader rejects unsupported compact nested lists
  instead of misreading them as scalar text. The review's claimed infinite loop
  did not reproduce; this is a fail-closed subset correction, not a hang fix.
- Offline sitemap checks now require the production origin and every adopted
  route, agreeing with deployment checks. Both lists already contained FHGM;
  the review's missing-FHGM claim was incorrect.
- Generated reference prose distinguishes direct field constraints from the
  conditional/cross-field rules below. Only generated prose changed; inventories,
  pinned input bytes and field meanings did not.
- Both checkout steps disable persisted credentials; neither workflow writes.

Other source claims were verified rather than applied blindly: array-item enums
are checked after unwrapping; ECMAScript regexes without multiline mode reject the
reported trailing-LF case; viewer read tokens are already captured before await
and incremented on replacement; current reference anchors are unique and checked;
current `$ref` siblings contain annotations, not dropped validation constraints.
Missing publication references already fail metadata CI rather than silently
publishing a valid ItemList. Blob URLs intentionally remain available until
pagehide; no claimed transfer failure was reproduced. Inherited template values
are repository-authored and the cited legacy paths are inactive or trusted;
this is not a claim to sanitize arbitrary untrusted theme/front-matter code.

## Evidence and limits

Locked npm audit reported zero advisories. Bundler-audit 0.9.2 reported zero
vulnerabilities against ruby-advisory-db commit
`49bb1fbb35476f27f8cfbfcb943790633836dc1c` (1,379 advisories; updated November 19).
Gitleaks 8.30.1 found eight synthetic assembly-identifier matches in frozen
examples; these are not credentials and their bytes were preserved. Zizmor
1.16.3 credential findings were fixed; its remaining workflow_run finding was
assessed against the read-only, default-checkout public-site smoke workflow.
Actionlint 1.7.12 passed.

After the verified fixes, 153 Python and 111 Node tests passed, including positive
and negative refresh, reference, citation-control/identity and schema-reference
cases. Production builds use the pinned Pages Docker image and strict front
matter; generated references and the JavaScript bundle have drift/reproducibility
gates. Current-head browser and CI results belong in the PR handoff.

The earlier contended broad local run was not passed. A focused four-project
run passed 103 of 104 cases; its one Firefox startup-timeout case then passed
separately with unchanged assertions and timeout. Those are separate attempts,
not a single clean run. Preserve their failure and success receipts. Further
runtime changes require their own current-head regression evidence.

## Final corrective review and source guides

An additional independent GPT-6.1-Terra source review found that falsy `$ref`
values bypassed reference resolution. References now require own-property
presence and a supported nonempty string; direct and chained malformed values
fail closed. All 112 Node tests and 153 Python tests passed after the correction.
The 20 focused reference-preflight browser cases passed across Chromium desktop,
320px Chromium, Firefox and WebKit. The interrupted earlier attempt is retained
as incomplete evidence, not a pass.

The four native-language guides now pin the tested Round 16 source revisions.
Their setup/API checks are recorded separately in the native repository receipts;
the browser matrix passed all 16 source-boundary cases. These source builds do
not publish registry packages, update approved schema pins or imply support for
subsequently published contracts. Merge the native repository PRs before this
website PR. The separate human website merge publishes through Pages.

The final strict production build, generated-reference check and offline
29-page/23-route site check passed. Independent source review of the corrective
code and four guide revisions found no further actionable issue. These bounded
checks do not turn the earlier incomplete broad browser run into a pass.
