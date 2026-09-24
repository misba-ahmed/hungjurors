import {generateAnalysis,CONTEXT_SIZE} from './trade-analysis-shared.mjs?v=20260924-webllm1';
const WEBLLM='https://esm.run/@mlc-ai/web-llm@0.2.85';
const TOKENIZERS='https://cdn.jsdelivr.net/npm/@mlc-ai/web-tokenizers@0.1.6/lib/index.js';
let engine=null,tokenizer=null,loading=null,queue=Promise.resolve(),active=null;
const jobs=new Map();
function progress(info){if(active&&!active.controller.signal.aborted)postMessage({type:'progress',id:active.id,progress:info})}
async function tokenizerBytes(url){
 let cache=null;
 try{cache=await caches.open('hj-trade-tokenizer-v1');const hit=await cache.match(url);if(hit)return hit.arrayBuffer()}catch(_){}
 const response=await fetch(url,{credentials:'omit'});
 if(!response.ok)throw Error('Tokenizer download failed');
 if(cache)try{await cache.put(url,response.clone())}catch(_){}
 return response.arrayBuffer();
}
async function loadEngine(){
 if(engine&&tokenizer)return;
 if(loading)return loading;
 loading=(async()=>{
  if(!navigator.gpu)throw Error('WebGPU unavailable');
  const adapter=await navigator.gpu.requestAdapter();
  if(!adapter)throw Error('WebGPU unavailable');
  const format=adapter.features.has('shader-f16')?'q4f16_1':'q4f32_1';
  const modelId='Qwen3-1.7B-'+format+'-MLC';
  const [llm,tokenModule]=await Promise.all([import(WEBLLM),import(TOKENIZERS)]);
  // The published tokenizer is UMD. Load its browser artifact directly;
  // asking the CDN to rebundle it as ESM fails before model loading begins.
  const tokens=tokenModule.Tokenizer?tokenModule:globalThis.tokenizers;
  if(typeof tokens?.Tokenizer?.fromJSON!=='function')throw Error('Tokenizer unavailable');
  const record=llm.prebuiltAppConfig.model_list.find(m=>m.model_id===modelId);
  if(!record)throw Error('Model unavailable');
  engine=new llm.MLCEngine({appConfig:{...llm.prebuiltAppConfig,model_list:[record]},
   logLevel:'ERROR',initProgressCallback:info=>progress({phase:'loading',fraction:Math.max(0,Math.min(1,info.progress||0))})});
  await engine.reload(modelId,{context_window_size:CONTEXT_SIZE});
  const url=record.model.replace(/\/$/,'')+'/resolve/main/tokenizer.json';
  tokenizer=await tokens.Tokenizer.fromJSON(await tokenizerBytes(url));
 })().catch(async error=>{
  try{await engine?.unload()}catch(_){}
  engine=null;tokenizer?.dispose();tokenizer=null;throw error;
 }).finally(()=>{loading=null});
 return loading;
}
self.onmessage=({data})=>{
 if(data.type==='cancel'){
  jobs.get(data.id)?.controller.abort();
  if(active?.id===data.id)engine?.interruptGenerate();
  return;
 }
 if(data.type!=='analyse')return;
 const job={id:data.id,dossier:data.dossier,controller:new AbortController()};
 jobs.set(job.id,job);
 queue=queue.catch(()=>{}).then(async()=>{
  if(job.controller.signal.aborted){jobs.delete(job.id);return}
  active=job;
  try{
   progress({phase:'loading',fraction:0});
   await loadEngine();
   if(job.controller.signal.aborted)return;
   const result=await generateAnalysis(engine,job.dossier,{countTokens:text=>tokenizer.encode(text).length,
    onProgress:progress,signal:job.controller.signal});
   if(!job.controller.signal.aborted)postMessage({type:'result',id:job.id,result});
  }catch(_){
   if(!job.controller.signal.aborted)postMessage({type:'error',id:job.id});
  }finally{jobs.delete(job.id);if(active===job)active=null}
 });
};
