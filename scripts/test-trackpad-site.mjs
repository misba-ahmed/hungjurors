import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const html=prepareSite(await fs.readFile('index.html','utf8'));
const browser=await chromium.launch({headless:true});
await fs.mkdir('gesture-proof',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1365,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://hungjurors.com/',route=>route.fulfill({contentType:'text/html',body:html}));
 await page.route('https://hungjurors.com/styles/**',async route=>{
  const path=new URL(route.request().url()).pathname.slice(1);
  try{await route.fulfill({contentType:'text/css',body:await fs.readFile(path,'utf8')});}catch{await route.continue();}
 });
 await page.goto('https://hungjurors.com/#rosters',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('.league-roster-head')&&typeof HJ_CHALLENGE_STATE!=='undefined'&&HJ_CHALLENGE_STATE.model,{timeout:90000});
 await page.locator('#hq-tab-rosters').click();await page.locator('.league-roster-identity').scrollIntoViewIfNeeded();
 const before=await page.locator('[data-league-team].active').getAttribute('data-league-team');
 await page.evaluate(()=>{
  window.gestureFrames=[];
  document.addEventListener('wheel',e=>{
   const rail=document.querySelector('[data-hj-wheel-scroll]');if(!rail)return;
   const sample={delta:e.deltaX,offset:rail.scrollLeft-rail.clientWidth,time:performance.now()};gestureFrames.push(sample);
   requestAnimationFrame(()=>{sample.frameOffset=rail.scrollLeft-rail.clientWidth;sample.frameMs=performance.now()-sample.time;});
  });
 });
 const box=await page.locator('.league-roster-identity').boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.wheel(280,0);await page.waitForTimeout(40);
 const rail=page.locator('#league-sync-content [data-hj-wheel-scroll]');
 assert.equal(await rail.count(),1,'real roster creates scrolling rail');
 const position=await rail.evaluate(e=>({left:e.scrollLeft,width:e.clientWidth,height:e.clientHeight}));
 console.log('Roster movement',JSON.stringify(await page.evaluate(()=>gestureFrames)));
 await page.screenshot({path:'gesture-proof/roster-debug.png'});
 // Capture the input frame inside the page. Remote locator round-trips can
 // finish after the legitimate idle settle, especially on this large page.
 const movement=await page.evaluate(()=>gestureFrames[0]);
 assert(Math.abs(movement.offset-280)<4&&Math.abs(movement.frameOffset-280)<4,'real roster follows 280px on the input/render frame: '+JSON.stringify(movement));
 assert(position.height>400,'real artwork and lineup remain in scroll viewport');
 assert.equal(await page.locator('[data-league-team].active').getAttribute('data-league-team'),before,'selection stays put while fingers move');
 await fs.mkdir('gesture-proof',{recursive:true});
 await page.screenshot({path:'gesture-proof/roster-partial.png'});
 await page.waitForTimeout(550);
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 for(let i=0;i<10;i++){await page.mouse.wheel(90,0);await page.waitForTimeout(30);}
 await page.waitForTimeout(650);
 assert.notEqual(await page.locator('[data-league-team].active').getAttribute('data-league-team'),before,'real roster selects after sufficient scroll');
 assert.equal(await page.locator('[data-hj-wheel-scroll]').count(),0);
 await page.screenshot({path:'gesture-proof/roster-settled.png'});
 await page.locator('#challenge-tab-lms').click();await page.locator('#challenge-title').scrollIntoViewIfNeeded();
 const title=await page.locator('#challenge-title').boundingBox();await page.mouse.move(title.x+20,title.y+10);
 await page.evaluate(()=>{gestureFrames=[];});
 await page.mouse.wheel(280,0);await page.waitForTimeout(40);
 const challengeRail=page.locator('#challenges [data-hj-wheel-scroll]');
 assert.equal(await challengeRail.count(),1);
 const challengeMovement=await page.evaluate(()=>gestureFrames[0]);
 assert(Math.abs(challengeMovement.offset-280)<4&&Math.abs(challengeMovement.frameOffset-280)<4,'real challenge follows 280px on the input/render frame');
 await page.screenshot({path:'gesture-proof/challenge-partial.png'});
 await page.waitForTimeout(550);assert.equal(await page.locator('#challenge-title').innerText(),'Last Man Standing');
 await page.mouse.move(title.x+20,title.y+10);for(let i=0;i<9;i++){await page.mouse.wheel(90,0);await page.waitForTimeout(30);}
 await page.waitForTimeout(650);assert.equal(await page.locator('#challenge-title').innerText(),'The Titty Special');
 await page.screenshot({path:'gesture-proof/challenge-settled.png'});
 assert.equal(await page.locator('[data-hj-wheel-scroll]').count(),0);
 assert.equal(await page.locator('#challenge-out').evaluate(e=>e.style.opacity),'');
 assert(!errors.some(e=>/hjTrackpadScroll|hjChBodyHTML|Cannot read properties/.test(e)),errors.join('\n'));
 console.log('PASS: built site with real league data, actual roster/challenge markup, artwork, partial scrolling, settling and layer cleanup');
}finally{await browser.close();}
