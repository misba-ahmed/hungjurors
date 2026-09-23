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

 const HJTD={a:'',b:'',give:new Set(),get:new Set(),pick:'',query:'',mode:'build',finder:null,finding:false,scope:'one'};
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
  const out=Object.fromEntries(UNITS.map(k=>[k,0]));
  const pool={};
  list.forEach(e=>{if(isIR(e))return;const p=hjPlayerPosition(e),v=valueOf(e);if(!POS.includes(p)||!Number.isFinite(v))return;(pool[p]=pool[p]||[]).push(v)});
  for(const k in pool)pool[k].sort((a,b)=>b-a);
  const take=(p,n)=>(pool[p]||[]).slice(0,n).reduce((s,v)=>s+v,0);
  out.QB=take('QB',1);out.RB=take('RB',2);out.WR=take('WR',2);out.TE=take('TE',1);
  const rest=[...(pool.RB||[]).slice(2),...(pool.WR||[]).slice(2),...(pool.TE||[]).slice(1)].sort((a,b)=>b-a);
  out.FLEX=rest.length?rest[0]:0;
  return out;
 }
 const marketTotal=list=>list.reduce((s,e)=>{const v=valueOf(e);return s+(Number.isFinite(v)?v:0)},0);

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
   const list=allRosters.map(r=>({id:r.id,value:swap&&swap[r.id]!==undefined?swap[r.id]:r.value}));
   const mine=list.find(r=>r.id===String(id))?.value??value;
   return 1+list.filter(r=>r.value>mine+.5).length;
  };
  const swap={[String(HJTD.a)]:sides[0].marketAfter,[String(HJTD.b)]:sides[1].marketAfter};
  sides.forEach(side=>{
   side.rankBefore=rankOf(side.team?.id,side.marketBefore,null);
   side.rankAfter=rankOf(side.team?.id,side.marketAfter,swap);
  });

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
  const scope=HJTD.scope==='all'?teams().filter(t=>String(t.id)!==String(HJTD.a)):[teamById(HJTD.b)].filter(Boolean);
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
  const list=options.filter(e=>!query||entryName(e).toLowerCase().includes(query)||hjPlayerPosition(e).toLowerCase()===query)
   .sort((x,y)=>(valueOf(y)??-1)-(valueOf(x)??-1));
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
    <div class="td-pool-list">${list.length?list.map(e=>playerChip(e,{side:key,action:true})).join(''):'<p class="td-empty">No players match.</p>'}</div>
   </div>
  </section>`;
 }

 /* ---------- verdict ---------- */
 const BAND={even:{label:'Even deal',tone:'even'},slight:{label:'Slight edge',tone:'slight'},clear:{label:'Clear edge',tone:'clear'},lopsided:{label:'Lopsided',tone:'bad'},empty:{label:'Build a deal',tone:'even'}};

 function verdict(m){
  const info=BAND[m.band];
  const total=Math.max(m.outA+m.outB,1);
  const aw=clamp(100*m.outA/total,6,94),bw=100-aw;
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
 function unitBars(side){
  return `<div class="td-units">${UNITS.map(key=>{
   const before=side.unitsBefore[key]||0,after=side.unitsAfter[key]||0;
   const max=Math.max(before,after,1),d=after-before;
   return `<div class="td-unit${d>1?' is-up':d<-1?' is-down':' is-same'}">
    <span class="td-unit-name">${key==='FLEX'?'FX':key}</span>
    <div class="td-unit-track"><i class="before" style="width:${(100*before/max).toFixed(1)}%"></i><i class="after" style="width:${(100*after/max).toFixed(1)}%"></i></div>
    <span class="td-unit-delta">${d>1?'+':''}${Math.abs(d)<1?'—':money(d)}</span>
   </div>`;
  }).join('')}</div>`;
 }

 function impact(side,m){
  const rankMove=side.rankBefore-side.rankAfter;
  const lift=side.lineupDelta;
  return `<section class="td-impact">
   <div class="td-impact-head">${av(side.manager,'td-av-sm')}<b>${E(side.manager)}</b><span class="td-impact-net ${side.valueDelta>0?'is-up':side.valueDelta<0?'is-down':''}">${side.valueDelta>0?'+':''}${money(side.valueDelta)} value</span></div>
   <div class="td-metrics">
    <div class="td-metric"><small>Roster value</small><b>${money(side.marketAfter)}</b><i class="${side.marketAfter>side.marketBefore?'is-up':side.marketAfter<side.marketBefore?'is-down':''}">${money(side.marketBefore)} → ${money(side.marketAfter)}</i></div>
    <div class="td-metric"><small>League rank</small><b>#${side.rankAfter}</b><i class="${rankMove>0?'is-up':rankMove<0?'is-down':''}">${rankMove===0?'no change':`${rankMove>0?'▲':'▼'} ${Math.abs(rankMove)} from #${side.rankBefore}`}</i></div>
    <div class="td-metric"><small>Starting lineup</small><b>${pts(side.lineupAfter.total)}</b><i class="${lift>.05?'is-up':lift<-.05?'is-down':''}">${Math.abs(lift)<.05?'unchanged':`${lift>0?'+':'−'}${pts(Math.abs(lift))} projected`}</i></div>
   </div>
   ${unitBars(side)}
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

 /* ---------- finder ---------- */
 function finderPanel(){
  const found=HJTD.finder&&HJTD.finder.from===HJTD.a&&HJTD.finder.scope===HJTD.scope?HJTD.finder:null;
  const me=managerOf(teamById(HJTD.a));
  const controls=`<div class="td-finder-controls">
    <div class="td-seg">${[['one','This partner'],['all','Whole league']].map(([id,label])=>`<button type="button" class="${HJTD.scope===id?'is-on':''}" data-td-scope="${id}">${label}</button>`).join('')}</div>
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
  return `<div class="hj15-toolbar td-toolbar">
   <div class="hj15-group">${views.map(([id,label])=>`<button type="button" class="hj15-toggle${id==='trade'?' active':''}" data-hq-strength-view="${id}" aria-pressed="${id==='trade'}">${label}</button>`).join('')}</div>
   <div class="hj15-group">${modes.map(([id,label])=>`<button type="button" class="hj15-toggle${HJTD.mode===id?' active':''}" data-td-mode="${id}" aria-pressed="${HJTD.mode===id}">${label}</button>`).join('')}</div>
  </div>`;
 }

 function shell(){
  if(!window.HJMV?.ready){window.HJMV?.load?.();return `<section class="hq-module hj15-shell td-shell"><div class="hq-module-head"><h3 class="hq-module-title">Trade Desk</h3></div>${toolbar()}<div class="hq-empty">Loading market values…</div></section>`}
  if(!ensureSides())return `<section class="hq-module hj15-shell td-shell"><div class="hq-module-head"><h3 class="hq-module-title">Trade Desk</h3></div>${toolbar()}<div class="hq-empty">League rosters are still loading.</div></section>`;
  const m=model();
  const body=HJTD.mode==='finder'?finderPanel()
   :`${verdict(m)}<div class="td-board">${sideColumn(m.sides[0],m)}<div class="td-mid"><button type="button" class="td-swap" data-td-swap aria-label="Swap sides">⇄</button><button type="button" class="td-clear" data-td-clear>Clear</button></div>${sideColumn(m.sides[1],m)}</div><div class="td-impacts">${m.sides.map(s=>impact(s,m)).join('')}</div>${extras(m)}`;
  return `<section class="hq-module hj15-shell td-shell"><div class="hq-module-head"><h3 class="hq-module-title">Trade Desk</h3><span class="hq-module-note">Priced on Market Value</span></div>${toolbar()}${body}</section>`;
 }

 /* ---------- wiring ---------- */
 function rerender(){if(typeof hjRerenderStrength==='function')hjRerenderStrength()}

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
   const scope=t.closest?.('[data-td-scope]');
   if(scope){event.preventDefault();event.stopPropagation();HJTD.scope=scope.dataset.tdScope;HJTD.finder=null;rerender();return}
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
