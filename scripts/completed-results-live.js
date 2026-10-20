/* Results consumers share an overlay; live display/navigation keep the raw data. */
const HJ_COMPLETED_RESULTS={scoreboards:new Map(),pending:null,lastAttempt:0,signature:''};
function hjResultsView(data){return hjCompletedResultData(data,HJ_COMPLETED_RESULTS.scoreboards)}
(function(){
 const apply=hjApplyLiveSeason,completed=hjCompletedWeeks,recap=hjRecapHTML,build=wireBuild,snapshot=hjRecordSnapshot,managerTeam=hjCurrentManagerTeam,career=hjCareerWeeklyRows;
 hjCompletedWeeks=function(data){return completed(hjResultsView(data))};
 hjRecapHTML=function(data){return recap(hjResultsView(data))};
 wireBuild=function(data){return build(hjResultsView(data))};
 hjRecordSnapshot=function(data,...args){return snapshot(hjResultsView(data),...args)};
 hjCurrentManagerTeam=function(name,data=HJ_LEAGUE_STATE.data){return managerTeam(name,hjResultsView(data))};
 hjCareerWeeklyRows=function(team,data,...args){return career(team,hjResultsView(data),...args)};
 hjApplyLiveSeason=function(data,...args){
  hjRefreshCompletedResults();
  return apply.call(this,hjResultsView(data),...args);
 };
 function redraw(){
  const data=HJ_LEAGUE_STATE.data;if(!data)return;
  // One failing renderer must not prevent the other result sections refreshing.
  for(const render of [()=>hjApplyLiveSeason(data,false),()=>hjRefreshRecap(),()=>wireRender(false),()=>{
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
