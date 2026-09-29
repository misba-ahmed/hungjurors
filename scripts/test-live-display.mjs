import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const html=prepareSite(read('../index.html'));
const extract=(from,to)=>html.slice(html.indexOf(from),html.indexOf(to,html.indexOf(from)));
const context={hjCurrentWeek:()=>3,hjNumber:x=>x==null?null:Number(x)};
vm.createContext(context);
vm.runInContext(extract('function hjSideScore(','function hjGameFinal(')+read('./espn-win-probability.js'),context);
for(const [fraction,expected] of [[0,0],[.01,1],[.56,56],[.99,99],[1,100]]){
 assert.equal(context.hjEspnWinProbability({home:{winProbability:fraction}},3,{}),expected);
}
assert.equal(context.hjEspnWinProbability({home:{},away:{winProbability:.44}},3,{}),56);
assert.equal(context.hjEspnWinProbability({home:{},away:{}},3,{}),null);
const historical={matchupPeriodId:2,home:{teamId:1,totalPoints:85.32,winProbability:1},away:{teamId:2,totalPoints:179.52}};
assert.equal(context.hjEspnWinProbability(historical,2,{}),0);
Object.assign(context,{hjMatchManager:t=>t.name,hjOwnerName:t=>t.name});
vm.runInContext(extract('function hjMatchupSwitchMetaV32(','function hjMatchupJumpAvatarV32('),context);
const data={teams:[{id:1,name:'MISBA'},{id:2,name:'TYLER'}]};
const meta=context.hjMatchupSwitchMetaV32(historical,data,data);
assert.equal(meta.scoreA,85.32);assert.equal(meta.scoreB,179.52);

// Uneven server pages and a failed middle page must not reveal older stories early.
const calls=[],pages={a:[28,27,26,25,24],b:[28,15,14]};
let fail=true;
const feedContext={
 URLSearchParams,FFN_PLAYER_NEWS_LIMIT:50,
 ffnImmediateNextGame:()=>'',ffnFeedToItem:(row,p)=>({id:p.id+'-'+row.day,published_at:row.published}),
 fetchEspnJson:async url=>{
  const query=new URL(url).searchParams,id=query.get('playerId'),offset=Number(query.get('offset'));
  calls.push([id,offset]);
  if(id==='a'&&offset===2&&fail){fail=false;throw Error('temporary failure')}
  return {resultsOffset:offset,resultsCount:pages[id].slice(offset,offset+2).length,feed:pages[id].slice(offset,offset+2).map(day=>({playerId:id,day,published:'2026-09-'+String(day).padStart(2,'0')+'T12:00:00Z'}))};
 }
};
vm.createContext(feedContext);
vm.runInContext(extract('async function ffnMapLimit(','function ffnInstallRoster(')+read('./news-feed.js'),feedContext);
const session={shards:['a','b'].map(id=>({players:[{id}],offset:0,through:Infinity,done:false})),items:new Map(),visible:[],pending:null,retryAt:0};
await feedContext.ffnFeedFill(session,5);
assert.deepEqual(Array.from(session.visible,p=>p.id),['a-28','b-28']);
assert.equal(session.shards[0].offset,2,'failed page keeps its cursor');
session.retryAt=0;
await feedContext.ffnFeedFill(session,5);
assert.deepEqual(Array.from(session.visible,p=>p.id),['a-28','b-28','a-27','a-26','a-25']);
await feedContext.ffnFeedFill(session,10);
assert.deepEqual(Array.from(session.visible,p=>p.id),['a-28','b-28','a-27','a-26','a-25','a-24','b-15','b-14']);
assert.ok(!calls.some(([,offset])=>offset===50),'offset follows actual returned row count');
Object.assign(feedContext,{
 ffnFilterState:{manager:'MISBA',position:'RB',team:'CAR',player:''},
 ffnRosterPlayers:[{id:'a',name:'Chuba Hubbard',team:'CAR',position:'RB'},{id:'b',name:'Jalen Coker',team:'CAR',position:'WR'},{id:'c',name:'Other',team:'CAR',position:'RB'}],
 ffnNorm:s=>s.toLowerCase(),ffnManagerRosterIndex:()=>new Map(),
 ffnItemTouchesManager:p=>p.espn_id!=='c'
});
assert.deepEqual(Array.from(feedContext.ffnFeedPlayers(),p=>p.id),['a']);

// Safari engine: actual CSS, non-equal card heights, swipe settling and row states.
const browser=await webkit.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
 const headEnd=html.indexOf('</head>');
 const styleBlock=chunk=>[...chunk.matchAll(/<style\b[^>]*>([^]*?)<\/style>/g)].map(m=>m[1]).join('\n');
 const styles=styleBlock(html.slice(0,headEnd))+'\n'+read('../styles/side-bets.css')+'\n'+read('../styles/live-display.css')+'\n'+styleBlock(html.slice(headEnd));
 const row=(right=false,live=false)=>'<button class="hj-player-v3'+(right?' is-right':'')+'" data-game-in-progress="'+live+'"><span class="hj-v3-avatar">A</span><span class="hj-v3-identity"><span class="hj-v3-name">Player</span></span><span class="hj-game-context">Q1 8:32<br>12 RY</span><span class="hj-v3-score">14.2</span></button>';
 const profile='<section class="profile-schedule-compact"><div class="profile-schedule-strip">'+['TYLER','NATHAN T'].map(name=>'<div class="profile-schedule-node"><span class="profile-schedule-week">W2</span><span class="av">A</span><span class="profile-schedule-opp"><span class="profile-schedule-vs">VS</span><span class="profile-schedule-opp-name">'+name+'</span></span><span class="profile-schedule-result">W 147.40–145.56</span><span class="profile-schedule-h2h">H2H 3–5 · -86.38 PTS</span></div>').join('')+'</div><div id="profile-roster">'+row().replace('hj-player-v3','hj-player-v3 hj-roster-player')+'</div></section>';
 const markup='<main id="league-hq"><section id="hq-panel-matchups"><div class="schedule-weeknav"><button class="schedule-week-btn"><span class="schedule-week-n">3</span></button></div><div class="hq-matchup-switcher">'+[0,1,2].map(i=>'<button class="hq-matchup-jump" data-hq-matchup-jump="'+i+'">Match '+i+'</button>').join('')+'</div><div class="hq-matchup-list">'+[0,1,2].map(i=>'<article class="hq-matchup is-open" data-hq-matchup-key="'+i+'">'+row()+row(true,true)+'<div style="height:'+(i===1?900:200)+'px"></div></article>').join('')+'</div></section></main>';
 await page.setContent('<style>'+styles+'</style>'+markup+profile+'<style>html,body{margin:0;padding:0}#league-hq{margin:0;padding:0;width:100%}</style>');
 await page.addScriptTag({content:'window.HJ_HQ_STATE={matchupFocusKey:"0"};function hjCenterMatchupJumpChipV32(){}'});
 await page.addScriptTag({content:read('./matchup-navigation.js')});
 await page.waitForTimeout(250);
 const week=await page.locator('.schedule-week-btn').boundingBox();
 assert.equal(Math.round(week.width),38);assert.equal(Math.round(week.height),38);
 const initial=await page.locator('.hq-matchup-list').boundingBox();
 async function swipe(direction){
  await page.locator('.hq-matchup-list').evaluate((deck,direction)=>{
   const x=direction>0?330:40,end=direction>0?40:330;
   const event=(type,touches,changedTouches)=>{
    const e=new Event(type,{bubbles:true});Object.defineProperties(e,{touches:{value:touches},changedTouches:{value:changedTouches}});deck.dispatchEvent(e);
   };
   event('touchstart',[{clientX:x,clientY:300}],[]);
   deck.scrollLeft+=(direction*deck.clientWidth*.62);
   event('touchend',[],[{clientX:end,clientY:300}]);
  },direction);
  await page.waitForTimeout(300);
 }
 await swipe(1);
 assert.equal(await page.evaluate(()=>HJ_HQ_STATE.matchupFocusKey),'1');
 const tall=await page.locator('.hq-matchup-list').boundingBox();
 assert.ok(tall.height>initial.height+600);
 await swipe(1);
 assert.equal(await page.evaluate(()=>HJ_HQ_STATE.matchupFocusKey),'2');
 const short=await page.locator('.hq-matchup-list').boundingBox();
 assert.ok(Math.abs(short.height-initial.height)<2);
 const aligned=await page.locator('.hq-matchup-list').evaluate(deck=>{
  const card=deck.children[2];return Math.abs(card.getBoundingClientRect().left-deck.getBoundingClientRect().left);
 });
 assert.ok(aligned<1,'swipe ends at a whole card');
 await swipe(-1);
 assert.equal(await page.evaluate(()=>HJ_HQ_STATE.matchupFocusKey),'1');
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});await page.waitForTimeout(250);
  for(const selector of ['.hj-player-v3:not(.is-right)','.hj-player-v3.is-right']){
   const rows=page.locator(selector);
   const placement=await rows.first().evaluate(el=>{
    const avatar=el.querySelector('.hj-v3-avatar').getBoundingClientRect(),game=el.querySelector('.hj-game-context').getBoundingClientRect();
    return {below:game.top>=avatar.bottom,beside:game.left>=avatar.right||game.right<=avatar.left};
   });
   assert.ok(width<=760?placement.below:placement.beside,'game context placement at '+width);
  }
  const compact=await page.locator('#profile-roster .hj-player-v3').evaluate(el=>{
   const avatar=el.querySelector('.hj-v3-avatar').getBoundingClientRect(),game=el.querySelector('.hj-game-context').getBoundingClientRect();
   return game.left>=avatar.right;
  });
  assert.ok(compact,'roster details stay beside avatar at '+width);
  for(const card of await page.locator('.profile-schedule-node').all()){
   const fits=await card.evaluate(el=>{
    const opponent=el.querySelector('.profile-schedule-opp').getBoundingClientRect(),result=el.querySelector('.profile-schedule-result').getBoundingClientRect(),h2h=el.querySelector('.profile-schedule-h2h').getBoundingClientRect();
    return result.top>=opponent.bottom&&h2h.top>=result.bottom&&h2h.bottom<=el.getBoundingClientRect().bottom;
   });
   assert.ok(fits,'schedule name, result and history do not overlap');
  }
 }
 const normal=page.locator('.hq-matchup').nth(1).locator('.hj-player-v3').first();
 const before=await normal.evaluate(el=>getComputedStyle(el).backgroundColor);
 await normal.hover();
 assert.equal(await normal.evaluate(el=>getComputedStyle(el).backgroundColor),before);
 assert.equal(await page.locator('[data-game-in-progress="true"]').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(238, 237, 229)');
}finally{await browser.close()}
console.log('PASS ESPN probability, historical scores, chronological filtered news, Safari paging and player rows');

// Exercise real pagination metadata without coupling fixtures to live headlines.
for(const offset of [0,50]){
 const url='https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players?limit=50&offset='+offset+'&playerId=4240657&playerId=4360078&playerId=4432728';
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(10000)});
  const data=await response.json();
  console.log('ESPN news page',JSON.stringify({offset,resultsOffset:data.resultsOffset,resultsCount:data.resultsCount,count:data.feed?.length,newest:data.feed?.[0]?.published,oldest:data.feed?.at(-1)?.published}));
 }catch(error){console.log('Live news pagination unavailable:',error.message)}
}
