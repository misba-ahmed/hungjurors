/* 2026 Standings: one compact, light table that fits a phone screen, with a slim detail tray per manager and a collapsed season race. */
function standingsModeMetric(p,mode){
 if(mode==='power')return {value:Number.isFinite(p.power)?standingsFmt(p.power,1):'—',label:'Power',fill:Number.isFinite(p.power)?p.power:0};
 if(mode==='luck')return {value:Number.isFinite(p.luck)?standingsSigned(p.luck,1,' W'):'—',label:'Luck',fill:Number.isFinite(p.luck)?Math.min(100,50+Math.abs(p.luck)*22):0,tone:p.luck>0?'pos':p.luck<0?'neg':''};
 if(mode==='efficiency')return {value:Number.isFinite(p.efficiency)?`${standingsFmt(p.efficiency,1)}%`:'—',label:'Efficiency',fill:Number.isFinite(p.efficiency)?p.efficiency:0};
 if(mode==='form')return {value:Number.isFinite(p.last3Avg)?pcFpts(p.last3Avg):'—',label:'Last 3 avg',fill:Number.isFinite(p.last3Avg)?Math.min(100,p.last3Avg/2):0};
 return {value:Number.isFinite(p.playoffOdds)?`${standingsFmt(p.playoffOdds,0)}%`:Number.isFinite(p.pfRank)?`#${p.pfRank}`:'—',label:Number.isFinite(p.playoffOdds)?'Playoff odds':'PF rank',fill:0};
}
function standingsSort(people,mode){
 const s=[...people];
 if(mode==='power')return s.sort((a,b)=>(b.power??-Infinity)-(a.power??-Infinity)||b.pf-a.pf);
 if(mode==='luck')return s.sort((a,b)=>(b.luck??-Infinity)-(a.luck??-Infinity)||b.w-a.w);
 if(mode==='efficiency')return s.sort((a,b)=>(b.efficiency??-Infinity)-(a.efficiency??-Infinity)||b.pf-a.pf);
 if(mode==='form')return s.sort((a,b)=>(b.last3Avg??-Infinity)-(a.last3Avg??-Infinity)||b.pf-a.pf);
 return s.sort((a,b)=>b.w-a.w||b.pf-a.pf);
}
function standingsMovementHTML(p,mode){
 if(mode!=='standings'||!Number.isFinite(p.rankMove)||p.rankMove===0)return '';
 return `<span class="st-move ${p.rankMove>0?'up':'down'}" title="${p.rankMove>0?'Up':'Down'} ${Math.abs(p.rankMove)} since last week">${p.rankMove>0?'▲':'▼'}${Math.abs(p.rankMove)}</span>`;
}
function standingsFormDots(p){
 const last=p.entries.slice(-3);
 if(!last.length)return '<span class="st-dots is-empty">—</span>';
 return `<span class="st-dots" aria-label="Last ${last.length}: ${last.map(e=>hjNumber(e.oppPts)===null?'?':e.pts>Number(e.oppPts)?'W':e.pts<Number(e.oppPts)?'L':'T').join(' ')}">${last.map(e=>{const r=hjNumber(e.oppPts)===null?'':e.pts>Number(e.oppPts)?'win':e.pts<Number(e.oppPts)?'loss':'tie';return `<i class="${r}" title="Week ${e.week}: ${e.pts.toFixed(2)}${hjNumber(e.oppPts)!==null?` vs ${Number(e.oppPts).toFixed(2)}`:''}"></i>`}).join('')}</span>`;
}
function standingsTile(k,v,s='',tone=''){return `<div class="st-tile${tone?` is-${tone}`:''}"><span>${k}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`}
function standingsAnalyticsHTML(p){
 const expected=Number.isFinite(p.expectedWins)?`${standingsFmt(p.expectedWins,1)}–${standingsFmt(Math.max(0,p.entries.length-p.expectedWins),1)}`:'—';
 const allPlay=p.allW+p.allL+p.allT?`${p.allW}–${p.allL}${p.allT?`–${p.allT}`:''}`:'—';
 const projection=Number.isFinite(p.projDiff)?standingsSigned(p.projDiff,2):'—';
 const tiles=[
  standingsTile('Expected record',expected,Number.isFinite(p.luck)?`${standingsSigned(p.luck,1)} W luck`:'',p.luck>0?'pos':p.luck<0?'neg':''),
  standingsTile('All-play',allPlay,Number.isFinite(p.allPlayPct)?`${standingsFmt(p.allPlayPct,1)}%`:''),
  standingsTile('Points against',Number.isFinite(p.pa)?pcFpts(p.pa):'—',Number.isFinite(p.oppAvg)?`${pcFpts(p.oppAvg)} per game`:''),
  standingsTile('Lineup efficiency',Number.isFinite(p.efficiency)?`${standingsFmt(p.efficiency,1)}%`:'—',Number.isFinite(p.benchGap)?`${pcFpts(p.benchGap)} left on bench`:''),
  standingsTile('vs ESPN projection',projection,p.projWeeks?`beat it ${p.projBeat} of ${p.projWeeks}`:'',p.projDiff>0?'pos':p.projDiff<0?'neg':''),
  standingsTile('Close games',p.entries.length?`${p.closeW}–${p.closeL}`:'—','decided by 10 or less'),
  standingsTile('Strength of schedule',Number.isFinite(p.sosRank)?`#${p.sosRank}`:'—',Number.isFinite(p.remainingSOSRank)?`#${p.remainingSOSRank} remaining`:''),
  standingsTile('Volatility',Number.isFinite(p.volatility)?pcFpts(p.volatility):'—','week-to-week swing'),
  standingsTile('Next 3',p.next3?.length?esc(p.next3.join(' · ')):'—',Number.isFinite(p.repeatDrawRank)?`repeat draw #${p.repeatDrawRank}`:'')
 ].join('');
 const scores=p.entries.map(e=>e.pts),min=scores.length?Math.min(...scores):0,max=scores.length?Math.max(...scores):1;
 const bars=p.entries.map(e=>{const h=22+((e.pts-min)/Math.max(1,max-min))*78,r=hjNumber(e.oppPts)===null?'':e.pts>Number(e.oppPts)?'win':e.pts<Number(e.oppPts)?'loss':'';return `<i class="${r}" style="height:${h.toFixed(1)}%" title="Week ${e.week}: ${e.pts.toFixed(2)}${hjNumber(e.oppPts)!==null?` · opp ${Number(e.oppPts).toFixed(2)}`:''}"><small>${e.week}</small></i>`}).join('');
 return `<div class="st-tray"><div class="st-tiles">${tiles}</div>${bars?`<div class="st-weeks" aria-label="Weekly scores">${bars}</div>`:''}</div>`;
}
function standingsEntryHTML(p,i,mode,officialSeed){
 const metric=standingsModeMetric(p,mode),next=scheduleOpponent(p.short,scheduleCurrentWeek());
 return `<div class="standings-entry${mode==='standings'&&officialSeed===STANDINGS_PLAYOFF_TEAMS?' playoff-cut':''}" data-standing-entry="${esc(p.short)}">
  <div class="standings-lane st-row" role="button" tabindex="0" data-standing-manager="${esc(p.short)}" aria-expanded="false">
   <span class="st-rank">${i+1}${standingsMovementHTML(p,mode)}</span>
   <span class="st-who manager-profile-trigger" data-manager="${esc(p.short)}" role="button" tabindex="0" aria-label="Open ${esc(p.short)} profile">${av(p.short)}<span><b>${esc(p.short)}</b>${next&&next!=='—'?`<small>Next ${esc(next)}</small>`:''}</span></span>
   <span class="st-rec"><b>${p.w}–${p.l}${p.t?`–${p.t}`:''}</b></span>
   <span class="st-num">${Number.isFinite(p.pf)?pcFpts(p.pf):'—'}</span>
   <span class="st-num st-pa">${Number.isFinite(p.pa)?pcFpts(p.pa):'—'}</span>
   <span class="st-form">${standingsFormDots(p)}</span>
   <span class="st-metric${metric.tone?` is-${metric.tone}`:''}"><b>${esc(metric.value)}</b></span>
   <span class="st-caret" aria-hidden="true">⌄</span>
  </div>
  <div class="st-tray-wrap"><div class="st-tray-clip">${standingsAnalyticsHTML(p)}</div></div>
 </div>`;
}
function standingsHistoryHTML(data){
 const weeks=data.weeks.map(w=>w.week);
 if(!weeks.length)return '';
 const focus=standingsFocusedManager||data.official[0]?.short||data.people[0]?.short;standingsFocusedManager=focus;
 const width=900,height=220,left=40,right=24,top=14,bottom=26;
 const x=w=>weeks.length===1?(left+(width-left-right)/2):left+(weeks.indexOf(w)/(weeks.length-1))*(width-left-right);
 const y=r=>top+((r-1)/Math.max(1,data.people.length-1))*(height-top-bottom);
 const grids=Array.from({length:data.people.length},(_,i)=>i+1).map(r=>`<line class="st-race-grid" x1="${left}" x2="${width-right}" y1="${y(r)}" y2="${y(r)}"></line>`).join('');
 const cut=`<line class="st-race-cut" x1="${left}" x2="${width-right}" y1="${(y(STANDINGS_PLAYOFF_TEAMS)+y(STANDINGS_PLAYOFF_TEAMS+1))/2}" y2="${(y(STANDINGS_PLAYOFF_TEAMS)+y(STANDINGS_PLAYOFF_TEAMS+1))/2}"></line>`;
 const axes=[1,STANDINGS_PLAYOFF_TEAMS,data.people.length].filter((v,i,a)=>v>=1&&v<=data.people.length&&a.indexOf(v)===i).map(r=>`<text class="st-race-axis" x="6" y="${y(r)+3}">#${r}</text>`).join('');
 const weekLabels=weeks.map(w=>`<text class="st-race-axis" x="${x(w)}" y="${height-6}" text-anchor="middle">W${w}</text>`).join('');
 const lines=data.people.map(p=>{const h=data.history[p.short]||[],pts=h.map(r=>`${x(r.week)},${y(r.rank)}`).join(' ');if(!pts)return '';const last=h.at(-1);return `<polyline class="st-race-line${p.short===focus?' active':''}" data-history-manager="${esc(p.short)}" points="${pts}"></polyline>${p.short===focus&&last?`<circle class="st-race-dot" cx="${x(last.week)}" cy="${y(last.rank)}" r="5"></circle>`:''}`}).join('');
 return `<details class="st-race"><summary>Season race <span>${esc(focus)} highlighted · click a manager row to switch</span></summary><svg class="st-race-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Week-by-week standings rank history">${grids}${cut}${axes}${weekLabels}${lines}</svg></details>`;
}
function standingsPreseasonHTML(){
 return `<div class="st-pre">${DATA.managers.map(m=>`<div class="st-pre-person manager-profile-trigger" data-manager="${esc(m.short)}" tabindex="0" role="button">${av(m.short)}<b>${esc(m.short)}</b><span>W1 · ${esc(scheduleOpponent(m.short,1))}</span></div>`).join('')}</div>`;
}
function renderStandingsDashboard(animate=false){
 const out=$('#standings-out');if(!out)return;
 const data=buildStandingsAnalytics(),hasSeasonData=DATA.standings.length>0||data.weeks.length>0;
 const modeButtons=Object.entries(STANDINGS_MODES).map(([id,m])=>`<button type="button" class="st-mode${id===standingsMode?' active':''}" data-standing-mode="${id}" title="${esc(m.note)}">${m.label}</button>`).join('');
 const metricHead=standingsMode==='standings'?(data.people.some(p=>Number.isFinite(p.playoffOdds))?'Odds':'PF rk'):STANDINGS_MODES[standingsMode].label;
 if(!hasSeasonData){out.innerHTML=`<div class="st"><div class="st-modes">${modeButtons}</div><p class="st-note">Standings fill in after Week 1. Here is the starting grid.</p>${standingsPreseasonHTML()}</div>`;return;}
 const ordered=standingsSort(data.people,standingsMode),officialSeed=Object.fromEntries(data.official.map((p,i)=>[p.short,i+1]));
 const opened=[...out.querySelectorAll('.standings-entry.is-open')].map(n=>n.dataset.standingEntry),raceOpen=out.querySelector('.st-race')?.open;
 const oldRects=animate?Object.fromEntries([...out.querySelectorAll('[data-standing-entry]')].map(el=>[el.dataset.standingEntry,el.getBoundingClientRect()])):{};
 out.innerHTML=`<div class="st">
  <div class="st-top"><div class="st-modes" role="tablist" aria-label="Standings view">${modeButtons}</div><p class="st-note">${esc(STANDINGS_MODES[standingsMode].note)}</p></div>
  <div class="st-table"><div class="st-head st-row" aria-hidden="true"><span class="st-rank">#</span><span class="st-who">Manager</span><span class="st-rec">W–L</span><span class="st-num">PF</span><span class="st-num st-pa">PA</span><span class="st-form">Last 3</span><span class="st-metric">${esc(metricHead)}</span><span class="st-caret"></span></div>${ordered.map((p,i)=>standingsEntryHTML(p,i,standingsMode,officialSeed[p.short])).join('')}</div>
  ${standingsHistoryHTML(data)}
 </div>`;
 for(const name of opened){const el=out.querySelector(`.standings-entry[data-standing-entry="${CSS.escape(name)}"]`);if(el){el.classList.add('is-open');el.querySelector('.standings-lane')?.setAttribute('aria-expanded','true');}}
 if(raceOpen!==undefined){const race=out.querySelector('.st-race');if(race)race.open=raceOpen;}
 if(animate&&Object.keys(oldRects).length&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  [...out.querySelectorAll('[data-standing-entry]')].forEach((el,i)=>{const old=oldRects[el.dataset.standingEntry];if(!old)return;const dy=old.top-el.getBoundingClientRect().top;el.animate([{transform:`translateY(${dy}px)`,opacity:.72},{transform:'translateY(0)',opacity:1}],{duration:380+i*12,easing:'cubic-bezier(.2,.72,.25,1)'})});
 }
}
renderStandingsDashboard();
$('#standings-out')?.addEventListener('click',e=>{
 const mode=e.target.closest('[data-standing-mode]');
 if(mode){standingsMode=mode.dataset.standingMode;renderStandingsDashboard(true);return;}
 if(e.target.closest('.manager-profile-trigger,.manager-profile-avatar,.st-race'))return;
 const lane=e.target.closest('[data-standing-manager]');if(!lane)return;
 const entry=lane.closest('.standings-entry'),wasOpen=entry.classList.contains('is-open');
 $('#standings-out').querySelectorAll('.standings-entry.is-open').forEach(x=>{x.classList.remove('is-open');x.querySelector('.standings-lane')?.setAttribute('aria-expanded','false')});
 if(!wasOpen){
  entry.classList.add('is-open');lane.setAttribute('aria-expanded','true');standingsFocusedManager=lane.dataset.standingManager;
  const race=$('#standings-out .st-race');if(race){const open=race.open,fresh=standingsHistoryHTML(buildStandingsAnalytics());race.outerHTML=fresh;const next=$('#standings-out .st-race');if(next)next.open=open;}
 }
});
$('#standings-out')?.addEventListener('keydown',e=>{const lane=e.target.closest('[data-standing-manager]');if(lane&&!e.target.closest('.manager-profile-trigger')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();lane.click();}});

