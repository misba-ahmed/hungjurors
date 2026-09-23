import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const source=read('../index.html'),html=prepareSite(source),baseline=JSON.parse(source.match(/const HIST = (\{[^\n]+\});/)[1]);
const engine=new Function(read('./record-book-engine.js')+';return {hjRecordTimeline,hjRecordChanges,hjRecordMarks,hjRecordSnapshot,hjBuildRecordHistory,HJ_RECORD_DEFINITIONS};')();
const {hjRecordTimeline:timeline,hjRecordChanges:changes,hjRecordMarks:marks}=engine;
const clone=x=>JSON.parse(JSON.stringify(x));
const fixture=JSON.parse(read('./fixtures/record-announcements-2026.json'));
const current=timeline(baseline,[fixture]);
assert.deepEqual(current.events.map(e=>e.id),['closest-game']);
const close=current.events[0];
assert.equal(close.week,2);
assert.equal(close.current.mark,'0.02');
assert.equal(close.previous.mark,'0.08');
assert.deepEqual(close.current.people,[{name:'CESAR',score:118.7},{name:'JARRETT',score:118.68}]);
assert.deepEqual(close.previous.people,[{name:'WASI',score:134.36},{name:'JARRETT',score:134.28}]);
assert.equal(close.previous.detail,'2022 · Week 2');
assert.equal(current.history.record_book.legacy.most_regular_season_wins.value,75,'Career wins continue updating silently');
assert.equal(changes(current.history,current.history).length,0,'Refreshes and ties are not new records');
for(const def of engine.HJ_RECORD_DEFINITIONS){
 const next=clone(baseline);
 if(def.path){
  let parent=next.record_book;for(const key of def.path.slice(0,-1))parent=parent[key];
  const source=parent[def.path.at(-1)],row=Array.isArray(source)?source[0]:source;
  row[def.field]+=def.low?-.01:def.field.includes('pct')?.01:1;
 }else next.official_playoffs.push({year:2026,semifinals:[{manager1:'CESAR',manager2:'JARRETT',score1:300,score2:299}],championship:null});
 const found=changes(baseline,next).filter(e=>e.id===def.id);
 assert.equal(found.length,def.announce===false?0:1,def.id+' announcement policy');
}
const corrected=clone(fixture),correctedGame=corrected.games.find(g=>g.period===2&&g.manager1==='JARRETT');
correctedGame.score2=120.7;correctedGame.weekly[0].score2=120.7;
assert.equal(timeline(baseline,[corrected]).events.some(e=>e.id==='closest-game'),false,'Score corrections retract invalid announcements');
const newer=clone(fixture);
newer.games.push({...clone(fixture.games[0]),period:3,weekly:[{week:3,score1:180.01,score2:180}],score1:180.01,score2:180,winner:'CESAR'});
const closestHistory=timeline(baseline,[newer]).events.filter(e=>e.id==='closest-game');
assert.equal(closestHistory.length,2);
assert.deepEqual(closestHistory.map(e=>[e.week,e.current.mark,e.previous.mark]),[[2,'0.02','0.08'],[3,'0.01','0.02']],'Later records preserve the earlier recap and replace the correct mark');
const future=clone(fixture);future.year=2027;future.games=future.games.filter(g=>g.period===2).map(g=>({...g,year:2027,period:1,weekly:g.weekly.map(w=>({...w,week:1}))}));
future.games[1].score1=118.69;future.games[1].weekly[0].score1=118.69;
assert.ok(timeline(baseline,[fixture,future]).events.some(e=>e.year===2027&&e.id==='closest-game'&&e.previous.mark==='0.02'));
assert.equal(timeline(baseline,[future]).events.length,0,'Missing prior seasons cannot create false records');
const pending=clone(fixture);pending.games.filter(g=>g.period===2).forEach(g=>g.final=false);
assert.equal(timeline(baseline,[pending]).events.length,0,'Unfinished games do not announce records');
const route=new Function(read('./direct-links.js').split('(function(){')[0]+';return hjDirectRoute;')();
for(const def of engine.HJ_RECORD_DEFINITIONS){const target=route('#record-book/'+def.id);assert.equal(target.category,def.category);assert.equal(target.record,def.id)}
assert.equal(route('#record-book/not-a-record'),null);
console.log('PASS record calculations: all categories, excluded career wins, real 0.02 finish, previous record, corrections, ties, future weeks/seasons and direct links');

const data={
 id:1630558,seasonId:2026,scoringPeriodId:3,status:{currentMatchupPeriod:3},
 teams:fixture.teams.map((name,i)=>({id:i+1,name,owners:[],roster:{entries:[]}})),
 settings:{scheduleSettings:{matchupPeriodCount:14,matchupPeriods:Object.fromEntries(Array.from({length:17},(_,i)=>[i+1,[i+1]]))}},
 schedule:fixture.games.map(g=>({id:g.matchupId,matchupPeriodId:g.period,winner:g.winner===g.manager1?'HOME':'AWAY',home:{teamId:g.homeTeamId,totalPoints:g.score1,pointsByScoringPeriod:{[g.period]:g.score1}},away:{teamId:g.awayTeamId,totalPoints:g.score2,pointsByScoringPeriod:{[g.period]:g.score2}}}))
};
for(const [engineName,browserType] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await browserType.launch();
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin==='https://hungjurors.test'){
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
    if(url.pathname.startsWith('/styles/'))return route.fulfill({contentType:'text/css',body:read('..'+url.pathname)});
   }
   return route.abort();
  });
  await page.goto('https://hungjurors.test/',{waitUntil:'load'});
  await page.evaluate(({data})=>{
   HJ_LEAGUE_STATE.data=data;
   const snapshot=hjRecordSnapshot(data,2026,t=>t.name),out=hjRecordTimeline(HIST,[snapshot]);
   HJ_RECORD_STATE.snapshots.set(2026,snapshot);HJ_RECORD_STATE.events=out.events;HJ_RECORD_STATE.history=out.history;
   document.dispatchEvent(new CustomEvent('hj:records',{detail:out.history}));
   for(const chosen of hjCompletedWeeks(data))HJ_RECAP_EXTRA.weeks.set(chosen.week,{key:hjRecapExtraKey(chosen),checked:Date.now(),games:new Map(),pool:[],transactions:[]});
   HJ_DATA.recapWeek=2;HJ_HQ_STATE.activeTab='rosters';
   document.getElementById('league-hq-tools').innerHTML='<div id="hq-panel-recap" data-hq-panel="recap" hidden><div class="hq-module"><div class="hq-module-body"></div></div></div>';
   hjRenderHQTabs();
  },{data});
  await page.locator('[data-hq-tab="recap"]').click();
  const card=page.locator('[data-record-announcement="2026:2:closest-game"]');
  await card.waitFor();
  assert.equal(await page.locator('.rc-record').count(),1,'Only the closest-game announcement is shown');
  assert.ok((await card.innerText()).includes('NEW LEAGUE RECORD!'));
  assert.ok((await card.innerText()).includes('Added to the League Record Book'));
  assert.ok((await card.innerText()).includes('2022 · Week 2'));
  assert.equal(await page.locator('.rc-record-announcements').evaluate(el=>el.previousElementSibling.querySelector('h3').textContent),'Weekly awards');
  assert.equal(await page.locator('.rc-record-announcements').evaluate(el=>el.nextElementSibling.querySelector('h3').childNodes[0].textContent.trim()),'Movers');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});
   const dimensions=await card.evaluate(el=>{
    const cellar=document.querySelector('.rc-cellar'),rect=el.getBoundingClientRect();
    const overflow=[...el.querySelectorAll('button,a,h3,h4,strong,p')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&((r.left<rect.left-1)||(r.right>rect.right+1)||(r.bottom>rect.bottom+1))}).map(n=>n.className);
    return {card:{width:rect.width,height:rect.height},cellar:{width:cellar.getBoundingClientRect().width,height:cellar.getBoundingClientRect().height},overflow};
   });
   assert.ok(Math.abs(dimensions.card.width-dimensions.cellar.width)<1,'Same banner width as The Cellar');
   assert.deepEqual(dimensions.overflow,[],'No clipped or overflowing content at '+width);
   console.log('LAYOUT '+engineName+' '+width+' '+JSON.stringify(dimensions));
   if(process.env.RECORD_PREVIEW&&engineName==='chromium'&&width!==320){
    const encoded=(await card.screenshot()).toString('base64');
    for(let offset=0;offset<encoded.length;offset+=3000)console.log('RECORD_PREVIEW '+JSON.stringify({width,offset,data:encoded.slice(offset,offset+3000)}));
   }
  }
  await page.setViewportSize({width:1280,height:900});
  await card.locator('.rc-record-face[data-manager="CESAR"]').click();
  await page.locator('.manager-modal-stage[aria-label="CESAR manager profile"]').waitFor();
  await page.locator('.manager-modal-close').click();
  await page.locator('.manager-modal-overlay').waitFor({state:'detached'});
  await card.locator('a[href="#record-book/closest-game"]').click();
  await page.waitForFunction(()=>document.querySelector('#record-tabs [data-record-category="scoring"]')?.getAttribute('aria-selected')==='true');
  assert.equal(await page.locator('#record-book-fold').evaluate(el=>el.open),true);
  assert.ok((await page.locator('#record-closest-game').innerText()).includes('0.02'));
  assert.equal(await page.evaluate(()=>document.activeElement.id),'record-closest-game');
  await page.goBack();
  await page.locator('[data-hq-tab="recap"]').click();
  await card.locator('.rc-record-score').first().click();
  assert.deepEqual(await page.evaluate(()=>({tab:HJ_HQ_STATE.activeTab,week:HJ_HQ_STATE.matchupWeek,key:HJ_HQ_STATE.matchupFocusKey})),{tab:'matchups',week:2,key:'2:9:6'},'Score opens the matching matchup');
  await page.locator('[data-hq-tab="recap"]').click();
  await page.locator('[data-hj-recap-week]').selectOption('1');
  assert.equal(await page.locator('.rc-record').count(),0,'Week 1 does not repeat Week 2 news');
  await page.locator('[data-hj-recap-week]').selectOption('2');
  assert.equal(await page.locator('.rc-record').count(),1,'Returning to Week 2 retains its announcement');
  const postseason=await page.evaluate(({data})=>{
   const post=structuredClone(data);
   post.schedule=[{...post.schedule[0],matchupPeriodId:15,playoffTierType:'WINNERS_BRACKET'},{...post.schedule[1],matchupPeriodId:15,playoffTierType:'LOSERS_BRACKET'}];
   const complete=hjCompletedWeeks(post).map(w=>w.week);
   post.schedule[1].winner='UNDECIDED';
   return {complete,pending:hjCompletedWeeks(post).map(w=>w.week)};
  },{data});
  assert.deepEqual(postseason,{complete:[15],pending:[]},'Postseason recaps include bracket games and byes but wait for all scheduled matchups');
  // A shared record link must select the right category on a fresh load too.
  await page.goto('https://hungjurors.test/#record-book/closest-game',{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#record-tabs [data-record-category="scoring"]')?.getAttribute('aria-selected')==='true');
  assert.equal(await page.locator('#record-book-fold').evaluate(el=>el.open),true);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'record-closest-game');
  assert.deepEqual(errors,[],engineName+' page scripts remain error-free');
  console.log('PASS '+engineName+': banner placement, mobile layout, manager profiles, matchup scores, exact record links, shared URLs and recap weeks');
 }finally{await browser.close()}
}
