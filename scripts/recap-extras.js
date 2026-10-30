/* Weekly Recap extras (October 27, 2026).
 * Thirteen extra cards, all computed from data the recap already loads:
 * Report card, Playoff picture, Series update, Matchup flow,
 * When you scored, Garbage time, Casualty report, Where the points came from,
 * TD luck, Good call / bad call, Boom and bust, ESPN vs Vegas and the
 * side-challenge ticker. Lives in its own file so index.html stays untouched.
 * The recap model is reused (hjRcModel is wrapped, never recomputed). */
const HJ_RCX={model:null,vegas:new Map(),vegasPending:new Map()};
(function(){
 if(typeof hjRecapHTML!=='function'||typeof hjRcModel!=='function')return;
 const baseModel=hjRcModel,baseHTML=hjRecapHTML;
 hjRcModel=function(){const m=baseModel.apply(this,arguments);HJ_RCX.model=m;return m};

 /* ---------- shared bits ---------- */
 const POS=['QB','RB','WR','TE','K','D/ST'];
 const fmt=v=>Number.isFinite(v)?v.toFixed(2):'—',fmt1=v=>Number.isFinite(v)?v.toFixed(1):'—';
 const mgr=name=>`<span class="rcx-mgr manager-profile-trigger" data-manager="${esc(name)}" role="button" tabindex="0" aria-label="Open ${esc(name)} profile">${av(name,'rcx-av')}<b>${esc(name)}</b></span>`;
 const face=(name,cls='rcx-av')=>`<span class="manager-profile-trigger" data-manager="${esc(name)}" role="button" tabindex="0" aria-label="Open ${esc(name)} profile">${av(name,cls)}</span>`;
 const section=(id,title,sub,body)=>body?`<section class="rc-block rcx" data-rcx="${id}"><h3 class="rc-h">${esc(title)}${sub?` <small>${esc(sub)}</small>`:''}</h3>${body}</section>`:'';
 const head=p=>{if(!p)return '';const {attrs,photo}=hjRcHeadshot(p);return `<button type="button" class="rcx-photo pc-player-trigger${p.pos==='D/ST'?' is-logo':''}" ${attrs} aria-label="Open ${esc(p.name)} player card">${photo?`<img src="${esc(photo)}" alt="" loading="lazy" onerror="this.remove()">`:''}</button>`};
 const pname=p=>{const {attrs}=hjRcHeadshot(p);return `<button type="button" class="rcx-pname pc-player-trigger" ${attrs}>${esc(typeof hjChShortName==='function'?hjChShortName({name:p.name,position:p.pos}):p.name)}</button>`};
 const ord=n=>n+(n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'));
 const weeksThrough=(model,w)=>model.weeks.filter(x=>x.week<=w);
 const allStarters=model=>model.managers.flatMap(m=>m.starters.map(p=>({...p,owner:m.short})));
 const norm=s=>String(s||'').toLowerCase().replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g,'').replace(/[^a-z]/g,'');
 // Deterministic random numbers so the playoff odds do not jitter between redraws.
 const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 const gauss=r=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};

 /* ---------- 1. Weekly report card ---------- */
 function grade(s){return s>=.9?'A+':s>=.82?'A':s>=.75?'A−':s>=.68?'B+':s>=.6?'B':s>=.53?'B−':s>=.46?'C+':s>=.4?'C':s>=.33?'C−':s>=.25?'D':'F'}
 function reportCard(model){
  const n=model.ordered.length;if(n<4)return '';
  const rows=model.managers.map(m=>{
   const rank=model.ordered.indexOf(m)+1,rankS=1-(rank-1)/Math.max(1,n-1);
   const effS=m.eff===null?rankS:Math.max(0,Math.min(1,(m.eff-70)/30));
   const projS=Number.isFinite(m.proj)?Math.max(0,Math.min(1,(m.pts-m.proj+30)/60)):.5;
   const resS=m.result==='W'?1:m.result==='T'?.5:0;
   const score=.45*rankS+.25*effS+.15*projS+.15*resS;
   return {m,rank,score,letter:grade(score)};
  }).sort((a,b)=>b.score-a.score);
  const cls=l=>l[0]==='A'?'is-a':l[0]==='B'?'is-b':l[0]==='C'?'is-c':'is-d';
  return section('grades','Weekly report card','score rank, lineup efficiency, result and projection, graded',`<div class="rcx-grades">${rows.map(r=>`<article class="rcx-grade ${cls(r.letter)}">${face(r.m.short,'rcx-av-mid')}<div class="rcx-grade-copy"><b class="manager-profile-trigger" data-manager="${esc(r.m.short)}" role="button" tabindex="0">${esc(r.m.short)}</b><small>${ord(r.rank)} · ${r.m.eff!==null?r.m.eff.toFixed(0)+'% lineup':'lineup —'} · ${r.m.result}${Number.isFinite(r.m.proj)?` · ${hjRcSigned(r.m.pts-r.m.proj,1)} vs proj`:''}</small></div><strong>${r.letter}</strong></article>`).join('')}</div>`);
 }

 /* ---------- 2. Playoff picture (Monte Carlo) ---------- */
 function simulate(model,through,sims=4000){
  const data=model.data,ss=data?.settings?.scheduleSettings||{},slots=Number(ss.playoffTeamCount)||4,regular=Number(ss.matchupPeriodCount)||14;
  if(through>=regular)return null;
  const played=weeksThrough(model,through);if(!played.length)return null;
  const teams=new Map();
  for(const w of played)for(const r of w.scores){const t=teams.get(r.short)||{short:r.short,teamId:String(r.teamId),w:0,l:0,t:0,pf:0,scores:[]};
   if(r.pts>r.oppPts+.005)t.w++;else if(r.oppPts>r.pts+.005)t.l++;else t.t++;t.pf+=r.pts;t.scores.push(r.pts);teams.set(r.short,t)}
  const byId=new Map([...teams.values()].map(t=>[t.teamId,t]));
  const all=[...teams.values()].flatMap(t=>t.scores),mean=all.reduce((a,b)=>a+b,0)/all.length,sd=Math.sqrt(all.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,all.length-1))||20;
  // Each team's rating leans toward the league mean until a few weeks are in.
  for(const t of teams.values()){const k=2;t.mu=(t.scores.reduce((a,b)=>a+b,0)+k*mean)/(t.scores.length+k);t.sd=sd}
  const games=(data.schedule||[]).filter(g=>Number(g.matchupPeriodId)>through&&Number(g.matchupPeriodId)<=regular&&g.home?.teamId!=null&&g.away?.teamId!=null).map(g=>[byId.get(String(g.home.teamId)),byId.get(String(g.away.teamId))]).filter(([a,b])=>a&&b);
  const list=[...teams.values()],odds=new Map(list.map(t=>[t.short,{made:0,top:0}])),r=rng(through*7919+list.length);
  for(let s=0;s<sims;s++){
   const w=new Map(list.map(t=>[t.short,t.w+.5*t.t])),pf=new Map(list.map(t=>[t.short,t.pf]));
   for(const [a,b] of games){const sa=a.mu+a.sd*gauss(r),sb=b.mu+b.sd*gauss(r);pf.set(a.short,pf.get(a.short)+sa);pf.set(b.short,pf.get(b.short)+sb);if(sa>sb)w.set(a.short,w.get(a.short)+1);else w.set(b.short,w.get(b.short)+1)}
   const order=[...list].sort((x,y)=>w.get(y.short)-w.get(x.short)||pf.get(y.short)-pf.get(x.short));
   order.slice(0,slots).forEach(t=>odds.get(t.short).made++);odds.get(order[0].short).top++;
  }
  return {slots,regular,teams:list.map(t=>({...t,odds:odds.get(t.short).made/sims,top:odds.get(t.short).top/sims})),left:regular-through};
 }
 function playoffPicture(model){
  const key=model.week+':'+model.weeks.map(w=>w.scores.map(r=>r.pts).join(',')).join('|');
  if(HJ_RCX.odds?.key!==key)HJ_RCX.odds={key,now:simulate(model,model.week),before:model.week>1?simulate(model,model.week-1):null};
  const now=HJ_RCX.odds.now;if(!now)return '';
  const before=HJ_RCX.odds.before,prev=new Map((before?.teams||[]).map(t=>[t.short,t.odds]));
  const rows=[...now.teams].sort((a,b)=>b.odds-a.odds||b.w-a.w||b.pf-a.pf).map(t=>{const p=prev.get(t.short),d=p===undefined?null:t.odds-p;
   const pct=v=>v>=.995?'>99%':v<=.005&&v>0?'<1%':`${Math.round(100*v)}%`;
   return `<div class="rcx-odds-row${t.odds>=.5?' is-in':''}">${face(t.short)}<b class="manager-profile-trigger" data-manager="${esc(t.short)}" role="button" tabindex="0">${esc(t.short)}</b><small>${t.w}–${t.l}${t.t?`–${t.t}`:''}</small><div class="rcx-odds-bar"><i style="width:${(100*t.odds).toFixed(1)}%"></i><span>${pct(t.odds)}</span></div><em class="${d===null||Math.abs(d)<.005?'':d>0?'is-up':'is-down'}">${d===null||Math.abs(d)<.005?'—':`${d>0?'▲':'▼'}${Math.round(Math.abs(100*d))}`}</em><small class="rcx-odds-top">${t.top>=.005?`#1 seed ${pct(t.top)}`:''}</small></div>`}).join('');
  return section('playoffs','Playoff picture',`odds after Week ${model.week} from 4,000 simulated seasons · top ${now.slots} make it · ${now.left} week${now.left===1?'':'s'} left`,`<div class="rcx-odds">${rows}</div><p class="rcx-note">Each team's remaining games are simulated from its season scoring (pulled toward the league average early on). Ties go to points for, like ESPN. ▲▼ is the change from last week.</p>`);
 }

 /* ---------- 4. Series update ---------- */
 function seriesUpdate(model){
  if(typeof scheduleAllTimeSeries!=='function'||!model.games.length)return '';
  const histDone=Number(typeof HIST!=='undefined'&&HIST?.metadata?.completed_through)||0,season=Number(model.data?.seasonId||NFL_SEASON);
  const cards=model.games.map(g=>{
   const a=g.winner.short,b=g.loser.short,s=scheduleAllTimeSeries(a,b);let aw=s.aWins,bw=s.bWins,ties=s.ties,apf=s.aPF,bpf=s.bPF,sa=0,sb=0;
   if(histDone<season)for(const w of weeksThrough(model,model.week)){const r=w.scores.find(x=>x.short===a&&x.opp===b);if(!r)continue;if(r.pts>r.oppPts+.005){aw++;sa++}else if(r.oppPts>r.pts+.005){bw++;sb++}else ties++;apf+=r.pts;bpf+=r.oppPts}
   const games=aw+bw+ties,lead=aw===bw?'Series tied':aw>bw?`${a} leads`:`${b} leads`;
   return `<article class="rcx-series">${face(a,'rcx-av-mid')}<div class="rcx-series-copy"><b>${esc(lead)} ${Math.max(aw,bw)}–${Math.min(aw,bw)}${ties?`–${ties}`:''}</b><small>${esc(a)} won this one by ${fmt(g.margin)} · ${games} meeting${games===1?'':'s'} all-time · ${esc(a)} ${hjRcSigned(apf-bpf,1)} total points${histDone<season?` · ${season}: ${esc(a)} ${sa}–${sb}`:''}</small></div>${face(b,'rcx-av-mid')}</article>`;
  }).join('');
  return section('series','Series update','the all-time regular-season head-to-head, including this week',`<div class="rcx-series-list">${cards}</div>`);
 }

 /* ---------- 5. Matchup flow ---------- */
 function flowChart(sw){
  const s=sw.series;if(!s||s.length<2)return '';
  const W=320,H=96,l=4,r=4,top=8,bottom=14,t0=s[0].t,t1=s.at(-1).t,max=Math.max(1,...s.map(o=>Math.max(o.winnerScore,o.loserScore)));
  const x=t=>l+(t-t0)/Math.max(1,t1-t0)*(W-l-r),y=v=>top+(1-v/max)*(H-top-bottom);
  const line=k=>s.map(o=>`${x(o.t).toFixed(1)},${y(o[k]).toFixed(1)}`).join(' ');
  // Day ticks (Thu, Sun, Mon) at the first play of each day.
  const ticks=[];let last='';for(const o of s){const d=hjRcTime(o.t,{weekday:'short'});if(d!==last){ticks.push([o.t,d]);last=d}}
  return `<svg class="rcx-flow" viewBox="0 0 ${W} ${H}" role="img" aria-label="Running score, ${esc(sw.game.winner.short)} against ${esc(sw.game.loser.short)}">${ticks.map(([t,d])=>`<line class="rcx-flow-tick" x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="${top}" y2="${H-bottom}"></line><text x="${(x(t)>W-40?x(t)-2:x(t)+2).toFixed(1)}" y="${H-3}"${x(t)>W-40?' text-anchor="end"':''}>${esc(d)}</text>`).join('')}<polyline class="rcx-flow-l" points="${line('loserScore')}"></polyline><polyline class="rcx-flow-w" points="${line('winnerScore')}"></polyline></svg>`;
 }
 function matchupFlow(model){
  if(!model.swings?.length)return '';
  const cards=model.swings.map(sw=>{const s=sw.series;if(!s?.length)return '';let changes=0,prev=0,blown=0;
   for(const o of s){const d=o.winnerScore-o.loserScore,sign=Math.abs(d)<1?0:Math.sign(d);if(sign&&prev&&sign!==prev)changes++;if(sign)prev=sign;blown=Math.max(blown,o.loserScore-o.winnerScore)}
   const g=sw.game;
   return `<article class="rcx-flow-card"><div class="rcx-flow-head"><span class="rcx-flow-key is-w">${face(g.winner.short)}<b>${esc(g.winner.short)}</b> ${fmt(g.winner.pts)}</span><span class="rcx-flow-key is-l">${fmt(g.loser.pts)} <b>${esc(g.loser.short)}</b>${face(g.loser.short)}</span></div>${flowChart(sw)}<small>${changes?`${changes} lead change${changes===1?'':'s'}`:'Never trailed'}${blown>=1?` · ${esc(g.loser.short)} led by as much as ${fmt1(blown)}`:''}</small></article>`}).join('');
  return cards?section('flow','Matchup flow','each team’s running score, Thursday to Monday night',`<div class="rcx-flows">${cards}</div>`):'';
 }

 /* ---------- 6. When you scored ---------- */
 const SLOTS=[['thu','Thursday'],['early','Sun early'],['late','Sun late'],['night','Sun night'],['mon','Monday'],['other','Other']];
 function slotOf(t){const day=hjRcTime(t,{weekday:'long'}),h=Number(hjRcTime(t,{hour:'numeric',hourCycle:'h23'}));
  return day==='Thursday'?'thu':day==='Sunday'?(h<14?'early':h<18?'late':'night'):day==='Monday'?'mon':'other'}
 function whenScored(model){
  const events=model.extra?.schedule?.events||[];if(!events.length)return '';
  const start=new Map(events.map(e=>[String(e.id),Date.parse(e.date)]));
  const rows=model.ordered.map(m=>{const by=Object.fromEntries(SLOTS.map(([k])=>[k,0]));for(const p of m.starters){const t=start.get(p.gameId);if(Number.isFinite(t))by[slotOf(t)]+=Math.max(0,p.points)}return {m,by,total:Object.values(by).reduce((a,b)=>a+b,0)}});
  const max=Math.max(1,...rows.map(r=>r.total)),used=SLOTS.filter(([k])=>rows.some(r=>r.by[k]>0));
  return section('slots','When you scored','starters’ points by kickoff window',`<div class="rcx-legend">${used.map(([k,l])=>`<span><i class="rcx-slot-${k}"></i>${esc(l)}</span>`).join('')}</div><div class="rcx-stack-list">${rows.map(r=>`<div class="rcx-stack-row">${face(r.m.short)}<b>${esc(r.m.short)}</b><div class="rcx-stack" style="width:${(100*r.total/max).toFixed(1)}%">${used.map(([k,l])=>r.by[k]>0?`<i class="rcx-slot-${k}" style="flex:${r.by[k].toFixed(2)}" title="${esc(l)}: ${fmt(r.by[k])}"></i>`:'').join('')}</div><em>${fmt1(r.total)}</em></div>`).join('')}</div>`);
 }

 /* ---------- 7. Garbage time ---------- */
 function garbageTime(model){
  const games=model.extra?.games;if(!games?.size)return '';
  const memo=model.week+':'+games.size+':'+model.managers.map(m=>m.pts).join(',');if(HJ_RCX.garbage?.key===memo)return HJ_RCX.garbage.html;
  const html=garbageRows(model,games);HJ_RCX.garbage={key:memo,html};return html;
 }
 function garbageRows(model,games){
  const rows=[];
  for(const m of model.managers){let total=0;const players=[];
   for(const p of m.starters){const game=games.get(p.gameId);if(!game||!['QB','RB','WR','TE','K'].includes(p.pos))continue;
    const plays=hjRcGamePlays(game),track=hjRcTrack(p,game,plays);if(!track||track.even)continue;
    let pts=0,prevH=0,prevA=0;
    plays.forEach((play,i)=>{const q=Number(play.period?.number);if(q>=4&&Math.abs(prevH-prevA)>=17)pts+=track[i]||0;prevH=Number(play.homeScore)||prevH;prevA=Number(play.awayScore)||prevA});
    if(pts>=.5){total+=pts;players.push({p,pts})}}
   if(total>=1)rows.push({m,total,top:players.sort((a,b)=>b.pts-a.pts)[0]})}
  if(!rows.length)return section('garbage','Garbage time','fourth-quarter points scored with the NFL game already decided by 17+','<p class="rcx-note">Nobody cashed in on a decided game this week.</p>');
  rows.sort((a,b)=>b.total-a.total);const max=rows[0].total;
  return section('garbage','Garbage time','fourth-quarter points scored with the NFL game already decided by 17+',`<div class="rcx-bars">${rows.slice(0,6).map(r=>`<div class="rcx-bar-row">${face(r.m.short)}<b>${esc(r.m.short)}</b><div class="rcx-hbar"><i style="width:${(100*r.total/max).toFixed(1)}%"></i><span>${fmt1(r.total)}</span></div><span class="rcx-bar-who">${head(r.top.p)}<small>${pname(r.top.p)} ${fmt1(r.top.pts)}</small></span></div>`).join('')}</div>`);
 }

 /* ---------- 8. Casualty report ---------- */
 function casualty(model){
  // Built from that week's play-by-play ("X was injured during the play"), so the card never changes
  // after the games are final. The live ESPN status badge is added next to the name by the site-wide decorator.
  const games=model.extra?.games;if(!games?.size||typeof hjRcAthleteAlias!=='function')return '';
  const rx=t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),plays=new Map(),hurt=[];
  for(const p of allStarters(model)){
   if(p.pos==='D/ST'||!p.gameId)continue;const game=games.get(p.gameId);if(!game)continue;
   const meta=hjRcAthleteAlias(p,game);if(!meta)continue;
   if(!plays.has(p.gameId))plays.set(p.gameId,hjRcGamePlays(game));
   const i=meta.alias.indexOf('.'),name=`(?:^|[\\s(;-])${rx(meta.alias.slice(0,i))}[a-z]?\\.${rx(meta.alias.slice(i+1))}\\b`;
   const hurtRe=new RegExp(name+' was injured during the play'),backRe=new RegExp(name);
   let hit=null,back=false;
   for(const play of plays.get(p.gameId)){const t=String(play.text||'');if(hurtRe.test(t)){hit=play;back=false}else if(hit&&!back&&backRe.test(t))back=true}
   if(hit)hurt.push({...p,back,quarter:Number(hit.period?.number)||0,cost:Number.isFinite(p.projection)?p.projection-p.points:0});
  }
  if(!hurt.length)return '';
  hurt.sort((a,b)=>(a.back-b.back)||b.cost-a.cost);
  const per=new Map();for(const h of hurt)if(!h.back&&h.cost>0)per.set(h.owner,(per.get(h.owner)||0)+h.cost);
  const worst=[...per].sort((a,b)=>b[1]-a[1])[0];
  const when=h=>`hurt ${h.quarter>4?'in OT':h.quarter?`in Q${h.quarter}`:'in-game'}${h.back?', returned':', didn’t return'}`;
  return section('casualty','Casualty report','starters who got hurt during their game',`<div class="rcx-list">${hurt.slice(0,6).map(h=>`<div class="rcx-item${h.back?' is-back':''}">${head(h)}<div class="rcx-item-copy">${pname(h)}<small>${esc(hjRcTeam(h.proTeamId))} ${esc(h.pos)} · started by ${esc(h.owner)} · ${when(h)} · ${fmt1(h.points)}${Number.isFinite(h.projection)?` of ${fmt1(h.projection)} projected`:' pts'}</small></div>${h.cost>0?`<strong class="is-neg">−${fmt1(h.cost)}</strong>`:`<strong>${fmt1(h.points)}</strong>`}</div>`).join('')}</div>${worst?`<p class="rcx-note">Hardest hit: ${mgr(worst[0])} lost ${fmt1(worst[1])} projected points to starters who didn’t return.</p>`:''}`);
 }

 /* ---------- 9. Where the points came from ---------- */
 function pointSources(model){
  const ms=model.ordered.filter(m=>m.lineupComplete);if(ms.length<4)return '';
  const units=new Map(ms.map(m=>[m.short,hjRcUnits(m)])),avg=Object.fromEntries(POS.map(p=>[p,ms.reduce((n,m)=>n+units.get(m.short)[p],0)/ms.length]));
  const cell=(v,p)=>{const d=v-avg[p],k=Math.max(-1,Math.min(1,d/12));return `<td class="${d>=0?'is-pos':'is-neg'}" style="--k:${Math.abs(k).toFixed(2)}" title="${esc(p)}: ${fmt(v)} (${hjRcSigned(d,1)} vs league average)">${fmt1(v)}</td>`};
  return section('sources','Where the points came from','starters’ points by position; colour shows above or below the league average',`<div class="rcx-table-wrap"><table class="rcx-table"><thead><tr><th></th>${POS.map(p=>`<th>${p==='D/ST'?'DST':p}</th>`).join('')}<th>Total</th></tr></thead><tbody>${ms.map(m=>`<tr><th>${face(m.short)}<b>${esc(m.short)}</b></th>${POS.map(p=>cell(units.get(m.short)[p],p)).join('')}<td class="rcx-total">${fmt1(m.pts)}</td></tr>`).join('')}<tr class="rcx-avg"><th>League avg</th>${POS.map(p=>`<td>${fmt1(avg[p])}</td>`).join('')}<td>${fmt1(model.avg)}</td></tr></tbody></table></div><p class="rcx-note">FLEX starters count toward their own position.</p>`);
 }

 /* ---------- 10. TD luck ---------- */
 const TD_STATS=new Set(['4','25','43','93','94','95','96','101','102','103','104','105']);
 function tdLuck(model){
  const rows=model.managers.filter(m=>m.lineupComplete&&m.pts>0).map(m=>{let td=0;for(const p of m.starters){const a=p.stat?.appliedStats||{};for(const [k,v] of Object.entries(a))if(TD_STATS.has(String(k)))td+=Number(v)||0}return {m,td,share:td/m.pts}}).sort((a,b)=>b.share-a.share);
  if(rows.length<4)return '';
  return section('tds','TD luck','share of each team’s points that came from touchdowns',`<div class="rcx-bars">${rows.map(r=>`<div class="rcx-bar-row">${face(r.m.short)}<b>${esc(r.m.short)}</b><div class="rcx-hbar is-split"><i style="width:${(100*Math.min(1,r.share)).toFixed(1)}%"></i><span>${Math.round(100*r.share)}% · ${fmt1(r.td)} TD pts</span></div></div>`).join('')}</div><p class="rcx-note">Touchdowns swing week to week; a team living on them is the likeliest to cool off, one grinding out yards and catches is steadier.</p>`);
 }

 /* ---------- 11. Good call / bad call ---------- */
 function calls(model){
  const good=[],bad=[];
  for(const m of model.managers){if(!m.lineupComplete)continue;
   for(const s of m.starters)for(const b of m.bench){if(!b.entry||!hjRecapEligible(b.entry,s.slot))continue;
    if(b.points>s.points+.01)bad.push({m,s,b,gap:b.points-s.points});
    if(s.points>b.points+.01&&Number.isFinite(b.projection)&&Number.isFinite(s.projection)&&b.projection>s.projection)good.push({m,s,b,gap:s.points-b.points})}}
  const best=list=>{const seen=new Set();return list.sort((a,b)=>b.gap-a.gap).filter(x=>{const k=x.m.short;if(seen.has(k))return false;seen.add(k);return true}).slice(0,3)};
  const g=best(good),bd=best(bad);if(!g.length&&!bd.length)return '';
  const chip=(p,label)=>`<span class="rcx-call-p">${head(p)}<span><small>${label}</small>${pname(p)}<b>${fmt1(p.points)}</b></span></span>`;
  const row=(x,kind)=>`<div class="rcx-call ${kind}"><div class="rcx-call-top">${mgr(x.m.short)}<strong>${kind==='is-good'?'+':'−'}${fmt1(x.gap)}</strong></div><div class="rcx-call-pair">${chip(x.s,'Started')}<span class="rcx-call-vs">over</span>${chip(x.b,'Benched')}</div><small class="rcx-call-why">${kind==='is-good'?`ESPN projected the benched player higher (${fmt1(x.b.projection)} vs ${fmt1(x.s.projection)})`:'The benched player was eligible for that spot'}</small></div>`;
  return section('calls','Good call / bad call','the lineup decisions that mattered most',`<div class="rcx-calls"><div><h4 class="rcx-sub is-good">Good calls <small>went against the projection and won</small></h4>${g.map(x=>row(x,'is-good')).join('')||'<p class="rcx-note">None this week.</p>'}</div><div><h4 class="rcx-sub is-bad">Bad calls <small>the bench outscored the starter</small></h4>${bd.map(x=>row(x,'is-bad')).join('')||'<p class="rcx-note">None this week.</p>'}</div></div>`);
 }

 /* ---------- 12. Boom and bust ---------- */
 function boomBust(model){
  const all=model.managers.flatMap(m=>[...m.starters,...m.bench].map(p=>({...p,owner:m.short}))).filter(p=>Number.isFinite(p.projection)&&p.projection>=3&&!['K','D/ST'].includes(p.pos)).map(p=>({...p,gap:p.points-p.projection}));
  if(all.length<10)return '';
  const boom=[...all].sort((a,b)=>b.gap-a.gap).slice(0,5),bust=[...all].sort((a,b)=>a.gap-b.gap).slice(0,5);
  // Manager avatar, name and Started / Bench / IR, the same owner line as The High Five.
  const owner=p=>`<span class="rcx-item-owner"><span class="rc-five-owner manager-profile-trigger" data-manager="${esc(p.owner)}" role="button" tabindex="0" aria-label="Open ${esc(p.owner)} profile">${av(p.owner,'rc-av')}<span>${esc(p.owner)}</span></span><span class="rc-five-slot">${!p.bench?'Started':p.entry?.lineupSlotId===21?'IR':'Bench'}</span></span>`;
  const item=(p,tone)=>`<div class="rcx-item">${head(p)}<div class="rcx-item-copy">${pname(p)}<small>${esc(hjRcTeam(p.proTeamId))} ${esc(p.pos)}</small>${owner(p)}</div><span class="rcx-item-pts">${fmt1(p.points)}<small>proj ${fmt1(p.projection)}</small></span><strong class="${tone}">${hjRcSigned(p.gap,1)}</strong></div>`;
  return section('boombust','Boom and bust','the week’s biggest swings against the ESPN projection, rostered players',`<div class="rcx-two"><div><h4 class="rcx-sub is-good">Boom</h4>${boom.map(p=>item(p,'is-pos')).join('')}</div><div><h4 class="rcx-sub is-bad">Bust</h4>${bust.map(p=>item(p,'is-neg')).join('')}</div></div>`);
 }

 /* ---------- 13. ESPN vs Vegas ---------- */
 // Vegas weekly projections are kept only for the current week, but every
 // collection is a commit on the vegas-browser-feed branch: read the last one
 // made before that week's Sunday kickoff and cache it (past weeks never change).
 function sundayKickoff(season,week){const d=new Date(Date.UTC(season,8,1));while(d.getUTCDay()!==1)d.setUTCDate(d.getUTCDate()+1);d.setUTCDate(d.getUTCDate()+6+7*(week-1));d.setUTCHours(17,0,0,0);return d} // Labor Day + 6 = Week 1 Sunday, noon Central
 function loadVegas(season,week){
  const key=season+':'+week;if(HJ_RCX.vegas.has(key))return HJ_RCX.vegas.get(key);if(HJ_RCX.vegasPending.has(key))return null;
  try{const saved=JSON.parse(localStorage.getItem('hj:vegas-week:'+key)||'null');if(saved?.rows?.length){HJ_RCX.vegas.set(key,saved);return saved}}catch(_){}
  const job=(async()=>{
   const until=sundayKickoff(season,week).toISOString();
   const commits=await hjDataJson(`https://api.github.com/repos/misba-ahmed/hungjurors/commits?sha=vegas-browser-feed&path=data/projections.json&until=${encodeURIComponent(until)}&per_page=1`);
   const sha=commits?.[0]?.sha;if(!sha)throw Error('No Vegas snapshot before kickoff');
   const feed=await hjDataJson(`https://raw.githubusercontent.com/misba-ahmed/hungjurors/${sha}/data/projections.json`);
   const w=feed?.weekly;if(Number(w?.week)!==week||Number(w?.season)!==season||!Array.isArray(w.rows))throw Error('Vegas snapshot is for another week');
   const rows=w.rows.map(r=>({name:r.name,pos:r.position,pts:pcVegasPoints(r,r.position)})).filter(r=>r.name&&Number.isFinite(r.pts));
   const value={week,checkedAt:w.checkedAt,rows};HJ_RCX.vegas.set(key,value);try{localStorage.setItem('hj:vegas-week:'+key,JSON.stringify(value))}catch(_){}
   return value;
  })().catch(error=>{console.warn('Vegas history unavailable',week,error);HJ_RCX.vegas.set(key,{week,rows:[],failed:true})}).finally(()=>{HJ_RCX.vegasPending.delete(key);if(HJ_HQ_STATE.activeTab==='recap')hjRefreshRecap()});
  HJ_RCX.vegasPending.set(key,job);return null;
 }
 function compare(model,week){
  const season=Number(model.data?.seasonId||NFL_SEASON),v=loadVegas(season,week);if(!v)return null;if(!v.rows.length)return {failed:true};
  const map=new Map(v.rows.map(r=>[norm(r.name)+'|'+r.pos,r.pts]));
  const w=model.weeks.find(x=>x.week===week);if(!w)return null;
  const out=[];
  for(const r of w.scores)for(const p of hjRecapPlayers(r,week)){if(!['QB','RB','WR','TE'].includes(p.pos)||!Number.isFinite(p.projection)||p.points===null)continue;const vp=map.get(norm(p.name)+'|'+p.pos);if(!Number.isFinite(vp))continue;out.push({...p,owner:r.short,proTeamId:p.stat?.proTeamId,espn:p.projection,vegas:vp,eErr:Math.abs(p.points-p.projection),vErr:Math.abs(p.points-vp)})}
  return out;
 }
 function espnVegas(model){
  const rows=compare(model,model.week);if(!rows)return section('vegas','ESPN vs. Vegas','which projection was closer on started players','<p class="rcx-note">Loading the Vegas projections from before kickoff…</p>');
  if(rows.failed||rows.length<8)return '';
  const by=k=>{const list=k?rows.filter(r=>r.pos===k):rows,e=list.reduce((n,r)=>n+r.eErr,0)/Math.max(1,list.length),v=list.reduce((n,r)=>n+r.vErr,0)/Math.max(1,list.length),closer=list.filter(r=>r.vErr<r.eErr-.005).length;return {k:k||'All',n:list.length,e,v,closer,espnCloser:list.filter(r=>r.eErr<r.vErr-.005).length}};
  const lines=[by(''),...['QB','RB','WR','TE'].map(by)].filter(x=>x.n);
  // Season tally over every earlier week whose Vegas snapshot is already cached.
  let se=0,sv=0;for(let wk=1;wk<=model.week;wk++){const list=wk===model.week?rows:compare(model,wk);if(!list||list.failed)continue;const e=list.reduce((n,r)=>n+r.eErr,0)/Math.max(1,list.length),v=list.reduce((n,r)=>n+r.vErr,0)/Math.max(1,list.length);if(!list.length)continue;if(e<v)se++;else if(v<e)sv++}
  const split=[...rows].sort((a,b)=>Math.abs(b.espn-b.vegas)-Math.abs(a.espn-a.vegas))[0];
  const winner=l=>l.e<l.v-.005?'is-espn':l.v<l.e-.005?'is-vegas':'';
  return section('vegas','ESPN vs. Vegas','average miss on started players; lower is better',`<div class="rcx-table-wrap"><table class="rcx-table rcx-ev"><thead><tr><th></th><th>Players</th><th>ESPN miss</th><th>Vegas miss</th><th>Closer</th></tr></thead><tbody>${lines.map(l=>`<tr class="${winner(l)}"><th>${esc(l.k)}</th><td>${l.n}</td><td class="c-e">${fmt1(l.e)}</td><td class="c-v">${fmt1(l.v)}</td><td>${l.e<l.v-.005?'ESPN':l.v<l.e-.005?'Vegas':'Even'} <small>${l.espnCloser}–${l.closer}</small></td></tr>`).join('')}</tbody></table></div>${split?`<div class="rcx-item">${head(split)}<div class="rcx-item-copy">${pname(split)} <small>biggest disagreement: ESPN ${fmt1(split.espn)}, Vegas ${fmt1(split.vegas)}, actual ${fmt1(split.points)} · ${split.eErr<split.vErr?'ESPN':'Vegas'} was closer</small></div></div>`:''}${se+sv?`<p class="rcx-note">Season so far: ESPN closer in ${se} week${se===1?'':'s'}, Vegas in ${sv}.</p>`:''}`);
 }

 /* ---------- 14. Side-challenge ticker ---------- */
 function ticker(model){
  if(typeof CHALLENGES==='undefined'||typeof HJ_CHALLENGE_STATE==='undefined')return '';
  const cm=HJ_CHALLENGE_STATE.model;if(!cm)return '';
  const names=model.managers.map(m=>m.short),v=x=>Number.isInteger(Number(x))?String(x):Number(x).toFixed(1);
  const chip=(n,val='')=>`<span class="rcx-tk-chip">${face(n,'rcx-av-sm')}${val!==''?`<b>${esc(val)}</b>`:''}</span>`;
  const card=(ch,who,line,tone,footLabel,foot)=>`<article class="rcx-tk${tone?` is-${tone}`:''}${ch.id==='raffle'||ch.id==='lms'?' is-wide':''}"><div class="rcx-tk-top"><span>${esc(ch.label)}</span>${ch.prize?`<em>${esc(ch.prize)}</em>`:''}</div><div class="rcx-tk-main">${face(who,'rcx-av-mid')}<div><b>${esc(who)}</b><small>${line}</small></div></div>${foot?`<div class="rcx-tk-foot"><span>${footLabel}</span><div>${foot}</div></div>`:''}</article>`;
  const items=CHALLENGES.map(ch=>{
   if(ch.id==='raffle'){
    const won=(cm.raffle||[]).find(r=>Number(r.week)===model.week),t=[...(cm.tickets||[])].filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
    const who=won?.winners?.[0]?.short||t[0]?.short;if(!who)return '';
    const line=won?`${won.winners.length>1?`Tied with ${won.winners.slice(1).map(w=>esc(w.short)).join(', ')} · `:''}Week ${model.week} high score · ${fmt(won.score)}`:`Most tickets · ${t[0].total}`;
    return card(ch,who,line,'gold','Tickets',t.map(x=>chip(x.short,x.total)).join(''));
   }
   if(ch.id==='lms'){
    const gone=new Set((cm.eliminations||[]).filter(e=>Number(e.week)<=model.week).map(e=>e.short)),out=(cm.eliminations||[]).filter(e=>Number(e.week)===model.week).map(e=>e.short),alive=names.filter(n=>!gone.has(n));
    if(out.length)return card(ch,out[0],`Eliminated in Week ${model.week}`,'out',`${alive.length} left`,alive.map(n=>chip(n)).join(''));
    return card(ch,alive[0]||names[0],`${alive.length} still standing`,'','Alive',alive.slice(1).map(n=>chip(n)).join(''));
   }
   const list=cm.totals?.[ch.id];if(!Array.isArray(list)||!list.length)return '';
   const [top,...rest]=list;
   return card(ch,top.short,`Leads with ${v(top.total)}`,'',rest.length?'Chasing':'',rest.slice(0,3).map(x=>chip(x.short,v(x.total))).join(''));
  }).join('');
  return items?section('ticker','Side-challenge ticker',`where the side pots stand after Week ${model.week}`,`<div class="rcx-tks">${items}</div><a class="rcx-link" href="#challenges">Open Side Challenges →</a>`):'';
 }

 /* ---------- 15. Availability report (injuries and byes) ---------- */
 // Points of lineup strength each team was missing: best lineup from season averages with everyone
 // vs. with only the players who actually played. A missing bench player costs nothing.
 // ESPN keeps a zero stat line for inactive players; one with no stat keys never took the field.
 const playedIn=p=>!!p.stat&&Object.keys(p.stat.stats||{}).length>0;
 function seasonHistory(model){
  const key=model.weeks.map(w=>w.week+':'+w.scores.reduce((n,r)=>n+(r.entries||[]).length,0)).join(',');if(HJ_RCX.hist?.key===key)return HJ_RCX.hist.map;
  const map=new Map(),seen=new Set();
  for(const w of model.weeks)for(const r of w.scores)for(const e of r.entries||[]){const p=hjRecapPlayer(e,w.week);if(!p.id||!playedIn(p)||!Number.isFinite(p.points))continue;const k=p.id+'|'+w.week;if(seen.has(k))continue;seen.add(k);if(!map.has(p.id))map.set(p.id,[]);map.get(p.id).push({week:w.week,points:p.points})}
  HJ_RCX.hist={key,map};return map;
 }
 function bestLineup(players,plan){
  // Narrowest slots first, best available player each time (exact for this league's nested slots).
  const pool=players.filter(p=>p.value>0).sort((a,b)=>b.value-a.value),used=new Set(),picks=[];
  const slots=plan.map((s,i)=>({...s,i,elig:HJ_OPT_SLOT_ELIGIBLE?.[s.slotId]||[]})).sort((a,b)=>a.elig.length-b.elig.length||a.i-b.i);
  for(const slot of slots){const p=pool.find(x=>!used.has(x)&&slot.elig.includes(x.pos));if(p){used.add(p);picks.push(p)}}
  return {total:picks.reduce((n,p)=>n+p.value,0),picks};
 }
 function availabilityWeek(model,w){
  const hist=seasonHistory(model),plan=hjLineupPlan(model.data);
  return w.scores.map(r=>{
   const players=(r.entries||[]).map(e=>{const p=hjRecapPlayer(e,w.week),games=(hist.get(p.id)||[]).filter(g=>g.week!==w.week);
    const value=games.length?games.reduce((n,g)=>n+g.points,0)/games.length:(Number.isFinite(p.projection)?p.projection:0);
    const team=hjRcTeam(p.stat?.proTeamId??hjPlayer(e).proTeamId);
    const played=playedIn(p),bye=!played&&typeof hjTeamOnBye==='function'&&!!team&&hjTeamOnBye(team,w.week);
    return {...p,owner:r.short,proTeamId:p.stat?.proTeamId??hjPlayer(e).proTeamId,value,played,bye}});
   const full=bestLineup(players,plan),avail=bestLineup(players.filter(p=>p.played),plan);
   const missing=full.picks.filter(p=>!p.played).sort((a,b)=>b.value-a.value);
   const lost=Math.max(0,full.total-avail.total),byeShare=missing.reduce((n,p)=>n+(p.bye?p.value:0),0),allShare=missing.reduce((n,p)=>n+p.value,0)||1;
   return {short:r.short,lost,bye:lost*byeShare/allShare,injury:lost*(1-byeShare/allShare),missing,full:full.total};
  });
 }
 function availability(model){
  const w=model.weeks.find(x=>x.week===model.week);if(!w)return '';
  // Season averages need every week's lineups. Until each week's rosters have loaded, a missing
  // player would count as worth 0 (and the week would wrongly read as full strength).
  const pending=model.weeks.filter(x=>x.week<=model.week&&(!x.scores.length||x.scores.some(r=>!(r.entries||[]).length)));
  if(pending.length){if(typeof hjLoadMatchupHistory==='function')pending.forEach(x=>hjLoadMatchupHistory(model.data,x.week));
   return section('availability','Availability report','points lost to injuries and byes: what missing starters usually score, minus their replacements',`<p class="rcx-note">Loading every week’s lineups for the season averages (${model.weeks.filter(x=>x.week<=model.week).length-pending.length} of ${model.weeks.filter(x=>x.week<=model.week).length})…</p>`)}
  const rows=availabilityWeek(model,w).sort((a,b)=>b.lost-a.lost);
  const season=new Map(),seasonSplit=new Map();for(const x of model.weeks.filter(x=>x.week<=model.week))for(const r of availabilityWeek(model,x)){season.set(r.short,(season.get(r.short)||0)+r.lost);const t=seasonSplit.get(r.short)||{injury:0,bye:0};t.injury+=r.injury;t.bye+=r.bye;seasonSplit.set(r.short,t)}
  const max=Math.max(...rows.map(r=>r.lost),1),hit=rows.filter(r=>r.lost>0.5),full=rows.filter(r=>r.lost<=0.5),worst=hit[0];
  const seasonRank=[...season].sort((a,b)=>b[1]-a[1]),seasonTop=seasonRank.filter(([,v])=>v>0.5).slice(0,5),seasonMax=Math.max(1,...seasonTop.map(([,v])=>v));
  const why=p=>p.bye?'bye':(p.entry?.lineupSlotId===21?'IR':'out');
  return section('availability','Availability report','points lost to injuries and byes: what missing starters usually score, minus their replacements',
   `${worst?`<p class="rcx-avail-lead">${face(worst.short,'rcx-av-mid')}<span><small>Hardest hit</small><b>${esc(worst.short)}</b> lost about ${fmt1(worst.lost)} points to absences</span></p>`:'<p class="rcx-avail-lead is-clear"><span><small>Full strength week</small>No team was missing a starter to injury or a bye.</span></p>'}
   <div class="rcx-avail">${hit.map(r=>`<div class="rcx-avail-row"><span class="rcx-avail-who">${face(r.short)}<b>${esc(r.short)}</b></span>
    <span class="rcx-avail-bar"><i class="is-inj" style="width:${(100*r.injury/max).toFixed(1)}%"></i><i class="is-bye" style="width:${(100*r.bye/max).toFixed(1)}%"></i></span>
    <strong>−${fmt1(r.lost)}<small>exp. pts</small></strong>
    <span class="rcx-avail-out">${r.missing.slice(0,4).map(p=>`<span class="rcx-avail-p">${head(p)}<em class="is-${why(p)}">${why(p)==='bye'?'BYE':why(p)==='IR'?'IR':'OUT'}</em></span>`).join('')}<small class="rcx-avail-season">season −${fmt1(season.get(r.short)||0)}</small></span></div>`).join('')}</div>
   ${full.length?`<p class="rcx-avail-full"><small>Full strength</small>${full.map(r=>face(r.short)).join('')}</p>`:''}
   ${seasonTop.length?`<div class="rcx-avail-season-list"><h4>Most lost this season <small>through Week ${model.week}</small></h4>${seasonTop.map(([n,v],i)=>{const t=seasonSplit.get(n)||{injury:0,bye:0};return `<div class="rcx-avail-srow"><em>${i+1}</em>${face(n)}<b>${esc(n)}</b><span class="rcx-avail-bar"><i class="is-inj" style="width:${(100*t.injury/seasonMax).toFixed(1)}%"></i><i class="is-bye" style="width:${(100*t.bye/seasonMax).toFixed(1)}%"></i></span><strong>−${fmt1(v)}</strong></div>`}).join('')}</div>`:''}
   <p class="rcx-avail-key"><i class="is-inj"></i>injury / inactive <i class="is-bye"></i>bye</p>`);
 }

 /* ---------- placement ---------- */
 const marker=title=>`<section class="rc-block"><h3 class="rc-h">${title}`;
 function insertBefore(html,title,add){if(!add)return html;const i=html.indexOf(marker(title));return i<0?null:html.slice(0,i)+add+html.slice(i)}
 hjRecapHTML=function(data){
  let html=baseHTML.apply(this,arguments);const model=HJ_RCX.model;
  if(!model||!html.includes('class="rc"'))return html;
  const weeks=model.weeks;
  const parts={
   grades:reportCard(model),
   standings:playoffPicture(model)+seriesUpdate(model),
   game:matchupFlow(model)+whenScored(model)+garbageTime(model)+casualty(model)+availability(model),
   team:pointSources(model)+tdLuck(model),
   players:calls(model)+boomBust(model)+espnVegas(model),
   tail:ticker(model)
  };
  // Each group goes before the first of its anchor sections that this week's recap actually has.
  const place=(titles,add)=>{if(!add)return;for(const t of titles){const next=insertBefore(html,t,add);if(next!==null){html=next;return}}const end=html.lastIndexOf('</div></div>');html=html.slice(0,end)+add+html.slice(end)};
  const order=['Movers','Team performance','Position battles','Slipped away','Primetime sweat','Players of the week','Benchwarmers of the week','Waiver wire','False starters','Game changer','Out of character','Storylines'];
  const from=t=>order.slice(order.indexOf(t));
  place(from('Movers'),parts.grades);
  place(from('Team performance'),parts.standings);
  place(from('Position battles'),parts.team);
  place(from('Primetime sweat'),parts.game);
  place(from('False starters'),parts.players);
  place(from('Storylines'),parts.tail);
  return html;
 };
})();

