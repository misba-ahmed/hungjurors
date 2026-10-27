import fs from 'node:fs/promises';
import vm from 'node:vm';
const target=process.argv[2];if(!target)throw Error('Pass the prepared index.html');
const ctx=vm.createContext({});vm.runInContext(await fs.readFile(new URL('./player-injury-status.js',import.meta.url),'utf8'),ctx);
const base='https://site.api.espn.com/apis/site/v2/sports/football/nfl/';
async function get(path){let error;for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(base+path,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`${path}: ${r.status}`);return await r.json()}catch(e){error=e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)))}}throw error}
const [report,listing]=await Promise.all([get('injuries'),get('teams')]);
const teams=listing.sports[0].leagues[0].teams,rows=new Map();let cursor=0;
await Promise.all(Array.from({length:6},async()=>{while(cursor<teams.length){const team=teams[cursor++].team,data=await get(`teams/${team.id}/roster`);for(const group of data.athletes||[])for(const p of group.items||[]){const s=ctx.hjOfficialStatus(p);if(s!==undefined)rows.set(String(p.id),{id:String(p.id),code:s?.code||null,label:s?.label||'ACTIVE'})}}}));
for(const group of report.injuries||[])for(const item of group.injuries||[]){const p=item.athlete||{},link=(p.links||[]).find(l=>/\/id\/\d+/.test(l.href||'')),id=String(p.id||link?.href.match(/\/id\/(\d+)/)?.[1]||''),s=ctx.hjOfficialStatus({injuryStatus:item.status});if(id&&s!==undefined)rows.set(id,{id,code:s?.code||null,label:s?.label||'ACTIVE'})}
if(rows.size<500)throw Error('Incomplete injury snapshot');
const snapshot={at:report.timestamp||new Date().toISOString(),rows:[...rows.values()]},html=await fs.readFile(target,'utf8');
const pattern=/const HJ_INJURY_SNAPSHOT=\{[^\n]+\};/;
if(!pattern.test(html))throw Error('Injury snapshot anchor missing');
await fs.writeFile(target,html.replace(pattern,()=>`const HJ_INJURY_SNAPSHOT=${JSON.stringify(snapshot)};`));
console.log(`Embedded ${rows.size} player statuses from ${teams.length} teams`);
