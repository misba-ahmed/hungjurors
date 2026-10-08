/* Phone rendering load: the page must be able to go idle.
 * Checks on the complete prepared site (Chromium and WebKit):
 *  - endless decorative loops animate only compositor properties
 *  - the Wire countdown tick creates no childList records (which would wake
 *    every body-wide decorator once per second)
 *  - a pinch-zoom resize (layout viewport unchanged) is not delivered to page
 *    resize handlers; an unzoomed resize still is
 *  - the oversized ESPN Jets logo is requested at the shared 500px size
 * Headless engines cannot reproduce an iPhone process crash; these guard the
 * measured causes of continuous load, not the crash itself.
 */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const html=prepareSite(await fs.readFile('index.html','utf8'));
assert(html.includes("abbr==='nyj'?'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/nyj.png&w=500&h=500'"),'Jets logo must use the 500px source');
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://hungjurors.com/',r=>r.fulfill({contentType:'text/html',body:html}));
  await page.route('https://hungjurors.com/styles/**',async r=>{try{await r.fulfill({contentType:'text/css',body:await fs.readFile(new URL(r.request().url()).pathname.slice(1),'utf8')});}catch{await r.continue();}});
  await page.goto('https://hungjurors.com/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof HJ_CHALLENGE_STATE!=='undefined'&&HJ_CHALLENGE_STATE.model,{timeout:90000});
  await page.waitForTimeout(4000);
  // Endless loops (sheens, halo, floats) must not animate layout or paint-only properties.
  const loops=await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.getTiming().iterations===Infinity).map(a=>({name:a.animationName,props:[...new Set(a.effect.getKeyframes().flatMap(k=>Object.keys(k)))].filter(p=>!['offset','easing','composite','computedOffset'].includes(p))})));
  const layoutLoops=loops.filter(l=>l.props.some(p=>/^(left|right|top|bottom|width|height|margin|padding|inset)/.test(p)));
  console.log('ENDLESS_LOOPS',engine.name(),JSON.stringify(loops));
  assert.deepEqual(layoutLoops,[],'endless loops must not animate layout properties');
  // Record idle childList churn (reported; live data may legitimately add nodes).
  const idle=await page.evaluate(async()=>{let records=0;const o=new MutationObserver(r=>records+=r.length);o.observe(document.body,{childList:true,subtree:true});
   await new Promise(r=>setTimeout(r,3200));o.disconnect();return {childList:records};});
  console.log('IDLE_CHILDLIST',engine.name(),JSON.stringify(idle));
  // The countdown ticks once per second. It must update digits in place.
  const countdown=await page.evaluate(async()=>{const node=document.querySelector('[data-wire-countdown]');if(!node)return null;
   let records=0;const o=new MutationObserver(r=>records+=r.filter(x=>x.type==='childList').length);o.observe(node,{childList:true,subtree:true});
   const before=[...node.querySelectorAll('.n')].map(n=>n.textContent).join(':');
   await new Promise(r=>setTimeout(r,2300));o.disconnect();return {records,before,after:[...node.querySelectorAll('.n')].map(n=>n.textContent).join(':')};});
  console.log('COUNTDOWN',engine.name(),JSON.stringify(countdown));
  if(countdown){assert.equal(countdown.records,0,'countdown digits must update without childList records');assert.notEqual(countdown.before,countdown.after,'countdown must still tick');}
  // Resize delivery: unzoomed resize reaches handlers; a zoom-only resize does not.
  const delivered=await page.evaluate(()=>{let n=0;const h=()=>n++;window.addEventListener('resize',h);
   window.dispatchEvent(new Event('resize'));const unzoomed=n;window.removeEventListener('resize',h);return unzoomed;});
  assert.equal(delivered,1,'an unzoomed resize must reach page handlers');
  if(engine===chromium){
   const cdp=await page.context().newCDPSession(page);
   await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2.5});await page.waitForTimeout(400);
   const zoomed=await page.evaluate(()=>{let n=0;const h=()=>n++;window.addEventListener('resize',h);window.dispatchEvent(new Event('resize'));window.removeEventListener('resize',h);return {n,scale:visualViewport.scale};});
   console.log('ZOOM_RESIZE',JSON.stringify(zoomed));
   assert(zoomed.scale>2,'browser zoom emulation must actually zoom');
   assert.equal(zoomed.n,0,'a pinch-zoom resize must not reach layout handlers');
   await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await page.waitForTimeout(400);
   const restored=await page.evaluate(()=>{let n=0;const h=()=>n++;window.addEventListener('resize',h);window.dispatchEvent(new Event('resize'));window.removeEventListener('resize',h);return n;});
   assert.equal(restored,1,'resize delivery resumes at 1x');
  }
  assert.deepEqual(errors,[],'page errors');
  console.log('PASS',engine.name()+': compositor-only loops, quiet countdown, zoom-only resize suppression, no page errors');
 }finally{await browser.close();}
}
