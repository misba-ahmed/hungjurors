/* One owner for matchup paging and height; never resize the rail mid-swipe. */
(function(){
 const root=document.querySelector('#league-hq');if(!root)return;
 const states=new WeakMap(),cards=deck=>Array.from(deck.children).filter(el=>el.matches('.hq-matchup'));
 // A nested rail owns the entire gesture, including swipes at either end.
 // Do not turn its touchend into a request to change the matchup.

 let slideCleanup=null;
 function finishSlide(){if(slideCleanup){slideCleanup();slideCleanup=null;}}
 function slideSwap(node,container,change,incoming,direction,startX=0){
  finishSlide();
  if(!node||!container||matchMedia('(prefers-reduced-motion: reduce)').matches){change();return Promise.resolve();}
  const rect=node.getBoundingClientRect(),bounds=container.getBoundingClientRect();
  if(!rect.width){change();return Promise.resolve();}
  const layer=document.createElement('div'),copy=node.cloneNode(true);
  layer.dataset.hjSwipeOverlay='';layer.setAttribute('aria-hidden','true');layer.inert=true;
  layer.style.cssText='position:absolute;pointer-events:none;overflow:clip;z-index:4;left:'+(rect.left-bounds.left+container.scrollLeft)+'px;top:'+(rect.top-bounds.top+container.scrollTop)+'px;width:'+rect.width+'px;height:'+rect.height+'px;';
  copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
  copy.style.cssText+=';margin:0!important;width:'+rect.width+'px!important;max-width:none!important;translate:none!important;';
  if(getComputedStyle(container).position==='static')container.style.position='relative';
  layer.append(copy);container.append(layer);
  change();
  const next=incoming(),options={duration:260,easing:'cubic-bezier(.2,.75,.2,1)'};
  const a=copy.animate([{transform:'translateX('+startX+'px)'},{transform:'translateX('+(-direction*rect.width)+'px)'}],options);
  const b=next?.animate([{transform:'translateX('+(direction*rect.width+startX)+'px)'},{transform:'translateX(0px)'}],options);
  let done=false;
  return new Promise(resolve=>{
   const cleanup=()=>{if(done)return;done=true;a.cancel();b?.cancel();layer.remove();if(slideCleanup===cleanup)slideCleanup=null;resolve();};
   slideCleanup=cleanup;Promise.allSettled([a.finished,b?.finished]).then(cleanup);
  });
 }

 function nestedRail(target,deck){
  for(let node=target?.nodeType===1?target:target?.parentElement;node&&node!==deck;node=node.parentElement){
   if(node.matches('.hq-edge-grid,.hq-swing-rail'))return node;
   if(node.scrollWidth>node.clientWidth+1&&/^(auto|scroll)$/.test(getComputedStyle(node).overflowX))return node;
  }
  return null;
 }
 const offset=(deck,card)=>card.getBoundingClientRect().left-deck.getBoundingClientRect().left-deck.clientLeft+deck.scrollLeft;
 const clamp=(deck,index)=>Math.max(0,Math.min(cards(deck).length-1,index));
 const nearest=deck=>cards(deck).reduce((best,card,index)=>{
  const distance=Math.abs(offset(deck,card)-deck.scrollLeft);return distance<best.distance?{index,distance}:best;
 },{index:0,distance:Infinity}).index;
 function choose(deck,index){
  const card=cards(deck)[index];if(!card)return;
  const key=card.dataset.hqMatchupKey;HJ_HQ_STATE.matchupFocusKey=key;
  root.querySelectorAll('#hq-panel-matchups [data-hq-matchup-jump]').forEach(b=>{
   const selected=b.dataset.hqMatchupJump===key;
   b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));
  });
  hjCenterMatchupJumpChipV32(key);
 }
 function fit(deck,index){
  if(typeof hjFitStarterSpace==='function')hjFitStarterSpace();
  const card=cards(deck)[index];if(!card||!deck.clientWidth)return;
  const style=getComputedStyle(deck),height=Math.ceil(card.getBoundingClientRect().height+
   (parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0)+deck.offsetHeight-deck.clientHeight)+'px';
  deck.setAttribute('data-hj-fit-height','');
  if(deck.style.getPropertyValue('--hj-matchup-height')!==height)deck.style.setProperty('--hj-matchup-height',height);
 }
 function settle(deck){
  const s=states.get(deck);if(!s||s.touch||s.sliding||!deck.isConnected)return;
  clearTimeout(s.timer);
  const index=clamp(deck,s.target??nearest(deck)),card=cards(deck)[index];if(!card)return;
  const left=offset(deck,card);
  s.moving=false;s.target=null;
  if(Math.abs(deck.scrollLeft-left)>.5)deck.scrollTo({left,behavior:'instant'});
  choose(deck,index);fit(deck,index);
 }
 function later(deck){
  const s=states.get(deck);clearTimeout(s.timer);s.timer=setTimeout(()=>settle(deck),180);
 }
 function go(deck,index,animate=false,startX=0){
  const count=cards(deck).length;if(!count)return;
  const wrapped=((index%count)+count)%count,wraps=wrapped!==index;
  const s=states.get(deck),card=cards(deck)[wrapped];if(!s||!card)return;
  const previous=cards(deck)[nearest(deck)];
  s.target=wrapped;s.moving=true;choose(deck,wrapped);
  if(wraps&&animate){
   s.sliding=true;
   void slideSwap(previous,deck.parentElement,()=>deck.scrollTo({left:offset(deck,card),behavior:'instant'}),()=>card,index<0?-1:1,startX).then(()=>{
    s.sliding=false;s.target=wrapped;settle(deck);
   });
   return;
  }
  deck.scrollTo({left:offset(deck,card),behavior:animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});
  later(deck);
 }
 function install(){
  root.querySelectorAll('#hq-panel-matchups .hq-matchup-list').forEach(deck=>{
   if(!deck.clientWidth)return;
   let s=states.get(deck);
   if(s){if(!s.moving&&!s.touch&&!s.sliding)fit(deck,nearest(deck));return}
   s={width:deck.clientWidth,timer:0,moving:false,touch:null,target:null,observed:new Set()};states.set(deck,s);
   deck.tabIndex=0;deck.setAttribute('aria-label','Matchups. Swipe left or right.');
   deck.addEventListener('scroll',()=>{s.moving=true;later(deck)},{passive:true});
   deck.addEventListener('scrollend',()=>settle(deck));
   deck.addEventListener('touchstart',event=>{
    finishSlide();if(s.touch)cards(deck)[s.touch.index]?.style.removeProperty('translate');
    const nested=nestedRail(event.target,deck);
    if(event.touches.length!==1||zoomed()||nested){
     if(nested)nested.style.overscrollBehaviorX='contain';
     s.touch=null;s.target=null;return;
    }
    const t=event.touches[0];s.touch={x:t.clientX,y:t.clientY,index:nearest(deck),axis:'',dx:0};s.target=null;
   },{passive:true});
   deck.addEventListener('touchmove',event=>{
    const start=s.touch;if(!start)return;
    if(event.touches.length!==1||zoomed()){cards(deck)[start.index]?.style.removeProperty('translate');s.touch=null;return;}
    const t=event.touches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;
    if(!start.axis&&Math.hypot(dx,dy)>10)start.axis=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';
    const edge=start.index===0&&dx>0||start.index===cards(deck).length-1&&dx<0;
    if(start.axis==='x'&&edge){
     if(event.cancelable)event.preventDefault();
     start.dx=dx;cards(deck)[start.index].style.translate=dx+'px 0';
    }
   },{passive:false});
   deck.addEventListener('touchend',event=>{
    const start=s.touch,t=event.changedTouches[0];s.touch=null;if(!start||!t)return;
    cards(deck)[start.index]?.style.removeProperty('translate');
    const dx=t.clientX-start.x,dy=t.clientY-start.y;
    if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>24)go(deck,start.index+(dx<0?1:-1),true,start.dx||0);
    else later(deck);
   },{passive:true});
   deck.addEventListener('touchcancel',()=>{if(s.touch)cards(deck)[s.touch.index]?.style.removeProperty('translate');s.touch=null;s.target=null;later(deck)},{passive:true});
   deck.addEventListener('keydown',event=>{
    if(event.target!==deck||!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();go(deck,nearest(deck)+(event.key==='ArrowRight'?1:-1),true);
   });
   const observer=new ResizeObserver(()=>{
    if(!deck.isConnected){observer.disconnect();return}
    if(!deck.clientWidth)return;
    if(Math.abs(s.width-deck.clientWidth)>1){
     s.width=deck.clientWidth;go(deck,Math.max(0,cards(deck).findIndex(c=>c.dataset.hqMatchupKey===HJ_HQ_STATE.matchupFocusKey)));
    }else if(!s.moving&&!s.touch)fit(deck,nearest(deck));
   });
   observer.observe(deck);cards(deck).forEach(card=>observer.observe(card));
   go(deck,Math.max(0,cards(deck).findIndex(c=>c.dataset.hqMatchupKey===HJ_HQ_STATE.matchupFocusKey)));
  });
 }
 window.addEventListener('click',event=>{
  const button=event.target.closest?.('#hq-panel-matchups [data-hq-matchup-jump]');if(!button)return;
  const deck=root.querySelector('#hq-panel-matchups .hq-matchup-list');if(!deck)return;
  const index=cards(deck).findIndex(c=>c.dataset.hqMatchupKey===button.dataset.hqMatchupJump);if(index<0)return;
  event.preventDefault();event.stopImmediatePropagation();install();go(deck,index,true);
 },true);

 // Roster content swipes use the existing manager selector so every roster view
 // shares one selected manager. Player showcases and nested rails own their gestures.
 let rosterTouch=null,rosterClickUntil=0;
 const rosterPanel=target=>target?.closest?.('#league-sync-content');
 const rosterTabs=panel=>Array.from(panel.querySelectorAll('[data-league-team]'));
 const zoomed=()=>window.visualViewport&&window.visualViewport.scale>1.01;
 root.addEventListener('touchstart',event=>{
  finishSlide();if(rosterTouch?.view)rosterTouch.view.style.removeProperty('translate');rosterTouch=null;
  const panel=rosterPanel(event.target);
  if(!panel||event.touches.length!==1||zoomed()||
   event.target.closest('input,select,textarea,[contenteditable],.hj-team-photo,[data-league-team]')||
   nestedRail(event.target,panel))return;
  const tabs=rosterTabs(panel);if(tabs.length<2)return;
  const index=tabs.findIndex(b=>b.classList.contains('active')||b.getAttribute('aria-selected')==='true');
  if(index<0)return;
  const t=event.touches[0];rosterTouch={panel,index,x:t.clientX,y:t.clientY,axis:'',view:panel.querySelector('.league-team-view'),dx:0};
 },{passive:true});
 root.addEventListener('touchmove',event=>{
  if(!rosterTouch)return;
  if(event.touches.length!==1||zoomed()){rosterTouch.view?.style.removeProperty('translate');rosterTouch=null;return;}
  const t=event.touches[0],dx=t.clientX-rosterTouch.x,dy=t.clientY-rosterTouch.y;
  if(!rosterTouch.axis&&Math.hypot(dx,dy)>10)rosterTouch.axis=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';
  if(rosterTouch.axis==='y'){rosterTouch.view?.style.removeProperty('translate');rosterTouch=null;return;}
  if(rosterTouch.axis==='x'){if(event.cancelable)event.preventDefault();rosterTouch.dx=dx;if(rosterTouch.view)rosterTouch.view.style.translate=dx+'px 0';}
 },{passive:false});
 root.addEventListener('touchend',event=>{
  const start=rosterTouch;rosterTouch=null;
  start?.view?.style.removeProperty('translate');
  if(!start||event.touches.length||zoomed())return;
  const t=event.changedTouches[0];if(!t)return;
  const dx=t.clientX-start.x,dy=t.clientY-start.y;
  if(Math.abs(dx)<=24||Math.abs(dx)<=Math.abs(dy)*1.15)return;
  const tabs=rosterTabs(start.panel);if(tabs.length<2)return;
  const next=(start.index+(dx<0?1:-1)+tabs.length)%tabs.length;
  // Suppress only the physical click that can follow a swipe, not this selection.
  void slideSwap(start.view,start.panel,()=>tabs[next].click(),()=>start.panel.querySelector('.league-team-view'),dx<0?1:-1,start.dx||0);rosterClickUntil=Date.now()+500;
 },{passive:true});
 root.addEventListener('touchcancel',()=>{rosterTouch?.view?.style.removeProperty('translate');rosterTouch=null;},{passive:true});
 root.addEventListener('click',event=>{
  if(event.isTrusted&&Date.now()<rosterClickUntil&&rosterPanel(event.target)){
   event.preventDefault();event.stopImmediatePropagation();
  }
 },true);

 let queued=false;const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;install()})}};
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
 root.addEventListener('toggle',schedule,true);
 window.addEventListener('resize',schedule);install();
})();
