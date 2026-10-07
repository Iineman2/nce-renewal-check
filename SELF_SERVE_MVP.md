# Product-led MVP: the software onboards and guides the customer

Decision date: 2026-09-29. The selected features are saved separately in [MVP_FEATURE_LIST.md](MVP_FEATURE_LIST.md). This supersedes the founder-delivered sales and delivery model in [MVP_GTM_PLAN.md](MVP_GTM_PLAN.md) and [MVP_FUNNEL.md](MVP_FUNNEL.md). The five capability areas in [MVP_SCOPE.md](MVP_SCOPE.md) and the economic-finality principle in [MVP_BEHAVIOR.md](MVP_BEHAVIOR.md) remain; their manual operator steps are design gaps to replace with software-led interactions. This is a product direction, not an implemented or validated product.

## Corrected product thesis

The buyer purchases access to software, signs up, imports a bounded unresolved deduction, and is guided through evidence, decision, approved action, and outcome verification. **The customer operates the case. The founder is not the normal case analyst, onboarding specialist, document collector, or retailer contact.** Customer staff remain responsible for supplying facts, applying commercial authority, executing external actions, and confirming Finance's records. The software does the repeatable reconstruction, prompts for missing inputs, explains uncertainty, prepares the action, and maintains the follow-through state.

The previous concierge proposal reduced build risk and made discovery easier, but it would mainly test whether a remote analyst service could be sold. It did not directly test the intended product. The earlier assumptions that one founder could resolve ten cases in 30–40 hours and personally win access to every customer's financial files are therefore removed from the *normal delivery model*. Founder support can investigate bugs or opt-in exceptions; it is measured and cannot be required to complete an ordinary case.

## Narrow the launch surface before building

The MVP already commits to the **post-incumbent unresolved-deduction problem**, customer-guided behavior, and finance-verified outcome. A self-service flow cannot safely support arbitrary deduction cases on day one. The recommended launch boundary is **one well-specified exception workflow**: the retailer or retailers to which it applies, the deduction reason and current case state, required evidence, decision checks, available action route, and outcome records. One retailer plus one reason family is a simple starting hypothesis, not a universal requirement. The same workflow may cover more than one retailer if the actual rules and evidence support that; different routes must be handled explicitly. The launch workflow has not been chosen. We can communicate the broader problem now; until workflow rules are checked, do not advertise universal live-case coverage or a ten-day resolution promise for unsupported case types. The first product may accept one case at a time; batch import is an expansion after the single-case loop works unaided.

Target a supplier with a real unresolved queue **and** an AR/Finance user who can try a bounded tool without a full replacement project. Whether that overlap is large enough, and whether the user can pay without enterprise procurement, are critical unverified assumptions. If the viable cases are available only at enterprises that require lengthy vendor review, the software can still onboard users after purchase, but the acquisition motion will need sales assistance.

## End-to-end user journey

| Step | Software behavior | Customer action | Observable success |
|---|---|---|---|
| 1. Understand | Show an interactive synthetic case that demonstrates sources, conflict, decision, action, and separate approved/paid amounts. State exactly which retailer/reason family is supported and what data is needed. | Decide whether their stuck case fits. | The user can identify fit before sharing data or booking a call. |
| 2. Start | Create a workspace, explain data location/processing and deletion, authenticate the user, and guide the first case import. Default founder access to case data is off; support access requires explicit customer action and an audit entry. | Accept data terms; enter a case ID and upload the deduction record and available evidence. | A new user can create a case without founder intervention. |
| 3. Check inputs | Parse supported files, link apparent matches, show unsupported/unreadable items, duplicates, and a completeness checklist. Preserve originals and cite exact sources. | Confirm or correct matches and provide missing documents when available. | The case has an auditable known/conflicting/missing fact set, or a specific blocker. |
| 4. Resolve the next question | Reconstruct the amount and timeline, surface contradictions, propose a supported economic path, and explain its route, deadline, evidence, cost/uncertainty, and exact next step. Never turn an inference into a fact or claim a route was checked when it was not. | Review the recommendation; approve, correct, or choose Investigate/Stop with a reason. | An authorized customer user understands what to do and why without a founder-written case file. |
| 5. Act | Generate an editable evidence packet or internal evidence request, require the appropriate customer approval, and track an owner/due date. | Customer submits or contacts through the existing authorized channel and records the receipt or outcome. | Submission is counted only with customer-entered proof; a generated draft is not an executed action. |
| 6. Follow through | Prompt for retailer response and Finance readback; reconcile original, approved, recovered, validly accepted, settled/lost, and open dollars. Flag ambiguous or partial matches. | Upload or enter remittance/AR evidence, confirm allocations, and handle outstanding actions. | No case is called recovered or economically final until finance-supported treatment accounts for every dollar. |
| 7. Repeat | Show the customer's own time saved, supported outcomes, open cases, and recurring cause tags. Offer another paid case or a small case bundle. | Choose whether to pay and use the workflow again. | Paid repeat use occurs without founder-operated casework. |

**Guidance principle:** when the software cannot reach a defensible conclusion, it must ask the user one specific question with the reason, expected document or authority, owner, and deadline. “AI could not analyze this” is not an acceptable endpoint. User corrections become explicit case events; they do not silently rewrite sources or past decisions.

## Minimum product capabilities, revised for self-service

1. **Guided intake:** one supported exception workflow, clear file checklist, parsing, validation, case creation, and secure original-file retention.
2. **Evidence-backed reconstruction:** source-linked facts, amount calculation, conflicts, missing evidence, and customer correction UI.
3. **Decision guidance:** supported dispositions and route/deadline evidence, economic rationale, uncertainty, and customer confirmation.
4. **Action guidance:** approval and owner prompts, editable packet, manual submission proof, retailer response, and reminders.
5. **Financial verification:** periodic customer-provided remittance/AR evidence, partial/open balances, Finance confirmation, and closure guardrail.

The product may use models for extraction and drafting, but deterministic validation, source links, user confirmation, and audit history guard consequential claims. It must not autonomously send disputes, contact buyers, approve write-offs, or assert that cash arrived. The minimum hosted product also needs working authentication, tenant isolation, access control, retention/deletion, and a clear account of any model-provider processing. These are implementation requirements, not current capabilities.

### Trace to the original full-product features

| Original behavior | Features selected for this MVP | Limit of the first version |
|---|---|---|
| Observe | Claim capture, source/evidence coverage, and transaction intake for a case the customer already knows about. | No continuous ingestion, universal variance detection, or automatic discovery of every missing payment. |
| Reconstruct | Evidence gathering from user-provided files; document extraction; case matching; fact/claim ledger; conflict and gap detection; amount calculation trail; review and revision. | The user supplies or corrects missing records; no universal cross-system graph or automatic retrieval from every portal. |
| Decide | Evidence sufficiency, supported entitlement/route/deadline checks, economic-value reasoning, decision selection and record, and reassessment. | Only for the launch workflow; the authorized customer user confirms commercial judgments and uncertain paths. |
| Act | Action plan, owner/due date, evidence-request prompt, action package, approval control, execution proof, pending-work control, and response capture. | The customer executes external actions and records the receipt; no autonomous portal submission or buyer contact. |
| Verify | Outcome record, payment-to-case matching with customer confirmation, balance ledger, partial-payment follow-up, valid/settled/loss closure, reversal correction, financial proof, and closure guardrail. | Finance provides records periodically; no live ERP/bank integration or unsupported automatic cash claim. |
| Prevent | Supported root-cause record or explicit unknown. | No claim that an upstream process was fixed or recurrence reduced. |

**Additional features required by software-led delivery:** account creation and a guided first-run experience; interactive synthetic example; supported-case eligibility check; secure customer workspace and tenant controls; in-app clarification prompts and correction UI; self-serve payment or sponsor/invoice path; support access by explicit opt-in; and product instrumentation for unaided activation, support time, and repeat paid use. These are delivery and trust features absent from the original six-behavior economic workflow; they do not expand the first case type.

## Product-led funnel for a Mumbai solo founder

**Traffic:** a small amount of researched outreach and practitioner introductions, both pointing to the interactive synthetic case rather than a founder meeting. Content or community participation can support credibility, but do not depend on SEO, paid ads, or an unproven referral channel for first demand. The exact visitor definition, assets, outreach loop, and measurements are in [RELEVANT_VISITOR_PLAN.md](RELEVANT_VISITOR_PLAN.md).

**Conversion path:** relevant visitor → sees supported-case example → creates account → imports one real case under approved terms → reaches an evidence-backed decision/next action without founder help → pays for that case or a small bundle → takes the action → records outcome → pays again. The exact point of payment is a pricing experiment; a free synthetic demo is sufficient to show the method, while free analysis of real cases should be deliberately capped and counted as acquisition cost.

**Buyer friction:** a user may be able to try software but unable to pay by card or upload financial records without company approval. Provide an invoice or sponsor-approval path if needed while preserving in-product onboarding and case work. A sales-assisted purchase is compatible with a software-led product; founder-delivered resolution is the part being rejected. The software vendor still must earn trust for data processing. Avoid claiming that self-service removes procurement or cross-border data concerns.

**Positioning:** the claim is not generic document organization or a one-click packet. [UpClear BlueDeductions Express](https://upclear.com/bluedeductions-express/) already advertises self-service signup, credits, document organization, and dispute packets. The proposed differentiation is guidance through **post-incumbent hard-case reasoning and financial finality**. That difference must be demonstrated with real customer cases, not just marketing copy.

## Acceptance and business gates

- **Unassisted activation:** a new authorized user can sign up, understand supported scope, import a case, correct a mismatch, reach a defensible next step or explicit blocker, and export a packet without founder intervention. Observe this in real-user sessions; do not count a founder-guided demo.
- **Trust:** the user knows where data goes, who can see it, and how to delete it; tenant separation and support-access controls are tested before live financial documents are accepted.
- **Decision quality:** on a permissioned test set with valid, invalid, missing-evidence, and contradictory cases, the product cites sources, preserves uncertainty, and does not recommend an unauthorized or unavailable route. Customer reviewers adjudicate correctness.
- **Economic result:** the product records customer action and Finance-supported outcome separately. Partial and unpaid approvals stay open.
- **Paid demand:** users pay for real cases or a bundle and use it again; record acquisition hours/cost, processing cost, support minutes, gross margin, and retention. A paid account that requires founder analysis on every case does not pass this gate.
- **Wedge:** real users have enough economically material cases left after incumbents, and software-guided cases reach useful actions. If self-service works only for routine cases already served by competitors, this thesis fails.

## Basis and unverified boundaries

This direction preserves the [original full behavior](PRODUCT_BEHAVIOR_FEATURES.md) while changing who performs the MVP work. Current [UpClear self-service positioning](https://upclear.com/bluedeductions-express/) and [HighRadius mid-market automation positioning](https://www.highradius.com/en-gb/product/deductions-management-automation-software/size/midmarket/) were checked on 2026-09-29. Vendor pages establish competing capabilities, not customer demand for this proposed residual workflow. No supported retailer/reason family, data-processing design, pricing, activation rate, decision accuracy, or paid conversion has been verified.
