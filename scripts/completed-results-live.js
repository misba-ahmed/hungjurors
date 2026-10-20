/* Results consumers share an overlay; live display/navigation keep the raw data. */
const HJ_COMPLETED_RESULTS={scoreboards:new Map(),pending:null,lastAttempt:0,signature:''};
function hjResultsView(data){return hjCompletedResultData(data,HJ_COMPLETED_RESULTS.scoreboards)}
function hjResultsTeam(team,data=HJ_LEAGUE_STATE.data){
 // Do not substitute a current team for a historical team with the same ID.
 if(!data?.teams?.includes(team))return team;
 return hjResultsView(data).teams.find(t=>String(t.id)===String(team.id))||team;
}
function hjRefreshRosterResultMetadata(){
 const data=HJ_LEAGUE_STATE.data;if(!data?.teams?.length)return;
 const initial=document.querySelector('#league-sync-content .league-team-view .hj-business-card:not([data-results-team])');
 if(initial&&HJ_LEAGUE_STATE.selectedTeamId!=null)initial.dataset.resultsTeam=String(HJ_LEAGUE_STATE.selectedTeamId);
 for(const team of hjResultsView(data).teams){
  const record=hjTeamRecord(team),points=hjNumber(team.record?.overall?.pointsFor),pf=points===null?'—':pcFpts(points),rank=hjCurrentStandingRank(team,data);
  document.querySelectorAll(`.league-team-tab[data-league-team="${team.id}"]`).forEach(tab=>{
   const standing=tab.querySelector('.hj-manager-standing'),summary=tab.querySelector('.league-team-tab-copy small');
   if(standing)standing.textContent=rank?'#'+rank:'—';
   if(summary)summary.textContent=record+' · PF '+pf;
   const owner=hjMatchManager(team,data)||hjOwnerName(team,data)||`Manager ${team.id}`;
   tab.setAttribute('aria-label',`${owner}, record ${record}, points for ${pf}, standing ${rank||'unavailable'}`);
  });
  document.querySelectorAll(`.hj-business-card[data-results-team="${team.id}"]`).forEach(card=>{
   const values=card.querySelectorAll('.hj-business-stats b');
   [record,pf,rank?'#'+rank:'—'].forEach((value,i)=>{if(values[i])values[i].textContent=value});
  });
 }
}
function hjRefreshProfileResultDetails(back,name){
 const record=s=>`${s.aWins}–${s.bWins}${s.ties?'–'+s.ties:''}`,diff=s=>`${s.aPF-s.bPF>=0?'+':''}${(s.aPF-s.bPF).toFixed(2)}`;
 back.querySelectorAll('.profile-rival').forEach(row=>{
  const opponent=row.querySelector('[data-manager]')?.dataset.manager;if(!opponent)return;
  const s=scheduleAllTimeSeries(name,opponent);
  row.querySelector('.profile-rival-record').textContent=record(s);
  row.querySelector('.profile-rival-points').textContent=s.games?diff(s)+' pts':'No meetings';
 });
 back.querySelectorAll('[data-profile-matchup-week]').forEach(node=>{
  const result=scheduleResultLabel(name,Number(node.dataset.profileMatchupWeek)),s=scheduleAllTimeSeries(name,node.dataset.profileMatchupOpponent);
  let label=node.querySelector('.profile-schedule-result');
  if(result&&!label){label=document.createElement('span');label.className='profile-schedule-result';node.insertBefore(label,node.querySelector('.profile-schedule-h2h'))}
  if(label){if(result)label.textContent=result;else label.remove()}
  node.classList.toggle('is-win',/^W /.test(result));node.classList.toggle('is-loss',/^L /.test(result));
  const h2h=node.querySelector('.profile-schedule-h2h');
  if(h2h)h2h.innerHTML=s.games?`<span>H2H ${record(s)}</span><span class="profile-schedule-diff">${diff(s)} PTS</span>`:'<span>H2H · NO PRIOR MEETINGS</span>';
 });
}
(function(){
 const apply=hjApplyLiveSeason,completed=hjCompletedWeeks,recap=hjRecapHTML,build=wireBuild,snapshot=hjRecordSnapshot,managerTeam=hjCurrentManagerTeam,career=hjCareerWeeklyRows;
 hjCompletedWeeks=function(data){return completed(hjResultsView(data))};
 hjRecapHTML=function(data){return recap(hjResultsView(data))};
 wireBuild=function(data){return build(hjResultsView(data))};
 hjRecordSnapshot=function(data,...args){return snapshot(hjResultsView(data),...args)};
 hjCurrentManagerTeam=function(name,data=HJ_LEAGUE_STATE.data){return managerTeam(name,hjResultsView(data))};
 hjCareerWeeklyRows=function(team,data,...args){return career(team,hjResultsView(data),...args)};
 const record=hjTeamRecord,played=hjTeamRecordIfPlayed,rank=hjCurrentStandingRank,tab=hjTeamTabHTML,identity=hjManagerBusinessCard,matrix=hjScheduleMatrixHTML;
 hjTeamRecord=function(team){return record(hjResultsTeam(team))};
 hjTeamRecordIfPlayed=function(team){return played(hjResultsTeam(team))};
 hjCurrentStandingRank=function(team,data){return rank(hjResultsTeam(team,data),data)};
 hjTeamTabHTML=function(team,data){return tab(hjResultsTeam(team,data),data)};
 hjManagerBusinessCard=function(team,data,...args){return identity(hjResultsTeam(team,data),data,...args).replace('class="league-roster-identity','data-results-team="'+team.id+'" class="league-roster-identity')};
 hjScheduleMatrixHTML=function(data){return matrix(hjResultsView(data))};
 const series=scheduleAllTimeSeries;
 scheduleAllTimeSeries=function(a,b){
  const result={...series(a,b)},data=hjResultsView(HJ_LEAGUE_STATE.data);
  if(!data||Number(data.seasonId)<=Number(HIST.metadata.completed_through))return result;
  const names=new Map(data.teams.map(t=>[String(t.id),hjMatchManager(t,data)||hjOwnerName(t,data)]));
  for(const game of data.schedule||[]){
   if(Number(game.matchupPeriodId)>Number(data.settings?.scheduleSettings?.matchupPeriodCount)||!['HOME','AWAY','TIE'].includes(game.winner))continue;
   const home=names.get(String(game.home?.teamId)),away=names.get(String(game.away?.teamId));
   if(!((home===a&&away===b)||(home===b&&away===a)))continue;
   const own=home===a?game.home:game.away,opp=home===a?game.away:game.home;
   const pf=hjNumber(own.totalPoints),pa=hjNumber(opp.totalPoints);if(pf===null||pa===null)continue;
   result.games++;result.aPF+=pf;result.bPF+=pa;
   if(game.winner==='TIE')result.ties++;else if(game.winner===(home===a?'HOME':'AWAY'))result.aWins++;else result.bWins++;
  }
  return result;
 };
 const profilePatch=hjPatchManagerLiveSeason;
 hjPatchManagerLiveSeason=function(back,name){try{return profilePatch(back,name)}finally{hjRefreshProfileResultDetails(back,name)}};
 hjApplyLiveSeason=function(data,...args){
  hjRefreshCompletedResults();
  return apply.call(this,hjResultsView(data),...args);
 };
 function redraw(){
  const data=HJ_LEAGUE_STATE.data;if(!data)return;
  // One failing renderer must not prevent the other result sections refreshing.
  for(const render of [()=>hjApplyLiveSeason(data,false),()=>hjRefreshRosterResultMetadata(),()=>hjRefreshRecap(),()=>wireRender(false),()=>{
   document.querySelectorAll('.manager-modal-back').forEach(back=>{
    const name=back.querySelector('.manager-modal-title')?.textContent?.trim();if(!name)return;
    try{hjPatchManagerLiveSeason(back,name)}finally{hjPaintCareerHigh(back,name)}
   });
  }])try{render()}catch(error){console.warn('Completed results refresh delayed',error)}
 }
 window.hjRefreshCompletedResultViews=redraw;
 setInterval(()=>{if(!document.hidden)hjRefreshCompletedResults()},15000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)hjRefreshCompletedResults()});
 hjRefreshCompletedResults();
})();
async function hjRefreshCompletedResults(){
 const state=HJ_COMPLETED_RESULTS,data=HJ_LEAGUE_STATE.data;
 if(!data?.teams?.length||!Array.isArray(data.schedule)||document.hidden||Number(data.seasonId)!==Number(NFL_SEASON))return;
 if(state.pending)return state.pending;
 if(Date.now()-state.lastAttempt<15000)return;
 state.lastAttempt=Date.now();
 const season=Number(data.seasonId),current=Number(data.scoringPeriodId),periods=data.settings?.scheduleSettings?.matchupPeriods||{};
 // Include the previous scoring week during ESPN rollover; never move any UI week.
 const weeks=new Set([current,Math.max(1,current-1)]);
 for(const g of data.schedule||[])if(!['HOME','AWAY','TIE'].includes(g.winner))for(const week of periods[g.matchupPeriodId]||[])if(Number(week)<=current)weeks.add(Number(week));
 state.pending=(async()=>{
  await Promise.all([...weeks].filter(w=>w>0).map(async week=>{
   try{const board=await hjDataSchedule(season,week);state.scoreboards.set(`${season}:${week}`,board)}catch(error){console.warn('NFL completion check unavailable',week,error)}
  }));
  if(HJ_LEAGUE_STATE.data!==data)return; // A newer league sync owns the next render.
  const view=hjResultsView(data),signature=JSON.stringify([season,view.schedule.map(g=>[g.id,g.matchupPeriodId,g.winner,g.home?.totalPoints,g.away?.totalPoints]),view.teams.map(t=>[t.id,t.record?.overall])]);
  if(signature===state.signature)return;
  state.signature=signature;
  window.hjRefreshCompletedResultViews();
 })().finally(()=>{state.pending=null});
 return state.pending;
}
