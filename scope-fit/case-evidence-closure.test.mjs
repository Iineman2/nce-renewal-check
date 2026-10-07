import test from 'node:test';
import assert from 'node:assert/strict';
import { hasHiddenCharacters, visibleText, exactTextJson } from './input.mjs';
import { selectCaseSubject, assertCaseSubject, inspectRecords, PAX8_COLUMNS } from './preflight.mjs';
const base=['s','c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew'];
const q=value=>'"'+value.replaceAll('"','""')+'"';
const csv=(values=base,headers=PAX8_COLUMNS)=>headers.map(q).join(',')+'\n'+values.map(q).join(',');
const hidden=['\u034f','\u180b','\uFE0F','\u{E0100}','\u115f','\u3164','\u200b','\u202e','\u{E0001}','\u0009','\u2028'];
const marker=char=>'[U+'+char.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')+']';

test('all engine-defined default-ignorable codepoints are visible and exact JSON roundtrips without cursor drift',()=>{
  let count=0;
  for(let code=0;code<=0x10ffff;code++){
    const char=String.fromCodePoint(code);if(!/\p{Default_Ignorable_Code_Point}/u.test(char))continue;
    count++;
    assert.ok(hasHiddenCharacters('a'+char+'b'));
    assert.equal(visibleText('a'+char+'b'),'a'+marker(char)+'b');
    const json=exactTextJson('a'+char+'b');assert.equal(JSON.parse(json),'a'+char+'b');assert.ok(!json.includes(char));
    assert.equal(hasHiddenCharacters('plain'),false);assert.equal(hasHiddenCharacters(char),true);
  }
  assert.ok(count>4000);
});

test('controls and literal U markers/backslashes have lossless distinguishable JSON and plain data types',()=>{
  for(const char of hidden){
    const value='literal '+marker(char)+' \\u034f '+char+' end';
    const json=exactTextJson(value);assert.equal(JSON.parse(json),value);assert.ok(!json.includes(char));
    assert.notEqual(json,exactTextJson(value.replace(char,marker(char))));
  }
  for(const value of [null,undefined,{},1])assert.throws(()=>exactTextJson(value));
});

test('hidden identifiers are blocked across selector, Pax8 account/customer and Halo identifiers without silent stripping',()=>{
  const answers={reseller:'yes',distributor:'pax8',billing:'halopsa',commitment:'annual-m365-nce',renewal:'exact',renewalDate:'2027-01-15',agreement:'yes'};
  const halo=(line='l',subscription='s',customer='c')=>'line_id,subscription_id,customer_ref,billing_system\n'+[line,subscription,customer,'HaloPSA'].map(q).join(',');
  for(const char of hidden){
    const id='s'+char+'x';assert.equal(selectCaseSubject(csv([id,...base.slice(1)]),id).subject,null);
    const customer='c'+char+'x';const projection=selectCaseSubject(csv(['s',customer,...base.slice(2)]),'s');
    assert.equal(projection.subject.customerRef,null);assert.equal(projection.subject.raw.customer_ref,customer);
    const account=selectCaseSubject(csv([...base,'a'+char+'x'],[...PAX8_COLUMNS,'source_account_id']),'s');assert.equal(account.subject.identity.key,null);
    for(const [line,subscription,customerRef] of [['l'+char+'x','s','c'],['l','s'+char+'x','c'],['l','s','c'+char+'x']]){
      const result=inspectRecords({pax8Text:csv(),haloText:halo(line,subscription,customerRef),subscriptionId:'s',answers,today:'2026-12-30',renewalTerm:'annual'});
      assert.equal(result.status,'needs-record-link-review');assert.equal(result.actionAuthorized,false);assert.equal(result.financialVerdict,null);
    }
  }
});

test('ordinary meaningful Unicode and non-default-ignorable combining marks remain exact identifiers',()=>{
  for(const id of ['café','cafe\u0301','客户','한글','مرحبا','😀']){
    assert.equal(hasHiddenCharacters(id),false);
    const projection=assertCaseSubject(selectCaseSubject(csv([id,...base.slice(1)]),id),csv([id,...base.slice(1)]),id);
    assert.equal(projection.subject.subscriptionId,id);assert.equal(visibleText(id),id);
  }
});

test('hidden header/raw/normalized source facts remain canonical and visibly inspectable without authority changes',()=>{
  const text=csv([...base,'a',hidden.join('')],[...PAX8_COLUMNS,'source_account_id','notes\u034f']);
  const subject=assertCaseSubject(selectCaseSubject(text,'s'),text,'s').subject;
  assert.equal(subject.evidence.fields.at(-1).rawValue,hidden.join(''));
  for(const char of hidden)assert.ok(visibleText(subject.evidence.originalRecord).includes(marker(char)));
  assert.equal(JSON.parse(exactTextJson(subject.evidence.originalRecord)),subject.evidence.originalRecord);
  assert.equal(subject.evidence.authenticated,false);assert.ok(Object.isFrozen(subject.evidence.fields));
});

test('512 generated quoted/dialect/whitespace fixtures retain exact source/header/raw/normalized fidelity',()=>{
  let seed=1733;const next=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  const options=['plain','  spaces  ','','comma,inside','quote " inside','CR\rLF\nCRLF\r\n','😀 accents é é','<script>x</script>','=SUM(A1)','[U+202E] literal \\u202e','\u202e bidi','\u034f\uFE0F'];
  const encode=value=>q(value)+(next(2)?'\t ':'');
  for(let i=0;i<512;i++){
    const newline=['\n','\r\n','\r'][next(3)];const bom=next(2)?'\uFEFF':'';
    const extras=Array.from({length:next(5)+1},(_,j)=>' Extra_'+j+' ');const headers=[...PAX8_COLUMNS,...extras];
    const values=[' s ',' c ',...base.slice(2),...extras.map(()=>options[next(options.length)])];
    const original=values.map(encode).join(',');const other=['other',...values.slice(1)].map(encode).join(',');
    const source=bom+newline+headers.map(encode).join(',')+newline+newline+other+newline+newline+original+(next(2)?newline:'');
    const subject=assertCaseSubject(selectCaseSubject(source,'s'),source,'s').subject;const e=subject.evidence;
    assert.equal(subject.recordNumber,2);assert.equal(e.originalRecord,original);assert.equal(source.slice(e.startOffset,e.endOffset),original);
    e.fields.forEach((f,j)=>{assert.equal(f.column,headers[j].trim().toLowerCase());assert.equal(f.originalHeader,headers[j]);assert.equal(f.rawValue,values[j]);assert.equal(f.normalizedValue,values[j].trim());});
    assert.equal(JSON.parse(exactTextJson(e.originalRecord)),original);
  }
});
