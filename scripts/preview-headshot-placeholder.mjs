import fs from 'node:fs/promises';
import sharp from 'sharp';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const root='photo-preview',id='3043078';
await fs.mkdir(root,{recursive:true});
const {data,info}=await sharp(root+'/henry-source.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
let l=info.width,r=0,t=info.height,b=0;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
 const p=(y*info.width+x)*4,R=data[p],G=data[p+1],B=data[p+2],s=Math.min(R-G,B-G);
 if(R>175&&B>175&&s>115)data[p+3]=0;
 else if(R>180&&B>180&&s>65){data[p+3]=Math.round(255*(115-s)/50);data[p]=Math.min(R,G+35);data[p+2]=Math.min(B,G+45);}
 if(data[p+3]>100){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
}
l=Math.max(0,l-2);r=Math.min(info.width-1,r+2);t=Math.max(0,t-2);b=Math.min(info.height-1,b+2);
const originalWidth=r-l+1,originalHeight=b-t+1;
await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).extract({left:l,top:t,width:originalWidth,height:originalHeight}).resize({height:900}).webp({quality:90,alphaQuality:100}).toFile('assets/team-photos/players/'+id+'-v2.webp');
const photo=await sharp('assets/team-photos/players/'+id+'-v2.webp').metadata();
const catalog=JSON.parse(await fs.readFile('assets/team-photos/catalog.json','utf8'));
catalog[id]={...catalog[id],file:id+'-v2.webp',width:photo.width,height:photo.height,ratio:Number((photo.width/photo.height).toFixed(5)),teamId:33,jersey:'22'};
await fs.writeFile('assets/team-photos/catalog.json',JSON.stringify(catalog,null,2));
const resp=await fetch('https://a.espncdn.com/i/headshots/nfl/players/full/'+id+'.png');
if(!resp.ok)throw Error('Headshot '+resp.status);
const head=Buffer.from(await resp.arrayBuffer());
await fs.writeFile(root+'/headshot.png',head);
const hm=await sharp(head).metadata();
await sharp(head).extract({left:Math.round(hm.width*.30),top:0,width:Math.round(hm.width*.40),height:Math.round(hm.height*.76)}).png().toFile(root+'/face.png');
const mime={'.png':'image/png','.webp':'image/webp','.html':'text/html'};
const figure='<div class="figure"><img class="body" src="/assets/team-photos/players/'+id+'-v2.webp"><img class="real-face" src="/photo-preview/face.png"></div>';
const html='<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;background:#f7eedb;font:16px Arial;color:#14324b}main{width:1000px;padding:28px 34px 22px}h1{font-size:25px;margin:0 0 8px}.intro{margin:0 0 26px;color:#5c6d76;font-size:15px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:30px}section{background:#fbf4e5;border:1px solid #dbd2be;border-radius:14px;text-align:center;padding:18px}h2{font-size:18px;margin:0 0 20px}.stage{height:410px;position:relative;display:flex;justify-content:center;align-items:end;border-bottom:1px solid #d6cab0}.figure{position:relative;height:400px;width:'+(400*photo.width/photo.height)+'px}.body{height:100%;width:100%;object-fit:contain;clip-path:inset(13.4% 0 0 0)}.real-face{position:absolute;top:-.5%;left:33%;width:35%;height:17.5%;object-fit:fill}.head-only{position:relative;height:400px;width:176px}.head-only img{position:absolute;top:8%;left:0;width:100%;height:42%;object-fit:contain;object-position:center top}p{font-size:14px;line-height:1.45;color:#667681;margin:14px 0 0}.note{font-size:13px;margin-top:20px}</style></head><body><main><h1>When a full-body player image is missing</h1><p class="intro">Derrick Henry example · actual ESPN headshot</p><div class="compare"><section><h2>Current placeholder</h2><div class="stage"><div class="head-only"><img src="/photo-preview/headshot.png"></div></div><p>Headshot only, with empty space below.</p></section><section><h2>Proposed placeholder</h2><div class="stage">'+figure+'</div><p>Real headshot over a reusable uniform body.</p></section></div><p class="note">Preview only. The placeholder body is approximate; it would be replaced by the finished player image.</p></main></body></html>';
await fs.writeFile(root+'/placeholder.html',html);
const server=http.createServer(async(req,res)=>{try{const file='.'+new URL(req.url,'http://localhost').pathname;res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch(e){res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch();
try{const page=await browser.newPage({viewport:{width:1000,height:630},deviceScaleFactor:1.5});await page.goto('http://127.0.0.1:'+server.address().port+'/photo-preview/placeholder.html');await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await page.locator('main').screenshot({path:root+'/placeholder-preview.png'});await fs.writeFile(root+'/placeholder-preview.base64.txt',(await fs.readFile(root+'/placeholder-preview.png')).toString('base64'));
await fs.writeFile(root+'/headshot.base64.txt',head.toString('base64'));
}catch(e){throw e;}finally{await browser.close();server.close();}
console.log('Henry corrected to Baltimore #22; placeholder preview rendered.');
