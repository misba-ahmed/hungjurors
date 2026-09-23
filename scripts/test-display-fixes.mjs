import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {chromium} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8'),html=prepareSite(read('../index.html'));
// Exercise the generated page, since replacement order can remove loader helpers.
assert.equal((html.match(/function hjRecapExtraKey\(/g)||[]).length,1);
assert.equal((html.match(/function hjRecapNeedsExtra\(/g)||[]).length,1);
const loader=html.slice(html.indexOf('function hjRecapExtraKey('),html.indexOf('function hjRecapTransactionTime'));
let releasePool;const pool=new Promise(r=>releasePool=r),requests=[],timers=[];
const state={weeks:new Map(),jobs:new Map()};
const context={HJ_RECAP_EXTRA:state,HJ_HQ_STATE:{activeTab:'recap'},NFL_SEASON:2026,ESPN_FANTASY_LEAGUE_ID:'1630558',hjCurrentWeek:()=>3,hjWeeklyStat:e=>e.stat,hjDataPool:()=>pool,hjRefreshRecap:()=>{},hjDataSchedule:async()=>({events:[{id:'game1',status:{type:{completed:true}}}]}),hjDataRequest:async(key,fn)=>fn(),hjDataJson:async url=>{requests.push(url);return url.includes('summary')?{header:{competitions:[{status:{type:{completed:true}}}]},drives:{previous:[{plays:[{id:'play1'}]}]}}:{transactions:[]}},setTimeout:(f,ms)=>{timers.push({f,ms});return timers.length},clearTimeout:()=>{},console,Date};
vm.createContext(context);vm.runInContext(loader,context);
const chosen={week:2,scores:[{teamId:1,lineupComplete:false,starters:[]}]};
context.chosen=chosen;
const pending=vm.runInContext('hjRecapLoadExtra(chosen)',context);
await new Promise(r=>setTimeout(r,20));
assert.equal(state.weeks.get(2).games.size,1,'game logs load before optional pool or historical lineups');
releasePool([]);await pending;
assert.equal(vm.runInContext('hjRecapNeedsExtra(chosen)',context),false);
chosen.scores[0].lineupComplete=true;chosen.scores[0].starters=[{stat:{externalId:'game1'}}];
assert.equal(vm.runInContext('hjRecapNeedsExtra(chosen)',context),true,'hydrated lineup bypasses stale five-minute cache');
await vm.runInContext('hjRecapLoadExtra(chosen)',context);
context.hjDataJson=async()=>{throw Error('fixture timeout')};chosen.scores[0].starters.push({stat:{externalId:'game2'}});
await vm.runInContext('hjRecapLoadExtra(chosen)',context);
assert.ok(state.weeks.get(2).retryAt>Date.now(),'failed enrichment retries promptly');
assert.equal(state.weeks.get(2).games.size,1,'failed refresh keeps verified logs');
assert.ok(timers.some(t=>t.ms===15500));
console.log('Recap loading: delayed lineup, blocked pool, refresh and retry checks passed.');
const build=html.slice(html.indexOf('function wireBuild(data){'),html.indexOf('const WIRE_SECTION_LABELS='));
const loading=new Function(build+';return wireBuild(null)')();
assert.equal(JSON.stringify(loading).includes('Draft in progress'),false);
assert.ok(loading.cards[0].html.includes('Loading league updates'));
const browser=await chromium.launch();
try{
 const recapPage=await browser.newPage({viewport:{width:1280,height:900}});
 await recapPage.route('**/*',route=>route.request().url()==='https://hungjurors.test/'?route.fulfill({contentType:'text/html',body:html}):route.abort());
 await recapPage.goto('https://hungjurors.test/',{waitUntil:'load'});
 await recapPage.waitForTimeout(300);
 await recapPage.evaluate(()=>{
  const names=['TYLER','MISBA','BRYAN','WASI','GARRETT','NATHAN M','NATHAN T','CESAR','KAT','ALEX'];
  const scores=names.map((short,i)=>({short,teamId:String(i+1),pts:150-i*6,opp:names[i%2?i-1:i+1],oppPts:150-(i%2?i-1:i+1)*6,proj:null,optimal:null,starters:[],entries:[],lineupComplete:false}));
  const chosen={week:2,scores};
  // Supply a completed league week while keeping all recap rendering/navigation real.
  hjCompletedWeeks=()=>[chosen];
  HJ_LEAGUE_STATE.data={teams:names.map((name,i)=>({id:i+1,name})),schedule:[]};
  HJ_RECAP_EXTRA.weeks.set(2,{key:hjRecapExtraKey(chosen),checked:Date.now(),games:new Map(),pool:[],transactions:[]});
  HJ_HQ_STATE.activeTab='rosters';
  document.getElementById('league-hq-tools').innerHTML='<div id="hq-panel-recap" data-hq-panel="recap" hidden><div class="hq-module"><div class="hq-module-body"></div></div></div>';
  hjRenderHQTabs();
 });
 const recapErrors=[];recapPage.on('pageerror',error=>recapErrors.push(error.message));
 for(let i=0;i<2;i++){
  await recapPage.locator('[data-hq-tab="recap"]').click();
  await recapPage.waitForFunction(()=>!document.getElementById('hq-panel-recap').hidden&&document.querySelector('#hq-panel-recap h2')?.textContent==='Week 2 Recap');
  assert.equal(await recapPage.locator('[data-hq-tab="recap"]').getAttribute('aria-selected'),'true');
  assert.equal(await recapPage.locator('#hq-panel-recap').isVisible(),true);
  await recapPage.locator('[data-hq-tab="rosters"]').click();
  assert.equal(await recapPage.locator('#hq-panel-recap').evaluate(el=>el.hidden),true);
 }
 assert.deepEqual(recapErrors,[],'Recap tab navigation must not throw');
 await recapPage.close();
 console.log('Built page: Weekly Recap opens, renders and reopens through its actual tab click.');
 const page=await browser.newPage();
 const modal=html.slice(html.indexOf('function wireCloseExpanded(){'),html.indexOf("\n{\n  const scroller=$('#wire-scroll')",html.indexOf('function wireCloseExpanded(){')));
 await page.setContent('<style>'+read('../styles/wire-interaction.css')+'</style><article class="wc" data-wire-card><p id="plain">Recap text</p><button id="match" data-wire-matchup="2:1:2">Matchup</button><span id="manager" class="manager-profile-trigger" role="button">Manager</span><button id="player" class="pc-player-trigger">Player</button><a id="link" href="#linked">Link</a></article>');
 await page.addScriptTag({content:read('./wire-interaction.js')+modal});
 const open=async()=>{await page.evaluate(()=>wireOpenExpanded(document.querySelector('article')));await page.waitForSelector('.wire-expanded-overlay.is-open')};
 await open();
 assert.equal(await page.locator('.wire-expanded-stage .wc').evaluate(el=>getComputedStyle(el).cursor),'zoom-out');
 for(const id of ['match','manager','player','link']){await page.locator('.wire-expanded-stage #'+id).click();assert.equal(await page.locator('.wire-expanded-overlay.is-open').count(),1,'interactive target stays expanded: '+id)}
 await page.locator('.wire-expanded-stage #plain').click();
 await page.waitForSelector('.wire-expanded-overlay',{state:'detached'});
 await open();await page.locator('.wire-expanded-close').click();await page.waitForSelector('.wire-expanded-overlay',{state:'detached'});
 await open();
 await page.locator('.wire-expanded-stage #plain').evaluate(el=>{
  const card=el.closest('.wc');
  card.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:10,clientY:10}));
  card.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:10,clientY:60}));
  el.dispatchEvent(new MouseEvent('click',{bubbles:true}));
 });
 assert.equal(await page.locator('.wire-expanded-overlay.is-open').count(),1,'scroll gesture does not collapse');
 await page.close();
 console.log('Banner: loading state, zoom-out cursor, click-to-close, X, interactive targets and scroll checks passed.');
}finally{await browser.close()}

const response=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week=2&limit=100');
const schedule=await response.json(),event=schedule.events.find(e=>e.status?.type?.completed||e.competitions?.[0]?.status?.type?.completed);
assert.ok(event,'completed NFL game available');
const game=await (await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event='+event.id)).json();
const athletes=(game.boxscore?.players||[]).flatMap(t=>(t.statistics||[]).flatMap(g=>(g.athletes||[]).map(a=>a.athlete)));
console.log('Live recap contract: '+JSON.stringify({plays:(game.drives?.previous||[]).reduce((n,d)=>n+(d.plays?.length||0),0),athleteKeys:Object.keys(athletes[0]||{}),withFirstName:athletes.filter(a=>a.firstName&&a.lastName).length,athletes:athletes.length}));
assert.ok((game.drives?.previous||[]).some(d=>d.plays?.length),'completed NFL play logs available');
