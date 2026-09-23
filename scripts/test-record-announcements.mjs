import {readFileSync} from 'node:fs';
const source=readFileSync('index.html','utf8');
const HIST=JSON.parse(source.match(/const HIST = (\{[^\n]+\});/)[1]);
const helpers=['hjNorm','hjTeamName','hjMembers','hjOwner','hjOwnerName','hjMatchManager'].map(name=>{
 const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction ',start+1);
 return source.slice(start,end);
}).join('\n');
const manager=new Function('HIST','DATA','HJ_LEAGUE_STATE',helpers+';return hjMatchManager;')(HIST,{managers:['ALEX','BRYAN','CESAR','GARRETT','JARRETT','KAT','MISBA','NATHAN M','NATHAN T','TYLER','WASI'].map(short=>({short}))},{});
const engine=new Function(readFileSync('scripts/record-book-engine.js','utf8')+';return {hjRecordSnapshot,hjBuildRecordHistory};')();
for(const year of [2026,2022]){
 const r=await fetch('https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/'+year+'/segments/0/leagues/1630558?view=mTeam&view=mMatchup&view=mSettings&view=mStatus',{signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error('ESPN '+r.status);
 const data=await r.json();
 const snapshot=engine.hjRecordSnapshot(data,year,t=>manager(t,data)||t.name);
 const games=snapshot.games.filter(g=>g.final&&(year===2026||g.period===2));
 console.log('LEAGUE_SNAPSHOT '+JSON.stringify({...snapshot,games}));
 if(year===2026)console.log('LIVE_CLOSEST '+JSON.stringify(engine.hjBuildRecordHistory(HIST,[snapshot]).record_book.scoring.closest_regular_season_game));
}
console.log('BASELINE_CLOSEST '+JSON.stringify(HIST.record_book.scoring.closest_regular_season_game));
