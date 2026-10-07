import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFit, evaluateEarlyOutside, POLICY_VERSION } from './fit.mjs';
import { assertClaimReview } from './claims.mjs';
import { parseCsv, inspectRecords } from './preflight.mjs';
import { isoDateUTC, validIsoDate } from './input.mjs';
const today='2026-09-30';
const base={reseller:'yes',distributor:'pax8',billing:'halopsa',commitment:'annual-m365-nce',renewal:'exact',renewalDate:'2026-10-15',agreement:'yes'};
const validate=d=>assertClaimReview(d.claimReview,{type:'questionnaire',policyVersion:POLICY_VERSION,today,status:d.status});
const positive=evaluateFit(base,{today});
const corrupt=mutate=>{const d={...positive,claimReview:structuredClone(positive.claimReview)};mutate(d.claimReview);assert.throws(()=>validate(d),TypeError);};
test('SQ G1: complete and prefix questionnaire contracts reject omissions and false assessment',()=>{
  for(const mutate of [t=>{t.scopeInputs={};},t=>{delete t.scopeInputs.reseller;},t=>{delete t.fields[0].effective.value;},t=>{delete t.fields[0].original.value;},t=>{t.through=0;t.scopeInputs={reseller:'yes'};},t=>{t.fields[0].included=false;t.fields[0].effective.state='not-assessed';},t=>{t.fields[0].effective.value=undefined;t.fields[0].effective.state='not-asked';},t=>{t.through=5;}]) corrupt(mutate);
  for(const value of [undefined,null]) corrupt(t=>{t.originalInputs.reseller=value;t.scopeInputs.reseller=value;t.fields[0].original.value=value;t.fields[0].original.state='not-asked';t.fields[0].effective.value=value;t.fields[0].effective.state='not-asked';});
  for(let through=0;through<4;through++) {
    const answers={...base,...Object.fromEntries([['reseller','no'],['distributor','other'],['billing','other'],['commitment','monthly']].slice(0,through+1))};
    const d=evaluateEarlyOutside(answers,{today,through});validate(d);
    validate(evaluateEarlyOutside({...answers,renewalDate:'not-a-date'},{today,through}));
    for(const key of Object.keys(d.claimReview.scopeInputs)) { const copy=structuredClone(d.claimReview);delete copy.scopeInputs[key];assert.throws(()=>validate({...d,claimReview:copy}),TypeError); }
    assert.ok(d.claimReview.fields.filter(f=>!f.included).every(f=>f.effective.value===undefined));
  }
});
test('SQ G2: shared calendar contract validates active date, preserves inactive raw and supports leap boundaries',()=>{
  for(const date of ['not-a-date','2026-02-29','2026-04-31','2026-13-01','2026-00-01','2026-01-00','2026-01-32','2026-1-01','0000-01-01']) {
    assert.equal(validIsoDate(date),false);assert.throws(()=>isoDateUTC(date),TypeError);
    corrupt(t=>{t.originalInputs.renewalDate=date;t.scopeInputs.renewalDate=date;t.fields[5].original.value=date;t.fields[5].effective.value=date;});
    validate(evaluateFit({...base,renewal:'unknown',renewalDate:date},{today}));
  }
  validate(evaluateFit({...base,renewalDate:'not-a-date'},{today,policyReviewBy:'2026-09-29'}));
  for(const date of ['2024-02-29','2000-02-29','2026-09-30','2026-11-29']) assert.equal(validIsoDate(date),true);
});
const input={answers:base,today,subscriptionId:'s',renewalTerm:'annual',pax8Text:'subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\ns,c,pax8,Microsoft 365,NCE,yes,annual,2026-10-15,renew\n',haloText:'line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n'};
const recordValidate=d=>assertClaimReview(d.claimReview,{type:'record',policyVersion:POLICY_VERSION,today,status:d.status});
test('SQ G3: field/system columns and contributor payload reject malformed, alien or inconsistent metadata',()=>{
  const initial=inspectRecords(input);recordValidate(initial);
  const mutations=[t=>{t.fields[0].included=false;t.fields[0].effective.state='not-assessed';},t=>{t.contributors.recordResultStatus='outside-this-release';},t=>{t.fields[1].supplied.rowId='alien';},t=>{t.fields[1].supplied.value='other';},t=>{t.contributors.nextTerm.scheduledProvided=true;},t=>{t.fields[1].supplied.columns=[{}];},t=>{t.fields[1].supplied.columns=['secret'];},t=>{t.fields[1].supplied.system='HaloPSA';},t=>{t.fields[3].supplied.columns.reverse();},t=>{t.fields[1].supplied.rowId='x'.repeat(1025);},t=>{t.contributors.endState.raw='altered';},t=>{t.contributors.nextTerm.response='monthly';},t=>{t.contributors.economicContext.columns=['secret'];t.contributors.economicContext.raw=['x'];},t=>{t.contributors.economicIssues=[{}];},t=>{t.contributors.scopeRuleStatus='safe';}];
  for(const mutate of mutations){const trace=structuredClone(initial.claimReview);mutate(trace);assert.throws(()=>recordValidate({...initial,claimReview:trace}),TypeError);}
  const unusable=inspectRecords({...input,haloText:input.haloText.replace('l,s,c','l,s,')});recordValidate(unusable);assert.equal(unusable.status,'needs-record-link-review');
});
test('questionnaire routing and schema independently agree over 5184 answer/date/preparation combinations',()=>{
 let count=0;
 for(const reseller of ['yes','no','unknown']) for(const distributor of ['pax8','other','unknown']) for(const billing of ['halopsa','other','unknown']) for(const commitment of ['annual-m365-nce','monthly','other','unknown']) for(const renewal of ['exact','within-60-approx','unknown']) for(const renewalDate of ['2026-09-29',today,'2026-11-29','2026-11-30']) for(const agreement of ['yes','no','unknown','not-asked']) {
  const answers={reseller,distributor,billing,commitment,renewal,renewalDate,agreement};const d=evaluateFit(answers,{today});validate(d);
  const outside=reseller==='no'||distributor==='other'||billing==='other'||['monthly','other'].includes(commitment)||(renewal==='exact'&&['2026-09-29','2026-11-30'].includes(renewalDate));
  const uncertain=[reseller,distributor,billing,commitment,renewal].includes('unknown')||renewal==='within-60-approx'||(renewal==='exact'&&renewalDate===today)||['no','unknown'].includes(agreement);
  assert.equal(d.status,outside?'outside-this-release':uncertain?'may-fit-verify':'looks-in-scope');assert.deepEqual(d.claimReview.scopeInputs,answers);assert.equal(d.actionAuthorized,false);assert.equal(d.financialVerdict,null);count++;
 }
 assert.equal(count,5184);
});
test('incremental parser bounds hostile delimiters, rows and quoted cells before expansion, retaining exact borders',()=>{
 for(const text of [','.repeat(150000),'a\n'+'x\n'.repeat(5001),'a\n"'+'x'.repeat(1025)+'"\n']) assert.throws(()=>parseCsv(text,['a']),/64|5000|1024/);
 const header=Array.from({length:64},(_,i)=>'h'+i).join(',');const row=Array.from({length:64},()=> 'x'.repeat(5)).join(',');const text=header+'\n'+(row+'\n').repeat(1023);
 const start=performance.now();const rows=parseCsv(text,['h0']);assert.equal(rows.length,1023);assert.equal(Object.keys(rows[0]).length,64);assert.equal(rows[1022].h63,'xxxxx');
 console.log('Admitted 1023x64 CSV parse ms: '+Math.round(performance.now()-start));
 assert.equal(parseCsv('a\n"'+ 'x'.repeat(1024)+'"\n',['a'])[0].a.length,1024);
});
