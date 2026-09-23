/* ESPN Rotowire's story field is the Spin analysis for its description. */
function ffnSpinFromFeed(feed){
 if(typeof feed?.story!=='string')return '';
 const source=feed.story.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ');
 const decoder=document.createElement('textarea');
 decoder.innerHTML=source;
 return decoder.value.replace(/\s+/g,' ').trim().replace(/^Spin:\s*/i,'');
}
function ffnSpinHTML(item){
 const spin=typeof item?.spin==='string'?item.spin.trim():'';
 if(!spin)return '';
 return '<details class="ffn-spin"><summary aria-label="Show or hide Spin" title="Spin"></summary><p class="ffn-spin-text">'+esc(spin)+'</p></details>';
}
function ffnMergeSpin(fetched){
 const byId=new Map(fetched.map(item=>[String(item.id),item]));
 for(const item of ffnItems){
  const latest=byId.get(String(item.id));
  if(latest&&latest.spin!==item.spin){item.spin=latest.spin;ffnRefreshVisible(item)}
 }
}
function ffnInstallSpin(){
 if(document.documentElement.dataset.spinReady)return;
 document.documentElement.dataset.spinReady='true';
 let active=null,startLeft=0;
 const current=()=>document.querySelector('details.ffn-spin[open]');
 const close=()=>{document.querySelectorAll('details.ffn-spin[open]').forEach(panel=>panel.open=false);active=null};
 document.addEventListener('toggle',event=>{
  const panel=event.target;
  if(!panel.matches?.('details.ffn-spin'))return;
  if(panel.open){
   document.querySelectorAll('details.ffn-spin[open]').forEach(other=>{if(other!==panel)other.open=false});
   active=panel;startLeft=panel.closest('#ffn-scroll')?.scrollLeft||0;
  }else if(active===panel)active=null;
 },true);
 document.addEventListener('pointerdown',event=>{const panel=current();if(panel&&!panel.contains(event.target))close()},true);
 document.addEventListener('click',event=>{const panel=current();if(panel&&!panel.contains(event.target))close()},true);
 document.addEventListener('focusin',event=>{const panel=current();if(panel&&!panel.contains(event.target))close()});
 document.addEventListener('keydown',event=>{
  const panel=current();
  if(event.key==='Escape'&&panel){
   event.preventDefault();event.stopImmediatePropagation();
   const summary=panel.querySelector('summary');close();summary?.focus({preventScroll:true});
  }
 },true);
 // Capture also handles the player profile's independently scrolling body.
 document.addEventListener('scroll',event=>{
  const panel=current();if(!panel)return;
  const rail=panel.closest('#ffn-scroll');
  if(rail&&event.target===rail&&Math.abs(rail.scrollLeft-startLeft)>8){close();return}
  const scroller=panel.closest('.pc-modal-scroll');
  if(scroller&&event.target!==scroller&&event.target!==document)return;
  if(!scroller&&event.target!==document&&event.target!==rail)return;
  const card=panel.closest('.ffn-card,.pc-news-item'),rect=card?.getBoundingClientRect(),bounds=scroller?.getBoundingClientRect();
  const top=Math.max(0,bounds?.top||0),bottom=Math.min(window.innerHeight,bounds?.bottom||window.innerHeight);
  if(!panel.isConnected||!rect||rect.bottom<=top||rect.top>=bottom)close();
 },{capture:true,passive:true});
}
