async (page) => {
  await page.addInitScript(()=>{
    const NativeDate=Date;window.__today='2026-12-31';
    window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[window.__today+'T12:00:00']));}static now(){return new NativeDate(window.__today+'T12:00:00').valueOf();}};
  });
  await page.goto('http://localhost:8765/');
  await page.getByRole('radio',{name:'The customer buys directly'}).check();await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByRole('button',{name:'Continue to record comparison'}).click();
  await page.evaluate(()=>{window.__today='2027-01-01';window.dispatchEvent(new Event('focus'));});
  await page.getByRole('heading',{name:'Scope rules need review'}).waitFor();
  if(await page.locator('#fit-form').isVisible()||await page.locator('#preflight').isVisible())throw new Error('In-progress policy expiry allowed more work');
  await page.locator('#result summary').filter({ hasText: 'If I cannot obtain or verify the evidence' }).click();if(!await page.getByText(/The product owner must review/).isVisible())throw new Error('Owner-only policy has no visitor stop');
  await page.addScriptTag({url:'http://localhost:8765/qc-vendor/axe-4.10.3.min.js'});
  const scan=await page.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations);
  if(scan.length)throw new Error('Policy error accessibility violations');

  await page.goto('http://localhost:8765/');
  for(const name of ['We manage and resell it for a customer','Pax8','HaloPSA','Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)']){await page.getByRole('radio',{name,exact:true}).check();await page.getByRole('button',{name:'Next',exact:true}).click();}
  await page.getByRole('radio',{name:'I know the date'}).check();await page.locator('#renewal-date').fill('2027-01-15');await page.getByRole('button',{name:'Check fit'}).click();
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  if(await page.locator('#result').isVisible()||await page.locator('#preflight').isVisible())throw new Error('History-restored result remained');
  if(!await page.getByText(/restored from browser history/).isVisible())throw new Error('History restore lacks recheck task');

  // Module/dependency load failure leaves a visible supported-browser/reload boundary.
  await page.route('**/actions.mjs',route=>route.abort());await page.goto('http://localhost:8765/');
  if(!await page.locator('#runtime-warning').isVisible())throw new Error('Module load failure has no fallback');
  if(await page.locator('#result').isVisible()||await page.locator('#record-result').isVisible())throw new Error('Failed module showed result');
  await page.unroute('**/actions.mjs');await page.reload();if(await page.locator('#runtime-warning').isVisible())throw new Error('Runtime warning survived supported load');
  await page.addInitScript(()=>{File.prototype.text=undefined;});await page.reload();
  if(!await page.locator('#runtime-warning').isVisible()||await page.locator('#fit-form').isVisible())throw new Error('Unsupported file API lacks safe startup boundary');
  return 'PASS: policy expiry while in-progress, owner-only stop, zero policy axe violations, history restore invalidation, module-load and unsupported-API fallback';
}
