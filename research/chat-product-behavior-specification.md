# Product behavior specification (chat response)

Source: [Find SaaS Wedge](https://chatgpt.com/g/g-p-6abb5c4eb82c8191bde5e8387b57a5c5/c/6abb5c8b-847c-83e8-b25a-c1ea089d2a47), final assistant response after the user stopped the additional Deep Research run. This is a chat response, not a completed Deep Research export.

Yes. We have enough context now to define this without more research.

I’d make this the **canonical behavioral specification for the perfect product**. Later, when we design the MVP, we subtract from this while preserving one complete economic loop.

The methodology itself says the product should ultimately be designed backward from the desired economic outcome, and its output should be an economic outcome—not merely a dashboard or “AI insight.” :chatgpt-content-reference{index="0"}

# Product contract

> **For every difference between what a retailer should have paid and what it actually paid, the product determines what happened, decides what should happen next, drives the case to economic resolution, verifies the financial outcome, and prevents the same avoidable problem from recurring.**

In simpler language:

> **Every missing dollar gets explained, resolved, and—where possible—prevented from going missing again.**

That is the product.

---

# The entire product in six behaviors

### 1. OBSERVE
**Know that money is missing.**

The product continuously compares:

**What should have been paid**  
vs.  
**What was actually paid**

It connects the relevant PO, invoice, shipment, pricing agreement, promotion, receipt, remittance, deduction and payment.

Output:

> Retailer paid $73,412 less than expected.  
> Deduction detected.  
> Reason claimed: shortage.

Nothing should depend on somebody manually noticing the problem.

---

### 2. RECONSTRUCT
**Figure out what actually happened.**

The product gathers everything relevant to the transaction:

invoice, PO, pricing terms, promotion, ASN, warehouse records, bill of lading, proof of delivery, retailer receiving records, deduction codes, prior disputes, emails, contracts, retailer responses, etc.

It constructs one coherent case:

> Supplier says: 1,000 units shipped.  
> Carrier says: 1,000 delivered.  
> Retailer says: 920 received.  
> Retailer deducted: $73,412.  
> Supplier has POD supporting full delivery.  
> Retailer's receiving record conflicts with shipping evidence.

The product must explicitly distinguish:

**known facts / conflicting facts / inferred facts / missing facts.**

If something isn't known, it says so.

It never invents the missing piece.

---

### 3. DECIDE
**Determine the economically correct outcome.**

Every case must ultimately receive one of these decisions:

| Decision | Meaning |
|---|---|
| **Accept** | Retailer's deduction is legitimate |
| **Pursue** | Supplier appears entitled to the money |
| **Investigate** | Potentially recoverable, but decisive evidence is missing |
| **Wait** | An external process/event must occur before action |
| **Escalate** | Normal dispute route failed but another resolution path exists |
| **Settle / negotiate** | Economic entitlement exists but resolution requires commercial judgment |
| **Stop** | Further pursuit has negative expected value or no viable resolution path |

This is important:

**The product is not trying to maximize disputes.**

It's trying to maximize the supplier's economic outcome.

A $600 deduction requiring $900 worth of effort should probably die.

A valid $200,000 deduction should be accepted.

A highly recoverable $80,000 deduction should be pursued.

A $2 million technically valid claim that risks an important commercial relationship might go to a human decision-maker.

---

# 4. ACT
**Make the resolution happen.**

Knowing the answer isn't enough.

Suppose the system concludes:

> $73,412 is probably recoverable, but the POD is missing.

It shouldn't merely display:

> “Missing POD.”

It should determine:

> POD is owned by Logistics.  
> Carrier: XPO.  
> Shipment: #834728.  
> Logistics contact: Sarah.  
> Evidence required by: October 8.  
> Retailer dispute deadline: October 11.

Then it obtains or requests the document.

Once complete:

> Evidence package complete.  
> Recommended claim: $73,412.  
> Confidence: high.  
> Retailer submission path: X.  
> Supporting evidence attached.  
> Submit?

If authority permits, it acts automatically.

If human approval is required:

> **Approve $73,412 dispute**

The human shouldn't have to reconstruct the case themselves.

They're approving a decision the system has already made intelligible.

---

# 5. VERIFY
**Follow the money until the economics are actually finished.**

This is one of the most important behaviors.

Suppose the retailer approves the $73,412 claim.

**The case is NOT resolved.**

The product continues monitoring.

Maybe the retailer only pays $55,000.

Now:

> Claim approved: $73,412  
> Payment received: $55,000  
> Remaining: $18,412  
> Case remains open.

It continues pursuing the remainder.

Only when the money appears and is matched back to the case can the system say:

> **Recovered: $73,412**

Likewise, if the deduction was valid:

> $73,412 accepted  
> AR adjusted  
> Case economically closed.

This is what we mean by **economic finality**.

---

# 6. PREVENT
**Make sure we don't solve the same problem forever.**

Every finished case feeds a root-cause system.

Imagine the product notices:

> 143 deductions  
> $1.8M total  
> Same retailer  
> Same reason  
> Same underlying pricing mismatch.

It traces the problem upstream:

> Retailer PO price = $8.70  
> Supplier master price = $9.10  
> Promotion configuration causing mismatch.

Now the product opens a different kind of case:

> **Root cause: pricing configuration**
>
> Annual deduction exposure: ~$1.8M  
> Recommended corrective action: X  
> Owner: Revenue Management  
> Required approval: Y

After correction, it measures whether those deductions actually disappear.

So:

**recover → learn → correct → measure → prevent**

becomes a closed loop.

Eventually the system starts catching the mismatch **before the invoice goes out**:

> Warning: This invoice will likely produce a $47,000 deduction.  
> PO price conflicts with contractual price.  
> Resolve before invoicing.

That's where the product becomes genuinely transformative.

---

# The case state machine

Every deduction should have exactly one meaningful state:

**Detected**

↓  

**Reconstructing truth**

↓  

**Missing evidence** ← only if necessary

↓  

**Decision ready**

↓  

**Action ready**

↓  

**Action taken**

↓  

**Awaiting counterparty**

↓  

**Escalation / negotiation** ← only if required

↓  

**Financial outcome observed**

↓  

**Economically final**

↓  

**Root cause learned / prevention action created**

There should effectively be **no generic “Open” or “In Progress” bucket**.

Those states hide failure.

Instead:

> Waiting for POD from Logistics — Sarah — due Oct 8

is a state.

> Waiting for Walmart response — expected by Oct 17

is a state.

> Commercial decision required from VP Sales — $380K at risk — due tomorrow

is a state.

Every non-final case should answer:

**What are we waiting for? Who owns it? What happens next? By when? How much money is at risk?**

---

# What the product does vs. what humans do

This is probably the cleanest way to understand the mature product.

| Situation | Product | Human |
|---|---|---|
| Find deduction | ✓ | |
| Gather evidence | ✓ | |
| Match transactions | ✓ | |
| Reconstruct case | ✓ | |
| Determine likely validity | ✓ | |
| Calculate amount at stake | ✓ | |
| Identify missing evidence | ✓ | |
| Chase internal evidence | ✓ | |
| Determine retailer process | ✓ | |
| Watch deadlines | ✓ | |
| Prepare dispute | ✓ | |
| Submit permitted actions | ✓ | Approve initially |
| Monitor response | ✓ | |
| Handle routine denial | ✓ | |
| Match repayment | ✓ | |
| Close accounting loop | ✓ | |
| Find recurring root causes | ✓ | |
| Recommend/pre-execute prevention | ✓ | Approve consequential changes |
| Ambiguous contract interpretation | Assist | ✓ |
| Commercial negotiation | Prepare | ✓ |
| Relationship-sensitive decision | Inform | ✓ |
| Genuine strategic judgment | Inform | ✓ |

So humans aren't deduction processors anymore.

They're **decision-makers for the genuinely ambiguous or commercial 5–10%**.

Everything else disappears into the system.

---

# What happens when the system doesn't know?

This is critical.

Imagine it can't determine whether the retailer actually received the shipment.

Bad product:

> “Likely invalid deduction — 78% confidence.”

Good product:

> **Unable to determine validity.**
>
> Missing decisive fact: retailer receiving quantity.
>
> Supplier evidence establishes shipment of 1,000 units but does not establish retailer receipt.
>
> Next action: obtain carrier POD / retailer receiving record.
>
> Owner: Logistics.
>
> $86,400 remains unresolved.

Uncertainty itself becomes an actionable state.

If the evidence literally doesn't exist:

> **Economic truth cannot be established from available evidence.**

Then the system chooses the next economically sensible route—negotiation, settlement, acceptance, escalation or closure.

It does **not manufacture certainty.**

---

# Six examples define the expected behavior

| Situation | Correct product behavior |
|---|---|
| Retailer legitimately deducted $50K | Prove deduction is valid → accept → close |
| Retailer deducted $80K shortage, POD proves delivery | Build evidence → pursue → monitor → recover → verify cash |
| POD missing | Locate/request POD → resume automatically when received |
| First dispute denied but escalation exists | Understand denial → assemble missing evidence → escalate |
| $300 deduction requires hours of work | Calculate negative expected value → stop |
| Same pricing error caused $2M of deductions | Resolve existing cases → identify root cause → correct upstream process → verify recurrence falls |

That table is essentially the product philosophy.

---

# The most important concept: the product owns the case

This changes everything.

Today, software often assists humans who own deduction cases.

Our perfect product should invert that.

> **The software owns every case. Humans are resources the software calls when necessary.**

If it needs Logistics:

**Product → Logistics**

If it needs Finance approval:

**Product → Controller**

If it needs Sales:

**Product → Account Manager**

If it needs the retailer:

**Product → retailer process**

If it needs to wait seven days:

**Product waits and wakes itself up.**

Nobody has to remember that case #18472 exists.

That's what makes this an autonomous economic workflow rather than a copilot.

---

# What the user should actually experience

Ideally, very little.

The Finance leader shouldn't arrive every morning and work through a dashboard of 600 cases.

The system works continuously.

Their inbox might contain:

> **3 decisions need you today**
>
> **$480K — Commercial judgment required**  
> Walmart owes $480K based on available evidence. Escalation requires buyer involvement. Relationship context required.
>
> **$220K — Settlement decision**  
> Retailer offered $170K. Expected recovery from continued pursuit: $205–220K.
>
> **$1.4M/year — Prevention approval**  
> Repeated promotion configuration error identified. Proposed correction attached.

Everything else happens without them.

Then periodically:

> $8.2M deductions processed  
> $5.1M correctly accepted  
> $2.8M recovered  
> $180K actively resolving  
> $120K commercially settled  
> $1.6M future deductions prevented  
> $0 unexplained

**That's the user experience we're aiming for.**

---

# Non-negotiable product rules

1. **Never leave money unexplained.** Every discrepancy must have a known state or explicit unknown.
2. **Never confuse a deduction with an invalid deduction.** The retailer may be right.
3. **Never optimize for dispute volume.** Optimize for net economic outcome.
4. **Never invent evidence or hide uncertainty.**
5. **Every conclusion must be traceable to evidence.**
6. **Every non-final case must have a next action, owner and timing condition.**
7. **Never let a case silently age.**
8. **Never call submission “resolution.”**
9. **Never call approval “recovery.”**
10. **Never call money recovered until the financial outcome is observed and matched.**
11. **Humans should only be invoked when information, authority or genuine judgment requires them.**
12. **Every completed case must teach the system something about root cause.**
13. **Recurring causes must become prevention problems, not endless recovery work.**
14. **The system should progressively move intervention earlier—from recovery → resolution → prevention → pre-transaction correction.**
15. **The ultimate metric is not cases processed. It is economically correct dollars retained/recovered and preventable leakage eliminated.**

---

## The whole product on one page

If I had to hand a product team only this, I'd give them:

> ### INPUT
> Everything necessary to understand what the supplier was entitled to receive and what actually happened.
>
> ↓
>
> ### UNDERSTAND
> **What happened?**
>
> ↓
>
> ### JUDGE
> **Who is economically right?**
>
> ↓
>
> ### DECIDE
> **What is the highest-value next action?**
>
> ↓
>
> ### EXECUTE
> **Make that action happen.**
>
> ↓
>
> ### FOLLOW THROUGH
> **Don't stop until the financial result occurs.**
>
> ↓
>
> ### VERIFY
> **Did the supplier actually receive/retain the correct money?**
>
> ↓
>
> ### LEARN
> **Why did this happen?**
>
> ↓
>
> ### PREVENT
> **Stop it from happening again.**

And that gives us a very useful definition of **“done”:**

> **A deduction is not done when it has been analyzed, disputed, approved, or assigned. It is done only when the economically correct financial outcome has occurred and been verified.**

I think that's the key product insight we should preserve when we now work backward to the **minimum complete outcome loop**. The MVP can be dramatically smaller than this perfect product, but it shouldn't violate this behavioral philosophy.

