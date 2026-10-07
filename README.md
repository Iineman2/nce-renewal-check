# NCE Renewal Check

A browser prototype for inspecting one Microsoft 365 NCE subscription against supplied Pax8 and HaloPSA records. Files are processed locally, with original-byte custody, source provenance, explicit case confirmation, bounded processing, and cancellation.

The current interface starts with file selection and case discovery. The earlier questionnaire models and specifications remain available as development history.

## Run locally

Requires Python 3 and a current browser with JavaScript and module Workers. Node.js 24 or later is required for development checks. There is no application build or dependency installation step.

```sh
git clone https://github.com/Iineman2/nce-renewal-check.git
cd nce-renewal-check
python -m http.server 8765 --bind 127.0.0.1 --directory scope-fit
```

Open **http://127.0.0.1:8765/**. Synthetic example files are available through **File guide**, or in [`scope-fit/fixtures/`](scope-fit/fixtures/). The examples are test data. The check uses the device's local calendar date.

## Supported behavior

- Read normalized UTF-8 Pax8 and HaloPSA CSV profiles.
- Find and explicitly confirm one subscription and its linked billing record.
- Compare supplied record facts and expose conflicts or missing information.
- Inspect original bytes and trace normalized values to their supplied source.
- Enforce file, structure, rendering, concurrency, and processing limits.
- Keep file contents inert and handling permissions tied to the current selection.

Native vendor exports, XLSX, PDF/DOCX agreements, and OCR are currently unsupported. Supplied records do not establish authenticity, freshness, contractual coverage, savings, or authority to renew, cancel, or pay. The exact support declaration lives in [`scope-fit/file-support.mjs`](scope-fit/file-support.mjs).

## Checks and acceptance status

```sh
npm test
npm run check
```

The last recorded Feature 1.3 Principle 5 qualification passed **778 model tests, 632 browser assertion groups, and 31 automated accessibility scans** for its captured source and finite local contract. These are historical receipts, not a claim that every platform or expanded scenario passed.

**Expanded QC is unfinished.** Forty conditions remain explicitly unqualified, including testable fault combinations and delayed effects, as well as native chooser, real BFCache, screen-reader, and wider browser/device behavior. Publication does not close these gaps. See [`docs/QUALITY_STATUS.md`](docs/QUALITY_STATUS.md) and the preserved audit archive.

Browser QC fixtures are `scope-fit/ui-*.js`; they use isolated Playwright sessions. Their source-bound acceptance tools and actual receipts are in the release archive. Node checks alone do not reproduce browser qualification.

## Project map

| Path | Contents |
| --- | --- |
| [`scope-fit/`](scope-fit/) | Application, models, tests, browser QC fixtures, assets, synthetic CSVs, and principle specifications |
| [`NCE_THIN_SLICE_BEHAVIOR_FEATURES.md`](NCE_THIN_SLICE_BEHAVIOR_FEATURES.md) | Behavior and feature matrix |
| [`NCE_FILE_COMPATIBILITY_PREFLIGHT_PRINCIPLES.md`](NCE_FILE_COMPATIBILITY_PREFLIGHT_PRINCIPLES.md) | Foundational file-processing principles |
| [`docs/goals/`](docs/goals/) | Implementation plans, checkpoints, and proof entrypoints |
| [`research/`](research/) | Saved research and product exploration; historical claims and embedded research citation IDs may need fresh verification |
| Root `MVP_*.md` and `NCE_*.md` | Product scope, specifications, and planning history |

## QC archive

The initial [GitHub release](https://github.com/Iineman2/nce-renewal-check/releases/tag/v0.1.0-prototype) includes the complete historical `output/` tree as a compressed archive. It contains source snapshots, scripts, audit ledgers, failed attempts, synthetic inputs, traces, and accepted receipts. The archive manifest records every file's size and SHA-256. Git excludes generated output and local browser sessions, with one unchanged audit ledger tracked at its original path because the model tests require it. A fresh clone can run `npm test` without downloading the archive.

Extract the archive into the repository root to restore `output/` and use historical proof entrypoints. A historical verifier may correctly reject later source or environment changes. Retained failures and development runs must not be counted as passing gates. Machine-specific paths in historical tooling may need an explicit portability adaptation; do not rewrite sealed evidence or pins to make a verifier pass.

## License

Project-authored code and documentation are available under the [MIT License](LICENSE). Bundled third-party assets retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Microsoft, Pax8, and HaloPSA names identify the systems being compared; this project is independent.
