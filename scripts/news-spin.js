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
 return '<details class="ffn-spin"><summary>Spin</summary><p class="ffn-spin-text">'+esc(spin)+'</p></details>';
}
function ffnMergeSpin(fetched){
 const byId=new Map(fetched.map(item=>[String(item.id),item]));
 for(const item of ffnItems){
  const latest=byId.get(String(item.id));
  if(latest&&latest.spin!==item.spin){item.spin=latest.spin;ffnRefreshVisible(item)}
 }
}
function ffnInstallSpin(){
 const rail=document.getElementById('ffn-scroll');if(!rail||rail.dataset.spinReady)return;
 rail.dataset.spinReady='true';
 let active=null,startLeft=0;
 const close=()=>{if(active){active.open=false;active=null}};
 rail.addEventListener('toggle',event=>{
  const panel=event.target;
  if(!panel.matches?.('details.ffn-spin'))return;
  if(panel.open){
   // Native toggle events are queued: always close every other open panel.
   rail.querySelectorAll('details.ffn-spin[open]').forEach(other=>{if(other!==panel)other.open=false});
   active=panel;startLeft=rail.scrollLeft;
  }else if(active===panel)active=null;
 },true);
 document.addEventListener('pointerdown',event=>{if(active&&!active.contains(event.target))close()},true);
 document.addEventListener('click',event=>{if(active&&!active.contains(event.target))close()},true);
 document.addEventListener('focusin',event=>{if(active&&!active.contains(event.target))close()});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&active){
   const summary=active.querySelector('summary');close();summary?.focus({preventScroll:true});
  }
 });
 rail.addEventListener('scroll',()=>{if(active&&Math.abs(rail.scrollLeft-startLeft)>8)close()},{passive:true});
 // Vertical scrolling remains available for reading long analysis on a phone.
 window.addEventListener('scroll',()=>{
  if(!active)return;
  const rect=active.closest('.ffn-card')?.getBoundingClientRect();
  if(!active.isConnected||!rect||rect.bottom<=0||rect.top>=window.innerHeight)close();
 },{passive:true});
}
