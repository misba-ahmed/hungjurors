import {mkdir,writeFile,readFile} from 'node:fs/promises';
const source=await readFile('index.html','utf8');
const league=source.match(/const ESPN_FANTASY_LEAGUE_ID\s*=\s*['"]?(\d+)/)?.[1],season=Number(source.match(/const NFL_SEASON\s*=\s*(\d+)/)?.[1]);
async function get(query){const r=await fetch(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league}?${query}`,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('ESPN '+r.status);return r.json();}
try{
 const leagueData=await get('view=mMatchup&view=mStatus');
 const complete=new Map();for(const g of leagueData.schedule||[]){if(g.home&&g.away){const w=Number(g.matchupPeriodId);if(!complete.has(w))complete.set(w,[]);complete.get(w).push(g);}}
 const week=[...complete].filter(([,games])=>games.length&&games.every(g=>['HOME','AWAY','TIE'].includes(g.winner))).map(([w])=>w).sort((a,b)=>b-a)[0];
 if(!week)throw Error('No completed matchup week yet');
 const payload=await get('scoringPeriodId='+week+'&view=mMatchup&view=mMatchupScore&view=mRoster&view=mSettings&view=mTeam');
 const games=(payload.schedule||[]).filter(g=>Number(g.matchupPeriodId)===week&&g.home&&g.away);
 if(Number(payload.scoringPeriodId)!==week||games.length!==complete.get(week).length||games.some(g=>['home','away'].some(side=>!g[side].rosterForCurrentScoringPeriod?.entries?.length)))throw Error('Incomplete historical lineups');
 const compact=JSON.parse(JSON.stringify({...payload,schedule:games,teams:payload.teams.map(({roster,...team})=>team)},(key,value)=>key==='stats'&&Array.isArray(value)?value.filter(s=>Number(s.seasonId)===season&&Number(s.scoringPeriodId)===week):value));
 await mkdir('data',{recursive:true});await writeFile('data/matchup-history.json',JSON.stringify({season,leagueId:String(league),week,checkedAt:Date.now(),payload:compact}));
 console.log('Saved verified Week '+week+' lineups for '+games.length+' matchups');
}catch(error){console.warn('Matchup snapshot refresh: '+error.message);const prior=JSON.parse(await readFile('data/matchup-history.json','utf8'));if(prior.season!==season||prior.leagueId!==String(league))throw error;}
