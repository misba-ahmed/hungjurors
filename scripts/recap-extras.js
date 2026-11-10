/* Weekly Recap extras (October 27, 2026).
 * Thirteen extra cards, all computed from data the recap already loads:
 * Report card, Paths to the playoffs, Series update, Matchup flow,
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

 /* ---------- 2. Playoff odds (Monte Carlo), shown in Paths to the playoffs ---------- */
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
 /* ---------- 3. Paths to the playoffs (Nov 10; replaces the odds-only Playoff picture card) ----------
  * Exact scenarios from every way the remaining regular-season games can go (2^games, at most 2^25 with five
  * weeks left: worked out once per week in a background worker and kept for the session). For each manager:
  *  - the 0–N wins strip: green = in whatever else happens, yellow = needs help or a points tiebreak, grey = out;
  *  - clinch / elimination for the coming week, a Must-win tag, Clinched / Eliminated badges;
  *  - tap to expand: what each yellow box needs, the points gap to 4th, and a rooting guide for the coming week
  *    (the result of each other game that raises his chances; chances count every outcome equally, ties on wins
  *    going to the current points order).
  * Odds and ▲▼ come from the same 4,000-season simulation as before (simulate above). Ties go to total points
  * (league setting), which no scenario can know in advance, so a tie on wins is always "needs help". */
 const PATH_WORKER=`self.onmessage=e=>{const{W0,pfOrder,games,m,slots,left}=e.data,K=W0.length,G=games.length,n2=G-m;
  let lo=99,hi=0;for(const v of W0){if(v<lo)lo=v;if(v+left>hi)hi=v+left}const R=hi-lo+2;
  const byK=new Float64Array(K*(left+1)*3),wk=new Float64Array(K*(1<<m)*4),w=new Int32Array(K),cnt=new Int32Array(R),suf=new Int32Array(R+1),seen=new Int32Array(R),bits=new Uint8Array(n2),T=1<<n2;
  for(let o=0;o<(1<<m);o++){
   for(let t=0;t<K;t++)w[t]=W0[t]-lo;
   for(let j=0;j<m;j++){const g=games[j];w[(o>>j)&1?g[0]:g[1]]++}
   for(let j=m;j<G;j++)w[games[j][1]]++;
   bits.fill(0);cnt.fill(0);for(let t=0;t<K;t++)cnt[w[t]]++;
   for(let i=0;i<T;i++){
    if(i){let b=0;while(!((i>>b)&1))b++;const g=games[m+b],h=g[0],a=g[1];cnt[w[h]]--;cnt[w[a]]--;if(bits[b]){bits[b]=0;w[h]--;w[a]++}else{bits[b]=1;w[h]++;w[a]--}cnt[w[h]]++;cnt[w[a]]++}
    suf[R]=0;for(let v=R-1;v>=0;v--){suf[v]=suf[v+1]+cnt[v];seen[v]=0}
    for(let r=0;r<K;r++){const t=pfOrder[r],v=w[t],above=suf[v+1],eq=cnt[v]-1,before=seen[v]++,k=v+lo-W0[t];
     const a=(t*(left+1)+k)*3,c=(t*(1<<m)+o)*4;byK[a]++;wk[c]++;
     if(above+eq<slots){byK[a+1]++;wk[c+1]++}else if(above>=slots){byK[a+2]++;wk[c+2]++}
     if(above+before<slots)wk[c+3]++}
   }
  }
  postMessage({byK,wk})};`;
 function pathInput(model){
  const data=model.data,ss=data?.settings?.scheduleSettings||{},slots=Number(ss.playoffTeamCount)||4,regular=Number(ss.matchupPeriodCount)||14,through=model.week;
  if(through>=regular)return null;
  const teams=new Map();
  for(const wk of weeksThrough(model,through))for(const r of wk.scores){const t=teams.get(String(r.teamId))||{short:r.short,teamId:String(r.teamId),w:0,l:0,t:0,pf:0};
   if(r.pts>r.oppPts+.005)t.w++;else if(r.oppPts>r.pts+.005)t.l++;else t.t++;t.pf+=r.pts;teams.set(String(r.teamId),t)}
  const list=[...teams.values()];if(list.length<slots+1)return null;
  const idx=new Map(list.map((t,i)=>[t.teamId,i]));
  const games=(data.schedule||[]).filter(g=>Number(g.matchupPeriodId)>through&&Number(g.matchupPeriodId)<=regular&&idx.has(String(g.home?.teamId))&&idx.has(String(g.away?.teamId)))
   .sort((a,b)=>Number(a.matchupPeriodId)-Number(b.matchupPeriodId)).map(g=>({week:Number(g.matchupPeriodId),h:idx.get(String(g.home.teamId)),a:idx.get(String(g.away.teamId))}));
  if(!games.length||games.length>25)return null;
  const next=games[0].week,m=games.filter(g=>g.week===next).length,left=regular-through;
  // Ties count half a win for the standings; the scenarios use whole wins (a tie this season is rare and shown as is).
  const W0=list.map(t=>t.w),pfOrder=list.map((t,i)=>i).sort((x,y)=>list[y].pf-list[x].pf);
  return {list,games,next,m,left,slots,regular,W0,pfOrder,key:`${through}|${list.map(t=>`${t.teamId}:${t.w}:${t.l}:${t.pf.toFixed(1)}`).join(',')}|${games.length}`};
 }
 function pathCompute(inp){
  HJ_RCX.paths=HJ_RCX.paths||new Map();
  if(HJ_RCX.paths.has(inp.key))return HJ_RCX.paths.get(inp.key);
  // Kept per device for the week: the scenarios only change when a week's results are final.
  const store='hj:playoff-paths';
  try{const saved=JSON.parse(localStorage.getItem(store)||'null');if(saved?.key===inp.key&&saved.byK&&saved.wk){const job={pending:false,byK:saved.byK,wk:saved.wk};HJ_RCX.paths.set(inp.key,job);return job}}catch(_){}
  const job={pending:true};HJ_RCX.paths.set(inp.key,job);
  const msg={W0:inp.W0,pfOrder:inp.pfOrder,games:inp.games.map(g=>[g.h,g.a]),m:inp.m,slots:inp.slots,left:inp.left};
  const done=res=>{job.pending=false;job.byK=Array.from(res.byK);job.wk=Array.from(res.wk);try{localStorage.setItem(store,JSON.stringify({key:inp.key,byK:job.byK,wk:job.wk}))}catch(_){}if(HJ_HQ_STATE.activeTab==='recap')hjRefreshRecap()};
  try{
   const url=URL.createObjectURL(new Blob([PATH_WORKER],{type:'text/javascript'})),worker=new Worker(url);
   worker.onmessage=e=>{done(e.data);worker.terminate();URL.revokeObjectURL(url)};
   worker.onerror=()=>{job.pending=false;job.failed=true;worker.terminate()};
   worker.postMessage(msg);
  }catch(_){
   // No worker: work it out here when it is small enough not to stall the page (from three weeks left).
   if(msg.games.length<=15){const scope={};new Function('self','postMessage',PATH_WORKER)(scope,r=>done(r));scope.onmessage({data:msg})}else{job.pending=false;job.failed=true}
  }
  return job;
 }
 function playoffPaths(model){
  const inp=pathInput(model);if(!inp)return '';
  const key=model.week+':'+model.weeks.map(w=>w.scores.map(r=>r.pts).join(',')).join('|');
  if(HJ_RCX.odds?.key!==key)HJ_RCX.odds={key,now:simulate(model,model.week),before:model.week>1?simulate(model,model.week-1):null};
  const odds=new Map((HJ_RCX.odds.now?.teams||[]).map(t=>[t.short,t.odds])),prev=new Map((HJ_RCX.odds.before?.teams||[]).map(t=>[t.short,t.odds]));
  const job=pathCompute(inp),{list,games,next,m,left,slots}=inp,K=list.length,O=1<<m;
  const sub=`${left} week${left===1?'':'s'} left · top ${slots} make it · ties go to total points`;
  if(job.pending||job.failed||!job.byK)return section('playoffs','Paths to the playoffs',sub,`<p class="rcx-note">${job.failed?'Scenarios unavailable right now.':'Working out every scenario…'}</p>`);
  const {byK,wk}=job,pct=v=>v>=.995?'>99':v<=.005&&v>0?'<1':String(Math.round(100*v));
  const at=(t,k)=>{const a=(t*(left+1)+k)*3;return {tot:byK[a],sure:byK[a+1],out:byK[a+2]}};
  const cellOf=(t,k)=>{const c=at(t,k);return !c.tot?'none':c.sure===c.tot?'in':c.out===c.tot?'out':'help'};
  const seedOrder=list.map((t,i)=>i).sort((x,y)=>list[y].w-list[x].w||list[y].pf-list[x].pf),seed=new Map(seedOrder.map((t,i)=>[t,i+1]));
  const pfRank=new Map(inp.pfOrder.map((t,i)=>[t,i+1])),ordn=n=>{const x=['th','st','nd','rd'],v=n%100;return n+(x[(v-20)%10]||x[v]||x[0])};
  const state=list.map((t,i)=>{const cells=Array.from({length:left+1},(_,k)=>cellOf(i,k));return {cells,clinched:cells.every(c=>c==='in'||c==='none'),out:cells.every(c=>c==='out'||c==='none')}});
  // The coming week: chances given each result of each game (every outcome counted equally).
  const wkGames=games.slice(0,m),chance=(t,j,homeWins)=>{let made=0,tot=0;for(let o=0;o<O;o++){if(((o>>j)&1)!==(homeWins?1:0))continue;const c=(t*O+o)*4;tot+=wk[c];made+=wk[c+3]}return tot?made/tot:0};
  const swing=wkGames.map((g,j)=>{const d=list.map((t,i)=>chance(i,j,true)-chance(i,j,false));return {g,j,d,total:d.reduce((s,v)=>s+Math.abs(v),0),moved:d.filter(v=>Math.abs(v)>=.01).length}});
  const gotw=[...swing].sort((a,b)=>b.total-a.total)[0];
  // Clinch / elimination this week: every completion of a week result decides it.
  const weekSets=i=>{const cl=[],el=[];for(let o=0;o<O;o++){const c=(i*O+o)*4;if(!wk[c])continue;if(wk[c+1]===wk[c])cl.push(o);if(wk[c+2]===wk[c])el.push(o)}return {cl,el}};
  // A set of week results as the fewest game results that guarantee it (each listed result must happen).
  const needed=set=>{if(!set.length||set.length===O)return null;const fixed=[];for(let j=0;j<m;j++){const v=(set[0]>>j)&1;if(set.every(o=>((o>>j)&1)===v))fixed.push([j,v])}
   const size=1<<(m-fixed.length);return set.length===size?fixed.map(([j,v])=>v?wkGames[j].h:wkGames[j].a):null};
  const weekLines=[];for(const i of seedOrder){if(state[i].clinched||state[i].out)continue;const {cl,el}=weekSets(i);
   const c=needed(cl),e=needed(el);
   if(c)weekLines.push(`<div>${face(list[i].short,'rcx-av')}<b>${esc(list[i].short)}</b> <em class="is-in">clinches</em> if ${c.map(t=>`${face(list[t].short,'rcx-av')}<b>${esc(list[t].short)}</b>`).join(' ')} ${c.length>1?'all ':''}win</div>`);
   else if(cl.length)weekLines.push(`<div>${face(list[i].short,'rcx-av')}<b>${esc(list[i].short)}</b> can <em class="is-in">clinch</em> this week</div>`);
   if(e)weekLines.push(`<div>${face(list[i].short,'rcx-av')}<b>${esc(list[i].short)}</b> is <em class="is-out">eliminated</em> if ${e.map(t=>`${face(list[t].short,'rcx-av')}<b>${esc(list[t].short)}</b>`).join(' ')} ${e.length>1?'all ':''}win</div>`);
   else if(el.length)weekLines.push(`<div>${face(list[i].short,'rcx-av')}<b>${esc(list[i].short)}</b> can be <em class="is-out">eliminated</em> this week</div>`)}
  const mustWin=i=>{const j=wkGames.findIndex(g=>g.h===i||g.a===i);if(j<0)return false;const loseBit=wkGames[j].h===i?0:1;let any=false;
   for(let o=0;o<O;o++){if(((o>>j)&1)!==loseBit)continue;const c=(i*O+o)*4;if(!wk[c])continue;any=true;if(wk[c+2]!==wk[c])return false}return any};
  const moves=list.map((t,i)=>({i,d:prev.has(t.short)&&odds.has(t.short)?odds.get(t.short)-prev.get(t.short):0})).filter(x=>Math.abs(x.d)>=.03).sort((a,b)=>b.d-a.d);
  const moveTxt=[...moves.filter(x=>x.d>0).slice(0,2),...moves.filter(x=>x.d<0).slice(-2).reverse()].map(x=>`${x.d>0?'▲':'▼'} ${esc(list[x.i].short)} ${x.d>0?'+':'−'}${Math.round(100*Math.abs(x.d))}`).join(' · ');
  const name=i=>`${face(list[i].short,'rcx-av')}<b>${esc(list[i].short)}</b>`;
  const top=`<div class="rcx-pp-week"><small>Week ${next}</small>${gotw&&gotw.moved>1?`<div class="rcx-pp-gotw"><span class="rcx-pp-tag">Game of the week</span>${name(gotw.g.h)} vs ${name(gotw.g.a)}<span class="rcx-pp-sub">moves ${gotw.moved} teams’ chances</span></div>`:''}${weekLines.length?weekLines.join(''):'<div>No one can clinch or be eliminated this week.</div>'}${moveTxt?`<div class="rcx-pp-chg"><small>Since Week ${model.week-1}</small> ${moveTxt}</div>`:''}</div>`;
  // Remaining opponents per team; a ring marks a rival in the race with him (counts twice).
  const opps=i=>games.filter(g=>g.h===i||g.a===i).map(g=>g.h===i?g.a:g.h);
  const alive=i=>!state[i].clinched&&!state[i].out;
  const rival=(i,o)=>alive(i)&&alive(o)&&(seed.get(o)<seed.get(i)||(seed.get(i)<=slots&&Math.abs(list[o].w-list[i].w)<=1));
  const fourth=seedOrder[slots-1];
  // Who can still get to R wins (with all his games won, the teams he plays lose one of theirs).
  const reach=(i,R,k)=>list.map((t,o)=>o).filter(o=>o!==i&&list[o].w+left-(k===left&&opps(i).includes(o)?opps(i).filter(x=>x===o).length:0)>=R);
  const named=o=>`${face(list[o].short,'rcx-av rcx-pp-mini')}<b class="rcx-pp-nm">${esc(list[o].short)}</b>`;
  const detail=i=>{const t=list[i],rows=[];
   state[i].cells.forEach((c,k)=>{if(c!=='help')return;const R=t.w+k,rec=`${R}–${t.l+(left-k)}`,can=reach(i,R,k),already=can.filter(o=>list[o].w>=R);
    let txt;if(already.length>=slots){const tie=already.filter(o=>list[o].w===R);txt=tie.length?`only if ${tie.length>1?'one of ':''}${tie.map(named).join(tie.length>1?', ':'')} loses out, nobody else passes him, and he wins on points`:'only on points'}
    else txt=`in if no more than ${slots-1} others get to ${R} wins <span class="rcx-pp-can">${can.length} can${already.length?` (${already.length} already ${already.length===1?'has':'have'})`:''}</span>`;
    rows.push(`<div><b>${k}–${left-k} → ${rec}</b> ${txt}</div>`)});
   const gap=seed.get(i)>slots?`<p>Tied on wins → total points decide (${esc(t.short)} is ${ordn(pfRank.get(i))}, ${(list[fourth].pf-t.pf).toFixed(1)} behind ${esc(list[fourth].short)} in ${ordn(slots)})</p>`:`<p>Tied on wins → total points decide (${esc(t.short)} is ${ordn(pfRank.get(i))} in points)</p>`;
   let guide='';if(alive(i)){const own=wkGames.findIndex(g=>g.h===i||g.a===i);
    const picks=swing.filter(s=>s.j!==own&&Math.abs(s.d[i])>=.001).sort((a,b)=>Math.abs(b.d[i])-Math.abs(a.d[i])).map(s=>{const win=s.d[i]>0?s.g.h:s.g.a,lose=s.d[i]>0?s.g.a:s.g.h;return `<span class="rcx-pp-pick">${face(list[win].short,'rcx-av rcx-pp-mini')}<b>${esc(list[win].short)}</b><i>over</i>${face(list[lose].short,'rcx-av rcx-pp-mini')}<u>${esc(list[lose].short)}</u></span>`});
    const ownOpp=own>=0?(wkGames[own].h===i?wkGames[own].a:wkGames[own].h):null;
    if(picks.length||ownOpp!==null)guide=`<div class="rcx-pp-root"><small>Week ${next} rooting guide</small>${picks.join('')}${ownOpp!==null?`<span class="rcx-pp-own">and beat ${face(list[ownOpp].short,'rcx-av rcx-pp-mini')}<b>${esc(list[ownOpp].short)}</b> — his own game matters most</span>`:''}</div>`}
   return rows.join('')+gap+guide};
  const lineOf=i=>{const s=state[i];if(s.clinched)return 'Clinched a playoff spot';if(s.out)return 'Eliminated';
   const c=s.cells,clinchK=c.findIndex(x=>x==='in'),lastOut=c.lastIndexOf('out'),parts=[];
   parts.push(clinchK<0?'Can’t clinch alone':clinchK===left?'Win out to clinch':`${clinchK} more win${clinchK===1?'':'s'} clinches`);
   if(lastOut>=0)parts.push(lastOut+1===left?'must win out':`needs ${lastOut+1}+ win${lastOut===0?'':'s'}`);
   return parts.join(' · ')};
  const row=i=>{const t=list[i],s=state[i],o=odds.get(t.short),d=prev.has(t.short)&&o!==undefined?o-prev.get(t.short):0,sd=seed.get(i);
   const badge=s.clinched?'<span class="rcx-pp-badge is-in">Clinched</span>':s.out?'<span class="rcx-pp-badge is-out">Eliminated</span>':mustWin(i)?'<span class="rcx-pp-badge is-must">Must win</span>':'';
   return `<details class="rcx-pp-row${sd<=slots?' is-seed':''}${s.out?' is-out':''}"><summary><span class="rcx-pp-top"><span class="rcx-pp-seed">${sd}</span>${av(t.short,'rcx-av')}<b>${esc(t.short)}</b><span class="rcx-pp-rec">${t.w}–${t.l}${t.t?`–${t.t}`:''}</span>${badge}<span class="rcx-pp-odds">${o===undefined?'':`${pct(o)}%`}${Math.abs(d)>=.005?`<em class="${d>0?'is-up':'is-down'}">${d>0?'▲':'▼'}${Math.round(100*Math.abs(d))}</em>`:''}</span></span>
    <span class="rcx-pp-path"><small>wins left of ${left}</small><span class="rcx-pp-cells" style="--n:${left+1}">${s.cells.map((c,k)=>`<i class="is-${c}">${c==='in'?'✓':c==='out'?'✕':k}</i>`).join('')}</span></span>
    <span class="rcx-pp-line">${lineOf(i)}<span class="rcx-pp-pts">PTS ${ordn(pfRank.get(i))}</span></span>
    <span class="rcx-pp-sched"><small>left</small>${opps(i).map(o=>`<span class="rcx-pp-o${rival(i,o)?' is-rival':''}">${av(list[o].short,'rcx-av rcx-pp-opp')}</span>`).join('')}</span></summary>
    ${alive(i)?`<div class="rcx-pp-detail">${detail(i)}</div>`:''}</details>`};
  return section('playoffs','Paths to the playoffs',sub,`${top}<div class="rcx-pp-list">${seedOrder.map(row).join('')}</div><div class="rcx-pp-key"><span><i class="is-in"></i>in, no matter what</span><span><i class="is-help"></i>needs help</span><span><i class="is-out"></i>out</span><span><i class="is-ring"></i>rival, counts twice</span></div><p class="rcx-note">Every way the remaining ${games.length} games can go is checked. Odds: 4,000 simulated seasons from each team’s scoring. Tap a manager for what each yellow box needs and who to root for.</p>`);
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
 // Nov 10 rewrite. Facts only, most impactful first. A starter counts as hurt in his game when
 //  1. the play-by-play says so ("NE-R.Stevenson was injured during the play"), or
 //  2. he played and his team's injury report gave him a status after kickoff (within 4 days, the same window as
 //     the week), or a later status while his last play came 10+ game minutes before the end (he left early
 //     without a play note: Josh Jacobs, Week 9, last play Q1 8:41).
 // Shown: when he was hurt (or his last play), when he came back or the game clock he missed, his status, points
 // and projection. Order: the biggest share of his projection missed first (projection × game clock missed / 60
 // minutes), then the ones who came back. The old card showed "projection minus points" as an injury cost, which
 // mixed a bad game with the injury (Stevenson −0.1 after 14.8 of 14.9; Jefferson, who returned, −9.5).
 // Play text has a team code and a short name but no player id (id-less source, AGENTS.md): each note or play is
 // tied to the starter by the short name built from his ESPN id's box-score name, within his own team in that game
 // (team code checked, BLT=BAL, CLV=CLE…); a short name two teammates share is skipped rather than guessed. Injury
 // reports come from his team's roster, matched by his ESPN id.
 const PLAY_CODE={BLT:'BAL',CLV:'CLE',HST:'HOU',ARZ:'ARI',LA:'LAR',WSH:'WAS',JAC:'JAX',SL:'STL'};
 const clockSec=c=>{const m=/^(\d+):(\d{2})$/.exec(String(c||''));return m?Number(m[1])*60+Number(m[2]):null};
 const mmss=v=>`${Math.floor(v/60)}:${String(Math.round(v%60)).padStart(2,'0')}`;
 const playWhen=pl=>{const q=Number(pl?.period?.number)||0;return `${q>4?'OT':q?`Q${q}`:''} ${pl?.clock?.displayValue||''}`.trim()};
 const left=pl=>{const q=Number(pl?.period?.number)||0,c=clockSec(pl?.clock?.displayValue);return c!==null&&q>=1&&q<=4?(4-q)*900+c:q>4?0:null};
 const shortOf=a=>a?.firstName&&a?.lastName?a.firstName[0]+'.'+String(a.lastName).replace(/ (?:Jr\.?|Sr\.?|II|III|IV)$/i,''):'';
 const ROSTERS=new Map();
 function teamRoster(teamId){
  const key=String(teamId);if(ROSTERS.has(key))return ROSTERS.get(key);
  const job=hjDataJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${encodeURIComponent(key)}/roster`).then(d=>{
   const map=new Map();for(const g of d?.athletes||[])for(const a of g.items||[]){const i=(a.injuries||[])[0];if(a.id&&i?.status)map.set(String(a.id),{status:i.status,date:Date.parse(i.date||''),type:i.type?.abbreviation||''})}
   job.value=map;if(HJ_HQ_STATE.activeTab==='recap')hjRefreshRecap();return map}).catch(()=>{job.value=new Map();return job.value});
  ROSTERS.set(key,job);return job;
 }
 function casualty(model){
  const games=model.extra?.games;if(!games?.size||typeof hjRcAthleteAlias!=='function')return '';
  const rx=t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),plays=new Map(),hurt=[];
  for(const p of allStarters(model)){
   if(p.pos==='D/ST'||p.pos==='K'||!p.gameId)continue;const game=games.get(p.gameId);if(!game)continue;
   const meta=hjRcAthleteAlias(p,game);if(!meta)continue;
   const box=game.boxscore?.players||[],team=box.find(t=>String(t.team?.id)===String(meta.teamId))?.team,abbr=String(team?.abbreviation||'').toUpperCase();
   const named=own=>box.filter(t=>(String(t.team?.id)===String(meta.teamId))===own).flatMap(t=>(t.statistics||[]).flatMap(g=>(g.athletes||[]).map(r=>r.athlete))).filter(a=>a?.id&&shortOf(a)===meta.alias);
   // Same short name twice on his team in this game: the play text cannot be tied to him.
   if(new Set(named(true).map(a=>String(a.id))).size>1)continue;
   // An opponent with the same short name: only his own team-coded notes count.
   const oppSame=named(false).length>0;
   if(!plays.has(p.gameId))plays.set(p.gameId,hjRcGamePlays(game));
   const list=plays.get(p.gameId),i=meta.alias.indexOf('.'),name=`${rx(meta.alias.slice(0,i))}[a-z]?\\.${rx(meta.alias.slice(i+1))}\\b`;
   const hurtRe=new RegExp(`\\b([A-Z]{2,3})-${name} was injured during the play`),returnRe=new RegExp(`\\b([A-Z]{2,3})-${name} has returned to the game`),inPlay=new RegExp(`(?:^|[\\s(;\\[-])${name}`);
   const ours=code=>code===abbr||PLAY_CODE[code]===abbr;
   let hit=null,back=null,last=null;
   for(const play of list){
    const t=String(play.text||''),h=hurtRe.exec(t);
    if(h&&ours(h[1])){hit=play;back=null;last=play;continue}
    const r=returnRe.exec(t);if(r&&ours(r[1])){if(hit&&!back)back=play;continue}
    if(!oppSame&&inPlay.test(t)){last=play;if(hit&&!back)back=play}
   }
   const kick=Date.parse(game.header?.competitions?.[0]?.date||''),roster=teamRoster(meta.teamId).value,rep=roster?.get(String(p.id));
   const reported=rep&&!/^active$/i.test(rep.status)&&Number.isFinite(kick)&&rep.date>=kick?rep:null;
   if(hit){
    const missed=back?Math.max(0,(left(hit)??0)-(left(back)??0)):left(hit);
    hurt.push({...p,kind:'play',hit,back,missed,report:reported});continue;
   }
   // No play note: an injury report after kickoff, for a starter who played.
   if(!reported||!last)continue;
   const after=left(last)??0;
   if(!(reported.date<=kick+4*86400000||after>=600))continue;
   hurt.push({...p,kind:'report',last,back:null,missed:after>=600?after:0,report:reported});
  }
  if(!hurt.length)return '';
  // Points missed: his projection × the share of the 60-minute game he sat out (an estimate, labeled as one).
  const impact=h=>(Number.isFinite(h.projection)?h.projection:0)*(h.missed||0)/3600;
  const severity=h=>({Out:3,'Injured Reserve':3,Doubtful:2,Questionable:1})[h.report?.status]||0;
  hurt.sort((a,b)=>impact(b)-impact(a)||severity(b)-severity(a)||(b.projection||0)-(a.projection||0));
  const per=new Map();for(const h of hurt){const v=impact(h);if(v>0)per.set(h.owner,(per.get(h.owner)||0)+v)}
  const worst=[...per].sort((a,b)=>b[1]-a[1])[0];
  // Game clock bar: four quarters, red from the injury to the return (or the end), a tick at each.
  const at=pl=>pl?Math.max(0,Math.min(3600,3600-(left(pl)??0))):null;
  const bar=h=>{const from=at(h.kind==='play'?h.hit:h.last),to=h.back?at(h.back):3600,out=h.kind==='play'||h.missed>0;
   const pct=v=>(100*v/3600).toFixed(2);
   return `<span class="rcx-clock" aria-hidden="true">${[1,2,3].map(q=>`<i class="rcx-clock-q" style="left:${q*25}%"></i>`).join('')}${out&&from!==null?`<i class="rcx-clock-out" style="left:${pct(from)}%;width:${pct(Math.max(0,to-from))}%"></i><i class="rcx-clock-hit" style="left:${pct(from)}%"></i>${h.back?`<i class="rcx-clock-back" style="left:${pct(to)}%"></i>`:''}`:`<i class="rcx-clock-hit is-late" style="left:${pct(from??3600)}%"></i>`}</span>`};
  const gone=h=>h.missed?` (${mmss(h.missed)} missed)`:'';
  const caption=h=>(h.kind==='report'?(h.missed?`Left ${playWhen(h.last)}`:`Hurt late · last play ${playWhen(h.last)}`):h.back?`Hurt ${playWhen(h.hit)} · back ${playWhen(h.back)}`:`Hurt ${playWhen(h.hit)} · didn’t return`)+gone(h);
  const owner=h=>`<span class="rcx-item-owner"><span class="rc-five-owner manager-profile-trigger" data-manager="${esc(h.owner)}" role="button" tabindex="0" aria-label="Open ${esc(h.owner)} profile">${av(h.owner,'rc-av')}<span>${esc(h.owner)}</span></span></span>`;
  const row=h=>{const lost=impact(h);return `<div class="rcx-cas${h.back?' is-back':''}"><span class="rcx-cas-face">${head(h)}<small>${esc(hjRcTeam(h.proTeamId))} ${esc(h.pos)}</small></span><div class="rcx-cas-copy">${pname(h)}${owner(h)}${bar(h)}<small class="rcx-cas-when">${caption(h)}</small></div><div class="rcx-cas-pts"><b>${fmt1(h.points)}<small> pts</small></b>${lost>=0.05?`<strong class="is-neg">−${fmt1(lost)}<small> missed</small></strong>`:''}${Number.isFinite(h.projection)?`<em>${fmt1(h.projection)} proj</em>`:''}</div></div>`};
  return section('casualty','Casualty report','starters hurt in their game, most points missed first',`<div class="rcx-list">${hurt.slice(0,6).map(row).join('')}</div>${worst?`<p class="rcx-cas-lead">Hardest hit ${mgr(worst[0])}<strong class="is-neg">−${fmt1(worst[1])}</strong><small>projected pts missed</small></p>`:''}<p class="rcx-note">Points missed: his projection × the share of the game he sat out.</p>`);
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
   standings:playoffPaths(model)+seriesUpdate(model),
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
