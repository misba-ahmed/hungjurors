/* Refresh the existing record renderer without changing its presentation. */
(function(){
 const snapshots=new Map();let loading=false;
 function update(data,year){
  const snapshot=hjRecordSnapshot(data,year,(team,payload)=>hjMatchManager(team,payload)||hjOwnerName(team,payload));
  snapshots.set(year,snapshot);
  document.dispatchEvent(new CustomEvent('hj:records',{detail:hjBuildRecordHistory(HIST,[...snapshots.values()])}));
 }
 const apply=hjApplyLiveSeason;
 hjApplyLiveSeason=function(data){
  const result=apply.apply(this,arguments);
  if(Number(data?.seasonId)>Number(HIST.metadata.completed_through))try{update(data,Number(data.seasonId))}catch(error){console.warn('Record update unavailable',error)}
  return result;
 };
 async function refresh(){
  if(loading||document.hidden)return;loading=true;
  try{
   const now=new Date(),latest=Math.max(Number(HJ_LEAGUE_SEASON),now.getFullYear()-(now.getMonth()<6?1:0));
   for(let year=Number(HIST.metadata.completed_through)+1;year<=latest;year++){
    try{const response=await fetch(hjLeagueUrl(year),{mode:'cors',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('ESPN '+response.status);const data=await response.json();if(String(data.id)!==String(ESPN_FANTASY_LEAGUE_ID))throw Error('Wrong record league');update(data,year)}catch(error){console.warn('Record season unavailable',year,error)}
   }
  }finally{loading=false}
 }
 if(HJ_LEAGUE_STATE.data)try{update(HJ_LEAGUE_STATE.data,Number(HJ_LEAGUE_STATE.data.seasonId))}catch(error){console.warn('Record snapshot unavailable',error)}
 refresh();
 setInterval(refresh,300000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();
