import fs from 'node:fs/promises';import sharp from 'sharp';
const {data,info}=await sharp('.doubs/source.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const w=info.width,h=info.height;
for(let p=0;p<data.length;p+=4)if(data[p+1]>170&&data[p+1]-data[p]>100&&data[p+1]-data[p+2]>100)data[p+3]=0;
const mask=Buffer.from(data);
for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=(y*w+x)*4;if(!mask[p+3])continue;if([p-4,p+4,p-w*4,p+w*4].some(q=>!mask[q+3]))data[p+1]=Math.min(data[p+1],Math.max(data[p],data[p+2])+30);}
let x0=w,y0=h,x1=0,y1=0;
for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>80){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
const file='4361432-faces-v3.webp';
const out=await sharp(data,{raw:{width:w,height:h,channels:4}}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize({height:850}).webp({quality:94,alphaQuality:100}).toBuffer({resolveWithObject:true});
await fs.writeFile('assets/team-photos/players/'+file,out.data);
const catalog=JSON.parse(await fs.readFile('assets/team-photos/catalog.json','utf8'));
catalog['4361432']={file,width:out.info.width,height:850,ratio:Number((out.info.width/850).toFixed(5)),heightInches:74,name:'Romeo Doubs',teamId:17,jersey:'87'};
await fs.writeFile('assets/team-photos/catalog.json',JSON.stringify(catalog,null,2)+'\n');
await sharp(out.data).flatten({background:'#faefd9'}).png().toFile('.doubs/proof.png');
console.log('Prepared Romeo Doubs #87, preserved '+Object.keys(catalog).length+' player entries');

const old=await sharp('assets/team-photos/players/4047646-faces-v2.webp').resize({height:500}).toBuffer({resolveWithObject:true});
const fresh=await sharp(out.data).resize({height:500}).toBuffer({resolveWithObject:true});
await sharp({create:{width:480,height:520,channels:4,background:'#faefd9'}}).composite([{input:old.data,left:20,top:10},{input:fresh.data,left:260,top:10}]).png().toFile('.doubs/comparison.png');
