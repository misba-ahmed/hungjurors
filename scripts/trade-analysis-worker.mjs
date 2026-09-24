import {generateAnalysis,CONTEXT_SIZE} from './trade-analysis-shared.mjs?v=20260924-webllm4';
const WEBLLM='https://esm.run/@mlc-ai/web-llm@0.2.85';
let engine=null,tokenizer=null,loading=null,queue=Promise.resolve(),active=null;
const jobs=new Map();
function progress(info){if(active&&!active.controller.signal.aborted)postMessage({type:'progress',id:active.id,progress:info})}
async function loadEngine(){
 if(engine&&tokenizer)return;
 if(loading)return loading;
 loading=(async()=>{
  if(!navigator.gpu)throw Error('WebGPU unavailable');
  const adapter=await navigator.gpu.requestAdapter();
  if(!adapter)throw Error('WebGPU unavailable');
  const format=adapter.features.has('shader-f16')?'q4f16_1':'q4f32_1';
  const modelId='Llama-3.2-1B-Instruct-'+format+'-MLC';
  const llm=await import(WEBLLM);
  const record=llm.prebuiltAppConfig.model_list.find(m=>m.model_id===modelId);
  if(!record)throw Error('Model unavailable');
  engine=new llm.MLCEngine({appConfig:{...llm.prebuiltAppConfig,model_list:[record]},
   logLevel:'ERROR',initProgressCallback:info=>progress({phase:'loading',fraction:Math.max(0,Math.min(1,info.progress||0))})});
  await engine.reload(modelId,{context_window_size:CONTEXT_SIZE});
  // The pinned runtime already owns this tokenizer. Reuse it for exact budgeting;
  // constructing another copy also loads a second tokenizer WASM heap.
  tokenizer=engine.loadedModelIdToPipeline?.get(modelId)?.tokenizer;
  if(typeof tokenizer?.encode!=='function')throw Error('Tokenizer unavailable');
 })().catch(async error=>{
  try{await engine?.unload()}catch(_){}
  engine=null;tokenizer=null;throw error;
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
