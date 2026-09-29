import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preparePlayerStatBars} from './prepare-player-stat-bars.mjs';

const raw=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const html=preparePlayerStatBars(raw);
const extras=readFileSync(new URL('./player-stat-extras.js',import.meta.url),'utf8');
const ranks=readFileSync(new URL('./opponent-rank-updates.js',import.meta.url),'utf8');
function between(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,start+' exists');return source.slice(a,b);
}
const events=[],rankState={maps:new Map()},season={value:2026};
const update=new Function('HJ_GAME_RANKS','getSeason','document','Event',
 'let NFL_SEASON=getSeason();'+ranks+';return (year,updates)=>{NFL_SEASON=getSeason();hjUpdateOpponentRankMaps(year,updates)};'
)(rankState,()=>season.value,{dispatchEvent:event=>events.push(event.type)},class {constructor(type){this.type=type}});
const table=(year=2026,rank=3)=>new Map([['DAL',{season:year,rank}],['PHI',{season:year,rank:12}]]);
update(2026,[['D/ST',table()],['RB',table()]]);
const dst=rankState.maps.get('D/ST');
update(2026,[['RB',table(2026,4)]]); // A skill refresh owns no D/ST data.
assert.equal(rankState.maps.get('D/ST'),dst);
assert.equal(rankState.maps.get('RB').get('DAL').rank,4);
const count=events.length;
update(2026,[['RB',new Map()],['D/ST',new Map()]]);
update(2026,[['RB',new Map([['DAL',{season:2026,rank:1}]])]]);
assert.equal(events.length,count,'incomplete refreshes cause no rank repaint');
assert.equal(rankState.maps.get('RB').get('DAL').rank,4);
update(2026,[['RB',table(2026,4)]]);
assert.equal(events.length,count,'unchanged ranks cause no repaint');
update(2026,[['D/ST',table(2026,2)]]);
assert.equal(rankState.maps.get('D/ST').get('DAL').rank,2,'new valid ranks still update');
season.value=2027;
update(2027,[['RB',table(2027,1)]]);
assert.equal(rankState.maps.has('D/ST'),false,'previous-season ranks are not retained');
update(2026,[['D/ST',table()]]);
assert.equal(rankState.maps.has('D/ST'),false,'late prior-season requests cannot restore old ranks');

// Exercise the real season-publisher path that previously cleared D/ST.
const source=between(html,'function hjDataPublishSeason(season,rows){','async function hjDataEnrichSchedule');
const shared={seasons:new Map()},gameRanks={maps:new Map([['D/ST',table()]])};
const publish=new Function('HJ_DATA','pcSeasonFetchedAt','document','CustomEvent','Event','NFL_SEASON','HJ_GAME_RANKS','pcDvp','hjBuildFantasyRankMaps','HJ_FANTASY_RANKS','hjRefreshGameContexts',
 ranks+source+';return hjDataPublishSeason;'
)(shared,new Map(),{dispatchEvent(){}},class {},class {},2026,gameRanks,()=>[],()=>({byId:new Map(),byName:new Map()}),{},()=>{});
publish(2026,[]);
assert.equal(gameRanks.maps.get('D/ST').get('DAL').rank,3,'season refresh preserves D/ST ranks');

// A snap/DST request can finish while the season-row request is pending.
const state={data:new Map(),retryAt:new Map(),retryTimers:new Map(),loading:new Map()};
const old={loadedAt:0,snaps:new Map(),dstEntries:[]};
state.data.set(2026,old);
let release;
const seasonJob=new Promise(resolve=>{release=resolve});
const pending=new Promise(()=>{});
const ensureSource=between(html,'async function hj40EnsureSeason(season,force=false){',"  document.addEventListener('hj:snaps-data'");
const ensure=new Function('HJ40','CURRENT_SEASON','pcLoadSeason','hj40Publish','pcLoadDstSeason','pcLoadSnaps','clearTimeout','requestAnimationFrame',
 ensureSource+';return hj40EnsureSeason;'
)(state,2026,()=>seasonJob,(year,rows,snaps,dst)=>{const value={rows,snaps,dstEntries:dst};state.data.set(year,value);return value},()=>pending,()=>pending,()=>{},()=>{});
void ensure(2026,true);
const snaps=new Map([['player-week',{offense_pct:0.75}]]),entries=[{id:'dst-with-results'}];
state.data.set(2026,{...old,snaps,dstEntries:entries});
release([]);
await Promise.resolve();await Promise.resolve();
assert.equal(state.data.get(2026).snaps,snaps,'newer snap data survives overlapping season refresh');
assert.equal(state.data.get(2026).dstEntries,entries,'newer D/ST stats survive overlapping season refresh');

// Sorted stats stay visible across mixed positions, different widths and new rows.
const view={statSort:'oppRank'},panel={activeTab:'free-agents'};
let rails=[];
const revealSource=between(extras,'function hj40RevealSortedStat(){','  let hj40StatRailFrame');
const reveal=new Function('HJ40','HJ_HQ_STATE','document',revealSource+';return hj40RevealSortedStat;')(
 view,panel,{querySelectorAll:()=>rails}
);
function rail(offset,width=320,key='oppRank'){
 const r={clientWidth:width,clientLeft:1,scrollLeft:0,scrollWidth:1250,moves:0,
 getBoundingClientRect:()=>({left:20}),scrollTo({left,behavior}){assert.equal(behavior,'instant');this.scrollLeft=left;this.moves++}};
 r.button={dataset:{hq40SortStat:key},getBoundingClientRect:()=>({left:21+offset-r.scrollLeft,right:21+offset-r.scrollLeft+57,width:57})};
 r.querySelectorAll=()=>[r.button];return r;
}
rails=[rail(1100),rail(620,450),rail(10),rail(900,0),rail(300,200,'rec')];
reveal();
for(const r of rails.slice(0,3)){const b=r.button.getBoundingClientRect();assert.ok(b.left>=21&&b.right<=21+r.clientWidth,'entire sorted stat visible')}
assert.equal(rails[2].moves,0,'already-visible stats stay put');
assert.equal(rails[3].moves,0,'hidden rails are skipped');
assert.equal(rails[4].moves,0,'positions without the chosen stat are skipped');
const added=rail(1150);rails.push(added);reveal();assert.ok(added.scrollLeft>0,'newly loaded player aligned');
rails[0].clientWidth=100;reveal();assert.ok(rails[0].button.getBoundingClientRect().right<=121,'resize keeps stat visible');
view.statSort='pffGrade';const before=added.moves;reveal();assert.equal(added.moves,before);
panel.activeTab='rosters';view.statSort='oppRank';added.scrollLeft=0;reveal();assert.equal(added.scrollLeft,0);

// Roster/start zero values remain real data; a bye has no opponent rank.
const ownership=between(extras,'  let hj40OwnershipPool','  function hj40ExtraValue');
const values=new Function('HJ_DATA','NFL_SEASON','hjCurrentWeek','hjPlayer','HJ_PLAYER_DIRECTORY','HJ_ESPN_HQ_POOL','hj40Finite','hjUpcomingForWeek','HJ_GAME_RANKS','hj40Pos','pcTeam',
 ownership+';return {owned:hj40OwnershipValue,opponent:hj40OpponentRank};'
)({requests:new Map()},2026,()=>4,e=>e?.player||e,{espnCache:new Map()}, {byId:new Map()},v=>v==null||v===''?null:Number(v),()=>null,rankState,x=>x,x=>x);
assert.equal(values.owned({id:1,ownership:{percentOwned:0}},'percentOwned'),0);
assert.equal(values.owned({id:1,ownership:{percentStarted:0}},'percentStarted'),0);
assert.equal(values.opponent({team:'DAL',position:'D/ST'}),null);

// All emitted classic scripts must remain syntactically valid.
let scripts=0;
for(const tag of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 if(!tag[2].trim()||/src=|application\/ld\+json|application\/json|type="module"/.test(tag[1]))continue;
 new Function(tag[2]);scripts++;
}
console.log('Player stat refresh/scroll regression checks passed; '+scripts+' scripts parsed.');
