import {prepareDepthRefresh} from './prepare-depth-refresh.mjs';
import {preparePlayerHistory} from './prepare-player-history.mjs';
import {preparePerfectAwards} from './prepare-perfect-awards.mjs';
import {prepareProfileDetails} from './prepare-profile-details.mjs';
import {prepareNestedCards} from './prepare-nested-cards.mjs';
import {prepareManagerHero} from './prepare-manager-hero.mjs';
import {prepareTeamScoreDisplay} from './prepare-team-score-display.mjs';
const livePossession=readFileSync(new URL('./live-possession.js',import.meta.url),'utf8');
import {prepareProfileScoreColors} from './prepare-profile-score-colors.mjs';
import {preparePffReliability} from './prepare-pff-reliability.mjs';
import {prepareCardGestures} from './prepare-card-gestures.mjs';
import {prepareManagerAvatars} from './prepare-manager-avatars.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {extractSiteArtwork,extractSiteMedia,extractScriptImages} from './site-artwork.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Give each Perfect Lineup stylesheet revision a fresh browser/CDN cache key.
const perfectLineupVersion=createHash('sha256').update(readFileSync(new URL('../styles/perfect-lineup.css',import.meta.url))).digest('hex').slice(0,12);
const seasonChallengesVersion=createHash('sha256').update(readFileSync(new URL('../styles/season-challenges.css',import.meta.url))).digest('hex').slice(0,12);
import {prepareDefenseFantasyRanks} from './prepare-defense-fantasy-ranks.mjs';
import {preparePlayerStatBars} from './prepare-player-stat-bars.mjs';
import {prepareLiveDisplay} from './prepare-live-display.mjs';
import {prepareRenderStability} from './prepare-render-stability.mjs';
import {prepareZoomDiagnostics} from './prepare-zoom-diagnostics.mjs';
import {preparePhoneMemory} from './prepare-phone-memory.mjs';
const playerSearch=readFileSync(new URL('./player-search.js',import.meta.url),'utf8');
const playerNews=readFileSync(new URL('./player-news.js',import.meta.url),'utf8');
const recapLoader=readFileSync(new URL('./recap-loader.js',import.meta.url),'utf8');
const wireInteraction=readFileSync(new URL('./wire-interaction.js',import.meta.url),'utf8');
const newsSpin=readFileSync(new URL('./news-spin.js',import.meta.url),'utf8');
const recordEngine=readFileSync(new URL('./record-book-engine.js',import.meta.url),'utf8');
const recordLive=readFileSync(new URL('./record-book-live.js',import.meta.url),'utf8');
const completedResults=['completed-results.js','completed-results-live.js'].map(file=>readFileSync(new URL(file,import.meta.url),'utf8')).join('\n');
const directLinks=readFileSync(new URL('./direct-links.js',import.meta.url),'utf8');
const bannerRenderers=readFileSync(new URL('./banner-renderers.js',import.meta.url),'utf8');
const projectionSummary=readFileSync(new URL('./projection-summary.js',import.meta.url),'utf8');
const matchupHistorySeed=readFileSync(new URL('../data/matchup-history.json',import.meta.url),'utf8').replaceAll('<','\\u003c');
const matchupHistory=readFileSync(new URL('./matchup-history.js',import.meta.url),'utf8');
const futureMatchups=readFileSync(new URL('./future-matchups.js',import.meta.url),'utf8');
const matchupWeek=readFileSync(new URL('./matchup-week.js',import.meta.url),'utf8');
const wirePriorities=readFileSync(new URL('./wire-priorities.js',import.meta.url),'utf8');
const wireLive=readFileSync(new URL('./wire-live.js',import.meta.url),'utf8');
const layoutGuard=readFileSync(new URL('./layout-guard.js',import.meta.url),'utf8');
const recapScript=readFileSync(new URL('./recap-live.js',import.meta.url),'utf8');
const recapExtras=readFileSync(new URL('./recap-extras.js',import.meta.url),'utf8');
const perfMemo=readFileSync(new URL('./perf-memo.js',import.meta.url),'utf8');
const perfLate=readFileSync(new URL('./perf-late.js',import.meta.url),'utf8');
const playersToolbar=readFileSync(new URL('./players-toolbar.js',import.meta.url),'utf8');
const managerDraftAvatars=readFileSync(new URL('./manager-draft-avatars.js',import.meta.url),'utf8');
const playerAdvancedData=readFileSync(new URL('./player-advanced-data.js',import.meta.url),'utf8');
const liveScoresFast=readFileSync(new URL('./live-scores-fast.js',import.meta.url),'utf8');
const standingsScript=readFileSync(new URL('./standings-live.js',import.meta.url),'utf8');
const playerValue=readFileSync(new URL('./player-value.js',import.meta.url),'utf8');
const tradeDesk=readFileSync(new URL('./trade-desk.js',import.meta.url),'utf8');
const byeStatus=readFileSync(new URL('./bye-status.js',import.meta.url),'utf8');
const teamPhotoScript=readFileSync(new URL('./team-photos.js',import.meta.url),'utf8');
const teamPhotoAssets=readFileSync(new URL('../assets/team-photos/catalog.json',import.meta.url),'utf8');
const dstMascots=readFileSync(new URL('../assets/team-photos/mascots.json',import.meta.url),'utf8');
const degenerateBetStyle=readFileSync(new URL('../styles/degenerate-side-bet.css',import.meta.url),'utf8');
const rosterWeeks=readFileSync(new URL('./roster-weeks.js',import.meta.url),'utf8');
const rosterWeeksStyle=readFileSync(new URL('../styles/roster-weeks.css',import.meta.url),'utf8');
const sideBets=['side-bets.js','free-throw-bet.js','degenerate-side-bet.js'].map(file=>readFileSync(new URL(file,import.meta.url),'utf8')).join('\n');
const challengeScripts=['challenge-engine.js','perfect-lineup.js','challenge-live.js'].map(file=>readFileSync(new URL(file,import.meta.url),'utf8')).join('\n');
function replaceOnce(html,pattern,replacement){
 if([...html.matchAll(pattern)].length!==1)throw Error('Source markup changed; review site preparation');
 return html.replace(pattern,()=>replacement);
}
const folderArtwork=readFileSync(new URL('./folder-artwork.js',import.meta.url),'utf8');
export function prepareSite(html){
 // Cache the player-name normalizers right where they are defined (see scripts/perf-memo.js).
 html=html.replace(/(function pcNameMatch\(a,b\)\{[^\n]*\}\n)/,(line)=>line+perfMemo+'\n');
 html=html.replace('</head>',()=>'<style>'+degenerateBetStyle+rosterWeeksStyle+'</style></head>');
 html=prepareDepthRefresh(html);
 // Legacy template insertions left literal "\\n" text between these blocks.
 // Normalize only those three separators so they cannot render below the footer.
 html=html.replace(/(<\/script>)\s*\\n\s*(?=<(?:script id="hj-projection-math-audit-script"|style id="hj-strength-v4-styles"|script id="hj-strength-v4-fast-expand"))/g,'$1\n');
 html=preparePerfectAwards(html);
 html=prepareProfileDetails(html);
 html=prepareNestedCards(html);
 html=prepareManagerHero(html);

 html=replaceOnce(html,/function nflGameFromEspn\(event,period\)\{/g,livePossession+'\nfunction nflGameFromEspn(event,period){');
 html=replaceOnce(html,/const data=await fetchEspnJson\(nflScheduleUrl\(requested\)\);/g,'const data=await hjFetchPossessionScoreboard(nflScheduleUrl(requested));');
 html=replaceOnce(html,/if\(!games.length\)throw new Error\('ESPN returned no games'\);/g,"if(!games.length)throw new Error('ESPN returned no games');\n    window.hjUpdateLivePossession?.(data,period);");
 // Phone rendering load: compositor-only loops, quiet countdown, sized logo.
 html=prepareRenderStability(html);
 // Opt-in (?hjdiag=...) physical-iPhone crash bisection; inert otherwise.
 html=prepareZoomDiagnostics(html);
 // Shared decorators run after live DOM updates. Unchanged projection keys and
 // already-correct fonts must not churn hundreds of nodes during interaction.
 html=replaceOnce(html,/;chip\.dataset\.projKey=key;/g,';if(chip.dataset.projKey!==key)chip.dataset.projKey=key;');
 const fontPass=html.match(/function fonts\(\)\{[^]*?\n \}/g);
 if(fontPass?.length!==1)throw Error('Font decorator source changed');
 html=html.replace(fontPass[0],fontPass[0].replace("if(el.closest(","if(el.style.getPropertyValue('font-family')==='var(--sans)')return;\n   if(el.closest("));
 html=replaceOnce(html,/<script id="hj-folder-stack-script">[^]*?<\/script>/g,
  '<script id="hj-folder-stack-script">'+folderArtwork+'</script>');
 html=html.replace("ctx.putImageData(pixels,0,0);folderURL=canvas.toDataURL('image/png');",
  "ctx.putImageData(pixels,0,0);folderURL=canvas.toDataURL('image/png');canvas.width=canvas.height=0;");
 html=prepareCardGestures(html);
 html=preparePlayerStatBars(html);
 html=preparePffReliability(html);
 html=prepareDefenseFantasyRanks(html);
 html=extractSiteArtwork(html).html;

 // Business-card branding: preserve the original logo silhouette and portrait.
 html=html.replace(/<img class="hj-business-logo" src="([^"]+)" alt="The Hung Jurors">/g,
  (_,src)=>'<span class="hj-business-logo" role="img" aria-label="The Hung Jurors"><span class="hj-business-logo-mark" style="--hj-business-mark:url(\''+src+'\')"></span></span>');
 html=html.replace('<div class="league-roster-identity hj-business-card">',"<div class=\"league-roster-identity hj-business-card\">${manager==='KAT'?\"<svg class=\\\"hj-business-crown\\\" viewBox=\\\"0 0 64 46\\\" role=\\\"img\\\" aria-label=\\\"Reigning champion\\\"><title>Reigning champion</title><path d=\\\"M8 33 3 10l15 10L24 3l11 17L52 7l-3 26Z\\\" fill=\\\"#b88a2a\\\" stroke=\\\"#16354c\\\" stroke-width=\\\"2.5\\\" stroke-linejoin=\\\"round\\\"/><path d=\\\"M9 34h39v8H9z\\\" fill=\\\"#b88a2a\\\" stroke=\\\"#16354c\\\" stroke-width=\\\"2.5\\\" stroke-linejoin=\\\"round\\\"/></svg>\":''}");

 html=extractSiteMedia(html).html;
 html=extractScriptImages(html).html;
 // Performance (Oct 28): same results, less work. Each swap applies only when the exact
 // source text is present, so an edited index.html can never break the build.
 const swap=(from,to)=>{if(html.includes(from))html=html.split(from).join(to);else console.warn('perf swap skipped: source changed');};
 swap("const row=data.rows.find(item=>String(item.position||'').toUpperCase()===position&&pcNameMatch(item.name,name));",
  "const row=(typeof hjVegasRowFor==='function'?hjVegasRowFor(data.rows,position,name):data.rows.find(item=>String(item.position||'').toUpperCase()===position&&pcNameMatch(item.name,name)));");
 // Manager profile Latest Activity (Oct 30): one card per ESPN transaction. Cards were grouped by process time, so
 // two waiver claims processed in the same second (add + drop, add + drop) shared one box. Card heights: league-activity.css.
 swap("const at=Number(row?.at)||0,source=String(row?.source||row?.type||'MOVE'),key=`${at}|${source}`;",
  "const at=Number(row?.at)||0,source=String(row?.source||row?.type||'MOVE'),tx=row?.transactionId||String(row?.id||'').split(':')[0],key=tx?`tx:${tx}`:`${at}|${source}`;");
 swap("  /* All add/drop items sharing the ESPN execution timestamp/source stay in one\n     card, so a waiver add + corresponding drop is presented as one move. */",
  "  /* One card per ESPN transaction: a waiver add + its drop share a card; separate\n     claims processed at the same time get their own cards. */");
 // This season's draft rows keep ESPN's player id, for the photos in the manager draft board (manager-draft-avatars.js).
 swap("player_raw:`${player.name} ${player.team||''}, ${player.position}`}}).filter(Boolean);",
  "player_raw:`${player.name} ${player.team||''}, ${player.position}`,player_id:String(p.playerId)}}).filter(Boolean);");
 // A defense that is no longer on any roster showed as "Player -16027": ESPN's D/ST id is -16000 minus the team id.
 swap("  return {id,name:`Player ${id}`,team:'FA',position:'',photo:id&&!id.startsWith('-')?nflHeadshot(id):''};\n}",
  "  const dstTeam=/^-16\\d{3}$/.test(id)?HJ_PRO_TEAM_BY_ID[String(-Number(id)-16000)]:'';\n  if(dstTeam)return {id,name:`${PC_TEAM_NAMES[dstTeam]||dstTeam} D/ST`,team:dstTeam,position:'D/ST',photo:ffnTeamLogo(dstTeam)};\n  return {id,name:`Player ${id}`,team:'FA',position:'',photo:id&&!id.startsWith('-')?nflHeadshot(id):''};\n}");
 // Players tab (Oct 29): the sticky toolbar and stat tiles are rendered by scripts/players-toolbar.js.
 swap("    if(current){if(window.hjPatchLiveControls)window.hjPatchLiveControls(current,hj40ControlsHTML());else current.outerHTML=hj40ControlsHTML()}else if(old)old.outerHTML=hj40ControlsHTML();",
  "    const controlsHTML=window.hjPlayersToolbarHTML||hj40ControlsHTML;if(current){if(window.hjPatchLiveControls)window.hjPatchLiveControls(current,controlsHTML());else current.outerHTML=controlsHTML()}else if(old)old.outerHTML=controlsHTML();window.hjPlayersToolbarSync?.();");
 swap("  hjDirectoryControlsHTML=hj40ControlsHTML;",
  "  hjDirectoryControlsHTML=()=>(window.hjPlayersToolbarHTML||hj40ControlsHTML)();window.HJ40_API={state:HJ40,actualWeek:hj40CurrentActualFpts,actualSeason:hj40SeasonActual,projection:hj40ProjectionScore,gameStarted:hj40GameStarted,gameState:hj40GameState,availableWeeks:hj40AvailableWeeks,currentWeek:hj40CurrentWeek,refreshControls:()=>hj40RefreshControls(),ensureSeason:hj40EnsureSeason,publish:hj40Publish,labels:HJ40_LABELS};");
 swap("const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('script,style,textarea,input')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});",
  "const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||p.localName==='script'||p.localName==='style'||p.localName==='textarea'||!n.nodeValue.includes('D/ST'))return NodeFilter.FILTER_REJECT;return p.closest('script,style,textarea,input')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}});");
 // Players tab per-game averages (Oct 29): the nflverse weekly file has a row for every game on a
 // player's team schedule, including games he sat out (all zeros). "Season Averages" divided by all of
 // them (Josh Jacobs: 20.10 in one game showed 2.87 = 20.10 / 7). A week now counts as a game only
 // when the player logged snaps or recorded any stat or points. DST rows exist only for weeks the team
 // played, so the DST count is unchanged.
 swap("  function hj40Scale(value,games){",
  "  function hj40Played(row){if(!row)return false;if(Number.isFinite(pcPoints(row))&&pcPoints(row)!==0)return true;return ['attempts','completions','carries','targets','receptions','passing_yards','rushing_yards','receiving_yards','passing_interceptions','fumbles_lost_total','fg_att','fg_made','fg_missed','pat_att','pat_made','pat_missed'].some(key=>hj40Num(row[key])!==0)}\n  function hj40SnapPlayed(row){return hj40Num(row?.offense_snaps)>0||hj40Num(row?.offense_pct)>0}\n  function hj40EspnPlayed(row){return Number(row?.appliedTotal||0)!==0||Object.values(row?.stats||{}).some(value=>Number(value)!==0)}\n  function hj40Scale(value,games){");
 swap("gameWeeks=new Set([...rows.map(row=>Number(row.week)),...selectedSnaps.map(row=>Number(row.week))].filter(Boolean))",
  "gameWeeks=new Set([...rows.filter(hj40Played).map(row=>Number(row.week)),...selectedSnaps.filter(hj40SnapPlayed).map(row=>Number(row.week))].filter(Boolean))");
 swap(".sort((a,b)=>a.week-b.week),games=rows.length,isAvg=HJ40.period==='avg';",
  ".sort((a,b)=>a.week-b.week),games=rows.filter(hj40EspnPlayed).length,isAvg=HJ40.period==='avg';");
 swap("preferEspn=!rows.length||week===hj40CurrentWeek()||espn.games>=new Set(rows.map(row=>Number(row.week)).filter(Boolean)).size",
  "preferEspn=!rows.length||week===hj40CurrentWeek()||espn.games>=new Set(rows.filter(hj40Played).map(row=>Number(row.week)).filter(Boolean)).size");
 // Snap % (Oct 29): a team's offensive snaps were estimated as the largest snaps / snap% over its
 // players. snap% is rounded to two decimals, so 1 snap at "0.01" made a 100-snap game and every
 // SNP% on the site came out low (Gibbs Week 7: 61% instead of 90%). Use the player with the most
 // snaps instead (normally the quarterback at or near 100%), where the rounding error is tiny.
 swap("function hjSnapMap(rows){const map=new Map(),totals=new Map();for(const r of rows){const k=hjUsageKey(r);totals.set(k,Math.max(totals.get(k)||0,Number(r.offense_pct)>0?Math.round(Number(r.offense_snaps)/Number(r.offense_pct)):0));}",
  "function hjSnapMap(rows){const map=new Map(),totals=new Map(),lead=new Map();for(const r of rows){const k=hjUsageKey(r),s=Number(r.offense_snaps),p=Number(r.offense_pct);if(!(s>0&&p>0))continue;const best=lead.get(k);if(!best||s>best[0]||(s===best[0]&&p>best[1]))lead.set(k,[s,p]);}lead.forEach(([s,p],k)=>totals.set(k,Math.round(s/p)));");
 // Same-name players (Oct 29): snap rows were matched to players by name alone, so the Vikings' Justin
 // Jefferson also got a Browns linebacker's "0 snaps" rows (Week 5 SNP% 45% instead of 89%). Snap rows of
 // defenders who played no offensive snaps are left out; two-way players keep their offensive snaps.
 swap("for(const snap of snaps.values()){const name=pcBaseName(snap?.player||''),week=Number(snap?.week)||0;if(!name||!week)continue;",
  "for(const snap of snaps.values()){const name=pcBaseName(snap?.player||''),week=Number(snap?.week)||0;if(!name||!week)continue;if(!(Number(snap?.offense_snaps)>0||/^(QB|RB|WR|TE|FB|K)$/.test(String(snap?.position||'').toUpperCase())))continue;const hjSnapGsis=snap?.pfr_player_id&&hjPlayerIdsValue?.p2g.get(String(snap.pfr_player_id));if(hjSnapGsis){if(!snapsByGsis.has(hjSnapGsis))snapsByGsis.set(hjSnapGsis,[]);snapsByGsis.get(hjSnapGsis).push(snap)}");
 // Initials (Oct 29): "D.K. Metcalf" (snap counts) became "d k metcalf" while "DK Metcalf" (ESPN,
 // stats) became "dk metcalf", so those players never matched and showed no SNP%. Single letters are
 // joined, on every side of every name comparison.
 swap("function pcBaseName(value=''){return pcNorm(value).replace(/\\b(jr|sr|ii|iii|iv|v)\\b/g,'').replace(/\\s+/g,' ').trim()}",
  "function pcBaseName(value=''){return pcNorm(value).replace(/\\b(jr|sr|ii|iii|iv|v)\\b/g,'').replace(/\\s+/g,' ').trim().replace(/\\b([a-z]) (?=[a-z]\\b)/g,'$1')}");
 // Season snap % (Oct 29): games with no offensive snaps (special teams only) counted as 0% games and
 // pulled the season figure down (Dylan Sampson 26% instead of 46%). Season and average figures use the
 // games he played on offense; a single week with no offensive snaps still shows 0%.
 swap("function hjSnapPercent(rows){const valid=rows.filter(r=>hjStatNumber(r.offense_pct)!==null);",
  "function hjSnapPercent(rows){const listed=rows.filter(r=>hjStatNumber(r.offense_pct)!==null),onField=listed.filter(r=>Number(r.offense_snaps)>0),valid=onField.length?onField:listed;");
 // Players stat bar data (Oct 29), see docs/players-tab.md and scripts/player-advanced-data.js.
 // 1. Each season state picks up nflverse extras: expected fantasy points and defensive QB hits.
 swap("return {season,rows,snaps:snaps||new Map(),snapsByName,byPlayer,byName,dstByTeam,maxWeek,loadedAt:Date.now()};",
  "const hjSeasonState={season,rows,snaps:snaps||new Map(),snapsByName,byPlayer,byName,byGsis,snapsByGsis,dstByTeam,maxWeek,loadedAt:Date.now()};window.hjNflExtras?.attach(hjSeasonState);return hjSeasonState;");
 // 2. XFP beside FPTS: same period, same games played as FPTS.
 swap("      fpts,...hjUsageSummary(rows),snap:",
  "      fpts,xfp:window.hjXfpFor?.(state,player,rows,week,isAvg,games)??null,rzOpp:window.hjRzFor?.(state,player,rows,week,isAvg,games)??null,sep:window.hjSepFor?.(state,player,rows,week)??null,recAir:(()=>{const pr=rows.filter(r=>gameWeeks.has(Number(r.week))&&hjStatNumber(r.receiving_air_yards)!==null);if(!pr.length)return null;const t=pr.reduce((n,r)=>n+hjStatNumber(r.receiving_air_yards),0);if(!isAvg)return t;if(state.__hjAirMax===undefined)state.__hjAirMax=Math.max(0,...(state.rows||[]).filter(r=>hjStatNumber(r.receiving_air_yards)!==null).map(r=>Number(r.week)||0));const g=[...gameWeeks].filter(w=>w<=state.__hjAirMax).length;return g?t/g:null})(),...hjUsageSummary(rows.filter(r=>gameWeeks.has(Number(r.week)))),snap:");
 swap("if(key==='fpts')return pcFpts(value);","if(key==='fpts'||key==='xfp')return pcFpts(value);");
 swap("if(['ydRec','ydTar','ypc','passRtg','adot'].includes(key))return value.toFixed(1);","if(['ydRec','ydTar','ypc','passRtg','adot','sep'].includes(key))return value.toFixed(1);");
 // 3. D/ST from ESPN's weekly stats, which the site already loads: tackles (109), forced fumbles (106),
 //    kick return TDs (101), special-teams TDs (93+101+102), defensive TDs (103+104, checked against
 //    nflverse team totals; the old 105 disagreed in 30 team-weeks). TKL / FF / KR TD were taken from
 //    defensive players' rows, which the site never loads, so they always showed 0 or "—".
 swap("if(!rec.defTd&&s['105']!=null)rec.defTd=hj40Num(s['105']);",
  "rec.defTd=hj40Num(s['103'])+hj40Num(s['104']);rec.tkl=hj40Num(s['109'])||hj40Num(s['107'])+hj40Num(s['108']);rec.ff=hj40Num(s['106']);rec.krTd=hj40Num(s['101']);rec.krKnown=true;rec.stTd=hj40Num(s['93'])+hj40Num(s['101'])+hj40Num(s['102']);");
 // 4. Snap counts list some players by their full first name (Kenneth Gainwell, Zonovan Knight,
 //    Chigoziem Okonkwo, Gabriel Davis); stats use the short one. An offensive player's snap rows with no
 //    name match go to the one player with the same last name, team and week who has no snaps of his own.
 swap("byPlayer.forEach(list=>list.sort((a,b)=>a.week-b.week));byName.forEach(list=>list.sort((a,b)=>a.week-b.week));",
  "byPlayer.forEach(list=>list.sort((a,b)=>a.week-b.week));byName.forEach(list=>list.sort((a,b)=>a.week-b.week));for(const [hjSnapName,hjSnapList] of [...snapsByName]){if(byName.has(hjSnapName)||!hjSnapList.some(s=>/^(QB|RB|WR|TE|FB)$/.test(String(s.position||'').toUpperCase())))continue;const hjLast=hjSnapName.split(' ').pop(),hjCands=[...byName.keys()].filter(n=>n!==hjSnapName&&!snapsByName.has(n)&&n.split(' ').pop()===hjLast&&byName.get(n).some(r=>hjSnapList.some(s=>Number(s.week)===r.week&&pcTeam(s.team)===r.team)));if(hjCands.length===1){snapsByName.set(hjCands[0],hjSnapList);snapsByName.delete(hjSnapName)}}");
 // 5. Finished seasons: the embedded data lacks some players' snap rows (D.J. Moore, D.K. Metcalf, ...)
 //    and every QB's passing air yards; data/season-supplement-<season>.json fills both.
 swap("(embedded?pcEmbeddedCsv(embedded):pcFetchCsv(`${base}.csv.gz`,`${base}.csv`)).then(text=>pcParseCsv(text,PC_SNAP_FIELDS))",
  "(embedded?pcEmbeddedCsv(embedded):pcFetchCsv(`${base}.csv.gz`,`${base}.csv`)).then(text=>pcParseCsv(text,PC_SNAP_FIELDS)).then(rows=>hjHostedJson(`season-supplement-${season}.json`).then(sup=>sup?.schema===1&&Number(sup.season)===season&&Array.isArray(sup.snaps)?rows.concat(sup.snaps):rows).catch(()=>rows))");
 swap("if(!current){const rows=await native();HJ_DATA.seasons.set(season,rows);return rows}",
  "if(!current){const rows=await native();const sup=await hjHostedJson(`season-supplement-${season}.json`).catch(()=>null);if(sup?.schema===1&&Number(sup.season)===season&&Array.isArray(sup.airYards)){const air=new Map(sup.airYards.map(a=>[a.id+'|'+Number(a.week),a.passing_air_yards]));rows.forEach(r=>{const v=air.get(r.player_id+'|'+Number(r.week));if(v!=null&&!Number(r.passing_air_yards))r.passing_air_yards=v})}HJ_DATA.seasons.set(season,rows);return rows}");
 // Player ids (Oct 29): ESPN and nflverse rows were matched by name, so a player spelled differently by the
 // two sources (Hollywood / Marquise Brown, Drew / Andrew Ogletree, Josh / Joshua Palmer…) had each week twice,
 // counted twice in the defense-vs-position tables. data/player-ids.json (scripts/refresh-nflverse-extras.mjs)
 // maps ESPN and Pro Football Reference ids to nflverse ids; rows merge, and players find their stats and
 // snaps, by id. Names remain the fallback for a player the table does not know.
 swap("function pcMergeSeasonActualRows(primary,espnRows){",
  "let hjPlayerIdsValue=null,hjPlayerIdsJob=null;\nfunction hjLoadPlayerIds(){if(!hjPlayerIdsJob)hjPlayerIdsJob=Promise.race([hjHostedJson('player-ids.json').then(d=>{if(d?.schema!==1||!Array.isArray(d.players))return null;const e2g=new Map(),p2g=new Map();for(const [g,e,p] of d.players){if(e)e2g.set(String(e),g);if(p)p2g.set(String(p),g)}hjPlayerIdsValue={e2g,p2g};return hjPlayerIdsValue}).catch(()=>null),new Promise(r=>setTimeout(()=>r(null),4000))]);return hjPlayerIdsJob}\nfunction hjGsisOf(row){if(!row)return '';if(row.hj_gsis)return row.hj_gsis;const id=String(row.player_id||'');if(/^00-\\d/.test(id))return id;const espn=String(row.pc_espn_player_id||(row.pc_espn_actual?id:''));return (espn&&hjPlayerIdsValue?.e2g.get(espn))||''}\nfunction hjGsisForPlayer(player){return hjPlayerIdsValue?.e2g.get(String(player?.id||''))||''}\nfunction pcMergeSeasonActualRows(primary,espnRows){");
 swap("return name?`${position}|${name}|${week}`:`${position}|id:${String(row?.player_id||'')}|${week}`};",
  "const gsis=hjGsisOf(row);if(gsis)return `gsis:${gsis}|${week}`;return name?`${position}|${name}|${week}`:`${position}|id:${String(row?.player_id||'')}|${week}`};");
 swap("  (primary||[]).forEach(row=>{const k=key(row);map.set(k,merge(map.get(k),row))});\n  (espnRows||[]).forEach(row=>{const k=key(row);map.set(k,merge(map.get(k),row))});",
  "  const put=row=>{const k=key(row),m=merge(map.get(k),row);if(k.startsWith('gsis:'))m.hj_gsis=k.slice(5,k.lastIndexOf('|'));map.set(k,m)};\n  (primary||[]).forEach(put);\n  (espnRows||[]).forEach(put);");
 swap(" const job=(async()=>{\n  const base=`https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${season}`;",
  " const job=(async()=>{\n  await (typeof hjLoadPlayerIds==='function'?hjLoadPlayerIds():null);\n  const base=`https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${season}`;");
 swap("    const byPlayer=new Map(),byName=new Map(),snapsByName=new Map(),dstByTeamWeek=new Map();let maxWeek=0;",
  "    const byPlayer=new Map(),byName=new Map(),snapsByName=new Map(),dstByTeamWeek=new Map(),byGsis=new Map(),snapsByGsis=new Map();let maxWeek=0;");
 swap("        if(!byName.has(name))byName.set(name,[]);byName.get(name).push(row);",
  "        if(!byName.has(name))byName.set(name,[]);byName.get(name).push(row);\n        const hjGsis=hjGsisOf(raw);if(hjGsis){if(!byGsis.has(hjGsis))byGsis.set(hjGsis,[]);byGsis.get(hjGsis).push(row)}");
 swap("    return state.byPlayer.get(key)||state.byName.get(name)||[];",
  "    const hjGsis=hjGsisForPlayer(player);if(hjGsis&&state.byGsis)return state.byGsis.get(hjGsis)||[];\n    return state.byPlayer.get(key)||state.byName.get(name)||[];");
 swap("allSnaps=state?.snapsByName?.get(name)||[]",
  "allSnaps=(hjGsisForPlayer(player)&&state?.snapsByGsis?.get(hjGsisForPlayer(player)))||state?.snapsByName?.get(name)||[]");
 // Target / air-yard share (Oct 29): a season's share came out "—" when any one week lacked share data,
 // which every live week does (ESPN's in-game rows carry none until nflverse updates). Shares, RACR and
 // aDOT now use the weeks that have the team totals.
 swap(" const targets=sum('targets'),air=sum('receiving_air_yards'),yards=sum('receiving_yards'),teamTargets=sum('_hj_team_targets'),teamAir=sum('_hj_team_air');",
  " const hjHas=(r,a,b)=>hjStatNumber(r[a])!==null&&hjStatNumber(r[b])!==null,tRows=rows.filter(r=>hjHas(r,'targets','_hj_team_targets')),aRows=rows.filter(r=>hjHas(r,'receiving_air_yards','_hj_team_air')),add=(list,k)=>list.length?list.reduce((n,r)=>n+(hjStatNumber(r[k])||0),0):null;\n const targets=add(tRows,'targets'),air=add(aRows,'receiving_air_yards'),yards=add(aRows,'receiving_yards'),teamTargets=add(tRows,'_hj_team_targets'),teamAir=add(aRows,'_hj_team_air'),aTargets=add(aRows,'targets');");
 swap("adot:air!==null&&targets?air/targets:null};","adot:air!==null&&aTargets?air/aTargets:null};");
 // Snap race (Oct 29): snap counts often finish loading before the Players state exists; their event then
 // found no state and was dropped, the state was built from the weekly rows with no snaps, and as a fresh
 // state it was not reloaded for a minute, so every SNP% (and the games-played count) went blank. A state
 // built without snaps now takes the snap counts already loaded.
 swap("    const state=hj40BuildSeasonState(season,rows,snaps,dst);state.dstEntries=dst||[];",
  "    if(!snaps?.size&&typeof pcSnapValues!=='undefined'&&pcSnapValues.get(Number(season))?.size)snaps=pcSnapValues.get(Number(season));\n    const state=hj40BuildSeasonState(season,rows,snaps,dst);state.dstEntries=dst||[];");
 // Receiver air yards per game: over games played up to the latest week nflverse has published air yards for
 // (a game in progress counts for FPTS at once, but its air yards arrive with nflverse the next day).
 // Live scores (Oct 29): during games scripts/live-scores-fast.js fetches this week's matchups every 5 s
 // (69 KB); the full league sync (0.94 MB) drops from every 15 s to every 60 s. See docs/live-scores.md.
 swap("const HJ_LEAGUE_LIVE_REFRESH_MS=15*1000;","const HJ_LEAGUE_LIVE_REFRESH_MS=60*1000;");
 // Rate-stat minimums (Oct 29): the stat snapshot keeps the player's games (not enumerable) so a per-game
 // view can tell total volume; see hj40Qualifies in scripts/player-stat-extras.js.
 swap("    HJ40.snapshotCache.set(key,out);return out;","    Object.defineProperty(out,'__games',{value:Number(raw.games)||0});HJ40.snapshotCache.set(key,out);return out;");
 // Use real PNG files, with fresh URLs so failed icon requests are not reused.
 html=replaceOnce(html,/<link rel="apple-touch-icon"[^>]*>/g,'<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-hung-jurors-v2.png">');
 html=replaceOnce(html,/<link rel="icon" type="image\/png" sizes="192x192"[^>]*>/g,'<link rel="icon" type="image/png" sizes="192x192" href="/hung-jurors-icon-192-v2.png">');
 html=replaceOnce(html,/<link rel="icon" type="image\/png" sizes="512x512"[^>]*>/g,'<link rel="icon" type="image/png" sizes="512x512" href="/hung-jurors-icon-512-v2.png">');
 html=replaceOnce(html,/<link rel="manifest"[^>]*>/g,'<link rel="manifest" href="/site.webmanifest?v=hung-jurors-logo-v2">');

 // Completed postseason matchups (including weeks with byes) can also carry record announcements.
 html=replaceOnce(html,/for\(const game of data\?\.schedule\|\|\[\]\)\{if\(!hjGameFinal\(game,data\)\)continue;/g,'for(const game of data?.schedule||[]){if(!hjRcGameFinal(game,data))continue;');
 html=replaceOnce(html,/if\(games\.length<Math\.floor\(teamNames\.size\/2\)\)return \[\];const rows=\[\];/g,'const scheduled=(data.schedule||[]).filter(g=>Number(g.matchupPeriodId)===week&&g.home?.teamId&&g.away?.teamId);if(games.length!==scheduled.length)return [];const rows=[];');
 // Stable destinations for every entry in the record book.
 html=replaceOnce(html,/\{title:'Most Championships',/g,"{id:'most-championships',title:'Most Championships',");
 html=replaceOnce(html,/\{title:'Most Regular-Season Wins',/g,"{id:'most-regular-season-wins',title:'Most Regular-Season Wins',");
 html=replaceOnce(html,/\{title:'Most Playoff Appearances',/g,"{id:'most-playoff-appearances',title:'Most Playoff Appearances',");
 html=replaceOnce(html,/\{title:'Most Podium Finishes',/g,"{id:'most-podium-finishes',title:'Most Podium Finishes',");
 html=replaceOnce(html,/\{title:'Best Regular Season',/g,"{id:'best-regular-season',title:'Best Regular Season',");
 html=replaceOnce(html,/\{title:'Best Weekly Scoring Season',/g,"{id:'best-weekly-scoring-season',title:'Best Weekly Scoring Season',");
 html=replaceOnce(html,/\{title:'Longest Winning Streak',/g,"{id:'longest-winning-streak',title:'Longest Winning Streak',");
 html=replaceOnce(html,/\{title:'Longest Losing Streak',/g,"{id:'longest-losing-streak',title:'Longest Losing Streak',");
 html=replaceOnce(html,/\{title:'Highest Score',/g,"{id:'highest-score',title:'Highest Score',");
 html=replaceOnce(html,/\{title:'Highest Score in a Loss',/g,"{id:'highest-score-in-a-loss',title:'Highest Score in a Loss',");
 html=replaceOnce(html,/\{title:'Lowest Score in a Win',/g,"{id:'lowest-score-in-a-win',title:'Lowest Score in a Win',");
 html=replaceOnce(html,/\{title:'Closest Game',/g,"{id:'closest-game',title:'Closest Game',");
 html=replaceOnce(html,/\{title:'Biggest Blowout',/g,"{id:'biggest-blowout',title:'Biggest Blowout',");
 html=replaceOnce(html,/\{title:'Highest Combined Score',/g,"{id:'highest-combined-score',title:'Highest Combined Score',");
 html=replaceOnce(html,/\{title:'Highest Playoff Score',/g,"{id:'highest-playoff-score',title:'Highest Playoff Score',");
 html=replaceOnce(html,/\{title:'Highest Combined Playoff Game',/g,"{id:'highest-combined-playoff-game',title:'Highest Combined Playoff Game',");
 html=replaceOnce(html,/\{title:'Closest Championship',/g,"{id:'closest-championship',title:'Closest Championship',");
 html=replaceOnce(html,/\{title:'Biggest Championship Win',/g,"{id:'biggest-championship-win',title:'Biggest Championship Win',");
 html=replaceOnce(html,/<article class="rb-entry">/g,'<article class="rb-entry" id="record-${r.id}" tabindex="-1">');
 // Every version of the Players toolbar shares the same search control.
 const searchInputs=/<input class="hq-fa-control" id="hq-fa-search"[^>]*>/g;
 if([...html.matchAll(searchInputs)].length!==3)throw Error('Player search markup changed');
 html=html.replace(searchInputs,input=>'<span class="hj-player-search">'+input+'<button type="button" class="hj-player-search-clear" data-hj-search-clear aria-label="Clear player search"${HJ_HQ_STATE.query?\'\':\' hidden\'}>×</button></span>');
 html=replaceOnce(html,/function pcOpen\(trigger\)\{/g,'function pcOpen(trigger){\n  window.hjFinishPlayerSearch?.();');

 html=replaceOnce(html,/function wireBuild\(data\)\{/g,"function wireBuild(data){\n  if(!data)return {cards:[{section:'loading',html:'<div class=\"wire-loading\" role=\"status\">Loading league updates…</div>'}],headline:{eyebrow:'',title:'',sub:'',kicker:'The Wire',live:false}};");
 html=replaceOnce(html,/function wireCloseExpanded\(\)\{/g,wireInteraction+"\nfunction wireCloseExpanded(){");
 html=replaceOnce(html,/  stage.append\(clone,close\);overlay.append\(stage\);/g,"  wireBindCollapse(clone);\n  stage.append(clone,close);overlay.append(stage);");

 html=replaceOnce(html,/function ffnFeedToItem\(feed,player,nextGame\){/g,newsSpin+'\nfunction ffnFeedToItem(feed,player,nextGame){');
 html=replaceOnce(html,/    text:body,\n    category:ffnClassify\(body\),/g,'    text:body,\n    spin:ffnSpinFromFeed(feed),\n    category:ffnClassify(body),');
 html=replaceOnce(html,/      <p class="ffn-text">\$\{esc\(item.text\|\|''\)\}<\/p>/g,"      <p class=\"ffn-text\">${esc(item.text||'')}</p>\n      ${ffnSpinHTML(item)}");
 html=replaceOnce(html,/        const existingIds=new Set\(ffnItems.map/g,'        ffnMergeSpin(fetched);\n        const existingIds=new Set(ffnItems.map');

 // Profile news uses the same parsed Spin and disclosure as the news rail.
 html=replaceOnce(html,/function pcNewsBody\(updates,loading=false\)\{[^]*?(?=function pcLatestNews)/g,playerNews);
 html=replaceOnce(html,/pcNewsForPlayer\(player,\[\.\.\.ffnItems,\.\.\.fetched\]\)/g,'pcNewsForPlayer(player,[...fetched,...ffnItems])');

 // Reuse the record book's existing markup with recalculated categories.
 const recordPattern=/  \/\* League Record Book \*\/[^]*?(?=  let activeRecordCategory=)/g;
 const originalRecord=html.match(recordPattern);
 if(originalRecord?.length!==1)throw Error('Record book source changed');
 const source=originalRecord[0],helperStart=source.indexOf('  const rbPersonHTML='),categoryStart=source.indexOf('  const categories=');
 if(helperStart<0||categoryStart<0)throw Error('Record helpers changed');
 const helpers=source.slice(helperStart,categoryStart);
 let calculation=source.slice(0,helperStart)+source.slice(categoryStart);
 calculation=calculation.replace('  const categories={','  return {')
  .replace('const R=HIST.record_book;','const R=HIST.record_book;\n  const careerByName=Object.fromEntries(HIST.career_profiles.map(c=>[c.manager,c]));')
  .replace("round:'Semifinal'","round:g.round||'Semifinal'")
  .replace(/  const txAllRows=[^\n]+\n/,'')
  .replace('    const g=p.championship;','    const g=p.championship;if(!g)return false;')
  .replace('${playoffHigh.year} Championship','${playoffHigh.year} ${playoffHigh.round?playoffHigh.round[0].toUpperCase()+playoffHigh.round.slice(1):\'Championship\'}')
  .replace('${R.regular_season.best_single_season_win_pct.losses}','${R.regular_season.best_single_season_win_pct.losses}${R.regular_season.best_single_season_win_pct.ties?\'–\'+R.regular_season.best_single_season_win_pct.ties:\'\'}');
 html=replaceOnce(html,recordPattern,helpers+'  const recordCategories=HIST=>{\n'+calculation+'  };\n  let categories=recordCategories(HIST);\n');
 html=replaceOnce(html,/  renderRecords\(\);\n  tabs\?\.addEventListener/g,
  "  renderRecords();\n  document.addEventListener('hj:records',event=>{categories=recordCategories(event.detail);renderRecords();});\n  tabs?.addEventListener");
 // Season Challenges header: sticky two-line tab rail, then the challenge title, prize stamp and rules card.
 html=replaceOnce(html,/    <div class="sec-head"><h3>Season Challenges<\/h3><span class="pot" id="challenge-prize-badge">\$30<\/span><\/div>\n    <div class="tabs" id="challenge-strip" role="tablist" aria-label="Season Challenges"><\/div>\n    <div class="rules" id="challenge-rule"><\/div>\n/g,
  '    <div class="sec-head"><h3>Season Challenges</h3></div>\n    <div class="ch-top" id="challenge-top"><div class="ch-rail" id="challenge-strip" role="tablist" aria-label="Season Challenges"></div></div>\n    <div class="ch-card" id="challenge-card"><div class="ch-card-head"><h4 class="ch-title" id="challenge-title"></h4><span class="ch-stamp" id="challenge-prize-badge" aria-label="Prize">$30</span></div><p class="ch-rules" id="challenge-rule"></p><button type="button" class="ch-rules-toggle" id="challenge-rules-toggle" aria-expanded="false" aria-controls="challenge-rule">Full rules</button></div>\n');
 // Top bar: "Side Challenges" with the six menu items in the requested order and wording.
 html=replaceOnce(html,/Season Challenges <span class="nav-caret">▼<\/span>/g,'Side Challenges <span class="nav-caret">▼</span>');
 html=replaceOnce(html,/<div id="challenge-menu" class="challenge-menu" role="menu" aria-label="Season Challenges" hidden>[^]*?<\/div>\n/g,
  `<div id="challenge-menu" class="challenge-menu" role="menu" aria-label="Side Challenges" hidden>
  <button type="button" role="menuitem" data-challenge="raffle"><span>High Score Raffle</span><span class="menu-prize">$30</span></button>
  <button type="button" role="menuitem" data-challenge="lms"><span>Last Man Standing</span><span class="menu-prize">$30</span></button>
  <button type="button" role="menuitem" data-challenge="titty"><span>Titty Special</span><span class="menu-prize">$10</span></button>
  <button type="button" role="menuitem" data-challenge="mvp"><span>MVP Special</span><span class="menu-prize">$10</span></button>
  <button type="button" role="menuitem" data-challenge="overachiever"><span>Overachiever Special</span><span class="menu-prize">$10</span></button>
  <button type="button" role="menuitem" data-challenge="optimizer"><span>Optimizer Special</span><span class="menu-prize">$10</span></button>
  <button type="button" role="menuitem" data-challenge="perfect"><span>The Perfect Lineup</span><span class="menu-prize">$30</span></button>
</div>
`);
 // League HQ · Weekly Recap: graphic week review with play-by-play win-chance and elimination factoids.
 html=replaceOnce(html,/function hjRecapHTML\(data\)\{[^]*?\n\}\n(?=async function hjRecapLoadExtra)/g,recapScript+'\n');
 // Inject loader helpers after the legacy recap block has been replaced.
 html=replaceOnce(html,/async function hjRecapLoadExtra\(chosen\)\{[^]*?(?=function hjRecapTransactionTime)/g,recapLoader);
 // 2026 Standings: the compact light table replaces the old dark lane dashboard (same buildStandingsAnalytics inputs).
 html=replaceOnce(html,/function standingsModeMetric\(p,mode\)\{[^]*?(?=\/\* ---- 2026 interactive league schedule ---- \*\/)/g,standingsScript+'\n');
 html=replaceOnce(html,/function renderRaffleChallenge\(out\)\{[^]*?(?=\/\* ---- Season Challenges nav dropdown ---- \*\/)/g,challengeScripts+'\n');
 const old='Date.now()-at<60*60*1000&&data.updated';
 if(html.split(old).length!==2)throw Error('Projection freshness setting changed; review site preparation');
 html=replaceOnce(html,/^  cards\.push\(\{section,html:wireCard\(\{kicker:`Week \$\{week\} Recap`[^\n]+$/gm,
  '  cards.push({section,html:wireCard({kicker:`Week ${week} Recap`,tag:\'Final\',cls:\'is-lead is-week-recap\',body:wireRecapSummary(week,results,high,low,close,blow,avg,under10)})});');
 html=replaceOnce(html,/^ const sideHTML=\(side,right=false\)=>[^\n]+$/gm,
  ' const sideHTML=(side,right=false)=>wireSummarySide(side,right);');
 html=replaceOnce(html,/function wireRecapCards\(data,week\)\{/g,bannerRenderers+'\nfunction wireRecapCards(data,week){');
 html=replaceOnce(html,/function pcSeasonProjectionHTML\([^]*?\n}\n(?=async function pcRenderVegas)/g,projectionSummary+'\n');
 html=replaceOnce(html,/  const label=`Week \$\{week\}`,panel=pcVegasPanel[^]*?(?=\n };\n for\(const kind of \['weekly','season'\])/g,
  "  target.classList.add('pc-weekly-summary');\n  target.innerHTML=pcProjectionSummaryHTML(player,data,row,state.espn,!state.done.has(kind),'week',week);");
 // Font/layout decorators change serialized HTML after a status is rendered.
 // Compare renderer input, not decorated DOM, to avoid a body-observer loop.
 html=replaceOnce(html,/function hjRefreshGameContexts\(\)\{/g,`const HJ_CONTEXT_MARKUP_CACHE=new WeakMap();
function hjSetGameContextMarkup(node,markup){
 if(HJ_CONTEXT_MARKUP_CACHE.get(node)===markup)return;
 if(node.innerHTML!==markup)node.innerHTML=markup;
 HJ_CONTEXT_MARKUP_CACHE.set(node,markup);
}
function hjRefreshGameContexts(){`);
 html=replaceOnce(html,/const markup=hjContextStatusHTML\(c\);if\(status.innerHTML!==markup\)status.innerHTML=markup;/g,
  'const markup=hjContextStatusHTML(c);hjSetGameContextMarkup(status,markup);');
 // Game status lines read FINAL in caps everywhere.
 html=replaceOnce(html,/`Final \$\{result\}`/g,'`FINAL ${result}`');
 html=replaceOnce(html,/<b>\$\{past\?'Final':winChance===null\?'Unavailable':'Est\. win chance'\}<\/b>/g,"<b>${past?'FINAL':winChance===null?'Unavailable':'Est. win chance'}</b>");
 // The roster manager rail follows the same live standings rank shown on each note.
 const oldManagerOrder="const teams=[...(data.teams||[])].sort((a,b)=>(Number(a.draftDayProjectedRank)||99)-(Number(b.draftDayProjectedRank)||99)||Number(a.id)-Number(b.id));";
 if(html.split(oldManagerOrder).length!==2)throw Error('Manager order source changed');
 html=html.replace(oldManagerOrder,"const teams=[...(data.teams||[])].sort((a,b)=>(hjCurrentStandingRank(a,data)||Infinity)-(hjCurrentStandingRank(b,data)||Infinity)||Number(a.id)-Number(b.id));");
 html=replaceOnce(html,/if\(!upcoming\)return \{game:'Schedule unavailable',stats:'',title\};/g,"if(!upcoming)return {game:hjTeamOnBye(player.team,week)?'BYE':'Schedule unavailable',stats:'',title:hjTeamOnBye(player.team,week)?'Bye week':title};");
 html=replaceOnce(html,/const upcoming=pcUpcoming\(team\);if\(!upcoming\)return 'Next game TBD';/g,"const upcoming=pcUpcoming(team);if(!upcoming)return hjTeamOnBye(team)?'BYE':'Next game TBD';");
 html=replaceOnce(html,/function hjScheduleWeekSource\(data,week\)\{[^]*?\n\}\n(?=function hjScheduleManagerName)/g,'');
 html=replaceOnce(html,/async function hjEnsureCompletedHistory\(data\)\{[^]*?(?=function hjOpponentHTML)/g,'const HJ_MATCHUP_HISTORY_SEED='+matchupHistorySeed+';\n'+matchupHistory+'\n');
 // Only Matchups' default selection rolls over on Wednesday; explicit week links retain their destination.
 html=replaceOnce(html,/function hjCurrentWeek\(data=HJ_LEAGUE_STATE.data\)/g,futureMatchups+'\n'+matchupWeek+'\nfunction hjCurrentWeek(data=HJ_LEAGUE_STATE.data)');
 html=html.replaceAll('HJ_HQ_STATE.matchupWeek||hjCurrentWeek(', 'HJ_HQ_STATE.matchupWeek||hjDefaultMatchupWeek(');
 html=replaceOnce(html,/if\(!HJ_HQ_STATE.matchupWeek\|\|Number\(HJ_HQ_STATE.matchupWeek\)===old\)HJ_HQ_STATE.matchupWeek=week;/g,'if(!HJ_HQ_STATE.matchupWeek||Number(HJ_HQ_STATE.matchupWeek)===old)HJ_HQ_STATE.matchupWeek=0;');
 html=replaceOnce(html,/if\(tab==='matchups'&&focusTeamId\)\{HJ_HQ_STATE.matchupWeek=hjCurrentWeek\(HJ_LEAGUE_STATE.data\);/g,"if(tab==='matchups'&&focusTeamId){HJ_HQ_STATE.matchupWeek=0;");
 html=html.replace('function hjScheduleWeekSource(data,week){','function hjScheduleWeekSource(data,week){\n if(Number(week)>hjCurrentWeek(data))void hjLoadFutureMatchup(week,data);');
 html=html.replace("function hjMathCanonicalStat(entry,period='week',week=1,season=HJ_LEAGUE_SEASON,source=1){", "function hjMathCanonicalStat(entry,period='week',week=1,season=HJ_LEAGUE_SEASON,source=1){\n if(period==='week'&&Number(source)===1){const future=hjFutureProjection(entry,week,season);if(future)return future;}");
 html=html.replace('function hjEspnProjection(entry,week,season=HJ_LEAGUE_SEASON){','function hjEspnProjection(entry,week,season=HJ_LEAGUE_SEASON){\n const future=hjFutureProjection(entry,week,season);if(future)return Number(future.appliedTotal);');
 html=html.replace('function hjPlayerActualScore(entry,week,data=HJ_LEAGUE_STATE.data){','function hjPlayerActualScore(entry,week,data=HJ_LEAGUE_STATE.data){\n if(Number(week)>hjCurrentWeek(data))return null;');
 html=html.replace('const state=hjPlayerGameState(hjPlayerTeam(entry)),actual=', "const state=hjUpcomingForWeek(hjPlayerTeam(entry),Number(week))?.game?.state||'pre',actual=");
 html=html.replace('return count+(started?0:1);','return count+(started||hjTeamOnBye(hjPlayerTeam(entry),week)?0:1);');
 html=html.replaceAll('hjEntriesHaveLiveGame(rosterA.entries)||hjEntriesHaveLiveGame(rosterB.entries)', '(week===hjCurrentWeek(data)&&(hjEntriesHaveLiveGame(rosterA.entries)||hjEntriesHaveLiveGame(rosterB.entries)))');
 html=prepareTeamScoreDisplay(prepareLiveDisplay(html));
 html=prepareProfileScoreColors(html);
 html=html.replace('previews();sections();folders();fonts();displayDST();','previews();sections();folders();fonts();displayDST();window.hjAlignMatchupCameras?.();');
 // Camera is part of each matchup's existing action row.
 html=html.replace(/actions\.append\(tray\);/g,'actions.append(tray);actions.insertAdjacentHTML(\'beforeend\',\'<button type="button" class="hj-matchup-camera" aria-label="Save entire matchup image" title="Save matchup image"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 5l2-2h4l2 2h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/></svg></button>\');');
 html=replaceOnce(html,/function hjTeamViewHTML\(team,data\)\{/g,'const HJ_DST_MASCOTS='+dstMascots+';\nconst HJ_TEAM_PHOTO_ASSETS='+teamPhotoAssets+';\n'+byeStatus+'\n'+teamPhotoScript+'\nfunction hjTeamViewHTML(team,data){');
 const rosterHead='<div class="league-roster-head">${identity}${matchupHTML}</div>';
 if(!html.includes(rosterHead))throw Error('Roster header changed');
 html=html.split(rosterHead).join('<div class="league-roster-head">${identity}${hjTeamPhotoHTML(team)}${matchupHTML}</div>');

 // Persistent roster pages use the exact native scroll controller as Matchups.
 const singleRoster='<div class="league-team-view">${hjTeamViewHTML(selected,data)}</div>';
 if(html.split(singleRoster).length!==2)throw Error('Roster page source changed');
 html=html.replace(singleRoster,()=>"<div class=\"hj-section-rail hj-roster-rail\">${teams.map(team=>`<div class=\"league-team-view hj-section-page\" data-hj-roster-team=\"${esc(team.id)}\" ${Number(team.id)===Number(selected.id)?'':'inert aria-hidden=\"true\"'}>${Number(team.id)===Number(selected.id)?hjTeamViewHTML(team,data):''}</div>`).join('')}</div>");

 // Hosted Vegas projections stay visible for 36 hours after the last verified retrieval so a collector hiccup never blanks the site.
 if(!/<\/body>\s*<\/html>\s*$/.test(html))throw Error('Page end changed; review layout guard injection');
 // Phone memory: sized ESPN images, unchanged injury feed reuse (see prepare-phone-memory.mjs).
 return preparePhoneMemory(prepareManagerAvatars(html.replace(old,'Date.now()-at<36*60*60*1000&&data.updated')
  .replace('</head>','<link rel="stylesheet" href="/styles/section-scroll.css?v=20261007-paint-bounds">\n<link rel="stylesheet" href="/styles/wire-priorities.css?v=20261007-compact">\n<link rel="stylesheet" href="/styles/player-stat-bars.css?v=20260929-stable2">\n<link rel="stylesheet" href="/styles/team-photos.css?v=20261009-crown-34deg-diagonal">\n<link rel="stylesheet" href="/styles/player-search.css?v=20260924a">\n<link rel="stylesheet" href="/styles/wire-interaction.css?v=20260923b">\n<link rel="stylesheet" href="/styles/news-spin.css?v=20261019-points">\n<link rel="stylesheet" href="/styles/season-projection-stats.css?v=20260917d">\n<link rel="stylesheet" href="/styles/weekly-banner.css?v=20260917b">\n<link rel="stylesheet" href="/styles/season-challenges.css?v='+seasonChallengesVersion+'">\n<link rel="stylesheet" href="/styles/perfect-lineup.css?v='+perfectLineupVersion+'">\n<link rel="stylesheet" href="/styles/standings.css?v=20261007-details">\n<link rel="stylesheet" href="/styles/weekly-recap.css?v=20261005-avatar-crop">\n<link rel="stylesheet" href="/styles/wire-live.css?v=20260920-a3"><link rel="stylesheet" href="/styles/player-value.css?v=20260923-a3">\n<link rel="stylesheet" href="/styles/trade-desk.css?v=20260929-lineup-spacing4">\n<link rel="stylesheet" href="/styles/side-bets.css?v=20261025-extra-shots3">\n<link rel="stylesheet" href="/styles/live-display.css?v=20261028f-schedule-results">\n</head>')
  .replace(/<\/body>\s*<\/html>\s*$/,()=>'<link rel="stylesheet" href="/styles/league-activity.css?v=20261030">\n<link rel="stylesheet" href="/styles/manager-draft.css?v=20261030">\n<link rel="stylesheet" href="/styles/recap-extras.css?v=20261030">\n<link rel="stylesheet" href="/styles/players-toolbar.css?v=20261029d">\n<script id="hj-perf-late">'+perfLate+'</script>\n<script id="hj-recap-extras">'+recapExtras+'</script>\n<script id="hj-player-search">'+playerSearch+'</script>\n<script>ffnInstallSpin();</script>\n<script id="hj-record-engine">'+recordEngine+'</script>\n<script id="hj-record-live">'+recordLive+'</script>\n<script id="hj-direct-links">'+directLinks+'</script>\n<script id="hj-wire-live">'+wireLive+'</script>\n<script id="hj-wire-priorities">'+wirePriorities+'</script>\n<script id="hj-player-value">'+playerValue+'</script>\n<script id="hj-trade-desk">'+tradeDesk+'</script>\n<script id="hj-side-bets">'+sideBets+'</script>\n<script id="hj-completed-results">'+completedResults+'</script>\n<script id="hj-layout-guard">'+layoutGuard+'</script>\n<script id="hj-roster-weeks">'+rosterWeeks+'</script>\n<script id="hj-live-scores-fast">'+liveScoresFast+'</script>\n<script id="hj-player-advanced-data">'+playerAdvancedData+'</script>\n<script id="hj-players-toolbar">'+playersToolbar+'</script>\n<script id="hj-manager-draft-avatars">'+managerDraftAvatars+'</script>\n</body>\n</html>\n')));
}
if(process.argv[2]){
 const path=process.argv[2],source=await readFile(path,'utf8'),artwork=extractSiteArtwork(source),media=extractSiteMedia(source),scriptImages=extractScriptImages(source);
 const assets=[...artwork.assets,...media.assets,...scriptImages.assets];
 if(assets.length)await mkdir(join(dirname(path),'assets/site-art'),{recursive:true});
 await Promise.all(assets.map(([name,bytes])=>writeFile(join(dirname(path),name),bytes)));
 await writeFile(path,preparePlayerHistory(prepareSite(source)));
}







