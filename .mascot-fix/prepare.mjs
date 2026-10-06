import fs from 'node:fs/promises';
let result;
for(let i=0;i<36;i++){
 const h=await(await fetch('https://hungjurors.com/?verify-ranked-header='+Date.now(),{cache:'no-store'})).text();
 const url=h.match(/src=["']([^"']*manager-hero[^"']*)/)[1];
 const s=await(await fetch(new URL(url,'https://hungjurors.com/'),{cache:'no-store'})).text();
 result={url,originalKat:!s.includes('managers-champion')&&s.includes("'managers-v4'"),rankedStart:s.includes("visibility:'hidden',tabindex")&&s.includes('data=HJ_LEAGUE_STATE.data'),version:url.includes('original-kat-ranked-start'),checkedAt:new Date().toISOString()};
 if(result.originalKat&&result.rankedStart&&result.version)break;
 await new Promise(r=>setTimeout(r,5000));
}
await fs.writeFile('.mascot-fix/verified-live-header.json',JSON.stringify(result,null,2));
if(!result.originalKat||!result.rankedStart||!result.version)throw Error(JSON.stringify(result));
console.log(result);
