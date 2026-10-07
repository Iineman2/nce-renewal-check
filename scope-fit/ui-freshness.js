async (page) => {
  await page.addInitScript(() => {
    const NativeDate = Date;
    window.__testClock = { today: '2026-12-31' };
    window.Date = class extends NativeDate {
      constructor(...args) {
        if (args.length === 0) super(`${window.__testClock.today}T12:00:00`);
        else super(...args);
      }
      static now() { return new NativeDate(`${window.__testClock.today}T12:00:00`).valueOf(); }
    };
  });
  await page.goto('http://localhost:8765/');
  const next = page.getByRole('button', { name: 'Next' });
  for (const name of ['We manage and resell it for a customer', 'Pax8', 'HaloPSA', 'Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)']) {
    await page.getByRole('radio', { name, exact: true }).check();
    await next.click();
  }
  await page.getByRole('radio', { name: 'I know the date' }).check();
  await page.getByRole('textbox', { name: 'Renewal date' }).fill('2027-01-20');
  await page.getByRole('button', { name: 'Check fit' }).click();
  await page.getByRole('heading', { name: 'Answers look in scope' }).waitFor({ state: 'visible' });
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check();
  const pax = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\nsynthetic-account,sub-clock,customer-a,pax8,Microsoft 365,NCE,yes,annual,2027-01-20,renew\n';
  const halo = 'line_id,subscription_id,customer_ref,billing_system\nline-clock,sub-clock,customer-a,HaloPSA\n';
  await page.locator('#pax-file').setInputFiles({ name: 'pax8.csv', mimeType: 'text/csv', buffer: Buffer.from(pax) });
  await page.locator('#halo-file').setInputFiles({ name: 'halo.csv', mimeType: 'text/csv', buffer: Buffer.from(halo) });
  await page.getByRole('textbox', { name: 'Pax8 subscription ID to check' }).fill('sub-clock');
  await page.getByRole('button', { name: 'Check record facts' }).click();
  await page.getByRole('heading', { name: 'Confirm these records describe the same case' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click();
  await page.getByRole('heading', { name: 'Supplied records look in scope provisionally' }).waitFor({ state: 'visible' });
  await page.evaluate(() => {
    window.__testClock.today = '2027-01-01';
    window.dispatchEvent(new Event('focus'));
  });
  await page.getByRole('heading', { name: 'Scope rules need review' }).waitFor({ state: 'visible' });
  if (await page.locator('#record-result').isVisible()) throw new Error('Stale record result remained visible');
  if (await page.locator('#pax-file').evaluate((input) => input.files.length !== 0)) throw new Error('Old evidence remained selected');
  if (await page.locator('#fit-form').isVisible() || await page.locator('#preflight').isVisible()) throw new Error('Expired policy requested more work');
  return 'PASS: date change clears stale records and immediately shows the expired-policy block';
}
