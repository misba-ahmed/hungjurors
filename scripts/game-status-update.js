/* Preserve existing opponent nodes and their font decoration during live ticks.
 * Comparing innerHTML to renderer markup never settles after fonts() adds styles.
 */
function hjUpdateGameStatus(status,markup){
 const template=document.createElement('template');
 template.innerHTML=markup;
 function children(parent,fresh){
  let current=parent.firstChild;
  for(const next of Array.from(fresh.childNodes)){
   if(!current){parent.append(next.cloneNode(true));continue;}
   const after=current.nextSibling;
   if(current.nodeType!==next.nodeType||(current.nodeType===1&&current.tagName!==next.tagName)){
    current.replaceWith(next.cloneNode(true));
   }else if(current.nodeType!==1){
    if(current.nodeValue!==next.nodeValue)current.nodeValue=next.nodeValue;
   }else{
    // The formatter owns font-family; the game renderer owns rank, title and text.
    const font=current.style.getPropertyValue('font-family');
    if(font&&!next.style.getPropertyValue('font-family')){
     next.style.setProperty('font-family',font,current.style.getPropertyPriority('font-family'));
    }
    for(const attr of Array.from(current.attributes))if(!next.hasAttribute(attr.name))current.removeAttribute(attr.name);
    for(const attr of Array.from(next.attributes))if(current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
    children(current,next);
   }
   current=after;
  }
  while(current){const after=current.nextSibling;current.remove();current=after;}
 }
 children(status,template.content);
}
