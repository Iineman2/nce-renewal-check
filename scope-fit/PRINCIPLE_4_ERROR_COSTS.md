# Principle 4: Error costs differ

## Expected behavior

This scope check makes a **routing** decision for one renewal. It cannot decide whether the MSP is financially covered, whether a deadline is safe, or whether an action should be taken. A wrong rejection can lose a case that the product could help; a wrong safety signal could mislead a financial decision. The rule therefore preserves a path to repair uncertain cases while never promoting a scope result into an action authorization.

The preflight uses this precedence:

1. **Policy review required:** current rules cannot classify a case after the review date.
2. **Record identity or link needs repair:** missing, duplicate, invalid, or cross-customer IDs block assessment. They do not mean the business case is outside scope.
3. **Matched records need human confirmation:** equal IDs and customer references do not prove a correct link. Ask the user to compare the selected subscription, customer, and recurring line in the original systems. Bind that confirmation to the current selected evidence and date.
4. **Known claims conflict:** resolve each contradiction or obtain corrected evidence before classification.
5. **Supplied information indicates outside this release:** name each known unsupported condition and show how to correct a mistaken answer or file.
6. **More evidence needed:** preserve unknown, approximate, missing, and unrecognized source labels as verification tasks. Only explicit known negatives count as unsupported.
7. **Supplied claims look in scope provisionally:** invite source and agreement review; never imply financial safety.

Every result has a next action. Questionnaire answers remain editable and files can be replaced. The UI does not approve, renew, cancel, pay, dispute, or change any external system. The pure decision API declares `decisionKind: scope-fit-only`, `financialVerdict: null`, and `actionAuthorized: false` on every valid result.

## Strict quality gates

| Gate | Pass condition |
| --- | --- |
| No premature rejection | Missing files, unknown facts, invalid record links, and parsing failures do not become an outside-scope business verdict. |
| Known unsupported facts | A known unsupported answer or supplied value produces a named reason and a correction path. |
| Conflict before classification | An unresolved material contradiction blocks a positive result and takes precedence over other provisional outside-scope claims. |
| Record-link safety | Link problems and missing human confirmation take precedence over conflicts and outside-scope claims; conflict-choice controls are unavailable until the link is repaired and confirmed. A change to selected evidence or date invalidates confirmation. |
| Policy safety | An expired policy takes precedence over classification, bad CSV input, missing IDs, ambiguous links, and stale review input. |
| Financial boundary | No result grants action authority or a financial verdict, including positive, outside, error, and policy-review routes. |
| Reversibility | Changing answers, files, or subscription identity invalidates the old result; the user can rerun the check. |
| Clear next step | Every model result names the next action; the UI displays it. |
| Browser and accessibility | Link, conflict, outside, and positive routes work in the browser; automated A/AA scans and keyboard paths cover the new link state. |
| Data restraint | The local prototype sends no case files to a server and exposes no financial action control. |

## Evidence and limits

The unit suite exercises the precedence chain, explicit decision boundary, correction messages, all questionnaire choice combinations, and the earlier claim/unknown matrices. It now also combines policy expiry with every early input/link failure, requires current-case link confirmation, distinguishes unfamiliar labels from explicit negatives, and checks UTF-8 byte limits. Browser checks exercise link repair and confirmation, conflict review, outside-scope correction, policy expiry with malformed files, and provisional fit without action controls. These tests use synthetic normalized CSVs.

Check results at principle 4 completion on 29 September 2026 (the later principle 5 regression is recorded separately):

- `node --test scope-fit/*.test.mjs`: 62 passed, zero failed.
- `node --check` on all 12 JavaScript files: passed.
- `playwright-cli run-code` on `ui-smoke.js`, `ui-unknown.js`, `ui-freshness.js`, `ui-race.js`, `ui-error-cost.js`, `ui-a11y.js`, and `ui-policy-priority.js`: all seven passed.
- Automated axe WCAG A/AA scans in the browser scripts: zero violations on the tested initial, questionnaire, unknown, outside, conflict, record-link confirmation, and record-link review states. Manual assistive-technology testing is still needed.
- Trailing-whitespace check on changed files: passed. `git diff --check` exited zero, but the files are untracked, so that Git check alone does not inspect them.

The relative costs and actual false-positive/false-negative rates have **not** been measured with MSP cases. A user confirmation is self-attestation, not proof that same-looking customer references identify the same customer. Vendor authenticity, native export mappings, signed agreement terms, active billing state, actual action cutoffs, and real deadline safety remain unverified. This is a conservative product rule, not evidence that the threshold is economically optimal or production validated.
