# Feature 1.2 Principle 8: selection preserves meaning across handoff

The downstream record check receives a versioned immutable handoff containing the exact canonical selection review: source account, customer, subscription and renewal occurrence, record number, descriptions, complete selected raw/normalized evidence, candidate/confirmed/unresolved status and all uncertainty. It is rebuilt from the current source and an owner-held self-attestation receipt. The handoff does not contain the receipt or authenticate the supplied CSV.

Selection has no eligibility, linkage or financial verdict. Its authority fields are always false/null. Comparison verdicts and claim resolutions stay in the existing comparison output; they cannot rewrite the source selection. Missing identity remains unresolved even if comparison rules produce a provisional route.

The app supplies this envelope to every record comparison and validates the returned envelope before showing results. The comparison boundary rejects missing, changed, extended, getter-backed or stale projections when a handoff context is supplied. Revocation or a changed source/selector makes an old confirmed projection invalid. The receipt is process-local and cannot be serialized into authority. Legacy direct rule callers may omit the handoff context and produce no selection handoff; this is not the app's feature path.

Browser lifecycle still binds actual File objects, questionnaire, time and current controls. The pure model binds exact CSV text and selector. Equal-text replacement is a UI freshness event; byte-identical CSV text alone cannot distinguish File instances.

Acceptance requires exact model assertions, real browser handoff/correction/uncertainty evidence, the complete frozen existing regression suite, actual tamper negatives and independent reviewed source-bound proof. This establishes the supported local contract, not authentic exports, human intent, financial authority or universal devices.

Exact decoded source text and selector are held by a private WeakMap keyed by the immutable live envelope for every status. A serialized/cloned envelope is a display snapshot and must be rebuilt by the source owner before use; it carries no live handoff authority. The envelope does not export the full CSV or a guessable source-version label.
