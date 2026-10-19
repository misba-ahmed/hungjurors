/* Each filter has independent ESPN cursors. Publish only the date range
   covered by every player batch, so a partial page never creates a gap. */
const HJ_NEWS_FEED={sessions:new Map(),active:null,serial:0};
function ffnFeedPlayers(){
 const manager=ffnFilterState.manager,index=manager?ffnManagerRosterIndex():null;
 return ffnRosterPlayers.filter(p=>
  (!ffnFilterState.player||ffnNorm(p.name).includes(ffnNorm(ffnFilterState.player)))&&
  (!ffnFilterState.team||p.team===ffnFilterState.team)&&
  (!ffnFilterState.position||p.position===ffnFilterState.position)&&
  (!manager||ffnItemTouchesManager({espn_id:p.id,player:p.name},manager,index))
 );
}
function ffnFeedSession(){
 const players=ffnFeedPlayers(),key=JSON.stringify([ffnFilterState,players.map(p=>String(p.id)).sort()]);
 let session=HJ_NEWS_FEED.sessions.get(key);
 if(!session){
  const shards=[];
  for(let i=0;i<players.length;i+=FFN_LATEST_BATCH_SIZE)shards.push({players:players.slice(i,i+FFN_LATEST_BATCH_SIZE),offset:0,through:Infinity,done:false});
  session={key,shards,items:new Map(),visible:[],pending:null,retryAt:0,stamp:Date.now()};
  HJ_NEWS_FEED.sessions.set(key,session);
 }
 HJ_NEWS_FEED.active=session;
 return session;
}
function ffnFeedRows(session){
 const frontier=Math.max(-Infinity,...session.shards.filter(s=>!s.done).map(s=>s.through));
 return [...session.items.values()].filter(item=>Date.parse(item.published_at)>frontier)
  .sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at)||String(a.id).localeCompare(String(b.id)));
}
async function ffnFeedPage(session,shard){
 const params=new URLSearchParams({limit:String(FFN_PLAYER_NEWS_LIMIT),offset:String(shard.offset),_:String(session.stamp||0)});
 const byId=new Map(shard.players.map(p=>[String(p.id),p]));
 for(const id of byId.keys())params.append('playerId',id);
 const data=await fetchEspnJson('https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players?'+params);
 if(!Array.isArray(data?.feed))throw Error('Invalid ESPN news page');
 const feed=data.feed,reported=Number(data.resultsOffset??shard.offset);
 if(reported!==shard.offset)throw Error('ESPN news cursor did not advance');
 const dates=feed.map(raw=>Date.parse(raw.published||raw.categorized||raw.lastModified||'')).filter(Number.isFinite);
 if(feed.length&&!dates.length)throw Error('ESPN news page has no dates');
 const next=shard.offset+feed.length;
 // Advance by rows actually received, never by a requested/server page size.
 // resultsCount can describe this page, not the remaining archive.
 // Only an empty page proves that this cursor has reached the end.
 const signature=feed.map(raw=>String(raw.id||raw.playerId)+':'+String(raw.published||raw.categorized||'')).join('|');
 if(feed.length&&signature===shard.lastPage)throw Error('ESPN returned the previous news page');
 shard.lastPage=signature;
 for(const raw of feed){
  const player=byId.get(String(raw.playerId||''));
  const item=player?ffnFeedToItem(raw,player,ffnImmediateNextGame(player.team)):null;
  if(item&&Number.isFinite(Date.parse(item.published_at)))session.items.set(String(item.id),item);
 }
 shard.offset=next;
 shard.through=Math.min(shard.through,...dates);
 shard.done=!feed.length;
}
async function ffnFeedFill(session,target){
 if(session.pending){await session.pending;if(session.visible.length>=target||session.retryAt>Date.now())return}
 if(session.retryAt>Date.now())return;
 session.pending=(async()=>{
  while(session.visible.length<target&&session.shards.some(s=>!s.done)){
   const frontier=Math.max(...session.shards.filter(s=>!s.done).map(s=>s.through));
   const shards=session.shards.filter(s=>!s.done&&s.through===frontier);
   const responses=await ffnMapLimit(shards,6,async shard=>{await ffnFeedPage(session,shard);return true});
   session.visible=ffnFeedRows(session);
   if(responses.some(ok=>!ok)){session.retryAt=Date.now()+20000;break}
  }
 })();
 try{await session.pending}finally{session.pending=null}
}
function ffnRebuildRail(){
 const rail=$('#ffn-scroll');if(!rail)return;
 rail.removeAttribute('aria-busy');ffnSyncFilteredItems();rail.innerHTML='';ffnRendered=0;ffnKnown=new Set();
 if(!ffnCurrentItems().length){
  const finished=HJ_NEWS_FEED.active?.shards.every(s=>s.done);
  rail.innerHTML=finished?'<div class="ffn-empty">No fantasy news matches these filters.</div>':'<div class="ffn-loading-state" role="status">Loading news…</div>';
 }else{ffnAppendBatch();ffnAppendBatch()}
 ffnRenderStatus();
}
function ffnCaptureRailState(rail){
 const edge=rail.getBoundingClientRect().left;
 const card=[...rail.querySelectorAll('.ffn-card')].find(item=>item.getBoundingClientRect().right>edge+4);
 return {newsId:card?.dataset.newsId||'',offset:card?card.getBoundingClientRect().left-edge:0,scrollLeft:rail.scrollLeft,rendered:ffnRendered};
}
function ffnRestoreRailState(rail,state){
 const target=Math.min(ffnCurrentItems().length,state.rendered);
 while(ffnRendered<target)ffnAppendBatch();
 const card=state.newsId?rail.querySelector('[data-news-id="'+CSS.escape(state.newsId)+'"]'):null;
 const left=card?rail.scrollLeft+card.getBoundingClientRect().left-rail.getBoundingClientRect().left-state.offset:state.scrollLeft;
 rail.scrollTo({left:Math.max(0,left),behavior:'instant'});
}
function ffnPublishFeed(session,preserve=true){
 if(HJ_NEWS_FEED.active!==session)return;
 const rail=$('#ffn-scroll'),state=preserve&&rail?ffnCaptureRailState(rail):null;
 const merged=new Map(ffnItems.map(item=>[String(item.id),item]));
 for(const item of session.visible)merged.set(String(item.id),item);
 ffnItems=[...merged.values()].sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
 ffnLiveReady=true;ffnSetFilterControlsDisabled(false);ffnRebuildRail();
 if(state)ffnRestoreRailState(rail,state);
 ffnSetStatus(session.pending?'Loading news…':'Live');
}
async function ffnLoadFilteredNews({refresh=false,returnToStart=false}={}){
 const serial=++HJ_NEWS_FEED.serial;
 const button=$('#ffn-refresh');button?.setAttribute('aria-busy','true');
 try{
  await ffnBuildRoster();
  if(serial!==HJ_NEWS_FEED.serial)return [];
  ffnUpdateFilterOptions();ffnRenderManagerFilter();
  const previous=HJ_NEWS_FEED.active,rail=$('#ffn-scroll');
  const saved=!returnToStart&&previous?.visible.length&&rail?ffnCaptureRailState(rail):null;
  let session=ffnFeedSession();
  if(refresh){HJ_NEWS_FEED.sessions.delete(session.key);session=ffnFeedSession()}
  if(returnToStart)$('#ffn-scroll')?.scrollTo({left:0,behavior:'instant'});
  if(refresh&&previous?.visible.length)HJ_NEWS_FEED.active=previous;
  else if(!session.visible.length)ffnShowLoading();
  else ffnPublishFeed(session,false);
  await ffnFeedFill(session,Math.max(2*FFN_BATCH,saved?.rendered||0));
  if(serial!==HJ_NEWS_FEED.serial)return [];
  if(refresh&&previous?.visible.length&&!session.visible.length){
   HJ_NEWS_FEED.sessions.set(previous.key,previous);return previous.visible;
  }
  HJ_NEWS_FEED.active=session;
  ffnPublishFeed(session,false);
  if(saved)ffnRestoreRailState(rail,saved);
  ffnEnsureBuffer();
  return session.visible;
 }catch(error){
  console.warn('Fantasy news feed',error);
  if(serial===HJ_NEWS_FEED.serial&&!ffnCurrentItems().length)ffnShowLoadError();
  return [];
 }finally{if(serial===HJ_NEWS_FEED.serial){button?.removeAttribute('aria-busy');ffnSetFilterControlsDisabled(false)}}
}
async function ffnRefreshLatest({returnToStart=false,initial=false}={}){
 if(ffnRefreshPromise)return ffnRefreshPromise;
 ffnLastCheckAt=Date.now();
 ffnRefreshPromise=ffnLoadFilteredNews({refresh:!initial,returnToStart});
 try{return await ffnRefreshPromise}finally{ffnRefreshPromise=null;ffnScheduleAutoRefresh()}
}
function ffnScheduleAutoRefresh(){
 clearTimeout(ffnAutoRefreshTimer);if(document.hidden)return;
 ffnAutoRefreshTimer=setTimeout(()=>{if(!document.hidden)ffnRefreshLatest()},Math.max(1000,FFN_AUTO_REFRESH_MS-(Date.now()-ffnLastCheckAt)));
}
function ffnHandleVisibilityChange(){
 if(document.hidden){clearTimeout(ffnAutoRefreshTimer);return}
 if(!ffnLastCheckAt||Date.now()-ffnLastCheckAt>=FFN_AUTO_REFRESH_MS)ffnRefreshLatest();
 else ffnScheduleAutoRefresh();
}
function ffnEnsureBuffer(){
 clearTimeout(ffnBufferTimer);
 ffnBufferTimer=setTimeout(async()=>{
  const rail=$('#ffn-scroll'),session=HJ_NEWS_FEED.active;if(!rail||!session)return;
  if(session.pending)await session.pending;
  if(HJ_NEWS_FEED.active!==session)return;
  if(session.retryAt>Date.now()){
   ffnBufferTimer=setTimeout(ffnEnsureBuffer,session.retryAt-Date.now()+100);return;
  }
  if(rail.scrollWidth-rail.clientWidth-rail.scrollLeft>rail.clientWidth*2)return;
  if(ffnRendered<session.visible.length){ffnAppendBatch();ffnEnsureBuffer();return}
  const before=session.visible.length;
  await ffnFeedFill(session,before+FFN_BATCH);
  if(HJ_NEWS_FEED.active!==session)return;
  if(session.visible.length>before){ffnPublishFeed(session);while(ffnRendered<Math.min(session.visible.length,before+FFN_BATCH))ffnAppendBatch();ffnEnsureBuffer()}
  else if(session.retryAt>Date.now())ffnBufferTimer=setTimeout(ffnEnsureBuffer,session.retryAt-Date.now()+100);
 },80);
}

/* News audit (October 19, 2026).
 * 1. Current NFL teams. The news roster starts from a built-in preseason
 *    snapshot (FFN_BOOTSTRAP_ROSTER) and was never refreshed, so traded or
 *    released players kept their old team, game line, logo and "related"
 *    teammates, and players signed later never got news. ESPN's fantasy player
 *    list (one request, cached 30 minutes) now corrects every team, marks
 *    released players FA and adds rostered or ≥1%-owned players the snapshot lacks.
 * 2. The game line follows the live week. Cards drawn before league data
 *    loaded stored week 1 and kept showing that week's game and stats.
 * 3. Weekly stats and fantasy points for every news player (also free agents),
 *    from one league-scored ESPN request per refresh. */
const HJ_NEWS_LIVE={teams:null,teamsAt:0,teamsPending:null,pool:new Map(),poolKey:'',poolAt:0,poolPending:null};
const HJ_NEWS_TEAMS_KEY='hj:news-teams:v1:'+(typeof NFL_SEASON!=='undefined'?NFL_SEASON:'');
const HJ_NEWS_POSITIONS={1:'QB',2:'RB',3:'WR',4:'TE',5:'K'};
function hjNewsWeek(){
 if(typeof HJ_LEAGUE_STATE!=='undefined'&&HJ_LEAGUE_STATE.data)return hjCurrentWeek();
 return Number((typeof NFL_WEEK1!=='undefined'?NFL_WEEK1:[]).find(g=>Number(g?.week))?.week)||1;
}
function hjNewsTeamAbbr(proTeamId){
 if(!Number(proTeamId))return 'FA';
 const abbr=String((typeof HJ_PRO_TEAM_BY_ID!=='undefined'&&HJ_PRO_TEAM_BY_ID[String(proTeamId)])||'').toUpperCase();
 return abbr==='WSH'?'WAS':abbr;
}
async function hjNewsLoadTeams(){
 if(HJ_NEWS_LIVE.teams&&Date.now()-HJ_NEWS_LIVE.teamsAt<30*60000)return HJ_NEWS_LIVE.teams;
 if(!HJ_NEWS_LIVE.teams){try{const saved=JSON.parse(localStorage.getItem(HJ_NEWS_TEAMS_KEY)||'null');if(saved?.rows?.length&&Date.now()-saved.at<30*60000){HJ_NEWS_LIVE.teams=saved.rows;HJ_NEWS_LIVE.teamsAt=saved.at;return saved.rows}}catch(_){}}
 if(HJ_NEWS_LIVE.teamsPending)return HJ_NEWS_LIVE.teamsPending;
 HJ_NEWS_LIVE.teamsPending=(async()=>{
  try{
   const list=await hjDataJson('https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/'+NFL_SEASON+'/players?view=players_wl',{headers:{'x-fantasy-filter':JSON.stringify({filterActive:{value:true}})}});
   if(!Array.isArray(list)||list.length<500)throw Error('Incomplete ESPN player list');
   const rows=list.filter(p=>HJ_NEWS_POSITIONS[p.defaultPositionId]).map(p=>[String(p.id),p.fullName||'',hjNewsTeamAbbr(p.proTeamId),HJ_NEWS_POSITIONS[p.defaultPositionId],Math.round(Number(p.ownership?.percentOwned)||0)]);
   HJ_NEWS_LIVE.teams=rows;HJ_NEWS_LIVE.teamsAt=Date.now();
   try{localStorage.setItem(HJ_NEWS_TEAMS_KEY,JSON.stringify({at:HJ_NEWS_LIVE.teamsAt,rows}))}catch(_){}
  }catch(error){console.warn('ESPN player teams unavailable; news keeps the saved teams.',error)}
  finally{HJ_NEWS_LIVE.teamsPending=null}
  return HJ_NEWS_LIVE.teams;
 })();
 return HJ_NEWS_LIVE.teamsPending;
}
// Correct teams in place and add missing relevant players. Returns true on change.
function hjNewsApplyTeams(){
 const rows=HJ_NEWS_LIVE.teams;if(!rows?.length||!Array.isArray(ffnRosterPlayers))return false;
 const live=new Map(rows.map(r=>[r[0],r])),byId=new Map(ffnRosterPlayers.map(p=>[String(p.id),p]));
 let rostered=new Set();
 try{(HJ_LEAGUE_STATE.data?.teams||[]).forEach(t=>hjRosterEntries(t).forEach(e=>rostered.add(String(hjPlayer(e)?.id||e.playerId||''))))}catch(_){}
 let changed=false;
 for(const p of ffnRosterPlayers){const r=live.get(String(p.id));if(r&&r[2]&&p.team!==r[2]){p.team=r[2];changed=true}}
 for(const r of rows){
  if(byId.has(r[0])||r[2]==='FA'||!(rostered.has(r[0])||r[4]>=1))continue;
  ffnRosterPlayers.push({id:r[0],name:r[1],team:r[2],position:r[3],photo:nflHeadshot(r[0]),norm:ffnNorm(r[1])});changed=true;
 }
 if(!changed)return false;
 ffnRosterByTeam=new Map();
 for(const p of ffnRosterPlayers){if(!ffnRosterByTeam.has(p.team))ffnRosterByTeam.set(p.team,[]);ffnRosterByTeam.get(p.team).push(p)}
 for(const team of ffnRosterByTeam.values())ffnAssignPositionRanks(team).sort(ffnDepthCompare);
 return true;
}
if(typeof ffnBuildRoster==='function'&&typeof ffnCardHTML==='function'){
 const baseBuild=ffnBuildRoster;
 ffnBuildRoster=async function(){
  const players=await baseBuild.apply(this,arguments);
  // First visit waits up to 5 s for the team list; later visits use the cache.
  await Promise.race([hjNewsLoadTeams(),new Promise(r=>setTimeout(r,5000))]);
  hjNewsApplyTeams();
  return ffnRosterPlayers||players;
 };
 hjNewsLoadTeams().then(()=>{if(hjNewsApplyTeams()&&typeof ffnRebuildRail==='function'&&ffnItems?.length){ffnUpdateFilterOptions();ffnRebuildRail()}});
 // Every card is drawn with the player's current team and teammates.
 const baseCard=ffnCardHTML;
 ffnCardHTML=function(item){
  const p=item&&ffnRosterPlayers?.find(x=>String(x.id)===String(item.espn_id));
  if(p&&p.team&&p.team!==item.team){item.team=p.team;item.related=ffnRelatedFor(item)}
  // Meta line: HOU · WR5 · score — one separator per item, rank like the rest of the site.
  const tpl=document.createElement('template');tpl.innerHTML=baseCard.apply(this,arguments);
  const meta=tpl.content.querySelector('.ffn-meta'),seps=meta?[...meta.querySelectorAll(':scope>.ffn-meta-sep')]:[];
  if(meta&&seps.length>=2){
   const pos=seps[0].nextElementSibling;seps[1].remove();
   if(pos){const player={id:item.espn_id,name:item.player,team:item.team,position:item.position};pos.classList.add('hj-news-rank');pos.dataset.hjNewsRank=JSON.stringify(player);pos.textContent=hjNewsRankLabel(player)}
  }
  return tpl.innerHTML;
 };
}
// Weekly ESPN entries (league scoring: actual + projection) for news players.
async function hjNewsLoadPool(){
 const week=hjNewsWeek(),ids=[...new Set([...document.querySelectorAll('#ffn-scroll [data-hj-game-player]')].map(el=>{try{return String(JSON.parse(el.dataset.hjGamePlayer).id||'')}catch(_){return ''}}).filter(Boolean))].slice(0,150);
 if(!ids.length||HJ_NEWS_LIVE.poolPending)return;
 const key=week+':'+ids.slice().sort().join(','),live=[...document.querySelectorAll('#ffn-scroll .hj-game-status')].some(el=>/\bQ\d|\bHT\b|\bOT\b|LIVE/.test(el.textContent));
 if(key===HJ_NEWS_LIVE.poolKey&&Date.now()-HJ_NEWS_LIVE.poolAt<(live?60000:600000))return;
 HJ_NEWS_LIVE.poolPending=(async()=>{
  try{
   const url='https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/'+NFL_SEASON+'/segments/0/leagues/'+ESPN_FANTASY_LEAGUE_ID+'?scoringPeriodId='+week+'&view=kona_player_info';
   const data=await hjDataJson(url,{headers:{'x-fantasy-filter':JSON.stringify({players:{filterIds:{value:ids.map(Number)},filterStatsForSourceIds:{value:[0,1]},filterStatsForSplitTypeIds:{value:[1]},filterStatsForScoringPeriodIds:{value:[week]}}})}});
   if(!Array.isArray(data?.players))throw Error('ESPN player stats unavailable');
   data.players.forEach(entry=>{const id=String(entry?.player?.id||entry?.id||'');if(id)HJ_NEWS_LIVE.pool.set(id,entry)});
   HJ_NEWS_LIVE.poolKey=key;HJ_NEWS_LIVE.poolAt=Date.now();
   hjRefreshGameContexts();
  }catch(error){console.warn('News player stats unavailable',error);HJ_NEWS_LIVE.poolAt=Date.now()-540000}
  finally{HJ_NEWS_LIVE.poolPending=null}
 })();
}
globalThis.hjNewsPoolEntry=id=>HJ_NEWS_LIVE.pool.get(String(id))||null;
// Team · position rank · fantasy score (coloured against the ESPN projection)
// or, before kickoff, the ESPN projection in plain italics ("3.58 proj.").
function hjNewsPointsHTML(player,week){
 let entry=null;try{entry=hjContextEntry(player,week)}catch(_){}
 const actual=entry?hjNumber(hjWeeklyStat(entry,week,0)?.appliedTotal):null,proj=entry?hjNumber(hjWeeklyStat(entry,week,1)?.appliedTotal):null;
 let started=false;try{const g=hjUpcomingForWeek(player.team,Number(week))?.game;started=!!g&&(g.state==='in'||g.state==='post'||!!g.completed)}catch(_){}
 // A player who sat shows no points; the game line says "Did not play".
 const record=entry?hjWeeklyStat(entry,week,0):null;
 if(started&&record&&!Object.values(record.stats||{}).some(v=>Number(v)))return '';
 // One number: the fantasy score once the game starts, otherwise the projection.
 const sep='<span class="ffn-meta-sep">·</span>';
 if(started&&actual!==null)return sep+'<b class="hj-news-pts-value" '+hjPerformanceAttrs(actual,proj??NaN)+'>'+pcFpts(actual)+' PTS</b>';
 if(proj!==null&&proj>0)return sep+'<i>'+pcFpts(proj)+' proj.</i>';
 return '';
}
if(typeof hjNewsGameHTML==='function')hjNewsGameHTML=function(item){
 const player={id:item.espn_id,name:item.player,team:item.team,position:item.position},week=hjNewsWeek();
 let context;
 try{context=hjGameContextHTML({...player,live:true},week).replace('data-hj-game-player="'+esc(JSON.stringify({id:player.id,name:player.name,team:player.team,position:player.position,week}))+'"','data-hj-game-player="'+esc(JSON.stringify({id:player.id,name:player.name,team:player.team,position:player.position,week,live:true}))+'"')}
 catch(_){context='<span class="hj-game-context" data-hj-game-player="'+esc(JSON.stringify({...player,week,live:true}))+'"><span class="hj-game-status">'+esc(item.next_game||'Next game TBD')+'</span></span>'}
 let pts='';try{pts=hjNewsPointsHTML(player,week)}catch(_){}
 return '<span class="hj-news-pts" data-hj-news-pts="'+esc(JSON.stringify(player))+'">'+pts+'</span>'+context;
};
function hjNewsRankLabel(player){
 const position=String(player.position||'').replace('D/ST','DST');
 let rank=null;try{rank=hjFantasyRankForPlayer(player)}catch(_){}
 return position+(Number(rank)>0?rank:'');
}
function hjRefreshNewsPoints(){
 const week=hjNewsWeek();
 document.querySelectorAll('#ffn-scroll [data-hj-news-rank]').forEach(el=>{try{const label=hjNewsRankLabel(JSON.parse(el.dataset.hjNewsRank));if(el.textContent!==label)el.textContent=label}catch(_){}});
 if(typeof HJ_FANTASY_RANKS!=='undefined'&&!HJ_FANTASY_RANKS.ready&&typeof hjEnsureFantasyRanks==='function')hjEnsureFantasyRanks().then(()=>hjRefreshGameContexts()).catch(()=>{});
 document.querySelectorAll('#ffn-scroll [data-hj-news-pts]').forEach(el=>{
  try{const html=hjNewsPointsHTML(JSON.parse(el.dataset.hjNewsPts),week);if(el.innerHTML!==html)el.innerHTML=html}catch(_){}
 });
 hjNewsLoadPool();
}
globalThis.hjRefreshNewsPoints=hjRefreshNewsPoints;
