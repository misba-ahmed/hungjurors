import fs from 'node:fs/promises';
import sharp from 'sharp';
const dir='assets/managers-v1';
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
   if(yy>85||(yy>64&&Math.abs(xx-48)>half)|| (yy>74&&!skin))data[i+3]=0;
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
 for(let n=0;n<10;n++){
  const c=n%5,row=Math.floor(n/5);
  const raw=await sharp(atlas).extract({left:cuts[c],top:row?506:0,width:cuts[c+1]-cuts[c],height:row?518:506}).trim({threshold:5}).png().toBuffer();
  const bodyHeight=pose==='standing'?540:426;
  const body=await sharp(raw).resize({height:bodyHeight}).png().toBuffer();
  const bm=await sharp(body).metadata();
  const head=await sharp(heads[n]).resize({height:144}).png().toBuffer();
  const hm=await sharp(head).metadata();
  const top=669-bodyHeight;
  const combined=await sharp({create:{width:360,height:720,channels:4,background:'#00000000'}}).composite([
   {input:body,left:Math.round((360-bm.width)/2),top},
   {input:head,left:Math.round((360-hm.width)/2),top:top+18-144}
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
