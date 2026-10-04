import fs from 'node:fs';import sharp from 'sharp';import {execFileSync} from 'node:child_process';
const r=await sharp('.mascot-fix/source.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let p=0;p<r.data.length;p+=4){const red=r.data[p],g=r.data[p+1],b=r.data[p+2];if(g>100&&g>red*2.5&&g>b*2.5){r.data[p+3]=0;continue;}const m=Math.max(red,b);if(g>m)r.data[p+1]=m;}
let png=await sharp(r.data,{raw:r.info}).png().toBuffer();png=await sharp(png).trim({background:'#00000000',threshold:8}).png().toBuffer();
const native=await sharp(png).metadata();const file='dst-23-mascot-v3.webp';const dest='assets/team-photos/mascots/'+file;
await sharp(png).resize({height:850}).webp({quality:95,alphaQuality:100}).toFile(dest);
const m=await sharp(dest).metadata();const cat=JSON.parse(fs.readFileSync('assets/team-photos/mascots.json'));cat[23]={...cat[23],file,width:m.width,height:m.height,ratio:m.width/m.height,nativeHeight:native.height};
fs.writeFileSync('assets/team-photos/mascots.json',JSON.stringify(cat,null,2)+'\n');
for(const name of ['mascots','rules','status','live-scores'])execFileSync('node',['scripts/test-lineup-'+name+'.mjs'],{stdio:'inherit'});
