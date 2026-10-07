# Principle 7 QC closure

Verified local implementation revision: 30 September 2026, policy `nce-scope-v9`.

## Outcome

The six reproduced v8 defect families and null-action schema mismatch are fixed. No known substantive local defect remains after independent correctness/maintainability review and the final model/browser runs. This is a bounded local acceptance result, not a claim that every arbitrary environment, future change or real customer outcome passes.

Implemented: typed cause/source/target routing; correct-file and duplicate/missing-row recovery; both-source link repair; direct record outside correction; retained early answered uncertainty; consistent agreement/reset dependencies; explicit unavailable-evidence/mapping stops; leading next action; bounded local reads/cancel/retry; visible technical fallback; date/policy/history invalidation; module/unsupported-API startup fallback; enlarged-text/mobile reflow.

## Verification receipts

- **91/91 unit tests**, including 5,184 independent action combinations, 147 early prefixes, all original model regressions, source-word attacks, provenance targets, CSV dialect/limits and bounded read failures. See `../output/principle-7-audit/final-unit.txt`.
- **16/16 browser scripts** in fresh sessions. See `../output/principle-7-audit/final-browser/summary.json` and individual receipts. The runner rejects CLI error blocks even when the CLI exit code is zero.
- **39 focused repair/target scenarios**: 23 in `ui-action-closure.js`, 16 in `ui-action-targets.js`, plus lifecycle/policy and original regression paths. These counts are scenarios inside scripts, not additional test files.
- **Zero axe A/AA violations in tested states**; focused closure includes ten axe states, enlarged-text 320-pixel reflow and forced colors. Policy and existing regression scans also pass. This is not human accessibility acceptance.
- Syntax and explicit whitespace receipts are in `../output/principle-7-audit/final-syntax.txt` and `final-whitespace.txt`. Because workspace source is untracked, git diff --check alone is not changed-file coverage.
- Independent PRE and POST reviews found additional original-source wording/cancel-focus issues; both were fixed. Reviewer independently passed 12/12 focused model tests and found no remaining substantive local implementation defect. Review scope: model/source correctness and maintainability; browser evidence comes from the saved receipts.

Screenshots: `../output/playwright/principle-7-recovery-mobile.png` and `principle-7-next-action.png`. A final visual check corrected obsolete "above" references after the action was moved before the issue list; affected browser paths were rerun.

## Evidence boundaries

Every historical audit case below has a local guard/regression or an explicit prototype stopping boundary. **External pending does not mean passed.** Local stop/help is testable; actual vendor access, native mapping, authenticity/freshness, active billing, signed terms, manual keyboard/screen-reader usability, comprehension and actual customer outcomes require external evidence. The finite acceptance protocol is `PRINCIPLE_7_EXTERNAL_ACCEPTANCE.md`.

The table records where representative regression/source evidence lives; it does not claim every possible cross-product was browser-tested. Specific classification/priority combinations are exhaustive only within the declared 5,184 answer/date/agreement and 147 early-prefix sets. Original audit findings are retained as historical evidence in `PRINCIPLE_7_FAILURE_AUDIT.md`.

## All 96 audit case dispositions

| Case | Local evidence | External remainder |
| --- | --- | --- |
| A01 | actions.mjs schema; action-closure.test.mjs; ui-next-action.js; ui-action-policy.js | None for this bounded local cause. |
| A02 | actions.mjs schema; action-closure.test.mjs; ui-next-action.js; ui-action-policy.js | None for this bounded local cause. |
| A03 | actions.mjs schema; action-closure.test.mjs; ui-next-action.js; ui-action-policy.js | None for this bounded local cause. |
| A04 | actions.mjs schema; action-closure.test.mjs; ui-next-action.js; ui-action-policy.js | None for this bounded local cause. |
| A05 | actions.mjs schema; action-closure.test.mjs; ui-next-action.js; ui-action-policy.js | None for this bounded local cause. |
| A06 | actions.mjs schema; action-closure.test.mjs; ui-next-action.js; ui-action-policy.js | None for this bounded local cause. |
| A07 | actions.mjs schema; action-closure.test.mjs; ui-next-action.js; ui-action-policy.js | Actual user understanding of financial/prototype boundaries requires task-based comprehension. |
| A08 | actions.mjs schema; action-closure.test.mjs; ui-next-action.js; ui-action-policy.js | None for this bounded local cause. |
| B01 | action-closure.test.mjs (5184 combinations/147 prefixes); ui-action-targets.js; ui-minimum-recovery.js; ui-freshness.js | None for this bounded local cause. |
| B02 | action-closure.test.mjs (5184 combinations/147 prefixes); ui-action-targets.js; ui-minimum-recovery.js; ui-freshness.js | None for this bounded local cause. |
| B03 | action-closure.test.mjs (5184 combinations/147 prefixes); ui-action-targets.js; ui-minimum-recovery.js; ui-freshness.js | None for this bounded local cause. |
| B04 | action-closure.test.mjs (5184 combinations/147 prefixes); ui-action-targets.js; ui-minimum-recovery.js; ui-freshness.js | None for this bounded local cause. |
| B05 | action-closure.test.mjs (5184 combinations/147 prefixes); ui-action-targets.js; ui-minimum-recovery.js; ui-freshness.js | None for this bounded local cause. |
| B06 | action-closure.test.mjs (5184 combinations/147 prefixes); ui-action-targets.js; ui-minimum-recovery.js; ui-freshness.js | None for this bounded local cause. |
| B07 | action-closure.test.mjs (5184 combinations/147 prefixes); ui-action-targets.js; ui-minimum-recovery.js; ui-freshness.js | None for this bounded local cause. |
| B08 | action-closure.test.mjs (5184 combinations/147 prefixes); ui-action-targets.js; ui-minimum-recovery.js; ui-freshness.js | None for this bounded local cause. |
| B09 | action-closure.test.mjs (5184 combinations/147 prefixes); ui-action-targets.js; ui-minimum-recovery.js; ui-freshness.js | Actual vendor cutoff/time-zone interpretation is not computed or authenticated. |
| B10 | action-closure.test.mjs (5184 combinations/147 prefixes); ui-action-targets.js; ui-minimum-recovery.js; ui-freshness.js | None for this bounded local cause. |
| B11 | action-closure.test.mjs (5184 combinations/147 prefixes); ui-action-targets.js; ui-minimum-recovery.js; ui-freshness.js | None for this bounded local cause. |
| B12 | action-closure.test.mjs (5184 combinations/147 prefixes); ui-action-targets.js; ui-minimum-recovery.js; ui-freshness.js | None for this bounded local cause. |
| C01 | preflight.mjs typed identity/link issues; action-closure.test.mjs; ui-action-closure.js | None for this bounded local cause. |
| C02 | preflight.mjs typed identity/link issues; action-closure.test.mjs; ui-action-closure.js | None for this bounded local cause. |
| C03 | preflight.mjs typed identity/link issues; action-closure.test.mjs; ui-action-closure.js | None for this bounded local cause. |
| C04 | preflight.mjs typed identity/link issues; action-closure.test.mjs; ui-action-closure.js | None for this bounded local cause. |
| C05 | preflight.mjs typed identity/link issues; action-closure.test.mjs; ui-action-closure.js | None for this bounded local cause. |
| C06 | preflight.mjs typed identity/link issues; action-closure.test.mjs; ui-action-closure.js | None for this bounded local cause. |
| C07 | preflight.mjs typed identity/link issues; action-closure.test.mjs; ui-action-closure.js | None for this bounded local cause. |
| C08 | preflight.mjs typed identity/link issues; action-closure.test.mjs; ui-action-closure.js | None for this bounded local cause. |
| C09 | preflight.mjs typed identity/link issues; action-closure.test.mjs; ui-action-closure.js | The actual truth of original-system confirmation remains self-reported. |
| C10 | preflight.mjs typed identity/link issues; action-closure.test.mjs; ui-action-closure.js | Real legitimate multi-line/different-ID mappings need native evidence; prototype explicitly stops. |
| D01 | typed issue/provenance routing; next-action.test.mjs; preflight.test.mjs; ui-next-action.js; ui-action-closure.js | None for this bounded local cause. |
| D02 | typed issue/provenance routing; next-action.test.mjs; preflight.test.mjs; ui-next-action.js; ui-action-closure.js | None for this bounded local cause. |
| D03 | typed issue/provenance routing; next-action.test.mjs; preflight.test.mjs; ui-next-action.js; ui-action-closure.js | None for this bounded local cause. |
| D04 | typed issue/provenance routing; next-action.test.mjs; preflight.test.mjs; ui-next-action.js; ui-action-closure.js | None for this bounded local cause. |
| D05 | typed issue/provenance routing; next-action.test.mjs; preflight.test.mjs; ui-next-action.js; ui-action-closure.js | None for this bounded local cause. |
| D06 | typed issue/provenance routing; next-action.test.mjs; preflight.test.mjs; ui-next-action.js; ui-action-closure.js | None for this bounded local cause. |
| D07 | typed issue/provenance routing; next-action.test.mjs; preflight.test.mjs; ui-next-action.js; ui-action-closure.js | None for this bounded local cause. |
| D08 | typed issue/provenance routing; next-action.test.mjs; preflight.test.mjs; ui-next-action.js; ui-action-closure.js | None for this bounded local cause. |
| D09 | typed issue/provenance routing; next-action.test.mjs; preflight.test.mjs; ui-next-action.js; ui-action-closure.js | None for this bounded local cause. |
| D10 | typed issue/provenance routing; next-action.test.mjs; preflight.test.mjs; ui-next-action.js; ui-action-closure.js | Authenticity and correctness of a source choice require independent original-system evidence. |
| E01 | preflight.test.mjs; action-closure.test.mjs; ui-action-targets.js; ui-economic-edge.js; ui-action-closure.js | None for this bounded local cause. |
| E02 | preflight.test.mjs; action-closure.test.mjs; ui-action-targets.js; ui-economic-edge.js; ui-action-closure.js | None for this bounded local cause. |
| E03 | preflight.test.mjs; action-closure.test.mjs; ui-action-targets.js; ui-economic-edge.js; ui-action-closure.js | None for this bounded local cause. |
| E04 | preflight.test.mjs; action-closure.test.mjs; ui-action-targets.js; ui-economic-edge.js; ui-action-closure.js | None for this bounded local cause. |
| E05 | preflight.test.mjs; action-closure.test.mjs; ui-action-targets.js; ui-economic-edge.js; ui-action-closure.js | None for this bounded local cause. |
| E06 | preflight.test.mjs; action-closure.test.mjs; ui-action-targets.js; ui-economic-edge.js; ui-action-closure.js | None for this bounded local cause. |
| E07 | preflight.test.mjs; action-closure.test.mjs; ui-action-targets.js; ui-economic-edge.js; ui-action-closure.js | None for this bounded local cause. |
| E08 | preflight.test.mjs; action-closure.test.mjs; ui-action-targets.js; ui-economic-edge.js; ui-action-closure.js | None for this bounded local cause. |
| E09 | preflight.test.mjs; action-closure.test.mjs; ui-action-targets.js; ui-economic-edge.js; ui-action-closure.js | None for this bounded local cause. |
| E10 | preflight.test.mjs; action-closure.test.mjs; ui-action-targets.js; ui-economic-edge.js; ui-action-closure.js | Signed clauses, signatures, correct subscription/seats/term and freshness require separate agreement review. |
| E11 | preflight.test.mjs; action-closure.test.mjs; ui-action-targets.js; ui-economic-edge.js; ui-action-closure.js | Actual availability/access and escalation usefulness require an authorized operator; unavailable-source stop is implemented. |
| E12 | preflight.test.mjs; action-closure.test.mjs; ui-action-targets.js; ui-economic-edge.js; ui-action-closure.js | None for this bounded local cause. |
| F01 | InputProblem/readLocalFile; action-closure.test.mjs; ui-action-lifecycle.js; ui-action-closure.js | None for this bounded local cause. |
| F02 | InputProblem/readLocalFile; action-closure.test.mjs; ui-action-lifecycle.js; ui-action-closure.js | None for this bounded local cause. |
| F03 | InputProblem/readLocalFile; action-closure.test.mjs; ui-action-lifecycle.js; ui-action-closure.js | None for this bounded local cause. |
| F04 | InputProblem/readLocalFile; action-closure.test.mjs; ui-action-lifecycle.js; ui-action-closure.js | None for this bounded local cause. |
| F05 | InputProblem/readLocalFile; action-closure.test.mjs; ui-action-lifecycle.js; ui-action-closure.js | None for this bounded local cause. |
| F06 | InputProblem/readLocalFile; action-closure.test.mjs; ui-action-lifecycle.js; ui-action-closure.js | Native formats/export mapping remain unsupported; normalized-format rejection and stop are locally verified. |
| F07 | InputProblem/readLocalFile; action-closure.test.mjs; ui-action-lifecycle.js; ui-action-closure.js | None for this bounded local cause. |
| F08 | InputProblem/readLocalFile; action-closure.test.mjs; ui-action-lifecycle.js; ui-action-closure.js | None for this bounded local cause. |
| F09 | InputProblem/readLocalFile; action-closure.test.mjs; ui-action-lifecycle.js; ui-action-closure.js | None for this bounded local cause. |
| F10 | InputProblem/readLocalFile; action-closure.test.mjs; ui-action-lifecycle.js; ui-action-closure.js | None for this bounded local cause. |
| G01 | run tokens/dependency refresh/date/history guards; ui-action-lifecycle.js; ui-action-policy.js; ui-race.js; ui-freshness.js | None for this bounded local cause. |
| G02 | run tokens/dependency refresh/date/history guards; ui-action-lifecycle.js; ui-action-policy.js; ui-race.js; ui-freshness.js | None for this bounded local cause. |
| G03 | run tokens/dependency refresh/date/history guards; ui-action-lifecycle.js; ui-action-policy.js; ui-race.js; ui-freshness.js | None for this bounded local cause. |
| G04 | run tokens/dependency refresh/date/history guards; ui-action-lifecycle.js; ui-action-policy.js; ui-race.js; ui-freshness.js | None for this bounded local cause. |
| G05 | run tokens/dependency refresh/date/history guards; ui-action-lifecycle.js; ui-action-policy.js; ui-race.js; ui-freshness.js | None for this bounded local cause. |
| G06 | run tokens/dependency refresh/date/history guards; ui-action-lifecycle.js; ui-action-policy.js; ui-race.js; ui-freshness.js | None for this bounded local cause. |
| G07 | run tokens/dependency refresh/date/history guards; ui-action-lifecycle.js; ui-action-policy.js; ui-race.js; ui-freshness.js | None for this bounded local cause. |
| G08 | run tokens/dependency refresh/date/history guards; ui-action-lifecycle.js; ui-action-policy.js; ui-race.js; ui-freshness.js | Authoritative clock/vendor time zone is not available; local-date and no-cutoff boundaries remain explicit. |
| G09 | run tokens/dependency refresh/date/history guards; ui-action-lifecycle.js; ui-action-policy.js; ui-race.js; ui-freshness.js | Same-day external source changes cannot be observed without authenticated source freshness. |
| G10 | run tokens/dependency refresh/date/history guards; ui-action-lifecycle.js; ui-action-policy.js; ui-race.js; ui-freshness.js | Reload and persisted-history handler are tested; all browser restore/multi-tab/platform behaviors are not universally established. |
| H01 | leading action region and strict focus targets; ui-action-closure.js; ui-action-lifecycle.js; ui-a11y.js; ui-action-policy.js | None for this bounded local cause. |
| H02 | leading action region and strict focus targets; ui-action-closure.js; ui-action-lifecycle.js; ui-a11y.js; ui-action-policy.js | None for this bounded local cause. |
| H03 | leading action region and strict focus targets; ui-action-closure.js; ui-action-lifecycle.js; ui-a11y.js; ui-action-policy.js | None for this bounded local cause. |
| H04 | leading action region and strict focus targets; ui-action-closure.js; ui-action-lifecycle.js; ui-a11y.js; ui-action-policy.js | Automated keyboard/focus paths pass; an actual MSP keyboard-only acceptance session is pending. |
| H05 | leading action region and strict focus targets; ui-action-closure.js; ui-action-lifecycle.js; ui-a11y.js; ui-action-policy.js | No human screen-reader session exists. Automated axe does not prove announcements/comprehension. |
| H06 | leading action region and strict focus targets; ui-action-closure.js; ui-action-lifecycle.js; ui-a11y.js; ui-action-policy.js | 320/375-pixel, enlarged-text and forced-colors simulations pass; actual device/assistive technology acceptance is pending. |
| H07 | leading action region and strict focus targets; ui-action-closure.js; ui-action-lifecycle.js; ui-a11y.js; ui-action-policy.js | Module/missing-API fallback and current engine tested; universal browser/device compatibility is not claimed. |
| H08 | leading action region and strict focus targets; ui-action-closure.js; ui-action-lifecycle.js; ui-a11y.js; ui-action-policy.js | User interpretation of correction versus editing inconvenient facts requires task-based comprehension. |
| I01 | explicit prototype stop/source help; ui-action-closure.js; ui-action-policy.js; POLICY.md; external acceptance protocol | Real authorized access and role constraints not available; inaccessible-evidence guidance/stop is implemented. |
| I02 | explicit prototype stop/source help; ui-action-closure.js; ui-action-policy.js; POLICY.md; external acceptance protocol | Actual vendor navigation, tenant roles/locales and current vendor rules have not been authenticated. |
| I03 | explicit prototype stop/source help; ui-action-closure.js; ui-action-policy.js; POLICY.md; external acceptance protocol | No native vendor exports are available; do not assert a tested adapter. |
| I04 | explicit prototype stop/source help; ui-action-closure.js; ui-action-policy.js; POLICY.md; external acceptance protocol | Supplied-file freshness, authenticity, tenant and export-date provenance remain external. |
| I05 | explicit prototype stop/source help; ui-action-closure.js; ui-action-policy.js; POLICY.md; external acceptance protocol | Active billing reality cannot be established by the supplied billing_system column. |
| I06 | explicit prototype stop/source help; ui-action-closure.js; ui-action-policy.js; POLICY.md; external acceptance protocol | Separate downstream agreement/billing review is not a completed self-service product stage; explicit stop passes locally. |
| I07 | explicit prototype stop/source help; ui-action-closure.js; ui-action-policy.js; POLICY.md; external acceptance protocol | Date expiry/owner stop pass locally; rule changes and current documentation review require owner evidence. |
| I08 | explicit prototype stop/source help; ui-action-closure.js; ui-action-policy.js; POLICY.md; external acceptance protocol | Legal interpretation, exposure, safe deadlines and financial action remain outside this prototype. |
| J01 | full receipts; independent review; action-schema/semantic regressions; fresh-session runner; source/whitespace checks | None for this bounded local cause. |
| J02 | full receipts; independent review; action-schema/semantic regressions; fresh-session runner; source/whitespace checks | None for this bounded local cause. |
| J03 | full receipts; independent review; action-schema/semantic regressions; fresh-session runner; source/whitespace checks | None for this bounded local cause. |
| J04 | full receipts; independent review; action-schema/semantic regressions; fresh-session runner; source/whitespace checks | None for this bounded local cause. |
| J05 | full receipts; independent review; action-schema/semantic regressions; fresh-session runner; source/whitespace checks | Session isolation verified; actual native vendor fixtures remain unavailable. |
| J06 | full receipts; independent review; action-schema/semantic regressions; fresh-session runner; source/whitespace checks | Human keyboard/screen-reader/comprehension acceptance remains pending. |
| J07 | full receipts; independent review; action-schema/semantic regressions; fresh-session runner; source/whitespace checks | None for this bounded local cause. |
| J08 | full receipts; independent review; action-schema/semantic regressions; fresh-session runner; source/whitespace checks | No production acceptance, demand, willingness-to-pay or adoption is established by synthetic checks. |
