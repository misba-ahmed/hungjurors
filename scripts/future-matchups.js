/* Selected-week data never borrows current-week game states or projections. */
const HJ_FUTURE_MATCHUPS=new Map();
function hjFutureProjection(entry,week,season=Number(NFL_SEASON)){
 if(Number(season)!==Number(NFL_SEASON))return null;
 return HJ_FUTURE_MATCHUPS.get(Number(week))?.projections?.get(String(hjPlayer(entry).id))||null;
}
function hjLoadFutureMatchup(week,data=HJ_LEAGUE_STATE.data){
 week=Number(week);if(week<=hjCurrentWeek(data)||week>18)return Promise.resolve();
 let state=HJ_FUTURE_MATCHUPS.get(week);
 if(state?.pending)return state.pending;
 if(state&&Date.now()-state.at<60000)return Promise.resolve();
 if(!state){state={at:0,projections:new Map()};HJ_FUTURE_MATCHUPS.set(week,state)}
 state.at=Date.now();
 const refresh=()=>{if(HJ_HQ_STATE.activeTab==='matchups'&&Number(HJ_HQ_STATE.matchupWeek||hjDefaultMatchupWeek(data))===week){hjRenderMatchupCenter();hjRefreshGameContexts()}};
 const schedule=hjDataScheduleMap(Number(NFL_SEASON),[week]).then(map=>{
  for(const [id,g] of map)if(Number(g.week)===week&&Number(g.season)===Number(NFL_SEASON))HJ_GAME_RANKS.schedule.set(id,g);
  refresh();
 });
 const ids=[...new Set((data?.teams||[]).flatMap(t=>hjRosterEntries(t)).map(e=>Number(hjPlayer(e).id)).filter(Number.isFinite))];
 const projections=(async()=>{
  if(!ids.length)return;
  const filter={players:{filterIds:{value:ids},filterStatsForSourceIds:{value:[1]},filterStatsForSplitTypeIds:{value:[1]},filterStatsForScoringPeriodIds:{value:[week]},sortPercOwned:{sortAsc:false,sortPriority:1},limit:ids.length}};
  const url=`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${NFL_SEASON}/segments/0/leagues/${ESPN_FANTASY_LEAGUE_ID}?scoringPeriodId=${week}&view=kona_player_info`;
  const payload=await hjDataJson(url,{headers:{'x-fantasy-filter':JSON.stringify(filter)}});
  for(const e of payload.players||[]){const p=hjPlayer(e),s=(p.stats||[]).find(s=>Number(s.seasonId)===Number(NFL_SEASON)&&Number(s.scoringPeriodId)===week&&Number(s.statSourceId)===1&&Number(s.statSplitTypeId)===1&&hjNumber(s.appliedTotal)!==null);if(s)state.projections.set(String(p.id),s)}
  refresh();
 })();
 state.pending=Promise.allSettled([schedule,projections]).finally(()=>{state.pending=null});return state.pending;
}
setInterval(()=>{if(!document.hidden&&HJ_HQ_STATE.activeTab==='matchups')hjLoadFutureMatchup(HJ_HQ_STATE.matchupWeek||hjDefaultMatchupWeek())},30000);
