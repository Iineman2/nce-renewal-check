# NCE renewal coverage check: thin-slice behavior and features

Status: product specification, 29 September 2026. This is a build-and-demand-test hypothesis, not evidence that the exact three-record mismatch is common or that MSPs will pay for it. The broader provisional MVP is specified in `NCE_MVP_PRODUCT_AND_GTM.md`.

## Product definition

A self-service check for one MSP, one customer, and one upcoming annual, seat-based Microsoft 365 NCE renewal purchased through Pax8 and billed through HaloPSA. It determines whether the MSP's vendor commitment is supported by the customer's signed commercial commitment and represented correctly in HaloPSA billing before the relevant renewal deadline.

The question it answers is: **For this renewal, what will we owe Pax8, what has the customer agreed to pay, what will we bill, and what must be fixed before the commitment locks?**

Required inputs are a Pax8 subscription record, the corresponding HaloPSA recurring billing record, the signed customer agreement or order, and an authorized user's confirmation of material contract facts and record matches. The product handles one renewal case at a time. It does not make external writes, send customer messages, give legal advice, reconcile every invoice, or guarantee savings.

## 1. Check eligibility

**Expected behavior:** Before payment or analysis, the user knows whether this case is supported, what evidence is missing, and what to do next. Unknown fields are not treated as proof of eligibility or grounds for rejecting an otherwise possible case.

The detailed first-principles and interaction specification for the scope questionnaire is in `NCE_SCOPE_QUESTIONNAIRE_SPEC.md`.

Feature 1.3, file compatibility preflight, has its proposed best-version behavior, file-state contract, boundaries and implementation quality gates in `NCE_FILE_COMPATIBILITY_PREFLIGHT_SPEC.md` (3 October 2026). Its new-format and native-export targets are definitions, not implemented or qualified support.

The ten foundational principles for feature 1.3 are saved in `NCE_FILE_COMPATIBILITY_PREFLIGHT_PRINCIPLES.md`.

| Required feature | Expected result |
| --- | --- |
| Scope questionnaire | Ask whether the user is an MSP, uses Pax8 and HaloPSA for this subscription, and is checking annual, seat-based Microsoft 365 NCE. Ask for the renewal date. Treat answers as claims pending record validation. |
| One-case selection | Select one customer and subscription, including from a multi-row export. |
| File compatibility preflight | Show accepted formats and samples; accept readable Pax8 and HaloPSA records and a signed agreement/order; identify malformed or unreadable files precisely. |
| Field mapping and validation | Detect or map customer/subscription identifiers, product, seats, vendor cost and period, term, renewal date, end-of-term state if available, and HaloPSA customer, recurring line, quantity, price, and period. Validate dates, numbers, currency, and units. |
| Renewal-window check | Determine whether the renewal is within the initial next-60-day window using the user's time zone. A missing or uncertain date is `needs data`. |
| Agreement-presence check | Confirm a signed customer agreement/order is available and readable. Interpretation occurs in behavior 3. |
| Versioned eligibility rules | Return `supported and ready`, `potentially supported but needs data`, or `outside this slice`, with the rule and evidence behind the outcome. |
| Recovery guidance | Name the missing field, document, or unsupported condition and the next action. Do not charge for a check the product cannot run. |
| Upload controls | State permitted data, access, retention, and deletion before accepting real agreements; allow file removal and replacement. |

**Done when:** A supported case can proceed to linking; all other cases show an exact reason and next step without founder help or a premature coverage verdict.

## 2. Link the three records

**Expected behavior:** The app proposes which Pax8 subscription, HaloPSA recurring line, and signed agreement belong to the same renewal. The user can inspect and correct the link.

| Required feature | Expected result |
| --- | --- |
| Record identity model | Retain source IDs, customer names, product/SKU, dates, and document identifiers without assuming names match across systems. |
| Candidate matching | Suggest links using customer, product, quantity, and dates; explain the basis of each suggestion. |
| Ambiguity handling | Show competing candidates and unmatched records; never silently choose among plausible matches. |
| Manual correction | Let the user choose a different row/document and explain the override while preserving the original suggestion. |
| Link provenance | Record who confirmed the match, when, and which source versions were linked. |

**Done when:** One three-record set is confirmed or a record is marked missing. An uncertain match cannot yield `covered`.

## 3. Extract and confirm contract facts

**Expected behavior:** The app finds clauses relevant to the renewal, shows their location in the signed document, and asks an authorized user to confirm their commercial meaning.

| Required feature | Expected result |
| --- | --- |
| Document viewer and text extraction | Display the agreement/order with page references; flag unreadable scans and missing pages. |
| Clause candidates | Locate term, minimum seats or spend, price, cancellation/reduction rights, renewal, notice, and effective dates. |
| Source-linked fact form | Present each proposed fact next to its clause and page reference. |
| Human confirmation and correction | Require confirmation of material facts; allow corrections with a reason and source reference. |
| Conflict and amendment handling | Surface conflicting terms or later amendments rather than silently choosing a document. |
| Unknown state | Keep ambiguous or absent terms `unknown`; never infer a signed obligation from a PSA billing setting. |

**Done when:** Every fact used to establish customer coverage is confirmed and traceable to signed evidence, or explicitly unknown.

## 4. Normalize the comparison

**Expected behavior:** The app puts the three records on comparable units and dates without hiding assumptions.

| Required feature | Expected result |
| --- | --- |
| Canonical timeline | Align vendor term, customer term, billing start/end, and renewal dates. |
| Quantity and product normalization | Compare vendor committed seats with customer minimum seats and billed seats for the same product; flag non-equivalent SKUs. |
| Price-period normalization | Distinguish monthly billing from annual commitment and apply the supplied vendor price schedule. |
| Currency handling | Preserve source currency; require a supplied or labelled rate for cross-currency calculations. |
| Freshness and conflicts | Show when each record was obtained and highlight newer or contradictory versions. |
| Assumption register | Separate user-supplied assumptions from source facts. |

**Done when:** The user can inspect vendor obligation, signed coverage, and configured billing on the same basis and see unresolved differences.

## 5. Calculate exposure

**Expected behavior:** Quantify vendor commitment not demonstrably covered by the signed customer commitment. Show billing gaps separately.

| Required feature | Expected result |
| --- | --- |
| Deterministic calculation | Calculate uncovered seats and term against the actual vendor cost schedule when available. |
| Partial coverage | Handle a customer commitment that covers only some seats or part of the vendor term. |
| Separate billing comparison | Calculate potential HaloPSA billing shortfall without adding it to vendor commitment exposure. |
| Calculation trace | Show formula, inputs, units, dates, and source references. |
| Missing inputs | Return `amount unknown` when material cost, term, clause, or currency data is missing. |
| Estimate labels | Distinguish potential gross vendor exposure from actual loss, recoverability, or savings; expose assumptions in any estimate. |

**Done when:** Every displayed amount is reproducible; unknown amounts remain unknown.

## 6. Give a defensible result

**Expected behavior:** State what the evidence supports, why, and what remains unresolved.

| Required feature | Expected result |
| --- | --- |
| Explicit decision rules | Return `covered`, `potentially exposed`, or `insufficient evidence` under versioned rules. |
| Evidence requirements | Allow `covered` only when the link, vendor obligation, signed customer terms, and relevant billing facts are confirmed and current enough. |
| Reasoned verdict | Show the rule, supporting facts, conflicts, and missing facts behind the result. |
| Correction loop | Recompute after a corrected match, clause, amount, or source record. |
| Decision history | Preserve prior verdicts and the inputs that produced them. |

**Done when:** A colleague can understand the result from displayed evidence; uncertainty never becomes a clean bill of health.

## 7. Show the decision window

**Expected behavior:** Show when action may still change the renewal outcome, with uncertainty explicit.

| Required feature | Expected result |
| --- | --- |
| Source-linked renewal date | Show the date and Pax8 record that supports it. |
| End-of-term state | Show observed renewal, cancellation, or extended-term setting, or mark it unknown. |
| Deadline rule | Use a verified applicable action cutoff and time zone; do not derive a safe deadline from the renewal date alone. |
| Review buffer | Let the MSP set an internal buffer distinct from the external cutoff. |
| Deadline warnings | Flag imminent, passed, conflicting, or unverified deadlines and say what must be checked in Pax8. |

**Done when:** The app shows a sourced action deadline or says it must be verified; it never presents an invented date as safe.

## 8. Guide the next action

**Expected behavior:** Turn the identified gap into a specific task the MSP carries out in its existing systems.

| Required feature | Expected result |
| --- | --- |
| Issue-specific checklist | Offer the relevant path: review/change Pax8 renewal or seats, obtain a signed amendment, correct HaloPSA billing, or investigate missing evidence. |
| Owner and due date | Assign an operator and a due date based on a verified deadline or explicit internal target. |
| Evidence request | Name the precise document, export, or confirmation needed for an unresolved fact. |
| Decision recording | Record chosen path, approval, notes, and intentional risk acceptance. |
| Safe action boundary | Make no automatic external writes or customer notices; completing a checklist item alone does not resolve exposure. |

**Done when:** Every open case has a specific next step and owner; a recorded action does not falsely close it.

## 9. Verify the outcome

**Expected behavior:** Check whether the MSP's action changed the underlying financial position.

| Required feature | Expected result |
| --- | --- |
| Updated evidence | Accept a fresh Pax8 record, HaloPSA line, or signed amendment. |
| Before-and-after comparison | Re-run linking, normalization, calculation, and verdict rules against new evidence. |
| Resolution rules | Mark `resolved with evidence` only when updated sources show the obligation removed or covered and billing aligned as required. |
| Distinct states | Keep `still exposed`, `awaiting verification`, and `risk accepted` separate from resolved. |
| Audit history | Retain source versions, decisions, reviewers, dates, and reasons for state changes. |

**Done when:** A reviewer can see exactly what changed and why the case closed or remained open.

## 10. Protect the data

**Expected behavior:** The MSP can use the check with real agreements without exposing another tenant's data or losing control of files.

| Required feature | Expected result |
| --- | --- |
| Workspace and access control | Authenticate users, isolate MSP workspaces, and restrict agreement access to authorized users. |
| Minimal collection | Request only data needed for the renewal and provide redaction guidance. |
| Secure file handling | Encrypt data in transit and at rest, keep files private, scan uploads, and avoid logging agreement contents. |
| Retention and deletion | State retention before upload; let the MSP delete a case and its files. |
| Activity record | Log access, uploads, corrections, decisions, and deletion without unnecessary agreement text. |
| Failure handling | If processing fails, show a safe error and avoid a verdict based on partial data. |

**Done when:** These controls exist before real agreements are accepted, and the user can see and remove the data held for a case.

## End-to-end acceptance condition

A qualified MSP can run one real upcoming renewal without founder case analysis. The app either gives a traceable result and guides action and verification, or says exactly what evidence is missing or outside scope. Demand for the wedge is supported only if qualified operators repeatedly find material, previously missed exposure and will pay for this check.
