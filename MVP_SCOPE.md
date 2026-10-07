# MVP scope: paid resolution of post-incumbent retailer deductions

**Status:** The five capability areas and financial-outcome contract remain. The founder-operated delivery and first-sale model below is superseded by [SELF_SERVE_MVP.md](SELF_SERVE_MVP.md).

Decision date: 2026-09-29. This is a proposed product experiment, not a validated market result. The [full feature inventory](PRODUCT_BEHAVIOR_FEATURES.md) remains the expansion target.

## The first sale

Sell a **paid exception-resolution pilot** to a U.S. consumer-products supplier that already has a deduction platform, BPO, or dedicated AR team. Take a defined cohort of unresolved or denied retailer deductions that the existing process has not closed. Cover **one retailer, one legal entity, and one reason family** selected from the paying customer's actual queue after an intake review. Do not name a retailer or reason family before seeing that queue and its available evidence.

Promise an evidence-backed resolution file for each contracted case within ten business days of receiving its required records: what the evidence establishes, what remains unknown, whether further pursuit appears worthwhile, and the exact next permitted action. The customer approves every consequential external action. Keep the case open after submission or retailer approval until finance confirms the cash, credit, adjustment, or authorized loss treatment.

This is a software-assisted service at first. The fixed pilot fee must cover fully loaded analyst/founder delivery time, software and data costs, support, and a margin. An outcome fee may be added for clearly attributable, verified recovery, but it cannot be required for the pilot to have positive contribution. Scope the number and complexity of cases to a stated delivery-hours cap; reprice or narrow before accepting more work. The example prices and case counts in the research are hypotheses, not observed market rates or demonstrated unit economics.

## Minimum product: five capabilities

| Capability | Minimum feature that must work | What a person may do in the pilot | Full behavior covered |
|---|---|---|---|
| 1. Bounded case intake | Import a CSV/XLSX unresolved-case export and a document folder. Keep the incumbent case ID, amount, retailer, status, reason, invoice/PO references, dispute history, and original files. Flag missing fields and duplicate case IDs. Preserve the full in-scope cohort as the measurement denominator. | Map the customer's export columns and choose the contracted cases using a selection rule agreed before results are known. | Observe, for **already identified** deductions only. |
| 2. Evidence-backed case file | In one queue and case view, link documents and material assertions to their source. Record the retailer's claim, supplier's account, amount calculation, contradictory facts, decisive missing evidence, and reviewer corrections. Mark facts as established, reported, inferred, conflicting, or unknown. | Find documents, match records, correct extraction, and reconstruct hard cases. Log why each intervention was needed and its minutes. | Reconstruct. |
| 3. Economic decision and next step | Record one of Accept, Pursue, Investigate, Wait, Escalate, Settle/negotiate, or Stop; the dollars affected; rationale; uncertainty; route/deadline checked; missing item; named owner; and the exact next action. Reopen the decision when material evidence or economics changes. | Apply the customer's rules and commercial judgment. The tool may draft a recommendation, but an authorized reviewer confirms it. | Decide. |
| 4. Approved action packet and follow-through | Generate a shareable evidence packet or request draft; record the customer's approval, action owner, due date, submission or contact receipt, retailer response, and next follow-up. Keep pending work visible. | Customer or authorized operator submits through the existing portal/email process and uploads proof. | Act, through a manual execution channel. |
| 5. Financial outcome record | Import periodic AR/remittance updates or enter finance-verified postings. Allocate original dollars among recovered, validly accepted, settled/written off, and still open; support partial payments and corrections. Record the payment/credit/AR reference and finance approver. Never label a claim recovered from a submission or approval alone. | Finance confirms ambiguous matches and accounting treatment. Keep outcomes pending beyond the pilot's decision meeting if cash has not arrived. | Verify. |

**One measurement spine across all five:** per case, record initial status and age, reason the incumbent process stopped, starting exposure, evidence availability, recommendation, customer acceptance/action, retailer response, verified dollars, root-cause tag or unknown, human minutes by task, elapsed time, and delivery cost. Capture the *entire defined cohort* even when only a pre-agreed subset receives deep case work, so selection and unresolved residue stay visible. This is required to test the wedge, not an optional analytics dashboard.

**Minimum operating controls:** customer-approved data access; contract terms for confidentiality, retention and deletion; access limited to the right customer and named operators; original source preservation; and an audit history of material corrections, decisions, approvals, actions, and financial postings. These are foundations for handling financial records, not a claim of enterprise certification.

## What this version deliberately does not complete

| Full behavior | MVP boundary | Later expansion trigger |
|---|---|---|
| Observe | Starts from the customer's unresolved export; does not discover every short payment or calculate all contractual entitlements automatically. | Repeated paid pilots show a material missed-detection pool. |
| Reconstruct | Human-assisted matching and extraction with source references; no universal transaction graph or autonomous fact finding. | Logged intervention time shows a repeatable document or matching bottleneck. |
| Decide | Reviewer-confirmed judgment; no autonomous claim adjudication, probabilistic settlement policy, or multi-retailer rule engine. | Repeated case patterns and written customer policies support safe rules. |
| Act | Customer-approved manual submission/contact; no portal bot, ERP writeback, or autonomous retailer/buyer messaging. | Manual execution becomes the measured bottleneck and the customer grants the necessary authority. |
| Verify | Periodic read-only finance evidence with manual reconciliation where needed; no live bank/ERP integration. | Outcome matching time or latency materially limits value. |
| Prevent | Record a supported root-cause tag and process owner when known. No prevention claim until an upstream fix is made and recurrence falls on comparable transactions. | Repeated causes show enough preventable dollars to justify a separate fix-and-measure loop. |

The mature six-behavior contract remains: detect the true gap, reconstruct it, decide, act, verify financial finality, and prevent recurrence. The MVP closes the **selected case** loop while intentionally leaving universal detection and measured prevention for later.

## Paid-pilot test and decision rule

Use a roughly 30–45-day pilot with a fixed case and labor cap, a named customer operator and finance contact, and a pre-agreed decision meeting. Deliver the first case files within the ten-business-day promise when inputs are complete. Define what happens when required documents arrive late. Track open retailer/finance outcomes after the meeting until they reach finality or the follow-through period in the contract ends; report them as open, never as recovered.

At the decision meeting, show:

1. **Demand:** signed fee collected; customer used and approved/rejected recommendations; willingness to pay for another cohort or an ongoing service. A verbal compliment is not a purchase signal.
2. **Incremental value:** dollars and cases that the incumbent had left unresolved; actions actually taken; retailer-approved amounts; finance-verified recovery; correct accept/stop decisions that avoided work. Keep approved, submitted, and recovered separate.
3. **Unit economics:** fixed fee minus fully loaded delivery labor, software/data, and support; manual minutes per case and why; contribution before any contingent recovery fee.
4. **Scalability:** fraction of cases that share repeatable evidence/decision patterns; fraction blocked by missing access, human negotiation, or customer-specific exceptions. Report the full cohort and the selection rule.

Continue only if the pilot is contribution-positive on the fixed fee, the customer takes consequential actions from the case files, and the unresolved cohort contains repeatable, economically material work that software can reduce. Seek repeat purchases from independent customers before treating demand as validated. If the residual is mostly bespoke negotiation, unavailable evidence, or already handled by the incumbent, narrow or abandon the wedge. A few paid pilots provide direct evidence but do not, by themselves, prove the broader incidence and P25 exposure gates in the supplied methodology.

## Build for expansion without building the expansion

Use stable customer and case IDs; immutable raw artifacts; source-linked facts; separate decision, approval, action, and financial-outcome events; and configurable import mappings and retailer playbooks. Keep manual corrections and work time as first-class data. This lets later connectors, matching automation, rule engines, portal execution, and prevention attach to proven bottlenecks without changing the meaning of a case or calling an approval “cash recovered.”

## Basis and current market check

The scope follows [the re-researched candidate-A MVP](research/candidate-a-reresearched.md) and [the pilot and operating prerequisites](research/nontechnical-prerequisites.md). On 2026-09-29, official vendor pages described automated deduction identification, document retrieval, dispute workflows, and root-cause views at [SPS Commerce](https://www.spscommerce.com/products/revenue-recovery/1p/), enterprise deduction automation at [HighRadius](https://www.highradius.com/product/deductions-management-automation-software-2/size/enterprise/), and a lightweight document-to-packet offering at [UpClear](https://upclear.com/bluedeductions-express/). These pages establish vendor positioning, not independent proof that any particular customer's residual cases are recoverable or that this MVP will sell.
