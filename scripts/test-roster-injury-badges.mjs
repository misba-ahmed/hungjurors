import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {prepareProfileDetails} from './prepare-profile-details.mjs';
const html=prepareProfileDetails(fs.readFileSync('index.html','utf8'));
const code=html.slice(html.indexOf('function hjOfficialStatus('),html.indexOf('function hjApplyOfficialStatuses('));
const ctx=vm.createContext({HJ_STATUS_LIVE:new Map(),HJ_INJURY_REPORT:{rows:[]},ffnRosterPlayers:[],pcLiveDepth:new Map()});
vm.runInContext(code,ctx);
assert.equal(ctx.hjOfficialStatus({status:{type:'practice-squad'}}),null);
const bigsby={id:'4429013',status:{type:'active'},injuries:[{status:'Injured Reserve',date:'2026-10-06T23:17Z'}]};
const shipley={id:'4431545',status:{type:'day-to-day'},injuries:[{status:'Injured Reserve',date:'2026-10-16T20:07Z'}]};
ctx.ffnRosterPlayers.push(bigsby);ctx.pcLiveDepth.set('PHI',{rows:[shipley]});
assert.equal(ctx.hjStatusIndex().get(bigsby.id).code,'IR');
assert.equal(ctx.hjStatusIndex().get(shipley.id).code,'IR');
assert.equal(ctx.hjOfficialStatus({status:{type:'day-to-day'}}).code,'DTD');
shipley.injuries=[];shipley.status={type:'active'};
assert.equal(ctx.hjStatusIndex().get(shipley.id),null,'Activation clears the badge');
assert.equal(ctx.hjOfficialStatus({injuries:[{status:'Out',date:'2026-10-01'},{status:'Active',date:'2026-10-26'}]}),null);
console.log('PASS roster IR coverage, weekly-report omission, status normalization, activation recovery');
// Every documented injury status, including equivalent ESPN spellings.
for(const [value,code] of Object.entries({Questionable:'Q',Doubtful:'D',Out:'O',INJURY_RESERVE:'IR',Suspended:'SUSP','Physically Unable to Perform':'PUP','Reserve/PUP':'PUP','Non-Football Injury':'NFI','Reserve/NFI':'NFI',Inactive:'Inactive','Day-To-Day':'DTD',Probable:'P'}))assert.equal(ctx.hjOfficialStatus({status:{description:value}})?.code,code,value);
assert.equal(ctx.hjOfficialStatus({status:'not a supported injury value'}),undefined,'Unknown is not healthy');
assert.equal(ctx.hjOfficialStatus({}),undefined);
const now=Date.now();
ctx.ffnRosterPlayers=[{...bigsby,_hjStatusAt:now}];ctx.pcLiveDepth.clear();
ctx.HJ_INJURY_REPORT={at:new Date(now-30*86400000).toISOString(),rows:[{id:bigsby.id,code:null,label:'ACTIVE'}]};
assert.equal(ctx.hjStatusIndex().get(bigsby.id)?.code,'IR','Old shipped report cannot clear a fresh IR record');
ctx.HJ_INJURY_REPORT={at:new Date(now-600000).toISOString(),rows:[{id:bigsby.id,code:'O',label:'OUT'}]};
ctx.ffnRosterPlayers=[{id:bigsby.id,status:'Active',injuries:[],_hjStatusAt:now}];
assert.equal(ctx.hjStatusIndex().get(bigsby.id),null,'New roster activation supersedes an older report');
ctx.HJ_INJURY_REPORT.at=new Date(now-1000).toISOString();
assert.equal(ctx.hjStatusIndex().get(bigsby.id)?.code,'O','A fresh injury report overrides generic roster Active even when the roster arrived later');
ctx.HJ_INJURY_REPORT.at=new Date(now+1000).toISOString();
assert.equal(ctx.hjStatusIndex().get(bigsby.id)?.code,'O','A newer report supersedes earlier activation');
ctx.HJ_INJURY_REPORT.rows=[];
ctx.ffnRosterPlayers=[{...bigsby,_hjStatusAt:now}];
ctx.pcLiveDepth.set('PHI',{at:now-10000,rows:[{id:bigsby.id,status:'Active'}]});
assert.equal(ctx.hjStatusIndex().get(bigsby.id)?.code,'IR','Older profile cache cannot clear new roster injury');
ctx.pcLiveDepth.set('PHI',{at:now+2000,rows:[{id:bigsby.id,status:'Active'}]});
assert.equal(ctx.hjStatusIndex().get(bigsby.id),null,'New profile activation clears the previous roster injury');
ctx.HJ_STATUS_LIVE.set(bigsby.id,{id:bigsby.id,at:now+3000,entry:{id:bigsby.id,status:'unrecognized'}});
assert.equal(ctx.hjStatusIndex().get(bigsby.id),null,'Unknown input cannot override known status');
if(process.env.ROSTER_AUDIT_FILE){
 const teams=JSON.parse(fs.readFileSync(process.env.ROSTER_AUDIT_FILE));let players=0,injured=0;
 for(const team of teams)for(const group of team.data.athletes)for(const p of group.items){
  if(!['QB','RB','WR','TE','K','PK'].includes(p.position?.abbreviation))continue;
  players++;const status=ctx.hjOfficialStatus(p),injury=p.injuries?.[0];
  if(injury){injured++;assert.equal(status?.code,{'Out':'O','Injured Reserve':'IR','Questionable':'Q'}[injury.status],p.displayName)}
  else assert(['DTD',undefined].includes(status?.code),p.displayName);
 }
 console.log(`PASS live roster audit: ${teams.length} teams, ${players} players, ${injured} explicit injuries`);
}
console.log('PASS source freshness conflicts, unknown status retention, PUP/NFI aliases, report omission and activation');
