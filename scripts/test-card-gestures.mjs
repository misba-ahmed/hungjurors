import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,extname} from 'node:path';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
import {extractSiteArtwork} from './site-artwork.mjs';
const source=await readFile('index.html','utf8'),html=prepareSite(source);
assert(!html.includes('g.peak-dy>25'));
assert(!html.includes('Header-only touch dismissal'));
assert.equal((html.match(/id="hj-card-pull-close"/g)||[]).length,1);
for(const [name,bytes]of extractSiteArtwork(source).assets){await mkdir(dirname(name),{recursive:true});await writeFile(name,bytes);}
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://local').pathname;
 res.setHeader('Content-Type',path==='/'?'text/html':extname(path)==='.css'?'text/css':extname(path)==='.js'?'text/javascript':extname(path)==='.png'?'image/png':'application/json');
 res.end(path==='/'?html:await readFile('.'+path));
}catch{res.statusCode=404;res.end('{}');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
function emit(name,buffer){const b64=buffer.toString('base64');for(let i=0;i<b64.length;i+=6000)console.log('SWIPE_IMAGE '+name+' '+Math.floor(i/6000)+' '+b64.slice(i,i+6000));}
try{
 for(const [engineName,engine]of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch();
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof window.hjCardGestureClosing==='function');
   const touch=async(type,dy=0,dx=0,count=1)=>page.evaluate(({type,dy,dx,count})=>{
    const p=window.testTouch;const point=new Touch({identifier:1,target:p.target,clientX:p.x+dx,clientY:p.y+dy});
    const points=count===2?[point,new Touch({identifier:2,target:p.target,clientX:p.x+40,clientY:p.y})]:[point];
    const e=new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'||type==='touchcancel'?[]:points,targetTouches:type==='touchend'||type==='touchcancel'?[]:points,changedTouches:[point]});
    p.target.dispatchEvent(e);return e.defaultPrevented;
   },{type,dy,dx,count});
   const begin=async(selector)=>{await page.evaluate(selector=>{
    const target=document.querySelector(selector);if(!target)throw Error('Missing '+selector);
    const r=target.getBoundingClientRect();window.testTouch={target,x:r.left+Math.min(r.width/2,100),y:r.top+Math.min(r.height/2,32)};
   },selector);await touch('touchstart');};
   const position=selector=>page.locator(selector).evaluate(el=>{const t=getComputedStyle(el).translate.split(/\s+/);return t.length>1?parseFloat(t[1])||0:0;});
   const sleep=ms=>page.waitForTimeout(ms);
   const openManager=async()=>{
    await page.evaluate(()=>document.querySelector('.av[data-manager="MISBA"]').click());
    await page.waitForSelector('.manager-modal-overlay.is-open');await sleep(750);
   };
   await openManager();
   const card='.manager-modal-stage',heading='.manager-modal-title';
   const scrollBefore=await page.evaluate(()=>scrollY);
   // There is no animation between touch movement and the card's rendered position.
   await begin(heading);await touch('touchmove',70);assert.equal(await position(card),70);
   await touch('touchmove',30);assert.equal(await position(card),30,'Reversing keeps the gesture');
   await touch('touchmove',110);assert.equal(await position(card),110);
   await touch('touchmove',20);await sleep(100);await touch('touchend',20);
   await sleep(260);assert.equal(await position(card),0);assert.equal(await page.locator(card).count(),1);
   // Grab a settling card before it returns; there must be no jump to rest.
   await begin(heading);await touch('touchmove',60);await sleep(130);await touch('touchend',60);
   await sleep(35);const settling=await position(card);assert(settling>0&&settling<60,'Snap animation position: '+settling);
   await begin(heading);const caught=await position(card);assert(caught>=0&&caught<=settling+3);
   await touch('touchmove',35);assert(Math.abs((await position(card))-caught-35)<2);
   await touch('touchcancel');await sleep(230);
   // Headers drag even when the card body is scrolled; body scrolls stay native.
   await page.locator('.manager-modal-scroll').evaluate(el=>el.scrollTop=150);
   await begin('.manager-modal-scroll');assert.equal(await touch('touchmove',80),false);assert.equal(await position(card),0);await touch('touchend',80);
   await begin(heading);assert.equal(await touch('touchmove',45),true);assert.equal(await position(card),45);
   await touch('touchstart',45,0,2);await sleep(240);assert.equal(await position(card),0);
   await page.locator('.manager-modal-scroll').evaluate(el=>el.scrollTop=0);
   await begin('.manager-modal-scroll');assert.equal(await touch('touchmove',40,100),false);await touch('touchend',40,100);assert.equal(await position(card),0);
   await begin('.manager-modal-scroll');assert.equal(await touch('touchmove',-70),false);await touch('touchend',-70);
   // Body at its top is also a dismissal surface.
   await begin('.manager-modal-scroll');await touch('touchmove',55);assert.equal(await position(card),55);await touch('touchcancel');await sleep(230);
   assert.equal(await page.evaluate(()=>scrollY),scrollBefore);
   // A fast deliberate flick closes without the old minimum 120ms hold.
   await begin(heading);await sleep(18);await touch('touchmove',34);await sleep(15);await touch('touchmove',70);await touch('touchend',70);
   await page.waitForSelector(card,{state:'detached',timeout:500});assert.equal(await page.evaluate(()=>document.body.classList.contains('manager-modal-open')),false);
   console.log(engineName+': manager 1:1 movement, reversals, regrab, scroll arbitration, multitouch and flick passed');
   // Actual season and award cards, and an actual player nested over the season.
   await page.evaluate(()=>document.querySelector('.history-jump').click());
   await page.waitForSelector('.season-modal-overlay.is-open');await sleep(800);
   await page.evaluate(()=>{const b=document.createElement('button');b.id='qa-player';b.className='pc-player-trigger';b.dataset.pcId='3918298';b.dataset.pcName='Josh Allen';b.dataset.pcTeam='BUF';b.dataset.pcPosition='QB';document.querySelector('.season-modal-scroll').prepend(b);pcOpen(b);});
   await page.waitForSelector('.pc-modal-overlay.is-open');await sleep(400);
   await begin('.pc-season-select');assert.equal(await touch('touchmove',150),false);await touch('touchend',150);assert.equal(await position('.pc-modal'),0);
   await begin('.pc-modal-title');await touch('touchmove',170);
   if(engineName==='webkit')emit('player-drag',await page.screenshot({type:'jpeg',quality:75}));
   await sleep(140);await touch('touchend',170);await page.waitForSelector('.pc-modal',{state:'detached',timeout:500});
   assert.equal(await page.locator('.season-modal-stage').count(),1);
   assert(await page.evaluate(()=>document.body.classList.contains('season-modal-open')));
   assert.equal(await page.evaluate(()=>document.activeElement.id),'qa-player');
   await begin('.season-modal-title');await touch('touchmove',180);await sleep(140);await touch('touchend',180);
   await page.waitForSelector('.season-modal-stage',{state:'detached',timeout:500});
   assert(!await page.evaluate(()=>document.body.classList.contains('season-modal-open')));
   // Existing tap-close still works and isn't swallowed after another touch starts.
   await openManager();await page.locator('.manager-modal-close').click();await page.waitForSelector(card,{state:'detached',timeout:1200});
   const award=page.locator('.award-flip-card').first();
   if(await award.count()){
    await award.evaluate(el=>el.click());await page.waitForSelector('.award-modal-stage.is-flipped');await sleep(750);
    await begin('.award-modal-title');await touch('touchmove',160);await sleep(140);await touch('touchend',160);
    await page.waitForSelector('.award-modal-stage',{state:'detached',timeout:500});
   }else throw Error('Actual award card missing');
   // Expanded schedule cards keep the original card, returning it to its front.
   await page.evaluate(()=>{clearTimeout(nflScheduleTimer);NFL_WEEK1=NFL_WEEK1_EMBEDDED.map(g=>({...g}));renderNFLWeekSchedule();openGameCard(document.querySelector('.nfl-game'));});
   await page.waitForSelector('.nfl-game.is-open',{timeout:1500});await sleep(650);
   await begin('.nfl-game.is-open .nfl-depth-meta');await touch('touchmove',170);await sleep(140);await touch('touchend',170);
   await page.waitForSelector('.nfl-game.is-open',{state:'detached',timeout:500});
   assert(await page.locator('.nfl-game').count()>0);
   // Wire uses its real close callback too.
   await page.evaluate(()=>{const c=document.createElement('article');c.className='wc';c.innerHTML='<h2 class="wc-title">Gesture check</h2><p>Expanded feed card</p>';wireOpenExpanded(c);});
   await page.waitForSelector('.wire-expanded-overlay.is-open');
   await begin('.wire-expanded-stage .wc-title');await touch('touchmove',170);await sleep(140);await touch('touchend',170);await page.waitForSelector('.wire-expanded-overlay',{state:'detached',timeout:500});
   // The nested draft drawer closes itself without dismissing its manager.
   await openManager();
   await page.evaluate(()=>hjOpenManagerDraftDetail(document.querySelector('.manager-modal-back'),'MISBA',2025));
   await begin('.manager-draft-title');await touch('touchmove',170);await sleep(140);await touch('touchend',170);
   await page.waitForSelector('.manager-draft-detail',{state:'detached',timeout:500});assert.equal(await page.locator(card).count(),1);
   await page.emulateMedia({reducedMotion:'reduce'});
   await begin(heading);await touch('touchmove',180);await touch('touchend',180);assert.equal(await page.locator(card).count(),0);
   console.log(engineName+': player, season, award, Wire, nested draft, focus, tap-close and reduced motion passed');
   // Test a native browser touch stream as well as deterministic cross-engine events.
   if(engineName==='chromium'){
    await page.emulateMedia({reducedMotion:'no-preference'});await openManager();
    const client=await context.newCDPSession(page);
    const r=await page.locator(heading).boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=6;i++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+i*25}]});await sleep(16);}
    assert((await position(card))>130);
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForSelector(card,{state:'detached',timeout:500});
    console.log('chromium: native touch stream passed');
   }
   const gestureErrors=errors.filter(e=>/gesture|hjCard|Touch|translate|SyntaxError/.test(e));
   assert.deepEqual(gestureErrors,[]);console.log(engineName+' page errors: '+JSON.stringify(errors.slice(0,8)));
   await context.close();
  }finally{await browser.close();}
 }
 console.log('CARD_GESTURES_PASSED');
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
