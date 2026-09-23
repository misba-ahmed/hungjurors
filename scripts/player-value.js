/* =====================================================================
   MARKET VALUE
   A consensus price for every player, built from completed trades in
   real fantasy leagues. Settings are fixed at redraft · 10 teams · 1 QB ·
   full PPR · tight-end premium, so every figure on the site is directly
   comparable. The published feed (data/player-values.json) is refreshed
   by the site's scheduled workflow; the live endpoint is a fallback so a
   fresh checkout still shows values before the first refresh runs.
   ===================================================================== */
(function(){
 if(window.HJMV)return;
 const FEED='./data/player-values.json';
 const LIVE='https://api.fantasycalc.com/values/current?isDynasty=false&numQbs=1&numTeams=10&ppr=1&tep=te%2B';
 const LIVE_COUNT='https://api.fantasycalc.com/trades/count';
 const POSITIONS=['QB','RB','WR','TE'];
 const MAX_AGE=36*60*60*1000, POLL=15*60*1000;

 const HJMV={rows:[],byEspn:new Map(),byKey:new Map(),trades:null,count:0,generatedAt:0,ready:false,error:'',pending:null,fetchedAt:0,retryAt:0,sort:false};
 window.HJMV=HJMV;

 /* ---------- helpers ---------- */
 const esc0=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const escape=s=>typeof esc==='function'?esc(s):esc0(s);
 const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\b(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z]/g,'');
 const key=(name,pos)=>`${norm(name)}|${String(pos||'').toUpperCase()}`;
 const num=v=>Number.isFinite(Number(v))?Number(v):null;

 function fmtValue(v){return Number.isFinite(v)?Number(Math.round(v)).toLocaleString('en-US'):'—'}
 function fmtTrades(n){return Number.isFinite(n)&&n>0?Number(n).toLocaleString('en-US'):'millions of'}
 function posRankLabel(row){return row&&Number.isFinite(row.positionRank)?`${row.position}${row.positionRank}`:''}
 HJMV.fmt=fmtValue;

 /* ---------- feed ---------- */
 function ingest(payload,origin){
  const list=Array.isArray(payload?.players)?payload.players:Array.isArray(payload)?payload:null;
  if(!list||list.length<50)throw Error('Market value feed returned no players');
  const rows=list.map(raw=>{
   const p=raw?.player||raw;
   return {
    espnId:String(p?.espnId??raw?.espnId??''),
    sleeperId:String(p?.sleeperId??raw?.sleeperId??''),
    name:String(p?.name??raw?.name??''),
    position:String(p?.position??raw?.pos??raw?.position??'').toUpperCase(),
    team:String(p?.maybeTeam??raw?.team??''),
    value:num(raw?.value),
    trend30:num(raw?.trend30Day??raw?.trend30),
    tier:num(raw?.maybeTier??raw?.tier),
    rostered:num(raw?.maybeRosterPercent??raw?.rostered)
   };
  }).filter(r=>r.name&&POSITIONS.includes(r.position)&&Number.isFinite(r.value)&&r.value>0);
  if(rows.length<50)throw Error('Market value feed schema mismatch');
  /* Ranks are recomputed from the published values so the rank always agrees with the number beside it. */
  rows.sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name));
  const seen=Object.create(null);
  rows.forEach((row,index)=>{row.overallRank=index+1;seen[row.position]=(seen[row.position]||0)+1;row.positionRank=seen[row.position]});
  HJMV.rows=rows;
  HJMV.byEspn=new Map(rows.filter(r=>r.espnId&&r.espnId!=='null').map(r=>[r.espnId,r]));
  HJMV.byKey=new Map();
  rows.forEach(r=>{const k=key(r.name,r.position);if(!HJMV.byKey.has(k))HJMV.byKey.set(k,r)});
  HJMV.count=rows.length;
  HJMV.positionCounts=seen;
  const trades=num(payload?.trades);
  if(Number.isFinite(trades)&&trades>0)HJMV.trades=trades;
  HJMV.generatedAt=num(payload?.generatedAt)||Date.now();
  HJMV.ready=true;HJMV.error='';HJMV.fetchedAt=Date.now();HJMV.origin=origin;
  paintExplainer();
  document.dispatchEvent(new CustomEvent('hj:market-updated',{detail:{rows:rows.length,origin}}));
  return HJMV;
 }

 async function fetchJson(url,signal){
  const response=await fetch(url,{credentials:'omit',cache:'no-store',signal});
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  return response.json();
 }

 async function loadFeed(force){
  if(HJMV.pending)return HJMV.pending;
  if(!force&&HJMV.ready&&Date.now()-HJMV.fetchedAt<POLL)return HJMV;
  if(!force&&HJMV.retryAt>Date.now())return HJMV;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  const job=(async()=>{
   try{
    const url=new URL(FEED,document.baseURI);url.searchParams.set('v',Math.floor(Date.now()/60000));
    const payload=await fetchJson(url.href,controller.signal);
    const age=Date.now()-(num(payload?.generatedAt)||0);
    if(!(age<MAX_AGE))throw Error('Published market values are stale');
    return ingest(payload,'feed');
   }catch(feedError){
    /* The published feed is the normal path. A direct read keeps values on screen before the first refresh. */
    try{
     const [list,count]=await Promise.all([
      fetchJson(LIVE,controller.signal),
      fetch(LIVE_COUNT,{credentials:'omit',cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.text():'').catch(()=>'')
     ]);
     const trades=Number(String(count).replace(/[^0-9]/g,''));
     return ingest({players:list,trades:Number.isFinite(trades)&&trades>0?trades:HJMV.trades,generatedAt:Date.now()},'live');
    }catch(liveError){
     if(!HJMV.ready){HJMV.error='Market values unavailable';}
     HJMV.retryAt=Date.now()+120000;
     console.warn('[Market Value]',feedError.message,'·',liveError.message);
     return HJMV;
    }
   }finally{clearTimeout(timer);}
  })();
  HJMV.pending=job;try{return await job}finally{HJMV.pending=null;clearTimeout(timer)}
 }
 HJMV.load=loadFeed;

 /* ---------- lookup ---------- */
 function lookup(like){
  if(!like)return null;
  if(!HJMV.ready)return null;
  const id=String(like.id??like.playerId??like.espnId??'');
  if(id&&HJMV.byEspn.has(id))return HJMV.byEspn.get(id);
  const name=like.name||like.fullName||like.displayName||'';
  const position=String(like.position||'').toUpperCase();
  if(!name)return null;
  if(position)return HJMV.byKey.get(key(name,position))||null;
  for(const pos of POSITIONS){const hit=HJMV.byKey.get(key(name,pos));if(hit)return hit}
  return null;
 }
 HJMV.lookup=lookup;
 HJMV.ingest=ingest;

 function entryRow(entry){
  if(!entry)return null;
  const player=typeof hjPlayer==='function'?(hjPlayer(entry)||{}):{};
  const id=String(player.id??entry.playerId??entry.id??'');
  if(id&&HJMV.byEspn.has(id))return HJMV.byEspn.get(id);
  const name=player.fullName||player.displayName||player.name||entry.name||'';
  const position=typeof hjPlayerPosition==='function'?hjPlayerPosition(entry):(entry.position||'');
  return lookup({id,name,position});
 }
 HJMV.entryRow=entryRow;
 function entryValue(entry){const row=entryRow(entry);return row?row.value:null}
 HJMV.entryValue=entryValue;

 /* ---------- explainer ---------- */
 function explainerHTML(){
  return `<button type="button" class="hj-pff-info-close" popovertarget="hj-mv-explanation" popovertargetaction="hide" aria-label="Close explanation">×</button>`
   +`<strong id="hj-mv-info-title">Market Value</strong>`
   +`<p data-hjmv-copy>Fantasy player value generated from <b data-hjmv-trades>${fmtTrades(HJMV.trades)}</b> trades from real fantasy football leagues across all major platforms.</p>`;
 }
 function installExplainer(){
  if(document.getElementById('hj-mv-explanation'))return;
  const node=document.createElement('div');
  node.id='hj-mv-explanation';node.setAttribute('popover','auto');node.setAttribute('role','dialog');node.setAttribute('aria-labelledby','hj-mv-info-title');
  node.innerHTML=explainerHTML();
  document.body.appendChild(node);
 }
 function paintExplainer(){
  const node=document.querySelector('#hj-mv-explanation [data-hjmv-trades]');
  if(node)node.textContent=fmtTrades(HJMV.trades);
 }
 function infoButton(label){return `<button type="button" class="hj-pff-info hjmv-info" popovertarget="hj-mv-explanation" aria-label="What is Market Value?">i</button>`}
 HJMV.infoButton=infoButton;

 /* =====================================================================
    Surface 1 · Player profile card
    A full-width strip under the category row: the price, where he ranks
    at his position, his overall rank and his 30-day drift.
    ===================================================================== */
 function profileStrip(player,season){
  if(Number(season)!==Number(typeof NFL_SEASON!=='undefined'?NFL_SEASON:season))return '';
  const position=String(player?.position||'').toUpperCase();
  if(!POSITIONS.includes(position))return '';
  const id=String(player?.id||'');
  const row=HJMV.ready?lookup({id,name:player?.name,position}):null;
  const trend=row&&Number.isFinite(row.trend30)?row.trend30:null;
  const state=HJMV.ready?(row?'':'Not priced'):(HJMV.error||'Loading…');
  if(!HJMV.ready)queueMicrotask(()=>loadFeed());
  return `<section class="hjmv-strip" data-hjmv-strip="${escape(id)}" data-hjmv-position="${escape(position)}" aria-label="Market value">
   <div class="hjmv-strip-head"><span class="hjmv-label">Market Value ${infoButton()}</span><span class="hjmv-state" data-hjmv-state>${escape(state)}</span></div>
   <div class="hjmv-strip-body">
    <div class="hjmv-figure"><strong data-hjmv-value>${row?fmtValue(row.value):'—'}</strong></div>
    <div class="hjmv-facts">
     <span class="hjmv-chip is-pos" data-hjmv-posrank>${row?escape(posRankLabel(row)):'—'}</span>
     <span class="hjmv-fact"><small>Overall</small><b data-hjmv-overall>${row&&Number.isFinite(row.overallRank)?'#'+row.overallRank:'—'}</b></span>
     <span class="hjmv-fact"><small>30-day</small><b class="${trend>0?'is-up':trend<0?'is-down':''}" data-hjmv-trend>${Number.isFinite(trend)?(trend>0?'▲ +':trend<0?'▼ ':'')+Math.abs(trend).toLocaleString('en-US'):'—'}</b></span>
     <span class="hjmv-fact"><small>Rostered</small><b data-hjmv-rostered>${row&&Number.isFinite(row.rostered)?Math.round(row.rostered*100)+'%':'—'}</b></span>
    </div>
   </div>
  </section>`;
 }
 HJMV.profileStrip=profileStrip;

 function paintStrips(){
  document.querySelectorAll('[data-hjmv-strip]').forEach(strip=>{
   const id=strip.dataset.hjmvStrip,position=strip.dataset.hjmvPosition;
   const row=lookup({id,position,name:strip.dataset.hjmvName});
   const set=(selector,text)=>{const node=strip.querySelector(selector);if(node&&node.textContent!==text)node.textContent=text};
   set('[data-hjmv-value]',row?fmtValue(row.value):'—');
   set('[data-hjmv-posrank]',row?posRankLabel(row):'—');
   set('[data-hjmv-overall]',row&&Number.isFinite(row.overallRank)?'#'+row.overallRank:'—');
   const trend=row&&Number.isFinite(row.trend30)?row.trend30:null;
   set('[data-hjmv-trend]',Number.isFinite(trend)?(trend>0?'▲ +':trend<0?'▼ ':'')+Math.abs(trend).toLocaleString('en-US'):'—');
   const trendNode=strip.querySelector('[data-hjmv-trend]');
   if(trendNode){trendNode.classList.toggle('is-up',trend>0);trendNode.classList.toggle('is-down',trend<0)}
   set('[data-hjmv-rostered]',row&&Number.isFinite(row.rostered)?Math.round(row.rostered*100)+'%':'—');
   set('[data-hjmv-state]',HJMV.ready?(row?'':'Not priced'):(HJMV.error||'Loading…'));
  });
 }

 if(typeof hjProfileCategoryRow==='function'){
  const base=hjProfileCategoryRow;
  window.hjProfileCategoryRow=hjProfileCategoryRow=function(player,season,allRows){
   return `${base.apply(this,arguments)}${profileStrip(player,season)}`;
  };
 }

 /* =====================================================================
    Surface 2 · League HQ · Players tab
    A fourth column on every skill-position card, sortable like the rest.
    ===================================================================== */
 function directoryColumn(player){
  const position=String(player?.position||'').toUpperCase();
  if(!POSITIONS.includes(position))return '';
  const row=HJMV.ready?lookup(player):null;
  const selected=HJMV.sort===true;
  return `<div class="hq-player-proj hjmv-col" data-hjmv-col="${escape(player.id)}" data-hjmv-position="${escape(position)}" aria-pressed="${selected}">`
   +`<button type="button" class="hj-pff-sort-hit" data-hjmv-sort aria-pressed="${selected}" aria-label="Sort by Market Value" title="Sort by Market Value"></button>`
   +`<span class="hq-player-proj-label">MARKET ${infoButton()}</span>`
   +`<span class="hq42-proj-primary"><strong class="hq-player-proj-main">${row?fmtValue(row.value):(HJMV.ready?'—':'…')}</strong></span>`
   +`<span class="hq-player-proj-sub hjmv-col-sub">${row?escape(posRankLabel(row)):''}</span>`
   +`</div>`;
 }

 HJMV.directoryColumn=directoryColumn;
 function installDirectory(){
  if(typeof hjDirectoryRowsHTML!=='function'||typeof hjDirectoryFilteredRows!=='function')return;
  const baseRows=hjDirectoryFilteredRows;
  window.hjDirectoryFilteredRows=hjDirectoryFilteredRows=function(){
   if(HJMV.sort&&typeof HJ40!=='undefined'){try{HJ40.statSort=''}catch(_){ }}
   const rows=baseRows.apply(this,arguments);
   if(!HJMV.sort)return rows;
   return rows.slice().sort((a,b)=>{
    const av=lookup(a)?.value,bv=lookup(b)?.value;
    return (Number.isFinite(bv)?bv:-Infinity)-(Number.isFinite(av)?av:-Infinity)||String(a.name).localeCompare(String(b.name));
   });
  };
  const baseHTML=hjDirectoryRowsHTML;
  window.hjDirectoryRowsHTML=hjDirectoryRowsHTML=function(){
   const html=baseHTML.apply(this,arguments);
   if(!/hq40-card/.test(html))return html;
   if(!HJMV.ready)queueMicrotask(()=>loadFeed());
   const template=document.createElement('template');template.innerHTML=html;
   template.content.querySelectorAll('.hq40-card[data-hq-directory-id]').forEach(card=>{
    const id=card.dataset.hqDirectoryId;
    const name=card.querySelector('.hq-player-name')?.textContent||'';
    const rankLabel=card.querySelector('.hq-player-rank')?.textContent||'';
    const position=(String(rankLabel).match(/^[A-Z/]+/)||[''])[0];
    const column=directoryColumn({id,name,position});
    if(!column)return;
    card.classList.add('has-mv-column');
    const rail=card.querySelector('.hq40-stat-rail');
    if(rail)rail.insertAdjacentHTML('beforebegin',column);else card.insertAdjacentHTML('beforeend',column);
    const holder=card.querySelector('[data-hjmv-col]');if(holder)holder.dataset.hjmvName=name;
   });
   return template.innerHTML;
  };
 }

 function paintDirectory(){
  document.querySelectorAll('[data-hjmv-col]').forEach(node=>{
   const row=lookup({id:node.dataset.hjmvCol,name:node.dataset.hjmvName,position:node.dataset.hjmvPosition});
   const main=node.querySelector('.hq-player-proj-main');
   const sub=node.querySelector('.hjmv-col-sub');
   const value=row?fmtValue(row.value):(HJMV.ready?'—':'…');
   if(main&&main.textContent!==value)main.textContent=value;
   const label=row?posRankLabel(row):'';
   if(sub&&sub.textContent!==label)sub.textContent=label;
  });
 }

 document.addEventListener('click',event=>{
  const sort=event.target.closest?.('[data-hjmv-sort]');
  if(sort){
   event.preventDefault();event.stopPropagation();
   HJMV.sort=!HJMV.sort;
   if(typeof HJ40!=='undefined'){try{HJ40.statSort=''}catch(_){ }}
   if(typeof HJ_PLAYER_DIRECTORY!=='undefined')HJ_PLAYER_DIRECTORY.renderLimit=36;
   if(typeof hjRenderPlayerDirectory==='function')hjRenderPlayerDirectory(false);
   return;
  }
  if(HJMV.sort&&event.target.closest?.('[data-hq40-sort-stat]')){
   HJMV.sort=false;
   setTimeout(()=>{if(typeof hjRenderPlayerDirectory==='function')hjRenderPlayerDirectory(false)},0);
  }
 },true);

 /* =====================================================================
    Surface 3 · League HQ · League Activity
    Every add, drop and trade carries the price the market puts on the
    player, so a move reads as a gain or a loss at a glance.
    ===================================================================== */
 function decorateActivity(html){
  if(!/hq-activity-item/.test(html))return html;
  if(!HJMV.ready){queueMicrotask(()=>loadFeed());return html}
  const template=document.createElement('template');template.innerHTML=html;
  template.content.querySelectorAll('.hq-activity-item').forEach(node=>{
   const row=lookup({id:node.dataset.pcId,name:node.dataset.pcName,position:node.dataset.pcPosition});
   const copy=node.querySelector('.hq-activity-copy');
   if(!row||!copy)return;
   copy.insertAdjacentHTML('beforeend',`<span class="hjmv-tag"><small>Market</small><b>${fmtValue(row.value)}</b><em>${escape(posRankLabel(row))}</em></span>`);
  });
  return template.innerHTML;
 }
 if(typeof hjActivityHTML==='function'){
  const baseActivity=hjActivityHTML;
  window.hjActivityHTML=hjActivityHTML=function(){return decorateActivity(baseActivity.apply(this,arguments))};
 }

 /* =====================================================================
    Surface 4 · League HQ · Roster Strength
    A Value model beside ESPN / Vegas / Combo / PFF, plus a written note
    for whichever model is selected, plus an ESPN fallback so no roster
    is left without a rank.
    ===================================================================== */
 const MV_KEYS=['QB','RB','WR','TE','FLEX'];
 const DESCRIPTIONS={
  espn:{title:'ESPN',copy:'ESPN’s own point projections for every rostered player, totalled by roster. The house number — the same one you see in your ESPN lineup.'},
  vegas:{title:'Vegas',copy:'Projections built from posted sportsbook player props, converted into this league’s scoring. Where a book has not priced a player, ESPN’s projection fills the gap so every roster still ranks.'},
  combo:{title:'Combo',copy:'ESPN and Vegas averaged together for each player, which smooths the places where one source runs hot. The default view, and the steadiest of the four.'},
  value:{title:'Market Value',copy:'What the fantasy market pays. Every rostered player carries a consensus price set by completed trades in real leagues, and the roster with the most expensive players ranks first.'},
  pff:{title:'PFF',copy:'Average Pro Football Focus grade across the roster — how well the players have actually played, graded snap by snap, independent of fantasy points.'}
 };

 function mvLineup(entries){
  const eligible=entries.filter(e=>Number(e?.lineupSlotId)!==21&&Number.isFinite(entryValue(e)));
  const byPos=pos=>eligible.filter(e=>hjPlayerPosition(e)===pos).sort((a,b)=>entryValue(b)-entryValue(a));
  const used=new Set(),roles=[];
  const take=(pos,count,role=pos)=>{byPos(pos).filter(e=>!used.has(e)).slice(0,count).forEach(e=>{used.add(e);roles.push({entry:e,role})})};
  take('QB',1);take('RB',2);take('WR',2);take('TE',1);
  const flex=eligible.filter(e=>['RB','WR','TE'].includes(hjPlayerPosition(e))&&!used.has(e)).sort((a,b)=>entryValue(b)-entryValue(a))[0]||null;
  if(flex){used.add(flex);roles.push({entry:flex,role:'FLEX'})}
  return roles;
 }

 function mvBuildRows(data){
  const scope=HJ_STRENGTH_STATE.scope==='all'?'all':'starters';
  const rows=(data?.teams||[]).map(team=>{
   const seen=new Set();
   const entries=hjRosterEntries(team).filter(entry=>{
    const id=String(hjPlayer(entry)?.id??entry.playerId??'');
    if(!id||seen.has(id)||Number(entry.lineupSlotId)===21||!POSITIONS.includes(hjPlayerPosition(entry)))return false;
    seen.add(id);return true;
   });
   const lineup=mvLineup(entries);
   const counted=scope==='all'?entries:lineup.map(x=>x.entry);
   const sum=list=>{const vals=list.map(entryValue).filter(Number.isFinite);return vals.length?vals.reduce((a,b)=>a+b,0):null};
   const values=Object.fromEntries(MV_KEYS.map(k=>[k,sum(
    k==='FLEX'?lineup.filter(x=>x.role==='FLEX').map(x=>x.entry)
    :scope==='all'?entries.filter(e=>hjPlayerPosition(e)===k)
    :lineup.filter(x=>x.role===k).map(x=>x.entry)
   )]));
   return {
    team,manager:hjMatchManager(team,data)||hjOwnerName(team,data)||`Manager ${team.id}`,
    entries,lineup,selected:new Set(counted),roleByEntry:new Map(lineup.map(x=>[x.entry,x.role])),
    flexEntry:lineup.find(x=>x.role==='FLEX')?.entry||null,
    model:'value',scope,horizon:'season',season:Number(HJ_LEAGUE_SEASON),week:hjCurrentWeek(data),
    values,overall:sum(counted),unitRanks:{},overallRank:null
   };
  });
  const rank=(get,set)=>{
   const valid=rows.filter(r=>Number.isFinite(get(r))).sort((a,b)=>get(b)-get(a)||a.manager.localeCompare(b.manager));
   valid.forEach((row,index)=>set(row,index+1));
  };
  rank(r=>r.overall,(r,v)=>r.overallRank=v);
  MV_KEYS.forEach(k=>{rows.forEach(r=>r.unitRanks[k]=null);rank(r=>r.values[k],(r,v)=>r.unitRanks[k]=v)});
  return rows.sort((a,b)=>(a.overallRank??Infinity)-(b.overallRank??Infinity)||a.manager.localeCompare(b.manager));
 }
 HJMV.buildRows=mvBuildRows;

 function strengthScore(rank,count){rank=Math.max(1,Number(rank)||count||1);count=Math.max(1,Number(count)||1);return count<=1?100:Math.max(12,100-88*((rank-1)/(count-1)))}
 function rankClass(rank,count){rank=Number(rank)||count||1;count=Number(count)||1;return rank===1?'rank-1':rank<=3?'rank-top':rank>=Math.max(2,count-1)?'rank-low':''}
 function mvLabel(k){return k==='FLEX'?'FX':k}

 function mvPositionEntries(row,pos){
  if(pos==='FLEX')return row.flexEntry?[row.flexEntry]:[];
  return row.entries.filter(e=>hjPlayerPosition(e)===pos).sort((a,b)=>(entryValue(b)??-Infinity)-(entryValue(a)??-Infinity));
 }
 function mvCounted(entry,row,pos){
  if(pos==='FLEX')return row.flexEntry===entry;
  if(row.scope==='all')return hjPlayerPosition(entry)===pos;
  return row.lineup.some(x=>x.entry===entry&&x.role===pos);
 }
 function mvPlayerHTML(entry,row,pos){
  const player=hjPlayer(entry)||{},id=player.id||entry?.playerId||'',name=player.fullName||player.displayName||'Player';
  const record=entryRow(entry),counted=mvCounted(entry,row,pos);
  const attrs=ffnPlayerDataAttrs({id,name,team:hjPlayerTeam(entry),position:hjPlayerPosition(entry),photo:hjPlayerPhoto(entry)});
  return `<button type="button" class="hj15-player pc-player-trigger${counted?' is-counted':''}" ${attrs}><span class="pn">${escape(name)}${record?`<span class="hjmv-prank">${escape(posRankLabel(record))}</span>`:''}</span><span class="pv">${record?fmtValue(record.value):'—'}</span></button>`;
 }
 function mvPosHTML(row,pos,count,open){
  const rank=row.unitRanks[pos],total=row.values[pos];
  const entries=open?mvPositionEntries(row,pos):[];
  return `<section class="hj15-pos ${rankClass(rank,count)}" style="--strength:${strengthScore(rank,count).toFixed(1)}%"><div class="hj15-posline"><span class="hj15-plabel">${escape(mvLabel(pos))}</span><span class="hj15-pvalue">${fmtValue(total)}</span><span class="hj15-prank">${rank??'—'}</span></div>${open?`<div class="hj15-playerflow">${entries.length?entries.map(e=>mvPlayerHTML(e,row,pos)).join(''):'<span class="hj15-empty">None</span>'}</div>`:''}</section>`;
 }
 function mvProfile(row){
  const ranked=MV_KEYS.filter(k=>Number.isFinite(row.unitRanks[k])).map(k=>({k,r:row.unitRanks[k]})).sort((a,b)=>a.r-b.r);
  if(!ranked.length)return '';
  const best=ranked[0],weak=ranked[ranked.length-1];
  return `<span class="strong">Best ${escape(mvLabel(best.k))} #${best.r}</span><span>·</span><span class="weak">Weak ${escape(mvLabel(weak.k))} #${weak.r}</span>`;
 }
 function mvDashboard(rows){
  const count=rows.length||1;
  return `<div class="hj15-board hjmv-board">${rows.map(row=>{
   const id=String(row.team.id),open=HJ_STRENGTH_STATE.open.has(id);
   return `<article class="hj15-card${Number.isFinite(row.overallRank)&&row.overallRank<=3?' is-podium':''}${open?' is-open':''}" data-hjmv-card="${escape(id)}"><div class="hj15-teamhead"><div class="hj15-rank">${row.overallRank??'—'}</div><div class="hj15-avatar">${av(row.manager)}</div><div class="hj15-manager"><button type="button" data-hq-manager="${escape(id)}"><b>${escape(row.manager)}</b><span class="hj15-profile">${mvProfile(row)}</span></button></div><div class="hj15-overall"><strong>${fmtValue(row.overall)}</strong><small>value</small></div><button class="hj15-expand" type="button" data-hjmv-expand="${escape(id)}" aria-expanded="${open}" aria-label="${open?'Collapse':'Expand'} ${escape(row.manager)}">⌄</button></div><div class="hj15-ribbon hjmv-ribbon">${MV_KEYS.map(k=>mvPosHTML(row,k,count,open)).join('')}</div></article>`;
  }).join('')}</div>`;
 }
 function mvBarWidths(a,b){const max=Math.max(Math.abs(Number(a))||0,Math.abs(Number(b))||0,1);return {a:Math.max(2,50*(Math.abs(Number(a))||0)/max),b:Math.max(2,50*(Math.abs(Number(b))||0)/max)}}
 function mvCompare(rows){
  if(rows.length<2)return '<div class="hq-empty">Two rosters are required for comparison.</div>';
  const valid=id=>rows.some(r=>String(r.team.id)===String(id));
  if(!valid(HJ_STRENGTH_STATE.compareA))HJ_STRENGTH_STATE.compareA=String(rows[0].team.id);
  if(!valid(HJ_STRENGTH_STATE.compareB)||HJ_STRENGTH_STATE.compareB===HJ_STRENGTH_STATE.compareA)HJ_STRENGTH_STATE.compareB=String((rows[1]||rows[0]).team.id);
  const a=rows.find(r=>String(r.team.id)===String(HJ_STRENGTH_STATE.compareA))||rows[0];
  const b=rows.find(r=>String(r.team.id)===String(HJ_STRENGTH_STATE.compareB))||rows[1];
  const options=selected=>rows.map(r=>`<option value="${escape(r.team.id)}"${String(r.team.id)===String(selected)?' selected':''}>#${r.overallRank??'—'} ${escape(r.manager)}</option>`).join('');
  const open=HJ_STRENGTH_STATE.compareOpen;
  const diff=Number.isFinite(a.overall)&&Number.isFinite(b.overall)?a.overall-b.overall:null;
  const sides=(pos)=>`<div class="hj15-cplayers">${[a,b].map(row=>`<div><span class="side-title">${escape(row.manager)}</span><div class="hj15-playerflow">${mvPositionEntries(row,pos).map(e=>mvPlayerHTML(e,row,pos)).join('')||'<span class="hj15-empty">None</span>'}</div></div>`).join('')}</div>`;
  const rowHTML=pos=>{
   const av1=pos==='Overall'?a.overall:a.values[pos],bv=pos==='Overall'?b.overall:b.values[pos];
   const ar=pos==='Overall'?a.overallRank:a.unitRanks[pos],br=pos==='Overall'?b.overallRank:b.unitRanks[pos];
   const w=mvBarWidths(av1,bv);
   return `<section class="hj15-crow"><div class="hj15-cmain"><span class="hj15-clabel">${escape(pos)}</span><span class="hj15-cvalue">${fmtValue(av1)} · #${ar??'—'}</span><div class="hj15-dual"><i class="a" style="--a:${w.a.toFixed(1)}%"></i><i class="b" style="--b:${w.b.toFixed(1)}%"></i></div><span class="hj15-cvalue right">${fmtValue(bv)} · #${br??'—'}</span></div>${open&&pos!=='Overall'?sides(pos):''}</section>`;
  };
  return `<div class="hj15-compare-wrap"><div class="hj15-compare-controls"><select id="hq-strength-compare-a" aria-label="First manager">${options(a.team.id)}</select><div class="hj15-vs">VS</div><select id="hq-strength-compare-b" aria-label="Second manager">${options(b.team.id)}</select></div><article class="hj15-compare"><div class="hj15-chead"><div class="hj15-cteam">${av(a.manager)}<span><b>${escape(a.manager)}</b><small>#${a.overallRank??'—'} · ${fmtValue(a.overall)} value</small></span></div><div class="hj15-cdelta"><b>${!Number.isFinite(diff)?'—':Math.abs(diff)<1?'EVEN':`${diff>0?'+':'−'}${fmtValue(Math.abs(diff))}`}</b><small>market value</small></div><div class="hj15-cteam right"><span><b>${escape(b.manager)}</b><small>#${b.overallRank??'—'} · ${fmtValue(b.overall)} value</small></span>${av(b.manager)}</div></div>${['Overall',...MV_KEYS].map(rowHTML).join('')}<button class="hj15-compare-toggle" type="button" data-hj15-compare-expand aria-expanded="${open}">${open?'Hide players':'Show players'}</button></article></div>`;
 }

 function descriptionHTML(model){
  const entry=DESCRIPTIONS[model]||DESCRIPTIONS.combo;
  const info=model==='value'?` ${infoButton()}`:'';
  return `<aside class="hjmv-note" aria-live="polite"><span class="hjmv-note-rule" aria-hidden="true"></span><div class="hjmv-note-copy"><strong>${escape(entry.title)}${info}</strong><p>${entry.copy}</p></div></aside>`;
 }

 function valueButtonHTML(active){
  return `<button type="button" class="hj15-toggle${active?' active':''}" data-hq-strength-model="value" aria-pressed="${active}" title="Consensus market price of every rostered player.">Value</button>`;
 }

 /* The Value model keeps the site's own toolbar markup, minus the Season/Week
    switch, which a market price does not have. */
 function mvToolbar(){
  const view=HJ_STRENGTH_STATE.view==='compare'?'compare':'dashboard';
  const scope=HJ_STRENGTH_STATE.scope==='all'?'all':'starters';
  const group=(items,active,attr)=>`<div class="hj15-group">${items.map(([id,text,title])=>`<button type="button" class="hj15-toggle${active===id?' active':''}" ${attr}="${id}" aria-pressed="${active===id}"${title?` title="${escape(title)}"`:''}>${text}</button>`).join('')}</div>`;
  return `<div class="hj15-toolbar">`
   +group([['dashboard','Dashboard'],['compare','Compare']],view,'data-hq-strength-view')
   +group([
     ['espn','ESPN','ESPN\u2019s own point projections.'],
     ['vegas','Vegas','Sportsbook player props, with ESPN filling any gap.'],
     ['combo','Combo','ESPN and Vegas averaged.'],
     ['pff','PFF','Average published PFF grades.'],
     ['value','Value','Consensus market price of every rostered player.']
    ],'value','data-hq-strength-model')
   +group([['all','All Players'],['starters','Starters']],scope,'data-hj6-scope')
   +`</div>`;
 }

 function decorate(html,model){
  let out=String(html);
  /* The Value control sits at the end of the model group. */
  if(!/data-hq-strength-model="value"/.test(out)){
   out=out.replace(/(<button[^>]*data-hq-strength-model="pff"[^>]*>[\s\S]*?<\/button>)/,(m)=>m+valueButtonHTML(model==='value'));
  }
  /* The Vegas fallback footnote is replaced by the written model note. */
  out=out.replace(/<div class="hj-pff-model-note">ESPN supplies K and DST projections\.[^<]*<\/div>/,'');
  const note=descriptionHTML(model);
  const anchor=out.match(/<div class="hj15-board|<div class="hj15-compare-wrap|<div class="hq-empty/);
  if(anchor)out=out.replace(anchor[0],note+anchor[0]);
  return out;
 }

 function installStrength(){
  if(typeof hjStrengthHTML!=='function'||typeof hj6BuildRows!=='function')return;

  /* Vegas and Combo fall back to ESPN wherever a book has not priced a player,
     so a single unpriced bench player can no longer blank a roster's total. */
  const baseProjection=hj6Projection;
  window.hj6Projection=hj6Projection=function(entry,model,horizon,week,season){
   if(model==='value')return entryValue(entry);
   const value=baseProjection.call(this,entry,model,horizon,week,season);
   if(Number.isFinite(value)||model==='espn'||model==='pff')return value;
   const espn=baseProjection.call(this,entry,'espn',horizon,week,season);
   return Number.isFinite(espn)?espn:null;
  };
  if(typeof HJ6_CACHE!=='undefined')HJ6_CACHE.rows.clear();

  const baseReady=hj6Ready;
  window.hj6Ready=hj6Ready=function(data){
   if(HJ_STRENGTH_STATE.model==='value')return HJMV.ready;
   return baseReady.apply(this,arguments);
  };
  const baseEnsure=hj6EnsureSources;
  window.hj6EnsureSources=hj6EnsureSources=function(data){
   if(HJ_STRENGTH_STATE.model==='value'){
    return loadFeed().then(()=>{if(HJ_HQ_STATE.activeTab==='strength')requestAnimationFrame(()=>hjRerenderStrength())});
   }
   return baseEnsure.apply(this,arguments);
  };
  const baseBuild=hj6BuildRows;
  window.hj6BuildRows=hj6BuildRows=function(data,model){
   if((model||HJ_STRENGTH_STATE.model)==='value')return mvBuildRows(data||HJ_LEAGUE_STATE?.data);
   return baseBuild.apply(this,arguments);
  };

  const baseHTML=hjStrengthHTML;
  window.hjStrengthHTML=hjStrengthHTML=function(data){
   const model=HJ_STRENGTH_STATE.model;
   if(model!=='value')return decorate(baseHTML.apply(this,arguments),model);
   const head=`<section class="hq-module hj15-shell hjmv-shell"><div class="hq-module-head"><h3 class="hq-module-title">Roster Strength</h3></div>${mvToolbar()}${descriptionHTML('value')}`;
   if(!HJMV.ready){
    queueMicrotask(()=>hj6EnsureSources(data));
    return `${head}<div class="hq-empty">${escape(HJMV.error||'Loading market values…')}</div></section>`;
   }
   const rows=mvBuildRows(data);
   const view=HJ_STRENGTH_STATE.view==='compare'?'compare':'dashboard';
   return `${head}${view==='compare'?mvCompare(rows):mvDashboard(rows)}</section>`;
  };

  const root=document.querySelector('#league-hq-tools');
  if(root&&!root.dataset.hjmvBound){
   root.dataset.hjmvBound='1';
   root.addEventListener('click',event=>{
    const expand=event.target.closest?.('[data-hjmv-expand]');
    if(!expand)return;
    event.preventDefault();event.stopPropagation();
    const id=String(expand.dataset.hjmvExpand||'');
    if(!id)return;
    HJ_STRENGTH_STATE.open.has(id)?HJ_STRENGTH_STATE.open.delete(id):HJ_STRENGTH_STATE.open.add(id);
    hjRerenderStrength();
   });
  }
 }

 /* =====================================================================
    Refresh
    ===================================================================== */
 function repaint(){
  paintStrips();paintDirectory();paintExplainer();
  const activity=document.querySelector('#hq-panel-activity .hq-activity-list');
  if(activity&&typeof hjActivityHTML==='function'&&!activity.querySelector('.hjmv-tag')){const next=document.createElement('template');next.innerHTML=hjActivityHTML();const body=next.content.querySelector('.hq-activity-list');if(body)activity.innerHTML=body.innerHTML}
  if(typeof HJ_HQ_STATE!=='undefined'&&HJ_HQ_STATE.activeTab==='strength'&&HJ_STRENGTH_STATE.model==='value'&&typeof hjRerenderStrength==='function')hjRerenderStrength();
 }
 document.addEventListener('hj:market-updated',repaint);

 function visibleSurface(){
  const nodes=[...document.querySelectorAll('[data-hjmv-strip],[data-hjmv-col],.hjmv-shell')];
  return nodes.some(node=>{const box=node.getBoundingClientRect();return node.getClientRects().length&&box.bottom>=0&&box.top<=window.innerHeight});
 }
 let scanTimer=null;
 function scheduleScan(){
  if(scanTimer)return;
  scanTimer=setTimeout(()=>{scanTimer=null;if(document.visibilityState!=='hidden'&&visibleSurface())loadFeed()},200);
 }
 setInterval(()=>{if(document.visibilityState!=='hidden'&&visibleSurface())loadFeed()},POLL);
 document.addEventListener('visibilitychange',scheduleScan);
 window.addEventListener('focus',scheduleScan);
 window.addEventListener('online',()=>{HJMV.retryAt=0;scheduleScan()});
 window.addEventListener('scroll',scheduleScan,{passive:true});

 function install(){
  installExplainer();
  installDirectory();
  installStrength();
  loadFeed();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
