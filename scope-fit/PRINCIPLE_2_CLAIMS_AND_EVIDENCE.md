# Principle 2: A claim is not a verified fact

## Expected behavior

The questionnaire records what the visitor believes about one subscription. A positive questionnaire result says only that the **answers** look in scope. It cannot establish the vendor record, signed agreement, contractual coverage, loss, or safe renewal deadline.

The record preflight reads two user-supplied normalized CSV files. For each material condition, it shows the questionnaire claim beside the derived CSV claim and names the source system, selected row, and column. The CSV is supplied evidence, not an authenticated connection to Pax8 or HaloPSA. Agreement availability and reseller responsibility remain questionnaire claims because these CSVs do not prove them.

When values disagree, the preflight blocks a positive result and asks the user to choose one of two explicit paths per conflict:

1. **Use supplied file value:** classify the case using that value, recording that the user accepted an unauthenticated file claim. This does not establish truth.
2. **Keep questionnaire answer:** require corrected source evidence. This path cannot produce a positive result from the answer alone.

The questionnaire answer is never silently rewritten. An unresolved disagreement prevents a positive preflight result. Changing an answer, file, or subscription ID clears the displayed result and all decisions. A review choice is bound to the selected raw rows, case identity, answers, policy version, and local check date. The pure decision function rejects a choice reused with different selected evidence. An open browser result expires when the local calendar date changes; the user must run the check again.

## Strict quality gates

| Gate | Required outcome |
| --- | --- |
| Claim boundaries | No answer or CSV value is called a verified vendor fact. Positive labels remain provisional. |
| Provenance | Every material claim has a visible origin; a selected CSV row and column are named where applicable. |
| Conflict coverage | Distributor, billing system, commitment, and exact renewal date disagreements each block a positive result by default. |
| Explicit decision | Accepting a file claim is an intentional per-field action; keeping the answer requires updated evidence. Partial resolution stays blocked. |
| Stale state | An edited answer, file, or subscription ID clears browser decisions; a choice for different raw rows, subscription, answers, policy version, or date is rejected. Date change removes an open result and requires rechecking. |
| Unknowns | Unknown or approximate answers do not become false conflicts. Missing or invalid source facts become verification tasks, not invented facts. |
| Safe output | No result asserts contract coverage, a safe action cutoff, savings, or vendor authentication. |
| Malformed and ambiguous records | Missing columns, invalid CSV, duplicate matches or line IDs, overlong cells, invisible identifier characters, and cross-customer links fail explicitly before a positive result. |
| Browser and access | Keyboard operation, focus movement, and automated accessibility checks work on both normal and conflict paths. |
| Data handling | File contents stay in browser memory; rendered values use text content, with no upload or persistence. |

## Edge-case QC coverage

The automated model checks cover all questionnaire choice combinations; source-field contradictions in both directions; multiple and partially resolved conflicts; keeping an answer versus accepting a supplied value; missing or invalid source fields; ambiguous or cross-customer links, including case differences; repeated line IDs; reused choices across cases, raw-cell changes, or dates; calendar boundaries; malformed and oversized CSV cells; and identifier control characters. Browser checks cover the visible conflict workflow, invalidation after edits, an open-tab date change, policy expiry, delayed-file-read cancellation, text rendering of malicious-looking CSV values, no upload or browser persistence in that run, keyboard reachability, mobile width, and automated WCAG A/AA checks of the initial, questionnaire-result, and conflict-result screens.

## Evidence limits that this prototype cannot pass

- The files are user-supplied normalized CSVs. Their origin, age, and transformation from native vendor exports are unverified. Matching values can both be wrong.
- A shared subscription ID and customer reference are a provisional link, not authenticated customer or tenant identity. The active HaloPSA billing state is not proved.
- Signed agreement existence and reseller responsibility remain self-reports. Agreement terms, financial coverage, and action cutoff are outside this scope check.
- The local device clock can be wrong, and the browser may briefly throttle the date-change timer. The result is labeled with its local check date; it is not a trusted deadline.
- Manual screen-reader use with a person, real MSP data, native export mapping, and authenticated vendor readback remain untested.

Passing the local gates does not authorize a production claim that the case facts are verified. Those evidence limits require a later product capability and real-case acceptance tests.
