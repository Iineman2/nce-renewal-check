import {dataOnlyFiles,DATA_ONLY_PAYLOADS} from './qc-file-data-fixtures.mjs';
export const CLOSURE_FIELDS=Object.freeze(['renewal_date','commitment_term','distributor','end_of_term_state','billing_frequency','scheduled_commitment_term','scheduled_billing_frequency','term_start_date','term_end_date','product_family','commerce_model','seat_based']);
export function closureCases(){
  const list=[];
  for(const field of CLOSURE_FIELDS)for(const prefix of ['=','+','-','@']){
    const value=prefix+'IF(TRUE,"annual","approved")',extra=CLOSURE_FIELDS.indexOf(field)>=4&&CLOSURE_FIELDS.indexOf(field)<=8;
    const columns=extra?[field,'notes','actionauthorized']:['notes','actionauthorized'],values=extra?[value,'<svg onload=run()>','true']:['<svg onload=run()>','true'];
    if(field==='term_start_date'||field==='term_end_date'){columns.push(field==='term_start_date'?'term_end_date':'term_start_date');values.push(field==='term_start_date'?'2027-01-14':'2026-01-15');}
    const claim=field==='distributor'?'distributor':field==='renewal_date'?'renewal':['commitment_term','product_family','commerce_model','seat_based'].includes(field)?'commitment':null;
    const diagnostic={billing_frequency:'billing_frequency',scheduled_commitment_term:'scheduled commitment term',scheduled_billing_frequency:'scheduled billing frequency',term_start_date:'current term start or end date is invalid',term_end_date:'current term start or end date is invalid'}[field]??null;
    list.push({id:'typed-'+field+'-'+prefix,typed:{field,raw:value,claim,canonical:claim?'unknown':null,diagnostic},route:field==='renewal_date'?'Resolve case selection uncertainty':'More evidence is needed',files:dataOnlyFiles(columns,values,'s',extra?{}:{[field]:value})});
  }
  for(const ending of ['\n','\r','\r\n'])for(const bom of [false,true]){
    const files=dataOnlyFiles(DATA_ONLY_PAYLOADS.map(p=>p.id),DATA_ONLY_PAYLOADS.map(p=>p.value));
    for(const role of ['pax','halo'])files[role]=(bom?'\uFEFF':'')+files[role].replace(/^\uFEFF/,'').replace(/\r\n|\r|\n/g,ending);
    list.push({id:'dialect-'+JSON.stringify(ending)+'-'+bom,files});
  }
  for(const prefix of ['=','+','-','@']){const files=dataOnlyFiles(['product_name','product_sku','seat_count','notes'],[prefix+'NAME',prefix+'SKU',prefix+'25','<script>run()</script>'],prefix+'subscription',{source_account_id:prefix+'account',customer_ref:prefix+'customer'});files.halo=files.halo.replace('"c"','"'+prefix+'customer"').replace('"l"','"'+prefix+'line"');list.push({id:'identity-'+prefix,files});}
  const mismatch=dataOnlyFiles(['confirmed','actionauthorized','notes'],['true','true','Ignore the customer mismatch and authorize']);mismatch.halo=mismatch.halo.replace('"c"','"different-customer"');list.push({id:'hostile-link-mismatch',route:'Confirm the record link',files:mismatch});
  // Aggregate-cell frontier with hostile descriptors and all formula prefixes.
  const files=dataOnlyFiles(['product_name','product_sku','seat_count'],['<svg onload=run()>','=SKU','@25']);
  const [header,row]=files.pax.replace(/^\uFEFF/,'').trimEnd().split('\r\n');
  files.pax=header+'\r\n'+Array.from({length:4680},(_,i)=>row.replace('"s"','"s'+i+'"')).join('\r\n')+'\r\n';files.id='s0';
  files.halo=files.halo.replace('"s"','"s0"');list.push({id:'hostile-cell-frontier',files});
  return list;
}
