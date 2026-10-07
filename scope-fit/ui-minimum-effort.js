async (page) => {
  await page.goto('http://localhost:8765/');
  const fields = await page.locator('#fit-form input').evaluateAll((inputs) => [...new Set(inputs.map((input) => input.name))]);
  if (JSON.stringify(fields) !== JSON.stringify(['reseller', 'distributor', 'billing', 'commitment', 'renewal', 'renewalDate'])) {
    throw new Error(`Unexpected initial-fit field: ${JSON.stringify(fields)}`);
  }
  await page.getByRole('radio', { name: 'The customer buys directly' }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('heading', { name: 'Answers indicate outside this release' }).waitFor({ state: 'visible' });
  await page.addScriptTag({ url: 'http://localhost:8765/qc-vendor/axe-4.10.3.min.js' });
  const scan = async (stage) => {
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map((item) => item.id));
    if (violations.length) throw new Error(`${stage} accessibility violations: ${violations.join(', ')}`);
  };
  await scan('early outside');
  if (!(await page.getByText('4 scope questions not asked because this answer already determines the provisional route.').isVisible())) throw new Error('Skipped answers were not distinguished from unknowns');
  if (await page.locator('#preflight').isVisible()) throw new Error('Early exit exposed files or agreement preparation');
  await page.getByRole('button', { name: 'Continue to record comparison' }).click();
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
  await page.getByRole('heading', { name: 'Answers indicate outside this release' }).waitFor({ state: 'visible' });
  if (!(await page.locator('#preflight').isVisible())) throw new Error('Voluntary completion did not expose record comparison');
  await page.getByRole('button', { name: 'Change answers' }).click();
  await page.getByRole('radio', { name: 'We manage and resell it for a customer' }).check();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Check fit' }).click();
  await page.getByRole('heading', { name: 'Answers look in scope' }).waitFor({ state: 'visible' });
  await scan('complete fit and deferred preparation');
  if (!(await page.getByText(/when you move to record comparison, say whether the signed customer order or agreement is available/i).isVisible())) throw new Error('Deferred agreement preparation was hidden');
  if (!(await page.locator('#record-form').getByRole('radio', { name: 'I need to find it' }).isVisible())) throw new Error('Agreement preparation missing from record step');
  return 'PASS: five decision fields, early exit without invented unknowns, voluntary continuation, correction, and deferred agreement preparation';
}
