
import fs from 'node:fs/promises';import sharp from 'sharp';
const teams=[[2,"Buffalo","Bills","Billy Buffalo"],[15,"Miami","Dolphins","T.D."],[17,"New England","Patriots","Pat Patriot"],[20,"New York","Jets","Aviator",true],[33,"Baltimore","Ravens","Poe"],[4,"Cincinnati","Bengals","Who Dey"],[5,"Cleveland","Browns","Chomps"],[23,"Pittsburgh","Steelers","Steely McBeam"],[34,"Houston","Texans","TORO"],[11,"Indianapolis","Colts","Blue"],[30,"Jacksonville","Jaguars","Jaxson de Ville"],[10,"Tennessee","Titans","T-Rac"],[7,"Denver","Broncos","Miles"],[12,"Kansas City","Chiefs","KC Wolf"],[13,"Las Vegas","Raiders","Raider Rusher"],[24,"Los Angeles","Chargers","Lightning",true],[6,"Dallas","Cowboys","Rowdy"],[19,"New York","Giants","Construction worker",true],[21,"Philadelphia","Eagles","Swoop"],[28,"Washington","Commanders","Major Tuddy"],[3,"Chicago","Bears","Staley Da Bear"],[8,"Detroit","Lions","Roary"],[9,"Green Bay","Packers","Cheesehead",true],[16,"Minnesota","Vikings","Viktor"],[1,"Atlanta","Falcons","Freddie Falcon"],[29,"Carolina","Panthers","Sir Purr"],[18,"New Orleans","Saints","Gumbo"],[27,"Tampa Bay","Buccaneers","Captain Fear"],[22,"Arizona","Cardinals","Big Red"],[14,"Los Angeles","Rams","Rampage"],[25,"San Francisco","49ers","Sourdough Sam"],[26,"Seattle","Seahawks","Blitz"]];
await fs.mkdir('assets/team-photos/mascots',{recursive:true});
const cat={},proof=[];
for(let i=0;i<32;i++){
 const [id,city,team,name,custom=false]=teams[i],conference=i<16?'AFC':'NFC',local=i%16,row=Math.floor(local/4),col=local%4;
 const source=sharp('.dst/'+conference+'.png'),meta=await source.metadata();
 const cuts=conference==='AFC'?[0,354,699,1057,1470]:[0,377,737,1080,1500];
 const crop=await source.extract({left:Math.round(col*meta.width/4),top:Math.round(cuts[row]*meta.height/1536),width:Math.floor(meta.width/4),height:Math.round((cuts[row+1]-cuts[row])*meta.height/1536)}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
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
 let png=await sharp(crop.data,{raw:crop.info}).png().toBuffer();
 png=await sharp(png).trim({background:'#00000000',threshold:8}).png().toBuffer();
 const native=await sharp(png).metadata();
 const file='dst-'+id+'-mascot-v1.webp';
 const buf=await sharp(png).resize({height:850,kernel:'lanczos3'}).webp({quality:95,alphaQuality:100}).toBuffer();
 const m=await sharp(buf).metadata();
 await fs.writeFile('assets/team-photos/mascots/'+file,buf);
 cat[id]={mascot:true,city,team,name,custom,file,width:m.width,height:m.height,ratio:m.width/m.height,displayHeight:73,nativeHeight:native.height};
 const thumb=await sharp(buf).resize({height:225}).png().toBuffer(),tm=await sharp(thumb).metadata();
 const x=(i%8)*180,y=Math.floor(i/8)*268;
 proof.push({input:thumb,left:x+Math.round((180-tm.width)/2),top:y});
 const label=Buffer.from('<svg width="180" height="40"><text x="90" y="16" text-anchor="middle" font-size="12" font-family="sans-serif" fill="#15334b">'+city+'</text><text x="90" y="32" text-anchor="middle" font-size="12" font-family="sans-serif" fill="#15334b">'+team+' DST</text></svg>');
 proof.push({input:label,left:x,top:y+230});
}
await fs.writeFile('assets/team-photos/mascots.json',JSON.stringify(cat,null,2)+'\n');
await sharp({create:{width:1440,height:1072,channels:3,background:'#f8ecd3'}}).composite(proof).jpeg({quality:88}).toFile('.dst/proof.jpg');
const reference=await sharp('assets/team-photos/players/4047646-faces-v2.webp').resize({height:400}).png().toBuffer();
const sample=await sharp('assets/team-photos/mascots/'+cat[16].file).resize({height:400}).png().toBuffer();
await sharp({create:{width:600,height:430,channels:3,background:'#f8ecd3'}}).composite([{input:reference,left:20,top:10},{input:sample,left:320,top:10}]).jpeg({quality:90}).toFile('.dst/comparison.jpg');
console.log('Prepared all 32 DST mascots');
