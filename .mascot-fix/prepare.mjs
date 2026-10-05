import fs from 'node:fs/promises';import sharp from 'sharp';
const html=await fs.readFile('index.html','utf8'),start=html.indexOf('const AV = ')+11,end=html.indexOf(';',start),av=JSON.parse(html.slice(start,end));
const names=['TYLER','NATHAN M','WASI','JARRETT','CESAR'];
const layers=[];
for(let i=0;i<names.length;i++){
 const n=names[i];let src=n==='JARRETT'?await fs.readFile('.mascot-fix/jarrett-circle.svg'):Buffer.from(av[n],'base64');
 const circ=Buffer.from('<svg width="160" height="160"><circle cx="80" cy="80" r="75" fill="white"/></svg>');
 const p=await sharp(src).resize(160,160).composite([{input:circ,blend:'dest-in'}]).png().toBuffer();
 layers.push({input:p,left:i*180+10,top:10});
}
await sharp({create:{width:900,height:180,channels:4,background:'#f8f4e8'}}).composite(layers).png().toFile('.mascot-fix/jarrett-circle-proof.png');
