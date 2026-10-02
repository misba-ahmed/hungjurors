import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('scripts/team-photos.js','utf8');
const cat=JSON.parse(fs.readFileSync('assets/team-photos/catalog.json','utf8'));
const ctx=vm.createContext({HJ_TEAM_PHOTO_ASSETS:cat,hjPlayer:e=>e.player||e});
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
 for(const filename of [cat[id].file,cat[id].unavailable.file])assert(fs.existsSync('assets/team-photos/players/'+filename));
}
assert.equal(ctx.choose({player:{id:'unknown',injuryStatus:'OUT'}}),undefined);
const untouched=Object.keys(cat).find(id=>!cat[id].unavailable);
assert.equal(ctx.choose({player:{id:untouched,injuryStatus:'OUT'}}).file,cat[untouched].file);
assert(source.includes('hjTeamPhotoOrder(hjRosterEntries(team))'),'Only current roster entries are displayed');
console.log('PASS: all alternate poses, healthy restoration, unavailable states, absent status, bench players, unchanged original assets, roster-only rendering');
