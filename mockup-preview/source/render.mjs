import fs from 'node:fs/promises';
import sharp from 'sharp';
const out='mockup-preview/rendered';
await fs.mkdir(out,{recursive:true});
const url='https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leagues/1630558?view=mRoster&view=mTeam';
const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error('League '+response.status);
const data=await response.json();
const abbr={1:'ATL',2:'BUF',3:'CHI',4:'CIN',5:'CLE',6:'DAL',7:'DEN',8:'DET',9:'GB',10:'TEN',11:'IND',12:'KC',13:'LV',14:'LAR',15:'MIA',16:'MIN',17:'NE',18:'NO',19:'NYG',20:'NYJ',21:'PHI',22:'ARI',23:'PIT',24:'LAC',25:'SF',26:'SEA',27:'TB',28:'WSH',29:'CAR',30:'JAX',33:'BAL',34:'HOU'};
const teams=[];
for(const team of data.teams||[]){
 const members=(team.owners||[]).map(id=>(data.members||[]).find(m=>m.id===id)).filter(Boolean);
 const rows=(team.roster?.entries||[]).map(e=>({slot:e.lineupSlotId,...e.playerPoolEntry?.player})).filter(p=>p.defaultPositionId!==16&&p.id>0);
 teams.push({id:team.id,name:team.name||[team.location,team.nickname].filter(Boolean).join(' '),owners:members.map(m=>[m.firstName,m.lastName].join(' ')),players:rows.map(p=>({id:String(p.id),name:p.fullName,team:abbr[p.proTeamId]||'FA',teamId:p.proTeamId,slot:p.slot,position:({1:'QB',2:'RB',3:'WR',4:'TE',5:'K'})[p.defaultPositionId]||'',height:0,weight:0,number:''}))});
}
if(teams.length!==10||teams.some(t=>t.players.length<10))throw Error('Incomplete rosters');
const all=teams.flatMap(t=>t.players);let cursor=0;
await Promise.all(Array.from({length:8},async()=>{
 while(cursor<all.length){
  const p=all[cursor++];
  try{const r=await fetch('https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes/'+p.id,{signal:AbortSignal.timeout(20000)});if(r.ok){const d=await r.json();const a=d.athlete||d;p.height=a.height||0;p.weight=a.weight||0;p.number=a.jersey||'';p.displayHeight=a.displayHeight||'';}}
  catch(e){console.log('Profile unavailable '+p.id);}
  const r=await fetch('https://a.espncdn.com/i/headshots/nfl/players/full/'+p.id+'.png',{signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error('Portrait '+p.id+' '+r.status);
  const buf=Buffer.from(await r.arrayBuffer());await fs.writeFile(out+'/head-'+p.id+'.png',buf);
 }
}));
await fs.writeFile(out+'/rosters.json',JSON.stringify(teams,null,2));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(const t of teams){
 const columns=4,cw=300,ch=280,rows=Math.ceil(t.players.length/columns);
 const layers=[];
 for(let i=0;i<t.players.length;i++){
  const p=t.players[i],x=(i%columns)*cw,y=Math.floor(i/columns)*ch;
  const face=await sharp(out+'/head-'+p.id+'.png').resize(290,215,{fit:'contain',background:'#f4f4f4'}).png().toBuffer();
  layers.push({input:face,left:x+5,top:y});
  const label='<svg width="300" height="65"><rect width="300" height="65" fill="white"/><text x="150" y="22" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="bold">'+esc((i+1)+'. '+p.name)+'</text><text x="150" y="46" text-anchor="middle" font-family="sans-serif" font-size="15">'+esc(p.team+' #'+p.number+' | '+p.position+' '+(p.displayHeight||''))+'</text></svg>';
  layers.push({input:Buffer.from(label),left:x,top:y+215});
 }
 const sheet=await sharp({create:{width:columns*cw,height:rows*ch,channels:4,background:'white'}}).composite(layers).png().toBuffer();
 await fs.writeFile(out+'/team-'+t.id+'-faces.base64.txt',sheet.toString('base64'));
}
console.log(JSON.stringify(teams.map(t=>({id:t.id,owners:t.owners,count:t.players.length}))));
