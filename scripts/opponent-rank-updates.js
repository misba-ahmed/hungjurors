/* Each source updates only the position tables it owns. Keep a complete same-season
   table while a refresh is missing opponents; never mix ranks from two snapshots.

   Oct 29, 2026: ranks and averages come from ESPN's own opponent ratings (positionAgainstOpponent, league
   scoring) whenever they are available, so OPP RK and the "(n)" ranks match the ESPN app. The site's own
   table (pcDvp, nflverse + ESPN rows) is the fallback; it differed from ESPN for 61 of 160 defense-position
   pairs (duplicate player-weeks, a different game count, ties ranked differently). */
const HJ_ESPN_OPRK={season:0,week:0,at:0,job:null,byPos:null};
const HJ_ESPN_OPRK_POS={QB:1,RB:2,WR:3,TE:4,K:5,'D/ST':16};
function hjEspnOprkApply(position,table){
 const espn=HJ_ESPN_OPRK.byPos?.get(position);if(!espn||!table)return table;
 const out=new Map();
 for(const [team,row] of table){const e=espn.get(team);out.set(team,e?{...row,rank:e.rank,avg:e.avg,source:'espn'}:row)}
 return out;
}
function hjEspnOpponentRanks(){
 if(typeof ESPN_FANTASY_LEAGUE_ID==='undefined'||typeof NFL_TEAM_IDS==='undefined'||typeof fetch!=='function'||typeof document==='undefined')return Promise.resolve(null);
 const season=Number(NFL_SEASON),week=typeof hjCurrentWeek==='function'?hjCurrentWeek():0;
 if(HJ_ESPN_OPRK.job)return HJ_ESPN_OPRK.job;
 if(HJ_ESPN_OPRK.byPos&&HJ_ESPN_OPRK.season===season&&HJ_ESPN_OPRK.week===week&&Date.now()-HJ_ESPN_OPRK.at<30*60000)return Promise.resolve(HJ_ESPN_OPRK.byPos);
 const filter={players:{limit:1,sortPercOwned:{sortPriority:1,sortAsc:false}}};
 const path=`/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${ESPN_FANTASY_LEAGUE_ID}?scoringPeriodId=${week}&view=kona_player_info`;
 HJ_ESPN_OPRK.job=(async()=>{
  for(const host of ['https://lm-api-reads.fantasy.espn.com','https://fantasy.espn.com']){
   try{
    const response=await fetch(host+path,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{'x-fantasy-filter':JSON.stringify(filter)}});
    if(!response.ok)continue;
    const ratings=(await response.json())?.positionAgainstOpponent?.positionalRatings;if(!ratings)continue;
    const teamOf=new Map(Object.entries(NFL_TEAM_IDS||{}).map(([abbr,id])=>[String(id),pcTeam(String(abbr).toUpperCase())]));
    const byPos=new Map();
    for(const [position,id] of Object.entries(HJ_ESPN_OPRK_POS)){
     const list=ratings[String(id)]?.ratingsByOpponent;if(!list)continue;
     const table=new Map();
     for(const [teamId,r] of Object.entries(list)){const team=teamOf.get(String(teamId)),rank=Number(r?.rank);if(team&&Number.isInteger(rank)&&rank>=1&&rank<=32)table.set(team,{rank,avg:Number(r.average)})}
     if(table.size>=30)byPos.set(position,table);
    }
    if(!byPos.size)continue;
    Object.assign(HJ_ESPN_OPRK,{season,week,at:Date.now(),byPos});
    // Tables built before ESPN answered take ESPN's ranks now.
    let changed=false;
    for(const [position,table] of HJ_GAME_RANKS.maps){const next=hjEspnOprkApply(position,table);if(next!==table){HJ_GAME_RANKS.maps.set(position,next);changed=true}}
    if(changed)document.dispatchEvent(new Event('hj:game-ranks-updated'));
    return byPos;
   }catch(_){}
  }
  return null;
 })().finally(()=>{HJ_ESPN_OPRK.job=null});
 return HJ_ESPN_OPRK.job;
}
function hjUpdateOpponentRankMaps(season,updates){
 season=Number(season);
 if(season!==Number(NFL_SEASON))return;
 hjEspnOpponentRanks();
 let changed=false;
 for(const [position,table] of HJ_GAME_RANKS.maps){
  if([...table.values()].some(row=>Number(row.season)!==season)){
   HJ_GAME_RANKS.maps.delete(position);changed=true;
  }
 }
 for(const [position,computed] of updates){
  const next=hjEspnOprkApply(position,computed);
  const previous=HJ_GAME_RANKS.maps.get(position);
  const valid=[...next.values()].every(row=>Number(row.season)===season&&Number.isInteger(row.rank)&&row.rank>=1&&row.rank<=32);
  if(!valid||!next.size||previous&&[...previous.keys()].some(team=>!next.has(team)))continue;
  if(!previous||previous.size!==next.size||[...next].some(([team,row])=>previous.get(team)?.rank!==row.rank))changed=true;
  HJ_GAME_RANKS.maps.set(position,next);
 }
 if(changed)document.dispatchEvent(new Event('hj:game-ranks-updated'));
}
