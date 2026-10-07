# Principle 8: Source of truth follows

Expected behavior defined 30 September 2026. This is the eighth saved principle for feature 1.1, the scope questionnaire. It extends the existing reconciliation path, not the product's later contract/financial analysis or native vendor integrations.

## Expected behavior

The questionnaire collects provisional claims. Record comparison may support, challenge, or leave those claims unresolved. The visitor must be able to see the original response, the supplied source claim, the deliberate review choice, and the effective value that this check actually used. Source-specific evidence may correct the current check without silently rewriting the original response. Neither matching CSV values nor a human link/review choice establishes authenticated truth.

| Situation | Required behavior |
| --- | --- |
| Questionnaire complete or early exit | Carry a detached immutable snapshot of the responses considered in that check. Preserve unknown, approximate and unasked states; earlier stored responses beyond an early-exit prefix are not used. |
| No usable identity, invalid link, or pending link confirmation | Show the comparison/identity stopping point; do not describe candidate file claims as a completed reconciled result. |
| Answer agrees with known file claim | Show that the current check uses a supplied CSV claim; agreement is not independent authentication. |
| Unknown/approximate answer informed by known file claim | Show the changed effective value and source while keeping the original answer visible and unchanged. |
| Unknown/unrecognized supplied claim | Show the missing source evidence. Supported answers cannot fill that evidence gap; known outside answers can still route outside from self-report. |
| Unresolved conflict | Show no usable value for that conflicted fact in the effective classifier input; positive result blocked. |
| Accept supplied file value | Record that choice for this check and exact case basis. Show original, source and effective value; never relabel it verified. |
| Keep own answer | Preserve the original claim but require corrected evidence. Effective conflicted value remains unknown until discrepancy is repaired. |
| Economic-context inconsistency | The visible effective commitment must include the rule's uncertainty override, even when a file value was accepted. Show the context issue separately. |
| Reseller responsibility/agreement availability/next-term response | Retain self-report origin. CSVs do not prove reseller liability, signed terms, active billing or the next term's authoritative state. Scheduled source context can challenge a next-term response; current term does not substitute for it. |
| Date, policy, answer, file, ID, next term or agreement changes | Remove obsolete claim trails and review choices under the existing invalidation contract. A rerun creates a new detached snapshot. |
| Provisional record result | Show actual scope inputs plus identity/link, end state, next-term and economic-context contributors. Explicitly stop before vendor authenticity, freshness, agreement interpretation, financial action or deadlines. |

The decision functions own values and origin changes. `claimReview` is a read-only projection captured from those exact inputs and merge branches; it is not another decision engine. Original responses, supplied values and effective values remain distinguishable. Review basis binds the snapshot to exact selected evidence, responses, check date and policy; it is not a cryptographic attestation or full event history.

`scopeInputs` retains the exact input object supplied to the existing rules, including an inactive date if a caller retained one. The field trace separately marks that date not assessed when renewal is unknown or approximate; it must not appear to have been evaluated. Conflict-cleared dates are unknown rather than unasked. The existing end-state branch supplies known/unknown/unrecognized states to the trace; the projection does not classify those tokens again.

## Very strict local quality gates

1. **Single owner:** existing fit/preflight rules classify. No copy-based or second-engine inference may invent the effective value or its source.
2. **Exact carry:** questionnaire snapshots preserve each considered input, original response and unknown/approximate/unasked state. Excluded early-exit fields never inform the result.
3. **Exact effective inputs:** record snapshots match the exact `evaluateFit(merged)` inputs and the record contributors outside that function. Every field has an origin and stable reason for its effective value.
4. **Every reconciliation branch:** agreement, informed unknown, unavailable source, retained known false, unresolved conflict, accept-file, keep-answer, corrected evidence and economic override have independent expected-value/source assertions.
5. **Trust cannot escalate:** every snapshot and field remains unauthenticated. Link confirmation is self-attestation. Agreement availability is not agreement terms; Halo system label is not active billing; a date is not a cutoff.
6. **Identity before reliance:** missing/duplicate identity, unusable links and pending confirmation cannot expose a completed preflight interpretation or reuse review decisions across cases.
7. **Immutable originals:** functions do not modify inputs. Later caller mutation cannot change an earlier snapshot; snapshots are recursively immutable. No record choice silently changes questionnaire controls.
8. **Freshness and invalidation:** answer/file/ID/next-term/agreement edits, clear/reset, cancelled/delayed reads, local date, policy expiry and history restoration remove obsolete traces. Changed raw cells with the same derived value invalidate a bound choice.
9. **Accessible safe output:** claim-trail controls and labels work with keyboard; text renders safely, fits mobile/enlarged text and passes axe A/AA in tested states. The primary next action remains easy to reach.
10. **Data restraint:** no upload, authentication request, persistence, account/contact/contract intake, export or financial action is added. Snapshots live only in memory and the rendered check.
11. **Regression:** all earlier principle model/browser checks remain passing. Current source syntax and changed/untracked-file whitespace checks pass; save actual receipts.
12. **Independent review:** PRE architecture and POST correctness/maintainability review find no material open local defect; browser evidence demonstrates corrected results with original answers preserved.

## External gates remain separate

No real exports are available. Native field mapping, actual vendor authenticity/freshness/roles, active billing, signed clause interpretation, authoritative deadlines, MSP comprehension and human screen-reader acceptance cannot be proven by this projection. Follow the finite protocol in `PRINCIPLE_7_EXTERNAL_ACCEPTANCE.md`. Do not report those gates as passed or infer demand from local tests.

## Strict closure contract (policy v11)

The canonical plain-data boundary, decoded raw-cell definition, mandatory projection schema, live-control checks, print and sharing limits, complete source-bound QC and per-case dispositions are specified in `PRINCIPLE_8_QC_FINAL.md`. That contract supersedes the permissive v10 snapshot/raw/render/QC paths. Native/authenticated/human gates above remain pending.
