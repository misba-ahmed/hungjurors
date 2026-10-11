/* The showcase uses current roster slots and actual live and final weekly scores. */
const HJ_TEAM_PHOTO_UI={team:'',player:'',mode:'',shift:0,headroom:0,figureHeight:0,figureWidth:0,scale:1};
function hjTeamPhotoOrder(entries){
 const eligible=entries||[];
 const bench=eligible.filter(e=>Number(e.lineupSlotId)===20).sort(hjBenchCompare);
 const reserve=eligible.filter(e=>Number(e.lineupSlotId)===21).sort(hjBenchCompare);
 const active=eligible.filter(e=>![20,21].includes(Number(e.lineupSlotId))).sort(hjLineupCompare);
 const take=slot=>{const i=active.findIndex(e=>Number(e.lineupSlotId)===slot);return i<0?null:active.splice(i,1)[0];};
 const center=[take(17),take(6),take(4),take(2),take(0)||take(1),take(2),take(4),take(23)||take(3)||take(5),take(16)].filter(Boolean);
 center.push(...active);
 const cut=Math.ceil(bench.length/2);
 return [...bench.slice(0,cut),...center,...bench.slice(cut),...reserve];
}

const HJ_TEAM_PHOTO_SCORES={key:'',week:0,checked:0,pending:null,players:new Map(),games:new Map()};
function hjTeamPhotoCentralDay(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date);
 const get=k=>Number(parts.find(p=>p.type===k).value);
 return Date.UTC(get('year'),get('month')-1,get('day'));
}
function hjTeamPhotoScoreWeek(current,events,now=new Date()){
 const dates=(events||[]).map(e=>new Date(e.date)).filter(d=>Number.isFinite(+d));
 if(!dates.length)return current;
 const first=new Date(Math.min(...dates.map(Number))),day=hjTeamPhotoCentralDay(first);
 const thursday=day-((new Date(day).getUTCDay()+3)%7)*86400000;
 return Math.max(1,current-(hjTeamPhotoCentralDay(now)<thursday?1:0));
}
function hjTeamPhotoLoadScores(data=HJ_LEAGUE_STATE.data){
 const state=HJ_TEAM_PHOTO_SCORES,current=hjCurrentWeek(data),season=Number(NFL_SEASON),key=season+':'+current+':'+hjTeamPhotoCentralDay();
 if(state.pending)return state.pending;
 if(state.key===key&&Date.now()-state.checked<60000)return;
 state.pending=(async()=>{
  const schedule=await hjDataSchedule(season,current);
  const week=hjTeamPhotoScoreWeek(current,schedule.events);
  const [pool,games]=await Promise.all([hjDataPool(season,week),week===current?schedule:hjDataSchedule(season,week)]);
  const byTeam=new Map();
  for(const event of games.events||[]){
   const comp=event.competitions?.[0],types=[event.status?.type,comp?.status?.type];
   const started=types.some(type=>type?.completed||type?.state==='in'||type?.state==='post');
   for(const side of comp?.competitors||[])byTeam.set(pcTeam(side.team?.abbreviation),started);
  }
  Object.assign(state,{key,week,checked:Date.now(),players:new Map(pool.map(e=>[String(hjPlayer(e).id),e])),games:byTeam});
 })().catch(()=>{state.key=key;state.checked=Date.now()-45000;}).finally(()=>{
  state.pending=null;
  document.dispatchEvent(new Event('hj:team-photo-scores'));
 });
 return state.pending;
}
function hjTeamPhotoFinalScore(entry,data=HJ_LEAGUE_STATE.data){
 try{
  const state=HJ_TEAM_PHOTO_SCORES,current=hjCurrentWeek(data);
  const valid=state.key===Number(NFL_SEASON)+':'+current+':'+hjTeamPhotoCentralDay();
  const week=valid?state.week:current,id=String(hjPlayer(entry).id||entry.playerId);
  const source=valid?state.players.get(id)||entry:entry;
  const game=hjUpcomingForWeek(hjPlayerTeam(source),week)?.game;
  const started=valid?state.games.get(pcTeam(hjPlayerTeam(source))):game&&(['in','post'].includes(game.state)||game.completed===true);
  if(!started)return null;
  const stat=hjWeeklyStat(source,week),score=stat?hjNumber(stat.appliedTotal):hjPlayerActualScore(entry,week,data);
  return Number.isFinite(score)?Number(score).toFixed(2):null;
 }catch(_){return null}
}
function hjTeamPhotoName(player){
 if(Number(player.defaultPositionId)===16){
  const mascot=HJ_DST_MASCOTS[String(player.proTeamId)]||HJ_DST_MASCOTS[String(-Number(player.id)-16000)];
  if(mascot)return {full:mascot.city+' '+mascot.team+' DST',first:mascot.city,last:mascot.team+' DST'};
 }
 const full=String(player.fullName||player.displayName||player.name||'Player').trim();
 const parts=full.split(/\s+/);
 return {full,first:player.firstName||parts.shift(),last:player.lastName||parts.join(' ')};
}

// Alternate poses are roster-only and resolve from the latest ESPN player status.
// Missing status does not falsely signal a recovery; the regular asset is kept intact.
function hjTeamPhotoAsset(entry){
 const p=hjPlayer(entry),isBye=typeof hjTeamOnBye==='function'&&hjTeamOnBye(hjPlayerTeam(entry));
 if(Number(p.defaultPositionId)===16||Number(entry.lineupSlotId)===16){const mascot=HJ_DST_MASCOTS[String(p.proTeamId)]||HJ_DST_MASCOTS[String(-Number(p.id||entry.playerId)-16000)];return mascot?{...mascot,isBye}:mascot;}
 const base=HJ_TEAM_PHOTO_ASSETS[String(p.id||entry.playerId||'')];
 // Free agents use their regular/free-agent outfit, muted without injury equipment.
 const isFreeAgent=p.proTeamId!=null&&Number(p.proTeamId)===0;
 if(isFreeAgent)return base?{...base,isBye:false,isFreeAgent:true}:base;
 if(!base)return base;
 const status=String(p.injuryStatus||'').trim().toUpperCase().replace(/[ -]+/g,'_');
 const rosterStatus=String(typeof p.status==='object'?p.status?.type||p.status?.name||'':p.status||'').toUpperCase().replace(/[ -]+/g,'_');
 const blocked=new Set(['OUT','DOUBTFUL','QUESTIONABLE','INJURY_RESERVE','INJURED_RESERVE','IR','SUSPENSION','SUSPENDED','EXEMPT','COMMISSIONER_EXEMPT','NON_FOOTBALL_INJURY','PHYSICALLY_UNABLE_TO_PERFORM','PUP','INACTIVE']);
 // Only an explicit current-week ESPN projection of zero triggers this rule.
 // Missing projections and actual game scores are not zero projections.
 const week=typeof hjCurrentWeek==='function'&&typeof HJ_LEAGUE_STATE!=='undefined'?hjCurrentWeek(HJ_LEAGUE_STATE.data):null;
 const projection=Number.isFinite(week)?(p.stats||[]).find(s=>s.statSourceId===1&&s.scoringPeriodId===week&&typeof s.appliedTotal==='number'&&Number.isFinite(s.appliedTotal)&&(typeof NFL_SEASON==='undefined'||s.seasonId===Number(NFL_SEASON))):null;
 // A restored current-week projection is authoritative even while an injury label lags.
 if(projection?.appliedTotal>0)return {...base,isBye};
 const zeroProjection=!isBye&&projection?.appliedTotal===0;
 const unavailable=zeroProjection||p.injured===true||p.active===false||blocked.has(status)||blocked.has(rosterStatus);
 const healthy=['ACTIVE','HEALTHY','NORMAL'].includes(status)||(!status&&p.injured===false&&p.active===true);
 // Missing alternate artwork must not suppress the unavailable tint.
 // Only players with an alternate keep the legacy unknown-status pose fallback.
 const showUnavailable=unavailable||(!healthy&&!!base.unavailable);
 return showUnavailable?{...base,...(base.unavailable||{}),isUnavailable:true,isBye}:{...base,isBye};
}

function hjTeamPhotoHTML(team){
 hjTeamPhotoLoadScores();
 const entries=hjTeamPhotoOrder(hjRosterEntries(team)),teamId=String(team.id);
 if(!entries.length)return '';
 const rows=entries.map(e=>{
  const p=hjPlayer(e),id=String(p.id||e.playerId||''),asset=hjTeamPhotoAsset(e);
  const height=asset?.displayHeight||asset?.heightInches||73,ratio=asset?.ratio||.44;
  return {id,p,asset,height,width:height*ratio,starter:![20,21].includes(Number(e.lineupSlotId)),position:hjPlayerPosition(e),name:hjTeamPhotoName(p),score:hjTeamPhotoFinalScore(e)};
 });
 const selected=HJ_TEAM_PHOTO_UI.team===teamId?rows.find(r=>r.id===HJ_TEAM_PHOTO_UI.player):null;
 let cursor=0;
 const positions=rows.map(r=>{const left=cursor;cursor+=r.width*.86;return left;});
 const width=cursor+rows.at(-1).width*.14+4,height=Math.max(...rows.map(r=>r.height))+5;
 return '<div class="hj-team-photo'+(selected?' has-spotlight':'')+'" data-team-photo-team="'+esc(teamId)+'" style="--showcase-headroom:'+(selected?HJ_TEAM_PHOTO_UI.headroom:0)+'px" role="group" aria-label="Interactive team photo"><div class="hj-team-photo-stage" style="aspect-ratio:'+width.toFixed(2)+' / '+height+'">'+rows.map((r,i)=>{
  const active=selected?.id===r.id,left=(positions[i]+2)/width*100,bodyHeight=r.height/height*100,bodyWidth=r.width/width*100;
  const src=r.asset?'/assets/team-photos/'+(r.asset.mascot?'mascots/':'players/')+r.asset.file:hjPlayerPhoto(entries[i]);
  const label=r.name.full+', '+r.position+(r.score===null?'':', fantasy score '+r.score);
  return '<div role="group" class="hj-team-photo-player'+(r.starter?' is-starter':'')+(r.asset?.isUnavailable||r.asset?.isBye||r.asset?.isFreeAgent?' is-unavailable':'')+(r.asset?.isBye?' is-bye':'')+(!r.asset?' is-portrait':'')+(active?' is-active':'')+'" data-team-photo-player="'+esc(r.id)+'" aria-label="'+esc(label)+'" tabindex="'+(selected?active?0:-1:i===0?0:-1)+'" style="left:'+left.toFixed(4)+'%;width:'+bodyWidth.toFixed(4)+'%;height:'+bodyHeight.toFixed(4)+'%;--player-layer:'+(100-Math.round(Math.abs(i-(rows.length-1)/2)))+';--showcase-shift:'+(active?HJ_TEAM_PHOTO_UI.shift:0)+'px;--showcase-height:'+HJ_TEAM_PHOTO_UI.figureHeight+'px;--showcase-width:'+HJ_TEAM_PHOTO_UI.figureWidth+'px;--showcase-scale:'+HJ_TEAM_PHOTO_UI.scale+'"><span class="hj-team-photo-figure"><img src="'+esc(src)+'" alt="" width="'+(r.asset?.width||350)+'" height="'+(r.asset?.height||800)+'" decoding="async" draggable="false"></span><span class="hj-team-photo-score" aria-hidden="true"'+(r.score===null?' hidden':'')+'>'+esc(r.score??'')+'</span><span class="hj-team-photo-caption"><span class="hj-team-photo-position">'+esc(r.position)+'</span><button type="button" class="hj-team-photo-name" data-pc-id="'+esc(r.id)+'" data-pc-name="'+esc(r.name.full)+'" data-pc-team="'+esc(hjPlayerTeam(entries[i]))+'" data-pc-position="'+esc(r.position)+'" data-pc-photo="'+esc(hjPlayerPhoto(entries[i]))+'" aria-label="Open '+esc(r.name.full)+' player card" tabindex="'+(active?0:-1)+'"><span>'+esc(r.name.first)+'</span>'+(r.name.last?'<span>'+esc(r.name.last)+'</span>':'')+'</button></span></div>';
 }).join('')+'</div></div>';
}
(function(){
 const selector='.hj-team-photo-player',groupSelector='.hj-team-photo';
 let gesture=null,ignoreClickUntil=0,lastTouchAt=0,layoutFrame=0,showFrame=0,pendingShow=null;
 function queueShow(button,mode){
  pendingShow={button,mode};
  if(!showFrame)showFrame=requestAnimationFrame(()=>{showFrame=0;const next=pendingShow;pendingShow=null;if(next)show(next.button,next.mode);});
 }
 function cancelShow(){cancelAnimationFrame(showFrame);showFrame=0;pendingShow=null;}
 document.addEventListener('hj:save-team-photo',()=>{cancelShow();gesture=null;ignoreClickUntil=Date.now()+1000;});
 const groupOf=target=>target instanceof Element?target.closest(groupSelector):null;
 const players=group=>Array.from(group.querySelectorAll(selector));
 function clear(){
  cancelShow();
  document.querySelectorAll(groupSelector+'.has-spotlight').forEach(group=>{
   group.classList.remove('has-spotlight');
   group.querySelectorAll(selector+'.is-active').forEach(button=>{
    button.classList.remove('is-active');button.querySelector('.hj-team-photo-name').tabIndex=-1;
    button.tabIndex=-1;button.style.setProperty('--showcase-shift','0px');
   });
   const first=group.querySelector(selector);if(first)first.tabIndex=0;
  });
  Object.assign(HJ_TEAM_PHOTO_UI,{team:'',player:'',mode:'',shift:0});
 }
 function fit(button){
  const group=groupOf(button),stage=group.querySelector('.hj-team-photo-stage'),r=button.getBoundingClientRect(),bounds=stage.getBoundingClientRect();
  // Render at the enlarged dimensions, rather than magnifying a tiny filtered layer.
  // Layout viewport stays stable during pinch zoom; never refit from visualViewport.
  const img=button.querySelector('.hj-team-photo-figure img');
  const ratio=r.width/Math.max(1,r.height);
  const sourceHeight=Number(img.getAttribute('height'))||850;
  const target=Math.max(r.height,Math.min(innerHeight*.48,420,
   (Math.min(bounds.width,innerWidth)-24)/ratio,
   sourceHeight/Math.max(1,window.devicePixelRatio||1))*.75);
  const scale=target/Math.max(1,r.height);
  Object.assign(HJ_TEAM_PHOTO_UI,{figureHeight:target,figureWidth:target*ratio,scale});
  button.style.setProperty('--showcase-height',target+'px');
  button.style.setProperty('--showcase-width',target*ratio+'px');
  button.style.setProperty('--showcase-scale',scale);
  HJ_TEAM_PHOTO_UI.headroom=Math.max(0,Math.ceil(target-(r.bottom-bounds.top)+2));
  group.style.setProperty('--showcase-headroom',HJ_TEAM_PHOTO_UI.headroom+'px');
  const half=Math.max(r.width*scale/2,62),center=r.left+r.width/2;
  const min=Math.max(8,bounds.left)+half,max=Math.min(innerWidth-8,bounds.right)-half;
  const targetX=min>max?(bounds.left+bounds.right)/2:Math.max(min,Math.min(max,center));
  const shift=Math.round((targetX-center)*100)/100;
  button.style.setProperty('--showcase-shift',shift+'px');
  HJ_TEAM_PHOTO_UI.shift=shift;
 }
 function refreshScore(button){
  const group=groupOf(button),data=HJ_LEAGUE_STATE.data,team=(data?.teams||[]).find(t=>String(t.id)===group.dataset.teamPhotoTeam);
  const entry=hjRosterEntries(team).find(e=>String(hjPlayer(e).id||e.playerId)===button.dataset.teamPhotoPlayer);
  if(!entry)return;
  const asset=hjTeamPhotoAsset(entry),img=button.querySelector('.hj-team-photo-figure img');
  button.classList.toggle('is-unavailable',!!(asset?.isUnavailable||asset?.isBye||asset?.isFreeAgent));button.classList.toggle('is-bye',!!asset?.isBye);
  if(asset&&img){const src='/assets/team-photos/'+(asset.mascot?'mascots/':'players/')+asset.file;if(img.getAttribute('src')!==src)img.setAttribute('src',src);}
  const score=hjTeamPhotoFinalScore(entry,data),badge=button.querySelector('.hj-team-photo-score'),name=hjTeamPhotoName(hjPlayer(entry));
  badge.hidden=score===null;if(badge.textContent!==String(score??''))badge.textContent=score??'';
  const label=name.full+', '+hjPlayerPosition(entry)+(score===null?'':', fantasy score '+score);
  if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
 }
 function show(button,mode){
  if(!button?.isConnected)return;
  const group=groupOf(button);
  const same=HJ_TEAM_PHOTO_UI.player===button.dataset.teamPhotoPlayer&&HJ_TEAM_PHOTO_UI.team===group.dataset.teamPhotoTeam;
  // Pointer movement within one figure must not rewrite scores or refit the rail.
  if(same&&button.classList.contains('is-active')){HJ_TEAM_PHOTO_UI.mode=mode;return;}
  // Measure before changing selection styles. Scores already come from the
  // renderer/live score event; selecting artwork must not trigger body observers.
  fit(button);
  if(!same)clear();
  Object.assign(HJ_TEAM_PHOTO_UI,{team:group.dataset.teamPhotoTeam,player:button.dataset.teamPhotoPlayer,mode});
  group.classList.add('has-spotlight');
  players(group).forEach(b=>{const selected=b===button;b.classList.toggle('is-active',selected);b.querySelector('.hj-team-photo-name').tabIndex=selected?0:-1;b.tabIndex=selected?0:-1;});
  // clear() resets the model's shift; retain the measured value for live refresh.
  HJ_TEAM_PHOTO_UI.shift=parseFloat(button.style.getPropertyValue('--showcase-shift'))||0;
 }
 function nearest(group,x){
  if(gesture?.group===group&&gesture.targets)return gesture.targets.reduce((best,item)=>{const d=Math.abs(x-item.x);return !best||d<best.d?{b:item.b,d}:best},null)?.b;
  return players(group).reduce((best,b)=>{const r=b.getBoundingClientRect(),d=Math.abs(x-r.left-r.width/2);return !best||d<best.d?{b,d}:best},null)?.b;
 }
 document.addEventListener('pointermove',event=>{
  if(gesture&&event.pointerId===gesture.id){
   const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
   if(!gesture.axis&&Math.hypot(dx,dy)>8){
    gesture.axis=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';
    gesture.moved=true;
    if(gesture.axis==='x')try{gesture.group.setPointerCapture(event.pointerId)}catch(_){}
    else if(HJ_TEAM_PHOTO_UI.mode==='touch')clear();
   }
   if(gesture.axis==='x'){
    if(event.cancelable)event.preventDefault();
    queueShow(nearest(gesture.group,event.clientX),'touch');
   }
  }
  if(event.pointerType!=='mouse'||event.buttons||Date.now()-lastTouchAt<700)return;
  const group=groupOf(event.target);if(!group||HJ_TEAM_PHOTO_UI.mode==='touch'||event.target.closest('.hj-team-photo-caption'))return;
  const stage=group.querySelector('.hj-team-photo-stage').getBoundingClientRect();
  // Retain the current spotlight in the label/score margins; only the player row switches it.
  if(event.clientY>=stage.top&&event.clientY<=stage.bottom)show(nearest(group,event.clientX),'hover');
 },{passive:false});
 document.addEventListener('pointerout',event=>{
  const group=groupOf(event.target);
  if(group&&!group.contains(event.relatedTarget)&&HJ_TEAM_PHOTO_UI.mode==='hover')clear();
 },{passive:true});
 document.addEventListener('pointerdown',event=>{
  const group=groupOf(event.target);
  if(!group){clear();gesture=null;return;}
  if(event.target.closest('.hj-team-photo-name')){gesture=null;ignoreClickUntil=0;return;}
  if(event.pointerType==='mouse')return;
  lastTouchAt=Date.now();
  if(event.isPrimary===false){gesture=null;clear();return;}
  const button=nearest(group,event.clientX);
  gesture={id:event.pointerId,group,button,x:event.clientX,y:event.clientY,moved:false,axis:'',targets:players(group).map(b=>{const r=b.getBoundingClientRect();return {b,x:r.left+r.width/2};})};
 },{passive:true});
 document.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const g=gesture;gesture=null;lastTouchAt=Date.now();ignoreClickUntil=Date.now()+700;
  if(g.axis==='x'){try{g.group.releasePointerCapture(event.pointerId)}catch(_){}return;}
  if(g.moved||Math.hypot(event.clientX-g.x,event.clientY-g.y)>10)return;
  if(HJ_TEAM_PHOTO_UI.mode==='touch'&&g.button.classList.contains('is-active'))clear();
  else show(g.button,'touch');
 },{passive:true});
 document.addEventListener('pointercancel',()=>{cancelShow();gesture=null;ignoreClickUntil=Date.now()+700;},{passive:true});
 // The lineup now sits inside the native roster rail. iOS can hand a
 // horizontal finger sweep to that ancestor scroller (or pan the page and
 // resize its toolbar), which cancels the pointer stream mid-cascade.
 // pointermove.preventDefault() cannot stop native scrolling; touchmove can.
 // Claim only one-finger, horizontally dominant moves that began on the
 // lineup, so vertical page scrolling and pinch zoom stay native.
 document.addEventListener('touchmove',event=>{
  if(!gesture||!event.cancelable||event.touches.length!==1)return;
  const touch=event.touches[0],dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;
  if(gesture.axis==='x'||(!gesture.axis&&Math.abs(dx)>=4&&Math.abs(dx)>Math.abs(dy)*1.15))event.preventDefault();
 },{passive:false});
 document.addEventListener('click',event=>{
  const group=groupOf(event.target);if(!group)return;
  event.preventDefault();event.stopPropagation();
  const name=event.target.closest('.hj-team-photo-name');
  if(name){if(Date.now()>=ignoreClickUntil)pcOpen(name);return;}
  if(Date.now()<ignoreClickUntil)return;
  const button=event.target.closest(selector);if(!button)return;
  if(event.detail===0){
   if(button.classList.contains('is-active')&&HJ_TEAM_PHOTO_UI.mode==='keyboard')clear();
   else show(button,'keyboard');
  }else show(button,'hover');
 },true);
 document.addEventListener('focusin',event=>{
  const button=event.target.closest?.(selector);
  if(button&&button.matches(':focus-visible')&&Date.now()-lastTouchAt>700)show(button,'keyboard');
 });
 document.addEventListener('focusout',event=>{
  const group=groupOf(event.target);
  if(group&&!group.contains(event.relatedTarget)&&HJ_TEAM_PHOTO_UI.mode==='keyboard')clear();
 });
 document.addEventListener('keydown',event=>{
  const button=event.target.closest?.(selector);
  if(event.key==='Escape'){if(HJ_TEAM_PHOTO_UI.player){clear();event.preventDefault();}return;}
  if(event.target.closest?.('.hj-team-photo-name'))return;
  if(button&&['Enter',' '].includes(event.key)){event.preventDefault();show(button,'keyboard');return;}
  if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const list=players(groupOf(button)),index=list.indexOf(button);
  const next=event.key==='Home'?0:event.key==='End'?list.length-1:Math.max(0,Math.min(list.length-1,index+(event.key==='ArrowRight'?1:-1)));
  list[next].focus({preventScroll:true});show(list[next],'keyboard');
 });
 document.addEventListener('hj:team-photo-scores',()=>document.querySelectorAll(selector).forEach(refreshScore));
 setInterval(()=>{if(!document.hidden&&document.querySelector(groupSelector))hjTeamPhotoLoadScores();},60000);
 let layoutWidth=document.documentElement.clientWidth;
 function refit(){
  // Mobile Safari fires resize when its toolbar collapses during a touch.
  // Only a real layout-width change (rotation) interrupts an active sweep.
  const width=document.documentElement.clientWidth;
  if(width!==layoutWidth){layoutWidth=width;cancelShow();gesture=null;}
  if(window.visualViewport?.scale>1.01)return;
  cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(()=>{
   const active=document.querySelector(groupSelector+' .is-active');
   if(active)fit(active);
  });
 }
 window.addEventListener('resize',refit,{passive:true});
 document.addEventListener('scroll',()=>{if(gesture)gesture.moved=true;},{capture:true,passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
})();




// Compose only on explicit request; no cached canvases or background rendering.
(function(){
 let hold=null,dialog=null,objectURL=null,serial=0,suppressClickUntil=0;
 const groupOf=target=>target instanceof Element?target.closest('.hj-team-photo'):null;
 function cancelHold(){if(hold)clearTimeout(hold.timer);hold=null;}
 function close(){serial++;if(dialog){dialog.close();dialog.remove();dialog=null;}if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}}
 async function open(group,job=null){
  if(dialog)return;
  cancelHold();suppressClickUntil=Date.now()+1000;
  document.dispatchEvent(new Event('hj:save-team-photo'));
  const stage=group?.querySelector('.hj-team-photo-stage');
  const rows=Array.from(stage?.querySelectorAll('.hj-team-photo-player')||[]).map(el=>({
   src:el.querySelector('img').src,left:parseFloat(el.style.left)/100,
   width:parseFloat(el.style.width)/100,height:parseFloat(el.style.height)/100,
   layer:Number(el.style.getPropertyValue('--player-layer'))+(el.classList.contains('is-starter')?30:0),
   starter:el.classList.contains('is-starter'),muted:el.classList.contains('is-unavailable'),portrait:el.classList.contains('is-portrait')
  })).sort((a,b)=>a.layer-b.layer);
  const ratio=(stage?.style.aspectRatio||'4/1').split('/').map(Number),aspect=ratio[0]/ratio[1];
  const manager=job?.title||group?.closest('.league-roster-head')?.querySelector('.league-roster-name')?.textContent.trim()||'Team';
  const filename=manager.replace(/[^a-z0-9_-]+/gi,'-').toLowerCase()+(job?'-matchup.png':'-lineup.png');
  const token=++serial,d=document.createElement('dialog');dialog=d;
  d.setAttribute('aria-label',manager+(job?' image':' lineup image'));
  d.className='hj-lineup-save-card';
  d.style.cssText='position:fixed!important;inset:0!important;margin:auto!important;width:min(960px,calc(100vw - 32px));height:fit-content;max-height:88vh;max-height:88dvh;box-sizing:border-box;padding:0;border:1px solid #b88a2a;border-radius:16px;background:#f6f2e5;color:#16354c;overflow:auto;box-shadow:0 18px 60px #081d3866;font-family:var(--sans,Arial,sans-serif)';
  const skin=document.createElement('style');skin.textContent='.hj-lineup-save-card::backdrop{background:rgba(8,25,43,.62)}.hj-lineup-save-card button:focus-visible{outline:2px solid #dbb85c;outline-offset:3px}';d.append(skin);
  const bar=document.createElement('div');bar.className='hj-lineup-save-head';bar.style.cssText='display:flex;align-items:center;gap:12px;padding:16px 18px;background:#123149;color:#fff;border-bottom:3px solid #b88a2a';
  const title=document.createElement('strong');title.textContent=manager+(job?'':' lineup');title.style.cssText='flex:1;min-width:0;font-size:clamp(17px,3.8vw,24px);line-height:1.2';
  const dismiss=document.createElement('button');dismiss.className='hj-lineup-save-close';dismiss.textContent='×';dismiss.type='button';dismiss.setAttribute('aria-label',job?'Close matchup image':'Close lineup image');dismiss.style.cssText='appearance:none;display:grid;place-items:center;flex:0 0 40px;width:40px;height:40px;padding:0;border:1px solid #ffffff55;border-radius:50%;background:#ffffff12;color:#fff;font:400 30px/1 Arial;cursor:pointer';dismiss.onclick=close;
  const status=document.createElement('p');status.textContent='Creating image…';status.setAttribute('role','status');status.style.cssText='margin:12px 18px 18px;font-size:13px;line-height:1.4;color:#627486';
  bar.append(title,dismiss);d.append(bar,status);document.body.append(d);d.showModal();
  d.addEventListener('cancel',event=>{event.preventDefault();close();});
  const outside=event=>{const r=d.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
  let backdropDown=false;
  d.addEventListener('pointerdown',event=>{backdropDown=event.target===d&&outside(event);});
  d.addEventListener('click',event=>{if(backdropDown&&event.target===d&&outside(event))close();backdropDown=false;});
  let canvas;
  try{
   if(job){canvas=await job.render(()=>token!==serial);if(token!==serial)return;}else{
   canvas=document.createElement('canvas');
   canvas.width=Math.min(2800,Math.round(900*aspect));canvas.height=Math.round(canvas.width/aspect)+32;
   const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height-32;
   ctx.fillStyle='#f8edd6';ctx.fillRect(0,0,w,canvas.height);
   for(const row of rows){
    if(token!==serial)return;
    const img=new Image();img.crossOrigin='anonymous';img.src=row.src;
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Image timeout')),15000);img.onload=()=>{clearTimeout(timer);resolve();};img.onerror=()=>{clearTimeout(timer);reject(Error('Image unavailable'));};if(img.complete&&img.naturalWidth){clearTimeout(timer);resolve();}});
    if(token!==serial)return;
    const scale=row.starter?1.05:1,bw=row.width*w*scale,bh=row.height*h*scale;
    const boxW=row.width*w,x=row.left*w+(boxW-bw)/2,bottom=16+h*.985+(row.starter?2:0);
    const fit=Math.min(bw/img.naturalWidth,(row.portrait?bh*.42:bh)/img.naturalHeight),dw=img.naturalWidth*fit,dh=img.naturalHeight*fit;
    const dx=x+(bw-dw)/2,dy=row.portrait?bottom-bh+bh*.08:bottom-dh;
    // A small temporary layer provides the same muted treatment in Safari too.
    const layer=document.createElement('canvas');layer.width=Math.max(1,Math.ceil(dw));layer.height=Math.max(1,Math.ceil(dh));
    try{
     const lc=layer.getContext('2d');lc.drawImage(img,0,0,layer.width,layer.height);
     if(row.muted){const data=lc.getImageData(0,0,layer.width,layer.height),p=data.data;for(let i=0;i<p.length;i+=4){const l=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];for(let j=0;j<3;j++)p[i+j]=((l+(p[i+j]-l)*.28)-127.5)*.94+127.5;}lc.putImageData(data,0,0);}
     ctx.save();if(row.starter){ctx.shadowColor='#d9a93f';ctx.shadowBlur=8;}ctx.drawImage(layer,dx,dy,dw,dh);ctx.restore();
    }finally{layer.width=layer.height=0;}
   }
   }
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image unavailable')),'image/png'));
   if(token!==serial)return;
   objectURL=URL.createObjectURL(blob);
   const image=document.createElement('img');image.src=objectURL;image.alt=manager+(job?' entire matchup including bench':' entire lineup');image.style.cssText='display:block;width:calc(100% - 32px);height:auto;margin:18px 16px 0;border-radius:6px;-webkit-touch-callout:default;user-select:auto;touch-action:auto';
   status.textContent='Hold the image to save to Photos, or use Save image.';
   const save=document.createElement('button');save.type='button';save.textContent='Save image';save.style.cssText='appearance:none;flex-shrink:0;padding:9px 13px;border:1px solid #c49a41;border-radius:999px;background:#b88a2a;color:#fff;font:700 13px/1.2 var(--sans,Arial,sans-serif);cursor:pointer';
   save.onclick=async()=>{
    const file=new File([blob],filename,{type:'image/png'});
    if(navigator.canShare?.({files:[file]}))try{await navigator.share({files:[file],title:manager+' lineup'});return;}catch(error){if(error.name==='AbortError')return;}
    const a=document.createElement('a');a.href=objectURL;a.download=filename;d.append(a);a.click();a.remove();
   };
   bar.insertBefore(save,dismiss);d.insertBefore(image,status);
  }catch(error){if(token===serial)status.textContent='Could not create the image. Please close and try again.';}
  finally{if(canvas)canvas.width=canvas.height=0;}
 }
 window.hjOpenSaveImageCard=job=>open(null,job);
 document.addEventListener('contextmenu',event=>{const group=groupOf(event.target);if(!group||event.target.closest('.hj-team-photo-name'))return;event.preventDefault();open(group);});
 document.addEventListener('pointerdown',event=>{
  cancelHold();if(event.pointerType==='mouse'||event.isPrimary===false)return;
  const group=groupOf(event.target);if(!group||event.target.closest('.hj-team-photo-name'))return;
  hold={id:event.pointerId,x:event.clientX,y:event.clientY,timer:setTimeout(()=>{if(group.isConnected)open(group);},600)};
 },{passive:true});
 document.addEventListener('pointermove',event=>{if(hold&&event.pointerId===hold.id&&Math.hypot(event.clientX-hold.x,event.clientY-hold.y)>8)cancelHold();},{passive:true});
 for(const type of ['pointerup','pointercancel','scroll'])document.addEventListener(type,cancelHold,{capture:true,passive:true});
 document.addEventListener('touchstart',event=>{if(event.touches.length>1)cancelHold();},{passive:true});
 document.addEventListener('click',event=>{if(Date.now()<suppressClickUntil&&groupOf(event.target)){event.preventDefault();event.stopImmediatePropagation();}},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelHold();});
})();

/* Explicit export layout: wrap all text and preserve every image's aspect ratio. */
(function(){
 const skin=document.createElement('style');skin.textContent='.hj-matchup-camera{position:absolute;display:flex;align-items:center;justify-content:center;padding:0;box-sizing:border-box;cursor:pointer}.hj-matchup-camera svg{display:block;width:16px;height:16px;flex:none}.hj-matchup-camera:focus-visible{outline:2px solid #b88a2a;outline-offset:2px}';document.head.append(skin);
 window.hjAlignMatchupCameras=()=>{
  document.querySelectorAll('.hj-matchup-actions').forEach(band=>{
   const camera=band.querySelector('.hj-matchup-camera'),ev=band.querySelector('[data-hj-section-projections]');
   if(!camera||!ev||!ev.offsetWidth||!ev.offsetHeight)return;
   const css=getComputedStyle(ev),values={position:'absolute',top:ev.offsetTop+'px',left:(ev.offsetLeft-ev.offsetWidth-6)+'px',right:'auto',bottom:'auto',width:ev.offsetWidth+'px',height:ev.offsetHeight+'px','min-height':'0',margin:'0',padding:'0','box-sizing':'border-box',background:css.background,border:css.border,'border-radius':css.borderRadius,color:css.color,'box-shadow':css.boxShadow,transform:css.transform};
   for(const [key,value] of Object.entries(values))if(camera.style.getPropertyValue(key)!==value)camera.style.setProperty(key,value,'important');
  });
 };
 window.addEventListener('resize',()=>requestAnimationFrame(window.hjAlignMatchupCameras),{passive:true});
 requestAnimationFrame(window.hjAlignMatchupCameras);
 const text=n=>n?.textContent.replace(/\s+/g,' ').trim()||'';
 const color=(n,fallback='#16354c')=>n?getComputedStyle(n).color:fallback;
 function projection(root){const chip=root?.querySelector('.hj-proj-flip');return chip?text(chip):text(root);}
 function runs(root){if(!root)return [];const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),out=[];let n;while(n=walker.nextNode()){for(const word of n.textContent.match(/\S+\s*/g)||[])out.push({text:word,color:color(n.parentElement)});}return out;}
 function player(el){
  if(!el)return null;
  const name=el.querySelector('.hj-v3-name'),score=el.querySelector('.hj-v3-score strong'),image=el.querySelector('.hj-v3-avatar img');
  return {name:el.dataset.pcName||name?.title||text(name),meta:text(el.querySelector('.hj-v3-meta')),score:text(score)||'—',scoreColor:color(score),proj:projection(el.querySelector('.hj-v3-projection')),game:text(el.querySelector('.hj-game-status')),gameRuns:runs(el.querySelector('.hj-game-status')),stats:text(el.querySelector('.hj-game-stats')),src:image?.currentSrc||image?.src};
 }
 function snapshot(card){
  const teams=[...card.querySelectorAll('.hq-match-team')].map(el=>({name:text(el.querySelector('.hq-match-team-name')),left:text(el.querySelector('.hq-match-team-left')),score:projection(el.querySelector('.hq-match-team-score')),color:color(el.querySelector('.hq-match-team-score')),adjusted:text(el.querySelector('.hq-adjusted-projection')),proj:projection(el.querySelector('.hj-proj-flip')?.parentElement),src:el.querySelector('img')?.src}));
  // Projection is a separate chip below the score, including when score itself is projected.
  for(let i=0;i<teams.length;i++){const el=card.querySelectorAll('.hq-match-team')[i];const chips=[...el.querySelectorAll('.hj-proj-flip')];teams[i].proj=chips.length?text(chips.at(-1)):'';}
  return {teams,week:card.dataset.hqMatchupKey?.split(':')[0],win:[...card.querySelectorAll('.hq-match-win-labels>*')].map(text),prob:parseFloat(card.querySelector('.hq-match-win-bar>span')?.style.width)||0,rows:[...card.querySelectorAll('.hj-lineup-v2-row,.hq-lineup-row')].map(row=>{const cells=row.querySelectorAll('.hj-player-v3');return {a:player(row.children[0]?.matches('.hj-player-v3')?row.children[0]:row.children[0]?.querySelector('.hj-player-v3')),b:player(row.children[2]?.matches('.hj-player-v3')?row.children[2]:row.children[2]?.querySelector('.hj-player-v3')),slot:text(row.querySelector('.hj-lineup-v2-slot,.hq-lineup-slot')),bench:row.classList.contains('is-bench-row')||!!row.closest('.hj-lineup-v2-bench')};})};
 }
 async function render(data,canceled){
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1;
  const ctx=canvas.getContext('2d');
  const font=(size,bold=false)=>{ctx.font=(bold?'700 ':'400 ')+size+'px Arial,sans-serif';};
  function wrap(value,width,size=19,bold=false){font(size,bold);const words=String(value||'').split(/\s+/),lines=[];let line='';for(const word of words){if(!word)continue;const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
  function richWrap(tokens,width){font(18);const lines=[];let line=[],used=0;for(const token of tokens||[]){const w=ctx.measureText(token.text).width;if(line.length&&used+w>width){lines.push(line);line=[];used=0;}line.push({...token,width:w});used+=w;}if(line.length)lines.push(line);return lines;}
  function prepare(p){if(!p)return null;p.names=wrap(p.name,282,22,true);p.metas=wrap(p.meta,282,17);p.games=wrap(p.game,442,18);p.richGames=richWrap(p.gameRuns,442);if(p.richGames.length)p.games=p.richGames;p.statLines=wrap(p.stats,442,18);p.top=Math.max(64,p.names.length*26+p.metas.length*21);p.height=24+p.top+(p.games.length+p.statLines.length)*23;return p;}
  let height=230,bench=false;
  for(const row of data.rows){prepare(row.a);prepare(row.b);row.height=Math.max(100,row.a?.height||0,row.b?.height||0);if(row.bench&&!bench){height+=38;bench=true;}height+=row.height+8;}
  canvas.height=height+12;
  const images=new Map();
  for(const p of [...data.teams,...data.rows.flatMap(r=>[r.a,r.b])]){
   if(canceled()){canvas.width=canvas.height=0;throw Error('Canceled');}
   if(!p?.src||images.has(p.src))continue;
   const img=new Image();img.crossOrigin='anonymous';
   await new Promise(resolve=>{const timer=setTimeout(resolve,7000);img.onload=img.onerror=()=>{clearTimeout(timer);resolve();};img.src=p.src;});
   if(img.naturalWidth)images.set(p.src,img);
  }
  function lines(values,x,y,size=19,bold=false,fill='#16354c',align='left',lineHeight=23){font(size,bold);ctx.fillStyle=fill;ctx.textAlign=align;ctx.textBaseline='top';for(const line of values){ctx.fillText(line,x,y);y+=lineHeight;}return y;}
  function avatar(src,x,y,size){const img=images.get(src);ctx.save();ctx.beginPath();ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2);ctx.clip();ctx.fillStyle='#edf0f2';ctx.fillRect(x,y,size,size);if(img){const k=Math.min(size/img.naturalWidth,size/img.naturalHeight);ctx.drawImage(img,x+(size-img.naturalWidth*k)/2,y+(size-img.naturalHeight*k)/2,img.naturalWidth*k,img.naturalHeight*k);}ctx.restore();}
  ctx.fillStyle='#e7ecef';ctx.fillRect(0,0,1000,canvas.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,1000,222);
  lines(['WEEK '+data.week],500,12,15,true,'#a57d2a','center');
  data.teams.forEach((t,i)=>{const right=i===1,x=right?902:98,align=right?'right':'left';avatar(t.src,right?916:16,46,68);lines([t.name],x,44,25,true,'#16354c',align);lines([t.left],x,77,17,false,'#7b8791',align);lines([t.score],x,105,40,true,t.color,align);if(t.adjusted)lines([t.adjusted],right?740:260,123,19,false,'#7b8791',align);if(t.proj)lines([t.proj],x,153,19,true,'#a57d2a',align);});
  ctx.fillStyle='#dfe4e9';ctx.fillRect(16,188,968,9);ctx.fillStyle='#b88a2a';ctx.fillRect(16,188,968*data.prob/100,9);
  if(data.win.length){lines([data.win[0]],16,204,15,false,'#74828e');lines([data.win[1]],500,204,15,true,'#74828e','center');lines([data.win[2]],984,204,15,false,'#74828e','right');}
  function cell(p,x,y,w,h,right){ctx.fillStyle='#fffdf5';ctx.fillRect(x,y,w,h);if(!p)return;const edge=right?x+w-12:x+12,align=right?'right':'left';avatar(p.src,right?x+w-70:x+12,y+12,56);const tx=right?x+w-80:x+80;let ty=lines(p.names,tx,y+12,22,true,'#16354c',align,26);lines(p.metas,tx,ty+1,17,false,'#9a772b',align,21);const sx=right?x+12:x+w-12,scoreAlign=right?'left':'right';lines([p.score],sx,y+24,25,true,p.scoreColor,scoreAlign);lines([p.proj],sx,y+55,19,true,'#7c8c9d',scoreAlign);let cy=y+14+p.top;if(p.richGames.length){font(18);ctx.textAlign='left';ctx.textBaseline='top';for(const line of p.richGames){let gx=right?edge-line.reduce((sum,t)=>sum+t.width,0):edge;for(const token of line){ctx.fillStyle=token.color;ctx.fillText(token.text,gx,cy);gx+=token.width;}cy+=23;}}else cy=lines(p.games,edge,cy,18,false,'#627486',align,23);lines(p.statLines,edge,cy,18,false,'#425569',align,23);}
  let y=230;bench=false;
  for(const row of data.rows){if(row.bench&&!bench){lines(['BENCH'],500,y+9,16,true,'#627486','center');y+=38;bench=true;}cell(row.a,8,y,464,row.height,false);cell(row.b,528,y,464,row.height,true);lines([row.bench?'BE':row.slot],500,y+row.height/2-10,17,true,'#7c8c9d','center');y+=row.height+8;}
  return canvas;
 }
 document.addEventListener('click',event=>{const button=event.target.closest?.('.hj-matchup-camera');if(!button)return;event.preventDefault();event.stopPropagation();const card=button.closest('.hq-matchup');if(!card)return;const data=snapshot(card);if(!data.rows.length){console.error('Matchup export: no lineup rows found');return;}window.hjOpenSaveImageCard({title:data.teams.map(t=>t.name).join(' vs ')+' · Week '+data.week,render:canceled=>render(data,canceled)});});
})();
