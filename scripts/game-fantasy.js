/* Fantasy points per play, in this league's scoring (Nov 2, 2026). Used by the Game Center (game-center.js).
 *
 * window.hjGameFantasy.playPoints(play, ctx) -> {players:[{id, pts, parts:[label]}], dst:{teamId: pts}}
 *   play  an ESPN core play (sports.core.api.espn.com .../plays): type, text, statYardage, participants
 *         [{athlete:{$ref}, type:'passer'|'receiver'|'rusher'|'kicker'|...}], start.team, team.
 *   ctx   {pos(id) -> ESPN position id (1 QB, 2 RB, 3 WR, 4 TE, 5 K) or 0 when not a fantasy player,
 *          teams:[awayId, homeId]}
 * Points come from the league's ESPN scoring items (statId -> points, with per-position overrides, e.g. TE
 * catches 1.5). The league's settings are read from the synced league data when present; the copy below is
 * the league's settings as of Nov 2, 2026.
 * Not per play: D/ST points-allowed and yards-allowed tiers (they depend on the final score); the box score
 * shows ESPN's league total for every player and D/ST.
 */
(function(root){
 const LEAGUE_ITEMS=[[3,0.04],[4,4],[19,2],[20,-2],[24,0.1],[25,6],[26,2],[42,0,{1:.1,2:.1,3:.1,4:.1,15:.1}],[43,0,{1:6,2:6,3:6,4:6,15:6}],[44,0,{1:2,2:2,3:2,4:2,15:2}],[53,0,{1:1,2:1,3:1,4:1.5,15:1}],[63,6],[72,-2],[77,4],[80,3],[85,-1],[86,1],[88,-1],[93,6,{16:6}],[95,0,{16:2}],[96,0,{16:2}],[97,0,{16:2}],[98,0,{16:2}],[99,0,{16:2}],[101,6,{16:6}],[102,6,{16:6}],[103,6,{16:6}],[104,6,{16:6}],[198,5],[201,6],[206,2,{16:2}]];
 let items=null;
 function scoring(){
  const live=root.HJ_LEAGUE_STATE?.data?.settings?.scoringSettings?.scoringItems;
  if(items&&items.src===live)return items;
  const map=new Map();
  if(Array.isArray(live)&&live.length)for(const i of live)map.set(Number(i.statId),{points:Number(i.points)||0,over:i.pointsOverrides||{}});
  else for(const [id,points,over] of LEAGUE_ITEMS)map.set(id,{points,over:over||{}});
  items={src:live,map};return items;
 }
 // Points for one unit of an ESPN stat at a position (16 = D/ST).
 function pts(statId,posId){const i=scoring().map.get(statId);if(!i)return 0;const o=i.over?.[String(posId)];return Number.isFinite(Number(o))?Number(o):i.points}
 const idOf=ref=>{const m=/\/athletes\/(-?\d+)/.exec(ref||'');return m?m[1]:''};
 const teamOf=ref=>{const m=/\/teams\/(\d+)/.exec(ref||'');return m?m[1]:''};
 const round=v=>Math.round(v*100)/100;
 // Yards for the passer and receiver, and for the rusher: the gain written in the play (ESPN's statYardage adds
 // penalty yards enforced after the play: an 8-yard catch with a hold read -16). A pass after a recovered
 // fumbled snap is read from the pass itself ("FUMBLES, and recovers ... pass deep left to D.Douglas ... for 26").
 function playText(play){let text=String(play.text||'');const rev=text.lastIndexOf('REVERSED.');if(rev>=0)text=text.slice(rev+9);return text.split(/PENALTY/i)[0]}
 const yardsIn=m=>m?(m[1]!==undefined?Number(m[1]):0):null;
 function passYards(play){const m=/\bpass\b(?! incomplete).*?\bto\b.*?(?:for (-?\d+) yards?|for no gain)/i.exec(playText(play));const y=yardsIn(m);if(y!==null)return spotLimited(play,y);const s=Number(play.statYardage);return Number.isFinite(s)?s:0}
 // A foul enforced at a spot inside the run (offensive holding) credits the runner only to that spot:
 // "O.Gordon up the middle to NE 5 for 15 yards. PENALTY ... Offensive Holding, enforced at NE 14" is 6 yards.
 function spotLimited(play,yards){
  const text=String(play.text||''),m=/PENALTY[^]*?enforced at (?:([A-Z]{2,3}) )?(\d{1,2})(?!.*No Play)/i.exec(text);
  const start=Number(play.start?.yardsToEndzone),pt=/^([A-Z]{2,3}) (\d{1,2})$/.exec(String(play.start?.possessionText||'').trim());
  if(!m||!Number.isFinite(start)||/declined/i.test(m[0].split('enforced')[0].split(',').pop()||''))return yards;
  const n=Number(m[2]);let spot;
  if(n===50)spot=50;else{if(!m[1]||!pt)return yards;const ownSideIsFar=Number(pt[2])===start&&start!==50;const sameSide=m[1].toUpperCase()===pt[1];spot=sameSide===ownSideIsFar?n:100-n}
  const end=start-yards;return spot>Math.min(start,end)&&spot<Math.max(start,end)?start-spot:yards;
 }
 function rushYards(play){const m=/for (-?\d+) yards?|for no gain/i.exec(playText(play).split(/FUMBLES/i)[0]);const y=yardsIn(m);if(y!==null)return spotLimited(play,y);const s=Number(play.statYardage);return Number.isFinite(s)?s:0}
 function fgPoints(text){
  const m=/(\d+)\s*(?:yard|yd)s?\s*field goal/i.exec(text||'');const d=m?Number(m[1]):0;
  return d>=60?pts(201,5):d>=50?pts(198,5):d>=40?pts(77,5):pts(80,5);
 }
 function playPoints(play,ctx){
  const out=new Map(),dst={},type=String(play?.type?.text||''),text=String(play?.text||''),
   add=(id,p,label)=>{if(!id||!p)return;const pos=ctx.pos(id);if(!pos)return;const r=out.get(id)||{id,pts:0,parts:[]};r.pts=round(r.pts+p);r.parts.push(label);out.set(id,r)},
   addDst=(team,p,label)=>{if(!team||!p)return;const r=dst[team]||{pts:0,parts:[]};r.pts=round(r.pts+p);r.parts.push(label);dst[team]=r};
  if(/^Penalty$/i.test(type)||/No Play\.?\s*$/i.test(text)&&!/TOUCHDOWN|field goal is GOOD/i.test(text))return {players:[],dst:{}};
  const parts=play.participants||[],who=role=>parts.filter(p=>p.type===role).map(p=>idOf(p.athlete?.$ref)),one=role=>who(role)[0]||'';
  const offense=teamOf(play.start?.team?.$ref)||teamOf(play.team?.$ref),end=teamOf(play.team?.$ref),other=t=>(ctx.teams||[]).find(x=>String(x)!==String(t))||'',defense=other(offense);
  const passer=one('passer'),receiver=one('receiver'),rusher=one('rusher'),td=/TOUCHDOWN/i.test(text)||/Touchdown/i.test(type),kick=/^(Kickoff|Punt)/i.test(type);
  const complete=/^(Pass Reception|Passing Touchdown)$/i.test(type)||(/Fumble/i.test(type)&&passer&&receiver&&!/pass incomplete|is incomplete|INTERCEPTED/i.test(playText(play)));
  const pos=id=>ctx.pos(id);
  if(complete&&passer&&receiver){
   const yards=passYards(play);
   add(passer,yards*pts(3,pos(passer)),`${yards} pass yds`);
   add(receiver,pts(53,pos(receiver))+yards*pts(42,pos(receiver)),`1 rec, ${yards} yds`);
   if(/^Passing Touchdown$/i.test(type)){add(passer,pts(4,pos(passer)),'pass TD');add(receiver,pts(43,pos(receiver)),'TD')}
  }
  if(rusher&&(/^(Rush|Rushing Touchdown)$/i.test(type)||(/Fumble/i.test(type)&&!passer))){
   const yards=rushYards(play);add(rusher,yards*pts(24,pos(rusher)),`${yards} rush yds`);if(/^Rushing Touchdown$/i.test(type))add(rusher,pts(25,pos(rusher)),'TD');
  }
  if(/Interception/i.test(type)&&passer){add(passer,pts(20,pos(passer)),'INT');addDst(end,pts(95,16),'INT');if(/Touchdown/i.test(type))addDst(end,pts(103,16),'INT return TD')}
  if(/^Sack/i.test(type))addDst(defense,pts(99,16),'sack');
  if(/Fumble Return Touchdown/i.test(type)&&String(end)!==String(offense)&&!one('fumbler')){addDst(end,pts(96,16)+pts(104,16),'fumble return TD')}
  // Fumbles: lost when the other team has the ball at the end of the play (the fumbler's team is the offense,
  // or the receiving team on a kickoff or punt). Recovered by his own team in the end zone: a TD for the recoverer.
  const fumbler=one('fumbler');
  if(/Fumble Return Touchdown/i.test(type)&&String(end)===String(offense)){const r=one('recoverer');add(r,pts(63,pos(r)),'fumble recovery TD')}
  else if(fumbler&&!/Interception/i.test(type)){
   const fumbleTeam=kick?other(offense):offense,lost=/Opp Fumble Recovery|Fumble Recovery \(Opponent\)/i.test(type)||(end&&fumbleTeam&&String(end)!==String(fumbleTeam));
   if(lost){add(fumbler,pts(72,pos(fumbler)),'fumble lost');addDst(end,pts(96,16),'fumble recovery');if(/Fumble Return Touchdown/i.test(type))addDst(end,pts(104,16),'fumble return TD')}
  }
  if(/^Safety$/i.test(type))addDst(defense,pts(98,16),'safety');
  if(/^Blocked (Field Goal|Punt)/i.test(type))addDst(end,pts(97,16),'blocked kick');
  if(/^(Kickoff|Punt) Return Touchdown$/i.test(type)){const r=one('returner');const stat=/Punt/i.test(type)?102:101;add(r,pts(stat,pos(r)),'return TD');addDst(end,pts(stat,16),'return TD')}
  if(/^Blocked (Field Goal|Punt).*Touchdown$/i.test(type))addDst(end,pts(93,16),'blocked kick TD');
  // Kicking
  if(/^Field Goal Good$/i.test(type)){const k=one('kicker');add(k,fgPoints(text),'FG')}
  if(/^(Field Goal Missed|Blocked Field Goal)/i.test(type)){const k=one('kicker');add(k,pts(85,pos(k)),'missed FG')}
  if(td){
   if(/extra point is GOOD|\([^)]*\bKick\)/i.test(text)){const k=one('kicker');add(k,pts(86,pos(k)),'PAT')}
   else if(/extra point is (No Good|Blocked)|extra point.*(missed|blocked)/i.test(text)){const k=one('kicker');add(k,pts(88,pos(k)),'missed PAT')}
   const two=/TWO-POINT CONVERSION ATTEMPT\.(.*?)ATTEMPT SUCCEEDS/i.exec(text);
   if(two){const p2=one('patPasser'),scorer=one('patScorer'),r2=one('patRusher');
    if(p2){add(p2,pts(19,pos(p2)),'2-pt pass');add(scorer,pts(44,pos(scorer)),'2-pt catch')}
    else add(r2||scorer,pts(26,pos(r2||scorer)),'2-pt run')}
  }
  return {players:[...out.values()],dst};
 }
 root.hjGameFantasy={playPoints,pts,idOf,teamOf};
})(typeof window!=='undefined'?window:globalThis);
