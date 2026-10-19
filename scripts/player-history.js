/* Season-scoped league history. Shared requests never block profile statistics. */
const PC_HISTORY_CACHE=new Map();
function pcHistoryShell(html,season){
 const section=`<section class="pc-section" data-pc-section="history"><div class="pc-section-head"><h3 class="pc-section-title">History</h3><span class="pc-section-note">${esc(season)} · Hung Jurors</span></div><div class="pc-history-content" aria-live="polite"><p class="pc-history-note">Loading transaction history…</p></div></section>`;
 const marker='<section class="pc-section" data-pc-section="news"';
 const at=html.indexOf(marker);return at<0?html+section:html.slice(0,at)+section+html.slice(at);
}
async function pcHistoryRequest(season,views,period){
 const url=new URL(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${ESPN_FANTASY_LEAGUE_ID}`);
 views.forEach(view=>url.searchParams.append('view',view));if(period!=null)url.searchParams.set('scoringPeriodId',String(period));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch(url,{credentials:'omit',signal:controller.signal});if(!response.ok)throw Error('History unavailable');return await response.json();}finally{clearTimeout(timer);}
}
function pcLoadHistory(season){
 const cached=PC_HISTORY_CACHE.get(season);if(cached&&Date.now()-cached.at<60000)return cached.promise;
 const promise=(async()=>{
  const data=await pcHistoryRequest(season,['mTeam','mSettings','mDraftDetail']);
  if(!Array.isArray(data.teams))throw Error('League history unavailable');
  const last=Math.min(25,Math.max(0,Number(data.scoringPeriodId)||Number(data.status?.currentScoringPeriod)||0));
  const periods=Array.from({length:last+1},(_,i)=>i),results=[];
  // Bound concurrent requests and share them across all player cards in this season.
  for(let i=0;i<periods.length;i+=4)results.push(...await Promise.allSettled(periods.slice(i,i+4).map(async period=>{
   const payload=await pcHistoryRequest(season,['mTransactions2'],period);
   if(!Array.isArray(payload.transactions))throw Error('Missing transaction feed');return payload.transactions;
  })));
  const seen=new Set(),transactions=[];
  for(const result of results)if(result.status==='fulfilled')for(const tx of result.value){const key=String(tx.id||JSON.stringify(tx));if(!seen.has(key)){seen.add(key);transactions.push(tx);}}
  return {data,transactions,partial:results.some(r=>r.status==='rejected')};
 })();PC_HISTORY_CACHE.set(season,{at:Date.now(),promise});promise.catch(()=>PC_HISTORY_CACHE.delete(season));return promise;
}
function pcHistoryRows(player,season,loaded){
 const rows=[],id=String(player.id),data=loaded?.data;
 const manager=teamId=>hjActivityTeamName(teamId,data);
 const picks=(data?.draftDetail?.picks||[]).filter(p=>String(p.playerId)===id);
 for(const p of picks)rows.push({type:'Drafted',to:manager(p.teamId),at:Number(data.settings?.draftSettings?.date)||null,detail:`Round ${p.roundId} · Pick ${p.overallPickNumber}`,draft:true});
 if(!picks.length&&typeof hjAllDraftHistoryRows==='function')for(const p of hjAllDraftHistoryRows().filter(p=>Number(p.year)===season&&pcNameMatch(p.player,player.name)&&(!p.position||p.position===player.position)))rows.push({type:'Drafted',to:p.manager,at:null,detail:`Round ${p.round} · Pick ${p.overall_pick}`,draft:true});
 for(const tx of loaded?.transactions||[]){
  if(String(tx.status).toUpperCase()!=='EXECUTED')continue;
  const source=String(tx.type||'').toUpperCase();
  for(const item of tx.items||[]){
   if(String(item.playerId??item.player?.id??item.playerPoolEntry?.player?.id)!==id)continue;
   const kind=String(item.type||'').toUpperCase(),from=Number(item.fromTeamId)||0,to=Number(item.toTeamId)||0;
   const at=Number(tx.processDate||tx.executionDate||tx.date||tx.proposedDate)||null;
   if(source==='TRADE'&&from&&to&&from!==to)rows.push({type:'Traded',from:manager(from),to:manager(to),at});
   else if(kind==='ADD')rows.push({type:source==='WAIVER'?'Claimed on waivers':'Picked up',to:manager(to||tx.teamId),at});
   else if(kind==='DROP')rows.push({type:'Dropped',from:manager(from||tx.teamId),at});
  }
 }
 return rows.sort((a,b)=>Number(a.draft)-Number(b.draft)||(b.at||0)-(a.at||0));
}
function pcHistoryManager(name){
 if(!name)return '';const known=Object.prototype.hasOwnProperty.call(AV,name);
 return known?`<button type="button" class="pc-history-manager manager-profile-trigger" data-manager="${esc(name)}" aria-label="Open ${esc(name)} profile">${av(name,'mini')}<span>${esc(name)}</span></button>`:`<span class="pc-history-manager">${esc(name)}</span>`;
}
function pcHistoryHTML(rows,partial,error){
 const note=error?'Transaction history is temporarily unavailable. Reopen this card to retry.':partial?'Some transaction records could not load. This history may be incomplete.':'';
 // Compact rows in the profile's own type scale: tag · manager(s) · date.
 const kind=type=>type==='Drafted'?'draft':type==='Dropped'?'drop':type==='Traded'?'trade':'add';
 const label=type=>type==='Claimed on waivers'?'Waivers':type==='Picked up'?'Added':type;
 const day=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'America/Chicago'});
 const clock=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'});
 const full=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago',timeZoneName:'short'});
 return `${note?`<p class="pc-history-note">${esc(note)}</p>`:''}${rows.length?`<ol class="pc-history-list">${rows.map(row=>{
  const when=row.at?new Date(row.at):null;
  const time=when?`<time datetime="${when.toISOString()}" title="${esc(full.format(when))}"><b>${esc(day.format(when))}</b>${row.draft?'':`<span>${esc(clock.format(when))}</span>`}</time>`:'<time class="is-unknown"><b>Date n/a</b></time>';
  const people=row.type==='Traded'?`${pcHistoryManager(row.from)}<span class="pc-history-arrow" aria-label="to">→</span>${pcHistoryManager(row.to)}`:pcHistoryManager(row.to||row.from);
  return `<li class="pc-history-event is-${kind(row.type)}"><span class="pc-history-tag">${esc(label(row.type))}</span><div class="pc-history-main"><div class="pc-history-people">${people}</div>${row.detail?`<small class="pc-history-detail">${esc(row.detail)}</small>`:''}</div>${time}</li>`;
 }).join('')}</ol>`:!note?'<p class="pc-history-note">No recorded transactions for this player in this season.</p>':''}`;
}
async function pcRenderHistory(player,season,root,token){
 if(!root._pcHistoryManagerClose){
  root._pcHistoryManagerClose=event=>{
   if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
   if(!event.target.closest?.('[data-pc-section="history"] .manager-profile-trigger'))return;
   if(pcActive?.overlay.contains(root)){pcActive.returnFocus=null;pcClose();}
  };
  root.addEventListener('click',root._pcHistoryManagerClose,true);
  root.addEventListener('keydown',root._pcHistoryManagerClose,true);
 }
 const current=()=>pcActive?.token===token&&String(pcActive.player.id)===String(player.id)&&Number(pcActive.season)===season&&root.isConnected;
 const render=(loaded,error)=>{if(!current())return;const target=root.querySelector('[data-pc-section="history"] .pc-history-content');if(target)target.innerHTML=pcHistoryHTML(pcHistoryRows(player,season,loaded),loaded?.partial,error);};
 try{render(await pcLoadHistory(season),false);}catch(_){render(null,true);}
}
