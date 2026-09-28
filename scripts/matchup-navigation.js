/* One owner for matchup paging and height; never resize the rail mid-swipe. */
(function(){
 const root=document.querySelector('#league-hq');if(!root)return;
 const states=new WeakMap(),cards=deck=>Array.from(deck.children).filter(el=>el.matches('.hq-matchup'));
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
  const s=states.get(deck);if(!s||s.touch||!deck.isConnected)return;
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
 function go(deck,index,animate=false){
  const s=states.get(deck),card=cards(deck)[clamp(deck,index)];if(!s||!card)return;
  s.target=clamp(deck,index);s.moving=true;choose(deck,s.target);
  deck.scrollTo({left:offset(deck,card),behavior:animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});
  later(deck);
 }
 function install(){
  root.querySelectorAll('#hq-panel-matchups .hq-matchup-list').forEach(deck=>{
   if(!deck.clientWidth)return;
   let s=states.get(deck);
   if(s){if(!s.moving&&!s.touch)fit(deck,nearest(deck));return}
   s={width:deck.clientWidth,timer:0,moving:false,touch:null,target:null,observed:new Set()};states.set(deck,s);
   deck.tabIndex=0;deck.setAttribute('aria-label','Matchups. Swipe left or right.');
   deck.addEventListener('scroll',()=>{s.moving=true;later(deck)},{passive:true});
   deck.addEventListener('scrollend',()=>settle(deck));
   deck.addEventListener('touchstart',event=>{
    if(event.touches.length!==1){s.touch=null;s.target=null;return}
    const t=event.touches[0];s.touch={x:t.clientX,y:t.clientY,index:nearest(deck)};s.target=null;
   },{passive:true});
   deck.addEventListener('touchend',event=>{
    const start=s.touch,t=event.changedTouches[0];s.touch=null;if(!start||!t)return;
    const dx=t.clientX-start.x,dy=t.clientY-start.y;
    if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>24)go(deck,start.index+(dx<0?1:-1),false);
    else later(deck);
   },{passive:true});
   deck.addEventListener('touchcancel',()=>{s.touch=null;s.target=null;later(deck)},{passive:true});
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
 let queued=false;const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;install()})}};
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
 root.addEventListener('toggle',schedule,true);
 window.addEventListener('resize',schedule);install();
})();
