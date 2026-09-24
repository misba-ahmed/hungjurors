import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
const worker=String.raw`
(async()=>{
 let phase='runtime';
 try{
  const llm=await import('https://esm.run/@mlc-ai/web-llm@0.2.85');
  postMessage({phase,exports:{MLCEngine:typeof llm.MLCEngine},gpu:!!navigator.gpu});
  phase='tokenizer-module';
  const module=await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-tokenizers@0.1.6/lib/index.js');
  const tokens=module.Tokenizer?module:globalThis.tokenizers;
  if(typeof tokens?.Tokenizer?.fromJSON!=='function')throw Error('Tokenizer export unavailable');
  postMessage({phase,exports:Object.keys(tokens)});
  const record=llm.prebuiltAppConfig.model_list.find(x=>x.model_id==='Qwen3-1.7B-q4f16_1-MLC');
  postMessage({phase:'catalog',record});
  const wasmResponse=await fetch(record.model_lib);if(!wasmResponse.ok)throw Error('Model library HTTP '+wasmResponse.status);
  postMessage({phase:'model-library',compiled:!!(await WebAssembly.compile(await wasmResponse.arrayBuffer()))});
  phase='config';
  const configURL=record.model+'/resolve/main/mlc-chat-config.json';
  const configResponse=await fetch(configURL);if(!configResponse.ok)throw Error('Config HTTP '+configResponse.status);
  const config=await configResponse.json();postMessage({phase,context:config.context_window_size,prefill:config.prefill_chunk_size,tokenizer:config.tokenizer_files});
  phase='tokenizer-json';
  const tokenResponse=await fetch(record.model+'/resolve/main/tokenizer.json');
  if(!tokenResponse.ok)throw Error('Tokenizer HTTP '+tokenResponse.status);
  const tokenizer=await tokens.Tokenizer.fromJSON(await tokenResponse.arrayBuffer());
  postMessage({phase,tokenCount:tokenizer.encode('Trade analysis startup check').length});tokenizer.dispose();
  postMessage({done:true});
 }catch(e){postMessage({done:true,phase,error:String(e),stack:e.stack})}
})();
`;
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/worker.mjs'?'text/javascript':'text/html');res.end(req.url==='/worker.mjs'?worker:'<!doctype html>Startup probe');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 for(const [name,type]of Object.entries({chromium,webkit})){
  const browser=await type.launch({headless:true});
  try{
   const page=await browser.newPage();
   page.on('console',m=>{if(m.type()==='error')console.log(name,'console',m.text().slice(0,300))});
   page.on('requestfailed',r=>console.log(name,'failed',r.url(),r.failure()));
   await page.goto('http://127.0.0.1:'+server.address().port);
   const results=await page.evaluate(()=>new Promise(resolve=>{
    const reports=[],worker=new Worker('/worker.mjs',{type:'module'});
    const timeout=setTimeout(()=>{reports.push({error:'Startup timed out'});worker.terminate();resolve(reports)},120000);
    worker.onerror=e=>{reports.push({error:e.message});clearTimeout(timeout);worker.terminate();resolve(reports)};
    worker.onmessage=({data})=>{reports.push(data);if(data.done){clearTimeout(timeout);worker.terminate();resolve(reports)}};
   }));
   console.log(name,JSON.stringify(results));
  }finally{await browser.close()}
 }
 for(const path of ['trade-analysis-local.mjs','trade-analysis-worker.mjs','trade-analysis-shared.mjs']){
  const response=await fetch('https://hungjurors.com/scripts/'+path+'?v=20260924-webllm1');
  console.log('LIVE',path,response.status,response.headers.get('content-type'),(await response.text()).slice(0,120));
 }
}finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
