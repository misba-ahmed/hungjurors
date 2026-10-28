/* Confirm byes only from a complete, validated current-season NFL schedule. */
const HJ_SCHEDULE_SEED=null;
function hjInstallSchedule(payload,season){
 const teams=hjByeScheduleIndex(payload,season);if(!teams)return false;
 Object.assign(HJ_BYE_STATE,{season,teams});
 // ESPN writes Washington as WSH; the rest of the site compares schedule teams as pcTeam codes (WAS).
 for(const g of payload.games)if(g._espnEvent&&!HJ_GAME_RANKS.schedule.get(g.game_id)?._espnEvent)HJ_GAME_RANKS.schedule.set(g.game_id,{...g,home_team:pcTeam(g.home_team),away_team:pcTeam(g.away_team)});
 return true;
}
const HJ_BYE_STATE={season:0,teams:new Map(),pending:null};
function hjByeScheduleIndex(payload,season){
 if(payload?.schema!==1||payload.source!=='ESPN'||Number(payload.season)!==Number(season)||payload.games?.length!==272)return null;
 const teams=new Map(),ids=new Set();
 for(const g of payload.games){
  const w=Number(g.week),h=pcTeam(g.home_team),a=pcTeam(g.away_team);
  if(Number(g.season)!==Number(season)||!Number.isInteger(w)||w<1||w>18||!h||!a||h===a||!g.game_id||ids.has(g.game_id))return null;
  ids.add(g.game_id);
  for(const team of [h,a]){if(!teams.has(team))teams.set(team,new Set());if(teams.get(team).has(w))return null;teams.get(team).add(w);}
 }
 return teams.size===32&&[...teams.values()].every(w=>w.size===17)?teams:null;
}
function hjTeamOnBye(team,week=hjCurrentWeek()){
 const weeks=HJ_BYE_STATE.season===Number(NFL_SEASON)?HJ_BYE_STATE.teams.get(pcTeam(team)):null,w=Number(week);
 return !!weeks&&Number.isInteger(w)&&w>=1&&w<=18&&!weeks.has(w);
}
async function hjLoadByeSchedule(){
 if(HJ_BYE_STATE.pending)return HJ_BYE_STATE.pending;
 const season=Number(NFL_SEASON);
 HJ_BYE_STATE.pending=(async()=>{
  const r=await fetch('/data/nfl-schedule-'+season+'.json',{cache:'no-cache'});if(!r.ok)throw Error('Schedule unavailable');
  if(!hjInstallSchedule(await r.json(),season))throw Error('Incomplete bye schedule');
  document.dispatchEvent(new Event('hj:bye-schedule'));
  if(typeof hjRefreshGameContexts==='function')hjRefreshGameContexts();
  document.dispatchEvent(new Event('hj:team-photo-scores'));
 })().catch(error=>console.warn('Bye status unavailable',error)).finally(()=>{HJ_BYE_STATE.pending=null;});
 return HJ_BYE_STATE.pending;
}
if(HJ_SCHEDULE_SEED)hjInstallSchedule(HJ_SCHEDULE_SEED,Number(NFL_SEASON));
document.addEventListener('DOMContentLoaded',()=>{hjLoadByeSchedule();setInterval(()=>{if(!document.hidden)hjLoadByeSchedule();},300000);},{once:true});
