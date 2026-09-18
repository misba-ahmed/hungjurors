const HJ_CHALLENGE_STATE={data:null,weeks:new Map(),model:null,names:[],pending:null,active:'raffle',error:'',checkedAt:0,lmsFit:true,raffleFit:true,tittyFit:true,mvpFit:true,overFit:true,optFit:true,profileTimer:null,suppressClickUntil:0};
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
    let opponents={};
    try{opponents=hjChOpponents(await hjDataRequest(`nfl:${season}:${week}`,()=>hjDataJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${week}&limit=100`),final?21600000:60000));}catch(error){}
    state.weeks.set(week,hjChWeek(payload,{season,week,names:state.names,pool,poolReady,final,checkedAt,opponents}));
   }catch(error){errors.push(`Week ${week} unavailable; retrying automatically`);}
  }
  const weeks=Array.from({length:Math.max(0,through)},(_,i)=>state.weeks.get(i+1)||{week:i+1,final:i+1<latest,teams:[],awards:[],checkedAt:0});
  state.model=hjChStandings(weeks,state.names,{regularEnd,finalEnd});state.error=[...new Set(errors)].join(' · ');state.checkedAt=Number(HJ_LEAGUE_STATE.syncedAt)||0;
  hjRenderChallenge();
 }).catch(error=>{HJ_CHALLENGE_STATE.error='ESPN challenge update delayed; retrying automatically';hjRenderChallenge();console.warn('Challenges refresh failed',error)}).finally(()=>{HJ_CHALLENGE_STATE.pending=null});
 return HJ_CHALLENGE_STATE.pending;
}
function hjChManager(name){return `<span class="who-cell manager-profile-trigger" data-manager="${esc(name)}" role="button" tabindex="0" aria-label="Open ${esc(name)} profile">${av(name,'challenge-avatar')}<b>${esc(name)}</b></span>`}
function hjChTeamAbbr(proTeamId){return typeof HJ_PRO_TEAM_BY_ID!=='undefined'&&proTeamId!=null?HJ_PRO_TEAM_BY_ID[String(proTeamId)]||'':''}
function hjChPlayerAttrs(p){
 const team=hjChTeamAbbr(p.proTeamId),photo=p.position==='D/ST'?(team&&typeof nflLogo==='function'?nflLogo(team.toLowerCase()):''):(typeof nflHeadshot==='function'?nflHeadshot(p.id):'');
 return {attrs:typeof ffnPlayerDataAttrs==='function'?ffnPlayerDataAttrs({id:p.id,name:p.name,team,position:p.position,photo}):`data-pc-id="${esc(p.id)}" data-pc-name="${esc(p.name)}" data-pc-team="${esc(team)}" data-pc-position="${esc(p.position)}" data-pc-photo="${esc(photo)}"`,photo,team};
}
function hjChMetricCard(label,value,detail=''){return `<div class="challenge-live-card"><span>${esc(label)}</span><strong>${value}</strong>${detail?`<small>${esc(detail)}</small>`:''}</div>`}
function hjChFormat(key,value){return Number.isFinite(value)?key==='titty'||key==='mvp'?String(value):(key==='overachiever'&&value>0?'+':'')+value.toFixed(2):'—'}
function hjChTable(headers,rows,cls=''){return `<div class="tbl-wrap challenge-live-table${cls?` ${cls}`:''}"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`}
function hjChOdds(count,total){return total?`${Number((100*count/total).toFixed(1))}%`:'0%'}
function hjChRaffleTicket(week,score){
 // One raffle ticket: stub with perforation, side notches, week on top and that week's score under it.
 return `<svg class="raffle-ticket" viewBox="0 0 120 48" aria-hidden="true" focusable="false"><path class="raffle-ticket-body" d="M8 3H112Q117 3 117 8V19A5 5 0 0 0 117 29V40Q117 45 112 45H8Q3 45 3 40V29A5 5 0 0 0 3 19V8Q3 3 8 3Z"/><path class="raffle-ticket-trim" d="M9.5 6.5H110.5Q113.5 6.5 113.5 9.5V17.5A7 7 0 0 0 113.5 30.5V38.5Q113.5 41.5 110.5 41.5H9.5Q6.5 41.5 6.5 38.5V30.5A7 7 0 0 0 6.5 17.5V9.5Q6.5 6.5 9.5 6.5Z"/><path class="raffle-ticket-perf" d="M30 7v34"/><text class="raffle-ticket-stub" transform="rotate(-90 18 24)" x="18" y="24">HJ</text><text class="raffle-ticket-week" x="73.5" y="21">WEEK ${week}</text><text class="raffle-ticket-score" x="73.5" y="39">${score.toFixed(2)}</text></svg>`;
}
function hjChRaffleFigure(manager,index,tickets,total){
 const stack=tickets.map(t=>hjChRaffleTicket(t.week,t.score)).join('');
 const label=`${esc(manager.short)}: ${tickets.length} raffle ticket${tickets.length===1?'':'s'}, ${hjChOdds(tickets.length,total)} odds${tickets.length?` (Week${tickets.length===1?'':'s'} ${tickets.map(t=>t.week).join(', ')})`:''}`;
 return hjChLineupFigure({manager,index,key:'raffle',label,above:`<div class="raffle-stack">${stack}</div>`,stat:`${tickets.length} · ${hjChOdds(tickets.length,total)}`,style:`--raffle-delay:${(index*.37).toFixed(2)}s`});
}
function hjChRaffle(model){
 const names=HJ_CHALLENGE_STATE.names,total=model.tickets.reduce((n,t)=>n+t.total,0);
 const earned=new Map(names.map(n=>[n.id,[]]));
 for(const w of model.raffle)for(const t of w.winners)earned.get(t.id)?.push({week:w.week,score:w.score});
 const figures=names.map((n,i)=>hjChRaffleFigure(n,i,earned.get(n.id)||[],total)).join('');
 const history=model.raffle.map(w=>`<tr><td><b>Week ${w.week}</b></td><td>${w.winners.map(t=>hjChManager(t.short)).join(' ')}</td><td class="num"><b>${w.score.toFixed(2)}</b></td></tr>`).join('')||'<tr><td colspan="3" class="raffle-empty">Tickets appear when ESPN finalizes Week 1.</td></tr>';
 return hjChLineupView({id:'raffle-lineup',fitKey:'raffleFit',label:'Highest Scorer Raffle tickets by manager',figures,count:names.length})+`<h4 class="aw-sub challenge-sub">Weekly Highest Scorer</h4>`+hjChTable(['Week','Manager','Score'],history,'week-table');
}
/* Shared fitted lineup: zoom buttons and double tap from Last Man Standing, something above each head, name and a stat beneath. */
function hjChLineupView({id,fitKey,label,figures,count}){
 const fit=HJ_CHALLENGE_STATE[fitKey];
 return `<div class="lms-view lineup-view${fit?' is-fit':''}" data-fit-key="${fitKey}"><div class="lms-stage lineup-stage" style="touch-action:manipulation" tabindex="0" role="group" aria-label="${esc(label)}"><div class="lineup" id="${id}" style="--lineup-count:${count||1}"><div class="lineup-row">${figures}</div></div></div>${hjChZoomButtons(fit,id)}</div>`;
}
function hjChLineupFigure({manager,index,key,label,above='',stat='',statClass='',crown=false,style=''}){
 return `<div class="lineup-figure${crown?' is-leader':''}" role="group" aria-label="${label}" data-lineup-manager="${esc(manager.id)}" style="${hjChJacket(index)};${style}">${above}${hjChFigureArt(manager,`${key}-head-${index}`,crown)}<span class="lineup-label"><span class="lineup-name manager-profile-trigger" data-manager="${esc(manager.short)}" role="button" tabindex="0" aria-label="Open ${esc(manager.short)} profile">${esc(manager.short)}</span><span class="lineup-stat ${statClass}" aria-hidden="true">${stat}</span></span></div>`;
}
function hjChShortName(p){
 if(p.position==='D/ST')return p.name;
 const parts=String(p.name||'').trim().split(/\s+/);
 return parts.length>1?`${parts[0][0]}. ${parts.slice(1).join(' ')}`:parts[0]||'Player';
}
function hjChBar(id,value,pct,label,inner='',cls=''){
 return `<div class="lineup-bar-wrap"><b class="lineup-bar-value${cls?` ${cls}`:''}">${label}</b><div class="lineup-bar${pct<24?' is-short':''}${cls?` ${cls}`:''}" data-bar-id="${esc(id)}" data-bar-value="${value}" style="--titty-pct:${pct.toFixed(2)}">${inner?`<span class="lineup-bar-inner">${inner}</span>`:''}</div></div>`;
}
function hjChSigned(v){return `${v>0?'+':v<0?'−':''}${Math.abs(v).toFixed(2)}`}
function hjChOver(model){
 const names=HJ_CHALLENGE_STATE.names,rows=model.totals.overachiever,byId=new Map(rows.map(r=>[r.id,r])),leaders=hjChLeaders(rows),top=rows[0]?.total??0;
 const maxAbs=Math.max(0,...rows.map(r=>Math.abs(r.total)));
 // The ground line is the projection: beat it and you rise on a pedestal, miss it and you sink into a pit.
 const figures=names.map((n,i)=>{
  const r=byId.get(n.id)||{total:0,tie:0,missing:[],weeks:0},ratio=maxAbs?Math.abs(r.total)/maxAbs:0,neg=r.total<0,crown=leaders.has(n.id),behind=top-r.total;
  const label=`${esc(n.short)}: ${hjChSigned(r.total)} versus projections${crown?', current leader':`, ${behind.toFixed(2)} behind`}`;
  return `<div class="lineup-figure over-figure ${neg?'is-neg':'is-pos'}${crown?' is-leader':''}" role="group" aria-label="${label}" data-lineup-manager="${esc(n.id)}" data-over-id="${esc(n.id)}" style="${hjChJacket(i)};--over-shift:${ratio.toFixed(4)}"><b class="lineup-bar-value ${neg?'is-neg':'is-pos'}">${hjChSigned(r.total)}${r.missing.length?'*':''}</b><span class="${neg?'over-pit':'over-pedestal'}" aria-hidden="true"></span><div class="over-body">${hjChFigureArt(n,`over-head-${i}`,crown)}</div><span class="lineup-label"><span class="lineup-name manager-profile-trigger" data-manager="${esc(n.short)}" role="button" tabindex="0" aria-label="Open ${esc(n.short)} profile">${esc(n.short)}</span><span class="lineup-stat over-behind" aria-hidden="true">${crown?'<em>Leader</em>':`<b>${behind.toFixed(2)}</b><em>Behind</em>`}</span></span></div>`;
 }).join('');
 // Weekly over/under heatmap in the League Awards style; cells open a small projection card.
 const weeks=model.weeks.filter(w=>w.final).reverse(),cells=rows.flatMap(r=>r.history.map(h=>Math.abs(h.value))).filter(Number.isFinite),maxAbsV=Math.max(1,...cells);
 const shade=v=>v>=0?`rgba(46,125,79,${(0.1+0.75*Math.abs(v)/maxAbsV).toFixed(3)})`:`rgba(179,53,44,${(0.1+0.75*Math.abs(v)/maxAbsV).toFixed(3)})`;
 const head=`<tr><th>Manager</th><th>Total</th>${weeks.map((w,i)=>`<th class="wk${i===0?' new':''}">${w.week<=model.regularEnd?`W${w.week}`:`R${w.week-model.regularEnd}`}</th>`).join('')}</tr>`;
 const body=rows.map(r=>`<tr><td class="nm">${hjChManager(r.short)}</td><td class="tot ${r.total<0?'is-neg':'is-pos'}">${hjChSigned(r.total)}${r.missing.length?'*':''}</td>${weeks.map(w=>{const h=r.history.find(h=>h.week===w.week);return h&&Number.isFinite(h.value)?`<td style="background:${shade(h.value)}"><button type="button" class="ch-cell" data-ch-kind="over" data-ch-id="${esc(r.id)}" data-ch-week="${w.week}" aria-expanded="false" aria-label="${esc(r.short)} Week ${w.week}: ${hjChSigned(h.value)}">${hjChSigned(h.value)}</button></td>`:'<td class="is-missing">—</td>'}).join('')}</tr>`).join('');
 const heat=weeks.length?`<div class="heat-wrap over-heat ch-heat"><table class="heat"><thead>${head}</thead><tbody>${body}</tbody></table></div>`:'<p class="challenge-live-note">The chart fills in when Week 1 is final.</p>';
 const legend=`<div class="legend"><span><span class="sw" style="background:rgba(46,125,79,.7)"></span>beat projection</span><span><span class="sw" style="background:rgba(179,53,44,.7)"></span>fell short</span><span>${model.liveWeek?`Week ${model.liveWeek} locks after its last game`:model.finalWeek?`Final through Week ${model.finalWeek}`:''}</span></div>`;
 return `<div class="over-view">${hjChLineupView({id:'over-lineup',fitKey:'overFit',label:'Overachiever Special season totals by manager',figures,count:names.length})}${rows.some(r=>r.missing.length)?'<p class="challenge-live-note">* Partial total. Missing weeks stay pending until ESPN supplies the records.</p>':''}<h4 class="aw-sub challenge-sub">Weekly Over/Under</h4>${heat}${weeks.length?legend:''}</div>`;
}
function hjChLeaders(rows){
 const top=rows[0];
 return new Set(top&&top.total>0?rows.filter(r=>r.total===top.total&&r.tie===top.tie&&r.missing.length===top.missing.length).map(r=>r.id):[]);
}
function hjChMvpCard(p){
 const overall=p.category==='Overall',dst=p.position==='D/ST',{attrs,photo}=hjChPlayerAttrs(p),vs=hjChVs(p.opponent);
 const owner=p.manager?`<span class="mvp-card-owner manager-profile-trigger" data-manager="${esc(p.manager)}" role="button" tabindex="0" aria-label="Open ${esc(p.manager)} profile">${av(p.manager,'mvp-card-av')}<b>${esc(p.manager)}</b></span>`
  :p.bench?`<span class="mvp-card-owner is-status manager-profile-trigger" data-manager="${esc(p.bench)}" role="button" tabindex="0" aria-label="Open ${esc(p.bench)} profile">On ${esc(p.bench)}’s bench</span>`
  :'<span class="mvp-card-owner is-status">Free agent</span>';
 return `<article class="mvp-card${overall?' is-overall':''}${p.manager?'':' is-unowned'}" role="listitem"><button type="button" class="mvp-card-photo pc-player-trigger${dst?' is-logo':''}" data-pos="${esc(p.position)}" ${attrs} aria-label="Open ${esc(p.name)} player card">${photo?`<img src="${esc(photo)}" alt="" loading="lazy" onerror="this.remove()">`:''}</button><span class="mvp-card-pos">${overall?'Overall MVP':esc(p.position)}</span><button type="button" class="mvp-card-name pc-player-trigger" ${attrs}>${esc(hjChShortName(p))}</button>${owner}<strong class="mvp-card-points">${p.points.toFixed(2)}</strong>${vs?`<span class="mvp-card-opp">${esc(vs)}</span>`:''}</article>`;
}
function hjChMvp(model){
 const names=HJ_CHALLENGE_STATE.names,rows=model.totals.mvp,byId=new Map(rows.map(r=>[r.id,r])),max=Math.max(0,...rows.map(r=>r.total)),leaders=hjChLeaders(rows);
 const figures=names.map((n,i)=>{
  const r=byId.get(n.id)||{total:0,tie:0,missing:[]},pct=max?100*r.total/max:0,crown=leaders.has(n.id),label=`${r.total}${r.missing.length?'*':''}`;
  return hjChLineupFigure({manager:n,index:i,key:'mvp',label:`${esc(n.short)}: ${r.total} MVP points, ${r.tie.toFixed(2)} MVP player points${crown?', current leader':''}`,above:hjChBar(n.id,r.total,pct,label,r.tie.toFixed(2)),crown});
 }).join('');
 const order=['QB','RB','WR','TE','K','D/ST','Overall'];
 const history=[...model.weeks].reverse().map((w,i)=>{
  const cards=[...w.awards].sort((a,b)=>order.indexOf(a.category)-order.indexOf(b.category)||b.points-a.points).map(hjChMvpCard).join('');
  return `<details class="challenge-live-details mvp-week"${i===0?' open':''}><summary>Week ${w.week} <span>${w.final?'FINAL':'In progress'}</span></summary>${cards?`<div class="mvp-cards" role="list">${cards}</div>`:'<p>Waiting for complete player rankings.</p>'}</details>`;
 }).join('');
 return `<div class="mvp-view">${hjChLineupView({id:'mvp-lineup',fitKey:'mvpFit',label:'MVP Special season totals by manager',figures,count:names.length})}${rows.some(r=>r.missing.length)?'<p class="challenge-live-note">* Partial total. Missing weeks stay pending until ESPN supplies the records.</p>':''}<div class="mvp-weeks">${history}</div></div>`;
}
function hjChOpt(model){
 const names=HJ_CHALLENGE_STATE.names,rows=model.totals.optimizer,byId=new Map(rows.map(r=>[r.id,r])),leaders=hjChLeaders(rows),max=Math.max(0,...rows.map(r=>r.total));
 // Everyone rides the bench; the shortest bar (fewest points left behind) wears the crown.
 const figures=names.map((n,i)=>{
  const r=byId.get(n.id)||{total:0,tie:0,missing:[]},pct=max?100*r.total/max:0,crown=leaders.has(n.id);
  return `<div class="lineup-figure is-seated${crown?' is-leader':''}" role="group" aria-label="${esc(n.short)}: ${r.total.toFixed(2)} points left on the bench${crown?', current leader':''}" data-lineup-manager="${esc(n.id)}" style="${hjChJacket(i)}">${hjChBar(n.id,r.total,pct,`${r.total.toFixed(2)}${r.missing.length?'*':''}`)}${hjChFigureArt(n,`opt-head-${i}`,crown)}<span class="lineup-label"><span class="lineup-name manager-profile-trigger" data-manager="${esc(n.short)}" role="button" tabindex="0" aria-label="Open ${esc(n.short)} profile">${esc(n.short)}</span></span></div>`;
 }).join('');
 const legCount=Math.max(2,Math.ceil((names.length||1)/2)+1),legs=Array.from({length:legCount},(_,i)=>`<span class="opt-bench-leg" style="left:${(4+92*i/(legCount-1)).toFixed(2)}%"></span>`).join('');
 const bench=`<div class="opt-bench" aria-hidden="true"><span class="opt-bench-seat"></span>${legs}</div>`;
 const lineup=hjChLineupView({id:'opt-lineup',fitKey:'optFit',label:'Optimizer Special points left on the bench by manager',figures:bench+figures,count:names.length});
 // Weekly gap grid in the League Awards style; a cell expands a breakdown row beneath it.
 const weeks=model.weeks.filter(w=>w.final).reverse(),cells=rows.flatMap(r=>r.history.map(h=>h.value)).filter(Number.isFinite),maxV=Math.max(1,...cells);
 const shade=v=>`rgba(179,53,44,${v===0?0:(0.08+0.75*v/maxV).toFixed(3)})`;
 const head=`<tr><th>Manager</th><th>Total</th>${weeks.map((w,i)=>`<th class="wk${i===0?' new':''}">${w.week<=model.regularEnd?`W${w.week}`:`R${w.week-model.regularEnd}`}</th>`).join('')}</tr>`;
 const body=rows.map(r=>`<tr data-opt-row="${esc(r.id)}"><td class="nm">${hjChManager(r.short)}</td><td class="tot">${r.total.toFixed(2)}${r.missing.length?'*':''}</td>${weeks.map(w=>{const h=r.history.find(h=>h.week===w.week);return h&&Number.isFinite(h.value)?`<td style="background:${shade(h.value)}"${h.value===0?' class="is-perfect"':''}><button type="button" class="ch-cell" data-ch-kind="opt" data-ch-id="${esc(r.id)}" data-ch-week="${w.week}" aria-expanded="false" aria-label="${esc(r.short)} Week ${w.week}: ${h.value.toFixed(2)} left on the bench">${h.value.toFixed(2)}</button></td>`:'<td class="is-missing">—</td>'}).join('')}</tr>`).join('');
 const heat=weeks.length?`<div class="heat-wrap opt-heat ch-heat"><table class="heat"><thead>${head}</thead><tbody>${body}</tbody></table></div>`:'<p class="challenge-live-note">The chart fills in when Week 1 is final.</p>';
 const legend=`<div class="legend"><span><span class="sw" style="background:rgba(179,53,44,.08)"></span>perfect lineup (0)</span><span><span class="sw" style="background:rgba(179,53,44,.8)"></span>left a lot behind</span><span>${model.liveWeek?`Week ${model.liveWeek} locks after its last game`:model.finalWeek?`Final through Week ${model.finalWeek}`:''}</span></div>`;
 return `<div class="opt-view">${lineup}${rows.some(r=>r.missing.length)?'<p class="challenge-live-note">* Partial total. Missing weeks stay pending until ESPN supplies the records.</p>':''}<h4 class="aw-sub challenge-sub">Weekly Points Left on the Bench</h4>${heat}${weeks.length?legend:''}</div>`;
}
function hjChOptPlayer(p,points=true){
 if(!p)return '<span class="opt-empty">empty slot</span>';
 return `<button type="button" class="pc-player-trigger opt-player" ${hjChPlayerAttrs(p).attrs}>${esc(hjChShortName(p))}</button>${points&&Number.isFinite(p.points)?`<span class="opt-pts">${p.points.toFixed(2)}</span>`:''}`;
}
function hjChDetailHTML(kind,id,week){
 const model=HJ_CHALLENGE_STATE.model,w=model?.weeks.find(w=>w.week===week),t=w?.teams.find(t=>t.id===id);
 if(!t)return '';
 const title=`<b class="ch-detail-title">${hjChManager(t.short)}<span>Week ${week}${w.final?'':' · in progress'}</span></b>`;
 if(kind==='titty'){
  const scorers=(t.players||[]).filter(p=>p.tds>0).sort((a,b)=>b.tds-a.tds||a.name.localeCompare(b.name));
  const lines=scorers.map(p=>`<li><span class="opt-slot">${esc(p.position||'')}</span><span class="opt-in">${hjChOptPlayer(p,false)}</span><b class="opt-gain">${p.tds}</b></li>`).join('');
  return `${title}${lines?`<ul class="opt-swaps is-simple">${lines}</ul>`:`<p class="ch-detail-note">No titties${w.final?'':' yet'}.</p>`}<div class="ch-detail-total"><span>Week total</span><b class="opt-gain">${Number.isFinite(t.titty)?t.titty:'—'}</b></div>`;
 }
 if(kind==='over'){
  const diff=Number.isFinite(t.overachiever)?t.overachiever:null;
  return `${title}<div class="ch-detail-total is-over"><span>Projected <b>${Number.isFinite(t.projection)?t.projection.toFixed(2):'—'}</b></span><span class="opt-arrow" aria-hidden="true">→</span><span>Actual <b>${Number.isFinite(t.score)?t.score.toFixed(2):'—'}</b></span><b class="opt-gain ${diff!==null&&diff<0?'is-neg':'is-pos'}">${diff===null?'—':hjChSigned(diff)}</b></div>`;
 }
 const gap=Number.isFinite(t.optimizer)?t.optimizer:null;
 if(gap===null)return `${title}<p class="ch-detail-note">Waiting for complete ESPN lineups.</p>`;
 if(!t.swaps?.length||gap===0)return `${title}<p class="ch-detail-perfect">✓ Perfect lineup · <b>${t.score.toFixed(2)}</b></p>`;
 const lines=t.swaps.map(sw=>`<li><span class="opt-slot">${esc(sw.slot)}</span><span class="opt-out">${hjChOptPlayer(sw.out)}</span><span class="opt-arrow" aria-hidden="true">→</span><span class="opt-in">${hjChOptPlayer(sw.in)}</span><b class="opt-gain">+${sw.gain.toFixed(2)}</b></li>`).join('');
 return `${title}<ul class="opt-swaps">${lines}</ul><div class="ch-detail-total"><span>Actual <b>${t.score.toFixed(2)}</b></span><span class="opt-arrow" aria-hidden="true">→</span><span>Optimal <b>${t.optimal.toFixed(2)}</b></span><b class="opt-gain">+${gap.toFixed(2)}</b></div>`;
}
function hjChPlaceDetailArrow(){
 const panel=document.querySelector('.ch-detail-panel'),cell=document.querySelector('.ch-cell.is-open'),wrap=cell?.closest('.heat-wrap');if(!panel||!cell||!wrap)return;
 const c=cell.getBoundingClientRect(),w=wrap.getBoundingClientRect();
 panel.style.setProperty('--panel-w',`${wrap.clientWidth}px`);
 panel.style.setProperty('--arrow-x',`${Math.max(14,Math.min(wrap.clientWidth-14,c.left+c.width/2-w.left))}px`);
}
function hjChCloseDetail(animate=true){
 const row=document.querySelector('tr.ch-detail');
 document.querySelectorAll('.ch-cell.is-open').forEach(c=>{c.classList.remove('is-open');c.setAttribute('aria-expanded','false')});
 if(!row)return;
 const wrap=row.querySelector('.ch-detail-wrap');
 if(!animate||!wrap||matchMedia('(prefers-reduced-motion: reduce)').matches){row.remove();return;}
 wrap.classList.remove('is-open');wrap.addEventListener('transitionend',()=>row.remove(),{once:true});setTimeout(()=>row.isConnected&&row.remove(),450);
}
function hjChOpenDetail(cell,animate=true){
 const tr=cell.closest('tr'),table=tr.closest('table'),existing=document.querySelector('tr.ch-detail'),sameRow=existing&&existing.previousElementSibling===tr;
 if(existing&&!sameRow)hjChCloseDetail(animate);
 document.querySelectorAll('.ch-cell.is-open').forEach(c=>{c.classList.remove('is-open');c.setAttribute('aria-expanded','false')});
 cell.classList.add('is-open');cell.setAttribute('aria-expanded','true');
 const html=hjChDetailHTML(cell.dataset.chKind,cell.dataset.chId,Number(cell.dataset.chWeek));
 let row=sameRow?existing:null;
 if(!row){
  row=document.createElement('tr');row.className='ch-detail';
  row.innerHTML=`<td colspan="${tr.children.length}"><div class="ch-detail-wrap${animate?'':' is-open'}"><div class="ch-detail-inner"><div class="ch-detail-panel">${html}</div></div></div></td>`;
  tr.after(row);
  if(animate){row.getBoundingClientRect();requestAnimationFrame(()=>row.querySelector('.ch-detail-wrap').classList.add('is-open'));}
 }else row.querySelector('.ch-detail-panel').innerHTML=html;
 hjChPlaceDetailArrow();
 const wrap=table.closest('.heat-wrap');if(wrap&&!wrap.dataset.chBound){wrap.dataset.chBound='1';wrap.addEventListener('scroll',hjChPlaceDetailArrow,{passive:true});}
}
function hjChTitty(model){
 const names=HJ_CHALLENGE_STATE.names,rows=model.totals.titty,byId=new Map(rows.map(r=>[r.id,r]));
 const max=Math.max(0,...rows.map(r=>r.total));
 // The leader follows the published tiebreak; an exact tie on both crowns everyone tied.
 const leaders=hjChLeaders(rows);
 const figures=names.map((n,i)=>{
  const r=byId.get(n.id)||{total:0,tie:0,missing:[]},pct=max?100*r.total/max:0,crown=leaders.has(n.id);
  return hjChLineupFigure({manager:n,index:i,key:'titty',label:`${esc(n.short)}: ${r.total} titties${crown?', current leader':''}`,above:hjChBar(n.id,r.total,pct,`${r.total}${r.missing.length?'*':''}`),crown});
 }).join('');
 // Week-by-week heatmap, newest week first, matching the League Awards card.
 const weeks=[...model.weeks].reverse(),cells=rows.flatMap(r=>r.history.map(h=>h.value)).filter(Number.isFinite),maxCell=Math.max(1,...cells);
 const shade=v=>`rgba(185,138,46,${v===0?0:(0.12+0.78*v/maxCell).toFixed(3)})`;
 const head=`<tr><th>Manager</th><th>Total</th>${weeks.map((w,i)=>`<th class="wk${i===0?' new':''}">${w.week<=model.regularEnd?`W${w.week}`:`R${w.week-model.regularEnd}`}</th>`).join('')}</tr>`;
 const body=rows.map(r=>`<tr><td class="nm">${hjChManager(r.short)}</td><td class="tot">${r.total}${r.missing.length?'*':''}</td>${weeks.map(w=>{const v=r.history.find(h=>h.week===w.week)?.value;return Number.isFinite(v)?`<td style="background:${shade(v)}"><button type="button" class="ch-cell" data-ch-kind="titty" data-ch-id="${esc(r.id)}" data-ch-week="${w.week}" aria-expanded="false" aria-label="${esc(r.short)} Week ${w.week}: ${v} titties">${v}</button></td>`:'<td class="is-missing">—</td>'}).join('')}</tr>`).join('');
 const heat=weeks.length?`<div class="heat-wrap ch-heat"><table class="heat"><thead>${head}</thead><tbody>${body}</tbody></table></div>`:'<p class="challenge-live-note">The heatmap fills in when Week 1 kicks off.</p>';
 const legend=`<div class="legend"><span><span class="sw" style="background:rgba(185,138,46,.15)"></span>few</span><span><span class="sw" style="background:rgba(185,138,46,.9)"></span>many</span><span>${model.liveWeek?`Week ${model.liveWeek} in progress · updates live`:model.finalWeek?`Final through Week ${model.finalWeek}`:''}</span></div>`;
 return `<div class="titty-view">${hjChLineupView({id:'titty-lineup',fitKey:'tittyFit',label:'Titty Special season totals by manager',figures,count:names.length})}${rows.some(r=>r.missing.length)?'<p class="challenge-live-note">* Partial total. Missing weeks stay pending until ESPN supplies the records.</p>':''}<h4 class="aw-sub challenge-sub">Week-by-Week Heatmap</h4>${heat}${weeks.length?legend:''}</div>`;
}
function hjChJacket(index){
 const palette=['#26546b','#426575','#1d405b','#4f6070','#345e65','#264a67','#53647a','#385d76','#41667c','#34475e'];
 return `--lms-jacket:${palette[index%palette.length]}`;
}
function hjChLmsFigure(manager,elimination,index){
 const out=!!elimination;
 return `<div class="lms-figure${out?' is-eliminated':''}" role="group" aria-label="${esc(manager.short)}: ${out?`eliminated Week ${elimination.week}, seated`:'standing'}" data-lms-manager="${esc(manager.id)}" style="${hjChJacket(index)}">${hjChFigureArt(manager,`lms-head-${index}`)}<span class="lms-name manager-profile-trigger" data-manager="${esc(manager.short)}" role="button" tabindex="0" aria-label="Open ${esc(manager.short)} profile">${esc(manager.short)}</span></div>`;
}
function hjChFigureArt(manager,key,crown=false){
 // Keep the original avatar pixels; clip off its shoulders to join the illustrated body.
 return `<svg class="lms-art" viewBox="0 0 120 240" aria-hidden="true" focusable="false">
 <defs><clipPath id="${key}"><ellipse cx="60" cy="40" rx="30" ry="37"/></clipPath></defs>
 <ellipse class="lms-shadow" cx="60" cy="223" rx="35" ry="5"/>
 <g class="lms-standing-legs"><path d="M43 136 40 214M77 136 80 214" fill="none" stroke="#142c42" stroke-width="19" stroke-linecap="round"/><path d="M28 214h21v9H25q-5-5 3-9M72 214h21q8 4 3 9H72Z" fill="#0a1c2d"/><path d="M27 222h22M73 222h22" stroke="#c7d0d4" stroke-width="2"/></g>
 <g class="lms-seated-legs"><path d="M43 194 26 211 56 218M77 194 94 211 65 218" fill="none" stroke="#142c42" stroke-width="18" stroke-linecap="round"/><path d="m43 213 18 2v8H40q-5-5 3-10M65 214l17-2q7 7 2 11H65Z" fill="#0a1c2d"/></g>
 <g class="lms-bench-legs"><path d="M47 178 37 202M73 178l10 24" fill="none" stroke="#1d3b58" stroke-width="22" stroke-linecap="round"/><path d="M37 200v31M83 200v31" fill="none" stroke="#142c42" stroke-width="17" stroke-linecap="butt"/><path d="M25 230h22v9H22q-5-5 3-9M73 230h22q8 4 3 9H73Z" fill="#0a1c2d"/><path d="M24 238h22M74 238h22" stroke="#c7d0d4" stroke-width="2"/></g>
 <g class="lms-upper"><path d="M52 62h16v18H52Z" fill="#d7b69b"/>
 <path d="M42 77 27 88 21 125M78 77l15 11 6 37" fill="none" stroke="var(--lms-jacket)" stroke-width="17" stroke-linecap="round"/>
 <path d="m21 125 2 10M99 125l-2 10" stroke="#d7b69b" stroke-width="10" stroke-linecap="round"/>
 <path d="M40 74 52 70h16l12 4 5 73H35Z" fill="var(--lms-jacket)" stroke="#132c41" stroke-width="2"/>
 <path d="m50 72 10 49 10-49Z" fill="#f5f1e5"/><path d="m57 79 6 0 3 26-6 11-6-11Z" fill="#c39b42"/>
 <path d="m48 72-7 16 10 7-6 8 15 24M72 72l7 16-10 7 6 8-15 24" fill="none" stroke="#ffffff" stroke-opacity=".2" stroke-width="2"/>
 <path d="M60 124v22M39 137h12M69 137h12" stroke="#11283c" stroke-width="2"/><circle cx="64" cy="131" r="1.5" fill="#cfb365"/>
 <path d="M70 91h9v2h-9Z" fill="#dfc778"/>
 <image href="data:image/png;base64,${AV[manager.short]||AV_DEFAULT}" x="12" y="-2" width="96" height="96" clip-path="url(#${key})"/>
 ${crown?'<g class="lms-crown"><path d="M37 15 43-9 52 5 60-17 68 5 77-9 83 15Z" fill="#e6bb3f" stroke="#8a6414" stroke-width="2" stroke-linejoin="round"/><path d="M37 15h46v8H37Z" fill="#f3d266" stroke="#8a6414" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="9" r="3" fill="#b3352c"/><circle cx="47" cy="12" r="2.2" fill="#2f6f9f"/><circle cx="73" cy="12" r="2.2" fill="#2f6f9f"/><circle cx="43" cy="-8" r="2.2" fill="#f3d266" stroke="#8a6414" stroke-width="1.2"/><circle cx="60" cy="-16" r="2.4" fill="#f3d266" stroke="#8a6414" stroke-width="1.2"/><circle cx="77" cy="-8" r="2.2" fill="#f3d266" stroke="#8a6414" stroke-width="1.2"/></g>':''}
 </g></svg>`;
}
function hjChLms(model){
 const names=HJ_CHALLENGE_STATE.names,eliminated=new Map(model.eliminations.map(e=>[e.id,e]));
 const figures=names.map((n,i)=>hjChLmsFigure(n,eliminated.get(n.id),i)).join('');
 const history=hjChLmsHistory(model,names).map(w=>`<tr class="${w.eliminated?'is-eliminated':w.pending?'is-pending':''}"><td><b>Week ${w.week}</b></td><td>${w.lowest.map(t=>hjChManager(t.short)).join(' ')||'—'}</td><td class="num"><b>${w.lowest.map(t=>t.score.toFixed(2)).join(' / ')||'—'}</b></td><td><span class="lms-result">${w.eliminated?'Eliminated':w.pending?'Pending':'No Elimination'}</span></td></tr>`).join('')||'<tr><td colspan="4" class="raffle-empty">The lowest score each week appears when ESPN finalizes Week 1.</td></tr>';
 const fit=HJ_CHALLENGE_STATE.lmsFit;
 return `<div class="lms-view${fit?' is-fit':''}" data-fit-key="lmsFit"><div class="lms-stage" style="touch-action:manipulation" tabindex="0" role="group" aria-label="Last Man Standing manager lineup"><div class="lms-lineup" id="lms-lineup">${figures}</div></div>${hjChZoomButtons(fit,'lms-lineup')}</div><h4 class="aw-sub challenge-sub">Weekly Low Score</h4>${hjChTable(['Week','Lowest','Score','Result'],history,'week-table')}`;
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
   if(HJ_CHALLENGE_STATE.profileTimer){clearTimeout(HJ_CHALLENGE_STATE.profileTimer);HJ_CHALLENGE_STATE.profileTimer=null;}
   HJ_CHALLENGE_STATE.suppressClickUntil=e.timeStamp+500;
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
 const body=!model?'<div class="empty">Loading scores and historical lineups…</div>':ch.id==='raffle'?hjChRaffle(model):ch.id==='lms'?hjChLms(model):ch.id==='titty'?hjChTitty(model):ch.id==='mvp'?hjChMvp(model):ch.id==='overachiever'?hjChOver(model):ch.id==='optimizer'?hjChOpt(model):hjChSpecial(ch,model);
 // No routine status line; a sync delay still surfaces so stale numbers are never silent.
 const delayed=!!(state.error||HJ_LEAGUE_STATE.error),showStatus=ch.id==='lms'?false:delayed;
 const html=`${showStatus?`<div class="challenge-live-status${delayed?' is-delayed':''}" role="status">${esc(status)}</div>`:''}${body}`;
 // Preserve open weekly details and expanded rows, and avoid replacing identical content.
 const opened=[...out.querySelectorAll('details[open]')].map(n=>n.querySelector('summary')?.textContent),closed=[...out.querySelectorAll('details:not([open])')].map(n=>n.querySelector('summary')?.textContent);
 const openDetail=out.querySelector('.ch-cell.is-open'),openDetailKey=openDetail?[openDetail.dataset.chKind,openDetail.dataset.chId,openDetail.dataset.chWeek]:null;
 const bars=new Map([...out.querySelectorAll('.lineup-bar')].map(b=>[b.dataset.barId,{pct:b.style.getPropertyValue('--titty-pct'),value:b.dataset.barValue}]));
 const shifts=new Map([...out.querySelectorAll('.over-figure')].map(f=>[f.dataset.overId,{shift:f.style.getPropertyValue('--over-shift'),neg:f.classList.contains('is-neg')}]));
 if(state.lastHtml===html)return;
 state.lastHtml=html;
 out.innerHTML=html;
 out.querySelectorAll('details').forEach(n=>{const label=n.querySelector('summary')?.textContent;if(opened.includes(label))n.open=true;else if(closed.includes(label))n.open=false;});
 if(openDetailKey){const cell=out.querySelector(`.ch-cell[data-ch-kind="${openDetailKey[0]}"][data-ch-id="${CSS.escape(openDetailKey[1])}"][data-ch-week="${openDetailKey[2]}"]`);if(cell)hjChOpenDetail(cell,false);}
 // Grow bars from their previous height so a live titty visibly moves the graph.
 const motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 out.querySelectorAll('.over-figure').forEach(f=>{
  const prev=shifts.get(f.dataset.overId),target=f.style.getPropertyValue('--over-shift');if(!prev||!motion||prev.neg!==f.classList.contains('is-neg')||prev.shift===target)return;
  f.classList.add('no-motion');f.style.setProperty('--over-shift',prev.shift);f.getBoundingClientRect();f.classList.remove('no-motion');f.style.setProperty('--over-shift',target);
 });
 out.querySelectorAll('.lineup-bar').forEach(b=>{
  const prev=bars.get(b.dataset.barId),target=b.style.getPropertyValue('--titty-pct');if(!prev||!motion||prev.pct===target)return;
  b.style.transition='none';b.style.setProperty('--titty-pct',prev.pct);b.getBoundingClientRect();b.style.transition='';b.style.setProperty('--titty-pct',target);
  if(prev.value!==b.dataset.barValue){const fig=b.closest('.lineup-figure');fig.classList.remove('is-scored');fig.getBoundingClientRect();fig.classList.add('is-scored');}
 });
}
function selectChallenge(id){
 const ch=CHALLENGES.find(c=>c.id===id)||CHALLENGES[0];HJ_CHALLENGE_STATE.active=ch.id;
 document.querySelectorAll('#challenge-strip button').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.challenge===ch.id));b.tabIndex=b.dataset.challenge===ch.id?0:-1});
 $('#challenge-rule').textContent=ch.rule;$('#challenge-prize-badge').textContent=ch.prize;
 const out=$('#challenge-out');out.setAttribute('role','tabpanel');out.setAttribute('aria-labelledby',`challenge-tab-${ch.id}`);hjRenderChallenge();
}
{
 hjChBindLmsGestures($('#challenge-out'));
 $('#challenge-out').addEventListener('click',e=>{
  const button=e.target.closest('[data-lms-zoom]');if(button)return hjChSetLmsZoom(button.closest('.lms-view'),button.dataset.lmsZoom==='fit');
  const chCell=e.target.closest('.ch-cell');
  if(chCell){if(chCell.classList.contains('is-open'))hjChCloseDetail();else hjChOpenDetail(chCell);return;}
  if(e.target.closest('.pc-player-trigger,.manager-profile-trigger,.manager-profile-avatar'))return;
  const art=e.target.closest('.lms-art'),figure=art&&art.closest('.lineup-figure,.lms-figure');
  if(figure){
   const name=figure.querySelector('.manager-profile-trigger'),view=figure.closest('.lms-view');if(!name)return;
   if(e.timeStamp<(HJ_CHALLENGE_STATE.suppressClickUntil||0))return;
   if(HJ_CHALLENGE_STATE.profileTimer){clearTimeout(HJ_CHALLENGE_STATE.profileTimer);HJ_CHALLENGE_STATE.profileTimer=null;return;}
   if(view&&view.clientWidth<=801)HJ_CHALLENGE_STATE.profileTimer=setTimeout(()=>{HJ_CHALLENGE_STATE.profileTimer=null;name.click();},360);else name.click();
   return;
  }
 });
 const strip=$('#challenge-strip');
 strip.innerHTML=CHALLENGES.map(ch=>`<button type="button" id="challenge-tab-${ch.id}" role="tab" aria-controls="challenge-out" data-challenge="${ch.id}" aria-selected="false">${ch.label}</button>`).join('');
 strip.addEventListener('click',e=>{const b=e.target.closest('button[data-challenge]');if(b)selectChallenge(b.dataset.challenge)});
 strip.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...strip.querySelectorAll('button')],i=tabs.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectChallenge(tabs[next].dataset.challenge);tabs[next].focus()});
 const base=hjApplyLiveSeason;
 hjApplyLiveSeason=function(data,...args){const result=base.call(this,data,...args);hjRefreshChallenges(data);return result};
 selectChallenge('raffle');if(HJ_LEAGUE_STATE.data)hjRefreshChallenges(HJ_LEAGUE_STATE.data);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&HJ_LEAGUE_STATE.data)hjRefreshChallenges(HJ_LEAGUE_STATE.data)});
}
