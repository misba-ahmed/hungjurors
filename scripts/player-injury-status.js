/* All player surfaces share one status parser and source reconciliation. */
function hjOfficialStatus(player){
 const p=player?.playerPoolEntry?.player||player?.player||player||{};
 const injury=[...(Array.isArray(p.injuries)?p.injuries:[])].sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0))[0];
 const text=v=>typeof v==='string'?v:v?.name||v?.description||v?.type||v?.abbreviation;
 const raw=[text(injury?.status),player?.injuryStatus,p.injuryStatus,text(p.injury?.status)||text(p.injury),text(p.status)].find(v=>typeof v==='string'&&v.trim());
 if(raw===undefined)return undefined;
 const value=raw.toUpperCase().replace(/[_-]/g,' ').replace(/\s+/g,' ').trim();
 if(['NORMAL','ACTIVE','HEALTHY','PRACTICE SQUAD'].includes(value))return null;
 const codes={QUESTIONABLE:'Q',Q:'Q',DOUBTFUL:'D',D:'D',OUT:'O',O:'O','INJURY RESERVE':'IR','INJURED RESERVE':'IR',IR:'IR',SUSPENSION:'SUSP',SUSPENDED:'SUSP',SUSP:'SUSP','PHYSICALLY UNABLE TO PERFORM':'PUP','RESERVE/PUP':'PUP',PUP:'PUP','NON FOOTBALL INJURY':'NFI','NON FOOTBALL ILLNESS':'NFI','RESERVE/NFI':'NFI',NFI:'NFI',INACTIVE:'Inactive','DAY TO DAY':'DTD',DTD:'DTD',PROBABLE:'P',P:'P'};
 return codes[value]?{code:codes[value],label:value}:undefined;
}
function hjStatusIndex(){
 const records=new Map();
 const putStatus=(id,status,at=0)=>{id=String(id||'');if(!id||status===undefined)return;at=Number(at)||0;const old=records.get(id);if(!old||at>=old.at)records.set(id,{status,at})};
 const put=(entry,at=0)=>{if(entry?._pcSeason&&typeof NFL_SEASON!=='undefined'&&Number(entry._pcSeason)!==Number(NFL_SEASON))return;const p=entry?.playerPoolEntry?.player||entry?.player||entry||{};putStatus(p.id||entry?.playerId||entry?.id,hjOfficialStatus(entry),entry?._hjStatusAt||p._hjStatusAt||at)};
 // Undated directory entries are fallbacks, never newer than fetched roster data.
 if(typeof HJ_PLAYER_DIRECTORY!=='undefined'){
  (HJ_PLAYER_DIRECTORY.rows||[]).forEach(e=>put(e));
  HJ_PLAYER_DIRECTORY.espnCache?.forEach(e=>{if(e)put(e)});
 }
 if(typeof HJ_ESPN_HQ_POOL!=='undefined')HJ_ESPN_HQ_POOL.byId?.forEach(e=>put(e));
 if(typeof HJ_LEAGUE_STATE!=='undefined')(HJ_LEAGUE_STATE.data?.teams||[]).forEach(t=>(t.roster?.entries||[]).forEach(e=>put(e,HJ_LEAGUE_STATE.syncedAt)));
 if(typeof ffnRosterPlayers!=='undefined')ffnRosterPlayers.forEach(e=>put(e));
 if(typeof pcLiveDepth!=='undefined')pcLiveDepth.forEach(data=>data.rows.forEach(e=>put(e,data.at)));
 if(typeof pcCurrentTeamCache!=='undefined')pcCurrentTeamCache.forEach(data=>put(data.player,data.at));
 HJ_STATUS_LIVE.forEach(record=>put(record.entry,record.at));
 const reportAt=Date.parse(HJ_INJURY_REPORT.at)||0;
 // The shipped report is only a short-lived fallback; a months-old snapshot cannot clear IR.
 if(Date.now()-reportAt<86400000)HJ_INJURY_REPORT.rows.forEach(r=>putStatus(r.id,r.code?{code:r.code,label:r.label}:null,reportAt));
 return new Map([...records].map(([id,record])=>[id,record.status]));
}
function hjStatusHost(node){
 // A photo and name in the same card represent one player. Decorate the name once.
 if(node.matches('.ffn-photo,.rc-feat-photo,.rc-mini-photo,.rc-pcard-photo')){
  const parent=node.parentElement;
  if(parent&&[...parent.querySelectorAll('[data-pc-id]')].some(other=>other!==node&&other.dataset.pcId===node.dataset.pcId&&!other.matches('.ffn-photo,.rc-feat-photo,.rc-mini-photo,.rc-pcard-photo')))return null;
 }
 return node.querySelector('.pc-depth-slot,.hj-v3-meta,.hj-player-v2-meta,.hq-player-name,.pc-modal-meta,.hj-tx-player-copy b,.wire-row-name,.depth-player-name,.n,b')||(!node.querySelector('[data-pc-id]')?node:null);
}
function hjApplyOfficialStatuses(){
 const statuses=hjStatusIndex();
 document.querySelectorAll('[data-pc-id]').forEach(node=>{
  const badges=[...node.querySelectorAll('.hj-espn-status,.hj-v3-injury,.hj-player-v2-injury,.depth-injury')].filter(b=>b.closest('[data-pc-id]')===node);
  const host=node.dataset.pcPosition==='D/ST'?null:hjStatusHost(node);
  if(!host){badges.forEach(b=>b.remove());return}
  if(!statuses.has(node.dataset.pcId)){if(node.dataset.hjStatusPlayer&&node.dataset.hjStatusPlayer!==node.dataset.pcId)badges.forEach(b=>b.remove());return}
  node.dataset.hjStatusPlayer=node.dataset.pcId;
  const status=statuses.get(node.dataset.pcId);
  if(!status){badges.forEach(b=>b.remove());return}
  const badge=badges.shift()||document.createElement('span');badges.forEach(b=>b.remove());
  const title=`ESPN status: ${status.label}`;
  if(badge.className!=='hj-espn-status')badge.className='hj-espn-status';
  if(badge.textContent!==status.code)badge.textContent=status.code;
  if(badge.title!==title){badge.title=title;badge.setAttribute('aria-label',title)}
  if(badge.parentElement!==host)host.append(badge);
 });
}
