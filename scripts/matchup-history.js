/* Load the requested matchup week without waiting for the season-history queue. */
function hjLoadMatchupHistory(data,week){
 week=Number(week);
 if(HJ_DATA.historyJobs.has(week))return HJ_DATA.historyJobs.get(week);
 const key=`history:${NFL_SEASON}:${week}`,record=HJ_DATA.requests.get(key);
 if(HJ_DATA.history.has(week)&&record&&Date.now()-record.at<300000)return Promise.resolve(HJ_DATA.history.get(week));
 const job=hjDataRequest(key,()=>hjDataJson(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${NFL_SEASON}/segments/0/leagues/${ESPN_FANTASY_LEAGUE_ID}?scoringPeriodId=${week}&view=mMatchup&view=mMatchupScore&view=mRoster&view=mSettings&view=mTeam`),300000)
 .then(payload=>{
  if(Number(payload.scoringPeriodId)!==week||!Array.isArray(payload.schedule))throw Error('Wrong historical week');
  HJ_DATA.history.set(week,payload);
  hjApplyLiveSeason(HJ_LEAGUE_STATE.data,false);hjRefreshRecap();
  if(HJ_HQ_STATE.activeTab==='matchups'&&Number(HJ_HQ_STATE.matchupWeek||hjDefaultMatchupWeek(HJ_LEAGUE_STATE.data))===week)hjRenderMatchupCenter();
  return payload;
 }).catch(error=>{console.warn('Historical lineup unavailable',week,error);return null;})
 .finally(()=>HJ_DATA.historyJobs.delete(week));
 HJ_DATA.historyJobs.set(week,job);return job;
}
async function hjEnsureCompletedHistory(data){
 const selected=Number(HJ_HQ_STATE.matchupWeek||hjDefaultMatchupWeek(data));
 const weeks=hjCompletedWeeks(data).map(w=>w.week).sort((a,b)=>(b===selected)-(a===selected)||b-a);
 // Start the visible week independently, even if an older background request is pending.
 if(selected<hjCurrentWeek(data))void hjLoadMatchupHistory(data,selected);
 for(const week of weeks)await hjLoadMatchupHistory(data,week);
}
function hjScheduleWeekSource(data,week){
 week=Number(week);
 const past=week<hjCurrentWeek(data);
 const source=(past?HJ_DATA.history.get(week):null)||data;
 if(past)void hjLoadMatchupHistory(data,week);
 // The league snapshot already has pairings and final scores. Keep them visible
 // while the selected week's saved lineups arrive; never substitute current rosters.
 return {games:(source?.schedule||[]).filter(g=>Number(g.matchupPeriodId)===week&&g.home&&g.away),sourceData:source,usingPrevious:false};
}
