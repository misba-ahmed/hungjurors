import fs from 'node:fs/promises';
import sharp from 'sharp';
const names=['misba','bryan','tyler','nathan-m','wasi','cesar','nathan-t','garrett','jarrett','kat'];
const layers=[];
for(let i=0;i<names.length;i++){
 const name=names[i],path='assets/managers-'+(name==='jarrett'?'v8':'v4')+'/'+name+'-seated.webp';
 const {data,info}=await sharp(path).resize(180,360).removeAlpha().greyscale().toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const original=await sharp(path).resize(180,360).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let p=3;p<data.length;p+=4)data[p]=Math.round(original.data[p]*.58);
 layers.push({input:await sharp(data,{raw:info}).png().toBuffer(),left:80+(i%5)*290,top:90+Math.floor(i/5)*405});
}
const labels='<svg width="1500" height="900"><text x="750" y="45" text-anchor="middle" font-family="sans-serif" font-size="27" font-weight="bold" fill="#17334d">LAST MAN STANDING — ELIMINATION POSES</text><text x="750" y="75" text-anchor="middle" font-family="sans-serif" font-size="17" fill="#667888">Approval preview only · All ten shown eliminated to review their artwork</text>'+names.map((n,i)=>'<text x="'+(170+(i%5)*290)+'" y="'+(470+Math.floor(i/5)*405)+'" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="#17334d">'+n.replace('-',' ').toUpperCase()+'</text>').join('')+'</svg>';
layers.push({input:Buffer.from(labels),left:0,top:0});
await sharp({create:{width:1500,height:900,channels:4,background:'#f8f4e8'}}).composite(layers).png().toFile('.mascot-fix/lms-elimination-preview.png');
console.log('Rendered all ten existing seated assets; no art regenerated.');
