import sharp from 'sharp';
const source='assets/team-photos/new-roster-sheet.png';
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<data.length;i+=4){
 const r=data[i],g=data[i+1],b=data[i+2],spill=b>r*.45&&b>g+15?Math.max(0,Math.min(r,b)-g):0;
 let a=spill>230?0:Math.max(0,1-spill/245);
 if(a<.16)a=0;
 if(a>0&&a<1){data[i]=Math.max(0,Math.min(255,(r-255*(1-a))/a));data[i+1]=Math.min(255,g/a);data[i+2]=Math.max(0,Math.min(255,(b-255*(1-a))/a));}
 data[i+3]=Math.round(a*255);
}
const regions=[{id:2973405,left:0,right:768},{id:4243331,left:768,right:1536}];
const previews=[];
for(const p of regions){
 let minX=p.right,maxX=p.left,minY=info.height,maxY=0;
 for(let y=0;y<info.height;y++)for(let x=p.left;x<p.right;x++){if(data[(y*info.width+x)*4+3]>=128){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}
 minX=Math.max(p.left,minX-2);maxX=Math.min(p.right-1,maxX+2);minY=Math.max(0,minY-2);maxY=Math.min(info.height-1,maxY+2);
 const region=await sharp(data,{raw:info}).extract({left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1}).png().toBuffer();
 const cut=await sharp(region).resize({height:850}).webp({quality:91,alphaQuality:100}).toBuffer();
 const m=await sharp(cut).metadata();
 console.log('ASSET '+JSON.stringify({id:p.id,width:m.width,height:m.height,ratio:Number((m.width/m.height).toFixed(5)),hasAlpha:m.hasAlpha,bytes:cut.length}));
 console.log('WEBP '+p.id+' '+cut.toString('base64'));
 previews.push({input:await sharp(cut).resize({height:510}).toBuffer(),left:20+regions.indexOf(p)*220,top:40});
}
console.log('PREVIEW '+(await sharp({create:{width:470,height:570,channels:3,background:'#f7ecd4'}}).composite(previews).png().toBuffer()).toString('base64'));
