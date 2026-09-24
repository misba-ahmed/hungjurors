import {researchSources} from './trade-analysis-shared.mjs';

const OMIT=new Set(['links','logos','logo','headshot','images','image','videos','video','audio','href','$ref','guid','uid','color','alternateColor','altColor']);
function compact(value,depth=0){
 if(depth>18||value==null)return value;
 if(Array.isArray(value))return value.map(x=>compact(x,depth+1));
 if(typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!OMIT.has(k)).map(([k,v])=>[k,compact(v,depth+1)]));
 return value;
}
const plain=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
export function currentNews(data,player,now=Date.now()){
 const last=player.name.replace(/\b(?:Jr\.?|Sr\.?|II|III|IV)\s*$/i,'').trim().split(/\s+/).at(-1);
 const seen=new Set();
 return (data?.feed||[]).filter(item=>{
  const at=Date.parse(item.published||item.lastModified||item.categorized||'');
  const text=plain(item.description||item.headline);
  const first=text.replace(/\b(?:[A-Z]\.){1,3}/g,m=>m.replace(/\./g,'')).split(/[.!?](?:\s|$)/)[0];
  if(String(item.type).toLowerCase()!=='rotowire'||(item.playerId&&String(item.playerId)!==player.id)||
   !Number.isFinite(at)||at<now-21*864e5||at>now+300000||!last||
   !first.split(/\s+/).some(word=>fold(word.replace(/[’']s$/,''))===fold(last))||seen.has(text))return false;
  seen.add(text);return true;
 }).map(item=>({published:item.published||item.lastModified||item.categorized,
  text:plain(item.description||item.headline),spin:plain(item.story||item.spin)}));
}
async function readJson(response){
 if(!response.ok||!response.body)throw Error('Source unavailable');
 const reader=response.body.getReader(),parts=[];let size=0;
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
   if(size>600000){await reader.cancel();throw Error('Source too large')}parts.push(value)}
 }finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;
 for(const p of parts){bytes.set(p,offset);offset+=p.byteLength}
 return JSON.parse(new TextDecoder().decode(bytes));
}
async function collect(list,task){
 const results=new Array(list.length);let next=0;
 await Promise.all(Array.from({length:Math.min(6,list.length)},async()=>{
  while(next<list.length){const index=next++;try{results[index]=await task(list[index])}catch(_){results[index]=null}}
 }));
 return results.filter(Boolean);
}
export async function loadResearch(trade,signal,fetcher=fetch){
 const now=Date.now(),players=trade.managers.flatMap(m=>m.roster.filter(p=>m.sends.includes(p.id)));
 const byId=new Map(players.map(p=>[p.id,p])),teams=new Set(players.map(p=>p.team));
 const fetched=async source=>{
  const timeout=AbortSignal.timeout(8000);
  const response=await fetcher(source.url,{headers:{Accept:'application/json'},signal:signal?AbortSignal.any([signal,timeout]):timeout});
  return {...source,raw:await readJson(response),retrievedAt:new Date(now).toISOString()};
 };
 const initial=await collect(researchSources(trade),fetched);
 // Add the real news and Spin for relevant injured teammates and room starters.
 const teammates=new Map();
 for(const source of initial.filter(s=>/\/(?:injuries|depthcharts)$/.test(s.url))){
  const injured=/\/injuries$/.test(source.url),team=source.title.split(' ')[0];
  const room=new Set(players.filter(p=>p.team===team).map(p=>p.position));
  const walk=node=>{
   if(!node||typeof node!=='object')return;
   const athlete=node.athlete||node.player;
   if(athlete&&typeof athlete==='object'){
    const id=String(athlete.id||''),name=athlete.fullName||athlete.displayName||'';
    const position=athlete.position?.abbreviation||node.position?.abbreviation||'';
    const status=plain(node.status?.description||node.status?.name||node.status||'');
    const rank=Number(node.rank??node.depth);
    const material=injured&&/injured reserve|\bIR\b|\bOUT\b|PUP/i.test(status);
    const starter=!injured&&rank===1&&(room.has(position)||['QB','WR','TE'].includes(position));
    if(/^\d+$/.test(id)&&name&&!byId.has(id)&&['QB','RB','WR','TE'].includes(position)&&(material||starter)){
     const priority=(material?10:0)+(room.has(position)?4:0)+(position==='QB'?3:0);
     if(priority>(teammates.get(id)?.priority??-1))teammates.set(id,{id,name,position,team,priority});
    }
   }
   for(const value of Object.values(node))if(value&&typeof value==='object'){
    if(Array.isArray(value))value.forEach(walk);else walk(value);
   }
  };
  walk(source.raw);
 }
 const relevant=[...teammates.values()].sort((a,b)=>b.priority-a.priority).slice(0,8);
 relevant.forEach(p=>byId.set(p.id,p));
 const more=await collect(relevant.map(p=>({url:'https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players?playerId='+p.id+'&limit=30&offset=0',title:p.name+' news and Spin'})),fetched);
 const sources=[],facts=[];
 let newsItems=0;
 for(const source of [...initial,...more]){
  let data;
  const url=new URL(source.url);
  if(url.pathname.endsWith('/news/players')){
   const player=byId.get(url.searchParams.get('playerId'));if(!player)continue;
   const news=currentNews(source.raw,player,now);if(!news.length)continue;
   newsItems+=news.length;data={player:{id:player.id,name:player.name,team:player.team,position:player.position},news};
  }else if(url.pathname.includes('nfl-schedule-')){
   if(source.raw.season!==trade.season||!Array.isArray(source.raw.games))continue;
   data={season:trade.season,games:source.raw.games.filter(g=>g.week>=trade.week&&g.week<=16&&(teams.has(g.home_team)||teams.has(g.away_team)))};
  }else data=compact(source.raw);
  if(!data||!Object.keys(data).length)continue;
  const item={url:source.url,title:source.title,retrievedAt:source.retrievedAt};
  sources.push(item);facts.push({...item,data});
 }
 // Do not substitute training-memory opinions when the current news fetch failed.
 if(!newsItems)throw Error('Current news unavailable');
 return {asOf:new Date(now).toISOString(),newsItems,sources,facts};
}
