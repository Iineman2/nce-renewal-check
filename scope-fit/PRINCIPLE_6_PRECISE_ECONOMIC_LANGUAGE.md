# Principle 6: Precise economic language

## Expected behavior

The initial fit check asks for the **current Pax8 subscription commitment term**, not the frequency of a Pax8 invoice, a HaloPSA customer charge, or the duration of the customer's signed agreement. An annual Microsoft 365 NCE commitment may be billed monthly. A person who knows only an invoice or customer charge can choose **I'm not sure** instead of selecting **monthly commitment**. The monthly option says that Pax8 itself shows a monthly term.

The questionnaire classifies the visitor's stated term provisionally. If they select monthly commitment, the outside-scope result explains that monthly invoicing alone does not establish a monthly commitment and points to the Pax8 term for correction. At record comparison, the user separately states the term that will apply at the next renewal after checking Pax8 Manage renewal; an unanswered or uncertain next term blocks a positive record result. A CSV `commitment_term` of `annual` remains annual when a separate billing-frequency field says monthly. A CSV monthly term with annual billing frequency is contradictory and requires review. Ambiguous text such as `billed monthly` in the term field requests verification rather than becoming a known monthly commitment.

Optional normalized CSV fields can describe billing frequency, a scheduled next term and billing plan, and the current term's start and end dates. A recognized scheduled change, contradictory billing plan, shortened annual term, or inconsistent dates blocks a positive record result until verified. Missing optional columns are **not** evidence that no change is scheduled. A recognized three-year term is outside this annual slice; an unrecognized term label remains unknown.

Neither billing cadence nor commitment term alone proves a financial exposure, the signed customer's obligation, or an action deadline. The record result names the field used for classification and keeps the financial boundary explicit.

## Strict local gates

| Gate | Pass condition |
| --- | --- |
| Question meaning | The visible question, help, and choices distinguish current Pax8 commitment, Pax8 invoicing, HaloPSA customer billing, and customer agreement. Help is associated with the radio group for assistive technology. |
| Annual with monthly billing | The annual choice explicitly includes monthly invoicing; an annual `commitment_term` with monthly billing-frequency metadata stays annual. |
| Monthly term and contradictory plan | A known monthly term is outside the annual slice when evidence is coherent. Monthly term plus annual billing metadata requests verification rather than trusting either value. |
| Ambiguity | Invoice frequency alone and unrecognized term text route to verification, not automatic monthly or annual classification. |
| Repair | The monthly-commitment result explains the distinction and offers direct correction of that answer. |
| Current versus next term | Record comparison requires an explicit self-reported next term. A missing, uncertain, or conflicting scheduled term cannot produce a positive result. The answer and its self-reported status remain visible in the result. |
| Term dates | An annual label with a supplied span outside 365–366 inclusive days, invalid or incomplete dates, or a renewal date not following the term end routes to verification. This is a conservative review trigger, not a financial calculation. |
| Source provenance | Record output points to `commitment_term` and does not silently use billing frequency as a substitute. Optional source fields remain part of the review basis, so edits invalidate prior confirmations. |
| Safety | No result infers customer contract coverage, financial loss, or a safe action cutoff. |
| Accessibility and regression | Keyboard paths and automated WCAG A/AA scans pass on the question and tested results; all existing scope and record tests remain green. |

## Evidence boundary

Microsoft's [Partner Center pricing documentation](https://learn.microsoft.com/partner-center/pricing/pricing-and-offers) distinguishes term duration from billing plan and describes annual terms with monthly billing. Its [term-change documentation](https://learn.microsoft.com/en-us/partner-center/billing-frequency-changes) describes changes scheduled at renewal, and its [end-date alignment documentation](https://learn.microsoft.com/en-us/partner-center/customers/align-subscription-end-dates) describes shortened first terms. These support the conservative review triggers; they do not verify any visitor's subscription. The prototype accepts normalized CSVs only. Native Pax8 exports, real agreement terms, user comprehension, and actual financial consequences still need separate evidence.

## Local check results, 29 September 2026

- `node --test scope-fit/*.test.mjs`: **76 passed, zero failed**. The added cases cover contradictory billing metadata, scheduled term and plan changes, next-term uncertainty, known three-year terms, normal versus shortened annual date spans, and confirmation invalidation when economic source fields change.
- All **11** browser scripts passed in isolated Playwright sessions. `ui-precise-language.js` covers the term/billing wording, while `ui-economic-edge.js` covers unanswered next term, stale-result invalidation, scheduled changes, shortened term dates, and a reported monthly next term.
- Automated axe WCAG A/AA scans found **zero violations** on the commitment question and monthly-term result, as well as the prior regression states. This does not replace a manual assistive-technology session.
- The project files are untracked in Git; `git diff --check` has no changed-file coverage here. A separate whitespace check covers the files changed for this principle.

The local gates above verify deterministic behavior and tested browser states. A missing scheduled-change column cannot establish that no change exists; the next-term answer remains self-reported. Whether MSP users understand the terminology on first reading, what their real Pax8 exports call these fields, and whether the wording changes completion or correction rates are **not verified**. Native vendor mapping and contract or financial conclusions remain outside this prototype.
