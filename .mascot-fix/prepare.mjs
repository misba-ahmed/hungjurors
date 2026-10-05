import fs from 'node:fs';import sharp from 'sharp';const base='https://raw.githubusercontent.com/misba-ahmed/hungjurors/main/';async function get(p){return Buffer.from(await(await fetch(base+p)).arrayBuffer())}
const fix=await sharp('.mascot-fix/neck8.png').resize(360,720).ensureAlpha().raw().toBuffer({resolveWithObject:true});const panels=[];
for(const [i,pose]of ['standing','seated'].entries()){
const src=await get('assets/managers-v7/jarrett-'+pose+'.webp');const raw=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true}),dy=pose==='standing'?0:100;
const mask=await sharp(Buffer.from('<svg width="360" height="720"><path d="M145 180 Q180 213 217 180 L222 205 L221 224 L204 264 L181 274 L156 258 L137 214 L140 194 Z" fill="white"/></svg>')).ensureAlpha().raw().toBuffer();
for(let y=180;y<275;y++)for(let x=136;x<224;x++){let p=(y*360+x)*4,q=((y+dy)*360+x)*4;if(mask[p+3])for(let c=0;c<4;c++)raw.data[q+c]=fix.data[p+c];}
const out=await sharp(raw.data,{raw:raw.info}).webp({lossless:true}).toBuffer();fs.writeFileSync('.mascot-fix/jarrett-'+pose+'-v8.webp',out);panels.push({input:await sharp(out).flatten({background:'#f7f3e6'}).png().toBuffer(),left:i*360,top:0});}
await sharp({create:{width:720,height:720,channels:3,background:'#f7f3e6'}}).composite(panels).png().toFile('.mascot-fix/neck8-proof.png');
const html=(await get('index.html')).toString();const lines=html.split('\n');fs.writeFileSync('.mascot-fix/layout-excerpts.txt',lines.filter(l=>!l.includes('base64')&&/scrollbar|overflow-x|league-hq|news-rail|nfl-rail/.test(l)).map(l=>l.slice(0,1800)).join('\n'));
