import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const src=await fs.readFile('scripts/challenge-live.js','utf8'),code=src.slice(src.indexOf('/* Horizontal challenge paging.'));
assert(code.includes('function ownsGesture'));
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>#challenges{width:360px}.ch-card{height:60px}#challenge-out{height:400px}.lms-stage,.heat-wrap{width:300px;overflow-x:auto}.wide{width:800px}</style><section id="challenges"><div class="ch-top" id="challenge-strip"><button>Tab</button></div><div class="ch-card"><h2>Title</h2></div><div id="challenge-out"></div></section>');
 await page.evaluate(()=>{
  window.CHALLENGES=[{id:'raffle'},{id:'lms'},{id:'overachiever'}];window.HJ_CHALLENGE_STATE={active:'raffle'};
  window.selectChallenge=id=>{HJ_CHALLENGE_STATE.active=id;document.querySelector('#challenge-out').innerHTML='<p class="body">'+id+'</p><div class="lms-view is-fit"><div class="lms-stage"><span>Graphic</span></div></div><div class="heat-wrap"><div class="wide">Table</div></div>';};
  selectChallenge('raffle');
 });
 await page.addScriptTag({content:code});
 async function swipe(selector,dx,dy=0,options={}){
  return page.evaluate(({selector,dx,dy,options})=>{
   const target=document.querySelector(selector),make=(x,y,id=1)=>new Touch({identifier:id,target,clientX:x,clientY:y});
   const start=make(180,160),end=make(180+dx,160+dy);
   const fire=(type,touches,changed)=>target.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches,targetTouches:touches,changedTouches:changed}));
   fire('touchstart',[start],[start]);fire('touchmove',options.multi?[end,make(220,180,2)]:[end],[end]);
   const translated=document.querySelector('#challenge-out').style.translate;
   fire(options.cancel?'touchcancel':'touchend',[],[end]);return translated;
  },{selector,dx,dy,options});
 }
 const active=()=>page.evaluate(()=>HJ_CHALLENGE_STATE.active);
 assert((await swipe('.body',-100)).includes('-100'),'drag follows finger');await page.waitForTimeout(350);assert.equal(await active(),'lms');
 await swipe('.body',-100);await page.waitForTimeout(350);assert.equal(await active(),'overachiever');
 await swipe('.body',-100);await page.waitForTimeout(350);assert.equal(await active(),'raffle','last wraps to first');
 await swipe('.body',100);await page.waitForTimeout(350);assert.equal(await active(),'overachiever','first wraps to last');
 await swipe('.heat-wrap .wide',-100);await page.waitForTimeout(350);assert.equal(await active(),'overachiever','nested rail owns gesture even at edge');
 await page.evaluate(()=>document.querySelector('.lms-view').classList.remove('is-fit'));
 await swipe('.lms-stage span',-100);await page.waitForTimeout(350);assert.equal(await active(),'overachiever','zoomed graphic owns gesture');
 await swipe('.body',10,100);assert.equal(await active(),'overachiever','vertical page scroll');
 await swipe('.body',-100,0,{multi:true});assert.equal(await active(),'overachiever','multi-touch pinch');
 await swipe('.body',-100,0,{cancel:true});assert.equal(await active(),'overachiever','cancelled touch');
 assert.equal(await page.evaluate(()=>document.querySelector('#challenges').style.overflowX),'','overflow restored');
 await page.emulateMedia({reducedMotion:'reduce'});await swipe('.body',-100);assert.equal(await active(),'raffle','reduced motion');
 await page.close();
 const live=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await live.goto('https://hungjurors.com',{waitUntil:'domcontentloaded'});
 await live.waitForFunction(()=>typeof HJ_CHALLENGE_STATE!=='undefined'&&HJ_CHALLENGE_STATE.model,{timeout:60000});
 await live.addScriptTag({content:code});
 await live.evaluate(()=>selectChallenge(CHALLENGES[CHALLENGES.length-1].id));
 await live.evaluate(()=>{
  const target=document.querySelector('#challenges .ch-card h3')||document.querySelector('#challenge-title');
  const make=x=>new Touch({identifier:1,target,clientX:x,clientY:160}),a=make(250),b=make(100);
  for(const [type,t] of [['touchstart',a],['touchmove',b],['touchend',b]])target.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[t],changedTouches:[t]}));
 });
 await live.waitForTimeout(400);
 assert.equal(await live.evaluate(()=>HJ_CHALLENGE_STATE.active),await live.evaluate(()=>CHALLENGES[0].id),'live challenge wrap');
 console.log('PASS: drag feedback, next/previous wrap, nested rails, zoomed graphic ownership, vertical scroll, pinch, cancel, reduced motion, live-site challenge transition');
}finally{await browser.close();}
