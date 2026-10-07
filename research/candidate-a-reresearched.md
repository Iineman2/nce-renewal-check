# Candidate A Re-Researched: What Is Actually Worth Building

## The correction: the MVP should finish the validation, not precede months of interviews

Your objection is correct.

The sentence I gave you before—

> “Interview 100 sophisticated suppliers already using HighRadius/SupplyPike/BPOs…”

—took the **final statistical-validation standard** in the methodology and turned it into a prerequisite for writing any software. For the purpose you actually care about—deciding **what is rational enough to spend founder time building**—that is unnecessarily expensive.

The methodology itself contains the better path. It says the preferred first-customer architecture is:

**historical/read-only data → independent analysis → economically measurable result → customer verifies → customer pays → deeper integration later**

and then prescribes:

**desired perfect economic outcome → perfect end-state product → minimum complete outcome loop → minimally profitable MVP.** fileciteturn0file0

So I re-ran Candidate A with a different practical question while preserving the methodology's economic logic:

> **Can public and primary evidence get us far enough to identify the exact residual economic failure, eliminate the obviously bad product ideas, specify the ideal product, and justify building a narrow paid MVP whose operation produces the missing Tier-A validation data?**

That is a much better founder decision threshold.

I would still preserve an important terminology distinction. Under the PDF's literal rules, we should **not call a wedge “seven-gate validated”** until the incidence, P25 exposure, residual prevalence and residual market-capacity requirements are actually supported. fileciteturn0file0 But you do **not** need to resolve every one of those with 100 interviews before writing the MVP.

Instead:

**Deep research eliminates bad wedges and defines the exact economic bet.  
The minimally profitable MVP becomes the final evidence-producing instrument.**

For Candidate A, that change is consequential, because the research says **the original broad idea should not be built—but a much narrower product probably should be.**

## What the incumbents have already killed

The first important result is negative.

### Do not build “AI deduction management”

That market has moved much further than the first description suggested.

HighRadius's current deductions product already advertises automated claim capture, trade-promotion matching, shortage analysis, POD aggregation, dispute preparation, dispute submission and status tracking. Its current product materials say it can automatically collect evidence from customer and carrier portals, perform multi-way matching, flag invalid deductions and prepare disputes. citeturn17search1turn17search2turn17search4

SPS Commerce's Revenue Recovery product—the successor to SupplyPike—likewise says it automatically identifies, validates and disputes deductions, retrieves required evidence, supports retailer-specific workflows and provides root-cause analysis. Its product documentation says Document Explorer retrieves shipping documents from more than 300 carriers. citeturn18search0turn18search2

So these are **already products**:

> Upload deduction → find invoice → collect POD/BOL → validate shortage → attach evidence → submit dispute.

And:

> Deduction data → dashboard → detect recurring reason codes → root-cause analytics.

And:

> Use AI to read deduction documents and produce a dispute package.

In fact, UpClear has pushed the last one down to an extremely low-friction self-service product. Its BlueDeductions Express currently lets a CPG company create an account, buy a $100 pack for 400 documents, upload deduction artifacts, use AI to structure them and generate a dispute package without an integration project. citeturn18search1

That matters enormously.

An MVP that is:

> “Upload your remittances, invoices and PODs and our AI will tell you whether the deduction is valid”

is **not a wedge anymore**.

It is an existing feature set.

The same is true of simply building “AI agents that log into retailer portals.” HighRadius already markets automated collection from hundreds of sources, while SPS connects directly to retailer, carrier and 3PL systems. citeturn17search0turn17search4turn18search2

There is also good evidence that this automation works well enough to remove enormous amounts of ordinary labor. HighRadius's Danone case describes more than 1.1 million annual claims worth over $400 million, a 35-person process and documents scattered across more than 25 retailer/carrier portals; the case reports 527,000 claims automatically aggregated and substantial recovery/productivity improvements after implementation. This is vendor evidence, so it should not establish a hard gate by itself, but it tells us the obvious document-chasing job is exactly what incumbents are attacking successfully. citeturn14search6

An RVCF case on a $2 billion-plus consumer-products organization makes the same point from another angle. The organization had almost 40 employees involved in deduction processing, with documents coming from multiple sources and claims taking hours to investigate. After RPA was introduced, routine processing reportedly fell to minutes and **two employees remained to manage the exceptions**. Again, the underlying case was supplied by a vendor, so I treat the performance numbers cautiously; the important workflow observation is what remained after automation. citeturn15search7

That last phrase is where the real wedge starts.

> **Automation removes the standardized case. Humans inherit the exceptions.**

The research question should therefore not be:

> “Can we automate deductions?”

It should be:

> **“What exactly makes the remaining exceptions resistant to the incumbent automation?”**

That is straight out of the residual-grievance and structural-opening requirements in your methodology. fileciteturn0file0

## The residual economic job the research actually uncovered

There is compelling current evidence that a distinct post-automation workflow remains.

I would define the exact economic failure as:

> **After a modern deduction-management system or BPO has processed the routine cases, financially material exceptions remain unresolved because the evidence or authority needed to close the case lies outside the standardized case record—in other internal systems, emails, contracts, people, counterparties or retailer-specific escalation processes. Humans must reconstruct the case, obtain missing evidence/approval and determine the next economically rational action before a deadline or write-off.**

That is much narrower than “deduction management.”

### The trigger-to-outcome workflow

Using the exact workflow ontology from your methodology, it is:

**Trigger**  
A retailer deducts money or a previously disputed deduction changes state.

↓

**Transaction/data**  
PO, invoice, remittance, deduction code, shipment/ASN, receiving record, POD/BOL, promotion/contract, prior dispute record.

↓

**Incumbent action**  
HighRadius/SPS/BPO gathers standard evidence, evaluates validity and submits or routes the routine case.

↓

**Exception/failure**  
The deduction is *unclear*, *not ready*, *Supplier Action*, repeatedly denied, partially approved, subject to a special settlement process, or requires evidence/authority the standard workflow doesn't possess.

↓

**Human workaround**  
Analyst reconstructs the history, reads retailer comments, checks ERP/TPM/WMS/email/contracts, contacts Sales/Logistics/Customer Team/buyer/carrier, finds missing evidence, decides whether pursuing the case is rational, prepares a revised explanation and follows retailer-specific escalation rules.

↓

**Financial consequence**  
Cash stays unresolved; analyst/BPO time accumulates; dispute windows expire; valid receivables can eventually be written off.

↓

**Attempted resolution**  
New evidence, buyer approval, revised packet, re-review, escalation or settlement.

↓

**Economic outcome**  
Full recovery / partial recovery / valid write-off / abandoned claim.

That workflow is not hypothetical. There are unusually good **current operational artifacts** documenting it.

### The strongest evidence: SPS itself documents where automation stops

Consider Walmart return-center deductions.

SPS's April 2026 instructions say Walmart Return Center deductions follow a different path from standard AP deductions. The user must filter/export claims from SPS and pursue them through Walmart's Supplier Help process; after the initial 90-day window, claims move to a settlement process. citeturn13search0

The broader SPS documentation explains that these claims cannot be handled through Walmart's ordinary APDP dispute path: suppliers must retrieve backup, complete a dedicated claim form, assemble supporting documents and create a Partner Support case. citeturn13search3

That is a **workflow-position boundary**.

Now look at Target.

SPS explicitly has a “Supplier Action” state in which Target asks the supplier for more information before deciding. The documentation says there is typically an additional five-day timeout, after which Target may deny the dispute if the new information has not arrived. citeturn13search8

More interestingly, for certain Target contract deductions, SPS can already evaluate the contract and mark the deduction likely invalid—but the supporting evidence can still require an **email approval from the Target buyer** plus the underlying contract and, where relevant, sales calculations. citeturn13search13turn13search16

That is an **authority/organizational boundary**.

The software can know:

> “The arithmetic appears inconsistent with the agreement.”

But economic resolution can still depend on:

> “Get the appropriate buyer to approve repayment and attach that approval.”

Now consider Home Depot.

SPS's May 2026 help documentation says Home Depot does not officially permit re-disputing a denied deduction. Instead, a supplier can “open a dialog” asking for another review. SPS says whether the reviewer will take another look varies, additional documents may be requested, and a supplier may ultimately need to open another ticket requesting review. citeturn13search5

That is an **external-counterparty/authority boundary**, not “the dashboard needs a better button.”

And even in Walmart's highly automated workflow, SPS tells users responding to Supplier Action/Denied/Cancelled claims to address Walmart's comments and include relevant supporting evidence such as purchase orders, invoices, shipping documents and related emails. SPS also advises requesting additional backup when the existing record does not explain the claim. citeturn13search7

There is a data boundary as well. SPS's Walmart validity feature analyzes ASN, invoice and receiving data, but its documentation explicitly includes an **“unclear”** validity state and notes limitations where the necessary underlying data is unavailable. citeturn13search14

The important distinction is therefore:

**Incumbent knows how to process a fully specified case**  
versus  
**someone still has to make an under-specified case fully specified.**

That latter job looks materially less automated.

### There is direct evidence that humans are employed specifically for the post-BPO/escalation layer

The strongest primary evidence I found is Campbell's current Deduction Analyst job description.

Campbell explicitly says the employee will:

- investigate **complex** non-trade deductions;
- perform root-cause analysis;
- work across Supply Chain, Sales and Finance;
- **own high-priority and escalated deductions from Accenture and external partners**;
- direct Accenture deduction analysts;
- coordinate offshore analysts;
- validate, dispute and recover invalid deductions;
- manage customer portfolios through resolution.

It also lists familiarity with SAP, AFS TradePro and HighRadius as desirable. citeturn16search2

That is almost exactly the residual-grievance pattern your methodology tells us to search for:

> **BPO + modern software + humans still hired to investigate escalated exceptions and coordinate across organizational boundaries.**

Reddy Ice has a current primary-source AR Manager posting that likewise describes a deductions team, direct handling of complex cases, coordination between customers/internal departments/third parties, big-box customers such as Walmart, Target and Kroger, substantial Excel work, and HighRadius experience as preferred. citeturn15search4

That does **not** prove that 20%, 30% or 50% of every incumbent user's dollars fall into this bucket.

But we no longer need to interview 100 companies simply to determine whether the workflow is imaginary.

It plainly exists.

## The economics are real—but the recoverable residual is smaller than the headline market

This part of the research actually makes the wedge **better defined** because it kills a tempting but incorrect assumption.

You should **not** model all retailer deductions as recoverable leakage.

RVCF reported from a CRF/RVCF/Attain deductions survey that upwards of **90% of deductions were deemed valid**, while only about **50% of invalid claims were ultimately repaid**. RVCF separately describes historical compliance-charge accuracy around 80–90%, leaving approximately 10–20% disputable. citeturn15search0turn15search8

So the business is not:

> “Recover the giant pile of deduction dollars.”

A great deal of that pile represents legitimate charges.

The economically interesting pool is something more like:

> **invalid or potentially invalid dollars that remain unresolved after the standard process, where additional evidence/reasoning/coordination can still change the outcome.**

That is much smaller—but it can still be substantial in high-volume accounts.

For scale, HighRadius's Danone case reports more than $400 million in annual deduction claims and $25.5 million in cash tied up in unresolved disputes in that particular environment. citeturn14search6

More importantly, **customers demonstrably spend serious money on the category**.

SPS Commerce acquired SupplyPike in 2024 for approximately **$205.8 million**. SPS's SEC filings say the acquired SupplyPike customer base contributed about **200 recurring-revenue customers**. At acquisition, SPS projected SupplyPike would add about **$25 million of fiscal-2025 revenue**. citeturn14search0turn14search13

A rough division of the projection by the approximately 200 acquired customers gives an order-of-magnitude figure around **$125,000 of annual revenue per acquired customer**. That is **not a disclosed SupplyPike ACV**—growth, service mix and customer composition make the division imperfect—but it is powerful evidence that companies actually allocate meaningful recurring budget to solving retail deduction/revenue-recovery problems. citeturn14search0turn14search13

The labor spend is visible too. Campbell's current role has a stated base range of roughly $46,600–$64,100, before the BPO/offshore resources it explicitly manages. citeturn16search2

So Gate Four's basic economic premise—**“people spend real money to deal with this workflow”**—is not the problem.

The uncertainty is narrower:

> **How large is the post-incumbent exception pool per account, and what proportion of it can our software materially change rather than merely observe?**

That should be learned from paid MVP case data.

### Retailer complexity makes the residual plausible

Another supporting fact is that the underlying operating rules are not stable or homogeneous.

RVCF reviewed more than 40 retailers' deduction policies for its 2024 update and cataloged **557 possible deductions**, with **889 changes** and **276 deduction removals** in the review. citeturn15search1

That is exactly the kind of long-tail heterogeneity that makes a deterministic universal workflow difficult.

But this evidence also creates an important product constraint:

**Do not build a giant retailer-rule database and portal-connector farm before revenue.**

SPS already has the network advantage there, and its current retailer pages explicitly say new revenue-loss types/capabilities are being added continuously. citeturn18search3turn18search4turn18search10

Your wedge should use that infrastructure where it exists, not try to reproduce it.

## The product I would actually build

The research changes Candidate A from:

> **AI deductions management**

to:

> **A post-incumbent exception-resolution caseworker for retail deductions.**

The simplest one-sentence product definition is:

> **Give it the unresolved exception queue from SPS/HighRadius/BPO plus the customer's relevant internal evidence; it reconstructs the economic truth of each case, determines exactly what is missing, finds or requests that missing information from the right person, produces the next retailer-specific action with supporting evidence, and tracks the case to an economic outcome.**

The starting point is deliberately **after** the incumbent.

### It should only ingest cases that automation has failed to finish

Examples:

**Unclear / evidence-deficient**
> “SPS can't determine validity because the expected evidence isn't present.”

**Not ready**
> “The claim appears disputable but required documentation is missing.”

**Supplier Action**
> “Retailer has come back with a specific question or asks for additional evidence.”

**Denied with a nontrivial counterargument**
> “Standard dispute failed; reviewer provided a reason that needs factual rebuttal.”

**Partial approval**
> “Some amount was accepted and another amount requires reconstruction.”

**Special-process case**
> “The ordinary dispute mechanism doesn't apply; settlement/support/buyer workflow is required.”

**Cross-functional case**
> “Finance has the claim, Logistics has the POD, Sales has the agreement, and the account team has the buyer correspondence.”

The system should specifically **reject** easy cases that HighRadius/SPS already automate well.

That is very important.

You do not want your software spending its compute and engineering effort proving that:

> PO quantity = invoice quantity = POD quantity.

HighRadius already performs that sort of multi-way matching. citeturn17search2turn17search3

You want:

> “The original deduction was denied because Target's receiving evidence conflicts with our POD; the reviewer now requests X; the contract is in this folder; the buyer previously approved the same exception in this email thread; Logistics has Y; without Y the claim is weak; with Y the evidentiary chain supports a $37,420 re-review. Ask Jane in Logistics for document Z and draft the response.”

That is a fundamentally different unit of work.

### The perfect end-state product

Following your methodology literally, I would define the **perfect economic outcome first**:

> **No economically recoverable retailer deduction is lost because the supplier failed to reconstruct the facts, obtain accessible evidence, route the case to the person with the needed authority, meet the counterparty's procedural requirement or act before the deadline. Humans spend time only where genuine commercial judgment or relationship negotiation is required.** fileciteturn0file0

The ideal product that produces that outcome would maintain a live, provenance-linked **case graph** for every exception.

For a $42,700 deduction it knows:

```text
Deduction
├── Retailer / vendor number
├── Invoice
│   ├── PO
│   ├── SKU/quantity/price
│   └── payment/remittance
├── Shipment
│   ├── ASN
│   ├── BOL
│   ├── carrier
│   └── POD
├── Commercial terms
│   ├── customer agreement
│   ├── promotion
│   └── buyer approval
├── Dispute history
│   ├── original submission
│   ├── retailer response
│   ├── denial reason
│   └── prior analogous cases
├── Missing evidence
│   ├── required artifact
│   └── likely internal owner
├── Authority path
│   ├── buyer
│   ├── retailer AP
│   ├── logistics
│   └── carrier
└── Economic outcome
    ├── amount at risk
    ├── recoverable estimate
    ├── next action
    ├── deadline
    └── final paid/written-off amount
```

The critical feature is not the graph visualization.

It is that **every conclusion is evidence-bound**.

The system can say:

> “Likely invalid because A, B and C.”

But every A/B/C links directly to the invoice line, contract clause, POD, email, retailer response or calculation that supports it.

Then it asks:

> **“What fact or authority is preventing this case from being economically resolved?”**

And takes the smallest action necessary to remove that blocker.

For example:

> Missing proof → find it.

> Proof exists but not attached → attach it.

> Internal approval missing → request it from named owner.

> Retailer asks a factual question → answer using cited evidence.

> Buyer approval required → prepare the buyer request.

> Reviewer ignored evidence → create a concise rebuttal.

> Case is actually valid → recommend closure immediately.

> Expected recovery is below remaining handling cost → recommend economic write-off.

That last one matters.

The perfect product is **not a dispute-maximization machine**.

It is an **economic-resolution machine**.

Sometimes the correct output should be:

> “Stop. The retailer is right. Do not spend another analyst hour on this.”

RVCF's evidence that most deductions are valid makes that capability particularly important. citeturn15search0turn15search8

### The long-term moat is not the LLM

“GPT but for deductions” is copyable.

The potentially defensible asset is the accumulated outcome dataset:

**exception state → evidence available → evidence missing → retailer response → internal action → counterparty action → resolution path → time → dollars recovered**

over thousands or millions of cases.

That lets the product eventually learn:

> For this retailer + code + denial reason + evidence pattern, what actually works?

> Which “Supplier Action” cases are worth chasing?

> Which document is usually missing?

> Which internal team holds it?

> Which cases get denied despite apparently strong evidence?

> Which retailer processes make additional action economically irrational?

That is much closer to an outcome network than a generic document copilot.

It also creates a logical expansion into prevention. Once enough exception outcomes are observed, the system can identify recurring upstream causes—but I would **not** build prevention first because HighRadius and SPS already market root-cause analytics heavily. citeturn17search1turn18search2

## The minimally profitable MVP I would build now

This is where I would stop researching and start getting direct economic data.

Not after 100 interviews.

Now.

But I would build **much less** than a traditional SaaS application.

### The initial promise

I would sell this:

> **“Send us your highest-dollar unresolved deduction exceptions—the cases your current software/BPO has not closed. Within ten business days, we will return an evidence-backed resolution file for each case: what actually happened, whether pursuing it is economically justified, what evidence or approval is missing, who needs to provide it, and the exact next action. You approve every external action.”**

Notice what we are **not** promising:

> “Replace HighRadius.”

> “Replace SupplyPike.”

> “Automate your deductions.”

> “Connect every retailer.”

> “Build you a better dashboard.”

The customer must already have a deduction process.

We are taking its leftovers.

### The first ICP

I would target:

> **U.S. CPG / consumer-product manufacturers selling directly to major retailers, already using a deduction-management platform and/or BPO, with a dedicated AR/deductions function and a material unresolved exception queue.**

That deliberately excludes small brands with no infrastructure.

Small brands can already buy lightweight products such as BlueDeductions Express. citeturn18search1

Your ideal customer looks more like Campbell: enough complexity that software/BPO handles a base layer but employees are still specifically assigned to escalated cases crossing Supply Chain, Sales and Finance. citeturn16search2

### The input should be embarrassingly simple

For the first paid customer:

**Required**
- CSV/XLSX export of unresolved deductions;
- current status;
- amount;
- reason/code;
- retailer;
- invoice/PO identifiers;
- dispute history/comments;
- folder of already available supporting documents.

**Optional**
- exported email threads;
- customer agreements;
- promotion data;
- read-only shared mailbox/folder access.

No ERP write integration.

No portal bot.

No browser agent acting as the customer.

No autonomous submission.

That follows the exact read-only-first architecture in your methodology and isolates whether the **reasoning/orchestration layer** creates value before integration work obscures the answer. fileciteturn0file0

SPS itself now supports multi-retailer deduction exports, which makes an export-first overlay technically plausible rather than requiring us to replace the incumbent system. citeturn13search20

### The MVP needs only one real screen

A queue:

| Case | $ at risk | Current state | Economic judgment | Missing blocker | Next action |
|---|---:|---|---|---|---|
| A | $38,450 | Supplier Action | Pursue | Updated POD | Request Logistics |
| B | $21,180 | Denied | Pursue | Buyer approval | Draft buyer request |
| C | $14,600 | Unclear | Investigate | ASN | Find in folder |
| D | $9,850 | Denied | Stop | Retailer correct | Close/write off |

Click a row and the user sees the **case file**, not another analytics dashboard.

It should contain:

**Economic judgment**
> Pursue / investigate / settle / stop.

**Reasoning**
> Concise explanation.

**Evidence**
> Every assertion linked to source artifact/page/line/field.

**Contradictions**
> Retailer says X; shipping record says Y.

**Missing evidence**
> What is absent.

**Owner**
> Who is most likely to possess it.

**Next action**
> Exact action required.

**Draft**
> Internal request, buyer request or retailer response.

**Deadline**
> Relevant response/dispute window.

**Value**
> Dollar amount that action can affect.

### Humans stay in the loop

The first version should never silently send the retailer a dispute.

It generates:

> “Send this.”

The customer clicks:

> “Approved.”

Initially the customer can even perform the submission manually.

That is not a weakness.

It prevents you from wasting weeks automating portal submission before proving that your **economic reasoning** is better than what already exists.

And this is specifically consistent with the methodology's instruction to keep external/financial actions human-approved until reliability is established. fileciteturn0file0

### What can be manual behind the scenes

A founder/analyst can manually intervene when:

- entity matching fails;
- a retailer rule needs interpretation;
- a document is ambiguous;
- an evidence request must be composed;
- the model is uncertain;
- a calculation needs verification.

But every manual intervention should be logged as:

> **Why did software fail here?**

After five customers, those logs become the actual product roadmap.

That follows the PDF's rule that manual MVP work is acceptable only where it teaches what becomes reusable software. fileciteturn0file0

### The paid pilot structure

I would **not** offer a free audit.

SPS itself uses complimentary recovery audits in its go-to-market motion, so “we'll audit your deductions for free” provides neither differentiation nor useful WTP evidence. citeturn18search5turn18search9

Instead I would test a 30–45 day contract in the format your methodology recommends.

A concrete first experiment could be:

> **Scope:** 50–100 already unresolved, economically material exception cases  
> **Qualification:** material aggregate dollars at stake; no ordinary ready-to-dispute claims  
> **Fixed fee:** approximately $10,000  
> **Outcome component:** approximately 5% of verified incremental recovery attributable to the resolved cases  
> **External actions:** customer-approved  
> **Production decision:** day 45–60

Those numbers are **experimental pricing, not researched market prices**. Their purpose is to create an economically honest test.

The delivery budget might be capped, for example, at 35–40 human hours. Shadow-pricing that labor at $100/hour gives $3,500–$4,000 of labor cost; allowing another roughly $500–$1,000 for model/data/tooling expense leaves positive contribution on a $10,000 fixed component before any success fee.

That gives you exactly what the methodology wants:

**paid from customer one + manual labor honestly costed + complete outcome loop + no fake “free founder labor.”** fileciteturn0file0

But I would place another constraint on accepting a pilot:

> **Do not take the engagement unless the conservative customer-verifiable residual economic value is large enough that the proposed fee stays below the methodology's 20% value-capture ceiling.** fileciteturn0file0

So $10,000 is not universally the price.

It is the starting hypothesis for sufficiently valuable case batches.

### What the MVP must measure automatically

This is how the MVP replaces the 100-interview exercise.

For every case, capture:

```text
dollar amount
retailer
deduction type
pre-existing incumbent/BPO
starting state
root cause
why incumbent stopped
evidence initially available
evidence missing
systems/people needed
software-only resolution possible? Y/N
human judgment required?
commercial negotiation required?
minutes of human intervention
recommended action
customer accepted recommendation? Y/N
retailer accepted action? Y/N
amount approved
amount ultimately paid
days to first actionable result
days to resolution
```

After even **five paid customers**, you will possess something much more useful than five interviews:

**actual case-level economic evidence.**

After ten customers, you can begin building the root-cause Pareto your methodology requires.

You can directly answer:

> What percentage of residual dollars are evidence reconstruction?

> What percentage are missing internal data?

> What percentage require authority/approvals?

> What percentage are pure negotiation and therefore outside software control?

> What percentage can software change?

> What was the actual incremental recovery?

> How much analyst labor disappeared?

> What is P25 residual exposure by account?

That is Tier-A evidence.

An interview asking:

> “How painful are exceptions?”

cannot compete with it.

## What would kill this product during the MVP

The MVP should not be designed merely to “prove demand.”

It should be designed to kill the hypothesis cheaply if the residual job is economically wrong.

There are four particularly important failure modes.

### The residual cases are mostly commercial negotiation

Suppose $1 million of unresolved exceptions looks promising, but after reconstruction:

- $650,000 requires discretionary buyer concessions;
- $200,000 reflects legitimate charges;
- $100,000 depends on inaccessible information;
- only $50,000 is meaningfully changeable through better software.

Then software controllability is too low.

Candidate dies.

This is exactly why Target buyer-approval cases are interesting evidence of residual work but **cannot automatically be counted as software-controllable dollars**. citeturn13search13turn13search16

### The incumbent already has all the evidence

If SPS/HighRadius already knows the facts, has the documents and has a functioning workflow, and our “exception product” is merely writing a slightly nicer response, that is a feature—not a wedge.

Candidate dies.

HighRadius is actively shipping agentic workflows, document aggregation, multi-way matching and dispute automation, so the bar here is high. citeturn17search2turn16search9

### The exceptions are economically tiny

The job can be real and still be a bad business.

If an affected company's post-incumbent unresolved, software-controllable dollars are only $30,000 annually, there is not enough economic room for a meaningful SaaS ACV.

Candidate dies.

This is why the MVP should ingest the **highest-dollar unresolved queue first**, rather than processing a random sample.

### Every customer requires bespoke retailer consulting

If customer one teaches Walmart rule X, customer two requires completely different Target implementation Y, customer three requires Lowe's process Z, and very little software carries forward, then you have founded a recovery consultancy.

Candidate dies.

RVCF's evidence of hundreds of deduction types and frequent policy changes makes this a genuine risk, not a theoretical one. citeturn15search1

The manual work is acceptable only if it converges.

After each customer, the proportion of case handling requiring a human should fall.

## Current gate status and the actual build decision

Applying the **same seven gates** rather than replacing them with a new framework, this is where the refined candidate stands.

| Gate | Status now | What research established | What the MVP should establish |
|---|---|---|---|
| **Incidence** | **C** | The residual workflow demonstrably exists at sophisticated organizations and across current retailer processes. citeturn16search2turn13search5turn13search8 | Exact affected-account incidence in the chosen ICP. |
| **Economic exposure** | **C** | Overall deduction exposure can be enormous, and unresolved dollars can be material, but public sources do not give P25 exposure for the *post-incumbent exception* specifically. citeturn14search6turn15search0 | Per-customer P25/median residual exception dollars. |
| **Software controllability** | **C, promising** | Evidence, workflow, data and coordination failures are observable; some cases instead depend on discretionary retailer/buyer authority. citeturn13search13turn13search14turn13search5 | Case-level Pareto; ≥25% conservative controllable share. |
| **Revealed WTP** | **Strong** | Companies pay software/BPO/labor to solve deductions; SupplyPike was a recurring-revenue business with ~200 acquired customers and an expected ~$25m 2025 contribution. citeturn14search0turn14search13 | Whether customers will pay a *second* vendor specifically for the residual exception layer. |
| **Residual grievance** | **Strong but not formally passed** | Current incumbent documentation exposes unresolved special processes; Campbell explicitly employs people to own escalations from Accenture/external partners. citeturn16search2turn13search0turn13search5 | Actual incumbent-user residual case volume and dollars. |
| **Residual capacity** | **C** | Category size/spending is real, but no defensible public model yet proves ≥₹4,000 crore conservative residual ARR for this narrower layer. | Account-level economics + ICP count → bottom-up model. |
| **GTM accessibility** | **Promising** | Exports and document-based analysis are practical; SPS supports deduction exports and lightweight competitors already operate from uploads. citeturn13search20turn18search1 | Paid-entry cycle, data availability and ≤10-day first measurable result. |

So my conclusion is materially different from the earlier one.

### I would not do the 100 interviews

I would also **not build a full SaaS product yet**.

I would spend founder time building exactly one narrow product loop:

> **Upload/export unresolved post-incumbent deduction exceptions → reconstruct each case from scattered evidence → distinguish recoverable from valid/unrecoverable → identify the precise missing blocker → prepare and orchestrate the next action → obtain customer approval → record the dollar outcome.**

And I would charge for it immediately.

The evidence is already strong enough to establish that:

**The economic category is real.** Customers demonstrably spend significant software, BPO and labor dollars on deduction recovery. citeturn14search0turn16search2

**Routine deduction automation is not the opportunity.** HighRadius, SPS and others already do it well. citeturn17search2turn18search0

**A residual human exception workflow demonstrably survives modern automation.** Current SPS operating documentation and Campbell's own employment requirements make that unusually concrete. citeturn13search0turn13search5turn13search8turn16search2

**At least some of the residual has structural causes**, particularly missing cross-system information, organizational handoffs, retailer-specific special processes and external authority. citeturn13search3turn13search13turn13search14

What public research cannot establish is the one thing that now matters most:

> **After competent incumbents have done their job, how many dollars per customer remain both unresolved and actually software-controllable?**

That should not be answered with 100 opinions.

It should be answered by running the first several thousand real exception cases through a **paid, minimally profitable MVP** and observing exactly where the money goes.

That is the version of Candidate A I believe is now worth spending time to build: **not another deduction-management platform, but the case-resolution intelligence layer for the difficult economic exceptions that the deduction-management platform leaves behind.**