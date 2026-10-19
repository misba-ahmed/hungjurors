/* Swipe selection must follow the page that is actually on screen.
 * iOS can ignore or cut short a programmatic scroll while the finger or momentum
 * owns a rail. This test reproduces that by ignoring the rails' programmatic
 * scrollTo calls during and right after each touch swipe, then checks, for
 * Rosters, Matchups and Side Challenges, that the visible page is the selected
 * one, is mounted, is not inert, and sets the rail height; also that tab
 * navigation reaches its page without bouncing, and that the League HQ folder
 * tab artwork repaints after its canvases lose their pixels.
 */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const html=prepareSite(await fs.readFile('index.html','utf8'));
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://hungjurors.com/',r=>r.fulfill({contentType:'text/html',body:html}));
 await page.route('https://hungjurors.com/styles/**',async r=>{try{await r.fulfill({contentType:'text/css',body:await fs.readFile(new URL(r.request().url()).pathname.slice(1),'utf8')});}catch{await r.continue();}});
 await page.goto('https://hungjurors.com/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('.hj-team-photo')&&typeof HJ_CHALLENGE_STATE!=='undefined'&&HJ_CHALLENGE_STATE.model,{timeout:120000});
 await page.waitForTimeout(3000);
 const cdp=await page.context().newCDPSession(page);
 async function swipe(sel,dx){
  const p=await page.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.left+r.width/2,y:Math.min(innerHeight-120,Math.max(r.top+20,420))}},sel);
  await page.evaluate(s=>{const d=document.querySelector(s);d.__scrollTo??=d.scrollTo;d.scrollTo=()=>{};setTimeout(()=>{d.scrollTo=d.__scrollTo},1200);},sel);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});
  for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+dx*i/6,y:p.y}]});await page.waitForTimeout(16);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(1600);
 }
 const truth=(sel,kind)=>page.evaluate(([s,kind])=>{
  const d=document.querySelector(s),pages=[...d.children].filter(c=>!c.dataset.hjSwipeOverlay),left=d.getBoundingClientRect().left;
  const v=pages.reduce((b,p,i)=>{const x=Math.abs(p.getBoundingClientRect().left-left);return x<b.x?{i,x}:b},{i:-1,x:1e9}),page=pages[v.i];
  const selected=kind==='roster'?document.querySelector('[data-league-team].active')?.dataset.leagueTeam===page.dataset.hjRosterTeam:
   kind==='matchup'?document.querySelector('#hq-panel-matchups [data-hq-matchup-jump].active')?.dataset.hqMatchupJump===page.dataset.hqMatchupKey:
   HJ_CHALLENGE_STATE.active===page.dataset.hjChallenge;
  return {visible:v.i,aligned:v.x<=2,selected,mounted:!!page.firstElementChild,inert:!!page.inert,heightMatches:Math.abs(d.getBoundingClientRect().height-page.offsetHeight)<=3};
 },[sel,kind]);
 const sections=[
  ['roster','#league-sync-content .hj-roster-rail',async()=>{await page.locator('#hq-tab-rosters').click();await page.waitForTimeout(800);await page.evaluate(()=>{const d=document.querySelector('#league-sync-content .hj-roster-rail');(d.querySelector('.hj-player-v3')||d).scrollIntoView({block:'center'});});}],
  ['matchup','#hq-panel-matchups .hq-matchup-list',async()=>{await page.locator('#hq-tab-matchups').click();await page.waitForTimeout(800);await page.evaluate(()=>document.querySelector('#hq-panel-matchups .hq-matchup-list').scrollIntoView({block:'start'}));}],
  ['challenge','#challenges .hj-challenge-rail',async()=>{await page.evaluate(()=>document.querySelector('#challenges .hj-challenge-rail').scrollIntoView({block:'start'}));}]
 ];
 for(const [kind,sel,prep] of sections){
  await prep();await page.waitForTimeout(1200);
  for(const dx of [-40,-260,-40,60,-260,300]){
   await swipe(sel,dx);
   const t=await truth(sel,kind);
   assert.deepEqual({aligned:t.aligned,selected:t.selected,mounted:t.mounted,inert:t.inert,heightMatches:t.heightMatches},{aligned:true,selected:true,mounted:true,inert:false,heightMatches:true},kind+' swipe '+dx+': '+JSON.stringify(t));
  }
 }
 // Tab navigation reaches the requested challenge once, without flipping back.
 await page.evaluate(()=>{window.__hjActive=[];const d=document.querySelector('.hj-challenge-rail');d.addEventListener('scroll',()=>window.__hjActive.push(HJ_CHALLENGE_STATE.active));});
 await page.locator('#challenge-tab-lms').click();await page.waitForTimeout(1500);
 const seen=await page.evaluate(()=>[...new Set(window.__hjActive)]);
 assert.deepEqual(seen.filter(id=>id!=='lms'),[],'tab navigation must not bounce through other challenges: '+seen.join(','));
 assert.equal(await page.evaluate(()=>HJ_CHALLENGE_STATE.active),'lms');
 // Folder tab artwork: a released or wiped canvas never leaves a blank tab.
 await page.evaluate(()=>document.getElementById('league-hq-tabs').scrollIntoView({block:'center'}));await page.waitForTimeout(800);
 await page.evaluate(()=>{document.querySelectorAll('#league-hq-tabs .hj-folder-layer').forEach(c=>c.getContext('2d').clearRect(0,0,c.width,c.height));window.dispatchEvent(new Event('pageshow'));});
 await page.waitForTimeout(600);
 const painted=await page.evaluate(()=>[...document.querySelectorAll('#league-hq-tabs .hq-tab')].map(b=>{const c=b.querySelector('.hj-folder-layer');if(!b.classList.contains('hj-layer-ready'))return true;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=400)if(d[i])return true;return false;}));
 assert(painted.every(Boolean),'every folder tab shows artwork: '+painted);
 assert.deepEqual(errors,[]);
 console.log('PASS: swipe selection follows the visible page (rosters, matchups, challenges), tab navigation does not bounce, folder art repaints');
}finally{await browser.close();}
