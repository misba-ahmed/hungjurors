import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const source=readFileSync(new URL('./live-possession.js',import.meta.url),'utf8');
const model=source.slice(0,source.indexOf('(function(){'));
const context=vm.createContext({setTimeout,clearTimeout,AbortController,fetch});
vm.runInContext(model,context);
const update=(data,previous,now=0)=>context.hjPossessionStates(data,previous,now);
const glow=(state,position='WR')=>context.hjPossessionGlow(state,position);
function feed({owner='33',red=false,name='STATUS_IN_PROGRESS',state='in',down=1,situation=true,completed=false}={}){
 return {events:[{competitions:[{status:{type:{name,state,completed}},competitors:[{team:{id:'33',abbreviation:'BAL'}},{team:{id:'1',abbreviation:'ATL'}}],...(situation?{situation:{possession:owner,isRedZone:red,down}}:{})}]}]};
}
test('offense green, own defense off, opposing defense green',()=>{
 const s=update(feed());assert.equal(glow(s.get('BAL')),'green');assert.equal(glow(s.get('ATL')),'');
 for(const pos of ['DST','D/ST','DEF']){assert.equal(glow(s.get('BAL'),pos),'');assert.equal(glow(s.get('ATL'),pos),'green');}
});
test('red zone colors only the possessing offense, then returns green',()=>{
 const red=update(feed({red:true}));assert.equal(glow(red.get('BAL')),'red');assert.equal(glow(red.get('ATL'),'DST'),'green');
 assert.equal(glow(update(feed(),red,1000).get('BAL')),'green');
});
test('confirmed turnover switches both sides immediately',()=>{
 const s=update(feed({owner:'1'}),update(feed({red:true})),1000);
 assert.equal(glow(s.get('BAL')),'');assert.equal(glow(s.get('BAL'),'DST'),'green');assert.equal(glow(s.get('ATL')),'green');
});
for(const [label,options] of [['missing possession',{owner:undefined}],['invalid possession',{owner:'999'}],['missing situation',{situation:false}],['quarter break',{name:'STATUS_END_PERIOD'}]]){
 test(label+' retains last confirmed state without resetting its age',()=>{
  const initial=update(feed({red:true}));const data=feed(options);
  if(label==='missing possession')delete data.events[0].competitions[0].situation.possession;
  const s=update(data,initial,30000);assert.equal(glow(s.get('BAL')),'red');assert.equal(s.get('BAL').confirmedAt,0);
  assert.equal(update(data,s,180000).size,0);
 });
}
test('down zero or absent does not remove a valid possession',()=>{
 for(const down of [0,-1,undefined])assert.equal(glow(update(feed({down})).get('BAL')),'green');
});
for(const [label,options] of [['halftime',{name:'STATUS_HALFTIME'}],['final',{state:'post',completed:true}],['pregame',{state:'pre'}],['suspended',{name:'STATUS_SUSPENDED'}],['delayed',{name:'STATUS_DELAYED'}]]){
 test(label+' clears both teams immediately',()=>assert.equal(update(feed(options),update(feed()),1000).size,0));
}
test('missing game and repeated incomplete payloads expire independently',()=>{
 let s=update(feed());s=update({events:[]},s,179999);assert.equal(s.size,2);assert.equal(update({events:[]},s,180000).size,0);
});
test('new page never guesses possession from absent data',()=>assert.equal(update(feed({situation:false})).size,0));
test('team aliases and possession objects normalize correctly',()=>{
 for(const [a,b] of [['WAS','WSH'],['JAC','JAX'],['LA','LAR']])assert.equal(context.hjPossessionTeam(a),b);
 assert.equal(glow(update(feed({owner:{id:'33'}})).get('BAL')),'green');
});
test('one game ending does not clear another live game',()=>{
 const second=feed();second.events[0].competitions[0].competitors=[{team:{id:'33',abbreviation:'SF'}},{team:{id:'1',abbreviation:'SEA'}}];
 const both=update({events:[...feed().events,...second.events]});const after=update(feed({state:'post'}),both,1000);
 assert.equal(after.has('BAL'),false);assert.equal(glow(after.get('SF')),'green');
});
test('scoreboard request aborts, releases timer, and permits the next request',async()=>{
 let timeout,cleared=0;
 const c=vm.createContext({AbortController,setTimeout:(fn,ms)=>{assert.equal(ms,15000);timeout=fn;return 1;},clearTimeout:()=>cleared++,fetch:(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted'))))});
 vm.runInContext(model,c);const failed=c.hjFetchPossessionScoreboard('scoreboard');timeout();await assert.rejects(failed,/aborted/);assert.equal(cleared,1);
 c.fetch=async()=>({ok:true,json:async()=>({events:[]})});await c.hjFetchPossessionScoreboard('scoreboard');assert.equal(cleared,2);
});
test('HTTP and JSON failures release the request timer',async()=>{
 for(const response of [{ok:false,status:503},{ok:true,json:async()=>{throw Error('bad JSON');}}]){
  let cleared=false;const c=vm.createContext({AbortController,setTimeout:()=>1,clearTimeout:()=>cleared=true,fetch:async()=>response});
  vm.runInContext(model,c);await assert.rejects(c.hjFetchPossessionScoreboard('scoreboard'));assert.equal(cleared,true);
 }
});
