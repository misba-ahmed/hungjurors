/* Hold live sections through their render frame without leaving stale height locks. */
(function(){
 const LIVE=['#league-sync-content','#league-hq-tools','#standings-out','#challenge-out','#wire','#schedule-out'];
 const held=new Map();let depth=0,release=0;
 function hold(run){
  if(depth++){try{return run()}finally{depth--}}
  for(const sel of LIVE){
   const node=document.querySelector(sel);if(!node)continue;
   const height=node.getBoundingClientRect().height;
   if(height>0&&!held.has(node)){
    held.set(node,[node.style.getPropertyValue('min-height'),node.style.getPropertyPriority('min-height')]);
    node.style.minHeight=height+'px';
   }
  }
  const ticket=++release;
  try{return run()}finally{
   depth--;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(ticket!==release)return;
    for(const [node,[value,priority]] of held){
     if(value)node.style.setProperty('min-height',value,priority);else node.style.removeProperty('min-height');
    }
    held.clear();
   }));
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
