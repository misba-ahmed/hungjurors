import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./wire-priorities.js',import.meta.url),'utf8');
function setup(week,bye,waiver){
 const context={
  wireBuild:()=>({cards:[...(waiver?[{section:'waivers',html:'waiver'}]:[]),{section:'recap',html:'recap'}]}),
  hjWireNavLabel:s=>s,HJ_WIRE_ORDER:['waivers','recap'],
  HJ_BYE_STATE:{season:2026,teams:new Map([['KC',new Set()]])},NFL_SEASON:2026,
  hjTeamOnBye:()=>bye,hjRosterEntries:t=>t.entries,wirePlayerObj:p=>p,hjPlayer:p=>p,pcTeam:t=>t,hjPlayerTeam:p=>p.team,
  wireManager:t=>t.name,esc:String,nflLogo:t=>'/'+t,wirePlayerHTML:p=>'<button class="wc-player"><b>'+p.name+'</b><small>Team</small></button>',wireMgrHTML:n=>n,
  AV:{KAT:'x'},hjCurrentWeek:()=>week,wireWaiverCard:()=>waiver?{}:null,
  wireNextWaiver:()=>({start:Date.now()+100000}),wireCountdownHTML:()=>'<countdown>',
  ESPN_FANTASY_LEAGUE_ID:123,document:{addEventListener(){},querySelector(){return null}},wireRender(){},wireScrollTo(){},wireUpdateDots(){},window:{addEventListener(){}},requestAnimationFrame:()=>0,
 };
 vm.createContext(context);vm.runInContext(source,context);
 return context;
}
const data={teams:[{id:1,name:'KAT',entries:[{id:'15',name:'Mahomes',team:'KC'}]}]};
for(const [label,week,bye,waiver,count] of [
 ['opening week',5,true,true,3],['expired waiver',5,true,false,2],['later bye week',6,true,false,1],['ordinary week',6,false,true,0]
])test(label,()=>{
 const ctx=setup(week,bye,waiver),out=ctx.wireBuild(data),html=out.cards[0].html;
 assert.equal((html.match(/class="wp-panel /g)||[]).length,count);
 if(count){assert.equal(out.cards[0].section,'this-week');assert.ok(!out.cards.some(c=>c.section==='waivers'));assert.ok(html.includes('Mahomes'));assert.ok(html.includes('KAT'));}
 if(week===5)assert.ok(html.includes('Eliminations start this week!'));
 else assert.ok(!html.includes('Eliminations start this week!'));
 assert.ok(out.cards.some(c=>c.section==='recap'));
});
test('unvalidated schedule does not invent bye announcements',()=>{
 const ctx=setup(6,true,false);ctx.HJ_BYE_STATE.season=2025;
 assert.equal(ctx.wireBuild(data).cards[0].section,'recap');
});
test('missing league data retains original loading behavior',()=>{
 const ctx=setup(5,true,true);assert.equal(ctx.wireBuild(null).cards[0].section,'waivers');
});
