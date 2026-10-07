import { conditionIssue } from './actions.mjs';
import { questionnaireClaimReview } from './claims.mjs';
import { captureAnswers, frozenData, RESPONSE_CHOICES, isoDateUTC as parseDate } from './input.mjs';
export const POLICY_VERSION = 'nce-scope-v12';
export const POLICY_REVIEW_BY = '2026-12-31';
export const WINDOW_DAYS = 60;

const choices = Object.fromEntries(Object.entries(RESPONSE_CHOICES).map(([key, values]) => [key, new Set(values)]));

const rules = [
  {
    key: 'reseller',
    supported: 'yes',
    unsupported: 'This check is for subscriptions your business manages and resells to a customer.',
    verify: 'Confirm who holds the Microsoft 365 subscription commitment for this customer.',
  },
  {
    key: 'distributor',
    supported: 'pax8',
    unsupported: 'This release supports subscriptions purchased through Pax8.',
    verify: 'Confirm where this subscription was purchased.',
  },
  {
    key: 'billing',
    supported: 'halopsa',
    unsupported: 'This release supports recurring customer billing managed in HaloPSA.',
    verify: 'Confirm where the recurring customer charge is managed.',
  },
  {
    key: 'commitment',
    supported: 'annual-m365-nce',
    unsupported: 'This release supports annual, seat-based Microsoft 365 NCE commitments.',
    unsupportedByValue: {
      monthly: 'You selected a monthly commitment term. Monthly invoicing alone does not establish a monthly commitment: check the subscription term in Pax8 and correct this answer if it is annual.',
      other: 'You selected another product or commitment term. This release supports annual, seat-based Microsoft 365 NCE commitments; check the product and term in Pax8.',
    },
    verify: 'Confirm the product and subscription commitment term in Pax8. Invoice frequency alone cannot establish the commitment term.',
  },
];

function nextFitAction(status, unsupported, needsVerification) {
  if (status === 'policy-review-required') return {
    kind: 'policy-review', condition: 'policy', source: 'Current Microsoft, Pax8, and HaloPSA rules',
    instruction: 'This check is unavailable until the product owner reviews the scope policy. Do not use an earlier fit result.',
  };
  if (unsupported.length) {
    const first = unsupported[0];
    return { kind: 'correct-or-stop', condition: first.condition, source: first.source,
      instruction: `Check ${first.source}. If your answer was mistaken, edit it here. If it is correct, this case is outside this release.` };
  }
  if (needsVerification.length) {
    const first = needsVerification[0];
    return { kind: 'verify-answer', condition: first.condition, source: first.source,
      instruction: `Check ${first.source} for the first item to verify above. Return here and correct your answer after checking it.` };
  }
  if (status === 'looks-in-scope') return { kind: 'prepare-records',
    source: 'Pax8 subscription, HaloPSA recurring line, and signed customer agreement',
    instruction: 'Continue to record comparison for this one subscription. Check the source records before relying on any answer.' };
  throw new TypeError(`No next action for fit status ${status}`);
}


export function reviewPolicy(options = {}) {
  const { today, policyReviewBy = POLICY_REVIEW_BY } = frozenData(options);
  if (parseDate(today) <= parseDate(policyReviewBy)) return null;
  return {
    policyVersion: POLICY_VERSION, policyReviewBy, status: 'policy-review-required',
    decisionKind: 'scope-fit-only', actionAuthorized: false, financialVerdict: null,
    unsupported: [],
    needsVerification: [{ condition: 'policy', message: 'The scope policy needs review before it can classify new cases.' }],
    nextStep: 'Review current Microsoft, Pax8, and HaloPSA rules and release a new policy version.',
    nextAction: nextFitAction('policy-review-required', [], []),
    claimReview: questionnaireClaimReview({}, { today, policyVersion: POLICY_VERSION, policyBlocked: true, resultStatus: 'policy-review-required' }),
  };
}

export function evaluateFit(answers, options = {}) {
  const { today, policyReviewBy = POLICY_REVIEW_BY } = frozenData(options);
  answers = captureAnswers(answers);
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new TypeError('answers must be an object');
  }
  if (typeof today !== 'string') {
    throw new TypeError('today must be supplied as a local ISO calendar date');
  }
  const todayUtc = parseDate(today);
  const reviewUtc = parseDate(policyReviewBy);
  for (const [key, allowed] of Object.entries(choices)) {
    if (!allowed.has(answers[key])) {
      throw new TypeError(`${key} must be an explicit supported choice, including unknown`);
    }
  }
  if (todayUtc > reviewUtc) {
    return {
      policyVersion: POLICY_VERSION,
      policyReviewBy,
      status: 'policy-review-required',
      decisionKind: 'scope-fit-only', actionAuthorized: false, financialVerdict: null,
      unsupported: [],
      needsVerification: [{ condition: 'policy', message: 'The scope policy needs review before it can classify new cases.' }],
      nextStep: 'Review current Microsoft, Pax8, and HaloPSA rules and release a new policy version.',
      nextAction: nextFitAction('policy-review-required', [], []),
      claimReview: questionnaireClaimReview(answers, { today, policyVersion: POLICY_VERSION, policyBlocked: true, resultStatus: 'policy-review-required' }),
    };
  }

  const unsupported = [];
  const needsVerification = [];
  for (const rule of rules) {
    const answer = answers[rule.key];
    if (answer === 'unknown') {
      needsVerification.push({ condition: rule.key, message: rule.verify });
    } else if (answer !== rule.supported) {
      unsupported.push({ condition: rule.key, message: rule.unsupportedByValue?.[answer] ?? rule.unsupported });
    }
  }

  if (answers.renewal === 'unknown') {
    needsVerification.push({ condition: 'renewal', message: 'Find the exact commitment renewal date in Pax8.' });
  } else if (answers.renewal === 'within-60-approx') {
    needsVerification.push({ condition: 'renewal', message: 'Verify the exact commitment renewal date in Pax8.' });
  } else {
    const renewalUtc = parseDate(answers.renewalDate);
    const daysUntil = (renewalUtc - todayUtc) / 86_400_000;
    if (daysUntil < 0) {
      unsupported.push({ condition: 'renewal', message: 'That renewal date has passed. This release checks upcoming renewals.' });
    } else if (daysUntil > WINDOW_DAYS) {
      unsupported.push({ condition: 'renewal', message: `This release checks renewals in the next ${WINDOW_DAYS} days.` });
    } else if (daysUntil === 0) {
      needsVerification.push({ condition: 'renewal-time', message: 'Renewal is today. Verify the exact cutoff and time zone in Pax8.' });
    }
  }
  if (answers.agreement === 'unknown') {
    needsVerification.push({ condition: 'agreement', message: 'Confirm whether a signed customer agreement or order exists for this subscription.' });
  } else if (answers.agreement === 'no') {
    needsVerification.push({ condition: 'agreement', message: 'Locate the signed customer agreement or order before attempting a coverage check.' });
  }

  for (const items of [unsupported, needsVerification]) {
    for (let index = 0; index < items.length; index++) items[index] = conditionIssue(items[index].condition, items[index].message);
  }
  const status = unsupported.length > 0
    ? 'outside-this-release'
    : needsVerification.length > 0
      ? 'may-fit-verify'
      : 'looks-in-scope';

  return {
    policyVersion: POLICY_VERSION,
    policyReviewBy,
    status,
    decisionKind: 'scope-fit-only', actionAuthorized: false, financialVerdict: null,
    unsupported,
    needsVerification,
    preparationTasks: answers.agreement === 'not-asked'
      ? ['When you move to record comparison, say whether the signed customer order or agreement is available.'] : [],
    nextStep: status === 'outside-this-release'
      ? 'Review the stated scope conditions, change an answer, or compare the source records below.'
      : status === 'may-fit-verify'
        ? 'Check the listed facts or compare the source records below.'
        : 'Compare the source records below before treating this as a supported case.',
    nextAction: nextFitAction(status, unsupported, needsVerification),
    claimReview: questionnaireClaimReview(answers, { today, policyVersion: POLICY_VERSION, resultStatus: status }),
  };
}

export function evaluateEarlyOutside(answers, options = {}) {
  const { through, today, policyReviewBy = POLICY_REVIEW_BY } = frozenData(options);
  answers = captureAnswers(answers);
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new TypeError('answers must be an object');
  if (!Number.isInteger(through) || through < 0 || through >= rules.length) throw new TypeError('through must name one of the first four scope questions');
  const checkedToday = parseDate(today);
  const reviewDate = parseDate(policyReviewBy);
  const unsupported = [];
  const needsVerification = [];
  for (let index = 0; index <= through; index++) {
    const rule = rules[index];
    const value = answers[rule.key];
    if (!choices[rule.key].has(value)) throw new TypeError(`${rule.key} must be an explicit supported choice, including unknown`);
    if (value === 'unknown') needsVerification.push(conditionIssue(rule.key, rule.verify));
    else if (value !== rule.supported) unsupported.push(conditionIssue(rule.key, rule.unsupportedByValue?.[value] ?? rule.unsupported));
  }
  if (!unsupported.length && checkedToday <= reviewDate) return null;
  if (checkedToday > reviewDate) {
    return { policyVersion: POLICY_VERSION, policyReviewBy, status: 'policy-review-required',
      unsupported: [], needsVerification: [{ condition: 'policy', message: 'The scope policy needs review before it can classify new cases.' }],
      notAsked: [...rules.slice(through + 1).map((rule) => rule.key), 'renewal'],
      nextStep: 'Review current rules before classifying this case.', nextAction: nextFitAction('policy-review-required', [], []),
      decisionKind: 'scope-fit-only', actionAuthorized: false, financialVerdict: null,
      claimReview: questionnaireClaimReview(answers, { today, policyVersion: POLICY_VERSION, through, policyBlocked: true, resultStatus: 'policy-review-required' }) };
  }
  return { policyVersion: POLICY_VERSION, policyReviewBy, status: 'outside-this-release', unsupported,
    needsVerification, notAsked: [...rules.slice(through + 1).map((rule) => rule.key), 'renewal'],
    nextStep: 'Review the named condition. Correct a mistaken answer, or continue with the remaining questions to compare records.',
    nextAction: nextFitAction('outside-this-release', unsupported, []),
    decisionKind: 'scope-fit-only', actionAuthorized: false, financialVerdict: null,
    claimReview: questionnaireClaimReview(answers, { today, policyVersion: POLICY_VERSION, through, resultStatus: 'outside-this-release' }) };
}
