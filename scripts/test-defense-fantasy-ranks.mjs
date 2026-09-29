import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareDefenseFantasyRanks} from './prepare-defense-fantasy-ranks.mjs';

const runtime=readFileSync(new URL('./defense-fantasy-ranks.js',import.meta.url),'utf8');
const html=prepareDefenseFantasyRanks(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
const state={season:2026,ready:true,byId:new Map([['qb',7]]),byName:new Map(),byTeam:new Map(),promise:null};
const directory={rows:[{position:'D/ST',team:'T0',fantasyPositionRank:null}]};
let calls=0,fail=false;
const label={textContent:'DST'};
const node={dataset:{pcTeam:'T0'},querySelectorAll:()=>[label]};
const entries=Array.from({length:32},(_,i)=>({player:{defaultPositionId:16,team:'T'+i,stats:[{seasonId:2026,statSourceId:0,statSplitTypeId:1,scoringPeriodId:1,appliedTotal:31-i}]}}));
const getStats=entry=>entry.player.stats.filter(s=>s.seasonId===2026&&s.statSourceId===0&&s.statSplitTypeId===1&&s.scoringPeriodId>0);
const numeric=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const api=new Function('HJ_FANTASY_RANKS','HJ_LEAGUE_SEASON','HJ_PLAYER_DIRECTORY','hjCurrentWeek','pcLoadSeason','pcLoadDstSeason','hjBuildFantasyRankMaps','hjPlayer','pcDstTeam','pcTeam','pcDstStats','hjNumber','document',
 'let hjEnsureFantasyRanks;'+runtime+';return {ensure:()=>hjEnsureFantasyRanks(),publish:hjPublishDefenseFantasyRanks,labels:hjRefreshDefenseRankLabels};'
)(state,2026,directory,()=>4,async()=>[{position:'QB'}],async()=>{calls++;if(fail)throw Error('temporary network failure');return entries},()=>({byId:new Map([['qb',7]]),byName:new Map()}),e=>e.player,e=>e.player.team,x=>x,getStats,numeric,{querySelectorAll:()=>[node]});

// Reproduce the failure: the skill loader marked ready without loading defenses.
await api.ensure();
assert.equal(calls,1,'skill readiness cannot skip loading defense ranks');
assert.equal(state.byTeam.size,32);
assert.equal(state.byTeam.get('T0'),1);
assert.equal(state.byTeam.get('T31'),32,'a real zero score is ranked');
assert.equal(label.textContent,'DST1','existing matchup/roster label updates in place');
assert.equal(directory.rows[0].fantasyPositionRank,1,'directory rank updated');
assert.equal(state.byId.get('qb'),7,'skill ranks preserved');
await api.ensure();assert.equal(calls,1,'current defense table is reused');

// Use league actual totals, with tied totals sharing rank and negative scores valid.
entries[0].player.stats[0].appliedTotal=29;
entries[1].player.stats[0].appliedTotal=29;
entries[31].player.stats[0].appliedTotal=-2;
entries[0].player.stats.push({seasonId:2026,statSourceId:1,statSplitTypeId:1,scoringPeriodId:1,appliedTotal:999});
entries[0].player.stats.push({seasonId:2025,statSourceId:0,statSplitTypeId:1,scoringPeriodId:1,appliedTotal:999});
assert.equal(api.publish(entries,2026),true);
assert.equal(state.byTeam.get('T0'),1);
assert.equal(state.byTeam.get('T1'),1);
assert.equal(state.byTeam.get('T2'),1);
assert.equal(state.byTeam.get('T3'),4);
assert.equal(state.byTeam.get('T31'),32);
const good=state.byTeam,loadedAt=state.dstLoadedAt;
assert.equal(api.publish(entries.slice(0,10),2026),false);
assert.equal(api.publish([],2026),false);
assert.equal(api.publish(entries,2025),false);
assert.equal(state.byTeam,good,'incomplete/prior-season data cannot erase good ranks');
assert.equal(state.dstLoadedAt,loadedAt,'rejected updates do not advance freshness');
state.dstLoadedAt=0;fail=true;
await api.ensure();assert.equal(calls,2);
assert.equal(state.byTeam,good,'network failure retains current-season ranks');
assert.equal(state.dstLoadedAt,0,'failure stays eligible for retry');
fail=false;
await api.ensure();assert.equal(calls,3,'failed initial/refresh loads can recover');

// Exercise the real shared D/ST loader, also used outside the Players tab.
const start=html.indexOf('function pcLoadDstSeason(season){');
const end=html.indexOf('\nfunction pcSpecialPlayer',start);
assert.ok(start>=0&&end>start);
let published=0;
const loadDst=new Function('NFL_SEASON','hjCurrentWeek','hjDataPool','hjPublishDefenseFantasyRanks',
 html.slice(start,end)+';return pcLoadDstSeason;'
)(2026,()=>4,async()=>[...entries,{player:{defaultPositionId:1}}],rows=>{published++;assert.equal(rows.length,32)});
assert.equal((await loadDst(2026)).length,32);
assert.equal(published,1,'ordinary D/ST data refresh publishes season ranks');
assert.ok(html.includes('function hjRefreshGameContexts(){\n hjRefreshDefenseRankLabels();'));
console.log('D/ST season rank loading, refresh, recovery, ties, zero/negative totals and visible labels passed.');
