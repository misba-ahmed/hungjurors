/* The showcase uses current roster slots and actual final weekly scores only. */
const HJ_TEAM_PHOTO_UI={team:'',player:'',mode:'',shift:0,headroom:0,figureHeight:0,figureWidth:0,scale:1};
function hjTeamPhotoOrder(entries){
 const eligible=(entries||[]).filter(e=>{const p=hjPlayer(e);return Number(p.defaultPositionId)!==16&&Number(e.lineupSlotId)!==16;});
 const bench=eligible.filter(e=>Number(e.lineupSlotId)===20).sort(hjBenchCompare);
 const reserve=eligible.filter(e=>Number(e.lineupSlotId)===21).sort(hjBenchCompare);
 const active=eligible.filter(e=>![20,21].includes(Number(e.lineupSlotId))).sort(hjLineupCompare);
 const take=slot=>{const i=active.findIndex(e=>Number(e.lineupSlotId)===slot);return i<0?null:active.splice(i,1)[0];};
 const center=[take(17),take(6),take(4),take(2),take(0)||take(1),take(2),take(4),take(23)||take(3)||take(5)].filter(Boolean);
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
   const comp=event.competitions?.[0],final=!!(event.status?.type?.completed||comp?.status?.type?.completed);
   for(const side of comp?.competitors||[])byTeam.set(pcTeam(side.team?.abbreviation),final);
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
  const final=valid?state.games.get(pcTeam(hjPlayerTeam(source))):game&&(game.state==='post'||game.completed===true);
  if(!final)return null;
  const stat=hjWeeklyStat(source,week),score=stat?hjNumber(stat.appliedTotal):hjPlayerActualScore(entry,week,data);
  return Number.isFinite(score)?Number(score).toFixed(2):null;
 }catch(_){return null}
}
function hjTeamPhotoName(player){
 const full=String(player.fullName||player.displayName||player.name||'Player').trim();
 const parts=full.split(/\s+/);
 return {full,first:player.firstName||parts.shift(),last:player.lastName||parts.join(' ')};
}

// Alternate poses are roster-only and resolve from the latest ESPN player status.
// Missing status does not falsely signal a recovery; the regular asset is kept intact.
function hjTeamPhotoAsset(entry){
 const p=hjPlayer(entry),base=HJ_TEAM_PHOTO_ASSETS[String(p.id||entry.playerId||'')];
 if(!base?.unavailable)return base;
 const status=String(p.injuryStatus||'').trim().toUpperCase().replace(/[ -]+/g,'_');
 const rosterStatus=String(typeof p.status==='object'?p.status?.type||p.status?.name||'':p.status||'').toUpperCase().replace(/[ -]+/g,'_');
 const blocked=new Set(['OUT','DOUBTFUL','QUESTIONABLE','INJURY_RESERVE','INJURED_RESERVE','IR','SUSPENSION','SUSPENDED','EXEMPT','COMMISSIONER_EXEMPT','NON_FOOTBALL_INJURY','PHYSICALLY_UNABLE_TO_PERFORM','PUP','INACTIVE']);
 const unavailable=p.injured===true||p.active===false||blocked.has(status)||blocked.has(rosterStatus);
 const healthy=['ACTIVE','HEALTHY','NORMAL'].includes(status)||(!status&&p.injured===false&&p.active===true);
 return healthy&&!unavailable?base:{...base,...base.unavailable};
}

function hjTeamPhotoHTML(team){
 hjTeamPhotoLoadScores();
 const entries=hjTeamPhotoOrder(hjRosterEntries(team)),teamId=String(team.id);
 if(!entries.length)return '';
 const rows=entries.map(e=>{
  const p=hjPlayer(e),id=String(p.id||e.playerId||''),asset=hjTeamPhotoAsset(e);
  const height=asset?.heightInches||73,ratio=asset?.ratio||.44;
  return {id,p,asset,height,width:height*ratio,starter:![20,21].includes(Number(e.lineupSlotId)),position:hjPlayerPosition(e),name:hjTeamPhotoName(p),score:hjTeamPhotoFinalScore(e)};
 });
 const selected=HJ_TEAM_PHOTO_UI.team===teamId?rows.find(r=>r.id===HJ_TEAM_PHOTO_UI.player):null;
 let cursor=0;
 const positions=rows.map(r=>{const left=cursor;cursor+=r.width*.86;return left;});
 const width=cursor+rows.at(-1).width*.14+4,height=Math.max(...rows.map(r=>r.height))+5;
 return '<div class="hj-team-photo'+(selected?' has-spotlight':'')+'" data-team-photo-team="'+esc(teamId)+'" style="--showcase-headroom:'+(selected?HJ_TEAM_PHOTO_UI.headroom:0)+'px" role="group" aria-label="Interactive team photo"><div class="hj-team-photo-stage" style="aspect-ratio:'+width.toFixed(2)+' / '+height+'">'+rows.map((r,i)=>{
  const active=selected?.id===r.id,left=(positions[i]+2)/width*100,bodyHeight=r.height/height*100,bodyWidth=r.width/width*100;
  const src=r.asset?'/assets/team-photos/players/'+r.asset.file:hjPlayerPhoto(entries[i]);
  const label=r.name.full+', '+r.position+(r.score===null?'':', final fantasy score '+r.score);
  return '<div role="group" class="hj-team-photo-player'+(r.starter?' is-starter':'')+(!r.asset?' is-portrait':'')+(active?' is-active':'')+'" data-team-photo-player="'+esc(r.id)+'" aria-label="'+esc(label)+'" tabindex="'+(selected?active?0:-1:i===0?0:-1)+'" style="left:'+left.toFixed(4)+'%;width:'+bodyWidth.toFixed(4)+'%;height:'+bodyHeight.toFixed(4)+'%;--player-layer:'+(100-Math.round(Math.abs(i-(rows.length-1)/2)))+';--showcase-shift:'+(active?HJ_TEAM_PHOTO_UI.shift:0)+'px;--showcase-height:'+HJ_TEAM_PHOTO_UI.figureHeight+'px;--showcase-width:'+HJ_TEAM_PHOTO_UI.figureWidth+'px;--showcase-scale:'+HJ_TEAM_PHOTO_UI.scale+'"><span class="hj-team-photo-figure"><img src="'+esc(src)+'" alt="" width="'+(r.asset?.width||350)+'" height="'+(r.asset?.height||800)+'" decoding="async" draggable="false"></span><span class="hj-team-photo-score" aria-hidden="true"'+(r.score===null?' hidden':'')+'>'+esc(r.score??'')+'</span><span class="hj-team-photo-caption"><span class="hj-team-photo-position">'+esc(r.position)+'</span><button type="button" class="hj-team-photo-name" data-pc-id="'+esc(r.id)+'" data-pc-name="'+esc(r.name.full)+'" data-pc-team="'+esc(hjPlayerTeam(entries[i]))+'" data-pc-position="'+esc(r.position)+'" data-pc-photo="'+esc(hjPlayerPhoto(entries[i]))+'" aria-label="Open '+esc(r.name.full)+' player card" tabindex="'+(active?0:-1)+'"><span>'+esc(r.name.first)+'</span>'+(r.name.last?'<span>'+esc(r.name.last)+'</span>':'')+'</button></span></div>';
 }).join('')+'</div></div>';
}
(function(){
 const selector='.hj-team-photo-player',groupSelector='.hj-team-photo';
 let gesture=null,ignoreClickUntil=0,lastTouchAt=0,layoutFrame=0;
 const groupOf=target=>target instanceof Element?target.closest(groupSelector):null;
 const players=group=>Array.from(group.querySelectorAll(selector));
 function clear(){
  document.querySelectorAll(groupSelector+'.has-spotlight').forEach(group=>{
   group.classList.remove('has-spotlight');
   players(group).forEach((button,i)=>{
    button.classList.remove('is-active');button.querySelector('.hj-team-photo-name').tabIndex=-1;
    button.tabIndex=i===0?0:-1;button.style.setProperty('--showcase-shift','0px');
   });
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
   sourceHeight/Math.max(1,window.devicePixelRatio||1)));
  const scale=target/Math.max(1,r.height);
  Object.assign(HJ_TEAM_PHOTO_UI,{figureHeight:target,figureWidth:target*ratio,scale});
  button.style.setProperty('--showcase-height',target+'px');
  button.style.setProperty('--showcase-width',target*ratio+'px');
  button.style.setProperty('--showcase-scale',scale);
  HJ_TEAM_PHOTO_UI.headroom=Math.ceil(target-r.height+12);
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
  const score=hjTeamPhotoFinalScore(entry,data),badge=button.querySelector('.hj-team-photo-score'),name=hjTeamPhotoName(hjPlayer(entry));
  badge.hidden=score===null;badge.textContent=score??'';
  button.setAttribute('aria-label',name.full+', '+hjPlayerPosition(entry)+(score===null?'':', final fantasy score '+score));
 }
 function show(button,mode){
  if(!button?.isConnected)return;
  const group=groupOf(button);
  const same=HJ_TEAM_PHOTO_UI.player===button.dataset.teamPhotoPlayer&&HJ_TEAM_PHOTO_UI.team===group.dataset.teamPhotoTeam;
  if(!same)clear();
  Object.assign(HJ_TEAM_PHOTO_UI,{team:group.dataset.teamPhotoTeam,player:button.dataset.teamPhotoPlayer,mode});
  group.classList.add('has-spotlight');
  players(group).forEach(b=>{const selected=b===button;b.classList.toggle('is-active',selected);b.querySelector('.hj-team-photo-name').tabIndex=selected?0:-1;b.tabIndex=selected?0:-1;});
  fit(button);refreshScore(button);
 }
 function nearest(group,x){
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
    show(nearest(gesture.group,event.clientX),'touch');
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
  gesture={id:event.pointerId,group,button,x:event.clientX,y:event.clientY,moved:false,axis:''};
 },{passive:true});
 document.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const g=gesture;gesture=null;lastTouchAt=Date.now();ignoreClickUntil=Date.now()+700;
  if(g.axis==='x'){try{g.group.releasePointerCapture(event.pointerId)}catch(_){}return;}
  if(g.moved||Math.hypot(event.clientX-g.x,event.clientY-g.y)>10)return;
  if(HJ_TEAM_PHOTO_UI.mode==='touch'&&g.button.classList.contains('is-active'))clear();
  else show(g.button,'touch');
 },{passive:true});
 document.addEventListener('pointercancel',()=>{gesture=null;ignoreClickUntil=Date.now()+700;},{passive:true});
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
 function refit(){
  cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(()=>{
   const active=document.querySelector(groupSelector+' .is-active');
   if(active)fit(active);
  });
 }
 window.addEventListener('resize',refit,{passive:true});
 document.addEventListener('scroll',()=>{if(gesture)gesture.moved=true;},{capture:true,passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
})();
