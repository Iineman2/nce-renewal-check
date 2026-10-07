async (page) => {
  await page.goto('http://localhost:8765/');
  const next = page.getByRole('button', { name: 'Next' });
  for (const name of ['We manage and resell it for a customer', 'Pax8', 'HaloPSA', 'Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)']) {
    await page.getByRole('radio', { name, exact: true }).check();
    await next.click();
  }
  const dates = await page.evaluate(() => {
    const format = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    const now = new Date();
    const renewal = new Date(now); renewal.setDate(renewal.getDate() + 14);
    const end = new Date(renewal); end.setDate(end.getDate() - 1);
    return { today: format(now), renewal: format(renewal), end: format(end) };
  });
  await page.getByRole('radio', { name: 'I know the date' }).check();
  await page.getByRole('textbox', { name: 'Renewal date' }).fill(dates.renewal);
  await page.getByRole('button', { name: 'Check fit' }).click();
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  const halo = 'line_id,subscription_id,customer_ref,billing_system\nline-edge,sub-edge,customer-a,HaloPSA\n';
  const base = (extraHeaders = [], extraValues = []) => `source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state${extraHeaders.length ? `,${extraHeaders.join(',')}` : ''}\nsynthetic-account,sub-edge,customer-a,pax8,Microsoft 365,NCE,yes,annual,${dates.renewal},renew${extraValues.length ? `,${extraValues.join(',')}` : ''}\n`;
  const setPax = async (csv) => page.locator('#pax-file').setInputFiles({ name: 'pax8.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  const check = async (heading) => {
    await page.getByRole('button', { name: 'Check record facts' }).click();
    await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click();
    await page.getByRole('heading', { name: heading }).waitFor({ state: 'visible' });
  };
  await page.locator('#halo-file').setInputFiles({ name: 'halo.csv', mimeType: 'text/csv', buffer: Buffer.from(halo) });
  await page.getByRole('textbox', { name: 'Pax8 subscription ID to check' }).fill('sub-edge');
  await setPax(base());
  await check('More evidence is needed');
  if (!(await page.getByText(/commitment term that will apply at the next renewal/i).isVisible())) throw new Error('Unanswered next term was treated as annual');
  await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check();
  if (await page.locator('#record-result').isVisible()) throw new Error('Next-term edit did not invalidate old result');
  await check('Supplied records look in scope provisionally');
  if (!(await page.getByText(/next commitment term response for Pax8 Manage renewal: annual/i).isVisible())) throw new Error('Self-reported next term was not shown');

  await setPax(base(['scheduled_commitment_term'], ['monthly']));
  await check('More evidence is needed');
  if (!(await page.getByText(/scheduled renewal term is “monthly”/i).isVisible())) throw new Error('Scheduled monthly term was not surfaced');
  await page.locator('#record-result .claim-trail summary').click();
  if (!(await page.locator('#record-result .claim-trail').getByText(/Economic context supplied by Pax8.*scheduled_commitment_term/i).isVisible())) throw new Error('Scheduled term source provenance is missing');

  await setPax(base(['term_start_date', 'term_end_date'], [dates.today, dates.end]));
  await check('More evidence is needed');
  if (!(await page.getByText(/supplied annual term spans/i).isVisible())) throw new Error('Short co-termed span was not surfaced');

  await setPax(base());
  await page.getByRole('radio', { name: 'Monthly commitment', exact: true }).check();
  await check('Supplied information indicates outside this release');
  if (!(await page.getByText(/next commitment term is “monthly”/i).isVisible())) throw new Error('Next monthly term was not named');
  return 'PASS: next-term confirmation, stale-result invalidation, scheduled change, short co-term, and next monthly route';
}
