import fs from 'node:fs';import sharp from 'sharp';import {execFileSync} from 'node:child_process';
execFileSync('git',['fetch','origin','main']);
const src=execFileSync('git',['show','origin/main:index.html'],{maxBuffer:100*1024*1024}).toString();
const avatars=JSON.parse(src.match(/const AV = (\{[^\n]+\});/)[1]);
const current=fs.readFileSync('assets/avatars/jarrett-20261006-circle-v3.svg','utf8');
const variants=[['Current',current],['Slight',current.replace('x="-20" y="28" width="552" height="552"','x="-29" y="22" width="570" height="570"')],['Larger',current.replace('x="-20" y="28" width="552" height="552"','x="-34" y="19" width="580" height="580"')]];
const rows=[['TYLER','NATHAN M','WASI','CESAR','BRYAN'].map(n=>[n,Buffer.from(avatars[n],'base64')]),variants.map(([n,s])=>[n,Buffer.from(s)])];
const layers=[];
for(let row=0;row<rows.length;row++)for(let i=0;i<rows[row].length;i++){
 const [name,input]=rows[row][i],size=112,left=20+i*145,top=20+row*160;
 const portrait=await sharp(input).resize(size,size).png().toBuffer();
 const circle=await sharp(portrait).composite([{input:Buffer.from('<svg width="112" height="112"><circle cx="56" cy="56" r="54" fill="white"/></svg>'),blend:'dest-in'}]).png().toBuffer();
 layers.push({input:circle,left,top});
 layers.push({input:Buffer.from('<svg width="140" height="24"><text x="0" y="17" font-size="14" font-family="sans-serif" fill="#16344e">'+name+'</text></svg>'),left,top:top+116});
}
const out=await sharp({create:{width:760,height:350,channels:4,background:'#f7f3e7'}}).composite(layers).png().toBuffer();
fs.writeFileSync('.mascot-fix/avatar-comparison.json',JSON.stringify({image:out.toString('base64')}));
