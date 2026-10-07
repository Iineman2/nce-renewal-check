async (page) => {
  // Migrated lifecycle/read faults use a real Worker gate, not a main-realm File API override.
  await page.addInitScript({content: await (await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+await (await page.request.get('http://localhost:8765/qc-worker-entry.js')).text()});});

  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const NativeDate = Date;
    window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : ['2026-12-30T12:00:00'])); } };
    const original = File.prototype.text;
    window.__stall = false;
    window.__processingTextControl = function () { return window.__stall ? new Promise(resolve => { (window.__reads ??= []).push(() => original.call(this).then(resolve)); }) : original.call(this); };
  });
  const fit=async()=>{
  await page.goto('http://localhost:8765/');
  for (const [field, value] of [['reseller','yes'],['distributor','pax8'],['billing','halopsa'],['commitment','annual-m365-nce']]) {
    await page.locator(`input[name="${field}"][value="${value}"]`).check(); await page.getByRole('button',{name:'Next',exact:true}).click();
  }
  await page.locator('input[name="renewal"][value="exact"]').check(); await page.locator('#renewal-date').fill('2027-01-15');
  await page.getByRole('button',{name:'Check fit',exact:true}).click();
  await page.getByRole('radio',{name:'Annual commitment',exact:true}).check(); await page.getByRole('radio',{name:'Yes',exact:true}).check();
  };
  const header = 'subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\n';
  const row = (id,customer,date='2027-01-15') => `${id},${customer},pax8,Microsoft 365,NCE,yes,annual,${date},renew\n`;
  const supply = async (pax, halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n') => {
    for (const [id,text] of [['pax-file',pax],['halo-file',halo]]) await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
  };
  const submit = () => page.getByRole('button',{name:'Check record facts',exact:true}).click();
  const card = page.locator('#case-subject');
  const check = async (pattern, message) => { try { await page.waitForFunction(source => new RegExp(source).test(document.querySelector('#case-subject').innerText.replace(/\n+/g, '\n')), pattern.source); } catch { throw new Error(message + ': ' + await card.innerText()); } };


  const escape = value => '"'+value.replaceAll('"','""')+'"';
  const headers=header.trim().split(',').concat(['source_account_id','customer_name','notes','empty']);
  const note='  literal [U+202E] and \\u202e, comma, quote "\r\n<img src=x onerror=alert(1)>\u202E\u200B\t'+ 'x'.repeat(800)+'  ';
  const values=['s',' c ','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew','a','Same customer',note,''];
  const original=values.map(escape).join(',');
  const source='\uFEFF'+headers.join(',')+'\r\n\r\n'+original+'\r\n';
  const display=value=>value.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu,char=>'[U+'+char.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')+']');
  const load=async(pax=source,halo='bad')=>{await fit();await supply(pax,halo);await page.locator('#subscription-id').fill('s');await submit();await card.getByText('Pax8 subscription: s',{exact:true}).waitFor();};
  await load();
  const summary=page.locator('#case-subject > details > summary');await summary.focus();await page.keyboard.press('Enter');
  if(!await page.locator('#case-subject > details').evaluate(el=>el.open))throw new Error('Inspector not keyboard accessible');
  const table=card.getByRole('table',{name:'Selected record: supplied and normalized fields'});
  if(await table.locator('tbody tr').count()!==headers.length)throw new Error('Fields omitted');
  const customer=table.locator('[data-column="customer_ref"] td');
  if(await customer.nth(0).textContent()!==' c '||await customer.nth(1).textContent()!=='c')throw new Error('Raw/normalized distinction lost');
  const notes=table.locator('[data-column="notes"] td');
  if(await notes.nth(0).textContent()!==display(note)||await notes.nth(1).textContent()!==display(note.trim()))throw new Error('Raw control/quote/long data changed');
  if(await table.locator('[data-column="empty"] td').nth(0).textContent()!=='""')throw new Error('Empty cell hidden');
  if(await card.locator('.case-evidence-original').textContent()!==display(original))throw new Error('Original record reconstructed or truncated');
  const exact=await card.locator('.case-evidence-json').textContent();if(JSON.parse(exact)!==original||/[\p{Cf}\p{Zl}\p{Zp}]/u.test(exact))throw new Error('JSON evidence is not lossless and visible');
  if(await card.locator('img,script,a[href]').count())throw new Error('Source executed or linked');
  if(!(await card.innerText()).includes('not physical line numbers'))throw new Error('Misleading locator');
  await page.addScriptTag({url:'http://localhost:8765/qc-vendor/axe-4.10.3.min.js'});
  const scan=async()=>{const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>v.id));if(violations.length)throw new Error('Inspector axe: '+violations);};
  await scan();await page.setViewportSize({width:320,height:740});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
  const widths=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);if(widths[0]>widths[1])throw new Error('Evidence mobile overflow '+widths);
  await scan();await page.locator('#case-subject > details').screenshot({path:'output/playwright/one-case-principle-3-evidence-mobile.png'});
  await summary.focus();await page.keyboard.press('Space');if(await page.locator('#case-subject > details').evaluate(el=>el.open))throw new Error('Cannot collapse inspector');
  await page.locator('#subscription-id').fill('absent');if(await card.locator('.case-evidence-fields,.case-evidence-original').count())throw new Error('Evidence survived changed ID');
  await submit();if(await card.locator('details').count())throw new Error('Absent subject has evidence');
  await fit();await supply(source+'\r\n'+original,'bad');await page.locator('#subscription-id').fill('s');await submit();await check(/found 2/,'Duplicate not unresolved');if(await card.locator('details').count())throw new Error('Duplicate has evidence');

  await load();await page.locator('#pax-file').setInputFiles({name:'pax-file.csv',mimeType:'text/csv',buffer:Buffer.from(source.replace('Same customer','Changed customer'))});
  if(await card.locator('details').count())throw new Error('Evidence survived source replacement');
  await submit();await card.getByText(/Changed customer/).first().waitFor();
  await page.getByRole('button',{name:'Clear files and result',exact:true}).click();
  if(await card.locator('details').count())throw new Error('Evidence survived clear');
  await page.route('**/preflight.mjs',async route=>{const response=await route.fetch();let text=await response.text();text=text.replace('export function selectCaseSubject(', 'function originalSelectCaseSubject(');
    text+=`\nexport function selectCaseSubject(...args){const original=originalSelectCaseSubject(...args);const value=JSON.parse(JSON.stringify(original));const fault=globalThis.__fault;globalThis.__evidenceReads=0;if(value.subject){if(fault==='original')value.subject.evidence.originalRecord='FORGED';if(fault==='normalized')value.subject.evidence.fields[0].normalizedValue='FORGED';if(fault==='missing')delete value.subject.evidence;if(fault==='getter')Object.defineProperty(value.subject.evidence,'originalRecord',{enumerable:true,get(){globalThis.__evidenceReads++;return 'FORGED';}});}return value;}`;await route.fulfill({response,body:text});});
  for(const fault of ['original','normalized','missing','getter']){
    await fit();await supply(source);await page.locator('#subscription-id').fill('s');await page.evaluate(fault=>window.__fault=fault,fault);await submit();
    await page.getByRole('heading',{name:'The check could not finish',exact:true}).waitFor();
    if(await card.locator('details').count()||await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).count())throw new Error('Forged evidence permits display or confirmation');
    if(await page.locator('#original-pax-file .save-original').count()!==1||!(await page.locator('#original-pax-file').textContent()).includes('SHA-256 of exact original bytes:'))throw new Error('Comparison validation erased the independently verified original');
    if(await page.evaluate(()=>window.__evidenceReads)!==0)throw new Error('Evidence getter invoked');
  }
  if(errors.length)throw new Error(errors.join('\n'));
  return 'PASS: original CSV/raw-normalized complete evidence, BOM/quotes/control escaping, literal HTML, failed-Halo inspectability, keyboard table inspector, desktop/mobile200% axe and reflow, replacement/ID/duplicate/clear invalidation and forged evidence/getter rejection';
}
