# NCE thin slice: scope questionnaire

Status: proposed feature design, 29 September 2026. This is feature 1.1 under behavior 1, `Check eligibility`, in `NCE_THIN_SLICE_BEHAVIOR_FEATURES.md`. Its wording and question order have not been tested with users. It does not validate the proposed wedge or establish demand.

The first eight principles, **defined scope conditions**, **claim is not verified fact**, **unknown differs from false**, **error costs differ**, **minimum decision-relevant effort**, **precise economic language**, **every result needs a next action**, and **source of truth follows**, have a standalone executable implementation and quality gates in `scope-fit/README.md` and the principle 2–8 files under `scope-fit/`. It includes a progressive fit flow of at most five scope questions and a normalized-CSV preflight for one subscription. That preflight reads local files but does not authenticate them against vendor systems, parse native exports with arbitrary columns, or assess signed contract coverage.

## Purpose and boundary

The scope questionnaire routes a visitor toward or away from preparing **one customer, one upcoming annual Microsoft 365 NCE renewal** for the record-based coverage check. It takes less than a minute in the intended experience. It is a provisional fit check based on self-report, not a determination that the supplied records are valid, the signed contract covers the obligation, or the MSP is financially safe.

It should be available before sign-up, file upload, or payment. Its result is carried into the subsequent file preflight and may be corrected by actual records.

## Foundational first principles

| Principle | Reason | Required design consequence |
| --- | --- | --- |
| Defined scope conditions | Software can only assess cases it knows how to process. | Ask about the customer-managed Microsoft 365 NCE subscription, Pax8, HaloPSA, annual commitment, and upcoming renewal. These are scope conditions, not proof of a problem. |
| Claim is not verified fact | A visitor may misremember a term, date, or system setting. | Label a positive result `looks in scope`; verify material answers against records later. |
| Unknown differs from false | Not knowing the commitment term does not make it monthly. | Offer `I'm not sure` on every decisive question and route unknowns to verification. |
| Error costs differ | False rejection loses a possible user; a false safe verdict could mislead a financial decision. | Allow uncertain visitors into preflight, but never issue a coverage verdict from questionnaire answers. |
| Minimum decision-relevant effort | Extra questions create work without improving routing. | Exclude company size, spend, job title, detailed clauses, and contact details from this step. |
| Economic language must be precise | Annual commitment may be billed monthly. | Ask about commitment term, not billing frequency, and explain the difference. |
| Every result needs a next action | A generic ineligibility label is not useful. | Name the unsupported condition or missing fact and the next verification step. |
| Source of truth follows | The questionnaire is not connected to Pax8, HaloPSA, or the signed agreement. | Carry answers as provisional claims; let preflight and human confirmation correct conflicts. |

Microsoft distinguishes subscription term duration from billing plan and describes annual terms billed monthly: https://learn.microsoft.com/partner-center/pricing/pricing-and-offers . Microsoft also documents distinct end-of-term paths, so this questionnaire must not invent a safe cancellation deadline: https://learn.microsoft.com/en-us/partner-center/customers/extended-service-terms .

## Proposed visitor experience

Use a short, ungated form with one question at a time, a visible answer summary, `I'm not sure` on each decisive question, and `Change answers` on every result. Do not request an account, contact details, contract, or payment at this stage.

| Order | Question | Choices | Decision purpose |
| --- | --- | --- | --- |
| 1 | Who manages this customer's Microsoft 365 subscription? | `We manage and resell it for a customer`; `The customer buys directly`; `I'm not sure` | Establish whether the operator may have an upstream obligation separate from the customer's agreement. |
| 2 | Where is this subscription purchased? | `Pax8`; `Another distributor or Microsoft directly`; `I'm not sure` | This release supports Pax8 records. |
| 3 | Where is the recurring customer charge managed? | `HaloPSA`; `Another PSA or billing system`; `I'm not sure` | This release supports HaloPSA billing records. |
| 4 | What is the current subscription commitment term in Pax8? | `Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)`; `Pax8 shows a monthly commitment term (not just monthly invoicing)`; `Another product or commitment term`; `I'm not sure of the commitment term` | The Pax8 term is distinct from its invoice, the HaloPSA customer charge, and the signed agreement. |
| 5 | When does this commitment renew in Pax8? | Date picker; `Within about 60 days, exact date unknown`; `I'm not sure` | Use the commitment renewal date rather than an invoice date; an approximate answer is not a verified deadline. |

When the visitor moves to record comparison, show a preparation prompt: **Do you have a signed customer order or agreement for this subscription?** Choices: `Yes`, `Need to find it`, `Not sure`. It is not part of the initial fit questions. All choices allow the visitor to continue; a missing agreement creates a verification task, not a scope rejection. Before that prompt is answered, the value is `not-asked`, distinct from `unknown`, and record preflight cannot return a positive result. This does not decide stack eligibility or establish contractual coverage.

At record comparison, also ask which commitment term the user found in Pax8 **Manage renewal** for the next term. This is separate from the current term and can be annual, monthly, another term, or not confirmed. A missing or uncertain next term blocks a positive record result. Optional normalized CSV columns for billing frequency, scheduled terms, and actual term dates can challenge the answer. Contradictory values require verification; missing optional columns never prove that no scheduled change exists. This is still self-report plus supplied file claims, not authenticated vendor state.

The initial ordering is a design hypothesis. Easy, decisive questions can be moved earlier after observing actual comprehension and abandonment. The decision rules below must remain stable regardless of order.

A known unsupported answer among the first four can produce an early outside-scope result. The result names the condition and counts the remaining questions as **not asked**. It offers a direct edit action for the named answer and a voluntary path to finish the questionnaire for record comparison; a completed result with several blockers offers direct edits for each. An unknown answer continues to the later scope questions. An expired policy stops the flow before the first question or file request.

## Decision rules and result copy

| Conditions | Outcome | User-facing action |
| --- | --- | --- |
| Any claimed, clearly unsupported condition | `Outside this release` | Name the condition. Do not ask for payment. Let the visitor change an answer if it was mistaken. |
| No unsupported condition, one or more unknown or approximate material answers | `May fit; verify these items` | List exactly which facts need checking in Pax8 or HaloPSA and whether the signed agreement needs locating. Allow preflight. |
| All scope conditions claimed to match | `Looks in scope` | Invite the visitor to verify the answers with Pax8 and HaloPSA records and the signed agreement. Do not say `eligible`, `protected`, or `safe`. |

A missing signed agreement is a **missing-evidence condition**, not proof that the case is outside scope. It blocks a later coverage verdict until supplied. An absent or approximate renewal date cannot be used to state an action cutoff. Supplied records can challenge questionnaire claims; a conflicting value requires explicit review and remains unauthenticated in this prototype. Equal record identifiers are only a proposed link: the user must confirm the selected subscription, customer, and recurring line against the original systems before reviewing conflicts or receiving a provisional record result. That self-attestation does not authenticate the files.

## Acceptance criteria

1. A suitable visitor can identify one renewal to prepare without creating an account or uploading data.
2. Annual commitment billed monthly is not rejected as a monthly commitment.
3. Unknown answers produce an exact verification task, not a negative or safe verdict.
4. A known unsupported condition produces a precise explanation before payment.
5. Every result permits correction and leads either to record preflight or a clear scope boundary.
6. No questionnaire result claims the contract is covered, a deadline is safe, or money will be saved.

Success is measured initially by completion, comprehension of the result, and whether the subsequent file preflight confirms or overturns questionnaire answers. These measures test the questionnaire's usability; they do not by themselves validate product demand.

## Feature-wide strict local closure

The complete eight-principle implementation uses policy v12 and mandatory schema v3. `scope-fit/SCOPE_QUESTIONNAIRE_QC_FINAL.md` specifies exact assessed-prefix/full claims, shared calendar validation, typed source provenance, current-result interaction guards, incremental input limits and source-bound QC. The 132-case feature audit and closure ledger distinguish local regression coverage, supported-contract limits and external/human acceptance. The initial timing/comprehension hypothesis above remains unproven with real users.
