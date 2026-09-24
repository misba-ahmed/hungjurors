import {createServer} from 'node:http';
import {chromium} from 'playwright';
const worker=String.raw`
(async()=>{
 let stage='import';
 try{
  const llm=await import('https://esm.run/@mlc-ai/web-llm@0.2.85');
  const adapter=await navigator.gpu?.requestAdapter();
  if(!adapter)throw Error('No GPU adapter on runner');
  const format=adapter.features.has('shader-f16')?'q4f16_1':'q4f32_1';
  const id='Llama-3.2-1B-Instruct-'+format+'-MLC';
  const record=llm.prebuiltAppConfig.model_list.find(x=>x.model_id===id);
  postMessage({stage:'catalog',id,memory:record.vram_required_MB,adapter:{...adapter.info}});
  stage='load';
  let last=-1;
  const engine=new llm.MLCEngine({appConfig:{...llm.prebuiltAppConfig,model_list:[record]},logLevel:'ERROR',initProgressCallback:info=>{
   const p=Math.floor(info.progress*10);if(p!==last){last=p;postMessage({stage:'load',progress:info.progress,text:info.text})}
  }});
  await engine.reload(id,{context_window_size:6144});
  stage='loaded-tokenizer';
  const pipeline=engine.loadedModelIdToPipeline?.get(id);
  postMessage({stage,hasTokenizer:typeof pipeline?.tokenizer?.encode,keys:Object.keys(engine)});
  if(typeof pipeline?.tokenizer?.encode!=='function')throw Error('Existing tokenizer unavailable');
  postMessage({stage:'count',tokens:pipeline.tokenizer.encode('ALPHA trades a running back to BETA.').length});
  stage='generate';
  const result=await engine.chat.completions.create({messages:[{role:'user',content:'Write one short sentence about a fair fantasy football trade.'}],max_tokens:32});
  postMessage({stage,finish:result.choices?.[0]?.finish_reason,text:result.choices?.[0]?.message?.content,usage:result.usage});
  await engine.unload();
  postMessage({done:true});
 }catch(e){postMessage({done:true,stage,error:String(e),stack:e.stack})}
})();`;
const server=createServer((req,res)=>{
 res.setHeader('Content-Type',req.url==='/worker.mjs'?'text/javascript':'text/html');
 res.end(req.url==='/worker.mjs'?worker:'<!doctype html>Generation probe');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage();
 await page.exposeFunction('report',data=>console.log(JSON.stringify(data)));
 page.on('crash',()=>console.log('PAGE_CRASH'));
 page.on('pageerror',error=>console.log('PAGE_ERROR',error.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(()=>new Promise(resolve=>{
  const worker=new Worker('/worker.mjs',{type:'module'});
  const timer=setTimeout(()=>{window.report({error:'Real generation timed out'});worker.terminate();resolve()},150000);
  worker.onmessage=({data})=>{window.report(data);if(data.done){clearTimeout(timer);worker.terminate();resolve()}};
  worker.onerror=e=>{window.report({error:e.message});clearTimeout(timer);worker.terminate();resolve()};
 }));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
