async (page) => {
  await page.goto('http://localhost:8765/');
  const next = page.getByRole('button', { name: 'Next' });
  for (const name of ['We manage and resell it for a customer', 'Pax8', 'HaloPSA']) {
    await page.getByRole('radio', { name, exact: true }).check();
    await next.click();
  }
  const group = page.locator('fieldset').nth(3);
  if ((await group.getAttribute('aria-describedby')) !== 'commitment-help') throw new Error('Commitment help is not associated with the question');
  if (!(await group.getByText(/annual commitment can be billed monthly/i).isVisible())) throw new Error('Annual versus monthly billing explanation is missing');
  if (!(await group.getByText(/if you only know one of those, choose/i).isVisible())) throw new Error('Uncertainty route is not explained');
  await page.addScriptTag({ url: 'http://localhost:8765/qc-vendor/axe-4.10.3.min.js' });
  const scan = async (stage) => {
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map((item) => item.id));
    if (violations.length) throw new Error(`${stage}: ${violations.join(', ')}`);
  };
  await scan('commitment question');
  await group.getByRole('radio', { name: 'Pax8 shows a monthly commitment term' }).check();
  await next.click();
  await page.getByRole('heading', { name: 'Answers indicate outside this release' }).waitFor({ state: 'visible' });
  await scan('monthly commitment result');
  if (!(await page.getByText(/monthly invoicing alone does not establish a monthly commitment/i).isVisible())) throw new Error('Monthly commitment result conflates billing and term');
  await page.getByRole('button', { name: 'Edit commitment answer' }).click();
  await group.getByRole('radio', { name: /Annual commitment for seat-based Microsoft 365 NCE \(may be billed monthly\)/ }).check();
  await next.click();
  const date = await page.evaluate(() => {
    const value = new Date(); value.setDate(value.getDate() + 14);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  });
  await page.getByRole('radio', { name: 'I know the date' }).check();
  await page.getByRole('textbox', { name: 'Renewal date' }).fill(date);
  await page.getByRole('button', { name: 'Check fit' }).click();
  await page.getByRole('heading', { name: 'Answers look in scope' }).waitFor({ state: 'visible' });
  const pax = `source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state,billing_frequency\nsynthetic-account,sub-language,customer-a,pax8,Microsoft 365,NCE,yes,annual,${date},renew,monthly\n`;
  const halo = 'line_id,subscription_id,customer_ref,billing_system\nline-language,sub-language,customer-a,HaloPSA\n';
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check();
  await page.locator('#pax-file').setInputFiles({ name: 'pax8.csv', mimeType: 'text/csv', buffer: Buffer.from(pax) });
  await page.locator('#halo-file').setInputFiles({ name: 'halo.csv', mimeType: 'text/csv', buffer: Buffer.from(halo) });
  await page.getByRole('textbox', { name: 'Pax8 subscription ID to check' }).fill('sub-language');
  await page.getByRole('button', { name: 'Check record facts' }).click();
  await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click();
  await page.getByRole('heading', { name: 'Supplied records look in scope provisionally' }).waitFor({ state: 'visible' });
  if (!(await page.getByText(/commitment_term field, not invoice frequency/i).isVisible())) throw new Error('Record result does not state which economic field was used');
  await page.locator('#record-result .claim-trail summary').click();
  if (!(await page.locator('#record-result .claim-trail-row[data-field="commitment"]').getByText(/columns product_family, commerce_model, seat_based, commitment_term/i).isVisible())) throw new Error('Commitment source provenance is missing');
  await page.reload();
  for (const name of ['We manage and resell it for a customer', 'Pax8', 'HaloPSA']) {
    await page.getByRole('radio', { name, exact: true }).check();
    await next.click();
  }
  await page.getByRole('radio', { name: "I'm not sure of the commitment term" }).check();
  await next.click();
  await page.getByRole('radio', { name: 'I know the date' }).check();
  await page.getByRole('textbox', { name: 'Renewal date' }).fill(date);
  await page.getByRole('button', { name: 'Check fit' }).click();
  await page.getByRole('heading', { name: 'May fit — verify these items' }).waitFor({ state: 'visible' });
  if (!(await page.getByText(/invoice frequency alone cannot establish the commitment term/i).isVisible())) throw new Error('Invoice-only knowledge did not lead to a verification task');
  return 'PASS: commitment/billing distinction, monthly-term repair, annual term with monthly billing, unknown-term verification, source provenance, and zero tested A/AA violations';
}
