import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const code=await readFile(new URL('./degenerate-side-bet.js',import.meta.url),'utf8');
function harness(){
 const context={hjMatchManager:t=>t.name,hjOwnerName:t=>t.name,hjSideScore:s=>s.totalPoints,hjCurrentWeek:()=>8,esc:s=>String(s),av:n=>'<img alt="'+n+'">',hjMatchupCardHTML:()=>'<div class="hq-edge-grid">',wireBuild:()=>({cards:[]}),wireCard:({body})=>'<div data-wire-card>'+body+'</div>',hjRcStories:()=>'',WIRE:{recapWeek:7},document:{addEventListener(){}}};
 vm.createContext(context);vm.runInContext(code,context);return context;
}
function data(home=0,away=0,winner='UNDECIDED'){return {seasonId:2026,teams:[{id:1,name:'MISBA'},{id:2,name:'CESAR'}],schedule:[{matchupPeriodId:8,home:{teamId:1,totalPoints:home},away:{teamId:2,totalPoints:away},winner}]}}
test('pre-game and missing scores never name a loser or invent a payment',()=>{const c=harness();for(const d of [data(),data(null,20)]){const v=c.hjDegenerateBetSnapshot(d);assert.equal(v.loser,null);const html=c.wireBuild(d).cards[0].html;assert.match(html,/Final margin/);assert.doesNotMatch(html,/\$0\.00|\$20\.00/);}});
test('live margin remains conditional; final uses exact cents and follows corrections',()=>{const c=harness();let d=data(99.12,110.35);let h=c.wireBuild(d).cards[0].html;assert.match(h,/IF IT ENDED NOW/);assert.match(h,/MISBA → CESAR/);assert.match(h,/\$11\.23/);d.schedule[0].winner='AWAY';h=c.wireBuild(d).cards[0].html;assert.match(h,/FINAL · AMOUNT PER PROFITABLE WEEK/);assert.match(h,/Only if the loser makes a gambling profit/);d=data(111,110.35,'HOME');h=c.wireBuild(d).cards[0].html;assert.match(h,/CESAR → MISBA/);assert.match(h,/\$0\.65/);});
test('final tie does not create a loser or obligation',()=>{const c=harness(),h=c.wireBuild(data(100,100,'TIE')).cards[0].html;assert.match(h,/No matchup loser/);assert.match(h,/No payment/);});
test('weekly cards repeat the live margin and retain the final amount on all surfaces',()=>{
 const c=harness();
 for(const [d,amount] of [[data(0,0),'—'],[data(99.12,110.35),'$11.23'],[data(111,110.35,'HOME'),'$0.65'],[data(100,100,'TIE'),'$0.00'],[data(null,20),'—']]){
  const surfaces=[c.wireBuild(d).cards[0].html,c.hjMatchupCardHTML(d.schedule[0],d,d,false),c.hjRcStories({week:8},[],{data:d})];
  for(const h of surfaces){const cards=[...h.matchAll(/class="dg-ticket"><b>WEEK \d<\/b><strong>(.*?)<\/strong>/g)];assert.equal(cards.length,4);assert(cards.every(m=>m[1]===amount));assert.doesNotMatch(h,/Pending|logged|logging|Casino visit log/);}
 }
 const h=c.wireBuild(data()).cards[0].html;assert.match(h,/dg-blackjack/);assert.doesNotMatch(h,/ADMIT TWO|LOSER BRINGS THE WINNER|>CASINO</);assert.match(h,/sb-wire-expanded.*dg-copy/);assert.match(h,/text the commissioner/);
});
test('a scoreless game displays zero dollars after kickoff, with no premature amount before kickoff',()=>{const c=harness();c.NFL_WEEK1=[{week:7,state:'post'},{week:8,state:'pre'}];assert.equal(c.hjDegenerateBetSnapshot(data()).started,false);c.NFL_WEEK1[1].state='in';const v=c.hjDegenerateBetSnapshot(data());assert.equal(v.started,true);assert.equal(v.margin,0);assert.equal((c.wireBuild(data()).cards[0].html.match(/<strong>\$0\.00<\/strong>/g)||[]).length,4);});
test('history stays scoped to the correct week, managers and season',()=>{const c=harness();assert.equal(c.hjDegenerateBetSnapshot({...data(),seasonId:2025}),null);let d=data();d.schedule[0].matchupPeriodId=7;assert.equal(c.hjDegenerateBetSnapshot(d),null);d=data();d.teams[1].name='BRYAN';assert.equal(c.hjDegenerateBetSnapshot(d),null);});
