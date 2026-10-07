# Feature 1.2 Principle 1: one explicit subject

## Expected behavior

Every record check concerns one explicitly displayed customer subscription renewal. A unique Pax8 row selected by the existing exact-ID control establishes the supplied subject. Customer reference and calendar renewal date are displayed only when usable; unresolved fields remain explicit. Questionnaire answers cannot fill missing source identity. Selection does not confirm eligibility, account ownership, billing linkage, signed coverage or authority to act.

The current-case region has one state: no source-selected case, unresolved selection with no unique row, or one selected source row with any unresolved customer/date fields. It shows the source filename and logical data record number (not physical CSV line), product and commitment term, plus inspectable original raw values. The normalized format has no source-account identity; the interface states this limitation.

## Lifecycle and scope

The subject appears after a successful current Pax8 read, before HaloPSA processing. Missing, malformed or unmatched HaloPSA data cannot substitute another subject. Changes to either file, subscription ID, questionnaire or record answers, clear, cancellation, history restoration and date changes invalidate the subject with the dependent review. Delayed or superseded reads cannot resurrect a subject. Silent changed controls are checked at action/read boundaries and focus/periodic freshness checks; arbitrary script mutation is not a continuously authenticated environment.

This principle reuses the existing normalized CSV parser, identifier and calendar contracts. Exact-ID entry remains the sole selection control. Customer search, native-source/account identity, richer ambiguity resolution and explicit selection confirmation belong to later Feature 1.2 principles. Scope rules and downstream record-link decisions retain their existing owners.

## Strict gates

- Six new model tests: unique multi-row isolation, zero/duplicate matches, unsupported IDs, unresolved customer/date and leap calendar, immutable raw literal facts, malformed and maximal 5,000-row files.
- One new isolated browser script: exact subject, changing subscription/customer, independent HaloPSA failure, literal unsafe-looking text, unknown/duplicate states, cancelled late reads and silent mutation, with zero uncaught page errors.
- Full existing model, browser, accessibility, lifecycle, date/policy, source-projection and concurrency regressions remain required.
- Source-bound model/syntax/browser receipts, served-byte verification, source hygiene and ten negative evidence checks. Independent PRE/POST correctness and maintainability review; current result is recorded under output/one-case-principle-1.

Run the new qc.py in output/one-case-principle-1 with capture, unit, syntax, browser and verify; run its negative-qc.py afterward. Capture --new archives previous executions. Historical feature1.1 qualifications do not qualify changed source. This new run includes those regressions while retaining the existing 132-case questionnaire inventory.

## Evidence limits

Local synthetic acceptance does not establish authentic vendor/customer identity, comprehension, real-export suitability or hosted/device-wide acceptance. Source filename and logical row number locate evidence within this local read, not a global case identifier. The feature is session-local, with no upload, provider write or persistence. Receipt metadata records actual execution counts and final independent review; this document alone is not a passing test receipt.
