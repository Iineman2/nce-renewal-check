# Pax8–HaloPSA buyer reach audit — 29 September 2026

## Question and result

Can a solo founder find named MSPs using both Pax8 and HaloPSA, identify likely buyers, and count the full intersection?

**Observed result:** Public sources identify **six named organizations with explicit current or recent evidence for both tools**. Four look like plausible prospect companies and two have built adjacent software themselves. A fifth plausible prospect lists both as technology partners, but the logos do not prove active use. One additional company has a named manager and self-reported dual use from a 2022 review; current use is unverified. This is a targeted-search sample, **not a census or representative sample**. Annual NCE commitment volume and the exact contract-to-vendor gap are unverified at every organization.

**Population data:** [Pax8 reported 47,000+ global partners](https://www.pax8.com/blog/pax8-2025-year-in-review/). [Bloomberry detects 1,409 HaloPSA companies](https://bloomberry.com/data/halopsa/) as of 25 September 2026 using public URL/certificate signals; this is a detected subset, not all HaloPSA customers. Neither source publishes the overlap or annual-NCE filter. Therefore no defensible full-intersection count or extrapolation follows from these data alone.

## Named-account evidence

| Company | Evidence of both tools | Public role holder | Qualification and limits |
| --- | --- | --- | --- |
| [Cymax](https://usehalo.com/case-studies/cymax/) (Australia) | Halo case study says Cymax went live with Halo and uses a Pax8 integration. | [Sean Dendle, CEO](https://cymax.com.au/about-us/). | Named MSP and decision maker. NCE annual volume, contract workflow, and unmet problem unknown. |
| [AOIT Networks](https://www.aoitnetworks.com/legal-repository/privacy-policy/) (UK) | Its current privacy policy names HaloPSA and Pax8 as key subprocessors. | [Andrew Oliver, managing director](https://www.aoitnetworks.com/about/our-jedi-commitment/). | Direct company disclosure, but no proof of annual NCE use or purchase authority for this software. |
| [Cyber One Solutions](https://www.cyberonesol.com/about-ourtechnology/) (US) | Its published operating stack says it uses HaloPSA and Pax8. | [Brian Carrico, CEO; Cody Carrico, COO](https://www.cyberonesol.com/about-team/). | Named MSP and leadership. Company does not disclose whether the proposed gap exists. |
| [ECS Technology Solutions](https://www.ecs.rocks/security) (US) | Its security inventory names HaloPSA as core PSA and Pax8 for client M365 procurement. | No named finance/licensing buyer confirmed from reviewed sources. | Strong stack evidence; exact size and decision owner still to verify. |
| [Gamma Tech Services / GTools](https://gtools.io/) (US) | Its own software page says its MSP runs HaloPSA and Pax8. | [Bradd Konert, founder](https://www.gammatechservices.com/about/). | **Exclude from ordinary sales list:** it already built billing reconciliation software that can extract contract pricing. Strong contrary signal for differentiation. |
| [TechPulse Cloud Concepts](https://www.techpulsecloud.com/about-techpulse-cloud-concepts/) (US) | Says its internal tool processed Pax8 invoices into HaloPSA and became BillingBot. | Not screened. | **Exclude from ordinary sales list:** adjacent product vendor and integration expert. |

### Weaker or historical signals

| Company | Signal | Treatment |
| --- | --- | --- |
| [AssurITy Solutions](https://assurity.solutions/) (US) | Current website displays both HaloPSA and Pax8 as technology partners; [Greg Morris, CEO, and Blake Morris, operations manager](https://assurity.solutions/about) are named. | Plausible prospect, but logos do not prove both products are active in its internal billing workflow. |
| [Prizm Document & Technology Solutions](https://www.trustradius.com/reviews/n-able-passportal-2022-08-22-14-51-19) (US) | Steve Bailey, Director of Managed Services, listed HaloPSA and Pax8 among software used in a vetted review. | Strong historical self-report, but dated 2022; current stack and role need recheck. |

## What the audit proves and does not prove

- **Proves:** Named dual-stack organizations and some publicly named senior operators can be found remotely. Four current/recent strong-stack accounts are plausible direct prospects: Cymax, AOIT, Cyber One, and ECS. AssurITy is a weaker fifth lead.
- **Does not prove:** Full Pax8–HaloPSA intersection count, annual NCE volume, problem incidence, decision authority, contactability through a particular channel, reply rate, trust in uploading contracts, payment, or retention.
- **Competitive correction:** Gamma's existing tool goes beyond simple seat matching and describes contract-price extraction. This does not establish full NCE commitment-versus-signed-term coverage, but it weakens any claim that the contract layer is unoccupied.

## Way to get a real intersection count

The highest-quality route is a **vendor-owned aggregate query**: one of Pax8 or HaloPSA would count active organizations using the HaloPSA–Pax8 integration, deduplicate account IDs, and report how many have annual Microsoft NCE subscriptions. A safe response can be aggregate only; it need not disclose private customer records. This requires vendor cooperation and cannot be obtained from public websites.

The practical independent route is a licensed technographic dataset with both product-use fields and transparent coverage. Query `(HaloPSA active) AND (Pax8 active)`, restrict to MSPs/geographies/size, then manually validate a random sample of positives and negatives. Ask the data provider for its definition of active use and coverage, because a public website mention can miss quiet users and can include inactive partners. [Bloomberry](https://bloomberry.com/data/halopsa/) offers one detected HaloPSA population but does not expose the requested cross-tab on its public page. [Enlyft](https://enlyft.com/) describes a partner-intelligence database; the exact overlap result was not available publicly in this audit.

Until either route produces a count, the prior 940–3,760 SAM buyers figure is an **illustrative assumption**, not a measured overlap. There is no defensible way to infer the true total by multiplying the six search hits by a web-search coverage factor.

## Outreach and payment evidence status

No messages were sent and no prospect was contacted in this audit. Therefore response rate is `not measured`. No product checkout or contract-upload flow exists in this repository, so buyer trust, file completion, and willingness to pay are `not measured`. Once a functioning offer exists, instrument each stage separately; public reachability is not the same as sales conversion.
