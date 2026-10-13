/* One shared ordering for all card dialogs. Parents stay mounted and retain state. */
(function(){
 const types=[
  ['.manager-modal-overlay','.manager-modal-close'],
  ['.season-modal-overlay','.season-modal-close'],
  ['.award-modal-overlay','.award-modal-close'],
  ['.pc-modal-overlay','.pc-modal-close'],
  ['.wire-expanded-overlay','.wire-expanded-close']
 ];
 const selector=types.map(t=>t[0]).join(','),stack=[];
 function save(entry){
  entry.scroll=[entry.node,...entry.node.querySelectorAll('*')].filter(n=>n.scrollHeight>n.clientHeight||n.scrollWidth>n.clientWidth).map(n=>[n,n.scrollTop,n.scrollLeft]);
  entry.focus=document.activeElement;
 }
 function restore(entry){
  if(!entry)return;
  for(const [node,top,left]of entry.scroll||[])if(node.isConnected){node.scrollTop=top;node.scrollLeft=left}
  if(entry.focus?.isConnected)entry.focus.focus({preventScroll:true});
 }
 function sync(){
  const previous=stack.at(-1);let removed=false;
  for(let i=stack.length-1;i>=0;i--)if(!stack[i].node.isConnected){stack.splice(i,1);removed=true}
  for(const node of document.querySelectorAll(selector))if(!stack.some(e=>e.node===node)){
   if(stack.length)save(stack.at(-1));
   stack.push({node,scroll:[],focus:null});
  }
  const top=stack.at(-1);
  stack.forEach((entry,i)=>{
   entry.node.style.zIndex=String(100000+i*20);
   entry.node.inert=entry!==top;
   if(entry!==top)entry.node.setAttribute('aria-hidden','true');else entry.node.removeAttribute('aria-hidden');
  });
  if(removed&&top!==previous)restore(top);
 }
 new MutationObserver(sync).observe(document.documentElement,{childList:true,subtree:true});
 // A single capture handler prevents every open dialog reacting to one Escape.
 window.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const top=stack.at(-1);if(!top)return;
  const inner=top.node.querySelector('.manager-draft-detail .manager-draft-close,.hj-lineup-save-card .hj-lineup-save-close');
  const close=inner||top.node.querySelector(types.find(t=>top.node.matches(t[0]))[1]);
  if(close){event.preventDefault();event.stopImmediatePropagation();close.click()}
 },true);
 // Do not let delayed focus timers from a parent steal focus from its child.
 window.addEventListener('focusin',event=>{
  const top=stack.at(-1);if(!top||top.node.contains(event.target))return;
  const parent=event.target.closest?.(selector);
  if(parent&&parent!==top.node)top.node.querySelector(types.find(t=>top.node.matches(t[0]))[1])?.focus({preventScroll:true});
 },true);
})();
