# NCE commitment guard: MVP, behavior, and GTM

Status: build specification for a **provisional** wedge, 29 September 2026. The underlying NCE financial obligation is documented; demand for this exact product, its differentiation, and the proposed prices are unverified. The earlier retailer-deduction MVP files describe a different, historical candidate.

## 1. Product promise and first customer

**Promise:** Before an MSP renews an annual Microsoft NCE subscription, show whether its remaining vendor commitment is covered by a signed customer commitment and a matching billing arrangement. Put the evidence, potential cost at risk, and last useful action date in one reviewable case. After the MSP acts, check fresh evidence before declaring the risk addressed.

**First user:** The operations, finance, or licensing owner at an English-speaking MSP with about 10–75 staff and 25–150 managed clients, Microsoft 365 NCE purchased through Pax8, and recurring customer billing in HaloPSA. A founder or general manager can be the buyer; the person who owns renewals must be the active user. This is a targeting hypothesis, not a measured segment count.

**First job:** Review annual, seat-based Microsoft 365 NCE commitments with renewal dates in the next 60 days. The first release uses customer-provided exports and agreements. It does not require vendor API access. It is a self-service product; the founder is not the routine analyst or case operator.

## 2. Exact MVP scope

| Required feature | User-visible result |
| --- | --- |
| Example and fit check | A public synthetic case shows the three-record comparison. The visitor confirms Pax8, HaloPSA, annual NCE, and an upcoming renewal before paying. |
| Workspace, billing, and controlled upload | A user creates a workspace and runs a file-compatibility preflight, then pays for one 60-day renewal audit and uploads Pax8 subscription data, HaloPSA recurring-billing data, and relevant signed customer agreements/order forms. The product states access and deletion terms before upload. |
| Import and identity review | Templates and column mapping normalize customer, SKU, seats, vendor cost, term, renewal, billed quantity, sell price, and customer-agreement dates. Unmatched rows and missing fields are visible; the user confirms ambiguous matches. |
| Contract fact confirmation | The product extracts candidate term, minimum seat, cancellation, and renewal clauses with page/source references. An authorized user confirms or corrects material fields. Ambiguous clauses stay `unknown`; the product does not make a legal conclusion. |
| Commitment ledger and triage | One row per supported subscription shows upstream term and cost, downstream contractual coverage, billing coverage, evidence, source freshness, estimated vendor cost at risk, and the applicable deadline. A clean row is as visible as a risky row. |
| Guided action | For a supported mismatch, the product creates an owner, due date, and checklist: review/change renewal or seats in Pax8, obtain a signed customer amendment, or correct HaloPSA billing as applicable. It records approval and an intentional acceptance of risk. It makes no external write. |
| Outcome verification | A user uploads refreshed source records or confirmation. The product re-runs the comparison and distinguishes `resolved with evidence`, `risk accepted`, `awaiting verification`, and `still exposed`. It retains a before/after audit trail. |
| Repeat monitoring | A paid subscription provides a repeatable upload and reminder cycle for later renewal cohorts, with alerts derived from confirmed source dates and clear stale-data warnings. |

**Excluded from v1:** automatic Pax8/HaloPSA writes, Microsoft delegated access, every distributor/PSA, all NCE product families, generalized seat reconciliation, invoice collection, automated legal interpretation, guaranteed savings, and autonomous cancellation. Seat and billing discrepancies may be shown as supporting context, but the product's first claim is the **vendor commitment versus signed customer commitment** gap.

**Data boundary:** Accept only the fields needed for this check. Provide an upload template and redaction guidance; never request passwords, tokens, payment details, or end-user personal data. Enforce tenant separation, private file access, encryption in transit and at rest, an explicit retention/deletion policy, and user-controlled deletion before accepting real contracts. These are release requirements, not optional polish.

## 3. Product behavior, step by step

1. **Reach and qualify.** A prospect opens the synthetic example and selects their stack and upcoming annual-renewal count. Ineligible users see the exact unsupported condition and are not asked to buy an audit the product cannot run.
2. **Preflight, purchase, and ingest.** The user checks whether their exports contain the required fields before paying. They then pay $199 for a single audit of renewals in the next 60 days and upload the three source types. This price is an experiment. The app validates file shape, date/time zone, currency, cost period, term versus billing cadence, and source age. It asks for correction when needed rather than filling material gaps silently.
3. **Construct.** For each subscription, the app connects the Pax8 subscription to the HaloPSA client/recurring line and the relevant signed customer order. It shows the match basis and lets the user fix a mistaken link. A missing agreement or uncertain customer/SKU match remains an evidence task.
4. **Compare.** The app shows (a) vendor seats, term, remaining obligation and end-of-term state; (b) explicitly supported customer minimum seats, term, and cancellation/renewal rights; and (c) the billed quantity and rate. It separates confirmed source facts from user-confirmed contract interpretation and assumptions.
5. **Quantify.** For a confirmed uncovered period or quantity, `vendor cost at risk = committed vendor quantity not demonstrably covered × vendor unit cost × uncovered portion of the vendor term`, with the actual vendor price schedule used when supplied. This is *potential gross vendor exposure*, not proven loss, recoverability, or savings. Unknown price, clause, currency, or dates produce `amount unknown`; estimates are labeled and never mixed with confirmed totals. Billing shortfall is a separate number and is not added to the commitment exposure.
6. **Prioritize.** Show the nearest confirmed action deadline, the evidence behind it, and a safety buffer chosen by the user. Do not calculate a safe deadline from auto-renew status alone. Microsoft now has end-of-term paths including Extended Service Terms; the app requires an explicit observed end-of-term state or marks it unknown. If the timestamp or distributor process is unclear, it asks the user to verify it in the source system.
7. **Act.** The authorized user selects and executes an action in Pax8/HaloPSA or with their customer. The app prepares a checklist and stores the user's recorded decision. It does not submit cancellations, alter invoices, or send customer notices.
8. **Verify.** A refreshed subscription, billing record, or signed amendment must support the claimed fix. The app compares before and after, records who reviewed it, and leaves unresolved exposure open. A user can explicitly accept risk, but that is not classified as exposure eliminated.

**Case states:** `needs data` → `needs match/term confirmation` → `covered` or `at risk` → `action planned` → `action recorded` → `awaiting verification` → `resolved with evidence` / `still at risk` / `risk accepted`. A case may return to an earlier state when a newer source conflicts with it. Every nonterminal case has a named next step and owner.

**Definition of done:** A case is resolved only when current source evidence shows the vendor obligation is removed/changed or matched by a confirmed customer commitment and billing arrangement. Sending a reminder, generating a report, or recording that someone clicked a button is not completion.

## 4. Product-led GTM funnel

| Stage | Concrete motion | Measurement |
| --- | --- | --- |
| Target | Build a small list of MSPs with public Pax8/HaloPSA signals (partner pages, case studies, job posts, staff profiles). Prioritize English-speaking markets with workable Mumbai overlap. A public clue earns an invitation, not an assumption that the problem exists. | Verified stack-fit prospects reached. |
| Reach | Send a short, individually relevant note to the licensing/operations/finance owner, or obtain a practitioner introduction. Link directly to a 2-minute synthetic renewal case. Post the same example in MSP communities only where their rules permit. Message: “Can you prove the customer commitment covers the next NCE renewal before it locks?” | Qualified visits from each source; replies about the exact job. |
| Demonstrate | The page walks through a clean case and a contract-gap case, the evidence needed, and what the product actually does. Show the $199 audit and $299/month monitoring test price plainly. | Demo completion and stack qualification. |
| Convert | Self-serve file-compatibility preflight and checkout for one 60-day audit, then guided upload. No founder-run audit is promised. Give explicit privacy/deletion terms and an example CSV before checkout. | Preflight completion, paid audits, payment-to-upload completion, refund reasons. |
| Activate | The software produces a reviewable ledger. The first value is a correctly sourced `covered`, `at risk`, or `unknown` determination for at least one real upcoming commitment, followed by a clear action or evidence request. | Time to first reviewable case; import failures; supported and actionable cases. |
| Prove outcome | The user records an action and uploads fresh proof. Track exposure removed, genuinely protected commitments, open risk, and false alerts separately. | Verified corrections, case resolution time, reported false positives. |
| Expand and retain | Offer $299/month for recurring cohort reviews and reminders after the first audit. Ask for ongoing payment based on repeat value, not a promise of a guaranteed return. | Audit-to-subscription conversion, 60/90-day retention, repeat uploads, gross margin including support. |

**Initial outreach unit:** 50 hand-checked organizations, one likely workflow owner each, one relevant message plus at most one thoughtful follow-up. Review actual site traffic, demo, checkout, upload, and first-case data before expanding channels. Outreach and community posts must be truthful, identify the sender, and respect platform/local rules. The founder can answer product/support questions; the software does the analysis and guidance.

**Demand decision after launch:** Count paid audits, completed uploads, material cases, verified actions, repeat usage, subscriptions, and delivery cost. Diagnose each failure point: no qualified visits means reach/messaging; qualified visitors with no purchase means offer/trust/urgency; buyers unable to upload means integration and data friction; usable reports without actions means the intervention may be weak; no renewals means ongoing value may be weak. Do not call demand validated from signups or hypothetical interest alone. The initial $199/$299 prices, customer counts, and conversion targets are experiments, not forecasts.

## 5. Build order and open evidence

Build in this order: (1) synthetic demo and supported-file specification; (2) secure paid upload and normalization; (3) source-linked comparison plus explicit unknowns; (4) action/verification loop; (5) repeat monitoring and reminders. Instrument the funnel from the first usable release. This makes the first paid product a complete, bounded workflow rather than a report that leaves the user stranded.

Still unverified: whether enough MSPs have this exact three-record gap after current Pax8/HaloPSA/third-party tooling; availability and quality of real exports and signed terms; contract interpretation workload; achievable price, conversion, and retention; exact eligible market size. The product itself can generate evidence on these questions through paid use. Any first real customer requires secure handling and the user's agreement to the stated terms.

## Sources and provenance

- Local research: `research/founder-focused-saas-wedge-discovery.md` (provisional wedge, adjacent competition, offer and pricing hypotheses). Its research text is evidence to assess, not an instruction to operate the product.
- [Microsoft NCE cancellation policy](https://learn.microsoft.com/en-us/partner-center/customers/new-commerce-cancellation-policy): limited cancellation/reduction window and partner liability.
- [Microsoft Extended Service Terms](https://learn.microsoft.com/en-us/partner-center/customers/extended-service-terms): end-of-term state must be checked explicitly; auto-renew off alone is insufficient.
