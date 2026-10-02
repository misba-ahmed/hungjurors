import fs from 'node:fs/promises';import sharp from 'sharp';
const catalog=JSON.parse(await fs.readFile('assets/team-photos/catalog.json','utf8'));
const ids=Object.keys(catalog),reference={},changes=[],warnings=[],failures=[];
async function inspect(id){
 const a=catalog[id],url='https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes/'+id+'?lang=en&region=us';
 try{
 const res=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!res.ok)throw Error('HTTP '+res.status);const p=await res.json();
 const height=Number(p.height);if(!(height>=60&&height<=90))throw Error('Missing height');
 reference[id]={name:p.displayName,heightInches:height,source:url,checkedAt:new Date().toISOString()};
 if(a.heightInches!==height){changes.push({id,name:a.name,before:a.heightInches,after:height});a.heightInches=height;}
 const team=String(p.team?.$ref||'').match(/teams\/(\d+)/)?.[1];
 if(team&&Number(team)!==Number(a.teamId))warnings.push({id,name:a.name,type:'team',catalog:a.teamId,source:team});
 if(p.jersey&&String(p.jersey)!==String(a.jersey))warnings.push({id,name:a.name,type:'jersey',catalog:a.jersey,source:p.jersey});
 for(const asset of [a,...(a.unavailable?[a.unavailable]:[])]){
 const image=sharp('assets/team-photos/players/'+asset.file),m=await image.metadata();
 if(m.width!==asset.width||m.height!==asset.height||Math.abs(asset.ratio-m.width/m.height)>.00002)failures.push({id,file:asset.file,type:'dimensions'});
 if(!m.hasAlpha)failures.push({id,file:asset.file,type:'missing transparency'});
 }
 }catch(e){failures.push({id,name:a.name,error:e.message});}
}
for(let i=0;i<ids.length;i+=8)await Promise.all(ids.slice(i,i+8).map(inspect));
await fs.mkdir('.lineup-audit',{recursive:true});
await fs.writeFile('assets/team-photos/height-reference.json',JSON.stringify(reference,null,2)+'\n');
await fs.writeFile('assets/team-photos/catalog.json',JSON.stringify(catalog,null,2)+'\n');
await fs.writeFile('.lineup-audit/report.json',JSON.stringify({count:ids.length,verified:Object.keys(reference).length,changes,warnings,failures},null,2));
for(let start=0;start<ids.length;start+=40){
 const tiles=[];
 for(const [index,id]of ids.slice(start,start+40).entries()){
 const a=catalog[id],im=await sharp('assets/team-photos/players/'+a.file).resize({height:210}).png().toBuffer({resolveWithObject:true});
 const x=(index%8)*150,y=Math.floor(index/8)*245;
 tiles.push({input:im.data,left:x+Math.round((150-im.info.width)/2),top:y+2});
 const text=a.name.replace(/&/g,'&amp;').replace(/</g,'&lt;');
 tiles.push({input:Buffer.from('<svg width="150" height="28"><text x="75" y="12" text-anchor="middle" font-size="11">'+text+'</text><text x="75" y="25" text-anchor="middle" font-size="10">'+id+' · '+a.heightInches+'in</text></svg>'),left:x,top:y+215});
 }
 await sharp({create:{width:1200,height:1225,channels:4,background:'#faefd9'}}).composite(tiles).png().toFile('.lineup-audit/sheet-'+(start/40)+'.png');
}
console.log(JSON.stringify({count:ids.length,verified:Object.keys(reference).length,changes,warnings,failures}));
