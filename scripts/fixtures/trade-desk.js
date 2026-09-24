
var NFL_SEASON=2026,HJ_LEAGUE_SEASON=2026;
var HJ_STRENGTH_STATE={scope:'all',view:'trade'},HJ_HQ_STATE={activeTab:'strength'};
var NFL_WEEK1=[],NFL_TEAM_IDS={},HJ6_WEEK={ready:true,key:'3'};
var HJ_PROJECTION_STATE={weekly:{week:3}};
var fixtureEntry=(id,name,position,value,projection,team='AAA')=>({lineupSlotId:20,player:{id,fullName:name,position,team,value,projection,injuryStatus:'ACTIVE'}});
var fixtures=[
 fixtureEntry('1','A Quarterback','QB',3000,340),fixtureEntry('2','A Runner','RB',2000,240),
 fixtureEntry('3','A Back','RB',1500,200),fixtureEntry('4','A Receiver','WR',3000,260),
 fixtureEntry('5','A Wideout','WR',2500,230),fixtureEntry('6','A Tightend','TE',1600,170),
 fixtureEntry('7','A Flex','WR',1800,220),fixtureEntry('8','A Kicker','K',null,130),
 fixtureEntry('9','A Defense','D/ST',null,140),fixtureEntry('10','A Reserve','RB',600,80)
];
var second=fixtures.map((e,i)=>({...e,player:{...e.player,id:String(i+11),fullName:e.player.fullName.replace(/^A /,'B '),team:'BBB'}}));
second[1].player.value=1860;second[1].player.projection=242;second[9].player.value=900;
var HJ_LEAGUE_STATE={data:{teams:[{id:1,name:'ALPHA',roster:{entries:fixtures}},{id:2,name:'BETA',roster:{entries:second}}],
 settings:{rosterSettings:{lineupSlotCounts:{0:1,2:2,4:2,6:1,23:1,16:1,17:1,20:1,21:1}}},schedule:[]}};
function hjCurrentWeek(){return 3}
function hjPlayer(e){return e?.player||e}
function hjPlayerPosition(e){return hjPlayer(e).position}
function hjPlayerTeam(e){return hjPlayer(e).team}
function hjPlayerPhoto(){return ''}
function hjRosterEntries(t){return t.roster.entries}
function hjMatchManager(t){return t.name}
function hjOwnerName(t){return t.name}
function hj6Projection(e,model,horizon){return hjPlayer(e).projection/(horizon==='week'?17:1)}
function hj6WeekKey(){return '3'}
function pcTeam(t){return String(t).toUpperCase()}
function pcBaseName(s){return String(s).toLowerCase().trim()}
function pcPlayerRows(rows,p){return rows.filter(r=>r.id===p.id)}
function pcPoints(r){return r.points}
function pcOpportunities(r){return (r.carries||0)+(r.targets||0)}
function pcSnap(){return null}
function pcTeamSeasonRanks(){return new Map([['AAA',{offenseRank:4,rushAttRank:2}]])}
function ffnPlayerDataAttrs(){return ''}
function av(n,c){return '<span class="'+c+'" aria-label="'+n+'"></span>'}
function hjPffEntryGrade(){return 75}
function buildStandingsAnalytics(){return {people:[{short:'ALPHA',w:1,l:1,seed:3,entries:[{},{}],playoffOdds:20,benchGap:18,last3Avg:115,remainingSOSRank:2},
 {short:'BETA',w:1,l:1,seed:5,entries:[{},{}],playoffOdds:80,benchGap:33,last3Avg:109,remainingSOSRank:4}]}}
function scheduleFutureOpponents(name){return [{week:3,opponent:name==='ALPHA'?'BETA':'ALPHA'},{week:4,opponent:'THIRD'}]}
var ffnRosterByTeam=new Map(),ffnItems=[];
var marketRows=[...fixtures,...second].filter(e=>e.player.value!==null).map(e=>({espnId:e.player.id,name:e.player.fullName,position:e.player.position,team:e.player.team,value:e.player.value,positionRank:5,trend30:100}));
marketRows.push({espnId:'99',name:'Wire Runner',position:'RB',team:'CCC',value:800,positionRank:32});
window.HJMV={ready:true,generatedAt:1,rows:marketRows,entryValue:e=>hjPlayer(e).value,entryRow:e=>marketRows.find(r=>r.espnId===String(hjPlayer(e).id))};
