import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const html=prepareSite(await fs.readFile('index.html','utf8'));
await fs.mkdir('gesture-proof',{recursive:true});
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://hungjurors.com/',r=>r.fulfill({contentType:'text/html',body:html}));
 await page.route('https://hungjurors.com/styles/**',async r=>{try{await r.fulfill({contentType:'text/css',body:await fs.readFile(new URL(r.request().url()).pathname.slice(1),'utf8')});}catch{await r.continue();}});
 await page.goto('https://hungjurors.com/#rosters',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('.hj-roster-rail')&&typeof HJ_CHALLENGE_STATE!=='undefined'&&HJ_CHALLENGE_STATE.model,{timeout:90000});
 await page.locator('#hq-tab-rosters').click();await page.waitForTimeout(800);
 for(const width of [390,844,390,1365]){
  await page.setViewportSize({width,height:width===844?390:900});await page.waitForTimeout(500);
  for(const selector of ['.hj-roster-rail','.hj-challenge-rail']){
   await page.locator(selector).scrollIntoViewIfNeeded();
   const info=await page.locator(selector).evaluate(el=>{const before=el.scrollLeft,w=el.clientWidth;const delta=before>w?-.8*w:.8*w;el.dispatchEvent(new WheelEvent('wheel',{deltaX:delta,bubbles:true,cancelable:true}));return {before,after:el.scrollLeft,delta};});
   assert(Math.abs(info.after-info.before-info.delta)<3,selector+' exact wheel distance '+JSON.stringify(info));
   await page.waitForTimeout(800);
   const geometry=await page.locator(selector).evaluate(el=>{const children=[...el.children],p=children.reduce((a,b)=>Math.abs(a.getBoundingClientRect().left-el.getBoundingClientRect().left)<Math.abs(b.getBoundingClientRect().left-el.getBoundingClientRect().left)?a:b);return {rail:el.clientHeight,page:p.getBoundingClientRect().height,padding:getComputedStyle(el).padding};});
   assert(Math.abs(geometry.rail-geometry.page)<3,'no height floor '+selector+' '+width+' '+JSON.stringify(geometry));assert.equal(geometry.padding,'0px');
  }
 }
 // A live refresh must preserve the persistent roster rail and its selection.
 const refresh=await page.evaluate(()=>{const rail=document.querySelector('.hj-roster-rail'),selected=HJ_LEAGUE_STATE.selectedTeamId;hjRenderLeague();return {same:rail===document.querySelector('.hj-roster-rail'),selected,after:HJ_LEAGUE_STATE.selectedTeamId};});assert(refresh.same);assert.equal(refresh.after,refresh.selected);
 await page.locator('#challenge-tab-lms').click();await page.waitForTimeout(650);
 assert.equal(await page.locator('#challenge-title').innerText(),'Last Man Standing');
 await page.evaluate(()=>hjRenderChallenge());await page.waitForTimeout(400);
 assert.equal(await page.locator('#challenge-out').count(),1);
 assert.equal(await page.locator('[data-hj-wheel-scroll]').count(),0);
 await page.locator('#challenge-title').scrollIntoViewIfNeeded();
 await page.screenshot({path:`gesture-proof/${engine.name()}-native-challenges.jpg`});
 for(const [label,selector] of [['challenges','#challenge-title'],['rosters','.hj-roster-rail']]){
  await page.setViewportSize({width:390,height:844});await page.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(500);
  const shot=await page.screenshot({type:'jpeg',quality:65});console.log('SCROLL_IMAGE '+engine.name()+'-'+label+' '+shot.toString('base64'));
 }
 assert(!errors.some(e=>/hjSectionRail|Cannot read properties|is not defined/.test(e)),errors.join('\n'));
 console.log(`PASS ${engine.name()}: actual prepared site, rotation, native containers, exact scroll distance, active page heights, real data refresh and unique active controls`);
 }finally{await browser.close();}
}
