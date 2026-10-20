import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ctx=vm.createContext({});
for(const file of ['challenge-engine.js','completed-results.js'])vm.runInContext(readFileSync(new URL(file,import.meta.url),'utf8'),ctx);
const board=(week,state='post',completed=true)=>({season:{year:2026,type:2},week:{number:week},events:[{status:{type:{state,completed}}}]});
const boards=new Map([['2026:1',board(1)],['2026:2',board(2)]]);
const side=(teamId,week,score)=>({teamId,totalPoints:0,totalPointsLive:score,pointsByScoringPeriod:{[week]:score},rosterForCurrentScoringPeriod:{entries:[]}});
function fixture(){return {id:123,seasonId:2026,scoringPeriodId:2,status:{currentMatchupPeriod:2},settings:{scheduleSettings:{matchupPeriodCount:3,matchupPeriods:{1:[1],2:[2],3:[3]} }},teams:[1,2].map(id=>({id,roster:{entries:[{lineupSlotId:21,player:{id}}]},record:{overall:{wins:id===1?1:0,losses:id===1?0:1,ties:0,pointsFor:id===1?100:90,pointsAgainst:id===1?90:100}}})),schedule:[{id:1,matchupPeriodId:1,playoffTierType:'NONE',winner:'HOME',home:{...side(1,1,100),totalPoints:100},away:{...side(2,1,90),totalPoints:90}},{id:2,matchupPeriodId:2,playoffTierType:'NONE',winner:'UNDECIDED',home:side(1,2,80),away:side(2,2,95)},{id:3,matchupPeriodId:3,playoffTierType:'NONE',winner:'UNDECIDED',home:side(1,3,0),away:side(2,3,0)}]}}
const view=(data,b=boards)=>ctx.hjCompletedResultData(data,b);
const json=x=>JSON.parse(JSON.stringify(x));
function freeze(o){if(o&&typeof o==='object'){Object.freeze(o);Object.values(o).forEach(freeze)}return o}
test('last NFL game final unlocks results; raw payload, current roster scores and future week remain unchanged',()=>{
 const raw=freeze(fixture()),before=JSON.stringify(raw),out=view(raw);
 assert.equal(out.schedule[1].winner,'AWAY');assert.equal(out.schedule[1].home.totalPoints,80);
 assert.equal(out.schedule[2].winner,'UNDECIDED');assert.equal(out.scoringPeriodId,2);assert.equal(out.status,raw.status);
 assert.equal(out.teams[0].roster,raw.teams[0].roster);
 assert.equal(out.teams[0].record.overall.wins,1);assert.equal(out.teams[0].record.overall.losses,1);
 assert.equal(out.teams[0].record.overall.pointsFor,180);assert.equal(out.teams[0].record.overall.pointsAgainst,185);
 assert.equal(JSON.stringify(raw),before);
 assert.deepEqual(json(view(out)),json(out),'repeated reconciliation is idempotent');
});
test('overtime, delayed games, empty/wrong scoreboard and unavailable scoreboard cannot finalize',()=>{
 for(const b of [board(2,'in',false),board(2,'pre',false),{...board(2),events:[]},board(1),{...board(2),season:{year:2025,type:2}},null,{...board(2),events:[...board(2).events,{status:{type:{state:'pre',completed:false}}}]}]){
  assert.equal(view(fixture(),new Map([['2026:2',b]])).schedule[1].winner,'UNDECIDED');
 }
});
test('missing or empty scores cannot become zero; explicit zero and negative scores are valid',()=>{
 for(const value of [null,undefined,'',NaN]){const raw=fixture();raw.schedule[1].home.pointsByScoringPeriod[2]=value;raw.schedule[1].home.totalPointsLive=value;assert.equal(view(raw).schedule[1].winner,'UNDECIDED')}
 const raw=fixture();raw.schedule[1].home.pointsByScoringPeriod[2]=0;raw.schedule[1].away.pointsByScoringPeriod[2]=-1;
 assert.equal(view(raw).schedule[1].winner,'HOME');
});
test('correction can reverse a win, points and streak without duplicate wins, then official results reconcile',()=>{
 const raw=fixture();view(raw);raw.schedule[1].home.pointsByScoringPeriod[2]=96;
 const corrected=view(raw);assert.equal(corrected.schedule[1].winner,'HOME');assert.equal(corrected.teams[0].record.overall.wins,2);assert.equal(corrected.teams[0].record.overall.pointsFor,196);
 raw.schedule[1]={...corrected.schedule[1]};raw.teams=corrected.teams.map(t=>json(t));
 assert.deepEqual(json(view(raw).teams),json(corrected.teams));
 raw.schedule[1].winner='AWAY';raw.schedule[1].home.totalPoints=94;raw.schedule[1].home.pointsByScoringPeriod[2]=94;
 assert.equal(view(raw).teams[0].record.overall.wins,1);assert.equal(view(raw).teams[0].record.overall.pointsFor,194);
});
test('ties, incomplete season history, duplicate teams and post-season do not invent regular-season totals',()=>{
 const raw=fixture();raw.schedule[1].home.pointsByScoringPeriod[2]=95;assert.equal(view(raw).teams[0].record.overall.ties,1);
 raw.schedule=raw.schedule.slice(1);assert.equal(view(raw).teams[0].record.overall.pointsFor,100);
 const duplicate=fixture();duplicate.schedule.push({...duplicate.schedule[0],id:99});assert.equal(view(duplicate).teams[0].record.overall.pointsFor,100);
 const post=fixture();post.settings.scheduleSettings.matchupPeriodCount=1;post.schedule[1].playoffTierType='WINNERS_BRACKET';assert.equal(view(post).schedule[1].winner,'AWAY');assert.equal(view(post).teams[0].record.overall.pointsFor,100);
});
test('rollover can finish prior week without advancing display week; multi-week periods wait for every week',()=>{
 const raw=fixture();raw.scoringPeriodId=3;raw.status.currentMatchupPeriod=3;assert.equal(view(raw).schedule[1].winner,'AWAY');assert.equal(view(raw).scoringPeriodId,3);
 const multi=fixture();multi.settings.scheduleSettings.matchupPeriods[2]=[2,3];multi.schedule[1].home.pointsByScoringPeriod[3]=10;multi.schedule[1].away.pointsByScoringPeriod[3]=10;
 assert.equal(view(multi).schedule[1].winner,'UNDECIDED');const b=new Map(boards);b.set('2026:3',board(3));assert.equal(view(multi,b).schedule[1].away.totalPoints,105);
});
export {fixture,board,boards};

test('production standings, recap rows, Wire and record consumers share results without changing live navigation',async()=>{
 const {prepareSite}=await import('./prepare-site.mjs');
 const html=prepareSite(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 const extract=(from,to)=>html.slice(html.indexOf(from),html.indexOf(to,html.indexOf(from)));
 const raw=fixture();raw.draftDetail={drafted:true};raw.teams.forEach(t=>{t.name='Manager '+t.id;t.playoffSeed=t.id});Object.assign(raw.settings.scheduleSettings,{playoffSeedingRule:'TOTAL_POINTS_SCORED',divisions:[{id:0}]});
 const c=vm.createContext({console,Map,Date,JSON,Number,Math,Set,
  HJ_LEAGUE_STATE:{data:raw},HJ_HQ_STATE:{matchupWeek:1},NFL_WEEK1:[{week:2,state:'post'}],NFL_SEASON:2026,
  HJ_DATA:{history:new Map()},DATA:{draft:{when:'2026-09-01'}},LEAGUE_SCHEDULE_2026:{},WIRE:{},
  document:{hidden:true,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}},window:{},setInterval:()=>{},
  hjMatchManager:t=>t.name,hjOwnerName:t=>t.name,hjNumber:v=>v==null?null:Number(v),
  hjHistoricalEntries:()=>[],hjDataRollover:()=>{},renderStandingsDashboard:()=>{},renderLeagueSchedule:()=>{},hjEnsureCompletedHistory:()=>{},
  HIST:{metadata:{completed_through:2025},head_to_head_regular_season:[]},hjPatchManagerLiveSeason:()=>{},pcFpts:v=>v.toFixed(2),av:()=>'',hjTeamName:t=>t.name,
  hjRecapHTML:d=>d,hjCareerWeeklyRows:()=>[],hjCurrentManagerTeam:(name,d)=>d.teams.find(t=>t.name===name),
  wireTeamMap:d=>new Map(d.teams.map(t=>[t.id,t])),wireManager:t=>t.name,wireWaiverCard:()=>null,wireKickoffCard:()=>null,
  wireDraftCards:()=>[],wireLoadBox:()=>{},wireRecapCards:(d,w)=>[{section:'recap',week:w}],wireLiveCards:()=>[{section:'live'}],wirePreviewCards:()=>[{section:'preview'}],esc:s=>s,
 });
 for(const f of ['challenge-engine.js','record-book-engine.js','completed-results.js'])vm.runInContext(readFileSync(new URL(f,import.meta.url),'utf8'),c);
 for(const [from,to] of [['function hjTeamRecord(','function hjRosterEntries('],['function hjManagerBusinessCard(','function hjEffectiveRoster('],['function scheduleAllTimeSeries(','function scheduleSeriesLabel('],['function hjScheduleMatrixHTML(','function hjMatchupScheduleButtonsHTML('],['function hjCurrentWeek(','function hjCurrentMatchup('],['function hjSideScore(','function hjWeeklyStat('],['function hjCompletedWeeks(','async function hjEnsureCompletedHistory('],['function hjApplyLiveSeason(','function hjRenderLeague('],['function wireWeekResults(','function wireScoreboardHTML('],['function wireBuild(','const WIRE_SECTION_LABELS=']])vm.runInContext(extract(from,to),c);
 vm.runInContext(readFileSync(new URL('recap-live.js',import.meta.url),'utf8').split('function hjRcGameFinal(')[1].split('function hjRecapHTML(')[0].replace(/^/,'function hjRcGameFinal('),c);
 vm.runInContext(html.match(/function hjCurrentStandingRank\(team,data\)\{[^\n]+\}/)[0],c);
 vm.runInContext(readFileSync(new URL('completed-results-live.js',import.meta.url),'utf8'),c);
 const before=JSON.stringify(raw),strip=JSON.stringify(c.NFL_WEEK1);
 assert.equal(c.wireBuild(raw).cards[0].section,'live');
 c.boards=boards;vm.runInContext('HJ_COMPLETED_RESULTS.scoreboards=boards',c);
 c.hjApplyLiveSeason(raw,false);
 assert.equal(c.DATA.standings[0].pf,180);assert.equal(c.DATA.standings[0].l,1);
 assert.equal(c.hjCompletedWeeks(raw).at(-1).week,2);
 assert.equal(c.wireBuild(raw).cards[0].section,'recap');assert.equal(c.WIRE.recapWeek,2);
 assert.equal(c.hjRecordSnapshot(raw,2026,t=>t.name).games[1].final,true);
 assert.equal(c.hjCurrentManagerTeam('Manager 1').record.overall.pointsFor,180);
 assert.equal(c.hjTeamRecord(raw.teams[0]),'1-1');assert.equal(c.hjTeamRecordIfPlayed(raw.teams[0]),'1-1');
 assert.equal(c.hjCurrentStandingRank(raw.teams[0],raw),2);
 const tab=c.hjTeamTabHTML(raw.teams[0],raw),identity=c.hjManagerBusinessCard(raw.teams[0],raw,'Manager 1','Manager 1');
 assert.match(tab,/1-1 · PF 180.00/);assert.match(tab,/standing 2/);
 assert.match(identity,/POINTS FOR<\/small><b>180.00/);assert.match(identity,/RECORD<\/small><b>1-1/);assert.match(identity,/data-results-team="1"/);
 assert.equal(c.hjResultsTeam({...raw.teams[0],record:{overall:{wins:10}}}).record.overall.wins,10,'historical objects are not replaced by current IDs');
 const standing={},summary={},attributes={},values=[{},{},{}],tabNode={querySelector:s=>s==='.hj-manager-standing'?standing:summary,setAttribute:(k,v)=>{attributes[k]=v}},cardNode={querySelectorAll:()=>values};
 c.document.querySelectorAll=selector=>selector==='.league-team-tab[data-league-team="1"]'?[tabNode]:selector==='.hj-business-card[data-results-team="1"]'?[cardNode]:[];
 c.hjRefreshRosterResultMetadata();assert.equal(summary.textContent,'1-1 · PF 180.00');assert.equal(standing.textContent,'#2');assert.deepEqual(values.map(v=>v.textContent),['1-1','180.00','#2']);assert.match(attributes['aria-label'],/record 1-1/);

 const series=c.scheduleAllTimeSeries('Manager 1','Manager 2');assert.equal(series.games,2);assert.equal(series.aWins,1);assert.equal(series.bWins,1);assert.equal(series.aPF,180);
 assert.deepEqual(c.scheduleAllTimeSeries('Manager 1','Manager 2'),series,'head-to-head refresh does not accumulate');
 assert.equal(c.hjCurrentWeek(raw),2);assert.equal(c.HJ_HQ_STATE.matchupWeek,1);
 assert.equal(c.HJ_LEAGUE_STATE.data,raw);assert.equal(JSON.stringify(raw),before);assert.equal(JSON.stringify(c.NFL_WEEK1),strip);
});

test('standings reorder using the league points-for tiebreak, retaining official seeds after reconciliation',()=>{
 const raw=fixture();Object.assign(raw.settings.scheduleSettings,{playoffSeedingRule:'TOTAL_POINTS_SCORED',divisions:[{id:0}]});
 raw.teams[0].playoffSeed=1;raw.teams[1].playoffSeed=2;
 const out=view(raw);assert.equal(out.teams[0].playoffSeed,2);assert.equal(out.teams[1].playoffSeed,1);
 assert.equal(raw.teams[0].playoffSeed,1);assert.deepEqual(json(view(out)),json(out));
});

test('stale playoff simulations use the existing PF-rank fallback until official aggregates catch up',()=>{
 const raw=fixture();raw.teams[0].currentSimulationResults={playoffPct:.75};
 const out=view(raw);assert.equal(out.teams[0].currentSimulationResults.playoffPct,null);assert.equal(raw.teams[0].currentSimulationResults.playoffPct,.75);
 raw.schedule=out.schedule;raw.teams=out.teams.map(t=>({...t,currentSimulationResults:{playoffPct:.8}}));
 assert.equal(view(raw).teams[0].currentSimulationResults.playoffPct,.8);
});
