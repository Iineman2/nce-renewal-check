# One explicit case implementation plan

**Intent:** Implement Feature 1.2 Principle 1: every check has one explicit subject.
**Current Behavior:** Exact subscription ID selects a Pax8 row, but the subject is shown only after HaloPSA matching succeeds.
**Expected Outcome:** One current subject card identifies the supplied Pax8 customer, subscription and renewal occurrence; unknown or ambiguous parts are explicit. No questionnaire answer substitutes for source identity.
**Target-Perspective Output:** A persistent current-subject region with exactly one state: no selection, unresolved selection, or one source-selected subject. It precedes the comparison result.
**Truth Owner:** Parsed Pax8 rows and current captured input controls. Selection is an unauthenticated supplied-record claim.
**Contract Boundary:** Existing normalized local CSV prototype, one page/case; no native export, account identity, search, contract analysis or provider writes.
**Cutover:** Existing exact-ID input remains the sole selection path. Add explicit subject projection before HaloPSA processing; preserve existing linkage decisions.
**Displaced Path:** Demote result-only identity display as the sole indication of the subject; retain it as comparison evidence.
**Value Density:** The intended subject is visible even when billing data is absent or defective.
**Acceptance Evidence:** Model subject projection tests; isolated browser selection/replacement/cancel/error/unknown/ambiguity tests; full existing regression suite; source-bound receipts and negative evidence checks.
**Evidence Lane:** Local synthetic inputs; real-user/native-source acceptance remains pending.
**Kill Criteria:** No second classifier or copied parser, no positive subject from zero/multiple matching rows, no obsolete subject after input change or asynchronous completion.
**Architecture Slice:** preflight.mjs owns selectCaseSubject using existing parser/identifier/calendar rules; app.mjs owns one rendered region and invalidates it with record review; index.html provides accessible region. New model/browser tests and QC report; existing feature1.1 gates remain regression requirements.
**Plan Review Gate:** Requires PRE review before execution and POST correctness/maintainability/evidence review.

## Ordered tasks (main owns implementation; sequential)
1. Add immutable subject projection with unique-row selection, explicit unresolved customer/date, source row position and raw supplied facts. No known renewal occurrence if date invalid; no invented account/customer names. Tests cover duplicates, absent/malformed IDs, missing customer/date, row order, frozen output and multi-row isolation.
2. Add current-subject region and integrate after Pax8 read, before HaloPSA read. Every invalidation removes prior subject, including clear, cancel, input changes, date/history and late reads. Retain the current selected subject on HaloPSA failure only when captured controls remain current. Comparison failure never implies eligibility.
3. Browser evidence and full model/syntax/browser regression gates. Snapshot all scope-fit source plus plan/QC tools; verify receipts and served bytes without rewriting historical feature1.1 qualification.
4. Independent POST review, fix material findings, capture final source and acceptance receipts, report local result with external limits.

Allowed: scope-fit subject projection/UI/tests/spec; docs/goals/one-case-principle-1; output/one-case-principle-1 QC tooling/receipts. Avoid unrelated research and historical audit receipts. Preserve dirty checkout; no deploy, external intake or storage.

## Expanded audit closure

User authorized closure of the 102-entry audit. Preserve original failed probes. Date/policy invalidation takes precedence over generic control invalidation. Validate returned subject against a private canonical source projection before rendering; no second identity classifier. Add model projection-corruption and normalization/resource gates plus browser first-event date, reset, clear, replacement, read-stage cancellation/error, history and inconsistent projection gates. Account for all 102 IDs in a captured closure ledger with honest local/bounded/external dispositions. Update source-bound QC inventory validation and negative missing-case gate. Main implements sequentially; independent PRE and POST source/evidence review required. No provider access, deployed-module authenticity claim or human acceptance inference.
