/* Update scores and content without discarding layout measurements or interactive rows. */
(function(){
 const original=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
 const targets=new Set(['league-sync-content','hq-matchup-content','hq-fa-results','hq-panel-strength','hq-panel-activity','hq-panel-recap']);
 function key(node){
  if(node.nodeType!==1)return '';
  for(const attr of ['id','data-team-photo-player','data-hq-directory-id','data-hq40-stat-rail','data-league-team','data-hq-matchup-jump','data-hq-lineup-mode','data-hq40-period','data-hq40-year','data-hq-matchup-key','data-pc-id','data-hq40-sort-stat','data-pc-section','data-pc-rz','data-wire-key','data-news-id']){
   if(node.hasAttribute(attr))return node.tagName+':'+attr+':'+node.getAttribute(attr);
  }
  return '';
 }
 function compatible(a,b){return a.nodeType===b.nodeType&&(a.nodeType!==1||(a.tagName===b.tagName&&key(a)===key(b)&&(!key(a)?a.classList[0]===b.classList[0]:true)))}
 function patch(current,fresh){
  if(current.nodeType!==1){if(current.nodeValue!==fresh.nodeValue)current.nodeValue=fresh.nodeValue;return}
  // Renderers own data; layout installers own these persistent measurements.
  for(const name of ['data-hj-fit-height','data-columns','data-hj-projection-section']){
   if(current.hasAttribute(name)&&!fresh.hasAttribute(name))fresh.setAttribute(name,current.getAttribute(name));
  }
  for(const name of ['--hj-matchup-height','--hj-row-room','font-family']){
   const value=current.style.getPropertyValue(name);
   if(value&&!fresh.style.getPropertyValue(name))fresh.style.setProperty(name,value,current.style.getPropertyPriority(name));
  }
  if(current.isEqualNode(fresh))return;
  const active=current===document.activeElement;
  for(const attr of Array.from(current.attributes)){
   if(attr.name==='open'&&current.tagName==='DETAILS')continue;
   if(current.classList.contains('hq-matchup-list')&&['tabindex','aria-label'].includes(attr.name)&&!fresh.hasAttribute(attr.name))continue;
   if(!fresh.hasAttribute(attr.name))current.removeAttribute(attr.name);
  }
  for(const attr of Array.from(fresh.attributes)){
   if(attr.name==='open'&&current.tagName==='DETAILS')continue;
   if(active&&attr.name==='value')continue;
   if(current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
  }
  if(current.tagName==='INPUT'&&active)return;
  children(current,fresh);
 }
 function children(parent,fresh){
  const keyed=new Map(Array.from(parent.childNodes).map(n=>[key(n),n]).filter(([k])=>k));
  let cursor=parent.firstChild;
  for(const next of Array.from(fresh.childNodes)){
   let match=key(next)?keyed.get(key(next)):null;
   if(!match&&cursor&&compatible(cursor,next))match=cursor;
   if(match&&compatible(match,next)){
    if(match!==cursor)parent.insertBefore(match,cursor);
    patch(match,next);cursor=match.nextSibling;
   }else{
    const added=next.cloneNode(true);parent.insertBefore(added,cursor);
   }
  }
  while(cursor){const next=cursor.nextSibling;parent.removeChild(cursor);cursor=next}
 }
 function update(element,markup){
  if(!element.childNodes.length){original.set.call(element,markup);return}
  const template=document.createElement('template');original.set.call(template,String(markup));
  template.content.querySelectorAll('.hq-module-head .hj-activity-sync').forEach(el=>el.closest('.hq-module-head').before(el));
  template.content.querySelectorAll('.hq-module-head,.hq-matchup-head,.league-roster-optimizer-copy,.hq-lineup-toolbar-copy').forEach(el=>el.remove());
  template.content.querySelectorAll('.hq-matchup').forEach(card=>{
   const summary=card.querySelector('.hq-matchup-summary'),win=card.querySelector('.hq-match-win');
   if(summary){const wrap=document.createElement('div');wrap.className='hj-sticky-scorecard';summary.before(wrap);wrap.append(summary);if(win)wrap.append(win)}
   const edge=card.querySelector('.hq-edge-grid'),toolbar=card.querySelector('.hq-lineup-toolbar'),head=card.querySelector('.hj-lineup-v2-head');
   if(edge&&toolbar&&head){
    const actions=document.createElement('div');actions.className='hj-matchup-actions';edge.before(actions);
    const tray=document.createElement('details');tray.className='hj-matchup-preview';tray.dataset.matchupKey=card.dataset.hqMatchupKey;
    const body=document.createElement('div');body.className='hj-matchup-preview-body';
    const label=document.createElement('summary');label.textContent='Matchup Preview';
    tray.append(body,label);actions.append(tray);body.append(edge,toolbar,head);
   }
  });
  // Keep the projection controls that the layout installer added to the headers.
  element.querySelectorAll('[data-hj-section-projections]').forEach(button=>{
   const oldCard=button.closest('[data-hq-matchup]');
   const freshCard=oldCard?Array.from(template.content.querySelectorAll('[data-hq-matchup]')).find(c=>c.dataset.hqMatchupKey===oldCard.dataset.hqMatchupKey):null;
   const host=freshCard?.querySelector('.hj-matchup-actions')||(!oldCard&&(template.content.querySelector('.'+CSS.escape(button.parentElement.classList[0]||'league-roster-group-head'))||template.content.querySelector('.league-roster-group-head')));
   if(host&&!host.querySelector('[data-hj-section-projections]'))host.append(button.cloneNode(true));
  });
  // The Players panel must not flash a loading placeholder while its next data request runs.
  if(element.id==='hq-fa-results'&&element.querySelector('[data-hq-directory-id]')&&!template.content.querySelector('[data-hq-directory-id]')&&/load/i.test(template.content.textContent))return;
  const scrollRoot=element.closest('.manager-modal-scroll,.pc-modal-scroll');
  const edge=scrollRoot?scrollRoot.getBoundingClientRect().top:200;
  const anchor=Array.from(element.querySelectorAll('[data-hq-directory-id],.hj-player-v3[data-pc-id]')).find(row=>{
   const rect=row.getBoundingClientRect();return rect.bottom>edge&&rect.top<(scrollRoot?scrollRoot.getBoundingClientRect().bottom:window.innerHeight)&&rect.right>0&&rect.left<window.innerWidth;
  });
  const before=anchor?.getBoundingClientRect().top;
  const scrollers=Array.from(element.querySelectorAll('*')).filter(el=>el.scrollLeft||el.scrollTop).map(el=>[el,el.scrollLeft,el.scrollTop]);
  children(element,template.content);
  scrollers.forEach(([el,x,y])=>{if(el.isConnected){if(el.scrollLeft!==x||el.scrollTop!==y)el.scrollTo({left:x,top:y,behavior:'instant'})}});
  if(anchor?.isConnected&&element.getClientRects().length){
   const delta=anchor.getBoundingClientRect().top-before;
   if(Math.abs(delta)>.5){if(scrollRoot)scrollRoot.scrollTop+=delta;else window.scrollBy({top:delta,behavior:'instant'})}
  }
 }
 window.hjPatchLiveContent=update;
 // Intercept only these live-result roots; other HTML writes keep their normal behavior.
 Object.defineProperty(Element.prototype,'innerHTML',{
  configurable:original.configurable,enumerable:original.enumerable,get:original.get,
  set(markup){if((targets.has(this.id)&&this.closest('#league-hq'))||this.matches('.manager-hq-roster'))update(this,markup);else original.set.call(this,markup)}
 });
 window.hjPatchLiveControls=function(current,markup){
  const t=document.createElement('template');original.set.call(t,markup);const fresh=t.content.firstElementChild;if(!fresh)return;
  const select=current.querySelector('[data-hj-position-select]');
  const row=fresh.querySelector('.hq49-row-selects');
  if(select&&row)row.append(select.cloneNode(true));
  patch(current,fresh);
 };
 const toolsBase=hjRenderLeagueTools;
 hjRenderLeagueTools=function(data){
  if(!data||!document.querySelector('#hq-panel-free-agents'))return toolsBase.apply(this,arguments);
  if(HJ_HQ_STATE.activeTab==='matchups')hjRenderMatchupCenter();
  if(HJ_HQ_STATE.activeTab==='free-agents')hjRenderPlayerDirectory(false);
  if(HJ_HQ_STATE.activeTab==='strength')hjRerenderStrength();
  if(typeof hjRenderActivityPanelV24==='function')hjRenderActivityPanelV24();
  const recap=document.querySelector('#hq-panel-recap .hq-module');
  if(recap){const existing=recap.querySelector('.hq-module-body');if(existing){const t=document.createElement('template');original.set.call(t,hjWeeklyRecapHTML(data));const body=t.content.querySelector('.hq-module-body');update(existing,body?body.innerHTML:hjWeeklyRecapHTML(data));}else{recap.insertAdjacentHTML('beforeend',hjWeeklyRecapHTML(data));}}
  hjRenderHQTabs();
 };
 // Keep sticky navigation in place; open the selected section directly beneath it.
 const setTab=hjSetHQTab;
 hjSetHQTab=function(tab){
  if(tab===HJ_HQ_STATE.activeTab)return setTab.apply(this,arguments);
  const dock=document.querySelector('.hj-folder-dock');
  const nav=document.querySelector('body > nav');
  const navHeight=nav?.getBoundingClientRect().height||0;
  const wasPinned=!!dock&&dock.getBoundingClientRect().top<=navHeight+2;
  const previousY=window.scrollY;
  const result=setTab.apply(this,arguments);
  if(arguments[1])return result;
  const panel=document.getElementById(tab==='rosters'?'league-sync-content':'hq-panel-'+tab);
  if(!panel)return result;
  function place(){
   if(HJ_HQ_STATE.activeTab!==tab||!panel.getClientRects().length)return;
   const top=wasPinned
    ? Math.max(0,window.scrollY+panel.getBoundingClientRect().top-navHeight-(dock?.getBoundingClientRect().height||0))
    : previousY;
   if(Math.abs(window.scrollY-top)>1)window.scrollTo({top,behavior:'instant'});
  }
  place();requestAnimationFrame(place);
  return result;
 };
})();
