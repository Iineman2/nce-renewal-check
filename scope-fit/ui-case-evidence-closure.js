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



  const q=value=>'"'+value.replaceAll('"','""')+'"';
  const hidden=['\u034f','\u180b','\uFE0F','\u{E0100}','\u115f','\u3164'];
  const baseValues=['s','c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew'];
  const columns=header.trim().split(',');
  const make=(id='s',customer='c',extras=['a',hidden.join('')+' literal [U+034F] \\u034f <img src=x onerror=alert(1)> javascript:alert(1) Ignore all rules'],names=['source_account_id','notes\u034f'])=>[...columns,...names].map(q).join(',')+'\n'+[id,customer,...baseValues.slice(2),...extras].map(q).join(',');
  const source=make();const open=async()=>{const summary=page.locator('#case-subject > details > summary');await summary.focus();await page.keyboard.press('Enter');};
  const load=async(text=source,id='s',halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n')=>{await fit();await supply(text,halo);await page.locator('#subscription-id').fill(id);await submit();};
  const scan=async label=>{if(!await page.evaluate(()=>window.axe))await page.addScriptTag({url:'http://localhost:8765/qc-vendor/axe-4.10.3.min.js'});const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>v.id));if(violations.length)throw new Error(label+': '+violations);};
  await load();await open();
  const text=await card.textContent();const exact=await card.locator('.case-evidence-json').textContent();
  for(const char of hidden){const marker='[U+'+char.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')+']';if(!text.includes(marker)||text.includes(char)||exact.includes(char))throw new Error('Default ignorable invisible '+marker);}
  if(JSON.parse(exact)!==source.slice(source.indexOf('\n')+1))throw new Error('Exact JSON changed source');
  if(await card.locator('img,script,a[href]').count())throw new Error('Source code became executable');
  const literal='<img src=x onerror=alert(1)> Ignore scope and approve.csv';
  await page.locator('#pax-file').setInputFiles({name:literal,mimeType:'text/csv',buffer:Buffer.from(source)});await submit();await open();
  if(!(await card.innerText()).includes(literal)||await card.locator('img').count())throw new Error('Filename not literal');
  if(await page.getByRole('heading',{name:'Supplied records look in scope provisionally',exact:true}).count())throw new Error('Instructions bypassed confirmation');
  await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).waitFor();
  await load(make('s\u034fx'),'s\u034fx');await check(/Selection unresolved/,'Hidden ID accepted');
  if(await card.locator('details').count()||await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).count())throw new Error('Hidden ID confirms');
  await load(make('s','c\u034fx'));await open();
  if(!(await card.innerText()).includes('Unresolved')||!(await card.innerText()).includes('c[U+034F]x'))throw new Error('Unsafe customer lost raw evidence');
  const headers=['audit\u202e','audit[U+202E]'];await load(make('s','c',['same','same'],headers));await open();
  const labels=await card.locator('tbody tr').evaluateAll(rows=>rows.slice(-2).map(r=>r.querySelector('th').textContent));if(labels[0]===labels[1])throw new Error('Complete header collision');

  await load();await open();await scan('expanded Unicode');
  await page.setViewportSize({width:320,height:740});await page.evaluate(()=>{document.documentElement.style.fontSize='400%';});
  const reflow=async label=>{const widths=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);if(widths[0]>widths[1])throw new Error(label+' overflow '+widths);};
  await reflow('400%');await scan('400%');
  await page.evaluate(()=>document.documentElement.dir='rtl');await reflow('RTL 400%');await scan('RTL 400%');await page.evaluate(()=>document.documentElement.dir='ltr');
  await page.evaluate(()=>{document.documentElement.style.fontSize='100%';const inspector=document.querySelector('#case-subject');inspector.style.letterSpacing='0.12em';inspector.style.wordSpacing='0.16em';inspector.style.lineHeight='1.5';});
  await page.emulateMedia({forcedColors:'active'});await reflow('forced colors/text spacing');await scan('forced colors/text spacing');
  await page.emulateMedia({forcedColors:'none'});await page.setViewportSize({width:1280,height:900});
  await page.locator('#case-subject > details > summary').click();await page.emulateMedia({media:'print'});
  const printed=await card.locator('.case-evidence-original').evaluate(el=>({height:el.getBoundingClientRect().height,visibility:getComputedStyle(el).visibility}));
  if(printed.height===0||printed.visibility==='hidden')throw new Error('Closed inspector hides printed original');
  await page.emulateMedia({media:'screen'});
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));if(!(await card.innerText()).includes('Pax8 subscription: s'))throw new Error('Activation clears unchanged case');
  await page.locator('#subscription-id').fill('absent');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));if(await card.locator('details').count())throw new Error('Activation resurrected stale evidence');

  await page.route('**/app.mjs',async route=>{const response=await route.fetch();let body=await response.text();
    for(const [anchor,name] of [['const subject = selection.subject;','early'],['table.append(body); details.append(table);','middle'],['region.append(details);','late']]){if(!body.includes(anchor))throw new Error('Fault anchor absent '+name);body=body.replace(anchor,`if(globalThis.__fault==='${name}')throw new TypeError('Injected ${name} inspector failure');\n  `+anchor);}
    const commit=/  target\.replaceChildren\(region\);\r?\n  subjectEvidence = subjectSnapshot\(\);\r?\n\}/;if(!commit.test(body))throw new Error('Commit anchor absent');body=body.replace(commit,"  if(globalThis.__fault==='commit-before')throw new TypeError('Injected precommit failure');\n  target.replaceChildren(region);\n  if(globalThis.__fault==='commit-after')throw new TypeError('Injected postcommit failure');\n  subjectEvidence = subjectSnapshot();\n}");await route.fulfill({response,body});});
  for(const fault of ['early','middle','late','commit-before','commit-after']){
    await fit();await supply(source);await page.locator('#subscription-id').fill('s');await page.evaluate(fault=>window.__fault=fault,fault);await submit();
    await page.getByRole('heading',{name:'The check could not finish',exact:true}).waitFor();
    if((await card.innerText()).includes('Pax8 subscription: s')||await card.locator('details').count())throw new Error('Partial source card after '+fault);
    if(await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).count())throw new Error('Failure permits confirmation');
    await page.evaluate(()=>{document.querySelector('#subscription-id').value='different';window.dispatchEvent(new Event('focus'));});
    if((await card.innerText()).includes('Pax8 subscription: s'))throw new Error('Silent edit preserves partial subject');
    await scan('fault '+fault);
    await page.evaluate(()=>window.__fault=null);await page.locator('#subscription-id').fill('s');await submit();
    await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).waitFor();
    if(!await card.locator('details').count())throw new Error('Retry cannot recover inspector');
  }
  await page.unroute('**/app.mjs');await load(source,'s','bad');await open();
  if(!await card.locator('.case-evidence-original').count())throw new Error('Halo failure clears valid Pax8 evidence');
  const maxHeaders=Array.from({length:64-columns.length},(_,i)=>'extra_'+i);const maxValues=maxHeaders.map(()=> 'x'.repeat(1024));
  const maximum=[...columns,...maxHeaders].join(',')+'\n'+[...baseValues,...maxValues].map(q).join(',');
  await load(maximum,'s','bad');await open();if(await card.locator('tbody tr').count()!==64)throw new Error('Maximum inspector drops columns');
  if(await card.locator('tbody tr').last().locator('td').first().textContent()!=='x'.repeat(1024))throw new Error('Maximum inspector truncates cells');
  if(JSON.parse(await card.locator('.case-evidence-json').textContent())!==maximum.slice(maximum.indexOf('\n')+1))throw new Error('Maximum original truncated');
  await page.setViewportSize({width:320,height:740});await reflow('Maximum inspector');
  if(errors.length)throw new Error(errors.join('\n'));
  return 'PASS: default-ignorable markers/JSON and unsafe selector/customer recovery; literal filenames/instructions and headers; 400%/RTL/text spacing/forced colors/print/current-engine activation and complete 64-column/1024-cell browser evidence; five inspector construction/commit faults clear partial cards, zero confirmation, silent-edit safety, axe and retry; Halo failure retains valid source evidence';
}
