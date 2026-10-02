import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const catalog=JSON.parse(fs.readFileSync('assets/team-photos/catalog.json','utf8'));
const references=JSON.parse(fs.readFileSync('assets/team-photos/height-reference.json','utf8'));
const source=fs.readFileSync('scripts/team-photos.js','utf8');
for(const [id,a]of Object.entries(catalog)){
 assert(references[id]?.source,'Missing official height source: '+id);
 assert.equal(a.heightInches,references[id].heightInches,'Height differs from verified reference: '+a.name);
 assert(a.heightInches>=60&&a.heightInches<=90);
 for(const asset of [a,...(a.unavailable?[a.unavailable]:[])]){
  assert(fs.existsSync('assets/team-photos/players/'+asset.file),asset.file);
  assert(Math.abs(asset.ratio-asset.width/asset.height)<.00002,asset.file);
 }
}
// Exercise generated resting-lineup geometry, not just catalog metadata.
const entries=Object.keys(catalog).map(id=>({id,lineupSlotId:20,fullName:catalog[id].name}));
const ctx=vm.createContext({HJ_TEAM_PHOTO_UI:{team:''},hjTeamPhotoLoadScores:()=>{},hjTeamPhotoOrder:x=>x,
 hjRosterEntries:()=>entries,hjPlayer:x=>x,hjTeamPhotoAsset:e=>catalog[e.id],
 hjPlayerPosition:()=> 'WR',hjTeamPhotoName:p=>({full:p.fullName,first:p.fullName,last:''}),
 hjTeamPhotoFinalScore:()=>null,hjPlayerTeam:()=>'',hjPlayerPhoto:()=>'',esc:x=>String(x)});
vm.runInContext(source.slice(source.indexOf('function hjTeamPhotoHTML('),source.indexOf('(function(){'))+';this.render=hjTeamPhotoHTML;',ctx);
const html=ctx.render({id:1});
const matches=[...html.matchAll(/data-team-photo-player="(\d+)"[^>]*style="[^"]*height:([\d.]+)%/g)];
assert.equal(matches.length,entries.length);
const referenceRatio=Number(matches[0][2])/catalog[matches[0][1]].heightInches;
for(const m of matches)assert(Math.abs(Number(m[2])/catalog[m[1]].heightInches-referenceRatio)<.000002,'Resting height ratio '+m[1]);
assert(source.includes("sourceHeight/Math.max(1,window.devicePixelRatio||1))*.75)"),'Keep equal selected size at requested 75%');
console.log('PASS: every stored asset has a verified height, valid file/ratio, and resting lineup preserves physical height ratios');
