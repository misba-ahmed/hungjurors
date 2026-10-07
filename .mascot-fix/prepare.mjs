import fs from'node:fs';import{execFileSync}from'node:child_process';
execFileSync('npm',['install','--no-save','--package-lock=false','playwright'],{stdio:'inherit'});
execFileSync('npx',['playwright','install','--with-deps','chromium'],{stdio:'inherit'});
const{chromium}=await import('playwright');const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:620,height:1100},deviceScaleFactor:2});
await page.goto('https://hungjurors.com/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof HJ_LEAGUE_STATE!=='undefined'&&HJ_LEAGUE_STATE.data?.teams?.length&&typeof hjChLms==='function',{},{timeout:30000});
const proof=await page.evaluate(()=>{
 const names=hjChallengeNames(HJ_LEAGUE_STATE.data);HJ_CHALLENGE_STATE.names=names;
 const week=(n)=>({week:n,final:true,teams:names.map((m,i)=>({...m,score:m.short==='KAT'?(n===5?70:65):m.short==='BRYAN'?78:110+i}))});
 const model=hjChStandings([week(5),week(6)],names);HJ_CHALLENGE_STATE.lmsFit=true;
 const html=hjChLms(model);
 document.body.innerHTML='<main id="lms-preview" style="width:620px;box-sizing:border-box;padding:28px;background:#f7f4e9;color:#17344e"><p style="margin:0 0 14px;font:700 11px system-ui;letter-spacing:.1em;color:#9c7428">ILLUSTRATIVE EXAMPLE · AFTER WEEK 6</p><h2 style="font-size:28px;margin:0 0 10px">Last Man Standing</h2><p style="font-size:14px;line-height:1.5;margin:0 0 24px">The lowest-scoring team still standing is eliminated each week.</p>'+html+'<div style="border:1px solid #d7ccb2;border-radius:10px;padding:15px;margin-top:20px;font:14px/1.5 system-ui;background:#eee8d6"><b>Why Bryan is listed for Week 6:</b><br>Kat scored 65.00 but was already eliminated in Week 5. Bryan’s 78.00 is the lowest score among managers still standing.</div></main>';
 document.body.style.margin='0';document.body.style.background='#f7f4e9';
 return {eliminated:model.eliminations.map(e=>({week:e.week,name:e.short,score:e.score})),seated:document.querySelectorAll('.is-eliminated.lms-figure').length};
});
await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));});await page.waitForTimeout(1800);
fs.writeFileSync('.mascot-fix/lms-example.json',JSON.stringify({proof,image:(await page.locator('#lms-preview').screenshot()).toString('base64')}));await browser.close();
