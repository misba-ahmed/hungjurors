/* The Wire · live week cards and carousel stability.
   Runs after every other Wire layer: redraws the "Week N · Live" and "Live Matchup" cards (centered, portraits, actual
   scores with live projections, a live win-chance bar and a link into League HQ), and stops the carousel from
   animating, flickering or moving the page when scores refresh. */
(function(){
 const NAMES={};
 function known(name){return Object.prototype.hasOwnProperty.call(AV,name)}
 function portrait(name,cls='wl-av'){return known(name)?av(name,cls):`<span class="wl-av wl-av-blank">${esc(hjInitials?hjInitials(name):String(name).slice(0,2))}</span>`}
 function gameFor(data,week,r){return (data?.schedule||[]).find(g=>Number(g?.matchupPeriodId)===Number(week)&&Number(g?.home?.teamId)===Number(r.home.teamId)&&Number(g?.away?.teamId)===Number(r.away.teamId))||null}
 function entriesOf(side){return (side?.rosterForCurrentScoringPeriod||side?.rosterForMatchupPeriod||side?.roster)?.entries||[]}
 function starters(entries){return entries.filter(e=>![20,21].includes(Number(e?.lineupSlotId)))}
 function gameState(entry){try{return typeof hjPlayerGameState==='function'&&typeof hjPlayerTeam==='function'?hjPlayerGameState(hjPlayerTeam(entry)):'pre'}catch(_){return 'pre'}}
 function liveSide(game,which,side,week,data){
  const raw=game?.[which],list=starters(entriesOf(raw));
  const projLive=typeof hjAdjustedEspnProjection==='function'?hjAdjustedEspnProjection(raw):null;
  const proj=Number.isFinite(projLive)?projLive:Number.isFinite(side.proj)?side.proj:null;
  const states=list.map(gameState),yet=states.filter(s=>s==='pre').length,playing=states.filter(s=>s==='in').length,done=states.filter(s=>s==='post').length;
  return {...side,proj,yet,playing,done,count:list.length};
 }
 function phi(z){const t=1/(1+.2316419*Math.abs(z)),d=.3989423*Math.exp(-z*z/2),p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>=0?1-p:p}
 // Win chance from the live projections: the gap between projected finals, with uncertainty that shrinks as the points still to come shrink.
 function winChance(a,b){
  const finished=a.count&&b.count&&a.done===a.count&&b.done===b.count;
  if(finished)return a.score>b.score?100:a.score<b.score?0:50;
  if(!Number.isFinite(a.proj)||!Number.isFinite(b.proj))return null;
  const remaining=Math.max(0,a.proj-a.score)+Math.max(0,b.proj-b.score);
  const sd=Math.max(2,2.3*Math.sqrt(remaining+4*((a.count-a.done)+(b.count-b.done))));
  return Math.max(1,Math.min(99,Math.round(100*phi((a.proj-b.proj)/sd))));
 }
 function matchupAttr(week,r){return `data-wire-matchup="${esc(`${week}:${r.home.teamId}:${r.away.teamId}`)}"`}
 function sideHTML(s,right){
  return `<div class="wl-side${right?' right':''}"><span class="${known(s.name)?'manager-profile-trigger':''}" ${known(s.name)?`data-manager="${esc(s.name)}" role="button" tabindex="0" aria-label="Open ${esc(s.name)} profile"`:''}>${portrait(s.name,'wl-av wl-av-big')}</span><b class="${known(s.name)?'manager-profile-trigger':''}" ${known(s.name)?`data-manager="${esc(s.name)}" role="button" tabindex="0"`:''}>${esc(s.name)}</b><strong>${pcFmt(s.score,2)}</strong><small>${Number.isFinite(s.proj)?`proj ${s.proj.toFixed(1)}`:'—'}${s.count?` · ${s.done===s.count?'done':`${s.count-s.done} left`}`:''}</small></div>`;
 }
 function barHTML(pctHome){
  if(pctHome===null)return '';
  return `<div class="wl-bar" role="img" aria-label="Win chance ${pctHome}% to ${100-pctHome}%"><span class="a" style="width:${pctHome}%"><i>${pctHome}%</i></span><span class="b"><i>${100-pctHome}%</i></span></div>`;
 }
 function liveCards(data,week,results){
  const section='live',cards=[],box=WIRE.box.get(week),boxReady=!!box&&typeof box==='object';
  const games=results.map(r=>{const g=gameFor(data,week,r),home=liveSide(g,'home',r.home,week,data),away=liveSide(g,'away',r.away,week,data),pct=winChance(home,away);return {r,home,away,pct,gap:Math.abs(home.score-away.score),leader:home.score>=away.score?home:away,trailer:home.score>=away.score?away:home}});
  const sides=games.flatMap(g=>[g.home,g.away]).filter(s=>s.score>0),high=[...sides].sort((a,b)=>b.score-a.score)[0],started=results.filter(r=>r.played).length;
  const rows=games.map(g=>`<button type="button" class="wl-row" ${matchupAttr(week,g.r)} aria-label="Open ${esc(g.home.name)} versus ${esc(g.away.name)} in League HQ"><span class="wl-row-side"><span class="wl-row-name">${portrait(g.home.name)}<b>${esc(g.home.name)}</b></span><strong class="${g.r.played&&g.home.score>g.away.score?'is-up':''}">${pcFmt(g.home.score,1)}</strong></span><span class="wl-row-mid"><small>${g.pct===null?'vs':`${g.pct}%`}</small><span class="wl-row-bar"><i style="width:${g.pct===null?50:g.pct}%"></i></span><small>${g.pct===null?'':`${100-g.pct}%`}</small></span><span class="wl-row-side right"><strong class="${g.r.played&&g.away.score>g.home.score?'is-up':''}">${pcFmt(g.away.score,1)}</strong><span class="wl-row-name"><b>${esc(g.away.name)}</b>${portrait(g.away.name)}</span></span></button>`).join('');
  cards.push({section,html:wireCard({kicker:`Week ${week} · Live`,tag:'In progress',cls:'is-lead wl-lead',body:`<div class="wl-head"><div class="wl-title">Week ${week} is live</div><div class="wl-sub">${high?`<span class="wl-chip">${portrait(high.name)}<span>High score <b>${esc(high.name)}</b> ${pcFmt(high.score,2)}</span></span>`:'<span class="wl-chip">No points yet</span>'}<span class="wl-chip"><b>${started}</b> of ${results.length} games started</span></div></div><div class="wl-rows">${rows}</div>`})});
  for(const g of games){
   const {r,home,away,pct,gap,leader,trailer}=g;
   const status=!r.played?'Pregame':gap<.005?`Tied at ${pcFmt(home.score,2)}`:`<b>${esc(leader.name)}</b> leads by <b>${gap.toFixed(2)}</b>${pct!==null?` · <b>${leader===home?pct:100-pct}%</b> to win`:''}`;
   const top=boxReady?[...wireTopStarters(box,r.home.teamId,2).map(p=>({...p,team:r.home.name})),...wireTopStarters(box,r.away.teamId,2).map(p=>({...p,team:r.away.name}))].sort((a,b)=>b.points-a.points):[];
   cards.push({section,html:wireCard({kicker:'Live Matchup',tag:r.played?`${gap.toFixed(1)} pt gap`:'Pregame',cls:'wl-match',body:`<div class="wl-vs">${sideHTML(home,false)}<span class="wl-mid">vs</span>${sideHTML(away,true)}</div>${barHTML(pct)}<div class="wl-status">${status}</div>${top.length?`<div class="wl-label">Top scorers</div>${wireStarterList(top,'')}`:''}<button type="button" class="wl-open" ${matchupAttr(week,r)}>Open in League HQ →</button>`})});
  }
  const topStarters=boxReady?box.sides.flatMap(s=>s.players.filter(p=>!p.bench).map(p=>({...p,teamId:s.teamId}))).sort((a,b)=>b.points-a.points):[],topPlayer=topStarters[0]||null,teams=wireTeamMap(data),mgrOf=id=>wireManager(teams.get(Number(id)),data);
  if(topPlayer&&topPlayer.points>0)cards.push({section,html:wireCard({kicker:'Top Performer So Far',tag:`${topPlayer.points.toFixed(1)} pts`,cls:'is-green wl-top',body:`<div class="wl-center">${wirePlayerHTML(topPlayer,`${topPlayer.points.toFixed(2)} pts`)}<div class="wl-status">Started by ${wireMgrHTML(mgrOf(topPlayer.teamId))}</div></div><div class="wl-label">Next best</div>${wireStarterList(topStarters.slice(1,4).map(p=>({...p,team:mgrOf(p.teamId)})),'up')}`})});
  return cards;
 }
 if(typeof wireLiveCards==='function')wireLiveCards=liveCards;

 /* ---- carousel stability ---- */
 // 1) Score refreshes patch the cards in place (no image reload, no scroll reset) instead of replacing them.
 function armScroller(){
  const scroller=document.querySelector('#wire-scroll');if(!scroller||scroller.dataset.hjWirePatch==='1')return;
  const proto=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');if(!proto)return;
  Object.defineProperty(scroller,'innerHTML',{configurable:true,get(){return proto.get.call(this)},set(markup){
   if(window.hjPatchLiveContent&&this.childNodes.length&&!/wire-empty/.test(String(markup))){const left=this.scrollLeft;window.hjPatchLiveContent(this,markup);if(this.scrollLeft!==left)this.scrollLeft=left}
   else proto.set.call(this,markup);
  }});
  scroller.dataset.hjWirePatch='1';
 }
 // The headline and section chips are rewritten on every redraw; skip identical rewrites so the chip rail keeps its place.
 function armSame(sel){const el=document.querySelector(sel);if(!el||el.dataset.hjSameSkip==='1')return;const proto=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');Object.defineProperty(el,'innerHTML',{configurable:true,get(){return proto.get.call(this)},set(markup){const tmp=document.createElement('template');proto.set.call(tmp,String(markup));if(tmp.innerHTML===proto.get.call(this))return;const left=this.scrollLeft;proto.set.call(this,markup);this.scrollLeft=left}});el.dataset.hjSameSkip='1'}
 function armAll(){armScroller();armSame('#wire-chips');armSame('#wire-headline')}
 armAll();new MutationObserver(armAll).observe(document.body,{childList:true,subtree:true});
 // 2) Redraws never animate the carousel; only a person's tap or key press scrolls smoothly.
 const baseScrollTo=wireScrollTo;
 wireScrollTo=function(i){
  const nodes=wireCardNodes(),scroller=document.querySelector('#wire-scroll');if(!nodes.length||!scroller)return;
  i=Math.max(0,Math.min(nodes.length-1,i));
  const el=nodes[i],left=el.offsetLeft-(scroller.clientWidth-el.offsetWidth)/2;
  const silent=Date.now()<(WIRE.silentUntil||0);
  WIRE.index=i;nodes.forEach((node,index)=>node.classList.toggle('is-scroll-active',index===i));
  if(silent){if(Math.abs(scroller.scrollLeft-left)>1)scroller.scrollLeft=left;return}
  scroller.scrollTo({left,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 };
 // Every card gets a unique label, so a redraw can find the card you were on (all Live Matchup cards used to share one).
 const baseBuild=wireBuild;
 wireBuild=function(...args){
  const built=baseBuild.apply(this,args),seen=new Map();
  for(const card of built?.cards||[]){
   const m=String(card.html).match(/aria-label="([^"]*)"/);if(!m)continue;
   const players=[...String(card.html).matchAll(/data-manager="([^"]+)"/g)].map(x=>x[1]).filter((v,i,a)=>a.indexOf(v)===i).slice(0,2).join(' vs ');
   let label=m[1].replace(/\. Click to expand\.$/,'')+(players&&/Live Matchup|Matchup/.test(m[1])?`: ${players}`:'');
   const n=(seen.get(label)||0)+1;seen.set(label,n);if(n>1)label+=` (${n})`;
   card.html=String(card.html).replace(m[0],`aria-label="${label}. Click to expand." data-wire-key="${label}"`);
  }
  return built;
 };
 const baseRender=wireRender;
 wireRender=function(...args){
  const nodes=wireCardNodes(),key=nodes[WIRE.index]?.dataset.wireKey||'',scroller=document.querySelector('#wire-scroll'),left=scroller?.scrollLeft||0;
  WIRE.silentUntil=Date.now()+600;
  try{return baseRender.apply(this,args)}
  finally{
   const restore=()=>{const list=wireCardNodes(),i=key?list.findIndex(n=>n.dataset.wireKey===key):-1;if(i>=0&&i!==WIRE.index)wireScrollTo(i);else if(i<0&&scroller&&scroller.isConnected&&scroller.scrollLeft!==left)scroller.scrollLeft=left};
   if(key){restore();requestAnimationFrame(()=>requestAnimationFrame(restore))}
   setTimeout(()=>{WIRE.silentUntil=0},600);
  }
 };
 // 3) The section chips never call scrollIntoView (mobile Safari moves the whole page); only their own rail scrolls.
 const baseDots=wireUpdateDots;
 wireUpdateDots=function(){
  const nodes=wireCardNodes(),scroller=document.querySelector('#wire-scroll'),dots=document.querySelector('#wire-dots');if(!scroller||!dots)return baseDots.apply(this,arguments);
  const center=scroller.scrollLeft+scroller.clientWidth/2;let idx=0,best=Infinity;nodes.forEach((el,i)=>{const d=Math.abs(el.offsetLeft+el.offsetWidth/2-center);if(d<best){best=d;idx=i}});
  WIRE.index=idx;nodes.forEach((el,i)=>el.classList.toggle('is-scroll-active',i===idx));
  const want=nodes.length>1?nodes.map((_,i)=>`<i class="${i===idx?'on':''}"></i>`).join(''):'';if(dots.innerHTML!==want)dots.innerHTML=want;
  const prev=document.querySelector('#wire-prev'),next=document.querySelector('#wire-next');if(prev)prev.disabled=idx<=0;if(next)next.disabled=idx>=nodes.length-1;
  const section=nodes[idx]?.dataset.wireSection||'';WIRE.activeSection=section;
  const chips=[...document.querySelectorAll('#wire-chips [data-wire-section-jump]')];chips.forEach(chip=>{const on=chip.dataset.wireSectionJump===section;chip.classList.toggle('is-active',on);chip.setAttribute('aria-pressed',String(on))});
  const active=chips.find(c=>c.dataset.wireSectionJump===section),nav=document.querySelector('#wire-chips');
  if(active&&nav&&nav.scrollWidth>nav.clientWidth){const lr=active.getBoundingClientRect(),nr=nav.getBoundingClientRect(),pad=8;if(lr.left<nr.left+pad)nav.scrollLeft-=(nr.left+pad-lr.left);else if(lr.right>nr.right-pad)nav.scrollLeft+=(lr.right-(nr.right-pad))}
 };
 try{wireRender(true)}catch(error){console.warn('Wire live cards install failed',error)}
})();
