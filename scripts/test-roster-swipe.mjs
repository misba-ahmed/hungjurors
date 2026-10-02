import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<style>.hq-matchup-list{display:flex;width:360px;overflow-x:auto}.hq-matchup{min-width:360px;height:100px}.hq-edge-grid{width:100px;overflow:auto}.hq-edge-grid>div{width:500px}</style><main id="league-hq"><section id="league-sync-content"><div>'+[0,1,2].map(i=>'<button class="league-team-tab '+(i===0?'active':'')+'" data-league-team="'+i+'">'+i+'</button>').join('')+'</div><div id="roster-body">Roster</div><div class="hj-team-photo">Players</div><div class="hq-edge-grid"><div>Nested roster rail</div></div></section><section id="hq-panel-matchups">'+[0,1,2].map(i=>'<button data-hq-matchup-jump="'+i+'">matchup '+i+'</button>').join('')+'<div class="hq-matchup-list">'+[0,1,2].map(i=>'<article class="hq-matchup" data-hq-matchup-key="'+i+'"><div class="hq-edge-grid"><div>Nested preview</div></div>Matchup</article>').join('')+'</div></section></main>');
 await page.evaluate(()=>{
  window.HJ_HQ_STATE={matchupFocusKey:'0'};window.hjCenterMatchupJumpChipV32=()=>{};
  document.querySelectorAll('[data-league-team]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-league-team]').forEach(t=>t.classList.toggle('active',t===b));}));
  window.swipe=(selector,dx,dy=0,multi=false)=>{
   const el=document.querySelector(selector),point=(x,y)=>({clientX:x,clientY:y});
   const fire=(type,touches,changed)=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperties(e,{touches:{value:touches},changedTouches:{value:changed}});el.dispatchEvent(e);};
   fire('touchstart',[point(180,150)],[]);
   if(multi)fire('touchstart',[point(180,150),point(200,170)],[]);
   fire('touchmove',[point(180+dx,150+dy)],[point(180+dx,150+dy)]);
   fire('touchend',[],[point(180+dx,150+dy)]);
  };
 });
 await page.addScriptTag({content:await fs.readFile('scripts/matchup-navigation.js','utf8')});
 const roster=()=>page.locator('[data-league-team].active').getAttribute('data-league-team');
 for(const [dx,expected]of [[80,'2'],[-80,'0'],[-80,'1']]){
  await page.evaluate(dx=>swipe('#roster-body',dx),dx);assert.equal(await roster(),expected);
 }
 for(const target of ['.hj-team-photo','#league-sync-content .hq-edge-grid>div']){
  await page.evaluate(target=>swipe(target,-80),target);assert.equal(await roster(),'1','nested gesture');
 }
 await page.evaluate(()=>swipe('#roster-body',10,90));assert.equal(await roster(),'1','vertical scroll');
 await page.evaluate(()=>swipe('#roster-body',-80,0,true));assert.equal(await roster(),'1','pinch');
 for(const [dx,expected]of [[80,'2'],[-80,'0'],[-80,'1']]){
  await page.evaluate(dx=>swipe('.hq-matchup-list',dx),dx);await page.waitForTimeout(210);
  assert.equal(await page.evaluate(()=>HJ_HQ_STATE.matchupFocusKey),expected);
 }
 await page.evaluate(()=>swipe('#hq-panel-matchups .hq-edge-grid>div',-80));await page.waitForTimeout(210);
 assert.equal(await page.evaluate(()=>HJ_HQ_STATE.matchupFocusKey),'1','preview rail must not page matchups');
 console.log('PASS roster and matchup next/previous/wrapping, nested rails, player showcase, vertical scroll and multi-touch');
}finally{await browser.close();}
