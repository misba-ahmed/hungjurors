import fs from 'node:fs/promises';
import sharp from 'sharp';
const dir='assets/managers-v2';
await fs.mkdir(dir,{recursive:true});
const html=await fs.readFile('index.html','utf8');
const av=JSON.parse(html.match(/const AV\s*=\s*(\{[^\n]+\});/)[1]);
const names=['MISBA','BRYAN','TYLER','NATHAN M','WASI','CESAR','NATHAN T','GARRETT','JARRETT','KAT'];
const slug=n=>n.toLowerCase().replaceAll(' ','-');
const heads=[];
for(const name of names){
 let input=name==='MISBA'?await fs.readFile('assets/avatars/misba-head-20260929-v2.png'):Buffer.from(av[name],'base64');
 if(name!=='MISBA'){
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const i=(y*info.width+x)*4,xx=x*96/info.width,yy=y*96/info.height;
   // Keep original hair, face and exposed neck; remove only the old shoulders/shirt.
   const skin=data[i]>data[i+1]*1.10&&data[i]>data[i+2]*1.18;
   const half=yy<=64?48:yy<=74?Math.max(14,23-(yy-64)*.8):11;
   if(yy>85||(yy>64&&Math.abs(xx-48)>half)|| (yy>79&&!skin))data[i+3]=0;
  }
  input=await sharp(data,{raw:info}).png().toBuffer();
 }else input=await sharp(input).modulate({saturation:.8}).png().toBuffer();
 heads.push(await sharp(input).trim({threshold:2}).png().toBuffer());
}
const cuts=[0,330,620,914,1206,1536];
for(const pose of ['standing','seated']){
 const source=await sharp('.manager-art/'+pose+'.png').resize(1536,1024).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {data,info}=source;
 for(let i=0;i<data.length;i+=4){
  const r=data[i],g=data[i+1],b=data[i+2],excess=g-Math.max(r,b);
  if(excess>20){
   const a=Math.max(0,Math.min(1,1-excess/230));
   data[i+3]=Math.round(255*a);
   if(a>.01){data[i]=Math.min(255,r/a);data[i+2]=Math.min(255,b/a);data[i+1]=Math.min(Math.max(data[i],data[i+2]),Math.max(0,(g-255*(1-a))/a));}
  }
 }
 const atlas=await sharp(data,{raw:info}).png().toBuffer();
 async function alphaTrim(input){
  const {data:d,info:m}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let l=m.width,t=m.height,r=0,b=0;
  for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++){const i=(y*m.width+x)*4;if(d[i+3]<60)d[i+3]=0;if(d[i+3]>128){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}
  return sharp(d,{raw:m}).extract({left:l,top:t,width:r-l+1,height:b-t+1}).png().toBuffer();
 }
 for(let n=0;n<10;n++){
  const c=n%5,row=Math.floor(n/5);
  const raw=await alphaTrim(await sharp(atlas).extract({left:cuts[c],top:row?506:0,width:cuts[c+1]-cuts[c],height:row?518:506}).png().toBuffer());
  const bodyHeight=pose==='standing'?450:408;
  const rawSize=await sharp(raw).metadata();
  const body=await sharp(raw).resize({height:bodyHeight,width:Math.round(rawSize.width*bodyHeight/rawSize.height*1.25),fit:'fill'}).png().toBuffer();
  const bm=await sharp(body).metadata();
  const head=await sharp(heads[n]).resize({height:228}).png().toBuffer();
  const hm=await sharp(head).metadata();
  const top=(pose==='standing'?669:717)-bodyHeight;
  async function neckCenter(buffer,atBottom){
   const {data:d,info:m}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   let total=0,weight=0;
   for(let y=atBottom?m.height-8:0;y<(atBottom?m.height:8);y++)for(let x=0;x<m.width;x++){
    const a=d[(y*m.width+x)*4+3];if(a<128)continue;total+=x*a;weight+=a;
   }
   return weight?total/weight:m.width/2;
  }
  const bodyLeft=Math.round((360-bm.width)/2);
  const headLeft=Math.round(bodyLeft+await neckCenter(body,false)-await neckCenter(head,true));
  const combined=await sharp({create:{width:360,height:720,channels:4,background:'#00000000'}}).composite([
   {input:body,left:bodyLeft,top},
   {input:head,left:headLeft,top:top+18-228}
  ]).webp({lossless:true}).toBuffer();
  await fs.writeFile(dir+'/'+slug(names[n])+'-'+pose+'.webp',combined);
 }
}
const previews=[];
for(let row=0;row<2;row++)for(let n=0;n<10;n++){
 const pose=row?'seated':'standing';
 previews.push({input:await sharp(dir+'/'+slug(names[n])+'-'+pose+'.webp').resize(180,360).png().toBuffer(),left:n*180,top:row*400});
}
const labels=Buffer.from('<svg width="1800" height="800" xmlns="http://www.w3.org/2000/svg">'+[0,1].flatMap(r=>names.map((n,i)=>'<text x="'+(i*180+90)+'" y="'+(r*400+377)+'" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#17344c">'+n+'</text>')).join('')+'</svg>');
previews.push({input:labels,left:0,top:0});
const proof=await sharp({create:{width:1800,height:800,channels:3,background:'#f9edd5'}}).composite(previews).jpeg({quality:87}).toBuffer();
console.log('MANAGER_PROOF '+proof.toString('base64'));
await fs.writeFile('.manager-art/proof.jpg',proof);
console.log('Prepared 20 manager sprites from original avatar pixels');
