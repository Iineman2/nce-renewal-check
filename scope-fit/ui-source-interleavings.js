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
  await fit(); await submit();
  await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).waitFor();
  await page.evaluate(() => { document.querySelector('#subscription-id').value = 'silent'; });
  await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click();
  await gone('silent ID mutation');
  if (!await page.getByText(/The case inputs changed/).isVisible()) throw new Error('Silent mutation lacks stop');
  await fit(); await page.evaluate(() => { window.__stall = true; }); await submit();
  await page.evaluate(() => { document.querySelector('input[name="agreement"][value="no"]').checked = true; window.__stall = false; });
  await page.evaluate(async () => { await window.__finishRead(); });
  await page.getByText(/The case inputs changed/).waitFor(); await gone('silent read race');
  await fit(); await submit();
  await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).waitFor();
  await page.evaluate(() => { window.__oldButton = Array.from(document.querySelectorAll('#record-result button')).find(b => b.textContent.includes('I checked this subscription')); });
  await submit();
  await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).waitFor();
  await page.evaluate(() => window.__oldButton.click());
  if (await page.locator('#record-result .claim-trail').getAttribute('data-stage') !== 'record-comparison') throw new Error('Detached confirmation reused');
  await page.evaluate(() => { const input = document.querySelector('#pax-file'); const dt = new DataTransfer(); dt.items.add(new File(['changed'], 'same.csv', { type: 'text/csv' })); input.files = dt.files; });
  await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click(); await gone('silent file replacement');
  await fit(); await page.evaluate(() => { window.__stall = true; }); await submit();
  await page.evaluate(() => { document.querySelector('#subscription-id').value = 'silent'; window.__today = '2026-12-31'; window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); window.__stall = false; });
  await page.evaluate(async () => { await window.__finishRead(); }); await gone('mixed read/date/history');
  return 'PASS: silent ID, agreement during read, selected File identity and detached confirmation cannot reuse prior case';
}
