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
for(let y=0;y<210+dy;y++)for(let x=0;x<360;x++){if(y<193+dy)raw.data[(y*360+x)*4+3]=0;}
const neck=Buffer.from('<svg width="360" height="720"><defs><linearGradient id="n" x2="0" y2="1"><stop stop-color="#df8a59"/><stop offset="1" stop-color="#ffb17c"/></linearGradient></defs><path d="M140 '+(187+dy)+' Q180 '+(212+dy)+' 219 '+(187+dy)+' L211 '+(222+dy)+' Q191 '+(245+dy)+' 181 '+(259+dy)+' Q169 '+(239+dy)+' 146 '+(221+dy)+' Z" fill="url(#n)"/></svg>');
const out=await sharp(raw.data,{raw:raw.info}).composite([{input:pose==='standing'?head:await sharp(head).resize({height:210}).png().toBuffer(),left:pose==='standing'?Math.round(180-hm.width/2):Math.round(180-hm.width*1.05/2),top:9+dy}]).webp({lossless:true}).toBuffer();fs.writeFileSync('.mascot-fix/jarrett-'+pose+'-v7.webp',out);
panels.push({input:await sharp(out).flatten({background:'#f7f3e6'}).png().toBuffer(),left:(i+1)*360,top:0});
}
panels.unshift({input:await sharp(await get('assets/managers-v4/nathan-t-standing.webp')).flatten({background:'#f7f3e6'}).png().toBuffer(),left:0,top:0});
await sharp({create:{width:1080,height:720,channels:3,background:'#f7f3e6'}}).composite(panels).png().toFile('.mascot-fix/proportion-proof.png');

const managers=['misba','bryan','tyler','nathan-m','wasi','cesar','nathan-t','garrett','jarrett','kat'],reference={measurementMethod:'Exact alpha bounds at alpha >=128. Facial landmarks in markdown are visual estimates, not detection.',managers:{}};
for(const slug of managers){reference.managers[slug]={};for(const pose of ['standing','seated']){
const p='assets/managers-v4/'+slug+'-'+pose+'.webp',buf=await get(p),{data,info}=await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=128){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
reference.managers[slug][pose]={source:p,canvasWidth:info.width,canvasHeight:info.height,alphaBounds:{left:x0,top:y0,right:x1,bottom:y1},visibleHeight:y1-y0+1,visibleWidth:x1-x0+1};
}}
reference.players={catalog:'assets/team-photos/catalog.json',heightAuthority:'assets/team-photos/height-reference.json',approvedBody:'assets/team-photos/players/4047646-faces-v2.webp',nativeHeight:850,resting:'proportional to heightInches; common baseline',selected:'uniform target size independent of heightInches; 75% of original target',entries:JSON.parse((await get('assets/team-photos/catalog.json')).toString())};
fs.writeFileSync('.mascot-fix/artwork-proportions.json',JSON.stringify(reference,null,2)+'\n');
