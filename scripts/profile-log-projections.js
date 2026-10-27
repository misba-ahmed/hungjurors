/* One player request supplies every future game-log projection. */
const PC_LOG_PROJECTIONS=new Map();
function pcLogProjection(row){
 if((row.pc_status||row.status)!=='UPCOMING'||Number(row.season)!==Number(NFL_SEASON))return null;
 const id=String(row.player_id||row.pc_player_id||'');
 return PC_LOG_PROJECTIONS.get(`${row.season}:${id}`)?.weeks.get(Number(row.week))??null;
}
async function pcLoadLogProjections(player,season){
 if(Number(season)!==Number(NFL_SEASON)||!player.id)return;
 const key=`${season}:${player.id}`;let state=PC_LOG_PROJECTIONS.get(key);
 if(state?.pending)return state.pending;
 if(state&&Date.now()-state.at<300000)return;
 if(!state){state={weeks:new Map(),at:0};PC_LOG_PROJECTIONS.set(key,state)}
 try{
  const feed=await hjDataRequest('profile-projected-ranks:'+season,()=>hjDataJson('/data/projected-position-ranks.json'),300000);
  const saved=feed?.players?.[String(player.id)];
  if(feed?.schema===1&&Number(feed.season)===Number(season)&&saved){
   state.ranks=new Map();for(const [week,pair] of Object.entries(saved.weeks)){state.weeks.set(Number(week),pair[0]);state.ranks.set(Number(week),pair[1])}state.at=Date.now();return;
  }
 }catch(_){/* Individual projections remain available if the rank feed is delayed. */}
 const weeks=Array.from({length:18},(_,i)=>i+1);
 const filter={players:{filterIds:{value:[Number(player.id)]},filterStatsForSourceIds:{value:[1]},filterStatsForSplitTypeIds:{value:[1]},filterStatsForScoringPeriodIds:{value:weeks},sortPercOwned:{sortAsc:false,sortPriority:1},limit:1}};
 state.pending=hjDataJson(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${ESPN_FANTASY_LEAGUE_ID}?scoringPeriodId=${hjCurrentWeek()}&view=kona_player_info`,{headers:{'x-fantasy-filter':JSON.stringify(filter)}}).then(payload=>{
  const entry=(payload.players||[]).find(e=>String(hjPlayer(e).id)===String(player.id));if(!entry)throw Error('Player projection missing');
  for(const s of hjPlayer(entry).stats||[]){const w=Number(s.scoringPeriodId);if(Number(s.seasonId)===Number(season)&&Number(s.statSourceId)===1&&Number(s.statSplitTypeId)===1&&w>=1&&w<=18&&hjNumber(s.appliedTotal)!==null)state.weeks.set(w,Number(s.appliedTotal))}
  state.at=Date.now();
 }).finally(()=>{state.pending=null});return state.pending;
}
function pcLogProjectionText(row){const value=pcLogProjection(row);return value===null?'—':pcFpts(value)}

function pcLogRankText(row){
 if(pcLogProjection(row)===null)return '—';
 const id=String(row.player_id||row.pc_player_id||''),rank=PC_LOG_PROJECTIONS.get(`${row.season}:${id}`)?.ranks?.get(Number(row.week));return rank?'#'+rank:'—';
}
