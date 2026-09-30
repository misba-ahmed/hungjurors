/* Keep the native viewport untouched while searching and dismissing the keyboard. */
(function(){
 const selector='#hq-fa-search';
 const isSearch=target=>target?.matches?.(selector);
 const sync=input=>{
  const clear=input?.closest('.hj-player-search')?.querySelector('[data-hj-search-clear]');
  if(clear)clear.hidden=!input.value;
 };
 function finish(){
  const input=document.activeElement;
  if(isSearch(input))input.blur();
 }
 window.hjFinishPlayerSearch=finish;
 document.addEventListener('pointerdown',event=>{
  if(event.target.closest?.('[data-hj-search-clear]'))event.preventDefault();
 },true);
 document.addEventListener('focusin',event=>{if(isSearch(event.target))sync(event.target)});
 document.addEventListener('input',event=>{if(isSearch(event.target))sync(event.target)});
 document.addEventListener('search',event=>{if(isSearch(event.target)){sync(event.target);finish()}},true);
 document.addEventListener('keydown',event=>{
  if(isSearch(event.target)&&event.key==='Enter'&&!event.isComposing){event.preventDefault();finish();}
 });
 document.addEventListener('click',event=>{
  const clear=event.target.closest?.('[data-hj-search-clear]');if(!clear)return;
  const input=clear.closest('.hj-player-search')?.querySelector(selector);if(!input)return;
  input.value='';sync(input);input.dispatchEvent(new Event('input',{bubbles:true}));
 });
})();
