# Feature 1.2: One-case selection — foundational principles

Recovered verbatim from the original principle breakdown in this chat; saved on 30 September 2026.

Feature 1.2 starts with a simple question: **Which exact customer subscription renewal is this check about?**

Its foundational principles should explain what must be true for the selection to be trustworthy, regardless of how the interface is built.

### 1. Every check must have one explicit subject

Analysis becomes unreliable when facts from different customers, subscriptions or renewals are mixed.

**Required behavior:** Maintain one active case. The user can clearly see its customer, subscription and renewal occurrence. Any unresolved part remains explicit.

**Test:** Can the user and the next feature independently identify the same subject?

### 2. Identity must distinguish records, not merely describe them

Customer names, product labels, seat counts and dates help people recognize records, but they can repeat or change.

**Required behavior:** Preserve source system/account and supplied customer/subscription identifiers. Keep descriptive fields alongside them. Finalize the identity rules against actual supported source formats.

**Test:** Can two customers with the same name—or two subscriptions with the same product—remain distinct?

### 3. Selection must be grounded in inspectable evidence

A user cannot reliably confirm a record when the app hides the information needed to recognize it.

**Required behavior:** Show identifying facts, their source and the original record. Preserve raw values alongside normalized display values.

**Test:** Can the user explain why this is the intended subscription using the displayed evidence?

### 4. Uncertainty must remain visible

Missing identity, conflicting rows and multiple plausible candidates cannot become certainty through a default selection.

**Required behavior:** Separate a candidate selection from a confirmed selection. Explain ambiguity and block progression when the case cannot be identified reliably.

**Test:** Does every unresolved ambiguity remain unresolved until evidence or a justified correction addresses it?

### 5. Finding a case should require the least necessary effort

Users should not have to memorize identifiers or manually inspect every row in a large export.

**Required behavior:** Support search and filtering using recognizable attributes. Show meaningful differences between candidates. Present a single candidate directly without hiding its evidence.

**Test:** Can an operator find the intended case efficiently in a representative export without founder assistance?

### 6. Confirmation applies to a specific evidence state

A confirmation becomes stale when its selected record or source changes.

**Required behavior:** Bind confirmation to the selected identity and source version. Revalidate after replacement or updates; invalidate confirmation when its material basis changes.

**Test:** Can an old confirmation ever authorize a different or changed record? It must not.

### 7. Correction must be easy and internally consistent

Selection mistakes are inevitable. Reliability depends on recovering without leaving fragments of the old case active.

**Required behavior:** Let the user change the customer or subscription. Clear incompatible dependent selections, confirmations and results together.

**Test:** After correction, does every active downstream fact belong to the corrected case?

### 8. Selection must preserve its meaning across handoff

Choosing a record establishes the subject of a check. It does not establish eligibility, correct cross-system linkage or financial coverage.

**Required behavior:** Pass the exact selected record, provenance and unresolved identity facts to the next feature. Keep selection status separate from later verdicts.

**Test:** Does the next feature receive precisely what was selected, without additional unsupported claims?

These principles produce the core completion criterion:

> **The user can identify, inspect and confirm one exact case; the application carries that same case forward, preserves uncertainty and reliably invalidates stale selections.**

Search, pagination and a selected-case card are implementation choices. The eight principles above are the contract those choices must satisfy.
