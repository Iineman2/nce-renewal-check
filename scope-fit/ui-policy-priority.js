async (page) => {
  await page.addInitScript(() => {
    const NativeDate = Date;
    window.Date = class extends NativeDate {
      constructor(...args) { if (args.length === 0) super('2027-01-01T12:00:00'); else super(...args); }
      static now() { return new NativeDate('2027-01-01T12:00:00').valueOf(); }
    };
  });
  await page.goto('http://localhost:8765/');
  await page.getByRole('heading', { name: 'Scope rules need review' }).waitFor({ state: 'visible' });
  if (await page.locator('#fit-form').isVisible()) throw new Error('Expired policy asked a questionnaire question');
  if (await page.locator('#preflight').isVisible()) throw new Error('Expired policy exposed record preflight');
  if (await page.getByRole('button', { name: 'Continue to record comparison' }).count()) throw new Error('Expired policy offered unnecessary questions');
  return 'PASS: expired policy appears before any question and blocks record preflight';
}
