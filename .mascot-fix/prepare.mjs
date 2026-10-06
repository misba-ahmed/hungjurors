import fs from'node:fs';import{execFileSync}from'node:child_process';
execFileSync('git',['fetch','origin','main']);const s=execFileSync('git',['show','origin/main:index.html'],{encoding:'utf8',maxBuffer:80*1024*1024});const league=s.match(/const ESPN_FANTASY_LEAGUE_ID\s*=\s*['"]?(\d+)/)[1],season=s.match(/const NFL_SEASON\s*=\s*(\d+)/)[1];
const out=[];
for(const view of ['mMatchup&view=mMatchupScore&view=mRoster&view=mSettings&view=mTeam','mMatchup&view=mMatchupScore&view=mRoster&view=mSettings&view=mTeam&view=mBoxscore']){
 const url='https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/'+season+'/segments/0/leagues/'+league+'?scoringPeriodId=4&view='+view;
 const r=await fetch(url,{signal:AbortSignal.timeout(20000)});const d=await r.json();
 fs.writeFileSync('.mascot-fix/week4-'+out.length+'.json',JSON.stringify(d));
 out.push({view,status:r.status,period:d.scoringPeriodId,teams:d.teams?.map(t=>({id:t.id,entries:t.roster?.entries?.length,first:t.roster?.entries?.[0]})),games:d.schedule?.filter(g=>g.matchupPeriodId===4).map(g=>({id:g.id,home:g.home,away:g.away}))});
}
fs.writeFileSync('.mascot-fix/roster-diagnostic.json',JSON.stringify(out));
