/* Live redraw layout guard.
   The ESPN sync redraws League HQ, Standings, the Wire, the schedule and the Season Challenges every 15–60 seconds.
   Each redraw swaps a section's markup; for a frame or two the new markup can be shorter than the old (images decoding,
   a two-step render), so everything below jumps up and then back down. This holds each live section at its current
   height while it redraws and releases the hold once the new content has painted, so the page never twitches. */
(function(){
 const LIVE=['#league-sync-content','#league-hq-tools','#standings-out','#challenge-out','#wire','#schedule-out'];
 let depth=0,release=0;
 function hold(run){
  if(depth++){try{return run()}finally{depth--}}
  const held=[];
  for(const sel of LIVE){const node=document.querySelector(sel);if(!node)continue;const h=node.getBoundingClientRect().height;if(h>0){node.style.minHeight=h+'px';held.push(node)}}
  const ticket=++release;
  try{return run()}
  finally{
   depth--;
   requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>{if(ticket!==release)return;held.forEach(n=>{n.style.minHeight=''})},320)));
  }
 }
 function guard(name){
  const fn=window[name];if(typeof fn!=='function'||fn.__hjGuarded)return;
  const wrapped=function(...args){return hold(()=>fn.apply(this,args))};
  wrapped.__hjGuarded=true;window[name]=wrapped;
 }
 ['hjRenderLeague','hjApplyLiveSeason','renderStandingsDashboard','renderLeagueSchedule','hjRenderChallenge','wireRender','hjRenderMatchupCenter','hjRenderLeagueTools'].forEach(guard);
 window.hjHoldLayout=hold;
})();
