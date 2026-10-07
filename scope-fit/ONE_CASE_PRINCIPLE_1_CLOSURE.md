# Feature 1.2 Principle 1 expanded QC closure

## Expected behavior and fixes

One current source-selected subject identifies the supplied Pax8 customer, subscription and renewal, preserving unresolved fields. Before rendering, the subject projection must match a privately owned canonical projection from the captured Pax8 text and exact selected ID. Validation checks complete status, reason, identity, raw values, product/term, source/record position and unauthenticated boundary; missing, extra, exotic or inconsistent fields stop without a subject or link confirmation. The renderer uses the independently returned frozen canonical data.

Calendar invalidation now precedes generic changed-control recovery. The first event across midnight clears the subject and shows date-specific recovery; crossing policy expiry immediately renders the policy block. The same date precedence applies on failed asynchronous reads. Native resets of both questionnaire and record forms clear the subject and dependent state. Missing or duplicate current-case regions clear safely and prevent checking records.

Expanded DOM fault tests also exposed a delayed native change event after programmatic submission: focusing a newly rendered error could clear it despite unchanged captured inputs. Record-form change events now retain a current subject/error only when the complete captured basis is unchanged; actual changed inputs still invalidate. Failed reads bind their current captured controls before rendering recovery. Programmatic submission plus error focus is a regression gate.

The questionnaire reset microtask also reapplies policy review after native controls reset. Resetting an expired case cannot remove the policy block until a later timer; this has a first-reset-event browser regression.

Current valid Pax8 selection can remain visible if HaloPSA is missing, malformed, unreadable or timed out. It never establishes linkage or eligibility. Cancellation, reset, source replacement and superseded reads remove the old subject. Inputs changed silently are checked at read/action, focus and periodic freshness boundaries; the local page does not continuously authenticate hostile script changes.

## Regression and source-bound gates

Eight added model tests cover complete projection corruption, unresolved promotion, accessor/exotic/cyclic input, same-ID source replacement/reordering, identifier normalization, multiline logical record provenance and maximal combined 5,000-row/64-column input. They supplement the original six subject tests and all questionnaire/preflight regressions.

The expanded browser script checks both native resets, clear, same-name replacement, each read-stage cancellation/rejection/timeout and late completion, silent mutation during failed reads, history restoration, exactly one date/policy event, missing/duplicate regions and eight injected inconsistent projection variants. Page errors must be zero. Timeouts are accelerated in the isolated browser fixture; this proves timeout ordering, not a host timing SLA. Existing race, overlapping-submit, detached-control, source/accessibility and mobile suites remain mandatory.

Current final receipts belong to output/one-case-principle-1-closure. Run qc.py capture, unit, syntax, browser and verify, then negative-qc.py. Capture --new archives prior candidate executions. The verifier binds all source dependencies, served bytes and model/browser receipts; it checks both the 132-case questionnaire inventory and all 102 subject-audit IDs. Eleven negative checks include missing subject inventory. Original failed probes in output/one-case-principle-1-audit remain unchanged.

## Coverage dispositions and support limits

All 102 entries have a closure disposition: 64 local-regression, 28 bounded-contract and 10 external-or-human-pending. Local regression means representative supported behavior plus targeted new gates, not every possible device/order variant. No local open finding remains once final current-source qualification and independent review pass. Bounds and external conditions are not qualified passes.

The source-account identity and authenticity of a normalized file cannot be established. Case-sensitive/trim-normalized identifiers are the supported prototype contract; a syntactically valid reference such as unknown is not automatically an authenticated ID or an invalid ID. Account-wide identity, native export mapping, customer search and later consumers belong to later principles/features. The source filename and logical record position are local evidence locators.

The hardened flow parses Pax8 three times: initial subject projection, independent canonical validation and existing comparison. All reuse the same parser and identity/calendar rules, within 2MB/5,000-row/64-column bounds. Maximal combined model fixtures are checked; a low-memory-device responsiveness SLA, cancellation during synchronous parsing and universal browser performance remain unqualified. No duplicate classifier or alternate dominant selection path was introduced.

Real-operator comprehension, actual screen-reader tasks, real exports/account identity, hosted cache rollout, wrong system clock, arbitrary extensions/OS faults and secure erasure of browser/OS copies require external evidence or remain explicit support boundaries. No provider writes, upload or persistence were added. Ordinary application reset clears application state, not every platform copy.

## Completion evidence

The final-qualification.json and independent-review-receipt.json record actual frozen-run counts and review results. This document specifies the gates and limits; it is not itself a passing execution receipt. Earlier feature/principle qualifications remain historical after source changes.
