import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const core=await fs.readFile('scripts/section-scroll.js','utf8'),adapters=await fs.readFile('scripts/matchup-navigation.js','utf8'),css=await fs.readFile('styles/section-scroll.css','utf8');
for(const engine of [chromium,webkit])for(const mobile of [false,true]){
 const browser=await engine.launch();
 try{
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1365,height:950},isMobile:mobile,hasTouch:mobile}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:12px;font:16px sans-serif}main,section{min-width:0}.hq-matchup-list{display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;align-items:flex-start;height:var(--hj-matchup-height,auto)}.hq-matchup{flex:0 0 100%;scroll-snap-align:start;scroll-snap-stop:always}.league-team-view{padding:14px 0 0}.content{height:150px;background:#eee}.tall{height:340px}.nested{width:150px;overflow:auto}.nested>div{width:500px;height:30px}.ch-card{margin:0 0 16px;padding:0}.hj-team-photo{height:40px}button{min-height:30px}${css}</style><main id="league-hq"><section id="league-sync-content"><div class="league-team-rail">${[0,1,2].map(i=>`<button data-league-team="${i}" class="${i===0?'active':''}">Manager ${i}</button>`).join('')}</div><div class="hj-section-rail hj-roster-rail">${[0,1,2].map(i=>`<div class="league-team-view hj-section-page" data-hj-roster-team="${i}"><div class="content ${i===1?'tall':''}">Roster ${i}</div><div class="hj-team-photo">Player showcase</div><div class="nested"><div>Nested roster</div></div></div>`).join('')}</div></section><section id="hq-panel-matchups">${[0,1,2].map(i=>`<button data-hq-matchup-jump="${i}">Matchup ${i}</button>`).join('')}<div class="hq-matchup-list">${[0,1,2].map(i=>`<article class="hq-matchup" data-hq-matchup-key="${i}"><div class="content ${i===1?'tall':''}">Matchup ${i}</div><div class="nested"><div>Nested matchup</div></div></article>`).join('')}</div></section></main><section id="challenges"><div id="challenge-strip">${['raffle','lms','mvp'].map(id=>`<button data-challenge="${id}">${id}</button>`).join('')}</div><div class="ch-card" id="challenge-card"><h4 class="ch-title" id="challenge-title">raffle</h4><p class="ch-rules">Rules</p><span class="ch-stamp">30</span><button class="ch-rules-toggle">Full rules</button></div><div id="challenge-out"></div></section>`);
 await page.evaluate(()=>{
  window.HJ_HQ_STATE={matchupFocusKey:'0'};window.hjCenterMatchupJumpChipV32=()=>{};
  window.HJ_LEAGUE_STATE={selectedTeamId:'0',data:{teams:[0,1,2].map(id=>({id}))}};window.hjTeamViewHTML=team=>`<div class="content ${team.id===1?'tall':''}">Roster ${team.id}</div><div class="hj-team-photo">Player showcase</div><div class="nested"><div>Nested roster</div></div>`;window.HJ_LEAGUE_TEAM_KEY='test';
  window.CHALLENGES=['raffle','lms','mvp'].map(id=>({id,label:id,rule:'Rules',prize:'30'}));window.HJ_CHALLENGE_STATE={active:'raffle'};
  window.hjChBodyHTML=ch=>`<div class="content ${ch.id==='lms'?'tall':''}">${ch.id}</div><details><summary>Week detail</summary><div style="height:150px">Scores</div></details><div class="nested"><div>Nested challenge</div></div>`;
  window.hjRenderChallenge=()=>{document.querySelector('#challenge-out').innerHTML=hjChBodyHTML({id:HJ_CHALLENGE_STATE.active});};
  window.selectChallenge=id=>{HJ_CHALLENGE_STATE.active=id;document.querySelector('#challenge-title').textContent=id;hjRenderChallenge();};selectChallenge('raffle');
  document.querySelector('#challenge-strip').addEventListener('click',e=>{if(e.target.dataset.challenge)selectChallenge(e.target.dataset.challenge);});
 });
 await page.evaluate(()=>document.getElementById('league-sync-content').hidden=true);
 await page.addScriptTag({content:core+'\n'+adapters});
 await page.evaluate(()=>document.getElementById('league-sync-content').hidden=false);await page.waitForTimeout(400);
 const rails=['.hq-matchup-list','.hj-roster-rail','.hj-challenge-rail'];
 async function wheel(selector,dx){await page.locator(selector).evaluate((el,dx)=>el.dispatchEvent(new WheelEvent('wheel',{deltaX:dx,bubbles:true,cancelable:true})),dx);}
 async function height(selector){const r=await page.locator(selector).evaluate(el=>{const pages=[...el.children],p=pages.reduce((a,b)=>Math.abs(a.getBoundingClientRect().left-el.getBoundingClientRect().left)<Math.abs(b.getBoundingClientRect().left-el.getBoundingClientRect().left)?a:b);return {rail:el.clientHeight,page:p.getBoundingClientRect().height,padding:getComputedStyle(el).padding};});assert(Math.abs(r.rail-r.page)<2,selector+' only selected height '+JSON.stringify(r));assert.equal(r.padding,'0px');}
 for(const selector of rails){
  const rail=page.locator(selector),width=await rail.evaluate(e=>e.clientWidth);
  await wheel(selector,80);assert(Math.abs(await rail.evaluate(e=>e.scrollLeft)-80)<2,selector+' pixel follow');
  await wheel(selector,-50);assert(Math.abs(await rail.evaluate(e=>e.scrollLeft)-30)<2,selector+' reversal');
  await page.waitForTimeout(650);assert(await rail.evaluate(e=>e.scrollLeft)<2);
  await wheel(selector,width*.8);await page.waitForTimeout(650);await height(selector);
  assert(Math.abs(await rail.evaluate(e=>e.scrollLeft)-width)<3,selector+' next');
  await wheel(selector,width*.8);await page.waitForTimeout(650);await height(selector);
  assert(Math.abs(await rail.evaluate(e=>e.scrollLeft)-width*2)<3,selector+' shorter page');
  await wheel(selector,-width*1.7);await page.waitForTimeout(650);await height(selector);
  const prevented=await rail.locator('.nested').first().evaluate(el=>{const e=new WheelEvent('wheel',{deltaX:90,bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented;});assert.equal(prevented,false,'nested rail owns wheel');
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(400);await height(selector);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);await height(selector);
  await wheel(selector,300);await page.waitForTimeout(650);assert(await rail.evaluate(e=>e.scrollLeft)>300,'scroll after orientation');
  await wheel(selector,-300);await page.waitForTimeout(650);
 }
 if(engine===chromium&&mobile){
  const cdp=await page.context().newCDPSession(page);
  async function swipe(selector,direction=-1){await page.locator(selector).scrollIntoViewIfNeeded();const b=await page.locator(selector).boundingBox(),x=direction<0?b.x+b.width-35:b.x+35,y=b.y+60;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+direction*i*25,y}]});await page.waitForTimeout(16);}
   const left=await page.locator(selector).evaluate(e=>e.scrollLeft);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(700);return left;
  }
  for(const selector of rails){
   // Start each at its first page, then test native motion after repeated rotations.
   await wheel(selector,-2000);await page.waitForTimeout(650);
   for(let turn=0;turn<2;turn++){
    await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300);
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
    const during=await swipe(selector);assert(during>20,'native finger scroll after rotation '+selector);await height(selector);
    await swipe(selector,1);assert(await page.locator(selector).evaluate(e=>e.scrollLeft)<2);
   }
   await swipe(selector,1);assert(await page.locator(selector).evaluate(e=>e.scrollLeft)>600,'circular first-to-last');
   await swipe(selector,-1);assert(await page.locator(selector).evaluate(e=>e.scrollLeft)<2,'circular last-to-first');
  }
 }
 await page.locator('#challenge-out summary').click();await page.waitForTimeout(350);await height('.hj-challenge-rail');
 await page.locator('#challenge-out summary').click();await page.waitForTimeout(350);await height('.hj-challenge-rail');
 assert.equal(await page.locator('[data-hj-wheel-scroll]').count(),0,'no temporary scroll layers');assert.deepEqual(errors,[]);
 console.log(`PASS ${engine.name()} ${mobile?'mobile':'desktop'}: shared scrolling, reversals, rotation recovery, native touch, circular paging, nested ownership and exact selected-page heights`);
 }finally{await browser.close();}
}
