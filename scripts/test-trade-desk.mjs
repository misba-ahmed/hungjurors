import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {prepareSite} from './prepare-site.mjs';
import worker,{FIELDS,validateOutput} from '../workers/trade-analysis/worker.mjs';
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
const env={OPENAI_API_KEY:'test-only',PER_IP:{limit:async()=>({success:true})},TOTAL:{limit:async()=>({success:true})}};
const ctx={waitUntil(p){return p}};
const req=(origin='https://hungjurors.com',body={})=>new Request('https://trade-analysis.hungjurors.com/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
assert.equal((await worker.fetch(req('https://evil.example'),env,ctx)).status,403);
assert.equal((await worker.fetch(req('https://hungjurors.com.evil.example'),env,ctx)).status,403);
const options=await worker.fetch(new Request('https://trade-analysis.hungjurors.com/',{method:'OPTIONS',headers:{Origin:'https://hungjurors.com'}}),env,ctx);
assert.equal(options.status,204);assert.equal(options.headers.get('Access-Control-Allow-Origin'),'https://hungjurors.com');
assert.equal((await worker.fetch(req(),{},ctx)).status,503);
assert.equal((await worker.fetch(req(),{...env,PER_IP:{limit:async()=>({success:false})}},ctx)).status,429);
assert.equal((await worker.fetch(req(),env,ctx)).status,502);
const dossier=vm.runInContext('window.HJTD.buildDossier()',context);
dossier.asOf=new Date().toISOString();
globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 assert.equal(url,'https://api.openai.com/v1/responses');
 assert.equal(options.headers.Authorization,'Bearer test-only');
 const body=JSON.parse(options.body);
 assert.equal(body.store,false);assert.equal(body.text.format.strict,true);
 assert.equal(body.input[0].role,'user');assert.ok(body.instructions.includes('untrusted'));
 return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}]});
};
try{
 const response=await worker.fetch(req('https://hungjurors.com',dossier),env,ctx);
 assert.equal(response.status,200);assert.deepEqual(await response.json(),output);
 globalThis.fetch=async()=>Response.json({status:'incomplete',output:[]});
 assert.equal((await worker.fetch(req('https://hungjurors.com',dossier),env,ctx)).status,502);
}finally{globalThis.fetch=originalFetch}
console.log('Worker origin, key boundary, schema, rate limit and failure handling: passed');
