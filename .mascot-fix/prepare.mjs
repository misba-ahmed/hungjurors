import fs from 'node:fs';import sharp from 'sharp';import {execFileSync} from 'node:child_process';
const dir='assets/team-photos/mascots/';const cat=JSON.parse(fs.readFileSync('assets/team-photos/mascots.json'));
for(const [id,key,width,top] of [[7,'broncos',132,344],[9,'packers',72,340],[17,'patriots',112,296]]){
let svg=fs.readFileSync('.mascot-fix/'+key+'-wordmark.svg','utf8').replace(/#0A2343|#203731|#024/g,key==='packers'?'#FFB612':'#FFFFFF');
let logo=await sharp(Buffer.from(svg)).resize({width:760}).png().toBuffer();
if(id===7)logo=await sharp(logo).extract({left:0,top:0,width:760,height:88}).png().toBuffer();
logo=await sharp(logo).trim().resize({width}).png().toBuffer();
const old=dir+'dst-'+id+'-mascot-v1.webp';const m=await sharp(old).metadata();const file='dst-'+id+'-mascot-wordmark-v2.webp';
await sharp(old).composite([{input:logo,left:Math.round((m.width-width)/2),top}]).webp({quality:97,alphaQuality:100}).toFile(dir+file);
cat[id]={...cat[id],file};fs.writeFileSync(dir+key+'-wordmark.svg',fs.readFileSync('.mascot-fix/'+key+'-wordmark.svg'));
}
fs.writeFileSync('assets/team-photos/mascots.json',JSON.stringify(cat,null,2)+'\n');
const composites=[];for(const [i,id] of [7,9,17].entries()){const b=await sharp(dir+cat[id].file).resize({height:600}).png().toBuffer();composites.push({input:b,left:i*360,top:0});}
await sharp({create:{width:1080,height:600,channels:3,background:'#f8ecd3'}}).composite(composites).jpeg({quality:95}).toFile('.mascot-fix/wordmarks-proof.jpg');
for(const name of ['mascots','rules','status','live-scores'])execFileSync('node',['scripts/test-lineup-'+name+'.mjs'],{stdio:'inherit'});
