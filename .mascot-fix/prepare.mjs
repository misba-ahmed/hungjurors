import sharp from 'sharp';
const orig='assets/team-photos/mascots/dst-26-mascot-v1.webp';
const normalized=await sharp('.mascot-fix/source.png').resize(523,850,{fit:'fill'}).png().toBuffer();
const patch=await sharp(normalized).extract({left:223,top:281,width:76,height:13}).resize(50,13,{fit:'fill'}).png().toBuffer();
await sharp(orig).composite([{input:patch,left:238,top:281}]).webp({lossless:true}).toFile('assets/team-photos/mascots/dst-26-mascot-wordmark-v2.webp');
await sharp('assets/team-photos/mascots/dst-26-mascot-wordmark-v2.webp').extract({left:180,top:255,width:165,height:85}).resize(660,340).png().toFile('.mascot-fix/seahawks-proof.png');
