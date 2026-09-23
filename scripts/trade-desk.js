/* =====================================================================
   TRADE DESK
   A third view in Roster Strength, beside Dashboard and Compare.
   Market Value drives the numbers; everything else — starting-lineup
   impact, positional need, injuries, usage, schedule and risk — is the
   written analysis layered on top.
   ===================================================================== */
(function(){
 if(window.HJTD)return;

 const POS=['QB','RB','WR','TE'];
 const LINEUP=[['QB',1],['RB',2],['WR',2],['TE',1]];
 const FLEXABLE=['RB','WR','TE'];
 const UNITS=['QB','RB','WR','TE'];

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
    matches what Roster Strength shows; Market Value is what the deal is measured in. */
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
 /* Four units only — QB, RB, WR, TE. Under the Starters scope the flex
    starter counts toward his own position. */
 function marketByUnit(list){
  const entries=dashEntries(list),roles=dashLineup(entries),all=scopeNow()==='all';
  const of=pos=>roles.filter(x=>x.role===pos||(x.role==='FLEX'&&hjPlayerPosition(x.entry)===pos)).map(x=>x.entry);
  return Object.fromEntries(UNITS.map(k=>[k,sumValues(all?entries.filter(e=>hjPlayerPosition(e)===k):of(k))]));
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
  /* Kickers and defences have no market value, so their league rank comes from projections. */
  const special=teams().map(t=>{const list=rosterOf(t.id).filter(e=>!isIR(e));const sum=pos=>list.filter(e=>hjPlayerPosition(e)===pos).reduce((n,e)=>n+(projOf(e)||0),0);return {id:String(t.id),K:sum('K'),'D/ST':sum('D/ST')}});
  sides.forEach(side=>{
   side.specialRank={};
   ['K','D/ST'].forEach(pos=>{const list=special.slice().sort((a,b)=>b[pos]-a[pos]);const at=list.findIndex(r=>r.id===String(side.team?.id));side.specialRank[pos]=at>=0&&list[at][pos]>0?at+1:null});
  });

  const band=!give.length&&!take.length?'empty':gap<.04?'even':gap<.10?'slight':gap<.22?'clear':'wide';
  /* Which side the extra market value lands on. Not a winner — the write-up decides that. */
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
     so a few points across a whole season never outweighs the value given up. */
  const lift=side.lineupDelta/Math.max(side.lineupBefore.total,1);
  const score=edge*100+clamp(lift*100*.8,-12,12);
  const letter=score>=18?'A+':score>=11?'A':score>=6?'A−':score>=2.5?'B+':score>=-2.5?'B':score>=-6?'B−':score>=-11?'C':score>=-18?'D':'F';
  const tone=score>=6?'good':score>=-6?'even':'bad';
  return {letter,tone,score};
 }

 /* ---------- balancing the deal ----------
    Several ways to close the gap: the side ahead adds one player or two
    cheaper ones, or the side behind keeps one of the pieces it was sending. */
 function balanceOptions(m){
  if(!m.winner||m.band==='even'||m.band==='empty')return null;
  const ahead=m.sides.find(s=>s.key===m.winner),behind=m.sides.find(s=>s.key!==m.winner);
  const holder=m.winner==='a'?m.aAll:m.bAll;
  const already=new Set([...m.give,...m.take].map(entryId));
  const target=Math.abs(m.net),base=Math.max(m.outA,m.outB,1);
  const pool=holder.filter(e=>!already.has(entryId(e))&&!isIR(e)&&Number.isFinite(valueOf(e))&&valueOf(e)>0).map(e=>({e,v:valueOf(e)}));
  const gapAfter=v=>Math.abs(target-v)/base;
  const opts=[];
  pool.forEach(x=>{if(gapAfter(x.v)<=.12)opts.push({kind:'add',from:ahead,to:behind,entries:[x.e],value:x.v,gap:gapAfter(x.v)})});
  for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){const v=pool[i].v+pool[j].v;if(pool[i].v<target&&pool[j].v<target&&gapAfter(v)<=.08)opts.push({kind:'add',from:ahead,to:behind,entries:[pool[i].e,pool[j].e],value:v,gap:gapAfter(v)})}
  behind.out.forEach(e=>{const v=valueOf(e);if(Number.isFinite(v)&&v>0&&behind.out.length>1&&gapAfter(v)<=.12)opts.push({kind:'keep',from:behind,to:ahead,entries:[e],value:v,gap:gapAfter(v)})});
  opts.sort((x,y)=>x.gap-y.gap||x.entries.length-y.entries.length);
  const singles=opts.filter(o=>o.kind==='add'&&o.entries.length===1).slice(0,3);
  const pairs=opts.filter(o=>o.kind==='add'&&o.entries.length===2).slice(0,2);
  const keeps=opts.filter(o=>o.kind==='keep').slice(0,2);
  const list=[...singles,...pairs,...keeps];
  return list.length?{target,ahead,behind,options:list}:null;
 }
 function balancePanel(m){
  const bal=balanceOptions(m);
  if(!bal)return '';
  const row=o=>{
   const names=join(o.entries.map(entryName)),val=money(o.value);
   const left=Math.round(Math.abs(bal.target-o.value));
   const text=o.kind==='add'?`<b>${E(o.from.manager)}</b> adds ${E(names)} (${val})`:`<b>${E(o.from.manager)}</b> keeps ${E(names)} (${val})`;
   const btn=`<button type="button" class="td-sweet-add" data-td-toggle="${o.from.key}:${E(o.entries.map(entryId).join(','))}">${o.kind==='add'?(o.entries.length>1?'Add both':'Add '+E(entryName(o.entries[0]).split(' ').slice(-1)[0])):'Keep '+E(entryName(o.entries[0]).split(' ').slice(-1)[0])}</button>`;
   return `<li><span>${text} — the sides land ${money(left)} apart (${(o.gap*100).toFixed(0)}%).</span>${btn}</li>`;
  };
  return `<section class="td-balance"><div class="td-balance-head"><h3>Balance it</h3><p>${money(bal.target)} more market value is landing with ${E(bal.ahead.manager)}. Ways to close it:</p></div><ul>${bal.options.map(row).join('')}</ul></section>`;
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
   out.push({tone:'note',text:`${who} receives the best player in the deal — in a 10-team league the top piece usually matters more than the extra bodies.`});
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
    if(gap>.22)return null;                              // never propose something far off on value
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
 window.hjTdFallback=function(img){const face=img?.closest?.('.td-chip-face,.td-bd-face');if(!face)return;face.innerHTML=`<span class="td-chip-ini">${esc0(face.dataset.ini||'')}</span>`};

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
  const rankOf=pos=>UNITS.includes(pos)?side.unitRankBefore?.[pos]:side.specialRank?.[pos];
  const rankTone=r=>!Number.isFinite(r)?'':r<=3?'is-strong':r>=Math.max(2,side.teamCount-2)?'is-weak':'';
  const list=groups.length?groups.map(g=>{const r=rankOf(g.pos);return `<div class="td-group"><div class="td-group-head"><span>${E(g.pos)}</span>${Number.isFinite(r)?`<b class="${rankTone(r)}" title="Where this ${E(g.pos)} group ranks across the league">#${r} in league</b>`:''}</div>${g.players.map(e=>playerChip(e,{side:key,action:true})).join('')}</div>`}).join(''):'';
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
    Market Value settles the numbers. Everything below answers the harder
    question: does the deal fit each team, the season and the calendar —
    written up from both managers' point of view, from this league's own
    record, projections, grades, weekly stats, snap counts and the NFL
    schedule.
    ===================================================================== */
 const INJURED=new Set(['OUT','DOUBTFUL','INJURY_RESERVE','SUSPENSION','NON_FOOTBALL_INJURY']);
 const injuryOf=entry=>String(hjPlayer(entry)?.injuryStatus||'').toUpperCase().replace(/\s+/g,'_');
 const injuryLabel=code=>({OUT:'out',DOUBTFUL:'doubtful',QUESTIONABLE:'questionable',INJURY_RESERVE:'on IR',SUSPENSION:'suspended',NON_FOOTBALL_INJURY:'unavailable'})[code]||'';
 const onBye=entry=>{try{return Array.isArray(NFL_WEEK1)&&NFL_WEEK1.length>=8&&hjPlayerPosition(entry)!=='D/ST'&&!pcUpcoming(hjPlayerTeam(entry))}catch(_){return false}};
 /* This league plays its playoffs in NFL weeks 15 and 16. */
 const PLAYOFF_WEEKS=[15,16];
 const SEASON_WEEKS=18;
 const T=t=>typeof pcTeam==='function'?pcTeam(t):String(t||'').toUpperCase();
 const baseName=n=>typeof pcBaseName==='function'?pcBaseName(n):String(n||'').toLowerCase().trim();
 const num=v=>(v===''||v==null)?null:(Number.isFinite(Number(v))?Number(v):null);
 const mean=list=>{const c=list.filter(Number.isFinite);return c.length?c.reduce((a,b)=>a+b,0)/c.length:null};
 const pct=v=>Number.isFinite(v)?`${Math.round(v*100)}%`:'';
 const one=v=>Number.isFinite(v)?v.toFixed(1):'—';
 const plural=(n,word)=>`${n} ${word}${n===1?'':'s'}`;
 const join=list=>list.length<=1?list.join(''):`${list.slice(0,-1).join(', ')} and ${list.at(-1)}`;
 const ordinal=n=>{const v=Number(n);if(!Number.isFinite(v))return '';const s=['th','st','nd','rd'][(v%100-v%10!=10)*(v%10<4)*(v%10)];return `${v}${s||'th'}`};

 /* ---------- usage feeds: snaps, target share, carry share, weekly points ----------
    The site already publishes nflverse weekly stats and snap counts, so a
    shared backfield or receiver room can be described with the actual split,
    and a player's floor and ceiling come from what he actually scored. */
 const USAGE={rows:null,snaps:null,ready:false,pending:false,cache:new Map(),teamCarries:new Map(),teamTargets:new Map(),posPPO:new Map(),
  weekRank:new Map(),seasonRank:new Map(),teamQb:new Map(),dvp:new Map(),rostered:null};
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
  USAGE.cache=new Map();USAGE.teamCarries=new Map();USAGE.teamTargets=new Map();USAGE.posPPO=new Map();
  USAGE.weekRank=new Map();USAGE.seasonRank=new Map();USAGE.teamQb=new Map();USAGE.dvp=new Map();
  if(!USAGE.rows)return;
  const ppo={},weekly=new Map(),season=new Map();
  for(const row of USAGE.rows){
   const team=String(row.team||'').toUpperCase(),wk=Number(row.week);
   const pos=String(row.position||row.position_group||'').toUpperCase();
   const name=baseName(row.player_display_name||row.player_name||'');
   if(team&&Number.isFinite(wk)){
    const k=`${team}|${wk}`;
    USAGE.teamCarries.set(k,(USAGE.teamCarries.get(k)||0)+(num(row.carries)||0));
    USAGE.teamTargets.set(k,(USAGE.teamTargets.get(k)||0)+(num(row.targets)||0));
    if(pos==='QB'){const att=num(row.attempts)||0,cur=USAGE.teamQb.get(k);if(!cur||att>cur.att)USAGE.teamQb.set(k,{name:row.player_display_name||'',att})}
   }
   const opps=typeof pcOpportunities==='function'?pcOpportunities(row,pos):0,pts=typeof pcPoints==='function'?pcPoints(row):null;
   if(opps>=4&&Number.isFinite(pts))(ppo[pos]=ppo[pos]||[]).push(pts/opps);
   if(pos&&name&&Number.isFinite(wk)&&Number.isFinite(pts)){
    const wkKey=`${wk}|${pos}`;
    if(!weekly.has(wkKey))weekly.set(wkKey,[]);
    weekly.get(wkKey).push({name,pts});
    const sKey=`${pos}|${name}`,s=season.get(sKey)||{total:0,games:0};
    s.total+=pts;s.games++;season.set(sKey,s);
   }
  }
  for(const [pos,list] of Object.entries(ppo)){list.sort((x,y)=>x-y);USAGE.posPPO.set(pos,list[Math.floor(list.length/2)])}
  weekly.forEach((list,key)=>list.sort((a,b)=>b.pts-a.pts).forEach((x,i)=>USAGE.weekRank.set(`${key}|${x.name}`,i+1)));
  const byPos={};
  season.forEach((s,key)=>{const pos=key.split('|')[0];(byPos[pos]=byPos[pos]||[]).push({key,...s})});
  Object.values(byPos).forEach(list=>list.sort((a,b)=>b.total-a.total).forEach((x,i)=>USAGE.seasonRank.set(x.key,{rank:i+1,of:list.length,total:x.total,games:x.games})));
 }
 function summarise(rows,pos){
  if(!rows.length)return null;
  const n=rows.length;
  const snap=mean(rows.map(r=>{const hit=USAGE.snaps&&typeof pcSnap==='function'?pcSnap(r,USAGE.snaps):null;return num(hit?.offense_pct)}));
  const carryShare=mean(rows.map(r=>{const total=USAGE.teamCarries.get(`${String(r.team||'').toUpperCase()}|${Number(r.week)}`);return total>0?(num(r.carries)||0)/total:null}));
  const targetShare=mean(rows.map(r=>{const own=num(r.target_share);if(Number.isFinite(own))return own;const total=USAGE.teamTargets.get(`${String(r.team||'').toUpperCase()}|${Number(r.week)}`);return total>0?(num(r.targets)||0)/total:null}));
  const touches=rows.reduce((t,r)=>t+(num(r.carries)||0)+(num(r.receptions)||0),0);
  const tds=rows.reduce((t,r)=>t+(num(r.rushing_tds)||0)+(num(r.receiving_tds)||0)+(pos==='QB'?(num(r.passing_tds)||0):0),0);
  const points=rows.reduce((t,r)=>t+(typeof pcPoints==='function'?(pcPoints(r)||0):0),0);
  const opps=rows.reduce((t,r)=>t+(typeof pcOpportunities==='function'?(pcOpportunities(r,pos)||0):0),0);
  return {games:n,snap,target:targetShare,air:mean(rows.map(r=>num(r.air_yards_share))),wopr:mean(rows.map(r=>num(r.wopr))),carryShare,
   carries:mean(rows.map(r=>num(r.carries)||0)),targets:mean(rows.map(r=>num(r.targets)||0)),attempts:mean(rows.map(r=>num(r.attempts)||0)),
   touches,tds,points,opps,ppo:opps>0?points/opps:null,tdShare:points>0?(tds*(pos==='QB'?4:6))/points:null};
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
    const statName=baseName(rows[0].player_display_name||rows[0].player_name||like.name);
    const series=rows.map(r=>{
     const total=USAGE.teamCarries.get(`${String(r.team||'').toUpperCase()}|${Number(r.week)}`);
     const tt=USAGE.teamTargets.get(`${String(r.team||'').toUpperCase()}|${Number(r.week)}`);
     const hit=USAGE.snaps&&typeof pcSnap==='function'?pcSnap(r,USAGE.snaps):null;
     const own=num(r.target_share);
     return {week:Number(r.week),snap:num(hit?.offense_pct),carries:num(r.carries)||0,targets:num(r.targets)||0,attempts:num(r.attempts)||0,
      target:Number.isFinite(own)?own:(tt>0?(num(r.targets)||0)/tt:null),carryShare:total>0?(num(r.carries)||0)/total:null,
      pts:typeof pcPoints==='function'?pcPoints(r):null,team:String(r.team||'').toUpperCase()};
    });
    const weeks=series.slice(-5);
    const points=rows.map(r=>({week:Number(r.week),pts:typeof pcPoints==='function'?pcPoints(r):null,
     rank:USAGE.weekRank.get(`${Number(r.week)}|${pos}|${statName}`)||null}));
    const vals=points.map(p=>p.pts).filter(Number.isFinite);
    const ppg=mean(vals);
    const sd=vals.length>1&&Number.isFinite(ppg)?Math.sqrt(vals.reduce((s,v)=>s+(v-ppg)**2,0)/vals.length):null;
    const boomAt=pos==='QB'||pos==='TE'?5:10,bustAt=pos==='QB'||pos==='TE'?15:30;
    out={pos,season:summarise(rows,pos),recent:summarise(rows.slice(-3),pos),games:rows.length,weeks,series,points,
     ppg,sd,floor:vals.length?Math.min(...vals):null,ceiling:vals.length?Math.max(...vals):null,
     boom:points.filter(p=>p.rank&&p.rank<=boomAt).length,bust:points.filter(p=>Number.isFinite(p.pts)&&(!p.rank||p.rank>bustAt)).length,boomAt,bustAt,
     seasonRank:USAGE.seasonRank.get(`${pos}|${statName}`)||null,
     teams:[...new Set(rows.map(r=>String(r.team||'').toUpperCase()).filter(Boolean))],
     team:String(rows.at(-1).team||like.team||'').toUpperCase()};
   }
  }catch(_){out=null}
  USAGE.cache.set(key,out);return out;
 }
 /* Test hook: lets the harness supply weekly stat and snap feeds offline. */
 HJTD.injectUsage=(rows,snaps)=>{USAGE.rows=rows;USAGE.snaps=snaps;indexUsage();USAGE.ready=Boolean(rows&&rows.length);USAGE.rostered=null;SCHED.sos=new Map()};
 const usageOfEntry=entry=>usageFor({id:entryId(entry),name:entryName(entry),position:hjPlayerPosition(entry),team:hjPlayerTeam(entry)});

 /* A share line for one player, in the terms that actually decide a role. */
 function shareLine(u,which='recent'){
  const s=u&&u[which];
  if(!s)return '';
  const bits=[];
  if(u.pos==='QB'){
   if(Number.isFinite(s.attempts)&&s.attempts>0)bits.push(`${one(s.attempts)} attempts a game`);
   if(Number.isFinite(s.carries)&&s.carries>=2)bits.push(`${one(s.carries)} carries a game`);
   return bits.join(', ');
  }
  if(Number.isFinite(s.snap))bits.push(`${pct(s.snap)} of snaps`);
  if(u.pos==='RB'&&Number.isFinite(s.carryShare))bits.push(`${pct(s.carryShare)} of the carries`);
  if(Number.isFinite(s.target))bits.push(`${pct(s.target)} target share`);
  if(['WR','TE'].includes(u.pos)&&Number.isFinite(s.air))bits.push(`${pct(s.air)} of air yards`);
  return bits.join(', ');
 }
 /* Week by week, in the terms that decide whether a role is real. */
 function usageMetrics(u){
  if(!u||!u.weeks||u.weeks.length<2)return [];
  const rb=u.pos==='RB';
  if(u.pos==='QB')return [
   {key:'attempts',label:'Attempts',fmt:v=>Number.isFinite(v)?String(Math.round(v)):'—',val:w=>w.attempts},
   {key:'carries',label:'Carries',fmt:v=>Number.isFinite(v)?String(Math.round(v)):'—',val:w=>w.carries}
  ].filter(d=>u.weeks.some(w=>Number.isFinite(d.val(w))&&d.val(w)>0));
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
 /* The last three weeks as a sentence, for the written case. */
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
 /* Where the role has moved over the last three games against the season. */
 function roleMoves(u){
  const out={up:[],down:[]};
  if(!u||!u.recent||!u.season||u.games<4)return out;
  const r=u.recent,se=u.season;
  const say=(label,a,b,up,down,fmt)=>{if(!Number.isFinite(a)||!Number.isFinite(b))return;if(a-b>=up)out.up.push(`${label} up to ${fmt(a)} over the last three from ${fmt(b)}`);else if(b-a>=down)out.down.push(`${label} down to ${fmt(a)} over the last three from ${fmt(b)}`)};
  if(u.pos==='QB'){say('attempts',r.attempts,se.attempts,4,4,v=>one(v));say('carries',r.carries,se.carries,2,2,v=>one(v));return out}
  say('snaps',r.snap,se.snap,.07,.08,pct);
  if(u.pos==='RB')say('carry share',r.carryShare,se.carryShare,.07,.08,pct);
  say('target share',r.target,se.target,.04,.05,pct);
  return out;
 }
 /* Has the team's starting quarterback changed? Read straight from who has
    been throwing the passes each week. */
 function qbChange(team){
  team=String(team||'').toUpperCase();
  if(!USAGE.ready||!team)return null;
  const weeks=[...USAGE.teamQb.keys()].filter(k=>k.startsWith(team+'|')).map(k=>Number(k.split('|')[1])).sort((a,b)=>a-b);
  if(weeks.length<3)return null;
  const starter=w=>USAGE.teamQb.get(`${team}|${w}`)?.name||'';
  const now=starter(weeks.at(-1));
  const counts={};weeks.slice(0,-1).forEach(w=>{const n=starter(w);if(n)counts[n]=(counts[n]||0)+1});
  const usual=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
  if(!now||!usual||baseName(now)===baseName(usual))return null;
  let since=weeks.at(-1);
  for(let i=weeks.length-1;i>=0&&baseName(starter(weeks[i]))===baseName(now);i--)since=weeks[i];
  return {team,now,was:usual,since};
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
  if(w<=14)return {phase:'late',copy:'Late in the season contenders pay up for the last piece and the teams that are out should be cashing in. Playoff-week schedules now matter more than season averages.'};
  return {phase:'playoffs',copy:'The playoffs are here — only this week and next count.'};
 }

 /* ---------- NFL schedule: byes, remaining strength of schedule, playoff weeks ---------- */
 const SCHED={map:null,pending:false,byTeam:null,sos:new Map()};
 function ensureSchedule(){
  if(SCHED.map||SCHED.pending||typeof pcLoadSchedules!=='function')return;
  SCHED.pending=true;
  Promise.resolve().then(()=>pcLoadSchedules()).then(map=>{
   SCHED.map=map;SCHED.byTeam=null;SCHED.sos=new Map();SCHED.pending=false;
   if(HJ_HQ_STATE?.activeTab==='strength'&&HJ_STRENGTH_STATE.view==='trade')rerender();
  }).catch(()=>{SCHED.pending=false});
 }
 HJTD.injectSchedule=map=>{SCHED.map=map;SCHED.byTeam=null;SCHED.sos=new Map()};
 function scheduleIndex(){
  if(!SCHED.map)return null;
  if(!SCHED.byTeam){
   SCHED.byTeam=new Map();
   const add=(team,game)=>{if(!SCHED.byTeam.has(team))SCHED.byTeam.set(team,[]);SCHED.byTeam.get(team).push(game)};
   for(const g of SCHED.map.values()){
    if(Number(g.season)!==Number(NFL_SEASON))continue;
    const wk=Number(g.week);if(!Number.isFinite(wk))continue;
    const home=T(g.home_team),away=T(g.away_team);
    if(!home||!away)continue;
    const roof=String(g.roof||'').toLowerCase(),roofWord=roof==='dome'||roof==='closed'?'indoors':roof==='outdoors'||roof==='open'?'outdoors':'';
    const hm=num(g.home_moneyline),am=num(g.away_moneyline);
    add(home,{week:wk,opp:away,home:true,roof:roofWord,line:Number.isFinite(hm)&&Number.isFinite(am)?(hm<am?'favoured':hm>am?'underdog':''):''});
    add(away,{week:wk,opp:home,home:false,roof:roofWord,line:Number.isFinite(hm)&&Number.isFinite(am)?(am<hm?'favoured':am>hm?'underdog':''):''});
   }
   SCHED.byTeam.forEach((list,team)=>{const seen=new Set();SCHED.byTeam.set(team,list.filter(g=>{if(seen.has(g.week))return false;seen.add(g.week);return true}).sort((a,b)=>a.week-b.week))});
  }
  return SCHED.byTeam;
 }
 const teamGames=team=>scheduleIndex()?.get(T(team))||null;
 function byeOf(team){const g=teamGames(team);if(!g||g.length<17)return null;for(let w=1;w<=SEASON_WEEKS;w++)if(!g.some(x=>x.week===w))return w;return null}
 /* Points allowed to a position, per defence, from the same weekly rows. */
 function dvpMap(pos){
  if(!USAGE.ready||typeof pcDvp!=='function')return null;
  if(!USAGE.dvp.has(pos)){let list=[];try{list=pcDvp(USAGE.rows,pos)||[]}catch(_){list=[]}USAGE.dvp.set(pos,{list,map:new Map(list.map(d=>[T(d.defense),d]))})}
  const d=USAGE.dvp.get(pos);
  return d.list.length>=16&&week()>=4?d:null;
 }
 /* Every NFL team's schedule inside a window, ranked by how generous the
    defences are to a position. Rank 1 is the easiest. */
 function windowSos(pos,from,to){
  const key=`${pos}|${from}|${to}`;
  if(SCHED.sos.has(key))return SCHED.sos.get(key);
  let out=null;
  const dvp=dvpMap(pos),index=scheduleIndex();
  if(dvp&&index){
   const rows=[];
   index.forEach((games,team)=>{
    const inWindow=games.filter(g=>g.week>=from&&g.week<=to);
    const hits=inWindow.map(g=>dvp.map.get(g.opp)).filter(Boolean);
    if(hits.length)rows.push({team,games:inWindow.length,avg:hits.reduce((s,d)=>s+d.avg,0)/hits.length});
   });
   rows.sort((a,b)=>b.avg-a.avg);
   out=new Map(rows.map((r,i)=>[r.team,{rank:i+1,of:rows.length,avg:r.avg,games:r.games}]));
  }
  SCHED.sos.set(key,out);return out;
 }
 const allowWord=(rank,of)=>!Number.isFinite(rank)?'':rank===1?'fewest':rank===of?'most':rank<=of/2?`${ordinal(rank)}-fewest`:`${ordinal(of+1-rank)}-most`;
 const cap=str=>str?str.charAt(0).toUpperCase()+str.slice(1):str;
 function scheduleOf(entry){
  const team=T(hjPlayerTeam(entry)),pos=hjPlayerPosition(entry),games=teamGames(team);
  if(!games||!POS.includes(pos))return null;
  const w=week(),dvp=dvpMap(pos);
  const playoffs=PLAYOFF_WEEKS.map(pw=>{
   const g=games.find(x=>x.week===pw);
   if(!g)return {week:pw,bye:true};
   const d=dvp?.map.get(g.opp);
   return {week:pw,opp:g.opp,home:g.home,rank:d?.rank||null,of:dvp?.list.length||null,dvp:d||null,roof:g.roof||'',line:g.line||''};
  });
  return {team,pos,bye:byeOf(team),remaining:games.filter(g=>g.week>=w&&g.week<=SEASON_WEEKS-1).length,
   rest:windowSos(pos,w,SEASON_WEEKS-1)?.get(team)||null,
   po:windowSos(pos,PLAYOFF_WEEKS[0],PLAYOFF_WEEKS.at(-1))?.get(team)||null,playoffs};
 }

 /* ---------- league standings: record, luck, schedule, posture ---------- */
 let standingsCache=null;
 function standingsRows(){
  if(standingsCache)return standingsCache;
  try{const out=typeof buildStandingsAnalytics==='function'?buildStandingsAnalytics():null;standingsCache=Array.isArray(out)?out:(out&&Array.isArray(out.people)?out.people:[])}catch(_){standingsCache=[]}
  return standingsCache;
 }
 const standingFor=manager=>standingsRows().find(p=>String(p.short)===String(manager))||null;
 const played=row=>Number(row?.entries?.length||0);
 /* Season posture decides whether a deal should be judged on this week or on the playoffs. */
 function posture(row){
  if(!row||!played(row))return {key:'preseason',label:'Season not started',copy:''};
  const odds=Number(row.playoffOdds),power=Number(row.power);
  const score=Number.isFinite(odds)?odds:Number.isFinite(power)?power:null;
  if(score===null)return {key:'unknown',label:'Unknown',copy:''};
  if(score>=62)return {key:'contender',label:'Contender',copy:'playing for a title this year'};
  if(score>=32)return {key:'bubble',label:'On the bubble',copy:'a win or two from deciding its season'};
  return {key:'fading',label:'Playing it out',copy:'needing upside more than safety'};
 }
 const recordOf=s=>s&&played(s)?`${s.w}–${s.l}${s.t?`–${s.t}`:''}`:'';
 function standingLine(side){
  const s=side.stand;
  if(!s||played(s)<1)return `${side.manager} has not played a game yet`;
  const bits=[`${side.manager} is ${recordOf(s)}`];
  if(Number.isFinite(s.seed))bits.push(`${ordinal(s.seed)} in the standings`);
  if(Number.isFinite(s.playoffOdds))bits.push(`${Math.round(s.playoffOdds)}% to make the four-team playoff`);
  else if(Number.isFinite(s.power))bits.push(`power score ${Math.round(s.power)}`);
  return bits.join(', ');
 }

 /* Same NFL club, same position, comparable value: the workload is shared. */
 function competition(entry){
  const row=marketRow(entry);
  if(!row||!row.team||!['RB','WR','TE'].includes(row.position))return [];
  return (window.HJMV?.rows||[]).filter(r=>r!==row&&r.team===row.team&&r.position===row.position
    &&r.value>=row.value*.55&&(!Number.isFinite(r.rostered)||r.rostered>=.3))
   .sort((a,b)=>b.value-a.value).slice(0,2);
 }
 let injuryMapCache=null;
 function injuryMap(){
  if(injuryMapCache)return injuryMapCache;
  injuryMapCache=new Map();
  teams().forEach(t=>hjRosterEntries(t).forEach(e=>{const code=injuryOf(e);if(code&&code!=='ACTIVE')injuryMapCache.set(entryId(e),{code,name:entryName(e),pos:hjPlayerPosition(e),team:T(hjPlayerTeam(e))})}));
  return injuryMapCache;
 }
 /* The quarterback throwing to a pass catcher, as far as this league's rosters know him. */
 function teamQbStatus(team){
  team=T(team);
  let best=null;
  teams().forEach(t=>hjRosterEntries(t).forEach(e=>{
   if(hjPlayerPosition(e)!=='QB'||T(hjPlayerTeam(e))!==team)return;
   const v=valueOf(e)||0;
   if(!best||v>best.value)best={name:entryName(e),value:v,code:injuryOf(e),ir:isIR(e)};
  }));
  return best;
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

 /* ---------- player news and NFL injury reports ----------
    Rotowire blurbs through ESPN's fantasy news feed and ESPN's team injury
    report, for every player in the deal and for the teammates whose health
    decides his role. Both are cached for ten minutes and the desk re-renders
    when they land. */
 const NEWS={items:new Map(),fetchedAt:new Map(),pending:new Set(),injuries:new Map(),injPending:new Set()};
 const espnJson=url=>typeof fetchEspnJson==='function'?fetchEspnJson(url):fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json()});
 const stripHtml=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').replace(/^Spin:\s*/i,'').trim();
 const rerenderIfTrade=()=>{if(HJ_HQ_STATE?.activeTab==='strength'&&HJ_STRENGTH_STATE.view==='trade')rerender()};
 function newsItemFrom(raw){
  const text=String(raw?.description||raw?.headline||'').replace(/\s+/g,' ').trim();
  if(!text)return null;
  return {id:String(raw.id||raw.nowId||''),playerId:String(raw.playerId||''),text,spin:stripHtml(raw.story),at:Date.parse(raw.published||raw.lastModified||'')||0};
 }
 /* Everything known about one player right now: fetched items plus the site's own news rail. */
 function newsFor(id){
  const own=NEWS.items.get(String(id))||[];
  const rail=(typeof ffnItems!=='undefined'&&Array.isArray(ffnItems)?ffnItems:[]).filter(i=>String(i.espn_id||'')===String(id))
   .map(i=>({id:String(i.id||''),playerId:String(id),text:String(i.text||i.headline||'').trim(),spin:String(i.spin||'').trim(),at:Date.parse(i.published_at||'')||0}));
  const seen=new Set(),out=[];
  [...own,...rail].filter(i=>i.text).sort((a,b)=>b.at-a.at).forEach(i=>{const k=i.text.slice(0,90).toLowerCase();if(seen.has(k))return;seen.add(k);out.push(i)});
  return out;
 }
 function ensureNews(ids){
  const fresh=Date.now()-10*60*1000;
  const want=[...new Set(ids.map(String).filter(id=>id&&!/^-/.test(id)))].filter(id=>!(NEWS.fetchedAt.get(id)>fresh)&&!NEWS.pending.has(id)).slice(0,40);
  if(!want.length)return;
  want.forEach(id=>NEWS.pending.add(id));
  const params=new URLSearchParams({limit:'80',offset:'0'});
  want.forEach(id=>params.append('playerId',id));
  espnJson(`https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players?${params.toString()}`).then(data=>{
   const feed=Array.isArray(data?.feed)?data.feed:[];
   const by=new Map();want.forEach(id=>by.set(id,[]));
   feed.map(newsItemFrom).filter(Boolean).forEach(item=>{if(by.has(item.playerId))by.get(item.playerId).push(item)});
   by.forEach((list,id)=>{NEWS.items.set(id,list.sort((a,b)=>b.at-a.at));NEWS.fetchedAt.set(id,Date.now())});
   rerenderIfTrade();
  }).catch(()=>{want.forEach(id=>NEWS.fetchedAt.set(id,Date.now()-8*60*1000))}).finally(()=>want.forEach(id=>NEWS.pending.delete(id)));
 }
 function parseInjuries(data){
  const flat=[];
  (Array.isArray(data?.injuries)?data.injuries:[]).forEach(item=>{if(Array.isArray(item?.injuries))flat.push(...item.injuries);else flat.push(item)});
  const byId=new Map(),byName=new Map();
  flat.forEach(inj=>{
   const a=inj?.athlete||inj?.player||{};
   const rec={id:String(a.id||''),name:a.displayName||a.fullName||a.name||'',pos:String(a.position?.abbreviation||a.position||'').toUpperCase(),
    status:String(inj?.status?.description||inj?.status?.name||(typeof inj?.status==='string'?inj.status:'')||'').trim(),
    kind:String(inj?.details?.type||inj?.type?.description||'').trim(),detail:String(inj?.details?.detail||'').trim(),
    returnDate:String(inj?.details?.returnDate||'').trim(),comment:String(inj?.longComment||inj?.shortComment||'').replace(/\s+/g,' ').trim(),
    at:Date.parse(inj?.date||'')||0};
   if(!rec.status||/^active$/i.test(rec.status)||/not specified/i.test(rec.kind))rec.kind=/not specified/i.test(rec.kind)?'':rec.kind;
   if(!rec.status||/^active$/i.test(rec.status))return;
   if(rec.id)byId.set(rec.id,rec);
   if(rec.name)byName.set(baseName(rec.name),rec);
  });
  return {byId,byName};
 }
 function ensureInjuries(list){
  const fresh=Date.now()-10*60*1000;
  [...new Set(list.map(T).filter(Boolean))].filter(t=>!(NEWS.injuries.get(t)?.at>fresh)&&!NEWS.injPending.has(t)).forEach(team=>{
   const id=typeof NFL_TEAM_IDS!=='undefined'?NFL_TEAM_IDS[team.toLowerCase().replace(/^was$/,'wsh')]:null;
   if(!id)return;
   NEWS.injPending.add(team);
   espnJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${id}/injuries`).then(data=>{
    NEWS.injuries.set(team,{at:Date.now(),...parseInjuries(data)});rerenderIfTrade();
   }).catch(()=>{NEWS.injuries.set(team,{at:Date.now()-8*60*1000,byId:new Map(),byName:new Map()})}).finally(()=>NEWS.injPending.delete(team));
  });
 }
 const injuryReport=(team,id,name)=>{const r=NEWS.injuries.get(T(team));return r?(r.byId.get(String(id))||r.byName.get(baseName(name))||null):null};
 /* Test hooks. */
 HJTD.injectNews=map=>{Object.entries(map||{}).forEach(([id,list])=>{NEWS.items.set(String(id),(list||[]).map(x=>x.text?{id:String(x.id||''),playerId:String(id),text:x.text,spin:x.spin||'',at:x.at||Date.now()}:newsItemFrom({...x,playerId:id})).filter(Boolean).sort((a,b)=>b.at-a.at));NEWS.fetchedAt.set(String(id),Date.now())})};
 HJTD.injectInjuries=(team,data)=>{NEWS.injuries.set(T(team),{at:Date.now(),...parseInjuries(data)})};

 const INJ_RE=/(injur|\bIR\b|reserve|out for|miss(?:ed|es|ing)?\b|weeks?\b|surgery|concussion|hamstring|ankle|knee|groin|calf|quad|shoulder|\bback\b|foot|toe|wrist|hand|thumb|rib|oblique|achilles|\bacl\b|\bmcl\b|questionable|doubtful|ruled out|activated|returns?\b|designated|placed on|carted|\bMRI\b|sidelined|day-to-day|limited|did not practice|\bDNP\b|inactive|healthy scratch|\bPUP\b|suspen)/i;
 const SIT_RE=/(traded|acquir|signed|released|waived|\bcut\b|starter|starting|start(?:s|ed)? (?:over|ahead)|depth chart|promot|demot|benched|named|coordinator|head coach|play-?call|fired|hired|\brole\b|workload|committee|split|lead back|WR1|No\. 1|top option|rotation|red zone|two-minute|first-team|QB1|under center)/i;
 /* "Injured Reserve" → "on injured reserve", "Out" → "out"; never lower-cases IR. */
 const statusPhrase=st=>{const x=String(st||'').trim();if(!x)return '';if(/injured reserve|\bIR\b/i.test(x))return 'on injured reserve';if(/^out$/i.test(x))return 'out';if(/questionable/i.test(x))return 'questionable';if(/doubtful/i.test(x))return 'doubtful';if(/suspend/i.test(x))return 'suspended';if(/PUP/i.test(x))return 'on the PUP list';return x.toLowerCase().replace(/\bir\b/g,'IR')};
 const ago=at=>{if(!at)return '';const d=Math.round((Date.now()-at)/864e5);return d<=0?'today':d===1?'yesterday':d<14?`${d} days ago`:d<60?`${Math.round(d/7)} weeks ago`:''};
 const dateShort=iso=>{const t=Date.parse(iso);if(!Number.isFinite(t))return '';return new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric'})};
 const blurb=(n,max=260)=>{if(!n)return '';let t=n.text;if(t.length>max){const cut=t.slice(0,max);t=cut.slice(0,Math.max(cut.lastIndexOf('. '),cut.lastIndexOf(', '),max-40)+1).trim()}return `“${t}”${ago(n.at)?` (${ago(n.at)})`:''}`};

 /* The teammates whose health decides a player's role: the same room, the
    quarterback throwing to him, and the other pass catchers he shares targets with. */
 function teammatesOf(p){
  const roster=(typeof ffnRosterByTeam!=='undefined'&&ffnRosterByTeam?.get)?(ffnRosterByTeam.get(p.team)||[]):[];
  const byPos=pos=>roster.filter(x=>String(x.position).toUpperCase()===pos).sort((a,b)=>(a.positionRank||99)-(b.positionRank||99));
  const out=[];
  const push=(x,why)=>{if(x&&String(x.id)!==String(p.id)&&!out.some(o=>String(o.id)===String(x.id)))out.push({id:String(x.id),name:x.name,position:String(x.position).toUpperCase(),depth:x.positionRank||null,why})};
  if(p.pos==='QB'){byPos('WR').slice(0,2).forEach(x=>push(x,'targets'));byPos('TE').slice(0,1).forEach(x=>push(x,'targets'));byPos('RB').slice(0,1).forEach(x=>push(x,'backfield'))}
  else{
   byPos(p.pos).slice(0,3).forEach(x=>push(x,'room'));
   byPos('QB').slice(0,1).forEach(x=>push(x,'qb'));
   if(p.pos!=='RB')['WR','TE'].filter(k=>k!==p.pos).forEach(k=>byPos(k).slice(0,k==='WR'?2:1).forEach(x=>push(x,'targets')));
   if(p.pos==='RB')['WR','TE'].forEach(k=>byPos(k).slice(0,1).forEach(x=>push(x,'targets')));
  }
  return out.slice(0,7);
 }
 const teamWeeksOf=team=>[...USAGE.teamCarries.keys()].filter(k=>k.startsWith(T(team)+'|')).map(k=>Number(k.split('|')[1])).sort((a,b)=>a-b);
 /* What is wrong with a teammate, if anything: the injury report, this league's
    designation, the games he has missed, and the latest blurb about him. */
 function teammateSignal(p,t){
  const report=injuryReport(p.team,t.id,t.name);
  const code=injuryMap().get(String(t.id))?.code||'';
  const u=usageFor({id:t.id,name:t.name,position:t.position,team:p.team});
  const teamWeeks=USAGE.ready?teamWeeksOf(p.team):[];
  const played=new Set((u?.points||[]).map(x=>x.week));
  const missed=teamWeeks.filter(w=>!played.has(w));
  const news=newsFor(t.id).filter(n=>n.at>Date.now()-21*864e5);
  const injuryNews=news.filter(n=>INJ_RE.test(n.text));
  const hurt=Boolean(report)||INJURED.has(code)||code==='QUESTIONABLE'||(missed.length&&teamWeeks.length)||injuryNews.length;
  if(!hurt)return null;
  const status=report?.status||(code?injuryLabel(code):'')||'';
  return {t,report,code,u,missed,teamWeeks,news:injuryNews[0]||null,status,games:u?.games||0};
 }
 const weeksList=list=>list.length===1?`Week ${list[0]}`:`Weeks ${list.slice(0,-1).join(', ')} and ${list.at(-1)}`;
 /* A player's numbers in the games a teammate played against the games he sat out. */
 function splitWithWithout(p,t){
  const s=p.u?.series;if(!s||!s.length||!USAGE.ready)return null;
  const uT=usageFor({id:t.id,name:t.name,position:t.position,team:p.team});
  const tPlayed=new Set((uT?.points||[]).map(x=>x.week));
  const teamWeeks=new Set(teamWeeksOf(p.team));
  const withT=s.filter(w=>tPlayed.has(w.week)),without=s.filter(w=>!tPlayed.has(w.week)&&teamWeeks.has(w.week));
  if(!withT.length||!without.length)return null;
  const sum=(list,k)=>mean(list.map(w=>w[k]));
  const line=list=>{
   const bits=[];
   if(p.pos==='RB'&&Number.isFinite(sum(list,'carryShare')))bits.push(`${pct(sum(list,'carryShare'))} of carries`);
   if(p.pos!=='QB'&&Number.isFinite(sum(list,'target')))bits.push(`${pct(sum(list,'target'))} target share`);
   if(Number.isFinite(sum(list,'snap')))bits.push(`${pct(sum(list,'snap'))} of snaps`);
   if(Number.isFinite(sum(list,'pts')))bits.push(`${pts(sum(list,'pts'))} ppg`);
   return bits.join(', ');
  };
  return {withLine:line(withT),withoutLine:line(without),withGames:withT.length,withoutGames:without.length,
   withPts:sum(withT,'pts'),withoutPts:sum(without,'pts')};
 }
 function ensureContext(profiles){
  const ids=[],teamsList=[];
  profiles.forEach(p=>{ids.push(p.id);teamsList.push(p.team);teammatesOf(p).forEach(t=>ids.push(t.id))});
  ensureNews(ids);ensureInjuries(teamsList);
 }

 /* One profile per player in the deal, shared by every section of the write-up. */
 function profileOf(entry,from,to){
  const row=marketRow(entry),u=usageOfEntry(entry),pos=hjPlayerPosition(entry),code=injuryOf(entry);
  const status=isIR(entry)?{key:'bad',label:'On IR'}:INJURED.has(code)?{key:'bad',label:injuryLabel(code)}:code==='QUESTIONABLE'?{key:'warn',label:'Questionable'}:onBye(entry)?{key:'warn',label:'Bye this week'}:{key:'ok',label:'Healthy'};
  const pr=model_=>{const v=hj6Projection(entry,model_,'season',week(),HJ_LEAGUE_SEASON);return Number.isFinite(v)?v:null};
  const p={entry,id:entryId(entry),name:entryName(entry),last:entryName(entry).split(' ').slice(-1)[0],pos,team:T(hjPlayerTeam(entry)),row,value:valueOf(entry),
   proj:projOf(entry),espn:pr('espn'),vegas:pr('vegas'),grade:gradeOf(entry),u,code,status,from,to,sched:scheduleOf(entry),rep:POS.includes(pos)?replacementFor(pos):null};
  p.report=injuryReport(p.team,p.id,p.name);
  p.news=newsFor(p.id);
  p.injuryNews=p.news.filter(n=>n.at>Date.now()-21*864e5&&INJ_RE.test(n.text))[0]||null;
  p.sitNews=p.news.filter(n=>n.at>Date.now()-21*864e5&&SIT_RE.test(n.text)&&n!==p.injuryNews)[0]||null;
  p.mates=POS.includes(pos)?teammatesOf(p).map(t=>({t,sig:teammateSignal(p,t)})).filter(x=>x.sig):[];
  p.mates.forEach(x=>{x.split=splitWithWithout(p,x.t)});
  return p;
 }
 const nameOf=p=>p.name;
 const posRank=p=>p.row?`${p.row.position}${p.row.positionRank}`:'';

 function analyse(m){
  if(m.band==='empty')return null;
  const rows=m.sides.map(side=>{
   const stand=standingFor(side.manager),post=posture(stand);
   const wb=weekLineup(side.before),wa=weekLineup(side.after);
   const weekReady=wb.covered>=Math.max(6,Math.floor(side.before.length*.5));
   return {...side,stand,post,weekBefore:wb,weekAfter:wa,weekDelta:wa.total-wb.total,weekReady};
  });
  const [A,B]=rows;
  A.profiles=A.out.map(e=>profileOf(e,A,B));B.profiles=B.out.map(e=>profileOf(e,B,A));
  A.gets=B.profiles;B.gets=A.profiles;
  try{ensureContext([...A.profiles,...B.profiles])}catch(_){ }

  const lean=(a,b,margin)=>Math.abs(a-b)<=margin?'even':a>b?'a':'b';
  const unitGain=side=>UNITS.map(k=>({k,d:(side.unitsAfter[k]||0)-(side.unitsBefore[k]||0)})).sort((x,y)=>y.d-x.d);
  const worstUnitBefore=side=>UNITS.map(k=>({k,v:side.unitsBefore[k]||0,rank:side.unitRankBefore?.[k]})).sort((x,y)=>x.v-y.v)[0];

  /* --- the factor scorecard --- */
  const factors=[];
  factors.push({label:'Market value',lean:m.band==='even'?'even':m.winner,
   note:m.band==='even'?`Within ${(m.gap*100).toFixed(1)}% — balanced on value.`:`${money(Math.abs(m.net))} more value lands with ${rows.find(r=>r.key===m.winner).manager}.`});
  if(A.weekReady&&B.weekReady)factors.push({label:'This week',lean:lean(A.weekDelta,B.weekDelta,.4),
   note:`${A.manager} ${A.weekDelta>=0?'+':'−'}${pts(Math.abs(A.weekDelta))}, ${B.manager} ${B.weekDelta>=0?'+':'−'}${pts(Math.abs(B.weekDelta))} in Week ${week()} starters.`});
  factors.push({label:'Rest of season',lean:lean(A.lineupDelta,B.lineupDelta,1),
   note:`${A.manager} ${A.lineupDelta>=0?'+':'−'}${pts(Math.abs(A.lineupDelta))}, ${B.manager} ${B.lineupDelta>=0?'+':'−'}${pts(Math.abs(B.lineupDelta))} projected starters.`});
  const sumProj=(list,k)=>list.reduce((n,p)=>n+(Number.isFinite(p[k])?p[k]:0),0);
  const eA=sumProj(A.gets,'espn'),eB=sumProj(B.gets,'espn'),vA=sumProj(A.gets,'vegas'),vB=sumProj(B.gets,'vegas');
  if(eA||eB)factors.push({label:'ESPN projections',lean:lean(eA,eB,4),note:`Rest of season, players received: ${A.manager} ${pts(eA)}, ${B.manager} ${pts(eB)}.`});
  if(vA||vB)factors.push({label:'Vegas projections',lean:lean(vA,vB,4),note:`Rest of season, players received: ${A.manager} ${pts(vA)}, ${B.manager} ${pts(vB)}.`});
  const fitScore=side=>{const weak=worstUnitBefore(side);return ((side.unitsAfter[weak.k]||0)-(side.unitsBefore[weak.k]||0))};
  const sc=scarcity();
  const steep=Object.entries(sc).sort((x,y)=>y[1]-x[1])[0];
  factors.push({label:'Positional fit',lean:lean(fitScore(A),fitScore(B),150),
   note:`${A.manager}’s thinnest spot was ${worstUnitBefore(A).k}, ${B.manager}’s was ${worstUnitBefore(B).k}.${steep?` ${steep[0]} is the steepest cliff in this league — ${Math.round(steep[1]*100)}% falls away between the last starter and the next man up.`:''}`});
  if(USAGE.ready){
   const trendScore=side=>side.gets.reduce((n,p)=>{
    const u=p.u;if(!u||!u.recent||!u.season)return n;
    const d=[u.recent.snap-u.season.snap,u.recent.target-u.season.target,u.recent.carryShare-u.season.carryShare].filter(Number.isFinite);
    return n+(d.length?Math.max(...d):0);
   },0);
   const tA=trendScore(A),tB=trendScore(B);
   const best=side=>side.gets.map(p=>shareLine(p.u)).filter(Boolean)[0]||'';
   if(Math.abs(tA)+Math.abs(tB)>0)factors.push({label:'Opportunity trend',lean:lean(tA,tB,.03),
    note:[best(A)?`${A.manager} gets ${best(A)}`:'',best(B)?`${B.manager} gets ${best(B)}`:''].filter(Boolean).join('; ')+'.'});
  }
  const healthScore=side=>side.gets.reduce((n,p)=>n-(p.status.key==='bad'?2:p.status.key==='warn'?1:0)-(p.mates.some(x=>x.sig.report||INJURED.has(x.sig.code))?0:0),0);
  const roleScore=side=>side.gets.reduce((n,p)=>n+p.mates.filter(x=>x.sig&&(x.sig.report||INJURED.has(x.sig.code)||x.sig.missed.length)&&x.t.why==='room').length,0);
  if(A.gets.some(p=>p.mates.length)||B.gets.some(p=>p.mates.length))factors.push({label:'Injury ecosystem',lean:lean(roleScore(A)+healthScore(A),roleScore(B)+healthScore(B),0),
   note:[A,B].map(s=>`${s.manager} gets ${join(s.gets.map(p=>{const r=p.mates.filter(x=>x.t.why==='room'&&(x.sig.report||INJURED.has(x.sig.code)||x.sig.missed.length));return r.length?`${p.last} with ${join(r.map(x=>x.t.name.split(' ').at(-1)))} out`:`${p.last}${p.status.key!=='ok'?` (${p.status.label.toLowerCase()})`:''}`}))||'nothing'}`).join('; ')+'.'});
  const poScore=side=>mean(side.gets.map(p=>p.sched?.po?p.sched.po.of+1-p.sched.po.rank:null));
  const pA=poScore(A),pB=poScore(B);
  if(Number.isFinite(pA)&&Number.isFinite(pB))factors.push({label:'Playoff schedule',lean:lean(pA,pB,3),
   note:`Weeks ${PLAYOFF_WEEKS[0]}–${PLAYOFF_WEEKS.at(-1)} matchups for the players received: ${[A,B].map(s=>`${s.manager} ${join(s.gets.filter(p=>p.sched?.po).map(p=>`${p.last} ${ordinal(p.sched.po.rank)} easiest`))}`).join('; ')}.`});
  const aboveRep=side=>side.gets.reduce((n,p)=>n+(p.rep&&Number.isFinite(p.value)?p.value-p.rep.value:0),0);
  const arA=aboveRep(A),arB=aboveRep(B);
  if(arA||arB)factors.push({label:'Above the wire',lean:lean(arA,arB,300),
   note:`Measured against the best free agent at each position: ${A.manager} ${arA>=0?'+':'−'}${money(Math.abs(arA))}, ${B.manager} ${arB>=0?'+':'−'}${money(Math.abs(arB))}.`});
  const gradeAvg=list=>{const g=list.map(p=>p.grade).filter(Number.isFinite);return g.length?g.reduce((a,b)=>a+b,0)/g.length:null};
  const gA=gradeAvg(A.gets),gB=gradeAvg(B.gets);
  if(Number.isFinite(gA)&&Number.isFinite(gB))factors.push({label:'Play quality (PFF)',lean:lean(gA,gB,2),
   note:`${A.manager} receives a ${gA.toFixed(1)} average grade, ${B.manager} a ${gB.toFixed(1)}.`});

  return {rows,factors,unitGain,worstUnitBefore,scarcity:sc};
 }

 /* =====================================================================
    The written analysis — both managers, one deal
    ===================================================================== */
 const li=items=>items.length?`<ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul>`:'';
 const para=items=>items.filter(Boolean).map(x=>`<p>${x}</p>`).join('');
 const B_=s=>`<b>${E(s)}</b>`;
 const section=(key,title,body,note)=>body?`<article class="td-sec td-sec-${key}"><h4>${E(title)}</h4>${note?`<p class="td-sec-note">${E(note)}</p>`:''}${body}</article>`:'';
 const depthTag=t=>t.depth?`${t.position}${t.depth}`:t.position;

 function breakdownCard(p){
  const s=p.u?.season,rank=p.u?.seasonRank;
  const facts=[];
  facts.push(['Market',Number.isFinite(p.value)?`${money(p.value)}${posRank(p)?` · ${posRank(p)}`:''}${p.row&&Number.isFinite(p.row.trend30)&&Math.abs(p.row.trend30)>=60?` · ${p.row.trend30>0?'▲':'▼'}${money(Math.abs(p.row.trend30))} 30d`:''}`:'not valued']);
  if(s&&p.u.games)facts.push(['Season',`${pts(s.points)} pts · ${pts(p.u.ppg)} ppg · ${plural(p.u.games,'game')}`]);
  if(rank)facts.push(['Points rank',`${p.pos}${rank.rank} of ${rank.of}`]);
  const role=shareLine(p.u,'season');
  if(role)facts.push(['Role',role]);
  const projBits=[Number.isFinite(p.espn)?`ESPN ${pts(p.espn)}`:'',Number.isFinite(p.vegas)?`Vegas ${pts(p.vegas)}`:''].filter(Boolean);
  if(projBits.length)facts.push(['Rest of season',projBits.join(' · ')]);
  if(Number.isFinite(p.grade))facts.push(['PFF',p.grade.toFixed(1)]);
  if(p.sched?.bye)facts.push(['Bye',`Week ${p.sched.bye}`]);
  const attrs=ffnPlayerDataAttrs({id:p.id,name:p.name,team:p.team,position:p.pos,photo:hjPlayerPhoto(p.entry)});
  const photo=hjPlayerPhoto(p.entry);
  const statusLabel=p.report&&p.status.key!=='ok'?`${p.status.label}${p.report.kind?` · ${p.report.kind}`:''}`:p.status.label;
  return `<div class="td-bd-player">
   <button type="button" class="td-bd-face pc-player-trigger" ${attrs} data-ini="${E(initials(p.name))}" aria-label="Open ${E(p.name)}">${photo?`<img src="${E(photo)}" alt="" loading="lazy" onerror="hjTdFallback(this)">`:`<span class="td-chip-ini">${E(initials(p.name))}</span>`}</button>
   <div class="td-bd-body">
    <div class="td-bd-name"><b>${E(p.name)}</b><span><i class="td-pos td-pos-${E(p.pos.replace('/',''))}">${E(p.pos)}</i> ${E(p.team)}</span><em class="td-status is-${p.status.key}">${E(statusLabel)}</em></div>
    <dl class="td-bd-facts">${facts.map(([k,v])=>`<div><dt>${E(k)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>
   </div>
  </div>`;
 }

 /* The one thing that most changes how a player should be valued right now. */
 function keyContext(p){
  const out=[];
  if(p.status.key==='bad')out.push(`${p.last} is ${statusPhrase(p.status.label)}${p.report?.returnDate?` (return ${dateShort(p.report.returnDate)})`:''}`);
  else if(p.status.key==='warn'&&p.status.label==='Questionable')out.push(`${p.last} is questionable this week${p.report?.kind?` (${p.report.kind.toLowerCase()})`:''}`);
  p.mates.forEach(x=>{
   const s=x.sig;
   const out_=INJURED.has(s.code)||/reserve|\bout\b|IR/i.test(s.status)||s.missed.length>=2;
   if(x.t.why==='room'&&out_)out.push(`${x.t.name} (${depthTag(x.t)}) is ${s.status?statusPhrase(s.status):'sidelined'}${s.report?.returnDate?`, expected back ${dateShort(s.report.returnDate)}`:''} — the ${p.pos} room is ${p.last}’s for now`);
   else if(x.t.why==='qb'&&out_)out.push(`his quarterback ${x.t.name} is ${s.status?statusPhrase(s.status):'sidelined'}`);
   else if(x.t.why==='targets'&&out_)out.push(`${x.t.name} (${depthTag(x.t)}) is ${s.status?statusPhrase(s.status):'out'}, which frees up targets`);
  });
  const mv=roleMoves(p.u);
  if(mv.up.length)out.push(`his ${mv.up[0]}`);else if(mv.down.length)out.push(`his ${mv.down[0]}`);
  const q=p.pos!=='QB'?qbChange(p.team):null;
  if(q)out.push(`${p.team} changed quarterback to ${q.now} in Week ${q.since}`);
  if(p.sched?.po)out.push(`he draws the ${ordinal(p.sched.po.rank)} easiest playoff-week schedule for ${p.pos}s`);
  return out;
 }

 function report(m,a){
  const [A,B]=a.rows;
  const all=[...A.profiles,...B.profiles];
  const w=week();
  const inSeason=played(A.stand)>=3&&played(B.stand)>=3;
  const more=m.winner?a.rows.find(r=>r.key===m.winner):null,less=m.winner?a.rows.find(r=>r.key!==m.winner):null;
  const pkg=side=>side.profiles.length?join(side.profiles.map(nameOf)):'nothing';
  const worth=v=>v>0?money(v):'no market value';

  /* ---- Summary ---- */
  const summary=[];
  summary.push(`${B_(A.manager)} sends ${E(pkg(A))} (${worth(m.outA)}) to ${B_(B.manager)} for ${E(pkg(B))} (${worth(m.outB)}).`);
  if(m.band==='even')summary.push(E(m.outA+m.outB>0?`The two packages are within ${(m.gap*100).toFixed(1)}% on market value, so the argument is about fit, health and schedule rather than the numbers.`:`Neither package carries market value (kickers and defences are not valued), so the argument is entirely about fit.`));
  else summary.push(E(`The packages are ${(m.gap*100).toFixed(0)}% apart on market value — ${money(Math.abs(m.net))} more lands with ${more.manager}.`));
  const lineupWord=side=>side.lineupDelta>.5?`lifts ${side.manager}’s projected starters by ${pts(side.lineupDelta)}`:side.lineupDelta<-.5?`lowers ${side.manager}’s projected starters by ${pts(Math.abs(side.lineupDelta))}`:`leaves ${side.manager}’s projected starters about where they are`;
  summary.push(E(`On this league’s projections the deal ${lineupWord(A)} and ${lineupWord(B)}.`));
  if(inSeason)summary.push(E(`${standingLine(A)}; ${standingLine(B)}.`));
  const contexts=all.map(p=>{const k=keyContext(p)[0];return k?`${p.name}: ${k}`:''}).filter(Boolean);
  if(contexts.length)summary.push(E(`Context that moves the needle — ${contexts.join('; ')}.`));
  const summaryHTML=para(summary);

  /* ---- Breakdown ---- */
  const breakdownHTML=`<div class="td-break">
   <div class="td-break-side is-a"><h5>${E(A.manager)} sends</h5>${A.profiles.length?A.profiles.map(breakdownCard).join(''):'<p class="td-empty">Nothing yet.</p>'}</div>
   <div class="td-break-side is-b"><h5>${E(B.manager)} sends</h5>${B.profiles.length?B.profiles.map(breakdownCard).join(''):'<p class="td-empty">Nothing yet.</p>'}</div>
  </div>`;

  /* ---- Factor scorecard, straight after the breakdown ---- */
  const scoreHTML=`<p class="td-sec-note">Each row leans toward the manager the factor favours.</p>${scorecard(a)}`;

  /* ---- Is it a good value? ---- */
  const value=[];
  if(m.band==='even')value.push(m.outA+m.outB>0?`${money(m.outA)} against ${money(m.outB)} — the market calls this a balanced swap.`:'Nothing in this deal carries a market value.');
  else value.push(`${money(m.outA)} from ${A.manager} against ${money(m.outB)} from ${B.manager}: ${less.manager} gives up ${money(Math.abs(m.net))} more market value than comes back.`);
  const vor=side=>side.profiles.reduce((n,p)=>n+(Number.isFinite(p.value)?Math.max(0,p.value-(p.rep?.value||0)):0),0);
  const vA=vor(A),vB=vor(B);
  if((A.profiles.some(p=>p.rep)||B.profiles.some(p=>p.rep))&&m.count.give!==m.count.take){
   const bigger=m.count.give>m.count.take?A:B;
   const rep=bigger.profiles.map(p=>p.rep?`${p.name} is ${money(Math.max(0,p.value-p.rep.value))} above the best ${p.pos} on the wire (${p.rep.name}, ${money(p.rep.value)})`:'').filter(Boolean);
   const adjNet=vB-vA,adjGap=Math.abs(adjNet)/Math.max(vA,vB,1);
   const adjTo=adjNet>0?A:B,rawTo=m.net>0?A:B;
   const compare=adjGap<.04?'which makes it close to even':(adjTo!==rawTo&&m.band!=='even')?`which flips the extra value to ${adjTo.manager}’s side`:adjGap<m.gap-.02?`a ${(adjGap*100).toFixed(0)}% gap, narrower than the raw ${(m.gap*100).toFixed(0)}%, still with more landing with ${adjTo.manager}`:adjGap>m.gap+.02?`a ${(adjGap*100).toFixed(0)}% gap, wider than the raw ${(m.gap*100).toFixed(0)}%, with more landing with ${adjTo.manager}`:`about the same ${(adjGap*100).toFixed(0)}% gap, with more landing with ${adjTo.manager}`;
   value.push(`Measured above the waiver wire instead of at sticker, ${A.manager}’s package is worth ${money(vA)} and ${B.manager}’s ${money(vB)} — ${compare}. ${rep.length?rep.join('; ')+'.':''} In a 10-team league the best player in a package usually carries a premium because the second piece is not far from what is sitting on the wire.`);
  }
  if(m.best){
   const holder=m.give.includes(m.best)?B:A;
   const bp=all.find(p=>p.entry===m.best);
   if(bp&&all.length>1&&Number.isFinite(bp.value)&&bp.value>0)value.push(`${holder.manager} receives the best player in the deal, ${bp.name} (${money(bp.value)}${posRank(bp)?`, ${posRank(bp)}`:''}).`);
  }
  const movers=all.filter(p=>p.row&&Number.isFinite(p.row.trend30)&&Math.abs(p.row.trend30)>=Math.max(60,p.value*.02));
  if(movers.length)value.push(`Market form: ${join(movers.map(p=>`${p.name} is ${p.row.trend30>0?'up':'down'} ${money(Math.abs(p.row.trend30))} over 30 days${p.row.trend30>0?` (${p.to.manager} is buying at the new number)`:` (a possible buy-low for ${p.to.manager})`}`))}.`);
  const tiers=all.filter(p=>Number.isFinite(p.row?.tier));
  if(tiers.length>=2){
   const best=Math.min(...tiers.map(p=>p.row.tier)),worst=Math.max(...tiers.map(p=>p.row.tier));
   if(worst-best>=2)value.push(`The pieces sit ${worst-best} market tiers apart (${join(tiers.map(p=>`${p.name} tier ${p.row.tier}`))}), so the deal trades a class of player rather than a like-for-like.`);
  }
  const valueHTML=para(value.map(E));

  /* ---- Injury ecosystem, grouped by player ---- */
  const injury=[];
  all.forEach(p=>{
   const lines=[];
   if(p.status.key==='ok'&&!p.injuryNews)lines.push(`${B_(p.name)} carries no designation.`);
   /* Him. */
   if(isIR(p.entry))lines.push(`${B_(p.name)} is on injured reserve${p.report?.kind?` (${E(p.report.kind.toLowerCase())})`:''}${p.report?.returnDate?`, expected back ${E(dateShort(p.report.returnDate))}`:''} — ${E(p.to.manager)} is taking on a player who cannot start until he is activated.`);
   else if(INJURED.has(p.code)||(p.report&&/out|reserve|doubtful/i.test(p.report.status)))lines.push(`${B_(p.name)} is ${E(statusPhrase(p.report?.status||injuryLabel(p.code)||'out'))}${p.report?.kind?` with a ${E(p.report.kind.toLowerCase())} injury`:''}${p.report?.returnDate?`, expected back ${E(dateShort(p.report.returnDate))}`:''} — ${E(p.to.manager)} is buying the return, not the player as he is today.`);
   else if(p.code==='QUESTIONABLE'||(p.report&&/questionable/i.test(p.report.status)))lines.push(`${B_(p.name)} is questionable for Week ${w}${p.report?.kind?` (${E(p.report.kind.toLowerCase())})`:''}.`);
   if(p.injuryNews)lines.push(`${lines.length?'':B_(p.name)+': '}${E(blurb(p.injuryNews))}${p.injuryNews.spin?` ${E(blurb({text:p.injuryNews.spin,at:0},220))}`:''}`);
   if(p.u&&USAGE.ready){
    const teamWeeks=teamWeeksOf(p.team),played=new Set(p.u.points.map(x=>x.week)),missed=teamWeeks.filter(x=>!played.has(x));
    if(missed.length&&p.u.games)lines.push(`${lines.length?E(p.last):B_(p.name)} has missed ${E(weeksList(missed))} this season.`);
   }
   /* Them: the teammates whose absence or return moves his role. */
   p.mates.forEach(x=>{
    const s=x.sig,t=x.t;
    const bits=[];
    const statusText=s.report?`${statusPhrase(s.report.status)}${s.report.kind?` (${s.report.kind.toLowerCase()})`:''}${s.report.returnDate?`, expected back ${dateShort(s.report.returnDate)}`:''}`:s.code?statusPhrase(injuryLabel(s.code)):'';
    if(statusText)bits.push(`is ${statusText}`);
    if(s.missed.length&&s.teamWeeks.length)bits.push(s.games?`has missed ${weeksList(s.missed)}`:`has not played this season`);
    if(!bits.length&&s.news)bits.push('is in the injury news');
    const relation=t.why==='room'?`shares the ${p.team} ${p.pos} room`:t.why==='qb'?`is ${p.last}’s quarterback`:t.why==='targets'?`competes for ${p.team} targets`:`shares the ${p.team} backfield`;
    let line=`${B_(t.name)} (${E(depthTag(t))}) ${E(relation)} and ${E(bits.join(', '))}.`;
    if(s.news)line+=` ${E(blurb(s.news))}${s.news.spin?` ${E(blurb({text:s.news.spin,at:0},220))}`:''}`;
    if(x.split)line+=` ${E(`${p.last} with ${t.name.split(' ').slice(-1)[0]} on the field: ${x.split.withLine} over ${plural(x.split.withGames,'game')}; without him: ${x.split.withoutLine} over ${plural(x.split.withoutGames,'game')}.`)}`;
    if(t.why==='room'&&(s.report||INJURED.has(s.code)||s.missed.length))line+=` ${E(`That is the swing in ${p.last}’s value: ${p.to.manager} gets the expanded role while ${t.name.split(' ').slice(-1)[0]} is out and should count on it shrinking when he returns.`)}`;
    lines.push(line);
   });
   /* The fantasy roster: an IR player at the same spot who will come back. */
   const returning=p.to.after.filter(e=>isIR(e)&&hjPlayerPosition(e)===p.pos&&entryId(e)!==p.id);
   if(returning.length)lines.push(`${E(p.to.manager)} has ${E(join(returning.map(entryName)))} on IR at ${E(p.pos)}. ${B_(p.name)} covers that spot now, and when ${returning.length===1?'he comes':'they come'} back ${E(p.last)} slides down the depth chart — the value of this piece is front-loaded.`);
   const leftIR=p.from.after.filter(e=>isIR(e)&&hjPlayerPosition(e)===p.pos);
   const leftHealthy=(p.from.countsAfter[p.pos]||0);
   if(leftIR.length&&leftHealthy<=MINIMUMS[p.pos])lines.push(`Sending ${B_(p.name)} leaves ${E(p.from.manager)} with ${leftHealthy} healthy ${E(p.pos)}${leftHealthy===1?'':'s'} and ${E(join(leftIR.map(entryName)))} still on IR — thin until that return.`);
   if(lines.length)injury.push(`<div class="td-group-block"><h5>${E(p.name)} <span>${E(p.pos)} · ${E(p.team)} · to ${E(p.to.manager)}</span></h5>${li(lines)}</div>`);
  });
  const injuryHTML=injury.length?injury.join(''):'';

  /* ---- Usage & opportunity ---- */
  const usage=[];
  all.forEach(p=>{
   const u=p.u;
   if(!u||!u.season)return;
   const s=u.season,r=u.recent,bits=[];
   if(u.pos==='QB'){
    if(Number.isFinite(s.attempts)&&s.attempts>0)bits.push(`${one(s.attempts)} attempts a game`);
    if(Number.isFinite(s.carries)&&s.carries>=2)bits.push(`${one(s.carries)} carries a game — the rushing floor is real`);
    if(!bits.length&&Number.isFinite(s.snap))bits.push(`${pct(s.snap)} of snaps`);
   }else{
    if(Number.isFinite(s.snap))bits.push(`${pct(s.snap)} of snaps`);
    if(u.pos==='RB'){if(Number.isFinite(s.carryShare))bits.push(`${pct(s.carryShare)} of the team’s carries (${one(s.carries)} a game)`);if(Number.isFinite(s.targets))bits.push(`${one(s.targets)} targets a game`)}
    else{if(Number.isFinite(s.target))bits.push(`${pct(s.target)} target share (${one(s.targets)} a game)`);if(Number.isFinite(s.air))bits.push(`${pct(s.air)} of the air yards`);if(Number.isFinite(s.wopr))bits.push(`WOPR ${s.wopr.toFixed(2)}`)}
   }
   if(!bits.length)return;
   let line=`${B_(p.name)} — ${E(bits.join(', '))} over ${plural(u.games,'game')}.`;
   const median=USAGE.posPPO.get(u.pos);
   if(Number.isFinite(s.ppo)&&Number.isFinite(median)){
    const rel=s.ppo/median;
    line+=` ${E(`${p.last} scores ${s.ppo.toFixed(2)} points per opportunity against a ${median.toFixed(2)} median for ${u.pos}s`)}${rel<.82?E(' — getting the work without the points, which usually corrects upward'):rel>1.25?E(' — well above the norm, which usually corrects downward unless the role grows'):''}.`;
   }
   if(Number.isFinite(s.tdShare)&&s.tdShare>=.45&&u.games>=3)line+=` ${E(`${Math.round(s.tdShare*100)}% of his points have come from touchdowns${Number.isFinite(s.touches)?` on ${Math.round(s.touches)} touches`:''} — the first thing to regress.`)}`;
   if(r&&u.games>=4){
    const mv=roleMoves(u),moves=[...mv.up,...mv.down];
    const t=trendSentence(p.entry);
    if(moves.length){
     line+=` ${E(`Trend: ${moves.join(', ')}${t?`. ${t}`:'.'}`)}`;
     /* Why: a teammate missing the recent games explains a jump. */
     const recentWeeks=new Set(u.weeks.slice(-3).map(x=>x.week));
     const why=p.mates.filter(x=>x.t.why==='room'||x.t.why==='targets').filter(x=>x.sig.missed.some(wk=>recentWeeks.has(wk)));
     if(mv.up.length&&why.length)line+=` ${E(`The jump lines up with ${join(why.map(x=>x.t.name))} missing ${join(why.map(x=>weeksList(x.sig.missed.filter(wk=>recentWeeks.has(wk)))))} — it is borrowed until ${why.length===1?'he is':'they are'} back.`)}`;
     else line+=` ${E(mv.up.length&&!mv.down.length?'Usage moves a week or two before the points do — a buy signal.':mv.down.length&&!mv.up.length?'A shrinking role is the classic sell-high tell.':'Mixed signals.')}`;
    }else if(t)line+=` ${E(`Steady role. ${t}`)}`;
   }
   usage.push(line);
  });
  const usageHTML=usage.length?li(usage):'';

  /* ---- Situational changes ---- */
  const situation=[];
  const seenTeams=new Set();
  all.forEach(p=>{
   if(p.u&&p.u.teams.length>1)situation.push(`${B_(p.name)} has played for ${E(join(p.u.teams))} this season — a change of team mid-year resets his role, so the season-long numbers blend two situations.`);
   if(p.pos!=='QB'&&!seenTeams.has(p.team)){
    seenTeams.add(p.team);
    const q=qbChange(p.team);
    if(q)situation.push(`${E(p.team)} has had ${E(q.now)} taking the snaps at quarterback since Week ${q.since}, not ${E(q.was)} — every ${E(p.team)} pass catcher and back in this deal (${E(join(all.filter(x=>x.team===p.team).map(nameOf)))}) is playing in a changed offence.`);
   }
   if(p.sitNews)situation.push(`${B_(p.name)}: ${E(blurb(p.sitNews))}${p.sitNews.spin?` ${E(blurb({text:p.sitNews.spin,at:0},220))}`:''}`);
   /* The quarterback's own situation, when it is not an injury. */
   const qb=p.mates.find(x=>x.t.why==='qb');
   if(!qb&&p.pos!=='QB'){
    const qb1=teammatesOf(p).find(t=>t.why==='qb');
    const n=qb1?newsFor(qb1.id).filter(x=>x.at>Date.now()-14*864e5&&SIT_RE.test(x.text)&&!INJ_RE.test(x.text))[0]:null;
    if(n&&!situation.some(x=>x.includes(E(blurb(n))))) situation.push(`${B_(qb1.name)} (${E(p.team)} QB): ${E(blurb(n))}`);
   }
   if(onBye(p.entry))situation.push(`${B_(p.name)} has no game in Week ${w}.`);
  });
  const situationHTML=situation.length?li(situation):'';

  /* ---- Schedule & playoff leverage ---- */
  const sched=[];
  all.forEach(p=>{
   const sc=p.sched;if(!sc)return;
   const bits=[];
   if(sc.bye)bits.push(sc.bye<w?`bye already used (Week ${sc.bye})`:sc.bye===w?`on bye this week`:`bye in Week ${sc.bye}`);
   if(sc.remaining)bits.push(`${plural(sc.remaining,'regular-season game')} left`);
   if(sc.rest)bits.push(`the remaining schedule ranks ${ordinal(sc.rest.rank)} easiest of ${sc.rest.of} for ${p.pos}s (opponents allow ${pts(sc.rest.avg)} a game to the position)`);
   const po=sc.playoffs.map(x=>{
    if(x.bye)return `Week ${x.week}: bye`;
    const d=x.dvp;
    let t=`Week ${x.week} ${x.home?'vs':'at'} ${x.opp}`;
    if(d)t+=` — ${allowWord(x.rank,x.of)} points to ${p.pos}s (${pts(d.avg)} a game${Number.isFinite(d.last3)&&d.avg>0&&Math.abs(d.last3-d.avg)/d.avg>=.15?`, ${d.last3>d.avg?'more':'less'} generous lately at ${pts(d.last3)}`:''})`;
    if(x.roof)t+=`, ${x.roof}`;
    if(x.line)t+=`, ${x.line}`;
    return t;
   });
   if(po.length)bits.push(`playoff weeks — ${po.join('; ')}${sc.po?` — the ${ordinal(sc.po.rank)} easiest playoff draw of ${sc.po.of} for ${p.pos}s`:''}`);
   if(bits.length)sched.push(`${B_(p.name)}: ${E(bits.map(cap).join('. '))}.`);
  });
  a.rows.forEach(side=>{
   const incoming=side.gets.filter(p=>p.sched&&p.sched.bye&&p.sched.bye>=w);
   const byWeek={};
   incoming.forEach(p=>{(byWeek[p.sched.bye]=byWeek[p.sched.bye]||[]).push(p.name)});
   Object.entries(byWeek).filter(([,list])=>list.length>1).forEach(([wk,list])=>sched.push(`${E(side.manager)} would take on ${E(join(list))}, who share a Week ${wk} bye.`));
   incoming.forEach(p=>{
    const clash=side.after.filter(e=>entryId(e)!==p.id&&!isIR(e)&&hjPlayerPosition(e)===p.pos&&byeOf(hjPlayerTeam(e))===p.sched.bye).map(entryName);
    if(clash.length)sched.push(`${B_(p.name)} shares his Week ${p.sched.bye} bye with ${E(join(clash))}, already on ${E(side.manager)}’s roster at ${E(p.pos)}.`);
   });
  });
  a.rows.forEach(side=>{
   const s=side.stand;
   if(s&&inSeason){
    const bits=[];
    if(Number.isFinite(s.remainingSOSRank))bits.push(`${side.manager}’s own run-in is the ${s.remainingSOSRank===1?'toughest':`${ordinal(s.remainingSOSRank)} toughest`} left in the league${Array.isArray(s.next3)&&s.next3.length?` (next up: ${s.next3.join(', ')})`:''}`);
    if(Number.isFinite(s.playoffOdds))bits.push(`${Math.round(s.playoffOdds)}% to reach the four-team playoff that starts in Week ${PLAYOFF_WEEKS[0]}`);
    if(bits.length)sched.push(E(bits.join('; ')+'.'));
   }
  });
  const schedHTML=sched.length?li(sched):'';

  /* ---- Positional arbitration ---- */
  const arb=[];
  a.rows.forEach(side=>{
   const moved=UNITS.map(k=>({k,rb:side.unitRankBefore?.[k],ra:side.unitRankAfter?.[k],d:(side.unitsAfter[k]||0)-(side.unitsBefore[k]||0)})).filter(x=>Number.isFinite(x.rb)&&Number.isFinite(x.ra)&&(x.rb!==x.ra||Math.abs(x.d)>200));
   if(moved.length)arb.push(`${B_(side.manager)}: ${E(join(moved.map(x=>`${x.k} goes from #${x.rb} to #${x.ra} of ${side.teamCount} (${x.d>0?'+':'−'}${money(Math.abs(x.d))})`)))}.`);
   const weak=a.worstUnitBefore(side);
   const gain=(side.unitsAfter[weak.k]||0)-(side.unitsBefore[weak.k]||0);
   if(Number.isFinite(weak.rank)&&weak.rank>=side.teamCount-2)arb.push(`${E(side.manager)}’s thinnest spot is ${E(weak.k)} (#${weak.rank} in the league)${gain>200?` — this deal addresses it`:gain<-200?` — this deal makes it thinner`:` — this deal does not touch it`}.`);
   const spots=side.in.length-side.out.length;
   if(spots>0)arb.push(`${E(side.manager)} takes on ${plural(spots,'extra roster spot')} and would need to drop someone — that drop is part of the cost.`);
   if(spots<0)arb.push(`${E(side.manager)} frees ${plural(-spots,'roster spot')} to work the wire with.`);
  });
  const steep=Object.entries(a.scarcity).sort((x,y)=>y[1]-x[1])[0];
  if(steep){
   const touched=all.filter(p=>p.pos===steep[0]);
   if(touched.length)arb.push(`${E(steep[0])} is the steepest cliff in this league — ${Math.round(steep[1]*100)}% of value falls away between the last starter and the next man up — so ${E(join(touched.map(nameOf)))} ${touched.length===1?'is':'are'} worth more here than a flat value chart says.`);
  }
  const arbHTML=arb.length?li(arb):'';

  /* ---- Is this a good move? (reasons to accept and decline, per manager) ---- */
  const reasons=side=>{
   const acc=[],dec=[],gain=a.unitGain(side)[0],loss=a.unitGain(side).at(-1),weak=a.worstUnitBefore(side);
   if(m.band!=='even'&&side.valueDelta>0)acc.push(`Comes out ${money(side.valueDelta)} ahead on market value.`);
   if(m.band!=='even'&&side.valueDelta<0)dec.push(`Gives up ${money(Math.abs(side.valueDelta))} more market value than comes back.`);
   if(side.lineupDelta>.5)acc.push(`Rest-of-season starters go up ${pts(side.lineupDelta)} projected points.`);
   if(side.lineupDelta<-.5)dec.push(`Rest-of-season starters drop ${pts(Math.abs(side.lineupDelta))} projected points.`);
   if(side.weekReady&&side.weekDelta>.3)acc.push(`Starts ${pts(side.weekDelta)} more in Week ${w} — the help is immediate.`);
   if(side.weekReady&&side.weekDelta<-.3&&side.lineupDelta>0)dec.push(`Costs ${pts(Math.abs(side.weekDelta))} in Week ${w} even though it pays off later.`);
   if(gain&&gain.d>200)acc.push(`${gain.k} improves by ${money(gain.d)}${gain.k===weak.k?' — the thinnest spot on the roster':''}.`);
   if(loss&&loss.d<-200)dec.push(`${loss.k} weakens by ${money(Math.abs(loss.d))}${loss.k===weak.k?' — already the thinnest spot':''}.`);
   if(side.rankBefore-side.rankAfter>0)acc.push(`Climbs from #${side.rankBefore} to #${side.rankAfter} in league roster value.`);
   if(side.rankAfter-side.rankBefore>0)dec.push(`Drops from #${side.rankBefore} to #${side.rankAfter} in league roster value.`);
   if(side.in.length<side.out.length&&side.lineupDelta>=0)acc.push(`Consolidates ${side.out.length} roster spots into ${side.in.length} without losing lineup points — depth is cheap to replace on the wire, a starter is not.`);
   const countsBefore=countByPos(side.before);
   for(const [pos,min] of Object.entries(MINIMUMS)){
    const have=side.countsAfter[pos]||0;
    if(have>=(countsBefore[pos]||0))continue;
    if(have<min){dec.push(`Cannot fill ${pos} — only ${have} healthy.`);continue}
    if(have===min&&!['K','D/ST'].includes(pos))dec.push(`Leaves exactly ${have} healthy ${pos}${have===1?'':'s'} — one injury and a starting spot is empty.`);
   }
   const s=side.stand;
   if(s&&inSeason){
    if(Number.isFinite(s.luck)&&s.luck<=-.8&&side.lineupDelta>0)acc.push(`At ${recordOf(s)} the record is ${pts(Math.abs(s.luck))} wins worse than the scoring deserves — the roster is better than the standings say, so pushing now is reasonable.`);
    if(Number.isFinite(s.luck)&&s.luck>=.8&&side.lineupDelta<=0)dec.push(`The ${recordOf(s)} record is ${pts(s.luck)} wins better than the scoring — this roster needs real help, not a sideways move.`);
    if(Number.isFinite(s.remainingSOSRank)&&s.remainingSOSRank<=3&&side.lineupDelta>0)acc.push(`The run-in is the ${s.remainingSOSRank===1?'toughest':`${ordinal(s.remainingSOSRank)} toughest`} left, so a stronger starting lineup matters more than bench cover.`);
    if(Number.isFinite(s.benchGap)&&s.benchGap>=12&&side.in.length>side.out.length)dec.push(`${side.manager} already leaves ${pts(s.benchGap)} a week on the bench, so extra depth is worth less than it looks.`);
    if(side.post.key==='contender'&&side.lineupDelta>0&&side.valueDelta<0)acc.push(`A contender paying a premium for lineup points is a normal trade — surplus is worth nothing in December if the lineup falls short.`);
   }
   side.gets.forEach(p=>{
    const r=p.row;
    const rooms=p.mates.filter(x=>x.t.why==='room'&&(x.sig.report||INJURED.has(x.sig.code)||x.sig.missed.length>=1));
    rooms.forEach(x=>{
     const back=x.sig.report?.returnDate?dateShort(x.sig.report.returnDate):'';
     acc.push(`${p.name} has the ${p.team} ${p.pos} room to himself while ${x.t.name} is ${x.sig.status?statusPhrase(x.sig.status):'out'}${back?` (expected back ${back})`:''}.`);
     dec.push(`${p.name}’s role is borrowed from ${x.t.name}${back?`, who is expected back ${back}`:''} — the numbers shrink when he returns.`);
    });
    const qbHurt=p.mates.find(x=>x.t.why==='qb'&&(x.sig.report||INJURED.has(x.sig.code)));
    if(qbHurt)dec.push(`${p.name}’s quarterback ${qbHurt.t.name} is ${qbHurt.sig.status?statusPhrase(qbHurt.sig.status):'out'}.`);
    const tgtOut=p.mates.filter(x=>x.t.why==='targets'&&(x.sig.report||INJURED.has(x.sig.code)||x.sig.missed.length>=1));
    if(tgtOut.length)acc.push(`${join(tgtOut.map(x=>x.t.name))} ${tgtOut.length===1?'is':'are'} out of the ${p.team} passing game, which leaves more targets for ${p.last}.`);
    if(Number.isFinite(p.espn)&&Number.isFinite(p.vegas)&&p.vegas>p.espn*1.12)acc.push(`Vegas has ${p.name} at ${pts(p.vegas)} rest of season, ${pts(p.vegas-p.espn)} above ESPN — the books like him more than the house.`);
    if(Number.isFinite(p.espn)&&Number.isFinite(p.vegas)&&p.espn>p.vegas*1.12)dec.push(`Vegas has ${p.name} at ${pts(p.vegas)} rest of season, ${pts(p.espn-p.vegas)} below ESPN — the books are cooler on him than the house.`);
    if(r&&Number.isFinite(r.trend30)&&r.trend30<=-Math.max(120,r.value*.03))acc.push(`${p.name} is down ${money(Math.abs(r.trend30))} in 30 days — this is the window to buy if the drop was noise.`);
    if(r&&Number.isFinite(r.trend30)&&r.trend30>=Math.max(150,r.value*.04))dec.push(`${p.name} is up ${money(r.trend30)} in 30 days — buying at the top of his range.`);
    if(Number.isFinite(p.grade)&&p.grade>=78&&r&&r.positionRank>12)acc.push(`${p.name} grades ${p.grade.toFixed(1)} at PFF while valued as ${r.position}${r.positionRank} — the tape is ahead of the market.`);
    if(Number.isFinite(p.grade)&&p.grade<62&&r&&r.positionRank<=18)dec.push(`${p.name} is valued as ${r.position}${r.positionRank} on a ${p.grade.toFixed(1)} PFF grade — the market is ahead of the tape.`);
    if(p.rep&&Number.isFinite(p.value)&&p.value>=p.rep.value*1.6)acc.push(`${p.name} is worth ${money(p.value-p.rep.value)} more than the best ${p.pos} on the wire (${p.rep.name}) — a real upgrade, not a lateral move.`);
    if(p.rep&&Number.isFinite(p.value)&&p.value<=p.rep.value*1.15)dec.push(`${p.name} is valued within touching distance of ${p.rep.name}, who is sitting on the wire — giving up a real asset for that is the wrong trade.`);
    if(p.status.key==='bad')dec.push(`${p.name} is ${statusPhrase(p.status.label)} right now${p.report?.returnDate?` (expected back ${dateShort(p.report.returnDate)})`:''}.`);
    if(p.sched?.po&&p.sched.po.rank<=8)acc.push(`${p.name} draws the ${ordinal(p.sched.po.rank)} easiest playoff-week schedule for ${p.pos}s.`);
    if(p.sched?.po&&p.sched.po.rank>=p.sched.po.of-7)dec.push(`${p.name} draws the ${ordinal(p.sched.po.of+1-p.sched.po.rank)} hardest playoff-week schedule for ${p.pos}s.`);
    if(p.sched?.rest&&p.sched.rest.rank<=6)acc.push(`${p.name}’s remaining schedule is the ${ordinal(p.sched.rest.rank)} easiest for ${p.pos}s.`);
    if(p.sched?.rest&&p.sched.rest.rank>=p.sched.rest.of-5)dec.push(`${p.name}’s remaining schedule is the ${ordinal(p.sched.rest.of+1-p.sched.rest.rank)} hardest for ${p.pos}s.`);
    if(p.sched?.playoffs?.some(x=>x.bye))dec.push(`${p.name} has a bye in a playoff week.`);
    const mv=roleMoves(p.u);
    if(mv.up.length)acc.push(`${p.name}’s role is growing — ${mv.up[0]}.`);
    if(mv.down.length)dec.push(`${p.name}’s role is shrinking — ${mv.down[0]}.`);
   });
   return {acc:acc.slice(0,7),dec:dec.slice(0,7)};
  };
  const moveHTML=`<div class="td-move">${a.rows.map(side=>{const r=reasons(side);return `<div class="td-move-side is-${side.key}">
   <div class="td-move-head">${av(side.manager,'td-av-sm')}<b>${E(side.manager)}</b>${side.post.key!=='preseason'&&side.post.key!=='unknown'?`<span class="td-post td-post-${side.post.key}">${E(side.post.label)}</span>`:''}</div>
   <h5 class="is-for">Reasons for ${E(side.manager)} to accept</h5>${r.acc.length?li(r.acc.map(E)):'<p class="td-empty">Nothing here argues for it.</p>'}
   <h5 class="is-against">Reasons for ${E(side.manager)} to decline</h5>${r.dec.length?li(r.dec.map(E)):'<p class="td-empty">No red flags found.</p>'}
  </div>`}).join('')}</div>`;

  /* ---- Why each side does this ---- */
  const story=p=>{
   const bits=[];
   const proj=[Number.isFinite(p.espn)?`ESPN ${pts(p.espn)}`:'',Number.isFinite(p.vegas)?`Vegas ${pts(p.vegas)}`:''].filter(Boolean);
   if(proj.length)bits.push(`projects ${proj.join(' / ')} rest of season${p.u?.ppg?` on ${pts(p.u.ppg)} ppg so far`:''}`);
   keyContext(p).slice(0,3).forEach(k=>bits.push(k));
   return bits;
  };
  const why=a.rows.map(side=>{
   const s=side.stand,weak=a.worstUnitBefore(side),gain=(side.unitsAfter[weak.k]||0)-(side.unitsBefore[weak.k]||0);
   const parts=[],sentences=[];
   side.gets.forEach(p=>{const b=story(p);sentences.push(`${side.manager} gets ${p.name}${b.length?`, who ${b.join('; ')}`:''}.`)});
   side.profiles.forEach(p=>{
    const b=[];
    const proj=[Number.isFinite(p.espn)?`ESPN ${pts(p.espn)}`:'',Number.isFinite(p.vegas)?`Vegas ${pts(p.vegas)}`:''].filter(Boolean);
    if(proj.length)b.push(`${proj.join(' / ')} rest of season`);
    const k=keyContext(p)[0];if(k)b.push(k);
    sentences.push(`${side.manager} gives up ${p.name}${b.length?` (${b.join('; ')})`:''}.`);
   });
   if(side.lineupDelta>.5)parts.push(`the starting lineup projects ${pts(side.lineupDelta)} better after the deal`);
   else if(side.lineupDelta<-.5)parts.push(`the starting lineup projects ${pts(Math.abs(side.lineupDelta))} worse after the deal, so this only works if the incoming player’s situation beats his projection`);
   if(gain>200&&Number.isFinite(weak.rank)&&weak.rank>=side.teamCount-3)parts.push(`it fixes the roster’s weakest unit (${weak.k}, #${weak.rank} in the league)`);
   if(!side.in.length)parts.push(`nothing comes back — this only makes sense as a roster-spot clearance`);
   else if(!side.out.length)parts.push(`nothing goes out — a free addition, at the cost of a roster spot`);
   else if(side.in.length<side.out.length)parts.push(`it turns ${side.out.length} pieces into ${side.in.length} — the consolidation move a team with a full bench makes`);
   else if(side.in.length>side.out.length)parts.push(`it spreads one asset across ${side.in.length} spots — the depth move a team with injuries or byes makes`);
   if(s&&inSeason){
    if(side.post.key==='contender'&&side.lineupDelta>0)parts.push(`at ${recordOf(s)} the season is about Weeks ${PLAYOFF_WEEKS[0]}–${PLAYOFF_WEEKS.at(-1)}, so lineup points now and the playoff-week matchups matter more than anything else`);
    else if(side.post.key==='contender')parts.push(`at ${recordOf(s)} a contender should only be buying lineup points, and this does not add them on projection`);
    else if(side.post.key==='fading'&&side.gets.some(p=>keyContext(p).length))parts.push(`at ${recordOf(s)} this is a swing on the situation changing, which is the right kind of bet for a team that needs upside`);
    else if(side.post.key==='fading')parts.push(`at ${recordOf(s)} nothing about this changes the season`);
    else parts.push(`at ${recordOf(s)} the next few weeks decide the season, so the immediate lineup matters most`);
   }
   if(m.band!=='even')parts.push(side.valueDelta>0?`it banks ${money(side.valueDelta)} of market value on the way`:`it costs ${money(Math.abs(side.valueDelta))} of market value to do it`);
   return `<p>${sentences.map(x=>{const i=x.indexOf(' ');return B_(x.slice(0,i))+E(x.slice(i))}).join(' ')} ${E(cap(parts.join('; '))+'.')}</p>`;
  }).join('');

  /* ---- The read ---- */
  const accept=side=>{
   const g=gradeFor(side,m);
   let sc=g.score||0;
   const weak=a.worstUnitBefore(side);
   if((side.unitsAfter[weak.k]||0)-(side.unitsBefore[weak.k]||0)>200)sc+=2;
   if(side.lineupDelta>.5)sc+=1.5;else if(side.lineupDelta<-.5)sc-=1.5;
   if(side.gets.some(p=>p.status.key==='bad'))sc-=2;
   if(side.gets.some(p=>p.mates.some(x=>x.t.why==='room'&&(x.sig.report||INJURED.has(x.sig.code)))))sc+=1;
   return {score:sc,label:sc>=6?'Likely':sc>=-2.5?'Could go either way':sc>=-9?'Needs a sweetener':'Unlikely',
    verb:sc>=6?'is likely':sc>=-2.5?'could go either way':sc>=-9?'would want a sweetener':'is unlikely',key:sc>=6?'good':sc>=-2.5?'even':'bad'};
  };
  const accA=accept(A),accB=accept(B);
  const read=[];
  /* 1. the biggest swing factor */
  const swings=[];
  all.forEach(p=>{
   p.mates.filter(x=>x.t.why==='room'&&(x.sig.report||INJURED.has(x.sig.code)||x.sig.missed.length>=2)).forEach(x=>{
    const back=x.sig.report?.returnDate?dateShort(x.sig.report.returnDate):'';
    const backWeek=x.sig.report?.returnDate?Math.round((Date.parse(x.sig.report.returnDate)-Date.now())/(7*864e5)):null;
    swings.push(`${p.name}’s current role exists because ${x.t.name} is ${x.sig.status?statusPhrase(x.sig.status):'out'}${back?` — expected back ${back}${Number.isFinite(backWeek)?`, about ${plural(Math.max(0,backWeek),'week')} away${backWeek>0&&w+backWeek<PLAYOFF_WEEKS[0]?', before the playoffs':w+backWeek>=PLAYOFF_WEEKS[0]?', which runs into the playoff weeks':''}`:''}`:''}. ${p.to.manager} is buying that window; ${p.from.manager} is selling it at its widest`);
   });
   const q=p.pos!=='QB'?qbChange(p.team):null;
   if(q)swings.push(`${p.name} is playing in an offence that changed quarterback to ${q.now} in Week ${q.since}, so his season numbers before that are the wrong baseline`);
   if(p.status.key==='bad')swings.push(`${p.name} is ${statusPhrase(p.status.label)}${p.report?.returnDate?` until about ${dateShort(p.report.returnDate)}`:''}, so ${p.to.manager} is paying for games that have not happened yet`);
  });
  if(swings.length)read.push(`The biggest thing${swings.length>1?'s':''} in this deal: ${swings.slice(0,3).map(x=>x+'.').join(' ')}`);
  /* 2. projections and schedule, both packages */
  const sumK=(list,k)=>list.reduce((n,p)=>n+(Number.isFinite(p[k])?p[k]:0),0);
  const projLine=[];
  if(sumK(A.gets,'espn')||sumK(B.gets,'espn'))projLine.push(`ESPN projects the players ${A.manager} receives at ${pts(sumK(A.gets,'espn'))} rest of season against ${pts(sumK(B.gets,'espn'))} for ${B.manager}’s side`);
  if(sumK(A.gets,'vegas')||sumK(B.gets,'vegas'))projLine.push(`Vegas has it ${pts(sumK(A.gets,'vegas'))} to ${pts(sumK(B.gets,'vegas'))}`);
  const poA=A.gets.filter(p=>p.sched?.po),poB=B.gets.filter(p=>p.sched?.po);
  if(poA.length||poB.length)projLine.push(`for Weeks ${PLAYOFF_WEEKS[0]}–${PLAYOFF_WEEKS.at(-1)} ${join([...poA,...poB].map(p=>`${p.last} has the ${ordinal(p.sched.po.rank)} easiest draw for ${p.pos}s`))}`);
  if(projLine.length)read.push(`${projLine.join('; ')}.`);
  /* 3. usage read */
  const usageRead=all.map(p=>{const mv=roleMoves(p.u);if(mv.up.length)return `${p.name}’s ${mv.up[0]}`;if(mv.down.length)return `${p.name}’s ${mv.down[0]}`;return ''}).filter(Boolean);
  if(usageRead.length)read.push(`Usage: ${join(usageRead)}.`);
  /* 4. fit */
  if(inSeason){
   const fits=side=>side.post.key==='contender'?(side.lineupDelta>0?`It fits ${side.manager}’s season.`:`It does not fit ${side.manager}’s season on projection (a contender needs the lineup points).`):side.post.key==='fading'?(side.gets.some(p=>keyContext(p).length)||side.valueDelta>0?`It fits ${side.manager}’s season.`:`It does not do much for ${side.manager}’s season.`):(side.lineupDelta>0?`It helps ${side.manager} in the weeks that decide the season.`:`It does not help ${side.manager} in the weeks that decide the season.`);
   read.push(`Where each team is: ${fits(A)} ${fits(B)}`);
  }
  /* 5. verdict */
  const gA=gradeFor(A,m),gB=gradeFor(B,m);
  const bal=balanceOptions(m);
  read.push(`Grades: ${A.manager} ${gA.letter}, ${B.manager} ${gB.letter}. ${A.manager} ${accA.verb}${accA.verb==='could go either way'?'':' to accept'}; ${B.manager} ${accB.verb}${accB.verb==='could go either way'?'':' to accept'}.${bal?` ${bal.options[0].from.manager} ${bal.options[0].kind==='add'?'adding':'keeping'} ${join(bal.options[0].entries.map(entryName))} is the version both sides can say yes to.`:''}`);
  const readHTML=para(read.map(E))+`<div class="td-accept">${[[A,accA],[B,accB]].map(([side,ac])=>`<span class="td-accept-pill tone-${ac.key}">${av(side.manager,'td-av-sm')}<b>${E(side.manager)}</b><i>${E(ac.label)}</i></span>`).join('')}</div>`;

  return `<div class="td-report">
   ${section('summary','Summary',summaryHTML)}
   ${section('breakdown','Breakdown',breakdownHTML)}
   ${section('score','Factor scorecard',scoreHTML)}
   ${section('value','Is it a good value?',valueHTML)}
   ${section('injury','Injury ecosystem',injuryHTML)}
   ${section('usage','Usage and opportunity',usageHTML)}
   ${section('situation','Situational changes',situationHTML)}
   ${section('schedule','Schedule and playoff leverage',schedHTML,`This league’s playoffs are NFL Weeks ${PLAYOFF_WEEKS[0]} and ${PLAYOFF_WEEKS.at(-1)}.`)}
   ${section('arb','Positional arbitration',arbHTML)}
   ${section('move','Is this a good move?',moveHTML)}
   ${section('why','Why each side does this',why)}
   ${section('read','The read',readHTML)}
  </div>`;
 }

 /* ---------- verdict ---------- */
 const BAND={even:{label:'Balanced',tone:'even'},slight:{label:'Slight tilt',tone:'slight'},clear:{label:'Clear tilt',tone:'clear'},wide:{label:'Wide gap',tone:'wide'},empty:{label:'Build a deal',tone:'even'}};

 function verdict(m){
  const info=BAND[m.band];
  const total=m.outA+m.outB;
  /* An empty deal sits evenly rather than showing one side at the minimum width. */
  const aw=total>0?clamp(100*m.outA/total,6,94):50,bw=100-aw;
  /* The needle runs from "more value to B" on the left to "more value to A" on the right. */
  const needle=clamp(50+(m.net/Math.max(m.outA,m.outB,1))*140,3,97);
  const headline=m.band==='empty'?'Pick players from each side':m.band==='even'?'Balanced on market value'
   :`${money(Math.abs(m.net))} more market value lands with ${E(m.sides.find(s=>s.key===m.winner).manager)}`;
  return `<section class="td-verdict tone-${info.tone}">
   <div class="td-verdict-top">
    <span class="td-band">${E(info.label)}</span>
    <h3>${headline}</h3>
    <p>${m.band==='empty'?'Market Value drives the numbers; lineup impact, roster fit, injuries, usage and schedule are written up underneath.':`${money(m.outA)} out from ${E(m.sides[0].manager)} against ${money(m.outB)} out from ${E(m.sides[1].manager)} — a ${(m.gap*100).toFixed(1)}% gap.`}</p>
   </div>
   <div class="td-split" role="img" aria-label="Value each side sends">
    <span class="a" style="width:${aw.toFixed(1)}%"><i>${E(m.sides[0].manager)}</i><b>${money(m.outA)}</b></span>
    <span class="b" style="width:${bw.toFixed(1)}%"><i>${E(m.sides[1].manager)}</i><b>${money(m.outB)}</b></span>
   </div>
   <div class="td-gauge">
    <span class="td-gauge-end">More to ${E(m.sides[1].manager)}</span>
    <div class="td-gauge-track"><i class="td-gauge-fair"></i><i class="td-gauge-pin" style="left:${needle.toFixed(1)}%"></i></div>
    <span class="td-gauge-end right">More to ${E(m.sides[0].manager)}</span>
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
   <div class="td-units-key"><i class="key-before"></i><span>Today</span><i class="key-up"></i><span>Added by trade</span><i class="key-down"></i><span>After trade</span><i class="key-gone"></i><span>Traded away</span><span class="td-units-rankkey">rank in league</span></div>
   ${UNITS.map(key=>{
   const before=side.unitsBefore[key]||0,after=side.unitsAfter[key]||0,d=after-before;
   const rb=side.unitRankBefore?.[key],ra=side.unitRankAfter?.[key];
   const moved=Number.isFinite(rb)&&Number.isFinite(ra)&&rb!==ra;
   return `<div class="td-unit${d>1?' is-up':d<-1?' is-down':' is-same'}">
    <span class="td-unit-name">${key}</span>
    <span class="td-unit-rank ${rankTone(rb)}">${Number.isFinite(rb)?'#'+rb:'—'}${moved?`<em>→ #${ra}</em>`:''}</span>
    <div class="td-unit-track">
     ${d>1
      ?`<i class="base" style="width:${w(before)}"></i><i class="gain" style="left:${w(before)};width:${w(d)}"></i>`
      :d<-1
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
  return `<section class="td-impact td-impact-${side.key}">
   <div class="td-impact-head">${av(side.manager,'td-av-sm')}<b>${E(side.manager)}</b><span class="td-impact-net ${side.valueDelta>0?'is-up':side.valueDelta<0?'is-down':''}">${side.valueDelta>0?'+':''}${money(side.valueDelta)} value</span></div>
   <div class="td-metrics">
    <div class="td-metric"><small>Roster value · ${scopeNow()==='all'?'all players':'starters'}</small><b>${money(side.marketAfter)}</b><i class="${side.marketAfter>side.marketBefore?'is-up':side.marketAfter<side.marketBefore?'is-down':''}">${money(side.marketBefore)} → ${money(side.marketAfter)}</i></div>
    <div class="td-metric"><small>League rank</small><b>#${side.rankAfter}</b><i class="${rankMove>0?'is-up':rankMove<0?'is-down':''}">${rankMove===0?'no change':`${rankMove>0?'▲':'▼'} ${Math.abs(rankMove)} from #${side.rankBefore}`}</i></div>
    <div class="td-metric"><small>Starting lineup</small><b>${pts(side.lineupAfter.total)}</b><i class="${lift>.05?'is-up':lift<-.05?'is-down':''}">${Math.abs(lift)<.05?'unchanged':`${lift>0?'+':'−'}${pts(Math.abs(lift))} projected`}</i></div>
   </div>
   ${unitBars(side,m)}
  </section>`;
 }


 /* ---------- analysis panel ---------- */
 function scorecard(a){
  return `<div class="td-score"><div class="td-score-key"><span>${E(a.rows[0].manager)}</span><i aria-hidden="true">◄ ►</i><span>${E(a.rows[1].manager)}</span></div>${a.factors.map(f=>`<div class="td-score-row lean-${f.lean}">
   <span class="td-score-label">${E(f.label)}</span>
   <div class="td-score-meter"><i class="a"></i><i class="dot"></i><i class="b"></i></div>
   <span class="td-score-note">${E(f.note)}</span>
  </div>`).join('')}</div>`;
 }

 function analysisPanel(m){
  const a=analyse(m);
  if(!a)return '';
  return `<section class="td-analysis">
   <div class="td-analysis-head"><h3>Trade analysis</h3><p class="td-timing"><b>Week ${week()}.</b> ${E(timingNote().copy)}</p></div>
   ${report(m,a)}
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
  warmWeek();ensureUsage();ensureSchedule();
  const m=model();
  const body=HJTD.mode==='finder'?finderPanel()
   :`${verdict(m)}<div class="td-board">${sideColumn(m.sides[0],m)}<div class="td-mid"><button type="button" class="td-swap" data-td-swap aria-label="Swap sides">⇄</button><button type="button" class="td-clear" data-td-clear>Clear</button></div>${sideColumn(m.sides[1],m)}</div><div class="td-impacts">${m.sides.map(s=>impact(s,m)).join('')}</div>${balancePanel(m)}${analysisPanel(m)}`;
  return `<section class="hq-module hj15-shell td-shell"><div class="hq-module-head"><h3 class="hq-module-title">Trade Desk</h3><span class="hq-module-note">Built on Market Value</span></div>${toolbar()}${body}</section>`;
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
    const [side,ids]=String(toggle.dataset.tdToggle).split(':');
    const set=side==='a'?HJTD.give:HJTD.get;
    String(ids).split(',').filter(Boolean).forEach(id=>{set.has(id)?set.delete(id):set.add(id)});
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
