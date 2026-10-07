async (page) => {
  await page.goto('http://localhost:8765/');
  await page.getByRole('radio', { name: "I'm not sure", exact: true }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  for (const name of ['Pax8', 'HaloPSA', 'Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)']) {
    await page.getByRole('radio', { name, exact: true }).check();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  const date = await page.evaluate(() => {
    const value = new Date(); value.setDate(value.getDate() + 14);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  });
  await page.getByRole('radio', { name: 'I know the date' }).check();
  await page.getByRole('textbox', { name: 'Renewal date' }).fill(date);
  await page.getByRole('button', { name: 'Check fit' }).click();
  await page.getByRole('heading', { name: 'May fit — verify these items' }).waitFor();
  if (!(await page.getByText(/Next action — .*reseller arrangement/i).isVisible())) throw new Error('Unknown fit lacks a source-specific next action');
  await page.getByRole('button', { name: 'Edit reseller answer after checking' }).click();
  if (await page.locator('#result').isVisible()) throw new Error('Old fit result survived edit');
  if (!(await page.getByRole('radio', { name: "I'm not sure", exact: true }).first().evaluate((el) => el === document.activeElement))) throw new Error('Edit action did not focus the question');
  await page.getByRole('radio', { name: 'We manage and resell it for a customer' }).check();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Check fit' }).click();
  await page.getByRole('heading', { name: 'Answers look in scope' }).waitFor();
  await page.getByRole('button', { name: 'Go to record comparison' }).click();
  if (!(await page.locator('input[name="renewalTerm"]').first().evaluate((el) => el === document.activeElement))) throw new Error('Continue action did not focus record comparison');

  await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check();
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  const pax = `source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\nsynthetic-account,sub-action,customer-a,pax8,Microsoft 365,NCE,yes,annual,${date},renew\n`;
  const halo = 'line_id,subscription_id,customer_ref,billing_system\nline-action,sub-action,customer-a,HaloPSA\n';
  await page.locator('#pax-file').setInputFiles({ name: 'pax8.csv', mimeType: 'text/csv', buffer: Buffer.from(pax) });
  await page.locator('#halo-file').setInputFiles({ name: 'halo.csv', mimeType: 'text/csv', buffer: Buffer.from(halo) });
  await page.getByRole('textbox', { name: 'Pax8 subscription ID to check' }).fill('sub-action');
  await page.getByRole('button', { name: 'Check record facts' }).click();
  await page.getByRole('heading', { name: 'Confirm these records describe the same case' }).waitFor();
  if (!(await page.getByText(/Next action — Compare the selected subscription/i).isVisible())) throw new Error('Record-link confirmation action missing');
  await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click();
  await page.getByRole('heading', { name: 'Supplied records look in scope provisionally' }).waitFor();
  if (!(await page.locator('#record-next-action').getByText(/prototype stops here/i).isVisible())) throw new Error('Positive result implies unsupported completion');
  await page.getByRole('radio', { name: 'I have not confirmed the next term' }).check();
  if (await page.locator('#record-result').isVisible()) throw new Error('Old record result survived next-term change');
  await page.getByRole('button', { name: 'Check record facts' }).click();
  await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click();
  await page.getByRole('heading', { name: 'More evidence is needed' }).waitFor();
  if (!(await page.getByText(/Next action — Check Pax8 Manage renewal/i).isVisible())) throw new Error('Next-term verification action missing');
  await page.getByRole('button', { name: 'Update the item to verify' }).click();
  if (!(await page.locator('input[name="renewalTerm"]').first().evaluate((el) => el === document.activeElement))) throw new Error('Verification action did not focus next-term response');
  await page.locator('#pax-file').setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from('broken\nvalue\n') });
  await page.getByRole('button', { name: 'Check record facts' }).click();
  await page.getByRole('heading', { name: 'Repair the supplied input' }).waitFor();
  if (!(await page.getByText(/Next action — Missing columns:/i).isVisible())) throw new Error('Input repair action lacks exact missing columns');
  await page.getByRole('button', { name: 'Correct the supplied input' }).click();
  if (!(await page.locator('#pax-file').evaluate((el) => el === document.activeElement))) throw new Error('Input repair action did not focus the file');
  await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check();
  await page.locator('#pax-file').setInputFiles({ name: 'pax-conflict.csv', mimeType: 'text/csv', buffer: Buffer.from(pax.replace(',pax8,', ',other,')) });
  await page.locator('#halo-file').setInputFiles({ name: 'halo-conflict.csv', mimeType: 'text/csv', buffer: Buffer.from(halo.replace(',HaloPSA\n', ',other\n')) });
  await page.getByRole('button', { name: 'Check record facts' }).click();
  await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click();
  await page.getByRole('heading', { name: 'Resolve conflicting claims' }).waitFor();
  await page.getByRole('button', { name: 'Use supplied Pax8 value for distributor' }).click();
  await page.getByRole('button', { name: 'Review first unresolved conflict' }).click();
  const focused = await page.evaluate(() => document.activeElement?.textContent);
  if (!focused?.includes('Use supplied HaloPSA value for billing')) throw new Error(`Review action focused a resolved conflict: ${focused}`);
  return 'PASS: source-specific fit action, edit focus, record comparison focus, confirmation, provisional stop, stale-result invalidation, next-term verification, input repair, and first-unresolved-conflict focus';
}
