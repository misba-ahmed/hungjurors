/* ESPN weekly records are the source of truth; recompute instead of incrementing totals. */
const HJ_CH_POS={1:'QB',2:'RB',3:'WR',4:'TE',5:'K',16:'D/ST'};
function hjChNumber(v){return v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null}
function hjChPlayer(e){return e?.playerPoolEntry?.player||e?.player||{}}
function hjChStat(e,season,week,source=0){return (hjChPlayer(e).stats||[]).find(s=>Number(s.seasonId)===season&&Number(s.scoringPeriodId)===week&&Number(s.statSplitTypeId)===1&&Number(s.statSourceId)===source)||null}
function hjChPoints(e,season,week){const s=hjChStat(e,season,week);return hjChNumber(s?.appliedTotal)??hjChNumber(e?.playerPoolEntry?.appliedStatTotal)}
function hjChRound(v){return Math.round((v+Number.EPSILON)*100)/100}
function hjChTds(s,position){
 if(!s)return null;const n=k=>Number(s[k])||0;
 // 105 is the aggregate: do not add its component return TDs again.
 const returns=hjChNumber(s[105])??[93,101,102,103,104].reduce((a,k)=>a+n(k),0);
 if(position==='D/ST')return returns;
 // 74 already includes 60+ yard kicks. Newer feeds also provide 198 and 201.
 const longFg=hjChNumber(s[74])??(n(198)+n(201));
 return n(4)+n(25)+n(43)+n(63)+returns+(position==='K'?longFg:0);
}
function hjChOptimal(entries,counts,season,week){
 const slots=Object.entries(counts||{}).filter(([id])=>![20,21].includes(Number(id))).flatMap(([id,n])=>Array.from({length:Number(n)},()=>Number(id)));
 if(!slots.length||slots.length>16)return null;
 const pool=entries.filter(e=>Number(e.lineupSlotId)!==21);
 if(pool.some(e=>!Array.isArray(hjChPlayer(e).eligibleSlots)||hjChPoints(e,season,week)===null))return null;
 // Assign each player once. Slot masks keep this small even for large benches.
 let best=new Map([[0,0]]);
 for(const e of pool){const next=new Map(best),eligible=hjChPlayer(e).eligibleSlots,points=hjChPoints(e,season,week);
  for(const [mask,total] of best)slots.forEach((slot,i)=>{const bit=1<<i;if(!(mask&bit)&&eligible.includes(slot)){const key=mask|bit;next.set(key,Math.max(next.get(key)??-Infinity,total+points))}});
  best=next;
 }
 // An empty eligible slot can score zero, including when every available player is negative.
 return hjChRound(Math.max(...best.values()));
}
function hjChWeek(payload,{season,week,names,pool=[],poolReady=false,final=false,checkedAt=0}){
 if(Number(payload.seasonId)!==season||Number(payload.scoringPeriodId)!==week)throw Error(`ESPN returned the wrong season/week (${week})`);
 const periods=payload.settings?.scheduleSettings?.matchupPeriods||{},period=Number(Object.keys(periods).find(k=>periods[k].includes(week))||week);
 const games=(payload.schedule||[]).filter(g=>Number(g.matchupPeriodId)===period),counts=payload.settings?.rosterSettings?.lineupSlotCounts;
 const teams=names.map(manager=>{
  const game=games.find(g=>[g.home?.teamId,g.away?.teamId].map(String).includes(manager.id));
  const side=game?.home&&String(game.home.teamId)===manager.id?game.home:game?.away;
  const roster=side?.rosterForCurrentScoringPeriod||side?.rosterForMatchupPeriod||side?.roster||payload.teams?.find(t=>String(t.id)===manager.id)?.roster;
  const entries=roster?.entries||[],starters=entries.filter(e=>![20,21].includes(Number(e.lineupSlotId))),points=starters.map(e=>hjChPoints(e,season,week));
  const lineupScore=points.every(n=>n!==null)?hjChRound(points.reduce((a,b)=>a+b,0)):null;
  const periodScore=hjChNumber(side?.pointsByScoringPeriod?.[String(week)]);
  const score=periodScore??((periods[period]?.length||1)===1?(hjChNumber(side?.totalPointsLive)??hjChNumber(side?.totalPoints)):null)??lineupScore;
  const adjustment=hjChNumber(side?.adjustment)||0;
  const complete=!!entries.length&&lineupScore!==null&&score!==null&&Math.abs(lineupScore+adjustment-score)<.02;
  const projections=starters.map(e=>hjChNumber(hjChStat(e,season,week,1)?.appliedTotal));
  const projection=complete&&projections.every(n=>n!==null)?projections.reduce((a,b)=>a+b,0):null;
  const players=starters.map(e=>{
   const p=hjChPlayer(e),actual=hjChStat(e,season,week),value=hjChPoints(e,season,week),raw=actual?.stats||(value===0?{}:null),position=HJ_CH_POS[p.defaultPositionId];
   return {id:String(p.id),name:p.fullName||'Player',position,points:value,tds:hjChTds(raw,position),yards:raw&&['QB','RB','WR'].includes(position)?[3,24,42].reduce((a,k)=>a+(Number(raw[k])||0),0):0};
  });
  const tds=complete&&players.every(p=>p.tds!==null)?players.reduce((a,p)=>a+p.tds,0):null;
  const optimal=complete?hjChOptimal(entries,counts,season,week):null;
  const bench=entries.filter(e=>[20,21].includes(Number(e.lineupSlotId))).map(e=>String(hjChPlayer(e).id));
  return {...manager,score,projection,complete,players,bench,titty:tds,yards:tds!==null?players.reduce((a,p)=>a+p.yards,0):null,overachiever:projection!==null?hjChRound(score-projection):null,optimizer:optimal!==null?hjChRound(Math.max(0,optimal-lineupScore)):null,optimal,mvp:null,mvpTie:null};
 });
 const allPlayers=pool.map(e=>{const p=hjChPlayer(e),s=hjChStat(e,season,week);return {id:String(p.id),name:p.fullName,position:HJ_CH_POS[p.defaultPositionId],proTeamId:p.proTeamId??null,points:hjChNumber(s?.appliedTotal),played:!!s&&((Number(s.stats?.[210])||0)>0||Object.values(s.stats||{}).some(n=>Number(n)!==0))}}).filter(p=>p.position&&p.points!==null&&p.played);
 const awards=[];
 if(poolReady&&teams.every(t=>t.complete)&&Object.values(HJ_CH_POS).every(pos=>allPlayers.some(p=>p.position===pos))){
  teams.forEach(t=>{t.mvp=0;t.mvpTie=0});
  for(const pos of [...Object.values(HJ_CH_POS),'Overall']){
   const candidates=allPlayers.filter(p=>pos==='Overall'||p.position===pos),high=Math.max(...candidates.map(p=>p.points));
   for(const p of candidates.filter(p=>Math.abs(p.points-high)<.00001)){
    const owner=teams.find(t=>t.players.some(s=>s.id===p.id)),benched=owner?null:teams.find(t=>t.bench.includes(p.id));
    awards.push({...p,category:pos,manager:owner?.short||null,bench:benched?.short||null});
    if(owner)owner.mvp++;
   }
  }
 }
 for(const team of teams){if(team.mvp!==null)team.mvpTie=[...new Map(awards.filter(a=>a.manager===team.short).map(a=>[a.id,a.points])).values()].reduce((a,b)=>a+b,0);}
 return {week,final,checkedAt,teams,awards,complete:teams.every(t=>t.complete)};
}
function hjChLmsHistory(model,names){
 const remaining=new Set(names.map(n=>n.id)),events=new Map(model.eliminations.map(e=>[e.week,e]));
 return model.weeks.filter(w=>w.final&&w.week<=model.regularEnd).map(w=>{
  const eliminated=events.get(w.week),eligible=w.teams.filter(t=>w.week<5||remaining.has(t.id));
  const expected=w.week<5?names.length:remaining.size;
  const complete=expected>0&&eligible.length===expected&&eligible.every(t=>Number.isFinite(t.score));
  const low=complete?Math.min(...eligible.map(t=>t.score)):null;
  const lowest=eliminated?[eliminated]:complete?eligible.filter(t=>Math.abs(t.score-low)<.00001):[];
  const pending=!complete||(w.week>=5&&remaining.size>1&&!eliminated);
  if(eliminated)remaining.delete(eliminated.id);
  return {week:w.week,eliminated:!!eliminated,pending,lowest};
 });
}
function hjChStandings(weeks,names,{regularEnd=14,finalEnd=16}={}){
 const ordered=[...weeks].filter(w=>w.week<=finalEnd).sort((a,b)=>a.week-b.week),totals={};
 for(const metric of ['titty','overachiever','mvp','optimizer'])totals[metric]=names.map(n=>({...n,total:0,tie:0,weeks:0,missing:[],live:0,history:[]}));
 const tickets=names.map(n=>({...n,total:0})),raffle=[],alive=new Set(names.map(n=>n.id)),eliminations=[];
 let lmsBlocked='',nextElimination=5;
 for(const w of ordered){
  for(const metric of Object.keys(totals))for(const row of totals[metric]){
   const t=w.teams.find(t=>t.id===row.id),value=t?.[metric];
   if(!Number.isFinite(value)){row.missing.push(w.week);continue;}
   row.total=hjChRound(row.total+value);row.weeks++;if(!w.final)row.live++;
   row.tie+=metric==='titty'?(t.yards||0):metric==='mvp'?(t.mvpTie||0):0;
   row.history.push({week:w.week,value,final:w.final,score:t.score,projection:t.projection,optimal:t.optimal});
  }
  if(w.week<=regularEnd&&w.final&&w.teams.length===names.length&&w.teams.every(t=>Number.isFinite(t.score))){
   const high=Math.max(...w.teams.map(t=>t.score)),winners=w.teams.filter(t=>Math.abs(t.score-high)<.00001);
   raffle.push({week:w.week,score:high,winners});winners.forEach(t=>tickets.find(r=>r.id===t.id).total++);
  }
  if(w.week>=5&&w.week<=regularEnd&&w.final&&alive.size>1&&!lmsBlocked){
   if(w.week!==nextElimination){lmsBlocked=`Waiting for Week ${nextElimination} results`;continue;}
   const remaining=w.teams.filter(t=>alive.has(t.id));
   if(remaining.length!==alive.size||remaining.some(t=>!Number.isFinite(t.score))){lmsBlocked=`Waiting for Week ${w.week} scores`;continue;}
   const low=Math.min(...remaining.map(t=>t.score)),losers=remaining.filter(t=>Math.abs(t.score-low)<.00001);
   // The published rule has no tie-break for elimination. Never choose arbitrarily.
   if(losers.length!==1){lmsBlocked=`Week ${w.week}: ${losers.map(t=>t.short).join(' and ')} tied at ${low.toFixed(2)}. The league rules need an elimination tiebreaker.`;continue;}
   alive.delete(losers[0].id);eliminations.push({week:w.week,...losers[0]});nextElimination++;
  }
 }
 for(const metric of Object.keys(totals))totals[metric].sort((a,b)=>a.missing.length-b.missing.length||(metric==='optimizer'?a.total-b.total:b.total-a.total)||b.tie-a.tie||a.short.localeCompare(b.short));
 tickets.sort((a,b)=>b.total-a.total||a.short.localeCompare(b.short));
 return {weeks:ordered,totals,tickets,raffle,alive:[...alive],eliminations,lmsBlocked,regularEnd,finalEnd,liveWeek:ordered.findLast(w=>!w.final)?.week||0,finalWeek:ordered.filter(w=>w.final).at(-1)?.week||0};
}
