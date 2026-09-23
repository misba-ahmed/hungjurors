/* Pure record calculation. Rebuild from the historical baseline on every refresh. */
function hjRecordSnapshot(data, year, managerName) {
 const number=v=>v!==null&&v!==''&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
 if(Number(data?.seasonId)!==year||!Array.isArray(data.teams)||!data.teams.length||!Array.isArray(data.schedule))throw Error('Incomplete record season');
 const settings=data.settings?.scheduleSettings,regular=Number(settings?.matchupPeriodCount),periods=settings?.matchupPeriods;
 if(!Number.isInteger(regular)||regular<1||!periods)throw Error('Missing record schedule settings');
 const names=new Map(data.teams.map(t=>[String(t.id),managerName(t,data)]));
 if([...names.values()].some(n=>!n)||new Set(names.values()).size!==names.size)throw Error('Ambiguous record manager identity');
 const seen=new Set(),games=[];
 for(const g of data.schedule){
  if(!g.home?.teamId||!g.away?.teamId)continue;
  const period=Number(g.matchupPeriodId),weeks=periods[period];
  if(!Array.isArray(weeks)||!weeks.length)throw Error('Missing scoring periods');
  const key=String(g.id??[period,g.home.teamId,g.away.teamId].join(':'));if(seen.has(key))continue;seen.add(key);
  const manager1=names.get(String(g.home.teamId)),manager2=names.get(String(g.away.teamId));if(!manager1||!manager2||manager1===manager2)throw Error('Unknown record team');
  const score1=number(g.home.totalPoints),score2=number(g.away.totalPoints);
  const final=['HOME','AWAY','TIE'].includes(g.winner)&&score1!==null&&score2!==null;
  // Never compare a multi-week total to a single-week record.
  const weekly=weeks.map(week=>({week:Number(week),score1:number(g.home.pointsByScoringPeriod?.[week]??(weeks.length===1?score1:null)),score2:number(g.away.pointsByScoringPeriod?.[week]??(weeks.length===1?score2:null))}));
  games.push({year,period,homeTeamId:g.home.teamId,awayTeamId:g.away.teamId,matchupId:g.id,manager1,manager2,score1,score2,weekly,final,winner:g.winner==='HOME'?manager1:g.winner==='AWAY'?manager2:null,tier:g.playoffTierType,regular:period<=regular});
 }
 return {year,regular,teams:[...names.values()],games};
}
function hjBuildRecordHistory(baseline,snapshots) {
 const history=JSON.parse(JSON.stringify(baseline)),R=history.record_book,careers=new Map(history.career_profiles.map(c=>[c.manager,c]));
 const round=n=>Math.round(n*100)/100;
 const best=(section,key,row,field,low=false)=>{const old=section[key];if(!old||(low?row[field]<old[field]-1e-9:row[field]>old[field]+1e-9))section[key]=row};
 const streak=(manager,year,games)=>{const old=R.regular_season.longest_win_streak[0].games,row={manager,year,games};
  if(games>old)R.regular_season.longest_win_streak=[row];
  else if(games===old&&!R.regular_season.longest_win_streak.some(r=>r.manager===manager&&r.year===year))R.regular_season.longest_win_streak.push(row);
 };
 const career=name=>{if(!careers.has(name))careers.set(name,{manager:name,games:0,wins:0,losses:0,championships:0,runner_ups:0,third_places:0,podiums:0,playoff_appearances:0});return careers.get(name)};
 const seasons=new Map(snapshots.filter(s=>s.year>Number(baseline.metadata.completed_through)).map(s=>[s.year,s]));
 for(const s of [...seasons.values()].sort((a,b)=>a.year-b.year)){
  const reg=s.games.filter(g=>g.regular),finished=reg.filter(g=>g.final).sort((a,b)=>a.period-b.period);
  const complete=Array.from({length:s.regular},(_,i)=>i+1).every(p=>{
   const games=reg.filter(g=>g.period===p);return games.length===Math.floor(s.teams.length/2)&&games.every(g=>g.final)&&new Set(games.flatMap(g=>[g.manager1,g.manager2])).size===s.teams.length;
  });
  const byWeek=new Map();
  for(const g of finished){
   for(const w of g.weekly){
    if(w.score1===null||w.score2===null)continue;
    const row={year:s.year,week:w.week,manager1:g.manager1,manager2:g.manager2,score1:w.score1,score2:w.score2,margin:round(Math.abs(w.score1-w.score2)),total:round(w.score1+w.score2)};
    best(R.scoring,'closest_regular_season_game',row,'margin',true);
    best(R.scoring,'biggest_regular_season_blowout',row,'margin');
    best(R.scoring,'highest_combined_score_game',row,'total');
    if(!byWeek.has(w.week))byWeek.set(w.week,new Map());
    for(const [name,score,opponent,opp_score] of [[g.manager1,w.score1,g.manager2,w.score2],[g.manager2,w.score2,g.manager1,w.score1]]){
     byWeek.get(w.week).set(name,score);const entry={year:s.year,week:w.week,manager:name,score,opponent,opp_score};
     best(R.scoring,'highest_raw_week',entry,'score');
     if(score<opp_score)best(R.scoring,'highest_scoring_loss',entry,'score');
     if(score>opp_score)best(R.scoring,'lowest_scoring_win',entry,'score',true);
    }
   }
  }
  for(const name of s.teams){
   const entries=finished.filter(g=>g.manager1===name||g.manager2===name),c=career(name);
   let wins=0,losses=0,ties=0,winRun=0,lossRun=0,previous=0,allWins=0,allGames=0;
   for(const g of entries){
    if(g.period!==previous+1){winRun=0;lossRun=0}previous=g.period;
    if(g.winner===name){wins++;winRun++;lossRun=0;streak(name,s.year,winRun)}
    else if(g.winner){losses++;lossRun++;winRun=0;best(R.regular_season,'longest_loss_streak',{manager:name,year:s.year,games:lossRun},'games')}
    else{ties++;winRun=0;lossRun=0}
   }
   c.games+=entries.length;c.wins+=wins;c.losses+=losses;
   for(const scores of byWeek.values()){
    if(scores.size!==s.teams.length||!scores.has(name))continue;
    for(const [other,score] of scores){if(other===name)continue;allGames++;allWins+=scores.get(name)>score?1:scores.get(name)===score?.5:0}
   }
   // Rate records require a complete regular season, not a 1–0 start.
   if(complete){
    best(R.regular_season,'best_single_season_win_pct',{manager:name,year:s.year,wins,losses,ties,win_pct:(wins+ties*.5)/entries.length},'win_pct');
    if(allGames&&[...byWeek.values()].every(w=>w.size===s.teams.length)&&finished.every(g=>g.weekly.every(w=>w.score1!==null&&w.score2!==null)))
     best(R.regular_season,'best_all_play_season',{manager:name,year:s.year,all_play_pct:allWins/allGames},'all_play_pct');
   }
  }
  const bracket=s.games.filter(g=>!g.regular&&g.tier==='WINNERS_BRACKET');
  if(!complete||!bracket.length)continue;
  for(const name of new Set(bracket.flatMap(g=>[g.manager1,g.manager2])))career(name).playoff_appearances++;
  const finalPeriod=Math.max(...bracket.map(g=>g.period));
  // A title is awarded only when the last scheduled winners-bracket round has one completed game.
  const last=bracket.filter(g=>g.period===finalPeriod);
  const final=last.length===1&&last[0].final&&last[0].winner?last[0]:null;
  const prior=bracket.filter(g=>g.period<finalPeriod),semiPeriod=prior.length?Math.max(...prior.map(g=>g.period)):null;
  const gameRow=g=>({year:s.year,manager1:g.manager1,manager2:g.manager2,score1:g.score1,score2:g.score2,margin:round(Math.abs(g.score1-g.score2)),round:g.period===finalPeriod&&last.length===1?'Championship':g.period===semiPeriod?'Semifinal':'Playoff'});
  for(const g of bracket.filter(g=>g.final)){
   for(const w of g.weekly){
    if(w.score1===null||w.score2===null)continue;
    for(const [manager,score] of [[g.manager1,w.score1],[g.manager2,w.score2]])best(R.playoffs,'highest_single_week_playoff_score_2018_onward',{year:s.year,week:w.week,round:gameRow(g).round,manager,score},'score');
   }
  }
  const entry={year:s.year,semifinals:bracket.filter(g=>g.final&&g!==final).map(gameRow),championship:final?gameRow(final):null};
  history.official_playoffs.push(entry);
  if(final){
   const c=career(final.winner),loser=career(final.winner===final.manager1?final.manager2:final.manager1);c.championships++;c.podiums++;loser.runner_ups++;loser.podiums++;
   // Championship margins compare whole matchups, as in the historical record book.
   best(R.playoffs,'closest_championship_2018_onward',entry.championship,'margin',true);
   best(R.playoffs,'largest_championship_margin_2018_onward',entry.championship,'margin');
   const semis=prior.filter(g=>g.period===semiPeriod&&g.final&&g.winner);
   if(semis.length===2){
    const losers=semis.map(g=>g.winner===g.manager1?g.manager2:g.manager1);
    const third=s.games.find(g=>g.period===finalPeriod&&g.final&&g.winner&&losers.includes(g.manager1)&&losers.includes(g.manager2));
    if(third){entry.third_place=gameRow(third);career(third.winner).third_places++;career(third.winner).podiums++}
   }
  }
 }
 history.career_profiles=[...careers.values()];
 for(const [key,field] of [['most_championships','championships'],['most_regular_season_wins','wins'],['most_playoff_appearances','playoff_appearances'],['most_podiums','podiums']]){
  const max=Math.max(...history.career_profiles.map(c=>c[field]||0)),holders=history.career_profiles.filter(c=>(c[field]||0)===max).map(c=>({manager:c.manager,value:max}));
  R.legacy[key]=key==='most_podiums'?holders:{...holders[0],holders};
 }
 return history;
}

/* Record announcements compare the book before and after each completed matchup period.
   Rebuilding from the archive makes score corrections retract or revise announcements. */
const HJ_RECORD_DEFINITIONS=[
 {id:'most-championships',category:'legacy',title:'Most Championships',path:['legacy','most_championships'],field:'value',unit:'titles',headline:'A new championship standard!'},
 {id:'most-regular-season-wins',announce:false,category:'legacy',title:'Most Regular-Season Wins',path:['legacy','most_regular_season_wins'],field:'value',unit:'career wins',headline:'More wins than anyone in league history!'},
 {id:'most-playoff-appearances',category:'legacy',title:'Most Playoff Appearances',path:['legacy','most_playoff_appearances'],field:'value',unit:'playoff trips',headline:'A new postseason milestone!'},
 {id:'most-podium-finishes',category:'legacy',title:'Most Podium Finishes',path:['legacy','most_podiums'],field:'value',unit:'podium finishes',headline:'A new all-time podium mark!'},
 {id:'best-regular-season',category:'regular',title:'Best Regular Season',path:['regular_season','best_single_season_win_pct'],field:'win_pct',format:'record',unit:'season record',headline:'The best regular season in league history!'},
 {id:'best-weekly-scoring-season',category:'regular',title:'Best Weekly Scoring Season',path:['regular_season','best_all_play_season'],field:'all_play_pct',format:'percent',unit:'of opponents outscored',headline:'A season above the rest—an all-time best!'},
 {id:'longest-winning-streak',category:'regular',title:'Longest Winning Streak',path:['regular_season','longest_win_streak'],field:'games',unit:'straight wins',headline:'The longest winning streak in league history!'},
 {id:'longest-losing-streak',category:'regular',title:'Longest Losing Streak',path:['regular_season','longest_loss_streak'],field:'games',unit:'straight losses',headline:'An unprecedented losing streak!'},
 {id:'highest-score',category:'scoring',title:'Highest Score',path:['scoring','highest_raw_week'],field:'score',format:'points',unit:'points',headline:'The biggest score in league history!'},
 {id:'highest-score-in-a-loss',category:'scoring',title:'Highest Score in a Loss',path:['scoring','highest_scoring_loss'],field:'score',format:'points',unit:'points in a loss',headline:'Never has this much scoring ended in a loss!'},
 {id:'lowest-score-in-a-win',category:'scoring',title:'Lowest Score in a Win',path:['scoring','lowest_scoring_win'],field:'score',format:'points',low:true,unit:'points in a win',headline:'The lowest winning score in league history!'},
 {id:'closest-game',category:'scoring',title:'Closest Game',path:['scoring','closest_regular_season_game'],field:'margin',format:'points',low:true,unit:'points apart',headline:'The closest finish in league history!'},
 {id:'biggest-blowout',category:'scoring',title:'Biggest Blowout',path:['scoring','biggest_regular_season_blowout'],field:'margin',format:'points',unit:'point margin',headline:'The biggest blowout in league history!'},
 {id:'highest-combined-score',category:'scoring',title:'Highest Combined Score',path:['scoring','highest_combined_score_game'],field:'total',format:'points',unit:'combined points',headline:'The highest-scoring showdown in league history!'},
 {id:'highest-playoff-score',category:'playoffs',title:'Highest Playoff Score',path:['playoffs','highest_single_week_playoff_score_2018_onward'],field:'score',format:'points',unit:'playoff points',headline:'A new playoff scoring high!'},
 {id:'highest-combined-playoff-game',category:'playoffs',title:'Highest Combined Playoff Game',field:'total',format:'points',unit:'combined playoff points',headline:'The biggest playoff shootout in league history!'},
 {id:'closest-championship',category:'playoffs',title:'Closest Championship',path:['playoffs','closest_championship_2018_onward'],field:'margin',format:'points',low:true,unit:'points apart',headline:'The closest title finish in league history!'},
 {id:'biggest-championship-win',category:'playoffs',title:'Biggest Championship Win',path:['playoffs','largest_championship_margin_2018_onward'],field:'margin',format:'points',unit:'point margin',headline:'The biggest championship win in league history!'}
];
function hjRecordMarks(history){
 return HJ_RECORD_DEFINITIONS.map(def=>{
  let source;
  if(def.path)source=def.path.reduce((v,k)=>v?.[k],history.record_book);
  else source=(history.official_playoffs||[]).filter(p=>Number(p.year)>=2018).flatMap(p=>[
   ...(p.semifinals||[]).map(g=>({...g,year:Number(p.year),round:g.round||'Semifinal'})),
   ...(p.championship?[{...p.championship,year:Number(p.year),round:'Championship'}]:[])
  ]).map(g=>({...g,total:Math.round((Number(g.score1)+Number(g.score2))*100)/100})).sort((a,b)=>b.total-a.total)[0];
  const rows=Array.isArray(source)?source:[source],row=rows[0];
  if(!row)return {...def,value:null,people:[],mark:'—',detail:''};
  const value=Number(row[def.field]);
  let people;
  if(row.manager1&&row.manager2)people=[{name:row.manager1,score:Number(row.score1)},{name:row.manager2,score:Number(row.score2)}].sort((a,b)=>b.score-a.score);
  else if(row.opponent)people=[{name:row.manager,score:Number(row.score)},{name:row.opponent,score:Number(row.opp_score)}];
  else people=(row.holders||rows).map(r=>({name:r.manager,year:r.year}));
  const mark=def.format==='record'?row.wins+'–'+row.losses+(row.ties?'–'+row.ties:''):def.format==='percent'?(value*100).toFixed(1)+'%':def.format==='points'?value.toFixed(2):String(value);
  const detail=[row.year,row.week?'Week '+row.week:row.round?(row.round[0].toUpperCase()+row.round.slice(1)):null].filter(Boolean).join(' · ');
  return {...def,value,mark,people,detail,row};
 });
}
function hjRecordChanges(before,after){
 const prior=new Map(hjRecordMarks(before).map(mark=>[mark.id,mark]));
 return hjRecordMarks(after).flatMap(current=>{
  const previous=prior.get(current.id);
  if(current.announce===false)return [];
  if(current.value===null||previous?.value===null||!Number.isFinite(current.value)||!Number.isFinite(previous?.value))return [];
  const broken=current.low?current.value<previous.value-1e-9:current.value>previous.value+1e-9;
  return broken?[{id:current.id,category:current.category,current,previous}]:[];
 });
}
function hjRecordTimeline(baseline,snapshots){
 const years=[...new Map(snapshots.filter(s=>s.year>Number(baseline.metadata.completed_through)).map(s=>[s.year,s])).values()].sort((a,b)=>a.year-b.year);
 if(years.some((s,i)=>s.year!==Number(baseline.metadata.completed_through)+1+i))return {history:baseline,events:[]};
 const completed=[],events=[];let before=baseline;
 for(const snapshot of years){
  const periods=[...new Set(snapshot.games.filter(g=>g.final).map(g=>g.period))].sort((a,b)=>a-b);
  for(const period of periods){
   // Keep future bracket rounds present but unfinished, so an early round cannot become a championship.
   const partial={...snapshot,games:snapshot.games.map(g=>({...g,final:g.final&&g.period<=period}))};
   const after=hjBuildRecordHistory(baseline,[...completed,partial]);
   for(const change of hjRecordChanges(before,after)){
    const names=new Set(change.current.people.map(p=>p.name));
    const matches=snapshot.games.filter(g=>g.final&&g.period===period&&(names.has(g.manager1)||names.has(g.manager2)));
    events.push({...change,key:snapshot.year+':'+period+':'+change.id,year:snapshot.year,week:period,matches});
   }
   before=after;
  }
  completed.push(snapshot);
 }
 return {history:before,events};
}
const HJ_RECORD_STATE={snapshots:new Map(),signature:'',history:null,events:[]};
