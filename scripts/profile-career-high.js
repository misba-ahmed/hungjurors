/* Career highs count individual completed weeks, including all postseason games. */
// Owner-confirmed weeks for archived season-high scores with missing week metadata.
const HJ_CAREER_HIGH_WEEKS={
 'WASI':{2022:1},
 'TYLER':{2022:5},
 'GARRETT':{2020:12},
 'NATHAN T':{2024:13},
 'CESAR':{2023:13}
};
function hjCareerArchive(){
 if(!window.hjCareerArchiveState){
  let saved={};try{saved=JSON.parse(localStorage.getItem('hj:career-weekly:v1')||'{}')}catch(_){}
  window.hjCareerArchiveState={seasons:saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{},jobs:new Map()};
 }
 return window.hjCareerArchiveState;
}
function hjCareerWeeklyRows(team,data,year){
 const rows=[];if(!team||!data)return rows;
 const periods=data.settings?.scheduleSettings?.matchupPeriods||{};
 for(const game of data.schedule||[]){
  if(!['HOME','AWAY','TIE'].includes(game.winner))continue;
  const weeks=periods[game.matchupPeriodId];
  for(const side of [game.home,game.away]){
   if(String(side?.teamId)!==String(team.id))continue;
   const scores=side.pointsByScoringPeriod||{};
   const entries=Object.entries(scores).length?Object.entries(scores):Array.isArray(weeks)&&weeks.length===1?[[weeks[0],side.totalPoints]]:[];
   for(const [week,value] of entries){
    if(value===null||value===undefined||value===''||!Number.isFinite(Number(value))||Number(week)<1)continue;
    rows.push({score:Number(value),year:Number(year),week:Number(week)});
   }
  }
 }
 return rows;
}
function hjManagerCareerHighRecord(name){
 const candidates=[],add=row=>{if(row&&Number.isFinite(Number(row.score)))candidates.push(row)};
 for(const row of HIST.manager_seasons||[])if(row.manager===name){
  const highest=HIST.season_summaries?.[row.year]?.highest_week;
  const award=(HIST.season_awards?.perfect_lineup||[]).find?.(a=>a.manager===name&&Number(a.year)===Number(row.year)&&Number(a.score)===Number(row.max_score));
  add({score:Number(row.max_score),year:Number(row.year),week:HJ_CAREER_HIGH_WEEKS[name]?.[row.year]||(highest?.manager===name&&Number(highest.score)===Number(row.max_score)?highest.week:award?.week||null)});
 }
 for(const season of HIST.official_playoffs||[]){
  if(season.score_format!=='single_week')continue;
  const regular=Number(HIST.league_settings?.[season.year]?.regular_season_games);
  for(const [game,week] of [...(season.semifinals||[]).map(g=>[g,regular+1]),[season.championship,regular+2],[season.third_place,regular+2]]){
   for(const i of [1,2])if(game?.['manager'+i]===name)add({score:Number(game['score'+i]),year:Number(season.year),week});
  }
 }
 for(const rows of Object.values(hjCareerArchive().seasons))for(const row of rows)if(row.manager===name)add(row);
 const data=HJ_LEAGUE_STATE?.data,team=hjCurrentManagerTeam(name,data);
 hjCareerWeeklyRows(team,data,data?.seasonId).forEach(add);
 return candidates.sort((a,b)=>b.score-a.score||Number(!!b.week)-Number(!!a.week)||a.year-b.year||(a.week||99)-(b.week||99))[0]||{score:0,year:null,week:null};
}
function hjCareerHighCaption(record){
 return record.year?`${record.year} · ${record.week?'Week '+record.week:'Week unavailable'}`:'No completed weekly scores';
}
function hjPaintCareerHigh(root,name){
 const card=root.matches?.('.profile-stat')?root:[...root.querySelectorAll('.profile-stat')].find(el=>el.querySelector('.k')?.textContent.trim()==='Career High');
 if(!card)return;
 const record=hjManagerCareerHighRecord(name),v=card.querySelector('.v'),s=card.querySelector('.s');
 if(v&&v.textContent!==record.score.toFixed(2))v.textContent=record.score.toFixed(2);
 if(s&&s.textContent!==hjCareerHighCaption(record))s.textContent=hjCareerHighCaption(record);
}
async function hjLoadCareerHigh(name){
 const archive=hjCareerArchive(),years=[...new Set((HIST.manager_seasons||[]).filter(r=>r.manager===name).map(r=>Number(r.year)))];
 await Promise.allSettled(years.map(year=>{
  if(archive.seasons[year])return Promise.resolve();
  if(archive.jobs.has(year))return archive.jobs.get(year);
  const job=(async()=>{
   const base=year<=2018?`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${ESPN_FANTASY_LEAGUE_ID}?seasonId=${year}&`:`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${ESPN_FANTASY_LEAGUE_ID}?`;
   const response=await fetch(base+'view=mTeam&view=mSettings&view=mMatchup&view=mMatchupScore',{signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('Career history unavailable');
   const raw=await response.json(),data=Array.isArray(raw)?raw.find(d=>Number(d.seasonId)===year):raw;
   if(!data||Number(data.seasonId)!==year||String(data.id)!==String(ESPN_FANTASY_LEAGUE_ID))throw Error('Wrong career season');
   const historical=(HIST.manager_seasons||[]).filter(r=>Number(r.year)===year),rows=[];
   for(const team of data.teams||[]){
    // Season-specific team names preserve former managers and co-manager attribution.
    const exact=historical.filter(r=>hjNorm(r.team)===hjNorm(hjTeamName(team)));
    const owner=hjOwner(team,data),first=hjNorm(owner?.firstName||'');
    const possible=historical.filter(r=>hjNorm(r.manager).split(' ')[0]===first);
    const manager=exact.length===1?exact[0].manager:possible.length===1?possible[0].manager:'';
    if(manager)rows.push(...hjCareerWeeklyRows(team,data,year).map(r=>({...r,manager})));
   }
   if(!rows.length)throw Error('No historical weekly scores');
   archive.seasons[year]=rows;
   try{localStorage.setItem('hj:career-weekly:v1',JSON.stringify(archive.seasons))}catch(_){}
  })().finally(()=>archive.jobs.delete(year));
  archive.jobs.set(year,job);return job;
 }));
}
