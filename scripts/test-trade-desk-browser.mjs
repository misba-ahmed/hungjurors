import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const fixture=readFileSync(new URL('./fixtures/trade-desk.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles/trade-desk.css',import.meta.url),'utf8');
let source=readFileSync(new URL('./trade-desk.js',import.meta.url),'utf8');
const expose="\n HJTD._test={model,analyse,posture,balanceOptions,dropPlan,lineupPoints,newsItemFrom,newsFor,byeCoverage,cleanAnalysisHtml,validateAnalysis,\n  requestAnalysis,cancelAnalysis,ANALYSIS,readAnalysisCache,saveAnalysisCache,analysisKey,projectionFact,TEAM_CONTEXT,shell,\n  hydrate:fn=>hydrateDossier=fn};\n";
source=source.replace(" if(document.readyState==='loading')",expose+"\n if(document.readyState==='loading')");
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let requests=0,mode='ok',seen=[];
 await page.route('https://trade-analysis.hungjurors.com/',async route=>{
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST'}});return}
  const index=++requests;seen.push(route.request().postDataJSON());
  const chosen=mode;
  if(chosen==='slow')await new Promise(r=>setTimeout(r,1600));
  if(chosen==='fail'){await route.fulfill({status:502,body:'{}',headers:{'Access-Control-Allow-Origin':'*'}});return}
  const fields=['summary','value','context','usage','roster','schedule','verdictA','verdictB','accept','overall'];
  const data=Object.fromEntries(fields.map(k=>[k,'<p>'+k+' response '+index+'</p>']));
  data.context='';data.accept='<p>ALPHA has a need. Likely</p><p>BETA needs depth. Could go either way</p>';
  await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
 });
 await page.setContent('<html><head><style>*{box-sizing:border-box}body{margin:0;--sans:Arial;--mono:Arial;--serif:Georgia}</style></head><body><div id="league-hq-tools"><div id="hq-panel-strength"></div></div></body></html>');
 await page.addStyleTag({content:css});
 await page.addScriptTag({content:fixture+'\nfunction hjStrengthHTML(){return ""}\nfunction hjRerenderStrength(){document.querySelector("#hq-panel-strength").innerHTML=window.HJTD._test.shell()}\n'+source+"\nconst t=window.HJTD._test;\nwindow.HJTD.a='1';window.HJTD.b='2';window.HJTD.give=new Set(['2']);window.HJTD.get=new Set(['12']);\nconst schedules=new Map();\nfor(let w=1;w<=18;w++){if(w!==8)schedules.set('a'+w,{season:2026,week:w,home_team:'AAA',away_team:'CCC'});\n if(w!==9)schedules.set('b'+w,{season:2026,week:w,home_team:'BBB',away_team:'DDD'});}\nwindow.HJTD.injectSchedule(schedules);\nconst rows=[...fixtures,...second].flatMap(e=>[1,2].map(week=>({id:e.player.id,player_display_name:e.player.fullName,position:e.player.position,team:e.player.team,week,points:10,carries:8,targets:3,receiving_yards:40})));\nwindow.HJTD.injectUsage(rows,null);\n"+'\nwindow.HJTD._test.hydrate(async()=>{});hjRerenderStrength();'});
 await page.getByText('Writing the analysis…',{exact:true}).waitFor();
 await page.locator('.td-sec-summary').waitFor();
 assert.equal(requests,1);
 assert.equal(await page.locator('.td-sec-context').count(),0);
 assert.equal(await page.locator('.td-accept-pill').count(),2);
 const titles=await page.locator('.td-sec > h4').allTextContents();
 assert.deepEqual(titles,['Summary','Breakdown','Factor scorecard','Is it a good value?','Usage and opportunity','Roster fit','Schedule and playoff leverage','The verdict']);
 await page.evaluate(()=>hjRerenderStrength());
 assert.equal(requests,1);
 assert.ok(seen[0].players[0].usage.lastGame);
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
 await page.waitForFunction(()=>HJTD._test.ANALYSIS.controller!==null);
 await page.waitForTimeout(100);
 mode='ok';
 await page.evaluate(()=>{HJTD.get=new Set(['14']);hjRerenderStrength()});
 await page.waitForFunction(()=>document.querySelector('.td-sec-summary')?.textContent.includes('response 3'));
 await page.waitForTimeout(200);
 assert.ok((await page.locator('.td-sec-summary').innerText()).includes('response 3'));
 mode='fail';
 await page.evaluate(()=>{HJTD.get=new Set(['13']);hjRerenderStrength()});
 await page.waitForFunction(()=>HJTD._test.ANALYSIS.state.status==='failed');
 assert.equal(await page.locator('.td-writing').count(),0);
 assert.equal(await page.locator('.td-sec-summary').count(),0);
 assert.equal(await page.locator('.td-sec-breakdown').count(),1);
 assert.equal(await page.locator('.td-score-row').count(),7);
 assert.deepEqual(errors,[]);
 console.log('390px layout, safe HTML, cache, stale responses and quiet failure: passed');
}finally{await browser.close()}
