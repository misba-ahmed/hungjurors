/* A temporary native scroll rail for views that normally render one page.
 * Trackpad deltas move scrollLeft pixel-for-pixel; only idle scrolls settle.
 * The live DOM stays in place until selection commits, preserving its controls.
 */
function hjTrackpadScroll({root,nodes,index,count,render,commit}){
 const first=nodes[0],last=nodes[nodes.length-1];
 if(!first||!last||count<2)return null;
 const box=first.getBoundingClientRect(),end=last.getBoundingClientRect(),bounds=root.getBoundingClientRect();
 const width=box.width;if(!width)return null;
 const position=root.style.position;if(getComputedStyle(root).position==='static')root.style.position='relative';
 const rail=document.createElement('div');rail.dataset.hjWheelScroll='';rail.setAttribute('aria-hidden','true');rail.inert=true;
 rail.style.cssText=`position:absolute;left:${box.left-bounds.left+root.scrollLeft-root.clientLeft}px;top:${box.top-bounds.top+root.scrollTop-root.clientTop}px;width:${width}px;height:${end.bottom-box.top}px;display:flex;align-items:flex-start;overflow-x:scroll;overflow-y:hidden;scrollbar-width:none;scroll-behavior:auto;overscroll-behavior-x:contain;pointer-events:none;z-index:5;`;
 const original=index,opacity=nodes.map(n=>n.style.opacity),pages=new Map();
 let current=index,timer=0,frame=0,closed=false;
 const wrap=n=>(n%count+count)%count;
 function clean(node){
  if(node.id==='challenge-out')node.classList.add('hj-wheel-challenge-out');
  node.removeAttribute('id');node.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
  node.querySelectorAll('img').forEach(n=>{n.loading='eager';});
  node.style.removeProperty('opacity');return node;
 }
 const saved=document.createElement('div');
 nodes.forEach((node,i)=>{const copy=clean(node.cloneNode(true));if(i)copy.style.marginTop=(node.getBoundingClientRect().top-nodes[i-1].getBoundingClientRect().bottom)+'px';saved.append(copy);});
 pages.set(original,saved);
 function page(i){
  if(!pages.has(i))pages.set(i,render(i));
  const source=pages.get(i),p=document.createElement('div');
  p.dataset.hjWheelPage=String(i);p.style.cssText=`flex:0 0 ${width}px;width:${width}px;min-width:0;box-sizing:border-box;overflow:clip;`;
  p.append(clean(source.cloneNode(true)));return p;
 }
 function refill(){rail.replaceChildren(page(wrap(current-1)),page(current),page(wrap(current+1)));}
 refill();root.append(rail);rail.scrollLeft=width;nodes.forEach(n=>n.style.opacity='0');
 function cleanup(){
  if(closed)return;closed=true;clearTimeout(timer);cancelAnimationFrame(frame);
  nodes.forEach((n,i)=>{if(n.style.opacity==='0')n.style.opacity=opacity[i];});
  rail.remove();root.style.position=position;
 }
 function finish(){const selected=current;cleanup();if(selected!==original)commit(selected);}
 function settle(){
  if(closed)return;
  const target=Math.round(rail.scrollLeft/width)*width,start=rail.scrollLeft;
  const direction=Math.round(target/width)-1;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||Math.abs(target-start)<.5){current=wrap(current+direction);finish();return;}
  const time=performance.now();
  const tick=now=>{
   const t=Math.min(1,(now-time)/220),ease=1-Math.pow(1-t,3);rail.scrollLeft=start+(target-start)*ease;
   if(t<1)frame=requestAnimationFrame(tick);else{current=wrap(current+direction);finish();}
  };frame=requestAnimationFrame(tick);
 }
 return {
  move(dx){
   if(closed||!root.isConnected||!first.isConnected||!rail.isConnected){cleanup();return false;}
   clearTimeout(timer);cancelAnimationFrame(frame);
   let left=rail.scrollLeft+dx;
   // Recycle only at whole-page boundaries, preserving the exact residual offset.
   while(left>=width*2){current=wrap(current+1);left-=width;refill();}
   while(left<0){current=wrap(current-1);left+=width;refill();}
   rail.scrollLeft=left;timer=setTimeout(settle,180);return true;
  },
  cancel:cleanup,
  get active(){return !closed;}
 };
}

/* External matchup links always land on the scorecard top, never the lineup center. */
function hjScrollMatchupStart(card){
 const key=typeof card==='string'?card:card?.dataset.hqMatchupKey;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(HJ_HQ_STATE.activeTab!=='matchups')return;
  const target=key?[...document.querySelectorAll('#hq-panel-matchups .hq-matchup[data-hq-matchup-key]')].find(el=>el.dataset.hqMatchupKey===key):card;
  if(!target?.isConnected)return;
  const deck=target.closest('.hq-matchup-list');
  if(deck){
   if(key)HJ_HQ_STATE.matchupFocusKey=key;
   deck.scrollTo({left:deck.scrollLeft+target.getBoundingClientRect().left-deck.getBoundingClientRect().left-deck.clientLeft,behavior:'instant'});
   deck.scrollTop=0;
  }
  const height=selector=>{const el=document.querySelector(selector);return el?.getClientRects().length?el.getBoundingClientRect().height:0;};
  const inset=height('body > nav')+height('.hj-folder-dock')+height('#hq-panel-matchups .hq-matchup-switcher-shell')+8;
  const top=Math.max(0,window.scrollY+target.getBoundingClientRect().top-inset);
  window.scrollTo({top,behavior:'instant'});
 }));
}
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
  const s=states.get(deck);if(!s||s.touch||s.sliding||s.wheeling||!deck.isConnected)return;
  clearTimeout(s.timer);
  const index=clamp(deck,s.target??nearest(deck)),card=cards(deck)[index];if(!card)return;
  const left=offset(deck,card);
  s.moving=false;s.target=null;
  // Native scrolling/snap owns user scroll position; only explicit navigation
  // has a target. Never jump the rail to a rounded page in a scroll callback.
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
   deck.addEventListener('wheel',event=>{
    if(event.ctrlKey||zoomed()||nestedRail(event.target,deck))return;
    if(Math.abs(event.deltaX)<=Math.abs(event.deltaY)*1.15)return;
    // Clear stale button/touch targets but let the browser perform the scroll.
    s.target=null;s.wheeling=true;clearTimeout(s.wheelTimer);clearTimeout(s.timer);
    s.wheelTimer=setTimeout(()=>{s.wheeling=false;later(deck);},220);
   },{passive:true});
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

 // A desktop gesture physically scrolls a three-page rail, including reversals
 // and momentum. It selects a manager only after the rail settles.
 let rosterWheel=null,rosterScroll=null;
 const cancelRosterScroll=()=>{rosterScroll?.cancel();rosterScroll=null;rosterWheel=null;};
 root.addEventListener('wheel',event=>{
  const now=Date.now(),panel=rosterPanel(event.target);
  if(!panel)return;
  if(event.ctrlKey||zoomed()){cancelRosterScroll();return;}
  const fresh=!rosterWheel||now-rosterWheel.last>220;
  if(fresh)rosterWheel={last:now,axis:'',blocked:!!rosterTouch||!!event.target.closest('input,select,textarea,[contenteditable],.hj-team-photo,[data-league-team]')||!!nestedRail(event.target,panel)};
  const gesture=rosterWheel;gesture.last=now;if(gesture.blocked)return;
  const scale=event.deltaMode===1?16:event.deltaMode===2?panel.clientWidth:1;
  const dx=event.deltaX*scale,dy=event.deltaY*scale;
  if(!gesture.axis&&Math.hypot(dx,dy)>2)gesture.axis=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';
  if(gesture.axis!=='x')return;
  if(!rosterScroll?.active){
   const tabs=rosterTabs(panel),index=tabs.findIndex(b=>b.classList.contains('active')||b.getAttribute('aria-selected')==='true');
   if(index<0||tabs.length<2||typeof hjTeamViewHTML!=='function')return;
   const data=HJ_LEAGUE_STATE.data,teams=tabs.map(b=>data.teams.find(t=>String(t.id)===b.dataset.leagueTeam));
   if(teams.some(t=>!t))return;
   finishSlide();
   rosterScroll=hjTrackpadScroll({root:panel,nodes:[panel.querySelector('.league-team-view')],index,count:tabs.length,
    render:i=>{const view=document.createElement('div');view.className='league-team-view';view.innerHTML=hjTeamViewHTML(teams[i],data);return view;},
    commit:i=>{rosterTabs(panel).find(b=>b.dataset.leagueTeam===String(teams[i].id))?.click();}});
  }
  if(rosterScroll){if(event.cancelable)event.preventDefault();rosterScroll.move(dx);}
 },{passive:false});
 root.addEventListener('touchstart',cancelRosterScroll,{passive:true});
 root.addEventListener('click',cancelRosterScroll,true);
 window.addEventListener('resize',cancelRosterScroll);

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
