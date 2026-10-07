async (page) => {
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
  const pax = `source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\nsynthetic-account,sub-cost,customer-a,pax8,Microsoft 365,NCE,yes,annual,${date},renew\n`;
  const halo = 'line_id,subscription_id,customer_ref,billing_system\nline-cost,sub-cost,customer-a,HaloPSA\n';
  await page.locator('#pax-file').setInputFiles({ name: 'pax8.csv', mimeType: 'text/csv', buffer: Buffer.from(pax) });
  await page.locator('#halo-file').setInputFiles({ name: 'halo-wrong.csv', mimeType: 'text/csv', buffer: Buffer.from(halo.replace('customer-a', 'customer-b')) });
  await page.getByRole('textbox', { name: 'Pax8 subscription ID to check' }).fill('sub-cost');
  const check = async (heading) => {
    await page.getByRole('button', { name: 'Check record facts' }).click();
    if (heading !== 'Confirm the record link') {
      await page.getByRole('heading', { name: 'Confirm these records describe the same case' }).waitFor({ state: 'visible' });
      if (await page.getByRole('button', { name: 'Use supplied Pax8 value for distributor' }).count()) throw new Error('Conflict choice offered before link confirmation');
      await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click();
    }
    await page.getByRole('heading', { name: heading }).waitFor({ state: 'visible' });
  };
  await check('Confirm the record link');
  if (!(await page.getByText(/correct the selected record IDs or customer references/i).isVisible())) throw new Error('Record-link repair path missing');
  await page.locator('#halo-file').setInputFiles({ name: 'halo.csv', mimeType: 'text/csv', buffer: Buffer.from(halo) });
  await page.locator('#pax-file').setInputFiles({ name: 'pax8-conflict.csv', mimeType: 'text/csv', buffer: Buffer.from(pax.replace(',pax8,', ',other,').replace(',renew\n', ',cancel\n')) });
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check();
  await check('Resolve conflicting claims');
  if (!(await page.getByText(/end-of-term state "cancel"/i).isVisible())) throw new Error('Known outside condition was hidden during conflict review');
  await page.getByRole('button', { name: 'Use supplied Pax8 value for distributor' }).click();
  await page.getByRole('heading', { name: 'Supplied information indicates outside this release' }).waitFor({ state: 'visible' });
  if (!(await page.getByText(/correct it and run the check again/i).isVisible())) throw new Error('Outside-scope correction path missing');
  await page.locator('#pax-file').setInputFiles({ name: 'pax8-corrected.csv', mimeType: 'text/csv', buffer: Buffer.from(pax) });
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check();
  await check('Supplied records look in scope provisionally');
  if (!(await page.getByText(/only a provisional scope result/i).isVisible())) throw new Error('Positive scope result lacks safety boundary');
  if (await page.getByRole('button', { name: /approve|pay|renew|cancel subscription/i }).count()) throw new Error('An automatic financial action was exposed');
  return 'PASS: link repair, conflict-first routing, reversible outside-scope result, and explicit provisional/no-action boundary';
}
