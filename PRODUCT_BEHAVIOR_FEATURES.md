# Product behavior: required features and completion tests

This records the six feature breakdowns agreed in this chat on 2026-09-29. It describes the **complete product behavior**, not a commitment to build every feature in the first MVP. The source behavior contract is in [research/chat-product-behavior-specification.md](research/chat-product-behavior-specification.md); supporting end-state and workflow research is in [research/perfect-end-state-product-for-unresolved-retailer-deductions.md](research/perfect-end-state-product-for-unresolved-retailer-deductions.md) and [research/nontechnical-prerequisites.md](research/nontechnical-prerequisites.md).

The product contract is: for each difference between what a retailer should have paid and what it actually paid, establish what happened, choose and carry out the economically correct path, verify the financial outcome, and prevent the same avoidable failure from recurring. An approval or submission is not economic finality.

## 1. Observe — know that money is missing

**Completion condition:** Find every in-scope payment gap automatically, state its amount, and show the records behind it. Missing or ambiguous data must remain visible.

| Required feature | Expected behavior |
|---|---|
| Transaction intake | Continuously ingest purchase orders, invoice lines, prices and terms, promotions, shipments, retailer receipts, remittances, deductions, credits, and payments. |
| Record matching | Link records to the right retailer, order, invoice, shipment, and claim line, including partial payments and many-to-many allocations. Flag uncertain matches. |
| Expected-payment calculation | Calculate what was due under effective terms, quantities, prices, allowances, and credits. Do not assume invoice value equals entitlement. |
| Actual-payment ledger | Record what was paid and applied to each invoice or claim line. Distinguish a claimed or approved credit from money received. |
| Variance detection | Detect short payments, missing payments, chargebacks, and unexpected deductions; account for terms, timing, known credits, and later corrections to avoid false alarms. |
| Claim capture | Attach the retailer's stated reason, code, amount, date, and source record when available; preserve “reason unknown” when absent. |
| Continuous updates | Recalculate when late remittances, corrected invoices, additional payments, or changed allocations arrive. Avoid duplicate cases for the same gap. |
| Evidence and coverage | Show the source and calculation for every number; flag missing feeds, stale data, ambiguous matches, and amounts that cannot yet be calculated. |

**Expected output:** “Invoice line X was due $100,000 by September 15. $26,588 was applied; $73,412 remains unexplained. The retailer claims a shortage. Here are the linked records and missing inputs.” Observe detects the gap; Reconstruct determines what happened.

**Completion test:** Include valid and invalid deductions, partial and delayed payments, credits, and missing records. Detect genuine gaps without double counting, and say “cannot determine yet” when evidence is insufficient.

## 2. Reconstruct — establish what happened

**Completion condition:** Present one evidence-backed account of the case: what each party says happened, what records establish, where they conflict, and what remains unknown. Never turn a plausible explanation into a fact.

| Required feature | Expected behavior |
|---|---|
| Evidence gathering | Pull the relevant PO, invoice, terms, promotion, shipment, ASN, warehouse record, POD, retailer receipt, claim, dispute history, and correspondence from available systems and files. Show inaccessible sources. |
| Document extraction | Extract dates, quantities, prices, identifiers, terms, and statements, with links to exact source passages or records. Flag uncertain extraction for review. |
| Case matching | Connect records to the correct retailer, PO line, invoice line, SKU, shipment, claim line, and payment. Preserve ambiguous matches. |
| Event timeline | Show the sequence from agreement and order through shipment, receipt, invoice, deduction, disputes, and responses, including corrections and superseded records. |
| Fact and claim ledger | Label each assertion as established, reported by a party, inferred, conflicting, or missing. Record who asserted it, when, and from which source. |
| Conflict detection | Surface disagreements between sources without assuming which party is wrong. |
| Gap analysis | Identify the decisive missing evidence needed to resolve a conflict, where it may exist, and whether it is obtainable. |
| Calculation trail | Reproduce the claimed deduction amount from the relevant quantity, price, allowance, or rule; flag unexplained amounts. |
| Review and revision | Let an authorized person correct extraction or matching errors while retaining the original evidence, correction, and case history. |

**Expected output:** “Supplier says 1,000 units shipped; carrier POD says 1,000 delivered; retailer says 920 received. The 80-unit difference is documented, but the available records do not by themselves establish which party is wrong.”

**Completion test:** Include matching records, contradictory records, missing documents, ambiguous identifiers, and later corrections. Every material statement must trace to evidence; unresolved conflicts must remain visible; a reviewer must be able to reproduce the timeline and calculations. Decide uses this case to choose a path.

## 3. Decide — choose the economically correct path

**Completion condition:** Every reconstructed case has an evidence-backed, economically sensible current path and a clear reason. A confidence score alone cannot authorize a dispute.

| Required feature | Expected behavior |
|---|---|
| Entitlement assessment | Apply effective contract, pricing, promotion, quantity, and deduction rules to determine what the supplier appears owed. Show conflicting evidence and uncertainty. |
| Evidence sufficiency check | Determine whether facts support action. If a decisive fact is missing, choose Investigate and name that fact rather than guessing. |
| Retailer route and deadline rules | Check available dispute, resubmission, and escalation paths for the retailer, claim type, and case state, including procedural windows. |
| Economic value calculation | Compare likely recoverable dollars with remaining labor, fees, time, and other costs. Do not pursue merely because a claim is technically disputable. |
| Commercial policy | Apply written customer thresholds for relationship risk, buyer contact, settlement, and write-off; route genuine commercial judgment to the authorized person. |
| Decision selection | Choose Accept, Pursue, Investigate, Wait, Escalate, Settle/negotiate, or Stop. Accept means the deduction is valid; Stop means further pursuit is not worthwhile or possible. |
| Decision record | Show proposed amount, supporting and contradictory evidence, rule, calculation, available route, deadline, uncertainty, and required approval. |
| Reassessment | Reopen the decision when new evidence, a denial, partial payment, expired window, or changed commercial instruction changes the economics. Preserve why the decision changed. |

**Decision meanings:** Accept = retailer was right; Pursue = supplier appears entitled; Investigate = decisive obtainable evidence is missing; Wait = an external event must occur; Escalate = normal route failed but another exists; Settle/negotiate = commercial judgment is required; Stop = pursuit has negative expected value or no viable route.

**Completion test:** Exercise each decision with a representative case. A reviewer must be able to answer “Why this path, why now, what could change it, and who has authority?” Act then carries out the selected step.

## 4. Act — make the resolution happen

**Completion condition:** Turn a decision into the next real-world step, prove that step happened, and retain ownership of anything pending. A recommendation alone is not action.

| Required feature | Expected behavior |
|---|---|
| Action plan | Translate the decision into a specific step: request evidence, submit or revise a dispute, escalate, seek a commercial decision, accept a valid deduction, or close a case. |
| Owner and deadline | Identify who may perform or approve it, what they need, and when it must happen. Track retailer deadlines and internal evidence requests. |
| Evidence acquisition | Retrieve an available document or request the exact missing item from its owner; resume the case when it arrives. |
| Action package | Prepare claim amount, explanation, supporting evidence, required fields, and retailer-specific route so the recipient need not rebuild the case. |
| Authority and approval controls | Check customer policy before execution. Route buyer contact, settlements, material write-offs, novel claims, and other consequential actions to authorized humans with the evidence and rationale. |
| Execution channels | Carry out an authorized action through the appropriate portal, API, email, or named human operator. Support a manual route where automation is unavailable. |
| Execution proof | Record what was sent or changed, by whom, when, through which route, and with which receipt or submission ID. Prevent duplicate submissions and flag failures. |
| Pending-work control | If blocked or awaiting approval, give the step a named owner, deadline, reminder, and restart condition. Do not hide it in a generic “in progress” queue. |
| Response handling | Capture acknowledgments, requests for more evidence, denials, and approvals, then trigger the next appropriate action or decision. |

**Expected output:** For a $73,412 shortage claim lacking a POD, identify the shipment and Logistics owner, obtain or request the POD before the dispute deadline, build the package, obtain required approval, submit through the allowed route, and save the receipt.

**Completion test:** Include missing evidence, approved submission, denial needing escalation, expired deadline, timed-out approval, and failed submission retried without duplication. Each ends with proof of action or a specific pending owner and trigger. Verify then checks the financial outcome.

## 5. Verify — prove economic finality

**Completion condition:** Prove the financial outcome and account for every dollar. A submitted or approved claim remains open until the outcome is observed and correctly treated in accounting.

| Required feature | Expected behavior |
|---|---|
| Outcome monitoring | Track retailer responses, approved amounts, remittances, credits, cash receipts, reversals, and AR entries after an action. |
| Payment-to-case matching | Link each payment or credit to the correct deduction and claim line, including partial and combined payments. Flag ambiguous matches. |
| Balance ledger | Keep a non-duplicated account of original amount, recovered amount, correctly accepted amount, approved settlement or write-off, and unresolved amount. |
| Partial-payment follow-through | Keep any unpaid remainder open and trigger the appropriate follow-up. Approval for $73,412 followed by $55,000 paid leaves $18,412 open. |
| Correct closure for valid claims | When the retailer was right, verify the authorized accounting adjustment was posted. Record correctly accepted, never recovered cash. |
| Settlement and loss closure | For negotiated or unrecoverable amounts, record the authorized decision, payment if any, remaining adjustment, and exact closure reason. |
| Reversal handling | Reopen or correct a case if payment is reversed, credit unapplied, or a prior match proves wrong. |
| Financial proof and audit trail | Retain remittance, payment or credit reference, AR posting, dates, required approval, and calculation supporting final state. |
| Closure guardrail | Permit “economically final” only when remaining balance is zero and every portion has a supported financial treatment. |

**Completion test:** Cover full recovery, partial payment, approved but unpaid, valid deduction with AR adjustment, negotiated settlement, write-off, ambiguous payment matching, and reversal. Show what was received or retained, what was legitimately conceded, and what remains open.

## 6. Prevent — stop repeatable losses

**Completion condition:** Identify a repeatable cause, change the originating process with the accountable owner, and measure whether that change reduced the same economic loss. A dashboard or completed task is only an intermediate result.

| Required feature | Expected behavior |
|---|---|
| Root-cause record | Give each finished case a supported cause, affected process, retailer, amount, and confidence. Allow unknown when evidence is insufficient. |
| Pattern detection | Group cases sharing an underlying mechanism even when retailer codes differ. Show dollars and frequency, not case count alone. |
| Controllability assessment | Distinguish causes the supplier can change from retailer errors, external constraints, and unresolved hypotheses. |
| Economic prioritization | Estimate recurring exposure and rank fixes by preventable dollars, effort, and risk. Avoid double counting recovered and prevented dollars. |
| Prevention case and owner | Create a separate upstream case with a named owner in Pricing, Commercial, Logistics, EDI, Finance, or the relevant team. |
| Corrective action and approval | Specify the exact change, such as a promotion setting, EDI mapping, item master value, or warehouse process, and obtain required approval. |
| Implementation proof | Record what changed, where, when, by whom, and which transactions the change should affect. |
| Recurrence measurement | Compare the same deduction type and dollars before and after the change, accounting for transaction volume and other material changes. Mark verified, inconclusive, or ineffective. |
| Earlier interception | Once the cause is understood, detect the same mismatch before shipment or invoicing and route it to an owner while it can still be corrected. |
| Feedback loop | Reopen an ineffective fix and use measured outcomes to improve the cause rules and prevention playbook. |

**Expected output:** If 143 deductions worth $1.8 million trace to a promotion price mismatch, identify the exact configuration, get its owner to correct it, and test whether the rate and dollars decline on comparable transactions. A completed configuration change with persistent deductions is not completed prevention.

**Completion test:** Include a successful fix, ineffective fix, seasonal drop that must not be credited to the fix, unproven cause, and cause outside supplier control. Distinguish a plausible hypothesis from a verified reduction.
