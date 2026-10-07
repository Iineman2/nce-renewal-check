# Principle 7: Every result needs a next action

Status: local QC closure revision, 30 September 2026. Policy `nce-scope-v9`. This principle governs the scope questionnaire and its normalized-CSV record preflight. It does not claim that the underlying wedge, vendor mapping, or financial outcome has been validated. Current evidence and the 96-case disposition are in `PRINCIPLE_7_QC_CLOSURE.md`.

## Expected behavior

Every result answers four questions: **What stopped or advanced this case? Where should the visitor check the relevant fact? What should they do next? What happens after they do it?** The action is specific to the first decisive blocker or unresolved fact, while all other issues remain visible. The visitor can correct an answer or supplied file and rerun the check. A positive result directs the visitor to the next evidence step without claiming coverage or financial safety.

| Result | Required action |
| --- | --- |
| Early or completed outside-scope answer | Name the first unsupported condition and source. Let the visitor edit that question. If the answer is correct, say this case is outside the release. |
| Unknown or approximate answer | Name the first fact to verify and its source. Let the visitor return directly to the relevant answer after checking it. |
| Questionnaire looks in scope | Move to record comparison for the same subscription; retain the provisional label. |
| Policy review due | Stop classification and tell the product owner to review current rules. Earlier fit results must not be reused. |
| Blank or invalid record identity | Point to the original Pax8 subscription and the subscription ID input. |
| Subscription absent or duplicated in the Pax8 file | Distinguish absent from duplicate records. Provide corrected Pax8-file recovery and an ID correction alternative; never select arbitrary duplicates. |
| Record link missing or conflicting | Point to original Pax8 and HaloPSA records and the supplied files. Require link repair or explicit original-system confirmation. |
| Conflicting claims | Direct the visitor to the first unresolved conflict. Keep resolved and other unresolved conflicts visible. |
| Known outside record condition | Name the first condition in the issue list. Direct correction of a mistaken answer or row; otherwise stop. |
| Missing or uncertain record fact | Name the first verification item and original source; provide the relevant response or file control. |
| Malformed, missing, oversized, unreadable, or timed-out input | Show the responsible file and exact error; focus that input. Keep other selected files. Cancel returns keyboard focus to the retry button; late reads cannot restore a result. |
| Technical error or unavailable repair control | Stop visibly with retry/reload guidance; do not tell the visitor to alter source facts. |
| Evidence inaccessible, unobtainable, or legitimately outside normalized mapping | Explain the authorized-source request and explicit unresolved stopping point; do not fabricate verification or a match. |
| Record claims look in scope | State that this is a provisional scope result. Direct separate live-record, signed-agreement, and billing review before any financial decision. This prototype ends here. |

The `nextAction` object has a `kind`, `source`, and `instruction`; condition or target is present when a specific answer or control applies. It supplements the full issue lists. No next action authorizes a renewal, cancellation, payment, or contractual coverage verdict.

Typed issues own routing: `code`, `condition`, `source`, `target`, `message`. Raw cells and display copy never determine the source or target. Record `issues` hold typed errors/link/verification facts; legacy string lists are presentation projections. Optional action fields are omitted when inapplicable. Answer-origin issues name the original distributor/billing system; accepted file-origin issues name the appropriate supplied vendor evidence. The primary record action precedes long provenance lists. Agreement availability is a record-form input also used by fit; its changes/reset recompute the visible completed fit without hiding record controls. History restoration and calendar/policy changes invalidate results.

## Strict quality gates

1. **Exhaustive routes:** Every early, completed questionnaire, record, policy, and input-error result has an action. No action contains an empty source, `undefined`, or `null`.
2. **Priority fidelity:** A known unsupported condition precedes unrelated uncertainty. Record identity and link issues precede conflicts; an unresolved conflict precedes lower-priority verification. The primary action points to the first issue at the active priority while all other issues stay visible.
3. **Source precision:** The action names Pax8, HaloPSA, the signed agreement, or the relevant customer/reseller arrangement as applicable. It never claims to have authenticated a supplied file.
4. **Usable repair:** In-product actions move focus to the corresponding answer, file, ID, or first unresolved conflict. A successful edit clears the old result and requires a new check. The policy and positive-record boundaries state when this prototype cannot perform the next step.
5. **No false completion:** A positive questionnaire result leads to record comparison. A positive record result ends with explicit live-record and agreement review; it does not indicate financial safety or an action cutoff.
6. **Accessible interaction:** The action and its button are keyboard reachable, focus moves to the intended control, and automated WCAG A/AA scans find no violations in the tested result states. Human screen-reader and comprehension testing remain separate gates.
7. **Regression protection:** Previous scope, source-reconciliation, date, error-priority, and economic-language behavior continues to pass after the action changes.

## Local verification and limits

`next-action.test.mjs` exercises every model result category, mixed blockers, source labels, and action changes after evidence or confirmation changes. `ui-next-action.js` exercises a complete fit-to-record path, direct edit and record focus, stale-result clearing, input repair, and first-unresolved-conflict focus. The project unit suite and browser regressions are run separately; their final counts and outcomes should be reported from the current checkout rather than inferred from this document.

`action-closure.test.mjs` adds independent action-schema/source/target assertions across 5,184 answer/date/agreement combinations, 147 early prefixes, adversarial raw source words, identity/link/outside provenance, CSV dialect/limits, file-read errors/timeouts and technical stops. The four `ui-action-*.js` scripts cover actual repaired reruns, every questionnaire unknown focus, source-field/date/reseller targets, agreement state/reset, delayed reads/cancellation, policy/history/runtime fallback, mobile enlarged text, forced colors and relevant axe states. Human tests use `PRINCIPLE_7_EXTERNAL_ACCEPTANCE.md`; they are not replaced by these checks.

No real Pax8 or HaloPSA exports are available, so native field mapping and the usefulness of these directions on actual customer files are unverified. No MSP user has completed a comprehension, keyboard, or screen-reader session. These gates cannot be satisfied with synthetic tests alone.
