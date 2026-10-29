/* Players tab refresh (Oct 29, 2026).
 *
 * 1. Toolbar: a compact sticky header in three rows: search · All/Free agents · Trend · the sort
 *    hint (or the active sort with ↓/↑ and ×); Team · Manager · Season · Period dropdowns with a
 *    reset ×; position chips with one E | V projection-source switch. There is no Sort By dropdown:
 *    every sort is a tap on a stat.
 * 2. Tiles: the card keeps its THIS WEEK / SEASON / PFF / MARKET strip. THIS WEEK and SEASON each
 *    hold two small buttons, FPTS and PROJ. Tapping one ranks the list by it; tapping it again (or
 *    the ↓/↑ in the toolbar) flips the direction. The PROJ value follows the E | V switch, and so
 *    does the projection sort.
 * 3. The old footnote under the list is removed, and "D/ST" is written as "DST" before the cards
 *    reach the page (the site's own clean-up pass otherwise shows "D/ST" for a moment).
 *
 * Everything else (filters, search, PFF / Market sorts, the stat rail) keeps its existing handlers:
 * this file renders the markup and adds two sort keys (weekActual, seasonActual). prepare-site.mjs
 * routes the toolbar renderers through window.hjPlayersToolbarHTML and exposes the few directory
 * helpers this file needs as window.HJ40_API.
 */
(function(){
 if(typeof HJ40_API==='undefined'||!HJ40_API.state||typeof HJ_HQ_STATE==='undefined'||typeof HJ_PLAYER_DIRECTORY==='undefined')return;
 const HJ40=HJ40_API.state;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const CUR=Number(typeof CURRENT_SEASON!=='undefined'?CURRENT_SEASON:NFL_SEASON),PREV=CUR-1;
 const PTB={count:null,source:'espn'};
 const mvSort=()=>typeof HJMV!=='undefined'&&HJMV.sort===true;
 const week=()=>HJ40_API.currentWeek();

 /* ---------- projections (one source for the whole list) ---------- */
 const num=v=>Number.isFinite(v)?v:null;
 // The value a PROJ button shows and the projection sort uses: the chosen source, else the other one.
 function projOf(p,key){
  const e=num(key==='season'?p.espnSeasonFpts:p.espnWeekFpts),v=num(key==='season'?p.vegasSeasonFpts:p.vegasWeekFpts);
  if(PTB.source==='vegas')return v!==null?{value:v,src:'V'}:e!==null?{value:e,src:'E'}:null;
  return e!==null?{value:e,src:'E'}:v!==null?{value:v,src:'V'}:null;
 }

 /* ---------- sort state ---------- */
 const SORTS={week:()=>`Wk ${week()} proj`,weekActual:()=>`Wk ${week()} pts`,season:()=>'Season proj',seasonActual:()=>'Season pts',rank:()=>'Position rank',name:()=>'Name'};
 function activeSort(){
  if(mvSort())return {kind:'mv',label:'Market value',dir:'desc'};
  if(HJ40.statSort)return {kind:'stat',key:HJ40.statSort,label:HJ40.statSort==='pffGrade'?'PFF grade':HJ40.statSort==='trend'?'Trend 24h':(HJ40_API.labels?.get(HJ40.statSort)||HJ40.statSort),dir:HJ40.statSortDir==='asc'?'asc':'desc'};
  const key=HJ_HQ_STATE.sort||'week';
  return {kind:'tile',key,label:(SORTS[key]||(()=>key))(),dir:HJ_HQ_STATE.sortDir==='asc'?'asc':'desc'};
 }
 const defaultSort=()=>{const s=activeSort();return s.kind==='tile'&&s.key==='week'&&s.dir==='desc'};
 const rerender=()=>{HJ_PLAYER_DIRECTORY.renderLimit=36;HJ40_API.refreshControls();hjRenderPlayerDirectory(true)};
 function clearSort(){HJ_HQ_STATE.sort='week';HJ_HQ_STATE.sortDir='desc';HJ40.statSort='';if(typeof HJMV!=='undefined')HJMV.sort=false;rerender()}
 const REVERSIBLE=['trend','oppRank'];
 const canFlip=s=>s.kind==='tile'||(s.kind==='stat'&&REVERSIBLE.includes(s.key));
 function flipSort(){
  const s=activeSort();if(!canFlip(s))return;
  if(s.kind==='tile')HJ_HQ_STATE.sortDir=s.dir==='desc'?'asc':'desc';else HJ40.statSortDir=s.dir==='desc'?'asc':'desc';
  rerender();
 }
 function setTileSort(key){
  const s=activeSort(),same=s.kind==='tile'&&s.key===key;
  HJ_HQ_STATE.sortDir=same&&s.dir==='desc'?'asc':'desc';
  HJ_HQ_STATE.sort=key;HJ40.statSort='';if(typeof HJMV!=='undefined')HJMV.sort=false;
  rerender();
 }
 function setSource(src){if(src!=='espn'&&src!=='vegas'||src===PTB.source)return;PTB.source=src;rerender()}

 // The new keys (what players actually scored) and the projection keys, in both directions and
 // from the chosen source. Players without a value always go last.
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
   else if(key==='week'||key==='season')value=p=>projOf(p,key)?.value??null;
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
 function selectHTML(cls,attrs,current,options){
  return `<label class="hj-ptb-sel ${cls}${String(current)!==String(options[0][0])?' is-set':''}"><select ${attrs}>${options.map(([v,t])=>`<option value="${esc(v)}"${String(current)===String(v)?' selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
 }
 function filtersHTML(){
  const teams=[...new Set(HJ_PLAYER_DIRECTORY.rows.map(p=>pcTeam(p.team)).filter(t=>t&&t!=='FA'))].sort();
  const managers=[...new Set((HJ_LEAGUE_STATE?.data?.teams||[]).map(t=>hjMatchManager(t,HJ_LEAGUE_STATE.data)||hjOwnerName(t,HJ_LEAGUE_STATE.data)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const periods=[['total','Season Totals'],['avg','Season Averages'],...HJ40_API.availableWeeks().map(w=>[`w${w}`,`Week ${w}`])];
  return selectHTML('is-team','data-hq46-team-select aria-label="NFL team"',HJ40.nflTeam||'ALL',[['ALL','Team'],...teams.map(t=>[t,t])])
   +selectHTML('is-manager','data-hq49-manager-select aria-label="Manager"',HJ40.manager||'ALL',[['ALL','Manager'],...managers.map(m=>[m,m])])
   +selectHTML('is-year','data-hj-ptb-year aria-label="Stat season"',String(HJ40.year||CUR),[[String(CUR),String(CUR)],[String(PREV),String(PREV)]])
   +selectHTML('is-period','data-hj-ptb-period aria-label="Stat period"',HJ40.period||'total',periods);
 }
 window.hjPlayersToolbarHTML=function(){
  const mode=HJ_PLAYER_DIRECTORY.mode,sort=activeSort(),dflt=defaultSort();
  return `<div class="hq40-controls hj-ptb" data-hj-ptb>
   <div class="hj-ptb-row hj-ptb-main">
    <label class="hj-ptb-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13 13l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input class="hq-fa-control" id="hq-fa-search" type="search" placeholder="Search players" value="${esc(HJ_HQ_STATE.query)}" aria-label="Search players" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>
    <div class="hj-ptb-seg" role="group" aria-label="Player availability"><button type="button" data-hq-player-availability="all" aria-pressed="${mode!=='free'}">All</button><button type="button" data-hq-player-availability="free" aria-pressed="${mode==='free'}"><span>Free<br>Agents</span></button></div>
    <button type="button" class="hj-ptb-trend" data-hq40-sort-stat="trend" aria-pressed="${sort.kind==='stat'&&sort.key==='trend'}" title="Rank by Sleeper 24h adds/drops"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 14l5-5 3 3 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 6H17v4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Trend</span></button>
    ${dflt?`<span class="hj-ptb-hint">Tap any stat to sort</span>`:`<span class="hj-ptb-sort"><button type="button" data-hj-ptb-flip${canFlip(sort)?' title="Flip the order"':' disabled'}><i>${sort.dir==='asc'?'↑':'↓'}</i>${esc(sort.label)}</button><button type="button" data-hj-ptb-clear-sort title="Clear sort" aria-label="Clear sort">×</button></span>`}
   </div>
   <div class="hj-ptb-row hj-ptb-sels">
    ${filtersHTML()}
    ${anyFilter()?'<button type="button" class="hj-ptb-clear" data-hq40-reset title="Reset filters and sort" aria-label="Reset filters and sort">×</button>':''}
   </div>
   <div class="hj-ptb-row hj-ptb-pos">
    <div class="hj-ptb-chips" role="group" aria-label="Position">${POSITIONS.map(([v,t])=>`<button type="button" data-hq40-position="${esc(v)}" aria-pressed="${HJ_HQ_STATE.position===v}">${esc(t)}</button>`).join('')}</div>
    <div class="hj-ptb-src" role="group" aria-label="Projections"><button type="button" data-hj-ptb-src="espn" aria-pressed="${PTB.source==='espn'}" title="ESPN projections">E</button><button type="button" data-hj-ptb-src="vegas" aria-pressed="${PTB.source==='vegas'}" title="Vegas projections">V</button></div>
   </div>
  </div>`;
 };

 // The site patches the live toolbar in place. A dropdown or search box the reader already changed
 // keeps showing its old value after a patch (the browser ignores markup changes on an edited field),
 // so after every patch the fields are set to what the new markup says.
 window.hjPlayersToolbarSync=function(){
  const bar=document.querySelector('#hq-panel-free-agents .hj-ptb');if(!bar)return;
  bar.querySelectorAll('select').forEach(sel=>{const want=sel.querySelector('option[selected]')||sel.options[0];if(want&&sel.value!==want.value)sel.value=want.value});
  const input=bar.querySelector('#hq-fa-search');if(input&&document.activeElement!==input){const want=input.getAttribute('value')||'';if(input.value!==want)input.value=want}
 };

 /* ---------- tiles ---------- */
 function fmt(v){return Number.isFinite(v)?(typeof pcFpts==='function'?pcFpts(v):v.toFixed(2)):'—'}
 function btn(key,label,value){
  const s=activeSort(),on=s.kind==='tile'&&s.key===key;
  return `<span class="hj-pt-btn${key==='week'||key==='season'?' is-proj':''}" role="button" tabindex="0" data-hj-sort="${key}" aria-pressed="${on}" title="Rank by ${esc(SORTS[key]())}"><small>${label}</small><b>${value}</b></span>`;
 }
 function projBtn(p,key){
  const proj=projOf(p,key),loading=!proj&&!p._espnTried;
  return btn(key,`PROJ <i class="hj-pt-tag${proj?.src==='V'?' is-v':''}">${proj?.src||(PTB.source==='vegas'?'V':'E')}</i>`,proj?fmt(proj.value):`<span class="hj-pt-dash">${loading?'…':'—'}</span>`);
 }
 function rebuildCards(html){
  if(!/hq40-card/.test(html))return html;
  const byId=new Map(HJ_PLAYER_DIRECTORY.rows.map(p=>[String(p.id),p]));
  const t=document.createElement('template');t.innerHTML=html;
  t.content.querySelectorAll('.hq-player-directory-note').forEach(n=>n.remove());
  t.content.querySelectorAll('.hq40-card[data-hq-directory-id]').forEach(card=>{
   const p=byId.get(String(card.dataset.hqDirectoryId));
   card.classList.add('hj-pt-card');
   const weekTile=card.querySelector('.hq40-week-proj'),seasonTile=card.querySelector('.hq40-season-proj');
   if(!p||!weekTile||!seasonTile||weekTile.querySelector('.hj-pt-pair'))return;
   const started=HJ40_API.gameStarted(p),actual=started?HJ40_API.actualWeek(p):null;
   const perf=typeof hjPerformanceAttrs==='function'&&Number.isFinite(actual)?' '+hjPerformanceAttrs(actual,p.espnWeekFpts):'';
   const seasonActual=HJ40_API.actualSeason(p);
   const fill=(tile,inner)=>{
    [...tile.children].forEach(n=>{if(!n.classList.contains('hq-player-proj-label'))n.remove()});
    tile.insertAdjacentHTML('beforeend',`<span class="hj-pt-pair">${inner}</span>`);tile.classList.add('hj-pt-tile');
   };
   fill(weekTile,btn('weekActual','FPTS',Number.isFinite(actual)?`<span class="is-live-pts"${perf}>${fmt(actual)}</span>`:'<span class="hj-pt-dash">—</span>')+projBtn(p,'week'));
   fill(seasonTile,btn('seasonActual','FPTS',Number.isFinite(seasonActual)?fmt(seasonActual):'<span class="hj-pt-dash">—</span>')+projBtn(p,'season'));
  });
  // Write DST the way the rest of the site shows it before the cards are on screen.
  const walker=document.createTreeWalker(t.content,NodeFilter.SHOW_TEXT);let n;
  while((n=walker.nextNode()))if(n.nodeValue.includes('D/ST'))n.nodeValue=n.nodeValue.replaceAll('D/ST','DST');
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
  if(t&&t.closest('#hq-fa-results')){e.preventDefault();e.stopPropagation();setTileSort(t.dataset.hjSort);return}
  const src=e.target.closest?.('[data-hj-ptb-src]');
  if(src){e.preventDefault();e.stopPropagation();setSource(src.dataset.hjPtbSrc);return}
  // Market / PFF / stat-rail sorts keep their handlers; just drop the competing tile sort so the toolbar and rail agree.
  if(e.target.closest?.('[data-hjmv-sort]')){HJ40.statSort='';HJ_HQ_STATE.sort='week';HJ_HQ_STATE.sortDir='desc';return}
  if(e.target.closest?.('[data-hq40-sort-stat]')){HJ_HQ_STATE.sort='week';HJ_HQ_STATE.sortDir='desc';return}
  if(e.target.closest?.('[data-hq40-reset]')){HJ_HQ_STATE.sortDir='desc';PTB.source='espn';if(typeof HJMV!=='undefined')HJMV.sort=false;return}
  if(e.target.closest?.('[data-hj-ptb-clear-sort]')){e.preventDefault();e.stopPropagation();clearSort();return}
  if(e.target.closest?.('[data-hj-ptb-flip]')){e.preventDefault();e.stopPropagation();flipSort();return}
 },true);
 document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('[data-hj-sort]')){e.preventDefault();setTileSort(e.target.dataset.hjSort)}});
 document.addEventListener('change',e=>{
  if(e.target.matches?.('[data-hj-ptb-year]')){HJ40.year=Number(e.target.value)||CUR;HJ40.snapshotCache.clear();HJ40_API.refreshControls();hjRenderPlayerDirectory(false);HJ40_API.ensureSeason?.(HJ40.year)?.catch?.(()=>{});return}
  if(e.target.matches?.('[data-hj-ptb-period]')){HJ40.period=e.target.value||'total';if(HJ40.period==='total'&&HJ40.statSort==='snap')HJ40.statSort='';HJ40.snapshotCache.clear();HJ40_API.refreshControls();hjRenderPlayerDirectory(false);return}
  // Team / manager selects keep their existing handlers; refresh the toolbar so the reset × follows.
  if(e.target.matches?.('[data-hq46-team-select],[data-hq49-manager-select]'))setTimeout(()=>HJ40_API.refreshControls(),0);
 });
 // A sort or filter tap is followed by up to two hydration re-renders that produce the same HTML.
 // Rebuilding identical cards swallows a tap that lands mid-rebuild and makes the list blink, so the
 // list is only replaced when its markup actually changed.
 const htmlSetter=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
 function guardResults(){
  const t=document.getElementById('hq-fa-results');if(!t||t.__hjPtbGuard||!htmlSetter)return;t.__hjPtbGuard=true;let last=null;
  Object.defineProperty(t,'innerHTML',{configurable:true,get(){return htmlSetter.get.call(this)},set(v){if(v===last&&this.firstElementChild)return;last=v;htmlSetter.set.call(this,v)}});
 }
 // The site's live patcher keeps the card nearest the top of the screen in place when the list is
 // rebuilt. That suits a live refresh, but after a new sort that card has moved to its new rank and the
 // page chased it. When the order or the filters change, show the new list from #1 instead, just under
 // the sticky toolbar (only if the reader had scrolled into the list).
 let lastView=null;
 const viewKey=()=>JSON.stringify([HJ_HQ_STATE.sort,HJ_HQ_STATE.sortDir,HJ40.statSort,HJ40.statSortDir,mvSort(),PTB.source,HJ_HQ_STATE.position,HJ_PLAYER_DIRECTORY.mode,HJ40.nflTeam,HJ40.manager,HJ40.year,HJ40.period,HJ_HQ_STATE.query]);
 function showListTop(){
  const list=document.getElementById('hq-fa-results'),bar=document.querySelector('#hq-panel-free-agents .hj-ptb');if(!list||!bar||!list.getClientRects().length)return;
  const under=bar.getBoundingClientRect().bottom,top=list.getBoundingClientRect().top;
  if(top<under-1)window.scrollTo({top:Math.max(0,scrollY+top-under-6),behavior:'instant'});
 }
 if(typeof hjRenderPlayerDirectory==='function'&&!hjRenderPlayerDirectory.__hjPtb){
  const base=hjRenderPlayerDirectory;
  const wrapped=function(){installFiltered();installRows();guardResults();const view=viewKey(),changed=lastView!==null&&view!==lastView;lastView=view;const r=base.apply(this,arguments);if(changed)showListTop();const hasClear=!!document.querySelector('.hj-ptb [data-hq40-reset]');if(hasClear!==anyFilter())HJ40_API.refreshControls();return r};
  wrapped.__hjPtb=true;window.hjRenderPlayerDirectory=hjRenderPlayerDirectory=wrapped;
 }
 // player-value.js wraps the same functions on DOMContentLoaded; install after it so this file stays outermost.
 function boot(){installFiltered();installRows();if(document.querySelector('#hq-panel-free-agents .hq40-controls:not([data-hj-ptb])'))HJ40_API.refreshControls();if(document.querySelector('#hq-fa-results .hq40-card:not(.hj-pt-card)'))hjRenderPlayerDirectory(false)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
