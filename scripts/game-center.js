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
 const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:null};
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
  if(full||!st.plays){const d=await getJson(playsUrl(id),0);st.plays=new Map((d.items||[]).map(p=>[String(p.id),p]));st.playCount=Number(d.count)||st.plays.size;st.playsAt=Date.now();return st.plays}
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
 function owner(p){
  const own=typeof hjOwnershipForPlayerLike==='function'?hjOwnershipForPlayerLike({id:p.id,name:p.name,team:p.team,position:p.pos}):null;
  return own?.owned?`<span class="gc-owner">${av(own.owner,'gc-mav')}<span>${E(own.owner)}</span></span>`:'<span class="gc-owner is-fa">FA</span>';
 }
 function fpChip(v,label=''){if(!Number.isFinite(v))return '';return `<span class="gc-fp${v>0?' is-pos':v<0?' is-neg':''}"${label?` title="${E(label)}"`:''}>${signed(v)}</span>`}
 const attrs=p=>ffnPlayerDataAttrs({id:p.id,name:p.name,team:p.team,position:p.pos,photo:p.pos==='D/ST'?logoOf(p.teamId):nflHeadshot(p.id)});
 // A fantasy-relevant player: avatar, name (opens the profile), manager. Anyone else: the name only.
 function who(st,id,name,{sub='',fpts=null,compact=false,showOwner=true}={}){
  const p=poolPlayer(st,id);
  if(!p)return `<span class="gc-plain">${E(name||'—')}${sub?`<small>${E(sub)}</small>`:''}</span>`;
  return `<button type="button" class="gc-who pc-player-trigger${compact?' is-compact':''}" ${attrs(p)} aria-label="Open ${E(p.name)} profile">${avatar(p)}<span class="gc-who-copy"><span class="gc-who-name">${E(name||p.name)}${fpts!==null?fpChip(fpts):''}</span>${sub||showOwner?`<small>${sub?`<span>${E(sub)}</span>`:''}${showOwner?owner(p):''}</small>`:''}</span></button>`;
 }
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
  return items.length?`<div class="gc-chips">${items.map(x=>`<button type="button" class="gc-chip pc-player-trigger" ${attrs(x.p)} title="${E(x.label)}">${avatar(x.p,'gc-av is-mini')}<span>${E(x.p.pos==='D/ST'?`${x.p.team} D/ST`:shortName(x.p.name))}</span>${fpChip(x.pts)}</button>`).join('')}</div>`:'';
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
 const BOX_ORDER=[['passing','Passing'],['rushing','Rushing'],['receiving','Receiving'],['fumbles','Fumbles'],['defensive','Defense'],['interceptions','Interceptions'],['kickReturns','Kick returns'],['puntReturns','Punt returns'],['kicking','Kicking'],['punting','Punting']];
 const FP_CATS=new Set(['passing','rushing','receiving','kicking']);
 function boxHTML(st){
  if(stateOf(st)==='pre')return '';
  const teams=st.summary?.boxscore?.players||[];if(!teams.length)return '';
  const which=st.ui.box||'away',t=st.teams[which==='home'?1:0],data=teams.find(x=>String(x.team?.id)===String(t.id));if(!data)return '';
  // Players who took part: points scored, a line in the box score, or a real stat (not ESPN's bookkeeping
  // entries 155-157 and 210, which inactive players carry too). D/ST always.
  const inBox=new Set((data.statistics||[]).flatMap(c=>(c.athletes||[]).map(a=>String(a.athlete?.id))));
  const played=p=>p.pos==='D/ST'||(Number.isFinite(p.week)&&(p.week!==0||inBox.has(String(p.id))||Object.keys(p.weekStats||{}).some(k=>![155,156,157,210].includes(Number(k))&&Number(p.weekStats[k]))));
  const fantasy=[...(st.pool?.values()||[])].filter(p=>String(p.teamId)===String(t.id)&&played(p)).sort((a,b)=>(b.week??-99)-(a.week??-99));
  const fTable=fantasy.length?`<div class="gc-box-block"><h4>Fantasy points</h4><div class="gc-table-wrap"><table class="gc-table gc-box"><thead><tr><th>Player</th><th>FPTS</th><th>Proj</th></tr></thead><tbody>${fantasy.map(p=>`<tr><th>${who(st,p.id,p.name,{sub:`${p.pos==='D/ST'?'D/ST':p.pos}`})}</th><td class="gc-fpts"><span ${Number.isFinite(p.week)&&Number.isFinite(p.proj)&&typeof hjPerformanceAttrs==='function'?hjPerformanceAttrs(p.week,p.proj):''}>${fp(p.week)}</span></td><td>${fp(p.proj)}</td></tr>`).join('')}</tbody></table></div></div>`:'';
  const cats=BOX_ORDER.map(([key,label])=>{const c=(data.statistics||[]).find(s=>s.name===key);if(!c||!(c.athletes||[]).length)return '';const withFp=FP_CATS.has(key);
   return `<div class="gc-box-block"><h4>${E(label)}</h4><div class="gc-table-wrap"><table class="gc-table gc-box"><thead><tr><th>${E(label)}</th>${(c.labels||[]).map(l=>`<th>${E(l)}</th>`).join('')}${withFp?'<th>FPTS</th>':''}</tr></thead><tbody>${c.athletes.map(a=>{const p=poolPlayer(st,a.athlete?.id);return `<tr><th>${who(st,a.athlete?.id,a.athlete?.displayName,{compact:true})}</th>${(a.stats||[]).map(v=>`<td>${E(v)}</td>`).join('')}${withFp?`<td class="gc-fpts">${p?fp(p.week):''}</td>`:''}</tr>`}).join('')}${(c.totals||[]).length?`<tr class="gc-totals"><th>Team</th>${c.totals.map(v=>`<td>${E(v)}</td>`).join('')}${withFp?'<td></td>':''}</tr>`:''}</tbody></table></div></div>`}).join('');
  return section('box','Box score',`${toggle(st,'box',[['away',teamLabel(st.teams[0])],['home',teamLabel(st.teams[1])]],which)}${fTable}${cats}`);
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
 function teamColor(st,i){const t=side(st,i?'home':'away')?.team;return t?.color?`#${t.color}`:(i?'#14324F':'#B98A2E')}
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
   const face=p?`<button type="button" class="gc-lead-face pc-player-trigger" ${attrs(p)} aria-label="Open ${E(p.name)} profile">${avatar(p,'gc-av is-big')}</button>`:`<span class="gc-av is-big"><span class="gc-av-initials">${E(ffnInitials(a.displayName||''))}</span>${a.headshot?.href?`<img src="${E(a.headshot.href)}" alt="" loading="lazy" onerror="this.remove()">`:''}</span>`;
   return `<div class="gc-lead-cell is-${ha}">${face}<div class="gc-lead-copy"><b class="gc-lead-value">${E(x.mainStat?.value??x.displayValue)}</b><span class="gc-lead-name">${p?`<button type="button" class="gc-linkish pc-player-trigger" ${attrs(p)}>${E(a.shortName||a.displayName)}</button>`:E(a.shortName||a.displayName)} <small>${E(a.position?.abbreviation||'')}</small></span><small class="gc-lead-sub">${E(x.summary||'')}</small>${p?`<span class="gc-lead-fp">${owner(p)}${Number.isFinite(pts)?`<span class="gc-fp is-flat">${fp(pts)} FPTS${state==='pre'?' season':''}</span>`:''}</span>`:''}</div></div>`};
  const rows=LEAD_ORDER.map(([k,label])=>{const a=get(st.teams[0],k),h=get(st.teams[1],k);if(!a&&!h)return '';return `<div class="gc-lead-row">${cell(a,'away')}<span class="gc-lead-label">${E(label)}</span>${cell(h,'home')}</div>`}).join('');
  return section('leaders',state==='pre'?'Season leaders':'Game leaders',`<div class="gc-lead-head">${teamLabel(st.teams[0])}${teamLabel(st.teams[1])}</div>${rows}`);
 }

 /* ---------- odds and game environment ---------- */
 const odds=v=>{const n=num(v);return n===null?String(v||'—'):n>0?`+${n}`:String(n)};
 const line=v=>{const n=num(v);return n===null?'—':n===0?'PK':`${n>0?'+':''}${n}`};
 function oddsHTML(st){
  const pc=(st.summary?.pickcenter||[])[0],state=stateOf(st),gi=st.summary?.gameInfo||{},venue=gi.venue||{},weather=gi.weather;
  const homeSpread=num(pc?.spread),total=num(pc?.overUnder),imp=homeSpread!==null&&total!==null?{away:total/2+homeSpread/2,home:total/2-homeSpread/2}:null;
  const fav=homeSpread===null?null:homeSpread<0?1:homeSpread>0?0:null;
  const cards=[];
  if(pc){
   const ps=pc.pointSpread||{},tt=pc.total||{},ml=pc.moneyline||{},move=(o,c)=>o&&c&&String(o)!==String(c)?`<small>Opened ${E(o)}</small>`:'';
   cards.push(`<div class="gc-odd"><span class="gc-eyebrow">Spread</span><b>${fav===null?'Pick ’em':`${E(st.teams[fav].abbr)} ${line(fav?homeSpread:-homeSpread)}`}</b>${move(ps.home?.open?.line&&`${st.teams[1].abbr} ${ps.home.open.line}`,ps.home?.close?.line&&`${st.teams[1].abbr} ${ps.home.close.line}`)}</div>`);
   cards.push(`<div class="gc-odd"><span class="gc-eyebrow">Total</span><b>O/U ${E(total??'—')}</b>${move(tt.over?.open?.line?.replace(/^o/,''),tt.over?.close?.line?.replace(/^o/,''))}</div>`);
   cards.push(`<div class="gc-odd"><span class="gc-eyebrow">Moneyline</span><b>${E(st.teams[0].abbr)} ${E(odds(pc.awayTeamOdds?.moneyLine??ml.away?.close?.odds))} · ${E(st.teams[1].abbr)} ${E(odds(pc.homeTeamOdds?.moneyLine??ml.home?.close?.odds))}</b>${ml.home?.open?.odds?`<small>Opened ${E(st.teams[0].abbr)} ${E(ml.away?.open?.odds)} · ${E(st.teams[1].abbr)} ${E(ml.home.open.odds)}</small>`:''}</div>`);
  }
  let implied='';
  if(imp){const max=Math.max(imp.away,imp.home,1);implied=`<div class="gc-implied"><span class="gc-eyebrow">Implied points</span>${[0,1].map(i=>{const v=i?imp.home:imp.away;return `<div class="gc-imp-row">${teamLabel(st.teams[i])}<span class="gc-imp-bar"><i style="width:${(100*v/max).toFixed(1)}%"></i></span><b>${v.toFixed(1)}</b></div>`}).join('')}</div>`}
  // After the game: how the lines finished.
  let result='';
  if(state==='post'&&pc){const as=num(side(st,'away')?.score),hs=num(side(st,'home')?.score);if(as!==null&&hs!==null){const margin=hs-as+(homeSpread||0),sum=as+hs;
   const ats=homeSpread===null?'':margin===0?'Push against the spread':`${margin>0?st.teams[1].abbr:st.teams[0].abbr} covered (${st.teams[1].abbr} ${line(homeSpread)})`;
   const ou=total===null?'':sum===total?`Total ${sum}: push`:`Total ${sum}: ${sum>total?'over':'under'} ${total}`;
   result=`<div class="gc-odd-result">${ats?`<span>${E(ats)}</span>`:''}${ou?`<span>${E(ou)}</span>`:''}</div>`}}
  const env=[];
  const roof=venue.indoor?'Indoor':'Outdoor',surface=venue.grass===true?'Grass':venue.grass===false?'Turf':'';
  env.push(['Venue',[venue.fullName,[venue.address?.city,venue.address?.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')||st.game?.venue||'—']);
  env.push(['Field',[roof,surface].filter(Boolean).join(' · ')]);
  const when=comp(st)?.date||st.game?.kickoff;if(when)env.push(['Kickoff',dateFmt(when,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'})]);
  if(weather&&Number.isFinite(Number(weather.temperature))&&!venue.indoor)env.push(['Weather',[`${weather.temperature}°F`,Number.isFinite(Number(weather.gust))?`gusts ${weather.gust} mph`:'',Number.isFinite(Number(weather.precipitation))?`${weather.precipitation}% precipitation`:''].filter(Boolean).join(' · ')]);
  else if(venue.indoor)env.push(['Weather','Indoors · no weather impact']);
  else if(st.siteWeather&&typeof weatherText==='function')env.push(['Weather',weatherText(st.siteWeather)]);
  if(total!==null&&typeof scoringEnvironmentText==='function')env.push(['Scoring environment',scoringEnvironmentText(total)]);
  if(state==='pre'&&st.summary?.predictor&&typeof gameScriptText==='function'&&st.game){const h=num(st.summary.predictor.homeTeam?.gameProjection),a=num(st.summary.predictor.awayTeam?.gameProjection)??(h!==null?100-h:null);try{env.push(['Game script',gameScriptText(st.game,a,h,homeSpread)])}catch(_){}}
  if(gi.attendance)env.push(['Attendance',Number(gi.attendance).toLocaleString()]);
  const ats=(st.summary?.againstTheSpread||[]).filter(x=>(x.records||[]).length);
  const atsHTML=ats.length?`<div class="gc-env-row"><span>Against the spread</span><b>${ats.map(x=>`${E(abbrOf(x.team?.id))} ${E(x.records[0]?.summary||'')}`).join(' · ')}</b></div>`:'';
  const body=`${cards.length?`<div class="gc-odds">${cards.join('')}</div>`:'<p class="gc-empty">Betting lines are not posted yet.</p>'}${result}${implied}<div class="gc-env">${env.filter(([,v])=>v).map(([k,v])=>`<div class="gc-env-row"><span>${E(k)}</span><b>${E(v)}</b></div>`).join('')}${atsHTML}</div>`;
  return section('odds','Odds & game environment',body,pc?.provider?.name?`Lines: ${E(pc.provider.name)}`:'');
 }

 /* ---------- injuries ---------- */
 const STATUS_RANK={Out:0,'Injured Reserve':1,Doubtful:2,Questionable:3,'Day-To-Day':4};
 function injuriesHTML(st){
  const list=st.summary?.injuries||[];if(!list.length)return '';
  const col=t=>{const items=(list.find(x=>String(x.team?.id)===String(t.id))?.injuries||[]).slice().sort((a,b)=>Number(!poolPlayer(st,a.athlete?.id))-Number(!poolPlayer(st,b.athlete?.id))||(STATUS_RANK[a.status]??9)-(STATUS_RANK[b.status]??9));
   return `<div class="gc-inj-col"><h4>${teamLabel(t)}</h4>${items.length?items.map(i=>{const a=i.athlete||{},p=poolPlayer(st,a.id),d=i.details||{},status=i.status||'',ret=d.returnDate&&/out|reserve|doubt/i.test(status)?`Return ${dateFmt(`${d.returnDate}T12:00:00Z`,{month:'short',day:'numeric'})}`:'';
    const what=[d.side&&!/not specified/i.test(d.side)?d.side:'',d.type,d.detail&&!/not specified/i.test(d.detail)?d.detail:''].filter(Boolean).join(' ');
    return `<div class="gc-inj"><div class="gc-inj-who">${p?who(st,a.id,a.displayName,{sub:a.position?.abbreviation||''}):`<span class="gc-av"><span class="gc-av-initials">${E(ffnInitials(a.displayName||''))}</span>${a.headshot?.href?`<img src="${E(a.headshot.href)}" alt="" loading="lazy" onerror="this.remove()">`:''}</span><span class="gc-plain">${E(a.displayName||'')}<small>${E(a.position?.abbreviation||'')}</small></span>`}</div><span class="gc-inj-status is-${E(status.toLowerCase().replace(/[^a-z]+/g,'-'))}">${E(status==='Injured Reserve'?'IR':status)}</span><small class="gc-inj-what">${E([what,ret].filter(Boolean).join(' · '))}</small></div>`}).join(''):'<p class="gc-empty">No injury designations.</p>'}</div>`};
  return section('injuries','Injury report',`<div class="gc-inj-grid">${col(st.teams[0])}${col(st.teams[1])}</div>`);
 }

 /* ---------- depth charts (loaded once, same panels as before) ---------- */
 async function loadDepth(st){
  if(st.depthHTML!==undefined||!st.game)return;st.depthHTML=null;
  try{
   const g=st.game,[a,b]=await Promise.all([fetchTeamDepth(g.a[1]),fetchTeamDepth(g.b[1])]);
   await hjHydrateDepthPoints([...hjDepthWithDefense(g.a,a.rows),...hjDepthWithDefense(g.b,b.rows)],g).catch(()=>{});
   st.depthHTML=`<div class="gc-depth">${teamDepthPanel(g.a,a.rows,g)}${teamDepthPanel(g.b,b.rows,g)}</div>`;
  }catch(_){st.depthHTML='<p class="gc-empty">Depth charts are unavailable right now.</p>'}
  render(st);
 }
 function depthHTML(st){
  if(st.depthHTML===undefined)loadDepth(st);
  return section('depth','Depth charts',st.depthHTML||'<div class="gc-loading-row"><span class="depth-live-dot"></span>Loading depth charts…</div>');
 }

 /* ---------- schedules ---------- */
 async function loadSchedules(st){
  if(st.schedules)return;st.schedules={};
  await Promise.all(st.teams.map(async t=>{try{st.schedules[t.id]=await getJson(scheduleUrl(t.id),600000)}catch(_){st.schedules[t.id]=null}}));
  render(st);
 }
 function leaderCell(st,comp,teamId,name){
  const L=comp?.competitors?.find(c=>String(c.team?.id)===String(teamId))?.leaders?.find(l=>l.name===name)?.leaders?.[0];if(!L)return '—';
  const a=L.athlete||{},p=poolPlayer(st,a.id)||(typeof hjOwnershipForPlayerLike==='function'?null:null),last=(a.shortName||a.displayName||'').split(' ').slice(1).join(' ')||a.shortName;
  const v=E(Math.round(Number(L.value)||0));
  return p?`<button type="button" class="gc-mini pc-player-trigger" ${attrs(p)}>${avatar(p,'gc-av is-mini')}<span>${E(last)} <b>${v}</b></span></button>`:`<span class="gc-mini is-plain"><span>${E(last)} <b>${v}</b></span></span>`;
 }
 function schedulesHTML(st){
  if(!st.schedules)loadSchedules(st);
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
     rows.push(`<tr${String(e.id)===String(st.eventId)?' class="is-this"':''}><td>${w}</td><td>${E(date)}</td><td>${opp}</td><td class="gc-res is-${res.toLowerCase()}"><b>${res}</b> ${ms}-${os}</td><td>${E(rec)}</td><td>${leaderCell(st,c,t.id,'passingLeader')}</td><td>${leaderCell(st,c,t.id,'rushingLeader')}</td><td>${leaderCell(st,c,t.id,'receivingLeader')}</td></tr>`)}
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
  const html=sectionsFor(st).map(f=>{try{return f(st)}catch(error){console.warn('Game Center section failed',error);return ''}}).join('');
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
  if(!active)return;const st=active;active=null;clearTimeout(st.timer);st.obs?.disconnect();
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
   const ui=e.target.closest('[data-gc-ui]');if(ui){const name=ui.dataset.gcUi,v=ui.dataset.gcValue;st.ui[name]=name==='schedFull'?Boolean(v):v;render(st);return}
   if(e.target.closest('[data-gc-retry]')){st.error='';render(st);refresh(st,true)}
  });
  root.addEventListener('toggle',e=>{const d=e.target.closest?.('[data-gc-drive]');if(!d)return;if(d.open)st.ui.openDrives.add(d.dataset.gcDrive);else st.ui.openDrives.delete(d.dataset.gcDrive)},true);
  render(st);requestAnimationFrame(()=>root.classList.add('is-open'));
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
