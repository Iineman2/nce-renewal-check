async (page) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const fit = async (unknown = false) => {
    await page.goto('http://localhost:8765/');
    for (const [field, value] of [['reseller', 'yes'], ['distributor', unknown ? 'unknown' : 'pax8'], ['billing', 'halopsa'], ['commitment', 'annual-m365-nce']]) {
      await page.locator(`input[name="${field}"][value="${value}"]`).check();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    const date = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 14); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    await page.locator(`input[name="renewal"][value="${unknown ? 'within-60-approx' : 'exact'}"]`).check();
    if (!unknown) await page.locator('#renewal-date').fill(date);
    await page.getByRole('button', { name: 'Check fit', exact: true }).click();
    await page.locator('#result .claim-trail summary').click();
    check(await page.locator('#result .claim-trail-row[data-field="distributor"]').getByText(`Original questionnaire response: ${unknown ? 'Unknown' : 'pax8'}`, { exact: false }).isVisible(), 'Original questionnaire response missing');
    await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check();
    await page.getByRole('radio', { name: 'Yes', exact: true }).check();
    return date;
  };
  const supply = async (date, { distributor = 'pax8', extra = '', extraValue = '', customer = 'c', endState = 'renew' } = {}) => {
    const pax = `source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state${extra ? ',' + extra : ''}\nsynthetic-account,s,c,${distributor},Microsoft 365,NCE,yes,annual,${date},${endState}${extra ? ',' + extraValue : ''}\n`;
    const halo = `line_id,subscription_id,customer_ref,billing_system\nl,s,${customer},HaloPSA\n`;
    for (const [id, text] of [['pax-file', pax], ['halo-file', halo]]) await page.locator(`#${id}`).setInputFiles({ name: id + '.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
    await page.locator('#subscription-id').fill('s');
    await page.getByRole('button', { name: 'Check record facts', exact: true }).click();
  };
  const confirm = () => page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click();
  const open = () => page.locator('#record-result .claim-trail summary').click();
  const row = key => page.locator(`#record-result .claim-trail-row[data-field="${key}"]`);
  const original = () => page.locator('#fit-form').evaluate(form => Object.fromEntries(['distributor', 'commitment', 'renewal', 'renewalDate'].map(key => [key, form.elements[key].value])));

  let date = await fit(); const before = await original(); await supply(date);
  await open();
  check(await page.getByText(/Comparison only: the selected pair/).isVisible(), 'Pending link promoted to completed check');
  check(await page.getByText(/Link state: awaiting-confirmation/).isVisible(), 'Pending link origin missing');
  await confirm(); await open();
  check(await row('distributor').getByText(/file agrees with the response/).isVisible(), 'Agreeing value source missing');
  check(await page.getByText(/Link state: self-attested/).isVisible(), 'Link confirmation mislabeled');
  check(await row('agreement').getByText(/No signed agreement or terms were supplied/).isVisible(), 'Agreement availability escalated');
  check(await row('endState').getByText(/Value considered: renew/).isVisible(), 'End state contributor missing');
  check(JSON.stringify(await original()) === JSON.stringify(before), 'Agreeing preflight changed original controls');

  date = await fit(true); const unknownBefore = await original(); await supply(date); await confirm(); await open();
  check(await row('distributor').getByText(/Original questionnaire response: Unknown/).isVisible(), 'Unknown original lost');
  check(await row('distributor').getByText(/Value considered: pax8/).isVisible(), 'Known source did not inform unknown');
  check(await row('renewal').getByText(/Approximately within 60 days/).isVisible(), 'Approximate original lost');
  check(await row('renewalDate').getByText(`Value considered: ${date}.`, { exact: false }).isVisible(), 'Source exact date missing');
  check(JSON.stringify(await original()) === JSON.stringify(unknownBefore), 'Informed source silently rewrote original');

  date = await fit(); await supply(date, { distributor: 'other' }); await confirm(); await open();
  check(await row('distributor').getByText(/Value considered: Unknown/).isVisible(), 'Unresolved conflict gained usable value');
  await page.getByRole('button', { name: 'Use supplied Pax8 value for distributor' }).click(); await open();
  check(await row('distributor').getByText(/Value considered: other/).isVisible(), 'Accepted source not considered');
  check(await row('distributor').getByText(/records a review choice, not authentication/).isVisible(), 'Acceptance upgraded trust');
  check((await original()).distributor === 'pax8', 'Accept rewrote questionnaire');
  await page.getByRole('button', { name: 'Keep my answer for distributor; obtain corrected evidence' }).click(); await open();
  check(await row('distributor').getByText(/Value considered: Unknown/).isVisible(), 'Keep answer cleared discrepancy');
  check(await row('distributor').getByText(/Original questionnaire response: pax8/).isVisible(), 'Keep lost original');
  await supply(date); await confirm(); await open();
  check(await row('distributor').getByText(/file agrees with the response/).isVisible(), 'Corrected evidence retained obsolete conflict');
  check(await row('distributor').getByText(/No conflict choice made/).isVisible(), 'Corrected evidence retained bound choice');

  date = await fit(); await supply(date, { distributor: '' }); await confirm(); await open();
  check(await row('distributor').getByText(/Value considered: Unknown/).isVisible(), 'Missing source filled with supported response');
  check(await row('distributor').getByText(/source-evidence gap/).isVisible(), 'Missing source reason missing');

  date = await fit(); await supply(date, { extra: 'scheduled_commitment_term', extraValue: 'monthly' }); await confirm(); await open();
  check(await row('commitment').getByText(/Value considered: Unknown/).isVisible(), 'Economic override hidden');
  check(await row('commitment').getByText(/Inconsistent economic context/).isVisible(), 'Economic override reason missing');
  check(await row('renewalTerm').getByText(/Supplied Pax8 CSV claim: monthly/).isVisible(), 'Scheduled term missing');
  check(await row('renewalTerm').getByText(/Value considered: annual/).isVisible(), 'Reported next term substituted by current/scheduled CSV');
  check((await original()).commitment === 'annual-m365-nce', 'Economic guard changed original');

  date = await fit();
  const changedDate = await page.evaluate(value => {
    const [year, month, day] = value.split('-').map(Number); const d = new Date(year, month - 1, day + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, date);
  await supply(changedDate); await confirm(); await open();
  check(await row('renewalDate').getByText(/Value considered: Unknown. State: unknown/).isVisible(), 'Conflicted date mislabeled unasked');
  await page.getByRole('button', { name: 'Keep my answer for renewalDate; obtain corrected evidence' }).click(); await open();
  check(await row('renewalDate').getByText(/Value considered: Unknown. State: unknown/).isVisible(), 'Kept date discrepancy mislabeled');
  await page.getByRole('button', { name: 'Use supplied Pax8 value for renewalDate' }).click(); await open();
  check(await row('renewalDate').getByText(`Value considered: ${changedDate}. State: known`, { exact: false }).isVisible(), 'Accepted date missing');
  check((await original()).renewalDate === date, 'Accepted date rewrote original');
  for (const [endState, state] of [['', 'unknown'], ['n/a', 'unknown'], ['invented', 'unrecognized']]) {
    date = await fit(); await supply(date, { endState }); await confirm(); await open();
    check(await row('endState').getByText(`State: ${state}.`, { exact: false }).isVisible(), `End-state ${endState} mislabeled known`);
  }

  date = await fit(); await supply(date, { customer: 'another' }); await open();
  check(await page.getByText(/Link state: unusable/).isVisible(), 'Invalid mapping promoted to completed scope check');
  check(await page.getByText(/Comparison only: the selected pair/).isVisible(), 'Invalid link does not state comparison boundary');
  await page.locator('#subscription-id').fill('absent'); await page.getByRole('button', { name: 'Check record facts', exact: true }).click(); await open();
  check(await page.getByText(/No usable selected record pair/).isVisible(), 'Missing identity lacks source stopping point');
  check(await page.locator('#record-result .claim-trail-row').count() === 0, 'Missing identity exposed reconciled fields');
  check(errors.length === 0, `Uncaught errors: ${errors}`);
  return 'PASS: questionnaire carry, pending/self-attested/unusable link, agreeing/informed/unknown sources, unresolved/accept/keep/corrected choices, economic override, conflicted dates, unknown/unrecognized end states, extra contributors and immutable original controls';
}
