// Runs as an actual same-origin browser script, outside DevTools evaluation.
// Controlled probes are never supplied-file processing or application fallbacks.
(async () => {
  const origin=location.origin,script=document.currentScript.src,cases=[];
  const wait=()=>new Promise(resolve=>setTimeout(resolve,40));
  const run=async(name,invoke)=>{
    const start=globalThis.__p4Csp.length;let threw=false;
    try{await invoke();}catch{threw=true;}
    await wait();cases.push({name,threw,hits:globalThis.__fileExecuted,events:globalThis.__p4Csp.slice(start)});
  };
  await run('eval',()=>eval('globalThis.__fileExecuted++'));
  await run('Function',()=>new Function('globalThis.__fileExecuted++')());
  await run('timer',()=>setTimeout('globalThis.__fileExecuted++',0));
  await run('inline',()=>{const n=document.createElement('script');n.textContent='globalThis.__fileExecuted++';document.head.append(n);});
  await run('handler',()=>{const n=document.createElement('img');n.setAttribute('onerror','globalThis.__fileExecuted++');n.src=origin+'/__p4image';document.head.append(n);});
  await run('remote-script',()=>{const n=document.createElement('script');n.src='https://invalid.example/script.js';document.head.append(n);});
  await run('frame',()=>{const n=document.createElement('iframe');n.src=origin+'/__p4frame';document.head.append(n);});
  await run('object',()=>{const n=document.createElement('object');n.type='text/html';n.data=origin+'/__p4object';document.body.append(n);});
  await run('base',()=>{const n=document.createElement('base');n.href='https://invalid.example/';document.head.append(n);});
  await run('connect',()=>fetch(origin+'/__p4connect'));
  await run('form',()=>{const n=document.createElement('form');n.method='post';n.action=origin+'/__p4form';document.body.append(n);n.submit();});
  globalThis.__p4Policy={version:'native-script-csp-probe-v1',script,cases,hits:globalThis.__fileExecuted,base:document.baseURI};
})().catch(error=>{globalThis.__p4Policy={error:String(error)};});
