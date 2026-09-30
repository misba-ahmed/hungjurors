import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><section id="league-hq"><span class="hj-player-search"><input id="hq-fa-search"><button data-hj-search-clear hidden>Clear</button></span><button id="outside">Outside</button></section>');
  await page.addStyleTag({content:read('../styles/player-search.css')+read('../styles/zoom-safety.css')});
  await page.addScriptTag({content:read('./player-search.js')});
  await page.evaluate(()=>{
   window.viewportChanges=[];
   new MutationObserver(records=>records.forEach(r=>viewportChanges.push(r.target.content))).observe(document.querySelector('meta[name="viewport"]'),{attributes:true,attributeFilter:['content']});
   window.inputEvents=0;document.querySelector('#hq-fa-search').addEventListener('input',()=>inputEvents++);
  });
  const input=page.locator('#hq-fa-search'),clear=page.locator('[data-hj-search-clear]');
  assert(Number.parseFloat(await input.evaluate(el=>getComputedStyle(el).fontSize))>=16);
  await input.fill('Allen');assert(await clear.isVisible());
  await clear.click();assert.equal(await input.inputValue(),'');assert(await input.evaluate(el=>el===document.activeElement));
  assert.equal(await page.evaluate(()=>inputEvents),2);
  await input.fill('Nacua');
  const cdp=name==='Chromium'?await page.context().newCDPSession(page):null;
  if(cdp)await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
  await input.press('Enter');assert(!(await input.evaluate(el=>el===document.activeElement)));
  if(cdp){assert((await page.evaluate(()=>visualViewport.scale))>1.9);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});}
  await clear.click();assert.equal(await input.inputValue(),'');assert(!(await input.evaluate(el=>el===document.activeElement)));
  await input.focus();await page.evaluate(()=>visualViewport.dispatchEvent(new Event('resize')));await input.blur();
  await page.waitForTimeout(400);
  assert.deepEqual(await page.evaluate(()=>viewportChanges),[],'Typing, clearing, Enter and zoom never rewrite viewport bounds');
  console.log(name+': search remains functional and never changes native zoom limits.');
 }finally{await browser.close();}
}
