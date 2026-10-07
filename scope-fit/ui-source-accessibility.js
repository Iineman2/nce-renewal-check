async (page) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const axeSource = 'http://localhost:8765/qc-vendor/axe-4.10.3.min.js';
  const scan = async name => {
    if (!await page.evaluate(() => Boolean(window.axe))) await page.addScriptTag({ url: axeSource });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(item => item.id));
    if (violations.length) throw new Error(`${name}: ${violations}`);
  };
  await page.goto('http://localhost:8765/');
  for (const name of ['We manage and resell it for a customer', 'Pax8', 'HaloPSA', 'Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)']) {
    await page.getByRole('radio', { name, exact: true }).check(); await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  const date = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 14); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  await page.getByRole('radio', { name: 'I know the date', exact: true }).check(); await page.locator('#renewal-date').fill(date); await page.getByRole('button', { name: 'Check fit', exact: true }).click();
  const questionSummary = page.locator('#result .claim-trail summary');
  await questionSummary.focus(); await page.keyboard.press('Enter');
  if (!await page.locator('#result .claim-trail').evaluate(el => el.open)) throw new Error('Questionnaire trail not keyboard operable');
  await scan('expanded-questionnaire');
  await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check(); await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  const raw = '<img src=x onerror=alert(1)>' + 'x'.repeat(900);
  const pax = `source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state,billing_frequency\nsynthetic-account,s,c,pax8,Microsoft 365,NCE,yes,annual,${date},renew,${raw}\n`;
  const halo = 'line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
  for (const [id, text] of [['pax-file', pax], ['halo-file', halo]]) await page.locator(`#${id}`).setInputFiles({ name: id + '.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
  await page.locator('#subscription-id').fill('s'); await page.getByRole('button', { name: 'Check record facts', exact: true }).click();
  const summary = page.locator('#record-result .claim-trail summary'); await summary.focus(); await page.keyboard.press('Enter'); await scan('expanded-pending-link');
  await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click();
  // Primary next action retains first keyboard position before the expanded trace.
  await page.keyboard.press('Tab');
  if (!await page.locator('#record-next-action button').evaluate(el => el === document.activeElement)) throw new Error('Trail displaced primary action');
  await summary.focus(); await page.keyboard.press('Space');
  if (!await page.locator('#record-result .claim-trail').evaluate(el => el.open)) throw new Error('Record trail not keyboard operable');
  await scan('expanded-economic-result');
  if (await page.locator('#record-result img, #record-result script').count()) throw new Error('Raw CSV HTML executed');
  if (!await page.locator('#record-result .claim-trail').getByText(raw, { exact: false }).isVisible()) throw new Error('Raw economic context absent');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
  if (width.content > width.viewport) throw new Error(`Expanded trace overflow at 320px/200%: ${JSON.stringify(width)}`);
  await scan('expanded-economic-mobile-200');
  await page.locator('#record-result .claim-trail-row[data-field="commitment"]').screenshot({ path: 'output/playwright/principle-8-commitment-mobile.png' });
  await summary.focus(); await page.keyboard.press('Enter');
  if (await page.locator('#record-result .claim-trail').evaluate(el => el.open)) throw new Error('Record trail cannot collapse with keyboard');
  if (errors.length) throw new Error(`Uncaught errors: ${errors}`);
  return 'PASS: expanded questionnaire/pending/economic desktop and mobile axe A/AA, Enter/Space trail controls, primary action focus, literal HTML safety and 320px/200% reflow';
}
