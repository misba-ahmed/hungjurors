import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
import {extractSiteArtwork} from './site-artwork.mjs';
const source=await fs.readFile('index.html','utf8'),bet=await fs.readFile('scripts/free-throw-bet.js','utf8');
const prepared=prepareSite(source);assert(prepared.includes(bet));
// Isolate the production Wire component: use the prepared page's styles, markup,
// card builders, scroller and expansion lifecycle without unrelated page startup jobs.
const extract=(from,to)=>prepared.slice(prepared.indexOf(from),prepared.indexOf(to,prepared.indexOf(from)));
const withoutScripts=prepared.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
const styles=[...withoutScripts.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>|<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0]).join('\n');
const wireMarkup=extract('<div class="wire" id="wire"','    </div>\n  </div>').trim();
const html='<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">'+styles+'</head><body><main><div class="hero"><div class="hero-in">'+wireMarkup+'</div></div></main></body></html>';
const avatars=JSON.parse(prepared.match(/const AV = (\{[^\n]+\});/)[1]);
const bootstrap=`const $=s=>document.querySelector(s),esc=s=>String(s??''),pcFpts=n=>Number(n).toFixed(2);
const AV=${JSON.stringify({MISBA:avatars.MISBA,BRYAN:avatars.BRYAN})},AV_DEFAULT='';
const managerAvatarSrc=s=>AV[s]?.startsWith('/')?AV[s]:'data:image/png;base64,'+AV[s];
${prepared.match(/^const av\s*=.*$/m)[0]}
const HJ_LEAGUE_STATE={data:null},HJ_HQ_STATE={activeTab:'rosters',openMatchups:new Set()},HJ_WIRE_ORDER=['recap','sidebet'];
${prepared.match(/^const WIRE=.+$/m)[0]}
const WIRE_SECTION_LABELS={recap:'Recap',sidebet:'Side Bet'};
function hjCurrentWeek(data=HJ_LEAGUE_STATE.data){return data?.scoringPeriodId||1}
function hjMatchManager(t){return t.name}function hjOwnerName(t){return t.name}
function hjSideScore(s,w){return s.pointsByScoringPeriod?.[w]??s.totalPointsLive??s.totalPoints??null}
function wireTickCountdowns(){}function hjMatchupCardHTML(){return ''}function hjRcStories(){return ''}
${extract('function wireCard({','/* ---- Vegas draft grading ---- */')}
function wireBuild(){return {cards:[],headline:{title:'The Wire'}}}
${extract('function wireRender(','function wireCardNodes(')}
${extract('function wireCardNodes(','window.__wireReady=true;')}
${extract('function hjWireOrdered(','/* Replace the old carousel node')}
${extract('function hjInstallWireScrollerV4(','/* -------------------- Manager roster: exact HQ layout')}
hjInstallWireScrollerV4();
function hjSetHQTab(tab){HJ_HQ_STATE.activeTab=tab}function hjRenderMatchupCenter(){}
${extract("document.addEventListener('click',event=>{\n const button=event.target.closest('[data-wire-matchup]')",'function wireWaiverCard(')}
`;

const art=extractSiteArtwork(source).assets;
const engines=process.env.HJ_BROWSER==='chromium'?[['chromium',chromium]]:process.env.HJ_BROWSER==='webkit'?[['webkit',webkit]]:[['chromium',chromium],['webkit',webkit]];
for(const [name,engine]of engines){
 const browser=await engine.launch({headless:true});
 try{for(const width of [1365,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.hostname!=='hj.test')return route.abort();
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
   const file=u.pathname.slice(1);if(file.includes('..'))return route.abort();
   try{const body=art.get(file)||await fs.readFile(file),ext=path.extname(file);await route.fulfill({contentType:({'.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'})[ext]||'application/octet-stream',body});}catch{await route.abort()}
  });
  const page=await context.newPage();await page.goto('http://hj.test/',{waitUntil:'domcontentloaded'});
  await page.addScriptTag({content:bootstrap});
  await page.addScriptTag({content:await fs.readFile('scripts/wire-interaction.js','utf8')});
  await page.addScriptTag({content:await fs.readFile('scripts/wire-live.js','utf8')});
  await page.addScriptTag({content:await fs.readFile('scripts/card-gestures.js','utf8')});
  await page.evaluate(()=>{
   // Isolate the real Wire surface from unrelated full-page sections in this focused fixture.
   const wire=document.querySelector('#wire');document.querySelectorAll('section').forEach(el=>{if(el!==wire&&!el.contains(wire))el.hidden=true});
   HJ_LEAGUE_STATE.data={seasonId:2026,scoringPeriodId:7,teams:[{id:1,name:'MISBA'},{id:2,name:'BRYAN'}],schedule:[{id:7,matchupPeriodId:7,winner:'UNDECIDED',home:{teamId:1,totalPoints:0},away:{teamId:2,totalPoints:0}}]};
   hjMatchManager=t=>t.name;hjOwnerName=t=>t.name;WIRE.recapWeek=6;
   wireBuild=()=>({cards:[{section:'recap',html:wireCard({kicker:'Week 6 Recap',body:'<div class="wc-title">Week 6 Recap</div><p class="wc-copy">An ordinary card for comparison.</p>'})}],headline:{title:'The Wire',kicker:'The Wire'}});
   hjMatchupCardHTML=()=>'<div class="hq-edge-grid">Matchup</div>';hjRcStories=()=>'';
  });
  await page.addScriptTag({content:bet});await page.evaluate(()=>wireRender(true));
  const card=page.locator('#wire-scroll [data-wire-key="2026-w7-misba-bryan-free-throws"]');
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);
  await page.evaluate(()=>wireScrollTo([...document.querySelectorAll('#wire-scroll .wc')].findIndex(c=>c.classList.contains('sb-ft-wire'))));
  await page.waitForTimeout(700);
  await page.waitForFunction(()=>document.querySelector('.sb-ft-wire')?.classList.contains('is-scroll-active'));
  assert.equal(await card.locator('.sb-ft-shotchart i.is-made').count(),49);
  assert.equal(await card.locator('.sb-ft-shotchart i.is-missed').count(),51);
  assert.match(await card.innerText(),/LOCKED IN/);assert.match(await card.innerText(),/If it ended now/);
  assert.match(await card.innerText(),/\$29 to BRYAN/);assert.match(await card.innerText(),/\$22 to MISBA/);
  const sizes=await page.evaluate(()=>{const bet=document.querySelector('.sb-ft-wire'),ordinary=document.querySelector('#wire-scroll .wc:not(.sb-ft-wire)');return {bet:bet.getBoundingClientRect().height,ordinary:ordinary.getBoundingClientRect().height,overflow:bet.scrollWidth-bet.clientWidth,bodyOverflow:bet.querySelector('.wc-body').scrollHeight-bet.querySelector('.wc-body').clientHeight,animation:getComputedStyle(bet.querySelector('.sb-ft-ball')).animationPlayState}});
  assert(Math.abs(sizes.bet-sizes.ordinary)<2,JSON.stringify(sizes));assert(sizes.overflow<2,JSON.stringify(sizes));assert(sizes.bodyOverflow<2,JSON.stringify(sizes));assert.equal(sizes.animation,'running');
  await card.screenshot({animations:'disabled',path:path.join(tmpdir(),`free-throw-${name}-${width}.png`),timeout:15000});
  await card.locator('.wc-title').click({force:true});await page.waitForSelector('.wire-expanded-stage .sb-ft-wire');
  assert.match(await page.locator('.wire-expanded-stage').innerText(),/12.6-point loss means 13 extra shots/);
  await page.keyboard.press('Escape');await page.waitForSelector('.wire-expanded-stage',{state:'detached'});
  await card.focus();await page.keyboard.press('Enter');await page.waitForSelector('.wire-expanded-stage');await page.keyboard.press('Escape');await page.waitForSelector('.wire-expanded-stage',{state:'detached'});
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await card.locator('.sb-ft-ball.is-made').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.evaluate(()=>wireRender(false));assert.equal(await page.locator('#wire-scroll .is-scroll-active').getAttribute('data-wire-key'),'2026-w7-misba-bryan-free-throws');
  const surfaces=await page.evaluate(()=>{const data=HJ_LEAGUE_STATE.data,g=data.schedule[0];g.winner='AWAY';g.home.totalPoints=100;g.away.totalPoints=112.6;return {matchup:hjMatchupCardHTML(g,data,data,false),recap:hjRcStories({week:7},[],{data})}});
  assert.match(surfaces.matchup,/BRYAN \$29/);assert.match(surfaces.recap,/BRYAN \$29/);
  const guarded=await page.evaluate(()=>{
   const card=document.querySelector('#wire-scroll .sb-ft-wire'),target=card.querySelector('.wc-title');
   for(const [type,x] of [['touchstart',100],['touchmove',190],['touchend',190]]){const event=new Event(type,{bubbles:true,cancelable:true}),point={clientX:x,clientY:120};Object.defineProperties(event,{touches:{value:type==='touchend'?[]:[point]},changedTouches:{value:[point]}});target.dispatchEvent(event)}
   target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return !document.querySelector('.wire-expanded-overlay');
  });assert(guarded,'a swipe must not expand the card');
  await page.waitForTimeout(350);await page.evaluate(()=>wireScrollTo(1));
  await card.locator('[data-wire-matchup]').click({force:true});
  assert.deepEqual(await page.evaluate(()=>[HJ_HQ_STATE.activeTab,HJ_HQ_STATE.matchupWeek,HJ_HQ_STATE.matchupFocusKey]),['matchups',7,'7:1:2']);
  console.log(name,width,'PASS card sizing, shot graphics, animation/reduced motion, expansion, swipe guard, matchup navigation, key preservation, matchup and recap',JSON.stringify(sizes));
  await context.close();
 }}finally{await browser.close()}
}
