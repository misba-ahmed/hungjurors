/* Defense season ranks have their own readiness; skill-player data cannot complete them. */
function hjPublishDefenseFantasyRanks(entries,season){
 season=Number(season);
 if(season!==Number(HJ_LEAGUE_SEASON))return false;
 const defenses=(entries||[]).filter(entry=>Number(hjPlayer(entry).defaultPositionId)===16);
 const teams=new Set(defenses.map(entry=>pcTeam(pcDstTeam(entry))).filter(Boolean));
 // Never replace a full leaderboard with a truncated/failed player-pool response.
 if(teams.size!==32||defenses.length!==32)return false;
 let games=0;
 const totals=defenses.map(entry=>{
  const stats=pcDstStats(entry),team=pcTeam(pcDstTeam(entry));
  if(stats.some(stat=>hjNumber(stat.appliedTotal)===null))return null;
  games+=stats.length;
  return {team,points:stats.reduce((sum,stat)=>sum+Number(stat.appliedTotal),0)};
 });
 if(!games||totals.some(item=>!item))return false;
 const byTeam=new Map(totals.map(item=>[item.team,1+totals.filter(other=>other.points>item.points+1e-9).length]));
 const changed=HJ_FANTASY_RANKS.dstSeason!==season||byTeam.size!==HJ_FANTASY_RANKS.byTeam.size||[...byTeam].some(([team,rank])=>HJ_FANTASY_RANKS.byTeam.get(team)!==rank);
 HJ_FANTASY_RANKS.byTeam=byTeam;HJ_FANTASY_RANKS.dstSeason=season;
 HJ_FANTASY_RANKS.dstWeek=hjCurrentWeek();HJ_FANTASY_RANKS.dstLoadedAt=Date.now();
 if(changed){
  HJ_PLAYER_DIRECTORY.rows.forEach(player=>{if(player.position==='D/ST')player.fantasyPositionRank=byTeam.get(pcTeam(player.team))||null});
  hjRefreshDefenseRankLabels();
 }
 return true;
}
function hjRefreshDefenseRankLabels(){
 if(HJ_FANTASY_RANKS.dstSeason!==Number(HJ_LEAGUE_SEASON))return;
 document.querySelectorAll('[data-pc-position="D/ST"]').forEach(player=>{
  const rank=HJ_FANTASY_RANKS.byTeam.get(pcTeam(player.dataset.pcTeam));
  if(!rank)return;
  player.querySelectorAll('.hj-v3-rank,.hq-player-rank').forEach(label=>{
   const text='DST'+rank;if(label.textContent!==text)label.textContent=text;
  });
 });
}
hjEnsureFantasyRanks=async function(){
 const season=Number(HJ_LEAGUE_SEASON),week=hjCurrentWeek();
 if(HJ_FANTASY_RANKS.promise&&HJ_FANTASY_RANKS.season===season)return HJ_FANTASY_RANKS.promise;
 const defenseReady=HJ_FANTASY_RANKS.dstSeason===season&&HJ_FANTASY_RANKS.dstWeek===week&&HJ_FANTASY_RANKS.byTeam.size===32&&Date.now()-(HJ_FANTASY_RANKS.dstLoadedAt||0)<60000;
 if(HJ_FANTASY_RANKS.ready&&HJ_FANTASY_RANKS.season===season&&defenseReady)return HJ_FANTASY_RANKS;
 if(HJ_FANTASY_RANKS.season!==season){HJ_FANTASY_RANKS.byTeam=new Map();HJ_FANTASY_RANKS.ready=false}
 HJ_FANTASY_RANKS.season=season;
 HJ_FANTASY_RANKS.promise=(async()=>{
  const [skill,defense]=await Promise.allSettled([pcLoadSeason(season),pcLoadDstSeason(season)]);
  if(season!==Number(HJ_LEAGUE_SEASON))return HJ_FANTASY_RANKS;
  if(skill.status==='fulfilled'&&skill.value.length){
   const maps=hjBuildFantasyRankMaps(skill.value);
   HJ_FANTASY_RANKS.byId=maps.byId;HJ_FANTASY_RANKS.byName=maps.byName;HJ_FANTASY_RANKS.ready=true;
  }
  if(defense.status==='fulfilled')hjPublishDefenseFantasyRanks(defense.value,season);
  return HJ_FANTASY_RANKS;
 })().finally(()=>{HJ_FANTASY_RANKS.promise=null});
 return HJ_FANTASY_RANKS.promise;
};
