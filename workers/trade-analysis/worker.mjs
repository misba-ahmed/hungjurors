import {MODEL,PROTOCOL,validateTrade,geminiRequest,parseGeminiResponse} from '../../scripts/trade-analysis-shared.mjs';

const ORIGIN='https://hungjurors.com';
const LIMIT=24000;

async function boundedJson(message,limit){
 if(Number(message.headers.get('Content-Length'))>limit)throw Error('Body too large');
 if(!message.body)throw Error('Empty body');
 const reader=message.body.getReader(),parts=[];let bytes=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   bytes+=value.byteLength;if(bytes>limit){await reader.cancel();throw Error('Body too large')}
   parts.push(value);
  }
 }finally{reader.releaseLock()}
 const all=new Uint8Array(bytes);let offset=0;
 for(const part of parts){all.set(part,offset);offset+=part.byteLength}
 return JSON.parse(new TextDecoder().decode(all));
}

export default {
 async fetch(request,env){
  const headers={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST, GET, OPTIONS',
   'Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600',
   'Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json'};
  const reply=(status,error)=>new Response(JSON.stringify({error}),{status,headers});
  if(request.headers.get('Origin')!==ORIGIN)return new Response(null,{status:403});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const path=new URL(request.url).pathname;
  const configured=Boolean(env?.GEMINI_API_KEY&&env.GEMINI_FREE_TIER_CONFIRMED==='true');
  if(path==='/health'&&request.method==='GET')return new Response(JSON.stringify({ready:configured,protocol:PROTOCOL}),{headers});
  // Legacy clients cannot reactivate the former OpenAI endpoint.
  if(path!=='/gemini')return reply(410,'retired');
  if(request.method!=='POST')return reply(405,'method');
  // Free-tier status must be checked in AI Studio before this flag is set.
  // Never use the legacy MODEL/OpenAI secret or fall back to a different provider.
  if(!configured)return reply(503,'not_configured');
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return reply(415,'content_type');
  let trade;
  try{trade=validateTrade(await boundedJson(request,LIMIT))}
  catch(_){return reply(400,'invalid_trade')}
  if(!env.PER_IP||!env.TOTAL)return reply(503,'not_configured');
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  try{
   if(!(await env.PER_IP.limit({key:ip})).success||!(await env.TOTAL.limit({key:'trade-analysis'})).success)return reply(429,'busy');
  }catch(_){return reply(503,'unavailable')}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),90000);
  const cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});
  try{
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent',{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
    body:JSON.stringify(geminiRequest(trade)),signal:controller.signal
   });
   if(!response.ok){
    await response.body?.cancel();
    console.warn('trade_analysis_upstream',{status:response.status});
    return reply(response.status===429?429:502,response.status===429?'busy':'unavailable');
   }
   const data=parseGeminiResponse(await boundedJson(response,200000));
   return new Response(JSON.stringify(data),{headers});
  }catch(error){
   // Never log the prompt, generated report, upstream body or API key.
   console.warn('trade_analysis_failed',{kind:error.name==='AbortError'?'timeout':'invalid_response'});
   return reply(502,'unavailable');
  }finally{
   clearTimeout(timeout);request.signal.removeEventListener('abort',cancel);
  }
 }
};
