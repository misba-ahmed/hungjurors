/* Occasional priority announcements inside the existing Wire carousel.
 * Keep one carousel item, three independent panels, ivory gaps, and existing navigation.
 * Use live roster/schedule data; never infer a bye from missing game data. */
(function(){
 const baseBuild=wireBuild,baseLabel=hjWireNavLabel;
 if(!HJ_WIRE_ORDER.includes('this-week'))HJ_WIRE_ORDER.unshift('this-week');
 hjWireNavLabel=function(section,data){return section==='this-week'?'This Week':baseLabel(section,data)};
 function byeGroups(data,week){
  if(HJ_BYE_STATE.season!==Number(NFL_SEASON))return [];
  const groups=[...HJ_BYE_STATE.teams.keys()].filter(t=>hjTeamOnBye(t,week)).sort().map(team=>({team,players:[]}));
  const byTeam=new Map(groups.map(g=>[g.team,g])),seen=new Set();
  for(const team of data?.teams||[])for(const entry of hjRosterEntries(team)){
   const p=wirePlayerObj(hjPlayer(entry)),g=byTeam.get(pcTeam(hjPlayerTeam(entry)));
   if(!p||!g||seen.has(p.id))continue;
   seen.add(p.id);g.players.push({player:p,manager:wireManager(team,data)});
  }
  groups.forEach(g=>g.players.sort((a,b)=>a.player.name.localeCompare(b.player.name)));
  return groups;
 }
 function groupHTML(groups){
  const logos='<div class="wp-bye-logos" aria-label="Teams on bye">'+groups.map(g=>{
   const name=typeof PC_TEAM_NAMES!=='undefined'?(PC_TEAM_NAMES[g.team]||g.team):g.team;
   return '<div><img src="'+esc(nflLogo(g.team))+'" alt="'+esc(name)+'"><span>'+esc(name)+'</span></div>';
  }).join('')+'</div>';
  const rows=groups.flatMap(g=>g.players).map(item=>'<div class="wp-person">'+wirePlayerHTML(item.player).replace('wc-player','wp-player').replace(/<small>[\s\S]*?<\/small>/,'<small>'+esc(item.manager)+'</small>')+'</div>').join('');
  return logos+'<div class="wp-bye-list" tabindex="0" role="region" aria-label="Owned players on bye; scroll for all players">'+(rows||'<p>No owned players on BYE.</p>')+'</div>';
 }
 function figures(data){
  const slugs={'NATHAN M':'nathan-m','NATHAN T':'nathan-t'};
  return '<div class="wp-managers" aria-label="All league managers">'+(data.teams||[]).map(t=>{
   const name=wireManager(t,data),slug=slugs[name]||name.toLowerCase();
   if(!Object.prototype.hasOwnProperty.call(AV,name))return '';
   return '<img src="/assets/'+(slug==='jarrett'?'managers-v8':'managers-v4')+'/'+slug+'-standing.webp" alt="'+esc(name)+'" loading="lazy">';
  }).join('')+'</div>';
 }
 function panel(kind,label,title,body,action){
  return '<section class="wp-panel wp-'+kind+'" data-wp-card="'+kind+'" tabindex="0" aria-label="'+esc(title)+'. Click to expand."><button type="button" class="wc-expand wp-expand" data-wp-expand="'+kind+'" aria-label="Expand '+esc(title)+'">↗</button><div class="wc-kicker wp-eyebrow">'+label+'</div><h3 class="wc-title">'+title+'</h3>'+body+'<div class="wp-action">'+action+'</div></section>';
 }
 let detail={};
 wireBuild=function(data){
  const built=baseBuild.apply(this,arguments);if(!data?.teams?.length)return built;
  const week=Number(hjCurrentWeek(data)),groups=byeGroups(data,week),waiver=wireWaiverCard(data),lms=week===5;
  const panels=[];detail={};
  if(waiver){
   const info=wireNextWaiver(data,Date.now());
   if(info){
    const body='<p>Wednesday · 2 AM CT</p>'+wireCountdownHTML(info.start,'');
    const action='<a class="wp-button" href="https://fantasy.espn.com/football/players/add?leagueId='+ESPN_FANTASY_LEAGUE_ID+'" target="_blank" rel="noopener">Open ESPN waivers ↗</a>';
    panels.push(panel('waivers','Waiver deadline','Set your claims',body,action));
    detail.waivers=panel('waivers','Waiver deadline','Set your claims',body,action);
   }
  }
  if(groups.length){
   const action='<button class="wp-button wp-text-button" type="button" data-wp-expand="byes">Expand list ↗</button>';
   panels.push(panel('byes','Lineup check','Teams on BYE this week',groupHTML(groups),action));
   detail.byes=panel('byes','Week '+week+' · Lineup check','Teams on BYE this week',groupHTML(groups),'');
  }
  if(lms){
   const body=figures(data);
   const action='<button type="button" class="wp-button" data-wp-lms>View challenge →</button>';
   panels.push(panel('lms','Last Man Standing','Eliminations start this week!',body,action));
   detail.lms=panel('lms','Last Man Standing','Eliminations start this week!',body,action);
  }
  // Leave ordinary weeks' single-feature banners alone; BYEs/LMS can stand alone.
  if(!groups.length&&!lms)return built;
  built.cards=built.cards.filter(c=>c.section!=='waivers');
  built.cards.unshift({section:'this-week',html:'<div class="wc wp-group" data-wire-key="this-week" aria-label="This Week"><div class="wp-heading">This Week <span>· Week '+week+'</span></div><div class="wp-grid" style="--wp-count:'+panels.length+'">'+panels.join('')+'</div></div>'});
  return built;
 };
 const interactive='a,button,input,select,textarea,label,summary,[role="button"],[role="link"],[contenteditable="true"],.pc-player-trigger,.manager-profile-trigger';
 function expandPanel(panel){
  if(!panel)return;
  const card=document.createElement('div');card.className='wc wp-detail';
  const clone=panel.cloneNode(true);clone.removeAttribute('tabindex');clone.removeAttribute('data-wp-card');
  clone.querySelectorAll('[data-wp-expand]').forEach(el=>el.remove());
  card.append(clone);wireOpenExpanded(card);
 }
 let pointer=null,moved=false;
 const rail=document.querySelector('#wire-scroll');
 rail?.addEventListener('pointerdown',event=>{pointer={x:event.clientX,y:event.clientY};moved=false;},{passive:true});
 rail?.addEventListener('pointermove',event=>{if(pointer&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>8)moved=true;},{passive:true});
 rail?.addEventListener('pointercancel',()=>{moved=true;pointer=null;},{passive:true});
 // Bubble after the carousel's native swipe/click guard, not before it.
 document.addEventListener('click',event=>{
  if(event.defaultPrevented)return;
  const expand=event.target.closest('[data-wp-expand]'),lms=event.target.closest('[data-wp-lms]');
  const panel=event.target.closest('#wire-scroll [data-wp-card]');
  if(!expand&&!lms&&!panel)return;
  if(panel&&moved&&event.detail>0)return;
  if(lms){event.preventDefault();wireCloseExpanded();document.querySelector('#challenge-menu [data-challenge="lms"]')?.click();return;}
  if(!expand&&(event.target.closest(interactive)||String(window.getSelection()||'').trim()))return;
  event.preventDefault();expandPanel(panel);
 });
 rail?.addEventListener('keydown',event=>{
  if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-wp-card]')){
   event.preventDefault();expandPanel(event.target);
  }
 });
 // The validated schedule may arrive after league data. Rebuild without resetting selection.
 let byeKey='';
 document.addEventListener('hj:team-photo-scores',()=>{
  const key=HJ_BYE_STATE.season+':'+HJ_BYE_STATE.teams.size+':'+hjCurrentWeek();
  if(key===byeKey)return;byeKey=key;wireRender(true);
 });
 // A tall priority slide must not leave a tall empty rail beneath ordinary cards.
 const heightScroll=wireScrollTo,heightDots=wireUpdateDots,heightRender=wireRender;
 let heightFrame=0,observed=null;
 const sizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>queueHeight()):null;
 function syncHeight(){
  heightFrame=0;
  const rail=document.querySelector('#wire-scroll'),active=wireCardNodes()[WIRE.index||0];if(!rail||!active)return;
  if(observed!==active){sizeObserver?.disconnect();sizeObserver?.observe(active);observed=active;}
  const standard=wireCardNodes().find(node=>!node.classList.contains('wp-group')),group=rail.querySelector('.wp-group');
  if(standard&&group){const normalHeight=standard.getBoundingClientRect().height+'px';if(group.style.getPropertyValue('--wp-standard-height')!==normalHeight)group.style.setProperty('--wp-standard-height',normalHeight);}
  const style=getComputedStyle(rail),height=Math.ceil(active.getBoundingClientRect().height+parseFloat(style.paddingTop||0)+parseFloat(style.paddingBottom||0));
  const value=height+'px';if(rail.style.height!==value)rail.style.setProperty('height',value,'important');
 }
 function queueHeight(){if(!heightFrame)heightFrame=requestAnimationFrame(syncHeight);}
 wireScrollTo=function(){const result=heightScroll.apply(this,arguments);queueHeight();return result;};
 wireUpdateDots=function(){const result=heightDots.apply(this,arguments);queueHeight();return result;};
 wireRender=function(){const result=heightRender.apply(this,arguments);queueHeight();return result;};
 window.addEventListener('resize',queueHeight,{passive:true});
 wireRender(true);
})();
