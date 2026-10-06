import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./matchup-history.js',import.meta.url),'utf8');
function setup(){
 const calls=[],resolvers=new Map(),data={status:{currentMatchupPeriod:5},schedule:[{id:4,matchupPeriodId:4,home:{teamId:1,totalPoints:100},away:{teamId:2,totalPoints:90}}]};
 const ctx={Date,console:{warn(){}},NFL_SEASON:2026,ESPN_FANTASY_LEAGUE_ID:123,HJ_LEAGUE_STATE:{data},HJ_HQ_STATE:{activeTab:'matchups',matchupWeek:0},HJ_DATA:{history:new Map(),historyJobs:new Map(),requests:new Map()},hjCurrentWeek:()=>5,hjDefaultMatchupWeek:()=>4,hjCompletedWeeks:()=>[{week:1},{week:2},{week:3},{week:4}],hjApplyLiveSeason(){},hjRefreshRecap(){},renders:0,hjRenderMatchupCenter(){ctx.renders++},hjDataJson(){},hjDataRequest(key){calls.push(key);return new Promise(resolve=>resolvers.set(Number(key.split(':').at(-1)),resolve));}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,calls,data,resolve:(week,payload={scoringPeriodId:week,schedule:data.schedule})=>resolvers.get(week)(payload)};
}
test('Tuesday renders known Week 4 pairings and final scores synchronously',()=>{
 const {ctx,calls,data}=setup();const out=ctx.hjScheduleWeekSource(data,4);
 assert.equal(out.games.length,1);assert.equal(out.games[0].home.totalPoints,100);
 assert.equal(out.sourceData,data);assert.deepEqual(calls,['history:2026:4']);
});
test('selected week bypasses a stalled older history request; renders after arriving',async()=>{
 const {ctx,calls,data,resolve}=setup();ctx.HJ_DATA.historyJobs.set(1,new Promise(()=>{}));
 const job=ctx.hjEnsureCompletedHistory(data);assert.deepEqual(calls,['history:2026:4']);
 const selected=ctx.HJ_DATA.historyJobs.get(4);resolve(4);await selected;
 assert.ok(ctx.HJ_DATA.history.has(4));assert.equal(ctx.renders,1);void job;
});
test('repeated renders share a request and preserve cached historical lineups',()=>{
 const {ctx,calls,data}=setup();const cached={scoringPeriodId:4,schedule:[{...data.schedule[0],home:{teamId:1,roster:{entries:[{playerId:7}]}}}]};ctx.HJ_DATA.history.set(4,cached);
 assert.equal(ctx.hjScheduleWeekSource(data,4).sourceData,cached);ctx.hjScheduleWeekSource(data,4);
 assert.equal(calls.length,1);
});
test('current week never fetches historical rosters',()=>{
 const {ctx,calls,data}=setup();assert.equal(ctx.hjScheduleWeekSource(data,5).sourceData,data);assert.equal(calls.length,0);
});
test('wrong-week payload cannot replace selected history, and switching week prevents stale render',async()=>{
 const {ctx,data,resolve}=setup();const job=ctx.hjLoadMatchupHistory(data,4);resolve(4,{scoringPeriodId:3,schedule:[]});await job;assert.equal(ctx.HJ_DATA.history.has(4),false);assert.equal(ctx.renders,0);
 const next=ctx.hjLoadMatchupHistory(data,4);ctx.HJ_HQ_STATE.matchupWeek=5;resolve(4);await next;assert.equal(ctx.renders,0);assert.ok(ctx.HJ_DATA.history.has(4));
});

test('verified snapshot populates historical roster before any network response',()=>{
 const {ctx,data,calls}=setup();
 const saved={scoringPeriodId:4,schedule:[{...data.schedule[0],home:{teamId:1,rosterForCurrentScoringPeriod:{entries:[{playerId:7,lineupSlotId:0}]}},away:{teamId:2,rosterForCurrentScoringPeriod:{entries:[{playerId:8,lineupSlotId:0}]}}}]};
 ctx.HJ_MATCHUP_HISTORY_SEED={season:2026,leagueId:'123',week:4,checkedAt:Date.now(),payload:saved};
 const out=ctx.hjScheduleWeekSource(data,4);assert.equal(out.games[0].home.rosterForCurrentScoringPeriod.entries[0].playerId,7);assert.equal(out.games[0].away.rosterForCurrentScoringPeriod.entries[0].playerId,8);assert.equal(calls.length,0);
});
test('snapshot from a different league cannot supply lineups',()=>{
 const {ctx,data}=setup();ctx.HJ_MATCHUP_HISTORY_SEED={season:2026,leagueId:'other',week:4,payload:{scoringPeriodId:4,schedule:[]}};assert.equal(ctx.hjScheduleWeekSource(data,4).sourceData,data);
});
