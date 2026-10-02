import fs from 'node:fs/promises';import sharp from 'sharp';
const groups=[["4047646","4360078","4362249","4239996"],["4702555","4678008","4038815","4360569"],["4426385","4429160","4047365"]];
const catalog=JSON.parse(await fs.readFile('assets/team-photos/catalog.json','utf8'));
const preview=[];
for(let batch=0;batch<groups.length;batch++){
 const {data,info}=await sharp('.lineup-status/source-'+batch+'.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info;
 for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2];if(g>170&&g-r>100&&g-b>100)data[i+3]=0;}
 // Remove chroma spill only at cutout boundaries, retaining the green uniforms.
 const mask=Buffer.from(data);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=(y*w+x)*4;if(!mask[p+3])continue;
  if([p-4,p+4,p-w*4,p+w*4].some(q=>!mask[q+3]))data[p+1]=Math.min(data[p+1],Math.max(data[p],data[p+2])+30);
 }
 const counts=Array(w).fill(0);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>80)counts[x]++;
 const edges=[0],n=groups[batch].length;
 for(let k=1;k<n;k++){const center=w*k/n,a=Math.floor(center-w/n*.1),b=Math.ceil(center+w/n*.1);let best=a,score=Infinity;
  for(let x=a;x<b;x++){const s=counts[x]*10000+Math.abs(x-center);if(s<score){score=s;best=x;}}edges.push(best);
 }edges.push(w);
 for(let k=0;k<n;k++){
  const id=groups[batch][k],left=edges[k],right=edges[k+1];
  let x0=right,x1=left,y0=h,y1=0;
  for(let y=0;y<h;y++)for(let x=left;x<right;x++)if(data[(y*w+x)*4+3]>80){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(x1<=x0||y1<=y0)throw Error('Missing figure '+id);
  const file=id+'-'+(id==='4047365'?'unavailable':'crutches')+'-v1.webp';
  const {data:output,info:out}=await sharp(data,{raw:{width:w,height:h,channels:4}}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize({height:850}).webp({quality:94,alphaQuality:100}).toBuffer({resolveWithObject:true});
  await fs.writeFile('assets/team-photos/players/'+file,output);
  catalog[id].unavailable={file,width:out.width,height:out.height,ratio:Number((out.width/out.height).toFixed(5)),kind:id==='4047365'?'legal':'injury'};
  const thumb=await sharp(output).resize({height:300}).toBuffer();preview.push({input:thumb,left:20+preview.length*140,top:16});
 }
}
await fs.writeFile('assets/team-photos/catalog.json',JSON.stringify(catalog,null,2)+'\n');
await sharp({create:{width:1580,height:330,channels:4,background:'#faefd9'}}).composite(preview).png().toFile('.lineup-status/proof.png');
console.log('Prepared 11 transparent status poses, preserving all normal assets.');
