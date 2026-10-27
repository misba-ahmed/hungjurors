import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const html=prepareSite(await fs.readFile('index.html','utf8'));
const cssParts=[];
for(const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>|<link[^>]+rel="stylesheet"[^>]*>/g)){
 if(m[1])cssParts.push(m[1]);
 else {const href=m[0].match(/href="([^"]+)"/)?.[1];if(href&&!/^https?:/.test(href))try{cssParts.push(await fs.readFile(href.replace(/^\//,'').split('?')[0],'utf8'))}catch{}}
}
const css=cssParts.join('\n');
const source=await fs.readFile('scripts/roster-weeks.js','utf8');
const c={esc:String,HJ_HQ_STATE:{lineupModes:new Map()},hjRosterModeKey:()=>''};
vm.createContext(c);vm.runInContext(source.slice(source.indexOf(' const selected='),source.indexOf(' function repaint'))+';this.render=toolbar;',c);
Object.assign(c,{HJ_LEAGUE_STATE:{data:{}},hjCurrentWeek:()=>8,hjCurrentMatchup:()=>null,hjNumber:v=>v==null?null:Number(v),hjSideScore:()=>null,hjAdjustedEspnProjection:()=>null,pcFpts:v=>v.toFixed(2)});
vm.runInContext(html.slice(html.indexOf('function hjPerformanceAttrs('),html.indexOf('function hjContextEntry('))+html.slice(html.indexOf('function hjTeamTotalAttrs('),html.indexOf('function hjRosterSelectedGroupHTML(')),c);
const header=(value,week,actual)=>'<div class="league-roster-group"><div class="league-roster-group-head"><span>Week '+week+' lineup</span>'+c.hjRosterTotalHTML(value,actual,'',[],week,'actual',1,100,actual)+'</div></div>';
const scores=header(105,8,false)+header(105,9,false)+header(105,7,true)+header(85,6,true)+header(60,5,true);
await fs.mkdir('roster-toolbar-proof',{recursive:true});
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{for(const width of [320,375,390,480,600,601,768,1024,1536]){
  const page=await browser.newPage({viewport:{width,height:480},deviceScaleFactor:2});
  await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><style>body{margin:0;padding:12px;background:#f8edd4}#league-hq{margin:0;padding:0}.test-title{font:700 14px sans-serif;margin:12px 0;color:#14324f}.manager-hq-roster{margin:0;padding:0}.test-roster-heading{border:1px solid #d8d3c2;padding:14px;font:700 11px sans-serif;color:#14324f;background:#f3efdf}</style><div class="test-title">League HQ · ${width}px</div><main id="league-hq"><div id="league-sync-content"><div class="league-team-view">${c.render({id:1},18,false)}${scores}</div></div></main><div class="test-title">Manager profile · ${width}px</div><div class="manager-hq-roster">${c.render({id:1},18,true)}${scores}</div>`);
  const measures=await page.locator('.hj-roster-week-tools').evaluateAll(els=>els.map(el=>{const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,cy:r.top+r.height/2,width:r.width,height:r.height}};return {toolbar:rect(el),width:el.clientWidth,scrollWidth:el.scrollWidth,parts:[...el.querySelectorAll('.hj-roster-week-nav b,.hj-roster-week-nav button,.league-roster-mode')].map(rect),arrows:[...el.querySelectorAll('svg')].map(rect)}}));
  for(const m of measures){
   assert(m.scrollWidth<=m.width+1,`${engineName} ${width}: horizontal overflow ${JSON.stringify(m)}`);
   for(const r of [...m.parts,...m.arrows])assert(Math.abs(r.cy-m.toolbar.cy)<1,`${engineName} ${width}: off center ${JSON.stringify(m)}`);
   for(let i=1;i<m.parts.length;i++)assert(m.parts[i].left>=m.parts[i-1].right-1,`${engineName} ${width}: overlap`);
   assert.equal(m.arrows.length,2);
  }
  for(const scope of ['#league-sync-content','.manager-hq-roster']){
   const scores=await page.locator(scope+' .hq-match-team-score').evaluateAll(els=>els.map(el=>({size:getComputedStyle(el).fontSize,color:el.dataset.hjPerformance})));
   assert.equal(new Set(scores.map(x=>x.size)).size,1,engineName+' '+width+' same score sizes '+JSON.stringify(scores));
   assert.deepEqual(scores.slice(2).map(x=>x.color),['green','orange','red']);
  }
  await page.screenshot({path:`roster-toolbar-proof/${engineName}-${width}.png`});
  await page.close();
  console.log(`PASS ${engineName} ${width}px: both toolbars one line, centered arrows, no overlap or overflow`);
 }}finally{await browser.close()}
}
