/* League HQ › Rosters: the clipped "Week N matchup" sticky note (owner redesign, Nov 16).
 *
 * The two managers across from each other, like the Matchup tab: the roster's own manager on the left, the
 * opponent on the right, everything centered, a grey line between them broken by "VS" level with the names;
 * each side with avatar, name and score. The score is colored the way the Matchup tab
 * colors it (hjTeamTotalAttrs: ESPN's live projected finish, or the final score, against ESPN's original
 * projection). ESPN's live projection sits next to the score (toward the middle) in small grey italics, final
 * games included; the original projection (E, tap for Vegas) sits under the score. Before kickoff the score
 * spot shows that original E/V projection instead. No LIVE/FINAL tag.
 *
 * prepare-site.mjs (prepareMatchupNote) inserts this before the roster view renderer and has the note call it,
 * so it exists before the first render. styles/matchup-note.css lays it out; the note sits beside the team photo
 * on desktop and tablets and under the business card on phones, so every size is a container query on the note.
 */
function hjMatchupNoteHTML(o){
 const fmt=value=>Number.isFinite(value)?pcFpts(value):'—';
 const side=(name,actual,original,vegas,adjusted,final,raw,away)=>{
  const live=o.live,key=`roster-note:${o.week}:${raw}:original`;
  const attrs=live&&typeof hjTeamTotalAttrs==='function'?hjTeamTotalAttrs(actual,original,adjusted,final):'';
  const score=live?`<strong class="hj-mnote-score" ${attrs}>${fmt(actual)}</strong>`:`<strong class="hj-mnote-score is-projected">${hjProjectionFlipHTML(original,vegas,key)}</strong>`;
  const liveProj=live&&Number.isFinite(adjusted)?`<small class="hj-mnote-live" title="Live ESPN projection" aria-label="Live ESPN projection ${fmt(adjusted)}">${fmt(adjusted)}</small>`:'';
  const orig=live?`<span class="hj-mnote-orig">${hjProjectionFlipHTML(original,vegas,key)}</span>`:'';
  return `<span class="hj-mnote-side${away?' is-away':''}">${name?av(name,'hj-mnote-av'):'<span class="hj-mnote-av is-empty"></span>'}<b class="hj-mnote-name">${esc(name||'TBD')}</b><span class="hj-mnote-pts">${score}${liveProj}</span>${orig}</span>`;
 };
 return `<button class="league-matchup-score hj-mnote${o.live?' has-actual':''}" type="button" data-hq-open-matchup="${esc(o.teamId)}" aria-label="Open Week ${o.week} matchup in Matchup Center"><span class="hj-mnote-in"><span class="hj-mnote-label">Week ${o.week} matchup</span><span class="hj-mnote-vs">${side(o.ownName,o.ownActual,o.ownProjected,o.ownVegas,o.ownAdjusted,o.ownFinal,o.teamId,false)}<i class="hj-mnote-line is-top" aria-hidden="true"></i><span class="hj-mnote-vs-text" aria-hidden="true">VS</span><i class="hj-mnote-line is-bottom" aria-hidden="true"></i>${side(o.oppName,o.oppActual,o.oppProjected,o.oppVegas,o.oppAdjusted,o.oppFinal,o.oppId,true)}</span></span></button>`;
}
