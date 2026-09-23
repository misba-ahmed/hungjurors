import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8'),html=prepareSite(read('../index.html'));
const failures=[];
// Verify an actual browser page-scale change, in addition to keyboard-event traces.
{
 const browser=await chromium.launch();let page;
 try{
  page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><input id="hq-fa-search" style="font-size:11px">');
  await page.addScriptTag({content:read('./player-search.js')});
  await page.locator('#hq-fa-search').focus();
  const protocol=await page.context().newCDPSession(page);
  await protocol.send('Input.synthesizePinchGesture',{x:190,y:350,scaleFactor:1.6,gestureSourceType:'touch'});
  await page.waitForFunction(()=>visualViewport.scale>1.5);
  await page.locator('#hq-fa-search').press('Enter');
  await page.waitForFunction(()=>visualViewport.scale<=1.02,{},{timeout:2000});
  await page.waitForTimeout(500);
  assert.ok(await page.evaluate(()=>visualViewport.scale<=1.02),'Real page scale remains restored after temporary bounds are removed');
  console.log('Chromium: actual page zoom returns to its pre-search scale.');
 }catch(error){console.error('Actual scale check failed:',error.message,await page.evaluate(()=>({scale:visualViewport.scale,meta:document.querySelector('meta[name="viewport"]').content})));failures.push(error)}finally{await browser.close()}
}
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
  await page.addInitScript(()=>{
   const viewport=Object.assign(new EventTarget(),{width:390,height:844,scale:1,offsetTop:0,offsetLeft:0,pageTop:0,pageLeft:0});
   Object.defineProperty(window,'visualViewport',{value:viewport,configurable:true});
   window.testViewport=(scale,height)=>{viewport.scale=scale;viewport.height=height;viewport.dispatchEvent(new Event('resize'))};
  });
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.href==='https://hungjurors.test/')return route.fulfill({contentType:'text/html',body:html});
   if(url.pathname==='/styles/player-search.css'||url.pathname==='/styles/weekly-recap.css')return route.fulfill({contentType:'text/css',body:read('..'+url.pathname)});
   return route.abort();
  });
  await page.goto('https://hungjurors.test/',{waitUntil:'load'});await page.waitForTimeout(300);
  await page.evaluate(()=>{
   HJ_HQ_STATE.query='';HJ_HQ_STATE.activeTab='free-agents';
   window.searchRenders=0;hjRenderFreeAgentResults=()=>window.searchRenders++;
   const root=document.getElementById('league-hq-tools');
   root.innerHTML='<div id="hq-panel-free-agents" data-hq-panel="free-agents">'+hjFreeAgentControlsHTML()+'<button id="test-player" class="pc-player-trigger" '+ffnPlayerDataAttrs({id:'4430027',name:'Malik Nabers',team:'NYG',position:'WR'})+'>Malik Nabers</button></div>';
   const panels=document.querySelectorAll('[data-hq-panel]');panels.forEach(el=>el.hidden=el.id!=='hq-panel-free-agents');
   const cards=Array.from({length:6},(_,i)=>({id:String(i+1),name:'Player '+i,pos:'WR',points:20+i,proTeamId:1}));
   root.insertAdjacentHTML('beforeend','<div id="test-rails" class="rc">'+hjRcCardRow('Players of the week','',cards)+hjRcCardRow('Benchwarmers of the week','',cards)+'</div>');
  });
  const input=page.locator('#hq-fa-search'),clear=page.locator('[data-hj-search-clear]'),meta=page.locator('meta[name="viewport"]');
  const original=await meta.getAttribute('content');
  assert.ok(parseFloat(await input.evaluate(el=>getComputedStyle(el).fontSize))<16,'Native typing zoom remains enabled');
  assert.equal(await clear.isVisible(),false);
  const focus=async(base=1)=>{
   await page.evaluate(scale=>window.testViewport(scale,844/scale),base);
   await input.focus();
  };
  const keyboard=async(scale=1.6)=>page.evaluate(s=>window.testViewport(s,300/s),scale);
  const restored=async()=>{await page.waitForTimeout(500);assert.equal(await meta.getAttribute('content'),original,'Original zoom policy restored')};

  await focus();await input.fill('naber');await keyboard();
  assert.equal(await meta.getAttribute('content'),original,'No viewport restrictions while typing');
  assert.equal(await clear.isVisible(),true);
  await clear.click();
  assert.equal(await input.inputValue(),'');
  assert.equal(await clear.isVisible(),false);
  assert.equal(await input.evaluate(el=>el===document.activeElement),true,'Clear keeps typing focus');
  await page.waitForTimeout(140);
  assert.equal(await page.evaluate(()=>HJ_HQ_STATE.query),'','Clear updates the real player filter');
  await input.fill('naber');await input.press('Enter');
  assert.equal(await input.evaluate(el=>el===document.activeElement),false);
  await page.waitForFunction(()=>document.querySelector('meta[name="viewport"]').content.includes('maximum-scale=1'));
  await restored();

  await focus();await keyboard();
  await page.evaluate(()=>window.testViewport(1.6,844/1.6));
  assert.equal(await input.evaluate(el=>el===document.activeElement),false,'Keyboard dismissal without blur ends typing');
  assert.match(await meta.getAttribute('content'),/maximum-scale=1(?:,|$)/);
  await restored();

  await focus(1.25);await keyboard(1.8);await input.blur();
  await page.waitForFunction(()=>document.querySelector('meta[name="viewport"]').content.includes('maximum-scale=1.25'));
  await restored();

  await focus();await keyboard();
  await page.evaluate(()=>document.dispatchEvent(new Event('gesturestart')));
  await input.blur();
  assert.equal(await meta.getAttribute('content'),original,'Do not undo a deliberate pinch while typing');

  await focus();await page.evaluate(()=>window.testViewport(1,300));await input.blur();
  assert.equal(await meta.getAttribute('content'),original,'No zoom change when keyboard only resizes viewport');

  await focus();await keyboard();
  await page.locator('#test-player').click();
  await page.waitForSelector('.pc-modal-overlay');
  await page.waitForFunction(()=>document.querySelector('meta[name="viewport"]').content.includes('maximum-scale=1'));
  assert.equal(await input.evaluate(el=>el===document.activeElement),false);
  await restored();
  await page.evaluate(()=>pcClose());
  await page.waitForSelector('.pc-modal-overlay',{state:'detached'});

  await input.fill('allen');await input.blur();await restored();
  await clear.click();assert.equal(await input.inputValue(),'');
  assert.equal(await input.evaluate(el=>el===document.activeElement),false,'Clearing from outside does not summon keyboard');

  const rows=page.locator('#test-rails .rc-cards');
  assert.equal(await rows.count(),2);
  for(const row of await rows.all()){
   const result=await row.evaluate(el=>{
    const style=getComputedStyle(el);el.scrollLeft=100;
    return {background:style.backgroundColor,image:style.backgroundImage,border:style.borderTopWidth,scrollbar:style.scrollbarWidth,webkit:getComputedStyle(el,'::-webkit-scrollbar').display,scroll:el.scrollLeft};
   });
   assert.equal(result.background,'rgba(0, 0, 0, 0)');
   assert.equal(result.image,'none');assert.equal(result.border,'0px');
   assert.ok(result.scrollbar==='none'||result.webkit==='none','Scrollbar hidden');
   assert.ok(result.scroll>0,'Cards still scroll sideways');
  }
  console.log(name+': clear search, typing zoom preservation, Enter, keyboard dismissal, profile opening, pinch preservation and transparent swipeable recap rows passed.');
 }catch(error){console.error(name+' keyboard trace failed:',error);failures.push(error)}finally{await browser.close()}
}

assert.equal(failures.length,0,'All browser checks pass');
