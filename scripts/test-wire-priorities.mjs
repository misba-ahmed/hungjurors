import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./wire-priorities.js',import.meta.url),'utf8');
function setup(week,bye,waiver){
 const context={
  wireBuild:()=>({cards:[{section:'kickoff',html:'kickoff'},...(waiver?[{section:'waivers',html:'waiver'}]:[]),{section:'recap',html:'recap'}]}),
  hjWireNavLabel:s=>s,HJ_WIRE_ORDER:['kickoff','waivers','recap'],
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
for(const [label,week,bye,waiver,expected] of [
 ['opening week',5,true,true,['kickoff','byes','lms','waivers','recap']],
 ['expired waiver',5,true,false,['kickoff','byes','lms','recap']],
 ['later bye week',6,true,false,['kickoff','byes','recap']],
 ['ordinary week',6,false,true,['kickoff','waivers','recap']]
])test(label,()=>{
 const ctx=setup(week,bye,waiver),out=ctx.wireBuild(data),html=out.cards.map(c=>c.html).join('');
 assert.deepEqual(Array.from(out.cards,c=>c.section),expected);
 assert(!html.includes('wp-group'));
 for(const card of out.cards.filter(c=>['byes','lms','waivers'].includes(c.section))){
  assert.equal((card.html.match(/class="wp-panel /g)||[]).length,1);
  assert(card.html.includes('data-wire-key="priority-'+card.section+'"'));
 }
 if(bye){assert(html.includes('Mahomes'));assert(html.includes('KAT'));}
 assert.equal(html.includes('Lowest score this week will be eliminated.'),week===5);
 assert.equal(ctx.hjWireNavLabel('byes'),'Bye Week');
 assert.equal(ctx.hjWireNavLabel('lms'),'Last Man Standing');
});
test('unvalidated schedule does not invent bye announcements',()=>{
 const ctx=setup(6,true,false);ctx.HJ_BYE_STATE.season=2025;
 assert(!ctx.wireBuild(data).cards.some(c=>c.section==='byes'));
});
test('missing league data retains original loading behavior',()=>{
 const ctx=setup(5,true,true);assert.equal(ctx.wireBuild(null).cards[0].section,'kickoff');
});
