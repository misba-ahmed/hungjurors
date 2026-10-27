import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('scripts/player-injury-status.js','utf8'),ctx);
for(const [value,code]of Object.entries({Questionable:'Q',Doubtful:'D',Out:'O',INJURY_RESERVE:'IR',Suspended:'SUSP','Physically Unable to Perform':'PUP','Reserve/PUP':'PUP','Non-Football Injury':'NFI','Reserve/NFI':'NFI',Inactive:'Inactive','Day-To-Day':'DTD',Probable:'P'}))assert.equal(ctx.hjOfficialStatus({status:{description:value}})?.code,code);
assert.equal(ctx.hjOfficialStatus({status:'garbage'}),undefined);
assert.equal(ctx.hjOfficialStatus({status:'Active',injuries:[{status:'Injured Reserve'}]}).code,'IR');
assert.equal(ctx.hjOfficialStatus({status:'Active',injuries:[{status:'Out'}]}).code,'O');
const store=ctx.hjCreateHealthStore();
for(let id=1;id<=1000;id++)store.accept(id,{code:'IR',label:'INJURED RESERVE'},100);
for(let id=1;id<=1000;id++){
 assert.equal(store.accept(id,null,99),false,'Old response cannot clear status');
 assert.equal(store.accept(id,undefined,101),false,'Missing response cannot clear status');
 assert.equal(store.accept(id,{code:'IR',label:'INJURED RESERVE'},101),false,'Identical status does not request redraw');
 assert.equal(store.statuses.get(String(id)).code,'IR');
 assert.equal(store.accept(id,null,102),true,'Explicit healthy record clears badge');
 assert.equal(store.statuses.get(String(id)),null);
}
if(process.env.ROSTER_AUDIT_FILE){const teams=JSON.parse(fs.readFileSync(process.env.ROSTER_AUDIT_FILE));let count=0;for(const t of teams)for(const g of t.data.athletes)for(const p of g.items){if(p.injuries?.length){count++;assert(ctx.hjOfficialStatus(p)?.code,p.displayName)}}console.log(`PASS ${teams.length} rosters, ${count} injury records`)}
console.log('PASS canonical health state: 1,000 players, stale/unknown/unchanged responses, explicit recovery, status aliases');
