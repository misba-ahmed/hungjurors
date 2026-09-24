import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
const fixture=readFileSync(new URL('./fixtures/trade-desk.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles/trade-desk.css',import.meta.url),'utf8');
let source=readFileSync(new URL('./trade-desk.js',import.meta.url),'utf8');
const expose="\n HJTD._test={model,analyse,posture,balanceOptions,dropPlan,lineupPoints,newsItemFrom,newsFor,byeCoverage,cleanAnalysisHtml,validateAnalysis,\n  requestAnalysis,cancelAnalysis,ANALYSIS,researchTrade,analysisKey,projectionFact,TEAM_CONTEXT,shell,\n  hydrate:fn=>hydrateDossier=fn};\n";
source=source.replace(" if(document.readyState==='loading')",expose+"\n if(document.readyState==='loading')");
const fields=['summary','value','context','usage','roster','schedule','verdictA','verdictB','accept','overall'];
let requests=0,mode='ok',seen=[];
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/gemini'){
  let body='';for await(const part of req)body+=part;
  const input=JSON.parse(body);seen.push(input);assert.equal(input.protocol,'hj-trade-search-v1');
  const chosen=mode,index=++requests;
  if(chosen==='slow')await new Promise(r=>setTimeout(r,700));
  if(chosen==='fail'){res.writeHead(429,{'Content-Type':'application/json'});res.end('{"error":"busy"}');return}
  const data=Object.fromEntries(fields.map(k=>[k,'<p>'+k+' response '+index+'</p>']));
  data.context='';data.accept='<p>ALPHA has a need. Likely</p><p>BETA needs depth. Could go either way</p>';
  data.sources=[{url:'https://www.nfl.com',title:'NFL'}];
  data.searchSuggestions='<style>a{font:14px Arial}</style><div><a href="https://www.google.com/search?q=football">Football news</a></div>';
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;
 }
 if(path==='/'){
  res.setHeader('Content-Type','text/html');res.end('<html><head><style>*{box-sizing:border-box}body{margin:0;--sans:Arial;--mono:Arial;--serif:Georgia}</style></head><body><div id="league-hq-tools"><div id="hq-panel-strength"></div></div></body></html>');return;
 }
 res.statusCode=404;res.end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
source=source.replace('https://hungjurors-trade-analysis.misbauddin-ahmed.workers.dev/gemini',base+'/gemini');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[],externalPosts=[];
 page.on('pageerror',e=>errors.push(e.message));
 context.on('request',req=>{if(req.method()==='POST'&&!req.url().startsWith(base+'/'))externalPosts.push(req.url())});
 await context.addInitScript(()=>{window.Worker=class{constructor(){throw Error('Browser inference must not run')}}});
 await page.goto(base);
 await page.addStyleTag({content:css});
 const installFixture=async(seed=true)=>{
  await page.addScriptTag({content:fixture+'\nfunction hjStrengthHTML(){return ""}\nfunction hjRerenderStrength(){document.querySelector("#hq-panel-strength").innerHTML=window.HJTD._test.shell()}\n'+source+"\nconst t=window.HJTD._test;\n"+(seed?"window.HJTD.a='1';window.HJTD.b='2';window.HJTD.give=new Set(['2']);window.HJTD.get=new Set(['12']);\n":"")+"\nconst schedules=new Map();\nfor(let w=1;w<=18;w++){if(w!==8)schedules.set('a'+w,{season:2026,week:w,home_team:'AAA',away_team:'CCC'});\n if(w!==9)schedules.set('b'+w,{season:2026,week:w,home_team:'BBB',away_team:'DDD'});}\nwindow.HJTD.injectSchedule(schedules);\nconst rows=[...fixtures,...second].flatMap(e=>[1,2].map(week=>({id:e.player.id,player_display_name:e.player.fullName,position:e.player.position,team:e.player.team,week,points:10,carries:8,targets:3,receiving_yards:40})));\nwindow.HJTD.injectUsage(rows,null);\n"+'\nhjRerenderStrength();'});
 };
 await installFixture();
 await page.getByRole('button',{name:'Write analysis',exact:true}).waitFor();
 await page.waitForTimeout(1200);
 assert.equal(requests,0,'No inference before the user asks');

 await page.getByRole('button',{name:'Write analysis',exact:true}).click();
 await page.locator('.td-sec-summary').waitFor();
 assert.equal(requests,1);
 assert.equal(await page.locator('.td-sec-context').count(),0);
 assert.equal(await page.locator('.td-accept-pill').count(),2);
 assert.deepEqual(await page.locator('.td-sec > h4').allTextContents(),
 ['Breakdown','Factor scorecard','Summary','Is it a good value?','Usage and opportunity','Roster fit','Schedule and playoff leverage','The verdict']);
 await page.evaluate(()=>hjRerenderStrength());
 assert.equal(requests,1);
 assert.equal(seen[0].managers[0].sends[0],'2');
 await page.locator('.td-search-suggestions a').waitFor();
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
 assert.equal(requests,1,'Changing selection does not generate');
 await page.getByRole('button',{name:'Write analysis',exact:true}).click();
 await until(()=>requests===2);
 mode='ok';
 await page.evaluate(()=>{HJTD.get=new Set(['14']);hjRerenderStrength()});
 await page.getByRole('button',{name:'Write analysis',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.td-sec-summary')?.textContent.includes('response 3'));
 await page.waitForTimeout(800);
 assert.ok((await page.locator('.td-sec-summary').innerText()).includes('response 3'),'Old response cannot overwrite new trade');
 mode='fail';
 await page.evaluate(()=>{HJTD.get=new Set(['13']);hjRerenderStrength()});
 await page.getByRole('button',{name:'Write analysis',exact:true}).click();
 await page.waitForFunction(()=>HJTD._test.ANALYSIS.state.status==='failed');
 assert.equal(await page.locator('.td-writing').count(),0);
 assert.equal(await page.locator('.td-sec-summary').count(),0);
 assert.equal(await page.locator('.td-sec-breakdown').count(),1);
 assert.equal(await page.locator('.td-score-row').count(),7);
 assert.equal(await page.getByRole('button',{name:'Try analysis again',exact:true}).count(),1);
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
 assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('hj-trade-draft-v1')).pending),false);
 assert.equal(requests,4,'No auto retry or generation on reload');
 assert.deepEqual(errors,[]);assert.deepEqual(externalPosts,[]);
 console.log('Hosted analysis integration: explicit requests, sources, 390px layout, cancellation, draft recovery and quiet quota failure passed (mock API; no external inference)');
}finally{
 await browser.close();
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
