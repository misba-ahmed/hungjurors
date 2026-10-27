import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {prepareDepthRefresh} from './prepare-depth-refresh.mjs';
const source=prepareDepthRefresh(fs.readFileSync('index.html','utf8'));
const slice=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
let calls=0,fail=false;const roster={athletes:[{items:[{id:'1',displayName:'Starter',position:{abbreviation:'RB'}},{id:'2',displayName:'Backup',position:{abbreviation:'RB'}}]}]};
const chart={depthchart:[{positions:Object.fromEntries(['QB','RB','WR','TE'].map(p=>[p.toLowerCase(),{athletes:[{id:'1',displayName:'Starter'},{id:'2',displayName:'Backup'}]}]))}]};
const ctx=vm.createContext({console,Date,pcTeam:x=>x,NFL_SEASON:2026,NFL_TEAM_IDS:{phi:21},ffnNorm:x=>x.toLowerCase(),nflHeadshot:x=>x,pcCurrentRoster:()=>[{id:'stale'}],setInterval(){},document:{addEventListener(){}},window:{addEventListener(){}},fetchEspnJson:async url=>{calls++;if(fail)throw Error('offline');return url.endsWith('/roster')?roster:chart}});
vm.runInContext(slice('function depthList(', 'function normalizedPos(')+slice('function ffnOffenseSlotPos(', 'async function ffnMapLimit(')+fs.readFileSync('scripts/profile-depth-live.js','utf8'),ctx);
await Promise.all([ctx.pcLoadLiveDepth('PHI'),ctx.pcLoadLiveDepth('PHI')]);assert.equal(calls,2);assert.equal(ctx.pcCurrentRoster('PHI')[0].name,'Starter');
await ctx.pcLoadLiveDepth('PHI');assert.equal(calls,2);
vm.runInContext("pcLiveDepth.get('2026:PHI').at=0",ctx);fail=true;await assert.rejects(ctx.pcLoadLiveDepth('PHI'));assert.equal(ctx.pcCurrentRoster('PHI')[0].name,'Starter');
fail=false;await ctx.pcLoadLiveDepth('PHI');assert(calls>4);
if(process.env.LIVE_FIXTURE){const realRoster=JSON.parse(fs.readFileSync('../eagles-roster-live.json')),realDepth=JSON.parse(fs.readFileSync('../live-depth.json'));const rows=ctx.ffnRosterRows(realRoster,'PHI',realDepth);console.log(rows.filter(r=>r.position==='RB').map(r=>`${r.positionRank} ${r.name}`).join('\n'));assert(rows.find(r=>r.name==='Dameon Pierce')?.positionRank===2)}
console.log('PASS profile source replacement, cache, concurrent requests, retained data on failure and retry');
