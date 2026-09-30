import sharp from 'sharp';
const source='assets/team-photos/new-roster-sheet.png';
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<data.length;i+=4){
 const r=data[i],g=data[i+1],b=data[i+2],spill=Math.max(0,Math.min(r,b)-g);
 let a=spill>230?0:Math.max(0,1-spill/245);
 if(a<.06)a=0;
 if(a>0&&a<1){data[i]=Math.max(0,Math.min(255,(r-255*(1-a))/a));data[i+1]=Math.min(255,g/a);data[i+2]=Math.max(0,Math.min(255,(b-255*(1-a))/a));}
 data[i+3]=Math.round(a*255);
}
const regions=[{id:4685247,left:0,right:400},{id:4569559,left:400,right:755},{id:4711533,left:755,right:1141},{id:4682745,left:1141,right:1536}];
const previews=[];
for(const p of regions){
 const cut=await sharp(data,{raw:info}).extract({left:p.left,top:0,width:p.right-p.left,height:info.height}).trim({background:'#00000000',threshold:5}).resize({height:850}).webp({quality:91,alphaQuality:100}).toBuffer();
 const m=await sharp(cut).metadata();
 console.log('ASSET '+JSON.stringify({id:p.id,width:m.width,height:m.height,ratio:Number((m.width/m.height).toFixed(5)),hasAlpha:m.hasAlpha,bytes:cut.length}));
 console.log('WEBP '+p.id+' '+cut.toString('base64'));
 previews.push({input:await sharp(cut).resize({height:510}).toBuffer(),left:20+regions.indexOf(p)*220,top:40});
}
console.log('PREVIEW '+(await sharp({create:{width:900,height:570,channels:3,background:'#f7ecd4'}}).composite(previews).png().toBuffer()).toString('base64'));
