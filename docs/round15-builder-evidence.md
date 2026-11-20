# Round 15 builder packet — November 19, 2026

> Historical Round 15 evidence. Completed actions and former authorization below
> are dated receipts. Current Round 16 guidance requires human-only PR merges;
> this document grants no agent merge or deployment authority. Current support
> is documented in the README and public contract reference.

Base: website `df11a89`; FHGFF3 binding source `db3f90b`, H1–H8;
released runtime baseline `fair-bioheaders==0.12.0`.
David authorized reviewed experimental binding enablement; this PR does not
record Adam's joint binding adoption or claim FHT/FHGM publication.

FHGFF3 uses its own raw-main itemtype; its cited schema property selects the
fixed local contract. HTML is inert and reports the experimental binding and
unsupported JSON-LD. Existing serialization handles ordered arrays, nested
objects, empty containers, zero/false, absence and escaped text. Extension fields
stay in YAML/readable tables and are explicitly omitted from microdata (M5).

## Immutable example crosswalk

The historical `scripts/fixtures/family-v0.4.0/rich-mixed.fhp.yaml` and
`family-v0.6.0/rich-mixed.fhp.yaml` remain byte-unchanged. Their nested synthetic
parent checksum ends in `D=`, which violates existing R4 unused-bit rules.
Named negative tests now reject those records. New site-authored counterpart
`family-v0.6.0/rich-mixed-canonical.fhp.yaml` and the matching v0.4.0
counterpart change that placeholder's final
payload character to `A`; it is synthetic, not a claim of parent identity or
biological derivation. The round-trip positive corpus uses the new counterpart.
No frozen release schema, example or cited checksum was rewritten.

The browser accepts form values, not YAML/gzip input: R1 gzip and R12 parser
policies have no input path here. Generated YAML quotes all strings and emits
neither document directives nor document-start markers. R4 checks only standard
root/typed-parent checksums; arbitrary extension data remains unconstrained.
V1–V4 controls select old release bytes before validation and refuse unknown
releases; no automatic repin or fallback is added.

## Validation

- Node builder: 70 passed, 0 skipped; citation/viewer: 23 passed, 0 skipped.
- Python regression suite: 136 passed, 0 skipped (includes 11 independent
  builder reconstruction tests over 10 positive records, including the new
  hostile FHGFF3 vector).
- Installed PyPI `fair-bioheaders==0.12.0` in an isolated Python 3.15 venv:
  all 10 records validated as YAML and HTML (20 validations); both formats
  converted to equivalent JSON (20 conversions, HTML excludes M5 extensions).
  Three are FHGFF3, including nested values, zero counts, empty arrays and
  hostile markup/URI-like text. It emits ExperimentalMicrodataWarning as expected.
  This positive interoperability receipt does not claim that the older runtime
  implements the new R4 negative controls; those negatives test the website.
- `schema_fields.py --check`, `mapping_crosswalk.py --check`, reproducible
  `npm run build:js`, `git diff --check`: passed; schemas, frozen fixture bytes,
  mapping snapshot bytes, JS bundle and Ruby lockfile are unchanged.
- Pinned frozen production Jekyll build and browser matrix: pending.

The source FHGM overview now names the reviewed owning 92-case package and
merged Tools #198 experimental source implementation, while explicitly denying
publication and installed 0.12.0 support. No model field inventory or alias is
invented. Final FHT/FHGM released references/forms remain a later deliberate
publication handoff.


## Browser CI follow-up

Initial head `6182642` CI completed 624 browser visits: 616 passed and eight
failed (two stale browser expectations on each of four projects). The FHP
v0.4.0 positive form test now uses an explicit canonical synthetic counterpart,
while the frozen historical fixture remains a negative. The FHGFF3 loading-race
assertion now requires its typed identity and experimental label. These are
new-commit fixes; no published fixture was edited. The focused two-test/four-project rerun passed all eight cases locally with no
skips. Full fresh CI is required, and the updated head needs new independent review.
