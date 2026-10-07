// Pure, shared acceptance oracle. Browser and offline receipt replay use this
// owner; observations and calibration causes cannot choose executable code.
export function dataGate(s, b, o = {}) {
  const integer = n => Number.isSafeInteger(n) && n >= 0;
  const positive = n => Number.isSafeInteger(n) && n > 0;
  const arrays = ['calls','proofs','workers','blobs','revoked','mutations','traffic','effects'];
  if (!s || !b || arrays.some(k=>!Array.isArray(s[k])) || !['requests','errors','dialogs','popups','navigations','downloads','proofs','blobs','revoked'].every(k=>integer(b[k])) ||
      !['errors','dialogs','popups','navigations','downloads','hits','active'].every(k=>integer(s[k])) || typeof s.healthy !== 'boolean' || !Object.hasOwn(s,'authority') || s.authority!==null&&(typeof s.authority!=='object'||Array.isArray(s.authority))) return 'observation-schema';
  if(b.requests>s.traffic.length||b.proofs>s.proofs.length||b.blobs>s.blobs.length||b.revoked>s.revoked.length||['errors','dialogs','popups','navigations','downloads'].some(k=>b[k]>s[k])||s.traffic.some(r=>!r||typeof r.url!=='string'||typeof r.method!=='string'||typeof r.type!=='string'||r.headersComplete!==true||!r.headers||typeof r.headers!=='object'||Array.isArray(r.headers))||s.proofs.some(p=>!p||typeof p!=='object')||s.workers.some(w=>!w||typeof w!=='object')||s.blobs.some(x=>!x||typeof x!=='object'))return 'observation-schema';
  if(s.hits!==0)return 'source-execution';
  if(s.active!==0||s.mutations.length)return 'introduced-active-dom';
  if(s.calls.length)return 'source-request-attempt';
  if(s.downloads!==b.downloads+(o.allowDownload??0))return 'premature-download';
  const recovery=o.allowDownload===1&&!o.publicDownload;
  let recoveryURL;
  if(recovery){const p=o.recovery,last=s.blobs.at(-1);if(!o.allowBlob||!p||p.anchors!==1||p.nativeClicks!==1||p.anchorClicks!==1||p.blobStart!==b.blobs||s.blobs.length!==b.blobs+1||s.revoked.length!==b.revoked+1||last?.type!=='application/octet-stream'||last?.size!==p.bytes||typeof last.url!=='string'||!last.url.startsWith('blob:'+o.origin+'/')||s.revoked.at(-1)!==last.url)return 'original-recovery-permit';recoveryURL=last.url;}
  else if(o.allowBlob||o.recovery||s.blobs.length!==b.blobs||s.revoked.length!==b.revoked)return 'original-recovery-permit';
  if(o.publicDownload&&!['/fixtures/pax8-synthetic.csv','/fixtures/pax8-economic-synthetic.csv','/fixtures/halo-synthetic.csv'].includes(o.publicDownload))return 'public-recovery-permit';
  if(s.navigations!==b.navigations)return 'source-navigation';
  if(s.dialogs!==b.dialogs||s.popups!==b.popups)return 'source-dialog-or-popup';
  if(s.effects.length||s.proofs.some(p=>p.native!==true||p.hits!==0||!Array.isArray(p.calls)||p.calls.length))return 'worker-source-execution';
  const assets=new Set(['/',...('app fit claims preflight actions runtime file-evidence file-evidence-view file-support file-handling file-handling-policy input csv-evidence bounded-reader resource-packet file-processing-worker qc-file-data-observer qc-file-data-gate'.split(' ').map(n=>'/'+n+'.mjs')),'/termline.css','/assets/brand-mark-v1-bright.png','/assets/fonts/InstrumentSerif-Regular.woff2','/assets/fonts/SourceSans3-Variable.woff2','/qc-vendor/axe-4.10.3.min.js']);
  if(o.publicDownload)assets.add(o.publicDownload);
  const traffic=s.traffic.slice(b.requests);
  const headerValues={accept:['*/*','text/css,*/*;q=0.1','image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8','text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'],
    'accept-encoding':['gzip, deflate, br','gzip, deflate, br, zstd'], 'accept-language':['en-US,en;q=0.9'],connection:['keep-alive'],
    'user-agent':['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36'],
    'sec-ch-ua':['"Chromium";v="154", "Google Chrome";v="154", "Not A(Brand";v="99"'],'sec-ch-ua-mobile':['?0'],'sec-ch-ua-platform':['"Windows"'],
    'sec-fetch-dest':['script','worker','document','style','font','image','empty'],'sec-fetch-mode':['cors','no-cors','navigate','same-origin'],'sec-fetch-site':['same-origin','none'],'sec-fetch-user':['?1'],'upgrade-insecure-requests':['1'],'cache-control':['no-cache'],'pragma':['no-cache']};
  // This catalogue is the captured Windows/Chromium qualification environment.
  // A different browser/header inventory requires a new qualification.
  const safeHeader=(key,value)=>{
    key=key.toLowerCase();if(typeof value!=='string')return false;
    if(key==='origin')return value===o.origin;
    if(key==='host')return value===new URL(o.origin).host;
    if(key==='referer'){if(value==='')return true;try{const u=new URL(value);return u.origin===o.origin&&!u.username&&!u.password&&!u.search&&!u.hash&&assets.has(u.pathname)&&value===o.origin+u.pathname;}catch{return false;}}
    return headerValues[key]?.includes(value)===true;
  };
  for(const r of traffic){
    if(recoveryURL&&r.url===recoveryURL){if(r.method!=='GET'||r.body!==null||!['document','other'].includes(r.type)||Object.entries(r.headers).some(([k,v])=>!safeHeader(k,v)))return 'source-request';continue;}
    let url;try{url=new URL(r.url);}catch{return 'source-request';}
    const type=url.pathname==='/'||url.pathname===o.publicDownload?'document':url.pathname.endsWith('.mjs')||url.pathname.endsWith('.js')?'script':url.pathname.endsWith('.css')?'stylesheet':url.pathname.endsWith('.woff2')?'font':'image';
    const nativeWorker=url.pathname==='/file-processing-worker.mjs'&&r.type==='other'&&r.headers?.['sec-fetch-dest']==='worker';
    if(r.method!=='GET'||r.body!==null||url.origin!==o.origin||url.username||url.password||url.search||url.hash||r.url!==o.origin+url.pathname||!assets.has(url.pathname)||r.type!==type&&!nativeWorker||
       !r.headers||Object.entries(r.headers).some(([k,v])=>!safeHeader(k,v)))return 'source-request';
  }
  if(s.errors!==b.errors)return 'unexpected-page-error';
  if(s.authority!==null){if(s.authority.actionAuthorized!==false||s.authority.financialVerdict!==null)return 'source-financial-authority';if(s.authority.policy!=='nce-scope-v12')return 'source-policy-authority';}
  if(o.typed){const e=o.typed,t=s.typed;if(!t||t.raw?.[e.field]!==e.raw||e.claim&&t.claims?.[e.claim]!==e.canonical||e.field==='end_of_term_state'&&t.endState!==e.raw.toLowerCase()||e.diagnostic&&!t.economicIssues?.some(x=>x.toLowerCase().includes(e.diagnostic)))return 'source-typed-interpretation';}
  for(const p of s.proofs)if(!positive(p.id)||typeof p.role!=='string'||typeof p.operation!=='string')return 'native-proof-schema';
  if(s.workers.some(w=>w.native!==true||w.module!==true||w.url!==o.origin+'/file-processing-worker.mjs'))return 'fixed-native-worker';
  for(const e of o.expected??[]){
    const proofs=s.proofs.slice(b.proofs).filter(p=>p.role===e.role&&p.operation===e.operation);
    if(proofs.length!==1||proofs[0].status!=='completed'||!proofs[0].requestMatches||!proofs[0].inputNative||!proofs[0].sourceCurrent||proofs[0].sha256!==e.sha256||proofs[0].bytes!==e.bytes||proofs[0].inputBytes!==e.bytes)return 'native-current-'+e.role+'-'+e.operation;
    const w=s.workers.find(w=>w.id===proofs[0].id);
    if(!w?.native||!w.module||w.url!==o.origin+'/file-processing-worker.mjs'||w.stops!==1)return 'fixed-native-worker';
  }
  if(!s.healthy)return 'runtime-health';
  return null;
}
