import fs from 'node:fs';import sharp from 'sharp';import{execFileSync}from'node:child_process';
const base='https://raw.githubusercontent.com/misba-ahmed/hungjurors/main/';
const raw=await sharp('.mascot-fix/source.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let p=0;p<raw.data.length;p+=4){let r=raw.data[p],g=raw.data[p+1],b=raw.data[p+2];if(g>100&&g>r*2&&g>b*2){raw.data[p+3]=0;continue;}if(g>Math.max(r,b))raw.data[p+1]=Math.max(r,b);}
const all=await sharp(raw.data,{raw:raw.info}).png().toBuffer();const panels=[];
for(const [i,pose]of ['standing','seated'].entries()){
 const old=await sharp('assets/managers-v4/jarrett-'+pose+'.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=old.info.width,t=old.info.height,r=0,b=0;for(let y=0;y<old.info.height;y++)for(let x=0;x<old.info.width;x++)if(old.data[(y*old.info.width+x)*4+3]>8){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 const half=await sharp(all).extract({left:i*Math.floor(raw.info.width/2),top:0,width:Math.floor(raw.info.width/2),height:raw.info.height}).png().toBuffer();const crop=await sharp(half).trim({background:'#00000000',threshold:8}).png().toBuffer();
 const fit=await sharp(crop).resize({height:b-t+1}).png().toBuffer(),m=await sharp(fit).metadata();
 const out=await sharp({create:{width:old.info.width,height:old.info.height,channels:4,background:'#00000000'}}).composite([{input:fit,left:Math.round(l+(r-l+1-m.width)/2),top:b+1-m.height}]).webp({quality:96,alphaQuality:100}).toBuffer();
 fs.writeFileSync('.mascot-fix/jarrett-'+pose+'.webp',out);panels.push({input:await sharp(out).resize({height:600}).toBuffer(),left:i*340,top:0});
}
await sharp('.mascot-fix/jarrett-portrait-source.png').resize(512,512).png().toFile('.mascot-fix/jarrett-20261005.png');
await sharp({create:{width:680,height:600,channels:3,background:'#f7f3e6'}}).composite(panels).png().toFile('.mascot-fix/jarrett-proof.png');
let prep=await(await fetch(base+'scripts/prepare-manager-avatars.mjs')).text();prep=prep.replace("avatars.MISBA='/assets/avatars/misba-20260929-v2.png';","avatars.MISBA='/assets/avatars/misba-20260929-v2.png';\n  avatars.JARRETT='/assets/avatars/jarrett-20261005.png';");if(!prep.includes("avatars.JARRETT="))throw Error('Avatar map patch failed');fs.writeFileSync('.mascot-fix/prepare-manager-avatars.mjs',prep);
let challenge=await(await fetch(base+'scripts/challenge-live.js')).text();const a='/assets/managers-v4/'+String.fromCharCode(36)+'{esc(slug)}-',z='/assets/'+String.fromCharCode(36)+"{slug==='jarrett'?'managers-v5':'managers-v4'}/"+String.fromCharCode(36)+'{esc(slug)}-';if(!challenge.includes(a))throw Error('Challenge path missing');challenge=challenge.replaceAll(a,z);fs.writeFileSync('.mascot-fix/challenge-live.js',challenge);
let hero=await(await fetch(base+'scripts/manager-hero.js')).text();hero=hero.replace("'/assets/managers-v4/'+f.slug","'/assets/'+(f.slug==='jarrett'?'managers-v5':'managers-v4')+'/'+f.slug");if(!hero.includes('managers-v5'))throw Error('Hero patch missing');fs.writeFileSync('.mascot-fix/manager-hero.js',hero);
for(const f of ['prepare-manager-avatars.mjs','challenge-live.js','manager-hero.js'])execFileSync('node',['--check','.mascot-fix/'+f],{stdio:'inherit'});
