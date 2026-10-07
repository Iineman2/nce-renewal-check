async (page) => {
  let count=0;
  const names=['We manage and resell it for a customer','Pax8','HaloPSA','Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)'];
  const fit=async(unknown=-1)=>{
    await page.goto('http://localhost:8765/');
    for(let i=0;i<4;i++){await page.locator('#fit-form fieldset').nth(i).getByRole('radio',{name:i===unknown?(i===3?"I'm not sure of the commitment term":"I'm not sure"):names[i],exact:true}).check();await page.getByRole('button',{name:'Next',exact:true}).click();}
    const date=await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+14);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
    await page.locator('#fit-form fieldset').nth(4).getByRole('radio',{name:unknown===4?"I'm not sure":'I know the date',exact:true}).check();
    if(unknown!==4)await page.locator('#renewal-date').fill(date);await page.getByRole('button',{name:'Check fit'}).click();return date;
  };
  const fieldNames=['reseller','distributor','billing','commitment','renewal'];
  for(let i=0;i<5;i++){
    const date=await fit(i);await page.getByRole('button',{name:`Edit ${fieldNames[i]} answer after checking`,exact:true}).click();
    if(await page.evaluate(()=>document.activeElement.name)!==fieldNames[i])throw new Error(`Unknown ${fieldNames[i]} repair focus wrong`);
    await page.locator('#fit-form fieldset').nth(i).getByRole('radio',{name:i===4?'I know the date':names[i],exact:true}).check();
    if(i===4)await page.locator('#renewal-date').fill(date);for(let n=i;n<4;n++)await page.getByRole('button',{name:'Next',exact:true}).click();
    await page.getByRole('button',{name:'Check fit'}).click();await page.getByRole('heading',{name:'Answers look in scope'}).waitFor();count++;
  }
  const records=async(date,paxChanges={},haloChanges={})=>{
    const pax={source_account_id:'synthetic-account',subscription_id:'s',customer_ref:'c',distributor:'pax8',product_family:'Microsoft 365',commerce_model:'NCE',seat_based:'yes',commitment_term:'annual',renewal_date:date,end_of_term_state:'renew',...paxChanges};
    const halo={line_id:'l',subscription_id:'s',customer_ref:'c',billing_system:'HaloPSA',...haloChanges};
    for(const [id,row] of [['pax-file',pax],['halo-file',halo]])await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(Object.keys(row).join(',')+'\n'+Object.values(row).join(',')+'\n')});
    await page.getByRole('radio',{name:'Annual commitment',exact:true}).check();await page.getByRole('radio',{name:'Yes',exact:true}).check();await page.locator('#subscription-id').fill('s');
  };
  const check=async()=>{await page.getByRole('button',{name:'Check record facts'}).click();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).click();};
  for(const field of ['distributor','product_family','commerce_model','seat_based','commitment_term','renewal_date','end_of_term_state']){
    const date=await fit();await records(date,{[field]:'unknown'});
    if(field==='renewal_date') {
      await page.getByRole('button',{name:'Check record facts'}).click();
      await page.getByRole('heading',{name:'Resolve case selection uncertainty'}).waitFor();
      if(await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).count())throw new Error('Unknown occurrence permits confirmation');
    } else {
      await check();await page.getByRole('heading',{name:'More evidence is needed'}).waitFor();
      await page.getByRole('button',{name:'Update the item to verify'}).click();if(await page.evaluate(()=>document.activeElement.id)!=='pax-file')throw new Error(`${field} wrong file target`);
    }
    await records(date);await check();await page.getByRole('heading',{name:'Supplied records look in scope provisionally'}).waitFor();count++;
  }
  const date=await fit();await records(date,{}, {billing_system:'unknown'});await check();await page.getByRole('button',{name:'Update the item to verify'}).click();if(await page.evaluate(()=>document.activeElement.id)!=='halo-file')throw new Error('Unknown Halo target wrong');count++;
  // Source-file date outside the window must focus the accepted Pax8 evidence, not the answer.
  for(const offset of [-1,61]){
    const date=await fit();const outside=await page.evaluate(offset=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;},offset);
    await records(date,{renewal_date:outside});await check();await page.getByRole('button',{name:'Use supplied Pax8 value for renewalDate',exact:true}).click();
    await page.getByRole('button',{name:'Correct the outside-scope item'}).click();if(await page.evaluate(()=>document.activeElement.id)!=='pax-file')throw new Error('Outside renewal repair provenance wrong');
    await records(date);await check();await page.getByRole('heading',{name:'Supplied records look in scope provisionally'}).waitFor();count++;
  }
  // Reseller facts have no CSV source: correction must reopen that answer.
  const unknownDate=await fit(0);await records(unknownDate);await check();await page.getByRole('button',{name:'Update the item to verify'}).click();
  if(await page.evaluate(()=>document.activeElement.name)!=='reseller')throw new Error('Reseller responsibility incorrectly sent to a file');count++;
  return `PASS: ${count} independent questionnaire/source/date/reseller target-and-repair scenarios`;
}
