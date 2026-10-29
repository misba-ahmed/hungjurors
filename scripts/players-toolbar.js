/* Players tab refresh (Oct 29, 2026).
 *
 * 1. Toolbar: a compact sticky header. Search + All/Free agents + Filters on one row,
 *    position chips on the second, and a status strip that always says what the list is
 *    sorted by (with a tap-to-change hint and a clear control). Team, manager, season and
 *    stat-period filters live in a tray behind the Filters button on phones and sit inline
 *    on wider screens. The old "Sort By" dropdown is gone: every sort is a tap on a stat.
 * 2. Tiles: the card's THIS WEEK / SEASON boxes each hold two small buttons, FPTS and PROJ,
 *    beside the untouched PFF grade and Market boxes. Tapping a button ranks the list by it;
 *    tapping it again (or the ↓/↑ chip in the toolbar) flips the direction.
 * 3. The old footnote under the list is removed.
 *
 * Everything else (filters, search, projections flip chips, PFF / Market sorts, the stat
 * rail) keeps its existing handlers: this file only renders the markup and adds two sort
 * keys (weekActual, seasonActual). prepare-site.mjs routes hj40RefreshControls through
 * window.hjPlayersToolbarHTML and exposes the few directory helpers as window.HJ40_API.
 */
(function(){
 if(typeof HJ40_API==='undefined'||!HJ40_API.state||typeof HJ_HQ_STATE==='undefined'||typeof HJ_PLAYER_DIRECTORY==='undefined')return;
 const HJ40=HJ40_API.state;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const CUR=Number(typeof CURRENT_SEASON!=='undefined'?CURRENT_SEASON:NFL_SEASON),PREV=CUR-1;
 const PTB={count:null,src:new Map()};
 const mvSort=()=>typeof HJMV!=='undefined'&&HJMV.sort===true;
 const week=()=>HJ40_API.currentWeek();

 /* ---------- sort state ---------- */
 const SORTS={week:()=>`Wk ${week()} proj`,weekActual:()=>`Wk ${week()} pts`,season:()=>'Season proj',seasonActual:()=>'Season pts',rank:()=>'Position rank',name:()=>'Name'};
 function activeSort(){
  if(mvSort())return {kind:'mv',label:'Market value',dir:'desc'};
  if(HJ40.statSort)return {kind:'stat',key:HJ40.statSort,label:HJ40.statSort==='pffGrade'?'PFF grade':HJ40.statSort==='trend'?'Trend 24h':(HJ40_API.labels?.get(HJ40.statSort)||HJ40.statSort),dir:HJ40.statSortDir==='asc'?'asc':'desc'};
  const key=HJ_HQ_STATE.sort||'week';
  return {kind:'tile',key,label:(SORTS[key]||(()=>key))(),dir:HJ_HQ_STATE.sortDir==='asc'?'asc':'desc'};
 }
 const defaultSort=()=>{const s=activeSort();return s.kind==='tile'&&s.key==='week'&&s.dir==='desc'};
 function clearSort(){HJ_HQ_STATE.sort='week';HJ_HQ_STATE.sortDir='desc';HJ40.statSort='';if(typeof HJMV!=='undefined')HJMV.sort=false;HJ_PLAYER_DIRECTORY.renderLimit=36;HJ40_API.refreshControls();hjRenderPlayerDirectory(true)}
 const REVERSIBLE=['trend','oppRank'];
 function flipSort(){
  const s=activeSort();
  if(s.kind==='tile')HJ_HQ_STATE.sortDir=s.dir==='desc'?'asc':'desc';
  else if(s.kind==='stat'&&REVERSIBLE.includes(s.key))HJ40.statSortDir=s.dir==='desc'?'asc':'desc';
  else return;
  HJ_PLAYER_DIRECTORY.renderLimit=36;HJ40_API.refreshControls();hjRenderPlayerDirectory(true);
 }
 function setTileSort(key){
  const s=activeSort(),same=s.kind==='tile'&&s.key===key;
  HJ_HQ_STATE.sortDir=same&&s.dir==='desc'?'asc':'desc';
  HJ_HQ_STATE.sort=key;HJ40.statSort='';if(typeof HJMV!=='undefined')HJMV.sort=false;
  HJ_PLAYER_DIRECTORY.renderLimit=36;HJ40_API.refreshControls();hjRenderPlayerDirectory(true);
 }

 // Two new keys sort by what players actually scored; the projection keys gain a direction.
 function installFiltered(){
  if(typeof hjDirectoryFilteredRows!=='function'||hjDirectoryFilteredRows.__hjPtb)return;
  const base=hjDirectoryFilteredRows;
  const wrapped=function(){
   const rows=base.apply(this,arguments);PTB.count=rows.length;
   if(HJ40.statSort||mvSort())return rows;
   const key=HJ_HQ_STATE.sort,dir=HJ_HQ_STATE.sortDir==='asc'?-1:1;
   let value=null;
   if(key==='weekActual')value=p=>HJ40_API.gameStarted(p)?HJ40_API.actualWeek(p):null;
   else if(key==='seasonActual')value=p=>HJ40_API.actualSeason(p);
   else if(dir<0&&(key==='week'||key==='season'))value=p=>{const v=HJ40_API.projection(p,key);return Number.isFinite(v)?v:null};
   if(!value)return rows;
   const cache=new Map(),v=p=>{if(!cache.has(p)){const x=value(p);cache.set(p,Number.isFinite(x)?x:null)}return cache.get(p)};
   return rows.slice().sort((a,b)=>{const av=v(a),bv=v(b);if((av===null)!==(bv===null))return av===null?1:-1;if(av===null)return String(a.name).localeCompare(String(b.name));return dir*(bv-av)||String(a.name).localeCompare(String(b.name))});
  };
  wrapped.__hjPtb=true;window.hjDirectoryFilteredRows=hjDirectoryFilteredRows=wrapped;
 }
 

 /* ---------- toolbar ---------- */
 const POSITIONS=[['ALL','All'],['QB','QB'],['RB','RB'],['WR','WR'],['TE','TE'],['FLEX','Flex'],['K','K'],['D/ST','DST']];
 function filterCount(){return (HJ40.nflTeam&&HJ40.nflTeam!=='ALL'?1:0)+(HJ40.manager&&HJ40.manager!=='ALL'?1:0)+(Number(HJ40.year)!==CUR?1:0)+(HJ40.period&&HJ40.period!=='total'?1:0)}
 function anyFilter(){return filterCount()>0||!!HJ_HQ_STATE.query||HJ_HQ_STATE.position!=='ALL'||HJ_PLAYER_DIRECTORY.mode==='free'||!defaultSort()}
 function selectHTML(attrs,current,options){
  return `<label class="hj-ptb-sel${String(current)!==String(options[0][0])?' is-set':''}"><select ${attrs}>${options.map(([v,t])=>`<option value="${esc(v)}"${String(current)===String(v)?' selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
 }
 function filtersHTML(){
  const teams=[...new Set(HJ_PLAYER_DIRECTORY.rows.map(p=>pcTeam(p.team)).filter(t=>t&&t!=='FA'))].sort();
  const managers=[...new Set((HJ_LEAGUE_STATE?.data?.teams||[]).map(t=>hjMatchManager(t,HJ_LEAGUE_STATE.data)||hjOwnerName(t,HJ_LEAGUE_STATE.data)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const weeks=HJ40_API.availableWeeks();
  const periods=[['total','Total'],['avg','Per game'],...weeks.map(w=>[`w${w}`,`Wk ${w}`])];
  return selectHTML('data-hq46-team-select aria-label="NFL team"',HJ40.nflTeam||'ALL',[['ALL','Team'],...teams.map(t=>[t,t])])
   +selectHTML('data-hq49-manager-select aria-label="Manager"',HJ40.manager||'ALL',[['ALL','Manager'],...managers.map(m=>[m,m])])
   +selectHTML('data-hj-ptb-year aria-label="Stat season"',String(HJ40.year||CUR),[[String(CUR),String(CUR)],[String(PREV),String(PREV)]])
   +selectHTML('data-hj-ptb-period aria-label="Stat period"',HJ40.period||'total',periods);
 }
 window.hjPlayersToolbarHTML=function(){
  const mode=HJ_PLAYER_DIRECTORY.mode,sort=activeSort(),dflt=defaultSort();
  return `<div class="hq40-controls hj-ptb" data-hj-ptb>
   <div class="hj-ptb-row hj-ptb-main">
    <label class="hj-ptb-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13 13l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input class="hq-fa-control" id="hq-fa-search" type="search" placeholder="Search players" value="${esc(HJ_HQ_STATE.query)}" aria-label="Search players" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>
    <div class="hj-ptb-seg" role="group" aria-label="Player availability"><button type="button" data-hq-player-availability="all" aria-pressed="${mode!=='free'}">All</button><button type="button" data-hq-player-availability="free" aria-pressed="${mode==='free'}"><span>Free<br>Agents</span></button></div>
    <button type="button" class="hj-ptb-trend" data-hq40-sort-stat="trend" aria-pressed="${sort.kind==='stat'&&sort.key==='trend'}" title="Rank by Sleeper 24h adds/drops"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 14l5-5 3 3 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 6H17v4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Trend</span></button>
    ${dflt?`<span class="hj-ptb-hint">Tap any stat to sort</span>`:`<span class="hj-ptb-sort"><button type="button" data-hj-ptb-flip title="${REVERSIBLE.includes(sort.key)||sort.kind==='tile'?'Flip the order':'Sorted by '+esc(sort.label)}"><i>${sort.dir==='asc'?'↑':'↓'}</i>${esc(sort.label)}</button><button type="button" data-hj-ptb-clear-sort title="Clear sort" aria-label="Clear sort">×</button></span>`}
   </div>
   <div class="hj-ptb-row hj-ptb-sels">
    ${filtersHTML()}
    ${anyFilter()?'<button type="button" class="hj-ptb-clear" data-hq40-reset title="Reset filters and sort" aria-label="Reset filters and sort">×</button>':''}
   </div>
   <div class="hj-ptb-row hj-ptb-pos" role="group" aria-label="Position">${POSITIONS.map(([v,t])=>`<button type="button" data-hq40-position="${esc(v)}" aria-pressed="${HJ_HQ_STATE.position===v}">${esc(t)}</button>`).join('')}</div>
  </div>`;
 };

 /* ---------- tiles ---------- */
 // The card keeps its original THIS WEEK / SEASON / PFF / MARKET strip. Inside the THIS WEEK and SEASON
 // boxes the big number + sub line become two small side-by-side buttons: FPTS (what the player scored)
 // and PROJ (the E/V projection). Each is its own sort target; the active one is filled navy.
 function fmt(v){return Number.isFinite(v)?(typeof pcFpts==='function'?pcFpts(v):v.toFixed(2)):'—'}
 function btn(key,label,value,extra){
  const s=activeSort(),on=s.kind==='tile'&&s.key===key;
  return `<span class="hj-pt-btn${key==='week'||key==='season'?' is-proj':''}" role="button" tabindex="0" data-hj-sort="${key}" aria-pressed="${on}" title="Rank by ${esc(SORTS[key]())}"${extra||''}><small>${label}</small><b>${value}</b></span>`;
 }
 // The site's E/V chip flips on a click anywhere on it (a window-level listener), which would swallow the
 // sort tap. The PROJ button carries the values itself: the button sorts, only the small E/V badge flips.
 function projBtn(key,chip){
  if(!chip)return btn(key,'PROJ','<span class="hj-pt-dash">—</span>');
  const pk=chip.dataset.projKey||'',source=PTB.src.get(pk)||chip.dataset.projSource||'espn',v=chip.dataset[source==='vegas'?'projVegas':'projEspn']??'—';
  const badge=`<i class="hj-pt-src${source==='vegas'?' is-v':''}" role="button" tabindex="0" title="${source==='vegas'?'Vegas':'ESPN'} projection · tap for ${source==='vegas'?'ESPN':'Vegas'}">${source==='vegas'?'V':'E'}</i>`;
  return btn(key,`PROJ${badge}`,`<span class="hj-pt-num">${esc(v)}</span>`,` data-pt-key="${esc(pk)}" data-pt-espn="${esc(chip.dataset.projEspn??'—')}" data-pt-vegas="${esc(chip.dataset.projVegas??'—')}" data-pt-source="${source}"`);
 }
 function flipChip(src){
  const b=src.closest('[data-pt-key]');if(!b)return;
  const next=b.dataset.ptSource==='vegas'?'espn':'vegas';b.dataset.ptSource=next;PTB.src.set(b.dataset.ptKey,next);
  src.textContent=next==='vegas'?'V':'E';src.classList.toggle('is-v',next==='vegas');src.title=`${next==='vegas'?'Vegas':'ESPN'} projection · tap for ${next==='vegas'?'ESPN':'Vegas'}`;
  b.querySelector('.hj-pt-num').textContent=b.dataset[next==='vegas'?'ptVegas':'ptEspn'];
 }
 function rebuildCards(html){
  if(!/hq40-card/.test(html))return html;
  const byId=new Map(HJ_PLAYER_DIRECTORY.rows.map(p=>[String(p.id),p]));
  const t=document.createElement('template');t.innerHTML=html;
  t.content.querySelectorAll('.hq-player-directory-note').forEach(n=>n.remove());
  t.content.querySelectorAll('.hq40-card[data-hq-directory-id]').forEach(card=>{
   const p=byId.get(String(card.dataset.hqDirectoryId));
   const weekTile=card.querySelector('.hq40-week-proj'),seasonTile=card.querySelector('.hq40-season-proj');
   if(!p||!weekTile||!seasonTile||weekTile.querySelector('.hj-pt-pair'))return;
   const started=HJ40_API.gameStarted(p),actual=started?HJ40_API.actualWeek(p):null;
   const perf=typeof hjPerformanceAttrs==='function'&&Number.isFinite(actual)?' '+hjPerformanceAttrs(actual,p.espnWeekFpts):'';
   const seasonActual=HJ40_API.actualSeason(p);
   const fill=(tile,pair)=>{
    const chip=tile.querySelector('.hj-proj-flip');
    const html=`<span class="hj-pt-pair">${pair(chip)}</span>`;
    [...tile.children].forEach(n=>{if(!n.classList.contains('hq-player-proj-label'))n.remove()});
    tile.insertAdjacentHTML('beforeend',html);tile.classList.add('hj-pt-tile');
   };
   fill(weekTile,chip=>btn('weekActual','FPTS',`<span${Number.isFinite(actual)?` class="is-live-pts"${perf}`:''}>${fmt(Number.isFinite(actual)?actual:NaN)}</span>`)+projBtn('week',chip));
   fill(seasonTile,chip=>btn('seasonActual','FPTS',fmt(Number.isFinite(seasonActual)?seasonActual:NaN))+projBtn('season',chip));
   card.classList.add('hj-pt-card');
  });
  return t.innerHTML;
 }
 // Other files (player-value.js) wrap these later, when their feeds load; stay outermost.
 function installRows(){
  if(typeof hjDirectoryRowsHTML!=='function'||hjDirectoryRowsHTML.__hjPtb)return;
  const base=hjDirectoryRowsHTML;
  const wrapped=function(){return rebuildCards(base.apply(this,arguments))};
  wrapped.__hjPtb=true;window.hjDirectoryRowsHTML=hjDirectoryRowsHTML=wrapped;
 }

 /* ---------- handlers ---------- */
 document.addEventListener('click',e=>{
  const t=e.target.closest?.('[data-hj-sort]');
  // Inside a projection tile only the small E/V badge flips the source; the rest of the tile sorts.
  if(t&&t.closest('#hq-fa-results')){const src=e.target.closest('.hj-pt-src');e.preventDefault();e.stopPropagation();if(src)flipChip(src);else if(!e.target.closest('.hj-pff-info'))setTileSort(t.dataset.hjSort);return}
  // Market / PFF / stat-rail sorts keep their handlers; just drop the competing tile sort so the toolbar and rail agree.
  if(e.target.closest?.('[data-hjmv-sort]')){HJ40.statSort='';HJ_HQ_STATE.sort='week';HJ_HQ_STATE.sortDir='desc';return}
  if(e.target.closest?.('[data-hq40-sort-stat]')){HJ_HQ_STATE.sort='week';HJ_HQ_STATE.sortDir='desc';return}
  if(e.target.closest?.('[data-hq40-reset]')){HJ_HQ_STATE.sortDir='desc';if(typeof HJMV!=='undefined')HJMV.sort=false;return}
  if(e.target.closest?.('[data-hj-ptb-clear-sort]')){e.preventDefault();e.stopPropagation();clearSort();return}
  if(e.target.closest?.('[data-hj-ptb-flip]')){e.preventDefault();e.stopPropagation();flipSort();return}
 },true);
 document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;if(e.target.matches?.('.hj-pt-src')){e.preventDefault();flipChip(e.target)}else if(e.target.matches?.('[data-hj-sort]')){e.preventDefault();setTileSort(e.target.dataset.hjSort)}});
 document.addEventListener('change',e=>{
  if(e.target.matches?.('[data-hj-ptb-year]')){HJ40.year=Number(e.target.value)||CUR;HJ40.snapshotCache.clear();HJ40_API.refreshControls();hjRenderPlayerDirectory(false);HJ40_API.ensureSeason?.(HJ40.year)?.catch?.(()=>{});return}
  if(e.target.matches?.('[data-hj-ptb-period]')){HJ40.period=e.target.value||'total';if(HJ40.period==='total'&&HJ40.statSort==='snap')HJ40.statSort='';HJ40.snapshotCache.clear();HJ40_API.refreshControls();hjRenderPlayerDirectory(false);return}
  // Team / manager selects keep their existing handlers; refresh the toolbar so the badge and count follow.
  if(e.target.matches?.('[data-hq46-team-select],[data-hq49-manager-select]'))setTimeout(()=>HJ40_API.refreshControls(),0);
 });
 // The count comes from the filtered list, which is only known after a render.
 if(typeof hjRenderPlayerDirectory==='function'&&!hjRenderPlayerDirectory.__hjPtb){
  const base=hjRenderPlayerDirectory;
  const wrapped=function(){installFiltered();installRows();const r=base.apply(this,arguments);const hasClear=!!document.querySelector('.hj-ptb [data-hq40-reset]');if(hasClear!==anyFilter())HJ40_API.refreshControls();return r};
  wrapped.__hjPtb=true;window.hjRenderPlayerDirectory=hjRenderPlayerDirectory=wrapped;
 }
 // player-value.js wraps the same functions on DOMContentLoaded; install after it so this file stays outermost.
 function boot(){installFiltered();installRows();if(document.querySelector('#hq-panel-free-agents .hq40-controls:not([data-hj-ptb])'))HJ40_API.refreshControls();if(document.querySelector('#hq-fa-results .hq40-card:not(.hj-pt-card)'))hjRenderPlayerDirectory(false)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
