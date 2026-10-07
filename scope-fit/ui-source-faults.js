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
  const nativeFetch = async route => { const response = await route.fetch(); return response.text(); };
  for (const fault of ['missing', 'bad-policy', 'bad-authentication', 'wrong-status']) {
    await page.route('**/fit.mjs', async route => {
      let source = await nativeFetch(route);
      // Fault the projection without changing classifier branches.
      source = source.replace('import { questionnaireClaimReview }', 'import { questionnaireClaimReview as realQuestionnaireClaimReview }');
      source += `\nfunction questionnaireClaimReview(...args) { const value = realQuestionnaireClaimReview(...args); return ${fault === 'missing' ? 'undefined' : fault === 'bad-policy' ? '{ ...value, policyVersion: "bad" }' : fault === 'wrong-status' ? '{ ...value, resultStatus: "outside-this-release" }' : '{ ...value, authenticated: true }'}; }`;
      await route.fulfill({ response: await route.fetch(), body: source });
    });
    await page.goto('http://localhost:8765/');
    for (const [field, value] of [['reseller','yes'],['distributor','pax8'],['billing','halopsa'],['commitment','annual-m365-nce']]) {
      await page.locator(`input[name="${field}"][value="${value}"]`).check(); await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await page.locator('input[name="renewal"][value="exact"]').check(); await page.locator('#renewal-date').fill('2027-01-15');
    await page.getByRole('button', { name: 'Check fit', exact: true }).click();
    await page.getByText(/could not produce a consistent claim trail/).waitFor();
    if (await page.locator('#result').isVisible() || await page.locator('.claim-trail').count()) throw new Error('Fault retained result: ' + fault);
    await page.unroute('**/fit.mjs');
  }
  await page.route('**/fit.mjs', async route => { const response = await route.fetch(); await route.fulfill({ response }); });
  await fit(); await checked();
  await page.route('**/preflight.mjs', async route => {
    const response = await route.fetch();
    let source = await response.text();
    source = source.replace('recordClaimReview,', 'recordClaimReview as realRecordClaimReview,');
    source += '\nfunction recordClaimReview(...args) { return undefined; }';
    await route.fulfill({ response, body: source });
  });
  await fit(); await submit();
  await page.locator('#record-result').waitFor({ state: 'visible' });
  if (await page.locator('#record-result .claim-trail').count() || await page.getByRole('heading', { name: 'Supplied records look in scope provisionally' }).count()) throw new Error('Missing record trace retained result');
  if (!await page.locator('#record-result').isVisible()) throw new Error('Missing record trace lacks controlled stop');
  await page.unroute('**/preflight.mjs');
  await page.route('**/preflight.mjs', async route => { const response = await route.fetch(); await route.fulfill({ response }); });
  await page.route('**/fit.mjs', async route => {
    const response = await route.fetch(); let source = await response.text();
    source = source.replace('import { questionnaireClaimReview }', 'import { questionnaireClaimReview as realQuestionnaireClaimReview }');
    source += '\nfunction questionnaireClaimReview(...args) { const value = realQuestionnaireClaimReview(...args); return new Proxy(value, { get(target, key) { return key === "fields" ? [] : Reflect.get(target, key); } }); }';
    // A proxy of a frozen target cannot lie about nonconfigurable fields. Use detached descriptors.
    source = source.replace('new Proxy(value,', 'new Proxy({ ...value },');
    await route.fulfill({ response, body: source });
  });
  await fit();
  if (await page.locator('#result .claim-trail-row').count() !== 7) throw new Error('Renderer reread untrusted trace after validation');
  await page.unroute('**/fit.mjs');
  await page.route('**/fit.mjs', async route => { const response = await route.fetch(); await route.fulfill({ response }); });
  await fit(); await checked();
  await page.emulateMedia({ media: 'print' });
  if (!await page.locator('#record-result .claim-trail-row').first().isVisible()) throw new Error('Print hides provenance');
  await page.emulateMedia({ media: 'screen' });
  const files = [
    ['pax-file', 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\nsynthetic-account,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15, unknown \n'],
    ['halo-file', 'line_id,subscription_id,customer_ref,billing_system\nl\u202E,s,c,HaloPSA\n'],
  ];
  for (const [id, text] of files) await page.locator('#' + id).setInputFiles({ name: id + '.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
  await submit(); await page.locator('#record-result .claim-trail').waitFor();
  await page.locator('#record-result .claim-trail summary').click();
  const text = await page.locator('#record-result').textContent();
  if (!text.includes('[U+202E]') || text.includes('\u202E') || !text.includes('“ unknown ”')) throw new Error('Raw whitespace/control display not faithful: ' + text);
  return 'PASS: missing/corrupt questionnaire and record traces fail closed; canonical proxy trace rendering; print exposes source rows; raw whitespace and bidi controls visible';
}
