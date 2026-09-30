import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync('assets/team-photos/catalog.json','utf8'));
const r=await fetch('https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leagues/1630558?view=mRoster&view=mTeam');
if(!r.ok)throw Error('ESPN '+r.status);const data=await r.json();const missing=[],mismatches=[],teams=[];
for(const t of data.teams||[]){
 const roster=[];
 for(const e of t.roster?.entries||[]){
  const p=e.playerPoolEntry?.player||e.player;if(!p||p.defaultPositionId===16)continue;
  const a=catalog[p.id],item={id:p.id,name:p.fullName,teamId:p.proTeamId,position:p.defaultPositionId,slot:e.lineupSlotId};
  roster.push(item);if(!a)missing.push({...item,fantasyTeam:t.id});else if(a.teamId!==p.proTeamId)mismatches.push({...item,photoTeamId:a.teamId,fantasyTeam:t.id});
 }
 teams.push({id:t.id,name:t.name,roster});
}
if(!teams.length)throw Error('No rosters');console.log('ROSTER_AUDIT '+JSON.stringify({at:new Date().toISOString(),week:data.scoringPeriodId,missing,mismatches,teams}));
for(const p of [...missing,...mismatches]){
 const r=await fetch('https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes/'+p.id);if(!r.ok)throw Error('Player '+r.status);
 const {athlete:a}=await r.json();console.log('PLAYER '+JSON.stringify({id:p.id,name:a.displayName,height:a.displayHeight,weight:a.displayWeight,jersey:a.jersey,teamId:Number(a.team.id),team:a.team.displayName,abbreviation:a.team.abbreviation,headshot:a.headshot.href}));
 const image=await fetch(a.headshot.href);if(!image.ok)throw Error('Headshot missing '+p.id);console.log('HEADSHOT '+p.id+' '+Buffer.from(await image.arrayBuffer()).toString('base64'));
}
