import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const js=await fs.readFile('scripts/recap-live.js','utf8');
const site=await fs.readFile('index.html','utf8');
const siteStyles=[...site.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n');
const avatar=site.match(/const AV\s*=\s*(\{[\s\S]*?\});/)?.[1];
const avatars=avatar?vm.runInNewContext('('+avatar+')'):{};
const pos={1:'QB',2:'RB',3:'WR',4:'TE',5:'K',16:'D/ST'};
const ctx={
 hjPlayer:e=>e?.playerPoolEntry?.player||e?.player||{},
 hjRecapPlayer(e,w){const p=e?.playerPoolEntry?.player||e?.player||{},s=p.stats?.find(s=>s.scoringPeriodId===w&&s.statSourceId===0&&s.statSplitTypeId===1);return {entry:e,id:String(p.id),name:p.fullName,pos:pos[p.defaultPositionId],points:s?.appliedTotal??null,stat:s}},
 esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
 hjChPlayerAttrs:p=>({attrs:'data-player-id="'+p.id+'"',photo:'https://a.espncdn.com/i/headshots/nfl/players/full/'+p.id+'.png'}),
 av:(s,cls)=>'<img class="av '+cls+'" src="data:image/png;base64,'+(avatars[s]||Object.values(avatars)[0]||'')+'" alt="">',
 HJ_PRO_TEAM_BY_ID:{},console
};
vm.createContext(ctx);vm.runInContext(js,ctx);
const e=(id,position,score,slot=20)=>({lineupSlotId:slot,player:{id,fullName:'Player '+id,defaultPositionId:position,stats:[{scoringPeriodId:1,statSourceId:0,statSplitTypeId:1,appliedTotal:score},{scoringPeriodId:2,statSourceId:0,statSplitTypeId:1,appliedTotal:100-score}]}});
const qb=e(1,1,60,0),bench=e(2,3,49),ir=e(3,4,45,21),freeQB=e(4,1,55),free=e(5,2,40),dst=e(6,16,39),k=e(7,5,38),wr=e(8,3,37),te=e(9,4,36),low=e(10,2,1);
const chosen={week:1,scores:[{teamId:'a',short:'A',lineupComplete:true,entries:[qb,bench,ir],starters:[qb]},{teamId:'b',short:'B',lineupComplete:true,entries:[low],starters:[low]}]},data={teams:[{id:'a'},{id:'b'}]},extra={pool:[qb,bench,ir,freeQB,free,dst,k,wr,te,low,free]};
let result=ctx.hjRcTopFives(chosen,extra,data);
assert.deepEqual(Array.from(result.overall,p=>p.id),['1','4','2','3','5']);
assert.deepEqual(Array.from(result.wire,p=>p.id),['5','6','7','8','9']);
assert.equal(result.overall[2].rosterSlot,20);assert.equal(result.overall[3].rosterSlot,21);
assert.equal(ctx.hjRcTopFives(chosen,{},data).ready,false);
const incomplete=structuredClone(chosen);incomplete.scores[1].lineupComplete=false;
assert.equal(ctx.hjRcTopFives(incomplete,extra,data).wireReady,false);
const past=structuredClone(chosen);past.week=2;past.scores[0].entries.push(free);
result=ctx.hjRcTopFives(past,extra,data);
assert(!result.wire.some(p=>p.id==='5'));assert(result.overall.some(p=>p.id==='10'));
assert.equal(ctx.hjRcTopFives(chosen,extra,data).wire[0].id,'5');
const tie=structuredClone(extra);tie.pool.find(x=>x.player.id===6).player.stats[0].appliedTotal=40;
const tieHTML=ctx.hjRcTopFiveBoards({topFives:ctx.hjRcTopFives(chosen,tie,data)});
assert(tieHTML.includes('Rank 1'));assert(tieHTML.includes('Rank 3'));
const htmlSource=await fs.readFile('scripts/recap-live.js','utf8');
assert(htmlSource.includes("model.benchers)}${hjRcTopFiveBoards(model)}"));
console.log('PASS: overall includes starters, bench, IR, unowned and every position; wire excludes QB and all owned slots; week switching, duplicates, ties and missing-data states.');
await fs.mkdir('recap-preview',{recursive:true});
let live;
for(const week of [1,2,3]){
 const base='https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leagues/1630558?scoringPeriodId='+week;
 const filter={players:{filterSlotIds:{value:[0,2,4,6,16,17]},filterStatsForSourceIds:{value:[0,1]},filterStatsForSplitTypeIds:{value:[0,1]},filterStatsForScoringPeriodIds:{value:Array.from({length:week+1},(_,i)=>i)},limit:1500,offset:0,sortPercOwned:{sortAsc:false,sortPriority:1}}};
 const [h,p]=await Promise.all([
 fetch(base+'&view=mMatchup&view=mMatchupScore&view=mRoster&view=mSettings&view=mTeam',{signal:AbortSignal.timeout(20000)}).then(async r=>{if(!r.ok)throw Error('ESPN '+r.status+' '+await r.text());return r.json()}),
 fetch(base+'&view=kona_player_info',{headers:{'x-fantasy-filter':JSON.stringify(filter)},signal:AbortSignal.timeout(20000)}).then(async r=>{if(!r.ok)throw Error('ESPN '+r.status+' '+await r.text());return r.json()})
 ]);
 assert(p.players.length>0&&p.players.length<1500);
 const scores=h.schedule.filter(g=>Number(g.matchupPeriodId)===week).flatMap(g=>['home','away'].flatMap(side=>{const s=g[side];if(!s?.teamId)return [];const entries=(s.rosterForCurrentScoringPeriod||s.rosterForMatchupPeriod||s.roster)?.entries||[];return [{teamId:s.teamId,short:({4:'NATHAN M',11:'KAT',8:'NATHAN T',9:'GARRETT'})[s.teamId]||'Team '+s.teamId,lineupComplete:entries.length>0,entries,starters:entries.filter(e=>![20,21].includes(Number(e.lineupSlotId)))}]}));
 const ranks=ctx.hjRcTopFives({week,scores},{pool:p.players},h);
 assert(scores.flatMap(r=>r.entries).every(e=>ctx.hjPlayer(e).id),'Roster player IDs parsed');assert(ranks.overall.some(p=>p.owner),'Owned scorers recognized');assert.equal(ranks.overall.length,5);assert(ranks.wireReady,'Historical roster unavailable W'+week);assert.equal(ranks.wire.length,5);
 console.log('Week '+week,JSON.stringify({overall:ranks.overall.map(p=>[p.name,p.points]),wire:ranks.wire.map(p=>[p.name,p.points])}));
 live={topFives:ranks};
}
const {chromium}=await import('playwright');
const browser=await chromium.launch({headless:true});
const css=await fs.readFile('styles/weekly-recap.css','utf8'),html=ctx.hjRcTopFiveBoards(live);
for(const width of [320,390,1280]){
 const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1});
 await page.setContent('<style>'+siteStyles+'\n'+css+'\nbody{margin:0;padding:12px}</style><div class="rc"><h3 class="rc-h" id="reference-heading">Benchwarmers of the week <small>best scores left on a bench</small></h3>'+html+'</div>');
 await page.waitForTimeout(1200);
 assert.equal(await page.locator('.rc-five-row').count(),10);
 assert.equal(await page.locator('.rc-five-board header').count(),0);
 assert(await page.locator('.rc-five-owner img').count()>0);
 assert(await page.evaluate(()=>[...document.querySelectorAll('.rc-five-row')].every(e=>e.getBoundingClientRect().height<85)),'Compact rows');
 assert(await page.evaluate(()=>{const a=getComputedStyle(document.querySelector('#reference-heading')),b=getComputedStyle(document.querySelector('.rc-five-board .rc-h'));return a.font===b.font&&a.color===b.color}),'Existing heading style');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);
 if(width===390){const png=await page.screenshot({fullPage:true});await fs.writeFile('recap-preview/mobile.png',png);await fs.writeFile('recap-preview/mobile.base64.txt',png.toString('base64'));}
 await page.close();
}
await browser.close();console.log('PASS: two five-row boards at 320, 390 and 1280px without horizontal overflow.');
