import fs from 'node:fs/promises';import sharp from 'sharp';
const src=await sharp('.jj/source.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let p=0;p<src.data.length;p+=4){const r=src.data[p],g=src.data[p+1],b=src.data[p+2];const spill=g-Math.max(r,b);if(spill>15){const a=Math.max(0,1-(spill-15)/75);src.data[p+3]=Math.round(a*255);if(a>0&&a<1)src.data[p+1]=Math.min(g,Math.max(r,b));}}
const filename='4262921-crutches-v1.webp';
const out=await sharp(src.data,{raw:src.info}).trim({background:'#00000000',threshold:8}).resize({height:850}).webp({quality:95}).toBuffer();
await fs.writeFile('assets/team-photos/players/'+filename,out);
const m=await sharp(out).metadata();if(!m.hasAlpha||m.height!==850)throw Error('Invalid cutout');
const cat=JSON.parse(await fs.readFile('assets/team-photos/catalog.json','utf8'));
cat['4262921'].unavailable={file:filename,width:m.width,height:m.height,ratio:Number((m.width/m.height).toFixed(5)),kind:'injury'};
await fs.writeFile('assets/team-photos/catalog.json',JSON.stringify(cat,null,2)+'\n');
const ref=await fs.readFile('assets/team-photos/players/4047646-faces-v2.webp');const rm=await sharp(ref).metadata();
await sharp({create:{width:m.width+rm.width+60,height:870,channels:4,background:'#f9edd7'}}).composite([{input:out,left:10,top:10},{input:ref,left:m.width+40,top:10}]).jpeg({quality:87}).toFile('.jj/proof.jpg');
console.log(JSON.stringify({player:cat['4262921'],hasAlpha:m.hasAlpha}));
