/* Faster live scores (Oct 29, 2026). See docs/live-scores.md.
 *
 * During games the league sync asked ESPN for the whole league (teams, rosters, settings, standings, draft,
 * every week's matchups) every 15 s after the previous sync finished: 5.8 MB of JSON (0.94 MB gzipped) to
 * parse and redraw each time, so a play could take 30 s to reach Matchups.
 *
 * While an NFL game is in progress and the page is visible, this asks every 5 s for just this week's
 * matchups with live scoring (69 KB gzipped, ~0.3 s), puts them into the league data in place of the
 * same matchups, and redraws only when a score, a player's points or a projection changed. The full
 * sync still runs, every 60 s during games (prepare-site.mjs), for everything else.
 */
(function(){
 if(typeof HJ_LEAGUE_STATE==='undefined'||typeof ESPN_FANTASY_LEAGUE_ID==='undefined')return;
 const FAST_MS=5000,HOSTS=['https://lm-api-reads.fantasy.espn.com','https://fantasy.espn.com'];
 let busy=false,last='',lastData=null;
 const gamesLive=()=>Array.isArray(NFL_WEEK1)&&NFL_WEEK1.some(game=>game?.state==='in');
 // Everything a matchup shows that can change during a game, per matchup and player.
 function signature(games){
  return JSON.stringify(games.map(g=>[g.id,...['home','away'].flatMap(side=>{const s=g[side]||{};return [s.teamId,s.totalPointsLive,s.totalPoints,s.totalProjectedPointsLive,s.winProbability,
   (s.rosterForCurrentScoringPeriod?.entries||[]).map(e=>[e.playerId,e.lineupSlotId,e.playerPoolEntry?.appliedStatTotal,(e.playerPoolEntry?.player?.stats||[]).map(x=>[x.statSourceId,x.appliedTotal]).join('/')].join(':')).join(',')]})]));
 }
 async function fetchWeek(week){
  const path=`/apis/v3/games/ffl/seasons/${HJ_LEAGUE_SEASON}/segments/0/leagues/${ESPN_FANTASY_LEAGUE_ID}?scoringPeriodId=${week}&view=mMatchupScore&view=mLiveScoring&view=mBoxscore`;
  const filter=JSON.stringify({schedule:{filterMatchupPeriodIds:{value:[week]}}});
  for(const host of HOSTS){
   try{
    const response=await fetch(host+path,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{'x-fantasy-filter':filter}});
    if(!response.ok)continue;
    return {payload:await response.json(),serverTime:response.headers.get('X-Fantasy-Server-Time')||''};
   }catch(_){}
  }
  return null;
 }
 async function tick(){
  if(busy||document.hidden||!HJ_LEAGUE_STATE.data||HJ_LEAGUE_STATE.syncing||!gamesLive())return;
  busy=true;
  try{
   const data=HJ_LEAGUE_STATE.data,week=typeof hjCurrentWeek==='function'?hjCurrentWeek(data):Number(data?.scoringPeriodId);
   if(!week)return;
   const result=await fetchWeek(week);
   // A full sync may have replaced the league data while this request was out; its data wins.
   if(!result||HJ_LEAGUE_STATE.data!==data||HJ_LEAGUE_STATE.syncing)return;
   const games=(result.payload?.schedule||[]).filter(g=>Number(g?.matchupPeriodId)===Number(week)&&g.home&&g.away);
   if(!games.length||String(result.payload?.id)!==String(ESPN_FANTASY_LEAGUE_ID))return;
   const sig=signature(games);
   if(sig===last&&lastData===data)return;
   const current=new Map((data.schedule||[]).filter(g=>Number(g?.matchupPeriodId)===Number(week)).map(g=>[String(g.id),g]));
   if(lastData!==data){lastData=data;last=signature([...current.values()])}
   if(sig===last)return;
   last=sig;
   const byId=new Map(games.map(g=>[String(g.id),g]));
   data.schedule=(data.schedule||[]).map(g=>byId.get(String(g.id))||g);
   if(result.serverTime){HJ_LEAGUE_STATE.serverTime=result.serverTime;HJ_LEAGUE_STATE.syncedAt=Date.now()}
   if(typeof hjRenderLeague==='function')hjRenderLeague();
   if(typeof hjSetSyncState==='function'&&typeof hjSyncTime==='function')hjSetSyncState('ready','ESPN connected',hjSyncTime(HJ_LEAGUE_STATE.serverTime));
   document.dispatchEvent(new CustomEvent('hj:live-scores',{detail:{week,at:Date.now()}}));
  }catch(error){console.warn('Live scores unavailable',error)}
  finally{busy=false}
 }
 setInterval(tick,FAST_MS);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
 window.hjLiveScoresTick=tick;
})();
