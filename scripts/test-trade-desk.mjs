import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {prepareSite} from './prepare-site.mjs';
import worker from '../workers/trade-analysis/worker.mjs';
import {FIELDS,researchSources,validateTrade,validateOutput,geminiRequest,parseGeminiResponse} from './trade-analysis-shared.mjs';
const source=readFileSync(new URL('./trade-desk.js',import.meta.url),'utf8');
const prepared=prepareSite(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
const injected=prepared.match(/<script id="hj-trade-desk">([\s\S]*?)<\/script>/)?.[1];
assert.equal(injected,source,'Site preparation must preserve script text, including dollar replacement tokens');
new vm.Script(injected);
const fixture=readFileSync(new URL('./fixtures/trade-desk.js',import.meta.url),'utf8');
const expose="\n HJTD._test={model,analyse,posture,balanceOptions,dropPlan,lineupPoints,newsItemFrom,newsFor,byeCoverage,cleanAnalysisHtml,validateAnalysis,\n  requestAnalysis,cancelAnalysis,ANALYSIS,researchTrade,analysisKey,projectionFact,TEAM_CONTEXT,shell,ensureSchedule,SCHED,warmScorecardSources,SCORE_SOURCES,lineupChanges,\n  hydrate:fn=>hydrateDossier=fn};\n";
const context=vm.createContext({console,Date,Map,Set,URLSearchParams,setTimeout:()=>1,clearTimeout(){},
 window:{},document:{readyState:'loading',addEventListener(){},querySelector(){return null}}});
vm.runInContext(fixture+source.replace(" if(document.readyState==='loading')",expose+"\n if(document.readyState==='loading')"),context);
vm.runInContext("\nconst t=window.HJTD._test;\nwindow.HJTD.a='1';window.HJTD.b='2';window.HJTD.give=new Set(['2']);window.HJTD.get=new Set(['12']);\nconst schedules=new Map();\nfor(let w=1;w<=18;w++){if(w!==8)schedules.set('a'+w,{season:2026,week:w,home_team:'AAA',away_team:'CCC'});\n if(w!==9)schedules.set('b'+w,{season:2026,week:w,home_team:'BBB',away_team:'DDD'});}\nwindow.HJTD.injectSchedule(schedules);\nconst rows=[...fixtures,...second].flatMap(e=>[1,2].map(week=>({id:e.player.id,player_display_name:e.player.fullName,position:e.player.position,team:e.player.team,week,points:10,carries:8,targets:3,receiving_yards:40})));\nwindow.HJTD.injectUsage(rows,null);\nconst assert=(yes,msg)=>{if(!yes)throw Error(msg)};\nlet m=t.model(),a=t.analyse(m);\nassert(m.band==='even','7% must be even');\nassert(t.balanceOptions(m)===null,'7% no balance');\nassert(t.posture(a.rows[0].stand).key==='early','No early posture');\nassert(a.factors.map(x=>x.label).join('|')==='Market value|This week|Rest of season|Positional fit|Above the wire|Market form|Play quality (PFF)','Seven factors');\nconst d=window.HJTD.buildDossier();\nassert(d.players[0].usage.lastGame.receivingYards===40,'Last game fields');\nassert(d.players[0].usage.games===2,'Sample count');\nassert(d.managers[0].schedule.headToHead[0].week===3,'Head to head');\nassert(d.managers[0].lineup.after.slots.some(x=>x.slot==='RB1'),'Lineup slots');\nassert(d.deal.bestFreeAgents.RB.name==='Wire Runner','Wire');\nassert(Number.isFinite(d.deal.lineups[0].restOfSeason.combo),'ROS per week');\nassert(d.managers[0].byeCoverage.incoming[0].week===9,'Incoming bye');\nassert(JSON.stringify(d).length>1000,'Serializable dossier');\nHJ6_WEEK.ready=false;a=t.analyse(m);assert(!a.rows[0].weekReady&&!a.factors[1].note,'Weekly projections gated');HJ6_WEEK.ready=true;\nconst at=Date.now();\nwindow.HJTD.injectNews({'2':[\n {text:'Runner has landed on injured reserve.',spin:'He will miss six weeks.',at},\n {type:'rotowire',description:'A roundup of Week 1 sleepers. Runner is discussed.',published:new Date(at).toISOString()},\n {type:'column',description:'Runner has landed on injured reserve.',published:new Date(at).toISOString()},\n {text:'Runner returned to practice.',at:at-22*864e5}\n]});\nconst news=t.newsFor('2','A Runner');assert(news.length===1&&news[0].spin==='He will miss six weeks.','Rotowire identity date and Spin');\nwindow.HJTD.get.add('16');m=t.model();\nassert(m.sides[0].drops.length===1&&m.sides[0].drops[0].player.id==='10','Least valued drop');\nassert(m.sides[0].after.length===10,'Roster capacity');\nassert(t.balanceOptions(m)?.options.every(o=>o.entries.every(e=>e.player.value>800))??true,'Above replacement balancing');\nconsole.log('Trade Desk calculations and dossier: passed');\n",context);


await vm.runInContext(`(async()=>{
 const saved=t.SCHED.map;
 window.HJTD.injectSchedule(new Map());
 assert(t.lineupChanges(t.model().sides[0]).incoming[0].slot==='unassigned','An unloaded schedule is not a bench verdict');
 t.SCHED.map=null;
 let scheduleRequests=0;
 globalThis.pcLoadSchedules=async()=>new Map([['old',{season:2025,week:1,home_team:'AAA',away_team:'CCC'}]]);
 globalThis.hjHostedJson=async(file)=>{
  scheduleRequests++;assert(file==='nfl-schedule-2026.json','Use the current-season hosted schedule');
  const games=[...saved].map(([id,g])=>({...g,game_id:id}));
  while(games.length<272)games.push({game_id:'extra'+games.length,season:2026,week:1,home_team:'XXX',away_team:'YYY'});
  return {schema:1,source:'ESPN',season:2026,games};
 };
 await t.ensureSchedule();
 assert(scheduleRequests===1&&Number.isFinite(t.projectionFact(fixtures[1],'espn').remaining),'Archive without current season must load live schedule');
 const calls=[];
 globalThis.hjMathLoadRosterSeasonProjections=async()=>calls.push('season');
 globalThis.hjEnsureProjectionSources=async()=>calls.push('vegas');
 globalThis.hjPffLoadFeed=async()=>calls.push('pff');
 await t.warmScorecardSources();
 assert(calls.join('|')==='season|vegas|pff','Trade Desk must request every scorecard source');
 const notes=t.analyse(t.model()).factors.map(f=>f.note);
 assert(notes.every(n=>n.endsWith('.')),'Loaded factor notes use complete sentences');
 assert(notes.every(n=>!n.includes(' → ')&&!n.includes('receives /')),'Do not expose compact code-like factor notes');
})()`,context);

const output=Object.fromEntries(FIELDS.map(k=>[k,'<p>Specific analysis.</p>']));
assert.deepEqual(validateOutput(output),output);
assert.throws(()=>validateOutput({...output,summary:'<p onclick="alert(1)">No</p>'}));
assert.throws(()=>validateOutput({...output,summary:'<img src=x>'}));


const trade=vm.runInContext('window.HJTD.buildResearchTrade()',context);
assert.ok(JSON.stringify(trade).length<12000,'Compact roster request');
assert.equal(trade.managers.length,2);
assert.ok(trade.managers[0].roster.some(p=>p.name==='A Runner'));
assert.ok(trade.managers[0].record,'Include manager records');
const call=geminiRequest(trade);
assert.deepEqual(call.tools,[{urlContext:{}}]);
assert.equal(call.generationConfig.responseMimeType,undefined,'Search-compatible ordinary generation');
assert.ok(call.systemInstruction.parts[0].text.includes('Current date:'));
assert.ok(!JSON.stringify(call).includes('weeklySeries'),'Research runs on Gemini, not a huge dossier');
assert.throws(()=>validateTrade({...trade,protocol:'old-paid-client'}));
assert.throws(()=>validateTrade({...trade,managers:[trade.managers[0],trade.managers[0]]}));
const grounded={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]},
 urlContextMetadata:{urlMetadata:[{retrievedUrl:'https://www.nfl.com',urlRetrievalStatus:'URL_RETRIEVAL_STATUS_SUCCESS'}]}}]};
assert.equal(call.generationConfig.thinkingConfig.thinkingLevel,'LOW');
assert.ok(researchSources(trade).length<=20);
assert.ok(researchSources(trade).every(s=>s.url.startsWith('https://')));
assert.equal(parseGeminiResponse(grounded).summary,output.summary);
assert.throws(()=>parseGeminiResponse({candidates:[{...grounded.candidates[0],finishReason:'MAX_TOKENS'}]}));
assert.throws(()=>parseGeminiResponse({candidates:[{...grounded.candidates[0],urlContextMetadata:{}}]}),'Never show an ungrounded report as live research');
let remoteCalls=0,mode='ok',bodySeen,keySeen;const calledModels=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 remoteCalls++;
 const model=url.match(/models\/([^:]+):generateContent$/)?.[1];calledModels.push(model);
 assert.ok(['gemini-3.8-flash','gemini-3.5-flash-lite'].includes(model),'Only explicitly free models');
 bodySeen=JSON.parse(options.body);keySeen=options.headers['x-goog-api-key'];
 if(mode==='overload'&&model==='gemini-3.8-flash')return Response.json({error:{status:'UNAVAILABLE',message:'Model is overloaded'}},{status:503});
 if(mode==='all-overloaded')return Response.json({error:{status:'UNAVAILABLE',message:'High demand'}},{status:503});
 if(mode==='auth')return Response.json({error:{status:'PERMISSION_DENIED'}},{status:403});
 if(mode==='quota')return new Response('{}',{status:429});
 if(mode==='bad')return Response.json({candidates:[{...grounded.candidates[0],finishReason:'MAX_TOKENS'}]});
 return Response.json(grounded);
};
const env={GEMINI_API_KEY:'fake-test-key',GEMINI_FREE_TIER_CONFIRMED:'true',
 OPENAI_API_KEY:'never-used',MODEL:'gpt-5.4',PER_IP:{limit:async()=>({success:true})},TOTAL:{limit:async()=>({success:true})}};
const request=(path='/gemini',origin='https://hungjurors.com',body=trade)=>new Request('https://worker.example'+path,
 {method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
try{
 const health=()=>new Request('https://worker.example/health',{headers:{Origin:'https://hungjurors.com'}});
 assert.equal((await (await worker.fetch(health(),env)).json()).ready,true);
 const missing={...env,PER_IP:undefined,TOTAL:undefined};
 assert.equal((await (await worker.fetch(health(),missing)).json()).ready,false,'Readiness must include required rate limits');
 assert.equal((await (await worker.fetch(request(),missing)).json()).error,'missing_rate_limits');
 assert.equal(remoteCalls,0,'Readiness never calls a model');
 assert.equal((await worker.fetch(request('/'),env)).status,410);
 assert.equal((await worker.fetch(request('/gemini','https://elsewhere.example'),env)).status,403);
 assert.equal((await worker.fetch(request(),{...env,GEMINI_FREE_TIER_CONFIRMED:undefined})).status,503);
 assert.equal((await worker.fetch(request(),{...env,GEMINI_API_KEY:undefined})).status,503);
 assert.equal(remoteCalls,0,'No API calls without free-tier confirmation, key and authorized origin');
 assert.equal((await worker.fetch(request('/gemini','https://hungjurors.com',{...trade,protocol:'legacy'}),env)).status,400);
 assert.equal((await worker.fetch(request(),{...env,PER_IP:{limit:async()=>({success:false})}})).status,429);
 assert.equal(remoteCalls,0);
 const response=await worker.fetch(request(),env);
 assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.equal((await response.json()).overall,output.overall);
 assert.equal(keySeen,'fake-test-key');assert.deepEqual(bodySeen.tools,[{urlContext:{}}]);
 mode='quota';assert.equal((await worker.fetch(request(),env)).status,429);
 assert.equal(remoteCalls,2,'Quota exhaustion never retries or switches providers');
 mode='overload';const beforeFallback=remoteCalls;
 const recovered=await worker.fetch(request(),env);
 assert.equal(recovered.status,200);
 assert.equal((await recovered.json()).engine,'gemini-3.5-flash-lite');
 assert.equal(remoteCalls-beforeFallback,2,'One bounded alternative on service overload');
 assert.deepEqual(calledModels.slice(-2),['gemini-3.8-flash','gemini-3.5-flash-lite']);
 mode='all-overloaded';const beforeUnavailable=remoteCalls;
 const unavailable=await worker.fetch(request(),env);
 assert.equal(unavailable.status,502);assert.equal(remoteCalls-beforeUnavailable,2,'No indefinite retries');
 assert.equal((await unavailable.json()).cause,'MODEL_CAPACITY');
 mode='auth';const beforeAuth=remoteCalls;
 assert.equal((await worker.fetch(request(),env)).status,502);
 assert.equal(remoteCalls-beforeAuth,1,'Do not retry an invalid key');
 mode='bad';assert.equal((await worker.fetch(request(),env)).status,502);
 assert.equal((await worker.fetch(request('/gemini','https://hungjurors.com',{...trade,extra:'x'.repeat(25000)}),env)).status,400);
 const preflight=await worker.fetch(new Request('https://worker.example/gemini',{method:'OPTIONS',headers:{Origin:'https://hungjurors.com'}}),env);
 assert.equal(preflight.status,204);
}finally{globalThis.fetch=originalFetch}
assert.ok(!source.includes('localAnalysis')&&!source.includes('webllm'),'No browser inference runtime');
assert.ok(!source.includes('readAnalysisCache'),'No shared or persistent grounding cache');
console.log('Compact research input, URL context, free-tier gate, origin, quota failure and response validation: passed (mock API; no external inference)');
