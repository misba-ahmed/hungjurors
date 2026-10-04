import fs from 'node:fs/promises';import sharp from 'sharp';import assert from 'node:assert/strict';
const ids=['4695883','4685512','3121422'],cat=JSON.parse(await fs.readFile('assets/team-photos/catalog.json','utf8')),meta=JSON.parse(await fs.readFile('.roster-check/metadata.json','utf8'));
const src=await sharp('.roster-check/source.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let p=0;p<src.data.length;p+=4){const r=src.data[p],g=src.data[p+1],b=src.data[p+2];if(g>r*1.45+10&&g>b*1.45+10){const spill=g-Math.max(r,b),a=Math.max(0,1-(spill-15)/75);src.data[p+3]=Math.round(a*255);if(a>0&&a<1)src.data[p+1]=Math.min(g,Math.max(r,b));}}
const layers=[];let left=10;
for(let i=0;i<ids.length;i++){const id=ids[i],official=meta.find(m=>m.id===id);assert.equal(cat[id].heightInches,official.height);assert.equal(cat[id].jersey,official.jersey);
const x=Math.round(i*src.info.width/3),right=Math.round((i+1)*src.info.width/3);
const slice=await sharp(src.data,{raw:src.info}).extract({left:x,top:0,width:right-x,height:src.info.height}).png().toBuffer();
const out=await sharp(slice).trim({background:'#00000000',threshold:8}).resize({height:850}).webp({quality:95}).toBuffer();
const m=await sharp(out).metadata(),file=id+'-crutches-v1.webp';assert(m.hasAlpha);assert.equal(m.height,850);
await fs.writeFile('assets/team-photos/players/'+file,out);cat[id].unavailable={file,width:m.width,height:m.height,ratio:Number((m.width/m.height).toFixed(5)),kind:'injury'};
layers.push({input:out,left,top:10});left+=m.width+20;}
const ref=await fs.readFile('assets/team-photos/players/4047646-faces-v2.webp'),rm=await sharp(ref).metadata();layers.push({input:ref,left,top:10});left+=rm.width+10;
await sharp({create:{width:left,height:870,channels:4,background:'#f9edd7'}}).composite(layers).jpeg({quality:87}).toFile('.roster-check/proof.jpg');
await fs.writeFile('assets/team-photos/catalog.json',JSON.stringify(cat,null,2)+'\n');
