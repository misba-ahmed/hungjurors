const HJ_CHALLENGE_STATE={data:null,weeks:new Map(),model:null,names:[],pending:null,active:'raffle',error:'',checkedAt:0};
function hjChallengeNames(data){return (data.teams||[]).map(t=>({id:String(t.id),short:hjMatchManager(t,data)||hjOwnerName(t,data)||hjTeamName(t)}))}
function hjChallengeWeekActive(data,week){
 return (data.schedule||[]).some(g=>Number(g.matchupPeriodId)===week&&['home','away'].some(k=>Math.abs(Number(g[k]?.pointsByScoringPeriod?.[week]??g[k]?.totalPointsLive??0))>0))||(typeof NFL_WEEK1!=='undefined'&&NFL_WEEK1.some(g=>Number(g.week)===week&&['in','post'].includes(g.state)));
}
async function hjRefreshChallenges(data){
 if(!data?.teams?.length||Number(data.seasonId)!==Number(NFL_SEASON))return;
 HJ_CHALLENGE_STATE.data=data;
 if(HJ_CHALLENGE_STATE.pending)return HJ_CHALLENGE_STATE.pending;
 HJ_CHALLENGE_STATE.pending=Promise.resolve().then(async()=>{
  const state=HJ_CHALLENGE_STATE,current=state.data,season=Number(NFL_SEASON),latest=Number(current.scoringPeriodId||current.status?.latestScoringPeriod||1);
  state.names=hjChallengeNames(current);
  const regularEnd=Number(current.settings?.scheduleSettings?.matchupPeriodCount)||14,finalEnd=Number(current.status?.finalScoringPeriod)||regularEnd;
  const currentGames=(current.schedule||[]).filter(g=>Number(g.matchupPeriodId)===latest),currentFinal=currentGames.length>0&&currentGames.every(g=>['HOME','AWAY','TIE'].includes(g.winner));
  const through=Math.min(finalEnd,latest-(hjChallengeWeekActive(current,latest)||currentFinal?0:1)),errors=[];
  let pool=[],poolReady=false;
  if(through>0)try{pool=await hjDataPool(season,latest);poolReady=true}catch(error){errors.push('Player rankings unavailable; retrying automatically')}
  for(let week=1;week<=through;week++){
   try{
    let payload=current,checkedAt=HJ_LEAGUE_STATE.syncedAt;
    if(week!==latest){
     const key=`history:${season}:${week}`;
     payload=await hjDataRequest(key,()=>hjDataJson(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${ESPN_FANTASY_LEAGUE_ID}?scoringPeriodId=${week}&view=mMatchup&view=mMatchupScore&view=mRoster&view=mSettings&view=mTeam`),300000);
     const record=HJ_DATA.requests.get(key);checkedAt=record?.at||0;if(record?.error)errors.push(`Week ${week} refresh delayed; showing saved results`);
     HJ_DATA.history.set(week,payload);
    }
    const final=week<latest||currentFinal;
    state.weeks.set(week,hjChWeek(payload,{season,week,names:state.names,pool,poolReady,final,checkedAt}));
   }catch(error){errors.push(`Week ${week} unavailable; retrying automatically`);}
  }
  const weeks=Array.from({length:Math.max(0,through)},(_,i)=>state.weeks.get(i+1)||{week:i+1,final:i+1<latest,teams:[],awards:[],checkedAt:0});
  state.model=hjChStandings(weeks,state.names,{regularEnd,finalEnd});state.error=[...new Set(errors)].join(' · ');state.checkedAt=Number(HJ_LEAGUE_STATE.syncedAt)||0;
  hjRenderChallenge();
 }).catch(error=>{HJ_CHALLENGE_STATE.error='ESPN challenge update delayed; retrying automatically';hjRenderChallenge();console.warn('Challenges refresh failed',error)}).finally(()=>{HJ_CHALLENGE_STATE.pending=null});
 return HJ_CHALLENGE_STATE.pending;
}
function hjChManager(name){return `<span class="who-cell">${av(name,'xs')}<b>${esc(name)}</b></span>`}
function hjChMetricCard(label,value,detail=''){return `<div class="challenge-live-card"><span>${esc(label)}</span><strong>${value}</strong>${detail?`<small>${esc(detail)}</small>`:''}</div>`}
function hjChFormat(key,value){return Number.isFinite(value)?key==='titty'||key==='mvp'?String(value):(key==='overachiever'&&value>0?'+':'')+value.toFixed(2):'—'}
function hjChTable(headers,rows){return `<div class="tbl-wrap challenge-live-table"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`}
function hjChRaffle(model){
 const total=model.tickets.reduce((n,t)=>n+t.total,0),live=model.weeks.find(w=>w.week===model.liveWeek&&w.week<=model.regularEnd),liveHigh=live?.teams.filter(t=>Number.isFinite(t.score)).sort((a,b)=>b.score-a.score)[0];
 const cards=hjChMetricCard('Tickets earned',String(total),`${model.raffle.length} final weeks`)+hjChMetricCard('Regular season',`Weeks 1–${model.regularEnd}`,'Tickets lock after final scores')+(liveHigh?hjChMetricCard(`Week ${live.week} leader`,hjChManager(liveHigh.short),`${liveHigh.score.toFixed(2)} points · provisional`):'');
 const rows=model.tickets.map(t=>`<tr><td>${hjChManager(t.short)}</td><td class="num">${t.total}</td><td class="num">${total?(100*t.total/total).toFixed(1)+'%':'—'}</td></tr>`).join('');
 const history=model.raffle.map(w=>`<tr><td>Week ${w.week}</td><td>${w.winners.map(t=>hjChManager(t.short)).join(' ')}</td><td class="num">${w.score.toFixed(2)}</td></tr>`).join('');
 return `<div class="challenge-live-cards">${cards}</div>${hjChTable(['Manager','Tickets','Current odds'],rows)}<details class="challenge-live-details"><summary>Weekly high scorers</summary>${history?hjChTable(['Week','Manager','Score'],history):'<p>Tickets appear when ESPN finalizes Week 1.</p>'}</details><p class="challenge-live-note">Ticket totals update automatically. Tied high scorers each earn a ticket. The end-of-season raffle draw determines the winner.</p>`;
}
function hjChLms(model){
 const alive=HJ_CHALLENGE_STATE.names.filter(n=>model.alive.includes(n.id)),live=model.weeks.find(w=>!w.final&&w.week>=5),risk=live?.teams.filter(t=>model.alive.includes(t.id)&&Number.isFinite(t.score)).sort((a,b)=>a.score-b.score)[0];
 return `<div class="challenge-live-cards">${hjChMetricCard('Still standing',String(alive.length),`Of ${HJ_CHALLENGE_STATE.names.length} managers`)}${hjChMetricCard(model.finalWeek<5?'First elimination':'Eliminations',model.finalWeek<5?'Week 5':String(model.eliminations.length),'Only final weekly scores count')}${alive.length===1?hjChMetricCard('Last man standing',hjChManager(alive[0].short)):risk?hjChMetricCard(`Week ${live.week} at risk`,hjChManager(risk.short),'Provisional · games still in progress'):''}</div><div class="challenge-survivors">${alive.map(n=>`<div>${hjChManager(n.short)}<span>Still standing</span></div>`).join('')}</div>${model.lmsBlocked?`<p class="challenge-live-warning">${esc(model.lmsBlocked)}</p>`:''}${model.eliminations.length?hjChTable(['Week','Eliminated','Score'],model.eliminations.map(t=>`<tr><td>Week ${t.week}</td><td>${hjChManager(t.short)}</td><td class="num">${t.score.toFixed(2)}</td></tr>`).join('')):''}`;
}
function hjChSpecial(ch,model){
 const rows=model.totals[ch.id],complete=rows.filter(r=>!r.missing.length),leader=complete[0],tiebreak=['titty','mvp'].includes(ch.id),tieLabel=ch.id==='titty'?'QB/RB/WR yards':'MVP player points';
 const latest=model.weeks.at(-1)?.week||1;
 const cards=hjChMetricCard(model.liveWeek?'Live leader':'Leader',leader&&leader.weeks?hjChManager(leader.short):'—',leader&&leader.weeks?`${hjChFormat(ch.id,leader.total)} ${ch.id==='optimizer'?'points left on bench':'total'}`:'Waiting for complete ESPN results')+hjChMetricCard('Tracking',`Weeks 1–${model.finalEnd}`,model.liveWeek?`Week ${model.liveWeek} is provisional`:`Final through Week ${model.finalWeek||'—'}`);
 let last=null,rank=0;
 const table=rows.map((r,i)=>{const key=`${r.total}|${r.tie}`;if(key!==last)rank=i+1;last=key;const weekly=r.history.find(h=>h.week===latest);
  return `<tr class="${i===0&&!r.missing.length?'top':''}"><td>${r.missing.length?'—':rank}</td><td>${hjChManager(r.short)}${r.missing.length?`<small class="challenge-missing">Waiting for Week ${r.missing.join(', ')}</small>`:''}</td><td class="num">${hjChFormat(ch.id,weekly?.value)}</td><td class="num">${r.weeks?hjChFormat(ch.id,r.total):'—'}${r.missing.length?'*':''}</td>${tiebreak?`<td class="num">${ch.id==='titty'?r.tie:r.tie.toFixed(2)}</td>`:''}</tr>`;
 }).join('');
 const history=model.weeks.map(w=>{
  const content=ch.id==='mvp'?`<div class="challenge-mvp-grid">${w.awards.map(p=>`<div><span>${esc(p.category)}</span><b>${esc(p.name)}</b><strong>${p.points.toFixed(2)}</strong>${p.manager?hjChManager(p.manager):'<small>Not started · no award</small>'}</div>`).join('')||'<p>Waiting for complete player rankings.</p>'}</div>`:hjChTable(['Manager',...(ch.id==='overachiever'?['Actual','Projected']:ch.id==='optimizer'?['Actual','Optimal']:[]),'Week total'],w.teams.map(t=>`<tr><td>${hjChManager(t.short)}</td>${ch.id==='overachiever'?`<td class="num">${hjChFormat('score',t.score)}</td><td class="num">${hjChFormat('score',t.projection)}</td>`:ch.id==='optimizer'?`<td class="num">${hjChFormat('score',t.score)}</td><td class="num">${hjChFormat('score',t.optimal)}</td>`:''}<td class="num">${hjChFormat(ch.id,t[ch.id])}</td></tr>`).join(''));
  return `<details class="challenge-live-details"><summary>Week ${w.week} <span>${w.final?'Final':'In progress'}</span></summary>${content}</details>`;
 }).reverse().join('');
 return `<div class="challenge-live-cards">${cards}</div>${hjChTable(['Rank','Manager',`Week ${latest}`,'Season total',...(tiebreak?[tieLabel]:[])],table)}${rows.some(r=>r.missing.length)?'<p class="challenge-live-note">* Partial total. Missing weeks stay pending until ESPN supplies the records.</p>':''}${history}`;
}
function hjRenderChallenge(){
 const state=HJ_CHALLENGE_STATE,ch=CHALLENGES.find(c=>c.id===state.active)||CHALLENGES[0],out=$('#challenge-out');if(!out)return;
 const model=state.model,time=state.checkedAt?new Date(state.checkedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';
 const status=state.error||HJ_LEAGUE_STATE.error||(!model?'Loading ESPN season results…':`${model.liveWeek?`Week ${model.liveWeek} in progress`:model.finalWeek?`Final through Week ${model.finalWeek}`:'Season has not started'} · ${time?`ESPN checked ${time} · `:''}Updates automatically`);
 const body=!model?'<div class="empty">Loading scores and historical lineups…</div>':ch.id==='raffle'?hjChRaffle(model):ch.id==='lms'?hjChLms(model):hjChSpecial(ch,model);
 const html=`<div class="challenge-live-status${state.error||HJ_LEAGUE_STATE.error?' is-delayed':''}" role="status">${esc(status)}</div>${body}`;
 // Preserve open weekly details and avoid replacing identical content.
 const opened=[...out.querySelectorAll('details[open]')].map(n=>n.querySelector('summary')?.textContent);
 if(out.innerHTML!==html){out.innerHTML=html;out.querySelectorAll('details').forEach(n=>{if(opened.includes(n.querySelector('summary')?.textContent))n.open=true})}
}
function selectChallenge(id){
 const ch=CHALLENGES.find(c=>c.id===id)||CHALLENGES[0];HJ_CHALLENGE_STATE.active=ch.id;
 document.querySelectorAll('#challenge-strip button').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.challenge===ch.id));b.tabIndex=b.dataset.challenge===ch.id?0:-1});
 $('#challenge-rule').textContent=ch.rule;$('#challenge-prize-badge').textContent=ch.prize;
 const out=$('#challenge-out');out.setAttribute('role','tabpanel');out.setAttribute('aria-labelledby',`challenge-tab-${ch.id}`);hjRenderChallenge();
}
{
 const strip=$('#challenge-strip');
 strip.innerHTML=CHALLENGES.map(ch=>`<button type="button" id="challenge-tab-${ch.id}" role="tab" aria-controls="challenge-out" data-challenge="${ch.id}" aria-selected="false">${ch.label}</button>`).join('');
 strip.addEventListener('click',e=>{const b=e.target.closest('button[data-challenge]');if(b)selectChallenge(b.dataset.challenge)});
 strip.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...strip.querySelectorAll('button')],i=tabs.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectChallenge(tabs[next].dataset.challenge);tabs[next].focus()});
 const base=hjApplyLiveSeason;
 hjApplyLiveSeason=function(data,...args){const result=base.call(this,data,...args);hjRefreshChallenges(data);return result};
 selectChallenge('raffle');if(HJ_LEAGUE_STATE.data)hjRefreshChallenges(HJ_LEAGUE_STATE.data);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&HJ_LEAGUE_STATE.data)hjRefreshChallenges(HJ_LEAGUE_STATE.data)});
}
