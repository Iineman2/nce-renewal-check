async (page) => {
  // Migrated lifecycle/read faults use a real Worker gate, not a main-realm File API override.
  await page.addInitScript({content: await (await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+await (await page.request.get('http://localhost:8765/qc-worker-entry.js')).text()});});

  await page.addInitScript(() => {
    const NativeDate = Date; window.__today = '2026-12-30';
    window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [window.__today + 'T12:00:00'])); } static now() { return new NativeDate(window.__today + 'T12:00:00').valueOf(); } };
    const original = File.prototype.text; window.__stall = false;
    window.__processingTextControl = function () { return window.__stall ? new Promise(resolve => { window.__finishRead = () => original.call(this).then(resolve); }) : original.call(this); };
  });
  const fit = async () => {
    await page.goto('http://localhost:8765/');
    for (const name of ['We manage and resell it for a customer', 'Pax8', 'HaloPSA', 'Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)']) { await page.getByRole('radio', { name, exact: true }).check(); await page.getByRole('button', { name: 'Next', exact: true }).click(); }
    await page.getByRole('radio', { name: 'I know the date', exact: true }).check(); await page.locator('#renewal-date').fill('2027-01-15'); await page.getByRole('button', { name: 'Check fit', exact: true }).click();
    await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check(); await page.getByRole('radio', { name: 'Yes', exact: true }).check();
    const pax = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\nsynthetic-account,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
    const halo = 'line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
    for (const [id, text] of [['pax-file', pax], ['halo-file', halo]]) await page.locator(`#${id}`).setInputFiles({ name: id + '.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
    await page.locator('#subscription-id').fill('s');
    return { pax, halo };
  };
  const submit = () => page.getByRole('button', { name: 'Check record facts', exact: true }).click();
  const checked = async () => { await submit(); await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click(); };
  const gone = async label => { if (await page.locator('#record-result .claim-trail').count() || await page.locator('#record-result').isVisible()) throw new Error(`${label} retained old source trail`); };
  const fitGone = async label => { if (await page.locator('#result .claim-trail').count()) throw new Error(`${label} retained old questionnaire trace DOM`); };
  let fixtures = await fit(); await checked();
  for (const [label, change, restore] of [
    ['ID', () => page.locator('#subscription-id').fill('another'), () => page.locator('#subscription-id').fill('s')],
    ['agreement', () => page.locator('input[name="agreement"][value="no"]').check(), () => page.locator('input[name="agreement"][value="yes"]').check()],
    ['next term', () => page.locator('input[name="renewalTerm"][value="unknown"]').check(), () => page.locator('input[name="renewalTerm"][value="annual"]').check()],
    ['Pax file', () => page.locator('#pax-file').setInputFiles({ name: 'new-pax.csv', mimeType: 'text/csv', buffer: Buffer.from(fixtures.pax.replace('pax8', 'PAX8')) }), async () => {}],
    ['Halo file', () => page.locator('#halo-file').setInputFiles({ name: 'new-halo.csv', mimeType: 'text/csv', buffer: Buffer.from(fixtures.halo.replace('HaloPSA', 'HALOPSA')) }), async () => {}],
  ]) {
    await change(); await gone(label); await restore(); await submit();
    if (await page.locator('#record-result .claim-trail').getAttribute('data-stage') !== 'record-comparison') throw new Error(`${label} reused confirmed link`);
    await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click();
  }
  await page.getByRole('button', { name: 'Change answers', exact: true }).click(); await gone('answer edit'); await fitGone('answer edit');
  fixtures = await fit(); await checked(); await page.getByRole('button', { name: 'Clear files and result' }).click(); await gone('clear');
  const agreement = await page.locator('#result .claim-trail-row[data-field="agreement"]').textContent();
  if (!agreement.includes('Not answered')) throw new Error('Clear retained answered agreement trail');

  await fit(); await checked(); await page.evaluate(() => { window.__stall = true; }); await submit(); await gone('new pending read');
  await page.getByRole('button', { name: 'Cancel this check', exact: true }).click();
  await page.evaluate(async () => { window.__stall = false; await window.__finishRead(); await new Promise(resolve => setTimeout(resolve, 20)); }); await gone('late cancelled read');

  await fit(); await checked(); await page.evaluate(() => { window.__today = '2026-12-31'; window.dispatchEvent(new Event('focus')); }); await gone('date change'); await fitGone('date change');
  await fit(); await checked(); await page.evaluate(() => { window.__today = '2027-01-01'; window.dispatchEvent(new Event('focus')); }); await gone('policy expiry');
  if (await page.locator('#result .claim-trail').getAttribute('data-stage') !== 'policy-blocked') throw new Error('Expired policy showed stale source trail');
  await page.locator('#result .claim-trail summary').click();
  if (!await page.getByText(/No current classification is available until policy review/).isVisible()) throw new Error('Policy trail lacks boundary');
  if (await page.locator('#result .claim-effective').filter({ hasText: /Value considered: (yes|pax8|halopsa)/ }).count()) throw new Error('Expired policy retained usable claims');

  await fit(); await checked(); await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))); await gone('history restore'); await fitGone('history restore');
  await page.reload(); if (await page.locator('.claim-trail').count()) throw new Error('Reload persisted source trail');
  return 'PASS: source trail DOM/choice invalidation on ID, both files, agreement, next term, answer edit, clear, new read, cancellation/late completion, date, policy, history and reload';
}
