import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><style>.league-team-view{height:120px}.hq-matchup-list{display:flex;width:360px;overflow-x:auto}.hq-matchup{min-width:360px;height:100px}.hq-edge-grid{width:100px;overflow:auto}.hq-edge-grid>div{width:500px}</style><main id="league-hq"><section id="league-sync-content"><div>'+[0,1,2].map(i=>'<button class="league-team-tab '+(i===0?'active':'')+'" data-league-team="'+i+'">'+i+'</button>').join('')+'</div><div class="league-team-view" id="roster-body">Roster</div><div class="hj-team-photo">Players</div><div class="hq-edge-grid"><div>Nested roster rail</div></div></section><section id="hq-panel-matchups">'+[0,1,2].map(i=>'<button data-hq-matchup-jump="'+i+'">matchup '+i+'</button>').join('')+'<div class="hq-matchup-list">'+[0,1,2].map(i=>'<article class="hq-matchup" data-hq-matchup-key="'+i+'"><div class="hq-edge-grid"><div>Nested preview</div></div>Matchup</article>').join('')+'</div></section></main>');
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
  await page.evaluate(dx=>swipe('#roster-body',dx),dx);assert.equal(await roster(),expected);await page.waitForTimeout(300);
 }
 for(const target of ['.hj-team-photo','#league-sync-content .hq-edge-grid>div']){
  await page.evaluate(target=>swipe(target,-80),target);assert.equal(await roster(),'1','nested gesture');
 }
 await page.evaluate(()=>swipe('#roster-body',10,90));assert.equal(await roster(),'1','vertical scroll');
 await page.evaluate(()=>swipe('#roster-body',-80,0,true));assert.equal(await roster(),'1','pinch');
 for(const [dx,expected]of [[80,'2'],[-80,'0'],[-80,'1']]){
  await page.evaluate(dx=>swipe('.hq-matchup-list',dx),dx);await page.waitForTimeout(600);
  assert.equal(await page.evaluate(()=>HJ_HQ_STATE.matchupFocusKey),expected);
 }
 await page.evaluate(()=>swipe('#hq-panel-matchups .hq-edge-grid>div',-80));await page.waitForTimeout(600);
 assert.equal(await page.evaluate(()=>HJ_HQ_STATE.matchupFocusKey),'1','preview rail must not page matchups');

 const cdp=await page.context().newCDPSession(page);
 async function drag(selector,direction){
  const r=await page.locator(selector).boundingBox(),y=r.y+Math.min(r.height/2,45),x=direction<0?r.x+r.width-30:r.x+30;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+direction*i*25,y}]});await page.waitForTimeout(20);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(700);
 }
 await page.locator('[data-hq-matchup-jump="2"]').click();await page.waitForTimeout(700);
 await drag('.hq-matchup-list',-1);
 assert.equal(await page.evaluate(()=>HJ_HQ_STATE.matchupFocusKey),'0','native last-to-first');
 await drag('.hq-matchup-list',1);
 assert.equal(await page.evaluate(()=>HJ_HQ_STATE.matchupFocusKey),'2','native first-to-last');
 await page.evaluate(()=>document.querySelector('[data-league-team="0"]').click());
 await drag('#roster-body',-1);assert.equal(await roster(),'1','native roster swipe');
 assert.equal(await page.locator('[data-hj-swipe-overlay]').count(),0,'temporary slide layers are cleaned up');

 console.log('PASS roster and matchup next/previous/wrapping, nested rails, player showcase, vertical scroll and multi-touch');
}finally{await browser.close();}
