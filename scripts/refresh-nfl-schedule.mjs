import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';

export function validSchedule(data,season){
 if(data?.schema!==1||data.season!==season||data.source!=='ESPN'||!Array.isArray(data.games)||data.games.length!==272)return false;
 const ids=new Set(),teams=new Map();
 for(const g of data.games){
  if(typeof g.game_id!=='string'||ids.has(g.game_id)||g.season!==season||!Number.isInteger(g.week)||g.week<1||g.week>18||
   !/^[A-Z]{2,4}$/.test(g.home_team)||!/^[A-Z]{2,4}$/.test(g.away_team)||g.home_team===g.away_team)return false;
  ids.add(g.game_id);
  for(const team of [g.home_team,g.away_team]){
   if(!teams.has(team))teams.set(team,new Set());
   if(teams.get(team).has(g.week))return false;
   teams.get(team).add(g.week);
  }
 }
 return teams.size===32&&[...teams.values()].every(weeks=>weeks.size===17);
}
async function json(url){
 const r=await fetch(url,{signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('Schedule HTTP '+r.status);
 return r.json();
}
export async function collectSchedule(season,request=json){
 const weeks=await Promise.all(Array.from({length:18},async(_,i)=>{
  const week=i+1,payload=await request('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates='+season+'&seasontype=2&week='+week+'&limit=100');
  if(Number(payload.season?.year)!==season||Number(payload.season?.type)!==2)throw Error('Schedule season mismatch');
  return (payload.events||[]).map(event=>{
   const c=event.competitions?.[0],h=c?.competitors?.find(t=>t.homeAway==='home'),a=c?.competitors?.find(t=>t.homeAway==='away');
   return {game_id:String(event.id),season,week,home_team:h?.team?.abbreviation,away_team:a?.team?.abbreviation,
    gameday:String(event.date||'').slice(0,10)};
  });
 }));
 const data={schema:1,source:'ESPN',season,checkedAt:Date.now(),games:weeks.flat()};
 if(!validSchedule(data,season))throw Error('Incomplete NFL schedule');
 return data;
}
async function main(){
 const site=resolve(process.argv[2]||'_site'),html=await readFile(join(site,'index.html'),'utf8');
 const season=Number(html.match(/const NFL_SEASON\s*=\s*(\d{4})/)?.[1]);
 if(!season)throw Error('Missing site season');
 let data;
 try{data=await collectSchedule(season)}
 catch(error){
  if(!process.env.PAGES_BASE_URL)throw error;
  const previous=await json(new URL('data/nfl-schedule-'+season+'.json',process.env.PAGES_BASE_URL.replace(/\/$/,'')+'/'));
  if(!validSchedule(previous,season))throw error;
  data=previous;console.warn('Retaining the verified current-season NFL schedule.');
 }
 await mkdir(join(site,'data'),{recursive:true});
 await writeFile(join(site,'data','nfl-schedule-'+season+'.json'),JSON.stringify(data));
 console.log('NFL schedule: '+data.games.length+' games for '+season+'.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
