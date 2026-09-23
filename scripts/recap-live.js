/* Weekly Recap tab (League HQ): a graphic week review built from the saved league week, ESPN projections and NFL play-by-play.
   Replaces hjRecapHTML. hjRecapStories / hjRecapLoadExtra / hjRecapTimeline from the page are reused as they are. */
const HJ_RC_TEAM_COLORS={ARI:'#97233F',ATL:'#A71930',BAL:'#241773',BUF:'#00338D',CAR:'#0085CA',CHI:'#0B162A',CIN:'#FB4F14',CLE:'#311D00',DAL:'#003594',DEN:'#FB4F14',DET:'#0076B6',GB:'#203731',HOU:'#03202F',IND:'#002C5F',JAX:'#006778',KC:'#E31837',LAC:'#0080C6',LAR:'#003594',LV:'#000000',MIA:'#008E97',MIN:'#4F2683',NE:'#002244',NO:'#D3BC8D',NYG:'#0B2265',NYJ:'#125740',PHI:'#004C54',PIT:'#FFB612',SEA:'#002244',SF:'#AA0000',TB:'#D50A0A',TEN:'#0C2340',WAS:'#5A1414'};
const HJ_RC_POSITIONS=['QB','RB','WR','TE','K','D/ST'];
function hjRcTeam(proTeamId){return typeof HJ_PRO_TEAM_BY_ID!=='undefined'&&proTeamId!=null?HJ_PRO_TEAM_BY_ID[String(proTeamId)]||'':''}
function hjRcTime(ms,opts={}){return Number.isFinite(ms)?new Date(ms).toLocaleString('en-US',{timeZone:'America/Chicago',...opts}):''}
function hjRcClock(ms){return hjRcTime(ms,{hour:'numeric',minute:'2-digit'})+' CT'}
function hjRcDay(ms){return hjRcTime(ms,{weekday:'long'})}
function hjRcNight(ms){const h=Number(hjRcTime(ms,{hour:'numeric',hourCycle:'h23'})),d=hjRcDay(ms);return d==='Monday'?'Monday night':d==='Sunday'&&h>=19?'Sunday night':d==='Thursday'&&h>=19?'Thursday night':''}
function hjRcPct(p){return `${(100*p).toFixed(1)}%`}
function hjRcSigned(v,d=1){return `${v>0?'+':v<0?'−':''}${Math.abs(v).toFixed(d)}`}
function hjRcPhi(z){const t=1/(1+.2316419*Math.abs(z)),d=.3989423*Math.exp(-z*z/2),p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>=0?1-p:p}
function hjRcNames(list){return list.length<=1?list.join(''):list.length===2?`${list[0]} and ${list[1]}`:`${list.slice(0,-1).join(', ')} and ${list.at(-1)}`}

/* ---- week model ---- */
function hjRcPlayer(entry,week,owner,bench){
 const p=hjRecapPlayer(entry,week),player=hjPlayer(entry);
 return {...p,owner,bench,proTeamId:p.stat?.proTeamId??player.proTeamId,slot:Number(entry.lineupSlotId),gameId:p.stat?.externalId?String(p.stat.externalId):''};
}
function hjRcModel(chosen,weeks,data){
 const {week,scores}=chosen,extra=HJ_RECAP_EXTRA.weeks.get(week),teams=new Map((data?.teams||[]).map(t=>[String(t.id),t]));
 const opponents=extra?.schedule?hjChOpponents(extra.schedule):{};
 const managers=scores.map(r=>{
  const starters=(r.starters||[]).map(e=>hjRcPlayer(e,week,r.short,false)).filter(p=>p.name&&p.points!==null);
  const bench=(r.entries||[]).filter(e=>Number(e.lineupSlotId)===20).map(e=>hjRcPlayer(e,week,r.short,true)).filter(p=>p.name&&p.points!==null);
  const eff=r.lineupComplete&&Number.isFinite(r.optimal)&&r.optimal>0?100*r.pts/r.optimal:null;
  return {...r,team:teams.get(String(r.teamId))?.name||'',starters,bench,eff,result:r.pts>r.oppPts?'W':r.pts<r.oppPts?'L':'T',margin:r.pts-r.oppPts,allPlay:hjRecapAllPlay(r,scores)};
 });
 const byName=new Map(managers.map(m=>[m.short,m])),seen=new Set(),games=[];
 for(const m of managers){if(seen.has(m.short))continue;const o=byName.get(m.opp);if(!o)continue;seen.add(m.short);seen.add(o.short);const winner=m.pts>=o.pts?m:o,loser=winner===m?o:m;games.push({a:m,b:o,winner,loser,margin:Math.abs(m.pts-o.pts)})}
 const ordered=[...managers].sort((a,b)=>b.pts-a.pts),avg=managers.reduce((n,m)=>n+m.pts,0)/(managers.length||1),complete=managers.every(m=>m.lineupComplete);
 const pool=extra?.pool||HJ_DATA.requests.get(`players:${NFL_SEASON}:${hjCurrentWeek()}`)?.value||[];
 const ownership=new Map(managers.flatMap(m=>[...m.starters,...m.bench].map(p=>[p.id,p])));
 const performers=complete&&pool.length?pool.map(e=>hjRecapPlayer(e,week)).filter(p=>p.points!==null&&p.name).map(p=>{const own=ownership.get(p.id);return {...p,proTeamId:p.stat?.proTeamId??hjPlayer(p.entry).proTeamId,owner:own?.owner||'',bench:own?.bench||false}}):managers.flatMap(m=>[...m.starters,...m.bench]);
 // Ownership beats the pool entry for team ids so opponents resolve.
 for(const p of performers){const own=ownership.get(p.id);if(own)p.proTeamId=own.proTeamId}
 const withOpp=p=>({...p,opponent:opponents[String(p.proTeamId)]||null,position:p.pos,manager:p.owner&&!p.bench?p.owner:'',benchOf:p.bench?p.owner:''});
 const leaders=HJ_RC_POSITIONS.map(pos=>[...performers].filter(p=>p.pos===pos).sort((a,b)=>b.points-a.points)[0]).filter(Boolean).map(withOpp);
 const benchers=HJ_RC_POSITIONS.map(pos=>managers.flatMap(m=>m.bench).filter(p=>p.pos===pos).sort((a,b)=>b.points-a.points)[0]).filter(p=>p&&p.points>0).map(withOpp);
 const startersAll=managers.flatMap(m=>m.starters).map(withOpp);
 const falseStarters=startersAll.filter(p=>Number.isFinite(p.projection)&&p.projection>=8&&!['K','D/ST'].includes(p.pos)).map(p=>({...p,gap:p.points-p.projection})).sort((a,b)=>a.gap-b.gap).slice(0,5);
 let changer=null;
 for(const g of games){for(const p of g.winner.starters){if(!Number.isFinite(p.projection))continue;const surplus=p.points-p.projection;if(surplus<=0)continue;const flips=g.winner.pts-surplus<g.loser.pts;const score=(flips?1000:0)+surplus;if(!changer||score>changer.score)changer={...withOpp(p),surplus,flips,game:g,score}}}
 const awards=[];
 const push=(key,label,m,value,sub,tone='')=>m&&awards.push({key,label,manager:m.short,value,sub,tone});
 const blow=[...games].sort((a,b)=>b.margin-a.margin)[0],narrow=[...games].sort((a,b)=>a.margin-b.margin)[0];
 if(blow)push('blowout','Biggest blowout',blow.winner,`by ${blow.margin.toFixed(2)}`,`${pcFpts(blow.winner.pts)}–${pcFpts(blow.loser.pts)} over ${blow.loser.short}`,'win');
 if(narrow)push('narrow','Narrow victory',narrow.winner,`by ${narrow.margin.toFixed(2)}`,`${pcFpts(narrow.winner.pts)}–${pcFpts(narrow.loser.pts)} over ${narrow.loser.short}`,'win');
 const projected=managers.filter(m=>Number.isFinite(m.proj));
 const over=[...projected].sort((a,b)=>(b.pts-b.proj)-(a.pts-a.proj))[0],under=[...projected].sort((a,b)=>(a.pts-a.proj)-(b.pts-b.proj))[0];
 if(over)push('over','Overachiever vs projection',over,`${hjRcSigned(over.pts-over.proj,2)}`,`${pcFpts(over.pts)} scored, ${pcFpts(over.proj)} projected`,'pos');
 if(under)push('under','Underachiever vs projection',under,`${hjRcSigned(under.pts-under.proj,2)}`,`${pcFpts(under.pts)} scored, ${pcFpts(under.proj)} projected`,'neg');
 const efficient=managers.filter(m=>m.eff!==null);
 const most=[...efficient].sort((a,b)=>b.eff-a.eff)[0],least=[...efficient].sort((a,b)=>a.eff-b.eff)[0];
 if(most)push('most','Most efficient manager',most,`${most.eff.toFixed(1)}%`,`${pcFpts(most.pts)} of ${pcFpts(most.optimal)} max, ${pcFpts(most.optimal-most.pts)} left on bench`,'pos');
 if(least)push('least','Least efficient manager',least,`${least.eff.toFixed(1)}%`,`${pcFpts(least.pts)} of ${pcFpts(least.optimal)} max, ${pcFpts(least.optimal-least.pts)} left on bench`,'neg');
 const losers=managers.filter(m=>m.result==='L'),winners=managers.filter(m=>m.result==='W');
 const hiLoss=[...losers].sort((a,b)=>b.pts-a.pts)[0],loWin=[...winners].sort((a,b)=>a.pts-b.pts)[0];
 if(hiLoss)push('hiloss','Highest points in a loss',hiLoss,pcFpts(hiLoss.pts),`lost to ${hiLoss.opp} ${pcFpts(hiLoss.oppPts)} by ${(hiLoss.oppPts-hiLoss.pts).toFixed(2)}`,'neg');
 if(loWin)push('lowin','Lowest points in a win',loWin,pcFpts(loWin.pts),`beat ${loWin.opp} ${pcFpts(loWin.oppPts)} by ${(loWin.pts-loWin.oppPts).toFixed(2)}`,'win');
 const swings=extra?.games?.size?hjRcSwings(games,week,extra,data):null;
 return {week,weeks,data,managers,games,ordered,avg,complete,leaders,benchers,falseStarters,changer,awards,swings,extra,opponents};
}

/* ---- play-by-play score timeline per matchup ---- */
function hjRcAthleteAlias(player,game){
 const athletes=new Map();for(const team of game.boxscore?.players||[])for(const group of team.statistics||[])for(const row of group.athletes||[]){const a=row.athlete;if(a?.id)athletes.set(String(a.id),{...a,teamId:String(team.team.id)})}
 const athlete=athletes.get(String(player.id));if(!athlete?.firstName||!athlete.lastName)return null;
 const shortLast=name=>String(name).replace(/ (?:Jr\.?|Sr\.?|II|III|IV)$/i,''),alias=athlete.firstName[0]+'.'+shortLast(athlete.lastName);
 return {alias,teamId:athlete.teamId};
}
function hjRcGamePlays(game){
 const plays=[...new Map((game.drives?.previous||[]).flatMap(d=>d.plays||[]).map(p=>[String(p.id),p])).values()].sort((a,b)=>Number(a.sequenceNumber)-Number(b.sequenceNumber));
 const kickoff=Date.parse(game.header?.competitions?.[0]?.date||''),known=plays.map(p=>Date.parse(p.wallclock||'')).filter(Number.isFinite);
 const start=known.length?Math.min(...known):kickoff,end=known.length?Math.max(...known):kickoff+3.1*36e5;
 // Plays without a wallclock borrow a time from their neighbours so every play sits on the clock.
 let last=start;return plays.map((p,i)=>{let t=Date.parse(p.wallclock||'');if(!Number.isFinite(t))t=Math.max(last,start+(end-start)*(i/Math.max(1,plays.length-1)));last=t;return {...p,t,i}});
}
function hjRcTrack(player,game,plays){
 // Per-play point increments for one starter, rescaled so the track ends exactly on the player's real total.
 const n=plays.length;if(!n)return null;const raw=new Array(n).fill(0);
 const meta=hjRcAthleteAlias(player,game);
 if(meta&&['QB','RB','WR','TE','K'].includes(player.pos)){
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),who=escape(meta.alias);
  const passing=new RegExp('(?:^|[ )])'+who+' pass\\b','i'),receiving=new RegExp('\\bto '+who+'(?:[ ,.]|$)','i'),carrying=new RegExp('(?:^|[ )])'+who+' (?:left|right|up the middle|rushed|scrambles|scramble|kneels|kneel)','i'),kicking=new RegExp('(?:^|[ )])'+who+' (\\d+) yard field goal is GOOD','i'),pat=new RegExp('(?:^|[ )])'+who+' extra point is GOOD','i');
  plays.forEach((play,i)=>{const text=String(play.text||'');if(/NO PLAY|NULLIFIED|REVERSED|overturned/i.test(text))return;
   const offense=String(play.start?.team?.id);if(offense&&offense!==meta.teamId)return;
   const yardsMatch=text.match(/\bfor (-?\d+) yards?\b/i),yards=yardsMatch?Number(yardsMatch[1]):/\bfor no gain\b/i.test(text)?0:null,td=/\bTOUCHDOWN\b/i.test(text),twoPt=/TWO.POINT/i.test(text);let pts=0;
   if(player.pos==='K'){const fg=text.match(kicking);if(fg)pts+=Number(fg[1])>=50?5:Number(fg[1])>=40?4:3;if(pat.test(text))pts+=1}
   else if(!twoPt){
    if(passing.test(text)){if(/INTERCEPTED/i.test(text))pts-=2;else if(!/incomplete/i.test(text)&&yards!==null)pts+=yards*.04+(td?4:0)}
    if(receiving.test(text)&&/pass (?!incomplete)/i.test(text)&&!/INTERCEPTED/i.test(text)&&yards!==null)pts+=1+yards*.1+(td?6:0);
    if(carrying.test(text)&&!/\bpass\b/i.test(text)&&yards!==null)pts+=yards*.1+(td?6:0);
   }else if(passing.test(text)||receiving.test(text)||carrying.test(text))pts+=2;
   raw[i]+=pts});
 }
 const sum=raw.reduce((a,b)=>a+b,0),target=player.points;
 let track;
 if(Math.abs(sum)>.01&&(sum>0)===(target>0)&&target!==0)track=raw.map(v=>v*target/sum);
 else {track=new Array(n).fill(target/n);track.even=true} // D/ST, blanks and unmatched players accrue evenly through their game
 return track;
}
function hjRcSwings(games,week,extra,data){
 const out=[];
 for(const g of games){
  const sides=[g.winner,g.loser];if(sides.some(s=>!s.lineupComplete))continue;
  const gameIds=new Set(sides.flatMap(s=>s.starters.map(p=>p.gameId)).filter(Boolean));
  const played=new Map();for(const id of gameIds){const game=extra.games.get(id);if(!game)continue;const plays=hjRcGamePlays(game);if(plays.length)played.set(id,{game,plays})}
  // Every starter must have a finished game log, or the timeline is not trustworthy.
  if(sides.some(s=>s.starters.some(p=>p.points!==0&&(!p.gameId||!played.has(p.gameId)))))continue;
  const tracks=new Map();for(const s of sides)for(const p of s.starters){const pg=played.get(p.gameId);tracks.set(p.id,pg?hjRcTrack(p,pg.game,pg.plays):null)}
  const events=[...played].flatMap(([id,{plays}])=>plays.map(play=>({...play,gameId:id,n:plays.length}))).sort((a,b)=>a.t-b.t||Number(a.sequenceNumber)-Number(b.sequenceNumber));
  if(!events.length)continue;
  const cur=new Map(sides.flatMap(s=>s.starters.map(p=>[p.id,0]))),done=new Map(sides.flatMap(s=>s.starters.map(p=>[p.id,0])));
  const state=s=>{let score=0,exp=0,variance=0;for(const p of s.starters){score+=cur.get(p.id)||0;const frac=p.gameId&&played.has(p.gameId)?1-(done.get(p.id)||0)/played.get(p.gameId).plays.length:0;const proj=Number.isFinite(p.projection)?p.projection:0,rem=Math.max(0,proj*frac);exp+=rem;variance+=(.6*rem)**2+(frac>0?1:0)}return {score,exp,variance,remaining:s.starters.filter(p=>p.gameId&&played.has(p.gameId)&&(done.get(p.id)||0)<played.get(p.gameId).plays.length)}};
  const series=[];let peak=null,elimination=null;
  for(const ev of events){
   let gain=0,who=[];
   for(const s of sides)for(const p of s.starters){if(p.gameId!==ev.gameId)continue;const tr=tracks.get(p.id),d=tr?tr[ev.i]:0;cur.set(p.id,(cur.get(p.id)||0)+d);done.set(p.id,(done.get(p.id)||0)+1);if(Math.abs(d)>=.5&&tr&&!tr.even){gain+=d;who.push({side:s.short,name:p.name,pts:d})}}
   const L=state(g.loser),W=state(g.winner),diff=(L.score+L.exp)-(W.score+W.exp),sd=Math.sqrt(L.variance+W.variance);
   const p=sd>0?hjRcPhi(diff/sd):diff>0?1:diff<0?0:.5;
   series.push({t:ev.t,p,ev,gameId:ev.gameId,who,loserScore:L.score,winnerScore:W.score,winnerRemaining:W.remaining.length,loserRemaining:L.remaining.length});
   if(!peak||p>peak.p)peak={p,t:ev.t,loserScore:L.score,winnerScore:W.score,winnerRemaining:W.remaining.map(x=>({id:x.id,name:x.name,at:cur.get(x.id)||0})),loserRemaining:L.remaining.length,ev};
   if(!elimination&&L.remaining.length===0&&W.score>L.score+.005)elimination={t:ev.t,ev,game:played.get(ev.gameId).game,loserScore:L.score,winnerScore:W.score};
  }
  if(peak)peak.winnerRemaining=peak.winnerRemaining.map(x=>({...x,after:(cur.get(x.id)||0)-x.at}));
  // Point of no return: the last real fantasy play (a player actually scoring) after which the loser's win chance never got back above 5%.
  let blow=null;
  if(series.length&&series.at(-1).p<=.05){
   let k=-1;for(let i=series.length-1;i>=0;i--){if(series[i].p>.05){k=i;break}}
   let idx=-1;for(let i=k+1;i<series.length;i++){if(series[i].who.length){idx=i;break}}
   if(idx<0)for(let i=k;i>=0;i--){if(series[i].who.length){idx=i;break}}
   if(idx>=0){const s=series[idx];blow={t:s.t,ev:s.ev,game:played.get(s.gameId).game,who:s.who,loserScore:s.loserScore,winnerScore:s.winnerScore,winnerRemaining:s.winnerRemaining,loserRemaining:s.loserRemaining,before:series[idx-1]?.p??.5,after:s.p}}
  }
  out.push({game:g,series,peak,elimination,blow});
 }
 return out;
}

/* ---- rendering ---- */
function hjRcMgr(name,cls=''){return `<span class="rc-mgr manager-profile-trigger${cls?` ${cls}`:''}" data-manager="${esc(name)}" role="button" tabindex="0" aria-label="Open ${esc(name)} profile">${av(name,'rc-av')}<b>${esc(name)}</b></span>`}
function hjRcCrown(){return '<svg class="rc-crown" viewBox="0 0 60 34" aria-hidden="true"><path d="M4 30 8 8l14 10L30 2l8 16L52 8l4 22Z" fill="#e6bb3f" stroke="#8a6414" stroke-width="2" stroke-linejoin="round"/><path d="M6 24h48v7H6Z" fill="#f3d266" stroke="#8a6414" stroke-width="2"/><circle cx="30" cy="16" r="2.6" fill="#b3352c"/></svg>'}
function hjRcPodium(model){
 const [first,second,third]=model.ordered;if(!first)return '';
 const step=(m,place)=>m?`<div class="rc-step is-${place}"><span class="rc-place">${place}</span>${place===1?hjRcCrown():''}<span class="rc-step-av manager-profile-trigger" data-manager="${esc(m.short)}" role="button" tabindex="0" aria-label="Open ${esc(m.short)} profile">${av(m.short,'rc-av-big')}</span><b class="manager-profile-trigger" data-manager="${esc(m.short)}" role="button" tabindex="0">${esc(m.short)}</b><span class="rc-step-pts">${pcFpts(m.pts)}</span></div>`:'';
 return `<section class="rc-podium" aria-label="Top three scores">${step(second,2)}${step(first,1)}${step(third,3)}</section>`;
}
function hjRcCellar(model){
 const n=model.ordered.length;if(n<4)return '';
 const last=model.ordered.slice(-3),[eighth,ninth,tenth]=last;
 const spot=(m,rank,depth)=>m?`<div class="rc-hole is-${depth}"><span class="rc-hole-av manager-profile-trigger" data-manager="${esc(m.short)}" role="button" tabindex="0" aria-label="Open ${esc(m.short)} profile">${av(m.short,'rc-av-big')}</span><span class="rc-hole-rank">${rank}${rank%10===1&&rank!==11?'st':rank%10===2&&rank!==12?'nd':rank%10===3&&rank!==13?'rd':'th'}${rank===n?' (last)':''}</span><b class="manager-profile-trigger" data-manager="${esc(m.short)}" role="button" tabindex="0">${esc(m.short)}</b><span class="rc-hole-pts">${pcFpts(m.pts)}</span><small>${(model.avg-m.pts).toFixed(1)} below avg</small></div>`:'';
 return `<section class="rc-block"><h3 class="rc-h">The cellar <small>lowest scores of the week</small></h3><div class="rc-cellar">${spot(ninth,n-1,2)}${spot(tenth,n,3)}${spot(eighth,n-2,1)}<span class="rc-cellar-floor"></span></div></section>`;
}
/* Announcements stay in the week each record was broken. */
function hjRcRecordAnnouncements(model){
 const year=Number(model.data?.seasonId||NFL_SEASON);
 const events=(typeof HJ_RECORD_STATE==='undefined'?[]:HJ_RECORD_STATE.events).filter(e=>e.year===year&&e.week===model.week);
 const order={scoring:0,playoffs:1,regular:2,legacy:3};
 events.sort((a,b)=>(a.id==='closest-game'?-1:b.id==='closest-game'?1:order[a.category]-order[b.category]));
 if(!events.length)return '';
 const manager=(name,cls='')=>`<button type="button" class="manager-profile-trigger ${cls}" data-manager="${esc(name)}" aria-label="Open ${esc(name)} profile">${esc(name)}</button>`;
 const matchKey=game=>game?.homeTeamId&&game?.awayTeamId?`${game.period}:${game.homeTeamId}:${game.awayTeamId}`:'';
 return `<section class="rc-block rc-record-announcements" aria-label="New league records">${events.map(event=>{
  const {current,previous}=event,people=current.people;
  const side=person=>{
   if(!person)return `<div class="rc-record-seal" aria-hidden="true">${hjRcCrown()}<span>ALL-TIME<br>HISTORY</span></div>`;
   const game=event.matches.find(g=>[g.manager1,g.manager2].includes(person.name)),key=matchKey(game);
   const score=Number.isFinite(person.score)?(key?`<button type="button" class="rc-record-score" data-wire-matchup="${esc(key)}" aria-label="Open ${esc(game.manager1)} versus ${esc(game.manager2)} matchup">${pcFpts(person.score)}</button>`:`<strong class="rc-record-score">${pcFpts(person.score)}</strong>`):'';
   return `<div class="rc-record-person"><button type="button" class="rc-record-face manager-profile-trigger" data-manager="${esc(person.name)}" aria-label="Open ${esc(person.name)} profile">${av(person.name,'rc-av-big')}<b>${esc(person.name)}</b></button>${score}</div>`;
  };
  const split=Math.ceil(people.length/2),left=people.slice(0,split),right=people.slice(split);
  const oldPeople=previous.people.map(p=>`${manager(p.name)}${Number.isFinite(p.score)?` <span>${pcFpts(p.score)}</span>`:p.year&&previous.people.length>1?` <span>(${p.year})</span>`:''}`).join(' <span class="rc-record-vs">/</span> ');
  const matches=event.matches.filter(g=>matchKey(g)).map(g=>`<button type="button" data-wire-matchup="${esc(matchKey(g))}">${event.matches.length>1?esc(g.manager1)+' vs '+esc(g.manager2):'View matchup'} <span aria-hidden="true">↗</span></button>`).join('');
  return `<article class="rc-record" data-record-announcement="${esc(event.key)}">
   <div class="rc-record-sparks" aria-hidden="true"><i>✦</i><i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i></div>
   <header class="rc-record-head"><span>HISTORY. REWRITTEN.</span><h3>NEW LEAGUE RECORD!</h3></header>
   <div class="rc-record-stage"><div class="rc-record-side">${left.map(side).join('')}</div><div class="rc-record-mark"><strong>${esc(current.mark)}</strong><span>${esc(current.unit)}</span><h4>${esc(current.headline)}</h4></div><div class="rc-record-side">${right.length?right.map(side).join(''):side(null)}</div></div>
   <footer class="rc-record-footer"><p><b>Previous record: ${esc(previous.mark)}</b> <span>${esc(previous.unit)}</span> <span aria-hidden="true">·</span> ${oldPeople}${previous.detail?` <span>· ${esc(previous.detail)}</span>`:''}</p><div class="rc-record-links">${matches}<a href="#record-book/${esc(event.id)}">Added to the League Record Book <span aria-hidden="true">→</span></a></div></footer>
  </article>`;
 }).join('')}</section>`;
}
function hjRcAwards(model){
 if(!model.awards.length)return '';
 return `<section class="rc-block"><h3 class="rc-h">Weekly awards</h3><div class="rc-awards">${model.awards.map(a=>`<article class="rc-award is-${a.tone}"><div class="rc-award-head">${av(a.manager,'rc-av')}<span>${esc(a.label)}</span></div><div class="rc-award-body"><span class="rc-award-name manager-profile-trigger" data-manager="${esc(a.manager)}" role="button" tabindex="0">${esc(a.manager)}</span><b>${a.value}</b><small>${esc(a.sub)}</small></div></article>`).join('')}</div></section>`;
}
function hjRcPerformance(model){
 const max=Math.max(...model.managers.map(m=>Math.max(m.pts,Number.isFinite(m.optimal)?m.optimal:0)),1);
 const rows=model.ordered.map((m,i)=>{const opt=Number.isFinite(m.optimal)?m.optimal:null,w=100*m.pts/max,wo=opt?100*opt/max:w;
  return `<div class="rc-perf-row"><span class="rc-perf-rank">${i+1}</span><span class="rc-perf-av manager-profile-trigger" data-manager="${esc(m.short)}" role="button" tabindex="0" aria-label="Open ${esc(m.short)} profile">${av(m.short,'rc-av-mid')}</span><div class="rc-perf-main"><div class="rc-perf-top"><b class="manager-profile-trigger" data-manager="${esc(m.short)}" role="button" tabindex="0">${esc(m.short)}</b>${m.team?`<small>${esc(m.team)}</small>`:''}<span class="rc-res is-${m.result.toLowerCase()}">${m.result}</span></div><div class="rc-perf-bar"><i class="max" style="width:${wo.toFixed(1)}%"></i><i class="got" style="width:${w.toFixed(1)}%"></i><span>${pcFpts(m.pts)}${opt?` of ${pcFpts(opt)} max`:''}</span></div><div class="rc-perf-foot"><em>${m.eff!==null?`${m.eff.toFixed(1)}%`:'—'}</em><span>vs ${esc(m.opp)} ${pcFpts(m.oppPts)}, all-play ${m.allPlay.label}${Number.isFinite(m.proj)?`, proj ${pcFpts(m.proj)}`:''}</span></div></div></div>`}).join('');
 return `<section class="rc-block"><h3 class="rc-h">Team performance <small>points scored against the best possible lineup</small></h3><div class="rc-perf">${rows}</div></section>`;
}
function hjRcPlayerCard(p){
 const {attrs,photo}=hjRcHeadshot(p),dst=p.pos==='D/ST',vs=hjChVs(p.opponent);
 const owner=p.manager?`<span class="rc-pcard-owner manager-profile-trigger" data-manager="${esc(p.manager)}" role="button" tabindex="0" aria-label="Open ${esc(p.manager)} profile">${av(p.manager,'rc-av')}<b>${esc(p.manager)}</b></span>`:p.benchOf?`<span class="rc-pcard-owner is-status manager-profile-trigger" data-manager="${esc(p.benchOf)}" role="button" tabindex="0">On ${esc(p.benchOf)}’s bench</span>`:'<span class="rc-pcard-owner is-status">Free agent</span>';
 // The photo and the name are both player triggers; they sit in separate wrappers because the live-refresh patcher keys siblings by player id.
 return `<article class="rc-pcard" role="listitem"><span class="rc-pcard-top"><button type="button" class="rc-pcard-photo pc-player-trigger${dst?' is-logo':''}" data-pos="${esc(p.pos)}" ${attrs} aria-label="Open ${esc(p.name)} player card">${photo?`<img src="${esc(photo)}" alt="" loading="lazy" onerror="this.remove()">`:''}</button></span><span class="rc-pcard-pos">${esc(p.pos)}</span><span class="rc-pcard-title"><button type="button" class="rc-pcard-name pc-player-trigger" ${attrs}>${esc(hjChShortName({name:p.name,position:p.pos}))}</button></span>${owner}<strong class="rc-pcard-points">${p.points.toFixed(2)}</strong>${vs?`<span class="rc-pcard-opp">${esc(vs)}</span>`:''}</article>`;
}
function hjRcCardRow(title,sub,players){
 if(!players.length)return '';
 return `<section class="rc-block"><h3 class="rc-h">${esc(title)}${sub?` <small>${esc(sub)}</small>`:''}</h3><div class="rc-cards" role="list">${players.map(hjRcPlayerCard).join('')}</div></section>`;
}
function hjRcHeadshot(p){const {attrs,photo}=hjChPlayerAttrs({id:p.id,name:p.name,position:p.pos,proTeamId:p.proTeamId});return {attrs,photo}}
function hjRcFeature(p,cls,right){
 const team=hjRcTeam(p.proTeamId),color=HJ_RC_TEAM_COLORS[team]||'#14324F',{attrs,photo}=hjRcHeadshot(p);
 const owner=p.manager?`<span class="rc-feat-owner manager-profile-trigger" data-manager="${esc(p.manager)}" role="button" tabindex="0">${av(p.manager,'rc-av')}${esc(p.manager)}</span>`:p.benchOf?`<span class="rc-feat-owner">On ${esc(p.benchOf)}’s bench</span>`:'';
 return `<article class="rc-feat ${cls}" style="--team:${color}">${team&&typeof nflLogo==='function'?`<img class="rc-feat-logo" src="${esc(nflLogo(team.toLowerCase()))}" alt="" loading="lazy" onerror="this.remove()">`:''}<div class="rc-feat-copy"><button type="button" class="rc-feat-name pc-player-trigger" ${attrs}>${esc(p.name)}</button><span class="rc-feat-meta">${esc(team)} <b>${esc(p.pos)}</b>${p.opponent?` ${esc(hjChVs(p.opponent))}`:''}</span>${owner}</div>${photo?`<button type="button" class="rc-feat-photo pc-player-trigger" ${attrs} aria-label="Open ${esc(p.name)} player card"><img src="${esc(photo)}" alt="" loading="lazy" onerror="this.remove()"></button>`:''}<div class="rc-feat-stat">${right}</div></article>`;
}
function hjRcFalseStarters(model){
 const list=model.falseStarters;if(!list.length)return '';
 const [lead,...rest]=list;
 const stat=p=>`<b>${p.points.toFixed(1)}<small>pts</small></b><span class="is-neg">▼ ${p.gap.toFixed(1)} <small>proj</small></span>`;
 const rows=rest.map(p=>{const {attrs,photo}=hjRcHeadshot(p);return `<div class="rc-mini"><button type="button" class="rc-mini-photo pc-player-trigger" ${attrs}>${photo?`<img src="${esc(photo)}" alt="" loading="lazy" onerror="this.remove()">`:''}</button><div class="rc-mini-copy"><button type="button" class="rc-mini-name pc-player-trigger" ${attrs}>${esc(hjChShortName({name:p.name,position:p.pos}))}</button><small>${esc(hjRcTeam(p.proTeamId))} <b>${esc(p.pos)}</b>${p.opponent?` ${esc(hjChVs(p.opponent))}`:''}</small><span class="rc-mini-owner manager-profile-trigger" data-manager="${esc(p.manager)}" role="button" tabindex="0" aria-label="Open ${esc(p.manager)} profile">${av(p.manager,'rc-av')}<b>${esc(p.manager)}</b></span></div><div class="rc-mini-stat">${stat(p)}</div></div>`}).join('');
 return `<section class="rc-block"><h3 class="rc-h">False starters <small>these starters could have stayed on the bench</small></h3>${hjRcFeature(lead,'is-neg',stat(lead))}${rows}</section>`;
}
function hjRcVs(g,winnerFirst=true){
 const side=(m,right)=>`<div class="rc-vs-side${right?' right':''}"><span class="manager-profile-trigger" data-manager="${esc(m.short)}" role="button" tabindex="0" aria-label="Open ${esc(m.short)} profile">${av(m.short,'rc-av-mid')}</span><b>${m.result==='W'?'▸ ':''}${pcFpts(m.pts)}</b><small>${Number.isFinite(m.proj)?`proj ${m.proj.toFixed(1)}`:esc(m.short)}</small></div>`;
 const a=winnerFirst?g.winner:g.a,b=winnerFirst?g.loser:g.b;
 return `<div class="rc-vs">${side(a,false)}<span class="rc-vs-mid">VS</span>${side(b,true)}</div>`;
}
function hjRcChanger(model){
 const c=model.changer;if(!c)return '';
 const stat=`<b>${c.points.toFixed(1)}<small>pts</small></b><span class="is-pos">▲ ${c.surplus.toFixed(1)} <small>proj</small></span>`;
 const copy=c.flips?`Take away ${c.name}'s ${c.surplus.toFixed(1)} points over projection and ${c.game.winner.short} loses to ${c.game.loser.short} by ${(c.game.loser.pts-(c.game.winner.pts-c.surplus)).toFixed(2)}. Instead it was a ${c.game.margin.toFixed(2)}-point win.`:`${c.name} cleared the projection by ${c.surplus.toFixed(1)} in ${c.game.winner.short}'s ${c.game.margin.toFixed(2)}-point win over ${c.game.loser.short}.`;
 return `<section class="rc-block"><h3 class="rc-h">Game changer <small>one player's performance decided an outcome</small></h3>${hjRcFeature(c,'is-pos',stat)}${hjRcVs(c.game)}<p class="rc-copy">${esc(copy)}</p></section>`;
}
function hjRcChart(swing){
 const s=swing.series;if(s.length<2)return '';
 const w=600,h=150,l=34,r=10,top=10,bottom=26,t0=s[0].t,t1=s.at(-1).t,x=t=>l+(t-t0)/Math.max(1,t1-t0)*(w-l-r),y=p=>top+(1-p)*(h-top-bottom);
 const pts=s.map(o=>`${x(o.t).toFixed(1)},${y(o.p).toFixed(1)}`).join(' ');
 const days=[];let lastDay='';for(const o of s){const d=hjRcTime(o.t,{weekday:'short'});if(d!==lastDay){days.push({t:o.t,d});lastDay=d}}
 const peak=swing.peak;
 return `<svg class="rc-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(swing.game.loser.short)}'s win chance through the week"><line class="rc-chart-mid" x1="${l}" x2="${w-r}" y1="${y(.5)}" y2="${y(.5)}"></line>${[1,.5,0].map(v=>`<text class="rc-chart-axis" x="4" y="${y(v)+4}">${Math.round(v*100)}%</text>`).join('')}${days.map(o=>`<text class="rc-chart-axis" x="${x(o.t)}" y="${h-8}" text-anchor="${o.t===t0?'start':'middle'}">${esc(o.d)}</text>`).join('')}<polyline class="rc-chart-line" points="${pts}"></polyline>${peak?`<circle class="rc-chart-peak" cx="${x(peak.t)}" cy="${y(peak.p)}" r="5"></circle><text class="rc-chart-label" x="${Math.min(w-r-60,Math.max(l,x(peak.t)-30))}" y="${Math.max(12,y(peak.p)-10)}">${hjRcPct(peak.p)}</text>`:''}</svg>`;
}
function hjRcSlipped(model){
 const swings=model.swings;if(!swings)return `<section class="rc-block"><h3 class="rc-h">Slipped away <small>the highest win chance that still ended in a loss</small></h3><p class="rc-copy rc-muted">Loading NFL game logs for the win-chance timeline…</p></section>`;
 const best=[...swings].filter(s=>s.peak).sort((a,b)=>b.peak.p-a.peak.p)[0];if(!best)return '';
 const {game:g,peak}=best,lead=peak.loserScore-peak.winnerScore,rem=peak.winnerRemaining,after=rem.reduce((n,x)=>n+x.after,0);
 const when=`${hjRcClock(peak.t)} ${hjRcDay(peak.t)}`;
 const text=peak.p>=.5?`${g.loser.short} held a ${hjRcPct(peak.p)} win chance at ${when}${lead>0?`, sitting on a ${lead.toFixed(1)}-point lead`:''}${rem.length?`, with ${g.winner.short}'s ${hjRcNames(rem.map(x=>x.name))} still to play`:''}. ${rem.length?`${rem.length===1?rem[0].name:'Those players'} ${rem.length===1?'went':'combined'} for ${after.toFixed(1)} from there, and ${g.winner.short} took it ${pcFpts(g.winner.pts)}–${pcFpts(g.loser.pts)}.`:`${g.winner.short} won ${pcFpts(g.winner.pts)}–${pcFpts(g.loser.pts)}.`}`:`No lead slipped away this week. The best any losing side ever had was ${g.loser.short} at ${hjRcPct(peak.p)} (${when}) before ${g.winner.short} won ${pcFpts(g.winner.pts)}–${pcFpts(g.loser.pts)}.`;
 return `<section class="rc-block"><h3 class="rc-h">Slipped away <small>the highest win chance that still ended in a loss</small></h3><div class="rc-slip"><div class="rc-slip-num"><b>${hjRcPct(peak.p)}</b><small>peak win chance</small>${hjRcMgr(g.loser.short)}</div><div class="rc-slip-body">${hjRcChart(best)}<p class="rc-copy">${esc(text)}</p></div></div>${hjRcVs(g)}</section>`;
}
function hjRcPlayText(ev){return String(ev.text||'').replace(/^\(\d+:\d+\)\s*/,'').replace(/\s+/g,' ').trim()}
function hjRcGameLabel(game){const c=game.header?.competitions?.[0],h=c?.competitors?.find(t=>t.homeAway==='home')?.team?.abbreviation||'',a=c?.competitors?.find(t=>t.homeAway==='away')?.team?.abbreviation||'';return `${a} @ ${h}`}
function hjRcFinalBlow(model){
 const swings=model.swings;if(!swings)return '';
 const ends=swings.filter(s=>s.blow).map(s=>({...s,night:hjRcNight(s.blow.t)})).sort((a,b)=>b.blow.t-a.blow.t);if(!ends.length)return '';
 const lead=ends.find(s=>s.night)||ends[0],b=lead.blow,g=lead.game,q=Number(b.ev.period?.number),qLabel=q>4?'overtime':`Q${q}`,clock=b.ev.clock?.displayValue||'';
 const scorers=b.who.filter(x=>x.side===g.winner.short),victim=b.who.filter(x=>x.side===g.loser.short);
 const swingText=scorers.length?`${hjRcNames(scorers.map(x=>`${x.name} (${hjRcSigned(x.pts,1)})`))} for ${g.winner.short}`:victim.length?`${hjRcNames(victim.map(x=>`${x.name} (${hjRcSigned(x.pts,1)})`))} for ${g.loser.short}`:'';
 const copy=`${esc(g.loser.short)}'s win chance went from ${hjRcPct(b.before)} to ${hjRcPct(b.after)} on this play and never got back above 5%. It put ${esc(g.winner.short)} ahead ${pcFpts(b.winnerScore)}–${pcFpts(b.loserScore)}${b.loserRemaining?` with ${b.loserRemaining} of ${esc(g.loser.short)}'s players still to play`:` with nothing left in ${esc(g.loser.short)}'s lineup`}${swingText?` · ${esc(swingText)}`:''}. Final: ${pcFpts(g.winner.pts)}–${pcFpts(g.loser.pts)}.${lead.elimination&&lead.elimination.t>b.t+60000?` Officially over at ${esc(hjRcClock(lead.elimination.t))} ${esc(hjRcDay(lead.elimination.t))} when ${esc(hjRcGameLabel(lead.elimination.game))} ended.`:''}`;
 const lines=ends.map(s=>{const x=s.blow,sc=x.who.filter(w=>w.side===s.game.winner.short);return `<li${s===lead?' class="is-lead"':''}><span class="rc-end-time">${esc(hjRcTime(x.t,{weekday:'short',hour:'numeric',minute:'2-digit'}))}</span><span class="rc-end-who">${hjRcMgr(s.game.loser.short)}<small>out of reach vs ${esc(s.game.winner.short)} · ${esc(hjRcGameLabel(x.game))}${sc.length?` · ${esc(sc.map(w=>`${w.name} ${hjRcSigned(w.pts,1)}`).join(', '))}`:''}</small></span></li>`}).join('');
 return `<section class="rc-block"><h3 class="rc-h">The final blow <small>the play that put a matchup out of reach for good</small></h3><div class="rc-final"><div class="rc-final-stamp"><b>${esc(hjRcClock(b.t))}</b><small>${esc(lead.night||hjRcDay(b.t))}</small></div><div class="rc-final-body"><p class="rc-copy">${hjRcMgr(g.loser.short)} was finished at <b>${esc(hjRcClock(b.t))} ${esc(hjRcDay(b.t))}</b> — ${esc(hjRcGameLabel(b.game))}, ${esc(qLabel)}${clock?`, ${esc(clock)} left`:''}.</p><blockquote class="rc-play">${esc(hjRcPlayText(b.ev))}</blockquote><p class="rc-copy">${copy}</p></div></div><ol class="rc-ends">${lines}</ol></section>`;
}
function hjRcStoryManagers(story,names){
 const text=`${story.subject||''} ${story.title} ${story.text}`,found=names.filter(n=>new RegExp(`(^|[^A-Za-z])${n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![A-Za-z])`,'i').test(text));
 const subject=String(story.subject||'').replace(/^rivalry:/,'');
 return [...new Set([subject,...found])].filter(n=>names.includes(n)).slice(0,3);
}
function hjRcFindPlayer(model,text){
 const all=model.managers.flatMap(m=>[...m.starters,...m.bench]);
 let hit=all.filter(p=>p.name&&text.includes(p.name)).sort((a,b)=>b.name.length-a.name.length)[0];if(hit)return hit;
 for(const e of model.extra?.pool||[]){const name=hjPlayer(e).fullName;if(name&&text.includes(name)){const p=hjRecapPlayer(e,model.week);if(p.points!==null)return {...p,proTeamId:p.stat?.proTeamId??hjPlayer(e).proTeamId}}}
 return null;
}
function hjRcHeadshotHTML(p,cls='rc-mini-photo'){if(!p)return '';const {attrs,photo}=hjRcHeadshot(p);return `<button type="button" class="${cls} pc-player-trigger" ${attrs} aria-label="Open ${esc(p.name)} player card">${photo?`<img src="${esc(photo)}" alt="" loading="lazy" onerror="this.remove()">`:''}</button>`}
function hjRcOptimalBar(m){if(!m||!Number.isFinite(m.optimal)||m.optimal<=0)return '';const w=100*m.pts/m.optimal;return `<div class="rc-vis-bar"><div class="rc-perf-bar"><i class="max" style="width:100%"></i><i class="got" style="width:${w.toFixed(1)}%"></i><span>${pcFpts(m.pts)} of ${pcFpts(m.optimal)} max</span></div><small>${(m.optimal-m.pts).toFixed(2)} left on the bench</small></div>`}
function hjRcStoryVisual(s,model){
 const kind=String(s.kind||'').toUpperCase(),text=`${s.title} ${s.text} ${s.proof}`,subject=String(s.subject||'').replace(/^rivalry:/,''),m=model.managers.find(x=>x.short===subject),opp=m?model.managers.find(x=>x.short===m.opp):null,game=m?model.games.find(g=>g.a===m||g.b===m):null;
 const player=hjRcFindPlayer(model,`${s.title} ${s.text}`);
 if(['SCHEDULE CRUELTY','THE GREAT ESCAPE'].includes(kind)&&m){const others=model.managers.filter(x=>x.short!==m.short).sort((a,b)=>b.pts-a.pts);return `<div class="rc-vis rc-vis-allplay">${others.map(o=>`<span class="${m.pts>o.pts?'is-w':m.pts<o.pts?'is-l':'is-t'}${o.short===m.opp?' is-opp':''}" title="${esc(o.short)} ${pcFpts(o.pts)}">${av(o.short,'rc-av')}</span>`).join('')}<small>${m.allPlay.label} against the league, the outlined face is the actual opponent</small></div>`}
 if(['LINEUP LEFT BEHIND','A STAR WITHOUT A START','THE EMPTY START','NOBODY CLAIMED THE WINNER','THE MOVE THAT CAME BACK'].includes(kind))return `<div class="rc-vis rc-vis-row">${hjRcHeadshotHTML(player)}${hjRcOptimalBar(m)}</div>`;
 if(kind==='FORECAST FLIPPED'&&m&&opp){const max=Math.max(m.pts,opp.pts,m.proj||0,opp.proj||0,1);const bar=x=>`<div class="rc-vis-proj"><span>${av(x.short,'rc-av')}</span><div><i class="proj" style="width:${(100*(x.proj||0)/max).toFixed(1)}%"></i><i class="got" style="width:${(100*x.pts/max).toFixed(1)}%"></i></div><small>proj ${x.proj?x.proj.toFixed(1):'—'} → ${pcFpts(x.pts)}</small></div>`;return `<div class="rc-vis">${bar(m)}${bar(opp)}</div>`}
 if(kind==='ONE-PLAYER ENGINE'&&player&&m){const pct=Math.max(0,Math.min(100,100*player.points/(m.pts||1)));return `<div class="rc-vis rc-vis-row"><span class="rc-ring" style="--pct:${pct.toFixed(1)}"><b>${pct.toFixed(0)}%</b></span>${hjRcHeadshotHTML(player)}<div class="rc-vis-copy"><b>${esc(player.name)}</b><small>${pcFpts(player.points)} of ${esc(m.short)}'s ${pcFpts(m.pts)}</small></div></div>`}
 if(kind==='ON A RUN'&&m){const streak=hjRecapStreak(m,model.weeks,model.week);const runs=model.weeks.filter(w=>w.week<=model.week).map(w=>w.scores.find(r=>r.short===m.short)).filter(Boolean);return `<div class="rc-vis rc-vis-dots">${runs.map(r=>`<i class="${r.pts>r.oppPts?'is-w':r.pts<r.oppPts?'is-l':'is-t'}" title="Week ${runs.indexOf(r)+1}: ${pcFpts(r.pts)} vs ${esc(r.opp)} ${pcFpts(r.oppPts)}"></i>`).join('')}<small>${esc(streak.label)} and counting</small></div>`}
 if(['WHERE THE MATCHUP TURNED','THE SUPPORTING CAST','THE RECEPTION DIVIDEND','WINNING SHORT-HANDED'].includes(kind)&&game)return `<div class="rc-vis rc-vis-battle"><span>${av(game.a.short,'rc-av')}</span>${hjRcBattleStrip(game)}<span>${av(game.b.short,'rc-av')}</span></div>`;
 if(['RIVALRY RESET','A FAMILIAR RESULT'].includes(kind)&&m&&opp)return `<div class="rc-vis rc-vis-h2h"><span class="manager-profile-trigger" data-manager="${esc(m.short)}" role="button" tabindex="0">${av(m.short,'rc-av-mid')}</span><b>${pcFpts(m.pts)}</b><small>vs</small><b>${pcFpts(opp.pts)}</b><span class="manager-profile-trigger" data-manager="${esc(opp.short)}" role="button" tabindex="0">${av(opp.short,'rc-av-mid')}</span></div>`;
 if(kind==='OUT OF CHARACTER'&&m){const series=[...model.weeks.filter(w=>w.week<model.week).map(w=>w.scores.find(r=>r.short===m.short)?.pts).filter(Number.isFinite),m.pts];return `<div class="rc-vis rc-vis-row">${hjRcSpark(series,m.pts,m.pts>=series.slice(0,-1).reduce((n,v)=>n+v,0)/Math.max(1,series.length-1)?'is-pos':'is-neg')}<small>${series.length} weeks, this week marked</small></div>`}
 if(kind==='ONE GAME, MANY MATCHUPS'){const teams=String(s.title).match(/\b[A-Z]{2,3}\b/g)||[];const logos=teams.slice(0,2).map(t=>typeof nflLogo==='function'?`<img class="rc-vis-logo" src="${esc(nflLogo(t.toLowerCase()))}" alt="${esc(t)}" loading="lazy" onerror="this.remove()">`:'').join('<small>@</small>');const pct=String(s.text).match(/(\d+)%/);return logos?`<div class="rc-vis rc-vis-row">${logos}${pct?`<span class="rc-ring" style="--pct:${pct[1]}"><b>${pct[1]}%</b></span><small>of all league scoring came from this game</small>`:''}</div>`:''}
 if(['GONE AFTER HALFTIME','SECOND-HALF ARRIVAL'].includes(kind)&&player){const first=Number((String(s.text).match(/([\d.]+) (?:of|FPTS before)/)||[])[1]),total=player.points,second=Number.isFinite(first)?total-first:null;return Number.isFinite(second)?`<div class="rc-vis rc-vis-row">${hjRcHeadshotHTML(player)}<div class="rc-vis-halves"><div><i style="width:${(100*Math.max(0,first)/Math.max(1,total)).toFixed(1)}%"></i></div><small>1st half ${first.toFixed(2)}, 2nd half ${second.toFixed(2)}</small></div></div>`:`<div class="rc-vis rc-vis-row">${hjRcHeadshotHTML(player)}</div>`}
 if(['POINTS AFTER THE DAMAGE','A PLAY BIGGER THAN THE MARGIN'].includes(kind)&&player)return `<div class="rc-vis rc-vis-row">${hjRcHeadshotHTML(player)}<div class="rc-vis-copy"><b>${esc(player.name)}</b><small>${pcFpts(player.points)} this week</small></div></div>`;
 return player?`<div class="rc-vis rc-vis-row">${hjRcHeadshotHTML(player)}<div class="rc-vis-copy"><b>${esc(player.name)}</b><small>${pcFpts(player.points)} this week</small></div></div>`:'';
}
function hjRcStories(chosen,weeks,model){
 const stories=hjRecapStories(chosen,weeks);if(!stories.length)return '';
 const names=model.managers.map(m=>m.short).sort((a,b)=>b.length-a.length);
 const cards=stories.map(s=>{
  const who=hjRcStoryManagers(s,names);
  const proof=String(s.proof||'').split(/\s+·\s+|;\s+|(?<![A-Z]|\bSt|\bJr|\bSr|\bvs|\bNo)\.\s+(?=[A-Z0-9])/).map(x=>x.trim().replace(/\.$/,'')).filter(Boolean);
  const faces=who.length?`<span class="rc-story-faces">${who.map(n=>`<span class="manager-profile-trigger" data-manager="${esc(n)}" role="button" tabindex="0" aria-label="Open ${esc(n)} profile">${av(n,'rc-av-mid')}</span>`).join('')}</span>`:'';
  return `<article class="rc-story"><div class="rc-story-head">${faces}<span><small class="rc-eyebrow">${esc(s.kind)}</small><h4>${esc(s.title)}</h4></span></div><p>${esc(s.text)}</p>${hjRcStoryVisual(s,model)}${proof.length>1?`<ul class="rc-story-proof">${proof.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:proof.length?`<p class="rc-story-proof">${esc(proof[0])}</p>`:''}</article>`}).join('');
 return `<section class="rc-block"><h3 class="rc-h">Storylines</h3><div class="rc-stories">${cards}</div></section>`;
}
/* ---- matchup win-chance charts ---- */
function hjRcMiniChart(series,winner,loser){
 if(!series||series.length<2)return '';
 const w=300,h=80,l=4,r=4,top=6,bottom=6,t0=series[0].t,t1=series.at(-1).t,x=t=>l+(t-t0)/Math.max(1,t1-t0)*(w-l-r),y=p=>top+(1-p)*(h-top-bottom);
 // Chart the eventual winner's chance so every line ends at the top.
 const pts=series.map(o=>`${x(o.t).toFixed(1)},${y(1-o.p).toFixed(1)}`).join(' ');
 return `<svg class="rc-mini-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(winner)} win chance against ${esc(loser)} through the week"><line class="rc-chart-mid" x1="${l}" x2="${w-r}" y1="${y(.5)}" y2="${y(.5)}"></line><polygon class="rc-mini-fill" points="${x(t0).toFixed(1)},${y(0)} ${pts} ${x(t1).toFixed(1)},${y(0)}"></polygon><polyline class="rc-chart-line" points="${pts}"></polyline></svg>`;
}
function hjRcMatchups(model){
 if(!model.games.length)return '';
 const cards=model.games.map(g=>{const sw=model.swings?.find(s=>s.game===g);const peak=sw?.peak;
  const note=!sw?(model.swings?'game logs missing':'loading game logs…'):peak&&peak.p>=.5?`${g.loser.short} peaked at ${hjRcPct(peak.p)}`:peak?`${g.loser.short} never above ${hjRcPct(peak.p)}`:'';
  return `<article class="rc-mu"><div class="rc-mu-side"><span class="manager-profile-trigger" data-manager="${esc(g.winner.short)}" role="button" tabindex="0">${av(g.winner.short,'rc-av-mid')}</span><b>${esc(g.winner.short)}</b><strong>${pcFpts(g.winner.pts)}</strong></div><div class="rc-mu-mid">${sw?hjRcMiniChart(sw.series,g.winner.short,g.loser.short):'<div class="rc-mu-empty"></div>'}<small>${esc(note)}</small></div><div class="rc-mu-side right"><span class="manager-profile-trigger" data-manager="${esc(g.loser.short)}" role="button" tabindex="0">${av(g.loser.short,'rc-av-mid')}</span><b>${esc(g.loser.short)}</b><strong>${pcFpts(g.loser.pts)}</strong></div></article>`}).join('');
 return `<section class="rc-block"><h3 class="rc-h">How every game went <small>the winner's win chance, play by play, Thursday to Monday</small></h3><div class="rc-mus">${cards}</div></section>`;
}
/* ---- Sunday and Monday night sweat ---- */
function hjRcWindows(model){
 const events=model.extra?.schedule?.events||[],starts={sun:[],mon:[]};
 for(const e of events){const t=Date.parse(e.date);if(!Number.isFinite(t))continue;const day=hjRcDay(t),hour=Number(hjRcTime(t,{hour:'numeric',hourCycle:'h23'}));if(day==='Sunday'&&hour>=18)starts.sun.push(t);if(day==='Monday')starts.mon.push(t)}
 return [['Sunday night',starts.sun.length?Math.min(...starts.sun):null],['Monday night',starts.mon.length?Math.min(...starts.mon):null]].filter(w=>w[1]);
}
function hjRcSweat(model){
 if(!model.swings)return '';
 const windows=hjRcWindows(model);if(!windows.length)return '';
 const blocks=windows.map(([label,at])=>{
  const rows=model.games.map(g=>{const sw=model.swings.find(s=>s.game===g);if(!sw)return null;const before=[...sw.series].reverse().find(o=>o.t<at);if(!before)return {g,undecided:false,pre:true};
   const left=before.winnerRemaining+before.loserRemaining;const p=1-before.p;const doubt=left>0&&p>.08&&p<.92;return {g,before,p,left,undecided:doubt,decided:left===0}}).filter(Boolean);
  if(!rows.length)return '';
  const n=rows.filter(r=>r.undecided).length;
  const items=rows.map(r=>{if(r.pre)return '';const {g,before}=r;const lead=before.winnerScore>=before.loserScore?g.winner:g.loser,trail=lead===g.winner?g.loser:g.winner,ls=Math.max(before.winnerScore,before.loserScore),ts=Math.min(before.winnerScore,before.loserScore),leadP=lead===g.winner?r.p:1-r.p;
   const leftText=r.left?`${before.winnerRemaining?`${g.winner.short} ${before.winnerRemaining}`:''}${before.winnerRemaining&&before.loserRemaining?', ':''}${before.loserRemaining?`${g.loser.short} ${before.loserRemaining}`:''} still to play`:'nothing left to play';
   return `<li class="${r.undecided?'is-live':r.decided?'is-done':'is-safe'}"><span class="rc-sw-faces">${av(lead.short,'rc-av')}${av(trail.short,'rc-av')}</span><span class="rc-sw-copy"><b>${esc(lead.short)} ${pcFpts(ls)}, ${esc(trail.short)} ${pcFpts(ts)}</b><small>${r.decided?'already final':`${esc(lead.short)} ${hjRcPct(leadP)} to win, ${esc(leftText)}`}</small></span><span class="rc-sw-tag">${r.undecided?'in doubt':r.decided?'final':'safe'}</span></li>`}).join('');
  return `<div class="rc-sweat"><div class="rc-sweat-head"><b>Going into ${esc(label)}</b><span>${n} of ${rows.length} games still in doubt</span></div><ul>${items}</ul></div>`}).join('');
 return blocks?`<section class="rc-block"><h3 class="rc-h">Primetime sweat <small>what was still up for grabs at kickoff</small></h3>${blocks}</section>`:'';
}
/* ---- movers ---- */
function hjRcStandingsThrough(weeks,week){
 const rows=new Map();
 for(const w of weeks.filter(w=>w.week<=week))for(const r of w.scores){const o=rows.get(r.short)||{short:r.short,w:0,l:0,t:0,pf:0};if(r.pts>r.oppPts)o.w++;else if(r.pts<r.oppPts)o.l++;else o.t++;o.pf+=r.pts;rows.set(r.short,o)}
 const sorted=[...rows.values()].sort((a,b)=>b.w-a.w||b.pf-a.pf);sorted.forEach((r,i)=>r.rank=i+1);return sorted;
}
function hjRcMovers(model){
 const now=hjRcStandingsThrough(model.weeks,model.week);if(!now.length)return '';
 const prev=new Map(hjRcStandingsThrough(model.weeks,model.week-1).map(r=>[r.short,r]));
 const chips=now.map(r=>{const p=prev.get(r.short),move=p?p.rank-r.rank:0,m=model.managers.find(x=>x.short===r.short),streak=m?hjRecapStreak(m,model.weeks,model.week):null;
  return `<div class="rc-mover${move>0?' is-up':move<0?' is-down':''}"><span class="rc-mover-rank">${r.rank}</span><span class="manager-profile-trigger" data-manager="${esc(r.short)}" role="button" tabindex="0" aria-label="Open ${esc(r.short)} profile">${av(r.short,'rc-av-mid')}</span><b class="manager-profile-trigger" data-manager="${esc(r.short)}" role="button" tabindex="0">${esc(r.short)}</b><small>${r.w}–${r.l}${r.t?`–${r.t}`:''}</small><span class="rc-mover-move">${move>0?`▲${move}`:move<0?`▼${-move}`:'—'}</span>${streak&&streak.count>=2?`<span class="rc-mover-streak is-${streak.outcome.toLowerCase()}">${esc(streak.label)}</span>`:''}</div>`}).join('');
 return `<section class="rc-block"><h3 class="rc-h">Movers <small>standings after Week ${model.week}, change from last week</small></h3><div class="rc-movers">${chips}</div></section>`;
}
/* ---- position battles ---- */
function hjRcUnits(m){const u={};for(const pos of HJ_RC_POSITIONS)u[pos]=m.starters.filter(p=>p.pos===pos).reduce((n,p)=>n+p.points,0);return u}
function hjRcBattleStrip(g){
 const ua=hjRcUnits(g.a),ub=hjRcUnits(g.b);
 return `<div class="rc-pb-strip">${HJ_RC_POSITIONS.map(pos=>{const d=ua[pos]-ub[pos],cls=Math.abs(d)<.005?'is-tie':d>0?'is-a':'is-b';return `<span class="rc-pb-cell ${cls}" title="${esc(pos)}: ${esc(g.a.short)} ${ua[pos].toFixed(2)}, ${esc(g.b.short)} ${ub[pos].toFixed(2)}"><small>${pos==='D/ST'?'DST':pos}</small><b>${Math.abs(d)<.005?'even':hjRcSigned(Math.abs(d),1).replace('+','')}</b></span>`}).join('')}</div>`;
}
function hjRcBattles(model){
 const games=model.games.filter(g=>g.a.lineupComplete&&g.b.lineupComplete);if(!games.length)return '';
 const rows=games.map(g=>{const ua=hjRcUnits(g.a),ub=hjRcUnits(g.b),won=HJ_RC_POSITIONS.filter(p=>ua[p]>ub[p]+.005).length,lost=HJ_RC_POSITIONS.filter(p=>ub[p]>ua[p]+.005).length;
  return `<article class="rc-pb"><div class="rc-pb-side is-a"><span class="manager-profile-trigger" data-manager="${esc(g.a.short)}" role="button" tabindex="0">${av(g.a.short,'rc-av-mid')}</span><b>${esc(g.a.short)}</b><small>${won} of 6</small></div>${hjRcBattleStrip(g)}<div class="rc-pb-side is-b"><span class="manager-profile-trigger" data-manager="${esc(g.b.short)}" role="button" tabindex="0">${av(g.b.short,'rc-av-mid')}</span><b>${esc(g.b.short)}</b><small>${lost} of 6</small></div></article>`}).join('');
 return `<section class="rc-block"><h3 class="rc-h">Position battles <small>who won each spot, and by how much</small></h3><div class="rc-pbs">${rows}</div></section>`;
}
/* ---- best pickup, drop that bit ---- */
function hjRcPoolPlayer(model,id){
 const entry=(model.extra?.pool||[]).find(e=>String(hjPlayer(e).id)===String(id));if(entry){const p=hjRecapPlayer(entry,model.week);if(p.points!==null&&p.name)return {...p,proTeamId:p.stat?.proTeamId??hjPlayer(entry).proTeamId}}
 for(const m of model.managers){const p=[...m.starters,...m.bench].find(x=>x.id===String(id));if(p)return p}
 return null;
}
function hjRcManagerOfTeam(model,teamId){const t=(model.data?.teams||[]).find(t=>String(t.id)===String(teamId));return t?(hjMatchManager(t,model.data)||hjOwnerName(t,model.data)):''}
function hjRcPickups(model){
 const txs=(model.extra?.transactions||[]).filter(tx=>tx.status==='EXECUTED'&&['WAIVER','FREEAGENT'].includes(tx.type));if(!txs.length)return '';
 const adds=[],drops=[];
 for(const tx of txs)for(const item of tx.items||[]){const p=hjRcPoolPlayer(model,item.playerId);if(!p)continue;
  if(item.type==='ADD'){const who=hjRcManagerOfTeam(model,item.toTeamId||tx.teamId),m=model.managers.find(x=>x.short===who);adds.push({...p,who,started:!!m?.starters.some(x=>x.id===p.id),kind:tx.type})}
  if(item.type==='DROP'){const who=hjRcManagerOfTeam(model,item.fromTeamId||tx.teamId);const owner=model.managers.find(m=>[...m.starters,...m.bench].some(x=>x.id===p.id));drops.push({...p,who,now:owner?owner.short:'',nowStarted:!!owner?.starters.some(x=>x.id===p.id)})}}
 const best=[...adds].sort((a,b)=>b.points-a.points)[0],bite=[...drops].filter(d=>d.points>=8&&d.now!==d.who).sort((a,b)=>b.points-a.points)[0];
 if(!best&&!bite)return '';
 // Market value, when the price feed has loaded, sits with the player's team and position.
 const market=p=>{const row=window.HJMV?.ready?window.HJMV.lookup({id:p.id,name:p.name,position:p.pos}):null;return row?`<span class="rc-mv"><small>Market</small><b>${window.HJMV.fmt(row.value)}</b><em>${esc(row.position+row.positionRank)}</em></span>`:''};
 const row=(p,label,copy,tone)=>{const {attrs,photo}=hjRcHeadshot(p);return `<div class="rc-mini rc-pick ${tone}"><button type="button" class="rc-mini-photo pc-player-trigger" ${attrs}>${photo?`<img src="${esc(photo)}" alt="" loading="lazy" onerror="this.remove()">`:''}</button><div class="rc-mini-copy"><small class="rc-eyebrow">${esc(label)}</small><button type="button" class="rc-mini-name pc-player-trigger" ${attrs}>${esc(p.name)}</button><small>${esc(hjRcTeam(p.proTeamId))} <b>${esc(p.pos)}</b>${model.opponents[String(p.proTeamId)]?` ${esc(hjChVs(model.opponents[String(p.proTeamId)]))}`:''}</small><span class="rc-pick-copy">${copy}</span>${market(p)}</div><div class="rc-mini-stat"><b>${p.points.toFixed(1)}<small>pts</small></b></div></div>`};
 const bestHTML=best?row(best,'Best pickup',`${hjRcMgr(best.who)} ${best.kind==='WAIVER'?'claimed':'signed'} him this week${best.started?' and started him':', but left him on the bench'}`,'is-pos'):'';
 const biteHTML=bite?row(bite,'The drop that bit',`${hjRcMgr(bite.who)} cut him this week${bite.now?`; ${bite.nowStarted?'he started for':'he sits on the bench of'} ${hjRcMgr(bite.now)}`:'; he went unclaimed and scored anyway'}`,'is-neg'):'';
 return `<section class="rc-block"><h3 class="rc-h">Waiver wire <small>the add that paid off and the drop that hurt</small></h3>${bestHTML}${biteHTML}</section>`;
}
/* ---- out of character ---- */
function hjRcSpark(values,current,cls=''){
 if(values.length<2)return '';const w=160,h=44,l=3,r=3,top=5,bottom=5,min=Math.min(...values),max=Math.max(...values);
 const x=i=>l+i/(values.length-1)*(w-l-r),y=v=>top+(1-(v-min)/Math.max(1,max-min))*(h-top-bottom);
 const pts=values.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
 return `<svg class="rc-spark ${cls}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}"></polyline><circle cx="${x(values.length-1)}" cy="${y(current)}" r="4"></circle></svg>`;
}
function hjRcCharacter(model){
 const rows=model.managers.map(m=>{const prior=model.weeks.filter(w=>w.week<model.week).map(w=>w.scores.find(r=>r.short===m.short)).filter(Boolean);if(prior.length<2)return null;const avg=prior.reduce((n,r)=>n+r.pts,0)/prior.length;return {m,avg,diff:m.pts-avg,series:[...prior.map(r=>r.pts),m.pts]}}).filter(Boolean);
 if(!rows.length)return '';
 const up=[...rows].sort((a,b)=>b.diff-a.diff)[0],down=[...rows].sort((a,b)=>a.diff-b.diff)[0];
 const card=(r,tone)=>r?`<article class="rc-char ${tone}"><span class="manager-profile-trigger" data-manager="${esc(r.m.short)}" role="button" tabindex="0" aria-label="Open ${esc(r.m.short)} profile">${av(r.m.short,'rc-av-big')}</span><div class="rc-char-copy"><b>${esc(r.m.short)}'s ${pcFpts(r.m.pts)} was ${Math.abs(r.diff).toFixed(1)} ${r.diff>=0?'above':'below'} their average</b><small>${pcFpts(r.avg)} per week over the first ${r.series.length-1} week${r.series.length-1===1?'':'s'}</small>${hjRcSpark(r.series,r.m.pts,tone)}</div><strong>${hjRcSigned(r.diff,1)}</strong></article>`:'';
 return `<section class="rc-block"><h3 class="rc-h">Out of character <small>biggest swings from a manager's own season average</small></h3><div class="rc-chars">${card(up,'is-pos')}${down&&down!==up&&down.diff<0?card(down,'is-neg'):''}</div></section>`;
}
function hjRcGameFinal(game,data){
 const week=Number(game.matchupPeriodId);
 return !!(game.home?.teamId&&game.away?.teamId&&['HOME','AWAY','TIE'].includes(game.winner)&&hjSideScore(game.home,week)!==null&&hjSideScore(game.away,week)!==null);
}
function hjRecapHTML(data){
 const weeks=hjCompletedWeeks(data),chosen=weeks.find(w=>w.week===HJ_DATA.recapWeek)||weeks.at(-1);
 if(!chosen)return '<div class="hq-module-body hj-recap"><div class="rc"><p class="hj-recap-empty">The first recap lands when this week’s matchups are final.</p></div></div>';
 const {week}=chosen;
 if(HJ_HQ_STATE.activeTab==='recap'&&!HJ_RECAP_EXTRA.jobs.has(week)&&hjRecapNeedsExtra(chosen))setTimeout(()=>hjRecapLoadExtra(chosen),0);
 // The panel's generic head (title plus sticky-note week) duplicates this header; drop it once the tab is on screen.
 requestAnimationFrame(()=>document.querySelectorAll('#hq-panel-recap .hq-module-head').forEach(h=>h.remove()));
 const model=hjRcModel(chosen,weeks,data);
 const select=`<label class="rc-week"><span class="sr-only">Recap week</span><select data-hj-recap-week aria-label="Recap week">${[...weeks].reverse().map(w=>`<option value="${w.week}"${w.week===week?' selected':''}>Week ${w.week}</option>`).join('')}</select></label>`;
 const head=`<div class="rc-head"><div><span class="rc-eyebrow">The weekly edition</span><h2>Week ${week} Recap</h2><p class="rc-sub">${model.managers.length} teams · league average ${pcFpts(model.avg)}${model.complete?'':' · some lineups still syncing'}</p></div>${select}</div>`;
 // The .rc wrapper sits inside the patched body so live refreshes keep the recap's own styling.
 return `<div class="hq-module-body hj-recap"><div class="rc">${head}${hjRcPodium(model)}${hjRcCellar(model)}${hjRcAwards(model)}${hjRcRecordAnnouncements(model)}${hjRcMovers(model)}${hjRcPerformance(model)}${hjRcBattles(model)}${hjRcSlipped(model)}${hjRcSweat(model)}${hjRcCardRow('Players of the week','top scorer at each position',model.leaders)}${hjRcCardRow('Benchwarmers of the week','best scores left on a bench',model.benchers)}${hjRcPickups(model)}${hjRcFalseStarters(model)}${hjRcChanger(model)}${hjRcCharacter(model)}${hjRcStories(chosen,weeks,model)}</div></div>`;
}
