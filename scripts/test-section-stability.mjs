import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const html=prepareSite(await fs.readFile('index.html','utf8'));
await fs.mkdir('gesture-proof',{recursive:true});
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://hungjurors.com/',r=>r.fulfill({contentType:'text/html',body:html}));
 await page.route('https://hungjurors.com/styles/**',async r=>{try{await r.fulfill({contentType:'text/css',body:await fs.readFile(new URL(r.request().url()).pathname.slice(1),'utf8')});}catch{await r.continue();}});
 await page.goto('https://hungjurors.com/#rosters',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('.hj-roster-rail')&&typeof HJ_CHALLENGE_STATE!=='undefined'&&HJ_CHALLENGE_STATE.model,{timeout:90000});
 await page.locator('#hq-tab-rosters').click();
 await page.waitForTimeout(2500);
 const metrics=()=>page.evaluate(()=>({rosters:document.querySelectorAll('.hj-roster-rail .league-roster-head').length,players:document.querySelectorAll('.hj-roster-rail .hj-team-photo-player').length,challenges:[...document.querySelector('.hj-challenge-rail').children].filter(c=>c.firstElementChild).length,nodes:document.querySelectorAll('*').length}));
 const initial=await metrics();console.log('INITIAL_METRICS',engine.name(),JSON.stringify(initial));assert(initial.rosters<=3);assert(initial.challenges<=3);
 // No-op live refreshes must not tear down inactive previews and restart observers.
 const churn=await page.evaluate(async()=>{let mutations=0;const observer=new MutationObserver(rs=>mutations+=rs.filter(r=>r.type==='childList').length);observer.observe(document.querySelector('.hj-challenge-rail'),{childList:true,subtree:true});for(let i=0;i<10;i++)hjRenderChallenge();await new Promise(r=>setTimeout(r,500));observer.disconnect();return mutations;});
 console.log('NOOP_REFRESH_MUTATIONS',engine.name(),churn);assert(churn<20,'unchanged challenge refresh must stay quiet');
 // Walk the player figures with real touch, keeping the same roster selected.
 const selected=await page.locator('[data-league-team].active').getAttribute('data-league-team');
 const active='.hj-roster-rail .hj-section-page:not([inert])';
 await page.locator(active+' .hj-team-photo').scrollIntoViewIfNeeded();
 const players=page.locator(active+' .hj-team-photo-player');
 await page.waitForFunction(()=>[...document.querySelectorAll('.hj-roster-rail .hj-section-page:not([inert]) .hj-team-photo-figure img')].every(img=>img.complete&&img.naturalWidth>0),{},{timeout:60000});
 for(let i=0;i<Math.min(8,await players.count());i++){await players.nth(i).tap();await page.waitForTimeout(60);}
 assert.equal(await page.locator('[data-league-team].active').getAttribute('data-league-team'),selected);
 if(engine===chromium){
  await page.evaluate(()=>{
   window.cascadeProof={players:new Set(),textWrites:0};
   window.cascadeObserver=new MutationObserver(records=>{
    for(const record of records){if(record.type==='childList')window.cascadeProof.textWrites++;}
    const selected=document.querySelector('.hj-team-photo-player.is-active');if(selected)window.cascadeProof.players.add(selected.dataset.teamPhotoPlayer);
   });
   window.cascadeObserver.observe(document.querySelector('.hj-roster-rail .hj-section-page:not([inert]) .hj-team-photo'),{attributes:true,childList:true,subtree:true});
  });
  const cdp=await page.context().newCDPSession(page);const b=await page.locator(active+' .hj-team-photo-stage').boundingBox();
  const y=Math.max(100,Math.min(730,b.y+b.height/2)),x=b.x+20;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=18;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*(b.width-40)/18,y}]});await page.waitForTimeout(16);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(250);
  const cascade=await page.evaluate(()=>{window.cascadeObserver.disconnect();return {players:window.cascadeProof.players.size,textWrites:window.cascadeProof.textWrites};});
  console.log('CASCADE_PROOF',JSON.stringify(cascade));
  assert(cascade.players>=4,'a finger sweep must actually select successive players, not just keep the tab alive');
  assert.equal(cascade.textWrites,0,'artwork selection must not wake global child-list observers');
  // Real browser pinch. The page must remain responsive at each scale.
  for(let i=0;i<3;i++){
   await cdp.send('Input.synthesizePinchGesture',{x:190,y:430,scaleFactor:1.35,relativeSpeed:400,gestureSourceType:'touch'});
   await page.waitForTimeout(250);assert(await page.locator('#league-hq').count());
   await cdp.send('Input.synthesizePinchGesture',{x:190,y:430,scaleFactor:1/1.35,relativeSpeed:400,gestureSourceType:'touch'});
  }
  await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
 }
 // Keep gestures and art enabled; exercise both challenge zoom controls and double tap.
 await page.locator('#challenge-tab-lms').click();
 await page.locator('#challenge-out .lms-stage').scrollIntoViewIfNeeded();
 for(let i=0;i<6;i++){
  // The actual markup advertises zoom/fit values; inspect the accessible pressed state.
  await page.locator('#challenge-out [data-lms-zoom]').evaluateAll(bs=>bs.find(b=>b.dataset.lmsZoom!=='fit').click());
  assert.equal(await page.locator('#challenge-out .lms-view').evaluate(e=>e.classList.contains('is-fit')),false);
  await page.locator('#challenge-out [data-lms-zoom="fit"]').click();
  assert.equal(await page.locator('#challenge-out .lms-view').evaluate(e=>e.classList.contains('is-fit')),true);
 }
 const stage=page.locator('#challenge-out .lms-stage');
 await stage.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(400);
 await page.evaluate(()=>{window.tapTrace=[];for(const type of ['pointerdown','pointerup','pointercancel'])document.addEventListener(type,e=>window.tapTrace.push({type,at:e.timeStamp,stage:!!e.target.closest('.lms-stage'),width:e.target.closest('.lms-view')?.clientWidth,x:e.clientX,y:e.clientY}),{capture:true});});
 const box=await stage.boundingBox(),tapX=box.x+box.width/2,tapY=box.y+box.height/2;
 await page.touchscreen.tap(tapX,tapY);await page.waitForTimeout(80);await page.touchscreen.tap(tapX,tapY);
 console.log('TAP_TRACE',engine.name(),JSON.stringify(await page.evaluate(()=>window.tapTrace)));
 const doubleTapZoomed=await page.locator('#challenge-out .lms-view').evaluate(e=>!e.classList.contains('is-fit')); 
 await page.locator('#challenge-out [data-lms-zoom="fit"]').click();
 // Repeated selection must release distant pages rather than retaining all old artwork.
 for(const id of ['mvp','optimizer','raffle','lms']){await page.locator('#challenge-tab-'+id).click();await page.waitForTimeout(500);}
 await page.evaluate(()=>hjRenderLeague());await page.waitForTimeout(600);
 const final=await metrics();console.log('FINAL_METRICS',engine.name(),JSON.stringify(final));assert(final.rosters<=3);assert(final.challenges<=3);
 const idle=await page.evaluate(async()=>{const mutations={};const observer=new MutationObserver(rs=>rs.forEach(r=>{const key=r.type+':'+r.target.nodeName+':'+(r.target.className||'')+':'+(r.attributeName||'');mutations[key]=(mutations[key]||0)+1;}));observer.observe(document.body,{childList:true,subtree:true,attributes:true});const times=[];let previous=performance.now();for(let i=0;i<30;i++)await new Promise(resolve=>requestAnimationFrame(now=>{times.push(now-previous);previous=now;resolve();}));observer.disconnect();return {max:Math.max(...times),slow:times.filter(n=>n>100).length,mutations:Object.entries(mutations).sort((a,b)=>b[1]-a[1]).slice(0,8)};});
 console.log('IDLE_FRAMES',engine.name(),JSON.stringify(idle));assert(idle.slow<6,'no sustained layout/observer loop');assert(idle.mutations.filter(([key])=>key.startsWith('childList:SPAN:hj-game-status:')).reduce((sum,[,count])=>sum+count,0)<20,'unchanged game statuses must not trigger an observer loop');
 assert(doubleTapZoomed,'double tap zoom');
 const note=await page.locator(active+' .league-matchup-score').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,blend:getComputedStyle(e).backgroundBlendMode}));assert.equal(note.bg,'rgb(249, 237, 215)');assert.equal(note.blend,'multiply');
 await page.locator('#hq-tab-rosters').click();await page.locator(active+' .league-matchup-score').scrollIntoViewIfNeeded();await page.waitForTimeout(400);
 const shot=await page.screenshot({type:'jpeg',quality:65});console.log('STABILITY_IMAGE '+engine.name()+' '+shot.toString('base64'));
 assert(!errors.some(e=>!/ResizeObserver/.test(e)),errors.join('\n'));
 console.log('PASS '+engine.name()+': bounded artwork, quiet refreshes, lineup taps, pinch, challenge zoom and double tap, stable frame loop, paper note blending');
 }finally{await browser.close();}
}

