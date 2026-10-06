/* Matchups retain the just-played week until Wednesday in league (Central) time. */
function hjDefaultMatchupWeek(data=HJ_LEAGUE_STATE.data,now=Date.now()){
 const current=hjCurrentWeek(data);
 if(current<=1)return current;
 const day=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short'}).format(new Date(now));
 if(day!=='Mon'&&day!=='Tue')return current;
 const games=data?.schedule||[],currentGames=games.filter(g=>Number(g.matchupPeriodId)===current);
 // ESPN may still report the active week on Monday. Never step back from games already played.
 const started=currentGames.some(g=>hjGameFinal(g,data)||['home','away'].some(side=>Number(hjSideScore(g[side],current))>0));
 return !started&&games.some(g=>Number(g.matchupPeriodId)===current-1)?current-1:current;
}
