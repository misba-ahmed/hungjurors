import fs from 'node:fs/promises';
import sharp from 'sharp';
const groups=[[4241389,3043078,4567750,4696981],[4040715,4612826,4432708,4035538],[12483,4385690,4575131,3042519],[4429096,3116165,4034949]];
const root='assets/team-photos',catalog=JSON.parse(await fs.readFile(root+'/catalog.json','utf8'));
const created=[];
for(let g=0;g<groups.length;g++){
 const {data,info}=await sharp('face-preview/generated-'+g+'.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height;
 const bg=new Uint8Array(w*h);
 for(let n=0;n<w*h;n++){
  const i=n*4,r=data[i],gg=data[i+1],b=data[i+2];
  if(r>175&&b>175&&Math.min(r-gg,b-gg)>120){data[i+3]=0;bg[n]=1;}
 }
 // Remove residual chroma only along the keyed silhouette, leaving purple uniforms intact.
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const n=y*w+x,i=n*4;if(bg[n])continue;
  const edge=bg[n-1]||bg[n+1]||bg[n-w]||bg[n+w];
  const strength=Math.min(data[i]-data[i+1],data[i+2]-data[i+1]);
  if(edge&&strength>35){
   const alpha=Math.max(.08,Math.min(1,1-(strength-35)/220));
   data[i]=Math.max(0,Math.min(255,(data[i]-(1-alpha)*255)/alpha));
   data[i+1]=Math.min(255,data[i+1]/alpha);
   data[i+2]=Math.max(0,Math.min(255,(data[i+2]-(1-alpha)*255)/alpha));
   data[i+3]=Math.round(255*alpha);
  }
 }
 const columns=groups[g].length;
 const cuts=[0,...Array.from({length:columns-1},(_,i)=>i+1).map(k=>{
  const ideal=w*k/columns;let best=Math.round(ideal),bestScore=Infinity;
  for(let x=Math.round(ideal-w*.035);x<=Math.round(ideal+w*.035);x++){
   let count=0;for(let y=0;y<h;y++)if(data[(y*w+x)*4+3]>100)count++;
   const score=count*10000+Math.abs(x-ideal);if(score<bestScore){bestScore=score;best=x;}
  }
  return best;
 }),w];
 for(let q=0;q<groups[g].length;q++){
  const id=groups[g][q],left=cuts[q],right=cuts[q+1];
  let l=right,r=left,t=h,b=0,count=0;
  for(let y=0;y<h;y++)for(let x=left;x<right;x++)if(data[(y*w+x)*4+3]>100){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);count++;}
  if(count<20000||b-t<h*.8||l<=left||r>=right-1)throw Error('Incomplete figure '+id);
  const file=id+'-faces-v2.webp';
  const result=await sharp(data,{raw:{width:w,height:h,channels:4}}).extract({left:l-1,top:t-1,width:r-l+3,height:b-t+3}).resize({height:850,withoutEnlargement:true}).webp({quality:94,alphaQuality:100,effort:6}).toBuffer({resolveWithObject:true});
  await fs.writeFile(root+'/players/'+file,result.data);
  const width=result.info.width,height=result.info.height;
  catalog[id]={...catalog[id],file,width,height,ratio:Number((width/height).toFixed(5))};
  created.push({id,file,width,height,bytes:result.data.length});
 }
}
await fs.writeFile(root+'/catalog.json',JSON.stringify(catalog,null,2));
const out=[];
for(let n=0;n<created.length;n++){
 const p=created[n],a=catalog[p.id];
 const thumb=await sharp(root+'/players/'+a.file).resize({height:500}).toBuffer();
 const m=await sharp(thumb).metadata(),x=(n%4)*280+Math.round((280-m.width)/2),y=Math.floor(n/4)*550+35;
 out.push({input:thumb,left:x,top:y});
 const label='<svg width="280" height="30"><text x="140" y="24" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#14324f">'+a.name+'</text></svg>';
 out.push({input:Buffer.from(label),left:(n%4)*280,top:Math.floor(n/4)*550});
}
const preview=await sharp({create:{width:1120,height:2200,channels:3,background:'#f7ecd4'}}).composite(out).jpeg({quality:92}).toBuffer();
await fs.writeFile('face-preview/corrected-roster.jpg',preview);
await fs.writeFile('face-preview/corrected-roster.base64.txt',preview.toString('base64'));
await fs.writeFile('face-preview/processed.json',JSON.stringify(created,null,2));
console.log(JSON.stringify({players:created.length,totalBytes:created.reduce((s,p)=>s+p.bytes,0),assets:created},null,2));
