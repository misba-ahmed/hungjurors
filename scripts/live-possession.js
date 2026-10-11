/* One shared possession snapshot from the existing live NFL scoreboard refresh. */
function hjPossessionTeam(value){const key=String(value||'').trim().toUpperCase();return ({WAS:'WSH',JAC:'JAX',LA:'LAR'})[key]||key;}
function hjPossessionStates(data){
 const states=new Map();
 for(const event of data?.events||[]){
  const comp=event.competitions?.[0],status=comp?.status?.type||event.status?.type,s=comp?.situation;
  if(status?.state!=='in'||status.completed||/HALFTIME|SUSPEND|DELAY|END_PERIOD/i.test(status.name||'')||!s)continue;
  const teams=comp.competitors||[],owner=String(s.possession?.id??s.possession??'');
  if(!owner||!teams.some(t=>String(t.team?.id)===owner)||!(Number(s.down)>=1&&Number(s.down)<=4))continue;
  for(const t of teams){const offense=String(t.team.id)===owner;states.set(hjPossessionTeam(t.team.abbreviation),{offense,red:offense&&s.isRedZone===true});}
 }
 return states;
}
function hjPossessionGlow(state,position){
 if(!state)return '';
 const defense=['DST','D/ST','DEF'].includes(String(position).toUpperCase());
 return defense?(!state.offense?'green':''):state.offense?(state.red?'red':'green'):'';
}
(function(){
 let states=new Map(),week=0,season=0,at=0,expiry=0,frame=0;
 const selector='.hj-player-v3,.hj-player-v2,.league-player,.hq-lineup-player';
 const skin=document.createElement('style');skin.textContent='[data-hj-possession="green"]{outline:2px solid #2bbf70!important;outline-offset:1px;box-shadow:0 0 5px 2px #2bbf7080!important;border-radius:50%!important}[data-hj-possession="red"]{outline:2px solid #ee4444!important;outline-offset:1px;box-shadow:0 0 5px 2px #ee444480!important;border-radius:50%!important}';document.head.append(skin);
 function apply(){
  frame=0;const fresh=Date.now()-at<75000&&season===Number(NFL_SEASON);
  document.querySelectorAll(selector).forEach(row=>{
   const avatar=row.querySelector('.hj-v3-avatar')||row.querySelector('img');if(!avatar)return;
   const context=row.querySelector('[data-hj-game-player]');let info=null;
   try{info=JSON.parse(context?.dataset.hjGamePlayer||'null');}catch(_){}
   const team=row.dataset.pcTeam||info?.team,position=row.dataset.pcPosition||info?.position;
   // Historical matchup/profile rows must never inherit today's possession.
   const current=info&&Number(info.week)===week;
   const glow=fresh&&current?hjPossessionGlow(states.get(hjPossessionTeam(team)),position):'';
   if(glow){if(avatar.dataset.hjPossession!==glow)avatar.dataset.hjPossession=glow;}
   else if(avatar.hasAttribute('data-hj-possession'))avatar.removeAttribute('data-hj-possession');
  });
 }
 function queue(){if(!frame)frame=requestAnimationFrame(apply);}
 window.hjUpdateLivePossession=(data,period)=>{
  states=hjPossessionStates(data);week=Number(period.week);season=Number(period.season);at=Date.now();
  clearTimeout(expiry);expiry=setTimeout(queue,75050);queue();
 };
 // Observe inserted rows only; styling updates do not retrigger the observer.
 const observer=new MutationObserver(records=>{
  if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches(selector)||n.querySelector(selector)))))queue();
 });
 observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('visibilitychange',queue);
 document.addEventListener('hj:game-ranks-updated',queue);
})();
