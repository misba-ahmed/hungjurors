import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,extname} from 'node:path';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
import {extractSiteArtwork} from './site-artwork.mjs';

const source=await readFile('index.html','utf8'),html=prepareSite(source);
assert.equal((html.match(/id="hj-zoom-safety"/g)||[]).length,1);
assert(!html.includes('canvas._paperShadow'));
assert(!/maximum-scale\s*=\s*1\b|user-scalable\s*=\s*no/i.test(html.match(/<meta[^>]+name="viewport"[^>]*>/i)?.[0]||''));
for(const [name,bytes]of extractSiteArtwork(source).assets){await mkdir(dirname(name),{recursive:true});await writeFile(name,bytes);}
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://local').pathname;
 res.setHeader('Content-Type',path==='/'?'text/html':extname(path)==='.css'?'text/css':extname(path)==='.js'?'text/javascript':extname(path)==='.png'?'image/png':'application/json');
 res.end(path==='/'?html:await readFile('.'+path));
}catch{res.statusCode=404;res.end('{}');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
function emit(name,buffer){const b64=buffer.toString('base64');for(let i=0;i<b64.length;i+=6000)console.log('ZOOM_IMAGE '+name+' '+Math.floor(i/6000)+' '+b64.slice(i,i+6000));}
try{
 for(const [name,engine]of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:name!=='webkit'});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
   await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   const page=await context.newPage();await page.bringToFront();
   let navigations=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base,{waitUntil:'load'});await page.screenshot({type:'jpeg',quality:20});
   await page.waitForFunction(()=>document.querySelectorAll('.hj-folder-layer').length===6);
   const memory=()=>page.evaluate(()=>{
    const canvases=[...document.querySelectorAll('.hj-folder-layer')];
    return {count:canvases.length,pixels:canvases.reduce((n,c)=>n+c.width*c.height,0),maxWidth:Math.max(...canvases.map(c=>c.width)),shadows:canvases.filter(c=>c._paperShadow).length,ready:document.querySelectorAll('.hj-layer-ready').length};
   });
   async function checkMemory(){
    const m=await memory();assert.equal(m.count,6);assert.equal(m.ready,6);assert(m.pixels<=4*1024*1024,JSON.stringify(m));assert(m.maxWidth<=4096);assert.equal(m.shadows,0);return m;
   }
   console.log(name+' GRAPHICS '+JSON.stringify(await checkMemory()));
   await page.evaluate(()=>{
    document.querySelector('#league-hq').scrollIntoView();
    window.zoomSentinel={};window.zoomExpectedSentinel=window.zoomSentinel;
    document.querySelector('.av[data-manager="MISBA"]').click();
   });
   await page.waitForSelector('.manager-modal-overlay.is-open');await page.waitForTimeout(700);
   await page.evaluate(()=>{
    window.zoomCard=document.querySelector('.manager-modal-stage');
    const scroller=zoomCard.querySelector('.manager-modal-scroll')||zoomCard;
    scroller.scrollTop=100;window.zoomScroller=scroller;window.zoomScroll=scroller.scrollTop;window.zoomPageScroll=scrollY;
   });
   const initialNav=navigations;
   const cdp=name==='chromium'?await context.newCDPSession(page):null;
   async function setScale(scale){
    if(cdp)await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:scale});
    else await page.evaluate(scale=>{
     window.qaZoomScale=scale;
     Object.defineProperty(visualViewport,'scale',{configurable:true,get:()=>window.qaZoomScale});
     visualViewport.dispatchEvent(new Event('resize'));
    },scale);
    await page.waitForTimeout(100);
   }
   for(const scale of [2,5,1,4,1,3,5,1]){
    await setScale(scale);
    const state=await page.evaluate(()=>({
     sentinel:zoomSentinel===zoomExpectedSentinel,card:zoomCard===document.querySelector('.manager-modal-stage'),
     open:!!document.querySelector('.manager-modal-overlay.is-open'),scroll:zoomScroller.scrollTop,expected:zoomScroll,
     pageScroll:scrollY,expectedPage:zoomPageScroll,scale:visualViewport.scale,
     guarded:document.documentElement.classList.contains('hj-page-zoomed'),
     blur:getComputedStyle(document.querySelector('.manager-modal-overlay')).backdropFilter
    }));
    assert(state.sentinel&&state.card&&state.open,JSON.stringify(state));assert.equal(state.scroll,state.expected);
    assert.equal(state.pageScroll,state.expectedPage);
    assert.equal(state.guarded,scale>1,JSON.stringify(state));
    if(scale>1)assert.equal(state.blur,'none');
    assert.equal(navigations,initialNav);await checkMemory();
   }
   // The first second finger disables blur immediately, before viewport resize;
   // it also cancels a partially pulled card without any delayed snap animation.
   const multi=await page.evaluate(()=>{
    const target=document.querySelector('.manager-modal-title'),r=target.getBoundingClientRect();
    function touch(type,count,dy){
     const points=Array.from({length:count},(_,i)=>({identifier:i,target,clientX:r.left+30+i*50,clientY:r.top+10+dy}));
     const e=new Event(type,{bubbles:true,cancelable:true});
     Object.defineProperties(e,{touches:{value:points},targetTouches:{value:points},changedTouches:{value:points}});
     target.dispatchEvent(e);return e.defaultPrevented;
    }
    touch('touchstart',1,0);touch('touchmove',1,40);
    const blocked=touch('touchstart',2,40);
    const result={blocked,guarded:document.documentElement.classList.contains('hj-page-zoomed'),y:new DOMMatrixReadOnly(getComputedStyle(zoomCard).transform).m42};
    touch('touchend',0,40);return result;
   });
   assert.equal(multi.blocked,false);assert(multi.guarded);assert.equal(multi.y,0);
   // Page zoom changes pixel density. Exercise extreme density and orientation.
   if(cdp){
    for(const [width,height,dpr]of [[390,844,12],[844,390,8],[1440,900,6],[390,844,3]]){
     await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:true});
     await page.evaluate(()=>dispatchEvent(new Event('resize')));await page.waitForTimeout(180);
     console.log(name+' DENSITY '+dpr+' '+JSON.stringify(await checkMemory()));
     assert(await page.locator('.manager-modal-overlay.is-open').count());assert.equal(navigations,initialNav);
    }
   }
   await page.evaluate(()=>document.querySelector('.manager-modal-close').click());
   await page.waitForTimeout(400);
   await page.evaluate(()=>document.querySelector('.history-jump').click());
   await page.waitForSelector('.season-modal-overlay.is-open');await page.waitForTimeout(700);
   await page.evaluate(()=>{
    const b=document.createElement('button');b.className='pc-player-trigger';b.dataset.pcId='3918298';b.dataset.pcName='Josh Allen';b.dataset.pcTeam='BUF';b.dataset.pcPosition='QB';
    document.querySelector('.season-modal-scroll').prepend(b);pcOpen(b);
    window.zoomPlayer=document.querySelector('.pc-modal-overlay');window.zoomSeason=document.querySelector('.season-modal-overlay');
   });
   await page.waitForSelector('.pc-modal-overlay.is-open');
   for(const scale of [4,1,5,1]){
    await setScale(scale);
    assert(await page.evaluate(()=>zoomPlayer===document.querySelector('.pc-modal-overlay.is-open')&&zoomSeason===document.querySelector('.season-modal-overlay.is-open')));
    assert.equal(navigations,initialNav);
   }
   await page.evaluate(()=>document.querySelector('.pc-modal-close').click());
   await page.waitForTimeout(300);await page.evaluate(()=>document.querySelector('.season-modal-close').click());await page.waitForTimeout(400);
   await page.evaluate(()=>document.querySelector('#league-hq-tabs').scrollIntoView({block:'center'}));
   if(name==='chromium')emit('folder-tabs',await page.locator('#league-hq-tabs').screenshot({type:'jpeg',quality:70,scale:'css'}));
   console.log(name+' PASSED: bounded graphics; '+(cdp?'native page scaling':'simulated visual viewport scaling')+'; card and scroll retention; pinch cancels pull immediately; nested cards retained.');
   console.log(name+' PAGE_ERRORS '+JSON.stringify(errors));
  }finally{await browser.close();}
 }
}finally{await new Promise(r=>server.close(r));}
