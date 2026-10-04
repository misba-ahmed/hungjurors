
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import sharp from 'sharp';
const source=fs.readFileSync('scripts/team-photos.js','utf8'),cat=JSON.parse(fs.readFileSync('assets/team-photos/mascots.json','utf8'));
assert.equal(Object.keys(cat).length,32);
const ctx=vm.createContext({HJ_DST_MASCOTS:cat,HJ_TEAM_PHOTO_ASSETS:{},hjPlayer:e=>e.player||e,hjBenchCompare:()=>0,hjLineupCompare:()=>0});
vm.runInContext(source.slice(source.indexOf('function hjTeamPhotoOrder('),source.indexOf('const HJ_TEAM_PHOTO_SCORES'))+source.slice(source.indexOf('function hjTeamPhotoName('),source.indexOf('function hjTeamPhotoHTML(')),ctx);
for(const [team,m] of Object.entries(cat)){
 const entry={lineupSlotId:16,player:{id:-16000-Number(team),proTeamId:Number(team),defaultPositionId:16,stats:[{statSourceId:1,scoringPeriodId:4,appliedTotal:0}]}};
 assert.equal(ctx.hjTeamPhotoAsset(entry).file,m.file);
 assert(!ctx.hjTeamPhotoAsset(entry).isUnavailable);
 assert.equal(ctx.hjTeamPhotoName(entry.player).first,m.city);
 assert.equal(ctx.hjTeamPhotoName(entry.player).last,m.team+' DST');
 delete entry.player.proTeamId;
 assert.equal(ctx.hjTeamPhotoAsset(entry).file,m.file,'ESPN DST id fallback');
 const meta=await sharp('assets/team-photos/mascots/'+m.file).metadata();
 assert.equal(meta.height,850);assert(meta.hasAlpha);assert.equal(m.ratio,meta.width/meta.height);
}
const starter={lineupSlotId:16,player:{id:-16016,defaultPositionId:16,proTeamId:16}};
const bench={lineupSlotId:20,player:{id:-16002,defaultPositionId:16,proTeamId:2}};
assert.equal(ctx.hjTeamPhotoOrder([starter,bench]).length,2);
assert.equal(ctx.hjTeamPhotoOrder([starter]).length,1,'No unrostered DSTs');
assert.equal(ctx.hjTeamPhotoOrder([]).length,0);
assert.equal(ctx.hjTeamPhotoName(starter.player).first,'Minnesota');
assert.equal(ctx.hjTeamPhotoName(starter.player).last,'Vikings DST');
assert(source.includes("data-pc-id"));
console.log('PASS: all 32 DST assets, mapping, two-line labels, roster membership and status handling');
