import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.setContent(`<style>body{margin:0;height:2400px}#league-hq,#challenges{width:900px;padding:12px}.league-team-view,.ch-card{height:60px}#challenge-out{height:220px}.rail{width:200px;overflow-x:auto}.rail>div{width:800px}.hj-team-photo{height:40px}</style><main id="league-hq"><section id="league-sync-content"><div>${[0,1,2].map(i=>`<button data-league-team="${i}" class="${i===0?'active':''}">${i}</button>`).join('')}</div><div class="league-team-view">Roster body</div><div class="hj-team-photo">Players</div><div class="rail"><div>Roster rail</div></div></section></main><section id="challenges"><div id="challenge-strip"><button>Tab</button></div><div class="ch-card">Challenge title</div><div id="challenge-out"></div></section>`);
  await page.evaluate(()=>{
   window.HJ_HQ_STATE={};window.hjCenterMatchupJumpChipV32=()=>{};
   window.CHALLENGES=[{id:'raffle'},{id:'lms'},{id:'mvp'}];window.HJ_CHALLENGE_STATE={active:'raffle'};
   window.selectChallenge=id=>{HJ_CHALLENGE_STATE.active=id;document.querySelector('#challenge-out').innerHTML='<p class="body">'+id+'</p><div class="lms-view is-fit"><div class="lms-stage">Lineup</div></div><div class="rail"><div>Challenge rail</div></div>';};selectChallenge('raffle');
   document.querySelectorAll('[data-league-team]').forEach(b=>b.addEventListener('click',()=>document.querySelectorAll('[data-league-team]').forEach(t=>t.classList.toggle('active',t===b))));
  });
  await page.addScriptTag({content:await fs.readFile('scripts/matchup-navigation.js','utf8')});
  const challenge=await fs.readFile('scripts/challenge-live.js','utf8');
  await page.addScriptTag({content:challenge.slice(challenge.indexOf('/* Horizontal challenge paging.'))});
  const roster=()=>page.locator('[data-league-team].active').getAttribute('data-league-team');
  const active=()=>page.evaluate(()=>HJ_CHALLENGE_STATE.active);
  async function wheel(selector,dx,dy=0){await page.locator(selector).hover();await page.mouse.wheel(dx,dy);await page.waitForTimeout(360);}
  for(const [delta,expected]of [[80,'1'],[80,'2'],[80,'0'],[-80,'2']]){await wheel('.league-team-view',delta);assert.equal(await roster(),expected,'roster wheel direction/wrap');}
  for(const [delta,expected]of [[80,'lms'],[80,'mvp'],[80,'raffle'],[-80,'mvp']]){await wheel('.body',delta);assert.equal(await active(),expected,'challenge wheel direction/wrap');}
  // Momentum still arriving after the transition must not page a second time.
  for(const [selector,read,expected]of [['.league-team-view',roster,'0'],['.body',active,'raffle']]){
   await page.locator(selector).hover();await page.mouse.wheel(80,0);
   for(let i=0;i<8;i++){await page.waitForTimeout(70);await page.mouse.wheel(12,0);}
   await page.waitForTimeout(350);assert.equal(await read(),expected,'one page for an entire momentum burst');
  }
  for(const selector of ['.hj-team-photo','#league-sync-content .rail>div','[data-league-team="0"]','#challenge-out .rail>div','#challenge-strip button']){
   const r=await roster(),a=await active();await wheel(selector,100);assert.equal(await roster(),r,'nested roster/control ownership');assert.equal(await active(),a,'nested challenge/control ownership');
  }
  await page.evaluate(()=>document.querySelector('.lms-view').classList.remove('is-fit'));
  await wheel('.lms-stage',100);assert.equal(await active(),'raffle','zoomed lineup retains gesture');
  for(const selector of ['.league-team-view','.body']){
   const r=await roster(),a=await active();await wheel(selector,3,90);assert.equal(await roster(),r);assert.equal(await active(),a,'vertical scroll does not change section');
   await page.waitForTimeout(220);
   const prevented=await page.locator(selector).evaluate(el=>{const e=new WheelEvent('wheel',{deltaX:100,ctrlKey:true,bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented;});
   assert.equal(prevented,false,'pinch is never intercepted');assert.equal(await roster(),r);assert.equal(await active(),a);
   await page.waitForTimeout(250);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await wheel('.league-team-view',80);assert.equal(await roster(),'1');await wheel('.body',80);assert.equal(await active(),'lms');
  assert.equal(await page.locator('[data-hj-swipe-overlay]').count(),0,'roster transition cleaned up');
  assert.equal(await page.locator('#challenges').evaluate(el=>el.style.overflowX),'','challenge overflow restored');
  console.log(`PASS ${engine.name()}: desktop trackpad next/previous/wrap, momentum, nested rails, player showcase, controls, vertical scroll, pinch and reduced motion`);
 }finally{await browser.close();}
}
