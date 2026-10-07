import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { evaluateFit, evaluateEarlyOutside } from './fit.mjs';
import { inspectRecords, parseCsv, PAX8_COLUMNS, HALO_COLUMNS } from './preflight.mjs';
import { assertNextAction, InputProblem, inputFailure, SOURCES } from './actions.mjs';
import { readLocalFile } from './runtime.mjs';
const today = '2026-09-30';
const answers = { reseller:'yes', distributor:'pax8', billing:'halopsa', commitment:'annual-m365-nce', renewal:'exact', renewalDate:'2026-10-15', agreement:'yes' };
const paxRow = {subscription_id:'s',customer_ref:'c',distributor:'pax8',product_family:'Microsoft 365',commerce_model:'NCE',seat_based:'yes',commitment_term:'annual',renewal_date:'2026-10-15',end_of_term_state:'renew'};
const haloRow = {line_id:'l',subscription_id:'s',customer_ref:'c',billing_system:'HaloPSA'};
const csv = rows => { const keys = Object.keys(rows[0]); return keys.join(',')+'\n'+rows.map(row=>keys.map(key=>'"'+String(row[key]??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n'; };
const record = (pax = {}, halo = {}, extra = {}) => inspectRecords({answers,today,subscriptionId:'s',renewalTerm:'annual',pax8Text:csv([{...paxRow,...pax}]),haloText:csv([{...haloRow,...halo}]),...extra});
const confirmed = (pax = {}, halo = {}, extra = {}) => {
  const initial = record(pax,halo,extra);
  return record(pax,halo,{...extra,linkConfirmation:{confirmed:true,basis:initial.reviewBasis}});
};
const valid = decision => { assertNextAction(decision.nextAction); assert.equal(decision.actionAuthorized,false); assert.equal(decision.financialVerdict,null); };

test('all questionnaire answer/date/agreement combinations have a valid, priority-correct action', () => {
  let count=0;
  for(const reseller of ['yes','no','unknown']) for(const distributor of ['pax8','other','unknown'])
  for(const billing of ['halopsa','other','unknown']) for(const commitment of ['annual-m365-nce','monthly','other','unknown'])
  for(const renewal of ['exact','within-60-approx','unknown']) for(const renewalDate of ['2026-09-29',today,'2026-11-29','2026-11-30'])
  for(const agreement of ['yes','no','unknown','not-asked']) {
    const d=evaluateFit({reseller,distributor,billing,commitment,renewal,renewalDate,agreement},{today}); valid(d);
    const first=d.unsupported[0]??d.needsVerification[0];
    if(first) assert.equal(d.nextAction.condition,first.condition);
    else assert.equal(d.nextAction.kind,'prepare-records');
    count++;
  }
  assert.equal(count,5184);
});

test('every early-exit prefix retains answered unknowns, never invents unasked uncertainty', () => {
  const fields=['reseller','distributor','billing','commitment'];
  const values=[['yes','no','unknown'],['pax8','other','unknown'],['halopsa','other','unknown'],['annual-m365-nce','monthly','other','unknown']];
  let count=0;
  const walk=(a,index)=>{
    for(const value of values[index]) {
      const next={...a,[fields[index]]:value};
      const d=evaluateEarlyOutside(next,{today,through:index});
      if(d){valid(d);assert.deepEqual(d.needsVerification.map(x=>x.condition),fields.slice(0,index+1).filter(key=>next[key]==='unknown'));assert.deepEqual(d.notAsked,[...fields.slice(index+1),'renewal']);}
      count++; if(index<3)walk(next,index+1);
    }
  };walk({},0);assert.equal(count,147);
});

test('raw source words never change Pax8 economic or end-state repair routing', () => {
  const words=['agreement','customer order','HaloPSA','next term','Manage renewal','reseller responsibility','financially responsible','<script>','null','undefined','Pax8','词语'];
  for(const field of ['billing_frequency','scheduled_commitment_term','scheduled_billing_frequency','end_of_term_state']) for(const word of words){
    const d=confirmed({[field]:word});valid(d);assert.equal(d.status,'needs-verification');
    assert.equal(d.nextAction.source,SOURCES.pax);assert.equal(d.nextAction.target,'pax-file');
    assert.doesNotMatch(d.nextAction.instruction,/first .* above/);
  }
});

test('identity and link defects select the responsible controls and recover on corrected evidence', () => {
  const duplicate=record({}, {}, {pax8Text:csv([paxRow,paxRow])});
  assert.equal(duplicate.nextAction.target,'pax-file');assert.match(duplicate.nextAction.instruction,/duplicate/);
  assert.equal(record({}, {}, {subscriptionId:'missing'}).nextAction.target,'pax-file');
  assert.equal(record({}, {}, {subscriptionId:''}).nextAction.target,'subscription-id');
  assert.equal(record({customer_ref:''}).nextAction.target,'pax-file');
  assert.equal(record({}, {line_id:''}).nextAction.target,'halo-file');
  assert.equal(record({}, {customer_ref:'different'}).nextAction.target,'both-files');
  assert.equal(record({}, {subscription_id:'different'}).nextAction.target,'halo-file');
  assert.equal(record({}, {}, {haloText:csv([haloRow,haloRow])}).nextAction.target,'halo-file');
  assert.equal(confirmed().status,'supplied-claims-look-in-scope');
});

test('outside-scope repair targets follow actual causal provenance across every source condition', () => {
  for(const [field,value] of [['distributor','other'],['product_family','Azure'],['commerce_model','legacy'],['seat_based','no'],['commitment_term','monthly']]){
    const first=record({[field]:value});
    const linked=record({[field]:value},{},{linkConfirmation:{confirmed:true,basis:first.reviewBasis}});
    const conflict=linked.conflicts.find(x=>x.resolution==='unresolved');
    const resolutions=conflict?{[conflict.key]:{choice:'accept-file',questionnaire:conflict.questionnaire,fileValue:conflict.fileValue,basis:linked.reviewBasis}}:{};
    const d=record({[field]:value},{},{linkConfirmation:{confirmed:true,basis:first.reviewBasis},resolutions});valid(d);
    assert.equal(d.status,'outside-this-release');assert.equal(d.nextAction.target,'pax-file');
    assert.doesNotMatch(d.nextAction.instruction,/first .* above/);
  }
  for(const end_of_term_state of ['cancel','extended'])assert.equal(confirmed({end_of_term_state}).nextAction.target,'pax-file');
  for(const renewalTerm of ['monthly','other'])assert.equal(confirmed({}, {}, {renewalTerm}).nextAction.target,'renewal-term');
  assert.equal(confirmed({}, {}, {answers:{...answers,reseller:'no'}}).nextAction.target,'reseller-answer');
  assert.equal(confirmed({}, {}, {answers:{...answers,reseller:'unknown'}}).nextAction.target,'reseller-answer');
  assert.equal(confirmed({}, {}, {answers:{...answers,agreement:'no'}}).nextAction.target,'agreement');
});

test('file parsing errors preserve their file source across independent malformed families', () => {
  const malformed=['','a\nb\n','subscription_id,subscription_id\ns,s\n','"unterminated','a\nb,c\n'];
  for(const text of malformed)for(const target of ['pax-file','halo-file']){
    assert.throws(()=>record({}, {}, {[target==='pax-file'?'pax8Text':'haloText']:text}),error=>error instanceof InputProblem&&error.target===target);
  }
  for(const [columns,target] of [[PAX8_COLUMNS,'pax-file'],[HALO_COLUMNS,'halo-file']]){
    const text=columns.join(',')+'\n'+columns.map(()=> 'x'.repeat(1025)).join(',')+'\n';
    assert.throws(()=>record({}, {}, {[target==='pax-file'?'pax8Text':'haloText']:text}),error=>error instanceof InputProblem&&error.target===target);
  }
});

test('file reads reject missing, oversize, unreadable, encoding and timeout failures with correct source', async () => {
  for(const [target,source] of [['pax-file',SOURCES.pax],['halo-file',SOURCES.halo]]) {
    const bytes = async () => Uint8Array.of(0xff).buffer;
    const files=[undefined,{size:2000001},{size:1,text:()=>Promise.reject(new Error('read')),arrayBuffer:bytes},{size:1,text:async()=> '\uFFFD',arrayBuffer:bytes},{size:1,text:()=>new Promise(()=>{}),arrayBuffer:bytes}];
    for(const file of files)await assert.rejects(readLocalFile(file,target,source,5),error=>error instanceof InputProblem&&error.target===target&&error.source===source);
    const text = csv([target === 'pax-file' ? paxRow : haloRow]);
    assert.equal(await readLocalFile(new Blob([text]),target,source),text);
  }
});

test('technical errors are stops, and malformed action schemas cannot be accepted', () => {
  const d=inputFailure(new Error('internal'));valid(d);assert.equal(d.status,'technical-error');assert.equal(d.nextAction.kind,'technical-stop');
  const base={kind:'verify-source',source:SOURCES.pax,instruction:'Check the original evidence and rerun.',target:'pax-file'};
  for(const bad of [{...base,source:''},{...base,target:'missing'},{...base,condition:null},{...base,instruction:undefined},{...base,kind:'new-status'}])assert.throws(()=>assertNextAction(bad));
  for(const target of ['pax-file','halo-file','subscription-id','both-files'])valid(inputFailure(new InputProblem('Correct input',target,SOURCES.both)));
});

test('message regex routing is displaced, safe text rendering and no financial authority remain', () => {
  const preflight=readFileSync(new URL('./preflight.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(preflight,/sourceNamedIn|verificationTarget/);
  const app=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(app,/innerHTML\s*=/);assert.match(app,/assertNextAction/);
});

test('retained outside answers use original distributor or billing source, not unknown vendor evidence', () => {
  for(const [key,value,sourceText,target,pax,halo] of [
    ['distributor','other',/original distributor/,'distributor-answer',{distributor:'unknown'},{}],
    ['billing','other',/original billing system/,'billing-answer',{}, {billing_system:'unknown'}],
  ]){
    const d=confirmed(pax,halo,{answers:{...answers,[key]:value}});valid(d);
    assert.equal(d.status,'outside-this-release');assert.match(d.nextAction.source,sourceText);assert.equal(d.nextAction.target,target);
  }
});

test('economic issue codes retain the exact fact independently from copy and raw strings', () => {
  for(const [pax,code,condition] of [
    [{billing_frequency:'agreement'},'billing-unrecognized','billing-frequency'],
    [{scheduled_commitment_term:'unknown'},'scheduled-term-unknown','scheduled-term'],
    [{scheduled_billing_frequency:'monthly'},'scheduled-term-missing','scheduled-frequency'],
    [{term_start_date:'2026-01-01'},'term-date-partial','term-dates'],
    [{term_start_date:'2026-10-15',term_end_date:'2026-10-14'},'term-date-reversed','term-dates'],
  ]){
    const d=confirmed(pax);assert.equal(d.issues.verify[0].code,code);assert.equal(d.issues.verify[0].condition,condition);
  }
});

test('CSV dialect, encoding and size/row/cell limits keep truthful correction paths', () => {
  const source='\uFEFFa,b\r\n"comma,quote""", "line\nvalue"\r\n';
  // Whitespace before opening quote is not part of the supported dialect; reject rather than reinterpret.
  assert.throws(()=>parseCsv(source,['a','b']));
  assert.deepEqual(parseCsv('\uFEFFa,b\r\n"comma,quote""","line\nvalue"\r\n\r\n',['a','b']),[{a:'comma,quote"',b:'line\nvalue'}]);
  assert.equal(parseCsv('a\n'+('x\n'.repeat(5000)),['a']).length,5000);
  assert.throws(()=>parseCsv('a\n'+('x\n'.repeat(5001)),['a']),/5000 rows/);
  assert.throws(()=>parseCsv('a\n'+'x'.repeat(2000000),['a']),/two-megabyte/);
  assert.throws(()=>parseCsv('a\n'+'x'.repeat(1025),['a']),/1024/);
});
