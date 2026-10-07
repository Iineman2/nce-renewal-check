async (page) => {
  // Migrated lifecycle/read faults use a real Worker gate, not a main-realm File API override.
  await page.addInitScript({content: await (await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+await (await page.request.get('http://localhost:8765/qc-worker-entry.js')).text()});});

  await page.goto('http://localhost:8765/');
  const next = page.getByRole('button', { name: 'Next' });
  for (const name of ['We manage and resell it for a customer', 'Pax8', 'HaloPSA', 'Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)']) {
    await page.getByRole('radio', { name, exact: true }).check();
    await next.click();
  }
  const date = await page.evaluate(() => {
    const value = new Date();
    value.setDate(value.getDate() + 14);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  });
  await page.getByRole('radio', { name: 'I know the date' }).check();
  await page.getByRole('textbox', { name: 'Renewal date' }).fill(date);
  await page.getByRole('button', { name: 'Check fit' }).click();
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check();
  const pax = `source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\nsynthetic-account,sub-race,customer-a,pax8,Microsoft 365,NCE,yes,annual,${date},renew\n`;
  const halo = 'line_id,subscription_id,customer_ref,billing_system\nline-race,sub-race,customer-a,HaloPSA\n';
  await page.locator('#pax-file').setInputFiles({ name: 'pax8.csv', mimeType: 'text/csv', buffer: Buffer.from(pax) });
  await page.locator('#halo-file').setInputFiles({ name: 'halo.csv', mimeType: 'text/csv', buffer: Buffer.from(halo) });
  await page.getByRole('textbox', { name: 'Pax8 subscription ID to check' }).fill('sub-race');
  await page.evaluate(() => {
    const original = File.prototype.text;
    window.__processingTextControl = async function () {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return original.call(this);
    };
  });
  await page.getByRole('button', { name: 'Check record facts' }).click();
  await page.getByRole('button', { name: 'Clear files and result' }).click();
  await page.waitForTimeout(600);
  if (await page.locator('#record-result').isVisible()) throw new Error('A cleared asynchronous result reappeared');
  if (await page.locator('#pax-file').evaluate((input) => input.files.length !== 0)) throw new Error('A cleared file reappeared');
  if (!(await page.getByRole('button', { name: 'Check record facts' }).isEnabled())) throw new Error('Submit remained disabled after clear');
  return 'PASS: a delayed file read cannot resurrect a cleared case';
}
