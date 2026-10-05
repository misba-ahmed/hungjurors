import fs from 'node:fs';import sharp from 'sharp';import{execFileSync}from'node:child_process';
const base='https://raw.githubusercontent.com/misba-ahmed/hungjurors/main/';
const raw=await sharp('.mascot-fix/source.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let p=0;p<raw.data.length;p+=4){const r=raw.data[p],g=raw.data[p+1],b=raw.data[p+2];if(g>100&&g>r*2&&g>b*2){raw.data[p+3]=0;continue;}if(g>Math.max(r,b))raw.data[p+1]=Math.max(r,b);}
const tmp=await sharp(raw.data,{raw:raw.info}).png().toBuffer(),head=await sharp(tmp).trim({background:'#00000000',threshold:8}).png().toBuffer();const panels=[];
for(const [i,pose]of ['standing','seated'].entries()){
const path='assets/managers-v4/jarrett-'+pose+'.webp',original=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true}),data=Buffer.from(original.data);
const top=pose==='standing'?9:99,height=215,cut=pose==='standing'?224:314;
for(let y=0;y<cut;y++)for(let x=0;x<original.info.width;x++){if(y<cut-35||(x>=110+(y-(cut-35))*1.45&&x<=250-(y-(cut-35))*1.45))data[(y*original.info.width+x)*4+3]=0;}
const fitted=await sharp(head).resize({height}).png().toBuffer(),m=await sharp(fitted).metadata();
const out=await sharp(data,{raw:original.info}).composite([{input:fitted,left:Math.round(180-m.width/2),top}]).webp({lossless:true}).toBuffer();
fs.writeFileSync('.mascot-fix/jarrett-'+pose+'.webp',out);
const decoded=await sharp(out).ensureAlpha().raw().toBuffer();for(let p=(cut+1)*original.info.width*4;p<data.length;p++)if(original.data[(p-p%4)+3]===255&&decoded[p]!==original.data[p])throw Error('Body pixels changed '+pose+' at '+p);
panels.push({input:await sharp(out).resize({height:600}).toBuffer(),left:i*340,top:0});
}
await sharp('.mascot-fix/jarrett-portrait-source.png').resize(512,512).png().toFile('.mascot-fix/jarrett-20261005.png');
await sharp({create:{width:680,height:600,channels:3,background:'#f7f3e6'}}).composite(panels).png().toFile('.mascot-fix/jarrett-proof.png');
let prep=await(await fetch(base+'scripts/prepare-manager-avatars.mjs')).text();prep=prep.replace("avatars.MISBA='/assets/avatars/misba-20260929-v2.png';","avatars.MISBA='/assets/avatars/misba-20260929-v2.png';\n  avatars.JARRETT='/assets/avatars/jarrett-20261005.png';");if(!prep.includes("avatars.JARRETT="))throw Error('Avatar map patch failed');fs.writeFileSync('.mascot-fix/prepare-manager-avatars.mjs',prep);
let challenge=await(await fetch(base+'scripts/challenge-live.js')).text();const a='/assets/managers-v4/'+String.fromCharCode(36)+'{esc(slug)}-',z='/assets/'+String.fromCharCode(36)+"{slug==='jarrett'?'managers-v5':'managers-v4'}/"+String.fromCharCode(36)+'{esc(slug)}-';if(!challenge.includes(a))throw Error('Challenge path missing');challenge=challenge.replaceAll(a,z);fs.writeFileSync('.mascot-fix/challenge-live.js',challenge);
let hero=await(await fetch(base+'scripts/manager-hero.js')).text();hero=hero.replace("'/assets/managers-v4/'+f.slug","'/assets/'+(f.slug==='jarrett'?'managers-v5':'managers-v4')+'/'+f.slug");if(!hero.includes('managers-v5'))throw Error('Hero patch missing');fs.writeFileSync('.mascot-fix/manager-hero.js',hero);
for(const f of ['prepare-manager-avatars.mjs','challenge-live.js','manager-hero.js'])execFileSync('node',['--check','.mascot-fix/'+f],{stdio:'inherit'});
