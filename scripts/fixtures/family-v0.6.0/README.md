# v0.6.0 builder fixtures

Six of these records are unmodified released examples from
`FAIR-bioHeaders/FAIR-bioHeaders-Specification` tag `v0.6.0`
(commit `0ae18b00ee4bd71ab2dc28bae706b0f9d195076b`), retrieved 2026-11-14 from
`https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/v0.6.0/examples/`.
The project MPL-2.0 license applies. Tests keep their original `schema` URLs; no
browser schema is ever substituted for a release the builder does not pin.

| File | Source path at `v0.6.0` | SHA-256 |
| --- | --- | --- |
| `example.fhr.json` | `examples/example.fhr.json` | `fbbba44a15e12cbb1371beebefc666bb6fb58f4977799d4a2e11af2784a8e6e9` |
| `extension-fields.fhr.yaml` | `examples/extension-fields.fhr.yaml` | `6df15a7b7b66c264ccacf96c8088935904e4e40c97aaa5ebff643ed21345b6f6` |
| `rich-database.fhp.json` | `examples/fhp/rich-database.fhp.json` | `71e4d798bf4ffd45519b4a56a86181b161eae95d73a9d6a9ce1e2d6ae943d3d8` |
| `rich-mixed.fhp.yaml` | `examples/fhp/rich-mixed.fhp.yaml` | `cefe56807eb25d7c41101d5d3f9f67c847a3ab8ffdd623e8202ea6f74ee19b31` |
| `minimal-reference.fhgff3.json` | `examples/fhgff3/minimal-reference.fhgff3.json` | `01fc3332c3dd070062c36a82d0498fea6dd1ae1283e8e90403086eaf19c7aa9d` |
| `rich.fhgff3.yaml` | `examples/fhgff3/rich.fhgff3.yaml` | `f25682136de1485e1f12f22010612647dcf47681b018cf5347ea9f52ef7a90bf` |

`dotted-lineage.fhp.yaml` (SHA-256
`84932fca7807656107ec7682352ae1bc14636707d770647e5838ad2401e9743e`) is **not** a
released example. No released v0.6.0 record states a dotted BUSCO dataset
version — the released records use `primates_odb10 — so this one is
site-authored to cover the `1.2` pattern. Its dataset name `diptera_odb12.2` and
its count shape follow the released conformance vector
`conformance/valid/fhp-fasta-busco-lineage-dotted.fhp.fasta` at the same tag
(SHA-256 `c913b45d088acbfbe02a3b8393432e0f83d032b88c540a82ed12d7011bcf26ec`); its
`checksum` is the 44-character structural placeholder used across these
fixtures, not a digest of any file.

Every file above, including the site-authored one, was validated with the
released runtime rather than only with this repository's browser validator:
`fair-bioheaders` 0.11.0 (PyPI) printed `FHR metadata is valid.` /
`FHP metadata is valid.` / `FHGFF3 metadata is valid.` for each of them on
2026-11-14. That is a structural statement about the records; it says nothing
about sequences, BUSCO runs or annotation files.
