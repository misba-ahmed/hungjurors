import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const ctx=vm.createContext({Intl,Date,hjCurrentWeek:d=>d.status.currentMatchupPeriod,hjGameFinal:g=>g.winner==='HOME',hjSideScore:s=>s?.totalPoints??0});
vm.runInContext(readFileSync(new URL('./matchup-week.js',import.meta.url),'utf8'),ctx);
const data={status:{currentMatchupPeriod:5},schedule:[{matchupPeriodId:4,winner:'HOME'},{matchupPeriodId:5,home:{totalPoints:0},away:{totalPoints:0}}]};
test('Central Tuesday retains Week 4; Wednesday midnight opens Week 5',()=>{
 assert.equal(ctx.hjDefaultMatchupWeek(data,Date.parse('2026-10-07T04:59:59Z')),4);
 assert.equal(ctx.hjDefaultMatchupWeek(data,Date.parse('2026-10-07T05:00:00Z')),5);
});
test('Monday rollover holds previous but active Monday week stays current',()=>{
 assert.equal(ctx.hjDefaultMatchupWeek(data,Date.parse('2026-10-05T15:00:00Z')),4);
 const active=structuredClone(data);active.schedule[1].home.totalPoints=20;
 assert.equal(ctx.hjDefaultMatchupWeek(active,Date.parse('2026-10-05T15:00:00Z')),5);
});
test('Sunday and Thursday stay current, Week 1 never becomes zero',()=>{
 for(const date of ['2026-10-04T15:00:00Z','2026-10-08T15:00:00Z'])assert.equal(ctx.hjDefaultMatchupWeek(data,Date.parse(date)),5);
 assert.equal(ctx.hjDefaultMatchupWeek({status:{currentMatchupPeriod:1},schedule:[]},Date.parse('2026-10-06T15:00:00Z')),1);
});
test('Central standard time boundary and absent previous schedule',()=>{
 assert.equal(ctx.hjDefaultMatchupWeek(data,Date.parse('2026-11-04T05:59:59Z')),4);
 assert.equal(ctx.hjDefaultMatchupWeek(data,Date.parse('2026-11-04T06:00:00Z')),5);
 assert.equal(ctx.hjDefaultMatchupWeek({...data,schedule:[]},Date.parse('2026-10-06T15:00:00Z')),5);
});
