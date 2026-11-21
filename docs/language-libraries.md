# Language library hub and current workflow

`/language-libraries/` provides a human-facing route to Python and the existing
R/Node.js/Java/Julia setup/API guides. Its table distinguishes published Python
installation from the native guides' tested Git source builds. It does not
repin those guides, expand their supported schemas or assert registry releases.
The hub lives under the Tools dropdown and is linked throughout `/guide/`.

The current FHR-only guide recipe replaces the historical fhr0.3.3 walkthrough.
It uses published fair-bioheaders 0.13.1, which emits the fixed shared v0.8.0
FHR citation and string schemaVersion 2.1. Synthetic names/date/sequence are labelled;
no author's real identity is supplied for another user's data. Commands were
executed against the published0.13.1container: metadata,combine,verify,convert,
validate,strip and an exact byte comparison with the original FASTA all passed.
This is an example verification, not a claim to have rerun all toolkit tests.

The public route is included in local/deployed sitemap allowlists and offline
fixtures. Browser checks cover guide-to-hub navigation, all language guide links,
no-JS dropdown access, responsive layout and light/dark accessibility.
The independent FHGM builder and readability PRs are separate changes from the
same base. No site is published until a human merges and Pages deploys it.
