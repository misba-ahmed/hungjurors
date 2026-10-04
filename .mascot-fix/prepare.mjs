import fs from 'node:fs';import sharp from 'sharp';import{execFileSync}from'node:child_process';
const r=await sharp('.mascot-fix/source.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let p=0;p<r.data.length;p+=4){const red=r.data[p],g=r.data[p+1],b=r.data[p+2];if(g>100&&g>red*2.5&&g>b*2.5){r.data[p+3]=0;continue;}const m=Math.max(red,b);if(g>m)r.data[p+1]=m;}
let png=await sharp(r.data,{raw:r.info}).png().toBuffer();png=await sharp(png).trim({background:'#00000000',threshold:8}).png().toBuffer();
const file='4635008-faces-v2.webp',dest='assets/team-photos/players/'+file;
await sharp(png).resize({height:850}).webp({quality:95,alphaQuality:100}).toFile(dest);
const m=await sharp(dest).metadata(),c=JSON.parse(fs.readFileSync('assets/team-photos/catalog.json'));
c['4635008']={file,width:m.width,height:m.height,ratio:Number((m.width/m.height).toFixed(5)),heightInches:75,name:'Keon Coleman',teamId:2,jersey:'0'};
fs.writeFileSync('assets/team-photos/catalog.json',JSON.stringify(c,null,2)+'\n');
const hp='assets/team-photos/height-reference.json',h=JSON.parse(fs.readFileSync(hp));h['4635008']={name:'Keon Coleman',heightInches:75,source:'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes/4635008?lang=en&region=us',checkedAt:new Date().toISOString()};fs.writeFileSync(hp,JSON.stringify(h,null,2)+'\n');
const layers=[];for(const [i,f]of [dest,'assets/team-photos/players/4047646-faces-v2.webp'].entries()){const buf=await sharp(f).resize({height:600}).toBuffer(),meta=await sharp(buf).metadata();layers.push({input:buf,left:i*300+Math.floor((300-meta.width)/2),top:0});}
await sharp({create:{width:600,height:600,channels:3,background:'#faefd9'}}).composite(layers).jpeg({quality:90}).toFile('.mascot-fix/keon-proof.jpg');
for(const t of ['test-lineup-rules.mjs','test-lineup-status.mjs','test-lineup-live-scores.mjs'])execFileSync('node',['scripts/'+t],{stdio:'inherit'});
