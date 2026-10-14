/* Render team totals through the same performance rules as individual players. */
export function prepareTeamScoreDisplay(html){
 const helper=String.raw`

function hjRosterMatchupNote(original,manager,opponent,week,scoreLine,projection,live,final){
 const scores=scoreLine.includes(' – ')?scoreLine.replace(/\s+projected$/,'').split(' – '):['—','—'];
 const side=(name,score,which)=>'<span class="hj-note-side '+which+'"><span class="hj-note-portrait">'+(name?'<img src="'+esc(managerAvatarSrc(name))+'" alt="" loading="lazy" decoding="async">':'')+'</span><span class="hj-note-name">'+esc(name||'TBD')+'</span><strong class="hj-note-score">'+score+'</strong></span>';
 const face='<span class="hj-note-face"><span class="hj-note-layout"><span class="hj-note-heading"><span>Week '+week+'</span><span class="hj-note-status">'+(final?'Final':live?'Live':'Projected')+'</span></span><span class="hj-note-contest">'+side(manager,scores[0],'is-own')+'<span class="hj-note-vs">VS</span>'+side(opponent,scores[1],'is-opponent')+'</span><span class="hj-note-projections">'+projection+'</span></span></span>';
 // Keep the original responsive footprint as an inert measuring layer.
 // The new face uses that exact space; it cannot grow the note or change its hit target.
 return original.replace('<span class="league-matchup-team">','<span class="league-matchup-team hj-note-size" aria-hidden="true" inert>').replace('</button>',face+'</button>');
}
function hjTeamTotalAttrs(actual,original){
 return hjPerformanceAttrs(actual,original)||'style="color:var(--navy,#16354c)!important"';
}
function hjRosterTotalHTML(total,actual,status,selection,week,mode,teamId,original){
 const data=HJ_LEAGUE_STATE.data;
 const matchup=mode==='actual'&&Number(week)===Number(hjCurrentWeek(data))?hjCurrentMatchup(teamId,data):null;
 const side=matchup?.side;
 const baseline=hjNumber(side?.totalProjectedPoints)??original;
 const score=actual?(hjSideScore(side,week)??total):total;
 const adjusted=actual?hjAdjustedEspnProjection(side):null;
 if(!Number.isFinite(score))return '';
 const projection=Number.isFinite(adjusted)?'<small class="hq-adjusted-projection" title="Live adjusted ESPN projection" aria-label="Live ESPN projection '+pcFpts(adjusted)+'">'+pcFpts(adjusted)+'</small>':'';
 return '<span class="league-roster-lineup-head-total'+(actual?' has-actual':'')+'">'+status+'<span class="hq-live-score-pair"><strong class="hq-match-team-score'+(actual?' is-actual':'')+'" '+(actual?hjTeamTotalAttrs(score,baseline):'')+'>'+pcFpts(score)+'</strong>'+projection+'</span></span>';
}
`;
 html=html.replace('function hjRosterSelectedGroupHTML(label,selection,plan,week,season,mode){',()=>helper+'\nfunction hjRosterSelectedGroupHTML(label,selection,plan,week,season,mode,teamId){');
 html=html.replaceAll("selection,plan,week,rosterSeason,mode)","selection,plan,week,rosterSeason,mode,team.id)");
 html=html.replaceAll("selection,plan,week,season,'actual')","selection,plan,week,season,'actual',team.id)");
 html=html.replace(/  const totalHTML=Number\.isFinite\(total\)\?`<span class="league-roster-lineup-head-total[^\n]+/,"  const totalHTML=hjRosterTotalHTML(total,actual,status,selection,week,mode,teamId,totals?.espn);");
 html=html.replaceAll('<strong class="hq-match-team-score${live?\' is-actual\':\'\'}">','<strong class="hq-match-team-score${live?\' is-actual\':\'\'}" ${live?hjTeamTotalAttrs(score,espn):\'\'}>');
 // Color the two actual scores separately in the roster matchup note.
 html=html.replace('`${pcFpts(ownActual)} – ${pcFpts(oppActual)}`','`<span ${hjTeamTotalAttrs(ownActual,hjNumber(matchup?.side?.totalProjectedPoints))}>${pcFpts(ownActual)}</span> – <span ${hjTeamTotalAttrs(oppActual,hjNumber(matchup?.opponent?.totalProjectedPoints))}>${pcFpts(oppActual)}</span>`');

 // Replace the visible note in both roster paths while preserving its exact native size.
 const notePattern=/const matchupHTML=matchup\?(`<button class="league-matchup-score[^]*?<\/button>`):'';/g;
 let noteCount=0;
 html=html.replace(notePattern,(source,original)=>{
  noteCount++;
  const live=source.includes('matchupLive');
  return 'const matchupHTML=matchup?hjRosterMatchupNote('+original+',manager,opponentName,matchup.week,scoreLine,'+(live?'projectionLine,matchupLive,matchupFinal':'projectionCompare,hasScore,false')+"):'';";
 });
 if(noteCount!==2)throw Error('Roster matchup note markup changed');
 html=html.replace('</head>',`<style id="hj-roster-matchup-versus">
.league-matchup-score{position:relative}
#league-hq .league-roster-head .hj-note-size{visibility:hidden;pointer-events:none;user-select:none}
#league-hq .league-roster-head .hj-note-face{
 position:absolute;inset:8px 16px 12px 24px;container-type:size;
 color:var(--navy,#16354c);font-family:var(--sans);text-align:center;
}
.hj-note-layout{display:grid;grid-template-rows:11px minmax(0,1fr) 12px;gap:3px;height:100%;min-width:0}
.hj-note-heading{display:flex;align-items:center;justify-content:center;gap:6px;font-size:clamp(7px,2.8cqw,9px);line-height:1;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#76633b}
.hj-note-status::before{content:"·";margin-right:6px}
.hj-note-contest{display:grid;grid-template-columns:minmax(0,1fr) 22px minmax(0,1fr);align-items:stretch;min-height:0}
.hj-note-side{display:grid;grid-template-rows:minmax(0,1fr) auto auto;gap:2px;align-items:center;justify-items:center;min-width:0;min-height:0}
.hj-note-portrait{display:flex;align-items:center;justify-content:center;min-height:0;height:100%;width:100%}
.hj-note-portrait img{display:block;height:min(100%,34px);width:auto;max-width:34px;aspect-ratio:1;box-sizing:border-box;border:1.5px solid #b88a2a;border-radius:50%;background:#fffdf7;object-fit:cover}
.hj-note-name{font-size:clamp(7px,3cqw,10px);font-weight:800;line-height:1.1;letter-spacing:.025em;white-space:nowrap}
.hj-note-score{font-size:clamp(12px,7.5cqw,20px);font-weight:800;line-height:1;letter-spacing:-.025em;font-variant-numeric:tabular-nums;white-space:nowrap}
.hj-note-vs{align-self:center;font-size:9px;font-weight:800;letter-spacing:.08em;color:#99701d}
#league-hq .hj-note-projections .league-matchup-projections{margin:0!important;font-size:clamp(7px,3cqw,10px)!important;line-height:12px!important;color:var(--navy,#16354c)!important;letter-spacing:0!important}
#league-hq .hj-note-projections .league-matchup-projections b{margin:0!important;font-size:inherit!important;line-height:inherit!important;color:inherit!important}
@container (min-width:220px){
 .hj-note-side{grid-template-columns:38px minmax(0,1fr);grid-template-rows:1fr 1fr;column-gap:7px;row-gap:1px;justify-items:start;max-width:128px;width:100%;justify-self:center}
 .hj-note-side.is-opponent{grid-template-columns:minmax(0,1fr) 38px;justify-items:end}
 .hj-note-portrait{grid-row:1 / 3;grid-column:1}
 .hj-note-side.is-opponent .hj-note-portrait{grid-column:2}
 .hj-note-portrait img{height:min(100%,38px);max-width:38px}
 .hj-note-name{align-self:end;grid-column:2;grid-row:1}
 .hj-note-score{align-self:start;grid-column:2;grid-row:2}
 .hj-note-side.is-opponent .hj-note-name,.hj-note-side.is-opponent .hj-note-score{grid-column:1}
}
</style></head>`);
 return html;
}
