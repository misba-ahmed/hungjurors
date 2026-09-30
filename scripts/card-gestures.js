/* Shared direct-manipulation dismissal. Native close callbacks own cleanup/focus. */
(function(){
 const types=[
  {root:'.manager-draft-detail',head:'.manager-draft-detail-head',close:'.manager-draft-close'},
  {root:'.pc-modal',head:'.pc-modal-head',close:'.pc-modal-close'},
  {root:'.manager-modal-stage',head:'.manager-modal-head',close:'.manager-modal-close'},
  {root:'.season-modal-stage',head:'.season-modal-head',close:'.season-modal-close'},
  {root:'.award-modal-stage',head:'.award-modal-head',close:'.award-modal-close'},
  {root:'.nfl-game.is-open',head:'.nfl-depth-top',close:'[data-close-game]'},
  {root:'.wire-expanded-stage',head:'.wc-kicker,.wc-title',close:'.wire-expanded-close'}
 ];
 const roots=types.map(t=>t.root).join(',');
 const overlays='.pc-modal-overlay,.manager-modal-overlay,.season-modal-overlay,.award-modal-overlay,.wire-expanded-overlay';
 const controls='input,select,textarea,[contenteditable]:not([contenteditable="false"]),audio,video,iframe,[data-no-card-drag]';
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const settling=new Map();let active=null,suppressed=null;
 window.hjCardGestureClosing=node=>!!node?.classList.contains('hj-card-dismissed');
 function restore(g){
  g.card.style.removeProperty('translate');
  if(g.original)g.card.style.setProperty('translate',g.original,g.priority);
  g.card.classList.remove('hj-pull-moving','hj-card-dismissed');
 }
 function yValue(card){const v=getComputedStyle(card).translate.split(/\s+/);return v.length>1?parseFloat(v[1])||0:0;}
 function stopSettling(card){
  const s=settling.get(card);if(!s||s.closing)return null;
  const y=yValue(card);settling.delete(card);s.animation?.cancel();return {...s.g,offset:y};
 }
 function snap(g,immediate=false){
  if(!g.locked){restore(g);return}
  if(immediate||motion.matches||!g.card.isConnected||Math.abs(g.dy)<.5){restore(g);return}
  const animation=g.card.animate([{translate:'0px '+g.dy+'px'},{translate:g.original||'0px 0px'}],{duration:200,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
  const state={g,animation,closing:false};settling.set(g.card,state);
  animation.finished.then(()=>{if(settling.get(g.card)!==state)return;settling.delete(g.card);restore(g);animation.cancel();},()=>{});
 }
 function cancel(immediate=false){const g=active;active=null;if(g)snap(g,immediate);}
 function start(target,x,y,id,kind){
  if(active)cancel(true);
  suppressed=null;
  const card=target.closest?.(roots);if(!card||!card.getClientRects().length||target.closest(controls))return;
  const type=types.find(t=>card.matches(t.root)),close=card.querySelector(type.close);
  if(!close||settling.get(card)?.closing)return;
  const head=target.closest(type.head),onHeader=!!head&&card.contains(head);
  if(kind!=='touch'&&!onHeader)return;
  // Respect scrolling at any nested level, including a Wire card's own scroller.
  const scrolls=[];
  for(let node=target;node&&card.contains(node);node=node.parentElement){
   if(node.scrollHeight>node.clientHeight+1&&/(auto|scroll)/.test(getComputedStyle(node).overflowY))scrolls.push(node);
   if(node===card)break;
  }
  if(!onHeader&&scrolls.some(n=>n.scrollTop>1))return;
  const prior=stopSettling(card),offset=prior?.offset||0;
  active={card,close,type,id,kind,x,y,offset,dy:offset,locked:!!prior,onHeader,scrolls,
   original:prior?.original??card.style.getPropertyValue('translate'),
   priority:prior?.priority??card.style.getPropertyPriority('translate'),
   samples:[{y:offset,t:performance.now()}]};
  if(prior)card.style.setProperty('translate','0px '+offset+'px');
 }
 function move(x,y,e){
  const g=active;if(!g)return;
  if(!g.card.isConnected){cancel(true);return}
  const dx=x-g.x,dy=y-g.y;
  if(!g.locked){
   if(Math.max(Math.abs(dx),Math.abs(dy))<4)return;
   // Horizontal rails stay native. An upward content swipe continues to scroll.
   if(Math.abs(dx)>Math.abs(dy)*1.15||(!g.onHeader&&dy<0)){active=null;return}
   if(!g.onHeader&&g.scrolls.some(n=>n.scrollTop>1)){active=null;return}
   if(!e.cancelable){active=null;return}
   g.locked=true;g.card.classList.add('hj-pull-moving');
   if(g.kind==='pointer')g.card.setPointerCapture?.(g.id);
  }
  if(!e.cancelable){cancel();return}
  e.preventDefault();e.stopPropagation();
  const raw=(g.offset<0?g.offset/.22:g.offset)+dy;
  // Downward travel is 1:1; a gentle boundary above rest still follows reversals.
  g.dy=raw>=0?raw:raw*.22;
  g.card.style.setProperty('translate','0px '+g.dy+'px');
  const t=performance.now(),previous=g.samples.at(-1),direction=Math.sign(g.dy-previous.y);
  if(direction&&g.direction&&direction!==g.direction)g.samples=[previous];
  if(direction)g.direction=direction;
  g.samples.push({y:g.dy,t});
  while(g.samples.length>2&&g.samples[1].t<t-100)g.samples.shift();
 }
 function dismiss(g,velocity){
  const overlay=g.card.closest(overlays),rect=g.card.getBoundingClientRect();
  const bottom=(window.visualViewport?.offsetTop||0)+(window.visualViewport?.height||innerHeight);
  const to=g.dy+Math.max(0,bottom-rect.top)+32;
  const duration=motion.matches?0:Math.max(160,Math.min(240,(to-g.dy)/Math.max(2.8,velocity)));
  const state={g,closing:true};settling.set(g.card,state);
  g.card.classList.add('hj-card-dismissed');
  const finish=()=>{
   if(settling.get(g.card)!==state)return;
   settling.delete(g.card);
   // The flagged native close path removes listeners, scroll locks and restores focus,
   // without restarting the old flip/shrink animation after the swipe.
   if(g.card.isConnected&&g.close.isConnected)g.close.click();
   if(g.card.matches('.nfl-game'))getComputedStyle(g.card.querySelector('.nfl-card-inner')).transform;
   state.animation?.cancel();state.fade?.cancel();
   restore(g);
  };
  if(!duration){finish();return}
  state.animation=g.card.animate([{translate:'0px '+g.dy+'px'},{translate:'0px '+to+'px'}],{duration,easing:'cubic-bezier(.18,.65,.3,1)',fill:'forwards'});
  if(overlay&&g.card.matches('.manager-draft-detail')===false)state.fade=overlay.animate([{opacity:getComputedStyle(overlay).opacity},{opacity:0}],{duration,fill:'forwards'});
  state.animation.finished.then(finish,()=>{});
 }
 function end(e,canceled=false){
  const g=active;active=null;if(!g)return;
  if(!g.locked){restore(g);return}
  if(e.cancelable)e.preventDefault();e.stopPropagation();
  suppressed={card:g.card,overlay:g.card.closest(overlays),until:performance.now()+400};
  const now=performance.now(),samples=g.samples.filter(s=>now-s.t<=120);
  const first=samples[0],last=samples.at(-1);
  const velocity=first&&last&&last.t>first.t&&now-last.t<80?(last.y-first.y)/(last.t-first.t):0;
  const threshold=Math.min(140,Math.max(72,g.card.clientHeight*.18));
  const close=!canceled&&velocity>-.2&&(g.dy>=threshold||(g.dy>=24&&velocity>.55));
  if(close)dismiss(g,velocity);else snap(g);
 }
 document.addEventListener('touchstart',e=>{
  if(e.touches.length!==1){cancel();return}
  const t=e.touches[0];start(e.target,t.clientX,t.clientY,t.identifier,'touch');
 },{capture:true,passive:true});
 document.addEventListener('touchmove',e=>{
  if(active?.kind!=='touch')return;
  if(e.touches.length!==1){cancel();return}
  const t=[...e.touches].find(t=>t.identifier===active.id);
  if(t)move(t.clientX,t.clientY,e);else cancel();
 },{capture:true,passive:false});
 document.addEventListener('touchend',e=>{
  if(active?.kind==='touch'&&[...e.changedTouches].some(t=>t.identifier===active.id))end(e,e.touches.length>0);
 },{capture:true,passive:false});
 document.addEventListener('touchcancel',()=>cancel(),{capture:true,passive:true});
 document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0)return;start(e.target,e.clientX,e.clientY,e.pointerId,'pointer')},{capture:true});
 document.addEventListener('pointermove',e=>{if(active?.kind==='pointer'&&active.id===e.pointerId)move(e.clientX,e.clientY,e)},{capture:true});
 document.addEventListener('pointerup',e=>{if(active?.kind==='pointer'&&active.id===e.pointerId)end(e)},{capture:true});
 document.addEventListener('pointercancel',e=>{if(active?.kind==='pointer'&&active.id===e.pointerId)cancel()},{capture:true});
 window.addEventListener('click',e=>{
  if(e.isTrusted&&suppressed&&performance.now()<suppressed.until&&(suppressed.card.contains(e.target)||suppressed.overlay?.contains(e.target))){e.preventDefault();e.stopImmediatePropagation();suppressed=null;}
 },true);
 document.addEventListener('dragstart',e=>{if(active)e.preventDefault()},true);
 function resetAll(){
  cancel(true);
  for(const [card,s] of settling){s.animation?.cancel();s.fade?.cancel();restore(s.g);settling.delete(card);}
 }
 window.addEventListener('blur',resetAll);
 window.addEventListener('resize',resetAll);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)resetAll()});
 new MutationObserver(()=>{
  if(active&&!active.card.isConnected)cancel(true);
  for(const [card,s]of settling)if(!card.isConnected){s.animation?.cancel();s.fade?.cancel();settling.delete(card);}
 }).observe(document.body,{childList:true,subtree:true});
})();
