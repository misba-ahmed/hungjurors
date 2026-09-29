import fs from 'node:fs/promises';
import sharp from 'sharp';
const root='assets/team-photos',source=JSON.parse(await fs.readFile(root+'/sources/rosters.json','utf8')),catalog={};
await fs.mkdir(root+'/players',{recursive:true});
function heightInches(p){const m=String(p.displayHeight).match(/(\d+)'\s*(\d+)/);return m?Number(m[1])*12+Number(m[2]):73;}
function removeMatte(raw){
 for(let i=0;i<raw.length;i+=4){
  const r=raw[i],g=raw[i+1],b=raw[i+2];
  const strength=Math.min(r-g,b-g);
  if(r>175&&b>175&&strength>115){raw[i+3]=0;continue;}
  // Remove only the outer magenta fringe, preserving the purple uniforms.
  if(r>180&&b>180&&strength>65){raw[i+3]=Math.round(255*(115-strength)/50);raw[i]=Math.min(r,g+35);raw[i+2]=Math.min(b,g+45);}
 }
}
function divider(data,w,h,axis,index){
 const size=axis==='y'?h:w,ideal=size*index/4,range=Math.round(size*.025);
 let best=Math.round(ideal),min=Infinity;
 for(let p=Math.round(ideal)-range;p<=Math.round(ideal)+range;p++){
  let count=0;
  for(let q=0;q<(axis==='y'?w:h);q++){const at=axis==='y'?(p*w+q)*4:(q*w+p)*4;if(data[at+3]>120)count++;}
  const score=count*1000+Math.abs(p-ideal);
  if(score<min){min=score;best=p;}
 }
 return best;
}
for(const group of source){
 const file=root+'/sources/team-'+group.id+'.png';
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 removeMatte(data);
 const xs=[0,...[1,2,3].map(i=>divider(data,info.width,info.height,'x',i)),info.width];
 const ys=[0,...[1,2,3].map(i=>divider(data,info.width,info.height,'y',i)),info.height];
 const keyed=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
 for(let i=0;i<group.order.length;i++){
  const id=group.order[i],p=group.players.find(p=>p.id===id),x=i%4,y=Math.floor(i/4);
  const area={left:xs[x],top:ys[y],width:xs[x+1]-xs[x],height:ys[y+1]-ys[y]};
  const {data:crop,info:ci}=await sharp(keyed).extract(area).raw().toBuffer({resolveWithObject:true});
  let l=ci.width,r=-1,t=ci.height,b=-1,count=0;
  for(let cy=0;cy<ci.height;cy++)for(let cx=0;cx<ci.width;cx++){if(crop[(cy*ci.width+cx)*4+3]>100){l=Math.min(l,cx);r=Math.max(r,cx);t=Math.min(t,cy);b=Math.max(b,cy);count++;}}
  if(count<1000||b-t<ci.height*.65)throw Error('Player cutout incomplete '+id);
  const pad=2;l=Math.max(0,l-pad);r=Math.min(ci.width-1,r+pad);t=Math.max(0,t-pad);b=Math.min(ci.height-1,b+pad);
  const width=r-l+1,height=b-t+1;
  const name=id+'-v1.webp';
  await sharp(crop,{raw:{width:ci.width,height:ci.height,channels:4}}).extract({left:l,top:t,width,height}).webp({quality:88,alphaQuality:100}).toFile(root+'/players/'+name);
  catalog[id]={file:name,width,height,ratio:Number((width/height).toFixed(5)),heightInches:heightInches(p),name:p.name,teamId:p.teamId,jersey:p.number};
 }
}
await fs.writeFile(root+'/catalog.json',JSON.stringify(catalog,null,2));
console.log('Prepared '+Object.keys(catalog).length+' reusable player cutouts.');
