const HJ_CHALLENGE_STATE={data:null,weeks:new Map(),model:null,names:[],pending:null,active:'raffle',error:'',checkedAt:0,lmsFit:true,raffleFit:true};
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
function hjChManager(name){return `<span class="who-cell">${av(name,'challenge-avatar')}<b>${esc(name)}</b></span>`}
function hjChMetricCard(label,value,detail=''){return `<div class="challenge-live-card"><span>${esc(label)}</span><strong>${value}</strong>${detail?`<small>${esc(detail)}</small>`:''}</div>`}
function hjChFormat(key,value){return Number.isFinite(value)?key==='titty'||key==='mvp'?String(value):(key==='overachiever'&&value>0?'+':'')+value.toFixed(2):'—'}
function hjChTable(headers,rows){return `<div class="tbl-wrap challenge-live-table"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`}
function hjChOdds(count,total){return total?`${Number((100*count/total).toFixed(1))}%`:'0%'}
function hjChRaffleTicket(week,score){
 // One raffle ticket: stub with perforation, side notches, week on top and that week's score under it.
 return `<svg class="raffle-ticket" viewBox="0 0 120 48" aria-hidden="true" focusable="false"><path class="raffle-ticket-body" d="M8 3H112Q117 3 117 8V19A5 5 0 0 0 117 29V40Q117 45 112 45H8Q3 45 3 40V29A5 5 0 0 0 3 19V8Q3 3 8 3Z"/><path class="raffle-ticket-trim" d="M9.5 6.5H110.5Q113.5 6.5 113.5 9.5V17.5A7 7 0 0 0 113.5 30.5V38.5Q113.5 41.5 110.5 41.5H9.5Q6.5 41.5 6.5 38.5V30.5A7 7 0 0 0 6.5 17.5V9.5Q6.5 6.5 9.5 6.5Z"/><path class="raffle-ticket-perf" d="M30 7v34"/><text class="raffle-ticket-stub" transform="rotate(-90 18 24)" x="18" y="24">HJ</text><text class="raffle-ticket-week" x="73.5" y="21">WEEK ${week}</text><text class="raffle-ticket-score" x="73.5" y="39">${score.toFixed(2)}</text></svg>`;
}
function hjChRaffleFigure(manager,index,tickets,total){
 const stack=tickets.map(t=>hjChRaffleTicket(t.week,t.score)).join('');
 const label=`${esc(manager.short)}: ${tickets.length} raffle ticket${tickets.length===1?'':'s'}, ${hjChOdds(tickets.length,total)} odds${tickets.length?` (Week${tickets.length===1?'':'s'} ${tickets.map(t=>t.week).join(', ')})`:''}`;
 return `<div class="raffle-figure" role="img" aria-label="${label}" data-raffle-manager="${esc(manager.id)}" style="${hjChJacket(index)};--raffle-delay:${(index*.37).toFixed(2)}s"><div class="raffle-stack">${stack}</div>${hjChFigureArt(manager,`raffle-head-${index}`)}<span class="raffle-label" aria-hidden="true"><span class="raffle-name">${esc(manager.short)}</span><span class="raffle-stat">${tickets.length} · ${hjChOdds(tickets.length,total)}</span></span></div>`;
}
function hjChRaffle(model){
 const names=HJ_CHALLENGE_STATE.names,total=model.tickets.reduce((n,t)=>n+t.total,0);
 const earned=new Map(names.map(n=>[n.id,[]]));
 for(const w of model.raffle)for(const t of w.winners)earned.get(t.id)?.push({week:w.week,score:w.score});
 const figures=names.map((n,i)=>hjChRaffleFigure(n,i,earned.get(n.id)||[],total)).join('');
 const history=model.raffle.map(w=>`<tr><td>Week ${w.week}</td><td>${w.winners.map(t=>hjChManager(t.short)).join(' ')}</td><td class="num">${w.score.toFixed(2)}</td></tr>`).join('')||'<tr><td colspan="3" class="raffle-empty">Tickets appear when ESPN finalizes Week 1.</td></tr>';
 const fit=HJ_CHALLENGE_STATE.raffleFit;
 return `<div class="lms-view raffle-view${fit?' is-fit':''}" data-fit-key="raffleFit">${hjChZoomButtons(fit,'raffle-lineup')}<div class="lms-stage raffle-stage" style="touch-action:manipulation" tabindex="0" role="group" aria-label="Highest Scorer Raffle tickets by manager"><div class="raffle-lineup" id="raffle-lineup" style="--raffle-count:${names.length||1}"><div class="raffle-row">${figures}</div></div></div></div>${hjChTable(['Week','Manager','Score'],history)}`;
}
function hjChJacket(index){
 const palette=['#26546b','#426575','#1d405b','#4f6070','#345e65','#264a67','#53647a','#385d76','#41667c','#34475e'];
 return `--lms-jacket:${palette[index%palette.length]}`;
}
function hjChLmsFigure(manager,elimination,index){
 const out=!!elimination;
 return `<div class="lms-figure${out?' is-eliminated':''}" role="img" aria-label="${esc(manager.short)}: ${out?`eliminated Week ${elimination.week}, seated`:'standing'}" data-lms-manager="${esc(manager.id)}" style="${hjChJacket(index)}">${hjChFigureArt(manager,`lms-head-${index}`)}<span class="lms-name" aria-hidden="true">${esc(manager.short)}</span></div>`;
}
function hjChFigureArt(manager,key){
 // Keep the original avatar pixels; clip off its shoulders to join the illustrated body.
 return `<svg class="lms-art" viewBox="0 0 120 240" aria-hidden="true" focusable="false">
 <defs><clipPath id="${key}"><ellipse cx="60" cy="40" rx="30" ry="37"/></clipPath></defs>
 <ellipse class="lms-shadow" cx="60" cy="223" rx="35" ry="5"/>
 <g class="lms-standing-legs"><path d="M43 136 40 214M77 136 80 214" fill="none" stroke="#142c42" stroke-width="19" stroke-linecap="round"/><path d="M28 214h21v9H25q-5-5 3-9M72 214h21q8 4 3 9H72Z" fill="#0a1c2d"/><path d="M27 222h22M73 222h22" stroke="#c7d0d4" stroke-width="2"/></g>
 <g class="lms-seated-legs"><path d="M43 194 26 211 56 218M77 194 94 211 65 218" fill="none" stroke="#142c42" stroke-width="18" stroke-linecap="round"/><path d="m43 213 18 2v8H40q-5-5 3-10M65 214l17-2q7 7 2 11H65Z" fill="#0a1c2d"/></g>
 <g class="lms-upper"><path d="M52 62h16v18H52Z" fill="#d7b69b"/>
 <path d="M42 77 27 88 21 125M78 77l15 11 6 37" fill="none" stroke="var(--lms-jacket)" stroke-width="17" stroke-linecap="round"/>
 <path d="m21 125 2 10M99 125l-2 10" stroke="#d7b69b" stroke-width="10" stroke-linecap="round"/>
 <path d="M40 74 52 70h16l12 4 5 73H35Z" fill="var(--lms-jacket)" stroke="#132c41" stroke-width="2"/>
 <path d="m50 72 10 49 10-49Z" fill="#f5f1e5"/><path d="m57 79 6 0 3 26-6 11-6-11Z" fill="#c39b42"/>
 <path d="m48 72-7 16 10 7-6 8 15 24M72 72l7 16-10 7 6 8-15 24" fill="none" stroke="#ffffff" stroke-opacity=".2" stroke-width="2"/>
 <path d="M60 124v22M39 137h12M69 137h12" stroke="#11283c" stroke-width="2"/><circle cx="64" cy="131" r="1.5" fill="#cfb365"/>
 <path d="M70 91h9v2h-9Z" fill="#dfc778"/>
 <image href="data:image/png;base64,${AV[manager.short]||AV_DEFAULT}" x="12" y="-2" width="96" height="96" clip-path="url(#${key})"/>
 </g></svg>`;
}
function hjChLms(model){
 const names=HJ_CHALLENGE_STATE.names,eliminated=new Map(model.eliminations.map(e=>[e.id,e]));
 const figures=names.map((n,i)=>hjChLmsFigure(n,eliminated.get(n.id),i)).join('');
 const history=hjChLmsHistory(model,names).map(w=>`<li class="lms-feed-week${w.eliminated?' has-elimination':''}"><div class="lms-feed-meta"><b>Week ${w.week}</b><span>${w.eliminated?'ELIMINATED':w.pending?'PENDING':'NO ELIMINATION'}</span></div><div class="lms-feed-results">${w.lowest.map(t=>`<div class="lms-feed-result">${hjChManager(t.short)}<strong>${t.score.toFixed(2)}</strong></div>`).join('')}</div></li>`).join('');
 const fit=HJ_CHALLENGE_STATE.lmsFit;
 return `<div class="lms-view${fit?' is-fit':''}" data-fit-key="lmsFit">${hjChZoomButtons(fit,'lms-lineup')}<div class="lms-stage" style="touch-action:manipulation" tabindex="0" role="group" aria-label="Last Man Standing manager lineup"><div class="lms-lineup" id="lms-lineup">${figures}</div></div></div><ol class="lms-feed" aria-label="Weekly elimination feed">${history}</ol>`;
}
function hjChZoomButtons(fit,controls){
 return `<div class="lms-zoom" role="group" aria-label="Lineup zoom"><button type="button" data-lms-zoom="fit" aria-pressed="${fit}" aria-controls="${controls}" aria-label="Show entire lineup"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M7.5 10.5h6"/></svg></button><button type="button" data-lms-zoom="detail" aria-pressed="${!fit}" aria-controls="${controls}" aria-label="Zoom in on lineup"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M7.5 10.5h6M10.5 7.5v6"/></svg></button></div>`;
}
function hjChSetLmsZoom(view,fit){
 HJ_CHALLENGE_STATE[view.dataset.fitKey||'lmsFit']=fit;
 view.classList.toggle('is-fit',fit);
 view.querySelectorAll('[data-lms-zoom]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.lmsZoom==='fit')===fit)));
 if(fit)view.querySelector('.lms-stage').scrollTo({left:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
function hjChBindLmsGestures(out){
 let down=null,last=null;
 out.addEventListener('pointerdown',e=>{
  const stage=e.target.closest('.lms-stage');
  if(!e.isPrimary||e.button!==0||!stage||stage.closest('.lms-view').clientWidth>801){down=null;last=null;return;}
  down={stage,id:e.pointerId,x:e.clientX,y:e.clientY,at:e.timeStamp,scroll:stage.scrollLeft};
 });
 out.addEventListener('pointermove',e=>{
  if(down&&e.pointerId===down.id&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>12){down=null;last=null;}
 });
 out.addEventListener('pointercancel',()=>{down=null;last=null;});
 out.addEventListener('pointerup',e=>{
  const tap=down;down=null;
  if(!tap||e.pointerId!==tap.id||e.timeStamp-tap.at>300||Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>12||Math.abs(tap.stage.scrollLeft-tap.scroll)>2){last=null;return;}
  if(last&&last.stage===tap.stage&&e.timeStamp-last.at<=350&&Math.hypot(e.clientX-last.x,e.clientY-last.y)<=28){
   last=null;
   const view=tap.stage.closest('.lms-view');
   hjChSetLmsZoom(view,!view.classList.contains('is-fit'));
  }else last={stage:tap.stage,x:e.clientX,y:e.clientY,at:e.timeStamp};
 });
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
 // The lineup views carry no status line; the raffle still surfaces a delay so stale tickets are never silent.
 const delayed=!!(state.error||HJ_LEAGUE_STATE.error),showStatus=ch.id==='lms'?false:ch.id==='raffle'?delayed:true;
 const html=`${showStatus?`<div class="challenge-live-status${delayed?' is-delayed':''}" role="status">${esc(status)}</div>`:''}${body}`;
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
 hjChBindLmsGestures($('#challenge-out'));
 $('#challenge-out').addEventListener('click',e=>{const button=e.target.closest('[data-lms-zoom]');if(button)hjChSetLmsZoom(button.closest('.lms-view'),button.dataset.lmsZoom==='fit')});
 const strip=$('#challenge-strip');
 strip.innerHTML=CHALLENGES.map(ch=>`<button type="button" id="challenge-tab-${ch.id}" role="tab" aria-controls="challenge-out" data-challenge="${ch.id}" aria-selected="false">${ch.label}</button>`).join('');
 strip.addEventListener('click',e=>{const b=e.target.closest('button[data-challenge]');if(b)selectChallenge(b.dataset.challenge)});
 strip.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...strip.querySelectorAll('button')],i=tabs.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectChallenge(tabs[next].dataset.challenge);tabs[next].focus()});
 const base=hjApplyLiveSeason;
 hjApplyLiveSeason=function(data,...args){const result=base.call(this,data,...args);hjRefreshChallenges(data);return result};
 selectChallenge('raffle');if(HJ_LEAGUE_STATE.data)hjRefreshChallenges(HJ_LEAGUE_STATE.data);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&HJ_LEAGUE_STATE.data)hjRefreshChallenges(HJ_LEAGUE_STATE.data)});
}
