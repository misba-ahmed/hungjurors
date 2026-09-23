function wireBindCollapse(card){
 const interactive='a,button,input,select,textarea,label,summary,[role="button"],[role="link"],[contenteditable="true"],[data-wire-matchup],.pc-player-trigger,.manager-profile-trigger,.manager-profile-avatar';
 let pointer=null,moved=false;
 card.addEventListener('pointerdown',event=>{pointer={x:event.clientX,y:event.clientY};moved=false});
 card.addEventListener('pointermove',event=>{if(pointer&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>8)moved=true});
 card.addEventListener('pointercancel',()=>{moved=true;pointer=null});
 card.addEventListener('click',event=>{
  if(event.defaultPrevented||event.target.closest(interactive)||moved||String(window.getSelection()||'').trim())return;
  wireCloseExpanded();
 });
}
