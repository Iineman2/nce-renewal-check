# MVP behavior contract: resolve selected deduction exceptions

**Status:** The case journey and completion rules remain. Its MVP-operator steps are superseded by the customer-guided software journey in [SELF_SERVE_MVP.md](SELF_SERVE_MVP.md).

This describes the proposed [MVP scope](MVP_SCOPE.md) as observable product behavior. It covers a contracted cohort of deductions that the supplier's existing process has already identified but has not resolved. The [full product behavior](PRODUCT_BEHAVIOR_FEATURES.md) remains the longer-term target.

## Product promise and definition of done

For each contracted case, the MVP turns an unresolved deduction into (1) a source-backed account of what is known and unknown, (2) a reviewed economic decision and exact next action, (3) a customer-approved action or documented reason for no action, and (4) a finance-confirmed financial outcome or an explicitly open balance with an owner and next follow-up.

The first deliverable is an evidence-backed resolution file within ten business days **after the required records for that case are received**. If records are missing, the product promptly identifies the exact missing item and owner; it does not silently start a deadline it cannot meet or pretend the case was resolved. Subsequent retailer and payment cycles may extend beyond the pilot decision meeting. A case is economically final only when every dollar has a supported financial treatment.

## Who does what

| Actor | Expected behavior |
|---|---|
| Supplier AR/deductions lead | Provides the unresolved export, defines the in-scope cohort, confirms the incumbent's current status, reviews recommendations, and owns the operational next step. |
| Supplier evidence owner | Supplies a named missing document or answers a specific fact question. |
| Authorized supplier approver | Approves or rejects consequential external contact, disputes, settlements, and accounting decisions under the customer's policy. |
| Supplier finance contact | Provides AR/remittance evidence and confirms payment, credit, adjustment, settlement, or write-off treatment. |
| MVP operator | Maps imports, checks evidence and calculations, records uncertainty and manual work, prepares case files and packets, and follows up on pending states. |
| Product | Maintains the queue, source-linked case record, approvals, action proof, open-balance ledger, deadlines, and measurement data. It does not make an unsupported factual or financial claim. |

## The case journey

1. **Receive and bound the cohort.** The operator imports the customer's unresolved-case CSV/XLSX and source files. The product records every row in the agreed cohort, including rows that will not receive deep work. It preserves the original case ID, source status, amount, reason, retailer, transaction references, and file versions. Duplicate IDs, missing identifiers, out-of-scope rows, and unreadable files appear as exceptions for review. A case is never silently dropped from the denominator.
2. **Open a case and reconstruct it.** The queue shows amount, age, current state, missing blocker, owner, and next action. The case file shows the retailer's claim, the supplier's account, transaction timeline where evidence permits, amount calculation, sources, conflicts, and gaps. Every material statement links to an original record or is marked as reported, inferred, or unknown. An operator may correct a match or extraction but cannot overwrite the original source or erase the correction history.
3. **Choose the economic path.** An authorized reviewer confirms one current disposition: Accept, Pursue, Investigate, Wait, Escalate, Settle/negotiate, or Stop. The record explains the amount at stake, why the path is justified, what evidence might change it, whether a retailer route and deadline were checked, the expected remaining work, the next action, owner, and due date. If decisive evidence or policy is missing, it says so and routes the case to the person who can supply it. A case can be reassessed when new facts or responses arrive.
4. **Prepare and authorize action.** For a pursuit, evidence request, escalation, or commercial decision, the product prepares a packet or draft that contains the claim amount, concise explanation, relevant source files, and route. It records the required approver's decision. A rejected action returns to a named next step; it does not disappear. The customer or an explicitly authorized operator performs the external action through the existing channel and uploads the submission/contact receipt. The product records who acted, when, through which route, and what was sent. It does not infer that a draft was submitted.
5. **Follow the response.** A retailer acknowledgment, request for more evidence, denial, approval, or partial approval is recorded against the case. The product assigns the next owner and due date, including a further evidence request, reassessment, escalation, or finance check. An unacknowledged or failed submission stays pending and is not counted as an executed dispute.
6. **Verify and close.** Finance supplies remittance, payment, credit, or AR evidence. The operator or finance contact links it to the case, records partial allocations, and resolves ambiguous matches. The product separately shows original exposure, amount submitted, retailer-approved amount, amount actually recovered, amount validly accepted or authorized as a loss, and unresolved balance. Closure requires supported treatment of the entire balance and finance confirmation. Later reversals or mistaken matches reopen the case and correct the history.

## States, alerts, and visible outputs

Each case has a **workflow state** separate from its economic disposition: Imported, Needs evidence, Ready for review, Awaiting approval, Awaiting execution, Awaiting retailer, Awaiting finance, or Economically final. An open case always shows its current blocker or next action, named owner, and due date or explicit external trigger. Overdue work appears in the queue. A disposition of Accept or Stop is a decision; it does not by itself close the financial record.

The customer sees only two principal surfaces: a queue for prioritizing work and a case file containing the evidence, decision, packet, action history, and financial result. Pilot reporting derives from those records: the full cohort denominator, cases decisioned and acted on, approved and recovered dollars, correctly closed deductions, manual minutes, elapsed time, and repeatable cause tags. A root-cause tag is a hypothesis or supported classification, not proof that recurrence was prevented.

## Required behavior when reality is messy

| Situation | Required result |
|---|---|
| Evidence is missing, unreadable, or contradictory | Show the specific gap or conflict and who can resolve it; preserve uncertainty. Do not manufacture a decisive fact. |
| Export row or payment may match multiple cases | Flag the ambiguity for review. Do not duplicate exposure or recovered dollars. |
| Retailer deadline is unknown or may have expired | Mark route/deadline unverified and assign a check; do not claim a dispute is available. If expired, reassess escalation or Stop. |
| Reviewer changes a recommendation | Preserve the previous recommendation, new reason, reviewer, time, and affected action. |
| Approval is absent, rejected, or times out | Do not perform the consequential action. Keep a named owner and follow-up state. |
| Submission fails or lacks proof | Leave it Awaiting execution and prevent an unreviewed duplicate attempt. |
| Retailer approves but has not paid | Keep Awaiting finance; show approved and recovered amounts separately. |
| Partial payment, combined remittance, or reversal | Allocate only what finance can support, keep the remainder open, and reopen/correct a reversed recovery. |
| Deduction is valid or pursuit is uneconomic | Record Accept or Stop with evidence and authority; verify the appropriate AR adjustment or authorized loss treatment before finality. |
| Pilot ends with unresolved cases | Export the current case file and open-state ledger with owner and next step. Report them as open under the agreed follow-through terms. |

## Observable acceptance tests

1. Import a cohort containing a duplicate, a missing field, and an out-of-scope row. All rows remain countable; only qualified contracted cases enter deep review; exclusions and reasons are visible.
2. For a disputed deduction, a reviewer can trace the amount and every material assertion to a source or explicit uncertainty, correct a bad match, and see the original and correction.
3. For a case with missing decisive evidence, the system produces a specific evidence request with owner and deadline, rather than a confident Pursue decision.
4. For a supported pursuit, the case shows a reviewed decision, customer approval, packet, actual submission receipt, and retailer response as separate events. Removing approval or receipt prevents a claim of execution.
5. For a claim approved in full but paid only in part, the recovered amount equals the finance-confirmed payment and the unpaid remainder remains open.
6. For a valid deduction, the case reaches economic finality only after the authorized accounting treatment is evidenced; its amount is never counted as recovery.
7. A pilot report reproduces the entire starting cohort, selected-case rule, verified outcome totals, open balances, manual labor, and fixed-fee contribution. Unverified or pending amounts remain labeled as such.

## Expansion boundary

The MVP starts from an export, relies on people for hard reconstruction and execution, and receives periodic finance evidence. Its stable case IDs, preserved sources, linked facts, separate decision/approval/action/outcome events, and manual-work logs let later integrations or automation replace measured manual steps without changing the meaning of a case. It does not claim universal detection or verified prevention.
