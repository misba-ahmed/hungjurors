import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
const fixture=readFileSync(new URL('./fixtures/trade-desk.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles/trade-desk.css',import.meta.url),'utf8');
let source=readFileSync(new URL('./trade-desk.js',import.meta.url),'utf8');
const expose="\n HJTD._test={model,analyse,posture,balanceOptions,dropPlan,lineupPoints,newsItemFrom,newsFor,byeCoverage,cleanAnalysisHtml,validateAnalysis,\n  requestAnalysis,cancelAnalysis,ANALYSIS,readAnalysisCache,saveAnalysisCache,analysisKey,projectionFact,TEAM_CONTEXT,shell,\n  hydrate:fn=>hydrateDossier=fn};\n";
source=source.replace(" if(document.readyState==='loading')",expose+"\n if(document.readyState==='loading')");
const fields=['summary','value','context','usage','roster','schedule','verdictA','verdictB','accept','overall'];
let requests=0,mode='ok',seen=[],runtimeLoads=0;
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/completion'){
  let body='';for await(const part of req)body+=part;
  const input=JSON.parse(body);seen.push(input);
  const chosen=mode,index=input.response_format?++requests:0;
  if(chosen==='slow')await new Promise(r=>setTimeout(r,1600));
  const data=Object.fromEntries(fields.map(k=>[k,'<p>'+k+' response '+index+'</p>']));
  data.context='';data.accept='<p>ALPHA has a need. Likely</p><p>BETA needs depth. Could go either way</p>';
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({choices:[{finish_reason:chosen==='fail'?'length':'stop',message:{content:
   input.response_format?JSON.stringify(data):'ALPHA and BETA trade running backs. Two games of usage are available.'}}]}));return;
 }
 res.setHeader('Content-Type','text/javascript');
 if(path==='/model.mjs'){
  runtimeLoads++;
  res.end("export const prebuiltAppConfig={model_list:['q4f16_1','q4f32_1'].map(format=>({model_id:'Llama-3.2-1B-Instruct-'+format+'-MLC',model:location.origin+'/model'}))};"+
   "export class MLCEngine{constructor(options){this.options=options;this.chat={completions:{create:async request=>(await fetch('/completion',{method:'POST',body:JSON.stringify(request)})).json()}}}"+
   "async reload(id,options){if(options.context_window_size!==6144)throw Error('Unexpected context size');this.options.initProgressCallback({progress:0.5});this.options.initProgressCallback({progress:1})}async resetChat(){}interruptGenerate(){}async unload(){}}");return;
 }
 if(path==='/tokenizers.mjs'){res.end("globalThis.tokenizers={Tokenizer:{fromJSON:async()=>({encode:text=>new Uint8Array(Math.ceil(text.length/4)),dispose(){}})}};");return}
 if(path==='/model/resolve/main/tokenizer.json'){res.setHeader('Content-Type','application/json');res.end('{}');return}
 if(/^\/scripts\/trade-analysis-(local|worker|shared)\.mjs$/.test(path)){
  let code=readFileSync(new URL('..'+path,import.meta.url),'utf8');
  if(path.endsWith('-worker.mjs')){
   code="Object.defineProperty(navigator,'gpu',{value:{requestAdapter:async()=>({features:new Set(['shader-f16'])})}});\n"+code
    .replace('https://esm.run/@mlc-ai/web-llm@0.2.85','/model.mjs')
    .replace('https://cdn.jsdelivr.net/npm/@mlc-ai/web-tokenizers@0.1.6/lib/index.js','/tokenizers.mjs');
  }
  res.end(code);return;
 }
 if(path==='/'){
  res.setHeader('Content-Type','text/html');res.end('<html><head><style>*{box-sizing:border-box}body{margin:0;--sans:Arial;--mono:Arial;--serif:Georgia}</style></head><body><div id="league-hq-tools"><div id="hq-panel-strength"></div></div></body></html>');return;
 }
 res.statusCode=404;res.end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[],externalPosts=[];
 page.on('pageerror',e=>errors.push(e.message));
 context.on('request',req=>{if(req.method()==='POST'&&!req.url().startsWith(base+'/'))externalPosts.push(req.url())});
 await context.addInitScript(()=>{
  window.workerStarts=0;window.workerStops=0;
  const NativeWorker=window.Worker;
  window.Worker=new Proxy(NativeWorker,{construct(Target,args){
   window.workerStarts++;const worker=new Target(...args),terminate=worker.terminate.bind(worker);
   worker.terminate=()=>{window.workerStops++;terminate()};return worker;
  }});
 });
 await page.goto(base);
 await page.addStyleTag({content:css});
 const installFixture=async(seed=true)=>{
  await page.addScriptTag({content:fixture+'\nfunction hjStrengthHTML(){return ""}\nfunction hjRerenderStrength(){document.querySelector("#hq-panel-strength").innerHTML=window.HJTD._test.shell()}\n'+source+"\nconst t=window.HJTD._test;\n"+(seed?"window.HJTD.a='1';window.HJTD.b='2';window.HJTD.give=new Set(['2']);window.HJTD.get=new Set(['12']);\n":"")+"\nconst schedules=new Map();\nfor(let w=1;w<=18;w++){if(w!==8)schedules.set('a'+w,{season:2026,week:w,home_team:'AAA',away_team:'CCC'});\n if(w!==9)schedules.set('b'+w,{season:2026,week:w,home_team:'BBB',away_team:'DDD'});}\nwindow.HJTD.injectSchedule(schedules);\nconst rows=[...fixtures,...second].flatMap(e=>[1,2].map(week=>({id:e.player.id,player_display_name:e.player.fullName,position:e.player.position,team:e.player.team,week,points:10,carries:8,targets:3,receiving_yards:40})));\nwindow.HJTD.injectUsage(rows,null);\n"+'\nwindow.HJTD._test.hydrate(async()=>{});hjRerenderStrength();'});
 };
 await installFixture();
 await page.getByRole('button',{name:'Write analysis',exact:true}).waitFor();
 await page.waitForTimeout(1200);
 assert.equal(requests,0,'No inference before the user asks');
 assert.equal(runtimeLoads,0,'No model download during ordinary browsing');
 await page.getByRole('button',{name:'Write analysis',exact:true}).click();
 await page.locator('.td-sec-summary').waitFor();
 assert.equal(requests,1);
 assert.equal(await page.locator('.td-sec-context').count(),0);
 assert.equal(await page.locator('.td-accept-pill').count(),2);
 assert.deepEqual(await page.locator('.td-sec > h4').allTextContents(),
 ['Summary','Breakdown','Factor scorecard','Is it a good value?','Usage and opportunity','Roster fit','Schedule and playoff leverage','The verdict']);
 await page.evaluate(()=>hjRerenderStrength());
 assert.equal(requests,1);
 assert.ok(seen.some(input=>input.messages[1].content.includes('lastGame')),'The Worker reads the trade evidence');
 const sanitized=await page.evaluate(()=>window.HJTD._test.cleanAnalysisHtml('<p onclick="bad()">Safe <b>bold</b></p><script>bad()</script><img onerror="bad()">'));
 assert.equal(sanitized,'<p>Safe <b>bold</b></p>');
 const layout=await page.evaluate(()=>({
   width:document.documentElement.scrollWidth,inner:innerWidth,
   sideA:document.querySelector('.td-side-a').getBoundingClientRect().top,
   sideB:document.querySelector('.td-side-b').getBoundingClientRect().top,
   tiny:[...document.querySelectorAll('.td-shell *')].filter(e=>e.textContent.trim()&&parseFloat(getComputedStyle(e).fontSize)<9).map(e=>e.className)
 }));
 assert.ok(layout.width<=layout.inner,'390px overflow: '+JSON.stringify(layout));
 assert.equal(layout.sideA,layout.sideB);assert.deepEqual(layout.tiny,[]);
 assert.ok(!(await page.locator('.td-side-grade').first().innerText()).includes('grade'));
 mode='slow';
 await page.evaluate(()=>{HJTD.get=new Set(['16']);hjRerenderStrength()});
 const until=async(predicate)=>{const end=Date.now()+15000;while(!predicate()){assert.ok(Date.now()<end,'Timed out waiting for generation');await new Promise(r=>setTimeout(r,50))}};
 await until(()=>requests===2);
 mode='ok';
 await page.evaluate(()=>{HJTD.get=new Set(['14']);hjRerenderStrength()});
 await page.waitForFunction(()=>document.querySelector('.td-sec-summary')?.textContent.includes('response 3'));
 assert.equal(await page.evaluate(()=>window.workerStarts),3,'Each trade uses a new Worker after releasing the previous one');
 assert.equal(await page.evaluate(()=>window.workerStops),3,'Completed and cancelled Workers release their resources');
 mode='fail';
 await page.evaluate(()=>{HJTD.get=new Set(['13']);hjRerenderStrength()});
 await page.waitForFunction(()=>HJTD._test.ANALYSIS.state.status==='failed');
 assert.equal(await page.locator('.td-writing').count(),0);
 assert.equal(await page.locator('.td-sec-summary').count(),0);
 assert.equal(await page.locator('.td-sec-breakdown').count(),1);
 assert.equal(await page.locator('.td-score-row').count(),7);
 assert.equal(await page.getByRole('button',{name:'Try analysis again',exact:true}).count(),1);
 assert.equal(await page.evaluate(()=>window.workerStarts),4);
 assert.equal(await page.evaluate(()=>window.workerStops),4,'A failed Worker is also released');
 // A browser process can disappear without delivering an error or pagehide.
 // Preserve the in-flight draft exactly as it would remain after that interruption.
 await page.evaluate(()=>{
  const key='hj-trade-draft-v1',saved=JSON.parse(sessionStorage.getItem(key));
  saved.pending=true;
  sessionStorage.setItem(key,JSON.stringify(saved));localStorage.setItem(key,JSON.stringify(saved));
  history.replaceState(null,'','#top');
 });
 await page.reload();
 await page.addStyleTag({content:css});
 await installFixture(false);
 assert.equal(await page.evaluate(()=>location.hash),'#roster-strength');
 assert.deepEqual(await page.evaluate(()=>({a:HJTD.a,b:HJTD.b,give:[...HJTD.give],get:[...HJTD.get]})),
  {a:'1',b:'2',give:['2'],get:['13']},'Restore both managers and every selected player');
 assert.equal(await page.getByRole('button',{name:'Write analysis',exact:true}).count(),1);
 await page.waitForTimeout(1200);
 assert.equal(await page.evaluate(()=>window.workerStarts),0,'An interrupted analysis never restarts on reload');
 assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('hj-trade-draft-v1')).pending),false);
 assert.deepEqual(errors,[]);assert.deepEqual(externalPosts,[]);
 console.log('Local Worker integration (mock model), lazy loading, 390px layout, cache, Worker disposal, draft recovery and quiet failure: passed');
}finally{
 await browser.close();
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
