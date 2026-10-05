import fs from 'node:fs';import sharp from 'sharp';
const base='https://raw.githubusercontent.com/misba-ahmed/hungjurors/main/';
async function get(p){return Buffer.from(await(await fetch(base+p)).arrayBuffer())}
const src=await sharp('.mascot-fix/source.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let p=0;p<src.data.length;p+=4){let r=src.data[p],g=src.data[p+1],b=src.data[p+2];if(g>100&&g>r*2&&g>b*2)src.data[p+3]=0;else if(g>Math.max(r,b))src.data[p+1]=Math.max(r,b);}
const head=await sharp(await sharp(src.data,{raw:src.info}).png().toBuffer()).trim({background:'#00000000',threshold:8}).resize({height:200}).png().toBuffer();const hm=await sharp(head).metadata();
const panels=[];
for(const [i,pose]of ['standing','seated'].entries()){
let orig=await get('assets/managers-v4/jarrett-'+pose+'.webp'),raw=await sharp(orig).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const dy=pose==='standing'?0:90;
for(let y=0;y<210+dy;y++)for(let x=0;x<360;x++){if(y<193+dy||(x>139&&x<220))raw.data[(y*360+x)*4+3]=0;}
const neck=Buffer.from('<svg width="360" height="720"><defs><linearGradient id="n" x2="0" y2="1"><stop stop-color="#df8a59"/><stop offset="1" stop-color="#ffb17c"/></linearGradient></defs><path d="M140 '+(187+dy)+' Q180 '+(212+dy)+' 219 '+(187+dy)+' L211 '+(222+dy)+' Q191 '+(245+dy)+' 181 '+(259+dy)+' Q169 '+(239+dy)+' 146 '+(221+dy)+' Z" fill="url(#n)"/></svg>');
const out=await sharp(raw.data,{raw:raw.info}).composite([{input:neck},{input:head,left:Math.round(180-hm.width/2),top:9+dy}]).webp({lossless:true}).toBuffer();fs.writeFileSync('.mascot-fix/jarrett-'+pose+'-v7.webp',out);
panels.push({input:await sharp(out).flatten({background:'#f7f3e6'}).png().toBuffer(),left:(i+1)*360,top:0});
}
panels.unshift({input:await sharp(await get('assets/managers-v4/nathan-t-standing.webp')).flatten({background:'#f7f3e6'}).png().toBuffer(),left:0,top:0});
await sharp({create:{width:1080,height:720,channels:3,background:'#f7f3e6'}}).composite(panels).png().toFile('.mascot-fix/proportion-proof.png');
