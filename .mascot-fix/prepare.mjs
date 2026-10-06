import fs from 'node:fs/promises';import sharp from 'sharp';
const input='.mascot-fix/source.png';
const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let l=info.width,t=info.height,r=0,b=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=128){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
console.log({l,t,r,b});
const cut=await sharp(input).extract({left:l,top:t,width:r-l+1,height:b-t+1}).resize({height:660}).png().toBuffer();
const meta=await sharp(cut).metadata();
await sharp({create:{width:360,height:720,channels:4,background:'#00000000'}}).composite([{input:cut,left:Math.round((360-meta.width)/2),top:9}]).webp({lossless:true}).toFile('.mascot-fix/kat-champion.webp');
const layers=[];for(const [i,p]of ['assets/managers-v4/kat-standing.webp','.mascot-fix/kat-champion.webp','assets/managers-v4/tyler-standing.webp'].entries())layers.push({input:await sharp(p).png().toBuffer(),left:i*360,top:0});
await sharp({create:{width:1080,height:720,channels:4,background:'#f8f4e8'}}).composite(layers).png().toFile('.mascot-fix/kat-champion-proof.png');
