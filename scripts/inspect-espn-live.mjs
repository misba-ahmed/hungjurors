const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(r.status+' '+url);return r};
const base='https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leagues/1630558';
try{
const data=await(await get(base+'?view=mLiveScoring&view=mBoxscore&view=mScoreboard&view=mMatchupScore&view=mStatus')).json();
const games=data.schedule.filter(g=>g.matchupPeriodId===data.status.currentMatchupPeriod||g.home?.totalProjectedPointsLive!==undefined);
console.log('LEAGUE',JSON.stringify({week:data.scoringPeriodId,status:data.status,games:games.slice(0,5).map(g=>({...g,home:{...g.home,rosterForCurrentScoringPeriod:g.home?.rosterForCurrentScoringPeriod?{entries:g.home.rosterForCurrentScoringPeriod.entries.slice(0,1)}:undefined,rosterForMatchupPeriod:undefined},away:{...g.away,rosterForCurrentScoringPeriod:undefined,rosterForMatchupPeriod:undefined}}))}));
}catch(e){console.log('LEAGUE ERROR',e.message)}
const url='https://fantasy.espn.com/football/fantasycast?leagueId=1630558&seasonId=2026&matchupPeriodId=3';
try{
const html=await(await get(url)).text(),urls=[...html.matchAll(/<script\b[^>]*src=["']([^"']+)/g)].map(m=>new URL(m[1],url).href);console.log('SCRIPTS',JSON.stringify(urls));
for(const src of urls.filter(u=>/espncdn|espn.com/.test(u))){
try{const js=await(await get(src)).text();let count=0;
for(const m of js.matchAll(/winProbability|WinProbability|winPct|winProb|winPercent|appliedStatTotalVariance|percentComplete/g)){if(count++>60)break;console.log('CODE',src,js.slice(Math.max(0,m.index-1100),m.index+1800));}
if(/__webpack|webpackJsonp/.test(js)&&js.length<60000)console.log('RUNTIME',src,js.slice(0,30000));
}catch(e){console.log('JS ERROR',e.message)}
}
}catch(e){console.log('PAGE ERROR',e.message)}
