# Principle 5: Minimum decision-relevant effort

## Expected behavior

The initial fit check asks only five scope questions: who manages the subscription, purchase channel, recurring billing system, commitment type, and renewal timing. It asks for no company size, spending, job title, contact detail, agreement, file, account, or payment. The agreement-availability prompt appears only when the visitor proceeds to record comparison, because it prepares later coverage work rather than changing the initial scope route.

After an explicitly unsupported answer to one of the first four questions, the page can route immediately to **outside this release**. It names the answered condition and says how many later scope questions were **not asked**; it never silently treats them as `unknown`, `false`, or `yes`. The visitor can jump directly to the named answer, use Back, or voluntarily finish the remaining questions to compare records. If an acknowledged blocker is corrected, a later new blocker can route early. A completed case with several blockers shows a direct edit action for each one. An uncertain answer continues because a later answer may identify a clear scope boundary. The fifth question uses the exact or approximate renewal date as before. A policy past its review date stops the flow before the first question or file request.

The initial result remains provisional. The agreement-preparation answer is optional when checking record facts. A deferred answer of `not-asked` creates a preparation task, not a fabricated claim of agreement availability; record preflight cannot become positive while it remains unanswered. Editing a questionnaire answer preserves already selected files but clears the old record result, link confirmation, and conflict choices. A local-date change clears records and requires a fresh check. The page deliberately does not persist answers or files across refreshes. No early or complete result authorizes a financial action or states contractual coverage.

## Strict local gates

| Gate | Pass condition |
| --- | --- |
| Decision-only initial fields | Exactly five scope topics are required, with a date input conditional on an exact-date answer. No contact, firmographic, agreement, file, or payment request appears inside the initial fit form. |
| Short-circuit correctness | Each known unsupported answer among the first four offers a named outside route immediately. A supported or unknown answer continues. |
| No invented answers | A partial route identifies the still-unasked questions and can never produce a positive result. |
| Voluntary completion | The visitor can continue after an early result, answer the remaining questions once, and reach record comparison without being routed back to the same early result. |
| Repair | Each named blocker can be edited directly. Back and correction can reveal a new blocker. After questionnaire edits, selected files remain, while old record results, link confirmations, and conflict choices are invalidated. |
| Multiple blockers | Voluntary completion presents every known unsupported condition with its own edit action, without trapping the visitor in a repeated early-exit loop. |
| Deferred preparation | Agreement availability is optional at record-fact comparison. `not-asked` never becomes `yes` or an implicit unknown claim and cannot yield a positive record result. |
| Policy and financial boundary | An expired policy blocks the short route and record comparison; no result authorizes action or financial safety. |
| Accessible flow | Early and complete states remain keyboard reachable and have zero automated A/AA violations in the tested browser states. |

## Evidence and limits

The unit tests cover each early stopping answer, supported and unknown continuation, missing or invented partial answers, policy priority before any answer, and deferred agreement semantics. The browser tests cover initial field inventory, early exit, the count of unasked questions, voluntary completion, direct correction of each blocker, a new blocker after Back, multiple-blocker recovery, retained files with invalidated decisions, and record-fact comparison with agreement unanswered. Regression browser tests cover record comparison, policy expiry, freshness, race handling, and accessibility.

Local check results on 29 September 2026:

- `node --test scope-fit/*.test.mjs`: **68 passed, zero failed**, including 432 early-answer combinations and the existing questionnaire and record matrices.
- `node --check` on all 14 JavaScript files: passed.
- Nine browser scripts passed in fresh Playwright sessions: `ui-smoke.js`, `ui-unknown.js`, `ui-freshness.js`, `ui-race.js`, `ui-error-cost.js`, `ui-a11y.js`, `ui-policy-priority.js`, `ui-minimum-effort.js`, and `ui-minimum-recovery.js`.
- Automated axe WCAG A/AA scans found zero violations on the tested early outside, complete fit, unknown, conflict, record-link, and mobile states. Manual assistive-technology testing remains open.
- The separate whitespace check on changed files passed. `git diff --check` exited zero, but these files are untracked, so that command alone cannot inspect them.

The number of fields and deterministic paths are locally verified. The claim that the questionnaire takes less than a minute, that visitors understand annual commitment terminology, and that early exit improves completion or demand are **not** established without user sessions and real traffic. Refresh discards in-progress answers by design; whether an opt-in resume would improve completion remains untested. Native vendor exports and contractual or financial outcomes remain outside this feature's verified scope.
