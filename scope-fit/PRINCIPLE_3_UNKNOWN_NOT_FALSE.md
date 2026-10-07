# Principle 3: Unknown differs from false

## Expected behavior

Each decisive question accepts an explicit **supported**, **unsupported**, or **unknown** answer. An unanswered control is invalid input; it is not silently converted into unknown. “Within about 60 days” is a separate approximate-date state that still needs the exact renewal date.

The questionnaire sends unknown or approximate answers to a named verification task. A known unsupported answer gives the reason this release does not fit. Neither route claims financial safety or contract coverage.

The file preflight compares these answers with user-supplied, unauthenticated CSV claims:

| Questionnaire | Supplied file | Behavior |
| --- | --- | --- |
| Unknown | Known supported | Use the file claim for a **provisional** scope check and show which unknown answer it informed. |
| Unknown | Known unsupported | Show the supplied evidence's outside-scope reason, with provenance and the option to correct the file. |
| Unknown | Unknown or missing | Keep the condition unknown and name what to check in the original record. |
| Known supported | Unknown or missing | Require source verification; do not issue a positive record result from the answer alone. |
| Known unsupported | Unknown or missing | Preserve the known outside-scope answer and also disclose that the supplied file cannot verify it. |
| Known value | Contradictory known value | Block a positive result until the conflict is explicitly reviewed under principle 2. |

For the four-part commitment claim, an observed wrong product, commerce model, seat-basis, or term remains unsupported even if another component is missing. A missing component alone stays unknown. A known monthly commitment is represented as monthly rather than being collapsed into generic “other.”

“I need to find the agreement” and “I’m not sure whether an agreement exists” both require follow-up, but they produce different next actions. A supplied Pax8 row does not independently prove the MSP's reseller responsibility: a known direct-purchase answer remains outside this release, while an unknown relationship remains a verification task.

## Strict quality gates

1. Every decisive questionnaire field has an explicit unknown choice, and omitted or invalid answers are rejected.
2. All questionnaire choice combinations follow precedence: a known unsupported condition is named; otherwise unknown or approximate conditions ask for verification; only all supported claims can look in scope provisionally.
3. For distributor, billing, and commitment, all nine questionnaire/file combinations across supported, unsupported, and unknown preserve the table above.
4. Blank and documented unknown CSV tokens stay unknown. They never become “other” or a supported default.
5. A known unsupported component of a compound commitment wins over a separate missing component. Monthly and annual commitments remain distinct.
6. Exact, approximate, and unknown renewal claims have separate routes. Invalid or absent source dates cannot establish a deadline.
7. The UI visibly identifies when a supplied file informed an unknown answer and still labels that value unauthenticated.
8. Missing source data cannot erase a known unsupported answer. Contradictory known values still require explicit conflict review.
9. Identity, CSV parsing, policy expiry, and stale-state blockers from principles 1 and 2 still take precedence; a missing value cannot bypass them.
10. Browser paths remain keyboard accessible and produce no upload or persistent storage in the local prototype.

These gates validate the local rule behavior with synthetic normalized CSVs. Native vendor exports, source authenticity, agreement terms, and real MSP outcomes still require separate evidence.
