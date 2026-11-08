// Side bets in the Wire carousel (scripts/side-bet-order.js): a bet whose week is over sits after that week's
// recap cards; a bet for the week being played keeps its own Side Bet place. Run: node scripts/test-side-bet-order.mjs
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
const sorter=read('../index.html').match(/function hjWireOrdered\(cards\)\{[^\n]+/)[0];
function run(recapWeek,cards){
 const c=vm.createContext({});
 vm.runInContext("var HJ_WIRE_ORDER=['kickoff','waivers','waiver-report','sidebet','byes','live','recap','preview','draft'];var WIRE={recapWeek:"+recapWeek+"};"+sorter+"\n"+read('./side-bet-order.js'),c);
 c.cards=cards;return Array.from(vm.runInContext('hjWireOrdered(cards)',c),x=>x.html);
}
const tagged=(week,label)=>`<article class="wc" data-wire-card><div class="wc-kicker"><span>Side Bet</span><small>Week ${week} · ${label}</small></div></article>`;
// Week 8's bet in Week 9 (recap of Week 8 showing): after the recap cards, before the preview.
assert.deepEqual(run(8,[{section:'sidebet',week:8,html:'bet8'},{section:'waivers',html:'waivers'},{section:'byes',html:'byes'},{section:'recap',html:'recap1'},{section:'recap',html:'recap2'},{section:'preview',html:'preview'}]),
 ['waivers','byes','recap1','recap2','bet8','preview']);
// A bet without an explicit week is read from its tag.
assert.deepEqual(run(8,[{section:'sidebet',html:tagged(8,'MISBA vs CESAR')},{section:'recap',html:'recap1'}]).at(-1).includes('Week 8'),true);
// A bet for the week being played keeps its Side Bet place; the finished one still goes after the recap.
assert.deepEqual(run(8,[{section:'sidebet',week:9,html:'bet9'},{section:'sidebet',week:8,html:'bet8'},{section:'byes',html:'byes'},{section:'recap',html:'recap1'},{section:'preview',html:'preview'}]),
 ['bet9','byes','recap1','bet8','preview']);
// A bet that already labels itself recap (Week 7 free throws) is unchanged.
assert.deepEqual(run(7,[{section:'recap',html:'recap1'},{section:'recap',week:7,html:'bet7'},{section:'preview',html:'preview'}]),['recap1','bet7','preview']);
console.log('side bet order: ok');
