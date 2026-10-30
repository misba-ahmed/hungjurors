/* Manager profile draft archive: player photos (Oct 30, 2026).
 *
 * The "Full draft by round" board (Draft DNA → year) showed names only. Each pick now has the player's
 * ESPN headshot, or the team logo for a D/ST pick. Draft rows carry names, not ids, so the id comes from:
 *   1. the row itself (this season's picks come from ESPN's draft with the player id; prepare-site.mjs adds it);
 *   2. data/draft-headshots.json, ids for every past pick by "year|overall pick" (see the note in that file);
 *   3. the league's current rosters / player pool by exact name, for a pick in neither.
 * A pick with no id shows the player's initials. The file loads the first time a draft board opens;
 * the open board is redrawn once when it arrives.
 */
(function(){
 if(typeof hjManagerDraftDetailHTML!=='function')return;
 let ids=null,job=null;
 const load=()=>job||(job=(typeof hjHostedJson==='function'?hjHostedJson('draft-headshots.json'):fetch('data/draft-headshots.json').then(r=>r.ok?r.json():null))
  .then(data=>{ids=data?.schema===1&&data.ids?data.ids:{};return ids}).catch(()=>{ids={};return ids}));
 const LOGO_KEY={OAK:'lv',WAS:'wsh',WSH:'wsh',JAC:'jax'};
 function logoFor(team){
  const key=String(team||'').toUpperCase();if(!key||key==='FA')return '';
  return typeof nflLogo==='function'?nflLogo((LOGO_KEY[key]||key).toLowerCase()):'';
 }
 function idByName(name){
  const norm=typeof hjNorm==='function'?hjNorm(name):String(name||'').toLowerCase();if(!norm)return '';
  const data=typeof HJ_LEAGUE_STATE!=='undefined'?HJ_LEAGUE_STATE.data:null;
  for(const team of data?.teams||[])for(const entry of (typeof hjRosterEntries==='function'?hjRosterEntries(team):[])){
   const player=typeof hjPlayer==='function'?hjPlayer(entry):null;
   if(player?.id>0&&hjNorm(player.fullName||'')===norm)return String(player.id);
  }
  const rows=typeof HJ_PLAYER_DIRECTORY!=='undefined'&&Array.isArray(HJ_PLAYER_DIRECTORY?.rows)?HJ_PLAYER_DIRECTORY.rows:[];
  const hit=rows.find(p=>Number(p?.id)>0&&hjNorm(p.name||p.fullName||'')===norm);
  return hit?String(hit.id):'';
 }
 function photoFor(r){
  if(String(r.position||'').toUpperCase().replace('/','')==='DST')return {src:logoFor(r.nfl_team),logo:true};
  const id=String(r.player_id||ids?.[`${Number(r.year)}|${Number(r.overall_pick)}`]||idByName(r.player)||'');
  return {src:/^\d+$/.test(id)&&typeof nflHeadshot==='function'?nflHeadshot(id):'',logo:false};
 }
 function avatarHTML(r){
  const {src,logo}=photoFor(r),initials=esc(typeof hjInitials==='function'?hjInitials(r.player||'?'):String(r.player||'?').slice(0,2));
  // A photo that fails to load is replaced by the initials, not left as an empty circle.
  return src?`<span class="manager-draft-avatar${logo?' is-logo':''}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.add('is-initials');this.parentNode.textContent=this.dataset.initials" data-initials="${initials}"></span>`
   :`<span class="manager-draft-avatar is-initials">${initials}</span>`;
 }
 hjManagerDraftDetailHTML=function(name,year){
  if(!ids)load().then(()=>{
   const detail=document.querySelector(`.manager-draft-detail[data-hj-draft-manager="${CSS.escape(String(name))}"][data-hj-draft-year="${Number(year)}"] .manager-draft-scroll`);
   if(detail)detail.innerHTML=hjManagerDraftDetailHTML(name,year);
  });
  const rows=hjAllDraftHistoryRows().filter(r=>r.manager===name&&Number(r.year)===Number(year)).sort((a,b)=>Number(a.round)-Number(b.round)||Number(a.overall_pick)-Number(b.overall_pick));
  if(!rows.length)return '<div class="profile-empty">No draft picks recorded for this season.</div>';
  return `<div class="manager-draft-board"><div class="manager-draft-board-head"><span>Round</span><span>Pick</span><span>Player</span><span>Pos</span></div>${rows.map(r=>`<div class="manager-draft-board-row"><span class="manager-draft-round-cell">R${Number(r.round)||'—'}</span><span class="manager-draft-pick-cell">#${Number(r.overall_pick)||'—'}</span><span class="manager-draft-player-cell has-avatar">${avatarHTML(r)}<span class="manager-draft-player-copy"><b>${esc(r.player||'Player')}</b><small>${esc([r.nfl_team,r.position].filter(Boolean).join(' · '))}</small></span></span><span class="manager-draft-pos-cell">${esc(r.position||'')}</span></div>`).join('')}</div>`;
 };
 // Mark the open board with its manager and year so the redraw above finds it.
 const open=hjOpenManagerDraftDetail;
 hjOpenManagerDraftDetail=function(back,name,year){
  const out=open.apply(this,arguments),detail=back?.querySelector('.manager-draft-detail');
  if(detail){detail.dataset.hjDraftManager=String(name);detail.dataset.hjDraftYear=String(Number(year))}
  return out;
 };
})();
