# Standalone scope fit check

The current prototype starts directly with Pax8 and HaloPSA file selection and case discovery. The user removed the opening questionnaire on 4 October 2026. Its reusable decision models and historical principle specifications remain in this repository, but their five-question browser flow is superseded. Omitted questionnaire facts remain unestablished; source records may inform term, date, distributor and billing, while reseller responsibility remains unresolved. The inspection display explicitly says no answer was collected, rather than presenting app defaults as user responses.

CSV files are read locally; the app makes no upload request, persists no answers, charges no money, and does not decide contractual coverage. The **File guide** is a separate minimal glossary with example downloads; the full capability declaration and enforced limits remain in `file-support.mjs`. This is **not native vendor-export support**. The main screen contains labels and controls without explanatory body text or subtitles. Optional next-term and signed-order availability are compact input selects. **Evidence** opens a separate information view for result descriptions and provenance; decision controls remain on the check screen. Selecting Pax8 starts discovery automatically, but a case is chosen explicitly. There are no introductory or informational expanders on the control page. Guide navigation cancels work and revokes case/comparison authority while retaining selected native files and independent original-byte custody.

## Run

From the repository root:

```powershell
node --test scope-fit/*.test.mjs
python -m http.server 8765 --directory scope-fit
```

Open `http://localhost:8765` for file selection and record checking. Synthetic example CSVs are in `fixtures/`. The page uses the visitor's local calendar date for the 60-day check; the decision function receives `today` explicitly so automated tests are deterministic.

## Strict quality gates for principle 1

1. **Explicit conditions:** The versioned policy evaluates reseller relationship, Pax8 purchase, HaloPSA billing, annual seat-based Microsoft 365 NCE commitment, and renewal within 0–60 days. No company-size or spend proxy can substitute for these facts.
2. **Deterministic classification:** All supported answers produce `looks-in-scope` only. Any known unsupported answer produces `outside-this-release` with a named reason. Unknown or approximate answers without a contradiction produce `may-fit-verify` with a precise task.
3. **Case identity:** A record result requires exactly one selected Pax8 subscription ID, exactly one HaloPSA line linked to that ID, and matching customer references. Duplicates and cross-customer links block a fit result.
4. **Claim reconciliation:** Uploaded fields challenge self-report. Conflicts require an explicit choice and remain provisional because files are not authenticated against the vendors.
5. **Evidence boundary:** The UI never claims contract coverage, a safe deadline, or savings. An unavailable signed agreement remains a verification task.
6. **Time integrity:** Yesterday and day 61 are outside the initial window; day 60 is inside. A renewal today routes to exact cutoff/time-zone verification even before file preflight. End-of-term state must be observed as `renew` for the record facts to look in scope.
7. **Recoverability and flow:** File selection and case discovery are the starting point. Missing files and identity produce actionable repair feedback. Changing files, inputs or case revokes derived authority. Returning from the guide retains files but requires a fresh check and confirmation. Removed questions cannot silently supply positive evidence.
8. **Accessible interaction:** Controls have labels and radio groups have legends; results and step errors receive focus or live announcements. Keyboard-only, mobile, and screen-reader review are separate gates.
9. **Policy governance:** Rule version, review deadline, owner, evidence hierarchy, and review triggers are in `POLICY.md`. After the deadline, the rule engine fails closed with `policy-review-required`.
10. **Data restraint:** No sign-up, payment, persistent storage, or network upload. Files are read locally and rejected above two megabytes. Real contracts are not accepted.

This is an implementation slice, not a validated product. Native Pax8/HaloPSA export mapping, authenticated source verification, privacy controls for real contracts, financial calculations, and actual action deadlines remain separate work.

## Verification on 29 September 2026

- `node --test scope-fit/*.test.mjs`: 39 tests passed, zero failed, including all 2,268 categorical/date-boundary combinations and source-row mismatch cases.
- `node --check` passed for the three production JavaScript modules and browser smoke script.
- `playwright-cli run-code --filename scope-fit/ui-smoke.js`: passed the progressive form, all three provisional results, synthetic CSV preflight, clear/reset, and a keyboard navigation path.
- `@axe-core/cli` on the initial page: zero automated violations. This does not substitute for manual screen-reader testing of every step and result.
- At a 375-pixel viewport, document width was 375 pixels and visual review found no horizontal overflow. Browser console reported zero errors and zero warnings.

The browser review used synthetic answers and normalized CSV fixtures. No real MSP exports, agreements, payment flow, external vendor authentication, screen-reader user session, or customer demand were tested. Those gates cannot be claimed as passed from this repository alone.

## Principle 2 verification on 29 September 2026

`PRINCIPLE_2_CLAIMS_AND_EVIDENCE.md` defines the expected behavior and gates. The decision model now exposes per-field provenance, blocks unresolved CSV/questionnaire conflicts, accepts a deliberate per-field choice, and rejects stale resolutions. Changing answers, either file, or the subscription ID clears browser decisions. A positive preflight label says only that supplied records look in scope provisionally.

The current automated suite covers conflicts in every material source field, partial review, both resolution paths, stale decision rejection across cases and raw evidence, unknown claims, ambiguous records, and source contradictions. The browser smoke covers conflict review, multiple conflicts, acceptance, evidence-request path, file-change invalidation, safe text rendering, keyboard progression, and confirms no upload request or browser persistence in that run. `ui-freshness.js` checks open-tab date invalidation and policy expiry; `ui-race.js` checks that a delayed file read cannot restore a cleared result. A separate axe WCAG A/AA script reports zero violations on the initial, questionnaire-result, and desktop/mobile conflict-result screens and checks conflict focus and keyboard reachability. These tests use synthetic normalized CSVs. Manual screen-reader review, external source authenticity, real contract clauses, and actual customer outcome remain unverified. The detailed gate and limit ledger is in `PRINCIPLE_2_CLAIMS_AND_EVIDENCE.md`.

## Principle 3 verification on 29 September 2026

`PRINCIPLE_3_UNKNOWN_NOT_FALSE.md` defines the three-state behavior and strict gates. The model preserves a known unsupported questionnaire answer when a CSV cell is blank or marked unknown. It recognizes documented unknown tokens instead of mapping them to `other`, and a known wrong part of a compound commitment remains unsupported even when another part is missing. A supplied value that informs an unknown answer is shown separately in the UI and remains unauthenticated. The `ui-unknown.js` browser script checks those routes end to end.

Final local check: `node --test scope-fit/*.test.mjs` passed **57 tests, zero failures**, including all 2,268 questionnaire combinations, 27 questionnaire/file state pairings, and 81 commitment-component combinations. `node --check` passed on eight JavaScript files. All five browser QC scripts passed: `ui-smoke.js`, `ui-unknown.js`, `ui-freshness.js`, `ui-race.js`, and `ui-a11y.js`. Automated WCAG A/AA scans reported zero violations on the tested initial, questionnaire, conflict, and unknown-result screens. A separate whitespace check passed on all ten files changed for principle 3. These are local synthetic-data results; the external evidence limits in the principle specs remain open.

## Principle 4: Error costs differ

`PRINCIPLE_4_ERROR_COSTS.md` defines the expected behavior and strict gates. The fit check separates a record-link problem from a known unsupported case, requires explicit confirmation of an apparent match before conflict choices or a provisional result, gives a specific repair step, and never authorizes financial action or states a coverage verdict. Expired policy now takes precedence even when the supplied files or IDs are unusable. Unrecognized source labels request verification rather than a false outside-scope verdict. `ui-error-cost.js` and `ui-policy-priority.js` exercise these paths in the browser. The verification results and remaining limits for this principle are recorded in that spec.

## Principle 5: Minimum decision-relevant effort

`PRINCIPLE_5_MINIMUM_EFFORT.md` defines the behavior and gates. The initial questionnaire asks at most five scope questions. A known unsupported answer among the first four returns a reversible result immediately; the visitor can directly edit a named blocker or voluntarily finish the remaining questions. Unasked answers remain explicitly unasked. An expired policy blocks before the first question. Agreement availability is optional during record-fact comparison and remains a verification task if unanswered. Editing answers preserves selected files while clearing stale decisions. `ui-minimum-effort.js` and `ui-minimum-recovery.js` exercise short, continued, and repair paths. The measured time and comprehension gates still require users.

At the principle 5 checkpoint, 68 unit tests, 14 JavaScript syntax checks, and nine isolated browser scripts passed. Automated A/AA scans found zero violations on the tested states. These checks used synthetic data and did not establish completion time, comprehension, or production accuracy.

## Principle 6: Precise economic language

`PRINCIPLE_6_PRECISE_ECONOMIC_LANGUAGE.md` defines the expected behavior and strict gates. The fourth question separates the current Pax8 commitment from invoice frequency, HaloPSA customer charges, and the customer's signed agreement. At record comparison, the user reports the term that will apply at the next renewal. Optional normalized CSV fields for billing frequency, scheduled terms, and term dates can trigger a verification result when they conflict or describe a shortened term. The focused unit tests, `ui-precise-language.js`, and `ui-economic-edge.js` check those paths; the full regression results are recorded in the principle 6 spec.

## Principle 7: Every result needs a next action

`PRINCIPLE_7_NEXT_ACTION.md` defines the behavior, strict gates, tests, and remaining evidence limits. Each questionnaire and record result now has a structured next action tied to the first blocking or uncertain fact, a named original source, and a correction or verification route. The page provides direct controls for editing a question, moving to record comparison, repairing inputs, and reviewing the first unresolved conflict. A provisional positive result explicitly stops at this prototype's boundary. `next-action.test.mjs` and `ui-next-action.js` cover the new routes.

The principle 7 checkpoint and per-case evidence are recorded in `PRINCIPLE_7_QC_CLOSURE.md`. The previous 76-test/11-script count was stale. Policy v9 uses typed source/target routing, cause-specific repair controls, consistent agreement/reset dependencies, and bounded read/cancel/technical recovery. `output/principle-7-audit/run-browser-qc.ps1` runs each browser script in a fresh session and rejects CLI error blocks even when the CLI exit code is zero. These are synthetic-data checks; real-user comprehension and native export accuracy are not established.

## Principle 8: Source of truth follows

`PRINCIPLE_8_SOURCE_OF_TRUTH.md` defines the expected behavior and twelve strict gates. Policy v10 carries immutable original claims and shows their supplied source, deliberate review choice and exact effective scope input in a collapsible trail on each result. Unknown and approximate responses can be informed by supplied evidence without rewriting the questionnaire; accepting a file records a choice, keeping an answer requires corrected evidence, and economic inconsistencies remain uncertain. Link confirmation stays self-attestation. Inactive dates, unresolved dates and unrecognized end states have distinct states.

The original validation checkpoint and external limits are recorded in `PRINCIPLE_8_QC_CLOSURE.md`; actual receipts are in `../output/principle-8-qc/`. The later `PRINCIPLE_8_FAILURE_AUDIT.md` records 128 failure conditions and six new open gap families; the prior passing suite does not close those findings. Run `output/principle-8-qc/run-browser-qc.ps1` from the repository root after starting the local server. The three `ui-source-*.js` scripts cover corrections, unchanged controls, lifecycle invalidation, expanded accessibility and safe text rendering. Earlier checkpoints above are historical. Native exports, source authenticity/freshness and human acceptance remain pending.

Current strict local closure: see `PRINCIPLE_8_QC_FINAL.md` and the 128-row closure ledger. Policy v11 replaces the six reproduced local gaps with canonical inputs, raw evidence binding, mandatory canonical trace rendering and source-bound read-only QC. Use the new closure verifier; all historical checkpoint counts and receipts remain historical. External and bounded delivery/sharing acceptance remains separate.

Latest feature 1.1 strict closure: `SCOPE_QUESTIONNAIRE_QC_FINAL.md`, policy v12/schema v3. Use `output/scope-questionnaire-closure/qc.py`; earlier principle-specific current/checkpoint wording refers to historical results. The feature-wide 132-case ledger preserves external and supported-contract boundaries.

Feature 1.2 Principle 4: see ONE_CASE_PRINCIPLE_4.md. Unique complete evidence is a candidate until explicit source or joint case/link attestation. Missing account/customer/renewal identity and duplicate rows block progression while retaining inspectable evidence. ONE_CASE_PRINCIPLE_4_CLOSURE.md and output/one-case-principle-4-closure record historical qualification; current full-feature acceptance is defined below.

Feature 1.2 Principle 5: ONE_CASE_PRINCIPLE_5.md defines source-only recognizable discovery and canonical handoff. ONE_CASE_PRINCIPLE_5_CLOSURE.md defines the expanded freshness, native-date and exact QC oracle contracts. output/one-case-principle-5-closure records historical acceptance. Its334-condition ledger distinguishes executable local conditions, support boundaries and external acceptance; current full-feature qualification does not promote representative coverage into exact executions.

## Feature 1.2 Principle 6 - evidence-bound confirmation

See `ONE_CASE_PRINCIPLE_6.md` for the behavior contract and `../output/one-case-principle-6/FINAL_QC.md` for its historical checkpoint. Private source receipts are irreversibly revoked by the existing lifecycle owner; exact decoded source/selector and current UI evidence are checked before authority is used. Native authenticity and human acceptance remain separate.

## Historical Feature 1.2 acceptance owner

`ONE_CASE_FEATURE_QC.md` defines the full eight-principle local contract. `../output/one-case-feature-closure/` is the unchanged historical pack for its captured source; its source-qualified verifier correctly rejects subsequent source changes. It preserved 246 proof leaves and 9 indices and owned exact all-test/all-script assertions and the 2294-row audit disposition ledger. Native provider formats/authenticity, real-user/assistive-device acceptance and universal performance remain pending.

## Historical Feature 1.3 principle 1 acceptance owner

`FILE_COMPATIBILITY_PRINCIPLE_1.md` defines explicit qualified support. Its sealed closure pack preserves its original source-bound evidence. Subsequent source changes require the current owner below.

## Historical Feature 1.3 principle 2 acceptance owner

`FILE_COMPATIBILITY_PRINCIPLE_2.md` defines exact original custody, recovery and positional provenance. `file-evidence.mjs` owns private copied bytes and live role-bound handles; `csv-evidence.mjs` is the sole lexical scanner. Runtime admission and existing case authority remain their established owners. `file-evidence-view.mjs` renders bounded original disclosures and inert binary recovery. Its captured policy/reader versions were file-support-v3/normalized-csv-v3; enabled profiles remain normalized-pax8-v1/normalized-halo-v1.

The preserved `../output/file-compatibility-principle-2-closure/REPORT.md` records acceptance of its own captured source; its source-bound verifier rejects later source changes as intended. The closure adds canonical interpretation checks, independent UTF8 validity, practical screen visibility checks and owned Save/paging dispatch. Gates retain all previous model/browser semantics and add40 models,79 browser groups and25 exact downloads, a300-condition disposition ledger, passing-baseline proof negatives and preservation of711 historical proof/audit paths plus160 archived prior source identities. OCR, new formats, vendor authenticity, manual assistive-device acceptance, native OS write certification and principle3 device/memory/preemption qualification remain outside this implementation.

## Feature1.3 principle3 candidate and qualification owner

`FILE_COMPATIBILITY_PRINCIPLE_3.md` defines the exact resource/cancellation behavior. Current policy/reader are file-support-v4/normalized-csv-v4, resource-csv-v3. Completion transport contains `scan:null`, bounded text and transferred original bytes; the receiver reconstructs fresh immutable lexical evidence with the same yielding lexer. A separate privately issued and bounded File.text observation is compared against byte-owned decoding through finite steps; an actual disagreement keeps the original inspectable and blocks normalized progression. Observed text never supplies CSV facts or case authority. Native module Workers own acquisition, hashing, decoding, scanning and profile checks. `bounded-reader.mjs` owns two-job/four-million-input-byte admission, monotonic deadlines, termination, private packet issuance and two current-source cache entries. There is no synchronous browser acquisition fallback. Finite envelope validation, fresh lexical reconstruction, observation comparison and row preparation yield on the main thread; the full lexical object graph never crosses the native Worker message boundary. Exact original custody and case/financial authority retain their existing owners.

Development status is recorded in `../output/file-compatibility-principle-3/REPORT.md`. Final source qualification and a source-bound verifier remain pending; the development receipts are not a final acceptance pack. Historical packs remain frozen. Current checks exercise finite local normalized CSV, reference responsiveness and native Worker cancellation; they do not establish peak resident memory, physical erasure, cancelability of browser-platform WebCrypto already in progress, suspended scheduling, other devices, future document readers or production/provider/human acceptance. Canceled verification stays accounted until cleanup and cannot publish evidence.

Feature 1.3 Principle 5 closure: `file-handling-policy.mjs` is the sole canonical `local-selection-v2` declaration. Observed File mismatch permanently retires that occurrence; unchanged picker dismissal retains it without starting work. Detected local date changes require reselection. Independent reset cleanup tolerates the documented persistent presentation faults. Failed recovery URL retirement is tracked and quarantined. Current qualification is under `../output/file-compatibility-principle-5-closure/REPORT.md`; historical P5 evidence is unchanged.
