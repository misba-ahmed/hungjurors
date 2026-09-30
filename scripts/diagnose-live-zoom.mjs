import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
let crashed=false;page.on('crash',()=>crashed=true);
try{
 await page.goto('https://hungjurors.com/?zoom-check=4',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(3000);
 await page.addStyleTag({content:readFileSync('styles/touch-rendering.css','utf8')});
 const rendered=await page.evaluate(()=>{
  const visible=e=>e.getClientRects().length>0;
  const plaques=[...document.querySelectorAll('.award-plaque-object')].filter(visible);
  return {coarse:matchMedia('(any-pointer:coarse)').matches,plaques:plaques.length,composited:plaques.filter(e=>getComputedStyle(e).willChange!=='auto'||getComputedStyle(e).transform!=='none').length,
   active:[...document.querySelectorAll('.award-bookcase-panel')].filter(visible).map(e=>e.dataset.awardPanel),
   overflow:document.documentElement.scrollWidth>innerWidth};
 });console.log('TOUCH_RENDERING '+JSON.stringify(rendered));
 assert(rendered.coarse);assert(rendered.plaques>0);assert.equal(rendered.composited,0);assert.deepEqual(rendered.active,['2025']);assert.equal(rendered.overflow,false);
 await page.evaluate(()=>document.querySelector('[data-award-year="2024"]').click());await page.waitForTimeout(200);
 assert.deepEqual(await page.locator('.award-bookcase-panel:visible').evaluateAll(es=>es.map(e=>e.dataset.awardPanel)),['2024']);
 await page.evaluate(()=>document.querySelector('[data-award-year="2025"]').click());
 for(const [button,overlay,back,close] of [
  ['.av[data-manager="MISBA"]','.manager-modal-overlay','.manager-modal-back','.manager-modal-close'],
  ['.history-jump','.season-modal-overlay','.season-modal-back','.season-modal-close'],
  ['.award-plaque-item.award-flip-card','.award-modal-overlay','.award-modal-back','.award-modal-close']
 ]){
  await page.evaluate(s=>document.querySelector(s).click(),button);await page.waitForTimeout(1000);
  assert(await page.locator(overlay).isVisible(),overlay+' open');
  assert(await page.locator(back).isVisible(),back+' readable');
  assert.equal(await page.locator(back).evaluate(e=>getComputedStyle(e).transform),'none');
  await page.evaluate(s=>document.querySelector(s).click(),close);await page.waitForTimeout(1000);
  assert.equal(await page.locator(overlay).count(),0,overlay+' closes');console.log('CARD_OK '+overlay);
 }
 const cdp=await page.context().newCDPSession(page);
 await page.evaluate(()=>{window.__zoomCheck=42;document.querySelector('#league-hq').scrollIntoView({behavior:'instant'})});
 for(const scale of [1,4,1,2,1]){await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:scale});await page.waitForTimeout(100)}
 assert.equal(await page.evaluate(()=>window.__zoomCheck),42);assert.equal(crashed,false);
 console.log('PASS live touch layouts, card controls, award year switch, page-scale cycle');
}finally{await browser.close()}
