# Principle 8 local QC closure

30 September 2026. Policy `nce-scope-v10`. **Original bounded checkpoint: local implementation gates passed. External and human acceptance gates remained pending.**

Later deep audit: `PRINCIPLE_8_FAILURE_AUDIT.md` records 128 failure conditions and six newly reproduced gap families. The original receipts below remain historical evidence for their tested cases; they do not close the new audit findings. Full strict acceptance is now open pending those fixes and additional negative/interaction coverage.

## Implemented behavior

Each valid questionnaire or parsed-record result has an optional, keyboard-operable claim trail. It carries immutable original responses, supplied CSV values and raw source cells, deliberate conflict choices, effective inputs and reasons. Record-stage agreement availability and next-term responses remain self-report. Known files can inform unknown/approximate answers without rewriting the original controls. Keeping an answer cannot clear contradictory evidence. Economic context can override an accepted commitment to unknown. Missing identity has an unavailable trail; invalid or unconfirmed links have a comparison-only trail.

Classification stays in the existing rules and reconciliation branches. The projection retains the exact scope-input snapshot, marks inactive dates not assessed, distinguishes conflict-cleared dates from unasked dates, and receives end-state semantics from the existing end-state branch. A link confirmation or accepted file never authenticates a source. Malformed inputs or technical failures do not produce a source comparison. Obsolete trails and review choices are removed before edits or new reads; cancelled late reads cannot restore them.

## Strict gate ledger

| Gate | Result and evidence |
| --- | --- |
| Single owner | Pass: values and origins captured inside existing merge branches; existing fit rules classify. Independent PRE/POST review found no parallel classifier. |
| Exact questionnaire carry | Pass: 1,296 categorical combinations; early-exit prefix exclusion; policy-blocked inputs; unknown/approximate/unasked distinctions. `source-following.test.mjs`. |
| Exact effective inputs/contributors | Pass: scope input, field values and rule status agree; identity/link, next term, end state and economic context are carried separately. Source snapshot retains exact raw provenance. |
| Every reconciliation branch | Pass: 39 distributor/billing/commitment source-response-choice cases, 14 renewal-date cases, economic override after accepted commitment, and inactive retained date cases. Earlier commitment-component and date-boundary regressions also pass. |
| No trust escalation | Pass: every trace/field denies authentication and authority. 420 reseller/agreement/next-term/end-state combinations retain the proper origin; unknown and unrecognized states remain distinct. |
| Identity before reliance | Pass: absent/duplicate identity, missing Halo match, customer mismatch and pending confirmation remain blocked or comparison-only. No conflict controls before usable link confirmation. |
| Immutable originals | Pass: detached recursively frozen snapshots, caller mutation isolation, no input mutation; browser original controls unchanged after informed, accepted, kept, date or guarded values. |
| Freshness/invalidation | Pass: both files, ID, agreement, next term, answer edit, clear, new read, cancellation/late completion, date, policy, history and reload clear obsolete trail DOM/choices. Raw-cell changes reject bound review choices. |
| Accessible safe output | Pass in tested states: expanded questionnaire, pending-link and economic trails have zero axe WCAG A/AA violations; Enter/Space, primary action focus, literal hostile HTML and 320px/200% reflow pass. Screenshot: `../output/playwright/principle-8-commitment-mobile.png`. Human screen-reader acceptance remains pending. |
| Data restraint | Pass: existing no-upload/no-persistence smoke remains passing. No integrations, accounts, contract intake, export, storage or financial actions added. |
| Regression/source hygiene | Pass: **101 unit tests**, **19 isolated browser scripts**, **30 JavaScript syntax checks**, and explicit whitespace/source manifest checks. Receipts below. |
| Independent review | Pass: PRE architecture and POST source/model review. POST found two semantic-state defects; both corrected with independent tests. Final browser/evidence review recorded separately. |

The numbers count defined automated scenarios, not every possible real-world case. These are synthetic normalized CSVs and local browser checks. They do not establish native export compatibility, financial coverage, vendor authenticity or customer understanding.

## Evidence and reproducibility

- Expected behavior: `PRINCIPLE_8_SOURCE_OF_TRUTH.md`.
- Model receipt: `../output/principle-8-qc/final-unit.txt`.
- Browser receipt index: `../output/principle-8-qc/final-browser/summary.json`; individual script receipts are in the same directory.
- Syntax and whitespace: `../output/principle-8-qc/final-syntax.txt`, `final-whitespace.txt`; current source hashes in `source-manifest.json`.
- Gate status: `../output/principle-8-qc/gate-ledger.json`; independent review: `independent-review.txt`.
- From the repository root, start `python -m http.server 8765 --directory scope-fit`, run `node --test scope-fit/*.test.mjs`, then `& output/principle-8-qc/run-browser-qc.ps1`. The runner uses fresh sessions and rejects CLI error blocks even when the CLI returns exit code zero.

During regression, added disclosures exposed ambiguous generic summary selectors; tests now identify the intended evidence-help summary. Duplicating economic issue prose inside the trail also caused ambiguous assertions and unnecessary repeated copy; the final trail shows raw source context and points to the visible verification issues. The failed duplicate-copy receipt and selector recovery are retained in the QC directory. No material local finding remains open.

## External pending gates

Native Pax8/HaloPSA export mapping, authenticated current source/role/freshness checks, actual recurring billing state, signed agreement clauses, authoritative cutoff/time-zone evidence, MSP comprehension and human screen-reader/platform acceptance are not established. Use `PRINCIPLE_7_EXTERNAL_ACCEPTANCE.md` for the finite acceptance protocol. There are no real exports in this workspace and no external vendor/account evidence in this run. The prototype still stops before financial decisions or actions.

The later six local gap families are addressed by policy v11; current qualification requires `PRINCIPLE_8_QC_FINAL.md` and the source-bound closure receipts. This v10 report and its receipts remain a historical checkpoint.
