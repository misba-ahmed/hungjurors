import fs from 'node:fs/promises';
import sharp from 'sharp';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
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

const dir='photo-style-preview',id='3043078',catalog=JSON.parse(await fs.readFile('assets/team-photos/catalog.json','utf8'));
const {data,info}=await sharp(dir+'/sheet.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
removeMatte(data);
const x1=divider(data,info.width,info.height,'x',1),x2=divider(data,info.width,info.height,'x',2),y1=divider(data,info.width,info.height,'y',1);
const {data:crop,info:ci}=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).extract({left:x1,top:0,width:x2-x1,height:y1}).raw().toBuffer({resolveWithObject:true});
let l=ci.width,r=0,t=ci.height,b=0;
for(let y=0;y<ci.height;y++)for(let x=0;x<ci.width;x++){if(crop[(y*ci.width+x)*4+3]>100){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}
l=Math.max(0,l-2);r=Math.min(ci.width-1,r+2);t=Math.max(0,t-2);b=Math.min(ci.height-1,b+2);
const width=r-l+1,height=b-t+1;
assert(height>ci.height*.75&&width>60,'Incomplete player');
await sharp(crop,{raw:{width:ci.width,height:ci.height,channels:4}}).extract({left:l,top:t,width,height}).webp({quality:88,alphaQuality:100}).toFile('assets/team-photos/players/'+id+'-v3.webp');
catalog[id]={...catalog[id],file:id+'-v3.webp',width,height,ratio:Number((width/height).toFixed(5)),teamId:33,jersey:'22'};
await fs.writeFile('assets/team-photos/catalog.json',JSON.stringify(catalog,null,2));
const prepared=prepareSite(await fs.readFile('index.html','utf8'));
const sort=prepared.match(/const teams=\[\.\.\.\(data\.teams\|\|\[\]\)\]\.sort\([^;]+;/)?.[0];
assert(sort?.includes('hjCurrentStandingRank'),'Live ranking not used');
const order=new Function('data','hjCurrentStandingRank',sort+'return teams.map(t=>t.id);'),rank=t=>t.playoffSeed;
const sample={teams:[{id:3,playoffSeed:3,draftDayProjectedRank:1},{id:2,playoffSeed:1,draftDayProjectedRank:2},{id:1,playoffSeed:2,draftDayProjectedRank:3}]};
assert.deepEqual(order(sample,rank),[2,1,3]);
sample.teams[0].playoffSeed=1;sample.teams[1].playoffSeed=3;
assert.deepEqual(order(sample,rank),[3,1,2]);
assert.deepEqual(sample.teams.map(t=>t.id),[3,2,1]);
const ids=['4241389','4696981','4040715','3043078','4567750'];
let cursor=20;const figures=ids.map(id=>{const p=catalog[id],h=p.heightInches*4,w=h*p.ratio,left=cursor;cursor+=w*.86;return '<img src="/assets/team-photos/players/'+p.file+'" style="left:'+left+'px;width:'+w+'px;height:'+h+'px" alt="'+p.name+'">';}).join('');
const html='<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#f8ecd2}main{position:relative;width:'+(cursor+45)+'px;height:370px}img{position:absolute;bottom:30px;object-fit:contain;filter:drop-shadow(0 0 2px #e1ad32e6) drop-shadow(0 0 3px #f0bd3c99)}</style><main>'+figures+'</main>';
await fs.writeFile(dir+'/index.html',html);
const server=http.createServer(async(req,res)=>{try{const file='.'+new URL(req.url,'http://localhost').pathname;res.setHeader('Content-Type',path.extname(file)==='.webp'?'image/webp':'text/html; charset=utf-8');res.end(await fs.readFile(file));}catch(e){res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch();
try{const page=await browser.newPage({viewport:{width:Math.ceil(cursor+45),height:370},deviceScaleFactor:2});await page.goto('http://127.0.0.1:'+server.address().port+'/'+dir+'/index.html');await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await page.screenshot({path:dir+'/matched-lineup.png'});await fs.writeFile(dir+'/matched-lineup.base64.txt',(await fs.readFile(dir+'/matched-lineup.png')).toString('base64'));}finally{await browser.close();server.close();}
console.log('Henry matched to original artwork. Manager notes follow changing standings ranks.');
