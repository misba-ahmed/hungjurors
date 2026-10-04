import fs from 'node:fs/promises';import {chromium} from 'playwright';
await fs.mkdir('.roster-check',{recursive:true});
const browser=await chromium.launch({headless:true});
try{const page=await browser.newPage();await page.goto('https://hungjurors.com',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof HJ_LEAGUE_STATE!=='undefined'&&HJ_LEAGUE_STATE.data?.teams?.some(t=>t.roster?.entries?.length),{timeout:60000});
const report=await page.evaluate(()=>{const data=HJ_LEAGUE_STATE.data,week=hjCurrentWeek(data);
return {week,season:typeof NFL_SEASON!=='undefined'?NFL_SEASON:null,teams:data.teams.map(t=>({id:t.id,name:t.name,players:hjRosterEntries(t).map(e=>{const p=hjPlayer(e);return {id:p.id,name:p.fullName,position:p.defaultPositionId,team:p.proTeamId,slot:e.lineupSlotId,status:p.injuryStatus,active:p.active,injured:p.injured,stats:(p.stats||[]).filter(s=>s.scoringPeriodId===week).map(s=>({source:s.statSourceId,total:s.appliedTotal,season:s.seasonId,stats:s.stats}))}})}))};});
await fs.writeFile('.roster-check/current.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report).slice(0,500));
}finally{await browser.close();}
