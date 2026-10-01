import fs from 'node:fs/promises';
import sharp from 'sharp';
const dir='assets/managers-v3';await fs.mkdir(dir,{recursive:true});
const groups=[['misba',['MISBA'],null],['group1',['BRYAN','TYLER','NATHAN M'],832/1536],['group2',['WASI','CESAR','NATHAN T'],804/1536],['group3',['GARRETT','JARRETT','KAT'],803/1536]];
const slug=n=>n.toLowerCase().replaceAll(' ','-');
async function cutout(input){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let start=0,end=0;
 function add(p){if(p<0||p>=w*h||seen[p])return;seen[p]=1;const i=p*4,r=data[i],g=data[i+1],b=data[i+2];if(r>220&&g>210&&b>180&&r-g<30&&g-b<40){queue[end++]=p;data[i+3]=0;}}
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
 while(start<end){const p=queue[start++],x=p%w; if(x)add(p-1);if(x<w-1)add(p+1);add(p-w);add(p+w);}
 // Retain only the largest connected foreground: one complete character per cell.
 const visited=new Uint8Array(w*h);let largest=[];
 for(let p=0;p<w*h;p++){if(visited[p]||!data[p*4+3])continue;let a=0,b=1;queue[0]=p;visited[p]=1;const component=[];
  while(a<b){const n=queue[a++];component.push(n);const x=n%w;for(const next of [x?n-1:-1,x<w-1?n+1:-1,n-w,n+w])if(next>=0&&next<w*h&&!visited[next]&&data[next*4+3]){visited[next]=1;queue[b++]=next;}}
  if(component.length>largest.length)largest=component;
 }
 const keep=new Uint8Array(w*h);let l=w,t=h,r=0,b=0;
 for(const p of largest){keep[p]=1;const x=p%w,y=Math.floor(p/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 for(let p=0;p<w*h;p++)if(!keep[p])data[p*4+3]=0;
 if(l>=r||t>=b)throw Error('No complete character found');
 return sharp(data,{raw:info}).extract({left:l,top:t,width:r-l+1,height:b-t+1}).png().toBuffer();
}
for(const [file,names,rowSplit]of groups){
 const input=await fs.readFile('.manager-art/'+file+'-approved.png'),meta=await sharp(input).metadata(),w=meta.width,h=meta.height;
 for(let n=0;n<names.length;n++)for(let pose=0;pose<2;pose++){
  const edges=file==='group3'?[0,361/1024,682/1024,1]:[0,1/3,2/3,1];
  const left=file==='misba'?Math.round(pose*w/2):Math.round(edges[n]*w);
  const right=file==='misba'?Math.round((pose+1)*w/2):Math.round(edges[n+1]*w);
  const top=file==='misba'?0:pose?Math.round(rowSplit*h):0;
  const bottom=file==='misba'?h:pose?h:Math.round(rowSplit*h);
  const crop=await sharp(input).extract({left,top,width:right-left,height:bottom-top}).png().toBuffer();
  const figure=await cutout(crop),height=pose?618:660;
  const resized=await sharp(figure).resize({height}).png().toBuffer(),m=await sharp(resized).metadata();
  if(m.width>350)throw Error('Figure wider than frame: '+names[n]);
  await sharp({create:{width:360,height:720,channels:4,background:'#00000000'}}).composite([{input:resized,left:Math.round((360-m.width)/2),top:pose?99:9}]).webp({lossless:true}).toFile(dir+'/'+slug(names[n])+'-'+(pose?'seated':'standing')+'.webp');
 }
}
console.log('Prepared 20 complete-character cutouts; no separate head or neck layers.');
