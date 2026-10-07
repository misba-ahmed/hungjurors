import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('scripts/team-photos.js','utf8');
const cat=JSON.parse(fs.readFileSync('assets/team-photos/catalog.json','utf8'));
const ctx=vm.createContext({HJ_TEAM_PHOTO_ASSETS:cat,hjPlayer:e=>e.player||e,hjCurrentWeek:()=>4,HJ_LEAGUE_STATE:{data:{}},NFL_SEASON:2026});
vm.runInContext(source.slice(source.indexOf('function hjTeamPhotoAsset('),source.indexOf('function hjTeamPhotoHTML('))+';this.choose=hjTeamPhotoAsset',ctx);
const ids=Object.keys(cat).filter(id=>cat[id].unavailable);
assert(ids.length>=17);
for(const id of ["4597500","4431611","4426348","3121023","4427366","4241478"])assert(ids.includes(id),'Required crutch pose '+id);
for(const id of ids){
 const entry={player:{id,injuryStatus:'OUT',injured:true,active:true}};
 assert.equal(ctx.choose(entry).file,cat[id].unavailable.file);
 assert.equal(ctx.choose(entry).isUnavailable,true);
 entry.player={id,injuryStatus:'ACTIVE',injured:false,active:true};
 assert.equal(ctx.choose(entry).file,cat[id].file,'healthy return '+id);
 assert.notEqual(ctx.choose(entry).isUnavailable,true,'Healthy players lose gray tint');
 entry.lineupSlotId=20;
 assert.equal(ctx.choose(entry).file,cat[id].file,'healthy bench player '+id);
 entry.player={id,injuryStatus:'ACTIVE',injured:false,active:true,stats:[{statSourceId:1,scoringPeriodId:4,seasonId:2026,appliedTotal:0}]};
 assert.equal(ctx.choose(entry).isUnavailable,true,'explicit zero ESPN projection');
 for(const stat of [{statSourceId:0,scoringPeriodId:4,seasonId:2026,appliedTotal:0},{statSourceId:1,scoringPeriodId:3,seasonId:2026,appliedTotal:0},{statSourceId:1,scoringPeriodId:4,seasonId:2025,appliedTotal:0},{statSourceId:1,scoringPeriodId:4,seasonId:2026,appliedTotal:null},{statSourceId:1,scoringPeriodId:4,seasonId:2026,appliedTotal:12}]){
  entry.player.stats=[stat];assert.equal(ctx.choose(entry).file,cat[id].file,'actual/stale/missing/positive projection is not zero');
 }
 for(const status of ['QUESTIONABLE','DOUBTFUL','INJURY_RESERVE','SUSPENSION','EXEMPT']){
  entry.player={id,injuryStatus:status};
  assert.equal(ctx.choose(entry).file,cat[id].unavailable.file,status);
 }
 entry.player={id};
 assert.equal(ctx.choose(entry).file,cat[id].unavailable.file,'unknown status is not recovery');
 entry.player={id,injuryStatus:'ACTIVE',active:false};
 assert.equal(ctx.choose(entry).file,cat[id].unavailable.file,'inactive is not recovery');
 entry.player={id,injuryStatus:'ACTIVE',status:'SUSPENDED'};
 assert.equal(ctx.choose(entry).file,cat[id].unavailable.file,'suspension overrides generic active');
 for(const status of ['QUESTIONABLE','DOUBTFUL','OUT','INJURY_RESERVE','SUSPENDED','']){
  entry.player={id,injuryStatus:status,injured:true,active:false,stats:[{statSourceId:1,scoringPeriodId:4,seasonId:2026,appliedTotal:12}]};
  assert.equal(ctx.choose(entry).file,cat[id].file,'Positive projection restores artwork despite stale '+status);
  assert.notEqual(ctx.choose(entry).isUnavailable,true);
  entry.player.stats[0].appliedTotal=0;assert.equal(ctx.choose(entry).file,cat[id].unavailable.file,'Zero projection reapplies variant');
 }
 for(const filename of [cat[id].file,cat[id].unavailable.file])assert(fs.existsSync('assets/team-photos/players/'+filename));
}
assert.equal(ctx.choose({player:{id:'unknown',injuryStatus:'OUT'}}),undefined);
const untouched=Object.keys(cat).find(id=>!cat[id].unavailable);
assert.equal(ctx.choose({player:{id:untouched,injuryStatus:'OUT'}}).file,cat[untouched].file);
assert(source.includes('hjTeamPhotoOrder(hjRosterEntries(team))'),'Only current roster entries are displayed');
console.log('PASS: all alternate poses, healthy restoration, unavailable states, absent status, bench players, unchanged original assets, roster-only rendering');


assert.equal(cat['4047365'].unavailable.kind,'legal','Josh Jacobs retains handcuffs');
ctx.hjTeamOnBye=()=>true;ctx.hjPlayerTeam=()=> 'KC';
const byeId=ids.find(id=>id!=='4047365');
const bye={player:{id:byeId,injuryStatus:'ACTIVE',stats:[{statSourceId:1,scoringPeriodId:4,seasonId:2026,appliedTotal:0}]}};
assert.equal(ctx.choose(bye).file,cat[byeId].file,'Bye alone never selects crutches');
assert.equal(ctx.choose(bye).isBye,true);
bye.player.injuryStatus='OUT';assert.equal(ctx.choose(bye).file,cat[byeId].unavailable.file,'Independent injury persists during bye');

const freeAgent={player:{id:byeId,proTeamId:0,injuryStatus:"OUT",injured:true,stats:[{statSourceId:1,scoringPeriodId:4,seasonId:2026,appliedTotal:0}]}};
assert.equal(ctx.choose(freeAgent).file,cat[byeId].file,"Free agents never use crutches");
assert.equal(ctx.choose(freeAgent).isFreeAgent,true);
assert.notEqual(ctx.choose(freeAgent).isUnavailable,true);
assert.notEqual(ctx.choose(freeAgent).isBye,true);
freeAgent.player.proTeamId=21;assert.notEqual(ctx.choose(freeAgent).isFreeAgent,true,"Free-agent tint clears on signing");
