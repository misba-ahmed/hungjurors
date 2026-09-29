/* The showcase uses current roster slots and actual final weekly scores only. */
const HJ_TEAM_PHOTO_UI={team:'',player:'',mode:'',shift:0};
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

function hjTeamPhotoFinalScore(entry,data=HJ_LEAGUE_STATE.data){
 try{
  const week=hjCurrentWeek(data),game=hjUpcomingForWeek(hjPlayerTeam(entry),week)?.game;
  if(!game||!(game.state==='post'||game.completed===true))return null;
  const score=hjPlayerActualScore(entry,week,data);
  return Number.isFinite(score)?Number(score).toFixed(2):null;
 }catch(_){return null}
}
function hjTeamPhotoName(player){
 const full=String(player.fullName||player.displayName||player.name||'Player').trim();
 const parts=full.split(/\s+/);
 return {full,first:player.firstName||parts.shift(),last:player.lastName||parts.join(' ')};
}
function hjTeamPhotoHTML(team){
 const entries=hjTeamPhotoOrder(hjRosterEntries(team)),teamId=String(team.id);
 if(!entries.length)return '';
 const rows=entries.map(e=>{
  const p=hjPlayer(e),id=String(p.id||e.playerId||''),asset=HJ_TEAM_PHOTO_ASSETS[id];
  const height=asset?.heightInches||73,ratio=asset?.ratio||.44;
  return {id,p,asset,height,width:height*ratio,starter:![20,21].includes(Number(e.lineupSlotId)),position:hjPlayerPosition(e),name:hjTeamPhotoName(p),score:hjTeamPhotoFinalScore(e)};
 });
 const selected=HJ_TEAM_PHOTO_UI.team===teamId?rows.find(r=>r.id===HJ_TEAM_PHOTO_UI.player):null;
 let cursor=0;
 const positions=rows.map(r=>{const left=cursor;cursor+=r.width*.86;return left;});
 const width=cursor+rows.at(-1).width*.14+4,height=Math.max(...rows.map(r=>r.height))+5;
 return '<div class="hj-team-photo'+(selected?' has-spotlight':'')+'" data-team-photo-team="'+esc(teamId)+'" role="group" aria-label="Interactive team photo"><div class="hj-team-photo-stage" style="aspect-ratio:'+width.toFixed(2)+' / '+height+'">'+rows.map((r,i)=>{
  const active=selected?.id===r.id,left=(positions[i]+2)/width*100,bodyHeight=r.height/height*100,bodyWidth=r.width/width*100;
  const src=r.asset?'/assets/team-photos/players/'+r.asset.file:hjPlayerPhoto(entries[i]);
  const label=r.name.full+', '+r.position+(r.score===null?'':', final fantasy score '+r.score);
  return '<button type="button" class="hj-team-photo-player'+(r.starter?' is-starter':'')+(!r.asset?' is-portrait':'')+(active?' is-active':'')+'" data-team-photo-player="'+esc(r.id)+'" aria-label="'+esc(label)+'" aria-pressed="'+!!active+'" tabindex="'+(selected?active?0:-1:i===0?0:-1)+'" style="left:'+left.toFixed(4)+'%;width:'+bodyWidth.toFixed(4)+'%;height:'+bodyHeight.toFixed(4)+'%;--player-layer:'+(100-Math.round(Math.abs(i-(rows.length-1)/2)))+';--showcase-shift:'+(active?HJ_TEAM_PHOTO_UI.shift:0)+'px"><span class="hj-team-photo-figure"><img src="'+esc(src)+'" alt="" width="'+(r.asset?.width||350)+'" height="'+(r.asset?.height||800)+'" decoding="async" draggable="false"></span><span class="hj-team-photo-score" aria-hidden="true"'+(r.score===null?' hidden':'')+'>'+esc(r.score??'')+'</span><span class="hj-team-photo-caption" aria-hidden="true"><span class="hj-team-photo-position">'+esc(r.position)+'</span><span>'+esc(r.name.first)+'</span>'+(r.name.last?'<span>'+esc(r.name.last)+'</span>':'')+'</span></button>';
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
    button.classList.remove('is-active');button.setAttribute('aria-pressed','false');
    button.tabIndex=i===0?0:-1;button.style.setProperty('--showcase-shift','0px');
   });
  });
  Object.assign(HJ_TEAM_PHOTO_UI,{team:'',player:'',mode:'',shift:0});
 }
 function fit(button){
  const group=groupOf(button),stage=group.querySelector('.hj-team-photo-stage'),r=button.getBoundingClientRect(),bounds=stage.getBoundingClientRect();
  const scale=parseFloat(getComputedStyle(button).getPropertyValue('--showcase-scale'))||1.18;
  const half=Math.max(r.width*scale/2,62),center=r.left+r.width/2;
  const min=Math.max(8,bounds.left)+half,max=Math.min(innerWidth-8,bounds.right)-half;
  const target=min>max?(bounds.left+bounds.right)/2:Math.max(min,Math.min(max,center));
  const shift=Math.round((target-center)*100)/100;
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
  players(group).forEach(b=>{const selected=b===button;b.classList.toggle('is-active',selected);b.setAttribute('aria-pressed',String(selected));b.tabIndex=selected?0:-1;});
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
  const group=groupOf(event.target);if(!group||HJ_TEAM_PHOTO_UI.mode==='touch')return;
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
  if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const list=players(groupOf(button)),index=list.indexOf(button);
  const next=event.key==='Home'?0:event.key==='End'?list.length-1:Math.max(0,Math.min(list.length-1,index+(event.key==='ArrowRight'?1:-1)));
  list[next].focus({preventScroll:true});show(list[next],'keyboard');
 });
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
