async (page) => {
  const requests = [];
  page.on('request', (request) => requests.push({ method: request.method(), url: request.url() }));
  await page.goto('http://localhost:8765/');
  const next = page.getByRole('button', { name: 'Next' });
  const choose = async (name) => {
    await page.getByRole('radio', { name, exact: true }).check();
    await next.click();
  };
  await choose('We manage and resell it for a customer');
  await choose('Pax8');
  await choose('HaloPSA');
  await choose('Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)');
  const renewalDate = await page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  await page.getByRole('radio', { name: 'I know the date' }).check();
  await page.getByRole('textbox', { name: 'Renewal date' }).fill(renewalDate);
  await page.getByRole('button', { name: 'Check fit' }).click();
  if (!(await page.getByRole('heading', { name: 'Answers look in scope' }).isVisible())) throw new Error('Provisional fit missing');
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check();
  const paxCsv = `source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\nsynthetic-account,sub-demo-1,customer-demo,pax8,Microsoft 365,NCE,yes,annual,${renewalDate},renew\n`;
  const haloCsv = 'line_id,subscription_id,customer_ref,billing_system\nline-demo-1,sub-demo-1,customer-demo,HaloPSA\n';
  const confirmLink = async () => {
    await page.getByRole('heading', { name: 'Confirm these records describe the same case' }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click();
  };
  const freshCaseAnswers = async () => {
    await page.getByRole('radio', { name: 'Yes', exact: true }).check();
    await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check();
  };
  await page.locator('#pax-file').setInputFiles({ name: 'pax8.csv', mimeType: 'text/csv', buffer: Buffer.from(paxCsv) });
  await page.locator('#halo-file').setInputFiles({ name: 'halo.csv', mimeType: 'text/csv', buffer: Buffer.from(haloCsv) });
  await page.getByRole('textbox', { name: 'Pax8 subscription ID to check' }).fill('sub-demo-1');
  await page.getByRole('button', { name: 'Check record facts' }).click();
  await confirmLink();
  await page.getByRole('heading', { name: 'Supplied records look in scope provisionally' }).waitFor({ state: 'visible' });
  if (!(await page.locator('#record-result .claim-trail summary').isVisible())) throw new Error('Provenance missing');
  const alternateDate = await page.evaluate((date) => {
    const [year, month, day] = date.split('-').map(Number);
    const value = new Date(year, month - 1, day + 1);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }, renewalDate);
  const conflictingCsv = paxCsv.replace(renewalDate, alternateDate);
  await page.locator('#pax-file').setInputFiles({ name: 'pax8-conflict.csv', mimeType: 'text/csv', buffer: Buffer.from(conflictingCsv) });
  if (await page.locator('#record-result').isVisible()) throw new Error('File edit did not invalidate result');
  await freshCaseAnswers();
  await page.getByRole('button', { name: 'Check record facts' }).click();
  await confirmLink();
  await page.getByRole('heading', { name: 'Resolve conflicting claims' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Keep my answer for renewalDate; obtain corrected evidence' }).click();
  await page.getByRole('heading', { name: 'More evidence is needed' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Use supplied Pax8 value for renewalDate' }).click();
  await page.getByRole('heading', { name: 'Supplied records look in scope provisionally' }).waitFor({ state: 'visible' });
  if (!(await page.getByText('You accepted the supplied file value for this check. It remains unauthenticated.').isVisible())) throw new Error('Acceptance caveat missing');
  const twoConflicts = conflictingCsv.replace(',pax8,', ',other,');
  await page.locator('#pax-file').setInputFiles({ name: 'pax8-two-conflicts.csv', mimeType: 'text/csv', buffer: Buffer.from(twoConflicts) });
  await freshCaseAnswers();
  await page.getByRole('button', { name: 'Check record facts' }).click();
  await confirmLink();
  await page.getByRole('heading', { name: 'Resolve conflicting claims' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Keep my answer for distributor; obtain corrected evidence' }).click();
  await page.getByRole('heading', { name: 'Resolve conflicting claims' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Use supplied Pax8 value for renewalDate' }).click();
  await page.getByRole('heading', { name: 'More evidence is needed' }).waitFor({ state: 'visible' });
  const injectedRef = '<svg onload=window.__injected=1>';
  await page.locator('#pax-file').setInputFiles({ name: 'pax8-text.csv', mimeType: 'text/csv', buffer: Buffer.from(paxCsv.replace('customer-demo', injectedRef)) });
  await page.locator('#halo-file').setInputFiles({ name: 'halo-text.csv', mimeType: 'text/csv', buffer: Buffer.from(haloCsv.replace('customer-demo', injectedRef)) });
  await freshCaseAnswers();
  await page.getByRole('button', { name: 'Check record facts' }).click();
  await confirmLink();
  await page.getByRole('heading', { name: 'Supplied records look in scope provisionally' }).waitFor({ state: 'visible' });
  if (await page.locator('#record-result svg').count()) throw new Error('CSV text became HTML');
  if (await page.evaluate(() => window.__injected)) throw new Error('CSV text executed script');
  await page.getByRole('button', { name: 'Clear files and result' }).click();
  if (await page.locator('#record-result').isVisible()) throw new Error('Record result remained after clearing');
  if (await page.locator('#pax-file').evaluate((input) => input.files.length !== 0)) throw new Error('Pax8 file remained selected');
  await page.getByRole('button', { name: 'Change answers' }).click();
  if (!(await page.getByText('Question 1 of 5').isVisible())) throw new Error('Change answers did not return to the first question');
  if (await page.locator('#preflight').isVisible()) throw new Error('Old preflight still visible after editing');

  await page.getByRole('radio', { name: 'The customer buys directly' }).check();
  await next.click();
  if (!(await page.getByRole('heading', { name: 'Answers indicate outside this release' }).isVisible())) throw new Error('Unsupported result missing');
  if (await page.locator('#preflight').isVisible()) throw new Error('Early outside route exposed record preflight before the remaining questions');
  await page.getByRole('button', { name: 'Change answers' }).click();
  await page.locator('fieldset').first().getByRole('radio', { name: "I'm not sure" }).check();
  for (let i = 0; i < 4; i++) await next.click();
  await page.getByRole('button', { name: 'Check fit' }).click();
  if (!(await page.getByRole('heading', { name: 'May fit — verify these items' }).isVisible())) throw new Error('Uncertain result missing');

  await page.reload();
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('name'));
  if (focused !== 'reseller') throw new Error(`Keyboard focus started at ${focused}`);
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  if (!(await page.getByText('Question 2 of 5').isVisible())) throw new Error('Keyboard Next failed');
  const browserStorage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie }));
  if (browserStorage.local || browserStorage.session || browserStorage.cookies) throw new Error(`Browser persistence detected: ${JSON.stringify(browserStorage)}`);
  if (requests.some((request) => request.method !== 'GET' || !request.url.startsWith('http://localhost:8765/'))) {
    throw new Error(`Unexpected network request: ${JSON.stringify(requests)}`);
  }
  return 'PASS: provisional outcomes, provenance, multiple conflicts, evidence invalidation, text rendering, reset, keyboard navigation, and no upload or browser persistence';
}
