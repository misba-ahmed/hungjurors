const HJ_PERFECT_PAST=[{"season":2025,"week":9,"amount":30,"note":"Koo-Tang Clan \u00b7 Won 200.24\u2013113.42 vs CESAR","team":{"id":"2","short":"BRYAN","score":200.24,"players":[{"id":"4430807","name":"Bijan Robinson","position":"RB","slot":2,"proTeamId":1,"points":17.6},{"id":"4432665","name":"Brock Bowers","position":"TE","slot":6,"proTeamId":13,"points":49.3},{"id":"16800","name":"Davante Adams","position":"WR","slot":4,"proTeamId":14,"points":23.0},{"id":"4430878","name":"Jaxon Smith-Njigba","position":"WR","slot":23,"proTeamId":26,"points":22.0},{"id":"4034949","name":"Eddy Pineiro","position":"K","slot":17,"proTeamId":25,"points":12.0},{"id":"-16024","name":"Chargers D/ST","position":"D/ST","slot":16,"proTeamId":24,"points":11.0},{"id":"4688813","name":"Josh Downs","position":"WR","slot":4,"proTeamId":11,"points":15.7},{"id":"12483","name":"Matthew Stafford","position":"QB","slot":0,"proTeamId":14,"points":26.84},{"id":"4608686","name":"Kyle Monangai","position":"RB","slot":2,"proTeamId":3,"points":22.8}]}}];
/* Perfect Lineup uses the shared challenge feed, artwork, stage and zoom. */
CHALLENGES.push({id:'perfect',label:'The Perfect Lineup',prize:'$30',rule:'Any team whose entire starting lineup meets the minimum scores below for a "perfect lineup" in a single week earns $30, regardless of the matchup result. There is no limit to the number of winners or how many times each manager can earn the prize.'});
const HJ_PERFECT_ORDER=[0,2,4,6,23,17,16];
function hjPerfectResult(team,week){
 const players=(team.players||[]).slice().sort((a,b)=>HJ_PERFECT_ORDER.indexOf(a.slot)-HJ_PERFECT_ORDER.indexOf(b.slot));
 const expected=team.starterSlots||[0,2,2,4,4,6,23,17,16],remaining=players.slice(),lineup=[];
 for(const slot of expected.slice().sort((a,b)=>HJ_PERFECT_ORDER.indexOf(a)-HJ_PERFECT_ORDER.indexOf(b))){
  const index=remaining.findIndex(p=>p.slot===slot),p=index<0?{slot,id:'empty-'+lineup.length,name:'Empty slot',points:null,position:HJ_CH_SLOT[slot]}:remaining.splice(index,1)[0];
  const target=slot===0?20:[17,16].includes(slot)?10:15,known=Number.isFinite(p.points),hit=known&&p.points>=target,done=week.final||p.opponent?.state==='post';
  lineup.push({...p,target,hit,done,missing:index<0,short:known?hjChRound(Math.max(0,target-p.points)):target});
 }
 const valid=expected.length===9&&remaining.length===0&&lineup.every(p=>!p.missing)&&new Set(lineup.map(p=>p.id)).size===9;
 const hits=lineup.filter(p=>p.hit).length,shortfall=hjChRound(lineup.reduce((n,p)=>n+p.short,0)),complete=valid&&lineup.every(p=>Number.isFinite(p.points));
 const earned=week.final&&complete&&hits===9,missed=lineup.some(p=>p.done&&!p.hit&&(Number.isFinite(p.points)||p.missing));
 const label=earned?'$30 earned':missed?'Missed this week':!valid?'Incomplete lineup':week.final&&!complete?'Awaiting scores':hits===9?'All targets met':'Still in play';
 return {...team,lineup,hits,shortfall,complete,earned,missed,label};
}
function hjPerfectRank(teams,week){return teams.map(t=>hjPerfectResult(t,week)).sort((a,b)=>b.hits-a.hits||a.shortfall-b.shortfall||a.short.localeCompare(b.short)||a.id.localeCompare(b.id))}
function hjPerfectPlayerGrid(team){
 return `<div class="perfect-player-grid">${team.lineup.map(p=>{
  const slot=HJ_CH_SLOT[p.slot]==='D/ST'?'DST':HJ_CH_SLOT[p.slot]||p.position,attrs=p.missing?{attrs:'',photo:''}:hjChPlayerAttrs(p),cl=p.hit?'is-hit':p.done&&(Number.isFinite(p.points)||p.missing)?'is-miss':'';
  const note=p.hit?'Target met':p.missing?'Empty slot':!Number.isFinite(p.points)?'Awaiting score':(p.done?'Short ':'Need ')+p.short.toFixed(2);
  return `<div class="perfect-player ${cl}"><span class="perfect-position">${esc(slot)} · ${p.target}+</span><button type="button" class="perfect-photo${p.missing?'':' pc-player-trigger'}${p.position==='D/ST'?' is-dst':''}" ${attrs.attrs} ${p.missing?'disabled':''} aria-label="${esc(p.name)}">${attrs.photo?`<img src="${esc(attrs.photo)}" alt="" loading="lazy">`:''}${p.hit||cl==='is-miss'?`<span class="perfect-mark">${p.hit?'✓':'×'}</span>`:''}</button><span class="perfect-player-name">${esc(hjChShortName(p))}</span><strong class="perfect-points">${Number.isFinite(p.points)?p.points.toFixed(2):'—'}</strong><span class="perfect-need">${esc(note)}</span><span class="perfect-game">${p.done?'FINAL':p.opponent?.state==='in'?'LIVE':'UPCOMING'}</span></div>`;
 }).join('')}</div>`;
}
function hjPerfectSelected(team,week){return `<section class="perfect-attempt" id="perfect-selected-lineup" aria-label="${esc(team.short)} Week ${week.week} starters"><div class="perfect-attempt-head"><div class="perfect-manager">${av(team.short,'challenge-avatar')}<span><b>${esc(team.short)}</b><small>${team.hits} of 9 targets reached</small></span></div><div class="perfect-result${team.missed?' is-miss':''}"><b>${esc(team.label)}</b><small>${team.earned?'Perfect lineup':week.final?`${team.shortfall.toFixed(2)} points short`:'Not earned until final'}</small></div></div>${hjPerfectPlayerGrid(team)}</section>`}
function hjPerfectWeeks(model){
 const weeks=model.weeks.slice(),state=HJ_CHALLENGE_STATE,data=state.data,latest=Number(data?.scoringPeriodId);
 if(latest>0&&!weeks.some(w=>w.week===latest))try{weeks.push(hjChWeek(data,{season:Number(NFL_SEASON),week:latest,names:state.names,final:false}))}catch(error){}
 return weeks.sort((a,b)=>a.week-b.week);
}
function hjChPerfect(model){
 const state=HJ_CHALLENGE_STATE,weeks=hjPerfectWeeks(model),week=weeks.find(w=>w.week===state.perfectWeek)||weeks.at(-1);
 if(!week)return '<div class="empty">Waiting for ESPN starting lineups.</div>';
 const rows=hjPerfectRank(week.teams,week),selected=rows.find(t=>t.id===state.perfectManager)||rows[0];
 if(selected)state.perfectManager=selected.id;
 const figures=rows.map((t,i)=>`<button type="button" class="lineup-figure perfect-figure${selected?.id===t.id?' is-selected':''}" data-perfect-manager="${esc(t.id)}" data-lineup-manager="${esc(t.id)}" aria-pressed="${selected?.id===t.id}" aria-controls="perfect-selected-lineup" aria-label="${esc(t.short)}: ${t.hits} of 9, ${esc(t.label)}. View starting lineup"><span class="lineup-bar-wrap perfect-bars" aria-hidden="true">${t.lineup.map(p=>`<i class="perfect-segment${p.hit?' is-hit':p.done&&(Number.isFinite(p.points)||p.missing)?' is-miss':''}"></i>`).join('')}</span>${hjChFigureArt(t,`perfect-head-${i}`)}<span class="lineup-label"><span class="lineup-name">${esc(t.short)}</span><span class="lineup-stat is-bold">${t.hits}/9</span><span class="lineup-stat perfect-manager-status">${esc(t.label)}</span></span></button>`).join('');
 const picker=`<div class="perfect-week"><label for="perfect-week">Week <select id="perfect-week">${weeks.slice().reverse().map(w=>`<option value="${w.week}"${w.week===week.week?' selected':''}>${w.week}</option>`).join('')}</select></label><span>${week.final?'FINAL RESULTS':'<b class="perfect-live">● LIVE</b>'}</span></div>`;
 const thresholds='<div class="perfect-thresholds"><span>QB <b>20+</b></span><span>Every RB / WR / TE / FLEX <b>15+</b></span><span>K &amp; DST <b>10+</b></span></div>';
 const stage=hjChLineupView({id:'perfect-lineup',fitKey:'perfectFit',label:'Perfect Lineup managers, closest first. Tap a manager to view their starters.',figures,count:rows.length});
 return `<div class="perfect-view">${thresholds}${picker}<p class="perfect-hint">Tap a manager to view their lineup.</p>${stage}${selected?hjPerfectSelected(selected,week):'<div class="empty">ESPN starting lineups are loading.</div>'}${hjPerfectPayouts(weeks)}</div>`;
}
function hjPerfectPayouts(weeks){
 const payouts=HJ_PERFECT_PAST.map(p=>({...p,team:hjPerfectResult(p.team,{week:p.week,final:true})}));
 for(const week of weeks.filter(w=>w.final))for(const t of hjPerfectRank(week.teams,week).filter(t=>t.earned))if(!payouts.some(p=>p.season===Number(NFL_SEASON)&&p.week===week.week&&p.team.id===t.id))payouts.push({season:Number(NFL_SEASON),week:week.week,team:t,amount:30});
 payouts.sort((a,b)=>b.season-a.season||b.week-a.week||a.team.id.localeCompare(b.team.id));
 return `<div class="perfect-payout-heading"><h4 class="aw-sub challenge-sub">PAYOUTS</h4><span>${payouts.length} payout${payouts.length===1?'':'s'} · $${payouts.reduce((n,p)=>n+p.amount,0)}</span></div><div class="perfect-payouts">${payouts.map(p=>`<details class="perfect-payout"><summary><span class="perfect-payout-week">${p.season}<br>Week ${p.week}</span><span class="perfect-payout-who">${av(p.team.short,'challenge-avatar')}<b>${esc(p.team.short)}</b><small>9 of 9</small></span><b class="perfect-award">+$${p.amount}</b><span class="perfect-chevron" aria-hidden="true">⌄</span></summary>${p.note?`<p class="perfect-payout-note">${esc(p.note)}</p>`:''}${hjPerfectPlayerGrid(p.team)}</details>`).join('')||'<p class="challenge-live-note">No payouts yet.</p>'}</div>`;
}
