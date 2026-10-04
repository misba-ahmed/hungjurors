import {chromium} from 'playwright';
const domains=['espn.com','espncdn.com','go.com','disney.com','disneyid.com','bamgrid.com','disney-plus.net','google.com','gstatic.com','recaptcha.net','hcaptcha.com'];
export function allowed(url,method='GET'){
  let u;try{u=new URL(url);}catch{return false;}
  if(u.protocol!=='https:'||u.port&&u.port!=='443')return false;
  if(!domains.some(d=>u.hostname===d||u.hostname.endsWith('.'+d)))return false;
  // Read-only proof: no fantasy transaction requests can leave this browser.
  if(u.hostname.includes('lm-api-writes')||/\/transactions(?:\/|$)/i.test(u.pathname))return false;
  if(u.hostname.endsWith('fantasy.espn.com')&&!['GET','HEAD','OPTIONS'].includes(method))return false;
  return true;
}
export async function openBrowser(){
  const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
  try {
    const context=await browser.newContext({viewport:{width:390,height:700},deviceScaleFactor:1,
      isMobile:true,hasTouch:true,acceptDownloads:false,serviceWorkers:'block'});
    await context.route('**/*',route=>allowed(route.request().url(),route.request().method())?route.continue():route.abort());
    await context.routeWebSocket('**/*',ws=>ws.close());
    const page=await context.newPage();
    context.on('page',p=>{if(p!==page)p.close().catch(()=>{});});
    page.on('dialog',d=>d.dismiss().catch(()=>{}));
    await page.goto('https://fantasy.espn.com/football/',{waitUntil:'domcontentloaded',timeout:45000}).catch(()=>{});
    return {
      async frame(){return {image:(await page.screenshot({type:'jpeg',quality:75})).toString('base64'),origin:safeOrigin(page.url())};},
      async input(action){
        if(action.type==='tap')await page.touchscreen.tap(action.x,action.y);
        if(action.type==='text')await page.keyboard.insertText(action.text);
        if(action.type==='key')await page.keyboard.press(action.key);
        if(action.type==='scroll')await page.mouse.wheel(0,action.y);
      },
      async roster(league,season){
        const url='https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/'+season+'/segments/0/leagues/'+league+'?view=mTeam&view=mRoster&view=mSettings';
        const cookies=await context.cookies('https://fantasy.espn.com/');
        const swid=cookies.find(c=>c.name==='SWID')?.value;
        const sessionPresent=Boolean(cookies.find(c=>c.name==='espn_s2')?.value);
        if(!swid||!sessionPresent)throw Error('Finish signing into ESPN in the window, then read your team.');
        const response=await context.request.get(url,{timeout:20000,maxRedirects:0});
        if(!response.ok())throw Error('ESPN refused the roster read (HTTP '+response.status()+'). No changes were made.');
        let data;try{data=await response.json();}catch{throw Error('ESPN returned an unexpected response. Connection is not verified.');}
        return ownRoster(data,swid,league,season);
      },
      async close(){await browser.close();}
    };
  }catch(e){await browser.close();throw e;}
}
export function safeOrigin(url){try{return new URL(url).origin;}catch{return 'ESPN sign-in';}}
export function ownRoster(data,swid,league,season){
  if(!data||Number(data.id)!==Number(league)||Number(data.seasonId)!==Number(season)||!Array.isArray(data.teams))throw Error('ESPN returned an unexpected league.');
  const norm=v=>String(v||'').replace(/[{}]/g,'').toUpperCase();
  if(!/^[0-9A-F-]{36}$/.test(norm(swid)))throw Error('ESPN account identity was unavailable.');
  const teams=data.teams.filter(t=>t.owners?.some(o=>norm(o)===norm(swid))).map(t=>({
    id:t.id,name:String(t.name||[t.location,t.nickname].filter(Boolean).join(' ')||'My team'),
    players:(t.roster?.entries||[]).map(e=>({name:String(e.playerPoolEntry?.player?.fullName||'Unknown player'),slot:e.lineupSlotId}))
  }));
  if(!teams.length)throw Error('The signed-in ESPN account does not own a team in this league.');
  if(teams.some(t=>!t.players.length))throw Error('Your team was found, but ESPN did not return its roster.');
  return {league:Number(league),season:Number(season),teams,privateLeague:data.settings?.isPublic===false,
    writeTest:'NOT_RUN',note:'Roster read only. Transaction authorization remains unverified.'};
}
