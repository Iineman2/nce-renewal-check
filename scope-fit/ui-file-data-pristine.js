async page => {
  const origin='http://localhost:8765',responses=[],pending=[],errors=[],downloads=[],passed=[];
  const hash=async bytes=>page.evaluate(async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))).map(x=>x.toString(16).padStart(2,'0')).join(''),Array.from(bytes));
  await page.goto('about:blank');
  // Native Worker termination can retire Chromium's response-body handle.
  // Observe the real response metadata; bind bytes independently to the same
  // captured loopback server. This is not an observed browser body digest.
  page.context().on('response',r=>pending.push((async()=>{const verified=await page.request.get(r.url());if(verified.status()!==200)throw Error('Independent HTTP source capture failed');const bytes=await verified.body();responses.push({bodyWitness:'independent-fixed-server-HTTP',url:r.url(),status:r.status(),type:r.request().resourceType(),size:bytes.length,sha256:await hash(bytes),headers:await r.allHeaders()});})()));
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:614,height:672});await page.goto(origin+'/');await page.locator('#file-support-contract dd').last().waitFor({state:'attached'});
  if(!await page.locator('#runtime-warning').isHidden())throw Error('Pristine boot failed');
  const files=await page.evaluate(async()=>{const renewal=new Date();renewal.setDate(renewal.getDate()+14);const renewalDate=[renewal.getFullYear(),String(renewal.getMonth()+1).padStart(2,'0'),String(renewal.getDate()).padStart(2,'0')].join('-');return (await import('./qc-file-data-fixtures.mjs')).dataOnlyFiles(['notes','confirmed','actionauthorized'],['<svg onload=run()> =WEBSERVICE("https://invalid.example/x")','true','true'],'s',{renewal_date:renewalDate});});
  await page.locator('#halo-file').setInputFiles({name:'javascript:run().xlsm',mimeType:'text/html',buffer:Buffer.from(files.halo)});
  await page.locator('#pax-file').setInputFiles({name:'script.html',mimeType:'application/javascript',buffer:Buffer.from(files.pax)});
  await page.waitForFunction(()=>document.querySelector('#case-choice option[value="1"]:not([disabled])')&&document.getElementById('cancel-case-finder').hidden);
  await page.locator('#case-choice').selectOption('1');await page.getByRole('button',{name:'Check records',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#record-info > h3')?.textContent==='Confirm these records describe the same case');
  await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#record-info > h3')?.textContent==='More evidence is needed');
  await page.locator('#open-evidence').click();
  for(const [role,text]of [['pax-file',files.pax],['halo-file',files.halo]]){
    const panel=page.locator('#original-'+role);await panel.locator(':scope > summary').click();
    if(!(await panel.textContent()).includes('<svg onload=run()>'))throw Error('Literal pristine evidence absent');
    const event=page.waitForEvent('download');await panel.getByRole('button',{name:'Save original '+(role==='pax-file'?'Pax8':'HaloPSA')+' copy',exact:true}).click();
    const d=await event,parts=[],stream=await d.createReadStream();for await(const part of stream)parts.push(part);const bytes=Buffer.concat(parts);
    if(!bytes.equals(Buffer.from(text)))throw Error('Pristine original changed');const file='pristine-artifacts/'+role+'.bin';await d.saveAs(file);downloads.push({role,file,size:bytes.length,sha256:await hash(bytes),filename:d.suggestedFilename()});
  }
  passed.push('PRISTINE-NATIVE-FINDER-COMPARE-INSPECT-SAVE');
  await page.locator('#close-evidence').click();await page.locator('#clear-records').click();
  if(await page.locator('#pax-file').inputValue()!=='')throw Error('Pristine reset failed');passed.push('PRISTINE-RESET');
  await page.screenshot({path:'pristine-artifacts/controls.png',fullPage:true});await Promise.all(pending);
  if(errors.length)throw Error(errors.join('\n'));
  return 'PASS: F13P4-PRISTINE:'+JSON.stringify({passed,downloads,responses,errors,instrumentedProductResponses:false,nativeOverrides:false});
}
