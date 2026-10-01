import fs from 'node:fs/promises';
import sharp from 'sharp';
const names=['misba','bryan','tyler','nathan-m','wasi','cesar','nathan-t','garrett','jarrett','kat'];
await fs.mkdir('assets/managers-v4',{recursive:true});
// Restore the original 120 x 240 figure coordinate geometry while retaining
// each complete illustration. Equal horizontal/vertical head scaling preserves faces.
for(const name of names)for(const pose of ['standing','seated']){
 const {data,info}=await sharp('assets/managers-v3/'+name+'-'+pose+'.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seated=pose==='seated', anchors=seated?[[0,0],[33,33],[83,115],[170,185],[239,239],[240,240]]:[[0,0],[3,3],[53,85],[125,147],[223,223],[240,240]];
 const out=Buffer.alloc(360*720*4);
 for(let y=0;y<720;y++){
  const dy=(y+.5)/3;let k=0;
  while(k<anchors.length-2&&dy>anchors[k+1][1])k++;
  const [s0,d0]=anchors[k],[s1,d1]=anchors[k+1];
  const sy=s0+(dy-d0)*(s1-s0)/(d1-d0);
  const start=seated?70:37, t=Math.max(0,Math.min(1,(sy-start)/17)), blend=t*t*(3-2*t);
  const scale=1.64+(1.2-1.64)*blend;
  for(let x=0;x<360;x++){
   const sx=((x+.5)/3-60)/scale+60, px=sx*3-.5,py=sy*3-.5;
   const ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
   let a=0,r=0,g=0,b=0;
   for(let j=0;j<2;j++)for(let i=0;i<2;i++){
    const xx=ix+i,yy=iy+j;
    if(xx<0||xx>=info.width||yy<0||yy>=info.height)continue;
    const p=(yy*info.width+xx)*4,w=(i?fx:1-fx)*(j?fy:1-fy)*data[p+3]/255;
    a+=w;r+=data[p]*w;g+=data[p+1]*w;b+=data[p+2]*w;
   }
   const q=(y*360+x)*4;
   if(a){out[q]=r/a;out[q+1]=g/a;out[q+2]=b/a;out[q+3]=a*255;}
  }
 }
 await sharp(out,{raw:{width:360,height:720,channels:4}}).webp({quality:95,alphaQuality:100}).toFile('assets/managers-v4/'+name+'-'+pose+'.webp');
}
console.log('Restored original large-head, short-body geometry for all twenty poses.');
