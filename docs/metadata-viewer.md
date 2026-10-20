# Metadata viewer: first slice of website #23

`/metadata-viewer/` is a standalone, indexable page linked in navigation. It is
independent of PR #27: no blocked builder changes or schema validator are copied
into this branch. Keep both sitemap allow-lists and offline deploy fixtures in
step with this permalink.

## Supported adapter and limits

This draft implements a bounded JSON metadata adapter using the browser's
standard JSON.parse. It does not parse sequence/header containers or implement
another FAIR BioHeaders validator. The public page clearly distinguishes JSON
parsing, identity recognition, schema validity and file/parent verification.
All schema/verification states remain not checked. A known URI/version pair is
only identity recognition, never validation. Unknown versions display as
unsupported, without schema fetching or fallback. FHT is not enabled.

The input is one JSON metadata object, at most 256 KiB, 3,000 values and 12 levels
of nesting. The size is checked before reading a file. Reject non-finite values
and integers outside JavaScript's safe range rather than displaying a changed
number. Standard JSON.parse semantics apply, including last-key-wins for duplicate
names; duplicate-key/conformance checks await the reviewed reader. This page
must never be described as a validator or canonicalizer. The expandable JSON is
the parsed record, not a byte-preserving copy of the original file.

Without a schema property, report no header identity instead of manufacturing
metadata. A malformed document, unsupported identity, unreadable file and failed
example request have distinct actionable states. Clear stale output on any
replacement/error. A generation token prevents a pending file read or example
request from overwriting a more recent choice or clear operation. Abort pending
example requests. No persistence, uploads, automatic link resolution or external
requests originate from metadata values. Example buttons fetch only authored,
site-local files after user action.

## Reusable display component

`assets/js/metadata-viewer.js` defines `<fair-bioheaders-metadata>` as a light-DOM
custom element. The page adapter sets its `metadata` property to the bounded
inspection result `{record, type, release, known}`; setting null clears it.
`known` is only identity recognition. The display always labels schema and file
verification as not checked, regardless of that flag. Values are inserted using
textContent, never innerHTML. Paths use JSON Pointer escaping so literal `/` and
`~` in keys remain distinguishable. Array indices and zero/false/null values are
preserved. Empty arrays/objects display explicitly. Scroll regions and source
text remain keyboard accessible. The light DOM inherits the site's themes.

This is a display API draft for review, not a published JavaScript library.
External adapters must apply the same bounds before supplying results. A future
reviewed reader should own format parsing, schema selection/validation and
explicit verification evidence; do not accept caller-provided verified badges.
No JBrowse installation or integration is shipped in this first slice.

## Example provenance

The FHP and FHGFF3 examples come from FAIR-bioHeaders-Specification v0.4.0,
commit `84c2f90ab0e97c81d8afbf33eafe80ebade7a009`, retrieved 2026-10-20:

- `examples/fhp/minimal-database.fhp.json` → `minimal-fhp.json` (unchanged).
- `examples/fhp/rich-database.fhp.json` → `rich-fhp.json` (unchanged).
- `examples/fhgff3/minimal-reference.fhgff3.json` → `minimal-fhgff3.json` (unchanged).
- `examples/fhgff3/rich.fhgff3.yaml` → `rich-fhgff3.json` (parsed with pinned test
  dependency yaml 2.9.1 and formatted as JSON; same metadata values).

The project MPL-2.0 license applies. `minimal-fhr.json`, `no-header.json`,
`unsupported.json`, and `invalid.txt` are synthetic viewer fixtures. None is a
file-backed verification result. Retain the original examples' placeholder
wording; do not present their synthetic sources as real biological assertions.

## Review and follow-up gates

Keep #23 open. This initial draft needs review of the JSON adapter and display
interface, followed by a tested shared JavaScript reader or reviewed adapter
(shared specification #52), container parsing with bounded workers/cancellation,
actual supported-version schema checks, richer reader conformance fixtures, and
a concrete JBrowse embedding example. Verification can only be shown after
actual file/parent checks; it is not implicit in the future reader integration.
The FHP/FHGFF3/FHT microdata contracts are separate from reading ordinary JSON.

Tests: `node --test scripts/test_metadata_viewer.mjs` and
`scripts/browser/metadata-viewer.spec.mjs`, plus the existing production, Python,
site, layout and axe checks. The initial browser checks cover Chromium desktop
and 320px; other engines remain unverified.
