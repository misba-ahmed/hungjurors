import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

export const TREND_HOURS=24,PLAYER_MAP_TTL=86400000,TREND_MAX_AGE=2*3600000,TREND_LIMIT=10000;
const POSITIONS=new Set(['QB','RB','WR','TE','K','D/ST']);
const position=value=>value==='DEF'||value==='DST'?'D/ST':String(value||'').toUpperCase();
export function compactPlayerMap(raw,at=Date.now()){
 if(!raw||Array.isArray(raw)||typeof raw!=='object')throw Error('Invalid Sleeper player map');
 const players=Object.entries(raw).flatMap(([id,p])=>{
  const pos=position(p.position);if(!POSITIONS.has(pos))return [];
  const name=p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ');
  if(!name&&pos!=='D/ST')return [];
  return [{id:String(p.player_id||id),espnId:p.espn_id==null?'':String(p.espn_id),name:name||p.team||id,position:pos,team:p.team||id}];
 });
 if(players.length<100)throw Error('Sleeper player map is incomplete');
 return {schema:1,source:'Sleeper',generatedAt:at,players};
}
export function trendCounts(rows){
 if(!Array.isArray(rows)||rows.length>=TREND_LIMIT)throw Error('Incomplete Sleeper trends');
 const counts=new Map();
 for(const row of rows){
  const id=String(row?.player_id||''),count=row?.count;
  if(!id||!Number.isSafeInteger(count)||count<0||counts.has(id))throw Error('Malformed Sleeper count');
  counts.set(id,count);
 }
 return counts;
}
export function buildTrends(map,adds,drops,at=Date.now()){
 if(map?.schema!==1||map.source!=='Sleeper'||!Array.isArray(map.players)||!map.players.length)throw Error('Invalid player map');
 const a=trendCounts(adds),d=trendCounts(drops),known=new Set(map.players.map(p=>p.id));
 // Do not silently lose a new offensive player or defense missing from the daily map.
 const missing=[...new Set([...a.keys(),...d.keys()])].filter(id=>!known.has(id)&&!map.ignoredIds?.includes(id));
 if(missing.length)throw Error('Sleeper trend IDs missing from player map: '+missing.slice(0,10).join(','));
 const players=map.players.map(p=>({...p,adds:a.get(p.id)||0,drops:d.get(p.id)||0,net:(a.get(p.id)||0)-(d.get(p.id)||0)}));
 return {schema:1,source:'Sleeper',sourceUrl:'https://docs.sleeper.com/#trending-players',lookbackHours:TREND_HOURS,generatedAt:at,addRows:adds.length,dropRows:drops.length,players};
}
async function json(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Sleeper fetch HTTP '+response.status);
 return response.json();
}
export async function collectTrends({previousMap=null,request=json,now=Date.now()}={}){
 let map=previousMap;
 if(map?.schema!==1||map.source!=='Sleeper'||!Array.isArray(map.players)||map.players.length<100||!Number.isFinite(map.generatedAt)||now-map.generatedAt>=PLAYER_MAP_TTL||map.generatedAt>now+60000){
  const raw=await request('https://api.sleeper.app/v1/players/nfl');
  map=compactPlayerMap(raw,now);
  map.ignoredIds=Object.entries(raw).filter(([,p])=>!POSITIONS.has(position(p.position))).map(([id,p])=>String(p.player_id||id));
 }
 const responses=await Promise.all(['add','drop'].map(type=>request('https://api.sleeper.app/v1/players/nfl/trending/'+type+'?lookback_hours='+TREND_HOURS+'&limit='+TREND_LIMIT)));
 return {map,data:buildTrends(map,responses[0],responses[1],now)};
}
export function validTrendFeed(data,at=Date.now()){
 return data?.schema===1&&data.source==='Sleeper'&&data.lookbackHours===24&&Number.isFinite(data.generatedAt)&&data.generatedAt<=at+60000&&at-data.generatedAt<=TREND_MAX_AGE&&Array.isArray(data.players)&&data.players.length>=100&&data.players.every(p=>typeof p.id==='string'&&POSITIONS.has(p.position)&&Number.isSafeInteger(p.adds)&&p.adds>=0&&Number.isSafeInteger(p.drops)&&p.drops>=0&&p.net===p.adds-p.drops);
}
async function main(){
 const site=resolve(process.argv[2]||'_site'),base=process.env.PAGES_BASE_URL?.replace(/\/$/,'')+'/';
 let previousMap=null,result;
 if(process.env.PAGES_BASE_URL)try{previousMap=await json(new URL('data/sleeper-player-map.json',base))}catch{}
 try{
  result=await collectTrends({previousMap});
  console.log('Sleeper 24h trends: '+result.data.addRows+' add records, '+result.data.dropRows+' drop records; '+result.data.players.length+' mapped players.');
  console.log('Sleeper examples: '+JSON.stringify([...result.data.players].sort((a,b)=>Math.abs(b.net)-Math.abs(a.net)).slice(0,3).map(({name,adds,drops,net})=>({name,adds,drops,net}))));
 }catch(error){
  if(!process.env.PAGES_BASE_URL)throw error;
  const previous=await json(new URL('data/sleeper-trends.json',base));
  if(!validTrendFeed(previous))throw error;
  result={map:previousMap,data:previous};
  console.warn('Sleeper refresh unavailable; retaining recent verified trend counts: '+error.message);
 }
 if(!validTrendFeed(result.data))throw Error('Invalid trend output');
 await mkdir(join(site,'data'),{recursive:true});
 if(result.map)await writeFile(join(site,'data/sleeper-player-map.json'),JSON.stringify(result.map));
 await writeFile(join(site,'data/sleeper-trends.json'),JSON.stringify(result.data));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
