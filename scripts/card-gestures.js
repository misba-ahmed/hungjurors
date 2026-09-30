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
  g.card.style.removeProperty('transform');
  if(g.original)g.card.style.setProperty('transform',g.original,g.priority);
  g.card.classList.remove('hj-pull-moving','hj-card-dismissed');
 }
 function transform(g,y){return 'translate3d(0,'+y+'px,0)'+(g.base?' '+g.base:'');}
 function stopMotion(s){
  cancelAnimationFrame(s.frame);
  if(s.fade){const {node,value,priority}=s.fade;node.style.removeProperty('opacity');if(value)node.style.setProperty('opacity',value,priority);}
 }
 function animate(g,to,duration,closing,finish,overlay=null){
  const state={g,closing,y:g.dy,frame:0},from=g.dy,start=performance.now();
  if(overlay)state.fade={node:overlay,value:overlay.style.getPropertyValue('opacity'),priority:overlay.style.getPropertyPriority('opacity'),initial:Number(getComputedStyle(overlay).opacity)};
  settling.set(g.card,state);
  function frame(now){
   if(settling.get(g.card)!==state)return;
   const progress=Math.min(1,Math.max(0,(now-start)/duration)),eased=1-Math.pow(1-progress,3);
   state.y=from+(to-from)*eased;
   g.card.style.setProperty('transform',transform(g,state.y));
   if(state.fade)state.fade.node.style.opacity=String(state.fade.initial*(1-progress));
   if(progress===1){settling.delete(g.card);finish();stopMotion(state);}
   else state.frame=requestAnimationFrame(frame);
  }
  state.frame=requestAnimationFrame(frame);
  return state;
 }
 function stopSettling(card){
  const s=settling.get(card);if(!s||s.closing)return null;
  settling.delete(card);stopMotion(s);return {...s.g,offset:s.y};
 }
 function snap(g,immediate=false){
  if(!g.locked){restore(g);return}
  if(immediate||motion.matches||!g.card.isConnected||Math.abs(g.dy)<.5){restore(g);return}
  animate(g,0,200,false,()=>restore(g));
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
  const prior=stopSettling(card),offset=prior?.offset||0,computed=getComputedStyle(card).transform;
  const base=prior?.base??(computed==='none'?'':computed),baseY=prior?.baseY??new DOMMatrixReadOnly(computed).m42;
  active={card,close,type,id,kind,x,y,offset,dy:offset,locked:!!prior,onHeader,scrolls,base,baseY,
   original:prior?.original??card.style.getPropertyValue('transform'),
   priority:prior?.priority??card.style.getPropertyPriority('transform'),
   samples:[{y:offset,t:performance.now()}]};
  if(prior)card.style.setProperty('transform',transform(active,offset));
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
  g.card.style.setProperty('transform',transform(g,g.dy));
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
  g.card.classList.add('hj-card-dismissed');
  const finish=()=>{
   // Native cleanup runs once, after the card has left the screen.
   if(g.card.isConnected&&g.close.isConnected)g.close.click();
   if(g.card.matches('.nfl-game'))getComputedStyle(g.card.querySelector('.nfl-card-inner')).transform;
   restore(g);
  };
  if(!duration){finish();return}
  animate(g,to,duration,true,finish,g.card.matches('.manager-draft-detail')?null:overlay);
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
  if(e.touches.length!==1){cancel(true);return}
  const t=e.touches[0];start(e.target,t.clientX,t.clientY,t.identifier,'touch');
 },{capture:true,passive:true});
 document.addEventListener('touchmove',e=>{
  if(active?.kind!=='touch')return;
  if(e.touches.length!==1){cancel(true);return}
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
  for(const [card,s] of settling){stopMotion(s);restore(s.g);settling.delete(card);}
 }
 window.addEventListener('blur',resetAll);
 window.addEventListener('resize',resetAll);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)resetAll()});
 new MutationObserver(()=>{
  if(active&&!active.card.isConnected)cancel(true);
  for(const [card,s]of settling)if(!card.isConnected){stopMotion(s);settling.delete(card);}
 }).observe(document.body,{childList:true,subtree:true});
})();
