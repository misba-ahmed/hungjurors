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
   .replace(/Set claims before ESPN begins processing at <b>([^<]+)<\/b>\./,(_,deadline)=>'Submit waiver claims before <b>'+deadline.replace(':00','')+'</b>')
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
 .wc.wc-waiver-trends .wc-copy{font-size:min(12px,3.3cqw)!important;line-height:1.35!important;white-space:nowrap;margin:0!important;flex:0 0 auto}
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
 @media(max-width:360px){.wc.wc-waiver-trends .wc-body{gap:6px!important}.wc.wc-waiver-trends .wc-title{font-size:24px!important}.wc.wc-waiver-trends .ww-trend-row{gap:4px}.wc.wc-waiver-trends .ww-espn-action{font-size:9px!important}}
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

 // Use ESPN's waiver-report request, not the success-only activity feed.
 // The combined views preserve subOrder (the displayed processing priority).
 // Every Wednesday report of the season is kept: the Wire shows the newest on its
 // Wednesday, League Activity keeps the whole history.
 const waiverReportCacheKey='hj:waiver-history:v1:'+ESPN_FANTASY_LEAGUE_ID+':'+NFL_SEASON;
 const waiverReportState={reports:{},players:{},weeks:{},checkedAt:0,pending:null};
 try{
  const saved=JSON.parse(localStorage.getItem(waiverReportCacheKey)||'null');
  if(saved?.reports){waiverReportState.reports=saved.reports;waiverReportState.players=saved.players||{};waiverReportState.weeks=saved.weeks||{}}
 }catch(_error){}
 const waiverFailureReasons={"FAILED_POSITIONLIMIT":"A position limit would be exceeded.","FAILED_TRADELOCK":"A player involved is locked in an accepted trade.","FAILED_NOTCLEAREDWAIVERS":"A player involved has not cleared waivers","FAILED_ROSTERLOCK":"Unable to process, rosters are locked","FAILED_LINEUPLOCK":"Unable to process, lineups are locked","FAILED_TRADELIMIT":"Unable to process, trade limit reached","FAILED_ACQUISITIONLIMIT":"Acquisition limit would be exceeded.","FAILED_SLOTLIMIT":"Maximum number of eligible players for X slot","FAILED_INELIGIBLESLOT":"Player not eligible for X slot","FAILED_IRSLOT":"Unable to process","FAILED_ROSTERLIMIT":"Maximum roster size would be exceeded.","FAILED_INVALIDPLAYERSOURCE":"Player has already been added to another team.","FAILED_TRANSVALIDATIONFAILED":"Unable to process","FAILED_NOPERMISSION":"Permission error","FAILED_INVALIDROSTER":"You have a player in an invalid roster slot.","FAILED_CANCELTRANSACTION":"Unable to process, please try again","FAILED_CANCELACCEPTEDTRADE":"Unable to process, please try again","FAILED_UNDROPPABLEPLAYER":"A player involved is undroppable.","FAILED_BADUNIVERSE":"A player involved is no longer eligible in your player universe.","FAILED_PLAYERALREADYDROPPED":"A player involved has already been dropped","FAILED_TRADEPLAYERTOIR":"Unable to process this request","FAILED_DROPRESERVEDPLAYER":"Unable to process","FAILED_MATCHUPACQUISITIONLIMIT":"Matchup acquisition limit would be exceeded.","FAILED_AUCTIONBUDGETEXCEEDED":"Acquisition budget would be exceeded.","FAILED_PLAYERNOTONROSTER":"Player to drop is no longer on roster.","FAILED_MINIMUMBID":"Minimum bid has not been reached, please try again","FAILED_INVALID_FORMAT":"Unable to process"};
 function waiverWednesdayRun(at,now){
  if(!Number.isFinite(at)||at>now)return false;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',hour:'numeric',hourCycle:'h23'}).formatToParts(at);
  return parts.find(p=>p.type==='weekday')?.value==='Wed'&&Number(parts.find(p=>p.type==='hour')?.value)<12;
 }
 // One report per Wednesday run, from the claims ESPN processed on that date.
 function waiverReportRuns(runTimes,transactions,now=Date.now()){
  const seen=new Set(),claims=transactions.filter(tx=>{
   if(!['WAIVER','WAIVER_ERROR'].includes(tx.type)||tx.executionType!=='PROCESS'||tx.status==='PENDING'||!tx.processDate||tx.processDate>now||seen.has(tx.id))return false;
   seen.add(tx.id);return true;
  });
  const byDay=new Map();
  for(const at of runTimes.filter(at=>waiverWednesdayRun(at,now)).sort((a,b)=>a-b))byDay.set(new Date(at).toISOString().slice(0,10),at);
  return [...byDay].map(([day,at])=>{
   const mine=claims.filter(tx=>new Date(tx.processDate).toISOString().slice(0,10)===day);
   const periods=mine.map(tx=>Number(tx.scoringPeriodId)).filter(Boolean),week=periods.length?Math.max(...periods):null;
   const items=mine.map(tx=>({id:tx.id,teamId:tx.teamId,status:tx.status,priority:Number(tx.subOrder)||null,at:tx.processDate,
    items:(tx.items||[]).filter(item=>['ADD','DROP'].includes(item.type)).map(item=>({type:item.type,playerId:item.playerId}))
   })).sort((a,b)=>(a.priority??Infinity)-(b.priority??Infinity)||a.at-b.at);
   return {date:wireCentralDateKey(at),at,week,items};
  });
 }
 // Past weeks are read once; the current and previous week are re-read on each check.
 async function refreshWaiverReport(force=false){
  if(!HJ_LEAGUE_STATE.data)return;
  if(waiverReportState.pending)return waiverReportState.pending;
  if(!force&&Date.now()-waiverReportState.checkedAt<(waiverProcessingWindow()?30000:300000))return;
  waiverReportState.checkedAt=Date.now();
  waiverReportState.pending=(async()=>{
   try{
    const season=Number(NFL_SEASON),week=Math.max(1,Number(hjCurrentWeek(HJ_LEAGUE_STATE.data))||1);
    const root='https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/'+season+'/segments/0/leagues/'+ESPN_FANTASY_LEAGUE_ID;
    const filter={headers:{'x-fantasy-filter':JSON.stringify({transactions:{filterType:{value:['WAIVER','WAIVER_ERROR']}}})}};
    const periods=Array.from({length:week+1},(_,i)=>i).filter(p=>p>=week-1||!waiverReportState.weeks[p]);
    const results=await Promise.allSettled(periods.map(p=>hjDataJson(root+'?view=mDraftDetail&view=mStatus&view=mSettings&view=mTeam&view=mTransactions2&scoringPeriodId='+p,filter).then(payload=>{
     if(!payload.status?.waiverProcessStatus||!Array.isArray(payload.transactions))throw Error('Incomplete ESPN waiver report');
     return {p,payload};
    })));
    const ok=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
    if(!ok.length)throw results[0]?.reason||Error('ESPN waiver report unavailable');
    const runTimes=[...new Set(ok.flatMap(({payload})=>Object.keys(payload.status.waiverProcessStatus)))].map(Date.parse);
    const reports=waiverReportRuns(runTimes,ok.flatMap(({payload})=>payload.transactions));
    // Add or update reports; never drop an earlier Wednesday from the history.
    for(const report of reports)if(report.items.length||!waiverReportState.reports[report.date])waiverReportState.reports[report.date]=report;
    ok.forEach(({p})=>{if(p<week-1)waiverReportState.weeks[p]=Date.now()});
    const ids=[...new Set(Object.values(waiverReportState.reports).flatMap(r=>r.items.flatMap(tx=>tx.items.map(item=>item.playerId))))].filter(id=>!waiverReportState.players[String(id)]);
    if(ids.length){
     const pool=await hjDataJson(root+'?view=kona_player_info&scoringPeriodId='+week,{headers:{'x-fantasy-filter':JSON.stringify({players:{filterIds:{value:ids}}})}});
     for(const entry of pool.players||[]){
      const player=hjPlayer(entry);if(!player?.id)continue;
      waiverReportState.players[String(player.id)]={id:String(player.id),name:player.fullName||player.displayName,team:hjPlayerTeam(entry),position:hjPlayerPosition(entry),photo:hjPlayerPhoto(entry)};
     }
    }
    try{localStorage.setItem(waiverReportCacheKey,JSON.stringify({reports:waiverReportState.reports,players:waiverReportState.players,weeks:waiverReportState.weeks}))}catch(_error){}
   }catch(error){console.warn('ESPN waiver report unavailable; retaining the saved reports.',error)}
   finally{waiverReportState.pending=null}
  })();
  return waiverReportState.pending;
 }
 // Newest first; reports with no processed claims are left out.
 function waiverReportHistory(now=Date.now()){
  return Object.values(waiverReportState.reports).filter(r=>r.at<=now&&r.items?.length).sort((a,b)=>b.at-a.at);
 }
 function waiverReportData(now=Date.now()){return waiverReportHistory(now)[0]||null}
 function waiverReportCard(){
  const report=waiverReportData();if(!report?.items.length)return null;
  const date=new Date(report.at).toLocaleDateString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric'});
  const successful=report.items.filter(row=>row.status==='EXECUTED').length,failed=report.items.length-successful;
  const body='<div class="wr-heading"><div class="wc-title">Waiver Report</div><div class="wr-summary"><span><b>'+successful+'</b> successful</span><span><b>'+failed+'</b> unsuccessful</span></div></div><div class="wr-column-head" aria-hidden="true"><span>Priority</span><span>Manager</span><span>Claim results</span></div><div class="wr-claims" tabindex="0" role="region" aria-label="All Wednesday waiver claims; scroll to view the full report"><div class="wr-list" role="list">'+waiverClaimRows(report)+'</div></div>';
  return {section:'waiver-report',html:wireCard({kicker:'Wednesday waivers · '+date,tag:'Processed',cls:'is-lead wc-waiver-report',body}).replace('data-wire-card','data-wire-key="waiver-report-'+report.date+'" data-wire-card')};
 }
 function waiverClaimRows(report){
  const resolvePlayer=item=>waiverReportState.players[String(item.playerId)]||hjActivityPlayerById(item.playerId);
  const playerHTML=item=>{
   const p=resolvePlayer(item),name=p.name||'Player',photo=p.photo||(p.id&&!String(p.id).startsWith('-')?nflHeadshot(p.id):'');
   return '<button type="button" class="wr-player pc-player-trigger" '+ffnPlayerDataAttrs(p)+' aria-label="Open '+esc(name)+' player profile">'+(photo?'<img class="'+(p.position==='DST'||String(p.id).startsWith('-')?'is-defense':'is-headshot')+'" src="'+esc(photo)+'" alt="" loading="lazy" onerror="ffnImageFallback(this)">':'')+'<span><b>'+esc(name)+'</b><small>'+esc([p.team,p.position].filter(Boolean).join(' · '))+'</small></span></button>';
  };
  const ordinal=n=>n+([11,12,13].includes(n%100)?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'));
  const rows=report.items.map(row=>{
   const success=row.status==='EXECUTED',adds=row.items.filter(item=>item.type==='ADD'),drops=row.items.filter(item=>item.type==='DROP');
   const incoming='<div class="wr-incoming"><span class="wr-label">'+(success?'+ Added':'Unsuccessful')+'</span>'+adds.map(playerHTML).join('')+'</div>';
   const detail=success?(drops.length?'<div class="wr-outgoing"><span class="wr-label">− Dropped</span>'+drops.map(playerHTML).join('')+'</div>':'<div class="wr-no-drop">No player dropped</div>'):'<div class="wr-reason">'+esc(waiverFailureReasons[row.status]||('Unable to process · '+row.status))+'</div>';
   return '<div class="wr-claim'+(success?'':' is-failed')+'" role="listitem"><span class="wr-priority" aria-label="Priority '+(row.priority?ordinal(row.priority):'unavailable')+'">'+(row.priority?ordinal(row.priority):'—')+'</span><div class="wr-manager">'+wireMgrHTML(hjActivityTeamName(row.teamId))+'</div><div class="wr-transfer">'+incoming+detail+'</div></div>';
  }).join('');
  return rows;
 }
 const reportStyle=document.createElement('style');reportStyle.id='hj-waiver-report-style';
 reportStyle.textContent=`
 .wc.wc-waiver-report{container-type:inline-size}
 .wc.wc-waiver-report[data-wire-card] .wc-body{display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;width:100%!important;max-width:none!important;min-height:0!important;height:auto!important;flex:1!important;margin:0!important;padding:0!important;gap:0!important;text-align:left!important;overflow:hidden}
 .wc.wc-waiver-report .wc-body::before,.wc.wc-waiver-report .wc-body::after{display:none!important}
 .wc.wc-waiver-report .wr-heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;flex:none;padding:4px 0 12px}
 .wc.wc-waiver-report[data-wire-card] .wc-title{margin:0!important;text-align:left!important;font-size:24px!important;line-height:1.15!important}
 .wc.wc-waiver-report .wr-summary{display:flex;flex-wrap:wrap;gap:6px 14px;font:500 12px/1.4 var(--sans);color:rgba(247,243,232,.8)}
 .wc.wc-waiver-report .wr-summary span:first-child b{color:#91d3a0}
 .wc.wc-waiver-report .wr-summary span:last-child b{color:#f2aaa2}
 .wc.wc-waiver-report .wr-column-head{display:grid;grid-template-columns:48px 150px minmax(0,1fr);gap:12px;padding:0 6px 7px;border-bottom:1px solid rgba(247,243,232,.25);color:rgba(247,243,232,.6);font:700 10px/1.3 var(--sans);text-transform:uppercase;letter-spacing:.07em;flex:none}
 .wc.wc-waiver-report .wr-claims{width:100%;box-sizing:border-box;min-width:0;min-height:0;flex:1;overflow-x:hidden;overflow-y:auto;padding-right:5px;scrollbar-width:thin;scrollbar-color:rgba(185,138,46,.85) transparent;-webkit-overflow-scrolling:touch;overscroll-behavior-x:auto;overscroll-behavior-y:contain}
 .wc.wc-waiver-report .wr-list{width:100%;min-width:0}
 .wc.wc-waiver-report .wr-claim{display:grid;grid-template-columns:48px 150px minmax(0,1fr);align-items:center;gap:12px;padding:10px 6px;border-bottom:1px solid rgba(247,243,232,.15);min-width:0;text-align:left}
 .wc.wc-waiver-report .wr-claim:last-child{border-bottom:0}
 .wc.wc-waiver-report .wr-priority{color:#d5ac51;font:800 14px/1.2 var(--sans);white-space:nowrap}
 .wc.wc-waiver-report .wr-manager{min-width:0}
 .wc.wc-waiver-report[data-wire-card] .wr-manager .wc-mgr{display:inline-flex!important;justify-content:flex-start!important;align-items:center!important;align-self:flex-start!important;margin:0!important;padding:0!important;border:0!important;background:none!important;max-width:100%;white-space:normal;text-align:left;font:800 12px/1.25 var(--sans)!important;gap:7px;color:var(--paper)}
 .wc.wc-waiver-report .wr-manager img{width:26px!important;height:26px!important;flex:none}
 .wc.wc-waiver-report .wr-transfer{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:center;gap:14px;min-width:0}
 .wc.wc-waiver-report .wr-incoming,.wc.wc-waiver-report .wr-outgoing{min-width:0}
 .wc.wc-waiver-report .wr-label{display:block;margin-bottom:4px;color:#91d3a0;font:800 10px/1.2 var(--sans);letter-spacing:.04em;text-transform:uppercase}
 .wc.wc-waiver-report .wr-outgoing .wr-label{color:rgba(247,243,232,.65)}
 .wc.wc-waiver-report .is-failed .wr-label{color:#f2aaa2}
 .wc.wc-waiver-report .wr-player{display:flex;align-items:center;gap:7px;min-width:0;max-width:100%;padding:0;border:0;background:none;color:var(--paper);text-align:left;cursor:pointer}
 .wc.wc-waiver-report .wr-player img{width:30px;height:30px;border-radius:50%;background:var(--paper);object-fit:cover;object-position:center;flex:none}
 .wc.wc-waiver-report .wr-player img.is-defense{object-fit:contain}
 .wc.wc-waiver-report .wr-player span{min-width:0}
 .wc.wc-waiver-report .wr-player b{display:block;font:750 13px/1.25 var(--sans);white-space:normal;overflow-wrap:anywhere}
 .wc.wc-waiver-report .wr-player small{display:block;margin-top:2px;color:rgba(247,243,232,.65);font:500 10px/1.2 var(--sans)}
 .wc.wc-waiver-report .wr-reason,.wc.wc-waiver-report .wr-no-drop{color:rgba(247,243,232,.75);font:500 12px/1.4 var(--sans);overflow-wrap:anywhere}
 .wc.wc-waiver-report .wr-reason{color:#f2aaa2}
 @container(max-width:620px){
  .wc.wc-waiver-report .wr-heading{align-items:flex-start;flex-direction:column;gap:5px;padding-bottom:10px}
  .wc.wc-waiver-report .wr-column-head{display:none}
  .wc.wc-waiver-report .wr-claim{grid-template-columns:32px minmax(0,1fr);align-items:start;gap:7px 8px;padding:10px 0}
  .wc.wc-waiver-report .wr-claim:first-child{border-top:1px solid rgba(247,243,232,.2)}
  .wc.wc-waiver-report .wr-priority{align-self:center;font-size:12px}
  .wc.wc-waiver-report .wr-transfer{grid-column:2;gap:10px}
  .wc.wc-waiver-report .wr-manager img{width:23px!important;height:23px!important}
  .wc.wc-waiver-report .wr-player img{width:27px;height:27px}
  .wc.wc-waiver-report .wr-player{gap:5px}
  .wc.wc-waiver-report .wr-player b{font-size:12px}
  .wc.wc-waiver-report .is-failed .wr-transfer{grid-template-columns:minmax(0,1fr)}
  .wc.wc-waiver-report .is-failed .wr-incoming{display:flex;align-items:center;gap:10px}
  .wc.wc-waiver-report .is-failed .wr-label{margin:0;flex:none}
  .wc.wc-waiver-report .wr-reason{font-size:11px}
 }
 @container(max-width:310px){
  .wc.wc-waiver-report .wr-transfer{grid-column:1/-1}
  .wc.wc-waiver-report .is-failed .wr-incoming{gap:7px}
 }
 .wire-expanded-stage .wc.wc-waiver-report .wr-claims{overflow-y:auto;overscroll-behavior-y:contain}
 `;
 document.head.append(reportStyle);
 // Reuse the activity scheduler, keeping the report separate from roster moves.
 // During Wednesday processing,
 // check every 30 seconds and redraw when that morning's run is returned.
 function waiverProcessingWindow(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',hour:'numeric',hourCycle:'h23'}).formatToParts(new Date());
  const value=key=>parts.find(part=>part.type===key)?.value;
  return value('weekday')==='Wed'&&Number(value('hour'))>=2&&Number(value('hour'))<8;
 }
 if(typeof hjRefreshLiveActivityV24==='function'){
  const refreshActivity=hjRefreshLiveActivityV24;
  hjRefreshLiveActivityV24=async function(force=false){
   const before=JSON.stringify(waiverReportHistory());
   try{const result=await Promise.allSettled([refreshActivity.call(this,force||waiverProcessingWindow()),refreshWaiverReport(force)]);if(result[0].status==='rejected')throw result[0].reason;return result[0].value}
   finally{if(JSON.stringify(waiverReportHistory())!==before){wireRender(false);if(typeof hjRenderActivityPanelV24==='function')hjRenderActivityPanelV24()}}
  };
 }
 if(typeof hjQueueLiveActivityV24==='function'){
  const queueActivity=hjQueueLiveActivityV24;
  hjQueueLiveActivityV24=function(){
   if(!waiverProcessingWindow())return queueActivity.apply(this,arguments);
   clearTimeout(HJ_LIVE_ACTIVITY.timer);
   HJ_LIVE_ACTIVITY.timer=setTimeout(async()=>{
    try{if(!document.hidden)await hjRefreshLiveActivityV24(false)}
    finally{hjQueueLiveActivityV24()}
   },30000);
  };
  hjQueueLiveActivityV24();
 }

 const priorityOrder=['kickoff','waivers','waiver-report','byes'];
 HJ_WIRE_ORDER.splice(0,HJ_WIRE_ORDER.length,...priorityOrder,...HJ_WIRE_ORDER.filter(s=>!priorityOrder.includes(s)&&!['this-week','byes','lms'].includes(s)));
 hjWireNavLabel=function(section,data){return ({byes:'Bye Week',lms:'Last Man Standing','waiver-report':'Waiver Report'})[section]||baseLabel(section,data)};
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
  // The Wire shows the report on its Wednesday only; from Thursday it lives in League Activity.
  const shown=waiverReportData();
  if(shown&&wireCentralDateKey(Date.now())===shown.date&&!built.cards.some(card=>card.section==='waivers')){const report=waiverReportCard();if(report)built.cards.push(report)}
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
 // Thursday starts in Central time: drop the Wednesday report card from the Wire.
 if(typeof setInterval==='function')setInterval(()=>{const card=document.querySelector('#wire-scroll [data-wire-key^="waiver-report-"]');if(card&&card.dataset.wireKey!=='waiver-report-'+wireCentralDateKey(Date.now()))wireRender(false);},60000);

 // League Activity: the latest waiver report stays here until the next Wednesday run.
 let activityReportOpen=true,activityReportDate=null,activityReportScroll=0;
 function activityWaiverHTML(){
  const history=waiverReportHistory();if(!history.length)return '';
  const report=history.find(r=>r.date===activityReportDate)||history[0];
  const day=r=>new Date(r.at).toLocaleDateString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric'});
  const date=new Date(report.at).toLocaleDateString('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric'});
  const successful=report.items.filter(row=>row.status==='EXECUTED').length,failed=report.items.length-successful;
  const chips=history.map(r=>'<button type="button" data-waiver-report="'+esc(r.date)+'" aria-pressed="'+(r===report)+'"><small>'+(r===history[0]?'Latest':r.week?'Week '+r.week:'Wed')+'</small><b>'+esc(day(r))+'</b></button>').join('');
  return '<details class="hj-wr" data-activity-waivers'+(activityReportOpen?' open':'')+'><summary><span class="hj-wr-head"><span class="hj-wr-kicker">'+(report.week?'Week '+report.week+' · ':'')+'Processed '+esc(date)+'</span><span class="hj-wr-title">Waiver Reports</span></span><span class="hj-wr-summary"><span class="is-ok"><b>'+successful+'</b> successful</span><span class="is-fail"><b>'+failed+'</b> unsuccessful</span></span><span class="hj-wr-chevron" aria-hidden="true"></span></summary><div class="hj-wr-history" role="group" aria-label="Waiver report history">'+chips+'</div><div class="wr-list" role="list">'+waiverClaimRows(report)+'</div></details>';
 }
 // Presentation only: manager portraits, short times, day counts, active metric.
 function decorateActivity(html){
  const template=document.createElement('template');template.innerHTML=html;
  const root=template.content.querySelector('.hj-activity-dashboard');if(!root)return html;
  root.insertAdjacentHTML('afterbegin',activityWaiverHTML());
  root.querySelector('[data-activity-metric="'+HJ_ACTIVITY_VIEW.type+'"]')?.setAttribute('aria-pressed','true');
  root.querySelectorAll('.hj-activity-day').forEach(day=>{const h=day.querySelector(':scope>h4'),n=day.querySelectorAll('.hj-transaction').length;h?.insertAdjacentHTML('beforeend','<span class="hj-day-count">'+n+(n===1?' move':' moves')+'</span>');});
  root.querySelectorAll('.hj-transaction').forEach(card=>{
   const h=card.querySelector('header h4'),time=card.querySelector('header time');
   if(h&&!h.querySelector('.hj-tx-mgr')){const names=h.textContent.split(' ↔ ').filter(Boolean);h.innerHTML=names.map(name=>'<span class="hj-tx-mgr">'+(Object.prototype.hasOwnProperty.call(AV,name)?av(name):'')+'<span>'+esc(name)+'</span></span>').join('<span class="hj-tx-swap" aria-label="with">⇄</span>');}
   if(time){const at=new Date(time.getAttribute('datetime'));if(!isNaN(at))time.textContent=at.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});}
  });
  return template.innerHTML;
 }
 if(typeof hjActivityHTML==='function'){
  const activityBase=hjActivityHTML;
  window.hjActivityHTML=hjActivityHTML=function(){return decorateActivity(activityBase.apply(this,arguments))};
 }
 document.addEventListener('toggle',event=>{if(event.target.matches?.('[data-activity-waivers]'))activityReportOpen=event.target.open;},true);
 document.addEventListener('scroll',event=>{if(event.target.matches?.('.hj-wr-history'))activityReportScroll=event.target.scrollLeft;},true);
 document.addEventListener('click',event=>{
  const chip=event.target.closest?.('[data-waiver-report]');if(!chip)return;
  activityReportDate=chip.dataset.waiverReport;hjRenderActivityPanelV24();
 });
 // Keep the history strip where the reader left it across 30-second refreshes.
 if(typeof hjRenderActivityPanelV24==='function'){
  const renderActivity=hjRenderActivityPanelV24;
  hjRenderActivityPanelV24=function(){const result=renderActivity.apply(this,arguments);const strip=document.querySelector('#hq-panel-activity .hj-wr-history');if(strip)strip.scrollLeft=activityReportScroll;return result};
 }
 wireRender(true);
})();


