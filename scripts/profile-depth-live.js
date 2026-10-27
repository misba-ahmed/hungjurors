/* Team profiles consume current ESPN depth data independently of the news roster. */
const pcLiveDepth=new Map(),pcLiveDepthJobs=new Map();
async function pcLoadLiveDepth(team){
 team=pcTeam(team);const key=`${NFL_SEASON}:${team}`,saved=pcLiveDepth.get(key);
 if(saved&&Date.now()-saved.at<300000)return saved;
 if(pcLiveDepthJobs.has(key))return pcLiveDepthJobs.get(key);
 const id=NFL_TEAM_IDS[team.toLowerCase()==='was'?'wsh':team.toLowerCase()];
 if(!id)throw Error('Unknown NFL team');
 const job=(async()=>{
  const [roster,site]=await Promise.all([fetchEspnJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${id}/roster`),fetchEspnJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${id}/depthcharts`).catch(()=>null)]);
  let depth=site,summary=ffnDepthRanks(depth,roster);
  if(!['QB','RB','WR','TE'].every(p=>summary.positions.has(p))){
   depth=await fetchEspnJson(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${NFL_SEASON}/teams/${id}/depthcharts`);
   summary=ffnDepthRanks(depth,roster);
  }
  if(!['QB','RB','WR','TE'].every(p=>summary.positions.has(p)))throw Error('Incomplete ESPN depth chart');
  const rows=ffnRosterRows(roster,team,depth);
  if(!rows.length)throw Error('Empty ESPN roster');
  const value={rows,at:Date.now()};pcLiveDepth.set(key,value);return value;
 })();
 pcLiveDepthJobs.set(key,job);
 try{return await job}finally{pcLiveDepthJobs.delete(key)}
}
async function pcRefreshProfileDepth(active=pcActive){
 if(!active||active.player.team==='FA')return;
 const team=pcTeam(active.player.team),token=active.token;
 const current=()=>pcActive===active&&active.token===token&&pcTeam(active.player.team)===team&&active.overlay.isConnected;
 let card=active.overlay.querySelector('.pc-team-card');if(!card)return;
 try{
  await pcLoadLiveDepth(team);if(!current())return;
  card=active.overlay.querySelector('.pc-team-card');if(!card)return;
  const template=document.createElement('template');template.innerHTML=pcTeamHTML(active.player,[],active.season);
  const fresh=template.content.firstElementChild,oldRanks=card.querySelector('.pc-team-rank-list');
  if(oldRanks)fresh.querySelector('.pc-team-rank-list')?.replaceWith(oldRanks.cloneNode(true));
  hjPatchLiveContent(card,fresh.innerHTML);
 }catch(error){/* Retain the current chart until a later refresh succeeds. */}
}
const pcRosterBeforeLiveDepth=pcCurrentRoster;
pcCurrentRoster=function(team){return pcLiveDepth.get(`${NFL_SEASON}:${pcTeam(team)}`)?.rows||pcRosterBeforeLiveDepth(team)};
setInterval(()=>{if(!document.hidden)pcRefreshProfileDepth()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)pcRefreshProfileDepth()});
window.addEventListener('online',()=>pcRefreshProfileDepth());
