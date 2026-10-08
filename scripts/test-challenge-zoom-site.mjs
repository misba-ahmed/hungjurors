import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const html=prepareSite(await fs.readFile('index.html','utf8'));
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://hungjurors.com/',r=>r.fulfill({contentType:'text/html',body:html}));
  await page.route('https://hungjurors.com/styles/**',async r=>r.fulfill({contentType:'text/css',body:await fs.readFile(new URL(r.request().url()).pathname.slice(1),'utf8')}));
  await page.route('https://hungjurors.com/assets/challenges/**',async r=>r.fulfill({contentType:'image/svg+xml',body:await fs.readFile(new URL(r.request().url()).pathname.slice(1))}));
  await page.goto('https://hungjurors.com/#challenges',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof HJ_CHALLENGE_STATE!=='undefined'&&HJ_CHALLENGE_STATE.model&&document.querySelector('.hj-challenge-rail'),{},{timeout:90000});
  for(const kind of ['raffle','lms','titty','mvp','overachiever','optimizer']){
   await page.locator('#challenge-tab-'+kind).click();
   await page.locator('#challenge-out .lms-stage').scrollIntoViewIfNeeded();
   await page.waitForTimeout(1300);
   const count=await page.locator('#challenge-out .lineup-figure').count();assert.equal(count,10);
   for(let i=0;i<3;i++){
    await page.locator('#challenge-out [data-lms-zoom="detail"]').tap();await page.waitForTimeout(650);
    assert.equal(await page.locator('#challenge-out .lineup').evaluate(e=>Math.round(e.getBoundingClientRect().width)),800);
    await page.locator('#challenge-out [data-lms-zoom="fit"]').tap();await page.waitForTimeout(650);
    assert(await page.locator('#challenge-out .lineup').evaluate(e=>e.getBoundingClientRect().width<390));
   }
   const stage=page.locator('#challenge-out .lms-stage');await stage.scrollIntoViewIfNeeded();
   const box=await stage.boundingBox(),x=box.x+box.width/2,y=Math.max(box.y+25,80);
   await page.touchscreen.tap(x,y);await page.waitForTimeout(80);await page.touchscreen.tap(x,y);await page.waitForTimeout(650);
   assert.equal(await page.locator('#challenge-out .lms-view').evaluate(e=>e.classList.contains('is-fit')),false,kind+' double tap on prepared site');
   assert.equal(await page.locator('#challenge-strip [aria-selected="true"]').getAttribute('data-challenge'),kind);
   console.log('PASS_SITE_ZOOM',engine.name(),kind);
  }
  assert(!errors.some(e=>!/ResizeObserver/.test(e)),errors.join('\n'));
 }finally{await browser.close();}
}
