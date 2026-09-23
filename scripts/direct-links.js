/* Shareable destinations; tab selection also updates the address bar. */
function hjDirectRoute(hash){
 let slug;try{slug=decodeURIComponent(hash.replace(/^#/,''))}catch(_){return null}
 const records={"legacy":["most-championships","most-regular-season-wins","most-playoff-appearances","most-podium-finishes"],"regular":["best-regular-season","best-weekly-scoring-season","longest-winning-streak","longest-losing-streak"],"scoring":["highest-score","highest-score-in-a-loss","lowest-score-in-a-win","closest-game","biggest-blowout","highest-combined-score"],"playoffs":["highest-playoff-score","highest-combined-playoff-game","closest-championship","biggest-championship-win"]};
 const record=slug.match(/^record-book\/([a-z-]+)$/);
 if(record){const category=Object.keys(records).find(key=>records[key].includes(record[1]));return category?{slug,target:'record-book-fold',fold:true,category,record:record[1]}:null}
 const hq={rosters:'rosters',matchups:'matchups',players:'free-agents','roster-strength':'strength',activity:'activity','weekly-recap':'recap'};
 const folds={'past-seasons':'champions-fold','record-book':'record-book-fold',awards:'league-awards-fold','record-book-fold':'record-book-fold'};
 if(Object.hasOwn(hq,slug))return {slug,tab:hq[slug],target:'league-hq'};
 if(['raffle','lms','titty','overachiever','mvp','optimizer'].includes(slug))return {slug,challenge:slug,target:'challenges'};
 if(Object.hasOwn(folds,slug))return {slug,target:folds[slug],fold:true};
 return null;
}
(function(){
 let applying=false,pending=null,frame=0;
 const hqSlug={rosters:'rosters',matchups:'matchups','free-agents':'players',strength:'roster-strength',activity:'activity',recap:'weekly-recap'};
 function address(slug){if(!applying&&location.hash!=='#'+slug)history.pushState(null,'','#'+slug)}
 function scroll(route){
  let target=document.getElementById(route.target);if(!target)return;
  if(route.fold)target.open=true;
  if(route.record){
   const tab=document.querySelector('#record-tabs [data-record-category="'+route.category+'"]');
   if(tab?.getAttribute('aria-selected')!=='true')tab?.click();
   target=document.getElementById('record-'+route.record)||target;
   target.focus?.({preventScroll:true});
  }
  const nav=document.querySelector('nav'),offset=(nav?.getBoundingClientRect().height||0)+12;
  window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+window.scrollY-offset),behavior:'instant'});
  const tab=route.tab?document.querySelector('[data-hq-tab="'+route.tab+'"]'):route.challenge?document.querySelector('#challenge-strip [data-challenge="'+route.challenge+'"]'):null;
  if(tab){const rail=tab.parentElement;rail?.scrollTo({left:Math.max(0,tab.offsetLeft-(rail.clientWidth-tab.offsetWidth)/2),behavior:'instant'})}
 }
 const setTab=hjSetHQTab;
 hjSetHQTab=function(tab){const result=setTab.apply(this,arguments);if(hqSlug[tab])address(hqSlug[tab]);return result};
 const setChallenge=selectChallenge;
 selectChallenge=function(id){const result=setChallenge.apply(this,arguments);if(hjDirectRoute('#'+id)?.challenge)address(id);return result};
 function apply(){
  const route=hjDirectRoute(location.hash);pending=null;if(!route)return;
  applying=true;
  try{if(route.tab)hjSetHQTab(route.tab);if(route.challenge)selectChallenge(route.challenge)}
  finally{applying=false}
  pending=route;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(pending)scroll(pending)});
 }
 // ESPN creates tab panels asynchronously; finish the initial jump after that render.
 const render=hjRenderLeague;
 hjRenderLeague=function(){const result=render.apply(this,arguments);if(pending){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(pending)scroll(pending)})}return result};
 const cancel=()=>{pending=null};
 for(const event of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(event,cancel,{passive:true});
 document.addEventListener('hj:records',()=>{if(pending?.record){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(pending)scroll(pending)})}});
 window.addEventListener('hashchange',apply);
 window.addEventListener('popstate',apply);
 document.addEventListener('click',event=>{
  const a=event.target.closest?.('a[href]');if(!a||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||a.target==='_blank')return;
  const url=new URL(a.href,location.href);
  if(url.origin===location.origin&&url.pathname===location.pathname&&url.search===location.search&&hjDirectRoute(url.hash)){
   event.preventDefault();if(location.hash!==url.hash)history.pushState(null,'',url.hash);apply();
  }
 });
 // Folding a history panel gives it the requested short address as well.
 for(const [slug,id] of Object.entries({'past-seasons':'champions-fold','record-book':'record-book-fold',awards:'league-awards-fold'})){
  document.querySelector('#'+id+' > summary')?.addEventListener('click',()=>address(slug));
 }
 apply();
 window.addEventListener('load',()=>{if(pending)scroll(pending)},{once:true});
})();
