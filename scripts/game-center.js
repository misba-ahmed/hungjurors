/* Game Center (Nov 2, 2026). The NFL weekly schedule under the top carousel.
 *
 * - A week switcher (‹ Week n ›, a week menu and "This week") shows any week's games: past results, this week's
 *   live games, and the future schedule. The site's live data (NFL_WEEK1) stays this week's games; other weeks
 *   are loaded on their own and are not refreshed live.
 * - A game card opens a full game page in the same style as the player and manager profiles, with a section
 *   menu. Before kickoff: depth charts, matchup predictor, season leaders, odds and game environment, injury
 *   report, both teams' schedules. Once it starts: gamecast (score by quarter, situation, last play), play by
 *   play (scoring plays and every play, by drive, with fantasy points per play), box score, team stats, win
 *   probability, game leaders, and the rest. Live games refresh every 15 seconds while the page is open.
 * - Fantasy points are this league's scoring: per play from game-fantasy.js, and ESPN's league totals for the
 *   box score and leaders. Fantasy-relevant players (QB, RB, WR, TE, K and D/ST in ESPN's fantasy player pool)
 *   have an avatar, open their player profile, and show their manager or "FA".
 * Data: ESPN's public scoreboard, game summary, play-by-play, team schedule and depth chart feeds, and the
 * league's ESPN fantasy data. Nothing links away from the site.
 */
(function(){
 'use strict';
 if(typeof week1El==='undefined'||!week1El||typeof NFL_WEEK1==='undefined')return;
 const ESPN='https://site.api.espn.com/apis/site/v2/sports/football/nfl',CORE='https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
 const E=v=>esc(String(v??''));
 const POS={1:'QB',2:'RB',3:'WR',4:'TE',5:'K',16:'D/ST'};
 const keyOfId=new Map(Object.entries(NFL_TEAM_IDS).map(([k,v])=>[String(v),String(k).toLowerCase()]));
 const abbrOf=id=>pcTeam(String(keyOfId.get(String(id))||'').toUpperCase());
 const logoOf=id=>nflLogo(keyOfId.get(String(id))||'');
 const nameOf=id=>PC_TEAM_NAMES[abbrOf(id)]||abbrOf(id);
 const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
 const fp=v=>Number.isFinite(v)?v.toFixed(2):'—';
 const signed=v=>`${v>0?'+':v<0?'−':''}${Math.abs(v).toFixed(2)}`;
 const zone='America/Chicago';
 const dateFmt=(d,o)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,...o}).format(new Date(d));

 /* ---------- data ---------- */
 const cache=new Map();
 function getJson(url,ttl=0){
  const hit=cache.get(url);if(hit&&(hit.pending||(hit.value!==undefined&&Date.now()-hit.at<ttl)))return hit.pending||Promise.resolve(hit.value);
  const rec=hit||{};rec.pending=fetchEspnJson(url).then(v=>{rec.value=v;rec.at=Date.now();return v}).finally(()=>{rec.pending=null});cache.set(url,rec);return rec.pending;
 }
 const summaryUrl=id=>`${ESPN}/summary?event=${encodeURIComponent(id)}`;
 const playsUrl=(id,limit=400,page=1)=>`${CORE}/events/${id}/competitions/${id}/plays?limit=${limit}&page=${page}`;
 const scheduleUrl=teamId=>`${ESPN}/teams/${teamId}/schedule?season=${NFL_SEASON}&seasontype=2`;
 // Every fantasy-relevant player on both teams, with this league's points for the week and the season.
 async function fantasyPool(st){
  const key=`${st.week}|${st.teams.map(t=>t.id).join(',')}`;
  if(st.pool&&st.poolKey===key&&Date.now()-st.poolAt<(st.state==='in'?25000:300000))return st.pool;
  const entries=await pcEspnLeaguePlayersRequest(Number(NFL_SEASON),st.week,'kona_player_info',{filterProTeamIds:{value:st.teams.map(t=>Number(t.id))},limit:300,sortPercOwned:{sortPriority:1,sortAsc:false},filterStatsForTopScoringPeriodIds:{value:18,additionalValue:[`00${NFL_SEASON}`,`10${NFL_SEASON}`,`11${NFL_SEASON}${st.week}`]}}).catch(()=>[]);
  const pool=new Map();
  for(const e of entries){
   const p=e.player||{},pos=POS[p.defaultPositionId];if(!pos)continue;
   const stat=(src,period)=>(p.stats||[]).find(s=>Number(s.statSourceId)===src&&Number(s.scoringPeriodId)===period&&(Number(s.seasonId)||Number(NFL_SEASON))===Number(NFL_SEASON)&&(period?Number(s.statSplitTypeId)===1:true));
   const wk=stat(0,st.week),pj=stat(1,st.week),season=(p.stats||[]).find(s=>Number(s.statSourceId)===0&&Number(s.scoringPeriodId)===0&&Number(s.seasonId)===Number(NFL_SEASON));
   const id=String(p.id),teamId=pos==='D/ST'?String(-Number(p.id)-16000):String(p.proTeamId);
   pool.set(id,{id,name:p.fullName,pos,posId:p.defaultPositionId,teamId,team:abbrOf(teamId),week:wk?Number(wk.appliedTotal):null,weekStats:wk?.stats||null,proj:pj?Number(pj.appliedTotal):null,season:season?Number(season.appliedTotal):null});
  }
  if(pool.size){st.pool=pool;st.poolKey=key;st.poolAt=Date.now()}
  return st.pool||pool;
 }
 const dstId=teamId=>String(-16000-Number(teamId));
 function poolPlayer(st,id){return st.pool?.get(String(id))||null}
 async function corePlays(st,full){
  const id=st.eventId;
  if(full||!st.plays){const d=await getJson(playsUrl(id),0),items=[...(d.items||[])];
   // A game has about 200-300 plays; read further pages if the feed ever splits them.
   for(let page=2;page<=Math.min(Number(d.pageCount)||1,5);page++){const n=await getJson(playsUrl(id,400,page),0);items.push(...(n.items||[]))}
   st.plays=new Map(items.map(p=>[String(p.id),p]));st.playCount=Number(d.count)||st.plays.size;st.playsAt=Date.now();return st.plays}
  // Live: the newest page only; a full reload every two minutes picks up corrections.
  if(Date.now()-st.playsAt>120000)return corePlays(st,true);
  const page=Math.max(1,Math.ceil((st.playCount||1)/50)),d=await getJson(playsUrl(id,50,page),0);
  for(const p of d.items||[])st.plays.set(String(p.id),p);st.playCount=Math.max(st.playCount,Number(d.count)||0);
  if(Number(d.pageCount)>page){const n=await getJson(playsUrl(id,50,page+1),0);for(const p of n.items||[])st.plays.set(String(p.id),p)}
  return st.plays;
 }
 function playFantasy(st,playId){
  const play=st.plays?.get(String(playId));if(!play||!window.hjGameFantasy)return null;
  if(!st.fpCache)st.fpCache=new Map();const key=`${playId}|${play.modified||''}|${st.pool?.size||0}`;
  if(st.fpCache.has(key))return st.fpCache.get(key);
  const r=window.hjGameFantasy.playPoints(play,{pos:id=>{const p=poolPlayer(st,id);return p&&p.posId<=5?p.posId:0},teams:st.teams.map(t=>t.id)});
  st.fpCache.set(key,r);return r;
 }

 /* ---------- small pieces ---------- */
 function avatar(p,cls='gc-av'){
  if(p.pos==='D/ST')return `<span class="${cls} is-logo"><img src="${E(logoOf(p.teamId))}" alt="" loading="lazy"></span>`;
  return `<span class="${cls}"><span class="gc-av-initials">${E(ffnInitials(p.name))}</span><img src="${E(nflHeadshot(p.id))}" alt="" loading="lazy" onerror="this.remove()"></span>`;
 }
 // A name whose last word is kept together with what follows it (the site's injury badge is placed inside the
 // first <b> of a player link): long names wrap between words, never cut off, and the badge never sits alone.
 function nameHTML(name){const parts=String(name||'').trim().split(/\s+/),last=parts.pop()||'';return `${parts.length?`${E(parts.join(' '))} `:''}<b class="gc-last">${E(last)}</b>`}
 // Ownership by ESPN player id only. (The shared helper falls back to the name when an id is not on a roster,
 // which would hand a rostered player's manager to a different player with the same name.)
 function ownership(p){
  const id=String(p?.id||''),byId=typeof HJ_PLAYER_DIRECTORY!=='undefined'?HJ_PLAYER_DIRECTORY.ownershipById:null;
  if(/^-?\d+$/.test(id)&&byId instanceof Map)return byId.get(id)||{owned:false};
  return typeof hjOwnershipForPlayerLike==='function'?hjOwnershipForPlayerLike({id:p?.id,name:p?.name,team:p?.team,position:p?.pos}):null;
 }
 function owner(p){
  const own=ownership(p);
  return own?.owned?`<span class="gc-owner">${av(own.owner,'gc-mav')}<span>${E(own.owner)}</span></span>`:'<span class="gc-owner is-fa">FA</span>';
 }
 function fpChip(v,label=''){if(!Number.isFinite(v))return '';return `<span class="gc-fp${v>0?' is-pos':v<0?' is-neg':''}"${label?` title="${E(label)}"`:''}>${signed(v)}</span>`}
 const attrs=p=>ffnPlayerDataAttrs({id:p.id,name:p.name,team:p.team,position:p.pos,photo:p.pos==='D/ST'?logoOf(p.teamId):nflHeadshot(p.id)});
 // A fantasy-relevant player: avatar, name (opens the profile), manager. Anyone else: the name only.
 function who(st,id,name,{sub='',fpts=null,compact=false,showOwner=true}={}){
  const p=poolPlayer(st,id);
  if(!p)return `<span class="gc-plain">${E(name||'—')}${sub?`<small>${E(sub)}</small>`:''}</span>`;
  return `<button type="button" class="gc-who pc-player-trigger${compact?' is-compact':''}" ${attrs(p)} aria-label="Open ${E(p.name)} profile">${avatar(p)}<span class="gc-who-copy"><span class="gc-who-name"><span class="gc-who-n">${nameHTML(name||p.name)}</span>${fpts!==null?fpChip(fpts):''}</span>${sub||showOwner?`<small>${sub?`<span>${E(sub)}</span>`:''}${showOwner?owner(p):''}</small>`:''}</span></button>`;
 }
 // Owner line for play chips: manager avatar and name, as everywhere else; nothing for a free agent.
 function ownerChip(p){
  if(!p)return '';
  const own=ownership(p);
  return own?.owned?`<span class="gc-owner is-mini">${av(own.owner,'gc-mav')}<span>${E(own.owner)}</span></span>`:'';
 }
 // Manager name only (the depth-chart style, no avatar), where a cell has no room for more: schedules.
 function ownerName(p){
  if(!p)return '';
  const own=ownership(p);
  return own?.owned?`<small class="gc-own">${E(own.owner)}</small>`:'';
 }
 // Green at or above the projection, orange within 70% of it, red below.
 const perf=(v,proj)=>Number.isFinite(v)&&Number.isFinite(proj)&&(proj>0||v!==0)&&typeof hjPerformanceAttrs==='function'?hjPerformanceAttrs(v,proj):'';
 function section(key,title,body,note=''){
  return body?`<section class="pc-section gc-section" data-gc-section="${key}"><div class="pc-section-head"><h3 class="pc-section-title">${E(title)}</h3>${note?`<span class="pc-section-note">${note}</span>`:''}</div>${body}</section>`:'';
 }
 const teamLabel=t=>`<span class="gc-team-tag"><img src="${E(logoOf(t.id))}" alt="" loading="lazy">${E(t.abbr)}</span>`;
 function toggle(st,name,options,value){
  return `<div class="gc-toggle" role="tablist">${options.map(([v,label])=>`<button type="button" role="tab" data-gc-ui="${name}" data-gc-value="${E(v)}" class="${String(v)===String(value)?'is-active':''}" aria-selected="${String(v)===String(value)}">${label}</button>`).join('')}</div>`;
 }

 /* ---------- header ---------- */
 function comp(st){return st.summary?.header?.competitions?.[0]||null}
 function side(st,homeAway){return comp(st)?.competitors?.find(c=>c.homeAway===homeAway)||null}
 function stateOf(st){return comp(st)?.status?.type?.state||st.game?.state||'pre'}
 function statusLine(st){
  const c=comp(st),s=c?.status,t=s?.type||{},state=stateOf(st);
  if(state==='in'){const q=Number(s?.period)||0,label=/half/i.test(t.description||'')?'Halftime':`${q>4?(q===5?'OT':`${q-4}OT`):`Q${q}`} · ${s?.displayClock||''}`;return `<span class="gc-live-pill">Live</span><b>${E(label)}</b>`}
  if(state==='post')return `<b>${E(t.shortDetail||'Final')}</b>`;
  const when=c?.date||st.game?.kickoff;return when?`<b>${E(dateFmt(when,{hour:'numeric',minute:'2-digit'}))}</b><small>${E(dateFmt(when,{weekday:'short',month:'short',day:'numeric'}))}</small>`:'';
 }
 function headerHTML(st){
  const c=comp(st),state=stateOf(st),show=state!=='pre';
  const team=(t,ha)=>{const s=side(st,ha),record=(s?.record||[]).find(r=>r.type==='total')?.summary||(ha==='away'?st.game?.aRecord:st.game?.bRecord)||'',score=s?.score??(ha==='away'?st.game?.aScore:st.game?.bScore),win=state==='post'&&s?.winner;
   return `<div class="gc-hteam is-${ha}${win?' is-winner':''}${s?.possession&&state==='in'?' has-ball':''}"><img src="${E(logoOf(t.id))}" alt=""><span class="gc-hteam-copy"><b>${E(t.abbr)}</b><small>${E(record)}</small></span>${show?`<span class="gc-hscore">${E(score??'0')}</span>`:''}</div>`};
  const tv=c?.broadcasts?.map(b=>b?.media?.shortName).filter(Boolean)[0]||st.game?.net||'',venue=st.summary?.gameInfo?.venue,where=[venue?.fullName||st.game?.venue,venue?.address?.city].filter(Boolean).join(' · ');
  return `<div class="gc-board"><div class="gc-kicker">Week ${E(st.week)}${tv?` · ${E(tv)}`:''}</div><div class="gc-line">${team(st.teams[0],'away')}<div class="gc-hstatus">${statusLine(st)}</div>${team(st.teams[1],'home')}</div>${where?`<div class="gc-where">${E(where)}</div>`:''}</div>`;
 }

 /* ---------- gamecast ---------- */
 function linescore(st){
  const rows=st.teams.map((t,i)=>{const s=side(st,i?'home':'away'),ls=s?.linescores||[];return {t,ls:ls.map(l=>l.displayValue??l.value),score:s?.score}});
  const n=Math.max(4,...rows.map(r=>r.ls.length));if(!rows.some(r=>r.ls.length))return '';
  return `<div class="gc-table-wrap"><table class="gc-table gc-linescore"><thead><tr><th></th>${Array.from({length:n},(_,i)=>`<th>${i<4?i+1:i===4?'OT':`${i-3}OT`}</th>`).join('')}<th>T</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${teamLabel(r.t)}</th>${Array.from({length:n},(_,i)=>`<td>${E(r.ls[i]??'—')}</td>`).join('')}<td class="gc-total">${E(r.score??'0')}</td></tr>`).join('')}</tbody></table></div>`;
 }
 function lastPlay(st){
  const cur=st.summary?.drives?.current,plays=cur?.plays||st.summary?.drives?.previous?.at(-1)?.plays||[];return {drive:cur,play:plays.at(-1)};
 }
 function playChips(st,playId){
  const r=playFantasy(st,playId);if(!r)return '';
  const items=[...r.players.map(x=>({p:poolPlayer(st,x.id),pts:x.pts,label:x.parts.join(', ')})),...Object.entries(r.dst).map(([team,x])=>({p:poolPlayer(st,dstId(team)),pts:x.pts,label:x.parts.join(', ')}))].filter(x=>x.p&&x.pts);
  return items.length?`<div class="gc-chips">${items.map(x=>`<button type="button" class="gc-chip pc-player-trigger" ${attrs(x.p)} title="${E(x.label)}">${avatar(x.p,'gc-av is-mini')}<span class="gc-chip-copy"><b class="gc-chip-n">${E(x.p.pos==='D/ST'?`${x.p.team} D/ST`:shortName(x.p.name))}</b>${ownerChip(x.p)}</span>${fpChip(x.pts)}</button>`).join('')}</div>`:'';
 }
 const shortName=n=>{const parts=String(n||'').split(' ');return parts.length>1?`${parts[0][0]}. ${parts.slice(1).join(' ')}`:n};
 function topFantasy(st,limit=6){
  return [...(st.pool?.values()||[])].filter(p=>Number.isFinite(p.week)&&(p.week!==0||p.pos==='D/ST')).sort((a,b)=>b.week-a.week).slice(0,limit);
 }
 function gamecastHTML(st){
  const state=stateOf(st);if(state==='pre')return '';
  let html=linescore(st);
  if(state==='in'){
   const {drive,play}=lastPlay(st),ball=st.teams.find(t=>String(t.id)===String(drive?.team?.id))||null,dd=play?.end?.downDistanceText||play?.start?.downDistanceText||'';
   html+=`<div class="gc-situation">${ball?`<span class="gc-ball">${teamLabel(ball)}<small>ball</small></span>`:''}${dd?`<b>${E(dd)}</b>`:''}${drive?.description?`<small>${E(drive.description)}</small>`:''}</div>`;
   if(play)html+=`<div class="gc-lastplay"><span class="gc-eyebrow">Last play · ${E(play.clock?.displayValue||'')}</span><p>${E(play.text||'')}</p>${playChips(st,play.id)}</div>`;
  }
  const stars=topFantasy(st);
  if(stars.length)html+=`<div class="gc-stars"><span class="gc-eyebrow">${state==='post'?'Fantasy stars':'Fantasy points so far'}</span><div class="gc-stars-grid">${stars.map(p=>who(st,p.id,p.name,{fpts:p.week,sub:`${p.team} ${p.pos}`})).join('')}</div></div>`;
  return section('gamecast','Gamecast',html,state==='in'?'<span class="gc-dot"></span>Live':'');
 }

 /* ---------- play by play ---------- */
 function scoringHTML(st){
  const list=st.summary?.scoringPlays||[];if(!list.length)return '<p class="gc-empty">No scoring plays yet.</p>';
  const byQ=new Map();list.forEach(p=>{const q=Number(p.period?.number)||0;if(!byQ.has(q))byQ.set(q,[]);byQ.get(q).push(p)});
  return [...byQ].map(([q,plays])=>`<div class="gc-quarter"><h4>${q>4?'Overtime':`${['','1st','2nd','3rd','4th'][q]} quarter`}</h4>${plays.map(p=>{const t=st.teams.find(x=>String(x.id)===String(p.team?.id));return `<article class="gc-score-play"><img class="gc-sp-logo" src="${E(logoOf(p.team?.id))}" alt=""><div class="gc-sp-main"><div class="gc-sp-top"><b>${E(p.type?.abbreviation||p.type?.text||'')}</b><span>${E(p.clock?.displayValue||'')}</span></div><p>${E(p.text||'')}</p>${playChips(st,p.id)}</div><div class="gc-sp-score"><span>${E(st.teams[0].abbr)} <b>${E(p.awayScore)}</b></span><span>${E(st.teams[1].abbr)} <b>${E(p.homeScore)}</b></span></div></article>`}).join('')}</div>`).join('');
 }
 function driveHTML(st,d,isCurrent){
  const t=st.teams.find(x=>String(x.id)===String(d.team?.id))||{id:d.team?.id,abbr:d.team?.abbreviation||''};
  const open=isCurrent||st.ui.openDrives.has(String(d.id));
  const plays=(d.plays||[]).slice().reverse();
  const res=isCurrent?'Current drive':(d.displayResult||d.result||'');
  return `<details class="gc-drive${d.isScore?' is-score':''}${isCurrent?' is-current':''}" data-gc-drive="${E(d.id)}"${open?' open':''}><summary><img src="${E(logoOf(t.id))}" alt=""><span class="gc-drive-copy"><b>${E(res)}</b><small>${E(d.description||'')}${d.start?.period?.number?` · Q${E(d.start.period.number)} ${E(d.start?.clock?.displayValue||'')}`:''}</small></span><span class="gc-drive-score">${E(st.teams[0].abbr)} ${E(d.plays?.at(-1)?.awayScore??'')} · ${E(st.teams[1].abbr)} ${E(d.plays?.at(-1)?.homeScore??'')}</span></summary><ol class="gc-plays">${plays.map(p=>`<li class="gc-play${p.scoringPlay?' is-score':''}"><div class="gc-play-meta"><span>${E(p.start?.downDistanceText||p.type?.text||'')}</span><span>Q${E(p.period?.number||'')} ${E(p.clock?.displayValue||'')}</span></div><p>${E(p.text||'')}</p>${playChips(st,p.id)}</li>`).join('')}</ol></details>`;
 }
 function allPlaysHTML(st){
  const d=st.summary?.drives;if(!d)return '<p class="gc-empty">Plays will appear once the game starts.</p>';
  const prev=(d.previous||[]).slice().reverse();const cur=d.current&&!prev.some(x=>String(x.id)===String(d.current.id))?d.current:null;
  return `${cur?driveHTML(st,cur,true):''}${prev.map(x=>driveHTML(st,x,false)).join('')}`;
 }
 function playsHTML(st){
  if(stateOf(st)==='pre')return '';
  const tab=st.ui.plays||'scoring';
  return section('plays','Play by play',`${toggle(st,'plays',[['scoring','Scoring plays'],['all','All plays']],tab)}<div class="gc-plays-body">${tab==='all'?allPlaysHTML(st):scoringHTML(st)}</div><p class="gc-footnote">Fantasy points per play in league scoring. D/ST points allowed and yards allowed count at the end of the game; the box score has every player's official total.</p>`);
 }

 /* ---------- box score ---------- */
 const BOX_ORDER=[['passing','Passing'],['rushing','Rushing'],['receiving','Receiving'],['kicking','Kicking'],['defensive','Defense'],['fumbles','Fumbles'],['interceptions','Interceptions'],['kickReturns','Kick returns'],['puntReturns','Punt returns'],['punting','Punting']];
 // Fantasy points sit first, in the tables where fantasy players score; everywhere else names are plain.
 const FP_CATS=new Set(['passing','rushing','receiving','kicking']);
 function fptsCell(p){
  if(!p)return '<td class="gc-fpcell"></td>';
  return `<td class="gc-fpcell"><b ${perf(p.week,p.proj)}>${fp(p.week)}</b>${Number.isFinite(p.proj)?`<i>${fp(p.proj)}</i>`:''}</td>`;
 }
 function boxName(st,id,name,fantasy){
  const p=fantasy?poolPlayer(st,id):null;
  if(!p)return `<span class="gc-box-plain">${E(name||'—')}</span>`;
  return who(st,id,name||p.name,{compact:true,sub:p.pos});
 }
 function boxHTML(st){
  if(stateOf(st)==='pre')return '';
  const teams=st.summary?.boxscore?.players||[];if(!teams.length)return '';
  const which=st.ui.box||'away',t=st.teams[which==='home'?1:0],data=teams.find(x=>String(x.team?.id)===String(t.id));if(!data)return '';
  const dst=poolPlayer(st,dstId(t.id));
  const cats=BOX_ORDER.map(([key,label])=>{
   const c=(data.statistics||[]).find(s=>s.name===key);if(!c||!(c.athletes||[]).length)return '';
   const withFp=FP_CATS.has(key)||(key==='defensive'&&dst),labels=(c.labels||[]).map(l=>`<th>${E(l)}</th>`).join('');
   const rows=c.athletes.map(a=>`<tr><th>${boxName(st,a.athlete?.id,a.athlete?.displayName,FP_CATS.has(key))}</th>${withFp?(FP_CATS.has(key)?fptsCell(poolPlayer(st,a.athlete?.id)):'<td class="gc-fpcell"></td>'):''}${(a.stats||[]).map(v=>`<td>${E(v)}</td>`).join('')}</tr>`).join('');
   const totals=(c.totals||[]).length?c.totals.map(v=>`<td>${E(v)}</td>`).join(''):(c.labels||[]).map(()=>'<td></td>').join('');
   // Defense: the team row is the D/ST, with its fantasy points.
   const teamRow=key==='defensive'&&dst?`<tr class="gc-totals is-dst"><th>${boxName(st,dst.id,`${titleCase(PC_TEAM_NAMES[t.abbr]||t.abbr)} D/ST`,true)}</th>${fptsCell(dst)}${totals}</tr>`:(c.totals||[]).length?`<tr class="gc-totals"><th>Team</th>${withFp?'<td class="gc-fpcell"></td>':''}${totals}</tr>`:'';
   return `<div class="gc-box-block"><h4>${E(label)}</h4><div class="gc-table-wrap"><table class="gc-table gc-box${withFp?' has-fp':''}"><thead><tr><th>${E(label)}</th>${withFp?'<th class="gc-fpcell">FPTS</th>':''}${labels}</tr></thead><tbody>${key==='defensive'?teamRow+rows:rows+teamRow}</tbody></table></div></div>`}).join('');
  return section('box','Box score',`<div class="gc-sticky-switch">${toggle(st,'box',[['away',teamLabel(st.teams[0])],['home',teamLabel(st.teams[1])]],which)}</div>${cats}`);
 }

 /* ---------- team stats ---------- */
 const SUB=new Set(['firstDownsPassing','firstDownsRushing','firstDownsPenalty','thirdDownEff','fourthDownEff','completionAttempts','yardsPerPass','interceptions','sacksYardsLost','rushingAttempts','yardsPerRushAttempt','fumblesLost']);
 function statValue(name,v){const s=String(v??'');if(name==='possessionTime'){const [m,sec]=s.split(':').map(Number);return m*60+(sec||0)}if(/Eff$|redZone/.test(name)){const [a,b]=s.split('-').map(Number);return b?a/b:0}if(/-/.test(s))return num(s.split('-')[0]);return num(s)}
 function teamStatsHTML(st){
  if(stateOf(st)==='pre')return '';
  const teams=st.summary?.boxscore?.teams||[];if(teams.length<2)return '';
  const a=teams.find(x=>String(x.team?.id)===String(st.teams[0].id))||teams[0],h=teams.find(x=>x!==a);
  const rows=(a.statistics||[]).map((s,i)=>{const hs=(h.statistics||[]).find(x=>x.name===s.name&&x.label===s.label)||h.statistics?.[i]||{};
   const av=statValue(s.name,s.displayValue),hv=statValue(s.name,hs.displayValue),lowBetter=/turnovers|fumblesLost|interceptions|Penalt|sacksYardsLost/i.test(s.name),sum=(av||0)+(hv||0);
   const aw=sum?Math.round(100*(av||0)/sum):50;const lead=av===hv||av===null||hv===null?'':(av>hv)!==lowBetter?'away':'home';
   return `<div class="gc-ts-row${SUB.has(s.name)?' is-sub':''}"><span class="gc-ts-v${lead==='away'?' is-lead':''}">${E(s.displayValue)}</span><span class="gc-ts-label">${E(s.label)}</span><span class="gc-ts-v is-home${lead==='home'?' is-lead':''}">${E(hs.displayValue??'')}</span>${SUB.has(s.name)?'':`<span class="gc-ts-bar"><i style="width:${aw}%"></i><i style="width:${100-aw}%"></i></span>`}</div>`}).join('');
  return section('stats','Team stats',`<div class="gc-ts-head">${teamLabel(st.teams[0])}<span></span>${teamLabel(st.teams[1])}</div><div class="gc-ts">${rows}</div>`);
 }

 /* ---------- predictor / win probability ---------- */
 // Team colors for charts; when both teams' main colors look alike (Bears and Seahawks navy), the away team
 // uses its second color so the two sides stay distinguishable.
 const rgb=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(String(h||''));if(!m)return null;const n=parseInt(m[1],16);return [n>>16,(n>>8)&255,n&255]};
 const dist=(a,b)=>a&&b?Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]):999;
 function teamColor(st,i){
  const a=side(st,'away')?.team,h=side(st,'home')?.team,fallback=i?'#14324F':'#B98A2E';
  if(i)return h?.color?`#${h.color}`:fallback;
  if(!a?.color)return fallback;
  const pa=rgb(a.color),ph=rgb(h?.color),alt=rgb(a.alternateColor);
  if(dist(pa,ph)<110&&alt&&dist(alt,ph)>dist(pa,ph)&&dist(alt,[255,255,255])>60)return `#${a.alternateColor}`;
  return `#${a.color}`;
 }
 function donut(st,awayPct,homePct){
  const r=54,c=2*Math.PI*r,a=Math.max(0,Math.min(100,awayPct)),ac=teamColor(st,0),hc=teamColor(st,1);
  return `<svg class="gc-donut" viewBox="0 0 140 140" aria-hidden="true"><defs><pattern id="gc-hatch" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#fff"/><line x1="0" y1="0" x2="0" y2="5" stroke="${E(ac)}" stroke-width="2.4"/></pattern></defs><circle cx="70" cy="70" r="${r}" fill="none" stroke="url(#gc-hatch)" stroke-width="16"/><circle cx="70" cy="70" r="${r}" fill="none" stroke="${E(hc)}" stroke-width="16" stroke-dasharray="${(c*homePct/100).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 70 70)"/><line x1="70" y1="30" x2="70" y2="110" stroke="#cfd6dc" stroke-dasharray="2 3"/></svg><img class="gc-donut-logo is-away" src="${E(logoOf(st.teams[0].id))}" alt=""><img class="gc-donut-logo is-home" src="${E(logoOf(st.teams[1].id))}" alt="">`;
 }
 // Home team's chance on top, away team's at the bottom; dashed lines mark the start of each quarter.
 function wpChart(st){
  const wp=st.summary?.winprobability||[];if(wp.length<2)return '';
  const period=new Map();for(const d of [...(st.summary?.drives?.previous||[]),st.summary?.drives?.current].filter(Boolean))for(const p of d.plays||[])period.set(String(p.id),Number(p.period?.number)||0);
  const w=320,h=120,x=i=>(i/(wp.length-1)*w).toFixed(1),pts=wp.map((p,i)=>`${x(i)},${((1-Number(p.homeWinPercentage))*h).toFixed(1)}`).join(' ');
  const marks=[];let q=1;wp.forEach((p,i)=>{const n=period.get(String(p.playId));if(n>q){q=n;marks.push([i,n])}});
  const qLabel=n=>n>4?'OT':`Q${n}`;
  return `<div class="gc-wp"><div class="gc-wp-y"><span>${teamLabel(st.teams[1])}<small>100%</small></span><span><small>50%</small></span><span>${teamLabel(st.teams[0])}<small>100%</small></span></div><div class="gc-wp-plot"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Win probability through the game"><line x1="0" y1="${h/2}" x2="${w}" y2="${h/2}" class="gc-wp-mid"/>${marks.map(([i])=>`<line x1="${x(i)}" y1="0" x2="${x(i)}" y2="${h}" class="gc-wp-q"/>`).join('')}<polyline points="${pts}" class="gc-wp-line"/></svg><div class="gc-wp-x"><span style="left:0">Q1</span>${marks.map(([i,n])=>`<span style="left:${(i/(wp.length-1)*100).toFixed(2)}%">${qLabel(n)}</span>`).join('')}</div></div></div>`;
 }
 function predictorHTML(st){
  const state=stateOf(st),pred=st.summary?.predictor;let away=null,home=null,title='Matchup predictor';
  if(state==='pre'&&pred){home=num(pred.homeTeam?.gameProjection);away=num(pred.awayTeam?.gameProjection)??(home!==null?100-home:null)}
  else{const last=(st.summary?.winprobability||[]).at(-1);if(last){home=100*Number(last.homeWinPercentage);away=100-home-100*Number(last.tiePercentage||0)}title='Win probability'}
  if(home===null||away===null)return '';
  const body=`<div class="gc-pred"><div class="gc-pred-side"><b>${away.toFixed(1)}%</b>${teamLabel(st.teams[0])}</div><div class="gc-pred-ring">${donut(st,away,home)}</div><div class="gc-pred-side is-home"><b>${home.toFixed(1)}%</b>${teamLabel(st.teams[1])}</div></div>${state==='pre'?'':wpChart(st)}`;
  return section('predictor',title,body,state==='pre'?'Chance to win':'');
 }

 /* ---------- leaders ---------- */
 const LEAD_ORDER=[['passingYards','Passing yards'],['rushingYards','Rushing yards'],['receivingYards','Receiving yards'],['sacks','Sacks'],['totalTackles','Tackles']];
 function leadersHTML(st){
  const L=st.summary?.leaders||[];if(!L.length)return '';const state=stateOf(st);
  const get=(t,name)=>L.find(x=>String(x.team?.id)===String(t.id))?.leaders?.find(c=>c.name===name)?.leaders?.[0]||null;
  const cell=(x,ha)=>{if(!x)return `<div class="gc-lead-cell is-${ha}">—</div>`;const a=x.athlete||{},p=poolPlayer(st,a.id),pts=p?(state==='pre'?p.season:p.week):null;
   const face=p?`<button type="button" class="gc-lead-face" data-gc-open aria-label="Open ${E(p.name)} profile">${avatar(p,'gc-av is-big')}</button>`:`<span class="gc-av is-big"><span class="gc-av-initials">${E(ffnInitials(a.displayName||''))}</span>${a.headshot?.href?`<img src="${E(a.headshot.href)}" alt="" loading="lazy" onerror="this.remove()">`:''}</span>`;
   return `<div class="gc-lead-cell is-${ha}">${face}<div class="gc-lead-copy"><b class="gc-lead-value">${E(x.mainStat?.value??x.displayValue)}</b><span class="gc-lead-name">${p?`<button type="button" class="gc-linkish pc-player-trigger" ${attrs(p)}>${E(a.shortName||a.displayName)}</button>`:E(a.shortName||a.displayName)} <small>${E(a.position?.abbreviation||'')}</small></span><small class="gc-lead-sub">${E(x.summary||'')}</small>${p?`<span class="gc-lead-fp">${owner(p)}${Number.isFinite(pts)?`<span class="gc-fp is-flat">${fp(pts)} FPTS</span>`:''}</span>`:''}</div></div>`};
  const rows=LEAD_ORDER.map(([k,label])=>{const a=get(st.teams[0],k),h=get(st.teams[1],k);if(!a&&!h)return '';return `<div class="gc-lead-row">${cell(a,'away')}<span class="gc-lead-label">${E(label)}</span>${cell(h,'home')}</div>`}).join('');
  return section('leaders',state==='pre'?'Season leaders':'Game leaders',`<div class="gc-lead-head">${teamLabel(st.teams[0])}${teamLabel(st.teams[1])}</div>${rows}`);
 }

 /* ---------- odds and game environment ---------- */
 const odds=v=>{const n=num(v);return n===null?String(v||'—'):n>0?`+${n}`:String(n)};
 const line=v=>{const n=num(v);return n===null?'—':n===0?'PK':`${n>0?'+':''}${n}`};
 const minus=s=>String(s).replace(/^-/,'−');
 // Chance to win implied by the two moneylines, with the bookmaker's margin taken out.
 const mlChance=ml=>{const n=num(ml);return n===null?null:n<0?-n/(-n+100):100/(n+100)};
 const ICON={
  clock:'<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="8"/>',
  stadium:'<path d="M3 10c0-2 4-4 9-4s9 2 9 4v6c0 2-4 4-9 4s-9-2-9-4z"/><path d="M3 10c0 2 4 4 9 4s9-2 9-4"/>',
  temp:'<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z"/>',
  wind:'<path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 15h15a3 3 0 1 1-3 3"/>',
  roof:'<path d="M3 11l9-6 9 6"/><path d="M5 10v9h14v-9"/>',
  flame:'<path d="M12 3c1 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
  script:'<path d="M4 18l5-6 4 3 7-9"/><path d="M15 6h5v5"/>',
  rest:'<path d="M4 18V8"/><path d="M4 14h16v4"/><path d="M4 11h7a3 3 0 0 1 3 3"/>',
  home:'<path d="M4 11l8-6 8 6v8h-5v-5H9v5H4z"/>',
  crowd:'<circle cx="8" cy="9" r="2.5"/><circle cx="16" cy="9" r="2.5"/><path d="M3 19c0-3 2-5 5-5s5 2 5 5"/><path d="M11 19c0-3 2-5 5-5s5 2 5 5"/>'
 };
 const icon=k=>`<svg class="gc-ico" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]||''}</svg>`;
 function moveNote(text,dir){return text?`<div class="gc-move${dir?` is-${dir}`:''}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 12l4-4 3 3 5-6"/><path d="M10 5h4v4"/></svg><span>${text}</span></div>`:''}
 function restDays(st,teamId){
  const data=st.schedules?.[teamId],kick=new Date(comp(st)?.date||st.game?.kickoff||0).getTime();if(!data||!Number.isFinite(kick))return null;
  const prev=(data.events||[]).filter(e=>new Date(e.date).getTime()<kick-6*3600000).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
  if(!prev)return {days:null,first:true};
  const days=Math.round((kick-new Date(prev.date).getTime())/86400000),thisWeek=Number(st.week)||0,prevWeek=Number(prev.week?.number)||0;
  return {days,bye:thisWeek-prevWeek>1};
 }
 function oddsHTML(st){
  const pc=(st.summary?.pickcenter||[])[0],state=stateOf(st),gi=st.summary?.gameInfo||{},venue=gi.venue||{},weather=gi.weather;
  const [A,H]=st.teams,homeSpread=num(pc?.spread),total=num(pc?.overUnder),imp=homeSpread!==null&&total!==null?{away:total/2+homeSpread/2,home:total/2-homeSpread/2}:null;
  const fav=homeSpread===null?null:homeSpread<0?1:homeSpread>0?0:null;
  const parts=[];let pa=null,ph=null;
  if(pc){
   const ps=pc.pointSpread||{},tt=pc.total||{},ml=pc.moneyline||{};
   // Spread
   const spreadRow=(i)=>{const t=st.teams[i],v=i?homeSpread:-homeSpread,price=i?pc.homeTeamOdds?.spreadOdds:pc.awayTeamOdds?.spreadOdds;return `<div class="gc-line-row${fav===i?' is-fav':''}">${teamLabel(t)}<b>${minus(line(v))}</b><small>${price!=null?minus(odds(price)):''}</small></div>`};
   const openHome=num(ps.home?.open?.line);let spreadMove='';
   if(openHome!==null&&homeSpread!==null&&openHome!==homeSpread){const d=homeSpread-openHome,toward=d>0?A:H,openFav=openHome<0?H:openHome>0?A:null;
    spreadMove=moveNote(`Opened ${openFav?`${E(openFav.abbr)} ${minus(line(openFav===H?openHome:-openHome))}`:'pick ’em'} · moved ${Math.abs(d)} toward ${E(toward.abbr)}`,'')}
   const spreadCard=`<div class="gc-line-card"><div class="gc-line-head"><span class="gc-eyebrow">Spread</span>${fav!==null?`<span class="gc-line-tag">${E(st.teams[fav].abbr)} favored by ${Math.abs(homeSpread)}</span>`:'<span class="gc-line-tag">Pick ’em</span>'}</div>${spreadRow(0)}${spreadRow(1)}${spreadMove||moveNote('No movement since the open','flat')}</div>`;
   // Total, on a 36-56 scale with this site's scoring bands
   const openTotal=num(String(tt.over?.open?.line||'').replace(/^o/,'')),lo=36,hi=56,pos=v=>Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100));
   const band=total===null?'':total>=49?'High':total>=45?'Good':total>=41?'Neutral':'Low';
   const gauge=total===null?'':`<div class="gc-gauge" aria-label="Total ${total} on a ${lo} to ${hi} point scale"><div class="gc-gauge-track"><i class="is-low" style="width:${pos(41)}%"></i><i class="is-neutral" style="width:${pos(45)-pos(41)}%"></i><i class="is-good" style="width:${pos(49)-pos(45)}%"></i><i class="is-high" style="width:${100-pos(49)}%"></i></div>${openTotal!==null&&openTotal!==total?`<span class="gc-gauge-mark is-open" style="left:${pos(openTotal)}%" title="Opened ${openTotal}"></span>`:''}<span class="gc-gauge-mark" style="left:${pos(total)}%"></span><div class="gc-gauge-scale"><span>Low</span><span>Neutral</span><span>Good</span><span>High</span></div></div>`;
   const totalMove=openTotal!==null&&total!==null&&openTotal!==total?moveNote(`Opened ${openTotal} · ${total>openTotal?'up':'down'} ${Math.abs(total-openTotal)}`,total>openTotal?'up':'down'):moveNote('No movement since the open','flat');
   const totalCard=`<div class="gc-line-card"><div class="gc-line-head"><span class="gc-eyebrow">Total</span>${band?`<span class="gc-line-tag is-${band.toLowerCase()}">${band} scoring</span>`:''}</div><div class="gc-total-big">${E(total??'—')}<small>points</small></div><div class="gc-ou"><span>Over <b>${minus(odds(pc.overOdds))}</b></span><span>Under <b>${minus(odds(pc.underOdds))}</b></span></div>${gauge}${totalMove}</div>`;
   // Moneyline with each side's chance to win
   const mlA=pc.awayTeamOdds?.moneyLine??ml.away?.close?.odds,mlH=pc.homeTeamOdds?.moneyLine??ml.home?.close?.odds,ca=mlChance(mlA),ch=mlChance(mlH),sum=(ca||0)+(ch||0);
   pa=sum?ca/sum*100:null;ph=sum?ch/sum*100:null;
   const mlRow=i=>`<div class="gc-line-row${(i?ph:pa)>50?' is-fav':''}">${teamLabel(st.teams[i])}<b>${minus(odds(i?mlH:mlA))}</b><small>${pa!==null?`${(i?ph:pa).toFixed(0)}% to win`:''}</small></div>`;
   const split=pa!==null?`<div class="gc-split" aria-hidden="true"><i style="width:${pa.toFixed(1)}%;background:${E(teamColor(st,0))}"></i><i style="width:${ph.toFixed(1)}%;background:${E(teamColor(st,1))}"></i></div>`:'';
   const mlMove=ml.away?.open?.odds&&ml.home?.open?.odds&&(String(ml.away.open.odds)!==String(odds(mlA))||String(ml.home.open.odds)!==String(odds(mlH)))?moveNote(`Opened ${E(A.abbr)} ${minus(ml.away.open.odds)} · ${E(H.abbr)} ${minus(ml.home.open.odds)}`,''):moveNote('No movement since the open','flat');
   const mlCard=`<div class="gc-line-card"><div class="gc-line-head"><span class="gc-eyebrow">Moneyline</span><span class="gc-line-tag">To win outright</span></div>${mlRow(0)}${mlRow(1)}${split}${mlMove}</div>`;
   parts.push(`<div class="gc-lines">${spreadCard}${totalCard}${mlCard}</div>`);
  }else parts.push('<p class="gc-empty">Betting lines are not posted yet.</p>');
  // After the game: how the lines finished.
  if(state==='post'&&pc){const as=num(side(st,'away')?.score),hs=num(side(st,'home')?.score);if(as!==null&&hs!==null){
   const res=[];
   if(homeSpread!==null){const m=hs-as+homeSpread;res.push(m===0?['Spread','Push',`${H.abbr} ${minus(line(homeSpread))}, won by ${Math.abs(hs-as)}`]:[`Spread`,`${(m>0?H:A).abbr} covered`,`${(m>0?H:A).abbr} ${minus(line(m>0?homeSpread:-homeSpread))} · by ${Math.abs(m)}`])}
   if(total!==null){const s=as+hs;res.push(['Total',s===total?'Push':s>total?'Over':'Under',`${s} points scored vs ${total} · ${s===total?'exact':`by ${Math.abs(s-total)}`}`])}
   const winner=hs>as?H:as>hs?A:null;if(winner&&pa!==null){const was=winner===H?ph:pa;res.push(['Moneyline',`${winner.abbr} won`,was<50?`Upset · ${was.toFixed(0)}% chance before kickoff`:`Favorite · ${was.toFixed(0)}% chance before kickoff`])}
   parts.push(`<div class="gc-results">${res.map(([k,v,d])=>`<div class="gc-result"><span class="gc-eyebrow">${E(k)}</span><b>${E(v)}</b><small>${E(d)}</small></div>`).join('')}</div>`)}}
  // Implied team totals
  if(imp){const max=Math.max(imp.away,imp.home,1),lead=imp.home>=imp.away?H:A;
   parts.push(`<div class="gc-implied"><div class="gc-line-head"><span class="gc-eyebrow">Implied team totals</span><span class="gc-line-tag">${fav===null?'Even game':`${E(lead.abbr)} by ${Math.abs(homeSpread)}`}</span></div>${[0,1].map(i=>{const v=i?imp.home:imp.away;return `<div class="gc-imp-row">${teamLabel(st.teams[i])}<span class="gc-imp-bar"><i style="width:${(100*v/max).toFixed(1)}%;background:${E(teamColor(st,i))}"></i></span><b>${v.toFixed(1)}</b></div>`}).join('')}<p class="gc-note">What the spread and total point to for each offense: the total split by the spread.</p></div>`)}
  // Environment tiles
  const tiles=[],tile=(ic,label,value,detail,cls='')=>tiles.push(`<div class="gc-tile${cls?` ${cls}`:''}">${icon(ic)}<div><span class="gc-eyebrow">${E(label)}</span><b>${value}</b>${detail?`<small>${detail}</small>`:''}</div></div>`);
  const when=comp(st)?.date||st.game?.kickoff;
  if(when)tile('clock','Kickoff',E(dateFmt(when,{weekday:'short',hour:'numeric',minute:'2-digit'}))+' CT',E(dateFmt(when,{weekday:'long',month:'long',day:'numeric'})));
  const roof=venue.indoor?'Indoor':'Outdoor',surface=venue.grass===true?'Grass':venue.grass===false?'Artificial turf':'';
  tile('stadium','Stadium',E(venue.fullName||st.game?.venue||'—'),E([[venue.address?.city,venue.address?.state].filter(Boolean).join(', '),roof,surface].filter(Boolean).join(' · ')));
  const sw=st.siteWeather;
  if(venue.indoor||sw?.roof==='DOME')tile('roof','Weather','Indoors','Roof closed · weather is not a factor');
  else if(sw?.roof==='COVERED')tile('roof','Weather','Covered','Minimal weather impact');
  else{
   const espnW=num(weather?.temperature)!==null,temp=espnW?num(weather.temperature):num(sw?.temp),gust=espnW?num(weather.gust):num(sw?.gust),wind=espnW?null:num(sw?.wind),rain=espnW?num(weather.precipitation):num(sw?.precip);
   if(temp!==null){const harsh=(wind??0)>=18||(gust??0)>=28||(rain??0)>=60,watch=(wind??0)>=12||(gust??0)>=20||(rain??0)>=40;
    tile('temp','Weather',`${Math.round(temp)}°F`,E([wind!==null?`Wind ${Math.round(wind)} mph`:'',gust!==null?`gusts ${Math.round(gust)} mph`:'',rain!==null?`${Math.round(rain)}% chance of rain`:''].filter(Boolean).join(' · ')));
    tile('wind','Weather impact',harsh?'Passing & kicking down':watch?'Worth watching':'No impact',harsh?'Strong wind or heavy rain usually lowers passing and long field goals':watch?'Breezy or showers possible; long kicks are the first thing hurt':'Calm conditions for passing and kicking',harsh?'is-bad':watch?'is-warn':'is-good')}
   else if(state==='pre')tile('temp','Weather','Forecast pending','The kickoff forecast appears closer to game day')}
  if(total!==null){const lvl=total>=49?'High':total>=45?'Good':total>=41?'Neutral':'Low';tile('flame','Scoring environment',`${lvl} · ${total} total`,lvl==='High'?'One of the better spots for fantasy points: both offenses expected to score':lvl==='Good'?'Above-average scoring expected; a good spot for the skill players':lvl==='Neutral'?'Around an average NFL game':'A low-scoring game is expected; temper expectations',`is-${lvl.toLowerCase()}`)}
  let pA=null,pH=null;if(st.summary?.predictor){pH=num(st.summary.predictor.homeTeam?.gameProjection);pA=num(st.summary.predictor.awayTeam?.gameProjection)??(pH!==null?100-pH:null)}
  if(pA===null&&pc){const ca=mlChance(pc.awayTeamOdds?.moneyLine),ch=mlChance(pc.homeTeamOdds?.moneyLine);if(ca&&ch){pA=ca/(ca+ch)*100;pH=ch/(ca+ch)*100}}
  if(state==='pre'&&pA!==null&&pH!==null){const f=pH>=pA?H:A,d=pH>=pA?A:H,p=Math.max(pA,pH);
   tile('script','Game script',p>=70?`${E(f.abbr)} heavy favorite`:p>=60?`${E(f.abbr)} favored`:'Close game',p>=70?`${E(f.abbr)} ${p.toFixed(0)}% to win: a big lead means more ${E(f.abbr)} running late and more ${E(d.abbr)} passing to catch up`:p>=60?`${E(f.abbr)} ${p.toFixed(0)}% to win: a late lead would tilt ${E(f.abbr)} toward the run`:`${E(A.abbr)} ${pA.toFixed(0)}% · ${E(H.abbr)} ${pH.toFixed(0)}%: both offenses should stay balanced for four quarters`)}
  const ra=restDays(st,A.id),rh=restDays(st,H.id);
  if(ra&&rh&&ra.days&&rh.days){const edge=rh.days-ra.days,txt=t=>t.days?`${t.days} days${t.bye?' (bye)':''}`:'—';
   tile('rest','Rest',edge===0?'Even rest':`${E((edge>0?H:A).abbr)} +${Math.abs(edge)} days`,`${E(A.abbr)} ${txt(ra)} · ${E(H.abbr)} ${txt(rh)} since their last game`)}
  const rec=(ha,type)=>(side(st,ha)?.record||[]).find(r=>r.type===type)?.summary;
  const hr=rec('home','home'),ar=rec('away','road');
  if(hr||ar)tile('home','Home & road',[hr?`${E(H.abbr)} ${E(hr)} home`:'',ar?`${E(A.abbr)} ${E(ar)} road`:''].filter(Boolean).join(' · '),`This season: ${E(H.abbr)} at home, ${E(A.abbr)} away from home`);
  if(gi.attendance)tile('crowd','Attendance',Number(gi.attendance).toLocaleString(),'');
  const ats=(st.summary?.againstTheSpread||[]).filter(x=>(x.records||[]).length);
  if(ats.length)tile('script','Against the spread',ats.map(x=>`${E(abbrOf(x.team?.id))} ${E(x.records[0]?.summary||'')}`).join(' · '),'This season');
  parts.push(`<div class="gc-line-head is-env"><span class="gc-eyebrow">Game environment</span></div><div class="gc-tiles">${tiles.join('')}</div>`);
  return section('odds','Odds & game environment',parts.join(''),pc?.provider?.name?`Lines: ${E(pc.provider.name)}`:'');
 }

 /* ---------- injuries ---------- */
 const STATUS_RANK={Out:0,'Injured Reserve':1,Doubtful:2,Questionable:3,'Day-To-Day':4};
 const normKey=s=>String(s||'').toLowerCase().replace(/[^a-z]/g,'');
 // Players hurt in the game. Two sources:
 //  1. the play-by-play note "BLT-L.Jackson was injured during the play" (the play text uses its own team codes:
 //     BLT, CLV, HST, ARZ…), with his return from "Injury Update: … has returned to the game" or from his next
 //     play by player id (never by name text: L.Jackson of the Bills is not Lamar Jackson);
 //  2. players who took part in the game and whose injury report was updated after kickoff (within two days),
 //     e.g. a quarterback who left without an injury note in the play text.
 const SUFFIX=/\s+(jr\.?|sr\.?|ii|iii|iv|v)$/i;
 const nameKey=(first,last)=>normKey(String(first||'').trim()[0]+String(last||'').trim().replace(SUFFIX,''));
 const CODE_ALIAS={BLT:'BAL',CLV:'CLE',HST:'HOU',ARZ:'ARI',LA:'LAR',WSH:'WAS',JAC:'JAX',SL:'STL'};
 function gamePeople(st){
  const people=new Map(),ids=new Map();
  // Sources fill each other's gaps (the box score has no positions; the roster has them), keyed by player id.
  const fill=(a,b)=>{for(const f of ['id','name','headshot','pos'])if(!a[f]&&b[f])a[f]=b[f];return a};
  const add=(teamId,first,last,info)=>{const t=st.teams.find(x=>String(x.id)===String(teamId));if(!t||!last)return;const key=nameKey(first,last),k=`${t.id}|${key}`;
   const id=String(info.id||''),known=id&&ids.get(id);
   if(known){fill(known,info);const same=people.get(`${known.team.id}|${known.key}`);if(same&&String(same.id)===id)fill(same,info);return}
   const rec={...info};if(!people.has(k))people.set(k,rec);else if(String(people.get(k).id||'')===id)fill(people.get(k),info);
   if(id)ids.set(id,Object.assign(rec,{team:t,key,last:normKey(String(last).trim().replace(SUFFIX,''))}))};
  for(const [teamId,roster] of Object.entries(st.rosters||{}))for(const x of roster||[])add(teamId,x.firstName,x.lastName,{id:x.id,name:x.displayName,headshot:x.headshot?.href,pos:x.position?.abbreviation});
  for(const team of st.summary?.boxscore?.players||[])for(const c of team.statistics||[])for(const a of c.athletes||[]){const x=a.athlete||{};add(team.team?.id,x.firstName,x.lastName,{id:x.id,name:x.displayName,headshot:x.headshot?.href})}
  for(const team of st.summary?.injuries||[])for(const i of team.injuries||[]){const x=i.athlete||{},[f,...l]=String(x.displayName||'').split(' ');add(team.team?.id,f,l.join(' '),{id:x.id,name:x.displayName,headshot:x.headshot?.href,pos:x.position?.abbreviation})}
  for(const p of st.pool?.values()||[]){if(p.pos==='D/ST')continue;const [f,...l]=String(p.name).split(' ');add(p.teamId,f,l.join(' '),{id:p.id,name:p.name})}
  return {people,ids};
 }
 const coreList=st=>[...(st.plays?.values()||[])];
 const takesPart=(play,id)=>(play.participants||[]).some(x=>window.hjGameFantasy?.idOf(x.athlete?.$ref)===String(id));
 function inGameInjuries(st){
  const d=st.summary?.drives;if(!d)return [];
  const plays=[...(d.previous||[]),...(d.current&&!(d.previous||[]).some(x=>String(x.id)===String(d.current.id))?[d.current]:[])].flatMap(x=>x.plays||[]);
  const {people,ids}=gamePeople(st),core=coreList(st),coreAt=new Map(core.map((p,i)=>[String(p.id),i]));
  // Team codes used in the play text, mapped to the two teams.
  const codes=new Set();plays.forEach(pl=>{for(const m of String(pl.text||'').matchAll(/\b([A-Z]{2,3})-[A-Z]/g))codes.add(m[1])});
  const byCode=new Map();
  for(const c of codes){const abbr=CODE_ALIAS[c]||c;const t=st.teams.find((x,i)=>x.abbr===abbr||side(st,i?'home':'away')?.team?.abbreviation===c);if(t)byCode.set(c,t)}
  const unknown=[...codes].filter(c=>!byCode.has(c)),left=st.teams.filter(t=>![...byCode.values()].includes(t));
  if(unknown.length===1&&left.length===1)byCode.set(unknown[0],left[0]);
  const out=[],seen=new Set(),re=/\b([A-Z]{2,3})-([A-Z][A-Za-z'.\- ]*?) was injured during the play/g;
  plays.forEach((pl,idx)=>{const text=String(pl.text||'');let m;re.lastIndex=0;while((m=re.exec(text))){
   const short=m[2].trim(),[ini,...rest]=short.split('.'),key=nameKey(ini,rest.join('.'));
   let t=byCode.get(m[1]);if(!t){const hits=st.teams.filter(x=>people.has(`${x.id}|${key}`));if(hits.length===1)t=hits[0]}
   if(!t)continue;
   // The injury note gives a short name only ("BUF-J.Cook"), no id. Resolve it to a player id: first among the
   // players on that play (the play data carries their ids; among those few the last name is enough, and the note's
   // initial can be a nickname's: "Z.Knight" is Bam Knight), then on the team's roster; everything after uses the id.
   const coreP=core[coreAt.get(String(pl.id))],onPlay=[...new Set((coreP?.participants||[]).map(x=>window.hjGameFantasy?.idOf(x.athlete?.$ref)||''))].map(id=>ids.get(id)).filter(x=>x&&x.team===t&&x.last===normKey(rest.join('.').trim().replace(SUFFIX,'')));
   const person=(onPlay.length===1?onPlay[0]:null)||people.get(`${t.id}|${key}`)||{name:short.replace('.','. ')};
   const esc=short.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),update=new RegExp(`${m[1]}-${esc} has returned to the game`);
   // Back in the game: the "has returned" update, or his next play (by player id), whichever comes first.
   let back=null;for(let j=idx+1;j<plays.length;j++)if(update.test(String(plays[j].text||''))){back=plays[j];break}
   const at=coreAt.get(String(pl.id));
   if(person.id&&at!==undefined){const limit=back?(coreAt.get(String(back.id))??core.length):core.length;
    for(let j=at+1;j<limit;j++)if(takesPart(core[j],person.id)&&!/Penalty/i.test(core[j].type?.text||'')){back={id:core[j].id,period:core[j].period,clock:core[j].clock};break}}
   // Linemen rarely appear in the play data, so "did not return" is only said for a player seen in a play before.
   let tracked=false;if(person.id&&at!==undefined)for(let j=0;j<=at;j++)if(takesPart(core[j],person.id)){tracked=true;break}
   if(person.id)seen.add(String(person.id));
   out.push({kind:'play',team:t,person,play:pl,what:text.slice(0,m.index),back,tracked})}});
  // Injury reports updated after kickoff for players who took part in the game.
  const kick=Date.parse(comp(st)?.date||st.game?.kickoff||'');
  if(Number.isFinite(kick))for(const team of st.summary?.injuries||[])for(const i of team.injuries||[]){
   const id=String(i.athlete?.id||''),when=Date.parse(i.date||'');if(!id||seen.has(id)||!Number.isFinite(when)||when<kick||when>kick+48*3600000)continue;
   if(/suspen|illness|personal|rest|not injury/i.test(`${i.type||''} ${i.details?.type||''} ${i.status||''}`))continue;
   let last=null;for(let j=core.length-1;j>=0;j--)if(takesPart(core[j],id)&&!/Penalty/i.test(core[j].type?.text||'')){last=core[j];break}
   const inBox=(st.summary?.boxscore?.players||[]).some(tm=>(tm.statistics||[]).some(c=>(c.athletes||[]).some(a=>String(a.athlete?.id)===id)));
   if(!last&&!inBox)continue;
   const t=st.teams.find(x=>String(x.id)===String(team.team?.id));if(!t)continue;
   const x=i.athlete||{};seen.add(id);
   out.push({kind:'report',team:t,person:{id,name:x.displayName,headshot:x.headshot?.href,pos:x.position?.abbreviation},reported:when,last,injury:i});
  }
  return out;
 }
 // Both teams' rosters (player ids for linemen and others who never appear in the box score).
 async function loadRosters(st){
  if(st.rosters)return;st.rosters={};
  await Promise.all(st.teams.map(async t=>{try{const d=await getJson(`${ESPN}/teams/${t.id}/roster`,3600000);st.rosters[t.id]=(d?.athletes||[]).flatMap(g=>g.items||[])}catch(_){st.rosters[t.id]=[]}}));
  render(st);
 }
 const qclock=pl=>`${Number(pl?.period?.number)>4?'OT':`Q${pl?.period?.number||''}`} ${pl?.clock?.displayValue||''}`.trim();
 function injuriesHTML(st){
  const list=st.summary?.injuries||[],state=stateOf(st);if(state!=='pre'&&!st.rosters)loadRosters(st);const hurt=state==='pre'?[]:inGameInjuries(st);
  if(!list.length&&!hurt.length)return '';
  const designation=id=>list.flatMap(x=>x.injuries||[]).find(i=>String(i.athlete?.id)===String(id))?.status||'';
  const personHTML=(t,person)=>{const p=poolPlayer(st,person.id);if(p)return who(st,p.id,person.name||p.name,{sub:`${t.abbr} ${p.pos}`});
   return `<span class="gc-av"><span class="gc-av-initials">${E(ffnInitials(person.name||''))}</span>${person.headshot?`<img src="${E(person.headshot)}" alt="" loading="lazy" onerror="this.remove()">`:''}</span><span class="gc-plain">${E(person.name||'')}<small>${E([t.abbr,person.pos].filter(Boolean).join(' '))}</small></span>`};
  let live='';
  if(hurt.length){
   // The play itself, without injury notes, return updates or formation tags.
   const what=t=>E(String(t||'').replace(/^\(.*?\)\s*/,'').replace(/\b[A-Z]{2,3}-[A-Za-z'.\- ]*? was injured during the play\.\s*/g,'').replace(/\*\* Injury Update: .*? has returned to the game\.\s*/g,'').trim());
   const kindOf=i=>[i?.details?.side&&!/not specified/i.test(i.details.side)?i.details.side:'',i?.details?.type||i?.type,i?.details?.detail&&!/not specified/i.test(i.details.detail)?i.details.detail:''].filter(Boolean).join(' ');
   const row=h=>{
    const des=h.person.id?list.flatMap(x=>x.injuries||[]).find(i=>String(i.athlete?.id)===String(h.person.id)):null;
    if(h.kind==='report'){
     const lastTxt=h.last?`Last play: ${E(qclock(h.last))} · ${what(h.last.text)}`:'Played in this game';
     return `<div class="gc-hurt-row"><div class="gc-inj-who">${personHTML(h.team,h.person)}</div><div class="gc-hurt-when"><span class="gc-eyebrow">Injury reported ${E(dateFmt(h.reported,{weekday:'short',hour:'numeric',minute:'2-digit'}))} CT</span><small>${lastTxt}</small></div><div class="gc-hurt-status"><span class="gc-inj-status is-${E(String(h.injury.status||'').toLowerCase().replace(/[^a-z]+/g,'-'))}">${E(h.injury.status==='Injured Reserve'?'IR':h.injury.status||'')}</span>${kindOf(h.injury)?`<small>${E(kindOf(h.injury))}</small>`:''}</div></div>`;
    }
    const status=h.back?'Returned':h.tracked?(state==='post'?'Did not return':'Not back yet'):'No return noted',cls=h.back?'is-back':h.tracked?(state==='post'?'is-out':'is-watch'):'is-none';
    return `<div class="gc-hurt-row"><div class="gc-inj-who">${personHTML(h.team,h.person)}</div><div class="gc-hurt-when"><span class="gc-eyebrow">Hurt · ${E(qclock(h.play))}</span><small>${what(h.what)}</small></div><div class="gc-hurt-status"><span class="gc-inj-status ${cls}">${E(status)}</span>${h.back?`<small>${E(qclock(h.back))}</small>`:''}${des?`<small>Now: ${E(des.status==='Injured Reserve'?'IR':des.status)}${kindOf(des)?` · ${E(kindOf(des))}`:''}</small>`:''}</div></div>`};
   const inPlay=hurt.filter(h=>h.kind==='play'),reported=hurt.filter(h=>h.kind==='report');
   live=`${inPlay.length?`<div class="gc-hurt"><h4>Injured during a play</h4>${inPlay.map(row).join('')}</div>`:''}${reported.length?`<div class="gc-hurt"><h4>Injury reported after kickoff</h4><p class="gc-note">Played in this game; injury status updated after kickoff.</p>${reported.map(row).join('')}</div>`:''}`;
  }
  const col=t=>{const items=(list.find(x=>String(x.team?.id)===String(t.id))?.injuries||[]).slice().sort((a,b)=>Number(!poolPlayer(st,a.athlete?.id))-Number(!poolPlayer(st,b.athlete?.id))||(STATUS_RANK[a.status]??9)-(STATUS_RANK[b.status]??9));
   return `<div class="gc-inj-col"><h4>${teamLabel(t)}</h4>${items.length?items.map(i=>{const a=i.athlete||{},p=poolPlayer(st,a.id),d=i.details||{},status=i.status||'',ret=d.returnDate&&/out|reserve|doubt/i.test(status)?`Return ${dateFmt(`${d.returnDate}T12:00:00Z`,{month:'short',day:'numeric'})}`:'';
    const what=[d.side&&!/not specified/i.test(d.side)?d.side:'',d.type,d.detail&&!/not specified/i.test(d.detail)?d.detail:''].filter(Boolean).join(' ');
    return `<div class="gc-inj"><div class="gc-inj-who">${p?who(st,a.id,a.displayName,{sub:a.position?.abbreviation||''}):`<span class="gc-av"><span class="gc-av-initials">${E(ffnInitials(a.displayName||''))}</span>${a.headshot?.href?`<img src="${E(a.headshot.href)}" alt="" loading="lazy" onerror="this.remove()">`:''}</span><span class="gc-plain">${E(a.displayName||'')}<small>${E(a.position?.abbreviation||'')}</small></span>`}</div><span class="gc-inj-status is-${E(status.toLowerCase().replace(/[^a-z]+/g,'-'))}">${E(status==='Injured Reserve'?'IR':status)}</span><small class="gc-inj-what">${E([what,ret].filter(Boolean).join(' · '))}</small></div>`}).join(''):'<p class="gc-empty">No injury designations.</p>'}</div>`};
  const report=list.length?`${hurt.length?'<h4 class="gc-inj-sub">Injury designations</h4>':''}<div class="gc-inj-grid">${col(st.teams[0])}${col(st.teams[1])}</div>`:'';
  return section('injuries','Injury report',`${live}${report}`,hurt.length?`${hurt.length} hurt in the game`:'');
 }

 /* ---------- depth charts: both teams side by side, position down the middle ---------- */
 // The team depth feed lists players in the team's order whatever their game status, so a player ruled out
 // (O, IR, PUP, NFI, suspended, inactive) kept his slot with only a badge. The game page fills his slot with the
 // next player, using the same player statuses as the badges across the site, and lists the ruled-out players
 // under the chart. Questionable and doubtful players keep their slot with their badge.
 // No site depth logic is copied or replaced: the same feed fetchTeamDepth reads is fetched again and passed to
 // the site's own normalizeDepth with the ruled-out players taken out, so the site decides who is next (and any
 // later change to normalizeDepth applies here too). If that feed does not give the site's rows exactly (by player
 // id), the site's rows are shown unchanged.
 const NOT_PLAYING=new Set(['O','IR','PUP','NFI','SUS','SUSP','INACTIVE']);
 const DEPTH_LABELS=['QB','RB1','RB2','WR1','WR2','WR3','TE','K'];
 async function depthSource(teamKey,rows){
  try{
   if(typeof normalizeDepth!=='function'||typeof depthList!=='function'||typeof athleteIdFromRef!=='function'||typeof populatedDepthCount!=='function')return null;
   const teamId=NFL_TEAM_IDS[String(teamKey).toLowerCase()];if(!teamId)return null;
   // Same order of sources as fetchTeamDepth: the team depth feed, else the league depth feed named through the roster.
   let data=await getJson(`${ESPN}/teams/${teamId}/depthcharts`,300000).catch(()=>null),map=new Map();
   if(populatedDepthCount(normalizeDepth(data))===0){
    const [roster,core]=await Promise.all([getJson(`${ESPN}/teams/${teamId}/roster`,3600000).catch(()=>null),getJson(`${CORE}/seasons/${NFL_SEASON}/teams/${teamId}/depthcharts`,300000).catch(()=>null)]);
    data=core;map=roster&&typeof rosterLookup==='function'?rosterLookup(roster):new Map();
   }
   const check=normalizeDepth(data,map);
   const same=DEPTH_LABELS.every(l=>String(check.find(r=>r[0]===l)?.[1]?.id||'')===String(rows.find(r=>r[0]===l)?.[1]?.id||''));
   return same?{data,map}:null;
  }catch(_){return null}
 }
 const entryId=e=>{const n=e?.athlete||e?.player||e||{};return String(n?.id||e?.athleteId||e?.playerId||athleteIdFromRef(n?.$ref||e?.$ref||e?.athlete?.$ref||'')||'')};
 function withoutPlayers(data,ids){
  const copy=typeof structuredClone==='function'?structuredClone(data):JSON.parse(JSON.stringify(data));
  for(const k of ['depthchart','depthCharts','depthcharts','items'])for(const chart of depthList(copy?.[k]))for(const slot of Object.values(chart?.positions||{}))
   for(const f of ['athletes','items'])if(slot?.[f])slot[f]=depthList(slot[f]).filter(e=>!ids.has(entryId(e)));
  return copy;
 }
 function playerStatus(p){
  const live=typeof hjStatusIndex==='function'?hjStatusIndex().get(String(p?.id||'')):null;
  return live?{code:live.code,status:titleCase(live.label||live.code)}:p?.injury?.code?{code:p.injury.code,status:p.injury.status,type:p.injury.type}:null;
 }
 const ruledOut=p=>{const s=playerStatus(p);return !!s&&NOT_PLAYING.has(String(s.code).toUpperCase())};
 // Rows for one team with ruled-out players taken out (repeated in case the next man up is out too).
 function depthLineup(src,baseRows){
  let rows=baseRows;const out=[],removed=new Set();
  if(!src)return {rows,out};
  for(let k=0;k<6;k++){
   const hit=rows.filter(([,p])=>p&&p.id&&!removed.has(String(p.id))&&ruledOut(p));if(!hit.length)break;
   hit.forEach(([label,p])=>{removed.add(String(p.id));out.push({label,p,s:playerStatus(p)})});
   rows=normalizeDepth(withoutPlayers(src.data,removed),src.map);
  }
  // Keep the site's own player objects (injury, image) for players it already listed.
  rows=rows.map(([l,p])=>[l,p&&baseRows.find(r=>r[1]&&String(r[1].id)===String(p.id))?.[1]||p]);
  return {rows,out};
 }
 // Statuses are today's, so they only apply to this week's games before or during the game: a finished game (or
 // another week's) keeps the depth feed's order, since a player hurt afterwards still played in it.
 // Statuses of the players on the chart, to redraw when one changes (the site's status feed updates on its own).
 const depthSig=st=>(st.depthIds||[]).map(id=>typeof hjStatusIndex==='function'?hjStatusIndex().get(id)?.code||'':'').join('|');
 function depthSlots(st,i){
  const d=st.depth,team=i?st.game.b:st.game.a,current=Number(st.week)===curWeek()&&stateOf(st)!=='post';
  const {rows,out}=depthLineup(current?(i?d.srcB:d.srcA):null,i?d.rowsB:d.rowsA);
  return {rows:hjDepthWithDefense(team,rows),out};
 }
 async function loadDepth(st,again){
  if(!st.game||(!again&&st.depth!==undefined))return;if(!again)st.depth=null;
  try{
   const g=st.game,[a,b]=await Promise.all([fetchTeamDepth(g.a[1]),fetchTeamDepth(g.b[1])]);
   const [srcA,srcB]=await Promise.all([depthSource(g.a[1],a.rows),depthSource(g.b[1],b.rows)]);
   const lineA=depthLineup(srcA,a.rows).rows,lineB=depthLineup(srcB,b.rows).rows;
   await hjHydrateDepthPoints([...hjDepthWithDefense(g.a,a.rows),...hjDepthWithDefense(g.b,b.rows),...lineA,...lineB],g).catch(()=>{});
   st.depth={rowsA:a.rows,rowsB:b.rows,srcA,srcB,at:Date.now()};
  }catch(_){if(!again)st.depth=false}
  render(st);
 }
 const titleCase=s=>String(s||'').toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());
 function depthCell(st,i,label,p){
  const sideKey=i?'home':'away';if(!p)return `<div class="gc-dc is-${sideKey} is-empty"><span class="gc-dc-copy"><span class="gc-dc-n">—</span></span></div>`;
  const g=st.game,team=i?g.b:g.a,t=st.teams[i],position=String(label).replace(/\d+/g,'').toUpperCase(),isDst=position==='D/ST',abbr=pcTeam(team[1]);
  const name=isDst?`${titleCase(PC_TEAM_NAMES[abbr]||t.abbr)} D/ST`:p.name;
  const injury=p.injury?.code?`<span class="depth-injury" title="${E([p.injury.status,p.injury.type].filter(Boolean).join(' · '))}">${E(p.injury.code)}</span>`:'';
  const photo=`<span class="gc-av${isDst?' is-logo':''}">${isDst?'':`<span class="gc-av-initials">${E(ffnInitials(p.name))}</span>`}${p.headshot?`<img src="${E(p.headshot)}" alt="" loading="lazy" onerror="this.remove()">`:''}</span>`;
  const pl=poolPlayer(st,p.id),state=stateOf(st);let pts;
  if(state!=='pre'&&pl)pts=`<span class="gc-dc-pts"><b ${perf(pl.week,pl.proj)}>${fp(pl.week)}</b><i>${Number.isFinite(pl.proj)?fp(pl.proj):''}</i></span>`;
  else pts=`<span class="gc-dc-pts is-proj">${hjDepthPointsHTML({...p,team:abbr},position,team[1],{...g,state:state==='pre'?g.state:state})}</span>`;
  // Same parts as the leaders: photo, name (opens the profile; the injury badge sits right after it), owner line.
  const photo2=photo.replace('class="gc-av','class="gc-av is-big');
  return `<div class="gc-dc is-${sideKey}"><button type="button" class="gc-dc-face" data-gc-open aria-label="Open ${E(p.name)} profile">${photo2}</button><div class="gc-dc-copy"><button type="button" class="gc-dc-name pc-player-trigger" ${ffnPlayerDataAttrs({id:p.id,name:p.name,team:abbr,position,photo:p.headshot})}><span class="gc-dc-n">${nameHTML(name)}</span>${injury}</button><span class="gc-dc-owner">${owner({id:p.id,name:p.name,team:abbr,pos:position})}</span></div>${pts}</div>`;
 }
 function depthHTML(st){
  if(st.depth===undefined)loadDepth(st);
  if(!st.depth)return section('depth','Depth charts',st.depth===false?'<p class="gc-empty">Depth charts are unavailable right now.</p>':'<div class="gc-loading-row"><span class="depth-live-dot"></span>Loading depth charts…</div>');
  const A=depthSlots(st,0),B=depthSlots(st,1);
  st.depthIds=[...st.depth.rowsA,...st.depth.rowsB,...A.rows,...B.rows].map(r=>String(r?.[1]?.id||'')).filter(Boolean);st.depthSig=depthSig(st);
  const labels=[...new Set([...A.rows.map(r=>r[0]),...B.rows.map(r=>r[0])])];
  const find=(rows,l)=>rows.find(r=>r[0]===l)?.[1]||null;
  const rows=labels.map(l=>`<div class="gc-dc-row">${depthCell(st,0,l,find(A.rows,l))}<span class="gc-dc-label">${E(l==='D/ST'?'DST':l)}</span>${depthCell(st,1,l,find(B.rows,l))}</div>`).join('');
  // Ruled out of the game: the players who would otherwise hold a slot above.
  const outList=(list,i)=>{const abbr=st.teams[i].abbr;return list.length?list.map(({label,p,s})=>`<span class="gc-dc-outp"><button type="button" class="gc-linkish pc-player-trigger" ${ffnPlayerDataAttrs({id:p.id,name:p.name,team:abbr,position:label.replace(/\d+/g,''),photo:p.headshot})}>${nameHTML(p.name)}</button><small>${E(label)} · ${E(s?.status||'Out')}${(()=>{const d=(st.summary?.injuries||[]).flatMap(x=>x.injuries||[]).find(x=>String(x.athlete?.id)===String(p.id))?.details,t=s?.type||d?.type;return t?` · ${E(t)}`:''})()}</small></span>`).join(''):'<span class="gc-dc-outp is-none">None</span>'};
  const outs=(A.out.length||B.out.length)?`<div class="gc-dc-row gc-dc-outrow"><div class="gc-dc-outs is-away">${outList(A.out,0)}</div><span class="gc-dc-label is-out">OUT</span><div class="gc-dc-outs is-home">${outList(B.out,1)}</div></div>`:'';
  return section('depth','Depth charts',`<div class="gc-lead-head">${teamLabel(st.teams[0])}${teamLabel(st.teams[1])}</div><div class="gc-dc-list">${rows}${outs}</div>`,Number(st.week)!==curWeek()||stateOf(st)==='post'?'Today\'s depth chart':stateOf(st)==='pre'?'Projected points':'Fantasy points');
 }

 /* ---------- schedules ---------- */
 async function loadSchedules(st){
  if(st.schedules)return;st.schedules={};
  await Promise.all(st.teams.map(async t=>{try{st.schedules[t.id]=await getJson(scheduleUrl(t.id),600000)}catch(_){st.schedules[t.id]=null}}));
  render(st);loadScheduleFantasy(st);
 }
 // League points and the projection for the game leaders, one small request per week (the fantasy feed
 // returns a past week's projection only when asked for that scoring period).
 function scheduleWeeks(st){
  const out=new Map();
  for(const data of Object.values(st.schedules||{})){
   const done=(data?.events||[]).filter(e=>e.competitions?.[0]?.status?.type?.state==='post').sort((a,b)=>Number(a.week?.number)-Number(b.week?.number));
   for(const e of st.ui.schedFull?done:done.slice(-5)){const w=Number(e.week?.number);if(!w)continue;const ids=out.get(w)||new Set();for(const team of e.competitions[0].competitors||[])for(const l of team.leaders||[])for(const x of l.leaders||[])if(x.athlete?.id)ids.add(Number(x.athlete.id));out.set(w,ids)}
  }
  return out;
 }
 const SCHED_FP=new Map();
 async function loadScheduleFantasy(st){
  if(!st.schedFp){st.schedFp=new Map();st.schedFpWeeks=new Set()}
  const need=[...scheduleWeeks(st)].filter(([w])=>!st.schedFpWeeks.has(w));if(!need.length)return;
  need.forEach(([w])=>st.schedFpWeeks.add(w));
  await Promise.all(need.map(async([w,ids])=>{
   const saved=SCHED_FP.get(w),fresh=saved&&(w<curWeek()||Date.now()-saved.at<300000);
   if(fresh&&[...ids].every(id=>saved.rows.has(String(id)))){for(const [id,r] of saved.rows){st.schedFp.set(`${id}|${w}`,r);st.schedFp.set(`${id}|info`,r)}st.schedFp.set(`done|${w}`,true);return}
   try{
    const entries=await pcEspnLeaguePlayersRequest(Number(NFL_SEASON),w,'kona_player_info',{filterIds:{value:[...ids]},filterStatsForTopScoringPeriodIds:{value:18,additionalValue:[`11${NFL_SEASON}${w}`]}});
    for(const e of entries){const p=e.player||{};if(!p.id)continue;
     const info={id:String(p.id),name:p.fullName,pos:POS[p.defaultPositionId]||'',posId:p.defaultPositionId,team:abbrOf(p.proTeamId)},r={...info};
     for(const x of p.stats||[]){if(Number(x.seasonId)!==Number(NFL_SEASON)||Number(x.statSplitTypeId)!==1||Number(x.scoringPeriodId)!==w)continue;if(Number(x.statSourceId)===0)r.pts=Number(x.appliedTotal);else if(Number(x.statSourceId)===1)r.proj=Number(x.appliedTotal)}
     st.schedFp.set(`${p.id}|${w}`,r);st.schedFp.set(`${p.id}|info`,info);
     const keep=SCHED_FP.get(w)||{at:Date.now(),rows:new Map()};keep.at=Date.now();keep.rows.set(String(p.id),r);SCHED_FP.set(w,keep)}
   }catch(_){}
   st.schedFp.set(`done|${w}`,true);
  }));
  render(st);
 }
 const LEADER_STAT={passingLeader:'pass yds',rushingLeader:'rush yds',receivingLeader:'rec yds'};
 function leaderCell(st,comp,teamId,name,week){
  const L=comp?.competitors?.find(c=>String(c.team?.id)===String(teamId))?.leaders?.find(l=>l.name===name)?.leaders?.[0];if(!L)return '—';
  const a=L.athlete||{},yards=`${Math.round(Number(L.value)||0)} ${LEADER_STAT[name]||''}`.trim();
  const last=(a.shortName||a.displayName||'').split(' ').slice(1).join(' ')||a.shortName||a.displayName||'';
  const r=st.schedFp?.get(`${a.id}|${week}`),info=r||st.schedFp?.get(`${a.id}|info`)||poolPlayer(st,a.id);
  const pts=r&&Number.isFinite(r.pts)?`<b ${perf(r.pts,r.proj)}>${fp(r.pts)}</b>`:st.schedFp?.get(`done|${week}`)?'<b>—</b>':'<b class="is-wait">…</b>';
  if(!info?.pos)return `<span class="gc-mini is-plain" title="${E(yards)}"><span class="gc-mini-copy"><span>${E(last)} ${pts}</span></span></span>`;
  const p={id:String(a.id),name:info.name||a.displayName,pos:info.pos,team:info.team||'',teamId:String(teamId)};
  return `<button type="button" class="gc-mini pc-player-trigger" ${attrs(p)} title="${E(yards)}">${avatar(p,'gc-av is-mini')}<span class="gc-mini-copy"><span><b class="gc-mini-n">${E(last)}</b> ${pts}</span>${ownerName(p)}</span></button>`;
 }
 function schedulesHTML(st){
  if(!st.schedules)loadSchedules(st);else if(Object.keys(st.schedules).length)loadScheduleFantasy(st);
  const which=st.ui.sched||'away',t=st.teams[which==='home'?1:0],data=st.schedules?.[t.id];
  let body;
  if(!st.schedules||data===undefined)body='<div class="gc-loading-row"><span class="depth-live-dot"></span>Loading schedules…</div>';
  else if(!data)body='<p class="gc-empty">Schedule unavailable right now.</p>';
  else{
   const events=(data.events||[]).slice().sort((a,b)=>Number(a.week?.number)-Number(b.week?.number));
   const done=events.filter(e=>e.competitions?.[0]?.status?.type?.state==='post'),full=st.ui.schedFull;
   const shown=full?events:done.slice(-5);
   const byeWeek=Number(data.byeWeek)||0;
   const rows=[];
   const weeks=full?[...new Set([...events.map(e=>Number(e.week?.number)),...(byeWeek?[byeWeek]:[])])].sort((a,b)=>a-b):shown.map(e=>Number(e.week?.number));
   for(const w of weeks){
    const e=events.find(x=>Number(x.week?.number)===w);
    if(!e){rows.push(`<tr class="gc-bye"><td>${w}</td><td colspan="7">Bye week</td></tr>`);continue}
    const c=e.competitions?.[0]||{},me=c.competitors?.find(x=>String(x.team?.id)===String(t.id)),op=c.competitors?.find(x=>x!==me),home=me?.homeAway==='home',state=c.status?.type?.state;
    const opp=`<span class="gc-opp">${home?'vs':'@'} <img src="${E(logoOf(op?.team?.id))}" alt="" loading="lazy">${E(abbrOf(op?.team?.id))}</span>`;
    const date=dateFmt(e.date,{month:'numeric',day:'numeric'});
    if(state==='post'){const ms=Number(me?.score?.value??me?.score),os=Number(op?.score?.value??op?.score),res=me?.winner?'W':op?.winner?'L':'T',rec=(me?.record||[]).find(r=>r.type==='total'||r.id==='369')?.displayValue||'';
     rows.push(`<tr${String(e.id)===String(st.eventId)?' class="is-this"':''}><td>${w}</td><td>${E(date)}</td><td>${opp}</td><td class="gc-res is-${res.toLowerCase()}"><b>${res}</b> ${ms}-${os}</td><td>${E(rec)}</td><td>${leaderCell(st,c,t.id,'passingLeader',w)}</td><td>${leaderCell(st,c,t.id,'rushingLeader',w)}</td><td>${leaderCell(st,c,t.id,'receivingLeader',w)}</td></tr>`)}
    else{const tv=(c.broadcasts||[]).map(b=>b?.media?.shortName).filter(Boolean)[0]||'';rows.push(`<tr class="${String(e.id)===String(st.eventId)?'is-this ':''}is-upcoming"><td>${w}</td><td>${E(date)}</td><td>${opp}</td><td colspan="5">${state==='in'?'<span class="gc-live-pill">Live</span>':E(dateFmt(e.date,{weekday:'short',hour:'numeric',minute:'2-digit'}))}${tv?` · ${E(tv)}`:''}</td></tr>`)}
   }
   body=`<div class="gc-table-wrap"><table class="gc-table gc-sched"><thead><tr><th>Wk</th><th>Date</th><th>Opp</th><th>Result</th><th>W-L</th><th>Hi pass</th><th>Hi rush</th><th>Hi rec</th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="8">No games played yet.</td></tr>'}</tbody></table></div><button type="button" class="gc-more" data-gc-ui="schedFull" data-gc-value="${full?'':'1'}">${full?'Show last five games':'Show full schedule'}</button>`;
  }
  return section('schedule','Schedules',`${toggle(st,'sched',[['away',teamLabel(st.teams[0])],['home',teamLabel(st.teams[1])]],which)}${body}`,st.ui.schedFull?`${NFL_SEASON} regular season`:'Last five games');
 }

 /* ---------- the game page ---------- */
 const NAV={gamecast:'Gamecast',plays:'Plays',box:'Box score',stats:'Team stats',predictor:'Predictor',leaders:'Leaders',depth:'Depth charts',odds:'Odds',injuries:'Injuries',schedule:'Schedules'};
 function sectionsFor(st){return stateOf(st)==='pre'?[depthHTML,predictorHTML,leadersHTML,oddsHTML,injuriesHTML,schedulesHTML]:[gamecastHTML,playsHTML,boxHTML,teamStatsHTML,predictorHTML,leadersHTML,depthHTML,oddsHTML,injuriesHTML,schedulesHTML]}
 let active=null;
 function bindNav(st){
  const nav=st.root.querySelector('[data-gc-nav]'),scroll=st.root.querySelector('.gc-scroll');if(!nav||!scroll)return;
  const sections=[...scroll.querySelectorAll(':scope > [data-gc-section]')],keys=sections.map(s=>s.dataset.gcSection);
  if(nav.dataset.keys!==keys.join('|')){nav.dataset.keys=keys.join('|');nav.innerHTML=keys.map((k,i)=>`<button class="pc-profile-jump${i===0?' is-active':''}" type="button" data-gc-jump="${k}">${E(k==='predictor'&&stateOf(st)!=='pre'?'Win probability':NAV[k]||k)}</button>`).join('')}
  if(!scroll._gcNav){
   scroll._gcNav=()=>{const marker=scroll.getBoundingClientRect().top+24,all=[...scroll.querySelectorAll(':scope > [data-gc-section]')];let cur=all[0];all.forEach(s=>{if(s.getBoundingClientRect().top<=marker)cur=s});
    const buttons=[...nav.querySelectorAll('[data-gc-jump]')];buttons.forEach(b=>b.classList.toggle('is-active',b.dataset.gcJump===cur?.dataset.gcSection));
    const on=buttons.find(b=>b.classList.contains('is-active'));if(on){const l=on.offsetLeft,r=l+on.offsetWidth;if(l<nav.scrollLeft)nav.scrollLeft=l-8;else if(r>nav.scrollLeft+nav.clientWidth)nav.scrollLeft=r-nav.clientWidth+8}};
   scroll.addEventListener('scroll',scroll._gcNav,{passive:true});
   nav.addEventListener('click',e=>{const b=e.target.closest('[data-gc-jump]');if(!b)return;const target=scroll.querySelector(`[data-gc-section="${b.dataset.gcJump}"]`);if(!target)return;scroll.scrollTo({top:Math.max(0,scroll.scrollTop+target.getBoundingClientRect().top-scroll.getBoundingClientRect().top-8),behavior:'smooth'})});
  }
  scroll._gcNav();
 }
 function render(st){
  if(!st.root?.isConnected)return;
  const host=st.root.querySelector('.gc-board-host');const head=headerHTML(st);if(host&&host.innerHTML!==head)host.innerHTML=head;
  const scroll=st.root.querySelector('.gc-scroll');
  if(!st.summary){scroll.innerHTML=st.error?`<div class="gc-error"><p>${E(st.error)}</p><button type="button" class="gc-more" data-gc-retry>Try again</button></div>`:'<div class="gc-loading-row is-page"><span class="depth-live-dot"></span>Loading game…</div>';return}
  // Shared helpers name the data source in tooltips; reworded here so a refresh compares like with like.
  const html=sectionsFor(st).map(f=>{try{return f(st)}catch(error){console.warn('Game Center section failed',error);return ''}}).join('').replace(/ESPN projection/g,'projection').replace(/ESPN status/g,'Injury status').replace(/(title|aria-label)="projection/g,'$1="Projection');
  const tmp=document.createElement('div');tmp.innerHTML=html;
  const fresh=[...tmp.children],old=[...scroll.querySelectorAll(':scope > [data-gc-section]')];
  if(old.length===fresh.length&&old.every((o,i)=>o.dataset.gcSection===fresh[i].dataset.gcSection)){
   fresh.forEach((f,i)=>{const o=old[i];if(o.innerHTML===f.innerHTML)return;const lefts=[...o.querySelectorAll('.gc-table-wrap,.gc-stars-grid')].map(w=>w.scrollLeft);o.replaceWith(f);[...f.querySelectorAll('.gc-table-wrap,.gc-stars-grid')].forEach((w,j)=>{if(lefts[j])w.scrollLeft=lefts[j]})});
  }else{const top=scroll.scrollTop;scroll.replaceChildren(...fresh);scroll.scrollTop=top}
  bindNav(st);
 }
 async function refresh(st,first){
  if(!st.root?.isConnected||st.busy)return;st.busy=true;
  try{
   const summary=await getJson(summaryUrl(st.eventId),0);
   if(!st.root.isConnected)return;st.summary=summary;st.error='';
   st.state=stateOf(st);
   await fantasyPool(st).catch(()=>null);
   if(st.state!=='pre')await corePlays(st,first).catch(()=>null);
   render(st);
  }catch(error){if(!st.summary){st.error='This game could not be loaded right now.';render(st)}console.warn('Game Center refresh failed',error)}
  finally{st.busy=false;schedule(st)}
 }
 function schedule(st){
  clearTimeout(st.timer);if(!st.root?.isConnected)return;
  const state=stateOf(st),kick=new Date(comp(st)?.date||st.game?.kickoff||0).getTime(),soon=state==='pre'&&Number.isFinite(kick)&&kick-Date.now()<45*60000;
  const delay=state==='in'?15000:soon?60000:0;if(delay)st.timer=setTimeout(()=>{if(document.hidden)schedule(st);else refresh(st)},delay);
 }
 function close(){
  if(!active)return;const st=active;active=null;clearTimeout(st.timer);clearInterval(st.depthTimer);clearInterval(st.ownTimer);st.obs?.disconnect();
  // The game's summary and play-by-play are large; drop them so browsing many games does not pile up memory on phones.
  for(const k of [...cache.keys()])if(k.includes(String(st.eventId)))cache.delete(k);
  st.root.classList.remove('is-open');document.body.classList.remove('gc-modal-open');
  setTimeout(()=>st.root.remove(),300);setTimeout(()=>st.trigger?.focus?.({preventScroll:true}),310);
 }
 function teamsOf(g){return [{id:String(NFL_TEAM_IDS[g.a[1]]||''),abbr:pcTeam(g.a[1].toUpperCase()),name:g.a[0]},{id:String(NFL_TEAM_IDS[g.b[1]]||''),abbr:pcTeam(g.b[1].toUpperCase()),name:g.b[0]}]}
 function openGame(g,trigger){
  if(active)close();
  const st={eventId:String(g.eventId),week:Number(g.week)||shownWeek(),game:g,teams:teamsOf(g),ui:{openDrives:new Set()},trigger};
  const root=document.createElement('div');root.className='pc-modal-overlay gc-overlay';root.setAttribute('role','presentation');
  root.innerHTML=`<article class="pc-modal gc-modal" role="dialog" aria-modal="true" aria-label="${E(`${g.a[0]} at ${g.b[0]}`)}"><header class="pc-modal-head gc-head"><div class="gc-board-host"></div><button class="pc-modal-close gc-close" type="button" aria-label="Close game">×</button><nav class="pc-profile-nav gc-nav" data-gc-nav aria-label="Game sections"></nav></header><div class="pc-modal-scroll gc-scroll"></div></article>`;
  document.body.appendChild(root);document.body.classList.add('gc-modal-open');
  st.root=root;active=st;
  // Shared site helpers (projection colors, depth charts, injury badges) write the data source into tooltips;
  // the game page names no outside site, so those are reworded here as they appear.
  const scrub=()=>root.querySelectorAll('[title*="ESPN"],[aria-label*="ESPN"]').forEach(el=>{for(const a of ['title','aria-label']){const v=el.getAttribute(a);if(v&&v.includes('ESPN'))el.setAttribute(a,v.replace(/ESPN status/g,'Injury status').replace(/ESPN projection/g,'projection').replace(/^projection/,'Projection').replace(/\bESPN\s*/g,''))}});
  st.obs=new MutationObserver(scrub);st.obs.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['title','aria-label']});
  root.querySelector('.gc-close').addEventListener('click',close);
  root.addEventListener('click',e=>{
   if(e.target===root){close();return}
   const fwd=e.target.closest('[data-gc-open]');if(fwd){fwd.parentElement?.querySelector('.pc-player-trigger')?.click();return}
   const ui=e.target.closest('[data-gc-ui]');if(ui){const name=ui.dataset.gcUi,v=ui.dataset.gcValue;st.ui[name]=name==='schedFull'?Boolean(v):v;render(st);return}
   if(e.target.closest('[data-gc-retry]')){st.error='';render(st);refresh(st,true)}
  });
  root.addEventListener('toggle',e=>{const d=e.target.closest?.('[data-gc-drive]');if(!d)return;if(d.open)st.ui.openDrives.add(d.dataset.gcDrive);else st.ui.openDrives.delete(d.dataset.gcDrive)},true);
  render(st);requestAnimationFrame(()=>root.classList.add('is-open'));
  st.depthTimer=setInterval(()=>{if(!document.hidden&&st.depth)loadDepth(st,true)},300000);
  // Redraw when the league's rosters are rebuilt (first load, or an add/drop) so owners stay current, or when a
  // depth-chart player's status changes.
  st.ownRef=typeof HJ_PLAYER_DIRECTORY!=='undefined'?HJ_PLAYER_DIRECTORY.ownershipById:null;
  st.ownTimer=setInterval(()=>{const m=typeof HJ_PLAYER_DIRECTORY!=='undefined'?HJ_PLAYER_DIRECTORY.ownershipById:null;if(m!==st.ownRef){st.ownRef=m;render(st)}else if(st.depth&&st.depthSig!==undefined&&depthSig(st)!==st.depthSig)render(st)},5000);
  if(g.lat&&g.lon&&typeof fetchKickoffWeather==='function')fetchKickoffWeather(g).then(w=>{st.siteWeather=w;render(st)}).catch(()=>{});
  refresh(st,true);
  setTimeout(()=>root.querySelector('.gc-close')?.focus({preventScroll:true}),80);
 }
 // Capture phase: decided before a player profile opened on top closes itself on the same key press.
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active&&!document.querySelector('.pc-modal-overlay.is-open:not(.gc-overlay)'))close()},true);
 document.addEventListener('visibilitychange',()=>{if(active&&!document.hidden&&stateOf(active)==='in')refresh(active)});

 /* ---------- week switcher ---------- */
 const W={view:null,games:new Map(),loading:new Set()};
 const curWeek=()=>Number(NFL_WEEK1[0]?.week||nflActivePeriod().week);
 const shownWeek=()=>W.view??curWeek();
 const shownGames=()=>W.view===null?NFL_WEEK1:(W.games.get(W.view)||[]);
 async function loadWeek(w){
  if(W.loading.has(w))return;W.loading.add(w);
  try{const period={season:NFL_SEASON,seasonType:2,week:w},data=await fetchEspnJson(nflScheduleUrl(period));W.games.set(w,(data?.events||[]).map(e=>nflGameFromEspn(e,period)).filter(Boolean).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff)))}
  catch(_){W.games.set(w,null)}
  finally{W.loading.delete(w);if(shownWeek()===w)renderNFLWeekSchedule()}
 }
 function setWeek(w){
  w=Math.max(1,Math.min(18,Number(w)||curWeek()));W.view=w===curWeek()?null:w;
  if(W.view!==null&&!W.games.get(w))loadWeek(w);
  renderNFLWeekSchedule();week1El.scrollLeft=0;
 }
 function switcher(){
  const head=document.querySelector('.week1-head');if(!head)return null;
  let nav=head.querySelector('.gc-weeknav');
  if(!nav){
   head.classList.add('gc-week-head');
   head.insertAdjacentHTML('afterbegin','<span class="week1-title gc-week-title" data-gc-week-title></span>');
   nav=document.createElement('div');nav.className='gc-weeknav';
   nav.innerHTML=`<button type="button" class="gc-wk-step" data-gc-step="-1" aria-label="Previous week">‹</button><select class="gc-wk-select" aria-label="NFL week">${Array.from({length:18},(_,i)=>`<option value="${i+1}">Week ${i+1}</option>`).join('')}</select><button type="button" class="gc-wk-step" data-gc-step="1" aria-label="Next week">›</button><button type="button" class="gc-wk-now" data-gc-now hidden>This week</button>`;
   head.appendChild(nav);
   nav.addEventListener('click',e=>{const s=e.target.closest('[data-gc-step]');if(s)setWeek(shownWeek()+Number(s.dataset.gcStep));if(e.target.closest('[data-gc-now]'))setWeek(curWeek())});
   nav.querySelector('select').addEventListener('change',e=>setWeek(e.target.value));
  }
  return nav;
 }
 const originalUpdate=typeof nflUpdateScoreCard==='function'?nflUpdateScoreCard:null;
 nflUpdateScoreCard=function(g,i){if(W.view!==null)return;return originalUpdate?.(g,i)};
 nflCardHTML=function(g,i){
  const showScore=g.state==='in'||g.state==='post',stateClass=g.state==='in'?' is-live':g.state==='post'?' is-final':'';
  return `<article class="nfl-game gc-card${stateClass}" data-game-index="${i}" data-event-id="${E(g.eventId||'')}"><div class="nfl-card-inner"><button class="nfl-card-face nfl-card-front" type="button" aria-haspopup="dialog" aria-label="Open ${E(g.a[0])} at ${E(g.b[0])}"><div class="nfl-game-top"><span class="nfl-game-time">${nflFrontStatusHTML(g)}</span><span class="nfl-game-net">${E(g.net)}</span></div>${nflTeamRowHTML(g.a,showScore?g.aScore:g.aRecord,showScore,'away')}${nflTeamRowHTML(g.b,showScore?g.bScore:g.bRecord,showScore,'home')}</button></div></article>`;
 };
 renderNFLWeekSchedule=function(){
  const nav=switcher(),w=shownWeek(),games=shownGames(),cur=curWeek();
  if(W.view!==null&&W.view===cur)W.view=null;
  const title=document.querySelector('[data-gc-week-title]');
  if(title){const range=games?.length?nflScheduleRange(games):'';title.textContent=`NFL Week ${w}${range?` · ${range}`:''}${w===cur?'':w<cur?' · Results':' · Schedule'}`}
  if(nav){nav.querySelector('select').value=String(w);nav.querySelector('[data-gc-step="-1"]').disabled=w<=1;nav.querySelector('[data-gc-step="1"]').disabled=w>=18;nav.querySelector('[data-gc-now]').hidden=w===cur}
  if(games===null){week1El.innerHTML=`<div class="nfl-schedule-loading"><span>Week ${w} could not be loaded.</span><button type="button" class="gc-more" data-gc-reload="${w}">Try again</button></div>`;return}
  if(!games.length){week1El.innerHTML=`<div class="nfl-schedule-loading"><span class="depth-live-dot"></span><span>Loading Week ${w} schedule…</span></div>`;return}
  week1El.innerHTML=games.map((g,i)=>nflCardHTML(g,i)).join('');
 };
 week1El.addEventListener('click',e=>{
  const reload=e.target.closest('[data-gc-reload]');if(reload){e.stopImmediatePropagation();W.games.delete(Number(reload.dataset.gcReload));loadWeek(Number(reload.dataset.gcReload));renderNFLWeekSchedule();return}
  const front=e.target.closest('.nfl-card-front');if(!front)return;
  e.preventDefault();e.stopImmediatePropagation();
  const g=shownGames()?.[Number(front.closest('.nfl-game')?.dataset.gameIndex)];if(g)openGame(g,front);
 },true);
 renderNFLWeekSchedule();
 window.hjGameCenter={open:openGame,setWeek,state:()=>active,week:()=>({shown:shownWeek(),current:curWeek()})};
})();
