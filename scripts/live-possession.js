/* One shared possession snapshot from the existing live NFL scoreboard refresh. */
async function hjFetchPossessionScoreboard(url){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(url,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});
  if(!response.ok)throw new Error(`ESPN ${response.status}`);
  return await response.json();
 }finally{clearTimeout(timeout);}
}
function hjPossessionTeam(value){const key=String(value||'').trim().toUpperCase();return ({WAS:'WSH',JAC:'JAX',LA:'LAR'})[key]||key;}
// Keep the last confirmed possession briefly when ESPN omits situation data.
const HJ_POSSESSION_MAX_AGE=180000;
function hjPossessionStates(data,previous=new Map(),now=Date.now()){
 const states=new Map([...previous].filter(([,s])=>now-s.confirmedAt<HJ_POSSESSION_MAX_AGE));
 for(const event of data?.events||[]){
  const comp=event.competitions?.[0],status=comp?.status?.type||event.status?.type,s=comp?.situation;
  const teams=comp?.competitors||[];
  if(status?.completed||status?.state==='post'||status?.state==='pre'||/HALFTIME|SUSPEND|DELAY|CANCEL/i.test(status?.name||'')){
   for(const t of teams)states.delete(hjPossessionTeam(t.team?.abbreviation));
   continue;
  }
  // A quarter break or incomplete update does not confirm a possession change.
  if(status?.state!=='in'||/END_PERIOD/i.test(status.name||'')||!s)continue;
  const owner=String(s.possession?.id??s.possession??'');
  if(!owner||!teams.some(t=>String(t.team?.id)===owner))continue;
  for(const t of teams){
   const key=hjPossessionTeam(t.team.abbreviation),offense=String(t.team.id)===owner,old=states.get(key);
   const red=offense&&(typeof s.isRedZone==='boolean'?s.isRedZone:!!(old?.offense&&old.red));
   states.set(key,{offense,red,confirmedAt:now});
  }
 }
 return states;
}
function hjPossessionGlow(state,position){
 if(!state)return '';
 const defense=['DST','D/ST','DEF'].includes(String(position).toUpperCase());
 return defense?(!state.offense?'green':''):state.offense?(state.red?'red':'green'):'';
}
(function(){
 let states=new Map(),week=0,season=0,expiry=0,frame=0;
 const selector='.hj-player-v3,.hj-player-v2,.league-player,.hq-lineup-player';
 const skin=document.createElement('style');skin.textContent='[data-hj-possession="green"]{outline:1.5px solid #2bbf70!important;outline-offset:0.5px;box-shadow:0 0 3.5px 1px #2bbf7070!important;border-radius:50%!important}[data-hj-possession="red"]{outline:1.5px solid #ee4444!important;outline-offset:0.5px;box-shadow:0 0 3.5px 1px #ee444470!important;border-radius:50%!important}';document.head.append(skin);
 function apply(){
  frame=0;
  const now=Date.now();
  for(const [key,state] of states)if(now-state.confirmedAt>=HJ_POSSESSION_MAX_AGE)states.delete(key);
  clearTimeout(expiry);
  if(states.size)expiry=setTimeout(queue,Math.max(1,Math.min(...[...states.values()].map(s=>s.confirmedAt+HJ_POSSESSION_MAX_AGE-now))+25));
  const fresh=season===Number(NFL_SEASON);
  document.querySelectorAll(selector).forEach(row=>{
   const avatar=row.querySelector('.hj-v3-avatar,.hj-player-v2-avatar')||row.querySelector('img');if(!avatar)return;
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
  const nextWeek=Number(period.week),nextSeason=Number(period.season);
  states=hjPossessionStates(data,nextWeek===week&&nextSeason===season?states:new Map());
  week=nextWeek;season=nextSeason;queue();
 };
 // Refresh inserted/rebuilt player content and identity changes, without observing our ring attribute.
 const observer=new MutationObserver(records=>{
  if(records.some(r=>r.target.closest?.(selector)||[...r.addedNodes].some(n=>n.nodeType===1&&(n.closest(selector)||n.querySelector(selector)))))queue();
 });
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-pc-team','data-pc-position','data-hj-game-player']});
 document.addEventListener('visibilitychange',queue);
 document.addEventListener('hj:game-ranks-updated',queue);
})();

