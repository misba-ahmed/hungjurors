/* Preserve native focus zoom, then undo only the zoom from this search session. */
(function(){
 const selector='#hq-fa-search',viewport=window.visualViewport;
 let session=null,reset=null;
 const isSearch=target=>target?.matches?.(selector);
 const scale=()=>viewport?.scale||1;
 const height=()=>viewport?viewport.height*scale():window.innerHeight;
 const sync=input=>{
  const clear=input?.closest('.hj-player-search')?.querySelector('[data-hj-search-clear]');
  if(clear)clear.hidden=!input.value;
 };
 function releaseReset(){
  if(!reset)return;
  const current=reset;reset=null;clearTimeout(current.timer);
  current.meta.setAttribute('content',current.content);
 }
 function begin(input){
  if(session?.input===input)return;
  const previous=reset?.scale;releaseReset();
  if(!viewport||!(navigator.maxTouchPoints>0||matchMedia('(any-pointer:coarse)').matches))return;
  session={input,scale:previous||scale(),height:height(),keyboardSeen:false,pinched:false};
 }
 function restore(target){
  if(scale()<=target+.02)return;
  const meta=document.querySelector('meta[name="viewport"]');if(!meta)return;
  releaseReset();
  const content=meta.getAttribute('content')||'width=device-width';
  const base=content.split(',').map(v=>v.trim()).filter(v=>! /^(initial-scale|minimum-scale|maximum-scale|user-scalable)\s*=/i.test(v)).join(', ');
  reset={meta,content,scale:target,timer:0};
  // These bounds exist only during keyboard dismissal, never while typing.
  meta.setAttribute('content',base+', initial-scale='+target+', minimum-scale='+target+', maximum-scale='+target);
  reset.timer=setTimeout(releaseReset,450);
 }
 function finish(){
  const current=session;if(!current)return;
  session=null;
  if(document.activeElement===current.input)current.input.blur();
  if(!current.pinched)restore(current.scale);
 }
 window.hjFinishPlayerSearch=finish;
 document.addEventListener('pointerdown',event=>{
  if(isSearch(event.target))begin(event.target);
  // Clearing a query should not open or dismiss the keyboard by itself.
  if(event.target.closest?.('[data-hj-search-clear]'))event.preventDefault();
 },true);
 document.addEventListener('focusin',event=>{if(isSearch(event.target)){begin(event.target);sync(event.target)}});
 document.addEventListener('focusout',event=>{if(isSearch(event.target))finish()});
 document.addEventListener('input',event=>{if(isSearch(event.target))sync(event.target)});
 document.addEventListener('search',event=>{if(isSearch(event.target)){sync(event.target);finish()}},true);
 document.addEventListener('keydown',event=>{
  if(isSearch(event.target)&&event.key==='Enter'&&!event.isComposing){event.preventDefault();finish();event.target.blur()}
 });
 document.addEventListener('click',event=>{
  const clear=event.target.closest?.('[data-hj-search-clear]');if(!clear)return;
  const input=clear.closest('.hj-player-search')?.querySelector(selector);if(!input)return;
  input.value='';sync(input);input.dispatchEvent(new Event('input',{bubbles:true}));
 });
 document.addEventListener('touchstart',event=>{if(session&&event.touches.length>1)session.pinched=true},{passive:true});
 document.addEventListener('gesturestart',()=>{if(session)session.pinched=true},{passive:true});
 viewport?.addEventListener('resize',()=>{
  if(!session)return;
  const visible=height(),threshold=Math.max(100,session.height*.15);
  if(visible<session.height-threshold)session.keyboardSeen=true;
  else if(session.keyboardSeen&&visible>=session.height-60)finish();
 });
 window.addEventListener('orientationchange',()=>{session=null;releaseReset()});
 window.addEventListener('pagehide',()=>{session=null;releaseReset()});
})();
