async page=>{
 const assertions=[],measurements=[];
 await page.addInitScript({content:await(await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-12-30T12:00:00']));}};});await page.goto('http://localhost:8765/');
 const result=await page.evaluate(async()=>{
  const r=await import('/bounded-reader.mjs'),e=await import('/file-evidence.mjs'),s=(await import('/actions.mjs')).SOURCES,out=[];
  const head='line_id,subscription_id,customer_ref,billing_system',row='l,s,c,HaloPSA',make=(head,rows)=>head+'\n'+rows.join('\n');
  const cols=n=>head+','+Array.from({length:n-4},(_,i)=>'e'+i).join(','),wide=n=>row+','+Array(n-4).fill('x').join(',');
  const cases=[];
  for(const n of[4999,5000,5001])cases.push({kind:'rows',n,text:make(head,Array(n).fill(row)),failure:n>5000,diagnostic:'5000'});
  for(const n of[9999,10000,10001])cases.push({kind:'source-records',n,text:head+'\n'+'\n'.repeat(n-2)+row,failure:n>10000,diagnostic:'10000'});
  for(const n of[65535,65536,65537]){const full=Math.floor(n/64),tail=n%64;cases.push({kind:'cells',n,text:make(cols(64),Array(full-1).fill(wide(64)))+(tail?'\n'+Array(tail).fill('x').join(','):''),failure:n>65536,profileRepair:tail>0,diagnostic:'65536'});}
  for(const n of[63,64,65])cases.push({kind:'columns',n,text:make(cols(n),[wide(n)]),failure:n>64,diagnostic:'64'});
  for(const n of[63,64,65])cases.push({kind:'header',n,text:make(head+','+'h'.repeat(n),[row+',x']),failure:n>64,diagnostic:'64'});
  for(const n of[1023,1024,1025])cases.push({kind:'raw-cell',n,text:make(head+',extra',[row+','+'x'.repeat(n)]),failure:n>1024,diagnostic:'1024'});
  for(const n of[4095,4096,4097])cases.push({kind:'lexeme',n,text:make(head+',extra',[row+',"x"'+'\t'.repeat(n-3)]),failure:n>4096,diagnostic:'4096'});
  for(const c of cases){const before=__qcWorkers.length,a=await r.readBoundedLocalEvidence(new File([c.text],'matrix.csv'),'halo-file',s.halo),p=e.sourceProjection(a.handle,'halo-file');
   if(new TextDecoder().decode(e.originalBytes(a.handle,'halo-file'))!==c.text||__qcWorkers.length!==before+1||__qcWorkers.at(-1).stops!==1)throw Error('Native custody/stop wrong '+c.kind+c.n);
   if(c.failure){if(!a.problem?.message.includes(c.diagnostic))throw Error('Wrong failure cause '+c.kind+c.n+JSON.stringify(a.problem));if(c.kind!=='header'&&p.lexicalComplete)throw Error('Over-limit lexical prefix claimed complete');}
   else if(c.profileRepair?!a.problem:!!a.problem)throw Error('Wrong frontier admission '+c.kind+c.n+JSON.stringify(a.problem));
   e.releaseFileEvidence(a.handle);out.push({kind:c.kind,n:c.n,failure:c.failure,problem:a.problem?.message??null,complete:p.lexicalComplete,bytes:new TextEncoder().encode(c.text).length,stops:__qcWorkers.at(-1).stops});
  }
  // Every width exercises all preview transitions, last pages and exact bytes.
  for(let width=1;width<=64;width++){
   const text=make(Array.from({length:width},(_,i)=>'h'+i).join(','),Array.from({length:11},(_,i)=>Array(width).fill(String(i)).join(','))),a=await r.readBoundedLocalEvidence(new File([text],'preview.csv'),'halo-file',s.halo),seen=[];
   for(let offset=0;offset<12;){const p=e.sourceProjection(a.handle,'halo-file',offset),size=Math.min(5,Math.floor(64/width));if(p.pageSize!==size||p.records.length>size||p.records.reduce((n,r)=>n+r.cells.length,0)>64)throw Error('Preview width frontier '+width);seen.push(...p.records.map(r=>r.sourceRecordOrdinal));offset+=p.pageSize;}
   if(JSON.stringify(seen)!==JSON.stringify(Array.from({length:12},(_,i)=>i+1))||new TextDecoder().decode(e.originalBytes(a.handle,'halo-file'))!==text)throw Error('Preview omitted/changed rows '+width);e.releaseFileEvidence(a.handle);out.push({kind:'preview-width',n:width,records:seen.length,pageSize:Math.min(5,Math.floor(64/width))});
  }
  return{cases:out,state:r.processingState(),workers:__qcWorkers.length};
 });
 for(const c of result.cases)assertions.push('F13P3-N-'+c.kind+'-'+c.n);measurements.push(result);if(result.state.activeJobs||result.state.reservedBytes||result.state.cachedSources)throw Error('Native matrix left resources');
 const ph='source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state',hh='line_id,subscription_id,customer_ref,billing_system';
 const p=ph+'\n'+Array.from({length:5000},(_,i)=>`a,s${i},c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew`).join('\n'),h=hh+'\n'+Array.from({length:5000},(_,i)=>`l${i},s${i},c,HaloPSA`).join('\n');
 for(const[id,text]of[['halo-file',h],['pax-file',p]])await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});await page.waitForFunction(()=>document.querySelector('#case-choice option[value="1"]')&&document.getElementById('cancel-case-finder').hidden);await page.locator('#case-query').fill('s4999');await page.locator('#case-choice').selectOption('5000');if(await page.locator('#subscription-id').inputValue()!=='s4999')throw Error('Paired maximum selected wrong row');await page.getByRole('button',{name:'Check records',exact:true}).click();await page.waitForFunction(()=>document.getElementById('read-status').hidden&&!document.getElementById('record-result').hidden);await page.locator('#open-evidence').click();if(await page.locator('#record-info h3').textContent()!=='Confirm these records describe the same case'||!(await page.locator('#case-subject').textContent()).includes('s4999')||await page.locator('.save-original').count()!==2)throw Error('Paired maxima lost canonical last-row case/custody');assertions.push('F13P3-N-paired-5000-last');
 const pair=await page.evaluate(async()=>({rows:5000,id:document.getElementById('subscription-id').value,heading:document.querySelector('#record-info h3').textContent,line:document.getElementById('record-info').textContent.includes('HaloPSA line l4999'),copies:document.querySelectorAll('.save-original').length,workers:__qcWorkers.slice(85),state:(await import('/bounded-reader.mjs')).processingState(),sizes:['pax-file','halo-file'].map(id=>document.getElementById(id).files[0].size)}));measurements.push({phase:'paired-5000',...pair});
 return 'PASS: F13P3-MATRIX:'+JSON.stringify({assertions,measurements,scope:'native normalized CSV frontiers and every source-preview width; admitted reservations are not resident memory'});
}
