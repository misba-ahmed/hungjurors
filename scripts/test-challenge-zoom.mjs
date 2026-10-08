import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium,webkit} from 'playwright';

// Exercise each production graphic with deterministic test scores and canonical artwork.
// This is rendering/interaction coverage, not a physical-iPhone crash reproduction.
const source=await fs.readFile('scripts/challenge-live.js','utf8');
const declarations=source.slice(0,source.indexOf('\n{\n hjChBindLmsGestures'));
assert(declarations.length>10000,'production declarations boundary');
const context=vm.createContext({});
vm.runInContext(await fs.readFile('scripts/challenge-engine.js','utf8'),context);
vm.runInContext(`const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');const av=()=>'';${declarations}`,context);
const names=['MISBA','BRYAN','TYLER','NATHAN M','WASI','CESAR','NATHAN T','GARRETT','JARRETT','KAT'].map((short,i)=>({id:String(i+1),short}));
context.names=names;
vm.runInContext('HJ_CHALLENGE_STATE.names=names',context);
const rows=(key)=>names.map((n,i)=>({...n,total:key==='overachiever'?(i-4)*13:10+i*3,tie:10+i,weeks:4,missing:[],history:[]})).sort((a,b)=>b.total-a.total);
const model={weeks:[],tickets:names.map((n,i)=>({...n,total:i===2?1:0})),raffle:[{week:1,score:140,winners:[names[2]]}],eliminations:[],regularEnd:14,finalEnd:16,finalWeek:4,liveWeek:null,totals:Object.fromEntries(['titty','mvp','overachiever','optimizer'].map(key=>[key,rows(key)]))};
const css=await fs.readFile('styles/season-challenges.css','utf8');
const kinds=['raffle','lms','titty','mvp','overachiever','optimizer'];
const shell=(body)=>`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--paper:#f7f3e7;--paper-dim:#eee9d8;--navy:#14324f;--line:#ddd7c6;--brass:#b98a2e;--brass-bright:#d9a93f;--sans:Arial,sans-serif;--mono:monospace;--verdict-red:#b3352c}*{box-sizing:border-box}body{margin:0;padding:16px;background:var(--paper)}${css}</style><div id="challenge-out">${body}</div><script>${declarations}\nhjChBindLmsGestures(document.getElementById('challenge-out'));document.addEventListener('click',e=>{const b=e.target.closest('[data-lms-zoom]');if(b)hjChSetLmsZoom(b.closest('.lms-view'),b.dataset.lmsZoom==='fit');});</script>`;
await fs.mkdir('gesture-proof',{recursive:true});
function rss(){try{return execFileSync('ps',['-eo','rss,args'],{encoding:'utf8'}).split('\n').filter(x=>/WebKitWebProcess|MiniBrowser|chrome-headless-shell/.test(x)&&!x.includes('ps -eo')).reduce((n,x)=>n+Number(x.trim().split(/\s+/)[0]),0);}catch{return null;}}
for(const engine of [webkit,chromium]){
 const browser=await engine.launch();
 try{
 for(const kind of kinds){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const body=context.hjChBodyHTML({id:kind},model),html=shell(body);
  await page.route('https://hungjurors.com/**',async r=>{const path=new URL(r.request().url()).pathname;if(path==='/')return r.fulfill({contentType:'text/html',body:html});try{return await r.fulfill({body:await fs.readFile('.'+path),contentType:path.endsWith('.webp')?'image/webp':path.endsWith('.png')?'image/png':'image/svg+xml'});}catch{return r.abort();}});
  await page.goto('https://hungjurors.com/',{waitUntil:'networkidle'});
  await page.evaluate(async()=>{const hrefs=[...document.querySelectorAll('.lms-art image')].map(e=>e.getAttribute('href'));const urls=[...hrefs,...[...document.querySelectorAll('.lms-art img')].map(e=>e.src)];await Promise.all(urls.map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(new Error('Artwork missing: '+src));img.src=src;})));});
  const startRss=rss();let peakRss=startRss;
  for(let i=0;i<5;i++){
   await page.getByRole('button',{name:'Zoom in on lineup',exact:true}).tap();
   await page.waitForTimeout(600);
   assert.equal(await page.locator('.lms-view').evaluate(e=>e.classList.contains('is-fit')),false);
   assert.equal(await page.locator('.lineup').evaluate(e=>Math.round(e.getBoundingClientRect().width)),800);
   peakRss=Math.max(peakRss||0,rss()||0);
   if(i===0)await page.screenshot({path:`gesture-proof/${engine.name()}-${kind}-detail.png`});
   await page.getByRole('button',{name:'Show entire lineup',exact:true}).tap();
   await page.waitForTimeout(600);
   assert.equal(await page.locator('.lms-view').evaluate(e=>e.classList.contains('is-fit')),true);
  }
  const stage=page.locator('.lms-stage'),box=await stage.boundingBox();
  await page.touchscreen.tap(box.x+box.width/2,box.y+25);await page.waitForTimeout(80);await page.touchscreen.tap(box.x+box.width/2,box.y+25);
  await page.waitForTimeout(600);
  assert.equal(await page.locator('.lms-view').evaluate(e=>e.classList.contains('is-fit')),false,kind+' double tap');
  const details=await page.evaluate(()=>({crowns:document.querySelectorAll('.lms-crown').length,filters:[...document.querySelectorAll('.lms-view *')].filter(e=>getComputedStyle(e).filter!=='none').map(e=>({tag:e.tagName,cls:e.getAttribute('class'),filter:getComputedStyle(e).filter})),height:document.querySelector('.lms-stage').clientHeight}));
  console.log('ZOOM_PROOF',JSON.stringify({engine:engine.name(),kind,startRssKB:startRss,peakRssKB:peakRss,...details}));
  assert.equal(errors.length,0,errors.join('\n'));
  await page.close();
 }
 }finally{await browser.close();}
}
