/* Matchups, rosters and challenges share one persistent native scroll controller.
 * Native touch scrolling and the original matchup wheel/snap behavior own motion.
 * Only the selected page determines height; wrappers add no spacing.
 */
function hjSectionRail(deck,options){
 const zoomed=()=>window.visualViewport&&window.visualViewport.scale>1.01;
 const states=new WeakMap(),cards=()=>Array.from(deck.children);
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
   if(options.exclude?.(node)||node.matches('.hq-edge-grid,.hq-swing-rail'))return node;
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
  const state=states.get(deck),changed=state?.selected!==index;if(state)state.selected=index;
  if(changed)options.choose(index);
  if(options.inert)cards(deck).forEach((card,i)=>{const hidden=i!==index;if(card.inert!==hidden)card.inert=hidden;if(card.getAttribute('aria-hidden')!==String(hidden))card.setAttribute('aria-hidden',String(hidden));});
 }
 function fit(deck,index){
  if(zoomed())return;
  options.beforeFit?.();
  const card=cards(deck)[index];if(!card||!deck.clientWidth)return;
  const style=getComputedStyle(deck),height=Math.ceil(card.getBoundingClientRect().height+
   (parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0)+deck.offsetHeight-deck.clientHeight)+'px';
  if(!deck.hasAttribute('data-hj-fit-height'))deck.setAttribute('data-hj-fit-height','');
  if(deck.style.getPropertyValue(options.heightProperty||'--hj-section-height')!==height)deck.style.setProperty(options.heightProperty||'--hj-section-height',height);
 }
 function settle(deck){
  const s=states.get(deck);if(!s||s.touch||s.sliding||s.wheeling||!deck.isConnected)return;
  clearTimeout(s.timer);
  const index=clamp(deck,s.target??nearest(deck)),card=cards(deck)[index];if(!card)return;
  const left=offset(deck,card);
  s.moving=false;s.target=null;
  // Native scrolling/snap owns user scroll position; only explicit navigation
  // has a target. Never jump the rail to a rounded page in a scroll callback.
  choose(deck,index);options.settled?.(index);fit(deck,index);
 }
 function later(deck){
  const s=states.get(deck);clearTimeout(s.timer);s.timer=setTimeout(()=>settle(deck),180);
 }
 function stopWheel(deck,s){
  clearTimeout(s.wheelTimer);cancelAnimationFrame(s.wheelFrame);
  if(s.wheeling){
   for(const [name,value] of [['scroll-snap-type',s.wheelSnap],['scroll-behavior',s.wheelBehavior]]){
    if(value?.[0])deck.style.setProperty(name,value[0],value[1]);else deck.style.removeProperty(name);
   }
  }
  s.wheeling=false;
 }
 function go(deck,index,animate=false,startX=0){
  const count=cards(deck).length;if(!count)return;
  const wrapped=((index%count)+count)%count,wraps=wrapped!==index;
  const s=states.get(deck),card=cards(deck)[wrapped];if(!s||!card)return;stopWheel(deck,s);
  options.prepare?.(wrapped);
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
  {
   if(!deck.clientWidth)return;
   let s=states.get(deck);
   if(s){if(!s.moving&&!s.touch&&!s.sliding)fit(deck,nearest(deck));return}
   s={width:deck.clientWidth,timer:0,moving:false,touch:null,target:null,observed:new Set()};states.set(deck,s);
   deck.tabIndex=0;deck.setAttribute('aria-label',options.label+' Swipe left or right.');
   deck.addEventListener('scroll',()=>{s.moving=true;options.prepare?.(nearest(deck));later(deck)},{passive:true});
   deck.addEventListener('scrollend',()=>settle(deck));
   deck.addEventListener('wheel',event=>{
    if(event.ctrlKey||zoomed()||nestedRail(event.target,deck))return;
    if(Math.abs(event.deltaX)<=Math.abs(event.deltaY)*1.15)return;
    if(event.cancelable)event.preventDefault();
    s.target=null;clearTimeout(s.wheelTimer);clearTimeout(s.timer);cancelAnimationFrame(s.wheelFrame);
    if(!s.wheeling){
     s.wheelSnap=[deck.style.getPropertyValue('scroll-snap-type'),deck.style.getPropertyPriority('scroll-snap-type')];
     s.wheelBehavior=[deck.style.getPropertyValue('scroll-behavior'),deck.style.getPropertyPriority('scroll-behavior')];
     deck.style.setProperty('scroll-snap-type','none','important');deck.style.setProperty('scroll-behavior','auto','important');
    }
    s.wheeling=true;s.moving=true;
    const scale=event.deltaMode===1?16:event.deltaMode===2?deck.clientWidth:1;
    deck.scrollLeft+=event.deltaX*scale;
    s.wheelTimer=setTimeout(()=>{
     const index=nearest(deck),start=deck.scrollLeft,left=offset(deck,cards(deck)[index]),time=performance.now();
     const done=()=>{stopWheel(deck,s);choose(deck,index);options.settled?.(index);fit(deck,index);s.moving=false;};
     if(matchMedia('(prefers-reduced-motion: reduce)').matches){deck.scrollLeft=left;done();return;}
     const tick=now=>{
      const t=Math.min(1,(now-time)/220);deck.scrollLeft=start+(left-start)*(1-Math.pow(1-t,3));
      if(t<1)s.wheelFrame=requestAnimationFrame(tick);else done();
     };s.wheelFrame=requestAnimationFrame(tick);
    },180);
   },{passive:false});
   deck.addEventListener('touchstart',event=>{
    stopWheel(deck,s);finishSlide();if(s.touch)cards(deck)[s.touch.index]?.style.removeProperty('translate');
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
   let resizeFrame=0;
   const observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{
    if(!deck.isConnected){observer.disconnect();stopWheel(deck,s);clearTimeout(s.timer);finishSlide();return}
    if(!deck.clientWidth||zoomed())return;
    if(Math.abs(s.width-deck.clientWidth)>1){
     s.width=deck.clientWidth;if(s.touch)cards(deck)[s.touch.index]?.style.removeProperty('translate');s.touch=null;finishSlide();go(deck,options.selected());
    }else if(!s.moving&&!s.touch)fit(deck,nearest(deck));
   });});
   observer.observe(deck);cards(deck).forEach(card=>observer.observe(card));
   go(deck,options.selected());
  }
 }
 install();
 return {go:(index,animate=true)=>go(deck,index,animate),fit:()=>{const s=states.get(deck);if(s&&!s.moving&&!s.touch&&!s.wheeling){if(s.selected!==options.selected())go(deck,options.selected());else fit(deck,options.selected());}},
  get busy(){const s=states.get(deck);return !!(s?.touch||s?.moving||s?.wheeling||s?.sliding);}};
}
