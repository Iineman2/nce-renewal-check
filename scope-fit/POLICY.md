# Scope fit policy governance

Current revision (4 October 2026): `fit.mjs` declares `nce-scope-v12`, with the same 31 December 2026 review due date and product-founder owner. Version 12 adds explicit omitted-answer semantics to version 11's current/next commitment and billing distinctions. The application starts with records; it collects no opening questionnaire responses. Optional record-stage term/agreement answers are self-reported. Unasked reseller responsibility remains unknown; CSV rows cannot establish it. The v10 text and questionnaire evidence references below document the historical checkpoint rather than the current collection flow. Current qualification is owned by `../output/file-compatibility-principle-3/REPORT.md`.

Version: `nce-scope-v10`. Local claim-trace revision: 30 September 2026. Review due: 31 December 2026. Owner: product founder. This policy is for the one-renewal prototype and does not certify vendor rules or customer-contract coverage. Version 10 adds immutable original/source/review/effective claim trails, semantic uncertainty and inactive-field states, and removes obsolete trails before edits and new reads. It retains version 9 typed routing and cause-specific repair, version 7 economic distinctions and the version 8 action contract. This is not a review of current vendor rules.

## Conditions and ownership

| Condition | Why it is required | Evidence after questionnaire | Review trigger |
| --- | --- | --- | --- |
| MSP manages and resells this subscription | There must be a possible upstream obligation distinct from the customer agreement. | Operator confirmation, then commercial evidence in a later product stage. | Buyer workflow or liability arrangement changes. |
| Pax8 purchase | Prototype preflight understands Pax8-source fields. | Selected Pax8 subscription row. | Pax8 export schema or channel model changes. |
| HaloPSA recurring billing | Prototype preflight understands HaloPSA-source fields. | Selected HaloPSA line linked to the same subscription and customer. | HaloPSA export schema or integration behavior changes. |
| Annual, seat-based Microsoft 365 NCE commitment | This is the product's narrow first obligation type. | Product, commerce model, seat basis, and term from selected Pax8 row. | Microsoft or Pax8 introduces relevant product or term changes. |
| Renewal within the next 60 days | Initial operating window for a near-term check. | Selected Pax8 renewal date; actual action cutoff remains separate. | Product scope or evidence about useful lead time changes. |
| End-of-term state is renew | A renewal check should not assume auto-renew from a date alone. | Selected Pax8 end-of-term state. | Microsoft or Pax8 changes end-of-term paths or labels. |
| Relevant signed customer agreement available | A later coverage verdict cannot be made without customer terms. | Questionnaire preparation answer only; signed terms are not verified in this prototype. | Contract ingestion is added or evidence requirements change. |

The founder must review current Microsoft, Pax8, and HaloPSA primary documentation before the due date and before any public launch. A change to a condition, source field, supported case, or outcome requires a new policy version, updated copy, updated fixtures, and rule tests. After the due date, the runtime returns `policy-review-required` rather than a fit result until the date and version are intentionally updated.

## Evidence hierarchy

1. Questionnaire answers are self-report.
2. Uploaded CSV rows provide source *claims* and may correct a questionnaire answer, but the prototype does not authenticate those rows against the vendor systems.
3. A matched Pax8 row and HaloPSA row are only a proposed case link. The user must confirm the selected subscription, customer, and recurring line against the original systems. That confirmation remains self-attested and does not establish financial liability or signed customer coverage.
4. A safe action deadline requires the actual cutoff and time zone. The date-only scope check never supplies one.

## Release gate

The prototype can be described as a local scope screen and normalized-CSV preflight. It must not be described as production-ready, native Pax8/HaloPSA export support, a contract review, or a verified financial decision until those capabilities and real-data tests exist.
