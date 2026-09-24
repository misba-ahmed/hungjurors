// Local inference only. Each request owns its Worker and releases it on every exit.
let active=null,sequence=0;
export function dispose(){
 active?.abort();
}
export function analyse(dossier,{signal,onProgress}={}){
 if(signal?.aborted)return Promise.reject(new DOMException('Aborted','AbortError'));
 dispose();
 return new Promise((resolve,reject)=>{
  let worker;
  try{worker=new Worker(new URL('./trade-analysis-worker.mjs?v=20260924-webllm4',import.meta.url),{type:'module'})}
  catch(error){reject(error);return}
  const id=++sequence;
  let settled=false;
  const finish=(error,result)=>{
   if(settled)return;
   settled=true;
   signal?.removeEventListener('abort',abort);
   worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;
   // Termination also stops a download/reload that interruptGenerate cannot cancel.
   worker.terminate();
   if(active?.id===id)active=null;
   if(error)reject(error);else resolve(result);
  };
  const abort=()=>finish(new DOMException('Aborted','AbortError'));
  active={id,abort};
  worker.onmessage=({data})=>{
   if(data.id!==id||settled)return;
   if(data.type==='progress'){onProgress?.(data.progress);return}
   if(data.type==='result')finish(null,data.result);
   else finish(new Error('Local analysis unavailable'));
  };
  worker.onerror=()=>finish(new Error('Local analysis unavailable'));
  worker.onmessageerror=()=>finish(new Error('Local analysis unavailable'));
  signal?.addEventListener('abort',abort,{once:true});
  try{worker.postMessage({type:'analyse',id,dossier})}catch(error){finish(error)}
 });
}
globalThis.addEventListener?.('pagehide',dispose);
