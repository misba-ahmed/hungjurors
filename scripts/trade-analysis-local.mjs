// Local inference only. This module never sends the dossier to a network endpoint.
let worker=null,sequence=0;
const jobs=new Map();
function getWorker(){
 if(worker)return worker;
 worker=new Worker(new URL('./trade-analysis-worker.mjs?v=20260924-webllm1',import.meta.url),{type:'module'});
 worker.onmessage=({data})=>{
  const job=jobs.get(data.id);if(!job)return;
  if(data.type==='progress'){job.onProgress?.(data.progress);return}
  jobs.delete(data.id);job.cleanup();
  if(data.type==='result')job.resolve(data.result);
  else job.reject(new Error('Local analysis unavailable'));
 };
 worker.onerror=()=>{
  const failed=worker;worker=null;failed?.terminate();
  for(const job of jobs.values()){job.cleanup();job.reject(new Error('Local analysis unavailable'))}
  jobs.clear();
 };
 return worker;
}
export function analyse(dossier,{signal,onProgress}={}){
 if(signal?.aborted)return Promise.reject(new DOMException('Aborted','AbortError'));
 return new Promise((resolve,reject)=>{
  let w;
  try{w=getWorker()}catch(error){reject(error);return}
  const id=++sequence;
  const abort=()=>{w.postMessage({type:'cancel',id});jobs.delete(id);cleanup();reject(new DOMException('Aborted','AbortError'))};
  const cleanup=()=>signal?.removeEventListener('abort',abort);
  jobs.set(id,{resolve,reject,onProgress,cleanup});
  signal?.addEventListener('abort',abort,{once:true});
  w.postMessage({type:'analyse',id,dossier});
 });
}
export function dispose(){
 worker?.terminate();worker=null;
 for(const job of jobs.values()){job.cleanup();job.reject(new DOMException('Aborted','AbortError'))}
 jobs.clear();
}
