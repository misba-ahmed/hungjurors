import fs from 'node:fs/promises';import {resolve,join} from 'node:path';import {pathToFileURL} from 'node:url';
export function projectedRanks(entries,season){
 const groups=new Map(),players={};
 for(const e of entries){const p=e.player||e.playerPoolEntry?.player;if(!p?.id)continue;const pos={1:'QB',2:'RB',3:'WR',4:'TE',5:'K',16:'D/ST'}[p.defaultPositionId];if(!pos)continue;
  players[p.id]={position:pos,weeks:{}};
  for(const s of p.stats||[]){const week=Number(s.scoringPeriodId);if(Number(s.seasonId)!==season||Number(s.statSourceId)!==1||Number(s.statSplitTypeId)!==1||week<1||week>18||s.appliedTotal==null||!Number.isFinite(Number(s.appliedTotal)))continue;
   const points=Math.round(Number(s.appliedTotal)*100)/100,key=pos+':'+week;if(!groups.has(key))groups.set(key,new Map());groups.get(key).set(String(p.id),{id:String(p.id),week,points});
  }
 }
 for(const group of groups.values()){const rows=[...group.values()].sort((a,b)=>b.points-a.points);let rank=0;rows.forEach((r,i)=>{if(!i||r.points!==rows[i-1].points)rank=i+1;players[r.id].weeks[r.week]=[r.points,rank]})}
 return {schema:1,source:'ESPN',season,checkedAt:Date.now(),players};
}
async function main(){
 const site=resolve(process.argv[2]||'_site'),html=await fs.readFile(join(site,'index.html'),'utf8'),season=Number(html.match(/const NFL_SEASON\s*=\s*(\d+)/)?.[1]),league=html.match(/const ESPN_FANTASY_LEAGUE_ID\s*=\s*['"]?(\d+)/)?.[1];if(!season||!league)throw Error('Missing season/league');
 const filter={players:{filterSlotIds:{value:[0,2,4,6,16,17]},filterStatsForSourceIds:{value:[1]},filterStatsForSplitTypeIds:{value:[1]},filterStatsForScoringPeriodIds:{value:Array.from({length:18},(_,i)=>i+1)},sortPercOwned:{sortAsc:false,sortPriority:1},limit:1500}};
 const url=`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league}?view=kona_player_info`;
 const response=await fetch(url,{headers:{'x-fantasy-filter':JSON.stringify(filter)},signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('ESPN '+response.status);const payload=await response.json();if(!payload.players?.length||payload.players.length>=1500)throw Error('Incomplete projection pool');
 const feed=projectedRanks(payload.players,season);for(const pos of ['QB','RB','WR','TE','K','D/ST'])if(!Object.values(feed.players).some(p=>p.position===pos&&Object.keys(p.weeks).length))throw Error('Missing '+pos+' projections');
 await fs.mkdir(join(site,'data'),{recursive:true});await fs.writeFile(join(site,'data','projected-position-ranks.json'),JSON.stringify(feed));console.log('Published projected ranks for '+Object.keys(feed.players).length+' players');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
