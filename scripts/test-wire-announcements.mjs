import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname,dirname} from 'node:path';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
import {extractSiteArtwork} from './site-artwork.mjs';
const source=await fs.readFile('index.html','utf8');
// Exercise the actual prepared page's rendering, navigation and gestures with deterministic cards.
const html=prepareSite(source).replace(/<script id="hj-wire-priorities">[\s\S]*?<\/script>/,'');
for(const [path,bytes] of extractSiteArtwork(source).assets){await fs.mkdir(dirname(path),{recursive:true});await fs.writeFile(path,bytes);}
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname;res.setHeader('Content-Type',path==='/'?'text/html':({'.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png'})[extname(path)]||'application/json');res.end(path==='/'?html:await fs.readFile('.'+path));}catch{res.statusCode=404;res.end('{}');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
function emit(name,bytes){const value=bytes.toString('base64');for(let i=0;i<value.length;i+=6000)console.log('BANNER_IMAGE '+name+' '+(i/6000)+' '+value.slice(i,i+6000));}
try{for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:engineName!=='webkit'});
 try{for(const width of [1365,390,320]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  const page=await context.newPage();await page.goto(base,{waitUntil:'load'});
  await page.evaluate(()=>{
   const names=['MISBA','BRYAN','TYLER','NATHAN M','WASI','CESAR','NATHAN T','GARRETT','JARRETT','KAT'];
   const players=[['Patrick Mahomes','KC',3139477],['Rashee Rice','KC',4428331],['Travis Kelce','KC',15847],['Xavier Worthy','KC',4683062],['Bryce Young','CAR',4685720],['Chuba Hubbard','CAR',4241416],['Jalen Coker','CAR',4695883],['Jonathon Brooks','CAR',4678008],['Tetairoa McMillan','CAR',4685472],['Harrison Butker','KC',3055899]];
   window.bannerFixture={teams:names.map((name,i)=>({id:i+1,name,entries:[{id:String(players[i][2]),name:players[i][0],team:players[i][1]}]}))};
   bannerFixture.teams[0].entries.push({id:'4567048',name:'Kenneth Walker III',team:'KC'},{id:'-16012',name:'Chiefs DST',team:'KC'});
   HJ_LEAGUE_STATE.data=bannerFixture;hjCurrentWeek=()=>5;
   HJ_BYE_STATE.season=Number(NFL_SEASON);HJ_BYE_STATE.teams=new Map([['KC',new Set([5])],['CAR',new Set([5])]]);
   hjTeamOnBye=t=>['KC','CAR'].includes(t);hjRosterEntries=t=>t.entries;hjPlayer=p=>p;wirePlayerObj=p=>p;hjPlayerTeam=p=>p.team;wireManager=t=>t.name;
   wireWaiverCard=()=>null;
   wirePlayerHTML=p=>'<button class="wc-player pc-player-trigger" data-pc-id="'+p.id+'"><span><b>'+p.name+'</b><small>Team</small></span></button>';
   wireBuild=()=>({cards:[{section:'kickoff',html:wireCard({kicker:'Next NFL kickoff',tag:'THU · 7:15 PM CT',cls:'is-lead is-kickoff',body:'<div class="wc-title">Buccaneers at Cowboys</div>'})},{section:'recap',html:wireCard({kicker:'Week 4 Recap',body:'<div class="wc-title">Week 4 Recap</div>'})}],headline:{title:'',kicker:'The Wire'}});
  });
  await page.addScriptTag({content:await fs.readFile('scripts/wire-priorities.js','utf8')});
  await page.locator('#wire-chips').scrollIntoViewIfNeeded();await page.waitForTimeout(700);
  assert.deepEqual(await page.locator('#wire-chips button').allTextContents(),['Kickoff','Bye Week','Last Man Standing','Wk 4 Recap']);
  assert.equal(await page.locator('.wp-group').count(),0);assert.equal(await page.locator('.wp-lms-meta').count(),0);
  assert.equal(await page.locator('#wire-scroll .wp-single').count(),2);
  const choose=async section=>{await page.locator('[data-wire-section-jump="'+section+'"]').click();await page.waitForTimeout(700);};
  for(const section of ['byes','lms']){
   await choose(section);
   const card=page.locator('#wire-scroll [data-wire-section="'+section+'"]');
   const dimensions=await card.evaluate(el=>({h:el.getBoundingClientRect().height,overflow:el.scrollWidth-el.clientWidth,panelOverflow:el.firstElementChild.scrollWidth-el.firstElementChild.clientWidth}));
   const ordinary=await page.locator('#wire-scroll [data-wire-section="recap"]').evaluate(el=>el.getBoundingClientRect().height);
   assert(Math.abs(dimensions.h-ordinary)<2,JSON.stringify({dimensions,ordinary}));assert(dimensions.panelOverflow<2);assert(dimensions.overflow<2);
   await page.locator('#wire-scroll').scrollIntoViewIfNeeded();
   emit(engineName+'-'+width+'-'+section,await page.screenshot({type:'jpeg',quality:65}));
   await card.locator('.wc-title').click();await page.waitForSelector('.wire-expanded-overlay.is-open');
   assert.equal(await page.locator('.wp-detail .wp-panel').count(),1);
   if(section==='byes')assert.equal(await page.locator('.wp-detail .wp-person').count(),12);
   await page.keyboard.press('Escape');await page.waitForSelector('.wire-expanded-overlay',{state:'detached'});
  }
  await choose('byes');
  const panel=page.locator('#wire-scroll .wp-byes');await panel.focus();await page.keyboard.press('Enter');await page.waitForSelector('.wire-expanded-overlay.is-open');
  await page.locator('.wp-detail .wc-title').click();await page.waitForSelector('.wire-expanded-overlay',{state:'detached'});
  const list=page.locator('#wire-scroll .wp-bye-list');await list.evaluate(el=>el.scrollTop=45);
  const fit=await list.evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight}));assert(fit.scroll<=fit.height+1,'Current bye roster should fit: '+JSON.stringify(fit));
  await page.evaluate(()=>{for(let i=0;i<8;i++)bannerFixture.teams[0].entries.push({id:'future-'+i,name:'Future roster '+i,team:'KC'});wireRender(true);});await page.waitForTimeout(700);await list.evaluate(el=>el.scrollTop=45);const before=await list.evaluate(el=>el.scrollTop);assert(before>0,'Long future roster remains scrollable');
  await page.evaluate(()=>wireRender(true));await page.waitForTimeout(700);
  assert.equal(await page.locator('#wire-scroll .is-scroll-active').getAttribute('data-wire-section'),'byes');
  assert.equal(await list.evaluate(el=>el.scrollTop),before);
  await choose('recap');
  const gap=await page.locator('#wire-scroll').evaluate(el=>{const s=getComputedStyle(el),a=el.querySelector('.is-scroll-active');return el.clientHeight-a.getBoundingClientRect().height-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom);});assert(Math.abs(gap)<3);
  console.log('PASS '+engineName+' '+width+': separate ordered chips, ordinary heights, bounded content, full expanded roster, header/keyboard expansion, Escape/background collapse, refresh and rail height');
  await page.evaluate(()=>{
   const model=buildStandingsAnalytics(),p=model.people[0];
   p.next3=['NATHAN T','NATHAN M','JARRETT'];
   p.entries=[{week:1,pts:100,oppPts:105,opp:'NATHAN T'},{week:2,pts:120,oppPts:110,opp:'NATHAN M'},{week:3,pts:95,oppPts:110,opp:'JARRETT'},{week:4,pts:0,oppPts:null,opp:'KAT'}];p.closeW=1;p.closeL=1;
   model.weeks=[{week:1},{week:2},{week:3}];buildStandingsAnalytics=()=>model;renderStandingsDashboard();
   window.checkedManager=p.short;
  });
  const checkedName=await page.evaluate(()=>checkedManager);const entry=page.locator('[data-standing-entry="'+checkedName+'"]');await entry.locator('.standings-lane').click({position:{x:8,y:20}});await page.waitForTimeout(400);
  const avatars=entry.locator('.st-next-avatars');assert.equal(await avatars.locator('button').count(),3);
  assert(await avatars.evaluate(el=>{const r=el.getBoundingClientRect();return [...el.children].every(n=>{const a=n.getBoundingClientRect();return a.width>0&&a.left>=r.left-1&&a.right<=r.right+1;});}));
  const close=entry.locator('.st-close');await close.locator('summary').click();assert.equal(await close.getAttribute('open'),'');
  assert.equal(await close.locator('.st-close-game').count(),2);assert((await close.innerText()).includes('100.00'));assert((await close.innerText()).includes('105.00'));assert((await close.textContent()).includes('Week 2'));assert(!(await close.textContent()).includes('Week 3'));
  await page.evaluate(()=>renderStandingsDashboard());assert.equal(await entry.locator('.st-close').getAttribute('open'),'');
  await entry.locator('.st-close summary').click();assert.equal(await entry.locator('.st-close').getAttribute('open'),null);
  await entry.locator('.st-close summary').focus();await page.keyboard.press('Enter');assert.equal(await entry.locator('.st-close').getAttribute('open'),'');
  await entry.scrollIntoViewIfNeeded();emit(engineName+'-'+width+'-standings',await page.screenshot({type:'jpeg',quality:65}));
  console.log('PASS '+engineName+' '+width+': all next-three avatars fit, close games show exact weeks/final scores and cutoff, disclosure closes and survives refresh');
  await context.close();
 }}finally{await browser.close();}
}}finally{server.close();}
