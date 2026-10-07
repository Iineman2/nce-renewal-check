# Feature 1.1 scope questionnaire: strict QC closure

30 September 2026. Policy `nce-scope-v12`, trace schema `scope-claim-review-v3`. Scope is behaviour 1 feature 1.1, all eight principles, plus its already implemented normalized-CSV correction/preflight. Other eligibility subfeatures and financial coverage are not added.

## Expected behavior and corrected gaps

The existing fit/preflight rules remain the classifier. Unknown, approximate and unasked responses remain distinct; unsupported conditions and missing evidence retain precise correction or verification. Every result remains provisional, with `actionAuthorized=false` and `financialVerdict=null`.

1. A questionnaire trace declares its assessed prefix. Full results require all seven canonical input properties; early results require the exact completed prefix. Every original/effective field owns a value property, including legitimate undefined values. Included categorical claims require explicit allowed choices; excluded later responses and inactive dates cannot affect classification. Record input flags, link stage/status and source contributors must agree.
2. One shared ISO-calendar contract serves fit, supplied source dates and trace validation. Assessed exact dates must be real calendar dates; inactive raw responses are preserved without being treated as assessed dates.
3. Supplied field/system/column combinations use exact allowed contracts. Bounded row IDs match the selected identity; CSV-origin effective values match the supplied claim. Scheduled-term presence/value, end-state raw/value/state and economic contributor data must agree. Malformed metadata stops before result DOM changes.
4. Every result-owned edit, continuation, comparison or agreement-preparation action checks current decision identity, date and current questionnaire answers. Old detached controls cannot alter a newer result or focus. Record actions retain their serial/control basis guards.
5. Sync/async event callbacks, startup and freshness checks share a controlled unexpected-error stop that removes previous usable results and record state. Known invalid input keeps its normal specific repair route. Hidden/disabled/removed repair targets stop visibly.
6. CSV rows, columns and cell sizes are rejected incrementally before large intermediate structures accumulate. Quoted newlines, escaped quotes and decoded raw values retain their existing contract. File/read/cancel limits remain bounded.

The four failed audit probes are historical evidence under `../output/scope-questionnaire-audit/`; this report supersedes their open local findings after current-source qualification. Do not rewrite the original failed receipts as passes.

## Quality gates and evidence

The complete expected suite is **113 model tests, 23 isolated browser scripts and 37 JavaScript syntax files**, with full source hygiene and exact source/served-byte/receipt binding. Five new model tests cover omission/coherent corruption, all early prefixes, active/inactive/calendar dates, typed source contributors, an independent 5,184-case questionnaire oracle and maximal 5,000-row/64-column data. The existing independent 9,720-case reconciliation matrix remains a regression gate.

New browser scripts `ui-questionnaire-faults.js` and `ui-questionnaire-transitions.js` exercise corrupt/old traces, controlled Next/refresh/policy failures, detached early/positive/agreement controls, silent answer mutation, unavailable targets, eight same-document cancel/late-read/retry loops, overlapping submits and action-time date rollover. Earlier source, routing, economic, accessibility, mobile and history cases all remain required. Maximal parser timings are diagnostic measurements on the test host, not a universal device SLA.

Run from the repository root with the local `scope-fit` server at port 8765:

```powershell
python output/scope-questionnaire-closure/qc.py capture
python output/scope-questionnaire-closure/qc.py unit
python output/scope-questionnaire-closure/qc.py syntax
python output/scope-questionnaire-closure/qc.py browser
python output/scope-questionnaire-closure/qc.py verify
python output/scope-questionnaire-closure/negative-qc.py
```

Repeated capture uses `--new` and archives the prior run. Verification is read-only. Ten negative evidence checks cover runtime/shared/test/HTML drift, changed or missing receipts, added dependency, edited manifest, missing audit inventory and wrong served bytes. Every one of the original 132 audit IDs must have an evidence-backed closure disposition; missing or duplicate cases fail qualification. These checks detect accidental drift and incomplete declared coverage; they are not a signed attestation against a malicious host or proof every possible future condition is known.

Current-run receipts, final qualification and independent review are in `../output/scope-questionnaire-closure/`. The legacy checker delegates to this current verifier. Earlier principle/feature receipts remain historical and cannot qualify changed source.

## Per-case dispositions and remaining limits

`../output/scope-questionnaire-closure/closure-ledger.json` accounts for all 132 cases: **94 local-regression dispositions, 11 bounded-contract dispositions, 27 external-pending dispositions**. Local-regression indicates representative linked tests and guarded behavior; variants outside tested ordering/platforms are not universal passes. The earlier Principle 8 inventory overlaps this matrix and is not added to it.

Local U scenarios now have targeted fault/lifecycle/inventory tests or a precise support boundary. English UI/fixed normalized token vocabulary, arbitrary low-memory-device performance, hosted cache/rollout behavior, OS/browser retained history and a nonexistent later consumer are explicit bounds. No unsupported capability is inferred from their absence.

External evidence remains necessary for operator comprehension, intended under-one-minute completion, actual screen-reader/browser/locale tasks, correct subscription/responsibility/source facts, live freshness/roles, authoritative clock/cutoff and real-device privacy. Follow `PRINCIPLE_7_EXTERNAL_ACCEPTANCE.md`; no such evidence was supplied. The questionnaire cannot authenticate a self-report or CSV, establish agreement terms, prove source availability or permit a financial action. No provider access, deployment, real-data intake, upload, persistence or external message was added.

## Completion criterion

All supported local gap fixes require current-source full QC, ten negative evidence checks and independent correctness/maintainability review. External and bounded conditions stay explicitly unqualified. The saved final-qualification receipt records the actual result and counts; this document alone is not a passing execution receipt.
