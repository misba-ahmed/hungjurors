import fs from 'node:fs/promises';import sharp from 'sharp';import {execFileSync} from 'node:child_process';
const cat=JSON.parse(await fs.readFile('assets/team-photos/mascots.json','utf8'));
const proof=[];
for(const [i,id,name] of [[0,13,'Raider Rusher'],[1,1,'Freddie Falcon'],[2,27,'Captain Fear']]){
 const path='.mascot-fix/'+(i<2?'source.png':'captain.png'),meta=await sharp(path).metadata();
 const crop=await sharp(path).extract({left:i<2?Math.floor(i*meta.width/2):0,top:0,width:i<2?Math.floor(meta.width/2):meta.width,height:meta.height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let p=0;p<crop.data.length;p+=4){
  const r=crop.data[p],g=crop.data[p+1],b=crop.data[p+2];
  if(g>100&&g>r*2.5&&g>b*2.5){crop.data[p+3]=0;continue;}
  // Remove green spill only along the exterior, preserving costume colors.
 }
 // Despill the two-pixel transparent boundary without desaturating green uniforms.
 const alpha=Uint8Array.from({length:crop.info.width*crop.info.height},(_,n)=>crop.data[n*4+3]);
 for(let y=0;y<crop.info.height;y++)for(let x=0;x<crop.info.width;x++){
  const n=y*crop.info.width+x,p=n*4;if(!alpha[n])continue;
  let edge=false;
  for(let dy=-2;dy<=2&&!edge;dy++)for(let dx=-2;dx<=2;dx++){
   const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<crop.info.width&&yy<crop.info.height&&!alpha[yy*crop.info.width+xx]){edge=true;break;}
  }
  if(edge&&crop.data[p+1]>Math.max(crop.data[p],crop.data[p+2])*1.08)crop.data[p+1]=Math.max(crop.data[p],crop.data[p+2]);
 }

 // These three costumes contain no green; neutralize residual spill in pale hair.
 for(let p=0;p<crop.data.length;p+=4){const m=Math.max(crop.data[p],crop.data[p+2]);if(crop.data[p+1]>m)crop.data[p+1]=m;}
 let png=await sharp(crop.data,{raw:crop.info}).png().toBuffer();
 png=await sharp(png).trim({background:'#00000000',threshold:8}).png().toBuffer();
 const native=await sharp(png).metadata(),file='dst-'+id+'-mascot-v2.webp';
 const out=await sharp(png).resize({height:850}).webp({quality:95,alphaQuality:100}).toBuffer(),m=await sharp(out).metadata();
 await fs.writeFile('assets/team-photos/mascots/'+file,out);
 cat[id]={...cat[id],file,width:m.width,height:m.height,ratio:m.width/m.height,nativeHeight:native.height};
 const thumb=await sharp(out).resize({height:400}).png().toBuffer(),tm=await sharp(thumb).metadata();
 proof.push({input:thumb,left:i*300+Math.round((300-tm.width)/2),top:10});
}
await fs.writeFile('assets/team-photos/mascots.json',JSON.stringify(cat,null,2)+'\n');
await sharp({create:{width:900,height:425,channels:3,background:'#f8ecd3'}}).composite(proof).jpeg({quality:92}).toFile('.mascot-fix/proof.jpg');
for(const f of ['test-lineup-mascots.mjs','test-lineup-rules.mjs','test-lineup-status.mjs','test-lineup-live-scores.mjs'])execFileSync('node',['scripts/'+f],{stdio:'inherit'});
