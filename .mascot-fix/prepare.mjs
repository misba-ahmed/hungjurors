import sharp from 'sharp';import fs from 'node:fs';
const orig='assets/team-photos/mascots/dst-17-mascot-wordmark-v3.webp';
const normalized=await sharp('.mascot-fix/source.png').resize(422,850,{fit:'fill'}).png().toBuffer();
const patch=await sharp(normalized).extract({left:150,top:280,width:120,height:185}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let y=0;y<185;y++)for(let x=0;x<120;x++){const d=Math.min(x,y,119-x,184-y);patch.data[(y*120+x)*4+3]=Math.round(255*Math.min(1,d/5));}
const buf=await sharp(patch.data,{raw:patch.info}).png().toBuffer();
await sharp(orig).composite([{input:buf,left:150,top:290}]).webp({lossless:true}).toFile('assets/team-photos/mascots/dst-17-mascot-wordmark-v4.webp');
await sharp('assets/team-photos/mascots/dst-17-mascot-wordmark-v4.webp').png().toFile('.mascot-fix/patriots-proof.png');
