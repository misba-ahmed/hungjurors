import sharp from 'sharp';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const dir='assets/avatars/';
await mkdir(dir,{recursive:true});
// Turn the ImageGen green-screen export into a real alpha cutout.
const {data,info}=await sharp(dir+'misba-head-source.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<data.length;i+=4){
 const r=data[i],g=data[i+1],b=data[i+2],base=Math.max(r,b);
 if(g>base+6){
  const alpha=1-(g-base)/Math.max(1,255-base);
  if(alpha<.16){data[i+3]=0;continue;}
  data[i+3]=Math.round(255*alpha);
  data[i]=Math.min(255,Math.round(r/alpha));
  data[i+1]=Math.min(255,Math.round(base/alpha));
  data[i+2]=Math.min(255,Math.round(b/alpha));
 }
}
let minX=info.width,minY=info.height,maxX=0,maxY=0;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>20){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
const width=maxX-minX+1,height=maxY-minY+1,pad=Math.ceil(Math.max(width,height)*.09),side=Math.max(width,height)+2*pad;
const cutout=await sharp(data,{raw:info}).extract({left:minX,top:minY,width,height}).png().toBuffer();
const padded=await sharp({create:{width:side,height:side,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:cutout,left:Math.floor((side-width)/2),top:Math.floor((side-height)/2)}]).png().toBuffer();
const head=await sharp(padded).resize(512,512).png().toBuffer();
await writeFile(dir+'misba-head-20260929-v2.png',head);
// The blazer encloses the white shirt; it never connects to these background seeds.
const bustImage=await sharp(dir+'misba-20260929.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const bust=bustImage.data,bw=bustImage.info.width,bh=bustImage.info.height,seen=new Uint8Array(bw*bh),queue=new Int32Array(bw*bh);let front=0,end=0;
const isBackground=i=>{const n=i*4,r=bust[n],g=bust[n+1],b=bust[n+2];return Math.min(r,g,b)>208&&Math.max(r,g,b)-Math.min(r,g,b)<24;};
function add(i){if(i<0||i>=seen.length||seen[i]||!isBackground(i))return;seen[i]=1;queue[end++]=i;}
for(let x=0;x<bw;x++)add(x);
for(let y=0;y<bh*.8;y++){add(y*bw);add(y*bw+bw-1);}
while(front<end){const i=queue[front++],x=i%bw;bust[i*4+3]=0;if(x)add(i-1);if(x<bw-1)add(i+1);add(i-bw);add(i+bw);}
for(let y=0;y<bh*.36;y++)for(let x=0;x<bw;x++){const i=y*bw+x;if(isBackground(i))bust[i*4+3]=0;}
const portrait=await sharp(bust,{raw:bustImage.info}).resize(384,384).png().toBuffer();
await writeFile(dir+'misba-20260929-v2.png',portrait);
const source=await readFile('index.html','utf8'),prepared=prepareSite(source);
assert(prepared.includes('misba-head-20260929-v2.png'));
const map=JSON.parse(prepared.match(/const AV = (\{[^\n]+\});/)[1]);
assert.equal(map.MISBA,'/assets/avatars/misba-20260929-v2.png');
const challenge=await readFile('scripts/challenge-live.js','utf8');
const fn=challenge.slice(challenge.indexOf('function hjChFigureArt('),challenge.indexOf('\nfunction ',challenge.indexOf('function hjChFigureArt(')+10));
const figure=new Function('AV','AV_DEFAULT',fn+'\nreturn hjChFigureArt;')(JSON.parse(source.match(/const AV = (\{[^\n]+\});/)[1]),'');
const natural=figure({short:'MISBA'},'qa-misba'),other=figure({short:'KAT'},'qa-kat');
assert(!natural.includes('clip-path='));
assert(other.includes('clip-path='));
const style=[...prepared.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n')+'\n'+await readFile('styles/season-challenges.css','utf8');
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname.slice(1);res.setHeader('Content-Type',name.endsWith('.png')?'image/png':'text/plain');res.end(await readFile(name));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:880,height:720},deviceScaleFactor:1});
 const variants=[['Raffle',''],['Last Man Standing','is-eliminated'],['Titty Special',''],['MVP Special',''],['Overachiever',''],['Optimizer','is-seated']];
 const css='body{margin:0;padding:24px;background:#f7ecd4;color:#173650;font:14px Arial}.qa{display:grid;grid-template-columns:300px 1fr;gap:24px}.qa-main{width:280px;max-width:none;--lms-jacket:#28566b}.qa-main svg{width:280px;height:auto}.qa-main .lms-upper,.qa-mini .lms-upper{transition:none}.qa-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.qa-mini{width:120px;max-width:none;--lms-jacket:#28566b}.qa-mini svg{width:120px;height:auto}.qa-grid label{display:block;text-align:center;margin-top:4px;font-weight:700;font-size:12px}.qa-circles{display:flex;gap:14px;align-items:center;margin-top:20px}.qa-circles img{border:2px solid #b78b2f}.qa-note{font-size:13px;margin-bottom:14px}';
 await page.setContent('<!doctype html><base href="'+origin+'"><style>'+style+css+'</style><div class="qa-note">Misba · complete curl silhouette, transparent background, short neck</div><div class="qa"><div><div class="lms-figure qa-main">'+natural+'</div><div class="qa-circles"><img class="av" data-manager="MISBA" src="/assets/avatars/misba-20260929-v2.png" style="width:92px;height:116px"><img class="av" data-manager="MISBA" src="/assets/avatars/misba-20260929-v2.png" style="width:58px;height:58px"><img class="av" data-manager="MISBA" src="/assets/avatars/misba-20260929-v2.png" style="width:30px;height:30px"></div></div><div class="qa-grid">'+variants.map(([title,cls],i)=>'<div><div class="lineup-figure qa-mini '+cls+'">'+figure({short:'MISBA'},'qa-'+i,i===2||i===3)+'</div><label>'+title+'</label></div>').join('')+'</div></div>');
 await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()));await Promise.all([...document.querySelectorAll('svg image')].map(el=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=el.getAttribute('href');})));});
 const screenshot=await page.screenshot({type:'jpeg',quality:88});
 function emit(name,buffer){const b64=buffer.toString('base64');for(let i=0;i<b64.length;i+=6000)console.log('AVATAR_ASSET '+name+' '+Math.floor(i/6000)+' '+b64.slice(i,i+6000));}
 emit('head',head);emit('portrait',portrait);emit('preview',screenshot);
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{document.querySelector('.qa').style.display='block';document.querySelector('.qa-grid').style.display='none';});
 const mobile=await page.screenshot({type:'jpeg',quality:85});emit('mobile',mobile);
 const decoded=await sharp(head).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(decoded.data[3],0);
 assert(decoded.data.some((v,i)=>i%4===3&&v===255));
 console.log('AVATAR_CHECKS_PASSED Full silhouette; actual alpha; neck retained; all challenge figures share renderer; other managers keep original framing.');
}finally{await browser.close();server.close();}
