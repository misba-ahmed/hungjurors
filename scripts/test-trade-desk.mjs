import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {prepareSite} from './prepare-site.mjs';
import worker from '../workers/trade-analysis/worker.mjs';
import {FIELDS,validateOutput,evidenceChunks,generateAnalysis} from './trade-analysis-shared.mjs';
const source=readFileSync(new URL('./trade-desk.js',import.meta.url),'utf8');
const prepared=prepareSite(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
const injected=prepared.match(/<script id="hj-trade-desk">([\s\S]*?)<\/script>/)?.[1];
assert.equal(injected,source,'Site preparation must preserve script text, including dollar replacement tokens');
new vm.Script(injected);
const fixture=readFileSync(new URL('./fixtures/trade-desk.js',import.meta.url),'utf8');
const expose="\n HJTD._test={model,analyse,posture,balanceOptions,dropPlan,lineupPoints,newsItemFrom,newsFor,byeCoverage,cleanAnalysisHtml,validateAnalysis,\n  requestAnalysis,cancelAnalysis,ANALYSIS,readAnalysisCache,saveAnalysisCache,analysisKey,projectionFact,TEAM_CONTEXT,shell,\n  hydrate:fn=>hydrateDossier=fn};\n";
const context=vm.createContext({console,Date,Map,Set,URLSearchParams,setTimeout:()=>1,clearTimeout(){},
 window:{},document:{readyState:'loading',addEventListener(){},querySelector(){return null}}});
vm.runInContext(fixture+source.replace(" if(document.readyState==='loading')",expose+"\n if(document.readyState==='loading')"),context);
vm.runInContext("\nconst t=window.HJTD._test;\nwindow.HJTD.a='1';window.HJTD.b='2';window.HJTD.give=new Set(['2']);window.HJTD.get=new Set(['12']);\nconst schedules=new Map();\nfor(let w=1;w<=18;w++){if(w!==8)schedules.set('a'+w,{season:2026,week:w,home_team:'AAA',away_team:'CCC'});\n if(w!==9)schedules.set('b'+w,{season:2026,week:w,home_team:'BBB',away_team:'DDD'});}\nwindow.HJTD.injectSchedule(schedules);\nconst rows=[...fixtures,...second].flatMap(e=>[1,2].map(week=>({id:e.player.id,player_display_name:e.player.fullName,position:e.player.position,team:e.player.team,week,points:10,carries:8,targets:3,receiving_yards:40})));\nwindow.HJTD.injectUsage(rows,null);\nconst assert=(yes,msg)=>{if(!yes)throw Error(msg)};\nlet m=t.model(),a=t.analyse(m);\nassert(m.band==='even','7% must be even');\nassert(t.balanceOptions(m)===null,'7% no balance');\nassert(t.posture(a.rows[0].stand).key==='early','No early posture');\nassert(a.factors.map(x=>x.label).join('|')==='Market value|This week|Rest of season|Positional fit|Above the wire|Market form|Play quality (PFF)','Seven factors');\nconst d=window.HJTD.buildDossier();\nassert(d.players[0].usage.lastGame.receivingYards===40,'Last game fields');\nassert(d.players[0].usage.games===2,'Sample count');\nassert(d.managers[0].schedule.headToHead[0].week===3,'Head to head');\nassert(d.managers[0].lineup.after.slots.some(x=>x.slot==='RB1'),'Lineup slots');\nassert(d.deal.bestFreeAgents.RB.name==='Wire Runner','Wire');\nassert(Number.isFinite(d.deal.lineups[0].restOfSeason.combo),'ROS per week');\nassert(d.managers[0].byeCoverage.incoming[0].week===9,'Incoming bye');\nassert(JSON.stringify(d).length>1000,'Serializable dossier');\nHJ6_WEEK.ready=false;a=t.analyse(m);assert(!a.rows[0].weekReady&&!a.factors[1].note,'Weekly projections gated');HJ6_WEEK.ready=true;\nconst at=Date.now();\nwindow.HJTD.injectNews({'2':[\n {text:'Runner has landed on injured reserve.',spin:'He will miss six weeks.',at},\n {type:'rotowire',description:'A roundup of Week 1 sleepers. Runner is discussed.',published:new Date(at).toISOString()},\n {type:'column',description:'Runner has landed on injured reserve.',published:new Date(at).toISOString()},\n {text:'Runner returned to practice.',at:at-22*864e5}\n]});\nconst news=t.newsFor('2','A Runner');assert(news.length===1&&news[0].spin==='He will miss six weeks.','Rotowire identity date and Spin');\nwindow.HJTD.get.add('16');m=t.model();\nassert(m.sides[0].drops.length===1&&m.sides[0].drops[0].player.id==='10','Least valued drop');\nassert(m.sides[0].after.length===10,'Roster capacity');\nassert(t.balanceOptions(m)?.options.every(o=>o.entries.every(e=>e.player.value>800))??true,'Above replacement balancing');\nconsole.log('Trade Desk calculations and dossier: passed');\n",context);

const output=Object.fromEntries(FIELDS.map(k=>[k,'<p>Specific analysis.</p>']));
assert.deepEqual(validateOutput(output),output);
assert.throws(()=>validateOutput({...output,summary:'<p onclick="alert(1)">No</p>'}));
assert.throws(()=>validateOutput({...output,summary:'<img src=x>'}));

const originalFetch=globalThis.fetch;let remoteCalls=0;
globalThis.fetch=async()=>{remoteCalls++;throw Error('No paid calls allowed')};
try{
 const request=new Request('https://retired.example/',{method:'POST',headers:{Origin:'https://hungjurors.com'}});
 assert.equal((await worker.fetch(request,{OPENAI_API_KEY:'unused-secret'})).status,410);
 assert.equal(remoteCalls,0,'Retired endpoint must never contact a paid API');
 assert.equal((await worker.fetch(new Request('https://retired.example/',{method:'OPTIONS',headers:{Origin:'https://hungjurors.com'}}))).status,204);
}finally{globalThis.fetch=originalFetch}
assert.ok(!source.includes('ANALYSIS_ENDPOINT'));
assert.ok(!source.includes('workers.dev'));
const countTokens=text=>Math.ceil(text.length/4);
const huge={news:'Every fact matters. 🏈 '.repeat(1500)+'RETURN IN WEEK 12',availability:'out'};
const packed=evidenceChunks(huge,text=>text.length,200);
assert.ok(packed.every(text=>text.length<=200),'Each evidence chunk fits');
const fragments=packed.flatMap(text=>JSON.parse(text)).filter(x=>x.path==='dossier.news');
assert.equal(fragments.map(x=>x.value).join(''),huge.news,'Preserve full news, including its end and Unicode');
const dossier=vm.runInContext('window.HJTD.buildDossier()',context);
dossier.asOf=new Date().toISOString();
dossier.players[0].news=[{text:huge.news,spin:'The teammate is expected back in Week 12.'}];
const inputs=[];let truncated=false;
const engine={resetChat:async()=>{},chat:{completions:{create:async request=>{
 inputs.push(request);
 assert.equal(request.extra_body.enable_thinking,false);
 return {choices:[{finish_reason:truncated?'length':'stop',message:{content:request.response_format?
  JSON.stringify(output):'The teammate is expected back in Week 12. This role window ends before the fantasy playoffs.'}}]};
}}};
assert.deepEqual(await generateAnalysis(engine,dossier,{countTokens}),output);
assert.ok(inputs.some(x=>x.messages[1].content.includes('RETURN IN WEEK 12')),'Read the end of long evidence');
assert.ok(inputs.filter(x=>!x.response_format).length>0,'Large dossiers are read in bounded portions');
truncated=true;
await assert.rejects(()=>generateAnalysis(engine,{...dossier,players:dossier.players.map(p=>({...p,news:[]}))},{countTokens}),/Incomplete analysis/);
const controller=new AbortController();controller.abort();
await assert.rejects(()=>generateAnalysis(engine,dossier,{countTokens,signal:controller.signal}),{name:'AbortError'});
console.log('Local evidence budgeting, complete output, cancellation and retired paid endpoint: passed');
