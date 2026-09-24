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

 const DRAFT_KEY='hj-trade-draft-v1';
 let draftInFlight=false,restoreTradeView=false;
 function saveTradeDraft(pending=draftInFlight){
  if(!HJTD.a||!HJTD.b)return;
  draftInFlight=pending;
  const saved=JSON.stringify({season:Number(NFL_SEASON),at:Date.now(),a:HJTD.a,b:HJTD.b,
   give:[...HJTD.give],get:[...HJTD.get],mode:HJTD.mode,scope:scopeNow(),pending,
   tradeView:HJ_HQ_STATE?.activeTab==='strength'&&HJ_STRENGTH_STATE.view==='trade'});
  // Keep a fallback for browsers that discard session storage when reclaiming a tab.
  try{sessionStorage.setItem(DRAFT_KEY,saved)}catch(_){}
  try{localStorage.setItem(DRAFT_KEY,saved)}catch(_){}
 }
 function restoreTradeDraft(){
  let saved;
  for(const name of ['sessionStorage','localStorage']){
   try{saved=JSON.parse(globalThis[name]?.getItem(DRAFT_KEY)||'null')}catch(_){saved=null}
   if(saved&&saved.season===Number(NFL_SEASON)&&Number.isFinite(saved.at)&&Date.now()-saved.at<86400000&&
    typeof saved.a==='string'&&typeof saved.b==='string'&&saved.a!==saved.b&&
    ['give','get'].every(key=>Array.isArray(saved[key])&&saved[key].length<=40&&saved[key].every(id=>typeof id==='string'&&id.length<100)))break;
   saved=null;
  }
  if(!saved)return;
  HJTD.a=saved.a;HJTD.b=saved.b;HJTD.give=new Set(saved.give);HJTD.get=new Set(saved.get);
  HJTD.mode=saved.mode==='finder'?'finder':'build';
  if(saved.pending||(saved.tradeView&&location.hash==='#roster-strength')){
   restoreTradeView=true;
   HJ_STRENGTH_STATE.view='trade';HJ_STRENGTH_STATE.scope=saved.scope==='starters'?'starters':'all';
   HJ_HQ_STATE.activeTab='strength';
   try{history.replaceState(history.state,'','#roster-strength')}catch(_){}
  }
  // Never resume generation automatically after an interrupted page.
  saveTradeDraft(false);
 }


 const esc0=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const E=s=>typeof esc==='function'?esc(s):esc0(s);
 const money=v=>Number.isFinite(v)?Math.round(v).toLocaleString('en-US'):'—';
 const pts=v=>Number.isFinite(v)?Math.round(v).toLocaleString('en-US'):'—';
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
  return projectionFact(entry,'combo').remaining;
 }
 const valueOf=entry=>{const v=window.HJMV?.entryValue?.(entry);return Number.isFinite(v)?v:null};
 const marketRow=entry=>window.HJMV?.entryRow?.(entry)||null;
 const gradeOf=entry=>{const g=typeof hjPffEntryGrade==='function'?hjPffEntryGrade(entry):null;return Number.isFinite(g)?g:null};

 /* ---------- lineup optimiser (fast; used thousands of times by the finder) ---------- */
 function lineupPoints(list){
  const pool={},used=new Set(),slots=[];
  for(const item of list){if(!item||!Number.isFinite(item.pts)||item.ir)continue;(pool[item.pos]=pool[item.pos]||[]).push(item)}
  for(const k in pool)pool[k].sort((a,b)=>b.pts-a.pts);
  let total=0,filled=0,need=0;
  const take=(slot,item)=>{need++;slots.push({slot,entry:item?.entry||null,points:item?.pts??null});if(item){used.add(item);total+=item.pts;filled++}};
  for(const [pos,count] of LINEUP)for(let i=0;i<count;i++)take(count>1?pos+(i+1):pos,(pool[pos]||[]).find(x=>!used.has(x)));
  const flex=FLEXABLE.flatMap(pos=>pool[pos]||[]).filter(x=>!used.has(x)).sort((a,b)=>b.pts-a.pts)[0];
  take('FLEX',flex);
  for(const pos of ['D/ST','K'])take(pos,(pool[pos]||[]).find(x=>!used.has(x)));
  return {total,filled,need,short:need-filled,slots,bench:list.filter(x=>!used.has(x)).map(x=>x.entry)};
 }
 const toItems=list=>list.map(e=>({pos:hjPlayerPosition(e),pts:projOf(e),ir:isIR(e)||injuryOf(e)==='INJURY_RESERVE',entry:e}));

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


 /* Numeric dossier facts. These functions make no acceptance or prose verdict. */
 const remainingWeeks=()=>Math.max(1,PLAYOFF_WEEKS.at(-1)-week()+1);
 function projectionFact(entry,source='combo'){
  const raw=hj6Projection(entry,source,'season',week(),HJ_LEAGUE_SEASON);
  const espn=source==='combo'?hj6Projection(entry,'espn','season',week(),HJ_LEAGUE_SEASON):null;
  const vegas=source==='combo'?hj6Projection(entry,'vegas','season',week(),HJ_LEAGUE_SEASON):null;
  const full=Number.isFinite(raw)?raw:source==='combo'?(Number.isFinite(espn)?espn:vegas):null;
  const games=teamGames(hjPlayerTeam(entry));
  const future=games?.filter(g=>g.week>=week()&&g.week<=18);
  const fantasy=future?.filter(g=>g.week<=PLAYOFF_WEEKS.at(-1));
  const rows=usageOfEntry(entry)?.series?.filter(r=>r.week<week());
  const actual=rows?.length?rows.reduce((n,r)=>n+(r.pts||0),0):week()===1||USAGE.ready?0:null;
  // Both season feeds are full-season totals. Never label those totals as ROS.
  // The remaining total is the season estimate less completed-week scoring,
  // apportioned to this league's remaining calendar (ending in Week 16).
  const remaining=Number.isFinite(full)&&Number.isFinite(actual)&&future?.length
   ?Math.max(0,full-actual)*fantasy.length/future.length:null;
  return {fullSeason:finite(full),completedPoints:actual,remaining:finite(remaining),
   perWeek:Number.isFinite(remaining)?remaining/remainingWeeks():null,
   remainingNflGames:future?.length??null,remainingFantasyGames:fantasy?.length??null,
   basis:'Full-season projection less completed-week points, prorated by scheduled games through Week 16'};
 }
 const finite=v=>Number.isFinite(v)?v:null;
 function rosterCapacity(before){
  const slots=HJ_LEAGUE_STATE?.data?.settings?.rosterSettings?.lineupSlotCounts;
  if(slots&&Object.keys(slots).length){
   return Object.entries(slots).filter(([k])=>Number(k)!==21).reduce((n,[,v])=>n+Math.max(0,Number(v)||0),0);
  }
  return Math.max(before.filter(e=>!isIR(e)).length,...teams().map(t=>rosterOf(t.id).filter(e=>!isIR(e)).length));
 }
 function dropPlan(before,rawAfter,incoming=[]){
  const capacity=rosterCapacity(before),after=rawAfter.slice(),drops=[];
  const irCapacity=Number(HJ_LEAGUE_STATE?.data?.settings?.rosterSettings?.lineupSlotCounts?.[21]??before.filter(isIR).length);
  let irUsed=0;
  for(let i=0;i<after.length;i++)if(isIR(after[i])){if(irUsed++>=irCapacity)after[i]={...after[i],lineupSlotId:20}}
  let excess=Math.max(0,after.filter(e=>!isIR(e)).length-capacity);
  const low=(a,b)=>(valueOf(a)??Infinity)-(valueOf(b)??Infinity)||(projOf(a)??0)-(projOf(b)??0)||entryId(a).localeCompare(entryId(b));
  while(excess>0){
   const eligible=after.filter(e=>!isIR(e));
   // Compare valued players first; an unvalued kicker is not a zero-value RB.
   const valued=eligible.filter(e=>Number.isFinite(valueOf(e))).sort(low);
   const candidate=valued[0]||eligible.slice().sort((a,b)=>(projOf(a)??0)-(projOf(b)??0))[0];
   if(!candidate)break;
   drops.push(candidate);after.splice(after.indexOf(candidate),1);excess--;
  }
  return {capacity,after,drops};
 }
 function lineupFor(list,source='combo',horizon='ros'){
  return lineupPoints(list.map(entry=>({entry,pos:hjPlayerPosition(entry),ir:isIR(entry)||injuryOf(entry)==='INJURY_RESERVE',
   pts:horizon==='week'?weeklyProjection(entry,source):projectionFact(entry,source).remaining})));
 }
 function weeklyLoaded(){
  return typeof HJ6_WEEK!=='undefined'&&HJ6_WEEK.ready&&
   (typeof hj6WeekKey!=='function'||HJ6_WEEK.key===hj6WeekKey(HJ_LEAGUE_STATE?.data));
 }
 function weeklyProjection(entry,source='combo'){
  if(!weeklyLoaded())return null;
  if((source==='vegas'||source==='combo')&&typeof HJ_PROJECTION_STATE!=='undefined'){
   const d=HJ_PROJECTION_STATE.weekly;
   const feedWeek=num(d?.week??d?.scoringPeriodId);
   if(feedWeek!==null&&feedWeek!==week())return null;
  }
  return finite(hj6Projection(entry,source,'week',week(),HJ_LEAGUE_SEASON));
 }
 function entryFact(entry){
  if(!entry)return null;
  return {id:entryId(entry),name:entryName(entry),position:hjPlayerPosition(entry),team:T(hjPlayerTeam(entry)),
   value:valueOf(entry),ir:isIR(entry),injuryStatus:injuryOf(entry),bye:byeOf(hjPlayerTeam(entry)),
   rosterSlotId:entry.lineupSlotId,projectedRemaining:projOf(entry)};
 }
 function slotsFact(lineup){
  return {slots:lineup.slots.map(x=>({slot:x.slot,player:entryFact(x.entry),points:finite(x.points)})),
   bench:lineup.bench.map(entryFact),points:lineup.total,openSlots:lineup.slots.filter(x=>!x.entry).map(x=>x.slot)};
 }
 function lineupChanges(side){
  const before=side.lineupBefore,after=side.lineupAfter;
  const ready=side.after.filter(e=>POS.includes(hjPlayerPosition(e))&&!isIR(e)&&injuryOf(e)!=='INJURY_RESERVE').every(e=>Number.isFinite(projOf(e)));
  const oldIds=new Set(before.slots.filter(x=>x.entry).map(x=>entryId(x.entry)));
  const newIds=new Set(after.slots.filter(x=>x.entry).map(x=>entryId(x.entry)));
  return {incoming:side.in.map(e=>({player:entryFact(e),
   slot:after.slots.find(x=>x.entry&&entryId(x.entry)===entryId(e))?.slot||(side.drops.some(d=>entryId(d)===entryId(e))?'dropped':isIR(e)?'IR':ready?'bench':'unassigned'),
   replaces:entryFact(before.slots.find(x=>x.slot===after.slots.find(y=>y.entry&&entryId(y.entry)===entryId(e))?.slot)?.entry)})),
   benched:ready?side.after.filter(e=>oldIds.has(entryId(e))&&!newIds.has(entryId(e))).map(entryFact):[]};
 }
 function byeCoverage(side){
  const calendar=[...new Set([...side.before,...side.after].map(e=>byeOf(hjPlayerTeam(e))).filter(w=>w>=week()&&w<=16))].sort((a,b)=>a-b);
  const forWeek=(list,w)=>lineupPoints(toItems(list.filter(e=>byeOf(hjPlayerTeam(e))!==w)));
  return {incoming:side.in.map(e=>{
   const bye=byeOf(hjPlayerTeam(e));if(!bye||bye<week()||bye>16)return null;
   const lineup=forWeek(side.after,bye);
   return {player:entryFact(e),week:bye,availableAtPosition:side.after.filter(x=>entryId(x)!==entryId(e)&&hjPlayerPosition(x)===hjPlayerPosition(e)&&byeOf(hjPlayerTeam(x))!==bye&&!isIR(x)).map(entryFact),
    lineup:slotsFact(lineup)};
  }).filter(Boolean),weeks:calendar.map(w=>{
   const before=forWeek(side.before,w),after=forWeek(side.after,w);
   return {week:w,before:slotsFact(before),after:slotsFact(after),
    outgoingCoverage:before.slots.filter(x=>x.entry&&side.out.some(e=>entryId(e)===entryId(x.entry))).map(x=>({slot:x.slot,player:entryFact(x.entry)}))};
  })};
 }
 function managerSchedule(side,other){
  let games=[];
  if(typeof scheduleFutureOpponents==='function')games=scheduleFutureOpponents(side.manager,week()-1).filter(x=>x.week<=14);
  if(!games.length)games=(HJ_LEAGUE_STATE?.data?.schedule||[]).filter(g=>g.matchupPeriodId>=week()&&g.matchupPeriodId<=14&&
   [g.home?.teamId,g.away?.teamId].some(id=>String(id)===String(side.team.id))).map(g=>{
    const id=String(g.home?.teamId)===String(side.team.id)?g.away?.teamId:g.home?.teamId;
    return {week:Number(g.matchupPeriodId),opponent:managerOf(teamById(id))};
   });
  const all=games.slice().sort((a,b)=>a.week-b.week).map(g=>({week:g.week,opponent:g.opponent,tradePartner:g.opponent===other.manager}));
  return {nextThree:all.slice(0,3),headToHead:all.filter(x=>x.tradePartner),
   competingForSameSpot:played(side.stand)>=4&&played(other.stand)>=4&&
    [side.stand?.seed,other.stand?.seed].every(x=>Number.isFinite(x)&&x>=3&&x<=6)&&Math.abs(side.stand.w-other.stand.w)<=2};
 }
 const TEAM_CONTEXT={ranks:null,redZone:null,redZonePct:null,promise:null,at:0};
 async function ensureTeamContext(){
  if(USAGE.rows&&typeof pcTeamSeasonRanks==='function')TEAM_CONTEXT.ranks=pcTeamSeasonRanks(USAGE.rows);
  if(TEAM_CONTEXT.promise)return TEAM_CONTEXT.promise;
  if(Date.now()-TEAM_CONTEXT.at<600000||typeof pcLoadTeamRank!=='function')return;
  TEAM_CONTEXT.promise=Promise.allSettled([pcLoadTeamRank('rz',Number(NFL_SEASON)),pcLoadTeamRank('rzPct',Number(NFL_SEASON))]).then(([a,b])=>{
   TEAM_CONTEXT.redZone=a.status==='fulfilled'?a.value:null;TEAM_CONTEXT.redZonePct=b.status==='fulfilled'?b.value:null;TEAM_CONTEXT.at=Date.now();
  }).finally(()=>{TEAM_CONTEXT.promise=null});
  return TEAM_CONTEXT.promise;
 }
 function teamContext(team){
  const t=T(team),rank=TEAM_CONTEXT.ranks?.get(t);
  return {team:t,games:new Set(teamWeeksOf(t)).size,offense:rank||null,
   redZoneTripsPerGame:TEAM_CONTEXT.redZone?.get(t)||null,redZoneTdRate:TEAM_CONTEXT.redZonePct?.get(t)||null};
 }
 function freeAgentFact(row){
  return row?{id:String(row.espnId),name:row.name,position:row.position,team:row.team,value:row.value,positionalRank:row.positionRank}:null;
 }
 function managerFact(side,other){
  const s=side.stand,changes=lineupChanges(side),byes=byeCoverage(side);
  const unitRanks=Object.fromEntries(UNITS.map(pos=>[pos,{before:side.unitRankBefore[pos],after:side.unitRankAfter[pos]}]));
  return {id:String(side.team.id),side:side.key,name:side.manager,gamesPlayed:played(s),
   record:s?{w:s.w,l:s.l,t:s.t}:null,seed:finite(s?.seed),playoffOdds:finite(s?.playoffOdds),
   expectedWins:finite(s?.expectedWins),luckWins:finite(s?.luck),benchPointsWasted:finite(s?.benchGap),
   lastThreeAverage:finite(s?.last3Avg),lastThreeGames:Math.min(3,played(s)),
   remainingScheduleRank:finite(s?.remainingSOSRank),remainingScheduleRankDirection:'1 is hardest',posture:side.post,
   schedule:managerSchedule(side,other),roster:{before:side.before.map(entryFact),after:side.after.map(entryFact),capacity:side.capacity,
    countsBefore:countByPos(side.before),countsAfter:countByPos(side.after)},
   lineup:{before:slotsFact(side.lineupBefore),after:slotsFact(side.lineupAfter),changes,
    thisWeek:side.weekReady?{before:slotsFact(side.weekBefore),after:slotsFact(side.weekAfter)}:null},
   dropCandidates:side.drops.map(e=>({player:entryFact(e),aboveReplacement:Number.isFinite(valueOf(e))&&replacementFor(hjPlayerPosition(e))?valueOf(e)-replacementFor(hjPlayerPosition(e)).value:null})),
   byeCoverage:byes,unitRanks,irPlayers:side.after.filter(isIR).map(e=>({player:entryFact(e),report:injuryReport(hjPlayerTeam(e),entryId(e),entryName(e))})),
   holes:{openSlots:side.lineupAfter.slots.filter(x=>!x.entry).map(x=>x.slot),
    weakestUnits:UNITS.filter(pos=>side.unitRankBefore[pos]>=Math.max(...Object.values(side.unitRankBefore))),
    bottomThreeUnits:UNITS.filter(pos=>side.unitRankBefore[pos]>=side.teamCount-2),
    byeWeeksWithOpenSlots:byes.weeks.filter(x=>x.after.openSlots.length).map(x=>({week:x.week,slots:x.after.openSlots})),
    benchPointsWasted:finite(s?.benchGap),injured:side.after.filter(e=>isIR(e)||INJURED.has(injuryOf(e))).map(entryFact)}};
 }
 function scheduleFact(p){
  const d=dvpMap(p.pos),games=teamGames(p.team)?.filter(g=>g.week>=week()&&g.week<=16).map(g=>{
   const r=d?.map.get(g.opp);
   return {...g,defenseRank:finite(r?.rank),pointsAllowedPerGame:finite(r?.avg),sampleGames:r?.gameList?.length??null};
  });
  return {bye:p.sched?.bye??null,remainingGames:p.sched?.remaining??null,remaining:games||[],
   rest:p.sched?.rest??null,playoffStrength:p.sched?.po??null,defenseRankDirection:'1 allows the fewest points',
   strengthRankDirection:'1 is easiest',playoffs:(games||[]).filter(g=>PLAYOFF_WEEKS.includes(g.week))};
 }
 function playerFact(p){
  const projection=Object.fromEntries(['espn','vegas','combo'].map(k=>[k,{...projectionFact(p.entry,k),thisWeek:weeklyProjection(p.entry,k)}]));
  const mates=teammatesOf(p).map(t=>{
   const sig=teammateSignal(p,t),u=usageFor({...t,team:p.team});
   return {...t,injuryReport:sig.report,status:sig.code,observedMissedGames:sig.missed,
    missedGamesAreAbsencesNotDiagnoses:true,gamesPlayed:u?.games??null,weeklySeries:u?.series||[],
    news:newsFor(t.id,t.name),withWithout:splitWithWithout(p,t)};
  });
  return {id:p.id,name:p.name,position:p.pos,team:p.team,from:p.from.manager,to:p.to.manager,
   market:{value:p.value,positionalRank:p.row?.positionRank??null,change30Days:p.row?.trend30??null,
    value30DaysAgo:Number.isFinite(p.value)&&Number.isFinite(p.row?.trend30)?p.value-p.row.trend30:null},
   projections:projection,usage:p.u?{games:p.u.games,season:p.u.season,lastThree:p.u.recent,weeklySeries:p.u.series,
    lastGame:p.u.series.at(-1),pointsRank:p.u.seasonRank,positionMedianPpo:USAGE.posPPO.get(p.pos)??null,
    weeklyFinishes:p.u.points,top12Weeks:p.u.points.filter(x=>x.rank&&x.rank<=12).length,
    dudWeeks:p.u.points.filter(x=>Number.isFinite(x.pts)&&x.pts<5).length,ppg:p.u.ppg}:null,
   pffGrade:p.grade,injury:{status:p.code,ir:isIR(p.entry),report:p.report},news:newsFor(p.id,p.name),
   teammates:mates,quarterbackChange:qbChange(p.team),teamOffense:teamContext(p.team),schedule:scheduleFact(p),
   bestFreeAgent:freeAgentFact(p.rep)};
 }
 function dossierFor(m,a){
  const [A,B]=a.rows;
  return {version:1,asOf:new Date().toISOString(),season:Number(NFL_SEASON),week:week(),
   league:{teams:10,ppr:1,teReceptionBonus:.5,qb:1,flex:1,regularSeasonWeeks:14,playoffWeeks:PLAYOFF_WEEKS,playoffTeams:4},
   materiality:{marketGap:.10,restOfSeasonPointsPerWeek:2,postureMinimumGames:4},
   managers:[managerFact(A,B),managerFact(B,A)],players:[...A.profiles,...B.profiles].map(playerFact),
   deal:{sentA:m.outA,sentB:m.outB,gap:m.gap,gapValue:Math.abs(m.net),band:BAND[m.band].label,moreTo:m.winner?a.rows.find(s=>s.key===m.winner).manager:null,
    remainingWeeks:remainingWeeks(),lineups:a.rows.map(s=>({manager:s.manager,restOfSeason:s.projectionDeltas,
     thisWeek:s.weekReady?s.weekDelta:null,unitRanksBefore:s.unitRankBefore,unitRanksAfter:s.unitRankAfter})),
    balanceOptions:(balanceOptions(m)?.options||[]).map(o=>({kind:o.kind,manager:o.from.manager,players:o.entries.map(entryFact),gapAfter:o.gap})),
    bestFreeAgents:Object.fromEntries(POS.map(pos=>[pos,freeAgentFact(replacementFor(pos))])),
    displayedFacts:a.factors.map(f=>({factor:f.label,note:f.note}))}};
 }

 // The site supplies league facts; Gemini researches the current NFL context.
 function researchTrade(m){
  const player=e=>({id:entryId(e),name:entryName(e),position:hjPlayerPosition(e),team:T(hjPlayerTeam(e)),
   marketValue:valueOf(e),marketPositionRank:marketRow(e)?.positionRank??null,
   marketChange30Days:marketRow(e)?.trend30??null,rosterSlotId:e.lineupSlotId,ir:isIR(e),injuryStatus:injuryOf(e)});
  return {protocol:'hj-trade-search-v1',season:Number(NFL_SEASON),week:week(),
   league:{teams:10,ppr:1,teReceptionBonus:.5,playoffTeams:4,playoffWeeks:[15,16],regularSeasonWeeks:14,
    lineupSlots:HJ_LEAGUE_STATE?.data?.settings?.rosterSettings?.lineupSlotCounts||null},
   managers:m.sides.map(s=>({id:String(s.team.id),name:s.manager,record:(()=>{const r=standingFor(s.manager);return r?{wins:r.w,losses:r.l,ties:r.t}:null})(),
    rosterCapacity:s.capacity,roster:s.before.map(player),sends:s.out.map(entryId)})),
   market:{sentA:m.outA,sentB:m.outB,gapFraction:m.gap,asOf:window.HJMV?.generatedAt||null}};
 }

 /* ---------- the trade model ---------- */
 function ensureSides(){
  const all=teams();
  if(!all.length)return false;
  if(!teamById(HJTD.a))HJTD.a=String(all[0].id);
  if(!teamById(HJTD.b)||String(HJTD.b)===String(HJTD.a))HJTD.b=String((all.find(t=>String(t.id)!==String(HJTD.a))||all[0]).id);
  const ownA=new Set(rosterOf(HJTD.a).map(entryId)),ownB=new Set(rosterOf(HJTD.b).map(entryId));
  if(ownA.size)HJTD.give=new Set([...HJTD.give].filter(id=>ownA.has(id)));
  if(ownB.size)HJTD.get=new Set([...HJTD.get].filter(id=>ownB.has(id)));
  return true;
 }

 function model(){
  const aTeam=teamById(HJTD.a),bTeam=teamById(HJTD.b);
  const aAll=rosterOf(HJTD.a),bAll=rosterOf(HJTD.b);
  const give=aAll.filter(e=>HJTD.give.has(entryId(e)));
  const take=bAll.filter(e=>HJTD.get.has(entryId(e)));
  const aAfter=aAll.filter(e=>!HJTD.give.has(entryId(e))).concat(take);
  const bAfter=bAll.filter(e=>!HJTD.get.has(entryId(e))).concat(give);

  const outA=sumValues(give),outB=sumValues(take);
  const net=outB-outA;                       // positive: A receives more value
  const base=Math.max(outA,outB,1);
  const gap=Math.abs(net)/base;

  const lineup=list=>lineupPoints(toItems(list));
  const sides=[
   {key:'a',team:aTeam,manager:managerOf(aTeam),before:aAll,after:aAfter,out:give,in:take,sent:outA,received:outB},
   {key:'b',team:bTeam,manager:managerOf(bTeam),before:bAll,after:bAfter,out:take,in:give,sent:outB,received:outA}
  ].map(side=>{
   const rawAfter=side.after,plan=dropPlan(side.before,rawAfter,side.in);
   side={...side,rawAfter,after:plan.after,drops:plan.drops,capacity:plan.capacity};
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

  const band=!give.length&&!take.length?'empty':gap<.10?'even':gap<.20?'slight':gap<.35?'clear':'wide';
  /* Which side the extra market value lands on. Not a winner — the write-up decides that. */
  const winner=band==='empty'||band==='even'?null:net>0?'a':'b';

  return {aTeam,bTeam,aAll,bAll,give,take,sides,outA,outB,net,gap,band,winner,
   count:{give:give.length,take:take.length},
   best:[...give,...take].sort((x,y)=>(valueOf(y)||0)-(valueOf(x)||0))[0]||null};
 }

 /* ---------- grading ---------- */


 /* ---------- balancing the deal ----------
    Several ways to close the gap: the side ahead adds one player or two
    cheaper ones, or the side behind keeps one of the pieces it was sending. */
 function balanceOptions(m){
  if(m.gap<.10||!m.give.length||!m.take.length||!m.winner)return null;
  const ahead=m.sides.find(s=>s.key===m.winner),behind=m.sides.find(s=>s.key!==m.winner);
  const selected=new Set([...m.give,...m.take].map(entryId)),target=Math.abs(m.net),options=[];
  const aboveWire=e=>{const rep=replacementFor(hjPlayerPosition(e));return rep&&Number.isFinite(valueOf(e))&&valueOf(e)>rep.value};
  const consider=(kind,entry)=>{
   if(!aboveWire(entry))return;
   const give=m.give.slice(),take=m.take.slice(),owner=kind==='add'?ahead:behind,leg=owner.key==='a'?give:take;
   if(kind==='add')leg.push(entry);else leg.splice(leg.findIndex(e=>entryId(e)===entryId(entry)),1);
   const a=dropPlan(m.aAll,m.aAll.filter(e=>!give.includes(e)).concat(take),take);
   const b=dropPlan(m.bAll,m.bAll.filter(e=>!take.includes(e)).concat(give),give);
   // Never solve a value gap by making either manager discard another player.
   if(a.drops.length>m.sides[0].drops.length||b.drops.length>m.sides[1].drops.length)return;
   const av=sumValues(give),bv=sumValues(take),gap=Math.abs(av-bv)/Math.max(av,bv,1);
   if(gap>=.10||gap>=m.gap)return;
   if([a,b].some(p=>p.drops.some(e=>entryId(e)===entryId(entry))))return;
   options.push({kind,from:owner,to:kind==='add'?behind:ahead,entries:[entry],value:valueOf(entry),gap});
  };
  ahead.before.filter(e=>!selected.has(entryId(e))&&!isIR(e)).forEach(e=>consider('add',e));
  if(behind.out.length>1)behind.out.forEach(e=>consider('keep',e));
  options.sort((a,b)=>a.gap-b.gap||b.value-a.value);
  return options.length?{target,ahead,behind,options:options.slice(0,3)}:null;
 }
 function balancePanel(m){
  const bal=balanceOptions(m);if(!bal)return '';
  return '<section class="td-balance"><div class="td-balance-head"><h3>Balance it</h3></div><ul>'+bal.options.map(o=>
   '<li><span>'+E(o.from.manager)+' '+(o.kind==='add'?'adds ':'keeps ')+E(entryName(o.entries[0]))+
   ' · '+Math.round(o.gap*100)+'% gap</span><button type="button" class="td-sweet-add" data-td-toggle="'+E(o.from.key+':'+o.entries.map(entryId).join(','))+'">Use this</button></li>').join('')+'</ul></section>';
 }

 /* ---------- risk flags ---------- */


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
    const myAfter=dropPlan(mine,mine.filter(e=>!outIds.has(entryId(e))).concat(inc),inc).after;
    const theirAfter=dropPlan(theirs,theirs.filter(e=>!incIds.has(entryId(e))).concat(out),out).after;
    const myLine=lineupPoints(toItems(myAfter)),theirLine=lineupPoints(toItems(theirAfter));
    if(myLine.short>0||theirLine.short>0)return null;    // never propose a deal that breaks a lineup
    const myGain=myLine.total-myBase,theirGain=theirLine.total-theirBase;
    /* Gains are scored as a share of each lineup, so the maths reads the same
       whether the projections are weekly or season-long. */
    const myPct=myGain/Math.max(myBase,1),theirPct=theirGain/Math.max(theirBase,1);
    const outV=out.reduce((s,e)=>s+valueOf(e),0),incV=inc.reduce((s,e)=>s+valueOf(e),0);
    const gap=Math.abs(incV-outV)/Math.max(outV,incV,1);
    if(gap>.22)return null;                              // never propose something far off on value
    if(myGain/remainingWeeks()<2)return null;                          // it has to actually help the asking side
    const tone=theirGain/remainingWeeks()>=2?'good':theirGain/remainingWeeks()>-2?'even':'bad';
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
  const teamOptions=teams().filter(t=>key==='a'||String(t.id)!==String(HJTD.a)).map(t=>`<option value="${E(t.id)}"${String(t.id)===String(key==='a'?HJTD.a:HJTD.b)?' selected':''}>${E(managerOf(t))}</option>`).join('');
  return `<section class="td-side td-side-${key}">
   <div class="td-side-head">
    ${av(side.manager,'td-av')}
    <div class="td-side-who"><select data-td-team="${key}" aria-label="${key==='a'?'Your team':'Trade partner'}">${teamOptions}</select><small>${side.rankBefore?`#${side.rankBefore} by market value`:''}</small></div>
    <div class="td-side-grade tone-even"><b>${money(side.sent)}</b><small>value sent</small></div>
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
  if(USAGE.promise)return USAGE.promise;
  if(USAGE.ready&&Date.now()-(USAGE.at||0)<600000)return Promise.resolve();
  if(typeof pcLoadSeason!=='function'||typeof pcLoadSnaps!=='function')return Promise.resolve();
  USAGE.pending=true;
  USAGE.promise=Promise.allSettled([pcLoadSeason(Number(NFL_SEASON)),pcLoadSnaps(Number(NFL_SEASON)),
   typeof hjLoadAdvancedSection==='function'?hjLoadAdvancedSection(Number(NFL_SEASON),'stats'):Promise.resolve()]).then(([a,b])=>{
   USAGE.rows=typeof HJ_DATA!=='undefined'&&HJ_DATA.seasons?.get(Number(NFL_SEASON))||(a.status==='fulfilled'?a.value:null);
   USAGE.snaps=b.status==='fulfilled'?b.value:null;
   indexUsage();USAGE.ready=Boolean(USAGE.rows?.length);USAGE.at=Date.now();
  }).finally(()=>{USAGE.pending=false;USAGE.promise=null;rerenderIfTrade()});
  return USAGE.promise;
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
     return {week:Number(r.week),opponent:T(r.opponent_team),receptions:num(r.receptions),receivingYards:num(r.receiving_yards),
      rushingYards:num(r.rushing_yards),passingYards:num(r.passing_yards),rushingTds:num(r.rushing_tds),receivingTds:num(r.receiving_tds),
      passingTds:num(r.passing_tds),interceptions:num(r.interceptions),completions:num(r.completions),snap:num(hit?.offense_pct),carries:num(r.carries)||0,targets:num(r.targets)||0,attempts:num(r.attempts)||0,
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


 /* The last three weeks as a sentence, for the written case. */

 /* Where the role has moved over the last three games against the season. */

 /* Has the team's starting quarterback changed? Read straight from who has
    been throwing the passes each week. */
 function qbChange(team){
  team=String(team||'').toUpperCase();
  if(!USAGE.ready||!team)return null;
  const weeks=[...USAGE.teamQb.keys()].filter(k=>k.startsWith(team+'|')).map(k=>Number(k.split('|')[1])).sort((a,b)=>a-b);
  if(weeks.length<2)return null;
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
  return new Set(teams().flatMap(t=>hjRosterEntries(t).map(entryId)));
 }
 function replacementFor(position){
  const owned=rosteredIds();
  return (window.HJMV?.rows||[]).filter(r=>r.position===position&&r.espnId&&!owned.has(String(r.espnId))).sort((a,b)=>b.value-a.value)[0]||null;
 }
 /* How steep the drop is from the last starter to the next man up, per position. */



 /* ---------- NFL schedule: byes, remaining strength of schedule, playoff weeks ---------- */
 const SCHED={map:null,pending:false,byTeam:null,sos:new Map(),retryAt:0};
 function ensureSchedule(){
  if(SCHED.promise)return SCHED.promise;
  if(SCHED.map||SCHED.retryAt>Date.now())return Promise.resolve();
  if(typeof pcLoadSchedules!=='function'&&typeof hjHostedJson!=='function')return Promise.resolve();
  SCHED.pending=true;
  SCHED.promise=(async()=>{
   let map=new Map();
   if(typeof pcLoadSchedules==='function')try{map=new Map(await pcLoadSchedules())}catch(_){}
   const season=Number(NFL_SEASON);
   const current=[...map.values()].filter(g=>Number(g.season)===season);
   // Keep schedule loading on the same origin as the rest of the hosted data.
   if(current.length<272){
    const data=await hjHostedJson('nfl-schedule-'+season+'.json');
    if(data?.schema!==1||data.season!==season||data.source!=='ESPN'||!Array.isArray(data.games)||data.games.length!==272)throw Error('Invalid schedule');
    for(const g of data.games)if(Number(g.season)===season&&Number.isInteger(g.week)&&g.week>=1&&g.week<=18&&g.home_team&&g.away_team)map.set(g.game_id,g);
    if([...map.values()].filter(g=>Number(g.season)===season).length<272)throw Error('Incomplete schedule');
   }
   SCHED.map=map;SCHED.byTeam=null;SCHED.sos=new Map();
  })().catch(()=>{SCHED.retryAt=Date.now()+60000}).finally(()=>{SCHED.pending=false;SCHED.promise=null;rerenderIfTrade()});
  return SCHED.promise;
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
    add(home,{week:wk,date:g.gameday||g.game_date||null,opp:away,home:true,roof:roofWord,line:Number.isFinite(hm)&&Number.isFinite(am)?(hm<am?'favoured':hm>am?'underdog':''):''});
    add(away,{week:wk,date:g.gameday||g.game_date||null,opp:home,home:false,roof:roofWord,line:Number.isFinite(hm)&&Number.isFinite(am)?(am<hm?'favoured':am>hm?'underdog':''):''});
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
  return d.list.length>=16?d:null;
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
  return {team,pos,bye:byeOf(team),remaining:games.filter(g=>g.week>=w&&g.week<=PLAYOFF_WEEKS.at(-1)).length,
   rest:windowSos(pos,w,PLAYOFF_WEEKS.at(-1))?.get(team)||null,
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
  const games=played(row);
  if(games<4)return {key:'early',label:'Early season',games};
  const odds=num(row?.playoffOdds);
  if(odds===null)return {key:'open',label:'Season taking shape',games};
  if(games<7)return {key:'developing',label:odds>=62?'Strong start':odds>=32?'In the mix':'Needs momentum',games};
  return {key:odds>=62?'contender':odds>=32?'bubble':'chasing',label:odds>=62?'Playoff position':odds>=32?'In the mix':'Chasing a spot',games};
 }
 const recordOf=s=>s&&played(s)?`${s.w}–${s.l}${s.t?`–${s.t}`:''}`:'';


 /* Same NFL club, same position, comparable value: the workload is shared. */

 let injuryMapCache=null;
 function injuryMap(){
  if(injuryMapCache)return injuryMapCache;
  injuryMapCache=new Map();
  teams().forEach(t=>hjRosterEntries(t).forEach(e=>{const code=injuryOf(e);if(code&&code!=='ACTIVE')injuryMapCache.set(entryId(e),{code,name:entryName(e),pos:hjPlayerPosition(e),team:T(hjPlayerTeam(e))})}));
  return injuryMapCache;
 }
 /* The quarterback throwing to a pass catcher, as far as this league's rosters know him. */


 /* Short term and rest of season are scored separately; they often disagree. */
 function weekLineup(list){
  const items=list.map(entry=>({entry,pos:hjPlayerPosition(entry),pts:weeklyProjection(entry),ir:isIR(entry)||INJURED.has(injuryOf(entry))}));
  return {...lineupPoints(items),covered:items.filter(i=>Number.isFinite(i.pts)).length,total_:items.length};
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
  if(String(raw?.type||'').toLowerCase()!=='rotowire')return null;
  const text=stripHtml(raw.description||raw.headline);
  if(!text)return null;
  return {id:String(raw.id||raw.nowId||''),playerId:String(raw.playerId||''),type:'rotowire',text,
   spin:stripHtml(raw.story||raw.spin),at:Date.parse(raw.published||raw.lastModified||raw.categorized||'')||0};
 }
 /* Everything known about one player right now: fetched items plus the site's own news rail. */
 function newsFor(id,name=''){
  const own=NEWS.items.get(String(id))||[];
  if(!name){const entry=teams().flatMap(t=>hjRosterEntries(t)).find(e=>entryId(e)===String(id));name=NEWS.names?.get(String(id))||(entry?entryName(entry):'')}
  const last=name.replace(/\b(?:Jr\.?|Sr\.?|II|III|IV)\s*$/i,'').trim().split(/\s+/).at(-1);
  if(!last)return [];
  const fold=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
  const rail=(typeof ffnItems!=='undefined'&&Array.isArray(ffnItems)?ffnItems:[])
   .filter(i=>String(i.espn_id||'')===String(id)&&String(i.id||'').startsWith('espn-rw-'))
   .map(i=>({id:String(i.id),playerId:String(id),type:'rotowire',text:stripHtml(i.text||i.headline),spin:stripHtml(i.spin),at:Date.parse(i.published_at||'')||0}));
  const seen=new Set();
  return [...own,...rail].filter(i=>i.type==='rotowire'&&i.at>=Date.now()-21*864e5&&i.at<=Date.now()+300000&&
   i.text.replace(/\b(?:[A-Z]\.){1,3}/g,m=>m.replace(/\./g,'')).split(/[.!?](?:\s|$)/)[0].split(/\s+/).some(token=>fold(token)===fold(last)||fold(token.replace(/[’']s$/,''))===fold(last)))
   .sort((a,b)=>b.at-a.at).filter(i=>{const key=i.text.toLowerCase();if(seen.has(key))return false;seen.add(key);return true});
 }
 function ensureNews(ids){
  NEWS.jobs??=new Map();
  const cutoff=Date.now()-21*864e5,fresh=Date.now()-600000;
  const wanted=[...new Set(ids.map(String).filter(id=>/^\d+$/.test(id)))];
  return Promise.allSettled(wanted.map(id=>{
   if(NEWS.jobs.has(id))return NEWS.jobs.get(id);
   if(NEWS.fetchedAt.get(id)>fresh)return Promise.resolve();
   NEWS.pending.add(id);
   const job=(async()=>{
    const items=[];
    for(let offset=0;offset<300;offset+=50){
     const params=new URLSearchParams({playerId:id,limit:'50',offset:String(offset)});
     const data=await espnJson('https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players?'+params);
     const feed=Array.isArray(data?.feed)?data.feed:[];
     items.push(...feed.map(newsItemFrom).filter(x=>x&&x.playerId===id&&x.at>=cutoff));
     if(feed.length<50||feed.every(x=>(Date.parse(x.published||x.lastModified||'')||0)<cutoff))break;
    }
    NEWS.items.set(id,items);NEWS.fetchedAt.set(id,Date.now());
   })().catch(()=>{NEWS.fetchedAt.set(id,Date.now()-480000)}).finally(()=>{NEWS.jobs.delete(id);NEWS.pending.delete(id)});
   NEWS.jobs.set(id,job);return job;
  }));
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
  NEWS.injJobs??=new Map();
  return Promise.allSettled([...new Set(list.map(T).filter(Boolean))].map(team=>{
   if(NEWS.injJobs.has(team))return NEWS.injJobs.get(team);
   if(NEWS.injuries.get(team)?.at>Date.now()-600000)return Promise.resolve();
   const id=typeof NFL_TEAM_IDS!=='undefined'?NFL_TEAM_IDS[team.toLowerCase().replace(/^was$/,'wsh')]:null;
   if(!id)return Promise.resolve();
   const job=espnJson('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+id+'/injuries').then(data=>{
    NEWS.injuries.set(team,{at:Date.now(),...parseInjuries(data)});
   }).catch(()=>{}).finally(()=>NEWS.injJobs.delete(team));
   NEWS.injJobs.set(team,job);return job;
  }));
 }
 const injuryReport=(team,id,name)=>{const r=NEWS.injuries.get(T(team));return r?(r.byId.get(String(id))||r.byName.get(baseName(name))||null):null};
 /* Test hooks. */
 HJTD.injectNews=map=>{Object.entries(map||{}).forEach(([id,list])=>{NEWS.items.set(String(id),(list||[]).map(x=>x.text?{id:String(x.id||''),playerId:String(id),type:'rotowire',text:x.text,spin:x.spin||'',at:x.at||Date.now()}:newsItemFrom({...x,playerId:id})).filter(Boolean).sort((a,b)=>b.at-a.at));NEWS.fetchedAt.set(String(id),Date.now())})};
 HJTD.injectInjuries=(team,data)=>{NEWS.injuries.set(T(team),{at:Date.now(),...parseInjuries(data)})};

 /* "Injured Reserve" → "on injured reserve", "Out" → "out"; never lower-cases IR. */

 /* The teammates whose health decides a player's role: the same room, the
    quarterback throwing to him, and the other pass catchers he shares targets with. */
 function teammatesOf(p){
  let roster=typeof ffnRosterByTeam!=='undefined'&&ffnRosterByTeam?.get?ffnRosterByTeam.get(p.team)||[]:[];
  if(!roster.length)roster=(window.HJMV?.rows||[]).filter(x=>T(x.team)===p.team).map(x=>({id:x.espnId,name:x.name,position:x.position}));
  const byPos=pos=>roster.filter(x=>String(x.position).toUpperCase()===pos).sort((a,b)=>(a.positionRank||99)-(b.positionRank||99));
  const out=[];
  const push=(x,why)=>{if(x?.id&&String(x.id)!==p.id&&!out.some(o=>o.id===String(x.id)))out.push({id:String(x.id),name:x.name,position:String(x.position).toUpperCase(),depth:x.positionRank||null,why})};
  byPos(p.pos).slice(0,p.pos==='QB'?2:6).forEach(x=>push(x,'room'));
  byPos('QB').slice(0,1).forEach(x=>push(x,'qb'));
  const targets=roster.filter(x=>['WR','TE','RB'].includes(String(x.position).toUpperCase())).map(x=>{
   const u=usageFor({...x,team:p.team});return {x,targets:u?.season?u.season.targets*u.season.games:null,value:window.HJMV?.lookup?.(x)?.value||0};
  }).sort((a,b)=>(b.targets??-1)-(a.targets??-1)||b.value-a.value);
  targets.slice(0,2).forEach(({x})=>push(x,'top target'));
  return out;
 }
 const teamWeeksOf=team=>[...USAGE.teamCarries.keys()].filter(k=>k.startsWith(T(team)+'|')).map(k=>Number(k.split('|')[1])).sort((a,b)=>a-b);
 /* What is wrong with a teammate, if anything: the injury report, this league's
    designation, the games he has missed, and the latest blurb about him. */
 function teammateSignal(p,t){
  const report=injuryReport(p.team,t.id,t.name),code=injuryMap().get(String(t.id))?.code||'';
  const u=usageFor({id:t.id,name:t.name,position:t.position,team:p.team});
  const teamWeeks=[...new Set(USAGE.ready?teamWeeksOf(p.team):[])],played=new Set((u?.points||[]).map(x=>x.week));
  return {t,report,code,u,missed:teamWeeks.filter(w=>!played.has(w)),teamWeeks,news:newsFor(t.id,t.name),games:u?.games??null};
 }
 /* A player's numbers in the games a teammate played against the games he sat out. */
 function splitWithWithout(p,t){
  const s=p.u?.series;if(!s?.length||!USAGE.ready)return null;
  const u=usageFor({id:t.id,name:t.name,position:t.position,team:p.team});
  if(!u)return null;
  const active=new Set(u.series.map(x=>x.week)),weeks=new Set(teamWeeksOf(p.team));
  const withT=s.filter(x=>active.has(x.week)),without=s.filter(x=>!active.has(x.week)&&weeks.has(x.week));
  const facts=rows=>({games:rows.length,points:mean(rows.map(x=>x.pts)),snap:mean(rows.map(x=>x.snap)),
   targetShare:mean(rows.map(x=>x.target)),carryShare:mean(rows.map(x=>x.carryShare)),carries:mean(rows.map(x=>x.carries)),targets:mean(rows.map(x=>x.targets))});
  return {with:facts(withT),without:facts(without),absenceDoesNotEstablishInjury:true};
 }
 function ensureContext(profiles){
  const ids=[],teamsList=[];NEWS.names??=new Map();
  profiles.forEach(p=>{ids.push(p.id);NEWS.names.set(p.id,p.name);teamsList.push(p.team);
   teammatesOf(p).forEach(t=>{ids.push(t.id);NEWS.names.set(t.id,t.name)});
  });
  return Promise.allSettled([ensureNews(ids),ensureInjuries(teamsList)]);
 }

 /* One profile per player in the deal, shared by every section of the write-up. */
 function profileOf(entry,from,to){
  const row=marketRow(entry),u=usageOfEntry(entry),pos=hjPlayerPosition(entry),code=injuryOf(entry);
  const status=isIR(entry)?{key:'bad',label:'On IR'}:INJURED.has(code)?{key:'bad',label:injuryLabel(code)}:code==='QUESTIONABLE'?{key:'warn',label:'Questionable'}:onBye(entry)?{key:'warn',label:'Bye this week'}:{key:'ok',label:'Healthy'};
  const p={entry,id:entryId(entry),name:entryName(entry),last:entryName(entry).split(' ').at(-1),pos,team:T(hjPlayerTeam(entry)),
   row,value:valueOf(entry),proj:projOf(entry),espn:projectionFact(entry,'espn').remaining,vegas:projectionFact(entry,'vegas').remaining,
   grade:gradeOf(entry),u,code,status,from,to,sched:scheduleOf(entry),rep:POS.includes(pos)?replacementFor(pos):null};
  p.report=injuryReport(p.team,p.id,p.name);return p;
 }
 const posRank=p=>p.row?`${p.row.position}${p.row.positionRank}`:'';

 const sentenceList=items=>items.length<2?(items[0]||''):items.length===2?items.join(' and '):items.slice(0,-1).join(', ')+', and '+items.at(-1);
 const positionWord=pos=>({QB:'quarterback',RB:'running back',WR:'wide receiver',TE:'tight end','D/ST':'defense',K:'kicker'}[pos]||pos);
 const slotWord=slot=>({QB:'starting quarterback',RB1:'first starting running back',RB2:'second starting running back',
  WR1:'first starting wide receiver',WR2:'second starting wide receiver',TE:'starting tight end',FLEX:'flex starter','D/ST':'starting defense',K:'starting kicker'}[slot]||slot);
 function fitSentences(side){
  const changes=lineupChanges(side),lines=[];
  for(const x of changes.incoming){
   if(x.slot==='dropped'){lines.push(side.manager+' would need to release '+x.player.name+' to fit the trade within the roster limit.');continue}
   if(x.slot==='IR'){lines.push(x.player.name+' would occupy an injured-reserve spot on '+side.manager+'’s roster.');continue}
   if(x.slot==='unassigned'){
    const peers=side.after.filter(e=>entryId(e)!==x.player.id&&hjPlayerPosition(e)===x.player.position&&!isIR(e)).map(entryName);
    lines.push(x.player.name+' would join '+side.manager+'’s '+positionWord(x.player.position)+' group'+(peers.length?' alongside '+sentenceList(peers):'')+'.');continue;
   }
   if(x.slot==='bench'){
    const starters=side.lineupAfter.slots.filter(y=>y.entry&&hjPlayerPosition(y.entry)===x.player.position).map(y=>entryName(y.entry));
    lines.push(x.player.name+' would be a bench option for '+side.manager+(starters.length?', behind '+sentenceList(starters)+' in the projected lineup':'')+'.');
   }else lines.push(x.player.name+' would be '+side.manager+'’s '+slotWord(x.slot)+'.');
  }
  if(changes.benched.length)lines.push(sentenceList(changes.benched.map(p=>p.name))+' would move from '+side.manager+'’s starting lineup to the bench.');
  if(side.drops.length)lines.push(side.manager+' would need to drop '+sentenceList(side.drops.map(entryName))+' to make room.');
  return lines.join(' ');
 }
 function weeklyEffect(manager,delta,when){
  if(Math.abs(delta)<2)return manager+'’s projected starting lineup would be about the same '+when+'.';
  return 'The trade would '+(delta>0?'add':'remove')+' about '+one(Math.abs(delta))+' projected points '+when+' '+(delta>0?'for':'from')+' '+manager+'’s starting lineup.';
 }
 function restSentences(rows){
  const lines=[];
  for(const [source,label] of [['espn','ESPN'],['vegas','Vegas']]){
   const known=rows.filter(s=>Number.isFinite(s.projectionDeltas[source]));
   if(known.length===2&&known.every(s=>Math.abs(s.projectionDeltas[source])<2)){
    lines.push(label+' projects little change to either starting lineup over the rest of the season.');continue;
   }
   for(const side of known){
    const delta=side.projectionDeltas[source];
    lines.push(Math.abs(delta)<2?label+' projects little change to '+side.manager+'’s starting lineup over the rest of the season.':
     label+' projects that '+side.manager+'’s starting lineup would score about '+one(Math.abs(delta))+' '+(delta>0?'more':'fewer')+' points per week over the rest of the season.');
   }
  }
  return lines.join(' ');
 }
 function wireSentences(side){
  return side.gets.filter(p=>p.rep&&Number.isFinite(p.value)&&Number.isFinite(p.rep.value)).map(p=>{
   const gap=(p.value-p.rep.value)/Math.max(p.value,p.rep.value,1);
   const comparison=Math.abs(gap)<.1?'similarly to':gap>0?'above':'below';
   return side.manager+' would receive '+p.name+', who is valued '+comparison+' '+p.rep.name+', the highest-valued '+positionWord(p.pos)+' available as a free agent.';
  }).join(' ');
 }
 function analyse(m){
  if(!m.give.length||!m.take.length)return null;
  const rows=m.sides.map(side=>{
   const stand=standingFor(side.manager),post=posture(stand),wb=weekLineup(side.before),wa=weekLineup(side.after);
   const relevant=[...side.before,...side.after].filter(e=>POS.includes(hjPlayerPosition(e))&&!isIR(e));
   const weekReady=weeklyLoaded()&&relevant.every(e=>Number.isFinite(weeklyProjection(e)));
   const projectionDeltas=Object.fromEntries(['espn','vegas','combo'].map(k=>{
    const before=lineupFor(side.before,k),after=lineupFor(side.after,k);
    const ready=[...side.before,...side.after].filter(e=>POS.includes(hjPlayerPosition(e))&&!isIR(e)).every(e=>Number.isFinite(projectionFact(e,k).remaining));
    return [k,ready?(after.total-before.total)/remainingWeeks():null];
   }));
   return {...side,stand,post,weekBefore:wb,weekAfter:wa,weekDelta:weekReady?wa.total-wb.total:null,weekReady,projectionDeltas};
  });
  const [A,B]=rows;
  A.profiles=A.out.map(e=>profileOf(e,A,B));B.profiles=B.out.map(e=>profileOf(e,B,A));
  A.gets=B.profiles;B.gets=A.profiles;
  const all=[...A.profiles,...B.profiles];
  const lean=(a,b,margin)=>!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)<margin?'even':a>b?'a':'b';
  const above=side=>side.gets.reduce((n,p)=>n+(p.rep&&Number.isFinite(p.value)?Math.max(0,p.value-p.rep.value):0),0);
  const form=side=>side.gets.every(p=>Number.isFinite(p.row?.trend30))?side.gets.reduce((n,p)=>n+p.row.trend30,0):null;
  const pff=side=>mean(side.gets.map(p=>p.grade));
  const weakest=s=>UNITS.slice().sort((a,b)=>s.unitRankBefore[b]-s.unitRankBefore[a])[0];
  const fitGain=s=>s.unitRankBefore[weakest(s)]-s.unitRankAfter[weakest(s)];
  const factors=[
   {label:'Market value',lean:m.band==='even'?'even':m.winner,note:m.band==='even'?'The market values are essentially even between '+A.manager+' and '+B.manager+'.':
    'Market value tilts toward '+rows.find(s=>s.key===m.winner).manager+', with a gap of about '+Math.round(m.gap*100)+'%.'},
   {label:'This week',lean:lean(A.weekDelta,B.weekDelta,2),note:rows.filter(s=>s.weekReady).map(s=>weeklyEffect(s.manager,s.weekDelta,'in Week '+week())).join(' ')},
   {label:'Rest of season',lean:lean(A.projectionDeltas.combo,B.projectionDeltas.combo,2),note:restSentences(rows)},
   {label:'Positional fit',lean:lean(fitGain(A),fitGain(B),1),note:rows.map(fitSentences).join(' ')},
   {label:'Above the wire',lean:lean(above(A),above(B),Math.max(m.outA,m.outB)*.1),note:rows.map(wireSentences).join(' ')},
   {label:'Market form',lean:lean(form(A),form(B),Math.max(m.outA,m.outB)*.1),note:all.filter(p=>Number.isFinite(p.row?.trend30)).map(p=>{
    const change=p.row.trend30;
    return p.name+'’s market value '+(Math.abs(change)<Math.max(p.value,1)*.1?'has been fairly stable over the last 30 days.':
     'has '+(change>0?'risen':'fallen')+' by '+money(Math.abs(change))+' over the last 30 days.');
   }).join(' ')},
   {label:'Play quality (PFF)',lean:lean(pff(A),pff(B),3),note:all.filter(p=>Number.isFinite(p.grade)).map(p=>
    'PFF gives '+p.name+' an overall grade of '+one(p.grade)+' this season'+(p.u?.games?', through '+plural(p.u.games,'game'):'')+'.').join(' ')}
  ];
  return {rows,factors};
 }

 /* =====================================================================
    The written analysis — both managers, one deal
    ===================================================================== */
 const section=(key,title,body,note)=>body?`<article class="td-sec td-sec-${key}"><h4>${E(title)}</h4>${note?`<p class="td-sec-note">${E(note)}</p>`:''}${body}</article>`:'';

 function breakdownCard(p){
  const s=p.u?.season,rank=p.u?.seasonRank;
  const facts=[];
  if(Number.isFinite(p.value))facts.push(['Market',Number.isFinite(p.value)?`${money(p.value)}${posRank(p)?` · ${posRank(p)}`:''}${p.row&&Number.isFinite(p.row.trend30)&&Math.abs(p.row.trend30)>=60?` · ${p.row.trend30>0?'▲':'▼'}${money(Math.abs(p.row.trend30))} 30d`:''}`:'not valued']);
  if(s&&p.u.games)facts.push(['Season',`${pts(s.points)} pts · ${one(p.u.ppg)} ppg · ${plural(p.u.games,'game')}`]);
  if(rank)facts.push(['Points rank',`${p.pos}${rank.rank} · ${plural(rank.games,'game')}`]);
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



 /* Model output is untrusted. Rebuild only four allowed elements, with no attributes. */
 const ANALYSIS_FIELDS=['summary','value','context','usage','roster','schedule','verdictA','verdictB','accept','overall'];
 const ANALYSIS={key:'',state:null,timer:null,controller:null,token:0,requestedKey:''};
 const ANALYSIS_ENDPOINT='https://hungjurors-trade-analysis.misbauddin-ahmed.workers.dev/gemini';
 function cleanAnalysisHtml(html){
  const parsed=new DOMParser().parseFromString(String(html||''),'text/html');
  const walk=node=>{
   if(node.nodeType===3)return E(node.nodeValue);
   if(node.nodeType!==1)return '';
   const tag=node.tagName.toLowerCase();
   if(['script','style','iframe','object','template','svg','math'].includes(tag))return '';
   const children=Array.from(node.childNodes).map(walk).join('');
   return ['p','ul','li','b'].includes(tag)?'<'+tag+'>'+children+'</'+tag+'>':children;
  };
  return Array.from(parsed.body.childNodes).map(walk).join('').trim();
 }
 function safeSearchSuggestions(html){
  if(typeof html!=='string'||!html.trim()||html.length>64000)throw Error('Invalid search response');
  const root=new DOMParser().parseFromString(html,'text/html');
  const allowed=['STYLE','DIV','SPAN','A','SVG','PATH','G','RECT','CIRCLE','IMG','P','BR','DEFS','CLIPPATH','POLYGON','POLYLINE','LINE','ELLIPSE','LINEARGRADIENT','STOP','USE','TITLE','UL','LI'];
  for(const node of root.querySelectorAll('*')){
   if(['HTML','HEAD','BODY'].includes(node.tagName))continue;
   if(!allowed.includes(node.tagName.toUpperCase()))throw Error('Invalid search markup');
   for(const attr of node.attributes){
    if(/^on/i.test(attr.name)||/^(srcdoc|formaction)$/i.test(attr.name))throw Error('Invalid search attribute');
    if(/^(href|src|xlink:href)$/i.test(attr.name)&&!/^https:\/\//i.test(attr.value)&&!/^#/.test(attr.value))throw Error('Invalid search link');
   }
   const css=(node.tagName.toUpperCase()==='STYLE'?node.textContent:'')+(node.getAttribute('style')||'');
   if(/@import|expression\s*\(|url\s*\(|position\s*:\s*fixed|<\/?script/i.test(css))throw Error('Invalid search style');
  }
  return html;
 }
 function validateAnalysis(value){
  if(!value||ANALYSIS_FIELDS.some(k=>typeof value[k]!=='string'||value[k].length>24000))throw Error('Invalid analysis');
  const data=Object.fromEntries(ANALYSIS_FIELDS.map(k=>[k,cleanAnalysisHtml(value[k])]));
  if(!data.summary||!data.overall)throw Error('Empty analysis');
  data.researchMode=value.researchMode;
  data.searchSuggestions=value.researchMode==='url-context'?'':safeSearchSuggestions(value.searchSuggestions);
  if(!Array.isArray(value.sources)||value.sources.some(s=>typeof s?.url!=='string'||!/^https:\/\//i.test(s.url)||
   s.url.length>4000||typeof s.title!=='string'||s.title.length>1000))throw Error('Invalid sources');
  data.sources=value.sources;
  return data;
 }
 function analysisKey(m){
  return JSON.stringify(researchTrade(m));
 }
 function cancelAnalysis(){
  ANALYSIS.token++;clearTimeout(ANALYSIS.timer);ANALYSIS.controller?.abort();
  ANALYSIS.controller=null;ANALYSIS.key='';ANALYSIS.state=null;ANALYSIS.requestedKey='';
  if(draftInFlight)saveTradeDraft(false);
 }
 // Retain the existing fact-loading API for other Trade Desk features.
 async function hydrateDossier(){
  standingsCache=null;injuryMapCache=null;
  await Promise.allSettled([ensureUsage(),ensureSchedule(),ensureTeamContext()]);
 }
 function analysisControls(state){
  if(state.status==='pending')return '<p class="td-writing" role="status">Writing the analysis…</p>';
  if(state.status==='ready')return '';
  return '<button type="button" class="td-analysis-action" data-td-analysis-start>'+
   (state.status==='failed'?'Try analysis again':'Write analysis')+'</button>';
 }
 function requestAnalysis(m){
  const key=analysisKey(m);
  if(ANALYSIS.key===key&&ANALYSIS.state)return ANALYSIS.state;
  const requested=ANALYSIS.requestedKey===key;
  cancelAnalysis();ANALYSIS.key=key;
  ANALYSIS.state={status:requested?'pending':'idle',data:null};
  if(!requested)return ANALYSIS.state;
  const token=ANALYSIS.token;
  saveTradeDraft(true);
  try{history.replaceState(history.state,'','#roster-strength')}catch(_){}
  ANALYSIS.timer=setTimeout(async()=>{
   const controller=new AbortController();ANALYSIS.controller=controller;
   const timeout=setTimeout(()=>controller.abort(),95000);
   try{
    const response=await fetch(ANALYSIS_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify(researchTrade(m)),signal:controller.signal,credentials:'omit',cache:'no-store'});
    if(!response.ok)throw Error('Analysis unavailable');
    const data=validateAnalysis(await response.json());
    if(token!==ANALYSIS.token)return;
    ANALYSIS.state={status:'ready',data};
   }catch(_){
    if(token===ANALYSIS.token)ANALYSIS.state={status:'failed',data:null};
   }finally{
    clearTimeout(timeout);
    if(token===ANALYSIS.token){ANALYSIS.controller=null;saveTradeDraft(false);rerenderIfTrade()}
   }
  },100);
  return ANALYSIS.state;
 }
 function searchAttribution(data){
  if(!data||data.researchMode==='url-context')return '';
  // Keep Google's supplied search suggestions with the result, in their own style scope.
  setTimeout(()=>{
   const el=document.querySelector('.td-search-suggestions');
   if(!el||el.shadowRoot||ANALYSIS.state?.data!==data)return;
   const root=el.attachShadow({mode:'open'});
   root.innerHTML=data.searchSuggestions;
  },0);
  const links=data.sources.map(s=>'<a href="'+E(s.url)+'" target="_blank" rel="noopener noreferrer">'+E(s.title)+'</a>').join('');
  return '<div class="td-attribution">'+(links?'<div class="td-search-links">'+links+'</div>':'')+
   '<div class="td-search-suggestions"></div></div>';
 }
 function acceptancePills(a,html){
  const root=new DOMParser().parseFromString(html||'','text/html'),paragraphs=[...root.querySelectorAll('p')];
  const labels=['Likely','Could go either way','Needs a sweetener','Unlikely'];
  const items=a.rows.map(side=>{
   const text=paragraphs.find(p=>p.textContent.toLowerCase().includes(side.manager.toLowerCase()))?.textContent?.trim()||'';
   const label=labels.find(l=>new RegExp(l+'[.!]?\\s*$','i').test(text));
   if(!label)return '';
   const tone=label==='Likely'?'good':label==='Unlikely'?'bad':'even';
   return '<span class="td-accept-pill tone-'+tone+'">'+av(side.manager,'td-av-sm')+'<b>'+E(side.manager)+'</b><i>'+label+'</i></span>';
  }).filter(Boolean);
  return items.length?'<div class="td-accept">'+items.join('')+'</div>':'';
 }
 function modelVerdict(a,data){
  if(!data)return '';
  const perspective=(side,key)=>data[key]?'<div class="td-move-side is-'+side.key+'"><div class="td-move-head">'+
   av(side.manager,'td-av-sm')+'<b>'+E(side.manager)+'</b></div>'+data[key]+'</div>':'';
  const sides=perspective(a.rows[0],'verdictA')+perspective(a.rows[1],'verdictB');
  const body=(sides?'<div class="td-move">'+sides+'</div>':'')+
   (data.accept?'<h5>Will they accept?</h5>'+data.accept:'')+
   (data.overall?'<h5>Overall</h5>'+data.overall:'')+acceptancePills(a,data.accept);
  return section('verdict','The verdict',body);
 }
 function report(m,a){
  const state=requestAnalysis(m),data=state.data;
  const breakdown='<div class="td-break">'+a.rows.map(s=>'<div class="td-break-side is-'+s.key+'"><h5>'+
   E(s.manager)+' sends</h5>'+s.profiles.map(breakdownCard).join('')+'</div>').join('')+'</div>';
  return '<div class="td-report">'+section('breakdown','Breakdown',breakdown)+section('score','Factor scorecard',scorecard(a))+
   analysisControls(state)+section('summary','Summary',data?.summary)+
   [['value','Is it a good value?'],['context','What actually changes the picture'],['usage','Usage and opportunity'],
    ['roster','Roster fit'],['schedule','Schedule and playoff leverage']].map(([k,title])=>section(k,title,data?.[k])).join('')+
   modelVerdict(a,data)+searchAttribution(data)+'</div>';
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
    <p>${m.band==='empty'?'Build a trade to compare the two rosters.':`${money(m.outA)} out from ${E(m.sides[0].manager)} against ${money(m.outB)} out from ${E(m.sides[1].manager)} — a ${(m.gap*100).toFixed(1)}% gap.`}</p>
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
  const rankMove=side.rankBefore-side.rankAfter,lift=side.lineupDelta/remainingWeeks();
  const ready=side.after.filter(e=>POS.includes(hjPlayerPosition(e))&&!isIR(e)).every(e=>Number.isFinite(projOf(e)));
  return '<section class="td-impact td-impact-'+side.key+'"><div class="td-impact-head">'+av(side.manager,'td-av-sm')+
   '<b>'+E(side.manager)+'</b><span class="td-impact-net">'+money(side.valueDelta)+' value</span></div><div class="td-metrics">'+
   '<div class="td-metric"><small>Roster value · '+(scopeNow()==='all'?'all players':'starters')+'</small><b>'+money(side.marketAfter)+'</b><i>'+money(side.marketBefore)+' → '+money(side.marketAfter)+'</i></div>'+
   '<div class="td-metric"><small>League rank</small><b>#'+side.rankAfter+'</b><i>'+(rankMove===0?'no change':(rankMove>0?'▲':'▼')+' '+Math.abs(rankMove)+' from #'+side.rankBefore)+'</i></div>'+
   (ready?'<div class="td-metric"><small>Lineup · points/week</small><b>'+one(side.lineupAfter.total/remainingWeeks())+'</b><i>'+(Math.abs(lift)<2?'About the same':(lift>0?'+':'−')+one(Math.abs(lift))+' per week')+'</i></div>':'')+
   '</div>'+unitBars(side,m)+'</section>';
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
  if(!a){cancelAnalysis();return ''}
  return '<section class="td-analysis"><div class="td-analysis-head"><h3>Trade analysis</h3></div>'+report(m,a)+'</section>';
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
     <div class="td-find-foot"><span class="is-up">+${one(r.myGain/remainingWeeks())}/week to your lineup</span><span class="${r.theirGain>0?'is-up':'is-down'}">${r.theirGain>0?'+':'−'}${one(Math.abs(r.theirGain)/remainingWeeks())}/week to theirs</span><span>${(r.gap*100).toFixed(0)}% value gap</span></div>
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
  warmWeek();warmScorecardSources();ensureUsage();ensureSchedule();
  const m=model();
  if(HJTD.mode!=='build')cancelAnalysis();
  const body=HJTD.mode==='finder'?finderPanel()
   :`${verdict(m)}<div class="td-board">${sideColumn(m.sides[0],m)}<div class="td-mid"><button type="button" class="td-swap" data-td-swap aria-label="Swap sides">⇄</button><button type="button" class="td-clear" data-td-clear>Clear</button></div>${sideColumn(m.sides[1],m)}</div><div class="td-impacts">${m.sides.map(s=>impact(s,m)).join('')}</div>${balancePanel(m)}${analysisPanel(m)}`;
  return `<section class="hq-module hj15-shell td-shell"><div class="hq-module-head"><h3 class="hq-module-title">Trade Desk</h3><span class="hq-module-note">Built on Market Value</span></div>${toolbar()}${body}</section>`;
 }

 /* ---------- wiring ---------- */
 function rerender(){saveTradeDraft();if(typeof hjRerenderStrength==='function')hjRerenderStrength()}

 const SCORE_SOURCES={key:'',at:0,promise:null};
 function warmScorecardSources(){
  const key=String(NFL_SEASON)+':'+week();
  if(SCORE_SOURCES.promise||(SCORE_SOURCES.key===key&&Date.now()-SCORE_SOURCES.at<60000))return SCORE_SOURCES.promise;
  SCORE_SOURCES.key=key;SCORE_SOURCES.at=Date.now();
  const jobs=[];
  if(typeof hjMathLoadRosterSeasonProjections==='function')jobs.push(()=>hjMathLoadRosterSeasonProjections(HJ_LEAGUE_STATE.data));
  if(typeof hjEnsureProjectionSources==='function')jobs.push(()=>hjEnsureProjectionSources());
  if(typeof hjPffLoadFeed==='function')jobs.push(()=>hjPffLoadFeed());
  SCORE_SOURCES.promise=Promise.allSettled(jobs.map(fn=>Promise.resolve().then(fn))).finally(()=>{
   SCORE_SOURCES.promise=null;rerenderIfTrade();
  });
  return SCORE_SOURCES.promise;
 }
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
   if(t.closest?.('[data-td-analysis-start]')){
    event.preventDefault();event.stopPropagation();cancelAnalysis();ANALYSIS.requestedKey=analysisKey(model());rerender();return;
   }
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

  if(restoreTradeView){restoreTradeView=false;window.dispatchEvent(new Event('hashchange'))}
  document.addEventListener('hj:market-updated',()=>{if(HJ_HQ_STATE?.activeTab==='strength'&&HJ_STRENGTH_STATE.view==='trade')rerender()});
 }


 document.addEventListener('hj:pff-updated',()=>rerenderIfTrade());
 HJTD.buildResearchTrade=()=>researchTrade(model());
 HJTD.buildDossier=()=>{standingsCache=null;injuryMapCache=null;const m=model(),a=analyse(m);return a?dossierFor(m,a):null};
 HJTD.hydrateDossier=hydrateDossier;
 document.addEventListener('hj:season-data',event=>{
  if(Number(event.detail?.season)!==Number(NFL_SEASON))return;
  USAGE.rows=event.detail.rows;indexUsage();USAGE.ready=Boolean(USAGE.rows?.length);SCHED.sos=new Map();rerenderIfTrade();
 });
 document.addEventListener('hj:snaps-data',event=>{
  if(Number(event.detail?.season)!==Number(NFL_SEASON))return;
  USAGE.snaps=event.detail.snaps;USAGE.cache=new Map();
 });
 restoreTradeDraft();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
