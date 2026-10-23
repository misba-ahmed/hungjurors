import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {prepareSite} from './prepare-site.mjs';
const html=prepareSite(readFileSync('index.html','utf8'));
const extract=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
const data={};
const side={totalPoints:49.1,totalProjectedPoints:143.05,totalProjectedPointsLive:148.56};
const opponent={totalPoints:0,totalProjectedPoints:120.64,totalProjectedPointsLive:120.64};
const ctx=vm.createContext({Number,Math,pcFpts:n=>Number(n).toFixed(2),hjNumber:n=>n==null?null:Number(n),
 HJ_LEAGUE_STATE:{data},hjCurrentWeek:()=>7,hjCurrentMatchup:()=>({side}),hjSideScore:s=>s?.totalPoints??null,
 hjAdjustedEspnProjection:s=>s?.totalProjectedPointsLive??null});
vm.runInContext(extract('function hjPerformanceAttrs(','function hjContextEntry(')+extract('function hjTeamTotalAttrs(','function hjRosterSelectedGroupHTML('),ctx);
const color=(...args)=>ctx.hjTeamTotalAttrs(...args).match(/data-hj-performance="([^"]+)"/)[1];
assert.equal(color(49.1,143.05,148.56),'green','screenshot: low current score but improved finish');
assert.equal(color(0,120.64,120.64),'green','equal live and initial projections are green');
assert.equal(color(49.1,143.05,130),'orange','retain existing below-projection band');
assert.equal(color(49.1,143.05,80),'red');
assert.equal(color(10,100,70),'orange','exact 70% threshold');
assert.equal(color(10,100,69.99),'red','below 70% threshold');
assert.equal(color(10,100,99.99),'orange','below 100% threshold');
assert.equal(color(10,100,100),'green','exact 100% threshold');
assert.equal(color(49.1,143.05,null),'neutral','missing live value must not compare current points');
assert.equal(color(49.1,null,148.56),'neutral');
assert.equal(color(0,100,0),'red','zero live projection is valid');
assert.equal(color(10,0,10),'green');
assert.equal(color(10,100,150,true),'red','final points override stale live projection');
assert.equal(color(150,100,null,true),'green','historical result works without live projection');
assert.equal(color(100,100,120,true),'green');
assert.equal(color(0,120.64,120.6401),'green','above baseline follows shared rule');
assert.match(ctx.hjTeamTotalAttrs(49.1,143.05,148.56),/Live ESPN projection \(148.56\) above initial ESPN projection \(143.05\)/);
const roster=()=>ctx.hjRosterTotalHTML(49.1,true,'LIVE',[],7,'actual',1,143.05,false);
assert.match(roster(),/data-hj-performance="green"/);
assert.match(roster(),/>49.10<\/strong>/,'display actual score, not projected finish');
side.totalProjectedPointsLive=80;
assert.match(roster(),/data-hj-performance="red"/,'refresh changes color');
side.totalProjectedPointsLive=null;
assert.match(roster(),/data-hj-performance="neutral"/,'missing refresh clears stale color');
side.totalProjectedPointsLive=148.56;
// Exercise the actual prepared matchup team renderer for both sides.
Object.assign(ctx,{live:true,past:false,game:{home:side,away:opponent},data,
 hjGameFinal:()=>false,fmt:n=>Number(n).toFixed(2),av:()=>'',esc:String,sub:()=>'',usePlaceholder:false});
const start=html.indexOf('  const teamBlock=(manager,left,score,espn,vegas,away=false)=>');
const end=html.indexOf('\n  const details=',start);
vm.runInContext(html.slice(start,end)+'\nthis.teamBlock=teamBlock;',ctx);
assert.match(ctx.teamBlock('MISBA','6 players left',49.1,143.05,null),/data-hj-performance="green"/);
assert.match(ctx.teamBlock('BRYAN','9 players left',0,120.64,null,true),/data-hj-performance="green"/);
ctx.past=true;
assert.match(ctx.teamBlock('MISBA','Final',49.1,143.05,null),/data-hj-performance="red"/);
// Roster matchup note uses each side's own live projection and completion state.
Object.assign(ctx,{matchupLive:true,ownActual:49.1,oppActual:0,matchup:{side,opponent},ownLive:{final:false},oppLive:{final:false}});
const note=html.match(/  const scoreLine=matchupLive\?[^\n]+/)[0];
vm.runInContext(note+'\nthis.note=scoreLine;',ctx);
assert.match(ctx.note,/data-hj-performance="green"[^>]*>49.10/);
assert.match(ctx.note,/data-hj-performance="green"[^>]*>0.00/);
console.log('PASS team score colors: live, equal, missing, zero, final, refresh, matchup and roster renderers');
