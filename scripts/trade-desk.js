/* =====================================================================
   TRADE DESK
   A third view in Roster Strength, beside Dashboard and Compare.
   Market Value is the currency; everything else — starting-lineup
   impact, positional need, depth risk, form and grade — is context
   layered on top, the way the better public trade tools do it.
   ===================================================================== */
(function(){
 if(window.HJTD)return;

 const POS=['QB','RB','WR','TE'];
 const LINEUP=[['QB',1],['RB',2],['WR',2],['TE',1]];
 const FLEXABLE=['RB','WR','TE'];
 const UNITS=['QB','RB','WR','TE','FLEX'];

 const HJTD={a:'',b:'',give:new Set(),get:new Set(),pick:'',query:'',mode:'build',finder:null,finding:false,scope:'all'};
 window.HJTD=HJTD;

 const esc0=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const E=s=>typeof esc==='function'?esc(s):esc0(s);
 const money=v=>Number.isFinite(v)?Math.round(v).toLocaleString('en-US'):'—';
 const pts=v=>Number.isFinite(v)?(typeof pcFpts==='function'?pcFpts(v):v.toFixed(2)):'—';
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

 /* ---------- roster plumbing ---------- */
 const week=()=>typeof hjCurrentWeek==='function'?hjCurrentWeek(HJ_LEAGUE_STATE?.data):1;
 const teams=()=>(HJ_LEAGUE_STATE?.data?.teams||[]);
 const teamById=id=>teams().find(t=>String(t.id)===String(id))||null;
 const managerOf=team=>team?(hjMatchManager(team,HJ_LEAGUE_STATE.data)||hjOwnerName(team,HJ_LEAGUE_STATE.data)||`Manager ${team.id}`):'';
 const entryId=entry=>String(hjPlayer(entry)?.id??entry?.playerId??entry?.id??'');
 const entryName=entry=>{const p=hjPlayer(entry)||{};return p.fullName||p.displayName||p.name||'Player'};
 const isIR=entry=>Number(entry?.lineupSlotId)===21;

 function rosterOf(id){const t=teamById(id);return t?hjRosterEntries(t).filter(e=>entryId(e)):[]}

 /* Points come from the site's own blended projection so the lineup maths
    matches what Roster Strength shows; Market Value is the trade currency. */
 function projOf(entry){
  const v=hj6Projection(entry,'combo','season',week(),HJ_LEAGUE_SEASON);
  return Number.isFinite(v)?v:null;
 }
 const valueOf=entry=>{const v=window.HJMV?.entryValue?.(entry);return Number.isFinite(v)?v:null};
 const marketRow=entry=>window.HJMV?.entryRow?.(entry)||null;
 const gradeOf=entry=>{const g=typeof hjPffEntryGrade==='function'?hjPffEntryGrade(entry):null;return Number.isFinite(g)?g:null};

 /* ---------- lineup optimiser (fast; used thousands of times by the finder) ---------- */
 function lineupPoints(list){
  const pool={},used=new Set();
  for(const item of list){if(!item||!Number.isFinite(item.pts)||item.ir)continue;(pool[item.pos]=pool[item.pos]||[]).push(item)}
  for(const k in pool)pool[k].sort((a,b)=>b.pts-a.pts);
  let total=0,filled=0,need=0;
  for(const [pos,count] of LINEUP){
   need+=count;
   const bucket=pool[pos]||[];let taken=0;
   for(const item of bucket){if(taken>=count)break;if(used.has(item))continue;used.add(item);total+=item.pts;taken++;filled++}
  }
  need+=1;
  let flex=null;
  for(const pos of FLEXABLE)for(const item of (pool[pos]||[]))if(!used.has(item)&&(!flex||item.pts>flex.pts))flex=item;
  if(flex){used.add(flex);total+=flex.pts;filled++}
  for(const pos of ['D/ST','K']){
   need+=1;
   const item=(pool[pos]||[]).find(x=>!used.has(x));
   if(item){used.add(item);total+=item.pts;filled++}
  }
  return {total,filled,need,short:need-filled};
 }
 const toItems=list=>list.map(e=>({pos:hjPlayerPosition(e),pts:projOf(e),ir:isIR(e),entry:e}));

 /* ---------- counts and depth ---------- */
 const MINIMUMS={QB:1,RB:2,WR:2,TE:1,'D/ST':1,K:1};
 function countByPos(list){const out={};list.forEach(e=>{if(isIR(e))return;const p=hjPlayerPosition(e);out[p]=(out[p]||0)+1});return out}
 function marketByUnit(list){
  const entries=dashEntries(list),roles=dashLineup(entries),all=scopeNow()==='all';
  const of=role=>roles.filter(x=>x.role===role).map(x=>x.entry);
  return Object.fromEntries(UNITS.map(k=>[k,sumValues(
   k==='FLEX'?of('FLEX'):all?entries.filter(e=>hjPlayerPosition(e)===k):of(k)
  )]));
 }
 const sumValues=list=>list.reduce((s,e)=>{const v=valueOf(e);return s+(Number.isFinite(v)?v:0)},0);

 /* The Roster Strength dashboard's Value model counts de-duplicated, non-IR
    skill players, and under the Starters scope only the value-optimal lineup.
    The Trade Desk has to use exactly that basis or its league rank disagrees
    with the number the dashboard is showing on the next tab across. */
 const scopeNow=()=>HJ_STRENGTH_STATE.scope==='all'?'all':'starters';
 function dashEntries(list){
  const seen=new Set();
  return list.filter(e=>{
   const id=entryId(e);
   if(!id||seen.has(id)||isIR(e)||!POS.includes(hjPlayerPosition(e)))return false;
   seen.add(id);return true;
  });
 }
 function dashLineup(entries){
  const eligible=entries.filter(e=>Number.isFinite(valueOf(e)));
  const byPos=p=>eligible.filter(e=>hjPlayerPosition(e)===p).sort((a,b)=>valueOf(b)-valueOf(a));
  const used=new Set(),roles=[];
  const take=(p,n,role=p)=>{byPos(p).filter(e=>!used.has(e)).slice(0,n).forEach(e=>{used.add(e);roles.push({entry:e,role})})};
  take('QB',1);take('RB',2);take('WR',2);take('TE',1);
  const flex=eligible.filter(e=>['RB','WR','TE'].includes(hjPlayerPosition(e))&&!used.has(e)).sort((a,b)=>valueOf(b)-valueOf(a))[0]||null;
  if(flex){used.add(flex);roles.push({entry:flex,role:'FLEX'})}
  return roles;
 }
 function marketTotal(list){
  const entries=dashEntries(list),roles=dashLineup(entries);
  return sumValues(scopeNow()==='all'?entries:roles.map(x=>x.entry));
 }

 /* ---------- the trade model ---------- */
 function ensureSides(){
  const all=teams();
  if(!all.length)return false;
  if(!teamById(HJTD.a))HJTD.a=String(all[0].id);
  if(!teamById(HJTD.b)||String(HJTD.b)===String(HJTD.a))HJTD.b=String((all.find(t=>String(t.id)!==String(HJTD.a))||all[0]).id);
  return true;
 }

 function model(){
  const aTeam=teamById(HJTD.a),bTeam=teamById(HJTD.b);
  const aAll=rosterOf(HJTD.a),bAll=rosterOf(HJTD.b);
  const give=aAll.filter(e=>HJTD.give.has(entryId(e)));
  const take=bAll.filter(e=>HJTD.get.has(entryId(e)));
  const aAfter=aAll.filter(e=>!HJTD.give.has(entryId(e))).concat(take);
  const bAfter=bAll.filter(e=>!HJTD.get.has(entryId(e))).concat(give);

  const outA=marketTotal(give),outB=marketTotal(take);
  const net=outB-outA;                       // positive: A receives more value
  const base=Math.max(outA,outB,1);
  const gap=Math.abs(net)/base;

  const lineup=list=>lineupPoints(toItems(list));
  const sides=[
   {key:'a',team:aTeam,manager:managerOf(aTeam),before:aAll,after:aAfter,out:give,in:take,sent:outA,received:outB},
   {key:'b',team:bTeam,manager:managerOf(bTeam),before:bAll,after:bAfter,out:take,in:give,sent:outB,received:outA}
  ].map(side=>{
   const lb=lineup(side.before),la=lineup(side.after);
   return {...side,
    marketBefore:marketTotal(side.before),marketAfter:marketTotal(side.after),
    unitsBefore:marketByUnit(side.before),unitsAfter:marketByUnit(side.after),
    lineupBefore:lb,lineupAfter:la,lineupDelta:la.total-lb.total,
    countsAfter:countByPos(side.after),
    valueDelta:side.received-side.sent};
  });

  /* League context: where each roster's market value ranks, before and after. */
  const allRosters=teams().map(t=>({id:String(t.id),value:marketTotal(rosterOf(t.id))}));
  const rankOf=(id,value,swap)=>{
   const list=allRosters.map(r=>({id:r.id,value:swap&&swap[r.id]!==undefined?swap[r.id]:r.value}))
    .sort((a,b)=>b.value-a.value);
   const at=list.findIndex(r=>r.id===String(id));
   return at>=0?at+1:null;
  };
  const swap={[String(HJTD.a)]:sides[0].marketAfter,[String(HJTD.b)]:sides[1].marketAfter};
  sides.forEach(side=>{
   side.rankBefore=rankOf(side.team?.id,side.marketBefore,null);
   side.rankAfter=rankOf(side.team?.id,side.marketAfter,swap);
  });

  /* Positional standing across the league, so a bar shows a need and not just a number. */
  const leagueUnits=teams().map(t=>({id:String(t.id),units:marketByUnit(rosterOf(t.id))}));
  const unitRank=(id,unit,overrides)=>{
   const list=leagueUnits.map(r=>({id:r.id,v:overrides&&overrides[r.id]?overrides[r.id][unit]:r.units[unit]}))
    .sort((a,b)=>b.v-a.v);
   const at=list.findIndex(r=>r.id===String(id));
   return at>=0?at+1:null;
  };
  const afterUnits={[String(HJTD.a)]:sides[0].unitsAfter,[String(HJTD.b)]:sides[1].unitsAfter};
  sides.forEach(side=>{
   side.unitRankBefore={};side.unitRankAfter={};
   UNITS.forEach(u=>{
    side.unitRankBefore[u]=unitRank(side.team?.id,u,null);
    side.unitRankAfter[u]=unitRank(side.team?.id,u,afterUnits);
   });
  });
  const teamCount=leagueUnits.length||1;
  sides.forEach(side=>{side.teamCount=teamCount});

  const band=!give.length&&!take.length?'empty':gap<.04?'even':gap<.10?'slight':gap<.22?'clear':'lopsided';
  const winner=band==='empty'||band==='even'?null:net>0?'a':'b';

  return {aTeam,bTeam,aAll,bAll,give,take,sides,outA,outB,net,gap,band,winner,
   count:{give:give.length,take:take.length},
   best:[...give,...take].sort((x,y)=>(valueOf(y)||0)-(valueOf(x)||0))[0]||null};
 }

 /* ---------- grading ---------- */
 function gradeFor(side,m){
  if(m.band==='empty')return {letter:'—',tone:'even'};
  const edge=side.valueDelta/Math.max(m.outA,m.outB,1);
  /* Lineup movement counts as a share of what the lineup was already projecting,
     so a few points across a whole season never outweighs the price paid. */
  const lift=side.lineupDelta/Math.max(side.lineupBefore.total,1);
  const score=edge*100+clamp(lift*100*.8,-12,12);
  const letter=score>=18?'A+':score>=11?'A':score>=6?'A−':score>=2.5?'B+':score>=-2.5?'B':score>=-6?'B−':score>=-11?'C':score>=-18?'D':'F';
  const tone=score>=6?'good':score>=-6?'even':'bad';
  return {letter,tone,score};
 }

 /* ---------- sweetener ---------- */
 function sweetener(m){
  if(!m.winner||m.band==='even'||m.band==='empty')return null;
  const loser=m.winner==='a'?'b':'a';
  const side=m.sides.find(s=>s.key===loser);
  const holder=m.winner==='a'?m.aAll:m.bAll;
  const already=new Set([...m.give,...m.take].map(entryId));
  const target=Math.abs(m.net);
  const options=holder.filter(e=>!already.has(entryId(e))&&Number.isFinite(valueOf(e)))
   .map(e=>({entry:e,value:valueOf(e),miss:Math.abs(valueOf(e)-target)}))
   .sort((x,y)=>x.miss-y.miss);
  const hit=options.find(o=>o.miss<=target*.45);
  return hit?{entry:hit.entry,value:hit.value,from:m.winner,to:loser,fromName:m.sides.find(s=>s.key===m.winner).manager,gap:target}:null;
 }

 /* ---------- risk flags ---------- */
 function flags(m){
  const out=[];
  if(m.band==='empty')return out;
  m.sides.forEach(side=>{
   for(const [pos,min] of Object.entries(MINIMUMS)){
    const have=side.countsAfter[pos]||0;
    if(have<min)out.push({tone:'bad',text:`${side.manager} would be left with ${have} healthy ${pos}${have===1?'':'s'} — a starting spot goes unfilled.`});
   }
   if(side.lineupAfter.short>0&&!out.some(f=>f.text.startsWith(side.manager)))out.push({tone:'bad',text:`${side.manager} cannot fill a full lineup after this deal.`});
   const net=side.in.length-side.out.length;
   if(net>0)out.push({tone:'warn',text:`${side.manager} takes on ${net} extra roster spot${net===1?'':'s'} and may need to drop someone.`});
  });
  [...m.give,...m.take].filter(isIR).forEach(e=>out.push({tone:'warn',text:`${entryName(e)} is on injured reserve.`}));
  if(m.count.give&&m.count.take&&m.count.give!==m.count.take&&m.best){
   const side=m.give.includes(m.best)?'b':'a';
   const who=m.sides.find(s=>s.key===side).manager;
   out.push({tone:'note',text:`${who} gets the best player in the deal — consolidation usually beats depth in a 10-team league.`});
  }
  return out.slice(0,6);
 }

 /* =====================================================================
    Trade finder
    Every one-for-one and two-for-one between the two rosters, scored on
    what each side's starting lineup gains. Deals that only help one team
    are kept but marked; deals that help both are surfaced first.
    ===================================================================== */
 function finderRun(){
  const scope=HJTD.scope==='all'?teams().filter(t=>String(t.id)!==String(HJTD.a)):[teamById(HJTD.scope)].filter(t=>t&&String(t.id)!==String(HJTD.a));
  const mine=rosterOf(HJTD.a);
  const myItems=toItems(mine);
  const myBase=lineupPoints(myItems).total;
  const myValue=marketTotal(mine);
  const results=[];
  const priced=list=>list.filter(e=>Number.isFinite(valueOf(e))&&!isIR(e));

  for(const team of scope){
   const theirs=rosterOf(team.id),theirItems=toItems(theirs);
   const theirBase=lineupPoints(theirItems).total;
   const manager=managerOf(team);
   const mineP=priced(mine),theirsP=priced(theirs);

   const evaluate=(out,inc)=>{
    const outIds=new Set(out.map(entryId)),incIds=new Set(inc.map(entryId));
    const myAfter=mine.filter(e=>!outIds.has(entryId(e))).concat(inc);
    const theirAfter=theirs.filter(e=>!incIds.has(entryId(e))).concat(out);
    const myLine=lineupPoints(toItems(myAfter)),theirLine=lineupPoints(toItems(theirAfter));
    if(myLine.short>0||theirLine.short>0)return null;    // never propose a deal that breaks a lineup
    const myGain=myLine.total-myBase,theirGain=theirLine.total-theirBase;
    /* Gains are scored as a share of each lineup, so the maths reads the same
       whether the projections are weekly or season-long. */
    const myPct=myGain/Math.max(myBase,1),theirPct=theirGain/Math.max(theirBase,1);
    const outV=out.reduce((s,e)=>s+valueOf(e),0),incV=inc.reduce((s,e)=>s+valueOf(e),0);
    const gap=Math.abs(incV-outV)/Math.max(outV,incV,1);
    if(gap>.22)return null;                              // never propose something they would laugh at
    if(myPct<=.004)return null;                          // it has to actually help the asking side
    const tone=theirPct>.002?'good':theirPct>-.006?'even':'bad';
    return {team,manager,out,inc,myGain,theirGain,myPct,theirPct,outV,incV,gap,tone,
     mutual:tone==='good',
     score:myPct*100+theirPct*55-gap*25};
   };

   for(const out of mineP)for(const inc of theirsP){
    const r=evaluate([out],[inc]);if(r)results.push(r);
   }
   /* Two-for-one in both directions, pruned to pairs that are close on value. */
   for(let i=0;i<mineP.length;i++)for(let j=i+1;j<mineP.length;j++){
    const pair=[mineP[i],mineP[j]],pv=valueOf(pair[0])+valueOf(pair[1]);
    for(const inc of theirsP){
     if(Math.abs(valueOf(inc)-pv)/Math.max(pv,valueOf(inc),1)>.22)continue;
     const r=evaluate(pair,[inc]);if(r)results.push(r);
    }
   }
   for(let i=0;i<theirsP.length;i++)for(let j=i+1;j<theirsP.length;j++){
    const pair=[theirsP[i],theirsP[j]],pv=valueOf(pair[0])+valueOf(pair[1]);
    for(const out of mineP){
     if(Math.abs(valueOf(out)-pv)/Math.max(pv,valueOf(out),1)>.22)continue;
     const r=evaluate([out],pair);if(r)results.push(r);
    }
   }
  }
  results.sort((a,b)=>(b.mutual-a.mutual)||b.score-a.score);
  /* One suggestion per package sent, and no more than two deals built around the
     same incoming player, so the list reads as options rather than one idea twelve times. */
  const seenOut=new Set(),seenIn=new Map(),trimmed=[];
  for(const r of results){
   const outKey=r.out.map(entryId).sort().join('+'),inKey=r.inc.map(entryId).sort().join('+');
   if(seenOut.has(outKey))continue;
   if((seenIn.get(inKey)||0)>=2)continue;
   seenOut.add(outKey);seenIn.set(inKey,(seenIn.get(inKey)||0)+1);trimmed.push(r);
   if(trimmed.length>=12)break;
  }
  HJTD.finder={at:Date.now(),scope:HJTD.scope,from:HJTD.a,rows:trimmed,scanned:scope.length};
  return HJTD.finder;
 }

 /* =====================================================================
    Rendering
    ===================================================================== */
 const initials=name=>typeof hjInitials==='function'?hjInitials(name):String(name).slice(0,1).toUpperCase();
 /* A missing headshot falls back to initials rather than an empty disc. */
 window.hjTdFallback=function(img){const face=img?.closest?.('.td-chip-face');if(!face)return;face.innerHTML=`<span class="td-chip-ini">${esc0(face.dataset.ini||'')}</span>`};

 function chipTrend(row){
  if(!row||!Number.isFinite(row.trend30)||Math.abs(row.trend30)<Math.max(40,row.value*.012))return '';
  const up=row.trend30>0;
  return `<span class="td-trend ${up?'is-up':'is-down'}" title="30-day market move">${up?'▲':'▼'}${money(Math.abs(row.trend30))}</span>`;
 }

 function playerChip(entry,opts={}){
  const p=hjPlayer(entry)||{},id=p.id||entry?.playerId||'',name=entryName(entry);
  const pos=hjPlayerPosition(entry),team=hjPlayerTeam(entry);
  const row=marketRow(entry),value=valueOf(entry),proj=projOf(entry),grade=gradeOf(entry);
  const attrs=ffnPlayerDataAttrs({id,name,team,position:pos,photo:hjPlayerPhoto(entry)});
  const photo=hjPlayerPhoto(entry);
  return `<article class="td-chip${opts.selected?' is-on':''}${isIR(entry)?' is-ir':''}" data-td-player="${E(id)}" data-td-side="${E(opts.side||'')}">
   <button type="button" class="td-chip-face pc-player-trigger" ${attrs} data-ini="${E(initials(name))}" aria-label="Open ${E(name)}">${photo?`<img src="${E(photo)}" alt="" loading="lazy" onerror="hjTdFallback(this)">`:`<span class="td-chip-ini">${E(initials(name))}</span>`}</button>
   <div class="td-chip-copy">
    <b>${E(name)}</b>
    <span class="td-chip-meta"><i class="td-pos td-pos-${E(pos.replace('/',''))}">${E(pos)}</i><span>${E(team)}</span>${row?`<span class="td-rank">${E(row.position+row.positionRank)}</span>`:''}${isIR(entry)?'<span class="td-ir">IR</span>':''}</span>
   </div>
   <div class="td-chip-stats">
    <span class="td-chip-value">${money(value)}${chipTrend(row)}</span>
    <small>${Number.isFinite(proj)?`${pts(proj)} proj`:'no projection'}${Number.isFinite(grade)?` · ${grade.toFixed(1)} PFF`:''}</small>
   </div>
   ${opts.action?`<button type="button" class="td-chip-act" data-td-toggle="${E(opts.side)}:${E(id)}" aria-label="${opts.selected?'Remove':'Add'} ${E(name)}">${opts.selected?'−':'+'}</button>`:''}
  </article>`;
 }

 function sideColumn(side,m){
  const key=side.key,other=key==='a'?'b':'a';
  const chosen=key==='a'?m.give:m.take;
  const options=(key==='a'?m.aAll:m.bAll).filter(e=>!chosen.includes(e));
  const query=HJTD.pick===key?HJTD.query.toLowerCase():'';
  const matching=options.filter(e=>!query||entryName(e).toLowerCase().includes(query)||hjPlayerPosition(e).toLowerCase()===query);
  /* Grouped by position, best first inside each group — a roster reads by position,
     not as one long list. */
  const ORDER=['QB','RB','WR','TE','K','D/ST'];
  const groups=ORDER.map(pos=>({pos,players:matching.filter(e=>hjPlayerPosition(e)===pos).sort((x,y)=>(valueOf(y)??-1)-(valueOf(x)??-1))}))
   .filter(g=>g.players.length);
  const rest=matching.filter(e=>!ORDER.includes(hjPlayerPosition(e)));
  if(rest.length)groups.push({pos:'Other',players:rest});
  const list=groups.length?groups.map(g=>`<div class="td-group"><div class="td-group-head"><span>${E(g.pos)}</span><b>${g.players.length}</b></div>${g.players.map(e=>playerChip(e,{side:key,action:true})).join('')}</div>`).join(''):'';
  const grade=gradeFor(side,m);
  const teamOptions=teams().filter(t=>key==='a'||String(t.id)!==String(HJTD.a)).map(t=>`<option value="${E(t.id)}"${String(t.id)===String(key==='a'?HJTD.a:HJTD.b)?' selected':''}>${E(managerOf(t))}</option>`).join('');
  return `<section class="td-side td-side-${key}">
   <div class="td-side-head">
    ${av(side.manager,'td-av')}
    <div class="td-side-who"><select data-td-team="${key}" aria-label="${key==='a'?'Your team':'Trade partner'}">${teamOptions}</select><small>${side.rankBefore?`#${side.rankBefore} by market value`:''}</small></div>
    <div class="td-side-grade tone-${grade.tone}"><b>${E(grade.letter)}</b><small>grade</small></div>
   </div>
   <div class="td-give">
    <div class="td-give-head"><span>${key==='a'?'Sends away':'Sends away'}</span><b>${money(side.sent)}</b></div>
    ${chosen.length?chosen.map(e=>playerChip(e,{side:key,selected:true,action:true})).join(''):'<p class="td-empty">Tap a player below to build the deal.</p>'}
   </div>
   <div class="td-pool">
    <input type="search" class="td-search" data-td-query="${key}" value="${HJTD.pick===key?E(HJTD.query):''}" placeholder="Search ${E(side.manager)}’s roster" aria-label="Search ${E(side.manager)}’s roster">
    <div class="td-pool-list">${list||'<p class="td-empty">No players match.</p>'}</div>
   </div>
  </section>`;
 }

 /* =====================================================================
    Analysis
    Market Value settles the price. Everything here answers the harder
    question: does the deal fit the team, the season and the calendar.
    ===================================================================== */
 const INJURED=new Set(['OUT','DOUBTFUL','INJURY_RESERVE','SUSPENSION','NON_FOOTBALL_INJURY']);
 const injuryOf=entry=>String(hjPlayer(entry)?.injuryStatus||'').toUpperCase().replace(/\s+/g,'_');
 const injuryLabel=code=>({OUT:'out',DOUBTFUL:'doubtful',QUESTIONABLE:'questionable',INJURY_RESERVE:'on IR',SUSPENSION:'suspended',NON_FOOTBALL_INJURY:'unavailable'})[code]||'';
 const onBye=entry=>{try{return Array.isArray(NFL_WEEK1)&&NFL_WEEK1.length>=8&&hjPlayerPosition(entry)!=='D/ST'&&!pcUpcoming(hjPlayerTeam(entry))}catch(_){return false}};

 /* ---------- usage feeds: snaps, target share, carry share ----------
    The site already publishes nflverse weekly stats and snap counts, so a
    shared backfield or receiver room can be described with the actual split
    rather than a hand-wave. */
 const USAGE={rows:null,snaps:null,ready:false,pending:false,cache:new Map(),teamCarries:new Map(),posPPO:new Map(),rostered:null};
 function ensureUsage(){
  if(USAGE.ready||USAGE.pending)return;
  if(typeof pcLoadSeason!=='function'||typeof pcLoadSnaps!=='function')return;
  USAGE.pending=true;
  Promise.allSettled([pcLoadSeason(Number(NFL_SEASON)),pcLoadSnaps(Number(NFL_SEASON))]).then(([a,b])=>{
   USAGE.rows=a.status==='fulfilled'?a.value:null;
   USAGE.snaps=b.status==='fulfilled'?b.value:null;
   indexUsage();
   USAGE.ready=Boolean(USAGE.rows&&USAGE.rows.length);USAGE.pending=false;
   if(HJ_HQ_STATE?.activeTab==='strength'&&HJ_STRENGTH_STATE.view==='trade')rerender();
  }).catch(()=>{USAGE.pending=false});
 }
 function indexUsage(){
  USAGE.cache=new Map();USAGE.teamCarries=new Map();USAGE.posPPO=new Map();
  if(!USAGE.rows)return;
  const ppo={};
  for(const row of USAGE.rows){
   const team=String(row.team||'').toUpperCase(),wk=Number(row.week);
   if(team&&Number.isFinite(wk)){const k=`${team}|${wk}`;USAGE.teamCarries.set(k,(USAGE.teamCarries.get(k)||0)+(Number(row.carries)||0))}
   const pos=String(row.position||row.position_group||'').toUpperCase();
   const opps=typeof pcOpportunities==='function'?pcOpportunities(row,pos):0,pts=typeof pcPoints==='function'?pcPoints(row):null;
   if(opps>=4&&Number.isFinite(pts))(ppo[pos]=ppo[pos]||[]).push(pts/opps);
  }
  for(const [pos,list] of Object.entries(ppo)){list.sort((x,y)=>x-y);USAGE.posPPO.set(pos,list[Math.floor(list.length/2)])}
 }
 const pct=v=>Number.isFinite(v)?`${Math.round(v*100)}%`:'';
 function summarise(rows,pos){
  if(!rows.length)return null;
  const n=rows.length,num=v=>Number.isFinite(Number(v))?Number(v):null;
  const avg=list=>{const c=list.filter(Number.isFinite);return c.length?c.reduce((a,b)=>a+b,0)/c.length:null};
  const snap=avg(rows.map(r=>{const hit=USAGE.snaps&&typeof pcSnap==='function'?pcSnap(r,USAGE.snaps):null;return num(hit?.offense_pct)}));
  const carryShare=avg(rows.map(r=>{
   const total=USAGE.teamCarries.get(`${String(r.team||'').toUpperCase()}|${Number(r.week)}`);
   return total>0?(num(r.carries)||0)/total:null;
  }));
  const touches=rows.reduce((t,r)=>t+(num(r.carries)||0)+(num(r.receptions)||0),0);
  const tds=rows.reduce((t,r)=>t+(num(r.rushing_tds)||0)+(num(r.receiving_tds)||0),0);
  const points=rows.reduce((t,r)=>t+(typeof pcPoints==='function'?(pcPoints(r)||0):0),0);
  const opps=rows.reduce((t,r)=>t+(typeof pcOpportunities==='function'?(pcOpportunities(r,pos)||0):0),0);
  return {games:n,snap,target:avg(rows.map(r=>num(r.target_share))),air:avg(rows.map(r=>num(r.air_yards_share))),
   wopr:avg(rows.map(r=>num(r.wopr))),carryShare,touches,tds,points,opps,
   ppo:opps>0?points/opps:null,tdShare:points>0?(tds*6)/points:null};
 }
 function usageFor(like){
  if(!USAGE.ready||!like)return null;
  const key=`${like.id||''}|${like.name||''}|${like.position||''}`;
  if(USAGE.cache.has(key))return USAGE.cache.get(key);
  let out=null;
  try{
   const pos=String(like.position||'').toUpperCase();
   const rows=(typeof pcPlayerRows==='function'?pcPlayerRows(USAGE.rows,{id:like.id,name:like.name,position:pos}):[])
    .slice().sort((a,b)=>Number(a.week)-Number(b.week));
   if(rows.length){
    const num=v=>Number.isFinite(Number(v))?Number(v):null;
    const weeks=rows.slice(-5).map(r=>{
     const total=USAGE.teamCarries.get(`${String(r.team||'').toUpperCase()}|${Number(r.week)}`);
     const hit=USAGE.snaps&&typeof pcSnap==='function'?pcSnap(r,USAGE.snaps):null;
     return {week:Number(r.week),snap:num(hit?.offense_pct),carries:num(r.carries)||0,targets:num(r.targets)||0,
      target:num(r.target_share),carryShare:total>0?(num(r.carries)||0)/total:null};
    });
    out={pos,season:summarise(rows,pos),recent:summarise(rows.slice(-3),pos),games:rows.length,weeks,
     team:String(rows.at(-1).team||like.team||'').toUpperCase()};
   }
  }catch(_){out=null}
  USAGE.cache.set(key,out);return out;
 }
 /* Test hook: lets the harness supply weekly stat and snap feeds offline. */
 HJTD.injectUsage=(rows,snaps)=>{USAGE.rows=rows;USAGE.snaps=snaps;indexUsage();USAGE.ready=Boolean(rows&&rows.length);USAGE.rostered=null};
 const usageOfEntry=entry=>usageFor({id:entryId(entry),name:entryName(entry),position:hjPlayerPosition(entry),team:hjPlayerTeam(entry)});

 /* A share line for one player, in the terms that actually decide a role. */
 function shareLine(u){
  if(!u||!u.recent)return '';
  const bits=[];
  if(Number.isFinite(u.recent.snap))bits.push(`${pct(u.recent.snap)} of snaps`);
  if(['RB'].includes(u.pos)&&Number.isFinite(u.recent.carryShare))bits.push(`${pct(u.recent.carryShare)} of carries`);
  if(['WR','TE','RB'].includes(u.pos)&&Number.isFinite(u.recent.target))bits.push(`${pct(u.recent.target)} target share`);
  if(['WR','TE'].includes(u.pos)&&Number.isFinite(u.recent.air))bits.push(`${pct(u.recent.air)} of air yards`);
  return bits.join(', ');
 }

 /* Week by week, in the terms that decide whether a role is real: snap share,
    the carries or targets themselves, and the share of the team those represent. */
 function usageMetrics(u){
  if(!u||!u.weeks||u.weeks.length<2)return [];
  const rb=u.pos==='RB';
  const defs=[
   {key:'snap',label:'Snap %',fmt:v=>Number.isFinite(v)?Math.round(v*100)+'%':'—',val:w=>w.snap},
   rb?{key:'carries',label:'Carries',fmt:v=>Number.isFinite(v)?String(Math.round(v)):'—',val:w=>w.carries}
     :{key:'targets',label:'Targets',fmt:v=>Number.isFinite(v)?String(Math.round(v)):'—',val:w=>w.targets},
   rb?{key:'carryShare',label:'Team carries',fmt:v=>Number.isFinite(v)?Math.round(v*100)+'%':'—',val:w=>w.carryShare}
     :{key:'target',label:'Team targets',fmt:v=>Number.isFinite(v)?Math.round(v*100)+'%':'—',val:w=>w.target}
  ];
  if(rb)defs.push({key:'targets',label:'Targets',fmt:v=>Number.isFinite(v)?String(Math.round(v)):'—',val:w=>w.targets});
  return defs.filter(d=>u.weeks.some(w=>Number.isFinite(d.val(w))));
 }
 function trendOf(u,def){
  if(!u||!u.weeks)return 0;
  const vals=u.weeks.map(def.val).filter(Number.isFinite);
  if(vals.length<3)return 0;
  const half=Math.floor(vals.length/2);
  const early=vals.slice(0,half).reduce((a,b)=>a+b,0)/half;
  const late=vals.slice(-half).reduce((a,b)=>a+b,0)/half;
  if(!early)return late>0?1:0;
  const move=(late-early)/Math.abs(early);
  return move>=.18?1:move<=-.18?-1:0;
 }
 function usageStrip(entry,side){
  const u=usageOfEntry(entry);
  const defs=usageMetrics(u);
  if(!defs.length)return '';
  const p=hjPlayer(entry)||{},photo=hjPlayerPhoto(entry),name=entryName(entry);
  const attrs=ffnPlayerDataAttrs({id:p.id||entry?.playerId||'',name,team:hjPlayerTeam(entry),position:hjPlayerPosition(entry),photo});
  const dir=trendOf(u,defs[0])||trendOf(u,defs[1]||defs[0]);
  const tag=dir>0?'<span class="td-usage-tag is-up">Role growing</span>':dir<0?'<span class="td-usage-tag is-down">Role shrinking</span>':'<span class="td-usage-tag">Steady</span>';
  const cols=u.weeks.length;
  const rows=defs.map(def=>{
   const vals=u.weeks.map(def.val);
   const max=Math.max(...vals.filter(Number.isFinite),0)||1;
   return `<div class="td-usage-row"><span class="td-usage-label">${E(def.label)}</span>${u.weeks.map((w,i)=>{
    const v=vals[i],h=Number.isFinite(v)?Math.max(6,100*v/max):0;
    return `<span class="td-usage-cell"><i style="height:${h.toFixed(0)}%"></i><b>${E(def.fmt(v))}</b></span>`;
   }).join('')}</div>`;
  }).join('');
  return `<article class="td-usage" style="--cols:${cols}">
   <div class="td-usage-head">
    <button type="button" class="td-usage-face pc-player-trigger" ${attrs} aria-label="Open ${E(name)}">${photo?`<img src="${E(photo)}" alt="" loading="lazy" onerror="this.remove()">`:''}</button>
    <div class="td-usage-who"><b>${E(name)}</b><small>${E(hjPlayerPosition(entry))} · ${E(hjPlayerTeam(entry))} · to ${E(side)}</small></div>
    ${tag}
   </div>
   <div class="td-usage-grid">
    <div class="td-usage-row is-weeks"><span class="td-usage-label">Week</span>${u.weeks.map(w=>`<span class="td-usage-cell is-week"><b>${w.week}</b></span>`).join('')}</div>
    ${rows}
   </div>
  </article>`;
 }
 /* The same series as a sentence, for the written case. */
 function trendSentence(entry){
  const u=usageOfEntry(entry),defs=usageMetrics(u);
  if(!defs.length)return '';
  const say=def=>{
   const vals=u.weeks.map(def.val);
   if(vals.filter(Number.isFinite).length<3)return '';
   return `${def.label.toLowerCase()} ${vals.slice(-3).map(v=>def.fmt(v)).join(' → ')}`;
  };
  const parts=defs.map(say).filter(Boolean).slice(0,3);
  return parts.length?`Weeks ${u.weeks.slice(-3).map(w=>w.week).join(', ')}: ${parts.join('; ')}.`:'';
 }

 /* Who is actually available on the wire, so an upgrade can be measured
    against the alternative rather than against nothing. */
 function rosteredIds(){
  if(USAGE.rostered)return USAGE.rostered;
  USAGE.rostered=new Set();
  teams().forEach(t=>hjRosterEntries(t).forEach(e=>USAGE.rostered.add(entryId(e))));
  return USAGE.rostered;
 }
 function replacementFor(position){
  const owned=rosteredIds();
  return (window.HJMV?.rows||[]).find(r=>r.position===position&&r.espnId&&!owned.has(r.espnId))||null;
 }
 /* How steep the drop is from the last starter to the next man up, per position. */
 function scarcity(){
  const need={QB:10,RB:20,WR:20,TE:10};
  const out={};
  for(const [pos,starters] of Object.entries(need)){
   const list=(window.HJMV?.rows||[]).filter(r=>r.position===pos).map(r=>r.value).sort((a,b)=>b-a);
   if(list.length>starters+6)out[pos]=(list[starters-1]-list[starters+5])/Math.max(list[starters-1],1);
  }
  return out;
 }
 function timingNote(){
  const w=week();
  if(w<=4)return {phase:'early',copy:'Weeks 1–4 is when perception gaps are widest: buy steady usage that has not scored yet, sell a hot start built on touchdowns.'};
  if(w<=9)return {phase:'mid',copy:'By midseason depth charts have settled — this is the window to turn spare depth into a better starter.'};
  return {phase:'late',copy:'Late in the season contenders pay up for the last piece and the teams that are out should be cashing in.'};
 }

 let standingsCache=null;
 function standingsRows(){
  if(standingsCache)return standingsCache;
  try{const out=typeof buildStandingsAnalytics==='function'?buildStandingsAnalytics():null;standingsCache=Array.isArray(out)?out:(out&&Array.isArray(out.people)?out.people:[])}catch(_){standingsCache=[]}
  return standingsCache;
 }
 const standingFor=manager=>standingsRows().find(p=>String(p.short)===String(manager))||null;

 /* Season posture decides whether a deal should be judged on this week or on May. */
 const played=row=>Number(row?.entries?.length||0);
 const ordinal=n=>{const v=Number(n);if(!Number.isFinite(v))return '';const s=['th','st','nd','rd'][(v%100-v%10!=10)*(v%10<4)*(v%10)];return `${v}${s||'th'}`};
 function posture(row){
  if(!row||!played(row))return {key:'preseason',label:'Season not started',copy:''};
  const odds=Number(row.playoffOdds),power=Number(row.power);
  const score=Number.isFinite(odds)?odds:Number.isFinite(power)?power:null;
  if(score===null)return {key:'unknown',label:'Unknown',copy:''};
  if(score>=62)return {key:'contender',label:'Contender',copy:'playing for a title this year'};
  if(score>=32)return {key:'bubble',label:'On the bubble',copy:'a win or two from deciding its season'};
  return {key:'fading',label:'Playing it out',copy:'needing upside more than safety'};
 }

 /* Same NFL club, same position, comparable price: the workload is shared. */
 function competition(entry){
  const row=marketRow(entry);
  /* Only the rooms that are genuinely shared: a backfield or a receiver group.
     A backup quarterback is not competition for touches. */
  if(!row||!row.team||!['RB','WR','TE'].includes(row.position))return [];
  return (window.HJMV?.rows||[]).filter(r=>r!==row&&r.team===row.team&&r.position===row.position
    &&r.value>=row.value*.55&&(!Number.isFinite(r.rostered)||r.rostered>=.3))
   .sort((a,b)=>b.value-a.value).slice(0,2);
 }
 let injuryMapCache=null;
 function injuryMap(){
  if(injuryMapCache)return injuryMapCache;
  injuryMapCache=new Map();
  teams().forEach(t=>hjRosterEntries(t).forEach(e=>{const code=injuryOf(e);if(code&&code!=='ACTIVE')injuryMapCache.set(entryId(e),code)}));
  return injuryMapCache;
 }

 /* Short term and rest of season are scored separately; they often disagree. */
 function weekLineup(list){
  const items=list.map(e=>{
   const v=hj6Projection(e,'combo','week',week(),HJ_LEAGUE_SEASON);
   return {pos:hjPlayerPosition(e),pts:Number.isFinite(v)?v:null,ir:isIR(e),entry:e};
  });
  const covered=items.filter(i=>Number.isFinite(i.pts)).length;
  return {...lineupPoints(items),covered,total_:items.length};
 }

 function analyse(m){
  if(m.band==='empty')return null;
  const rows=m.sides.map(side=>{
   const stand=standingFor(side.manager),post=posture(stand);
   const wb=weekLineup(side.before),wa=weekLineup(side.after);
   const weekReady=wb.covered>=Math.max(6,Math.floor(side.before.length*.5));
   return {...side,stand,post,weekBefore:wb,weekAfter:wa,weekDelta:wa.total-wb.total,weekReady};
  });
  const [A,B]=rows;

  const lean=(a,b,margin)=>Math.abs(a-b)<=margin?'even':a>b?'a':'b';
  const unitGain=side=>UNITS.map(k=>({k,d:(side.unitsAfter[k]||0)-(side.unitsBefore[k]||0)})).sort((x,y)=>y.d-x.d);
  const worstUnitBefore=side=>UNITS.map(k=>({k,v:side.unitsBefore[k]||0})).sort((x,y)=>x.v-y.v)[0];

  /* --- the factor scorecard --- */
  const factors=[];
  factors.push({label:'Market value',lean:m.band==='even'?'even':m.winner,
   note:m.band==='even'?`Within ${(m.gap*100).toFixed(1)}% — a straight price.`:`${money(Math.abs(m.net))} of value moves toward ${rows.find(r=>r.key===m.winner).manager}.`});

  if(A.weekReady&&B.weekReady)factors.push({label:'This week',lean:lean(A.weekDelta,B.weekDelta,.4),
   note:`${A.manager} ${A.weekDelta>=0?'+':'−'}${pts(Math.abs(A.weekDelta))}, ${B.manager} ${B.weekDelta>=0?'+':'−'}${pts(Math.abs(B.weekDelta))} in Week ${week()} starters.`});

  factors.push({label:'Rest of season',lean:lean(A.lineupDelta,B.lineupDelta,1),
   note:`${A.manager} ${A.lineupDelta>=0?'+':'−'}${pts(Math.abs(A.lineupDelta))}, ${B.manager} ${B.lineupDelta>=0?'+':'−'}${pts(Math.abs(B.lineupDelta))} projected starters.`});

  const fitScore=side=>{const weak=worstUnitBefore(side);return ((side.unitsAfter[weak.k]||0)-(side.unitsBefore[weak.k]||0))};
  const fitA=fitScore(A),fitB=fitScore(B);
  const sc=scarcity();
  const steep=Object.entries(sc).sort((x,y)=>y[1]-x[1])[0];
  factors.push({label:'Positional fit',lean:lean(fitA,fitB,150),
   note:`${A.manager}’s thinnest spot was ${worstUnitBefore(A).k}, ${B.manager}’s was ${worstUnitBefore(B).k}.${steep?` ${steep[0]} is the steepest cliff in this league — ${Math.round(steep[1]*100)}% falls away between the last starter and the next man up.`:''}`});

  const usageReady=USAGE.ready;
  if(usageReady){
   const trendScore=side=>side.in.reduce((n,e)=>{
    const u=usageOfEntry(e);if(!u||!u.recent||!u.season)return n;
    const d=[u.recent.snap-u.season.snap,u.recent.target-u.season.target,u.recent.carryShare-u.season.carryShare].filter(Number.isFinite);
    return n+(d.length?Math.max(...d):0);
   },0);
   const tA=trendScore(A),tB=trendScore(B);
   const best=side=>side.in.map(usageOfEntry).filter(u=>u&&u.recent).map(u=>shareLine(u)).filter(Boolean)[0]||'';
   if(Math.abs(tA)+Math.abs(tB)>0)factors.push({label:'Opportunity trend',lean:lean(tA,tB,.03),
    note:[best(A)?`${A.manager} gets ${best(A)}`:'',best(B)?`${B.manager} gets ${best(B)}`:''].filter(Boolean).join('; ')+'.'});
  }

  const aboveRep=side=>side.in.reduce((n,e)=>{const rep=replacementFor(hjPlayerPosition(e)),v=valueOf(e);return n+(rep&&Number.isFinite(v)?v-rep.value:0)},0);
  const arA=aboveRep(A),arB=aboveRep(B);
  if(arA||arB)factors.push({label:'Above the wire',lean:lean(arA,arB,300),
   note:`Measured against the best free agent at each position: ${A.manager} ${arA>=0?'+':'−'}${money(Math.abs(arA))}, ${B.manager} ${arB>=0?'+':'−'}${money(Math.abs(arB))}.`});

  const thinAt=side=>Object.entries(MINIMUMS).filter(([pos,min])=>!['K','D/ST'].includes(pos)&&(side.countsAfter[pos]||0)<=min).map(([pos])=>pos);
  const depthScore=side=>-thinAt(side).length;
  const thinA=thinAt(A),thinB=thinAt(B);
  factors.push({label:'Depth left behind',lean:lean(depthScore(A),depthScore(B),0),
   note:!thinA.length&&!thinB.length?'Both rosters keep cover at every spot.':[thinA.length?`${A.manager} is bare at ${thinA.join(', ')}`:'',thinB.length?`${B.manager} is bare at ${thinB.join(', ')}`:''].filter(Boolean).join('; ')+'.'});

  const riskScore=side=>side.in.reduce((n,e)=>{const c=injuryOf(e);return n+(INJURED.has(c)?2:c==='QUESTIONABLE'?1:0)+(onBye(e)?1:0)},0);
  const riskWho=side=>side.in.filter(e=>{const c=injuryOf(e);return INJURED.has(c)||c==='QUESTIONABLE'||onBye(e)}).map(entryName);
  const rA=riskWho(A),rB=riskWho(B);
  factors.push({label:'Availability risk',lean:lean(-riskScore(A),-riskScore(B),0),
   note:!rA.length&&!rB.length?'Everyone involved is available.':[rA.length?`${A.manager} takes on ${rA.join(' and ')}`:'',rB.length?`${B.manager} takes on ${rB.join(' and ')}`:''].filter(Boolean).join('; ')+'.'});

  const formScore=side=>side.in.reduce((n,e)=>{const r=marketRow(e);return n+(r&&Number.isFinite(r.trend30)?r.trend30:0)},0)
   -side.out.reduce((n,e)=>{const r=marketRow(e);return n+(r&&Number.isFinite(r.trend30)?r.trend30:0)},0);
  factors.push({label:'Market form',lean:lean(formScore(A),formScore(B),120),
   note:'Which side ends up holding the players the market is moving toward.'});

  const gradeAvg=list=>{const g=list.map(gradeOf).filter(Number.isFinite);return g.length?g.reduce((a,b)=>a+b,0)/g.length:null};
  const gA=gradeAvg(A.in),gB=gradeAvg(B.in);
  if(Number.isFinite(gA)&&Number.isFinite(gB))factors.push({label:'Play quality (PFF)',lean:lean(gA,gB,2),
   note:`${A.manager} receives a ${gA.toFixed(1)} average grade, ${B.manager} a ${gB.toFixed(1)}.`});

  const postureFit=side=>{
   if(side.post.key==='contender')return side.weekReady?side.weekDelta:side.lineupDelta;
   if(side.post.key==='fading')return side.valueDelta/400;
   return side.lineupDelta;
  };
  if(A.post.key!=='preseason'&&B.post.key!=='preseason')factors.push({label:'Fits the season',lean:lean(postureFit(A),postureFit(B),.8),
   note:`${A.manager} is ${A.post.label.toLowerCase()}; ${B.manager} is ${B.post.label.toLowerCase()}.`});

  /* --- the written case for and against, per manager --- */
  const caseFor=side=>{
   const out=[],gain=unitGain(side)[0],weak=worstUnitBefore(side);
   if(side.valueDelta>0)out.push(`Wins the price by ${money(side.valueDelta)} in market value.`);
   if(side.lineupDelta>.5)out.push(`Rest-of-season starters go up ${pts(side.lineupDelta)} projected points.`);
   if(side.weekReady&&side.weekDelta>.3)out.push(`Starts ${pts(side.weekDelta)} more points in Week ${week()} — the help is immediate.`);
   if(gain&&gain.d>200)out.push(`${gain.k==='FLEX'?'Flex':gain.k} improves by ${money(gain.d)}${gain.k===weak.k?' — the thinnest spot on the roster':''}.`);
   if(side.rankBefore-side.rankAfter>0)out.push(`Climbs from #${side.rankBefore} to #${side.rankAfter} in league roster value.`);
   if(side.stand&&played(side.stand)>=3&&Number.isFinite(side.stand.luck)&&side.stand.luck<=-.8)out.push(`At ${side.stand.w}–${side.stand.l} the record is ${pts(Math.abs(side.stand.luck))} wins worse than the scoring deserves — the roster is better than the standings say, so pushing now is reasonable.`);
   if(side.stand&&played(side.stand)>=3&&Number.isFinite(side.stand.remainingSOSRank)&&side.stand.remainingSOSRank<=3)out.push(`The run-in is the ${side.stand.remainingSOSRank===1?'toughest':`${ordinal(side.stand.remainingSOSRank)} toughest`} left in the league, so a stronger starting lineup matters more than bench cover.`);
   side.in.forEach(e=>{
    const r=marketRow(e);
    if(r&&Number.isFinite(r.trend30)&&r.trend30<=-Math.max(120,r.value*.03))out.push(`${entryName(e)} is down ${money(Math.abs(r.trend30))} in 30 days — this is the cheap window if the drop was noise.`);
    const grade=gradeOf(e),val=valueOf(e);
    if(Number.isFinite(grade)&&grade>=78&&Number.isFinite(val)&&r&&r.positionRank>12)out.push(`${entryName(e)} grades ${grade.toFixed(1)} at PFF while priced as ${r.position}${r.positionRank} — the tape is ahead of the market.`);
   });
   side.in.forEach(e=>{
    const u=usageOfEntry(e);
    if(!u||!u.recent||!u.season)return;
    const r=u.recent,se=u.season;
    const climbing=[
     Number.isFinite(r.snap)&&Number.isFinite(se.snap)&&r.snap-se.snap>=.07?`${pct(r.snap)} of snaps over the last three games against ${pct(se.snap)} on the season`:'',
     Number.isFinite(r.carryShare)&&Number.isFinite(se.carryShare)&&r.carryShare-se.carryShare>=.07?`${pct(r.carryShare)} of the carries, up from ${pct(se.carryShare)}`:'',
     Number.isFinite(r.target)&&Number.isFinite(se.target)&&r.target-se.target>=.04?`${pct(r.target)} target share, up from ${pct(se.target)}`:''
    ].filter(Boolean);
    if(climbing.length){const t=trendSentence(e);out.push(`${entryName(e)}'s role is growing — ${climbing[0]}.${t?` ${t}`:''} Usage moves a week or two before the points do.`)}
    const heavy=(Number.isFinite(r.snap)&&r.snap>=.6)||(Number.isFinite(r.target)&&r.target>=.18)||(Number.isFinite(r.carryShare)&&r.carryShare>=.45);
    const median=USAGE.posPPO.get(u.pos);
    if(heavy&&Number.isFinite(r.ppo)&&Number.isFinite(median)&&r.ppo<median*.82)
     out.push(`${entryName(e)} is getting the work but not the points — ${shareLine(u)||'a starter\u2019s role'} at ${r.ppo.toFixed(2)} points per opportunity against a ${median.toFixed(2)} league median. That gap usually closes.`);
    const rep=replacementFor(u.pos),val=valueOf(e);
    if(rep&&Number.isFinite(val)&&val>=rep.value*1.6)
     out.push(`${entryName(e)} is worth ${money(val-rep.value)} more than the best ${u.pos} still on the wire (${rep.name}) — this is a real upgrade, not a lateral move.`);
   });
   if(side.post.key==='fading'&&played(side.stand)>=3&&side.valueDelta>0)out.push(`Nothing is riding on this season, so banking ${money(side.valueDelta)} of surplus is the right shape of deal.`);
   return out.slice(0,5);
  };

  const caseAgainst=side=>{
   const out=[],loss=unitGain(side).at(-1);
   if(side.valueDelta<0)out.push(`Pays ${money(Math.abs(side.valueDelta))} over the odds on market value.`);
   if(side.lineupDelta<-.5)out.push(`Rest-of-season starters drop ${pts(Math.abs(side.lineupDelta))} projected points.`);
   if(side.weekReady&&side.weekDelta<-.3&&side.lineupDelta>0)out.push(`Costs ${pts(Math.abs(side.weekDelta))} in Week ${week()} even though it pays off later — a real problem if the season is tight.`);
   if(side.weekReady&&side.weekDelta>.3&&side.lineupDelta<0)out.push(`Helps this week but costs ${pts(Math.abs(side.lineupDelta))} across the rest of the season.`);
   if(loss&&loss.d<-200)out.push(`${loss.k==='FLEX'?'Flex':loss.k} weakens by ${money(Math.abs(loss.d))}.`);
   for(const [pos,min] of Object.entries(MINIMUMS)){
    const have=side.countsAfter[pos]||0;
    if(have<min){out.push(`Cannot fill ${pos} — only ${have} healthy.`);continue}
    /* Carrying one kicker and one defence is normal; being down to a bare skill group is not. */
    if(have===min&&!['K','D/ST'].includes(pos))out.push(`Leaves exactly ${have} healthy ${pos}${have===1?'':'s'} — one injury and a starting spot is empty.`);
   }
   if(side.stand&&played(side.stand)>=3&&Number.isFinite(side.stand.benchGap)&&side.stand.benchGap>=12&&side.in.length>side.out.length)out.push(`${side.manager} already leaves ${pts(side.stand.benchGap)} a week on the bench, so extra depth is worth less than it looks.`);
   if(side.stand&&played(side.stand)>=3&&Number.isFinite(side.stand.luck)&&side.stand.luck>=.8)out.push(`The ${side.stand.w}–${side.stand.l} record is ${pts(side.stand.luck)} wins better than the scoring — this roster needs real help, not a sideways move.`);
   side.in.forEach(e=>{
    const u=usageOfEntry(e);
    if(u&&u.recent&&u.season){
     const r=u.recent,se=u.season;
     const slipping=[
      Number.isFinite(r.snap)&&Number.isFinite(se.snap)&&se.snap-r.snap>=.08?`snaps down to ${pct(r.snap)} from ${pct(se.snap)}`:'',
      Number.isFinite(r.carryShare)&&Number.isFinite(se.carryShare)&&se.carryShare-r.carryShare>=.08?`carry share down to ${pct(r.carryShare)} from ${pct(se.carryShare)}`:'',
      Number.isFinite(r.target)&&Number.isFinite(se.target)&&se.target-r.target>=.05?`target share down to ${pct(r.target)} from ${pct(se.target)}`:''
     ].filter(Boolean);
     if(slipping.length){const t=trendSentence(e);out.push(`${entryName(e)}'s role is shrinking — ${slipping[0]}.${t?` ${t}`:''}`)}
     if(Number.isFinite(se.tdShare)&&se.tdShare>=.45&&se.games>=3)
      out.push(`${Math.round(se.tdShare*100)}% of ${entryName(e)}'s points have come from touchdowns${Number.isFinite(se.touches)?` on ${Math.round(se.touches)} touches`:''} — that rate is the first thing to regress.`);
     const rep=replacementFor(u.pos),val=valueOf(e);
     if(rep&&Number.isFinite(val)&&val<=rep.value*1.15)
      out.push(`${entryName(e)} is priced within touching distance of ${rep.name}, who is sitting on the wire — paying a real asset for that is the wrong trade.`);
    }
    const code=injuryOf(e);
    if(code&&code!=='ACTIVE')out.push(`${entryName(e)} is ${injuryLabel(code)||'carrying a designation'} right now.`);
    if(onBye(e))out.push(`${entryName(e)} has no game this week.`);
    const r=marketRow(e);
    if(r&&Number.isFinite(r.trend30)&&r.trend30>=Math.max(150,r.value*.04))out.push(`${entryName(e)} is up ${money(r.trend30)} in 30 days — you are buying at the top of his range.`);
    const grade=gradeOf(e);
    if(Number.isFinite(grade)&&grade<62&&r&&r.positionRank<=18)out.push(`${entryName(e)} is priced as ${r.position}${r.positionRank} on a ${grade.toFixed(1)} PFF grade — the market is ahead of the tape.`);
    const mine=usageOfEntry(e),line=shareLine(mine);
    competition(e).forEach(rival=>{
     const theirs=usageFor({name:rival.name,position:rival.position,team:rival.team}),rivalLine=shareLine(theirs);
     const hurt=injuryMap().get(rival.espnId);
     const last=rival.name.split(' ').slice(-1)[0];
     if(hurt){
      out.push(`${entryName(e)}${line?` is on ${line}`:' is seeing the work'} while ${rival.name} is ${injuryLabel(hurt)||'out'}${rivalLine?` — ${last} was on ${rivalLine}`:''}. That share is borrowed, and it goes back when he does.`);
     }else if(line||rivalLine){
      out.push(`${rival.team} ${rival.position} room is shared — ${entryName(e)}${line?` on ${line}`:''}; ${rival.name}${rivalLine?` on ${rivalLine}`:` at ${money(rival.value)}`}.`);
     }else{
      out.push(`${entryName(e)} shares a ${rival.team} ${rival.position} room with ${rival.name} (${money(rival.value)}) — the workload is not his alone.`);
     }
    });
   });
   return out.slice(0,5);
  };

  return {rows,factors,cases:rows.map(side=>({key:side.key,manager:side.manager,post:side.post,stand:side.stand,for:caseFor(side),against:caseAgainst(side)}))};
 }

 /* ---------- verdict ---------- */
 const BAND={even:{label:'Even deal',tone:'even'},slight:{label:'Slight edge',tone:'slight'},clear:{label:'Clear edge',tone:'clear'},lopsided:{label:'Lopsided',tone:'bad'},empty:{label:'Build a deal',tone:'even'}};

 function verdict(m){
  const info=BAND[m.band];
  const total=m.outA+m.outB;
  /* An empty deal sits evenly rather than showing one side at the minimum width. */
  const aw=total>0?clamp(100*m.outA/total,6,94):50,bw=100-aw;
  /* The needle runs from "B wins big" on the left to "A wins big" on the right. */
  const needle=clamp(50+(m.net/Math.max(m.outA,m.outB,1))*140,3,97);
  const headline=m.band==='empty'?'Pick players from each side':m.band==='even'?'Straight up — neither side is buying value'
   :`${E(m.sides.find(s=>s.key===m.winner).manager)} wins the value by ${money(Math.abs(m.net))}`;
  return `<section class="td-verdict tone-${info.tone}">
   <div class="td-verdict-top">
    <span class="td-band">${E(info.label)}</span>
    <h3>${headline}</h3>
    <p>${m.band==='empty'?'Market Value is the currency; lineup impact, roster fit and depth are scored underneath.':`${money(m.outA)} out from ${E(m.sides[0].manager)} against ${money(m.outB)} out from ${E(m.sides[1].manager)} — a ${(m.gap*100).toFixed(1)}% gap.`}</p>
   </div>
   <div class="td-split" role="img" aria-label="Value each side sends">
    <span class="a" style="width:${aw.toFixed(1)}%"><i>${E(m.sides[0].manager)}</i><b>${money(m.outA)}</b></span>
    <span class="b" style="width:${bw.toFixed(1)}%"><i>${E(m.sides[1].manager)}</i><b>${money(m.outB)}</b></span>
   </div>
   <div class="td-gauge">
    <span class="td-gauge-end">${E(m.sides[1].manager)} wins</span>
    <div class="td-gauge-track"><i class="td-gauge-fair"></i><i class="td-gauge-pin" style="left:${needle.toFixed(1)}%"></i></div>
    <span class="td-gauge-end right">${E(m.sides[0].manager)} wins</span>
   </div>
  </section>`;
 }

 /* ---------- impact ---------- */
 /* Grey is what the manager has today; green or red is what the deal does to it.
    The rank beside each bar is where that position sits in the league, which is
    what actually tells you whether it is a need. */
 function unitBars(side,m){
  const scale=Math.max(1,...m.sides.flatMap(x=>UNITS.map(u=>Math.max(x.unitsBefore[u]||0,x.unitsAfter[u]||0))));
  const w=v=>`${(100*Math.max(0,v)/scale).toFixed(1)}%`;
  const rankTone=r=>!Number.isFinite(r)?'':r<=3?'is-strong':r>=Math.max(2,side.teamCount-2)?'is-weak':'';
  return `<div class="td-units">
   <div class="td-units-key"><i class="key-before"></i><span>Today</span><i class="key-up"></i><span>Added</span><i class="key-down"></i><span>Left with</span><span class="td-units-rankkey">rank in league</span></div>
   ${UNITS.map(key=>{
   const before=side.unitsBefore[key]||0,after=side.unitsAfter[key]||0,d=after-before;
   const rb=side.unitRankBefore?.[key],ra=side.unitRankAfter?.[key];
   const moved=Number.isFinite(rb)&&Number.isFinite(ra)&&rb!==ra;
   return `<div class="td-unit${d>1?' is-up':d<-1?' is-down':' is-same'}">
    <span class="td-unit-name">${key==='FLEX'?'FX':key}</span>
    <span class="td-unit-rank ${rankTone(rb)}">${Number.isFinite(rb)?'#'+rb:'—'}${moved?`<em>→ #${ra}</em>`:''}</span>
    <div class="td-unit-track">
     ${d>1
      /* A gain: today's value in grey, the addition sticking out past it in green. */
      ?`<i class="base" style="width:${w(before)}"></i><i class="gain" style="left:${w(before)};width:${w(d)}"></i>`
      :d<-1
      /* A loss: what is left in red, and the part being given up sticking out in grey. */
      ?`<i class="loss" style="width:${w(after)}"></i><i class="gone" style="left:${w(after)};width:${w(-d)}"></i>`
      :`<i class="base" style="width:${w(before)}"></i>`}
    </div>
    <span class="td-unit-delta">${Math.abs(d)<1?money(before):`${d>0?'+':'−'}${money(Math.abs(d))}`}</span>
   </div>`;
  }).join('')}</div>`;
 }

 function impact(side,m){
  const rankMove=side.rankBefore-side.rankAfter;
  const lift=side.lineupDelta;
  return `<section class="td-impact">
   <div class="td-impact-head">${av(side.manager,'td-av-sm')}<b>${E(side.manager)}</b><span class="td-impact-net ${side.valueDelta>0?'is-up':side.valueDelta<0?'is-down':''}">${side.valueDelta>0?'+':''}${money(side.valueDelta)} value</span></div>
   <div class="td-metrics">
    <div class="td-metric"><small>Roster value · ${scopeNow()==='all'?'all players':'starters'}</small><b>${money(side.marketAfter)}</b><i class="${side.marketAfter>side.marketBefore?'is-up':side.marketAfter<side.marketBefore?'is-down':''}">${money(side.marketBefore)} → ${money(side.marketAfter)}</i></div>
    <div class="td-metric"><small>League rank</small><b>#${side.rankAfter}</b><i class="${rankMove>0?'is-up':rankMove<0?'is-down':''}">${rankMove===0?'no change':`${rankMove>0?'▲':'▼'} ${Math.abs(rankMove)} from #${side.rankBefore}`}</i></div>
    <div class="td-metric"><small>Starting lineup</small><b>${pts(side.lineupAfter.total)}</b><i class="${lift>.05?'is-up':lift<-.05?'is-down':''}">${Math.abs(lift)<.05?'unchanged':`${lift>0?'+':'−'}${pts(Math.abs(lift))} projected`}</i></div>
   </div>
   ${unitBars(side,m)}
  </section>`;
 }

 /* ---------- extras ---------- */
 function extras(m){
  const sweet=sweetener(m),risks=flags(m);
  const movers=[...m.give,...m.take].map(e=>({e,row:marketRow(e)})).filter(x=>x.row&&Number.isFinite(x.row.trend30)&&Math.abs(x.row.trend30)>=Math.max(60,x.row.value*.02));
  if(!sweet&&!risks.length&&!movers.length)return '';
  const parts=[];
  if(sweet)parts.push(`<div class="td-sweet"><span class="td-extra-tag">Balance it</span><p>Add <b>${E(entryName(sweet.entry))}</b> (${money(sweet.value)}) from ${E(sweet.fromName)} and the two sides land within a few hundred of each other.<button type="button" class="td-sweet-add" data-td-toggle="${sweet.from}:${E(entryId(sweet.entry))}">Add to the deal</button></p></div>`);
  if(movers.length)parts.push(`<div class="td-movers"><span class="td-extra-tag">Market form</span><ul>${movers.map(x=>`<li class="${x.row.trend30>0?'is-up':'is-down'}"><b>${E(entryName(x.e))}</b> is ${x.row.trend30>0?'up':'down'} ${money(Math.abs(x.row.trend30))} in 30 days — ${x.row.trend30>0?'you are paying the new price':'a possible buy-low'}.</li>`).join('')}</ul></div>`);
  if(risks.length)parts.push(`<div class="td-risks"><span class="td-extra-tag">Watch out</span><ul>${risks.map(f=>`<li class="tone-${f.tone}">${E(f.text)}</li>`).join('')}</ul></div>`);
  return `<section class="td-extras">${parts.join('')}</section>`;
 }

 /* ---------- analysis panel ---------- */
 function scorecard(a){
  return `<div class="td-score"><div class="td-score-key"><span>${E(a.rows[0].manager)}</span><i aria-hidden="true">◄ ►</i><span>${E(a.rows[1].manager)}</span></div>${a.factors.map(f=>`<div class="td-score-row lean-${f.lean}">
   <span class="td-score-label">${E(f.label)}</span>
   <div class="td-score-meter"><i class="a"></i><i class="dot"></i><i class="b"></i></div>
   <span class="td-score-note">${E(f.note)}</span>
  </div>`).join('')}</div>`;
 }

 function caseCard(c){
  const s=c.stand;
  const record=s?`${s.w}–${s.l}`:'';
  const odds=s&&Number.isFinite(s.playoffOdds)?`${Math.round(s.playoffOdds)}% playoff odds`:s&&Number.isFinite(s.power)?`power ${Math.round(s.power)}`:'';
  const form=s&&Number.isFinite(s.last3Avg)?`${pts(s.last3Avg)} last three`:'';
  return `<div class="td-case">
   <div class="td-case-head">${av(c.manager,'td-av-sm')}<b>${E(c.manager)}</b><span class="td-post td-post-${c.post.key}">${E(c.post.label)}</span></div>
   <div class="td-case-meta">${[record,odds,form].filter(Boolean).map(x=>`<span>${E(x)}</span>`).join('')}</div>
   <div class="td-case-cols">
    <div class="td-case-col is-for"><h5>Why it makes sense</h5>${c.for.length?`<ul>${c.for.map(x=>`<li>${E(x)}</li>`).join('')}</ul>`:'<p class="td-empty">Nothing here argues for it.</p>'}</div>
    <div class="td-case-col is-against"><h5>Why it might not</h5>${c.against.length?`<ul>${c.against.map(x=>`<li>${E(x)}</li>`).join('')}</ul>`:'<p class="td-empty">No red flags found.</p>'}</div>
   </div>
  </div>`;
 }

 function usagePanel(m){
  const strips=[...m.take.map(e=>({e,to:m.sides[0].manager})),...m.give.map(e=>({e,to:m.sides[1].manager}))]
   .map(x=>usageStrip(x.e,x.to)).filter(Boolean);
  if(!strips.length)return '';
  return `<div class="td-usage-block"><h4>Usage, week by week</h4><p>Snap share, the touches themselves, and the share of the team they represent — the numbers that say whether a role is real before the points catch up.</p><div class="td-usage-list">${strips.join('')}</div></div>`;
 }

 function analysisPanel(m){
  const a=analyse(m);
  if(!a)return '';
  return `<section class="td-analysis">
   <div class="td-analysis-head"><h3>Beyond the price</h3><p>Scored from this league’s own record, schedule, projections, grades, snap counts and target shares. The bar leans toward whoever the factor favours.</p><p class="td-timing"><b>Week ${week()}.</b> ${E(timingNote().copy)}</p></div>
   ${scorecard(a)}
   ${usagePanel(m)}
   <div class="td-cases">${a.cases.map(caseCard).join('')}</div>
  </section>`;
 }

 /* ---------- finder ---------- */
 function finderPanel(){
  const found=HJTD.finder&&HJTD.finder.from===HJTD.a&&HJTD.finder.scope===HJTD.scope?HJTD.finder:null;
  const me=managerOf(teamById(HJTD.a));
  const options=[`<option value="all"${HJTD.scope==='all'?' selected':''}>Every manager</option>`]
   .concat(teams().filter(t=>String(t.id)!==String(HJTD.a)).map(t=>`<option value="${E(t.id)}"${String(HJTD.scope)===String(t.id)?' selected':''}>${E(managerOf(t))}</option>`)).join('');
  const controls=`<div class="td-finder-controls">
    <label class="td-finder-who"><span>Trade with</span><select data-td-scope aria-label="Which manager to scan">${options}</select></label>
    <button type="button" class="td-run" data-td-find>${found?'Scan again':'Find me a trade'}</button>
   </div>`;
  if(!found)return `<section class="td-finder"><div class="td-finder-head"><h3>Trade finder</h3><p>Scans every one-for-one and two-for-one that lifts <b>${E(me)}</b>’s starting lineup without breaking either roster.</p></div>${controls}<p class="td-empty">No scan yet.</p></section>`;
  if(!found.rows.length)return `<section class="td-finder"><div class="td-finder-head"><h3>Trade finder</h3></div>${controls}<p class="td-empty">Nothing clean came back from ${found.scanned} roster${found.scanned===1?'':'s'}. Try the whole league, or loosen up and build one by hand.</p></section>`;
  return `<section class="td-finder"><div class="td-finder-head"><h3>Trade finder</h3><p>${found.rows.length} deal${found.rows.length===1?'':'s'} from ${found.scanned} roster${found.scanned===1?'':'s'}, best first. Deals that help both teams are marked.</p></div>${controls}
   <div class="td-finds">${found.rows.map((r,i)=>`<article class="td-find${r.mutual?' is-mutual':''}">
    <div class="td-find-rank">${i+1}</div>
    <div class="td-find-body">
     <div class="td-find-head">${av(r.manager,'td-av-sm')}<b>${E(r.manager)}</b><span class="td-tag ${r.tone==='good'?'is-good':r.tone==='bad'?'is-bad':''}">${r.tone==='good'?'Helps both':r.tone==='even'?'Fair ask':'Tough sell'}</span></div>
     <div class="td-find-legs">
      <div class="leg out"><small>You send</small>${r.out.map(e=>`<span>${E(entryName(e))} <i>${money(valueOf(e))}</i></span>`).join('')}</div>
      <div class="leg arrow">⇄</div>
      <div class="leg in"><small>You get</small>${r.inc.map(e=>`<span>${E(entryName(e))} <i>${money(valueOf(e))}</i></span>`).join('')}</div>
     </div>
     <div class="td-find-foot"><span class="is-up">+${pts(r.myGain)} to your lineup</span><span class="${r.theirGain>0?'is-up':'is-down'}">${r.theirGain>0?'+':'−'}${pts(Math.abs(r.theirGain))} to theirs</span><span>${(r.gap*100).toFixed(0)}% value gap</span></div>
    </div>
    <button type="button" class="td-find-load" data-td-load="${i}">Open</button>
   </article>`).join('')}</div>
  </section>`;
 }

 /* ---------- shell ---------- */
 function toolbar(){
  const views=[['dashboard','Dashboard'],['compare','Compare'],['trade','Trade Desk']];
  const modes=[['build','Builder'],['finder','Finder']];
  const scopes=[['all','All Players'],['starters','Starters']];
  return `<div class="hj15-toolbar td-toolbar">
   <div class="hj15-group">${views.map(([id,label])=>`<button type="button" class="hj15-toggle${id==='trade'?' active':''}" data-hq-strength-view="${id}" aria-pressed="${id==='trade'}">${label}</button>`).join('')}</div>
   <div class="hj15-group">${modes.map(([id,label])=>`<button type="button" class="hj15-toggle${HJTD.mode===id?' active':''}" data-td-mode="${id}" aria-pressed="${HJTD.mode===id}">${label}</button>`).join('')}</div>
   <div class="hj15-group">${scopes.map(([id,label])=>`<button type="button" class="hj15-toggle${scopeNow()===id?' active':''}" data-hj6-scope="${id}" aria-pressed="${scopeNow()===id}" title="Roster value and league rank use this basis, the same as the Dashboard.">${label}</button>`).join('')}</div>
  </div>`;
 }

 function shell(){
  if(!window.HJMV?.ready){window.HJMV?.load?.();return `<section class="hq-module hj15-shell td-shell"><div class="hq-module-head"><h3 class="hq-module-title">Trade Desk</h3></div>${toolbar()}<div class="hq-empty">Loading market values…</div></section>`}
  if(!ensureSides())return `<section class="hq-module hj15-shell td-shell"><div class="hq-module-head"><h3 class="hq-module-title">Trade Desk</h3></div>${toolbar()}<div class="hq-empty">League rosters are still loading.</div></section>`;
  warmWeek();ensureUsage();
  const m=model();
  const body=HJTD.mode==='finder'?finderPanel()
   :`${verdict(m)}<div class="td-board">${sideColumn(m.sides[0],m)}<div class="td-mid"><button type="button" class="td-swap" data-td-swap aria-label="Swap sides">⇄</button><button type="button" class="td-clear" data-td-clear>Clear</button></div>${sideColumn(m.sides[1],m)}</div><div class="td-impacts">${m.sides.map(s=>impact(s,m)).join('')}</div>${extras(m)}${analysisPanel(m)}`;
  return `<section class="hq-module hj15-shell td-shell"><div class="hq-module-head"><h3 class="hq-module-title">Trade Desk</h3><span class="hq-module-note">Priced on Market Value</span></div>${toolbar()}${body}</section>`;
 }

 /* ---------- wiring ---------- */
 function rerender(){if(typeof hjRerenderStrength==='function')hjRerenderStrength()}

 function warmWeek(){
  if(typeof hj6LoadWeek!=='function'||HJTD._warm)return;
  HJTD._warm=true;
  try{Promise.resolve(hj6LoadWeek(HJ_LEAGUE_STATE?.data)).then(()=>{if(HJ_HQ_STATE?.activeTab==='strength'&&HJ_STRENGTH_STATE.view==='trade')rerender()}).catch(()=>{})}catch(_){ }
 }

 function install(){
  if(typeof hjStrengthHTML!=='function')return;
  const base=hjStrengthHTML;
  window.hjStrengthHTML=hjStrengthHTML=function(data){
   if(HJ_STRENGTH_STATE.view==='trade')return shell();
   const html=String(base.apply(this,arguments));
   /* The Trade Desk control joins the view group on every other screen. */
   if(/data-hq-strength-view="trade"/.test(html))return html;
   return html.replace(/(<button[^>]*data-hq-strength-view="compare"[^>]*>[\s\S]*?<\/button>)/,
    (mm)=>mm+'<button type="button" class="hj15-toggle" data-hq-strength-view="trade" aria-pressed="false">Trade Desk</button>');
  };

  const root=document.querySelector('#league-hq-tools');
  if(!root||root.dataset.tdBound)return;
  root.dataset.tdBound='1';

  root.addEventListener('click',event=>{
   const t=event.target;
   const toggle=t.closest?.('[data-td-toggle]');
   if(toggle){
    event.preventDefault();event.stopPropagation();
    const [side,id]=String(toggle.dataset.tdToggle).split(':');
    const set=side==='a'?HJTD.give:HJTD.get;
    set.has(id)?set.delete(id):set.add(id);
    rerender();return;
   }
   const mode=t.closest?.('[data-td-mode]');
   if(mode){event.preventDefault();event.stopPropagation();HJTD.mode=mode.dataset.tdMode;rerender();return}

   if(t.closest?.('[data-td-find]')){
    event.preventDefault();event.stopPropagation();
    try{finderRun()}catch(error){console.warn('Trade finder unavailable',error);HJTD.finder={at:Date.now(),scope:HJTD.scope,from:HJTD.a,rows:[],scanned:0}}
    rerender();return;
   }
   const load=t.closest?.('[data-td-load]');
   if(load){
    event.preventDefault();event.stopPropagation();
    const row=HJTD.finder?.rows?.[Number(load.dataset.tdLoad)];
    if(row){HJTD.b=String(row.team.id);HJTD.give=new Set(row.out.map(entryId));HJTD.get=new Set(row.inc.map(entryId));HJTD.mode='build'}
    rerender();return;
   }
   if(t.closest?.('[data-td-swap]')){
    event.preventDefault();event.stopPropagation();
    const a=HJTD.a,give=HJTD.give;HJTD.a=HJTD.b;HJTD.b=a;HJTD.give=HJTD.get;HJTD.get=give;HJTD.finder=null;rerender();return;
   }
   if(t.closest?.('[data-td-clear]')){
    event.preventDefault();event.stopPropagation();HJTD.give=new Set();HJTD.get=new Set();rerender();return;
   }
  },true);

  root.addEventListener('change',event=>{
   const scope=event.target.closest?.('[data-td-scope]');
   if(scope){HJTD.scope=scope.value;HJTD.finder=null;rerender();return}
   const sel=event.target.closest?.('[data-td-team]');
   if(!sel)return;
   const side=sel.dataset.tdTeam;
   if(side==='a'){HJTD.a=sel.value;HJTD.give=new Set()}else{HJTD.b=sel.value;HJTD.get=new Set()}
   if(String(HJTD.a)===String(HJTD.b)){const other=teams().find(t=>String(t.id)!==String(HJTD.a));if(other)HJTD.b=String(other.id)}
   HJTD.finder=null;rerender();
  });

  let typing=null;
  root.addEventListener('input',event=>{
   const box=event.target.closest?.('[data-td-query]');
   if(!box)return;
   HJTD.pick=box.dataset.tdQuery;HJTD.query=box.value;
   clearTimeout(typing);
   typing=setTimeout(()=>{
    rerender();
    const next=document.querySelector(`[data-td-query="${HJTD.pick}"]`);
    if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length)}
   },220);
  });

  document.addEventListener('hj:market-updated',()=>{if(HJ_HQ_STATE?.activeTab==='strength'&&HJ_STRENGTH_STATE.view==='trade')rerender()});
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
