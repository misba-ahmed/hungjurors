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
 const entry=e=>{const pp=e.playerPoolEntry||{},p=pp.player||e.player||{};return {playerId:e.playerId,lineupSlotId:e.lineupSlotId,playerPoolEntry:{appliedStatTotal:pp.appliedStatTotal,ratings:pp.ratings,player:{id:p.id,fullName:p.fullName,proTeamId:p.proTeamId,defaultPositionId:p.defaultPositionId,eligibleSlots:p.eligibleSlots,injuryStatus:p.injuryStatus,injured:p.injured,stats:(p.stats||[]).filter(s=>Number(s.seasonId)===season&&Number(s.scoringPeriodId)===week)}}};};
 const side=s=>({teamId:s.teamId,totalPoints:s.totalPoints,totalProjectedPoints:s.totalProjectedPoints,pointsByScoringPeriod:s.pointsByScoringPeriod,rosterForCurrentScoringPeriod:{entries:s.rosterForCurrentScoringPeriod.entries.map(entry)}});
 const compact={id:payload.id,seasonId:season,scoringPeriodId:week,settings:payload.settings,status:payload.status,members:payload.members,teams:payload.teams.map(t=>({id:t.id,name:t.name,location:t.location,nickname:t.nickname,abbrev:t.abbrev,primaryOwner:t.primaryOwner,owners:t.owners})),schedule:games.map(g=>({id:g.id,matchupPeriodId:g.matchupPeriodId,winner:g.winner,playoffTierType:g.playoffTierType,home:side(g.home),away:side(g.away)}))};
 await mkdir('data',{recursive:true});await writeFile('data/matchup-history.json',JSON.stringify({season,leagueId:String(league),week,checkedAt:Date.now(),payload:compact}));
 console.log('Saved verified Week '+week+' lineups for '+games.length+' matchups');
}catch(error){console.warn('Matchup snapshot refresh: '+error.message);const prior=JSON.parse(await readFile('data/matchup-history.json','utf8'));if(prior.season!==season||prior.leagueId!==String(league))throw error;}
