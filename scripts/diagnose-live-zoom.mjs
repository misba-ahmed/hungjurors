import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync('assets/team-photos/catalog.json','utf8'));
const url='https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leagues/1630558?view=mRoster&view=mTeam';
const r=await fetch(url);if(!r.ok)throw Error('ESPN '+r.status);const data=await r.json();
const missing=[];const mismatches=[];const teams=[];
for(const t of data.teams||[]){
 const roster=[];
 for(const e of t.roster?.entries||[]){
  const p=e.playerPoolEntry?.player||e.player;if(!p||p.defaultPositionId===16)continue;
  const a=catalog[p.id],item={id:p.id,name:p.fullName,teamId:p.proTeamId,position:p.defaultPositionId,slot:e.lineupSlotId};
  roster.push(item);
  if(!a)missing.push({...item,fantasyTeam:t.id});
  else if(a.teamId!==p.proTeamId)mismatches.push({...item,photoTeamId:a.teamId,fantasyTeam:t.id});
 }
 teams.push({id:t.id,name:t.name,roster});
}
if(!teams.length)throw Error('No rosters');
console.log('ROSTER_AUDIT '+JSON.stringify({at:new Date().toISOString(),week:data.scoringPeriodId,missing,mismatches,teams}));
