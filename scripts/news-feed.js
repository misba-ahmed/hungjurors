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
 const total=data.resultsCount==null?null:Number(data.resultsCount);
 for(const raw of feed){
  const player=byId.get(String(raw.playerId||''));
  const item=player?ffnFeedToItem(raw,player,ffnImmediateNextGame(player.team)):null;
  if(item&&Number.isFinite(Date.parse(item.published_at)))session.items.set(String(item.id),item);
 }
 shard.offset=next;
 shard.through=Math.min(shard.through,...dates);
 shard.done=!feed.length||(Number.isFinite(total)&&next>=total);
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
  const rail=$('#ffn-scroll'),session=HJ_NEWS_FEED.active;if(!rail||!session||session.pending||session.retryAt>Date.now())return;
  if(rail.scrollWidth-rail.clientWidth-rail.scrollLeft>rail.clientWidth*2)return;
  if(ffnRendered<session.visible.length){ffnAppendBatch();return}
  const before=session.visible.length;
  await ffnFeedFill(session,before+FFN_BATCH);
  if(HJ_NEWS_FEED.active!==session)return;
  if(session.visible.length>before){ffnPublishFeed(session);while(ffnRendered<Math.min(session.visible.length,before+FFN_BATCH))ffnAppendBatch()}
 },80);
}
