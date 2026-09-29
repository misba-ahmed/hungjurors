import {readFileSync} from 'node:fs';
async function runTradeTests(source){
 const checks=[],assert=(v,msg)=>{if(!v)throw Error(msg);checks.push(msg)};
 const docEvents={},rootEvents={},root={dataset:{},addEventListener(name,fn){rootEvents[name]=fn}};
 const data={teams:[],settings:{rosterSettings:{lineupSlotCounts:{0:1,2:2,4:2,6:1,23:1,16:1,17:1,20:5,21:1}}}};
 const doc={readyState:'loading',addEventListener(name,fn){docEvents[name]=fn},querySelector(){return root}};
 const win={HJMV:{ready:true,entryValue:e=>e.value}};
 const globals={window:win,document:doc,HJ_LEAGUE_STATE:{data},HJ_LEAGUE_SEASON:2026,NFL_SEASON:2026,
  HJ_STRENGTH_STATE:{scope:'all',view:'trade'},HJ_HQ_STATE:{activeTab:'strength'},hjCurrentWeek:()=>1,
  hjPlayer:e=>e,hjPlayerPosition:e=>e.position,hjPlayerTeam:e=>e.team,hjRosterEntries:t=>t.roster,
  hjMatchManager:t=>t.manager,hjOwnerName:()=>'',hj6Projection:e=>e.projected,
  av:(name,cls)=>'<span class="'+cls+'">'+name+'</span>',hjRerenderStrength:()=>{},
  hjStrengthHTML:()=>'',location:{hash:''}};
 const hook='window.__tdTest={finderPackages,finderNeeds,finderUnitValue,finderNeedsHTML,finderRun,finderPanel,finderMatchesPosition,lineupPoints,postTradeLineups,wireSentences,scorecard,ensureSides,install,model,projectionFact,rosterOf};\n';
 const code=source.replace(' restoreTradeDraft();\n if(document.readyState',hook+' restoreTradeDraft();\n if(document.readyState');
 assert(code!==source,'test hooks inserted');
 new Function(...Object.keys(globals),code)(...Object.values(globals));
 const t=win.__tdTest,state=win.HJTD;
 const entry=(id,pos,value,ppw,slot=20)=>({id,fullName:id,position:pos,value,projected:ppw==null?null:ppw*18,team:'TEST',lineupSlotId:slot});
 const roster=(prefix,rbs,wrs,k=8,d=8)=>[
  entry(prefix+'QB','QB',4000,20,0),entry(prefix+'RB1','RB',rbs[0],rbs[1],2),entry(prefix+'RB2','RB',rbs[0],rbs[1],2),
  entry(prefix+'WR1','WR',wrs[0],wrs[1],4),entry(prefix+'WR2','WR',wrs[0],wrs[1],4),
  entry(prefix+'TE','TE',2000,12,6),entry(prefix+'FLEX','WR',wrs[0],wrs[1],23),
  entry(prefix+'DST','D/ST',null,d,16),entry(prefix+'K','K',null,k,17)];
 data.teams=[
  {id:1,manager:'Alpha',roster:roster('A',[2000,8],[6000,25],5,10).concat(entry('Aspare','WR',6000,25))},
  {id:2,manager:'Beta',roster:roster('B',[6000,25],[2000,8],6.3,10).concat(entry('Bspare','RB',6000,25))},
  {id:3,manager:'Gamma',roster:roster('C',[4000,14],[4000,14],8,9)}
 ];
 state.injectSchedule(new Map(Array.from({length:18},(_,i)=>[i,{season:2026,week:i+1,home_team:'TEST',away_team:'OPP'}])));
 assert(state.finderTeam===''&&(await t.finderRun())===null,'finder starts without a selected team');
 assert(t.finderPanel().includes('>YOUR TEAM</option>'),'team placeholder is rendered');
 t.ensureSides();
 assert(state.a==='1'&&state.finderTeam==='','builder default never becomes finder default');
 let needs=t.finderNeeds('1');
 assert(needs.units.length===6,'ranking bar includes all six positions');
 assert(needs.units.find(u=>u.pos==='RB').rank===3,'RB rank compares RB market totals across managers');
 assert(needs.units.find(u=>u.pos==='WR').rank===1,'WR rank reflects market-value depth');
 assert(needs.units.find(u=>u.pos==='TE').rank===1,'lower raw TE value is not misidentified as weakest');
 assert(needs.weakest.includes('RB')&&needs.weakest.includes('K'),'weakest positions use league rank including kicker');
 const kBefore=needs.units.find(u=>u.pos==='K').rank;
 data.teams[0].roster.push(entry('AextraK','K',null,4));
 assert(t.finderNeeds('1').units.find(u=>u.pos==='K').rank===kBefore,'extra weak kicker cannot inflate positional strength');
 data.teams[0].roster.pop();
 data.teams[1].roster[7].projected=null;
 assert(t.finderNeeds('1').units.find(u=>u.pos==='D/ST').rank===1,'missing peer DST projection does not blank other managers');
 data.teams[1].roster[7].projected=180;
 data.teams[1].roster[1].value=null;
 assert(Number.isFinite(t.finderNeeds('1').units.find(u=>u.pos==='RB').rank),'unpriced peer reserve does not blank a whole position');
 data.teams[1].roster[1].value=6000;
 state.finderTeam='1';state.finderPosition='RB';state.scope='2';
 let results=(await t.finderRun());
 assert(results.rows.length>0,'finder produces real lineup upgrades');
 assert(t.finderPanel().includes('data-td-load'),'finder results render actionable cards');
 assert(results.rows.every(r=>r.inc.some(e=>e.position==='RB')),'every RB-filter result includes an incoming RB');
 assert(results.rows.every(r=>String(r.team.id)==='2'),'partner filter is enforced');
 assert(results.rows.every(r=>r.myGain>0&&r.gap<=.22),'suggestions improve lineup and stay within value tolerance');
 assert(results.rows.every(r=>r.out.length<=3&&r.inc.length<=3),'candidate package sizes remain bounded');
 state.finderPosition='ANY';state.scope='all';results=(await t.finderRun());
 assert(results.rows[0].addressesNeed,'Any position prioritizes a weak position');
 assert(results.rows.every(r=>String(r.team.id)!=='1'),'finder excludes your own team');
 state.finderPosition='TE';results=(await t.finderRun());
 assert(results.rows.every(r=>r.inc.some(e=>e.position==='TE')),'TE filtering never returns only other positions');
 state.finderPosition='FLEX';results=(await t.finderRun());
 assert(results.rows.every(r=>r.inc.some(e=>['RB','WR','TE'].includes(e.position))),'FLEX filter accepts only eligible receiving packages');
 state.finderPosition='K';state.scope='2';results=(await t.finderRun());
 assert(results.rows.length>0&&results.rows.every(r=>r.inc.some(e=>e.position==='K')),'kicker filter supports projection-backed upgrades');
 assert(results.rows.some(r=>r.balanceBasis==='Combo projection'),'K-only deals use explicitly labeled Combo balance');
 const sent=data.teams[0].roster.find(e=>e.id==='Aspare'),received=data.teams[1].roster.find(e=>e.id==='Bspare');
 const afterA=data.teams[0].roster.filter(e=>e!==sent).concat(received),afterB=data.teams[1].roster.filter(e=>e!==received).concat(sent);
 const side=(manager,after,incoming,out)=>({manager,after,in:incoming,out,drops:[],lineupAfter:t.lineupPoints(after.map(e=>({entry:e,pos:e.position,pts:e.projected,ir:e.lineupSlotId===21})))});
 const rows=[side('Alpha',afterA,[received],[sent]),side('Beta',afterB,[sent],[received])];
 const ir=entry('IR sample','TE',1000,5,21);rows[0].after.push(ir);
 const html=t.postTradeLineups(rows);
 assert(html.includes('<strong>Bspare</strong>')&&html.includes('<strong>Aspare</strong>'),'both teams highlight acquired players in bold');
 assert(html.includes('Injured reserve')&&html.includes('IR sample')&&html.includes('Bench'),'post-trade view includes bench and IR');
 assert(html.includes('D/ST')&&html.includes('AK')&&html.includes('ADST'),'post-trade view includes kicker and defense');
 assert(!html.includes('<strong>AQB</strong>'),'unchanged players remain normal text');
 data.teams[1].roster.push(entry('Unpriced TE','TE',null,4));
 assert(t.finderNeeds('1').units.find(u=>u.pos==='TE').rank===1,'unpriced TE does not erase anyone’s TE rank');
 assert(t.finderNeedsHTML('1').includes('weakest position'),'roster needs remain visible with incomplete peer pricing');
 assert(!t.finderNeedsHTML('1').includes('Waiting for complete'),'no all-or-nothing waiting message');
 data.teams[1].roster.pop();
 state.finder=null;
 const cleanPanel=t.finderPanel();
 assert(!cleanPanel.includes('Choose your filters')&&!cleanPanel.includes('one- or two-player')&&!cleanPanel.includes('League position ranks ·'),'crossed-out explanatory copy is removed');
 assert(t.finderPackages([1,2,3,4]).filter(p=>p.length===3).length===4,'generate every unique three-player package');
 const savedTeams=data.teams;
 const ma=roster('MA',[100,8],[8000,30]);
 for(const e of ma)if(['QB','WR','TE'].includes(e.position))e.value=1000000;
 ma.push(entry('MextraRB','RB',1000,14),entry('MextraWR1','WR',1000,24),entry('MextraWR2','WR',1000,24));
 const mb=roster('MB',[100000000,35],[null,3]);
 for(const e of mb)if(['QB','TE'].includes(e.position))e.value=100000000;
 mb.push(entry('TargetRB','RB',3300,30));
 data.teams=[{id:1,manager:'Alpha',roster:ma},{id:2,manager:'Beta',roster:mb}];
 state.finderTeam='1';state.scope='2';state.finderPosition='RB';
 let largeResults=await t.finderRun();
 assert(largeResults.rows.some(r=>r.out.length===3&&r.inc.length===1),'find a sensible three-for-one lineup upgrade');
 assert(largeResults.rows.filter(r=>r.out.length===3||r.inc.length===3).every(r=>r.theirGain/16>=-.5),'three-player deals protect partner lineup');
 mb.find(e=>e.id==='TargetRB').value=2000;
 mb[5].projected=35*18;
 mb.push(entry('TargetTE','TE',1300,28));
 state.finderPosition='TE';largeResults=await t.finderRun();
 assert(largeResults.rows.some(r=>r.out.length===3&&r.inc.length===2),'find a sensible three-for-two lineup upgrade');
 data.teams=savedTeams;
 const wire=t.wireSentences({manager:'Alpha',gets:[{name:'Player',value:4000,pos:'RB',rep:{name:'Free Agent',value:2100}}]});
 assert(wire.includes('Player (4,000)')&&wire.includes('Free Agent (2,100)'),'wire comparison shows both market values');
 assert(source.includes('Play quality (PFF GRADE)'),'factor scorecard uses PFF GRADE');
 const scorecard=t.scorecard({rows,factors:[{label:'Positional fit',note:'Fit explanation',lean:'even'}]});
 assert(scorecard.indexOf('Fit explanation')<scorecard.indexOf('<details'),'expandable lineups follow the positional-fit text');
 t.install();
 state.finder={rows:[{}]};state.scope='2';
 rootEvents.change({target:{closest:q=>q==='[data-td-finder-team]'?{value:'2'}:null}});
 assert(state.finderTeam==='2'&&state.scope==='all'&&state.finder===null,'changing your team clears results and prevents self trades');
 state.finder={rows:[{}]};
 rootEvents.change({target:{closest:q=>q==='[data-td-position]'?{value:'D/ST'}:null}});
 assert(state.finderPosition==='D/ST'&&state.finder===null,'changing target position clears previous results');
 return checks;
}
const source=readFileSync(new URL('./trade-desk.js',import.meta.url),'utf8');
const checks=await runTradeTests(source);
console.log('Trade Finder: '+checks.length+' checks passed.');
