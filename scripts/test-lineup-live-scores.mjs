import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const s=fs.readFileSync('scripts/team-photos.js','utf8');
let events=[],value=10.10,phase='pre';
const entry={id:'1',team:'DAL'};
const ctx=vm.createContext({Date,Intl,Map,Number,Promise,Event,
 NFL_SEASON:2026,HJ_LEAGUE_STATE:{data:{}},hjCurrentWeek:()=>4,
 hjDataSchedule:async()=>({events}),hjDataPool:async()=>[entry],
 hjPlayer:e=>e,hjPlayerTeam:e=>e.team,pcTeam:t=>t,
 hjUpcomingForWeek:()=>({game:{state:phase}}),
 hjWeeklyStat:()=>({appliedTotal:value}),hjNumber:Number,hjPlayerActualScore:()=>null,
 document:{dispatchEvent:()=>{}}});
vm.runInContext(s.slice(s.indexOf('const HJ_TEAM_PHOTO_SCORES='),s.indexOf('function hjTeamPhotoName('))+
 ';this.state=HJ_TEAM_PHOTO_SCORES;this.load=hjTeamPhotoLoadScores;this.score=hjTeamPhotoFinalScore;',ctx);
for(const [state,completed,score] of [['pre',false,null],['in',false,'10.10'],['post',true,'10.10']]){
 events=[{status:{type:{state,completed}},competitions:[{competitors:[{team:{abbreviation:'DAL'}}]}]}];
 ctx.state.checked=0;await ctx.load();assert.equal(ctx.score(entry),score);
}
events=[{competitions:[{status:{type:{state:'in'}},competitors:[{team:{abbreviation:'DAL'}}]}]}];
value=0;ctx.state.checked=0;await ctx.load();assert.equal(ctx.score(entry),'0.00');
value=-1.25;ctx.state.checked=0;await ctx.load();assert.equal(ctx.score(entry),'-1.25');
ctx.state.key='';phase='in';assert.equal(ctx.score(entry),'-1.25');phase='pre';assert.equal(ctx.score(entry),null);
console.log('PASS live/final/pregame, competition state, zero/negative scores, fresh updates and fallback');
