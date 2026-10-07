# Self-service MVP feature list

Saved 2026-09-29 at the user's request. This is the current proposed feature selection from [the full six-behavior product list](PRODUCT_BEHAVIOR_FEATURES.md). The [product-led MVP specification](SELF_SERVE_MVP.md) defines how the customer uses it. These are design requirements, not implemented features.

## Selected from the original product

| Original behavior | MVP features | Boundary |
|---|---|---|
| **Observe** | Capture a known deduction's amount, retailer reason, identifiers, current status, and source records; validate the imported case and show missing or ambiguous fields. | The customer brings an already identified case. No continuous transaction ingestion or automatic discovery of every payment gap. |
| **Reconstruct** | Extract and link evidence; show the amount calculation, source-backed facts, conflicting claims, missing evidence, and event history where records permit; let the customer correct matches and facts without erasing originals. | Work from customer-provided documents for a supported exception workflow. No automatic retrieval from every ERP, retailer portal, carrier, or mailbox. |
| **Decide** | Check evidence sufficiency and the supported retailer route/deadline; propose Accept, Pursue, Investigate, Wait, Escalate, Settle/negotiate, or Stop with a reason, amount, uncertainty, and next step; reassess when facts change. | An authorized customer user confirms commercial judgment. Unsupported rules or unknown deadlines remain explicit blockers. |
| **Act** | Prompt for a specific missing item or approval; name the owner and due date; prepare an editable evidence/action packet; record customer-executed submission proof, retailer response, and next follow-up. | The customer performs external actions. No autonomous retailer submission, buyer contact, settlement, or write-off. |
| **Verify** | Track retailer response, partial payments, credits, validly accepted amounts, settlements/losses, and open balances from Finance-provided records; retain financial proof and reopen corrections or reversals. | A case closes only when every dollar has supported financial treatment. No claim that submission or retailer approval equals recovered cash. |
| **Prevent** | Record a supported root cause or “unknown” for the case. | No pattern-driven prevention engine, upstream corrective action, or claimed recurrence reduction. |

## Additional features required because the software serves the customer directly

1. **Self-service entry:** an interactive synthetic example, honest supported-case eligibility check, account creation, guided first-case setup, and a clear document checklist.
2. **Customer workspace:** authentication, tenant isolation, role and access controls, original-file retention, audit history, deletion controls, and an explicit explanation of data/model processing. Founder support access is off by default and requires customer opt-in.
3. **In-product guidance:** concrete prompts for missing evidence, conflicting facts, required approval, next owner, and due date; customer review and correction UI. A routine case must not require founder analysis.
4. **Payment and learning:** a way to purchase a real case or small bundle, with a sponsor/invoice route if a user lacks payment authority; measurement of unaided activation, support time, processing cost, actions taken, verified outcomes, and repeat paid use. The exact price and payment point are experiments.

## Launch boundary and completion test

The first release supports **one well-specified exception workflow**, defined by the applicable retailer rules, deduction reason and state, necessary documents, decision checks, action route, and outcome evidence. One retailer plus one reason family is a possible starting shape, not a fixed universal requirement. The workflow has not yet been selected or validated.

The MVP passes its product test when a new authorized customer can sign up, import a supported real case, correct a bad match, reach a source-backed decision or explicit blocker, prepare and record an approved action, and later reconcile the financial result **without routine founder casework**. It passes its business test only when customers pay, use it again, and unit economics include acquisition, processing, support, and follow-through costs.
