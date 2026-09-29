/* Each source updates only the position tables it owns. Keep a complete same-season
   table while a refresh is missing opponents; never mix ranks from two snapshots. */
function hjUpdateOpponentRankMaps(season,updates){
 season=Number(season);
 if(season!==Number(NFL_SEASON))return;
 let changed=false;
 for(const [position,table] of HJ_GAME_RANKS.maps){
  if([...table.values()].some(row=>Number(row.season)!==season)){
   HJ_GAME_RANKS.maps.delete(position);changed=true;
  }
 }
 for(const [position,next] of updates){
  const previous=HJ_GAME_RANKS.maps.get(position);
  const valid=[...next.values()].every(row=>Number(row.season)===season&&Number.isInteger(row.rank)&&row.rank>=1&&row.rank<=32);
  if(!valid||!next.size||previous&&[...previous.keys()].some(team=>!next.has(team)))continue;
  if(!previous||previous.size!==next.size||[...next].some(([team,row])=>previous.get(team)?.rank!==row.rank))changed=true;
  HJ_GAME_RANKS.maps.set(position,next);
 }
 if(changed)document.dispatchEvent(new Event('hj:game-ranks-updated'));
}
