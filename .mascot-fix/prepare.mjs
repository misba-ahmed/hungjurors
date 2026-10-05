import fs from 'node:fs';import sharp from 'sharp';
const base='https://raw.githubusercontent.com/misba-ahmed/hungjurors/main/';
const fixed=await sharp('.mascot-fix/neck-repair.png').resize(360,720).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const panels=[];
for(const [i,pose]of ['standing','seated'].entries()){
const original=Buffer.from(await(await fetch(base+'assets/managers-v5/jarrett-'+pose+'.webp')).arrayBuffer());
const raw=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});const shift=pose==='standing'?0:90;
const mask=await sharp(Buffer.from('<svg width="360" height="720"><path d="M136 193 Q155 219 180 219 Q204 219 224 193 L226 212 L218 239 L204 268 L177 281 L151 260 L135 216 Z" fill="white"/></svg>')).ensureAlpha().raw().toBuffer();
for(let y=190;y<282;y++)for(let x=132;x<229;x++){const p=(y*360+x)*4,q=((y+shift)*360+x)*4;if(mask[p+3]){for(let c=0;c<4;c++)raw.data[q+c]=fixed.data[p+c];}}
const out=await sharp(raw.data,{raw:raw.info}).webp({lossless:true}).toBuffer();fs.writeFileSync('.mascot-fix/jarrett-'+pose+'-v6.webp',out);
panels.push({input:await sharp(out).flatten({background:'#f7f3e6'}).png().toBuffer(),left:i*360,top:0});
}await sharp({create:{width:720,height:720,channels:3,background:'#f7f3e6'}}).composite(panels).png().toFile('.mascot-fix/jarrett-neck-proof.png');
