import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
function setup(){
 const c=vm.createContext({console,Map,Set,Math,Number,
  hjMatchManager:t=>t.name,hjOwnerName:t=>t.name,hjSideScore:(s,w)=>s.pointsByScoringPeriod?.[w]??s.totalPointsLive??s.totalPoints??null,
  hjCurrentWeek:d=>d?.scoringPeriodId||1,esc:s=>String(s),av:n=>'<img alt="'+n+'">',
  wireCard:({body})=>'<article data-wire-card>'+body+'</article>',wireBuild:()=>({cards:[{section:'recap',html:'ordinary recap'}]}),
  hjMatchupCardHTML:()=>'<div class="hq-edge-grid">normal matchup</div>',hjRcStories:()=>'<div>normal recap</div>',
  WIRE:{recapWeek:6},document:{addEventListener:()=>{}},
 });
 vm.runInContext(read('free-throw-bet.js'),c);
 c.bet=vm.runInContext('HJ_FREE_THROW_BET',c);return c;
}
function fixture(winner='UNDECIDED',misba=100,bryan=112.6){return {seasonId:2026,scoringPeriodId:7,teams:[{id:1,name:'MISBA'},{id:2,name:'BRYAN'},{id:3,name:'GARRETT'}],schedule:[{id:7,matchupPeriodId:7,winner,home:{teamId:1,totalPoints:misba},away:{teamId:2,totalPoints:bryan}}]}}
test('only the Week 7 Misba/Bryan matchup qualifies; pending scores do not settle',()=>{
 const c=setup(),d=fixture();assert.equal(c.hjFreeThrowBetSnapshot(d).base,null);
 for(const bad of [{...d,seasonId:2025},{...d,schedule:[{...d.schedule[0],matchupPeriodId:8}]},{...d,schedule:[{...d.schedule[0],away:{teamId:3,totalPoints:200}}]}])assert.equal(c.hjFreeThrowBetSnapshot(bad),null);
 d.schedule[0].winner='AWAY';d.schedule[0].home.totalPoints=null;assert.equal(c.hjFreeThrowBetSnapshot(d).final,false);
});
test('the loser pays their own misses: Misba $29, Bryan $22, tie $0',()=>{
 const c=setup();c.bet.extra.agreed=false;let s=c.hjFreeThrowBetSnapshot(fixture('AWAY'));
 assert.equal(s.loser.name,'MISBA');assert.equal(s.winner.name,'BRYAN');assert.equal(s.total,29);assert.equal(s.extraShots,null);
 s=c.hjFreeThrowBetSnapshot(fixture('HOME',120,112.6));assert.equal(s.loser.name,'BRYAN');assert.equal(s.total,22);
 s=c.hjFreeThrowBetSnapshot(fixture('TIE',100,100));assert.equal(s.total,0);assert.equal(s.winner,null);
});
test('optional extra shots require agreement; round up; only confirmed misses add money',()=>{
 const c=setup();c.bet.extra.agreed=true;
 let s=c.hjFreeThrowBetSnapshot(fixture('AWAY'));assert.equal(s.extraShots,13);assert.equal(s.total,null);assert.equal(s.base,29);
 Object.assign(c.bet.extra,{attempted:13,made:8,shooter:'MISBA'});
 s=c.hjFreeThrowBetSnapshot(fixture('AWAY'));assert.equal(s.extraOwed,5);assert.equal(s.total,34);
 c.bet.extra.made=null;assert.equal(c.hjFreeThrowBetSnapshot(fixture('AWAY')).total,null);
 assert.equal(c.hjFreeThrowBetSnapshot(fixture('AWAY',100.1,112.1)).extraShots,12,'floating point noise cannot add a shot');
 assert.equal(c.hjFreeThrowBetSnapshot(fixture('AWAY',100,100.01)).extraShots,1);
 Object.assign(c.bet.extra,{attempted:8,made:3,shooter:'BRYAN'});assert.equal(c.hjFreeThrowBetSnapshot(fixture('HOME',120,112.6)).total,27);
});
test('corrections replace the result and invalidate extra attempts for a different loser or margin',()=>{
 const c=setup();Object.assign(c.bet.extra,{agreed:true,attempted:13,made:8,shooter:'MISBA'});
 assert.equal(c.hjFreeThrowBetSnapshot(fixture('AWAY')).total,34);
 const corrected=c.hjFreeThrowBetSnapshot(fixture('HOME',120,112.6));assert.equal(corrected.base,22);assert.equal(corrected.total,null);
 assert.equal(c.hjFreeThrowBetSnapshot(fixture('AWAY',100,114)).total,null);
 c.bet.extra.agreed=false;assert.equal(c.hjFreeThrowBetSnapshot(fixture('HOME',120,112.6)).total,22);
});
test('Wire, correct matchup and Week 7 recap all display the same agreement and outcome',()=>{
 const c=setup(),d=fixture('AWAY');const before=JSON.stringify(d);
 const built=c.wireBuild(d);assert.equal(built.cards.length,2);assert.match(built.cards[1].html,/data-wire-key="2026-w7-misba-bryan-free-throws"/);
 assert.match(built.cards[1].html,/\$29 to BRYAN/);assert.match(built.cards[1].html,/\$22 to MISBA/);assert.match(built.cards[1].html,/data-wire-matchup="7:1:2"/);
 assert.match(c.hjMatchupCardHTML(d.schedule[0],d,d,false),/rounded up to a whole shot/);
 assert.doesNotMatch(c.hjMatchupCardHTML({...d.schedule[0],home:{teamId:3}},d,d,false),/Free Throws/);
 assert.doesNotMatch(c.hjMatchupCardHTML(d.schedule[0],d,d,true),/Free Throws/);
 assert.match(c.hjRcStories({week:7},[],{data:d}),/BRYAN \$29/);
 assert.doesNotMatch(c.hjRcStories({week:6},[],{data:d}),/Free Throws/);
 c.WIRE.recapWeek=8;assert.equal(c.wireBuild({...d,scoringPeriodId:9}).cards.length,1);
 assert.equal(JSON.stringify(d),before);
});
test('results use the completed-results overlay while preserving the raw matchup',()=>{
 const c=setup(),d=fixture();c.hjResultsView=raw=>({...raw,schedule:[{...raw.schedule[0],winner:'AWAY'}]});
 assert.equal(c.hjFreeThrowBetSnapshot(d).base,29);assert.equal(c.hjFreeThrowBetSnapshot(d).total,null);assert.equal(d.schedule[0].winner,'UNDECIDED');
 assert.match(c.hjMatchupCardHTML(d.schedule[0],d,d,false),/BRYAN \$29/);
});

test('confirmed agreement shows a provisional live counter without settling money',()=>{
 const c=setup();assert.equal(c.bet.extra.agreed,true);
 const d=fixture('UNDECIDED',54.24,0),s=c.hjFreeThrowBetSnapshot(d);
 assert.equal(s.liveTrailer.name,'BRYAN');assert.equal(s.liveMargin,54.24);assert.equal(s.total,null);assert.equal(s.extraShots,null);
 let html=c.wireBuild(d).cards[1].html;assert.match(html,/LOCKED IN/);assert.match(html,/If it ended now/);assert.match(html,/BRYAN shoots/);assert.match(html,/>55<small>EXTRA SHOTS/);assert.doesNotMatch(html,/Optional extra shots/);
 html=c.wireBuild(fixture('UNDECIDED',100.1,112.1)).cards[1].html;assert.match(html,/MISBA shoots/);assert.match(html,/>12<small>EXTRA SHOTS/);
 html=c.wireBuild(fixture('TIE',100,100)).cards[1].html;assert.match(html,/Final · tie game/);assert.match(html,/>0<small>EXTRA SHOTS/);
 const unknown=fixture();unknown.schedule[0].home.totalPoints=null;html=c.wireBuild(unknown).cards[1].html;assert.match(html,/>—<small>EXTRA SHOTS/);assert.doesNotMatch(html,/MISBA shoots|BRYAN shoots/);
});
