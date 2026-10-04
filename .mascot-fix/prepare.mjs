import fs from 'node:fs/promises';import sharp from 'sharp';import {execFileSync} from 'node:child_process';
const cat=JSON.parse(await fs.readFile('assets/team-photos/mascots.json','utf8'));
const {data,info}=await sharp('assets/team-photos/mascots/dst-16-mascot-v1.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const original=Buffer.from(data),mask=new Set();
for(let y=343;y<380;y++)for(let x=162;x<304;x++){
const p=(y*info.width+x)*4,r=data[p],g=data[p+1],b=data[p+2];
if(g>65&&r>g*.85&&g>b*.8)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)mask.add((y+dy)*info.width+x+dx);
}
for(const n of mask){const y=Math.floor(n/info.width),x=n%info.width,t=Math.max(0,Math.min(1,(y-339)/43));for(let c=0;c<3;c++)data[n*4+c]=Math.round(original[(339*info.width+x)*4+c]*(1-t)+original[(382*info.width+x)*4+c]*t);}
const svg=await fs.readFile('.mascot-fix/wordmark.svg');
const jerseyMark=Buffer.from(svg.toString().replaceAll('#ffc62f','#OUTLINE').replaceAll('#4f2683','#ffc62f').replaceAll('#OUTLINE','#4f2683'));
const mark=await sharp(jerseyMark).resize({width:138}).png().toBuffer();
const base=await sharp(data,{raw:info}).png().toBuffer();
const file='dst-16-mascot-wordmark-v3.webp',out=await sharp(base).composite([{input:mark,left:163,top:332}]).webp({quality:100,alphaQuality:100}).toBuffer();
await fs.writeFile('assets/team-photos/mascots/'+file,out);
cat[16]={...cat[16],file};await fs.writeFile('assets/team-photos/mascots.json',JSON.stringify(cat,null,2)+'\n');
await fs.writeFile('assets/team-photos/mascots/vikings-wordmark.svg',svg);
await sharp(out).flatten({background:'#f8ecd3'}).jpeg({quality:98}).toFile('.mascot-fix/viking-proof.jpg');
for(const f of ['test-lineup-mascots.mjs','test-lineup-rules.mjs','test-lineup-status.mjs','test-lineup-live-scores.mjs'])execFileSync('node',['scripts/'+f],{stdio:'inherit'});
