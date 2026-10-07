import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  await page.setContent(`<style>body{margin:0;height:2400px}#league-hq,#challenges{width:900px;padding:12px}.league-team-view,.ch-card{height:60px}#challenge-out,.hj-wheel-challenge-out{height:220px}.rail{width:200px;overflow-x:auto}.rail>div{width:800px}.hj-team-photo{height:40px}.hq-matchup-list{display:flex;width:900px;overflow-x:auto;scroll-snap-type:x mandatory}.hq-matchup{flex:0 0 900px;height:70px;scroll-snap-align:start}</style><main id="league-hq"><section id="league-sync-content"><div>${[0,1,2].map(i=>`<button data-league-team="${i}" class="${i===0?'active':''}">${i}</button>`).join('')}</div><div class="league-team-view">Roster 0</div><div class="hj-team-photo">Players</div><div class="rail"><div>Roster rail</div></div></section><section id="hq-panel-matchups"><div class="hq-matchup-list">${[0,1,2].map(i=>`<article class="hq-matchup" data-hq-matchup-key="${i}">Matchup ${i}</article>`).join('')}</div></section></main><section id="challenges"><div id="challenge-strip"><button>Tab</button></div><div class="ch-card"><h4 class="ch-title">raffle</h4><p class="ch-rules">Rules</p><span class="ch-stamp">30</span></div><div id="challenge-out"></div></section>`);
  await page.evaluate(()=>{
   window.HJ_HQ_STATE={matchupFocusKey:'0'};window.hjCenterMatchupJumpChipV32=()=>{};
   window.HJ_LEAGUE_STATE={data:{teams:[0,1,2].map(id=>({id}))}};
   window.hjTeamViewHTML=team=>'Roster '+team.id;
   window.CHALLENGES=['raffle','lms','mvp'].map(id=>({id,label:id,rule:'Rules',prize:'30'}));window.HJ_CHALLENGE_STATE={active:'raffle'};
   window.hjChBodyHTML=ch=>'<p class="body">'+ch.id+'</p><div class="lms-view is-fit"><div class="lms-stage">Lineup</div></div><div class="rail"><div>Challenge rail</div></div>';
   window.selectChallenge=id=>{HJ_CHALLENGE_STATE.active=id;document.querySelector('.ch-title').textContent=id;document.querySelector('#challenge-out').innerHTML=hjChBodyHTML({id});};selectChallenge('raffle');
   document.querySelectorAll('[data-league-team]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-league-team]').forEach(t=>t.classList.toggle('active',t===b));document.querySelector('.league-team-view').textContent='Roster '+b.dataset.leagueTeam;}));
  });
  await page.addScriptTag({content:await fs.readFile('scripts/matchup-navigation.js','utf8')});
  const challenge=await fs.readFile('scripts/challenge-live.js','utf8');
  await page.addScriptTag({content:challenge.slice(challenge.indexOf('/* Horizontal challenge paging.'))});
  const roster=()=>page.locator('[data-league-team].active').getAttribute('data-league-team');
  const active=()=>page.evaluate(()=>HJ_CHALLENGE_STATE.active);
  async function delta(dx,dy=0){await page.mouse.wheel(dx,dy);await page.waitForTimeout(35);}
  async function settle(){await page.waitForTimeout(550);}
  for(const [selector,root,read,initial,next] of [['.league-team-view','#league-sync-content',roster,'0','1'],['.body','#challenges',active,'raffle','lms']]){
   await page.locator(selector).hover();
   await delta(80);assert.equal(await read(),initial,'80px must not trigger next-page navigation');
   const rail=page.locator(root+' [data-hj-wheel-scroll]');
   assert(Math.abs(await rail.evaluate(e=>e.scrollLeft-e.clientWidth)-80)<3,'content follows first 80px exactly');
   await delta(50);assert(Math.abs(await rail.evaluate(e=>e.scrollLeft-e.clientWidth)-130)<3,'continued movement follows pixels');
   await delta(-110);assert(Math.abs(await rail.evaluate(e=>e.scrollLeft-e.clientWidth)-20)<3,'reversal follows fingers immediately');
   await settle();assert.equal(await read(),initial,'short reversed gesture returns to same page');
   assert.equal(await rail.count(),0,'idle scroll layer removed');
   await page.locator(selector).hover();for(let i=0;i<8;i++)await delta(80);await settle();assert.equal(await read(),next,'sufficient physical distance reaches next page');
   await page.locator(selector).hover();for(let i=0;i<8;i++)await delta(-80);await settle();assert.equal(await read(),initial,'reverse reaches previous page');
   // A long gesture must retain every delta, rather than locking after one page.
   await page.locator(selector).hover();for(let i=0;i<20;i++)await delta(100);await settle();
   assert.equal(await read(),root==='#challenges'?'mvp':'2','long gesture traverses two pages');
   await page.locator(selector).hover();for(let i=0;i<6;i++)await delta(100);await settle();assert.equal(await read(),initial,'last wraps to first');
  }
  for(const selector of ['.hj-team-photo','#league-sync-content .rail>div','[data-league-team="0"]','#challenge-out .rail>div','#challenge-strip button']){
   const r=await roster(),a=await active();await page.locator(selector).hover();await delta(700);await settle();assert.equal(await roster(),r);assert.equal(await active(),a,'nested rails and controls retain ownership');
  }
  await page.evaluate(()=>document.querySelector('.lms-view').classList.remove('is-fit'));
  await page.locator('.lms-stage').hover();await delta(700);await settle();assert.equal(await active(),'raffle','zoomed lineup retains gesture');
  for(const selector of ['.league-team-view','.body']){
   await page.locator(selector).hover();await delta(3,90);await settle();assert.equal(await roster(),'0');assert.equal(await active(),'raffle','vertical scroll never changes page');
   const prevented=await page.locator(selector).evaluate(el=>{const e=new WheelEvent('wheel',{deltaX:700,ctrlKey:true,bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented;});assert.equal(prevented,false,'pinch is never intercepted');
  }
  await page.locator('.league-team-view').hover();await delta(120);await page.locator('[data-league-team="2"]').click();await settle();assert.equal(await roster(),'2','explicit selection cancels unfinished gesture');
  assert.equal(await page.locator('[data-hj-wheel-scroll]').count(),0);
  assert.equal(await page.locator('.league-team-view').evaluate(e=>e.style.opacity),'','original visibility restored');
  // The matchup rail already scrolls natively. During wheel input, its position
  // must remain intermediate and it must not obey a stale touch/button target.
  await page.locator('.hq-matchup-list').hover();
  for(let i=0;i<8;i++)await delta(30);
  const intermediate=await page.locator('.hq-matchup-list').evaluate(e=>e.scrollLeft);
  assert(intermediate>20&&intermediate<880,'matchup follows trackpad without snapping to a whole page mid-gesture');
  await settle();
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.league-team-view').hover();await delta(650);await settle();assert.equal(await roster(),'0','reduced motion still follows physical distance');
  console.log(`PASS ${engine.name()}: pixel-for-pixel movement, reversal, partial scroll, momentum, multiple pages, circular navigation, controls, vertical scroll, pinch, cancellation, native matchups and reduced motion`);
 }finally{await browser.close();}
}
