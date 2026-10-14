// Current NFL affiliation is independent of historical game-log teams.
const pcCurrentTeamCache=new Map();
function pcCurrentPlayer(player){
 const id=String(player?.id||''),cached=pcCurrentTeamCache.get(id);
 const live=cached&&Date.now()-cached.at<300000?cached.player:hjPlayer(pcFindLeagueProjectionEntry(player));
 const teamId=live?.proTeamId;
 if(teamId==null||teamId===''||!Number.isInteger(Number(teamId))||Number(teamId)<0)return {...player};
 const team=Number(teamId)===0?'FA':pcEspnActualTeam(live);
 if(!team)return {...player};
 return {...player,team,proTeamId:Number(teamId),jersey:team==='FA'?'':String(live.jersey??(team===player.team?player.jersey??'':'')),position:pcEspnActualPosition(live)||player.position};
}
function pcCurrentRoster(team){
 return ffnRosterPlayers.map(pcCurrentPlayer).filter(player=>pcTeam(player.team)===pcTeam(team));
}
async function pcRefreshCurrentTeam(active){
 const id=String(active?.player?.id||'');
 if(!/^\d+$/.test(id)||active.player.position==='D/ST')return;
 try{
  const saved=pcCurrentTeamCache.get(id);
  if(!saved||Date.now()-saved.at>=300000){
   const entries=await pcEspnLeaguePlayersRequest(Number(NFL_SEASON),0,'kona_player_info',{filterIds:{value:[Number(id)]}});
   const entry=entries.find(e=>String(hjPlayer(e).id)===id),live=hjPlayer(entry);
   if(live?.proTeamId==null)return;
   pcCurrentTeamCache.set(id,{at:Date.now(),player:live});
  }
  if(pcActive!==active||!active.overlay.isConnected)return;
  const next=pcCurrentPlayer(active.player),changed=next.team!==active.player.team;
  Object.assign(active.player,next);
  const heading=active.overlay.querySelector('.pc-modal-heading'),meta=heading?.querySelector('.pc-modal-meta');
  if(heading)heading.dataset.pcTeam=next.team;
  if(meta){
   const label=`${next.team==='FA'?'NFL free agent':next.team} · ${next.position||'—'}`;
   if(meta.firstChild?.nodeType===3)meta.firstChild.textContent=label;else meta.prepend(document.createTextNode(label));
   const jersey=meta.querySelector('[data-profile-jersey]');
   if(jersey)jersey.textContent=next.team!=='FA'&&/^\d{1,2}$/.test(next.jersey||'')?` · #${next.jersey}`:'';
  }
  const photo=active.overlay.querySelector('.pc-modal-photo'),badge=photo?.querySelector('.pc-team-badge'),logo=next.team==='FA'?'':ffnTeamLogo(next.team);
  if(!logo)badge?.remove();
  else if(badge)badge.src=logo;
  else if(photo){const image=document.createElement('img');image.className='pc-team-badge';image.src=logo;image.alt='';photo.append(image);}
  if(changed)pcRenderSeason(active.season||Number(NFL_SEASON));
 }catch(_){/* Keep the current league roster value when the optional lookup fails. */}
}
