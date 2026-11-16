/* League HQ › Rosters: the clipped "Week N matchup" sticky note (owner redesign, Nov 16).
 *
 * The two managers across from each other, like the Matchup tab: the roster's own manager on the left, the
 * opponent on the right, everything centered, a hand-drawn marker line between them broken by a handwritten
 * "VS" level with the names; the "Week N matchup" label and the line under it are handwritten in marker too;
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
// The label, the rule under it, the divider and "VS" look written on the note with a black permanent marker
// (owner, Nov 16): the text in the Permanent Marker font, the lines as slightly wobbly strokes with round ends.
// The lines stretch to the space they fill; the stroke width stays the same.
const HJ_MNOTE_MARKER='fill="none" stroke="#1d1d1f" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"';
const HJ_MNOTE_LINE_TOP=`<span class="hj-mnote-line is-top" aria-hidden="true"><svg viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true"><path ${HJ_MNOTE_MARKER} stroke-width="2.3" d="M5.6 3 C4.6 22 6.3 44 4.9 63 C4.2 76 5.8 88 5 97"/></svg></span>`;
const HJ_MNOTE_LINE_BOTTOM=`<span class="hj-mnote-line is-bottom" aria-hidden="true"><svg viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true"><path ${HJ_MNOTE_MARKER} stroke-width="2.3" d="M4.6 2 C5.7 15 4.1 31 5.3 47 C6.2 61 4.4 78 5.4 90 C5.6 94 5 96.5 4.7 98"/></svg></span>`;
// The rule under the label: a hand-drawn horizontal marker line across the note.
const HJ_MNOTE_RULE=`<span class="hj-mnote-rule" aria-hidden="true"><svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path ${HJ_MNOTE_MARKER} stroke-width="2" d="M1.2 6.4 C9 5.1 18 3.6 30 4.6 C42 5.7 50 6.9 62 5.4 C73 4 82 3.2 91 4.3 C94.5 4.7 97 4.1 98.8 3.3"/></svg></span>`;
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
 return `<button class="league-matchup-score hj-mnote${o.live?' has-actual':''}" type="button" data-hq-open-matchup="${esc(o.teamId)}" aria-label="Open Week ${o.week} matchup in Matchup Center"><span class="hj-mnote-in"><span class="hj-mnote-label">Week ${o.week} matchup</span>${HJ_MNOTE_RULE}<span class="hj-mnote-vs">${side(o.ownName,o.ownActual,o.ownProjected,o.ownVegas,o.ownAdjusted,o.ownFinal,o.teamId,false)}${HJ_MNOTE_LINE_TOP}<span class="hj-mnote-vs-text">VS</span>${HJ_MNOTE_LINE_BOTTOM}${side(o.oppName,o.oppActual,o.oppProjected,o.oppVegas,o.oppAdjusted,o.oppFinal,o.oppId,true)}</span></span></button>`;
}

