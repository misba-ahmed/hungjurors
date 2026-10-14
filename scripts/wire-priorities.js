/* Occasional priority announcements inside the existing Wire carousel.
 * Each announcement owns a full carousel card and a bottom navigation chip.
 * Use live roster/schedule data; never infer a bye from missing game data. */
(function(){
 const baseBuild=wireBuild,baseLabel=hjWireNavLabel;
 // Waiver countdown: one fixed five-player row, using the Players tab's feed.
 function waiverTrendingHTML(data){
  const api=window.hjWaiverTrends,rows=api?.players(data)||[];
  const players=Array.from({length:5},(_,index)=>{
   const row=rows[index];
   if(!row)return '<span class="ww-trend-player is-loading" aria-label="Loading trending free agent"><span class="ww-trend-photo"></span><strong>—</strong></span>';
   const p=row.player,photo=p.photo||nflHeadshot(p.id);
   const name=p.position==='D/ST'?p.name:p.name.replace(/^(\S)\S*\s+/, '$1. ');
   return '<button type="button" class="ww-trend-player pc-player-trigger" '+ffnPlayerDataAttrs(p)+' aria-label="'+esc(p.name)+', '+row.adds+' adds in the last 24 hours"><img class="ww-trend-photo'+(p.position==='D/ST'?' is-defense':'')+'" src="'+esc(photo)+'" alt="" loading="lazy" onerror="ffnImageFallback(this)"><span class="ww-trend-name" style="--ww-name-width:'+Math.max(4,name.length*.62)+'">'+esc(name)+'</span><strong>'+esc(api.format(row.adds))+'</strong></button>';
  }).join('');
  return '<a class="ww-trend-link" href="#players" data-waiver-trending title="Free agents sorted by adds in the last 24 hours">TRENDING PLAYERS ↗</a><div class="ww-trend-row" aria-label="Top five free agents by adds in the last 24 hours">'+players+'</div>';
 }
 const originalWaiverCard=wireWaiverCard;
 wireWaiverCard=function(data){
  const card=originalWaiverCard.apply(this,arguments);if(!card)return card;
  card.html=card.html.replace('class="wc is-red"','class="wc is-lead wc-waiver-trends"')
   .replace(/<div class="wire-hint">to set your waivers<\/div>/,'<div class="ww-trending">'+waiverTrendingHTML(data)+'</div>')
   .replace('class="wc-mgr" href="https://fantasy.espn.com/football/players/add','class="wc-mgr ww-espn-action" href="https://fantasy.espn.com/football/players/add');
  if(matchMedia('(pointer:coarse)').matches)card.html=card.html.replace('target="_blank"','target="_self"');
  queueMicrotask(()=>window.hjWaiverTrends?.refresh());
  return card;
 };
 const waiverStyle=document.createElement('style');waiverStyle.id='hj-waiver-trending-style';
 waiverStyle.textContent=`
 .wc.wc-waiver-trends{container-type:inline-size}
 .wc.wc-waiver-trends .wc-body{justify-content:space-evenly!important;gap:8px!important;padding-top:8px!important}
 .wc.wc-waiver-trends .wc-body::before,.wc.wc-waiver-trends .wc-body::after{display:none!important}
 .wc.wc-waiver-trends .wc-title{width:100%;max-width:560px;align-self:center;margin:0!important;font-size:clamp(26px,7cqw,34px)!important;line-height:1.12!important;text-wrap:balance;flex:0 0 auto}
 .wc.wc-waiver-trends .wc-copy{font-size:12px!important;line-height:1.35!important;margin:0!important;flex:0 0 auto}
 .wc.wc-waiver-trends .wc-count{width:100%;margin:0!important;flex:0 0 auto}
 .wc.wc-waiver-trends .wc-count .unit{min-width:0}
 .wc.wc-waiver-trends .wc-count .n{font-size:30px!important;padding:7px 2px 4px!important}
 .wc.wc-waiver-trends .wc-count .l{font-size:7px!important;letter-spacing:.1em!important;margin-top:4px!important}
 .wc.wc-waiver-trends .ww-trending{width:100%;margin:0;container-type:inline-size;flex:0 0 auto}
 .wc.wc-waiver-trends .ww-trend-link{display:block;width:fit-content;margin:0 auto 8px;color:var(--brass-bright);font:800 9px/1.2 var(--sans);letter-spacing:.09em;text-decoration:none}
 .wc.wc-waiver-trends .ww-trend-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;width:100%}
 .wc.wc-waiver-trends .ww-trend-player{appearance:none;display:grid;grid-template-rows:36px 1fr auto;justify-items:center;align-items:start;gap:4px;min-width:0;margin:0;padding:0;border:0;background:none;color:#83c991;cursor:pointer}
 .wc.wc-waiver-trends .ww-trend-photo{display:block;width:min(100%,36px);aspect-ratio:1;height:auto;box-sizing:border-box;object-fit:cover;object-position:top;border:1.5px solid rgba(247,243,232,.35);border-radius:50%;background:#f7f3e8}
 .wc.wc-waiver-trends .ww-trend-photo.is-defense{object-fit:contain}
 .wc.wc-waiver-trends .is-loading .ww-trend-photo{background:rgba(247,243,232,.12)}
 .wc.wc-waiver-trends .ww-trend-name{width:100%;min-width:0;min-height:1.2em;color:var(--paper);font:700 min(11px,2.8cqw,calc(16cqw / var(--ww-name-width,6)))/1.2 var(--sans);text-align:center;white-space:nowrap}
 .wc.wc-waiver-trends .ww-trend-player strong{font:800 clamp(8px,3.4cqw,12px)/1.2 var(--sans);white-space:nowrap;font-variant-numeric:tabular-nums}
 .wc.wc-waiver-trends .wc-spacer{display:none!important}
 .wc.wc-waiver-trends .ww-espn-action{flex:0 0 auto;align-self:center;margin:0!important}
 .wc.wc-waiver-trends :is(.ww-trend-link,.ww-trend-player):focus-visible{outline:2px solid var(--brass-bright);outline-offset:3px}
 @media(max-width:360px){.wc.wc-waiver-trends .wc-body{gap:6px!important}.wc.wc-waiver-trends .wc-title{font-size:24px!important}.wc.wc-waiver-trends .wc-copy{font-size:11px!important}.wc.wc-waiver-trends .ww-trend-row{gap:4px}.wc.wc-waiver-trends .ww-espn-action{font-size:9px!important}}
 `;
 document.head.append(waiverStyle);
 document.addEventListener('hj:waiver-trends',()=>{
  document.querySelectorAll('.wc-waiver-trends .ww-trending').forEach(node=>{
   const html=waiverTrendingHTML(HJ_LEAGUE_STATE.data);
   if(node.innerHTML!==html){if(window.hjPatchLiveContent)window.hjPatchLiveContent(node,html);else node.innerHTML=html}
  });
 });
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||!event.target.closest('[data-waiver-trending]'))return;
  event.preventDefault();wireCloseExpanded();window.hjWaiverTrends?.open();
 });
 // Let the phone handle ESPN's ordinary HTTPS links directly, without a new tab.
 if(matchMedia('(pointer:coarse)').matches)document.querySelector('.espn-float')?.setAttribute('target','_self');
 const priorityOrder=['kickoff','waivers','byes'];
 HJ_WIRE_ORDER.splice(0,HJ_WIRE_ORDER.length,...priorityOrder,...HJ_WIRE_ORDER.filter(s=>!priorityOrder.includes(s)&&!['this-week','byes','lms'].includes(s)));
 hjWireNavLabel=function(section,data){return ({byes:'Bye Week',lms:'Last Man Standing'})[section]||baseLabel(section,data)};
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
  return groups.sort((a,b)=>a.players.length-b.players.length||a.team.localeCompare(b.team));
 }
 function groupHTML(groups){
  const columns=groups.map(g=>{
   const name=typeof PC_TEAM_NAMES!=='undefined'?(PC_TEAM_NAMES[g.team]||g.team):g.team;
   const header='<div class="wp-team-header"><img src="'+esc(nflLogo(g.team))+'" alt=""><span>'+esc(name)+'</span></div>';
   const players=g.players.map(item=>'<div class="wp-person">'+wirePlayerHTML(item.player).replace('wc-player','wp-player').replace(/<small>[\s\S]*?<\/small>/,'<small>'+esc(item.manager)+'</small>')+'</div>').join('');
   return '<div class="wp-team-list" role="group" aria-label="'+esc(name)+' players">'+header+players+'</div>';
  });
  const stacks=[[],[]];columns.forEach((html,index)=>stacks[index%2].push(html));
  const stacked=stacks.filter(items=>items.length).map(items=>'<div class="wp-bye-column">'+items.join('')+'</div>').join('');
  return '<div class="wp-bye-list" tabindex="0" role="region" aria-label="Owned players on bye; scroll for all players" style="--wp-teams:'+Math.max(1,groups.length)+'">'+(stacked||'<p>No owned players on BYE.</p>')+'</div>';
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
 function announcement(kind,html){return {section:kind,html:'<div class="wc wp-single" data-wire-key="priority-'+kind+'" aria-label="'+({byes:'Bye Week',lms:'Last Man Standing',waivers:'Waivers'})[kind]+'">'+html+'</div>'};}
 wireBuild=function(data){
  const built=baseBuild.apply(this,arguments);if(!data?.teams?.length)return built;
  // Keep the original pre-grouped waiver card from baseBuild, including its
  // countdown, ESPN action and shared Wire expansion/gesture behavior.
  built.cards=built.cards.filter(c=>!['byes','lms'].includes(c.section));
  const week=Number(WIRE.previewWeek||hjCurrentWeek(data)),groups=byeGroups(data,week);
  if(groups.length)built.cards.push(announcement('byes',panel('byes','WEEK '+week+' · BYES','Teams on BYE this week',groupHTML(groups),'')));
  // Match the navy-and-gold live card while retaining the original waiver layout.
  built.cards.forEach(c=>{if(c.section==='waivers')c.html=c.html.replace('class="wc is-red"','class="wc is-lead"');});
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
 // A tall priority slide must not leave a tall empty rail beneath ordinary cards.
 const heightScroll=wireScrollTo,heightDots=wireUpdateDots,heightRender=wireRender;
 let heightFrame=0,observed=null;
 const sizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>queueHeight()):null;
 function syncHeight(){
  heightFrame=0;
  const rail=document.querySelector('#wire-scroll'),active=wireCardNodes()[WIRE.index||0];if(!rail||!active)return;
  if(observed!==active){sizeObserver?.disconnect();sizeObserver?.observe(active);observed=active;}
  const standard=wireCardNodes().find(node=>!node.classList.contains('wp-single')),groups=rail.querySelectorAll('.wp-single');
  if(standard){const normalHeight=standard.getBoundingClientRect().height+'px';groups.forEach(group=>{if(group.style.getPropertyValue('--wp-standard-height')!==normalHeight)group.style.setProperty('--wp-standard-height',normalHeight);});}
  const style=getComputedStyle(rail),height=Math.ceil(active.getBoundingClientRect().height+parseFloat(style.paddingTop||0)+parseFloat(style.paddingBottom||0));
  const value=height+'px';if(rail.style.height!==value)rail.style.setProperty('height',value,'important');
 }
 function queueHeight(){if(!heightFrame)heightFrame=requestAnimationFrame(syncHeight);}
 wireScrollTo=function(){const result=heightScroll.apply(this,arguments);queueHeight();return result;};
 wireUpdateDots=function(){const result=heightDots.apply(this,arguments);queueHeight();return result;};
 wireRender=function(){const result=heightRender.apply(this,arguments);queueHeight();return result;};
 window.addEventListener('resize',queueHeight,{passive:true});
 document.addEventListener('hj:bye-schedule',()=>{if(HJ_BYE_STATE.season===Number(NFL_SEASON))wireRender(true);});
 wireRender(true);
})();

