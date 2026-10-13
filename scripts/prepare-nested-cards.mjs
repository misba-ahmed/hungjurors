// Preserve only manager -> award. All other dialogs keep their original lifecycle.
export function prepareNestedCards(html){
 const replace=(from,to)=>{if(!html.includes(from))throw Error('Manager award source changed: '+from.slice(0,70));html=html.replace(from,()=>to)};
 replace('    state.overlay.remove();\n    state.card?.focus?.({preventScroll:true});',`    state.overlay.remove();
    const saved=state.managerReturn;
    if(saved?.root.isConnected){
      saved.root.inert=saved.inert;
      for(const [node,left,top] of saved.positions){node.scrollLeft=left;node.scrollTop=top;}
    }
    state.card?.focus?.({preventScroll:true});`);
 replace("    const overlay=document.createElement('div');overlay.className='award-modal-overlay';overlay.setAttribute('role','presentation');",`    const overlay=document.createElement('div');overlay.className='award-modal-overlay';overlay.setAttribute('role','presentation');
    const managerRoot=card.closest('.manager-modal-overlay');
    const managerReturn=managerRoot?{
      root:managerRoot,inert:managerRoot.inert,
      positions:[managerRoot,...managerRoot.querySelectorAll('*')].filter(node=>node.scrollHeight>node.clientHeight||node.scrollWidth>node.clientWidth).map(node=>[node,node.scrollLeft,node.scrollTop])
    }:null;
    if(managerReturn){
      managerRoot.inert=true;
      overlay.dataset.managerReturn='true';
      overlay.style.zIndex='10020';
      overlay.closeManagerAward=()=>closeAwardModal(true);
    }`);
 replace('activeAwardModal={overlay,stage,card,rect,onKey};','activeAwardModal={overlay,stage,card,rect,onKey,managerReturn};');
 replace("const onKey=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();closeManagerModal();}};", "const onKey=e=>{if(e.key==='Escape'&&!document.querySelector('.award-modal-overlay[data-manager-return]')){e.stopImmediatePropagation();closeManagerModal();}};");
 // Following an award's manager link replaces the retained manager, never nests it.
 replace('if(!name)return;if(activeManagerModal)closeManagerModal(true);',"if(!name)return;document.querySelector('.award-modal-overlay[data-manager-return]')?.closeManagerAward?.();if(activeManagerModal)closeManagerModal(true);");
 return html;
}
