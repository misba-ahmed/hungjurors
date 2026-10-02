import fs from 'node:fs/promises';import sharp from 'sharp';
const ids=["4597500","4431611","4426348","3121023","4427366","4241478"];
const cat=JSON.parse(await fs.readFile('assets/team-photos/catalog.json','utf8')),tiles=[];
for(let batch=0;batch<2;batch++){
 const input=sharp('.crutches/source-'+batch+'.png'),meta=await input.metadata();
 for(let cell=0;cell<3;cell++){
 const id=ids[batch*3+cell],left=Math.round(meta.width*cell/3),right=Math.round(meta.width*(cell+1)/3);
 const {data,info}=await input.clone().extract({left,top:0,width:right-left,height:meta.height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height;
 for(let p=0;p<data.length;p+=4)if(data[p+1]>170&&data[p+1]-data[p]>100&&data[p+1]-data[p+2]>100)data[p+3]=0;
 const mask=Buffer.from(data);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=(y*w+x)*4;if(mask[p+3]&&[p-4,p+4,p-w*4,p+w*4].some(q=>!mask[q+3]))data[p+1]=Math.min(data[p+1],Math.max(data[p],data[p+2])+30);}
 let x0=w,y0=h,x1=0,y1=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>80){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const out=await sharp(data,{raw:{width:w,height:h,channels:4}}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize({height:850}).webp({quality:94,alphaQuality:100}).toBuffer({resolveWithObject:true});
 const file=id+'-crutches-v1.webp';await fs.writeFile('assets/team-photos/players/'+file,out.data);
 cat[id].unavailable={file,width:out.info.width,height:850,ratio:Number((out.info.width/850).toFixed(5)),kind:'injury'};
 const preview=await sharp(out.data).resize({height:300}).modulate({saturation:.75}).linear(.94,7.65).png().toBuffer({resolveWithObject:true});
 tiles.push({input:preview.data,left:batch*510+cell*170+Math.round((170-preview.info.width)/2),top:5});
 }
}
await fs.writeFile('assets/team-photos/catalog.json',JSON.stringify(cat,null,2)+'\n');
await sharp({create:{width:1020,height:315,channels:4,background:'#faefd9'}}).composite(tiles).jpeg({quality:85}).toFile('.crutches/proof.jpg');
