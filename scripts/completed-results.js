/* Derived results only. Never change ESPN's live payload, roster week or schedule. */
function hjCompletedResultData(data,scoreboards){
 if(!data?.teams?.length||!Array.isArray(data.schedule))return data;
 const season=Number(data.seasonId),settings=data.settings?.scheduleSettings,periods=settings?.matchupPeriods;
 if(!periods)return data;
 const number=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
 const official=g=>['HOME','AWAY','TIE'].includes(g.winner);
 const weeksFor=g=>periods[g.matchupPeriodId]?.map(Number)||[];
 const liveScore=(side,week)=>number(side?.pointsByScoringPeriod?.[week])??(Number(data.scoringPeriodId)===week?number(side?.totalPointsLive):null);
 const ready=new Set();
 for(const [period,weeks] of Object.entries(periods)){
  if(!Array.isArray(weeks)||!weeks.length||!weeks.every(w=>hjChNflWeekFinal(scoreboards.get(`${season}:${Number(w)}`),season,Number(w))))continue;
  const games=data.schedule.filter(g=>Number(g.matchupPeriodId)===Number(period)&&g.home?.teamId&&g.away?.teamId);
  // All scheduled matchups must have scores. A missing score is not a zero.
  if(games.length&&games.every(g=>official(g)||['home','away'].every(side=>weeks.every(w=>liveScore(g[side],Number(w))!==null))))ready.add(Number(period));
 }
 const schedule=data.schedule.map(g=>{
  if(official(g)||!ready.has(Number(g.matchupPeriodId))||!g.home?.teamId||!g.away?.teamId)return g;
  const weeks=weeksFor(g),side=s=>{const points=Object.fromEntries(weeks.map(w=>[w,liveScore(s,w)])),total=Object.values(points).reduce((a,b)=>a+b,0);return {...s,totalPoints:total,totalPointsLive:total,pointsByScoringPeriod:{...s.pointsByScoringPeriod,...points}}};
  const home=side(g.home),away=side(g.away);
  return {...g,home,away,winner:home.totalPoints>away.totalPoints?'HOME':home.totalPoints<away.totalPoints?'AWAY':'TIE'};
 });
 const regular=Number(settings.matchupPeriodCount),finished=schedule.filter(g=>Number(g.matchupPeriodId)<=regular&&g.home?.teamId&&g.away?.teamId&&official(g));
 const last=Math.max(0,...finished.map(g=>Number(g.matchupPeriodId))),ids=new Set(data.teams.map(t=>String(t.id)));
 // Rebuild season totals only from a complete regular-season history. Never add
 // a guessed win to ESPN totals, which may already include that same matchup.
 const complete=last>0&&Array.from({length:last},(_,i)=>i+1).every(period=>{
  const games=finished.filter(g=>Number(g.matchupPeriodId)===period),seen=games.flatMap(g=>[String(g.home.teamId),String(g.away.teamId)]);
  return seen.length===ids.size&&new Set(seen).size===ids.size&&seen.every(id=>ids.has(id))&&games.every(g=>number(g.home.totalPoints)!==null&&number(g.away.totalPoints)!==null);
 });
 if(!complete)return {...data,schedule};
 const teams=data.teams.map(team=>{
  const games=finished.filter(g=>[g.home.teamId,g.away.teamId].some(id=>String(id)===String(team.id))).sort((a,b)=>a.matchupPeriodId-b.matchupPeriodId);
  const overall={...team.record?.overall,wins:0,losses:0,ties:0,pointsFor:0,pointsAgainst:0,streakLength:0,streakType:'NONE'};
  for(const game of games){
   const side=String(game.home.teamId)===String(team.id)?'home':'away',other=side==='home'?'away':'home';
   overall.pointsFor+=Number(game[side].totalPoints);overall.pointsAgainst+=Number(game[other].totalPoints);
   const result=game.winner==='TIE'?'TIE':game.winner===side.toUpperCase()?'WIN':'LOSS';
   overall[result==='WIN'?'wins':result==='LOSS'?'losses':'ties']++;
   overall.streakLength=result===overall.streakType?overall.streakLength+1:1;overall.streakType=result;
  }
  overall.pointsFor=Math.round(overall.pointsFor*100)/100;overall.pointsAgainst=Math.round(overall.pointsAgainst*100)/100;
  overall.percentage=(overall.wins+overall.ties*.5)/games.length;
  return {...team,record:{...team.record,overall}};
 });
 // This league uses overall record, then points for (one division). Preserve
 // ESPN's ordering for exact ties and for any unsupported league settings.
 const totalsChanged=teams.some((team,i)=>['wins','losses','ties','pointsFor','pointsAgainst'].some(key=>number(team.record.overall[key])!==number(data.teams[i].record?.overall?.[key])));
 // ESPN's simulation still describes its old standings. Use the site's existing
 // PF-rank fallback until ESPN supplies odds for the reconciled records.
 if(totalsChanged)teams.forEach(team=>{if(team.currentSimulationResults)team.currentSimulationResults={...team.currentSimulationResults,playoffPct:null}});
 if(totalsChanged&&settings.playoffSeedingRule==='TOTAL_POINTS_SCORED'&&(settings.divisions||[]).length===1){
  const ranked=[...teams].sort((a,b)=>b.record.overall.percentage-a.record.overall.percentage||b.record.overall.pointsFor-a.record.overall.pointsFor||(number(a.playoffSeed)??Infinity)-(number(b.playoffSeed)??Infinity)||Number(a.id)-Number(b.id));
  ranked.forEach((team,i)=>{team.playoffSeed=i+1});
 }
 return {...data,schedule,teams};
}
