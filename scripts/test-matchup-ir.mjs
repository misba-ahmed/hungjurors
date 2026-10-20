import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {prepareSite} from './prepare-site.mjs';
const source=prepareSite(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
const between=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const ctx=vm.createContext({
 HJ_HQ_STATE:{lineupModes:new Map()},HJ_LEAGUE_STATE:{data:{}},
 HJ_OPT_SLOT_ELIGIBLE:{0:['QB']},HJ_POSITION_ORDER:{QB:0},
 hjLineupPlan:()=>[{slotId:0,label:'QB'}],hjPlayerPosition:()=> 'QB',
 hjProjectionScore:e=>e.points,hjProjectionPair:e=>({espn:e.points,vegas:e.points}),
 hjBenchCompare:(a,b)=>a.id.localeCompare(b.id),esc:String,pcFpts:String,
 hjRosterLiveSelectionState:entries=>({started:true,total:entries.filter(Boolean).reduce((sum,e)=>sum+e.points,0)}),
 hjProjectionFlipHTML:(espn,vegas)=>`<span data-total="${espn}"></span>`,
 hjLineupPlayerHTML:(entry,week,right=false)=>entry?`<button data-player="${entry.id}" data-week="${week}" data-right="${right}"></button>`:'<span class="empty"></span>'
});
vm.runInContext(between('function hjEntryEligible(', 'function hjTeamVegasProjection(')+between('function hjRemainingBench(', 'function hjLiveScoringEntries(')+between('hjMatchupLineupHTML=function(', '/* Density changes only lineup rows.'),ctx);
const player=(id,slot,points)=>({id,lineupSlotId:slot,points});
const a={entries:[player('a-start',0,10),player('a-bench',20,20),player('a-ir1',21,100),player('a-ir2','21',200)]};
const b={entries:[player('b-start',0,11),player('b-bench',20,21),player('b-ir',21,300)]};
for(const mode of ['actual','espn','vegas','combo']){
 ctx.HJ_HQ_STATE.lineupModes.set('game',mode);
 const html=ctx.hjMatchupLineupHTML({}, {}, 'A','B',a,b,4,'game');
 const ir=html.slice(html.indexOf('<div class="hj-lineup-v2-bench is-ir">'));
 assert.equal((ir.match(/>IR<\/span>/g)||[]).length,2);
 for(const id of ['a-ir1','a-ir2','b-ir']){
  assert.equal((html.match(new RegExp(`data-player="${id}"`,'g'))||[]).length,1);
  assert.ok(ir.includes(`data-player="${id}"`));
 }
 assert.ok(ir.includes('class="empty"'),'unequal IR counts retain empty opposing cells');
 assert.ok(ir.includes('data-week="4"'),'IR cards use selected historical week');
 assert.ok(!ir.includes('data-player="a-bench"'));
 const selected=ctx.hjSelectionForMode(a.entries,ctx.hjLineupPlan(),4,mode);
 assert.equal(ctx.hjSelectionTotals(selected,4).espn,mode==='actual'?10:20,'IR points excluded from actual and optimal totals');
 const noIR={entries:b.entries.filter(e=>e.lineupSlotId!==21)};
 assert.ok(!ctx.hjMatchupLineupHTML({}, {}, 'A','B',noIR,noIR,4,'game').includes('is-ir'));
 const oneSide=ctx.hjMatchupLineupHTML({}, {}, 'A','B',noIR,b,4,'game');
 assert.ok(oneSide.includes('is-ir')&&oneSide.includes('data-player="b-ir"'));
}
console.log('PASS matchup IR: both teams, unequal/empty IR slots, selected week, and exclusion from all lineup totals.');
