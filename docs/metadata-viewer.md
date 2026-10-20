# JavaScript with FHR JSON and microdata (website #23)

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
of nesting. The size is checked before reading a file. A preflight also caps
the cumulative escaped JSON Pointer paths plus displayed values at 512 Ki
characters, before any expanded paths are allocated. This includes repeated
ancestor names and JSON Pointer escape expansion. Both inspection and the
display enforce the output/complexity budget, including direct component use. Reject non-finite values
nonzero numeric tokens that underflow to zero,
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
custom element. External hosts should wait for registration, then assign JSON
text to its `json` property inside try/catch; an empty string clears it. This
public entry point runs the same inspection bounds and numeric checks as the
page, clears before rejected replacements, and never accepts caller-provided
verification badges. The page adapter internally sets its `metadata` property to the bounded
inspection result `{record, type, release, known}`; setting null clears it.
`known` is only identity recognition. The display always labels schema and file
verification as not checked, regardless of that flag. Values are inserted using
textContent, never innerHTML. Paths use JSON Pointer escaping so literal `/` and
`~` in keys remain distinguishable. Array indices and zero/false/null values are
preserved. Empty arrays/objects display explicitly. Scroll regions and source
text remain keyboard accessible. The light DOM inherits the site's themes.

This is a display API draft for review, not a published JavaScript library.
Prefer the public `json` setter to the internal inspection-result property.
The display itself preflights expanded output even for direct internal use. A future
reviewed reader should own format parsing, schema selection/validation and
explicit verification evidence; do not accept caller-provided verified badges.
The page is a JavaScript teaching guide for ordinary websites.

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

The October 20 maintainer correction defines #23 as a page teaching JavaScript
with FHR JSON and HTML microdata examples. JBrowse integration, sequence-container
parsing and release of a general JavaScript library are outside this ticket's
acceptance criteria. PR #30 supplied useful bounded JSON/display/embedding work,
but omitted the microdata lesson and overemphasized a viewer/library roadmap.

The correction retains /metadata-viewer/ and the existing JSON display API. It
adds runnable JSON query/edit/serialize exercises and a paired authored FHR v0.4.0
microdata template in `_includes/fhr-microdata-example.html`. The initial editor
record is extracted from that template, preventing drift between representations.
`fhr-javascript-example.js` demonstrates direct-child traversal of the existing
FHR typed span/object/array layout; `fhr-javascript-playground.js` runs the page
controls. It is an educational DOM example, not a second production converter:
no arbitrary HTML input, itemref, machine-value attributes or general microdata
support. The schema URL/version and placeholder checksum remain unchanged when
the example changes a genome name. Rendering is text-only and local.

Review the lessons, copied code and paired JSON/microdata behavior for #23.
Actual schema/file/parent checks stay explicitly unchecked. Upstream reader,
conformance and library work remains separately owned and is not a prerequisite
for teaching the adopted FHR representation on this page.

Tests: `node --test scripts/test_metadata_viewer.mjs` and
`scripts/browser/metadata-viewer.spec.mjs` and
`scripts/browser/fhr-javascript.spec.mjs`, plus the existing production, Python,
site, layout and axe checks. The initial browser checks cover Chromium desktop
and 320px; other engines remain unverified.

## Implementation-guide example

The public page is both a live demo and an integration guide.
`_includes/metadata-embed.html` is the single source for the escaped copyable
snippet and `/metadata-viewer/embed/`, a noindex standalone page outside the
site theme. The sample uses only the component JavaScript and optional scoped
`assets/css/metadata-display.css`; no site bundle, framework or service is needed.
Browser tests run both the standalone page and the copied guide snippet on a
separate host document, including the public property, error and clear flows.
Pin copied draft assets in downstream projects; do not claim a versioned
JavaScript package or reader has been released.
